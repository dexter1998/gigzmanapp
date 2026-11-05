/**
 * Dispatching AI calls from the queue, and settling them when they end.
 * One call at a time per user, only inside the India calling window, only with credits for at
 * least MIN_MINUTES_BALANCE minutes. Charged per connected minute when the call ends (never for
 * unanswered or failed calls), once per call.
 *
 * Calls go through the hosted voice agent (hosted-voice.ts) when it is configured, the fallback
 * voice server otherwise. Hosted results are always read from its analytics API — on the webhook
 * nudge (api/v2/outreach/voice/hosted-callback) or by reconcileStuckCalls polling.
 */

import { sql } from "@/lib/db";
import { logOutcome } from "../learning";
import { chargeCredits } from "@/lib/credits/server";
import { CREDIT_COST } from "@/lib/credits/pricing";
import { applyResponse } from "./inbox";
import { istCalendar } from "./voiceShared";
import { CALL_WINDOW, ASKED_CALLBACK_WINDOW, callWindowFor, MIN_MINUTES_BALANCE, aiDialable, creditsForSeconds, getVoiceCall, isVoiceSkill, legacyVoiceConfigured, nextCallSlot, placeVoiceCall, toE164, voiceConfigured, type VoiceResult } from "./voice";
import { logSend } from "./sendlog";
import { publicBase, callRetryOf, type Graph } from "./graph";
import { callTool, MODELS } from "../claude";
import { cleanSenderProfile, proposedProfileFor } from "./sender-profile";
import { cleanVars, findInteraction, hostedConfigured, interactionToResult, placeHostedCall, recordingRef, type HostedAgent, type Interaction } from "./hosted-voice";
import { callerVariables } from "./voice-context";
import { reconcileTestCalls, settleTestCall } from "./voice-test-call";

type Row = { id: number; campaign_id: string; result_id: number; node_id: string; to_address: string | null; callback_at?: Date | string | null };
/** The deferral that only means "a call is on right now" — not worth a log line or a new due time. */
export const QUEUED_BEHIND_CALL = "waiting for the current call to end";
export type DispatchOutcome = { status: "calling" | "deferred" | "failed" | "task"; note: string; sessionId?: string; retryAt?: Date };

export const hostedCallbackUrl = () => `${publicBase()}/api/v2/outreach/voice/hosted-callback`;

/** Seller facts for the fallback voice server's FACTS section, from the user's profile. */
async function offerFor(user: string, campaignId?: string) {
  // The campaign's confirmed "sending as" profile speaks first; the user's seller profile otherwise.
  if (campaignId) {
    const [c] = await sql`SELECT sender_profile FROM v2_campaigns WHERE id = ${campaignId} AND user_email = ${user}`;
    const sp = cleanSenderProfile(c?.sender_profile);
    if (sp) {
      const caller = sp.callerName || null;
      return {
        company: sp.company, offerName: sp.offer, summary: (sp.summary || sp.offer).slice(0, 400),
        benefits: sp.offer.slice(0, 400), deal: "a free first consultation",
        followUpWith: caller ? `${caller} from ${sp.company}` : sp.company, callerName: caller,
      };
    }
  }
  // Not confirmed yet (a test call): what this campaign's chat sells, never the profile's other line of work.
  const sp = await proposedProfileFor(user, campaignId);
  const [p] = await sql`SELECT name, v2_profile FROM user_profiles WHERE email = ${user}`;
  const prof = (p?.v2_profile ?? {}) as { services?: string[] };
  const first = sp.callerName || null;
  const company = sp.company || (first ? `${first}'s team` : "our team");
  const offerName = sp.offer || "our services";
  const ownLine = !!sp.company; // the saved profile sells this offer
  return {
    company, offerName,
    summary: (sp.summary || `${offerName} for businesses like yours`).slice(0, 400),
    benefits: (ownLine ? (prof.services ?? []).slice(0, 4).join(", ") : offerName).slice(0, 400) || "practical help, quick turnaround",
    deal: "a free first consultation", followUpWith: first ? `${first} from ${company}` : company, callerName: first,
  };
}

/**
 * Is one of this user's AI calls (campaign or self-test) still running? A row stays 'calling' until
 * its result is read, and a call that never connected left no result for NO_RESULT_MIN — so a test
 * said "Busy" for half an hour with nothing ringing (prod 2026-11-02). Rows older than a minute and a
 * half are settled first; only a call that is really on is busy.
 */
