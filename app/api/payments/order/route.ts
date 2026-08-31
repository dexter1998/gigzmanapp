import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { logAppError } from "@/lib/app-errors";
import { packById } from "@/lib/credits/pricing";
import { razorpayConfigured, createOrder as createRzpOrder } from "@/lib/razorpay";
import { createOrder as createCfOrder, newOrderId } from "@/lib/cashfree";
import { COMPANY } from "@/lib/company";

/**
 * Provider-agnostic purchase start. The buy buttons call this instead of a gateway-specific
 * route, and the server picks the gateway: Razorpay when configured (Cashfree production is
 * stuck pending account activation), Cashfree otherwise. The response's `provider` field tells
 * the client which checkout to open.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userEmail = session.user.email;

  const { packId } = (await req.json()) as { packId?: string };
  const pack = packId ? packById(packId) : undefined;
  if (!pack) return NextResponse.json({ error: "unknown_pack" }, { status: 400 });

  const orderId = newOrderId();

  if (razorpayConfigured()) {
    await sql`
      INSERT INTO payments (user_email, provider, order_id, pack_id, credits, amount_paise, status)
      VALUES (${userEmail}, 'razorpay', ${orderId}, ${pack.id}, ${pack.credits}, ${pack.pricePaise}, 'created')
    `;
    try {
      const rzp = await createRzpOrder({ receipt: orderId, amountPaise: pack.pricePaise, notes: { user: userEmail, pack: pack.id } });
      await sql`UPDATE payments SET raw = ${sql.json({ razorpay_order_id: rzp.id })} WHERE order_id = ${orderId}`;
      return NextResponse.json({
        provider: "razorpay",
        orderId,
        razorpayOrderId: rzp.id,
        keyId: process.env.RAZORPAY_KEY_ID,
        amountPaise: pack.pricePaise,
        credits: pack.credits,
        name: session.user.name ?? undefined,
        email: userEmail,
      });
    } catch (err) {
      await sql`UPDATE payments SET status = 'failed', raw = ${sql.json({ error: String(err) })} WHERE order_id = ${orderId}`;
      console.error("Razorpay order creation failed", err);
      await logAppError("/api/payments/order", err, { userEmail, context: { provider: "razorpay", packId } });
      return NextResponse.json({ error: "gateway_error" }, { status: 502 });
    }
  }

  // Cashfree path — same shape the old gateway-specific route produced.
  const [profile] = await sql`SELECT phone, name FROM user_profiles WHERE email = ${userEmail}`;
  await sql`
    INSERT INTO payments (user_email, provider, order_id, pack_id, credits, amount_paise, status)
    VALUES (${userEmail}, 'cashfree', ${orderId}, ${pack.id}, ${pack.credits}, ${pack.pricePaise}, 'created')
  `;
  try {
    const { paymentSessionId } = await createCfOrder({
      orderId,
      amountPaise: pack.pricePaise,
      customer: {
        id: userEmail.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 50),
        email: userEmail,
        phone: profile?.phone || "9999999999",
        name: profile?.name ?? session.user.name ?? null,
      },
      returnUrl: `${req.nextUrl.origin}/settings/billing/return?order_id=${orderId}`,
      notifyUrl: `${COMPANY.site}/api/payments/cashfree/webhook`,
    });
    return NextResponse.json({ provider: "cashfree", orderId, paymentSessionId, amountPaise: pack.pricePaise, credits: pack.credits });
  } catch (err) {
    await sql`UPDATE payments SET status = 'failed', raw = ${sql.json({ error: String(err) })} WHERE order_id = ${orderId}`;
    console.error("Cashfree order creation failed", err);
    await logAppError("/api/payments/order", err, { userEmail, context: { provider: "cashfree", packId } });
    return NextResponse.json({ error: "gateway_error" }, { status: 502 });
  }
}
