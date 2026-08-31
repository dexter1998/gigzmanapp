import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { grantCredits } from "@/lib/credits/server";
import { verifyWebhookSignature } from "@/lib/razorpay";

/**
 * Razorpay webhook — the backstop grant path (the browser's verify call is the fast path).
 * Signature over the exact raw bytes, same discipline as the Cashfree webhook: parse only after
 * verification, never re-serialise before it.
 *
 * Subscribed events: order.paid (grant) and payment.failed (mark). order.paid carries the order
 * entity whose `receipt` is OUR order id — no separate mapping needed.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  let valid: boolean;
  try {
    valid = verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    console.error("Razorpay webhook could not be verified", err);
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  if (!valid) {
    console.error("Razorpay webhook signature mismatch");
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as {
    event?: string;
    payload?: {
      order?: { entity?: { id?: string; receipt?: string; amount?: number; status?: string } };
      payment?: { entity?: { id?: string; order_id?: string; status?: string } };
    };
  };

  const event = payload.event ?? "";

  if (event === "order.paid") {
    const order = payload.payload?.order?.entity;
    const receipt = order?.receipt;
    if (!receipt) return NextResponse.json({ ok: true, ignored: "no_receipt" });

    const [payment] = await sql`SELECT * FROM payments WHERE order_id = ${receipt} AND provider = 'razorpay'`;
    if (!payment) {
      console.error("Razorpay webhook for unknown order", receipt);
      return NextResponse.json({ ok: true, ignored: "unknown_order" });
    }
    // Amount guard, same reasoning as Cashfree: paise-for-paise or no credits.
    if (typeof order.amount === "number" && order.amount !== payment.amount_paise) {
      console.error("Razorpay amount mismatch", { receipt, expected: payment.amount_paise, paid: order.amount });
      return NextResponse.json({ ok: true, ignored: "amount_mismatch" });
    }
    const granted = await grantCredits(payment.user_email, payment.credits, receipt, "purchase");
    const paymentId = payload.payload?.payment?.entity?.id ?? null;
    await sql`
      UPDATE payments SET status = 'paid', cf_payment_id = ${paymentId}, paid_at = COALESCE(paid_at, now()), raw = ${sql.json(JSON.parse(rawBody))}
      WHERE order_id = ${receipt}
    `;
    return NextResponse.json({ ok: true, granted });
  }

  if (event === "payment.failed") {
    const rzpOrderId = payload.payload?.payment?.entity?.order_id;
    if (rzpOrderId) {
      await sql`
        UPDATE payments SET status = 'failed', raw = ${sql.json(JSON.parse(rawBody))}
        WHERE provider = 'razorpay' AND raw->>'razorpay_order_id' = ${rzpOrderId} AND status = 'created'
      `;
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: event || "no_event" });
}
