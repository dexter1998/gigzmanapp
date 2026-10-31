import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { v2User, isResp } from "../_auth";
import { syncInbox } from "@/lib/v2/outreach/inbox";
import { fill, touchesOf, type Graph } from "@/lib/v2/outreach/graph";
import { formatCategory } from "@/lib/categories";
import { SIGNALS, consistentSignals, type SignalId } from "@/lib/v2/playbooks";
import { publicError } from "@/lib/v2/public";

const pretty = (s: unknown) => (s ? String(s).replace(/[-_]/g, " ").replace(/\b\w/g, (x) => x.toUpperCase()) : null);
const host = (s: unknown) => (s ? String(s).replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : null);

/**
 * Replies and responses to the user's campaigns, each joined to the send it answers (thread first,
 * else the lead's latest send before it arrived), that lead, and the campaign it came from.
 */
export async function GET() {
  const u = await v2User(); if (isResp(u)) return u;
  const rows = await sql`
    SELECT i.*, c.name AS campaign_name, c.status AS campaign_status, c.graph AS campaign_graph, c.list_chat_id, c.created_at AS campaign_created,
           c.approved_at AS campaign_approved, s.node_id AS send_node, s.sent_at AS send_sent_at, s.channel AS send_channel,
           r.id AS lead_id, r.name AS lead_company, r.category AS lead_category, r.area AS lead_area, r.website AS lead_website,
           r.phone AS lead_phone, r.signals AS lead_signals, r.emails AS lead_emails, r.contact AS lead_contact,
           (SELECT count(*)::int FROM v2_sends p WHERE p.campaign_id = i.campaign_id AND p.result_id = coalesce(i.result_id, s.result_id)
              AND p.status IN ('queued','scheduled') AND NOT p.is_test) AS pending,
           (SELECT max(t.sent_at) FROM v2_sends t WHERE t.campaign_id = i.campaign_id AND t.result_id = coalesce(i.result_id, s.result_id)
              AND t.status = 'sent') AS last_touch_at
    FROM v2_inbox i
    LEFT JOIN v2_campaigns c ON c.id = i.campaign_id AND c.user_email = i.user_email
    LEFT JOIN LATERAL (
      SELECT x.* FROM v2_sends x
      WHERE x.campaign_id = i.campaign_id AND x.sent_at IS NOT NULL
        AND ((i.thread_id IS NOT NULL AND x.thread_id = i.thread_id)
          OR (i.result_id IS NOT NULL AND x.result_id = i.result_id AND x.channel = i.channel AND x.status = 'sent'))
      ORDER BY (x.thread_id IS NOT DISTINCT FROM i.thread_id) DESC, (x.sent_at <= i.received_at) DESC, x.sent_at DESC
      LIMIT 1) s ON true
    LEFT JOIN v2_results r ON r.id = coalesce(i.result_id, s.result_id)
    WHERE i.user_email = ${u.email} ORDER BY i.received_at DESC LIMIT 200`;
  const senders = await sql`SELECT channel, provider, address, last_synced FROM v2_senders WHERE user_email = ${u.email} AND status = 'connected'`;
  const [p] = await sql`SELECT name, v2_profile FROM user_profiles WHERE email = ${u.email}`;
  const me = { sender_name: p?.name ? String(p.name).split(/\s+/)[0] : (u.name?.split(/\s+/)[0] ?? ""), sender_company: (p?.v2_profile as { company?: string } | null)?.company ?? "" };

  const campaigns = new Map<string, unknown>();
  const messages = rows.map((r) => {
    const graph = (r.campaign_graph ?? { nodes: [], edges: [] }) as Graph;
    const touches = r.campaign_id ? touchesOf(graph) : [];
    if (r.campaign_id && !campaigns.has(r.campaign_id)) {
      const trig = graph.nodes?.find((n) => n.kind === "trigger")?.data as { listName?: string } | undefined;
      campaigns.set(r.campaign_id, {
        id: r.campaign_id, name: r.campaign_name, status: r.campaign_status, audience: trig?.listName ?? null,
        launchedAt: r.campaign_approved ? new Date(r.campaign_approved).toISOString() : null,
        createdAt: r.campaign_created ? new Date(r.campaign_created).toISOString() : null,
        touches: touches.length, chatId: r.list_chat_id ?? null,
      });
    }
    const node = r.send_node ? graph.nodes?.find((n) => n.id === r.send_node) : undefined;
    const idx = r.send_node ? touches.findIndex((t) => t.nodeId === r.send_node) : -1;
    const contact = (r.lead_contact ?? null) as { name?: string; role?: string; linkedin?: string } | null;
    // Same placeholder values the worker fills at send time, so the quoted touch reads as sent.
    const sig = (r.lead_signals ?? {}) as Record<string, unknown>;
    const keys = consistentSignals(Object.keys(sig).filter((k) => sig[k] === true && k in SIGNALS));
    const first = keys[0] ? SIGNALS[keys[0] as SignalId].label.toLowerCase() : null;
    const vals = {
      business_name: r.lead_company ?? null, first_name: contact?.name?.split(/\s+/)[0] ?? "there", area: pretty(r.lead_area),
      category: r.lead_category ? (formatCategory(r.lead_category) ?? r.lead_category).toLowerCase() : null,
      website: host(r.lead_website), signal: first ? (first.startsWith("no ") ? `your website has ${first}` : `your website: ${first}`) : "your listing on Google", ...me,
    };
    const emails = (Array.isArray(r.lead_emails) ? r.lead_emails : []) as Array<{ email?: string }>;
    return {
      id: String(r.id), channel: r.channel, from: r.from_address, fromName: r.from_name, subject: r.subject, body: r.body,
      receivedAt: r.received_at.toISOString(), read: !!r.read_at, sentiment: r.sentiment, kind: r.kind, test: !!r.is_test,
      campaignId: r.campaign_id ?? null, campaign: r.campaign_name ?? null,
      gmailUrl: r.thread_id && /^gmail:/.test(r.external_id ?? "") ? `https://mail.google.com/mail/#all/${r.thread_id}` : null,
      touch: r.send_node ? {
        n: node?.data.touch ?? (idx >= 0 ? idx + 1 : null), channel: r.send_channel ?? node?.kind ?? r.channel,
        sentAt: r.send_sent_at ? new Date(r.send_sent_at).toISOString() : null,
        subject: node?.data.subject ? fill(node.data.subject, vals) : null,
        body: node?.data.body ? fill(node.data.body, vals) : null,
      } : null,
      lead: r.lead_id ? {
        id: String(r.lead_id), person: contact?.name ?? null, role: contact?.role ?? null, company: r.lead_company,
        email: emails[0]?.email ?? null, phone: r.lead_phone ?? null, area: pretty(r.lead_area),
        industry: r.lead_category ? (formatCategory(r.lead_category) ?? pretty(r.lead_category)) : null, website: host(r.lead_website),
      } : null,
      lastTouchAt: r.last_touch_at ? new Date(r.last_touch_at).toISOString() : null,
      pending: Number(r.pending ?? 0),
    };
  });
  const synced = senders.map((s) => s.last_synced).filter(Boolean).map((d) => new Date(d).getTime());
  return NextResponse.json({
    messages, campaigns: [...campaigns.values()],
    watching: senders.map((s) => ({ channel: s.channel, provider: s.provider, address: s.address })),
    lastSynced: synced.length ? new Date(Math.max(...synced)).toISOString() : null,
  });
}

/** "Sync now": read replies from the connected mailboxes on demand. */
export async function POST() {
  const u = await v2User(); if (isResp(u)) return u;
  const r = await syncInbox(u.email);
  return NextResponse.json({ result: { ...r, errors: r.errors.map((e) => publicError(e, "Couldn't read replies from one of your mailboxes.")) } });
}

/** Mark a message read. */
export async function PATCH(req: Request) {
  const u = await v2User(); if (isResp(u)) return u;
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (id && /^\d+$/.test(id)) await sql`UPDATE v2_inbox SET read_at = coalesce(read_at, now()) WHERE id = ${Number(id)} AND user_email = ${u.email}`;
  return NextResponse.json({ ok: true });
}
