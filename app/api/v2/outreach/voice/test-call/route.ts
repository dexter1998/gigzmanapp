import { NextRequest, NextResponse } from "next/server";
import { trackEvent, EV } from "@/lib/events";
import { sql } from "@/lib/db";
import { v2User, isResp } from "../../_auth";
import { latestTestCall, placeTestCall, testCallReady } from "@/lib/v2/outreach/voice-test-call";
import { reconcileStuckCalls } from "@/lib/v2/outreach/voiceCalls";

/** The latest self-test call (settled first if its result is in), and the saved test contacts. */
export async function GET() {
  const u = await v2User(); if (isResp(u)) return u;
  await reconcileStuckCalls(u.email).catch(() => 0);
  const [p] = await sql`SELECT name, v2_test_contacts FROM user_profiles WHERE email = ${u.email}`;
  const tc = (p?.v2_test_contacts ?? {}) as { mobile?: string; name?: string };
  return NextResponse.json({
    ready: testCallReady(), call: await latestTestCall(u.email),
    mobile: tc.mobile ?? "", name: tc.name ?? (p?.name ? String(p.name).split(/\s+/)[0] : u.name?.split(/\s+/)[0] ?? ""),
  });
}

/** Ring the user's own phone with the test agent. Body: { phone, name?, campaignContext? }. */
export async function POST(req: NextRequest) {
  const u = await v2User(); if (isResp(u)) return u;
  const b = (await req.json().catch(() => ({}))) as { phone?: unknown; name?: unknown; campaignContext?: unknown };
  const s = (x: unknown, n: number) => (typeof x === "string" ? x.trim().slice(0, n) : "");
  const r = await placeTestCall(u.email, { phone: s(b.phone, 20), name: s(b.name, 60) || null, campaignContext: s(b.campaignContext, 600) || null });
  if (r.ok) trackEvent(u.email, EV.voiceTestCall, {});
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
