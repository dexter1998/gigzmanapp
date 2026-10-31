/**
 * The send worker: drains due `v2_sends` rows (docs/v2-campaigns.md). Runs from the cron route.
 *
 * Gates, in order, for every row:
 *   - live sending must be on (V2_OUTREACH_SEND=1), or a redirect address set for testing
 *     (V2_OUTREACH_REDIRECT) — otherwise nothing leaves and rows stay queued;
 *   - the campaign must be running/scheduled (paused/stopped campaigns hold their queue);
 *   - the lead must not have replied, bounced or unsubscribed;
 *   - the sender must be connected and under its daily limit.
 * A row is CLAIMED (status 'sending') before anything goes out, so two ticks can never send it twice.
 */

import { sql } from "@/lib/db";
import { logOutcome } from "../learning";
import { fill, touchesOf, emailHtml, absolutize, publicBase, type Graph } from "./graph";

const mediaOf = (g: Graph, nodeId: string) => g.nodes.find((n) => n.id === nodeId)?.data.mediaUrl ?? null;
import { sendEmail, sendWhatsApp, type SenderRow } from "./senders";
import { WHATSAPP_LIVE, WHATSAPP_SOON_NOTE } from "./channels";
import { SENDING_ON, REDIRECT_TO } from "./campaigns";
import { dispatchVoiceCall, reconcileStuckCalls } from "./voiceCalls";
import { SIGNALS, consistentSignals, type SignalId } from "../playbooks";
import { formatCategory } from "@/lib/categories";

const STALE_CLAIM_MIN = 10;

export type DrainResult = { mode: "live" | "redirect" | "off"; claimed: number; sent: number; tasks: number; cancelled: number; deferred: number; failed: number; finished: number };

