/**
 * The learning loop for derived signals. A need is only as good as the replies it brings: each
 * reply / bounce / meeting is recorded against the signals its lead carried (signal_outcomes),
 * and ranking multiplies a need's weight by how its leads actually answered — measured, with
 * smoothing, so a handful of sends can't swing it.
 */

import { sql } from "@/lib/db";

export async function recordOutcome(resultId: number | null, outcome: string, campaignId: string | null): Promise<void> {
  if (!resultId) return;
  const [r] = await sql`SELECT domain, signals FROM v2_results WHERE id = ${resultId}`;
  if (!r?.domain) return;
  const derived = Array.isArray(r.signals?.derived) ? (r.signals.derived as Array<{ signal: string; ruleId?: string }>) : [];
  for (const d of derived) {
    await sql`INSERT INTO signal_outcomes (entity, signal, rule_id, outcome, campaign_id) VALUES (${r.domain}, ${d.signal}, ${d.ruleId ?? null}, ${outcome}, ${campaignId})`;
  }
}

/**
 * Per-need weight in [0.5, 1.5]: its leads' reply rate against the overall reply rate, with 20
 * pseudo-sends of prior so a need needs real volume before it moves. 1 when nothing is known.
 */
export async function needWeights(): Promise<Map<string, number>> {
  const rows = await sql`
    SELECT d->>'signal' AS sig, count(DISTINCT s.result_id)::int AS sent,
           count(DISTINCT s.result_id) FILTER (WHERE s.replied_at IS NOT NULL)::int AS replied
    FROM v2_sends s JOIN v2_results r ON r.id = s.result_id
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(r.signals->'derived', '[]'::jsonb)) d
    WHERE s.status = 'sent' AND NOT s.is_test
    GROUP BY 1`;
  const sent = rows.reduce((a, r) => a + (r.sent as number), 0);
  const replied = rows.reduce((a, r) => a + (r.replied as number), 0);
  if (sent < 50) return new Map();
  const base = (replied + 1) / (sent + 20);
  return new Map(rows.map((r) => [r.sig as string, Math.max(0.5, Math.min(1.5, ((r.replied as number) + base * 20) / ((r.sent as number) + 20) / base))]));
}
