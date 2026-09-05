import { NextRequest, NextResponse } from "next/server";
import { recordCronRun } from "@/lib/cron-runs";
import { dueForRefresh, refreshCompany, REFRESH_INTERVAL_DAYS } from "@/lib/jobs/store";

/**
 * Re-scrapes companies whose listings have gone stale (see REFRESH_INTERVAL_DAYS).
 *
 * Runs nightly and takes a fixed-size bite of the oldest-first queue rather than draining it: the
 * queue grows with every area a user scans, so an unbounded run would eventually exceed the
 * function timeout and lose the whole night's work instead of most of it. A backlog simply takes
 * a few nights to clear, and next_refresh_at ordering guarantees it clears fairly.
 *
 * Crawls only — nothing here calls a metered upstream API, so it costs no credits and charges
 * nobody.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Sized to finish inside maxDuration at the ~2-4s per company the crawl actually takes. */
const BATCH_SIZE = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const fromVercelCron = req.headers.get("x-vercel-cron") !== null;

  if (!fromVercelCron && (!secret || authHeader !== `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();
  const summary = { companies: 0, inserted: 0, updated: 0, closed: 0, failed: 0 };

  try {
    const due = await dueForRefresh(BATCH_SIZE);
    for (const company of due) {
      summary.companies++;
      try {
        const stats = await refreshCompany(company.id, company.domain);
        summary.inserted += stats.inserted;
        summary.updated += stats.updated;
        summary.closed += stats.closed;
      } catch {
        // One unreachable domain must not end the batch; refreshCompany has already written its
        // own failure status, so the row simply waits for the next run.
        summary.failed++;
      }
    }
  } catch (err) {
    await recordCronRun("jobs_refresh", startedAt, false, summary, err instanceof Error ? err.message : String(err));
    throw err;
  }

  await recordCronRun("jobs_refresh", startedAt, true, summary);
  return NextResponse.json({ ok: true, refreshIntervalDays: REFRESH_INTERVAL_DAYS, ...summary });
}
