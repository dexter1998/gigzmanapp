/**
 * V2 campaigns: create (from a Leads list, from chat or by hand), test, approve → queue, pause.
 *
 * Safety: real sends to leads need BOTH the user's Approve and V2_OUTREACH_SEND=1 on the server.
 * Without the flag the queue fills and waits — so a test environment can never cold-mail real
 * businesses by accident. Test sends (to the user's own contacts) always go.
 */

import { sql } from "@/lib/db";
import { logOutcome } from "../learning";
import { listLeads, type LmsLead } from "../lms";
import { touchesOf, fill, emailHtml, type Graph } from "./graph";
import { senderFor, sendEmail, sendWhatsApp } from "./senders";
import { nextCallSlot, toE164, voiceConfigured } from "./voice";
import { dispatchVoiceCall, userInCall } from "./voiceCalls";
import { hostedConfigured, testAgentConfigured } from "./hosted-voice";
import { syncTemplatesFromGraph } from "./templates";
import { WHATSAPP_LIVE, WHATSAPP_SOON_NOTE } from "./channels";
import { hasActivePlan } from "@/lib/credits/plan";

/** Thrown by approveCampaign when the account has no active paid plan (routes map it to 402). */
export class PlanRequiredError extends Error {
  constructor() { super("plan_required"); this.name = "PlanRequiredError"; }
}

export const SENDING_ON = process.env.V2_OUTREACH_SEND === "1";
/** Testing the real pipeline: every lead send goes to this address instead (subject says so). */
export const REDIRECT_TO = process.env.V2_OUTREACH_REDIRECT?.trim() || null;

export type CampaignKind = "sequence" | "quick_email" | "quick_whatsapp" | "quick_call";

export async function createCampaign(email: string, o: { listChatId: string | null; kind: CampaignKind; origin: "manual" | "chat"; name?: string; templateId?: string | null }) {
  // From a saved sequence: start with its graph (the trigger is re-pointed when a list is picked).
  let graph: Graph | null = null;
  if (o.templateId) {
    const [t] = await sql`SELECT graph, name FROM v2_templates WHERE id = ${o.templateId} AND user_email = ${email} AND kind = 'campaign'`;
    graph = (t?.graph as Graph) ?? null;
  }
  let name = o.name?.trim();
  if (!name && o.listChatId) {
    const [c] = await sql`SELECT title FROM chats WHERE id = ${o.listChatId}`;
    name = c?.title ? `${c.title} — outreach` : undefined;
  }
  const [row] = await sql`
    INSERT INTO v2_campaigns (user_email, name, list_chat_id, kind, origin, graph)
    VALUES (${email}, ${name ?? "Untitled campaign"}, ${o.listChatId}, ${o.kind}, ${o.origin},
            ${sql.json((graph ?? { nodes: [], edges: [] }) as unknown as Parameters<typeof sql.json>[0])}) RETURNING id`;
  return row.id as string;
}

export type CampaignView = {
  id: string; name: string; kind: CampaignKind; status: string; origin: string; graph: Graph;
  list: { chatId: string; name: string; count: number; withEmail: number; withPhone: number } | null;
  schedule: Record<string, unknown>; testSentAt: string | null; approvedAt: string | null; updatedAt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  stats: CampaignStats; sendingOn: boolean;
  /** Launching (approve / resume) needs an active paid plan; testing does not. */
  planActive: boolean;
  /** The mailbox / WhatsApp number this campaign sends from (chosen by the user). */
  senders: Array<{ id: string; channel: string; provider: string; address: string; status: string }>;
  /** The first lead's real values, so previews show a real business instead of a sample. */
  previewValues: Record<string, string> | null;
  /** Who this campaign speaks for — confirmed in the planner; null until then. */
  senderProfile: SenderProfile | null;
  /** The suggestion shown for confirmation (from the user's seller profile). */
  proposedProfile: SenderProfile;
};
export { type SenderProfile, proposedProfileFor, cleanSenderProfile } from "./sender-profile";
import { type SenderProfile, proposedProfileFor, cleanSenderProfile } from "./sender-profile";
export type CampaignStats = { recipients: number; queued: number; sent: number; opened: number; replied: number; bounced: number; skipped: number; nextDue: string | null };

