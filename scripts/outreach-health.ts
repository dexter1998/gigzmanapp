/**
 * One answer to "is anything being missed?" — run it instead of reconstructing the funnel by hand.
 *
 *   npx tsx --env-file=.env.local scripts/outreach-health.ts
 *
 * Needs the SSM tunnel open first: scripts/prod-tunnel.sh
 *
 * Built after a block that lasted 19 hours went unnoticed. Each tick reported itself fine —
 * not blocked by its own account, capacity healthy, sent 0 — while 19,008 recipients drifted past
 * their touch-4 window. Every number below is one that would have shown it.
 */
import { useProdDb } from "../lib/db-prod";

// Not a static import from ../lib/outreach/planner: that module imports lib/db, whose pool is
// built at import time from DATABASE_URL, so pulling in the constant that way silently connects
// this script to the local dev database instead of prod. Imported dynamically below instead.
let BACKLOG_ALERT_HOURS = 12;

async function main() {
  await useProdDb();
  const { sql } = await import("../lib/db");
  BACKLOG_ALERT_HOURS = (await import("../lib/outreach/planner")).BACKLOG_ALERT_HOURS;
  let problems = 0;

  const campaigns = (await sql`
    SELECT id, max_touches FROM campaigns WHERE status = 'active'`) as unknown as
    { id: string; max_touches: number }[];

  for (const c of campaigns) {
    console.log(`\n=== ${c.id}`);

    const [b] = await sql`
      SELECT count(*)::int overdue, min(next_due_at) oldest,
             count(*) FILTER (WHERE next_due_at < now() - interval '12 hours')::int over_12h
        FROM campaign_recipients
       WHERE campaign_id = ${c.id} AND do_not_send = false
         AND state NOT IN ('suppressed','converted','stalled')
         AND touch_count > 0 AND touch_count < ${c.max_touches}
         AND next_due_at IS NOT NULL AND next_due_at <= now()`;
    const lag = b.oldest ? (Date.now() - new Date(b.oldest as string).getTime()) / 3_600_000 : null;
    console.log(`backlog: ${b.overdue} due now, ${b.over_12h} over 12h, oldest ${lag === null ? "-" : lag.toFixed(1) + "h"} late`);
    if (lag !== null && lag >= BACKLOG_ALERT_HOURS) {
      problems++;
      console.log(`  PROBLEM: follow-ups are ${lag.toFixed(1)}h behind — the scheduled local window has passed`);
    }

    // A gate that has blocked every recent tick is the signal, not a single blocked tick.
    const blocked = (await sql`
      SELECT coalesce(blocked_by,'(ran)') gate, count(*)::int ticks, sum(sent)::int sent
        FROM outreach_runs
       WHERE campaign_id = ${c.id} AND started_at > now() - interval '6 hours'
       GROUP BY 1 ORDER BY 2 DESC`) as unknown as
      { gate: string; ticks: number; sent: number }[];
    console.log("last 6h of ticks:", blocked.map((r) => `${r.gate} x${r.ticks} (sent ${r.sent ?? 0})`).join(", ") || "none");
    const total = blocked.reduce((a, r) => a + r.ticks, 0);
    const stuck = blocked.find((r) => r.gate !== "(ran)" && r.ticks === total && total >= 4);
    if (stuck) {
      problems++;
      console.log(`  PROBLEM: every tick for 6h blocked by ${stuck.gate} — this will not clear itself`);
    }

    // The funnel's terminal states. The pipeline's job is to move everyone to one of them, so a
    // large 'active' population that is not due anything is the shape of a leak.
    console.log("states:");
    console.table(await sql`
      SELECT state, count(*)::int n,
             count(*) FILTER (WHERE do_not_send)::int retired,
             count(*) FILTER (WHERE next_due_at IS NULL AND NOT do_not_send
                               AND state NOT IN ('suppressed','converted','stalled'))::int live_but_unscheduled
        FROM campaign_recipients WHERE campaign_id = ${c.id}
       GROUP BY 1 ORDER BY 2 DESC`);

    const [orphan] = await sql`
      SELECT count(*)::int n FROM campaign_recipients
       WHERE campaign_id = ${c.id} AND do_not_send = false
         AND state NOT IN ('suppressed','converted','stalled')
         AND touch_count > 0 AND touch_count < ${c.max_touches}
         AND next_due_at IS NULL`;
    if (Number(orphan.n) > 0) {
      problems++;
      console.log(`  PROBLEM: ${orphan.n} mid-journey recipients have no next_due_at — they will never be picked up`);
    }
  }

  console.log(problems === 0 ? "\nOK — nothing missed" : `\n${problems} problem(s) above`);
  await sql.end();
  process.exit(problems === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
