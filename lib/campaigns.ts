import { sql } from "@/lib/db";

export type DueCampaignSend = {
  campaignId: string;
  sender: string;
  stream: string;
  stepKey: string;
  subject: string;
  html: string;
  text: string;
  recipientEmail: string;
  values: Record<string, string>;
};

/**
 * Recipient/step pairs that are due (batch start + the step's day offset has passed) and not yet
 * sent, oldest batch first, step order ascending so an earlier touch always sends before a later
 * one for the same recipient even after a cron gap. Suppression is checked here rather than by
 * the caller, so a suppressed pair never even counts toward the tick's limit.
 */
export async function getDueCampaignSends(limit: number): Promise<DueCampaignSend[]> {
  const rows = await sql`
    SELECT c.id AS campaign_id, c.sender, c.stream,
           cs.step_key, cs.subject, cs.html, cs.text,
           cr.email AS recipient_email, cr.values
    FROM campaign_batch_runs cbr
    JOIN campaigns c ON c.id = cbr.campaign_id AND c.status = 'active'
    JOIN campaign_recipients cr ON cr.campaign_id = c.id AND cr.batch = cbr.batch
    JOIN campaign_steps cs ON cs.campaign_id = c.id
    LEFT JOIN email_sends es
      ON es.recipient = cr.email AND es.campaign_id = c.id AND es.step_key = cs.step_key
    WHERE es.id IS NULL
      AND cbr.started_at + (cs.send_day_offset || ' days')::interval <= now()
      AND NOT EXISTS (
        SELECT 1 FROM email_unsubscribes eu
        WHERE eu.email = cr.email AND eu.stream IN ('all', c.stream)
      )
    ORDER BY cbr.started_at ASC, cr.email ASC, cs.step_order ASC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    campaignId: r.campaign_id as string,
    sender: r.sender as string,
    stream: r.stream as string,
    stepKey: r.step_key as string,
    subject: r.subject as string,
    html: r.html as string,
    text: r.text as string,
    recipientEmail: r.recipient_email as string,
    values: r.values as Record<string, string>,
  }));
}
