import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { v2User, isResp } from "../../_auth";
import { replySummary } from "@/lib/v2/outreach/inbox-summary";
import { AgentUnavailableError } from "@/lib/v2/claude";

const STATUSES = ["interested", "not_now", "not_interested", "unsubscribe", "other"] as const;
type Ctx = { params: Promise<{ id: string }> };

/** The user's own inbox row, plus the lead it belongs to (a test reply resolves to no lead). */
async function own(email: string, id: string) {
  if (!/^\d+$/.test(id)) return null;
  const [row] = await sql`
    SELECT i.id, i.campaign_id, i.is_test,
           coalesce(i.result_id, (SELECT s.result_id FROM v2_sends s WHERE s.campaign_id = i.campaign_id AND i.thread_id IS NOT NULL
                                  AND s.thread_id = i.thread_id AND NOT s.is_test LIMIT 1)) AS result_id
    FROM v2_inbox i LEFT JOIN v2_campaigns c ON c.id = i.campaign_id AND c.user_email = i.user_email
    WHERE i.id = ${Number(id)} AND i.user_email = ${email}`;
  return row ?? null;
}

/** The reply's AI summary (made on first open, then cached). `?refresh=1` makes it again. */
export async function GET(req: Request, { params }: Ctx) {
  const u = await v2User(); if (isResp(u)) return u;
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const s = await replySummary(u.email, Number(id), { refresh: new URL(req.url).searchParams.get("refresh") === "1" });
    return s ? NextResponse.json({ summary: s }) : NextResponse.json({ error: "not_found" }, { status: 404 });
  } catch (err) {
    if (err instanceof AgentUnavailableError) return NextResponse.json({ error: "unavailable" }, { status: 503 });
    throw err;
  }
}

/** Change the lead status of a reply (stored as its sentiment). */
export async function PATCH(req: Request, { params }: Ctx) {
  const u = await v2User(); if (isResp(u)) return u;
  const { id } = await params;
  const { sentiment } = (await req.json().catch(() => ({}))) as { sentiment?: string };
  if (!sentiment || !(STATUSES as readonly string[]).includes(sentiment)) return NextResponse.json({ error: "bad_status" }, { status: 400 });
  const rows = await sql`UPDATE v2_inbox SET sentiment = ${sentiment} WHERE id = ${Number(/^\d+$/.test(id) ? id : 0)} AND user_email = ${u.email} RETURNING id`;
  if (!rows.length) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, sentiment });
}

/** { action: "pause" }: cancel this lead's queued/scheduled touches in this campaign. */
export async function POST(req: Request, { params }: Ctx) {
  const u = await v2User(); if (isResp(u)) return u;
  const { id } = await params;
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  if (action !== "pause") return NextResponse.json({ error: "bad_action" }, { status: 400 });
  const row = await own(u.email, id);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (row.is_test || row.result_id == null) return NextResponse.json({ error: "test_reply", paused: 0 }, { status: 400 });
  const done = await sql`
    UPDATE v2_sends SET status = 'cancelled', status_note = 'paused from Inbox'
    WHERE campaign_id = ${row.campaign_id} AND result_id = ${row.result_id} AND status IN ('queued','scheduled') AND NOT is_test
    RETURNING id`;
  return NextResponse.json({ ok: true, paused: done.length });
}