async function stats(id: string): Promise<CampaignStats> {
  const [s] = await sql`
    SELECT count(DISTINCT result_id)::int AS recipients,
      count(*) FILTER (WHERE status IN ('queued','scheduled'))::int AS queued,
      count(*) FILTER (WHERE status = 'sent')::int AS sent,
      count(opened_at)::int AS opened, count(replied_at)::int AS replied, count(bounced_at)::int AS bounced,
      count(*) FILTER (WHERE status = 'skipped')::int AS skipped,
      min(due_at) FILTER (WHERE status IN ('queued','scheduled')) AS next_due
    FROM v2_sends WHERE campaign_id = ${id} AND NOT is_test`;
  return { ...s, nextDue: s.next_due?.toISOString() ?? null } as CampaignStats;
}

export async function getCampaign(email: string, id: string): Promise<CampaignView | null> {
  const [c] = await sql`SELECT * FROM v2_campaigns WHERE id = ${id} AND user_email = ${email}`;
  if (!c) return null;
  let list: CampaignView["list"] = null;
  if (c.list_chat_id) {
    const { lists } = await listLeads(email, c.list_chat_id);
    const l = lists.find((x) => x.chatId === c.list_chat_id);
    if (l) list = { chatId: l.chatId, name: l.name, count: l.count, withEmail: l.withEmail ?? 0, withPhone: l.withPhone ?? 0 };
  }
  const messages = await sql`SELECT role, content FROM v2_campaign_messages WHERE campaign_id = ${id} ORDER BY id`;
  return {
    id: c.id, name: c.name, kind: c.kind, status: c.status, origin: c.origin, graph: c.graph, list, schedule: c.schedule,
    testSentAt: c.test_sent_at?.toISOString() ?? null, approvedAt: c.approved_at?.toISOString() ?? null, updatedAt: c.updated_at.toISOString(),
    messages: messages as unknown as CampaignView["messages"], stats: await stats(id), sendingOn: SENDING_ON,
    planActive: await hasActivePlan(email),
    senders: (await sql`SELECT id, channel, provider, address, status FROM v2_senders WHERE user_email = ${email} AND id = ANY(${c.sender_ids ?? []})`) as unknown as CampaignView["senders"],
    previewValues: list ? await previewValuesFor(email, list.chatId) : null,
    senderProfile: cleanSenderProfile(c.sender_profile),
    proposedProfile: await proposedProfileFor(email, c.id as string),
  };
}

async function previewValuesFor(email: string, chatId: string): Promise<Record<string, string> | null> {
  const { leads } = await listLeads(email, chatId);
  const l = leads.find((x) => x.signals.length) ?? leads[0];
  if (!l) return null;
  const [p] = await sql`SELECT name, v2_profile FROM user_profiles WHERE email = ${email}`;
  const v = valuesFor(l, { name: p?.name ? String(p.name).split(/\s+/)[0] : null, company: (p?.v2_profile as { company?: string } | null)?.company ?? null });
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x ?? (k === "first_name" ? "there" : "")])) as Record<string, string>;
}

/** The user's choice of sending accounts (one per channel); only their own connected senders. */
export async function setSenders(email: string, id: string, senderIds: string[]) {
  const ok = await sql`SELECT id, channel FROM v2_senders WHERE user_email = ${email} AND id = ANY(${senderIds})`;
  const perChannel = new Map<string, string>();
  for (const s of ok) perChannel.set(s.channel as string, s.id as string);
  await sql`UPDATE v2_campaigns SET sender_ids = ${[...perChannel.values()]}, updated_at = now() WHERE id = ${id} AND user_email = ${email}`;
}