export async function drainQueue(o: { limit?: number; campaignId?: string } = {}): Promise<DrainResult> {
  const mode: DrainResult["mode"] = SENDING_ON ? "live" : REDIRECT_TO ? "redirect" : "off";
  const out: DrainResult = { mode, claimed: 0, sent: 0, tasks: 0, cancelled: 0, deferred: 0, failed: 0, finished: 0 };
  // Settle AI calls first, even with sending off: test calls still need their results.
  await reconcileStuckCalls().catch(() => 0);
  if (mode === "off") return out;

  // A claim older than the stale window belongs to a tick that died; give it back.
  await sql`UPDATE v2_sends SET status = 'queued' WHERE status = 'sending' AND due_at < now() - (${STALE_CLAIM_MIN} || ' minutes')::interval AND sent_at IS NULL`;
  const claimed = await sql`
    UPDATE v2_sends SET status = 'sending', attempts = attempts + 1
    WHERE id IN (
      SELECT s.id FROM v2_sends s JOIN v2_campaigns c ON c.id = s.campaign_id
      WHERE s.status IN ('queued','scheduled') AND s.due_at <= now() AND NOT s.is_test
        AND c.status IN ('running','scheduled') ${o.campaignId ? sql`AND c.id = ${o.campaignId}` : sql``}
      ORDER BY s.due_at LIMIT ${o.limit ?? 40} FOR UPDATE OF s SKIP LOCKED)
    RETURNING *`;
  out.claimed = claimed.length;

  for (const row of claimed) {
    const [c] = await sql`SELECT id, user_email, graph, status FROM v2_campaigns WHERE id = ${row.campaign_id}`;
    if (c.status === "scheduled") await sql`UPDATE v2_campaigns SET status = 'running' WHERE id = ${c.id} AND status = 'scheduled'`;
    const done = async (status: string, note: string | null, extra: Record<string, unknown> = {}) => {
      await sql`
      UPDATE v2_sends SET status = ${status}, status_note = ${note}, sent_at = ${(extra.sent_at as Date) ?? null},
        sender_id = ${(extra.sender_id as string) ?? null}, external_id = ${(extra.external_id as string) ?? null},
        thread_id = ${(extra.thread_id as string) ?? null}, redirected_to = ${(extra.redirected_to as string) ?? null}
      WHERE id = ${row.id}`;
      if ((status === "sent" || status === "failed") && !row.is_test) {
        void logOutcome({ userEmail: c.user_email, event: status === "sent" ? "sent" : "send_failed", resultId: row.result_id, campaignId: row.campaign_id, channel: row.channel, detail: { node: row.node_id } });
      }
    };

    // The lead already answered (or can't be mailed): the rest of their sequence is off.
    const stop = await stopReason(c.user_email, row);
    if (stop) { await done("cancelled", stop); out.cancelled++; continue; }

    const touch = touchesOf(c.graph as Graph).find((t) => t.nodeId === row.node_id);
    if (!touch) { await done("cancelled", "touch removed from the sequence"); out.cancelled++; continue; }

    const values = await valuesForResult(Number(row.result_id), c.user_email);
    if (row.channel === "call") {
      const node = (c.graph as Graph).nodes.find((n) => n.id === row.node_id);
      if (node?.data.voice?.mode !== "ai") { await done("task", "call task — talk track ready in the campaign"); out.tasks++; continue; }
      const redirectPhone = REDIRECT_TO ? (process.env.V2_VOICE_REDIRECT_PHONE?.trim() || null) : null;
      if (REDIRECT_TO && !redirectPhone) { await defer(row.id, "test mode: set V2_VOICE_REDIRECT_PHONE to place AI calls", 60); out.deferred++; continue; }
      const d = await dispatchVoiceCall(c.user_email, row as never, { skill: node.data.voice.skill, brief: fill(touch.body, values), values, redirectPhone });
      if (d.status === "calling") {
        await sql`UPDATE v2_sends SET status = 'calling', status_note = ${d.note}, external_id = ${d.sessionId ?? null}, redirected_to = ${redirectPhone} WHERE id = ${row.id}`;
        out.sent++;
      } else if (d.status === "deferred") {
        await sql`UPDATE v2_sends SET status = 'queued', status_note = ${d.note}, due_at = ${d.retryAt ?? new Date(Date.now() + 600_000)} WHERE id = ${row.id}`;
        out.deferred++;
      } else if (d.status === "task") { await done("task", d.note); out.tasks++; }
      else { await done("failed", d.note); out.failed++; }
      continue;
    }
    try {
      if (row.channel === "email") {
        const sender = await pickSender(c.user_email, "email", row);
        if (!sender) { await defer(row.id, "no connected mailbox with room under its daily limit"); out.deferred++; continue; }
        // Follow-ups go into the first touch's thread as a reply.
        const [prev] = await sql`SELECT external_id, thread_id, sender_id FROM v2_sends
          WHERE campaign_id = ${row.campaign_id} AND result_id = ${row.result_id} AND channel = 'email' AND status = 'sent' AND NOT is_test
          ORDER BY sent_at LIMIT 1`;
        const firstSubject = prev ? touchesOf(c.graph as Graph).find((t) => t.channel === "email")?.subject : null;
        const subject = prev && firstSubject ? `Re: ${fill(firstSubject, values)}` : fill(touch.subject ?? "", values) || "Quick question";
        const body = `${fill(touch.body, values)}\n\n—\nIf this isn't relevant, reply "unsubscribe" and I won't write again.`;
        const to = REDIRECT_TO ?? row.to_address;
        const r = await sendEmail(sender, {
          to, subject: REDIRECT_TO ? `[→ ${row.to_address}] ${subject}` : subject, text: body,
          html: emailHtml(fill(touch.body, values), mediaOf(c.graph as Graph, row.node_id), "If this isn't relevant, reply \"unsubscribe\" and I won't write again."),
          inReplyTo: prev?.sender_id === sender.id ? prev.external_id : null, threadId: prev?.sender_id === sender.id ? prev.thread_id : null,
          unsubscribeMailto: `mailto:${sender.address}?subject=unsubscribe`,
        });
        await done("sent", REDIRECT_TO ? `test redirect → ${REDIRECT_TO}` : null, { sent_at: new Date(), sender_id: sender.id, external_id: r.messageId, thread_id: r.threadId, redirected_to: REDIRECT_TO });
        out.sent++;
      } else if (row.channel === "whatsapp" && !WHATSAPP_LIVE) {
        // Coming soon: anything queued before the switch is skipped, never sent.
        await done("skipped", WHATSAPP_SOON_NOTE); out.cancelled++;
      } else if (row.channel === "whatsapp") {
        const sender = await pickSender(c.user_email, "whatsapp", row);
        if (!sender) { await defer(row.id, "no connected WhatsApp number with room under its daily limit"); out.deferred++; continue; }
        const media = mediaOf(c.graph as Graph, row.node_id);
        const id = await sendWhatsApp(sender, { to: REDIRECT_TO && /^\+?\d{10,}$/.test(REDIRECT_TO) ? REDIRECT_TO : row.to_address, text: fill(touch.body, values),
          imageUrl: media ? absolutize(media, publicBase()) : null });
        await done("sent", null, { sent_at: new Date(), sender_id: sender.id, external_id: id });
        out.sent++;
      }
    } catch (err) {
      const msg = (err as Error).message.slice(0, 300);
      if (row.attempts >= 3) { await done("failed", msg); out.failed++; }
      else { await defer(row.id, `retrying: ${msg}`, 15); out.deferred++; }
    }
  }

  // A campaign with nothing left to send is finished.
  const fin = await sql`
    UPDATE v2_campaigns c SET status = 'done', updated_at = now()
    WHERE c.status = 'running' AND NOT EXISTS (SELECT 1 FROM v2_sends s WHERE s.campaign_id = c.id AND NOT s.is_test AND s.status IN ('queued','scheduled','sending','calling'))
      AND EXISTS (SELECT 1 FROM v2_sends s WHERE s.campaign_id = c.id AND NOT s.is_test)
    RETURNING id`;
  out.finished = fin.length;
  return out;
}