export async function userInCall(user: string): Promise<boolean> {
  const q = () => sql`
    SELECT 'send' AS kind, s.id, s.due_at AS at FROM v2_sends s JOIN v2_campaigns c ON c.id = s.campaign_id WHERE c.user_email = ${user} AND s.status = 'calling'
    UNION ALL SELECT 'test', id, created_at FROM v2_voice_tests WHERE user_email = ${user} AND status = 'calling'`;
  const rows = await q();
  if (!rows.length) return false;
  // Only a call dialled at least 90 s ago is worth asking about; a fresh one is busy, full stop.
  const stale = rows.filter((r) => r.at && (r.at as Date).getTime() < Date.now() - 90_000);
  if (!stale.length || !hostedConfigured()) return true;
  for (const r of stale) {
    if (r.kind === "send") await settleHostedSend(Number(r.id)).catch(() => null);
    else await settleTestCall(Number(r.id)).catch(() => null);
  }
  return (await q()).length > 0;
}

/** Enough credits for a call of MIN_MINUTES_BALANCE minutes? */
export async function hasCallBalance(user: string): Promise<boolean> {
  const [bal] = await sql`SELECT credits FROM user_profiles WHERE email = ${user}`;
  return Number(bal?.credits ?? 0) >= MIN_MINUTES_BALANCE * CREDIT_COST.voice_minute;
}

/** The campaign's calling window (its Approve schedule, inside TRAI's hours). */
async function campaignCallWindow(campaignId: string | null | undefined) {
  if (!campaignId) return CALL_WINDOW;
  const [c] = await sql`SELECT schedule FROM v2_campaigns WHERE id = ${campaignId}`;
  return callWindowFor(c?.schedule as Record<string, unknown> | null);
}

