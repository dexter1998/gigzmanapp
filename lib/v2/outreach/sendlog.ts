/**
 * The campaign activity log (v2_send_log): one short line per thing that happened to a send, so
 * the builder can show what ran — live, and after the campaign ends (Tarun, 2026-11-02: a call sat
 * "on the line" for 10 minutes and nothing said why). Never throws: a log line must not stop a send.
 */
import { sql } from "@/lib/db";

export type LogKind = "queued" | "dial" | "deferred" | "call_status" | "outcome" | "retry" | "skipped" | "failed" | "sent" | "campaign";

export async function logSend(campaignId: string, sendId: number | null, kind: LogKind, text: string): Promise<void> {
  await sql`INSERT INTO v2_send_log (campaign_id, send_id, kind, text) VALUES (${campaignId}, ${sendId}, ${kind}, ${text.slice(0, 500)})`.catch(() => {});
}
