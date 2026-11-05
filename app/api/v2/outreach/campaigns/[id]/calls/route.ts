import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { v2User, isResp } from "../../../_auth";
import { reconcileStuckCalls } from "@/lib/v2/outreach/voiceCalls";

/**
 * A running campaign's calls: who is on the line now, who is next in the queue (and when), how the
 * finished ones went, and the activity log of every send (v2_send_log). The builder's Live panel polls it (Tarun, 2026-11-02: "kis lead ko
 * currently call kar rha hai ye nahi dikhta").
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await v2User(); if (isResp(u)) return u;
  const { id } = await params;
  const [c] = await sql`SELECT id FROM v2_campaigns WHERE id = ${id} AND user_email = ${u.email}`;
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // A call whose end-of-call nudge never came is settled here instead of on the next sweep.
  await reconcileStuckCalls(u.email).catch(() => 0);
  const row = (r: Record<string, unknown>) => ({
    sendId: Number(r.id), lead: (r.name as string) ?? "Lead", phone: (r.to_address as string) ?? null, area: (r.area as string) ?? null,
    attempt: Number(r.call_attempt ?? 0) + 1, at: (r.at as Date | null)?.toISOString() ?? null, outcome: (r.outcome as string) ?? null,
    note: (r.status_note as string) ?? null, recording: !!r.recording, callbackAt: (r.callback_at as Date | null)?.toISOString() ?? null,
  });
  const base = sql`FROM v2_sends s LEFT JOIN v2_results r ON r.id = s.result_id WHERE s.campaign_id = ${id} AND s.channel = 'call' AND NOT s.is_test`;
  const now = await sql`SELECT s.*, r.name, r.area, s.due_at AS at ${base} AND s.status = 'calling' ORDER BY s.due_at`;
  // Each lead once: its next call, not every future touch (120 leads × 3 touches showed "+315 more").
  const next = await sql`SELECT * FROM (SELECT DISTINCT ON (s.result_id) s.*, r.name, r.area, s.due_at AS at ${base} AND s.status IN ('queued','scheduled')
                         AND NOT EXISTS (SELECT 1 FROM v2_sends c WHERE c.campaign_id = s.campaign_id AND c.result_id = s.result_id AND c.status = 'calling')
                         ORDER BY s.result_id, s.due_at) x ORDER BY at LIMIT 30`;
  const done = await sql`SELECT s.*, r.name, r.area, coalesce(s.sent_at, s.due_at) AS at ${base} AND s.status IN ('sent','failed') AND s.outcome IS NOT NULL
                         ORDER BY coalesce(s.sent_at, s.due_at) DESC LIMIT 40`;
  // Counts are LEADS. A lead is finished once it said yes / no or has no call left; waiting = has one queued.
  const [n] = await sql`SELECT count(*) FILTER (WHERE pending AND NOT on_call)::int AS waiting, count(*) FILTER (WHERE on_call)::int AS calling,
                               count(*) FILTER (WHERE called)::int AS finished, count(*) FILTER (WHERE NOT unreachable)::int AS total
                        FROM (SELECT s.result_id, bool_or(s.status IN ('queued','scheduled')) pending, bool_or(s.status = 'calling') on_call,
                                     bool_or(s.outcome IS NOT NULL) called, bool_and(s.status = 'skipped') unreachable ${base} GROUP BY s.result_id) x`;
  // Per touch: how many leads each call touch still has to reach.
  const touches = await sql`SELECT s.node_id, count(*) FILTER (WHERE s.status IN ('queued','scheduled','calling'))::int AS waiting,
                                   count(*) FILTER (WHERE s.outcome IS NOT NULL)::int AS done, min(s.due_at) FILTER (WHERE s.status IN ('queued','scheduled')) AS next
                            ${base} AND s.status <> 'skipped' GROUP BY s.node_id ORDER BY min(s.due_at)`;
  const log = await sql`SELECT l.id, l.send_id, l.at, l.kind, l.text FROM v2_send_log l WHERE l.campaign_id = ${id} ORDER BY l.at DESC, l.id DESC LIMIT 150`;
  // Each lead's latest outcome only (a lead called on 3 touches is one lead).
  const outcomes = await sql`SELECT outcome, count(*)::int AS n FROM (SELECT DISTINCT ON (s.result_id) s.outcome ${base} AND s.outcome IS NOT NULL AND s.status IN ('sent','failed')
                             ORDER BY s.result_id, coalesce(s.sent_at, s.due_at) DESC) x GROUP BY 1`;
  return NextResponse.json({
    now: now.map(row), next: next.map(row), done: done.map(row),
    counts: { ...n, outcomes: Object.fromEntries(outcomes.map((o) => [o.outcome, o.n])) },
    touches: touches.map((t) => ({ nodeId: t.node_id as string, waiting: Number(t.waiting), done: Number(t.done), next: (t.next as Date | null)?.toISOString() ?? null })),
    log: log.map((l) => ({ id: Number(l.id), sendId: l.send_id ? Number(l.send_id) : null, at: (l.at as Date).toISOString(), kind: l.kind as string, text: l.text as string })),
  });
}