export async function dispatchVoiceCall(user: string, row: Row, opts: { skill: string; brief: string; values: Record<string, string>; redirectPhone: string | null; test?: boolean }): Promise<DispatchOutcome> {
  if (!voiceConfigured()) return { status: "task", note: "AI voice isn't set up — kept as a call task for you" };
  const now = new Date();
  // Calling hours protect leads. A "Send test" call rings the user's own phone right now — when they
  // are looking at it.
  // The time the lead asked for ("Monday 5 pm") is honoured even past the campaign's own hours.
  const askedNow = row.callback_at && Math.abs(new Date(row.callback_at).getTime() - now.getTime()) < 2 * 3600_000;
  const window = opts.test ? CALL_WINDOW : askedNow ? ASKED_CALLBACK_WINDOW : await campaignCallWindow(row.campaign_id);
  const slot = nextCallSlot(now, window);
  if (!opts.test && slot.getTime() > now.getTime() + 60_000) return { status: "deferred", note: `outside this campaign's calling hours (${window.from}–${window.to} IST)`, retryAt: slot };
  // Busy is the normal state of a calling queue: the row keeps its place (no new due time) and the
  // next call goes when this one ends, not 2 minutes later on a reshuffled clock.
  if (await userInCall(user)) return { status: "deferred", note: QUEUED_BEHIND_CALL };
  if (!(await hasCallBalance(user))) {
    return { status: "deferred", note: `needs ${MIN_MINUTES_BALANCE * CREDIT_COST.voice_minute} credits for a call — top up`, retryAt: new Date(now.getTime() + 6 * 3600_000) };
  }
  const phone = opts.redirectPhone ?? toE164(row.to_address);
  if (!phone) return { status: "failed", note: "no valid phone number for this lead" };
  // Rows queued before mobile-only dialling can still carry a landline: never dial it.
  if (!aiDialable(phone)) return { status: "failed", note: "landline number — AI calls go to mobiles only" };

  if (hostedConfigured()) {
    // A campaign's "Send test" is a rehearsal: the caller agent runs this touch on the user exactly as
    // a lead would hear it — the campaign's business and pitch. The test agent ("this is a Mantis test
    // call, any feedback?") pitched Mantis instead of the user's business (prod 2026-11-02, Gigzman).
    const agent: HostedAgent = "caller";
    const tester = opts.values.first_name && opts.values.first_name !== "there" ? opts.values.first_name : null;
    const vars = { ...(await callerVariables(user, { campaignId: row.campaign_id, resultId: Number(row.result_id), skill: opts.skill, brief: opts.brief })), ...(opts.test && tester ? { lead_name: tester } : {}) };
    let r = await placeHostedCall({ agent, phone, vars, webhookUrl: hostedCallbackUrl(), sendRef: String(row.id) });
    // The long playbook / brief refused (422): the same call shorter — 4,000, then the old 300.
    if (!r.ok && r.status === 422) r = await placeHostedCall({ agent, phone, vars: cleanVars(vars, 4000), webhookUrl: hostedCallbackUrl(), sendRef: String(row.id) });
    if (!r.ok && r.status === 422) r = await placeHostedCall({ agent, phone, vars: cleanVars(vars), webhookUrl: hostedCallbackUrl(), sendRef: String(row.id) });
    if (r.ok) return { status: "calling", note: opts.redirectPhone ? `test redirect → ${opts.redirectPhone}` : "AI call in progress", sessionId: r.attemptId };
    if (!opts.test && (r.status === 0 || r.status === 429 || r.status >= 500)) return { status: "deferred", note: r.message, retryAt: new Date(now.getTime() + 3 * 60_000) };
    return { status: "failed", note: r.message };
  }

  const r = await placeVoiceCall({
    ref: String(row.id), phone, skill: isVoiceSkill(opts.skill) ? opts.skill : "pitch",
    businessName: opts.values.business_name || "your business", contactName: opts.values.first_name && opts.values.first_name !== "there" ? opts.values.first_name : null,
    area: opts.values.area || null, brief: opts.brief.slice(0, 1500), offer: await offerFor(user, row.campaign_id),
    callbackUrl: `${publicBase()}/api/v2/outreach/voice/callback`,
    ...(opts.test ? { test: true } : {}),
  });
  if (r.ok) return { status: "calling", note: opts.redirectPhone ? `test redirect → ${opts.redirectPhone}` : "AI call in progress", sessionId: r.result.sessionId };
  if (r.code === "OUTSIDE_CALLING_HOURS") {
    // Test calls skip calling hours on the voice server; a refusal here means an older server.
    if (opts.test) return { status: "failed", note: "The AI voice agent refused a test call outside calling hours." };
    return { status: "deferred", note: r.message, retryAt: nextCallSlot(new Date(now.getTime() + 60_000)) };
  }
  if (r.code === "ALREADY_IN_CALL" || r.code === "UNREACHABLE" || r.status >= 500) return { status: "deferred", note: r.message, retryAt: new Date(now.getTime() + 3 * 60_000) };
  return { status: "failed", note: `${r.code}: ${r.message}` };
}

/** Per connected minute, once per call: the ledger ref makes a second settle a no-op. Returns credits charged. */
export async function chargeCallOnce(user: string, callId: string, secs: number): Promise<number> {
  const credits = creditsForSeconds(secs);
  if (credits <= 0) return 0;
  const ref = `voicecall:${callId}`;
  const [had] = await sql`SELECT 1 FROM credit_ledger WHERE reason = 'voice_minute' AND ref = ${ref} LIMIT 1`;
  if (had) return 0;
  const c = await chargeCredits(user, "voice_minute", { units: Math.ceil(secs / 60), ref });
  return c.ok ? credits : 0;
}

/** The Inbox body for an answered call: booking first, then what was said. */
export function callBody(res: VoiceResult, transcript: Array<{ role?: string; text?: string; content?: string }> = []): string {
  const b = res.booking;
  const text = transcript.map((m) => `${m.role === "assistant" ? "Agent" : "Lead"}: ${m.text ?? m.content ?? ""}`).filter((l) => l.length > 8).join("\n").slice(0, 20_000);
  const f = res.feedback;
  return [
    b ? `Meeting booked: ${b.personName}, ${[b.day, b.time].filter(Boolean).join(" ")}${b.notes ? ` — ${b.notes}` : ""}` : null,
    res.outcome && !b ? `Outcome: ${res.outcome.replace(/_/g, " ")}` : null,
    res.summary || null,
    f ? [f.rating && `Rating ${f.rating}/5`, f.wouldPay && `would pay: ${f.wouldPay}`, f.text].filter(Boolean).join(" · ") : null,
    res.notes && res.notes !== b?.notes ? `Notes: ${res.notes}` : null,
    text || null,
  ].filter(Boolean).join("\n\n") || "(no summary from the call)";
}

