import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { grantCredits } from "@/lib/credits/server";
import { fetchOrder } from "@/lib/cashfree";

/**
 * Confirms one order, and reconciles it if the webhook never arrived.
 *
 * The webhook is the fast path but not a guarantee — it can be delayed past the user's redirect,
 * or lost entirely. Rather than leaving someone who has paid staring at a stale balance, the
 * return page calls this, which asks Cashfree directly and grants on `PAID`.
 *
 * Nothing here trusts the redirect: the order id comes from the query string, but the amount and
 * status are read back from Cashfree's API, and the row is matched against the signed-in user so
 * one account can't poll another's order into existence.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orderId = req.nextUrl.searchParams.get("order_id");
  if (!orderId) return NextResponse.json({ error: "order_id is required" }, { status: 400 });

  const [payment] = await sql`
    SELECT * FROM payments WHERE order_id = ${orderId} AND user_email = ${session.user.email}
  `;
  if (!payment) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (payment.status === "paid") {
    return NextResponse.json({ status: "paid", credits: payment.credits, amountPaise: payment.amount_paise });
  }

  let order;
  try {
    order = await fetchOrder(orderId);
  } catch (err) {
    console.error("Cashfree status lookup failed", err);
    // Pending rather than failed — the money may well have gone through, and telling someone their
    // payment failed when we simply couldn't reach the gateway is the worse error.
    return NextResponse.json({ status: "pending", credits: payment.credits });
  }

  if (order.order_status !== "PAID") {
    return NextResponse.json({ status: order.order_status === "ACTIVE" ? "pending" : "failed", credits: payment.credits });
  }

  const paidPaise = Math.round((order.order_amount ?? 0) * 100);
  if (paidPaise !== payment.amount_paise) {
    console.error("Cashfree amount mismatch on status check", { orderId, expected: payment.amount_paise, paid: paidPaise });
    return NextResponse.json({ status: "failed", credits: payment.credits });
  }

  // Same idempotency key the webhook uses, so whichever path gets here first wins and the other
  // becomes a no-op.
  await grantCredits(payment.user_email, payment.credits, orderId, "purchase");

  // Round-tripped through JSON so TypeScript sees a plain `any` rather than the CashfreeOrder
  // interface, which sql.json's JSONValue parameter doesn't structurally accept — same pattern
  // the gosom enrich route uses for the identical reason.
  await sql`
    UPDATE payments SET status = 'paid', paid_at = COALESCE(paid_at, now()),
      raw = ${sql.json(JSON.parse(JSON.stringify(order)))}
    WHERE order_id = ${orderId}
  `;

  return NextResponse.json({ status: "paid", credits: payment.credits, amountPaise: payment.amount_paise, reconciled: true });
}
