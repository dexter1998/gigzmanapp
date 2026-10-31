/**
 * Confidence module: a 0–1 score for every component (source, API, fetch method, extractor) and
 * every pipeline, so the Planner and the Runner choose by evidence, not by habit.
 *
 *   component confidence = precision (benchmark) × success rate (live attempts, Wilson lower bound)
 *   choice score         = confidence / cost   (cost floor 0.001 so free sources rank by confidence)
 *   pipeline confidence  = Wilson lower bound of delivered/target, weighted by contact coverage
 *
 * Wilson lower bound (95%) instead of a raw ratio: 2-of-2 must not outrank 90-of-100.
 */

import { sql } from "@/lib/db";

export function wilsonLower(ok: number, n: number, z = 1.96): number {
  if (n <= 0) return 0;
  const p = ok / n;
  const den = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return Math.max(0, (centre - margin) / den);
}

export type ComponentScore = {
  component: string; capability: string; precision: number | null; liveAttempts: number; liveSuccess: number;
  successLower: number; confidence: number; costUsd: number; choiceScore: number;
};

export async function componentScores(capability?: string, placeType?: string | null): Promise<ComponentScore[]> {
  const bench = await sql`SELECT component, capability, precision, recall, cost_usd, n FROM v2_benchmarks ${capability ? sql`WHERE capability = ${capability}` : sql``}`;
  const live = await sql`
    SELECT source AS component, capability, count(*)::int AS n, count(*) FILTER (WHERE ok)::int AS ok, coalesce(avg(cost_usd), 0)::float AS cost
    FROM v2_source_attempts
    WHERE true ${capability ? sql`AND capability = ${capability}` : sql``} ${placeType ? sql`AND (place_type = ${placeType} OR place_type IS NULL)` : sql``}
    GROUP BY 1, 2`;
  const keys = new Set([...bench, ...live].map((r) => `${r.component}|${r.capability}`));
  return [...keys].map((k) => {
    const [component, cap] = k.split("|");
    const b = bench.find((r) => r.component === component && r.capability === cap);
    const l = live.find((r) => r.component === component && r.capability === cap);
    // Live attempts outweigh the benchmark once there are enough of them; until then the benchmark's
    // recall (with its own n) stands in.
    const n = (l?.n ?? 0) >= 10 ? l!.n : (b?.n ?? 0);
    const ok = (l?.n ?? 0) >= 10 ? l!.ok : Math.round((Number(b?.recall ?? 0)) * (b?.n ?? 0));
    const successLower = wilsonLower(ok, n);
    const precision = b?.precision != null ? Number(b.precision) : null;
    const confidence = (precision ?? 0.5) * successLower;
    // Cached answers log cost 0; the real price of a call is the larger of the two.
    const costUsd = Math.max(Number(l?.cost ?? 0), Number(b?.cost_usd ?? 0));
    return { component, capability: cap, precision, liveAttempts: l?.n ?? 0, liveSuccess: l?.ok ?? 0, successLower,
      confidence: Math.round(confidence * 1000) / 1000, costUsd, choiceScore: Math.round((confidence / Math.max(costUsd, 0.001)) * 10) / 10 };
  }).sort((a, b) => a.capability.localeCompare(b.capability) || b.choiceScore - a.choiceScore);
}

/** Components for a capability, best choice first. */
export async function rankComponents(capability: string, candidates: string[], placeType?: string | null): Promise<string[]> {
  const scores = await componentScores(capability, placeType);
  const s = (c: string) => scores.find((x) => x.component === c)?.choiceScore ?? 0;
  return [...candidates].sort((a, b) => s(b) - s(a));
}

export type PipelineScore = { id: string; label: string; runs: number; deliveredRate: number; contactRate: number; confidence: number };

export async function pipelineScores(): Promise<PipelineScore[]> {
  const rows = await sql`SELECT id, label, runs, target_sum, delivered_sum, email_sum, linkedin_sum FROM v2_pipelines ORDER BY last_run_at DESC LIMIT 200`;
  return rows.map((r) => {
    const delivered = wilsonLower(Number(r.delivered_sum), Math.max(Number(r.target_sum), Number(r.delivered_sum)));
    const contact = Number(r.delivered_sum) ? (Number(r.email_sum) + Number(r.linkedin_sum)) / (2 * Number(r.delivered_sum)) : 0;
    return { id: r.id, label: r.label, runs: r.runs, deliveredRate: Math.round(delivered * 100) / 100, contactRate: Math.round(contact * 100) / 100,
      confidence: Math.round(delivered * (0.6 + 0.4 * contact) * 100) / 100 };
  }).sort((a, b) => b.confidence - a.confidence);
}
