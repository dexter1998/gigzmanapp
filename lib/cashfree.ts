import crypto from "node:crypto";

/**
 * Cashfree Payment Gateway (India / INR). Thin wrapper rather than the SDK — we use exactly two
 * calls (create an order, read an order back) plus one signature check, and the SDK would pull a
 * dependency for that.
 *
 * Credentials are the same pair for both directions: `x-client-secret` authenticates our requests,
 * and the *same* secret is the HMAC key Cashfree signs webhooks with.
 */

const API_VERSION = "2023-08-01";

/** `cfsk_ma_prod_` keys only work against the live host and `cfsk_ma_test_` only against sandbox —
 * a mismatch fails as an auth error, which reads like a bad key rather than a wrong environment,
 * so the env is derived from the key itself rather than trusted from a separate variable. */
function resolveEnv(): { baseUrl: string; isProd: boolean } {
  const secret = process.env.CASHFREE_SECRET_KEY ?? "";
  const isProd = secret.includes("_prod_");
  return { baseUrl: isProd ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg", isProd };
}

function credentials() {
  const appId = process.env.CASHFREE_APP_ID;
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secret) {
    throw new Error("CASHFREE_APP_ID and CASHFREE_SECRET_KEY must be set");
  }
  return { appId, secret };
}

export function cashfreeIsLive(): boolean {
  return resolveEnv().isProd;
}

export type CreateOrderInput = {
  orderId: string;
  amountPaise: number;
  customer: { id: string; email: string; phone: string; name?: string | null };
  returnUrl: string;
  notifyUrl: string;
};

export type CreateOrderResult = {
  paymentSessionId: string;
  orderId: string;
};

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const { appId, secret } = credentials();
  const { baseUrl } = resolveEnv();

  const res = await fetch(`${baseUrl}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-version": API_VERSION,
      "x-client-id": appId,
      "x-client-secret": secret,
    },
    body: JSON.stringify({
      order_id: input.orderId,
      // Cashfree takes rupees, not paise. We hold paise internally and convert only here, at the
      // boundary, so no rounding can creep into what we grant versus what we charged.
      order_amount: input.amountPaise / 100,
      order_currency: "INR",
      customer_details: {
        customer_id: input.customer.id,
        customer_email: input.customer.email,
        customer_phone: input.customer.phone,
        ...(input.customer.name ? { customer_name: input.customer.name } : {}),
      },
      order_meta: {
        return_url: input.returnUrl,
        notify_url: input.notifyUrl,
      },
    }),
  });

  const body = (await res.json()) as { payment_session_id?: string; order_id?: string; message?: string };

  if (!res.ok || !body.payment_session_id) {
    throw new Error(`Cashfree createOrder failed (${res.status}): ${body.message ?? JSON.stringify(body)}`);
  }

  return { paymentSessionId: body.payment_session_id, orderId: body.order_id ?? input.orderId };
}

export type CashfreeOrder = {
  order_id: string;
  order_status: string; // ACTIVE | PAID | EXPIRED | TERMINATED
  order_amount: number;
  [key: string]: unknown;
};

/** Server-side truth for whether an order was actually paid. The webhook is the fast path, but a
 * user returning from checkout may arrive before it lands (or it may be lost), so the return page
 * confirms against this rather than trusting anything in the redirect URL. */
export async function fetchOrder(orderId: string): Promise<CashfreeOrder> {
  const { appId, secret } = credentials();
  const { baseUrl } = resolveEnv();

  const res = await fetch(`${baseUrl}/orders/${encodeURIComponent(orderId)}`, {
    headers: {
      "x-api-version": API_VERSION,
      "x-client-id": appId,
      "x-client-secret": secret,
    },
    cache: "no-store",
  });

  const body = (await res.json()) as CashfreeOrder & { message?: string };
  if (!res.ok) throw new Error(`Cashfree fetchOrder failed (${res.status}): ${body.message ?? "unknown"}`);
  return body;
}

/**
 * Verifies a webhook actually came from Cashfree.
 *
 * The signature is base64(HMAC-SHA256(timestamp + rawBody, clientSecret)) — note it covers the
 * timestamp *concatenated with the raw body*, so the body must be the exact bytes received. Any
 * JSON.parse/stringify round-trip in between changes whitespace and key order and the signature
 * stops matching, which is why the route reads req.text() and passes the string through untouched.
 *
 * Compared with timingSafeEqual rather than `===` so a byte-by-byte comparison can't be timed to
 * recover a valid signature.
 */
export function verifyWebhookSignature(rawBody: string, signature: string, timestamp: string): boolean {
  const { secret } = credentials();

  const expected = crypto.createHmac("sha256", secret).update(timestamp + rawBody).digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Cashfree rejects an order_id with characters outside [A-Za-z0-9_-], and it has to be unique per
 * order forever — a retry of a failed payment needs a fresh one, not a reused one. */
export function newOrderId(): string {
  return `mantis_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}
