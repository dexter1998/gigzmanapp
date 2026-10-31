/** Start the newest planned run of a chat and tick it to the end locally; print the orchestrator's mid-run decisions. */
import { sql } from "@/lib/db";
import { startRun, tickRun } from "@/lib/v2/runner";
const email = "test@mantisai.in";
(async () => {
  const want = process.argv[2] ?? "";
  const [run] = await sql`SELECT r.id, r.plan->>'title' AS t FROM v2_runs r WHERE r.user_email = ${email} AND r.status = 'planned' AND (r.plan->>'title') ILIKE ${"%" + want + "%"} ORDER BY r.created_at DESC LIMIT 1`;
  if (!run) { console.log("no planned run matching", want); process.exit(1); }
  console.log("run", run.id, run.t);
  await startRun(run.id, email);
  for (let i = 0; i < 40; i++) {
    const s = await tickRun(run.id, email);
    const live = s?.steps.find((x) => x.status === "running") ?? s?.steps[s.steps.length - 1];
    console.log(`tick ${i}: ${s?.status} · ${live?.label} — ${live?.detail ?? ""}`.slice(0, 220));
    if (!s || s.status !== "running") break;
    await sql`UPDATE v2_runs SET locked_until = 'epoch' WHERE id = ${run.id}`;
  }
  const ds = await sql`SELECT at, decision FROM v2_decisions WHERE run_id = ${run.id} ORDER BY id`;
  for (const d of ds) console.log(`DECISION @${d.at}: ${JSON.stringify({ ...(d.decision as object), trace: undefined }).slice(0, 500)}`);
  const steps = await sql`SELECT seq, op, status, kept_count, raw_count, left(detail, 160) d FROM v2_run_steps WHERE run_id = ${run.id} ORDER BY seq`;
  for (const s of steps) console.log(`  ${s.seq} ${s.op} ${s.status} ${s.kept_count ?? ""}/${s.raw_count ?? ""} ${s.d ?? ""}`);
  process.exit(0);
})();
