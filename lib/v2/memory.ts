/**
 * Experience memory for the orchestrator (2026-10-26): what past runs taught us, written as text the
 * model reads before deciding — not a SQL sort applied behind its back.
 *
 * Four kinds of memory, all from tables the runs already fill:
 *  - pipelines:  v2_pipelines — each distinct use case (ops + playbooks + signals + place types) with
 *                how often it ran, how much of its target it delivered, email rate, outcome score.
 *  - strategies: v2_run_steps — yield per discovery source overall and for this use case.
 *  - sources:    v2_source_attempts — success rate and cost of each paid/slow lookup.
 *  - outcomes:   v2_outcomes — what users DID with the leads (unlock, add, open, reply) per pipeline.
 *
 * `relevantPipelines` is also returned structured, so a reused pipeline is a real id the runner
 * can copy, not a name the model made up.
 */
import { sql } from "@/lib/db";
import type { CompiledPlan } from "./planner";

export type PipelineMemory = {
  id: string;
  label: string;
  runs: number;
  deliveredRate: number;
  emailRate: number;
  scorePerRun: number;
  outcomes: number;
  lastRunAt: Date | null;
  shape: { ops: string[]; playbookIds: string[]; mustHave: string[]; placeTypes: string[]; keywordMode: boolean };
  /** What each source contributed to this pipeline's delivered leads (evidence, not an order). */
  bestStrategies: string[];
  sourceStats: Array<{ strategy: string; delivered: number; avgScore: number }>;
  /** How this pipeline matches the current ask: same signals / same trades / both. */
  match: "exact" | "signals" | "trades";
};

export type Memory = {
  text: string;
  relevantPipelines: PipelineMemory[];
};

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");

