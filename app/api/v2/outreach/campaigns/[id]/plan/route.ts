import { NextRequest, NextResponse } from "next/server";
import { trackEvent, EV } from "@/lib/events";
import { sql } from "@/lib/db";
import { v2User, isResp } from "../../../_auth";
import { planCampaign } from "@/lib/v2/outreach/planner";
import { getCampaign } from "@/lib/v2/outreach/campaigns";
import { AgentUnavailableError } from "@/lib/v2/claude";
import { publicError } from "@/lib/v2/public";

/** How long the request waits for the planner before handing back "still designing". */
const WAIT_MS = 20_000;

/**
 * A message to the Campaign Planner: draft, or edit ("make touch 2 shorter"). The planner can take
 * two minutes; App Runner cuts a request at 120 s, so the first design always came back as
 * "Planner didn't answer" while the sequence was in fact saved (prod 2026-11-04). The planner now
 * runs in the background: this answers with the result if it is ready within WAIT_MS, otherwise
 * with `pending`, and the builder polls GET /campaigns/[id] (`planning`, `planError`).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await v2User(); if (isResp(u)) return u;
  const { id } = await params;
  const { message } = (await req.json().catch(() => ({}))) as { message?: string };
  const c = await getCampaign(u.email, id);
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!["draft", "testing"].includes(c.status)) return NextResponse.json({ error: "This campaign is approved — pause and duplicate it to change the sequence." }, { status: 409 });
  if (c.planning) return NextResponse.json({ pending: true, campaign: c });
  await sql`UPDATE v2_campaigns SET planning_since = now(), plan_error = NULL WHERE id = ${id}`;
  const job = planCampaign({ email: u.email, campaignId: id, instruction: typeof message === "string" ? message.slice(0, 1500) : null })
    .then(async (r) => {
      await sql`UPDATE v2_campaigns SET planning_since = NULL WHERE id = ${id}`;
      trackEvent(u.email, EV.campaignPlan, { campaign_id: id });
      return { ok: true as const, reply: r.reply };
    })
    .catch(async (err) => {
      const msg = err instanceof AgentUnavailableError ? "The planner is unreachable right now — try again in a minute." : publicError(err);
      await sql`UPDATE v2_campaigns SET planning_since = NULL, plan_error = ${msg} WHERE id = ${id}`;
      return { ok: false as const, error: msg };
    });
  const done = await Promise.race([job, new Promise<null>((r) => setTimeout(() => r(null), WAIT_MS))]);
  if (!done) return NextResponse.json({ pending: true, campaign: await getCampaign(u.email, id) });
  if (!done.ok) return NextResponse.json({ error: done.error }, { status: 502 });
  return NextResponse.json({ reply: done.reply, campaign: await getCampaign(u.email, id) });
}
