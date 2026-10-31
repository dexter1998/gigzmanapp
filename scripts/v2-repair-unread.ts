/**
 * Repairs finished V2 runs whose delivered list still has never-read websites (rows that showed
 * "Checking website…" forever): reads them and re-ranks, the same pass new runs do in their rank
 * step. Website reads are free; profile lookups follow the run's own plan (savedOnly respected).
 *
 * usage: npx tsx --env-file=.env.local scripts/v2-repair-unread.ts <runId> [runId ...]
 *        npx tsx --env-file=.env.local scripts/v2-repair-unread.ts --all   # every finished run with unread delivered rows
 */
import { sql } from "@/lib/db";
import { readUnreadDelivered } from "@/lib/v2/runner";
import type { CompiledPlan } from "@/lib/v2/planner";

async function main() {
  const args = process.argv.slice(2);
  const ids: string[] = args[0] === "--all"
    ? (await sql`SELECT DISTINCT r.run_id::text AS id FROM v2_results r JOIN v2_runs u ON u.id = r.run_id
                 WHERE u.status IN ('done','stopped') AND r.rank IS NOT NULL AND NOT r.site_checked AND r.website IS NOT NULL`).map((x) => x.id as string)
    : args;
  for (const id of ids) {
    const [run] = await sql`SELECT plan FROM v2_runs WHERE id = ${id}`;
    if (!run) { console.log(id, "not found"); continue; }
    let total = 0;
    for (let i = 0; i < 4; i++) { const n = await readUnreadDelivered(id, run.plan as CompiledPlan); total += n; if (!n) break; }
    const [d] = await sql`SELECT count(*) FILTER (WHERE rank IS NOT NULL)::int AS delivered FROM v2_results WHERE run_id = ${id}`;
    await sql`UPDATE v2_runs SET delivered = ${d.delivered} WHERE id = ${id}`;
    console.log(id, `read ${total} websites; delivered ${d.delivered}`);
  }
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
