import { NextRequest, NextResponse } from "next/server";
import { trackEvent, EV } from "@/lib/events";
import { sql } from "@/lib/db";
import { v2User, isResp, isUuid } from "../_auth";
import { createCampaign, listCampaigns, type CampaignKind } from "@/lib/v2/outreach/campaigns";
import { planCampaign } from "@/lib/v2/outreach/planner";
import { WHATSAPP_LIVE } from "@/lib/v2/outreach/channels";
import { AgentUnavailableError } from "@/lib/v2/claude";
import { publicError } from "@/lib/v2/public";

export async function GET() {
  const u = await v2User(); if (isResp(u)) return u;
  return NextResponse.json({ campaigns: await listCampaigns(u.email) });
}

/** Create a campaign; `plan: true` has the Campaign Planner draft it straight away (Quick Outreach). */
export async function POST(req: NextRequest) {
  const u = await v2User(); if (isResp(u)) return u;
  const b = (await req.json().catch(() => ({}))) as { listChatId?: string; kind?: string; origin?: string; plan?: boolean; name?: string; templateId?: string };
  const kind = (["sequence", "quick_email", "quick_whatsapp", "quick_call"].includes(String(b.kind)) ? b.kind : "sequence") as CampaignKind;
  if (kind === "quick_whatsapp" && !WHATSAPP_LIVE) return NextResponse.json({ error: "whatsapp_coming_soon", message: "WhatsApp is coming soon." }, { status: 400 });
  // Quick Outreach on a chat that already has its campaign opens that campaign — a second tap (or
  // coming back to the chat later) used to create a fresh draft every time. Per kind: a Bulk email
  // pick must not reopen the chat's earlier sequence.
  if (b.origin === "chat" && isUuid(b.listChatId)) {
    const [existing] = await sql`
      SELECT id FROM v2_campaigns WHERE user_email = ${u.email} AND list_chat_id = ${b.listChatId} AND origin = 'chat' AND kind = ${kind} AND status <> 'done'
      ORDER BY (status IN ('running','scheduled','paused')) DESC, (test_sent_at IS NOT NULL) DESC,
               (jsonb_array_length(coalesce(graph->'nodes', '[]'::jsonb)) > 0) DESC, updated_at DESC LIMIT 1`;
    if (existing) return NextResponse.json({ id: existing.id, existing: true, planError: null });
  }
  const id = await createCampaign(u.email, { listChatId: isUuid(b.listChatId) ? b.listChatId : null, kind, origin: b.origin === "chat" ? "chat" : "manual", name: b.name, templateId: isUuid(b.templateId) ? b.templateId : null });
  let planError: string | null = null;
  if (b.plan && isUuid(b.listChatId)) {
    try { await planCampaign({ email: u.email, campaignId: id, instruction: null }); }
    catch (err) { planError = err instanceof AgentUnavailableError ? "The planner is unreachable right now." : publicError(err); }
  }
  trackEvent(u.email, EV.campaignCreate, { campaign_id: id, kind: String(kind ?? "") });
  return NextResponse.json({ id, planError });
}
