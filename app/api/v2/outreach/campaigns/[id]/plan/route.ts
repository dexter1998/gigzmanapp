import { NextRequest, NextResponse } from "next/server";
import { trackEvent, EV } from "@/lib/events";
import { v2User, isResp } from "../../../_auth";
import { planCampaign } from "@/lib/v2/outreach/planner";
import { getCampaign } from "@/lib/v2/outreach/campaigns";
import { AgentUnavailableError } from "@/lib/v2/claude";
import { publicError } from "@/lib/v2/public";

/** A message to the Campaign Planner: draft, or edit ("make touch 2 shorter"). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await v2User(); if (isResp(u)) return u;
  const { id } = await params;
  const { message } = (await req.json().catch(() => ({}))) as { message?: string };
  const c = await getCampaign(u.email, id);
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!["draft", "testing"].includes(c.status)) return NextResponse.json({ error: "This campaign is approved — pause and duplicate it to change the sequence." }, { status: 409 });
  try {
    const r = await planCampaign({ email: u.email, campaignId: id, instruction: typeof message === "string" ? message.slice(0, 1500) : null });
    trackEvent(u.email, EV.campaignPlan, { campaign_id: id });
    return NextResponse.json({ reply: r.reply, campaign: await getCampaign(u.email, id) });
  } catch (err) {
    const msg = err instanceof AgentUnavailableError ? "The planner is unreachable right now — try again in a minute." : publicError(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
