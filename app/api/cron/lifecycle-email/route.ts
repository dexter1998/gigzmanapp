import { NextRequest, NextResponse } from "next/server";
import { runLifecycleEmails } from "@/lib/lifecycle-email";
import { recordCronRun } from "@/lib/cron-runs";

/**
 * Daily evaluation of the lifecycle email rules.
 *
 * Daily is the right cadence here rather than a limitation: every rule is expressed in whole days
 * of inactivity, so checking more often would only re-ask the same question. Each send is claimed
 * under a step key, so running twice in a day sends nothing twice.
 *
 * Gated behind CRON_SECRET as well as Vercel's own cron header — this endpoint sends real email.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const fromVercelCron = req.headers.get("x-vercel-cron") !== null;

  if (!fromVercelCron && (!secret || auth !== `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ?dry=1 reports who today's rules would reach, and why, without sending or recording anything.
  const dryRun = req.nextUrl.searchParams.get("dry") === "1";
  const startedAt = new Date();
  let results;
  try {
    results = await runLifecycleEmails(dryRun);
  } catch (err) {
    await recordCronRun("lifecycle_email", startedAt, false, { dryRun }, err instanceof Error ? err.message : String(err));
    throw err;
  }
  // Dry runs are rehearsals, not runs — recording them would let a rehearsal masquerade as the
  // nightly send in the admin panel's "last run" answer.
  if (!dryRun) {
    await recordCronRun("lifecycle_email", startedAt, true, {
      evaluated: results.length,
      sent: results.filter((r) => r.sent).length,
    });
  }
  return NextResponse.json({
    dryRun,
    evaluated: results.length,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
