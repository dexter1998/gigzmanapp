import { NextRequest, NextResponse } from "next/server";
import { trackEvent, EV } from "@/lib/events";
import { sql } from "@/lib/db";
import { v2User, isResp, isUuid, origin } from "../_auth";
import { listSenders, connectSmtp, connectMeta, googleRedirectUri } from "@/lib/v2/outreach/senders";
import { voiceHealth, voiceConfigured, CALL_WINDOW } from "@/lib/v2/outreach/voice";
import { CREDIT_COST } from "@/lib/credits/pricing";
import { googleOAuthClient } from "@/lib/google-oauth";

/** Connected channels + Mantis's pre-warmed pool + the saved test contacts. */
export async function GET(req: NextRequest) {
  const u = await v2User(); if (isResp(u)) return u;
  const pool = await sql`SELECT id, channel, domain, address, health, warming_days, domain_age_days, warmup_sent, warmup_replies, price_inr
                         FROM v2_sender_pool WHERE claimed_by IS NULL ORDER BY health DESC NULLS LAST`;
  const [p] = await sql`SELECT v2_test_contacts FROM user_profiles WHERE email = ${u.email}`;
  return NextResponse.json({
    senders: await listSenders(u.email), pool, testContacts: p?.v2_test_contacts ?? null,
    google: { configured: !!googleOAuthClient(), redirectUri: googleRedirectUri(origin(req.nextUrl.origin)) },
    microsoft: { configured: !!process.env.MS_CLIENT_ID },
    // What the WhatsApp setup screen needs to fill Meta's webhook form. The verify token only
    // authenticates Meta's subscribe handshake; events are checked against META_APP_SECRET.
    whatsapp: { webhookUrl: `${origin(req.nextUrl.origin)}/api/v2/outreach/whatsapp/webhook`, verifyToken: process.env.V2_WA_VERIFY_TOKEN || null, signatureConfigured: !!process.env.META_APP_SECRET },
    voice: { configured: voiceConfigured(), ...(await voiceHealth()), creditsPerMinute: CREDIT_COST.voice_minute, window: CALL_WINDOW },
  });
}

/** Connect IMAP/SMTP or Meta WhatsApp — verified live before it is saved. */
export async function POST(req: NextRequest) {
  const u = await v2User(); if (isResp(u)) return u;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (k: string) => (typeof b[k] === "string" ? (b[k] as string).trim() : "");
  if (b.type === "smtp") {
    const r = await connectSmtp(u.email, { address: str("address"), displayName: str("displayName") || undefined, host: str("host"), port: Number(b.port) || 587,
      secure: b.secure === true || Number(b.port) === 465, user: str("user") || str("address"), pass: str("pass"), imapHost: str("imapHost") || undefined, imapPort: Number(b.imapPort) || 993 });
    if (r.ok) trackEvent(u.email, EV.emailConnected, { provider: String(b.type ?? "") });
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
  }
  if (b.type === "meta") {
    const r = await connectMeta(u.email, { phoneNumberId: str("phoneNumberId"), wabaId: str("wabaId") || undefined, token: str("token") });
    if (r.ok) trackEvent(u.email, EV.emailConnected, { provider: String(b.type ?? "") });
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
  }
  return NextResponse.json({ error: "unknown type" }, { status: 400 });
}

/** Manage: pause / resume a sender, change its daily limit. */
export async function PATCH(req: NextRequest) {
  const u = await v2User(); if (isResp(u)) return u;
  const b = (await req.json().catch(() => ({}))) as { id?: string; status?: string; dailyLimit?: number };
  if (!isUuid(b.id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  if (b.status === "paused" || b.status === "connected") await sql`UPDATE v2_senders SET status = ${b.status} WHERE id = ${b.id} AND user_email = ${u.email}`;
  if (typeof b.dailyLimit === "number") await sql`UPDATE v2_senders SET daily_limit = ${Math.max(1, Math.min(500, Math.round(b.dailyLimit)))} WHERE id = ${b.id} AND user_email = ${u.email}`;
  return NextResponse.json({ senders: await listSenders(u.email) });
}

export async function DELETE(req: NextRequest) {
  const u = await v2User(); if (isResp(u)) return u;
  const id = req.nextUrl.searchParams.get("id");
  if (!isUuid(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  await sql`DELETE FROM v2_senders WHERE id = ${id} AND user_email = ${u.email}`;
  return NextResponse.json({ senders: await listSenders(u.email) });
}
