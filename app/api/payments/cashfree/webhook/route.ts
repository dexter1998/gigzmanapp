import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { grantCredits } from "@/lib/credits/server";
import { verifyWebhookSignature } from "@/lib/cashfree";

/**
 * Cashfree payment webhook — the authoritative moment credits are granted.
 *
 * Deliberately not gated on a session: Cashfree's servers call this, not the buyer's browser. The
 * signature check *is* the authentication, so it runs before anything reads the body's contents.
 *
 * The body is read with req.text() and passed to the verifier untouched. The signature covers the
 * exact bytes Cashfree sent, so parsing to an object and re-serialising would change whitespace
 * and key order and every legitimate webhook would fail verification.
 */

type CashfreeWebhook = {
  type?: string;
  data?: {
    order?: { order_id?: string; order_amount?: number };
    payment?: { cf_payment_id?: string | number; payment_status?: string; payment_amount?: number };
    order_id?: string;
  };
  order_id?: string;
};

/**
 * Cashfree's webhook payload shape is versioned (the endpoint is registered against a specific
 * version in their dashboard), and the fields below sit in different places across versions. These
 * readers check each known location rather than assuming one, so upgrading the endpoint's version
 * doesn't silently stop matching orders — the failure mode would be a paid customer receiving no
 * credits, with a 200 in the logs.
 */
function readOrderId(p: CashfreeWebhook): string | undefined {
  return p.data?.order?.order_id ?? p.data?.order_id ?? p.order_id;
}

/** Rupees, as Cashfree reports them. Returns 0 when absent so the caller can skip the check
 * rather than treat "unknown" as "mismatched". */
function readPaidAmount(p: CashfreeWebhook): number {
  return p.data?.payment?.payment_amount ?? p.data?.order?.order_amount ?? 0;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature");
  const timestamp = req.headers.get("x-webhook-timestamp");

  if (!signature || !timestamp) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let valid: boolean;
  try {
    valid = verifyWebhookSignature(rawBody, signature, timestamp);
  } catch (err) {
    // Missing credentials on the server — a 500 so Cashfree retries once we're configured, rather
    // than a 401 that would look like a rejected (and therefore final) delivery.
    console.error("Cashfree webhook could not be verified", err);
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  if (!valid) {
    console.error("Cashfree webhook signature mismatch");
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as CashfreeWebhook;
  const orderId = readOrderId(payload);
  if (!orderId) {
    // Cashfree's dashboard "Test" button sends a sample payload with no real order. Acknowledged
    // as 200 so the endpoint verifies, but logged so a genuine parsing regression is visible.
    console.warn("Cashfree webhook had no order id", payload.type ?? "(no type)");
    return NextResponse.json({ ok: true, ignored: "no_order_id" });
  }

  const [payment] = await sql`SELECT * FROM payments WHERE order_id = ${orderId}`;
  if (!payment) {
    // An order we never created. Acknowledged rather than 4xx'd so Cashfree stops retrying, but
    // logged, because it means either a stale test order or something genuinely wrong.
    console.error("Cashfree webhook for unknown order", orderId);
    return NextResponse.json({ ok: true, ignored: "unknown_order" });
  }

  const paymentStatus = payload.data?.payment?.payment_status;
  const cfPaymentId = payload.data?.payment?.cf_payment_id;
  const isSuccess = payload.type === "PAYMENT_SUCCESS_WEBHOOK" || paymentStatus === "SUCCESS";

  if (!isSuccess) {
    const status = paymentStatus === "USER_DROPPED" ? "dropped" : "failed";
    await sql`
      UPDATE payments
      SET status = ${status}, cf_payment_id = ${cfPaymentId ? String(cfPaymentId) : null}, raw = ${sql.json(payload)}
      WHERE order_id = ${orderId} AND status = 'created'
    `;
    return NextResponse.json({ ok: true, status });
  }

  // Guard against a mismatch between what was paid and what the order was for. Cashfree reports
  // rupees; our row holds paise. If they disagree, credit nothing and flag it — granting on a
  // wrong amount is far worse than a support ticket.
  const paidPaise = Math.round(readPaidAmount(payload) * 100);
  if (paidPaise > 0 && paidPaise !== payment.amount_paise) {
    console.error("Cashfree amount mismatch", { orderId, expected: payment.amount_paise, paid: paidPaise });
    await sql`
      UPDATE payments SET status = 'failed', raw = ${sql.json({ ...payload, _error: "amount_mismatch" })}
      WHERE order_id = ${orderId}
    `;
    return NextResponse.json({ ok: true, ignored: "amount_mismatch" });
  }

  // grantCredits is keyed on the order id, so a webhook delivered twice (Cashfree retries on any
  // non-2xx, and duplicates happen even without one) grants credits exactly once.
  const granted = await grantCredits(payment.user_email, payment.credits, orderId, "purchase");

  await sql`
    UPDATE payments
    SET status = 'paid',
        cf_payment_id = ${cfPaymentId ? String(cfPaymentId) : null},
        paid_at = COALESCE(paid_at, now()),
        raw = ${sql.json(payload)}
    WHERE order_id = ${orderId}
  `;

  return NextResponse.json({ ok: true, granted });
}
