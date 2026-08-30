import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { COMPANY } from "@/lib/company";
import { packById } from "@/lib/credits/pricing";
import { createOrder, newOrderId } from "@/lib/cashfree";

/**
 * Starts a credit-pack purchase. Returns a `payment_session_id` the client hands to Cashfree's
 * checkout SDK — we never see card details.
 *
 * The `payments` row is written *before* the gateway call, so an order that is created and then
 * abandoned still exists as `created`. Writing it only on success would make abandoned checkouts
 * invisible, which is precisely the gap where payment bugs live.
 */

// Cashfree requires a customer phone. A phone-only signup already has one; a Google signup may
// not, and refusing the purchase over it would be worse than sending a documented placeholder —
// the number is only used for the gateway's own receipts, not for settlement or verification.
const PHONE_FALLBACK = "9999999999";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userEmail = session.user.email;

  const { packId } = (await req.json()) as { packId?: string };
  const pack = packId ? packById(packId) : undefined;
  if (!pack) return NextResponse.json({ error: "unknown_pack" }, { status: 400 });

  const [profile] = await sql`SELECT phone, name FROM user_profiles WHERE email = ${userEmail}`;

  const orderId = newOrderId();

  // Credits and price are frozen onto the row now. The webhook grants whatever this row says, so
  // a later change to CREDIT_PACKS can never retroactively alter what an in-flight order buys.
  await sql`
    INSERT INTO payments (user_email, order_id, pack_id, credits, amount_paise, status)
    VALUES (${userEmail}, ${orderId}, ${pack.id}, ${pack.credits}, ${pack.pricePaise}, 'created')
  `;

  try {
    const { paymentSessionId } = await createOrder({
      orderId,
      amountPaise: pack.pricePaise,
      customer: {
        // Cashfree's customer_id has the same charset limits as order_id, so the email can't be
        // used directly — a stable hash-free slug of it keeps repeat purchases on one customer.
        id: userEmail.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 50),
        email: userEmail,
        phone: profile?.phone || PHONE_FALLBACK,
        name: profile?.name ?? session.user.name ?? null,
      },
      returnUrl: `${COMPANY.site}/settings/billing/return?order_id=${orderId}`,
      notifyUrl: `${COMPANY.site}/api/payments/cashfree/webhook`,
    });

    return NextResponse.json({ orderId, paymentSessionId, amountPaise: pack.pricePaise, credits: pack.credits });
  } catch (err) {
    await sql`UPDATE payments SET status = 'failed', raw = ${sql.json({ error: String(err) })} WHERE order_id = ${orderId}`;
    console.error("Cashfree order creation failed", err);
    return NextResponse.json({ error: "gateway_error" }, { status: 502 });
  }
}
