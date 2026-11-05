import { NextRequest, NextResponse } from "next/server";
import { trackEvent, EV } from "@/lib/events";
import { v2User, isResp } from "../../../_auth";
import { approveCampaign, getCampaign, PlanRequiredError, type Schedule } from "@/lib/v2/outreach/campaigns";
import { hasActivePlan, PLAN_REQUIRED } from "@/lib/credits/plan";
import { publicError } from "@/lib/v2/public";
import { drainQueue } from "@/lib/v2/outreach/worker";

/**
 * Approve → every lead × touch is queued inside the send window.
 *
 * Launching needs an active paid plan (purchased within 30 days, or granted and not expired).
 * Free accounts can still build and test; this is the line where sending to real leads starts.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await v2User(); if (isResp(u)) return u;
  const { id } = await params;
  if (!(await hasActivePlan(u.email))) return NextResponse.json(PLAN_REQUIRED, { status: 402 });
  const b = (await req.json().catch(() => ({}))) as Partial<Schedule>;
  const hhmm = (s: unknown, d: string) => (typeof s === "string" && /^\d{2}:\d{2}$/.test(s) ? s : d);
  const s: Schedule = {
    startAt: typeof b.startAt === "string" && !Number.isNaN(Date.parse(b.startAt)) ? new Date(b.startAt).toISOString() : null,
    from: hhmm(b.from, "09:30"), to: hhmm(b.to, "18:30"),
    days: Array.isArray(b.days) && b.days.length ? b.days.filter((d) => Number.isInteger(d) && d >= 1 && d <= 7) : [1, 2, 3, 4, 5, 6],
    dailyCap: Math.max(5, Math.min(500, Number(b.dailyCap) || 40)), tz: "Asia/Kolkata",
    callGapSec: Math.max(30, Math.min(3600, Math.round(Number(b.callGapSec) || 300))),
  };
  try {
    const r = await approveCampaign(u.email, id, s);
    trackEvent(u.email, EV.campaignApprove, { campaign_id: id });
    // Whatever is due goes now, not at the next 5-minute cron tick ("call chlaya and call chli bhi nhi",
    // 2026-11-03). One AI call at most — the worker's own per-tick rule.
    await drainQueue({ campaignId: id, limit: 10 }).catch(() => null);
    return NextResponse.json({ ...r, campaign: await getCampaign(u.email, id) });
  } catch (err) {
    if (err instanceof PlanRequiredError) return NextResponse.json(PLAN_REQUIRED, { status: 402 });
    return NextResponse.json({ error: publicError(err) }, { status: 400 });
  }
}
