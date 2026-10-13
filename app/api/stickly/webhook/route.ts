import { NextResponse } from "next/server";
import {
  STICKLY_LEDGER_REASON,
  emailForSticklyId,
  sticklyLedgerRef,
  verifyWebhookSignature,
  type SticklyRewardClaimed,
} from "@/lib/stickly";
import { grantCredits } from "@/lib/credits/server";
import { sql } from "@/lib/db";

/**
 * Stickly tells us a task was claimed; we grant the credits.
 *
 * No session is involved and none must be: this is a server-to-server call, and anything that
 * redirected it to a login page would turn every delivery into a 307 and an HTML body. Mantis has
 * no middleware, so the path is reachable as-is.
 *
 * Anything we cannot act on returns 200 with `ignored`, not an error. A non-2xx is retried on
 * 1m/5m/30m/2h/6h for six hours, and a delivery we will never be able to use would spend all of
 * them failing.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // RAW body first. Parsing and re-serialising changes the whitespace and breaks every signature.
  const raw = await req.text();
  const sig = req.headers.get("x-stickly-signature");

  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  if (!process.env.STICKLY_WEBHOOK_SECRET) {
    console.error("stickly: webhook secret is not set, refusing delivery");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }
  if (!verifyWebhookSignature(raw, sig)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let event: SticklyRewardClaimed;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  if (event.event !== "reward.claimed") {
    return NextResponse.json({ ok: true, ignored: "unhandled_event" });
  }

  // The dashboard's "Send test webhook" posts a synthetic claim with a made-up user. Verifying the
  // signature is the point of that button; granting credits is not. Logged because this is the
  // only signal that a test delivery actually reached us -- without it, "I sent a test webhook"
  // can only be checked on Stickly's side, which is exactly how a wrong endpoint URL once stayed
  // invisible while a real grant was lost.
  if (event.test) {
    console.log("stickly: test delivery received and ignored", event.id);
    return NextResponse.json({ ok: true, ignored: "test_event" });
  }

  // Test-mode keys skip token verification on Stickly's side, so `userId` there is whatever the
  // browser said it was. Those claims must never move real credits.
  if (event.mode === "test") {
    return NextResponse.json({ ok: true, ignored: "test_mode" });
  }

  // A claim is worth what the reward is worth; anything outside that is a bug somewhere, and a
  // silent six-figure grant is worse than a refused one.
  if (!Number.isInteger(event.credits) || event.credits <= 0 || event.credits > 1000) {
    console.error("stickly: refusing implausible credit amount", event.credits, event.id);
    return NextResponse.json({ ok: true, ignored: "bad_amount" });
  }

  const userEmail = await emailForSticklyId(event.userId);
  if (!userEmail) {
    console.error("stickly: no user for", event.userId);
    return NextResponse.json({ ok: true, ignored: "unknown_user" });
  }

  // grantCredits does not check the profile exists, and a deleted account would burn the
  // idempotency key while granting nothing.
  const [profile] = await sql`SELECT 1 FROM user_profiles WHERE email = ${userEmail}`;
  if (!profile) {
    console.error("stickly: no profile for", userEmail);
    return NextResponse.json({ ok: true, ignored: "no_profile" });
  }

  // Keyed on the claim id: the partial unique index on (reason, ref) is what makes a retry a
  // no-op rather than a second grant. Retries WILL happen.
  const granted = await grantCredits(
    userEmail,
    event.credits,
    sticklyLedgerRef(event.id),
    STICKLY_LEDGER_REASON,
  );

  return NextResponse.json({ ok: true, granted });
}