/** Memory relevant to a plan draft: its place types, playbooks and required signals. */
export async function recallForPlan(draft: Pick<CompiledPlan, "trades" | "playbookIds" | "mustHave" | "scope" | "needContacts">): Promise<Memory> {
  const types = draft.trades.map((t) => t.placeType).sort();
  const must = [...(draft.mustHave ?? [])].sort();
  const books = [...draft.playbookIds].sort();

  const pipes = await sql`
    SELECT p.id, p.label, p.shape, p.runs, p.target_sum, p.delivered_sum, p.email_sum, p.score_sum, p.last_run_at,
           (SELECT count(*)::int FROM v2_outcomes o JOIN v2_runs r ON r.id = o.run_id WHERE r.pipeline_id = p.id) AS outcomes
    FROM v2_pipelines p
    WHERE p.runs > 0 AND (
      (p.shape->'placeTypes') ?| ${types.length ? types : ["__none__"]}
      OR (p.shape->'mustHave') ?| ${must.length ? must : ["__none__"]}
      OR (p.shape->'playbookIds') ?| ${books.length ? books : ["__none__"]})
    ORDER BY p.score_sum DESC, p.delivered_sum DESC LIMIT 12`;

  const ids = pipes.map((p) => p.id as string);
  const strat = ids.length ? await sql`
    SELECT r.pipeline_id AS pid, res.provenance->>'strategy' AS s, count(*)::int AS n, COALESCE(sum(res.score), 0)::float AS conf
    FROM v2_results res JOIN v2_runs r ON r.id = res.run_id
    WHERE r.pipeline_id = ANY(${ids}) AND res.rank IS NOT NULL
    GROUP BY 1, 2` : [];

  const relevant: PipelineMemory[] = pipes.map((p) => {
    const shape = p.shape as PipelineMemory["shape"];
    const sameTypes = types.length > 0 && JSON.stringify([...shape.placeTypes].sort()) === JSON.stringify(types);
    const sameMust = JSON.stringify([...shape.mustHave].sort()) === JSON.stringify(must) && JSON.stringify([...shape.playbookIds].sort()) === JSON.stringify(books);
    const mine = strat.filter((s) => s.pid === p.id).sort((a, b) => Number(b.conf) - Number(a.conf) || Number(b.n) - Number(a.n));
    const best = mine.map((s) => (s.s as string) ?? "primary");
    const sourceStats = mine.map((s) => ({ strategy: (s.s as string) ?? "primary", delivered: Number(s.n), avgScore: Number(s.n) ? Number(s.conf) / Number(s.n) : 0 }));
    return {
      id: p.id, label: p.label, runs: Number(p.runs),
      deliveredRate: Number(p.target_sum) ? Number(p.delivered_sum) / Number(p.target_sum) : 0,
      emailRate: Number(p.delivered_sum) ? Number(p.email_sum) / Number(p.delivered_sum) : 0,
      scorePerRun: Number(p.runs) ? Number(p.score_sum) / Number(p.runs) : 0,
      outcomes: Number(p.outcomes), lastRunAt: p.last_run_at ? new Date(p.last_run_at) : null, shape,
      bestStrategies: [...new Set(best)], sourceStats,
      match: sameTypes && sameMust ? "exact" : sameMust ? "signals" : "trades",
    };
  });

  const yields = await sql`
    SELECT COALESCE(input->>'strategy', 'primary') AS s, count(*)::int AS n, avg(kept_count)::float AS kept
    FROM v2_run_steps WHERE op = 'collect' AND status = 'done' GROUP BY 1 HAVING count(*) >= 2 ORDER BY 3 DESC`;
  const attempts = await sql`
    SELECT source, capability, count(*)::int AS n, count(*) FILTER (WHERE ok)::int AS ok, avg(ms)::int AS ms, sum(cost_usd)::float AS usd
    FROM v2_source_attempts GROUP BY 1, 2 HAVING count(*) >= 5 ORDER BY 3 DESC LIMIT 10`;
  const outcomes = await sql`
    SELECT o.event, count(*)::int AS n FROM v2_outcomes o GROUP BY 1 ORDER BY 2 DESC LIMIT 8`;

  const lines: string[] = [];
  if (relevant.length) {
    lines.push("PIPELINES THAT RAN BEFORE for similar asks (id · what · runs · delivered/target · with email · outcome score per run · what each source contributed). A source that delivered many rows may have been a late fallback that ran after the first choice fell short — read the per-source average score, not just the count.");
    for (const p of relevant.slice(0, 8)) {
      const src = p.sourceStats.map((x) => `${x.strategy} ${x.delivered} leads (avg score ${x.avgScore.toFixed(1)})`).join(", ");
      lines.push(`- ${p.id} [${p.match}] ${p.label} · ${p.runs} runs · delivered ${pct(p.deliveredRate * 100, 100)} of target · email ${pct(p.emailRate * 100, 100)} · score/run ${p.scorePerRun.toFixed(1)} · user actions ${p.outcomes}${src ? ` · sources: ${src}` : ""}`);
    }
  } else {
    lines.push("No earlier pipeline matches this ask (new use case).");
  }
  if (yields.length) {
    lines.push("", "DISCOVERY YIELD overall (source · runs · avg candidates kept):");
    for (const y of yields) lines.push(`- ${y.s}: ${y.n} runs, ${Number(y.kept).toFixed(0)} kept avg`);
  }
  if (attempts.length) {
    lines.push("", "LOOKUP SUCCESS (source/capability · attempts · success · avg ms · total USD):");
    for (const a of attempts) lines.push(`- ${a.source}/${a.capability}: ${a.n} tries, ${pct(Number(a.ok), Number(a.n))} ok, ${a.ms} ms, $${Number(a.usd).toFixed(2)}`);
  }
  if (outcomes.length) lines.push("", `USER OUTCOMES overall: ${outcomes.map((o) => `${o.event} ${o.n}`).join(", ")}`);

  return { text: lines.join("\n").slice(0, 3500), relevantPipelines: relevant };
}

/** Memory for a run that is short: what each source did IN THIS RUN so far. */
export async function recallForRun(runId: string): Promise<string> {
  const steps = await sql`
    SELECT op, COALESCE(input->>'strategy', '') AS s, status, raw_count, kept_count, detail
    FROM v2_run_steps WHERE run_id = ${runId} ORDER BY seq`;
  const res = await sql`
    SELECT provenance->>'strategy' AS s, count(*)::int AS n,
           count(*) FILTER (WHERE website IS NOT NULL)::int AS with_site,
           count(*) FILTER (WHERE jsonb_array_length(emails) > 0)::int AS with_email,
           count(*) FILTER (WHERE rank IS NOT NULL)::int AS kept
    FROM v2_results WHERE run_id = ${runId} GROUP BY 1`;
  const lines = ["THIS RUN SO FAR:"];
  for (const s of steps) lines.push(`- ${s.op}${s.s ? `(${s.s})` : ""}: ${s.status}${s.kept_count != null ? ` kept ${s.kept_count}/${s.raw_count ?? "?"}` : ""}${s.detail ? ` — ${String(s.detail).slice(0, 120)}` : ""}`);
  if (res.length) {
    lines.push("CANDIDATES BY SOURCE (found · with website · with email · kept in final list):");
    for (const r of res) lines.push(`- ${r.s ?? "primary"}: ${r.n} · ${r.with_site} · ${r.with_email} · ${r.kept}`);
  }
  return lines.join("\n");
}
