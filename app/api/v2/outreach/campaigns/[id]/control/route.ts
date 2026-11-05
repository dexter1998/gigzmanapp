import { NextRequest, NextResponse } from "next/server";
import { trackEvent, EV } from "@/lib/events";
import { v2User, isResp } from "../../../_auth";
import { controlCampaign, getCampaign } from "@/lib/v2/outreach/campaigns";
import { hasActivePlan, PLAN_REQUIRED } from "@/lib/credits/plan";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await v2User(); if (isResp(u)) return u;
  const { id } = await params;
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  if (action !== "pause" && action !== "resume" && action !== "stop" && action !== "restart") return NextResponse.json({ error: "bad_action" }, { status: 400 });
  // Resuming starts sending again, so it sits behind the same plan gate as Approve. Pause and stop
  // never do, and must always work.
  if (action === "resume" && !(await hasActivePlan(u.email))) return NextResponse.json(PLAN_REQUIRED, { status: 402 });
  await controlCampaign(u.email, id, action);
  trackEvent(u.email, EV.campaignControl, { campaign_id: id, action });
  return NextResponse.json({ campaign: await getCampaign(u.email, id) });
}
