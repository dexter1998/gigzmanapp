import { NextRequest, NextResponse } from "next/server";
import { runLeadAlerts } from "@/lib/lead-alerts";
import { recordCronRun } from "@/lib/cron-runs";

/**
 * Hourly tick for the Bark-style lead alerts (lib/lead-alerts.ts). Hourly is not the alert rate:
 * each user gets at most one alert per five hours, and none at night in IST. Ticking hourly just
 * means a user's five hours start from when their last alert went out, not from a fixed clock.
 *
 *   ?dry=1           who would get which lead right now, nothing sent or recorded
 *   ?to=a@b.com      only this account, ignoring the schedule (a test send to yourself)
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
    results = await runLeadAlerts({ dryRun, only: to ? [to] : undefined, ignoreSchedule: !!to });
  } catch (err) {
    await recordCronRun("lead_alerts", startedAt, false, { dryRun }, err instanceof Error ? err.message : String(err));
    throw err;
  }
  const sent = results.filter((r) => r.sent).length;
  if (!dryRun && !to) await recordCronRun("lead_alerts", startedAt, true, { evaluated: results.length, sent });
  return NextResponse.json({ dryRun, evaluated: results.length, sent, results });
}