export async function listCampaigns(email: string) {
  const rows = await sql`
    SELECT c.id, c.name, c.kind, c.status, c.updated_at, c.graph, ch.title AS list_name, c.list_chat_id
    FROM v2_campaigns c LEFT JOIN chats ch ON ch.id = c.list_chat_id
    WHERE c.user_email = ${email} ORDER BY c.updated_at DESC`;
  return Promise.all(rows.map(async (r) => ({
    id: r.id as string, name: r.name as string, kind: r.kind as CampaignKind, status: r.status as string,
    listName: (r.list_name as string) ?? null, listChatId: r.list_chat_id as string | null,
    touches: touchesOf(r.graph as Graph).length, channels: [...new Set(touchesOf(r.graph as Graph).map((t) => t.channel))],
    updatedAt: (r.updated_at as Date).toISOString(), stats: await stats(r.id as string),
  })));
}

export async function saveGraph(email: string, id: string, graph: Graph, name?: string) {
  // Node edits flow into the templates they point at (and new touches get one).
  const [c] = await sql`SELECT name, status FROM v2_campaigns WHERE id = ${id} AND user_email = ${email}`;
  if (c && ["draft", "testing"].includes(c.status)) graph = await syncTemplatesFromGraph(email, id, name ?? c.name, graph);
  await sql`UPDATE v2_campaigns SET graph = ${sql.json(graph as unknown as Parameters<typeof sql.json>[0])},
            name = coalesce(${name ?? null}, name), updated_at = now(),
            status = CASE WHEN status IN ('draft','testing') THEN status ELSE status END
            WHERE id = ${id} AND user_email = ${email} AND status IN ('draft', 'testing')`;
}

/** Values for one lead's placeholders — what we noticed becomes {{signal}}. */
export function valuesFor(l: LmsLead | undefined, profile: { name?: string | null; company?: string | null }) {
  return {
    business_name: l?.name, first_name: l?.person?.name?.split(/\s+/)[0] ?? null, area: l?.area, category: l?.category?.toLowerCase(),
    website: l?.website?.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""),
    signal: l?.signals[0] ? signalSentence(l.signals[0]) : null,
    sender_name: profile.name ?? null, sender_company: profile.company ?? null,
  };
}
function signalSentence(label: string) {
  const s = label.toLowerCase();
  return s.startsWith("no ") ? `your website has ${s}` : s.startsWith("has ") || s.includes("page") ? `your website has a ${s}` : `your website: ${s}`;
}

export type TestContacts = { name?: string; email?: string; whatsapp?: string; mobile?: string };
/** One test touch. `note` is a short badge label; `detail` the full reason (tooltip). `from` = the sending account. */
export type TestResult = { touch: number; channel: string; to: string | null; ok: boolean; note: string; detail?: string; from?: string | null };