// A recorded voice, not a person: carrier "not reachable" lines and phone call-screening. The agent
// talked over them and called the lead "wrong_person", which closes the lead for good — 5 of the 8
// wrong_person outcomes on prod 2026-11-04/05 were this.
const MACHINE_RE = /(person|number|subscriber) (you are|you're|you have) (trying to reach|calling|dialled|dialed)|is (currently )?(not available|not reachable|switched off|out of coverage)|leave (a|your) message|after the (tone|beep)|record your (name|message)|call screening|screening service|state your name|उपलब्ध नहीं|पहुँच से बाहर|स्विच ऑफ|व्यस्त है/i;
// Someone at the right business who is not the owner: a reason to call again, not a wrong number.
const NOT_OWNER_RE = /(not (the )?owner|owner (is )?(not|nahi|nahin)|i('| a)m (the )?(receptionist|staff|manager|employee)|sir (is )?not (here|in|available)|bahar (gaye|hai)|out of (station|town|india|country))|मालिक नहीं|owner नहीं|ओनर नहीं|बाहर गए|बाहर हैं|मैं स्टाफ/i;

/**
 * The agent's outcome, corrected where a misread closes a lead that should be called again: a
 * machine answered → no_answer; a staff member said the owner isn't there → callback.
 */
export function correctedOutcome(res: VoiceResult, transcript: Array<{ role?: string; text?: string; content?: string }>): VoiceResult["outcome"] {
  const o = res.outcome;
  if (o !== "wrong_person" && o !== "no_conversation" && o !== "not_interested") return o;
  const lead = transcript.filter((m) => m.role !== "assistant").map((m) => m.text ?? m.content ?? "").join(" ");
  const said = `${lead} ${res.summary ?? ""}`;
  if (o === "wrong_person" && MACHINE_RE.test(said)) return "no_conversation";
  if ((o === "wrong_person" || o === "no_conversation") && NOT_OWNER_RE.test(said)) return "callback";
  return o;
}

/** What the call came to — one word, from the agent's own outcome and whether anyone talked. */
export function callOutcome(res: VoiceResult, answered: boolean): string {
  const ended = `${res.endReason ?? ""} ${res.state ?? ""}`;
  return res.booking ? "booked"
    : !answered ? (/busy/i.test(ended) ? "busy" : "no_answer")
    : (["interested", "not_interested", "callback", "wrong_person", "no_conversation", "booked"].includes(String(res.outcome)) ? String(res.outcome) : "no_conversation");
}

const SENTIMENT: Record<string, string> = { booked: "interested", interested: "interested", callback: "not_now", not_interested: "not_interested" };

/**
 * Settle a finished AI call: the send's status, the charge (per connected minute, once), and an
 * Inbox row for every answered call — a booking also stops the lead's sequence.
 */
export async function finalizeVoiceCall(res: VoiceResult, transcript: Array<{ role?: string; text?: string; content?: string }> = []): Promise<{ ok: boolean; note: string }> {
  const [s] = await sql`
    SELECT s.*, c.user_email, c.id AS cid FROM v2_sends s JOIN v2_campaigns c ON c.id = s.campaign_id
    WHERE s.external_id = ${res.sessionId} OR (${res.ref ?? ""} <> '' AND s.id::text = ${res.ref ?? ""}) LIMIT 1`;
  if (!s) return { ok: false, note: "unknown call" };
  if (!["ended", "failed", "missed", "declined", "cancelled", "canceled"].includes(res.state) && !res.endReason) return { ok: true, note: "still running" };
  res = { ...res, outcome: correctedOutcome(res, transcript) };
  const secs = Number(res.connectedSeconds) || 0;
  const answered = secs > 0;
  // Claim the settle first: the webhook nudge and the poller can race, and only one may settle.
  const [claimed] = await sql`UPDATE v2_sends SET status = ${answered ? "sent" : "failed"}, sent_at = coalesce(sent_at, now())
            WHERE id = ${s.id} AND status IN ('calling','queued','scheduled','sending') RETURNING id`;
  if (!claimed) return { ok: true, note: "already settled" };
  // Each dial of the loop is its own charge: the provider's session id, else the row + attempt.
  const callId = res.sessionId || `${s.id}:${Number(s.call_attempt ?? 0)}`;
  const charged = await chargeCallOnce(s.user_email, callId, secs);
  const note = answered ? `AI call · ${Math.ceil(secs / 60)} min${charged ? ` · ${charged} credits` : ""}${res.booking ? " · meeting booked" : ""}` : `not answered (${res.endReason ?? res.state})`;
  await sql`UPDATE v2_sends SET status_note = ${note}, recording = ${res.recording ?? null}, outcome = ${callOutcome(res, answered)} WHERE id = ${s.id}`;
  await logSend(String(s.campaign_id), Number(s.id), "outcome", `${s.is_test ? "Test call" : "Call"} ended — ${note}${res.outcome && answered ? ` · outcome: ${res.outcome.replace(/_/g, " ")}` : ""}`);
  if (!s.is_test) void logOutcome({ userEmail: s.user_email, event: res.booking ? "meeting_booked" : answered ? "call_answered" : "call_not_answered",
    resultId: s.result_id, campaignId: s.campaign_id, channel: "call", detail: { seconds: secs, outcome: res.outcome ?? null } });
  if (answered) {
    const [lead] = await sql`SELECT name FROM v2_results WHERE id = ${s.result_id}`;
    const b = res.booking;
    // A "Send test" call rang the user, not the lead: it is a Test row with no lead, and a booking on
    // it must never stop the real lead's sequence.
    const test = s.is_test === true;
    const subject = b ? "Meeting booked on the AI call" : transcript.length ? "AI call transcript" : test ? "AI test call summary" : "AI call summary";
    await sql`
      INSERT INTO v2_inbox (user_email, campaign_id, result_id, channel, from_address, from_name, subject, body, external_id, kind, sentiment, is_test, recording, call_outcome, call_meeting)
      VALUES (${s.user_email}, ${s.campaign_id}, ${test ? null : s.result_id}, 'call', ${s.to_address ?? ""}, ${test ? "Test call" : lead?.name ?? null},
              ${subject}, ${callBody(res, transcript)}, ${`voice:${callId}`}, 'reply', ${test ? null : (b ? "interested" : SENTIMENT[res.outcome ?? ""] ?? null)}, ${test}, ${res.recording ?? null},
              ${callOutcome(res, true)}, ${b ? [b.day, b.time].filter(Boolean).join(" ") || null : null})
      ON CONFLICT (user_email, external_id) DO NOTHING`;
    if (b && !test) await applyResponse(s.user_email, { campaign_id: s.campaign_id, result_id: s.result_id, id: Number(s.id) }, "reply", "interested");
  }
  if (!s.is_test) {
    const loop = await callLoop(s, res, answered, transcript).catch(() => null);
    void nextCallAfterGap(String(s.campaign_id));
    if (loop) return { ok: true, note: `${note} · ${loop}` };
  }
  return { ok: true, note };
}

/**
 * The campaign's next AI call, the chosen gap after this one ended — not at the next 5-minute cron
 * tick (Tarun, 2026-11-03: a gap from 30 s). In-process timer; the cron still picks up anything a
 * restart dropped.
 */
async function nextCallAfterGap(campaignId: string): Promise<void> {
  const [c] = await sql`SELECT status, schedule FROM v2_campaigns WHERE id = ${campaignId}`;
  if (!c || c.status !== "running") return;
  const { callGapOf } = await import("./campaigns");
  const gap = callGapOf(c.schedule as Record<string, unknown>);
  const t = setTimeout(() => {
    void import("./worker").then(({ drainQueue }) => drainQueue({ campaignId, limit: 10 })).catch(() => null);
  }, gap * 1000);
  t.unref?.();
}

/**
 * The call loop: every finished campaign call gets an outcome, and the lead either leaves (yes / no)
 * or is dialled again — at the time they asked for ("call after 5", "next week") or a few hours later
 * — until the touch's retry cap. Same v2_sends row, requeued, so the sequence's own rules (stop on
 * reply, calling hours, one call at a time, credit check) keep applying.
 */
async function callLoop(row: Record<string, unknown>, res: VoiceResult, answered: boolean, transcript: Array<{ role?: string; text?: string; content?: string }>): Promise<string | null> {
  const s = row as { id: number; campaign_id: string; result_id: number | null; node_id: string; user_email: string; call_attempt: number | null };
  const outcome = callOutcome(res, answered);
  const match = { campaign_id: String(s.campaign_id), result_id: s.result_id as number | null, id: Number(s.id) };
  if (outcome === "interested") await applyResponse(String(s.user_email), match, "reply", "interested");
  if (outcome === "not_interested" || outcome === "wrong_person") await applyResponse(String(s.user_email), match, "reply", "not_interested");
  if (!["no_answer", "busy", "callback", "no_conversation"].includes(outcome)) {
    await sql`UPDATE v2_sends SET outcome = ${outcome} WHERE id = ${s.id}`;
    return null;
  }
  const [c] = await sql`SELECT graph, status FROM v2_campaigns WHERE id = ${s.campaign_id}`;
  // A stopped campaign dials nobody again: a call that ended after Stop was requeued and sat in a
  // finished campaign's queue (prod 2026-11-02).
  if (!["running", "scheduled", "paused"].includes(String(c?.status))) {
    await sql`UPDATE v2_sends SET outcome = ${outcome} WHERE id = ${s.id}`;
    return null;
  }
  const rule = callRetryOf(c.graph as Graph, String(s.node_id));
  const attempt = Number(s.call_attempt ?? 0) + 1; // dials made so far
  // The callback is agreed at the END of a call: keep the transcript's tail, not its head — "Monday
  // 5 pm" sat past the old 3,000-character cut and the lead was rung on Dhanteras instead (#124).
  const said = transcript.map((t) => t.text ?? t.content ?? "").join(" ");
  const text = [res.summary, res.notes, said.slice(-3500)].filter(Boolean).join("\n");
  const asked = rule.followCallback && answered ? await callbackAtFrom(text) : null;
  if (attempt >= rule.maxAttempts) {
    await sql`UPDATE v2_sends SET outcome = ${outcome}, callback_at = ${asked} WHERE id = ${s.id}`;
    await logSend(String(s.campaign_id), Number(s.id), "outcome", `No more dials — all ${attempt} used`);
    return `no more retries (${attempt} dials)`;
  }
  // The same gap every time ("next day" = every day until they answer), not a growing one.
  const due = asked ? nextCallSlot(asked, ASKED_CALLBACK_WINDOW) : nextCallSlot(new Date(Date.now() + rule.gapHours * 3600_000), await campaignCallWindow(String(s.campaign_id)));
  // Requeue the same row: status back to queued, a new dial id, the attempt counted.
  await sql`UPDATE v2_sends SET status = 'queued', due_at = ${due}, external_id = NULL, outcome = ${outcome}, callback_at = ${asked},
            call_attempt = ${attempt}, status_note = coalesce(status_note, '') || ${` · retry ${attempt + 1}/${rule.maxAttempts} ${asked ? "at the time they asked" : "scheduled"}`}
            WHERE id = ${s.id} AND replied_at IS NULL`;
  await logSend(String(s.campaign_id), Number(s.id), "retry", `Dial ${attempt + 1}/${rule.maxAttempts} scheduled for ${due.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", hour: "numeric", minute: "2-digit" })}${asked ? " — the time they asked for" : ""}`);
  return `retry ${attempt + 1}/${rule.maxAttempts} on ${due.toISOString()}`;
}

const CALLBACK_HINT = /\b(call|baad|later|after|tomorrow|kal|parso|next|week|hafte|evening|morning|shaam|subah|monday|tuesday|wednesday|thursday|friday|saturday|sunday|somvar|mangalvar|budhvar|guruvar|shukravar|shanivar|ravivar|diwali|festival|tyohar|\d\s*(am|pm|baje))|बाद|कल|परसों|सोमवार|मंगलवार|बुधवार|गुरुवार|शुक्रवार|शनिवार|रविवार|दिवाली|त्योहार|बजे|शाम|सुबह|हफ्ते/i;

/** "Call me after 5" / "next Monday" → a time, from the call's own summary. Null when none was asked. */
async function callbackAtFrom(text: string): Promise<Date | null> {
  if (!text.trim() || !CALLBACK_HINT.test(text)) return null;
  const now = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 16).replace("T", " ");
  const cal = istCalendar();
  const r = await callTool({
    agent: "call_outcome", model: MODELS.cheap, maxTokens: 120,
    system: `It is now ${now} IST, ${cal.today}. Coming days: ${cal.next.join(", ")}.${cal.festivals.length ? ` Festivals: ${cal.festivals.join(", ")}.` : ""} Read this phone call (summary, then the end of the transcript, often in Hindi: सोमवार = Monday, मंगलवार = Tuesday, बुधवार = Wednesday, गुरुवार = Thursday, शुक्रवार = Friday, शनिवार = Saturday, रविवार = Sunday, कल = tomorrow, परसों = day after tomorrow). If a callback day or time was agreed or asked for, give that moment in IST as "YYYY-MM-DDTHH:MM" (24-hour; "5 pm" / "शाम 5 बजे" = 17:00). The LAST time agreed in the call wins. A day without a time = 11:00 that day. "After <festival>" with no day = 11:00 on the second day after that festival. If no callback was asked for, null.`,
    messages: [{ role: "user", content: text }],
    tool: { name: "callback", description: "When to call back", input_schema: { type: "object", properties: { callback_at: { type: ["string", "null"] } }, required: ["callback_at"] } },
  }).catch(() => null);
  // Always read as IST: a bare date became UTC midnight (05:30 IST) in the simulation.
  const m = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{1,2}):(\d{2}))?/.exec(String(r?.callback_at ?? ""));
  const t = m ? Date.parse(`${m[1]}T${(m[2] ?? "11").padStart(2, "0")}:${m[3] ?? "00"}:00+05:30`) : NaN;
  return Number.isFinite(t) && t > Date.now() && t < Date.now() + 60 * 864e5 ? new Date(t) : null;
}

