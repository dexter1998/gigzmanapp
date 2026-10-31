/**
 * Local replay of the QA suites and of real user asks through the rebuilt agent (2026-10-26).
 * savedOnly: no Places / Exa / Apollo spend in bulk (memory rule); model calls still run.
 *   npx tsx scripts/_replay.ts <cases.json> [report.md] [concurrency]
 * Case: { id, cat, steps: [{say}|{pick: regex}|{run: true}], check }
 */
import fs from "node:fs";
import { sql } from "@/lib/db";
import { runV2Turn } from "@/lib/v2/turn";
import { tickRun } from "@/lib/v2/runner";
process.env.V2_ORCHESTRATOR = "1";
const email = process.env.REPLAY_EMAIL ?? "test@mantisai.in";
type Step = { say?: string; pick?: string; run?: boolean };
type Case = { id: string; cat: string; steps: Step[]; check?: string };
const [file, report = "replay-report.md", concS = "3"] = process.argv.slice(2);
const cases: Case[] = JSON.parse(fs.readFileSync(file, "utf8"));
const conc = Number(concS);

async function one(c: Case): Promise<string> {
  const lines: string[] = [`### ${c.id} (${c.cat})`, c.check ? `_check: ${c.check}_` : ""];
  const [ch] = await sql`INSERT INTO chats (user_email, title) VALUES (${email}, ${"replay " + c.id}) RETURNING id`;
  let last: any = null; let runId: string | null = null; const t0 = Date.now();
  try {
    for (const st of c.steps) {
      let message = "", action: any = null;
      if (st.say) message = st.say;
      else if (st.pick) {
        const ctx = last?.blocks?.find((b: any) => b.type === "context");
        const opts = [...(last?.clarification?.options ?? []), ...(last?.chips ?? [])];
        const re = new RegExp(st.pick, "i");
        const o = opts.find((x: any) => re.test(x.label));
        if (ctx && /^\^?(yes|haan|use)/i.test(st.pick)) { message = `Use ${ctx.name}`; action = { type: "confirm_context", profileId: ctx.profileId, offering: ctx.offerings[0] ?? null, brief: ctx.brief }; }
        else if (o) { message = o.label; action = o.action ?? null; if (!o.action && o.value && o.value !== "__FOCUS_COMPOSER__") message = o.value; }
        else if (last?.runId || last?.blocks?.some((b: any) => b.type === "scope")) { lines.push(`  (skip pick /${st.pick}/ — already planned)`); continue; }
        else { lines.push(`  !! no option /${st.pick}/ in [${opts.map((x: any) => x.label).join(" | ")}]`); break; }
      } else if (st.run) {
        const scope = last?.blocks?.find((b: any) => b.type === "scope");
        const rid = scope?.runId ?? last?.runId;
        if (!rid) { lines.push("  !! run: no plan to run"); break; }
        message = "Run this"; action = { type: "run_plan", runId: rid }; runId = rid;
      }
      lines.push(`USER: ${message}${action ? ` [${action.type}]` : ""}`);
      last = await runV2Turn({ chatId: ch.id, userEmail: email, message, action, savedOnly: true });
      const ctx = last.blocks?.find((b: any) => b.type === "context"); const scope = last.blocks?.find((b: any) => b.type === "scope");
      lines.push(`BOT (${last.turnType}/${last.action}): ${String(last.reply).replace(/\s+/g, " ").slice(0, 320)}`);
      if (ctx) lines.push(`  CARD: ${ctx.name} · offerings ${ctx.offerings.length} · buyers [${ctx.buyers.slice(0, 4).join(", ")}]`);
      if (scope) lines.push(`  SCOPE: ${scope.industry} @ ${scope.geography} · signals [${scope.signals.map((s: any) => s.label).join(", ")}] · reused=${scope.reusedPipeline}\n  WHY: ${(scope.reasoning ?? "").replace(/\s+/g, " ").slice(0, 240)}`);
      const opts = [...(last.clarification?.options ?? []), ...(last.chips ?? [])].map((x: any) => x.label);
      if (opts.length) lines.push(`  options: ${opts.join(" | ")}`);
      if (last.runId && !runId && last.action === "search_leads") runId = last.runId;
      if (runId && (action?.type === "run_plan" || last.action === "search_leads")) {
        const t1 = Date.now(); let snap: any = null;
        for (let i = 0; i < 60 && Date.now() - t1 < 8 * 60e3; i++) {
          snap = await tickRun(runId, email);
          if (!snap || snap.status !== "running") break;
          await sql`UPDATE v2_runs SET locked_until = 'epoch' WHERE id = ${runId}`;
        }
        const [r] = await sql`SELECT status, target, delivered FROM v2_runs WHERE id = ${runId}`;
        const cats = await sql`SELECT category, count(*)::int n FROM v2_results WHERE run_id = ${runId} AND rank IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 5`;
        const ds = await sql`SELECT at, decision->>'reasoning' AS why, decision->>'strategy' AS s FROM v2_decisions WHERE run_id = ${runId} AND at = 'rank' ORDER BY id`;
        lines.push(`  RUN ${r?.status} delivered ${r?.delivered}/${r?.target} in ${((Date.now() - t1) / 1000).toFixed(0)}s · categories: ${cats.map((x) => `${x.category} ${x.n}`).join(", ")}`);
        for (const d of ds) lines.push(`  MID-RUN: ${d.s ?? "stop"} — ${String(d.why ?? "").replace(/\s+/g, " ").slice(0, 200)}`);
      }
    }
  } catch (e) { lines.push(`  !! THREW ${(e as Error).message.slice(0, 200)}`); }
  lines.push(`  total ${((Date.now() - t0) / 1000).toFixed(0)}s`, "");
  return lines.join("\n");
}

(async () => {
  const out: string[] = [`# Replay ${file} — ${new Date().toISOString()} (${cases.length} cases, savedOnly, orchestrator on)`, ""];
  let i = 0;
  await Promise.all(Array.from({ length: conc }, async () => {
    while (i < cases.length) { const c = cases[i++]; const r = await one(c); out.push(r); fs.writeFileSync(report, out.join("\n")); console.log(`done ${c.id}`); }
  }));
  fs.writeFileSync(report, out.join("\n"));
  console.log("report", report);
  process.exit(0);
})();
