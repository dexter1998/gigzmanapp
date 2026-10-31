/**
 * The hosted voice-agent platform that places Mantis's AI calls (docs/voice-agent-contract.md).
 *
 * Mantis owns the WHEN and WHO (queue, calling window, credits); the hosted agent owns the call.
 * Everything call-specific goes in as agent variables; results come back from the analytics API.
 * The platform's webhook carries no signature, so it is only ever a nudge to read analytics —
 * nothing in a webhook body is trusted. Provider details stay on the server: no message from
 * here may name the platform.
 */

import type { VoiceResult } from "./voice";

const API = "https://apps.sarvam.ai/api";
const env = (k: string) => process.env[k]?.trim() || null;

type Conf = { key: string; org: string; ws: string; connection: string; from: string };
function conf(): Conf | null {
  const c = { key: env("SARVAM_API_KEY"), org: env("SARVAM_ORG_ID"), ws: env("SARVAM_WORKSPACE_ID"), connection: env("SARVAM_CONNECTION_ID"), from: env("SARVAM_FROM_NUMBER") };
  return c.key && c.org && c.ws && c.connection && c.from ? (c as Conf) : null;
}

export type HostedAgent = "caller" | "test";
export function agentApp(agent: HostedAgent): { id: string; version: string | null } | null {
  const id = env(agent === "caller" ? "VOICE_CALLER_APP_ID" : "VOICE_TEST_APP_ID");
  return id ? { id, version: env(agent === "caller" ? "VOICE_CALLER_APP_VERSION" : "VOICE_TEST_APP_VERSION") } : null;
}
/** Campaign calls go through the hosted platform when its keys and the caller agent are set. */
export const hostedConfigured = () => !!conf() && !!agentApp("caller");
export const testAgentConfigured = () => !!conf() && !!agentApp("test");

/** Every variable the agents read is a short string; the platform rejects other shapes. */
export function cleanVars(v: Record<string, string | null | undefined>, max = 300): Record<string, string> {
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x ?? "").replace(/\s+/g, " ").trim().slice(0, max)]));
}

export function outboundBody(o: { app: { id: string; version: string | null }; from: string; connection: string; phone: string; vars: Record<string, string>; webhookUrl: string | null; sendRef: string }) {
  return {
    app_config: {
      app_id: o.app.id, ...(o.app.version ? { app_version: o.app.version } : {}), app_type: "agent",
      connection_config: { connection_id: o.connection, agent_phone_number: o.from },
      agent_variables: o.vars,
    },
    user_config: { user_phone_number: o.phone },
    ...(o.webhookUrl ? { webhook_config: { url: o.webhookUrl, metadata: { send_id: o.sendRef } } } : {}),
  };
}