/**
 * The end-of-call webhook for one campaign send. Its body is unsigned, so it is believed only when
 * its attempt_id is the one we placed. A call that never connected (no_answer / busy / failed) has
 * no analytics record at all — before this the send sat "on the line" for NO_RESULT_MIN. A
 * connected call is still read from analytics (summary, outcome, recording).
 */
export async function settleFromWebhook(sendId: number, body: Record<string, unknown>): Promise<{ ok: boolean; note: string }> {
  const [s] = await sql`SELECT id, campaign_id, external_id, status FROM v2_sends WHERE id = ${sendId}`;
  const attempt = String(body.attempt_id ?? "");
  const status = String(body.status ?? "").toLowerCase();
  if (s && attempt && s.external_id === attempt && status) {
    await logSend(String(s.campaign_id), Number(s.id), "call_status", `Voice platform: ${status.replace(/_/g, " ")}${body.failure_reason ? ` (${String(body.failure_reason).slice(0, 120)})` : ""}`);
    if (s.status === "calling" && ["no_answer", "busy", "failed"].includes(status)) {
      return finalizeVoiceCall({ sessionId: attempt, ref: String(s.id), state: "failed", outcome: null, connectedSeconds: 0, booking: null, skill: null,
        endReason: status === "failed" ? "call failed" : status.replace(/_/g, "-") });
    }
    // A connected call's webhook already carries its result (duration, the agent's outcome
    // variables, the interaction id for the recording). Analytics shows the same call only minutes
    // later; waiting for it held every next call until the cron tick — ~10 min apart with a 30 s gap
    // chosen (prod 2026-11-04). Settle from the webhook; the attempt id match is what trusts it.
    if (s.status === "calling" && status === "connected") {
      const it: Interaction = {
        job_id: attempt, interaction_id: typeof body.interaction_id === "string" ? body.interaction_id : undefined,
        duration_in_seconds: Number(body.duration) || 0,
        num_messages: Array.isArray(body.interaction_transcript) ? body.interaction_transcript.length : 2,
        agent_variables: (body.final_agent_variables as Record<string, unknown> | null) ?? {}, failure_reason: null, ended_by: null,
      };
      const transcript = Array.isArray(body.interaction_transcript)
        ? (body.interaction_transcript as Array<{ role?: string; en_text?: string; content?: string }>).map((m) => ({ role: m.role === "user" ? "user" : "assistant", text: m.en_text ?? m.content ?? "" }))
        : [];
      const [lead] = await sql`SELECT r.name FROM v2_sends x LEFT JOIN v2_results r ON r.id = x.result_id WHERE x.id = ${s.id}`;
      return finalizeVoiceCall({ ...interactionToResult(it, String(s.id), (lead?.name as string) ?? null), recording: recordingRef("caller", it) }, transcript);
    }
  }
  return settleHostedSend(sendId);
}

