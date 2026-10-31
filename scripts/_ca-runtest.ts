import fs from "node:fs";
import { sql } from "@/lib/db";
import { tickRun } from "@/lib/v2/runner";
// Runs the exact production plan of the CA Gurugram run (0/20 in 9.5 min) through the local runner.
(async () => {
  const plan = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  plan.steps = plan.steps.filter((s: { op: string }) => s.op !== "discover"); // saved data only, no Places spend
  if (process.argv[3]) plan.signalMode = process.argv[3];
  const email = "test@mantisai.in";
  const [ch] = await sql`INSERT INTO chats (user_email, title) VALUES (${email}, 'runtest CA gurugram') RETURNING id`;
  const [run] = await sql`INSERT INTO v2_runs (chat_id, user_email, kind, plan, target, est_credits, status) VALUES (${ch.id}, ${email}, 'leads', ${sql.json(plan)}, ${plan.target}, ${plan.estCredits}, 'running') RETURNING id`;
  for (const [i, st] of plan.steps.entries()) await sql`INSERT INTO v2_run_steps (run_id, seq, playbook_id, op, label, input) VALUES (${run.id}, ${i}, ${plan.playbookIds[0] ?? null}, ${st.op}, ${st.label}, ${sql.json(st.input)})`;
  const t0 = Date.now();
  let snap = null;
  for (let i = 0; i < 60; i++) { snap = await tickRun(run.id, email); if (!snap || snap.status !== "running") break; }
  const steps = await sql`SELECT seq, op, status, raw_count, kept_count, left(detail,140) d FROM v2_run_steps WHERE run_id = ${run.id} ORDER BY seq`;
  for (const s of steps) console.log(s.seq, s.op, s.status, s.raw_count, s.kept_count, s.d);
  const kept = await sql`SELECT count(*) FILTER (WHERE signals->>'no_website' = 'true')::int nosite, count(*) FILTER (WHERE signals->>'no_meta_pixel' = 'true')::int nopixel, count(*) FILTER (WHERE phone IS NOT NULL OR jsonb_array_length(emails) > 0)::int reach FROM v2_results WHERE run_id = ${run.id} AND rank IS NOT NULL`;
  console.log("status", snap?.status, "delivered", snap?.delivered, "/", plan.target, "in", Math.round((Date.now() - t0) / 1000), "s");
  console.log(kept);
  process.exit(0);
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
