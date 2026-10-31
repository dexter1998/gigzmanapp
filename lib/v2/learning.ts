/**
 * Outcome log for progressive learning (2026-10-23). Every thing that happens to a lead after Mantis
 * found it — queued in a campaign, sent, replied, bounced, called, booked, contacted from the Leads
 * table — is written once to v2_outcomes, tied back to the run, the pipeline and the strategy that
 * found it, so yield can later be weighed by what actually converted (Tarun: "abhi chahe work na
 * kre, but atleast data save ho"). Best-effort: a logging failure never fails the action itself.
 */

import { sql } from "@/lib/db";

export type OutcomeEvent =
  | "queued_in_campaign" | "sent" | "send_failed" | "replied" | "interested" | "unsubscribed" | "bounced" | "auto_reply"
  | "call_answered" | "call_not_answered" | "meeting_booked"
  | "contact_email" | "contact_call" | "contact_whatsapp" | "open_site" | "open_linkedin" | "unlock" | "add_to_leads";

export async function logOutcome(o: {
  userEmail: string; event: OutcomeEvent; resultId?: number | string | null; runId?: string | null; campaignId?: string | null;
  channel?: string | null; detail?: Record<string, string | number | boolean | null> | null;
}): Promise<void> {
  try {
    const rid = o.resultId != null && /^\d+$/.test(String(o.resultId)) ? String(o.resultId) : null;
    const [r] = rid
      ? await sql`SELECT r.run_id, r.lead_id, r.provenance->>'strategy' AS strategy, u.pipeline_id
                  FROM v2_results r JOIN v2_runs u ON u.id = r.run_id WHERE r.id = ${rid}`
      : o.runId ? await sql`SELECT id AS run_id, NULL::uuid AS lead_id, NULL AS strategy, pipeline_id FROM v2_runs WHERE id = ${o.runId}` : [];
    await sql`
      INSERT INTO v2_outcomes (user_email, run_id, result_id, lead_id, event, pipeline_id, strategy, campaign_id, channel, detail)
      VALUES (${o.userEmail}, ${r?.run_id ?? o.runId ?? null}, ${rid}, ${r?.lead_id ?? null}, ${o.event}, ${r?.pipeline_id ?? null},
              ${r?.strategy ?? null}, ${o.campaignId ?? null}, ${o.channel ?? null}, ${o.detail ? sql.json(o.detail) : null})`;
  } catch (err) {
    console.error("logOutcome failed:", (err as Error).message);
  }
}