async function defer(id: number, note: string, minutes = 60) {
  await sql`UPDATE v2_sends SET status = 'queued', status_note = ${note}, due_at = now() + (${minutes} || ' minutes')::interval WHERE id = ${id}`;
}

/** Why this lead must not get another touch, or null. */
async function stopReason(user: string, row: Record<string, unknown>): Promise<string | null> {
  const [r] = await sql`SELECT
      bool_or(replied_at IS NOT NULL) AS replied, bool_or(bounced_at IS NOT NULL AND channel = ${row.channel as string}) AS bounced
    FROM v2_sends WHERE campaign_id = ${row.campaign_id as string} AND result_id = ${row.result_id as number}`;
  if (r?.replied) return "they replied — sequence stopped";
  if (r?.bounced) return "an earlier message bounced";
  if (row.channel === "email" && row.to_address) {
    const [u] = await sql`SELECT 1 FROM email_unsubscribes WHERE lower(email) = lower(${row.to_address as string}) AND stream IN ('all', ${`v2:${user}`}) LIMIT 1`;
    if (u) return "unsubscribed";
    const [b] = await sql`SELECT 1 FROM scrape_emails WHERE lower(email) = lower(${row.to_address as string}) AND (suppressed OR bounced) LIMIT 1`.catch(() => []);
    if (b) return "address is suppressed (bounced or complained before)";
  }
  return null;
}

/** A connected sender under its daily limit; the one that sent this lead's earlier touch first. */
async function pickSender(user: string, channel: "email" | "whatsapp", row: Record<string, unknown>): Promise<SenderRow | null> {
  // Only the accounts the user chose for this campaign, if they chose any.
  const [c] = await sql`SELECT sender_ids FROM v2_campaigns WHERE id = ${row.campaign_id as string}`;
  const chosen = (c?.sender_ids as string[] | null) ?? [];
  const rows = await sql`
    SELECT s.*, (SELECT count(*)::int FROM v2_sends x WHERE x.sender_id = s.id AND x.status = 'sent' AND x.sent_at > now() - interval '24 hours') AS used
    FROM v2_senders s WHERE s.user_email = ${user} AND s.channel = ${channel} AND s.status = 'connected'
      ${chosen.length ? sql`AND (s.id = ANY(${chosen}) OR NOT EXISTS (SELECT 1 FROM v2_senders y WHERE y.id = ANY(${chosen}) AND y.channel = ${channel}))` : sql``}
    ORDER BY (s.id = (SELECT sender_id FROM v2_sends WHERE campaign_id = ${row.campaign_id as string} AND result_id = ${row.result_id as number}
                      AND channel = ${channel} AND status = 'sent' AND sender_id IS NOT NULL ORDER BY sent_at LIMIT 1)) DESC NULLS LAST, s.created_at`;
  const ok = rows.find((s) => (s.used as number) < (s.daily_limit as number));
  return (ok as unknown as SenderRow) ?? null;
}

/** Placeholder values for one lead, from its run result. */
async function valuesForResult(resultId: number, user: string): Promise<Record<string, string>> {
  const [r] = await sql`SELECT name, area, category, website, signals, contact FROM v2_results WHERE id = ${resultId}`;
  const [p] = await sql`SELECT name, v2_profile FROM user_profiles WHERE email = ${user}`;
  const sig = (r?.signals ?? {}) as Record<string, unknown>;
  const keys = consistentSignals(Object.keys(sig).filter((k) => sig[k] === true && k in SIGNALS));
  const first = keys[0] ? SIGNALS[keys[0] as SignalId].label.toLowerCase() : null;
  const v: Record<string, string | null> = {
    business_name: r?.name ?? null,
    first_name: (r?.contact as { name?: string } | null)?.name?.split(/\s+/)[0] ?? null,
    area: r?.area ? String(r.area).replace(/-/g, " ").replace(/\b\w/g, (x: string) => x.toUpperCase()) : null,
    category: r?.category ? (formatCategory(r.category) ?? r.category).toLowerCase() : null,
    website: r?.website ? String(r.website).replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : null,
    signal: first ? (first.startsWith("no ") ? `your website has ${first}` : `your website: ${first}`) : "your listing on Google",
    sender_name: p?.name ? String(p.name).split(/\s+/)[0] : null,
    sender_company: (p?.v2_profile as { company?: string } | null)?.company ?? null,
  };
  // Nothing renders as "{{…}}" or blank in a real message: unknown first names become "there".
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x ?? (k === "first_name" ? "there" : "")])) as Record<string, string>;
}