/** Every touch to the user's own contacts, filled with the first lead's real values. */
export async function testCampaign(email: string, id: string, to: TestContacts, senderName: string | null): Promise<TestResult[]> {
  const c = await getCampaign(email, id);
  if (!c) throw new Error("campaign not found");
  await sql`UPDATE user_profiles SET v2_test_contacts = ${sql.json(to as Parameters<typeof sql.json>[0])} WHERE email = ${email}`;
  const { leads } = c.list ? await listLeads(email, c.list.chatId) : { leads: [] as LmsLead[] };
  const vals = valuesFor(leads[0], { name: senderName, company: null });
  // The tester plays the lead: their name is the lead's name, so the AI caller greets them by it.
  if (to.name) vals.first_name = to.name.split(/\s+/)[0];
  const out: TestResult[] = [];
  // The campaign's chosen accounts first; any connected one otherwise.
  const pick = async (ch: string) => {
    const chosen = c.senders.find((s) => s.channel === ch && s.status === "connected");
    if (chosen) { const [row] = await sql`SELECT * FROM v2_senders WHERE id = ${chosen.id}`; return row as unknown as Awaited<ReturnType<typeof senderFor>>; }
    return senderFor(email, ch);
  };
  const mail = await pick("email");
  const wa = await pick("whatsapp");
  for (const [i, t] of touchesOf(c.graph).entries()) {
    const n = i + 1;
    const body = fill(t.body, vals);
    if (t.channel === "email") {
      if (!to.email) { out.push({ touch: n, channel: "email", to: null, ok: false, note: "No email given" }); continue; }
      if (!mail) { out.push({ touch: n, channel: "email", to: to.email, ok: false, note: "No mailbox", detail: "Connect a mailbox in Integrations to send email tests." }); continue; }
      try {
        const media = c.graph.nodes.find((x) => x.id === t.nodeId)?.data.mediaUrl ?? null;
        const sent = await sendEmail(mail, { to: to.email, subject: `[Test · touch ${n}] ${fill(t.subject ?? "(no subject)", vals)}`, text: body, html: emailHtml(body, media, "Test send from Mantis — your leads see this without the [Test] tag.") });
        // A test send row, so a reply to the test shows up in Inbox (it only keeps replies to our
        // own sends). Marked is_test: it never touches the real lead's sequence or outcomes.
        await sql`INSERT INTO v2_sends (campaign_id, result_id, node_id, channel, to_address, due_at, sent_at, status, is_test, sender_id, external_id, thread_id)
          VALUES (${id}, ${Number(leads[0]?.id ?? 0)}, ${t.nodeId}, 'email', ${to.email}, now(), now(), 'sent', true, ${mail.id}, ${sent.messageId}, ${sent.threadId})
          ON CONFLICT (campaign_id, result_id, node_id, is_test) DO UPDATE SET status = 'sent', to_address = EXCLUDED.to_address, sent_at = now(),
            sender_id = EXCLUDED.sender_id, external_id = EXCLUDED.external_id, thread_id = EXCLUDED.thread_id, replied_at = NULL`;
        out.push({ touch: n, channel: "email", to: to.email, ok: true, note: "Sent", from: mail.address, detail: "Reply to it — the reply shows up in Inbox." });
      } catch (err) { out.push({ touch: n, channel: "email", to: to.email, ok: false, note: "Failed", detail: (err as Error).message.slice(0, 200), from: mail.address }); }
    } else if (t.channel === "whatsapp" && !WHATSAPP_LIVE) {
      out.push({ touch: n, channel: "whatsapp", to: to.whatsapp || to.mobile || null, ok: false, note: "Coming soon", detail: "WhatsApp sending is coming soon. This touch is skipped." });
    } else if (t.channel === "whatsapp") {
      const num = to.whatsapp || to.mobile;
      if (!num) { out.push({ touch: n, channel: "whatsapp", to: null, ok: false, note: "No number given" }); continue; }
      if (!wa) { out.push({ touch: n, channel: "whatsapp", to: num, ok: false, note: "Not connected", detail: "Connect WhatsApp in Integrations to send WhatsApp tests." }); continue; }
      try { await sendWhatsApp(wa, { to: num, text: `[Test · touch ${n}]\n${body}` }); out.push({ touch: n, channel: "whatsapp", to: num, ok: true, note: "Sent", from: wa.address }); }
      catch (err) { out.push({ touch: n, channel: "whatsapp", to: num, ok: false, note: "Failed", detail: (err as Error).message.slice(0, 200), from: wa.address }); }
    } else {
      const node = c.graph.nodes.find((x) => x.id === t.nodeId);
      const mobile = toE164(to.mobile);
      if (node?.data.voice?.mode !== "ai") { out.push({ touch: n, channel: "call", to: to.mobile ?? null, ok: false, note: "Manual call", detail: "This touch is a call task for you — switch it to AI voice agent to test a real call." }); continue; }
      if (!voiceConfigured()) { out.push({ touch: n, channel: "call", to: to.mobile ?? null, ok: false, note: "Voice not set up" }); continue; }
      if (!mobile) { out.push({ touch: n, channel: "call", to: to.mobile ?? null, ok: false, note: "No mobile given" }); continue; }
      if (out.some((x) => x.channel === "call" && x.ok)) { out.push({ touch: n, channel: "call", to: mobile, ok: false, note: "Skipped", detail: "One test call per test." }); continue; }
      if (await userInCall(email)) { out.push({ touch: n, channel: "call", to: mobile, ok: false, note: "Busy", detail: "Another AI call is in progress — test again when it ends." }); continue; }
      // A test send row lets the result callback settle (and bill) the test call like any other.
      const [row] = await sql`INSERT INTO v2_sends (campaign_id, result_id, node_id, channel, to_address, due_at, status, is_test)
        VALUES (${id}, ${Number(leads[0]?.id ?? 0)}, ${t.nodeId}, 'call', ${mobile}, now(), 'sending', true)
        ON CONFLICT (campaign_id, result_id, node_id, is_test) DO UPDATE SET status = 'sending', to_address = EXCLUDED.to_address, due_at = now(), sent_at = NULL, external_id = NULL
        RETURNING id`;
      const d = await dispatchVoiceCall(email, { id: row.id, campaign_id: id, result_id: Number(leads[0]?.id ?? 0), node_id: t.nodeId, to_address: mobile },
        { skill: node.data.voice.skill, brief: body, values: vals as Record<string, string>, redirectPhone: mobile, test: true });
      if (d.status === "calling") await sql`UPDATE v2_sends SET status = 'calling', external_id = ${d.sessionId ?? null} WHERE id = ${row.id}`;
      else await sql`UPDATE v2_sends SET status = 'failed', status_note = ${d.note} WHERE id = ${row.id}`;
      const calling = d.status === "calling";
      out.push({ touch: n, channel: "call", to: mobile, ok: calling, note: calling ? "Calling now" : "Failed", from: "Mantis AI voice",
        detail: !calling ? d.note : hostedConfigured() && testAgentConfigured()
          ? "Your phone rings now — a short test call that plays this touch in brief and asks what you think. The summary lands in Inbox."
          : "Your phone rings now — the AI agent runs this touch on you." });
    }
  }
  // Only a test that actually reached the user counts — a run of "No mailbox" failures used to unlock Approve.
  if (out.some((r) => r.ok)) await sql`UPDATE v2_campaigns SET test_sent_at = now(), status = CASE WHEN status = 'draft' THEN 'testing' ELSE status END, updated_at = now() WHERE id = ${id}`;
  return out;
}