/**
 * A hosted call that left no result this long after dialling was never answered. Calls run a few
 * minutes at most; 30 kept the user "in a call" for half an hour after a dial that never connected.
 */
export const NO_RESULT_MIN = 12;

/**
 * Read one hosted campaign call's result from analytics and settle it. Test sends used the test
 * agent when it is set up; the other agent is checked too, so a config change mid-call still settles.
 */
export async function settleHostedSend(sendId: number): Promise<{ ok: boolean; note: string }> {
  const [s] = await sql`SELECT s.id, s.external_id, s.status, s.is_test, s.due_at, r.name AS lead FROM v2_sends s LEFT JOIN v2_results r ON r.id = s.result_id WHERE s.id = ${sendId}`;
  if (!s || s.status !== "calling" || !s.external_id) return { ok: true, note: "nothing to settle" };
  // due_at is set to the dial time when the call goes out; without it nothing is assumed about age.
  const placed = (s.due_at as Date | null) ?? new Date();
  // Campaign tests ran on the test agent before 2026-11-02; both are checked so old calls still settle.
  const order: HostedAgent[] = ["caller", "test"];
  for (const agent of order) {
    const it = await findInteraction(agent, s.external_id as string, new Date(placed.getTime() - 5 * 60_000));
    if (it) return finalizeVoiceCall({ ...interactionToResult(it, String(s.id), (s.lead as string) ?? null), recording: recordingRef(agent, it) });
  }
  // Calls placed before the switch to the hosted agent settle through the fallback server.
  if (legacyVoiceConfigured()) { const res = await getVoiceCall(s.external_id as string); if (res) return finalizeVoiceCall(res); }
  if (placed.getTime() < Date.now() - NO_RESULT_MIN * 60_000) {
    const [gone] = await sql`UPDATE v2_sends SET status = 'failed', status_note = 'not answered (no result from the call)' WHERE id = ${s.id} AND status = 'calling' RETURNING id, campaign_id`;
    if (gone) await logSend(String(gone.campaign_id), Number(s.id), "outcome", `No result from the voice platform after ${NO_RESULT_MIN} min — counted as not answered`);
    // No result at all is a no-answer too: it goes round the loop like any other.
    if (gone && !s.is_test) {
      const [row] = await sql`SELECT s.*, c.user_email FROM v2_sends s JOIN v2_campaigns c ON c.id = s.campaign_id WHERE s.id = ${s.id}`;
      const loop = row ? await callLoop(row, { sessionId: String(s.external_id), state: "failed", endReason: "no result" } as VoiceResult, false, []).catch(() => null) : null;
      if (loop) return { ok: true, note: `not answered · ${loop}` };
    }
    return { ok: true, note: "not answered" };
  }
  return { ok: true, note: "still running" };
}

/** Calls whose result never arrived: ask for it directly. `user` limits it to one user's calls. */
export async function reconcileStuckCalls(user?: string): Promise<number> {
  let n = 0;
  if (hostedConfigured()) {
    const rows = await sql`
      SELECT s.id FROM v2_sends s JOIN v2_campaigns c ON c.id = s.campaign_id
      WHERE s.status = 'calling' AND s.external_id IS NOT NULL AND s.due_at < now() - interval '3 minutes' ${user ? sql`AND c.user_email = ${user}` : sql``}
      ORDER BY s.due_at LIMIT 20`;
    for (const r of rows) { const f = await settleHostedSend(Number(r.id)); if (f.note !== "still running") n++; }
    return n + (await reconcileTestCalls(user));
  }
  const rows = await sql`SELECT external_id FROM v2_sends WHERE status = 'calling' AND external_id IS NOT NULL AND sent_at IS NULL AND due_at < now() - interval '12 minutes' LIMIT 20`;
  for (const r of rows) {
    const res = await getVoiceCall(r.external_id as string);
    if (res) { const f = await finalizeVoiceCall(res); if (f.note !== "still running") n++; }
  }
  return n;
}
