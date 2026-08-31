import crypto from "node:crypto";

/**
 * Razorpay (India, INR). Same thin-wrapper philosophy as lib/cashfree.ts: two REST calls and two
 * HMAC checks don't justify an SDK dependency.
 *
 * Why both gateways exist: Cashfree's production account is stuck on "transactions are not
 * enabled" pending activation, and Razorpay is also the long-term plan for international cards.
 * The payments facade route picks whichever is configured, preferring Razorpay.
 *
 * Razorpay deals in PAISE natively, which matches how this codebase stores money — no rupee
 * conversion at this boundary at all.
 */

const BASE = "https://api.razorpay.com/v1";

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function authHeader(): string {
  const id = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export type RazorpayOrder = { id: string; amount: number; currency: string; receipt: string; status: string };

/** `receipt` carries OUR order id — it comes back on the order.paid webhook, which is how a
 * webhook finds its payments row without a second lookup table. */
export async function createOrder(input: { receipt: string; amountPaise: number; notes?: Record<string, string> }): Promise<RazorpayOrder> {
  const res = await fetch(`${BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({ amount: input.amountPaise, currency: "INR", receipt: input.receipt, notes: input.notes ?? {} }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Razorpay createOrder failed (${res.status}): ${body?.error?.description ?? JSON.stringify(body).slice(0, 200)}`);
  return body as RazorpayOrder;
}

export async function fetchOrder(razorpayOrderId: string): Promise<RazorpayOrder> {
  const res = await fetch(`${BASE}/orders/${encodeURIComponent(razorpayOrderId)}`, {
    headers: { Authorization: authHeader() }, cache: "no-store",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Razorpay fetchOrder failed (${res.status})`);
  return body as RazorpayOrder;
}

/** Checkout-callback signature: HMAC_SHA256("order_id|payment_id", key_secret). Proves the
 * payment result the browser reports actually came from Razorpay for exactly this order. */
export function verifyPaymentSignature(razorpayOrderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${razorpayOrderId}|${paymentId}`).digest("hex");
  return timingSafeEq(expected, signature);
}

/** Webhook signature: HMAC_SHA256(rawBody, webhook secret) — a separate secret configured on the
 * webhook itself in the dashboard, not the API key secret. Raw bytes, same rule as Cashfree. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEq(expected, signature);
}

function timingSafeEq(a: string, b: string): boolean {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}
