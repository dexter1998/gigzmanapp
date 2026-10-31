/**
 * The Inbox "AI summary" card: what the lead said, and what to do next, in two short lines.
 * Made once per reply (cached on v2_inbox) from the reply, the touch it answered and the lead's
 * earlier replies in the same campaign — a newer reply gets its own, so the card is always the latest.
 */
import { sql } from "@/lib/db";
import { callTool, MODELS } from "../claude";

export type ReplySummary = { summary: string; next: string | null; at: string; replyAt: string };

const TOOL = {
  name: "summarise_reply",
  description: "Summarise a lead's reply to a cold outreach touch.",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "One or two short sentences: what the lead said or decided, with any date, time, price or person they named. No greeting, no filler." },
      next: { type: ["string", "null"], description: "The single next step for the seller, a few words ('Call Thu 11 am', 'Send price list', 'Stop — asked not to contact'). Null if nothing to do." },
    },
    required: ["summary", "next"],
  },
};

const clip = (s: string | null | undefined, n: number) => (s ?? "").replace(/\s+\n/g, "\n").trim().slice(0, n);
/** A reply without the quoted thread under it. */
const ownPart = (body: string) => body.split(/\n\s*On .{6,200}wrote:\s*\n/)[0].split("\n").filter((l) => !/^\s*>/.test(l)).join("\n").trim() || body.trim();

export async function replySummary(email: string, id: number, opts: { refresh?: boolean } = {}): Promise<ReplySummary | null> {
  const [r] = await sql`
    SELECT i.id, i.channel, i.subject, i.body, i.from_name, i.received_at, i.campaign_id, i.result_id, i.kind, i.ai_summary, i.ai_summary_at
    FROM v2_inbox i WHERE i.id = ${id} AND i.user_email = ${email}`;
  if (!r) return null;
  const replyAt = (r.received_at as Date).toISOString();
  const cached = r.ai_summary as { summary?: string; next?: string | null } | null;
  if (cached?.summary && !opts.refresh) return { summary: cached.summary, next: cached.next ?? null, at: (r.ai_summary_at as Date).toISOString(), replyAt };

  const [touch] = await sql`
    SELECT s.channel, s.sent_at FROM v2_sends s
    WHERE s.campaign_id = ${r.campaign_id} AND (${r.result_id}::bigint IS NULL OR s.result_id = ${r.result_id}) AND s.sent_at <= ${r.received_at}
    ORDER BY s.sent_at DESC LIMIT 1`;
  const earlier = r.result_id == null ? [] : await sql`
    SELECT channel, body, received_at FROM v2_inbox
    WHERE user_email = ${email} AND campaign_id = ${r.campaign_id} AND result_id = ${r.result_id} AND id <> ${id} AND received_at < ${r.received_at}
    ORDER BY received_at DESC LIMIT 2`;
  const body = r.channel === "call" ? clip(r.body, 6000) : clip(ownPart(String(r.body ?? "")), 3000);
  const context = [
    `Channel: ${r.channel}${r.kind !== "reply" ? ` (${r.kind})` : ""}. Received: ${replyAt}.`,
    touch ? `It answers our ${touch.channel} touch sent ${(touch.sent_at as Date).toISOString()}.` : "",
    earlier.length ? `Their earlier replies (newest first):\n${earlier.map((e) => `- ${(e.received_at as Date).toISOString()} ${e.channel}: ${clip(ownPart(String(e.body ?? "")), 400)}`).join("\n")}` : "",
    `${r.channel === "call" ? "Call transcript" : "Reply"}${r.subject ? ` (subject: ${clip(r.subject, 150)})` : ""}:\n${body || "(empty)"}`,
  ].filter(Boolean).join("\n\n");

  const out = await callTool({
    agent: "inbox_summary", model: MODELS.cheap, maxTokens: 300, tool: TOOL,
    system: "You summarise replies to a small business's cold outreach for its Inbox. Be concrete and short; write in English even if the reply is in Hindi or Hinglish. Never invent anything the reply does not say.",
    messages: [{ role: "user", content: context }],
  });
  const summary = typeof out.summary === "string" ? out.summary.trim().slice(0, 400) : "";
  if (!summary) return null;
  const next = typeof out.next === "string" && out.next.trim() ? out.next.trim().slice(0, 120) : null;
  const [saved] = await sql`
    UPDATE v2_inbox SET ai_summary = ${sql.json({ summary, next })}, ai_summary_at = now()
    WHERE id = ${id} AND user_email = ${email} RETURNING ai_summary_at`;
  return { summary, next, at: (saved.ai_summary_at as Date).toISOString(), replyAt };
}
