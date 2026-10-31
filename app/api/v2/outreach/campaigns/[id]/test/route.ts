import { NextRequest, NextResponse } from "next/server";
import { trackEvent, EV } from "@/lib/events";
import { v2User, isResp } from "../../../_auth";
import { testCampaign, getCampaign } from "@/lib/v2/outreach/campaigns";
import { publicError, scrubText } from "@/lib/v2/public";

/** Send every touch to the user's own email / WhatsApp / mobile. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await v2User(); if (isResp(u)) return u;
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { name?: string; email?: string; whatsapp?: string; mobile?: string };
  const clean = (s?: string) => (typeof s === "string" && s.trim() ? s.trim().slice(0, 120) : undefined);
  const to = { name: clean(b.name)?.slice(0, 60), email: clean(b.email), whatsapp: clean(b.whatsapp), mobile: clean(b.mobile) };
  if (to.email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(to.email)) return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
  if (!to.email && !to.whatsapp && !to.mobile) return NextResponse.json({ error: "Give at least one place to send the test." }, { status: 400 });
  try {
    const results = await testCampaign(u.email, id, to, u.name);
    trackEvent(u.email, EV.campaignTest, { campaign_id: id, ok: results.some((r) => r.ok) });
    // A failed touch carries the transport's own error text; nothing vendor-named reaches the UI.
    return NextResponse.json({ results: results.map((r) => (r.detail ? { ...r, detail: r.ok ? scrubText(r.detail) : publicError(r.detail, "The send failed — check the connection in Integrations and try again.") } : r)), campaign: await getCampaign(u.email, id) });
  } catch (err) {
    return NextResponse.json({ error: publicError(err) }, { status: 400 });
  }
}