export type Schedule = { startAt: string | null; from: string; to: string; days: number[]; dailyCap: number; tz: "Asia/Kolkata" };

/** IST send window: the next allowed instant at or after `t`. */
function nextInWindow(t: Date, s: Schedule): Date {
  const IST = 330 * 60_000;
  const [fh, fm] = s.from.split(":").map(Number);
  const [th, tm] = s.to.split(":").map(Number);
  let d = new Date(t.getTime());
  for (let i = 0; i < 14; i++) {
    const local = new Date(d.getTime() + IST);
    const dow = local.getUTCDay() === 0 ? 7 : local.getUTCDay();
    const mins = local.getUTCHours() * 60 + local.getUTCMinutes();
    const start = fh * 60 + fm, end = th * 60 + tm;
    if (s.days.includes(dow) && mins >= start && mins < end) return d;
    const dayStart = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - IST;
    d = new Date(mins < start && s.days.includes(dow) ? dayStart + start * 60_000 : dayStart + 86_400_000 + start * 60_000);
  }
  return d;
}

/** Approve: every lead × touch becomes a queued send (or a skip, if the lead has no address). */
export async function approveCampaign(email: string, id: string, s: Schedule): Promise<{ queued: number; skipped: number }> {
  const c = await getCampaign(email, id);
  if (!c) throw new Error("campaign not found");
  if (!c.senderProfile) throw new Error("Confirm who this campaign sends as (company, offer, caller) in the planner first.");
  if (!c.testSentAt) throw new Error("Send a test first — approve comes after you've seen it.");
  // Server-side launch gate. The route checks too; this is the backstop for any other caller.
  if (!(await hasActivePlan(email))) throw new PlanRequiredError();
  const { leads } = c.list ? await listLeads(email, c.list.chatId) : { leads: [] as LmsLead[] };
  const touches = touchesOf(c.graph);
  // Email touches need a connected mailbox, or every send waits in the queue forever without a word.
  if (touches.some((t) => t.channel === "email") && !(await senderFor(email, "email")))
    throw new Error("Connect a mailbox first (Integrations → Email) — this sequence has email touches.");
  const start = s.startAt ? new Date(s.startAt) : new Date();
  const perDay = Math.max(5, Math.min(500, s.dailyCap));
  let queued = 0, skipped = 0;
  await sql`DELETE FROM v2_sends WHERE campaign_id = ${id} AND NOT is_test AND status IN ('queued','scheduled','skipped')`;
  for (const [li, l] of leads.entries()) {
    // Spread the first touch over days by the daily cap, then each touch keeps its offset.
    const dayShift = Math.floor(li / perDay);
    for (const t of touches) {
      const aiCall = t.channel === "call" && c.graph.nodes.find((n) => n.id === t.nodeId)?.data.voice?.mode === "ai";
      // Best contact per channel: emails are tier-ordered; calls prefer a mobile and never dial a
      // toll-free line; WhatsApp only ever goes to a mobile.
      const callTo = (l.phones ?? []).find((ph) => ph.kind === "mobile") ?? (l.phones ?? []).find((ph) => ph.kind !== "tollfree");
      const addr = t.channel === "email" ? l.emails[0]
        : t.channel === "whatsapp" ? (l.whatsapp ?? null)
        : aiCall ? (callTo?.e164 ?? toE164(l.phone)) : (callTo?.number ?? l.phone);
      let due = nextInWindow(new Date(start.getTime() + (t.offsetDays + dayShift) * 86_400_000 + (li % perDay) * 90_000), s);
      // AI calls also keep to the India calling window, and are spaced so one runs at a time.
      if (aiCall) due = nextCallSlot(new Date(due.getTime() + (li % perDay) * 4 * 60_000));
      // WhatsApp is coming soon: its touches are recorded as skipped so the campaign still reads
      // honestly (and the rest of the sequence goes out), but nothing is queued on that channel.
      const waOff = t.channel === "whatsapp" && !WHATSAPP_LIVE;
      const status = !addr || waOff ? "skipped" : due > new Date(Date.now() + 60_000) ? "scheduled" : "queued";
      await sql`
        INSERT INTO v2_sends (campaign_id, result_id, node_id, channel, to_address, due_at, status, status_note)
        VALUES (${id}, ${Number(l.id)}, ${t.nodeId}, ${t.channel}, ${addr ?? null}, ${due}, ${status},
                ${waOff ? WHATSAPP_SOON_NOTE : !addr ? `no ${t.channel === "email" ? "email" : "phone"} for this lead` : !SENDING_ON ? "waiting — live sending is switched off here" : null})
        ON CONFLICT (campaign_id, result_id, node_id, is_test) DO UPDATE SET due_at = EXCLUDED.due_at, status = EXCLUDED.status, status_note = EXCLUDED.status_note`;
      if (addr && !waOff) queued++; else skipped++;
      if (addr && !waOff && t === touches[0]) void logOutcome({ userEmail: email, event: "queued_in_campaign", resultId: Number(l.id), campaignId: id, channel: t.channel });
    }
  }
  await sql`UPDATE v2_campaigns SET status = ${start > new Date(Date.now() + 60_000) ? "scheduled" : "running"}, approved_at = now(),
            schedule = ${sql.json(s as unknown as Parameters<typeof sql.json>[0])}, updated_at = now() WHERE id = ${id}`;
  return { queued, skipped };
}

export async function controlCampaign(email: string, id: string, action: "pause" | "resume" | "stop") {
  const next = action === "pause" ? "paused" : action === "resume" ? "running" : "done";
  await sql`UPDATE v2_campaigns SET status = ${next}, updated_at = now() WHERE id = ${id} AND user_email = ${email}
            AND status IN ('running','scheduled','paused')`;
  if (action === "stop") await sql`UPDATE v2_sends SET status = 'cancelled', status_note = 'campaign stopped' WHERE campaign_id = ${id} AND status IN ('queued','scheduled')`;
}

export async function deleteCampaign(email: string, id: string) {
  await sql`DELETE FROM v2_campaigns WHERE id = ${id} AND user_email = ${email} AND status IN ('draft','testing','done')`;
}