export type PlaceResult = { ok: true; attemptId: string } | { ok: false; status: number; code: string; message: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Place one call. 5xx and timeouts are retried with backoff (1.5s, 4s); a 4xx never is — a 422
 * means the request itself is wrong and would fail the same way again.
 */
export async function placeHostedCall(o: { agent: HostedAgent; phone: string; vars: Record<string, string>; webhookUrl: string | null; sendRef: string }): Promise<PlaceResult> {
  const c = conf(), app = agentApp(o.agent);
  if (!c || !app) return { ok: false, status: 0, code: "NOT_CONFIGURED", message: "AI voice calls aren't set up on this server." };
  const body = JSON.stringify(outboundBody({ app, from: c.from, connection: c.connection, phone: o.phone, vars: o.vars, webhookUrl: o.webhookUrl, sendRef: o.sendRef }));
  const url = `${API}/outbounds/v1/orgs/${encodeURIComponent(c.org)}/workspaces/${encodeURIComponent(c.ws)}/outbounds`;
  let last: PlaceResult = { ok: false, status: 0, code: "UNREACHABLE", message: "The voice service could not be reached." };
  for (const wait of [0, 1500, 4000]) {
    if (wait) await sleep(wait);
    try {
      const res = await fetch(url, { method: "POST", body, signal: AbortSignal.timeout(15_000), headers: { "content-type": "application/json", "x-api-key": c.key } });
      const data = (await res.json().catch(() => ({}))) as { attempt_id?: string };
      if (res.ok && data.attempt_id) return { ok: true, attemptId: String(data.attempt_id) };
      // The body can carry provider wording: it goes to the server log, never to a status note.
      if (!res.ok) console.error(`[voice] outbound ${res.status}`, JSON.stringify(data).slice(0, 500));
      last = { ok: false, status: res.status, code: res.ok ? "NO_ATTEMPT_ID" : `HTTP_${res.status}`, message: res.status === 429 ? "The voice service is busy — retrying shortly." : `The voice service refused the call (${res.status}).` };
      if (res.status < 500) return last;
    } catch {
      last = { ok: false, status: 0, code: "UNREACHABLE", message: "The voice service did not answer in time." };
    }
  }
  return last;
}

/** One finished call as the analytics API reports it (only the fields Mantis reads). */
export type Interaction = {
  job_id?: string; duration_in_seconds?: number | null; num_messages?: number | null; ended_by?: string | null; failure_reason?: string | null;
  language_name?: string | null; agent_variables?: Record<string, unknown> | null; audio_url?: string | null;
};

/** The interaction for one attempt, searched in a time window around when it was placed. */
export async function findInteraction(agent: HostedAgent, jobId: string, from: Date, to: Date = new Date()): Promise<Interaction | null> {
  const c = conf(), app = agentApp(agent);
  if (!c || !app) return null;
  const base = `${API}/analytics/v1/${encodeURIComponent(c.org)}/${encodeURIComponent(c.ws)}/${encodeURIComponent(app.id)}/interactions`;
  const q = (offset: number) => new URLSearchParams({ start_datetime: from.toISOString(), end_datetime: to.toISOString(), limit: "100", offset: String(offset) });
  for (let offset = 0; offset < 1000; offset += 100) {
    try {
      const res = await fetch(`${base}?${q(offset)}`, { headers: { "x-api-key": c.key }, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) { console.error(`[voice] analytics ${res.status}`); return null; }
      const d = (await res.json()) as { items?: Interaction[]; total?: number };
      const hit = (d.items ?? []).find((x) => x.job_id === jobId);
      if (hit) return hit;
      if (!d.items?.length || offset + 100 >= (d.total ?? 0)) return null;
    } catch { return null; }
  }
  return null;
}

/** Is the platform reachable with these keys? A one-minute analytics read, nothing placed. */
export async function hostedHealth(): Promise<boolean> {
  const c = conf(), app = agentApp("caller");
  if (!c || !app) return false;
  const to = new Date(), from = new Date(to.getTime() - 60_000);
  const qs = new URLSearchParams({ start_datetime: from.toISOString(), end_datetime: to.toISOString(), limit: "1", offset: "0" });
  try {
    const r = await fetch(`${API}/analytics/v1/${encodeURIComponent(c.org)}/${encodeURIComponent(c.ws)}/${encodeURIComponent(app.id)}/interactions?${qs}`,
      { headers: { "x-api-key": c.key }, signal: AbortSignal.timeout(5000) });
    return r.ok;
  } catch { return false; }
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

/**
 * An interaction in the shape finalizeVoiceCall settles. Connected time counts only when a real
 * conversation happened (the agent's greeting alone is one message); a booking needs the caller
 * agent's outcome=booked plus a day or time.
 */
export function interactionToResult(it: Interaction, ref: string | null, leadName: string | null = null): VoiceResult {
  const out = (it.agent_variables ?? {}) as Record<string, unknown>;
  const outcome = str(out.outcome).toLowerCase() || null;
  const summary = str(out.call_summary) || null;
  const talked = Number(it.num_messages ?? 0) > 1 || (!!outcome && outcome !== "no_conversation");
  const secs = talked ? Math.max(0, Math.round(Number(it.duration_in_seconds) || 0)) : 0;
  const day = str(out.meeting_day), time = str(out.meeting_time);
  const booked = outcome === "booked" && !!(day || time);
  return {
    sessionId: String(it.job_id ?? ""), ref, state: it.failure_reason ? "failed" : "ended", outcome,
    endReason: it.failure_reason ? (/^[\w\s-]{1,40}$/.test(it.failure_reason) ? it.failure_reason.replace(/[_-]/g, " ").toLowerCase() : "call failed")
      : !talked ? "no conversation" : str(it.ended_by) || null,
    connectedSeconds: secs, skill: null,
    booking: booked ? { personName: str(out.meeting_person) || leadName || "the lead", day, time, purpose: "follow-up call", notes: str(out.notes) || null } : null,
    summary, notes: str(out.notes) || null,
    feedback: out.rating || out.would_pay || out.feedback
      ? { rating: str(out.rating) || null, wouldPay: str(out.would_pay) || null, text: str(out.feedback) || null } : null,
  };
}
