import "server-only";
import crypto from "node:crypto";
import { sql } from "@/lib/db";

/**
 * Stickly rewards: identity signing, webhook verification, and the opaque id map.
 *
 *   STICKLY_PUBLIC_KEY      safe in the browser; the only one that ships to the client
 *   STICKLY_SIGNING_SECRET  signs the token that says which of our users is claiming
 *   STICKLY_WEBHOOK_SECRET  verifies an incoming reward webhook really came from Stickly
 *
 * The two secrets are easy to confuse. Ours is `whsec_` + 64 hex, which is NOT the 48 hex the
 * install guide describes: 64 hex is sha256, the shape Stickly's own migration backfill produced
 * for workspaces created before they moved to `stksign_` + randomBytes(24). It is the right value
 * and it is verified working — 800 credits have been granted through it — so do not "fix" it to
 * match the documentation.
 */

export const STICKLY_CDN = "https://cdn.stickly.live/w.js";
export const STICKLY_PUBLIC_KEY = process.env.STICKLY_PUBLIC_KEY ?? "";

export const STICKLY_LEDGER_REASON = "stickly_reward";
export const sticklyLedgerRef = (eventId: string) => `stickly:${eventId}`;

/* ------------------------------------------------------------------ opaque identity */

/**
 * Mantis keys users by email, and `sub` travels to a third party, sits in a JWT the browser can
 * read, and comes back in every webhook. Sending the email would export the customer list, so each
 * user gets an opaque `u_…` id instead and `stickly_users` maps it both ways.
 *
 * The mapping is permanent on purpose: regenerating it would orphan the claim history of everyone
 * who has already earned credits, because Stickly would keep sending the old id.
 */
export async function sticklyIdFor(userEmail: string): Promise<string> {
  const [existing] = await sql`
    SELECT stickly_id FROM stickly_users WHERE user_email = ${userEmail}
  `;
  if (existing) return existing.stickly_id as string;

  const id = `u_${crypto.randomBytes(12).toString("hex")}`;
  // ON CONFLICT: two tabs opening at once would otherwise race to insert the same user.
  const [row] = await sql`
    INSERT INTO stickly_users (stickly_id, user_email) VALUES (${id}, ${userEmail})
    ON CONFLICT (user_email) DO UPDATE SET user_email = EXCLUDED.user_email
    RETURNING stickly_id
  `;
  return row.stickly_id as string;
}

export async function emailForSticklyId(sticklyId: string): Promise<string | null> {
  const [row] = await sql`
    SELECT user_email FROM stickly_users WHERE stickly_id = ${sticklyId}
  `;
  return (row?.user_email as string) ?? null;
}

/* ------------------------------------------------------------------ the token */

const b64url = (s: string) => Buffer.from(s).toString("base64url");

/**
 * HS256 by hand rather than pulling in jsonwebtoken for one three-field payload, matching how
 * lib/razorpay.ts already signs.
 *
 * No `name` or `email` claim. The guide offers them, and they only change what shows in Stickly's
 * own Activity feed — the trade is that Stickly then stores a real address for every user. The
 * opaque id is enough for the feed to be useful to us.
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
  // timingSafeEqual throws on a length mismatch, and the throw would itself leak the length.
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Verifies "X-Stickly-Signature: t=<unix>,v1=<hex>" over the RAW body.
 *
 * The caller must pass the bytes exactly as they arrived: parsing and re-serialising changes the
 * whitespace and every signature then fails. The timestamp window is what stops a captured
 * delivery being replayed later; the constant-time compare is what stops the signature being
 * guessed a byte at a time.
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
