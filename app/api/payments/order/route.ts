import { NextRequest, NextResponse } from "next/server";
import { trackEvent, EV } from "@/lib/events";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { logAppError } from "@/lib/app-errors";
import { packById, jobSeekerPricePaise, topupCredits, TOPUP_PACK_ID, TOPUP_MIN_RUPEES, TOPUP_MAX_RUPEES } from "@/lib/credits/pricing";
import { razorpayConfigured, createOrder as createRzpOrder } from "@/lib/razorpay";
import { createOrder as createCfOrder, newOrderId } from "@/lib/cashfree";
import { COMPANY } from "@/lib/company";

/**
 * Provider-agnostic purchase start. The buy buttons call this instead of a gateway-specific
 * route, and the server picks the gateway: Razorpay when configured, Cashfree otherwise. The
 * response's `checkout` field tells the client which checkout to open.
 *
 * Razorpay is the chosen gateway (decision stands as of 2026-10-01, with live Cashfree keys in
 * hand and deliberately unused). Deliberately NOT keyed off whether Cashfree's keys happen to be
 * live keys: that would make setting a Cashfree credential anywhere silently move every buyer to a
 * different gateway. Cashfree stays wired as the fallback for when Razorpay is unconfigured.
 *
 * Two order types share this pipeline:
 *   { packId }       — a plan pack (credits + a 30-day plan, see activatePurchasedPlan)
 *   { topupRupees }  — "Add funds": a whole-rupee amount, ₹50–₹1,00,000, credits computed here
 *                      at TOPUP_PAISE_PER_CREDIT. The client's idea of the credit count is never read.
 *
 * The response names no gateway: `checkout` is "popup" (in-page) or "redirect".
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userEmail = session.user.email;

  const body = (await req.json().catch(() => ({}))) as { packId?: unknown; topupRupees?: unknown };

  let item: { id: string; credits: number; amountPaise: number };
  if (body.topupRupees !== undefined) {
    const rupeesAmount = typeof body.topupRupees === "number" ? body.topupRupees : Number.NaN;
    const credits = topupCredits(rupeesAmount);
    if (credits === null) {
      trackEvent(session?.user?.email, EV.checkoutStart, {});
      return NextResponse.json(
        { error: "bad_amount", message: `Enter a whole amount from ₹${TOPUP_MIN_RUPEES} to ₹${TOPUP_MAX_RUPEES.toLocaleString("en-IN")}.` },
        { status: 400 }
      );
    }
    // No job-seeker discount on top-ups: the rate is flat by design.
    item = { id: TOPUP_PACK_ID, credits, amountPaise: rupeesAmount * 100 };
  } else {
    const pack = typeof body.packId === "string" ? packById(body.packId) : undefined;
    if (!pack) return NextResponse.json({ error: "unknown_pack" }, { status: 400 });
    // By account mode, not by request param — a client never controls dashboard_mode itself, so it
    // can't opt into the discount just by asking.
    const [modeRow] = await sql`SELECT dashboard_mode FROM user_profiles WHERE email = ${userEmail}`;
    item = { id: pack.id, credits: pack.credits, amountPaise: modeRow?.dashboard_mode === "jobs" ? jobSeekerPricePaise(pack) : pack.pricePaise };
  }
  const { amountPaise } = item;
  const packId = item.id;

  const orderId = newOrderId();

  if (razorpayConfigured()) {
    await sql`
      INSERT INTO payments (user_email, provider, order_id, pack_id, credits, amount_paise, status)
      VALUES (${userEmail}, 'razorpay', ${orderId}, ${item.id}, ${item.credits}, ${amountPaise}, 'created')
    `;
    try {
      const rzp = await createRzpOrder({ receipt: orderId, amountPaise, notes: { user: userEmail, pack: item.id } });
      await sql`UPDATE payments SET raw = ${sql.json({ razorpay_order_id: rzp.id })} WHERE order_id = ${orderId}`;
      trackEvent(session?.user?.email, EV.checkoutStart, {});
      return NextResponse.json({
        checkout: "popup",
        orderId,
        gatewayOrderId: rzp.id,
        keyId: process.env.RAZORPAY_KEY_ID,
        amountPaise,
        credits: item.credits,
        name: session.user.name ?? undefined,
        email: userEmail,
      });
    } catch (err) {
      await sql`UPDATE payments SET status = 'failed', raw = ${sql.json({ error: String(err) })} WHERE order_id = ${orderId}`;
      console.error("Razorpay order creation failed", err);
      await logAppError("/api/payments/order", err, { userEmail, context: { provider: "razorpay", packId } });
      return NextResponse.json({ error: "payment_unavailable" }, { status: 502 });
    }
  }

  // Cashfree path — same shape the old gateway-specific route produced.
  const [profile] = await sql`SELECT phone, name FROM user_profiles WHERE email = ${userEmail}`;
  await sql`
    INSERT INTO payments (user_email, provider, order_id, pack_id, credits, amount_paise, status)
    VALUES (${userEmail}, 'cashfree', ${orderId}, ${item.id}, ${item.credits}, ${amountPaise}, 'created')
  `;
  try {
    const { paymentSessionId } = await createCfOrder({
      orderId,
      amountPaise,
      customer: {
        id: userEmail.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 50),
        email: userEmail,
        phone: profile?.phone || "9999999999",
        name: profile?.name ?? session.user.name ?? null,
      },
      returnUrl: `${req.nextUrl.origin}/settings/billing/return?order_id=${orderId}`,
      notifyUrl: `${COMPANY.site}/api/payments/cashfree/webhook`,
    });
    trackEvent(session?.user?.email, EV.checkoutStart, {});
    return NextResponse.json({ checkout: "redirect", orderId, paymentSessionId, amountPaise, credits: item.credits });
  } catch (err) {
    await sql`UPDATE payments SET status = 'failed', raw = ${sql.json({ error: String(err) })} WHERE order_id = ${orderId}`;
    console.error("Cashfree order creation failed", err);
    await logAppError("/api/payments/order", err, { userEmail, context: { provider: "cashfree", packId } });
    return NextResponse.json({ error: "payment_unavailable" }, { status: 502 });
  }
}
