import crypto from "node:crypto";
import { sql } from "@/lib/db";

/**
 * Stickly — users complete growth tasks (follow, star, join, review, refer) and we grant the
 * credits. Stickly never holds a balance; it tells us a task was claimed and this app does the
 * granting, in our own ledger.
 *
 * Three secrets, all from Stickly → Settings → API keys → "Download .env":
 *   STICKLY_PUBLIC_KEY      safe in the browser
 *   STICKLY_SIGNING_SECRET  signs the token that says which of our users is claiming
 *   STICKLY_WEBHOOK_SECRET  verifies an incoming reward webhook really came from Stickly
 */

export const STICKLY_CDN = "https://cdn.stickly.live/w.js";
export const STICKLY_PUBLIC_KEY = process.env.STICKLY_PUBLIC_KEY ?? "";

/** Ledger constants, in one place so the webhook and any backfill agree. `reason` is deliberately
 *  not in CREDIT_COST — that table is spend-only and creditCost() throws on anything it does not
 *  know. */
export const STICKLY_LEDGER_REASON = "stickly_reward";
export const sticklyLedgerRef = (eventId: string) => `stickly:${eventId}`;

/* ------------------------------------------------------------------ identity */

/**
 * An opaque id per user, rather than our own.
 *
 * The integration guide signs `{ sub: user.id }`. In this app a user *is* their email —
 * user_profiles is keyed by it — so following that literally would hand every customer's email
 * address to a third party as their identifier, and put it in a JWT that reaches the browser.
 *
 * So each user gets an opaque id the first time they load the widget and the mapping lives here.
 * Stickly only ever learns that id; the webhook maps it back. It satisfies the same requirement —
 * a stable id of ours that Stickly can quote back — without the leak. Deleting the row unlinks the
 * user and nothing else breaks.
 */
export async function sticklyIdFor(userEmail: string): Promise<string> {
  const [existing] = await sql<{ stickly_id: string }[]>`
    SELECT stickly_id FROM stickly_users WHERE user_email = ${userEmail}
  `;
  if (existing) return existing.stickly_id;

  const id = `u_${crypto.randomBytes(12).toString("hex")}`;
  const [row] = await sql<{ stickly_id: string }[]>`
    INSERT INTO stickly_users (stickly_id, user_email) VALUES (${id}, ${userEmail})
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

/* ------------------------------------------------------------------ the token */

const b64url = (s: string) => Buffer.from(s).toString("base64url");

/**
 * HS256, hand-rolled rather than pulling in jsonwebtoken for one three-field payload.
 *
 * The widget cannot be trusted to say who is claiming — Stickly does not verify that a task was
 * really done, so identity is the only thing between a reward and a console loop that mints
 * credits. That is why this is signed on the server and why nothing from the browser is used.
 */
export function signSticklyToken(subject: string, ttlSeconds = 24 * 60 * 60): string {
  const secret = process.env.STICKLY_SIGNING_SECRET;
  if (!secret) throw new Error("STICKLY_SIGNING_SECRET is not set");

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ sub: subject, iat: now, exp: now + ttlSeconds }));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

/* ------------------------------------------------------------------ the webhook */

function timingSafeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  // timingSafeEqual throws on a length mismatch, which would itself leak length — compare the
  // lengths separately and only then the bytes.
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Verifies "X-Stickly-Signature: t=<unix>,v1=<hex>" over the RAW body.
 *
 * The caller must pass the bytes exactly as they arrived. Parsing and re-serialising first changes
 * the whitespace and every signature then fails.
 *
 * The timestamp window is what stops a captured delivery being replayed later; the constant-time
 * compare is what stops the signature being guessed a byte at a time.
 */
export function verifyWebhookSignature(rawBody: string, header: string | null, toleranceSec = 300): boolean {
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
