import { NextRequest, NextResponse } from "next/server";
import { runUserMail } from "@/lib/user-mail";
import { recordCronRun } from "@/lib/cron-runs";

/**
 * Hourly tick for the account emails in lib/email/catalog.ts (rules in lib/user-mail.ts). Hourly so
 * a finished search gets its recap the same day; the one-a-day cap and step keys stop repeats.
 *
 *   ?dry=1          who is due which mail right now, nothing sent or recorded
 *   ?to=a@b.com     only this account, ignoring the IST window
 *
 * Gated behind CRON_SECRET: this endpoint sends real email.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dryRun = req.nextUrl.searchParams.get("dry") === "1";
  const to = req.nextUrl.searchParams.get("to");
  const startedAt = new Date();
  let results;
  try {
    results = await runUserMail({ dryRun, only: to ? [to] : undefined, ignoreSchedule: !!to });
  } catch (err) {
    await recordCronRun("user_mail", startedAt, false, { dryRun }, err instanceof Error ? err.message : String(err));
    throw err;
  }
  const sent = results.filter((r) => r.sent).length;
  if (!dryRun && !to) await recordCronRun("user_mail", startedAt, true, { evaluated: results.length, sent });
  return NextResponse.json({ dryRun, evaluated: results.length, sent, results });
}
