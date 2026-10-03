import crypto from "node:crypto";
import { sql } from "@/lib/db";

/**
 * Stickly.live — the in-app rewards widget. Users complete link tasks (star the
 * repo, join Discord, leave a G2 review) and earn Mantis credits for it.
 *
 * Same thin-wrapper philosophy as lib/razorpay.ts: one JWT and one HMAC check do
 * not justify a dependency, so both are hand-rolled on node:crypto. There is no
 * JWT library in this project and adding one for fifteen lines would be the
 * wrong trade.
 *
 * Two secrets, and they are not interchangeable:
 *   STICKLY_SIGNING_SECRET  signs the token that tells Stickly who the user is
 *   STICKLY_WEBHOOK_SECRET  verifies the callback that tells us to grant credits
 */

export function sticklyConfigured(): boolean {
  return Boolean(
    process.env.STICKLY_PUBLIC_KEY &&
      process.env.STICKLY_SIGNING_SECRET &&
      process.env.STICKLY_WEBHOOK_SECRET,
  );
}

const b64url = (b: Buffer | string) =>
  Buffer.from(b).toString("base64url");

/* ── identity ─────────────────────────────────────────────────────────── */

/**
 * Stickly never sees a Mantis email.
 *
 * Email is our only stable user id, which makes it tempting to pass straight
 * through — but handing a third party the full address of every signed-in user
 * is exporting the customer list for no gain. Worse, phone-only signups carry a
 * synthetic `@phone.gigzmanapp.internal` address that would leak the convention.
 *
 * So each user gets an opaque id the first time they load the widget, and the
 * mapping lives here. Stickly only ever learns that id, and the webhook maps it
 * back. Deleting the row unlinks the user and nothing else breaks.
 */
export async function sticklyIdFor(userEmail: string): Promise<string> {
  const [existing] = await sql<{ stickly_id: string }[]>`
    SELECT stickly_id FROM stickly_users WHERE user_email = ${userEmail}
  `;
  if (existing) return existing.stickly_id;

  const id = "mu_" + crypto.randomBytes(12).toString("hex");
  const [row] = await sql<{ stickly_id: string }[]>`
    INSERT INTO stickly_users (stickly_id, user_email)
    VALUES (${id}, ${userEmail})
    ON CONFLICT (user_email) DO UPDATE SET user_email = EXCLUDED.user_email
    RETURNING stickly_id
  `;
  return row.stickly_id;
}

export async function emailForSticklyId(sticklyId: string): Promise<string | null> {
  const [row] = await sql<{ user_email: string }[]>`
    SELECT user_email FROM stickly_users WHERE stickly_id = ${sticklyId}
  `;
  return row?.user_email ?? null;
}

/**
 * HS256 JWT with `sub` and nothing else.
 *
 * Stickly reads the claiming user from this token's `sub` and never from the
 * request body — with no task verification on their side, the signature is the
 * only thing between anyone with a browser console and an unbounded credit mint.
 * Which is also why this runs on the server and the secret never reaches the
 * client bundle.
 */
export function mintWidgetToken(subject: string, ttlSeconds = 60 * 60 * 12): string {
  const secret = process.env.STICKLY_SIGNING_SECRET;
  if (!secret) throw new Error("STICKLY_SIGNING_SECRET must be set");

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ sub: subject, iat: now, exp: now + ttlSeconds }));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

/* ── webhook ──────────────────────────────────────────────────────────── */

function timingSafeEq(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/**
 * Verifies `x-stickly-signature: t=<unix>,v1=<hex>` over `"<t>.<rawBody>"`.
 *
 * The timestamp is inside the signed string and checked against the clock, so a
 * captured delivery cannot be replayed tomorrow. Five minutes matches Stickly's
 * own tolerance; wider and the replay window reopens, narrower and ordinary
 * clock skew starts rejecting real deliveries.
 */
export function verifyWebhookSignature(
  rawBody: string,
  header: string | null,
  toleranceSec = 300,
): boolean {
  const secret = process.env.STICKLY_WEBHOOK_SECRET;
  if (!secret || !header) return false;

  const ts = Number(/t=(\d+)/.exec(header)?.[1]);
  const got = /v1=([a-f0-9]+)/.exec(header)?.[1];
  if (!ts || !got) return false;
  if (Math.abs(Date.now() / 1000 - ts) > toleranceSec) return false;

  const want = crypto.createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex");
  return timingSafeEq(got, want);
}

export type SticklyRewardClaimed = {
  event: string;
  id: string;
  userId: string;
  rewardId: string;
  credits: number;
  mode: "test" | "live";
  test?: boolean;
};

/** Ledger constants, in one place so the webhook and any backfill agree.
 *  `reason` is deliberately not in CREDIT_COST — that table is spend-only and
 *  `creditCost()` throws on anything it does not know. */
export const STICKLY_LEDGER_REASON = "stickly_reward";
export const sticklyLedgerRef = (claimId: string) => `stickly:${claimId}`;
