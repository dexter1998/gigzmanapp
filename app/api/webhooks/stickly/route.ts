import { NextRequest, NextResponse } from "next/server";
import { grantCredits } from "@/lib/credits/server";
import { sql } from "@/lib/db";
import {
  emailForSticklyId,
  STICKLY_LEDGER_REASON,
  sticklyLedgerRef,
  verifyWebhookSignature,
  type SticklyRewardClaimed,
} from "@/lib/stickly";

/**
 * Stickly calls this when one of our users claims a reward. We add the credits
 * to our own ledger — Stickly never holds them.
 *
 * Same discipline as the Razorpay and Cashfree webhooks: read the raw bytes,
 * verify over those exact bytes, and only then parse. Re-serialising before the
 * check would change the whitespace and break every signature.
 *
 * Anything we cannot act on returns 200 with `ignored`, not an error. Stickly
 * retries non-2xx on a 1m/5m/30m/2h/6h backoff, and a delivery for a user who no
 * longer exists would retry for six hours and still never succeed.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-stickly-signature");

  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  if (!process.env.STICKLY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }

  let event: SticklyRewardClaimed;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  if (event.event !== "reward.claimed") {
    return NextResponse.json({ ok: true, ignored: "unhandled_event" });
  }

  // Their "Send test webhook" button posts a synthetic claim with a made-up user.
  // Verifying the signature is the point of that button; granting credits is not.
  if (event.test) {
    return NextResponse.json({ ok: true, ignored: "test_event" });
  }

  // Test-mode keys skip token verification on their side, so `userId` is whatever
  // the browser said it was. Those claims must never move real credits.
  if (event.mode !== "live") {
    return NextResponse.json({ ok: true, ignored: "test_mode" });
  }

  const credits = Number(event.credits);
  if (!Number.isInteger(credits) || credits <= 0 || credits > 1000) {
    console.error("stickly: refusing implausible credit amount", event.credits, event.id);
    return NextResponse.json({ ok: true, ignored: "bad_amount" });
  }

  const userEmail = await emailForSticklyId(String(event.userId));
  if (!userEmail) {
    console.error("stickly: no user for", event.userId);
    return NextResponse.json({ ok: true, ignored: "unknown_user" });
  }

  // grantCredits inserts the ledger row first and lets its unique index stop the
  // balance update, but it does not check the profile exists — without this, a
  // deleted account would burn the idempotency key and grant nothing.
  const [profile] = await sql`SELECT 1 FROM user_profiles WHERE email = ${userEmail}`;
  if (!profile) {
    console.error("stickly: no profile for", userEmail);
    return NextResponse.json({ ok: true, ignored: "no_profile" });
  }

  const granted = await grantCredits(
    userEmail,
    credits,
    sticklyLedgerRef(event.id),
    STICKLY_LEDGER_REASON,
  );

  return NextResponse.json({ ok: true, granted });
}
