import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { grantCredits } from "@/lib/credits/server";
import { verifyPaymentSignature } from "@/lib/razorpay";

/**
 * Completes a Razorpay checkout from the browser's success callback. The signature is what makes
 * this trustworthy: HMAC over "razorpay_order_id|payment_id" with our key secret, which the
 * browser cannot forge. The webhook remains the backstop for buyers who close the tab first —
 * both paths grant through the same order-id-keyed idempotency, so double delivery is a no-op.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const b = (await req.json()) as { orderId?: string; razorpayOrderId?: string; paymentId?: string; signature?: string };
  if (!b.orderId || !b.razorpayOrderId || !b.paymentId || !b.signature) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const [payment] = await sql`
    SELECT * FROM payments WHERE order_id = ${b.orderId} AND user_email = ${session.user.email} AND provider = 'razorpay'
  `;
  if (!payment) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if ((payment.raw as { razorpay_order_id?: string } | null)?.razorpay_order_id !== b.razorpayOrderId) {
    return NextResponse.json({ error: "order_mismatch" }, { status: 400 });
  }

  if (!verifyPaymentSignature(b.razorpayOrderId, b.paymentId, b.signature)) {
    console.error("Razorpay payment signature mismatch", b.orderId);
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  const granted = await grantCredits(payment.user_email, payment.credits, b.orderId, "purchase");
  await sql`
    UPDATE payments SET status = 'paid', cf_payment_id = ${b.paymentId}, paid_at = COALESCE(paid_at, now())
    WHERE order_id = ${b.orderId}
  `;
  return NextResponse.json({ ok: true, granted, credits: payment.credits });
}
