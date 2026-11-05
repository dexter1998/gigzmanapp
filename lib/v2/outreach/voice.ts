/**
 * AI voice calls as an outreach channel. Two backends: the hosted voice-agent platform
 * (hosted-voice.ts — used whenever it is configured) and, as a fallback, Mantis's own voice server
 * (~/Desktop/voice-call-poc). The voice server's requests and callbacks are HMAC-signed with
 * V2_VOICE_SECRET over `${timestamp}.${body}` — the same scheme on both sides.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const VOICE_BASE = process.env.V2_VOICE_BASE_URL?.replace(/\/$/, "") || null;
const SECRET = process.env.V2_VOICE_SECRET || null;
/** The fallback voice server is set up. */
export const legacyVoiceConfigured = () => !!VOICE_BASE && !!SECRET;
/** Some backend can place AI calls. */
export const voiceConfigured = () => hostedConfigured() || legacyVoiceConfigured();

export { VOICE_SKILLS, isVoiceSkill, CALL_WINDOW, ASKED_CALLBACK_WINDOW, callWindowFor, EST_MINUTES_PER_CALL, MIN_MINUTES_BALANCE, creditsForSeconds, type VoiceSkill } from "./voiceShared";
import { CALL_WINDOW, type VoiceSkill } from "./voiceShared";
import { hostedConfigured, hostedHealth } from "./hosted-voice";

export function sign(ts: string, body: string): string {
  return createHmac("sha256", SECRET ?? "").update(`${ts}.${body}`).digest("hex");
}
export function verifySignature(ts: string | null, sig: string | null, body: string): boolean {
  if (!SECRET || !ts || !sig || !/^\d{9,11}$/.test(ts) || !/^[0-9a-f]{64}$/.test(sig)) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  return timingSafeEqual(Buffer.from(sign(ts, body), "hex"), Buffer.from(sig, "hex"));
}

/** Indian numbers to E.164 (+91…); anything already E.164 passes; else null. */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = raw.replace(/[^\d+]/g, "");
  if (/^\+[1-9]\d{7,14}$/.test(d)) return d;
  const digits = d.replace(/\D/g, "").replace(/^0+/, "");
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  return null;
}

/** An Indian mobile (+91 6-9…). AI calls only ever dial these in India. */
export const isIndianMobile = (e164: string | null | undefined) => !!e164 && /^\+91[6-9]\d{9}$/.test(e164);
/** Dialable by the AI agent: any non-Indian E.164, or an Indian mobile — never an Indian landline. */
export const aiDialable = (e164: string | null | undefined) => !!e164 && (!e164.startsWith("+91") || isIndianMobile(e164));

export type VoiceCallInput = {
  ref: string; phone: string; skill: VoiceSkill; businessName: string; contactName: string | null; area: string | null; brief: string;
  offer: { company: string; offerName: string; summary: string; benefits: string; deal: string; followUpWith: string; callerName: string | null };
  callbackUrl: string | null;
  /** The user's own "Send test" call: the voice server skips the consented list and calling hours. */
  test?: boolean;
};
export type VoiceResult = {
  sessionId: string; ref: string | null; state: string; outcome: string | null; endReason: string | null; connectedSeconds: number;
  booking: { personName: string; day: string; time: string; purpose: string; notes: string | null } | null; skill: string | null;
  /** Hosted calls have no transcript; the agent's own summary, notes and (test calls) feedback stand in. */
  summary?: string | null; notes?: string | null;
  feedback?: { rating: string | null; wouldPay: string | null; text: string | null } | null;
  /** Hosted calls: "agent:interaction id" for the recording (hosted-voice fetchRecording). */
  recording?: string | null;
};

async function call(method: "GET" | "POST", path: string, body?: unknown): Promise<{ status: number; data: Record<string, unknown> }> {
  if (!legacyVoiceConfigured()) throw new Error("The voice agent isn't configured on this server.");
  const raw = body === undefined ? "" : JSON.stringify(body);
  const ts = String(Math.floor(Date.now() / 1000));
  const res = await fetch(`${VOICE_BASE}${path}`, {
    method, body: method === "POST" ? raw : undefined, signal: AbortSignal.timeout(20_000),
    headers: { "content-type": "application/json", "x-mantis-timestamp": ts, "x-mantis-signature": sign(ts, raw) },
  });
  return { status: res.status, data: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

/** Place an AI call. Errors carry the voice server's code (OUTSIDE_CALLING_HOURS, ALREADY_IN_CALL, NUMBER_NOT_ALLOWED…). */
export async function placeVoiceCall(input: VoiceCallInput): Promise<{ ok: true; result: VoiceResult } | { ok: false; status: number; code: string; message: string }> {
  try {
    const r = await call("POST", "/api/integrations/mantis/calls", input);
    if (r.status === 201) return { ok: true, result: r.data as unknown as VoiceResult };
    const err = (r.data.error ?? {}) as { code?: string; message?: string };
    return { ok: false, status: r.status, code: err.code ?? `HTTP_${r.status}`, message: err.message ?? "The voice agent refused the call." };
  } catch (e) {
    return { ok: false, status: 0, code: "UNREACHABLE", message: (e as Error).message };
  }
}

export async function getVoiceCall(sessionId: string): Promise<VoiceResult | null> {
  try { const r = await call("GET", `/api/integrations/mantis/calls/${encodeURIComponent(sessionId)}`); return r.status === 200 ? (r.data as unknown as VoiceResult) : null; }
  catch { return null; }
}

/** Can AI calls be placed right now? The note reaches the browser: generic words only. */
export async function voiceHealth(): Promise<{ ok: boolean; note: string }> {
  if (hostedConfigured()) {
    return (await hostedHealth()) ? { ok: true, note: "AI voice agent · phone calling ready" } : { ok: false, note: "The AI voice agent is not reachable right now." };
  }
  if (!legacyVoiceConfigured()) return { ok: false, note: "AI voice calls aren't set up on this server yet." };
  try {
    const r = await fetch(`${VOICE_BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
    const d = (await r.json()) as { voice?: { ai?: { configured?: boolean }; pstn?: { configured?: boolean } } };
    if (!d.voice?.ai?.configured || !d.voice?.pstn?.configured) return { ok: false, note: "The AI voice agent is up but phone calling isn't ready." };
    return { ok: true, note: "AI voice agent · phone calling ready" };
  } catch {
    return { ok: false, note: "The AI voice agent is not reachable right now." };
  }
}

/** Next instant inside the India calling window at or after `t` (IST). */
export function nextCallSlot(t: Date, w = CALL_WINDOW): Date {
  const IST = 330 * 60_000;
  const [fh, fm] = w.from.split(":").map(Number);
  const [th, tm] = w.to.split(":").map(Number);
  let d = new Date(t.getTime());
  for (let i = 0; i < 10; i++) {
    const local = new Date(d.getTime() + IST);
    const dow = local.getUTCDay() === 0 ? 7 : local.getUTCDay();
    const mins = local.getUTCHours() * 60 + local.getUTCMinutes();
    const start = fh * 60 + fm, end = th * 60 + tm;
    if (w.days.includes(dow) && mins >= start && mins < end) return d;
    const dayStart = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - IST;
    d = new Date(mins < start && w.days.includes(dow) ? dayStart + start * 60_000 : dayStart + 86_400_000 + start * 60_000);
  }
  return d;
}
