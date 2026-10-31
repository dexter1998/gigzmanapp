import { NextRequest, NextResponse } from "next/server";
import { verifySignature, type VoiceResult } from "@/lib/v2/outreach/voice";
import { finalizeVoiceCall } from "@/lib/v2/outreach/voiceCalls";

/**
 * The voice server reports a finished AI call here (voice: app.ts notifyMantis). Public by design;
 * authenticated by the shared-secret HMAC over `${timestamp}.${body}`.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifySignature(req.headers.get("x-mantis-timestamp"), req.headers.get("x-mantis-signature"), raw)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  let body: VoiceResult & { transcript?: Array<{ role?: string; text?: string }> };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  if (!body?.sessionId) return NextResponse.json({ error: "no session" }, { status: 400 });
  const r = await finalizeVoiceCall(body, Array.isArray(body.transcript) ? body.transcript : []);
  return NextResponse.json(r, { status: r.ok ? 200 : 404 });
}
