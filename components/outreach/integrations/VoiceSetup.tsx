"use client";

/**
 * /integrations/voice — Mantis's AI voice agent. There is no account to connect: the screen shows
 * whether the agent is reachable, everything a user should know before a campaign's call touches
 * run — hours, credits, skills, India's calling rules — and a test call to the user's own phone.
 */

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, AlertTriangle, Clock, Coins, Mic, Scale, PhoneCall, Loader2, Info, CalendarClock, Gauge, CircleSlash, Calculator, Wallet, ShieldCheck, PhoneOff, MessageSquareText, Check } from "lucide-react";
import "../../compact.css";
import "../sending-as.css";
import { VOICE_SKILLS, CALL_WINDOW, EST_MINUTES_PER_CALL, MIN_MINUTES_BALANCE } from "@/lib/v2/outreach/voiceShared";
import { CREDIT_COST } from "@/lib/credits/pricing";
import { SetupShell, SetupStep, useOutreachData, SupportLink } from "./shared";
import { toast } from "@/components/toast/toast";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function dayRange(days: number[]) {
  const s = [...days].sort((a, b) => a - b);
  const contiguous = s.every((d, i) => i === 0 || d === s[i - 1] + 1);
  return contiguous && s.length > 1 ? `${DAY[s[0]]}–${DAY[s[s.length - 1]]}` : s.map((d) => DAY[d]).join(", ");
}

/** Opened from Integrations' "Test call": land on the test step once it has rendered, phone field focused. */
function useJumpToTest() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // A client-side Link sets the #hash just after this component mounts, so keep checking briefly.
    let tries = 0;
    const id = window.setInterval(() => {
      tries++;
      if (window.location.hash === "#test") {
        const step = document.getElementById("test");
        const input = step?.querySelector<HTMLInputElement>('input[name="phone"]');
        if (step && (input || tries > 25)) {
          window.clearInterval(id);
          step.scrollIntoView({ behavior: "smooth", block: "start" });
          input?.focus({ preventScroll: true });
          return;
        }
      }
      if (tries > 40) window.clearInterval(id);
    }, 100);
    return () => window.clearInterval(id);
  }, []);
}

export function VoiceSetup() {
  useJumpToTest();
  const { data, failed } = useOutreachData();
  const v = data?.voice;
  const perMin = v?.creditsPerMinute ?? CREDIT_COST.voice_minute;
  const from = v?.window.from ?? CALL_WINDOW.from, to = v?.window.to ?? CALL_WINDOW.to;
  const days = dayRange(v?.window.days ?? CALL_WINDOW.days);

  return (
    <SetupShell brand="voice" title="AI voice calls" help="Help setting up AI voice calls in Mantis"
      intro={<span className="cp-sub" title="Mantis's voice agent makes your campaign's call touches — a natural Hinglish conversation that follows a skill, answers questions and books meetings. Every answered call lands in Inbox with a summary and the outcome.">Hinglish AI agent · books meetings · call summaries in Inbox</span>}>

      <SetupStep n={1} title="Status" done={!!v?.ok}>
        <div className={`ox-setup-status ${!v ? "" : v.ok ? "ok" : "bad"}`}>
          {!data && !failed ? <Loader2 size={18} className="ox-spin" /> : v?.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <div>
            <b>{!data && !failed ? "Checking…" : v?.ok ? "Voice agent ready" : v?.configured ? "Voice agent unavailable" : "Not set up on this server"}</b>
            <span>{failed ? "Couldn't reach Mantis · refresh" : v?.note ?? ""}</span>
          </div>
        </div>
        <p className="cp-hint" title="There's nothing to connect: the agent is part of Mantis. Add a Call touch to a campaign and pick its skill there."><Info size={13} /> Built in · add a <b>Call</b> touch to a campaign {v && !v.ok && <>· <SupportLink subject="AI voice agent unavailable">Tell support</SupportLink></>}</p>
      </SetupStep>

      <SetupStep n={2} id="hours" title="Calling hours">
        <div className="ox-voice-facts">
          <div><b><Clock size={14} /> Window</b><span title="No calls on Sundays.">{from}–{to} IST · {days}</span></div>
          <div><b><CalendarClock size={14} /> Outside it</b><span title="Calls due outside the window wait in the queue for the next slot — they are never dialled late.">Queued for next slot · never late</span></div>
          <div><b><Gauge size={14} /> Pace</b><span title="One call at a time. A meeting booked on a call stops that lead's sequence.">1 call at a time · booking stops sequence</span></div>
        </div>
      </SetupStep>

      <SetupStep n={3} id="credits" title="Credits">
        <div className="ox-voice-facts">
          <div><b><Coins size={14} /> Rate</b><span title="Billed per started minute after the call ends.">{perMin} credits / connected min</span></div>
          <div><b><CircleSlash size={14} /> Free</b><span title="Unanswered, busy and failed calls cost nothing.">Unanswered · busy · failed</span></div>
          <div><b><Calculator size={14} /> Estimates</b><span title={`Campaign estimates assume about ${EST_MINUTES_PER_CALL} minutes per answered call.`}>~{EST_MINUTES_PER_CALL} min / answered call · ~{EST_MINUTES_PER_CALL * perMin} credits</span></div>
          <div><b><Wallet size={14} /> Minimum balance</b><span title="A call is only placed if you have this balance; otherwise it waits until you top up.">{MIN_MINUTES_BALANCE * perMin} credits ({MIN_MINUTES_BALANCE} min) · else waits</span></div>
        </div>
      </SetupStep>

      <SetupStep n={4} id="skills" title="Voice & skills" desc={<span className="cp-hint" title="Each call touch in a campaign follows one skill. The agent speaks natural Hinglish."><Mic size={13} /> 1 skill per call touch · Hinglish</span>}>
        <div className="ox-setup-skills">
          {VOICE_SKILLS.map((s) => (
            <div key={s.id} className="ox-setup-skill"><Mic size={14} /><div><b>{s.label}</b><span>{s.desc}</span></div></div>
          ))}
        </div>
      </SetupStep>

      <SetupStep n={5} id="rules" title="India calling rules" desc={<span className="cp-hint" title="Mantis enforces these so a campaign can't put your business on the wrong side of TRAI."><ShieldCheck size={13} /> Enforced by Mantis · TRAI</span>}>
        <div className="ox-voice-facts">
          <div className="warn"><b><Scale size={14} /> DLT / 140-series</b><span title="Promotional calls in India must go out from a TRAI-registered 140-series number on the DLT platform. Use AI calls for genuine business conversations with leads you have a reason to contact.">Required for promo calls · genuine business calls only</span></div>
          <div><b><PhoneOff size={14} /> DND / NCPR</b><span title="Numbers registered on the National Customer Preference Register must not get promotional calls. Only use lead lists you're allowed to call.">No promo calls to NCPR numbers</span></div>
          <div><b><Clock size={14} /> Hours</b><span title="Stricter than TRAI's 9:00–21:00 limit.">{from}–{to} IST · TRAI allows 9:00–21:00</span></div>
          <div><b><MessageSquareText size={14} /> Disclosure & consent</b><span title="The agent says who it is calling for and why, and ends politely if the person isn't interested. Only call people with a genuine business reason to hear from you.">States who & why · genuine reason only</span></div>
        </div>
        <details className="cp-why">
          <summary>Why</summary>
          <ul>
            <li>Promotional calls in India must come from a TRAI-registered 140-series number on the DLT platform. Use AI calls for genuine business conversations.</li>
            <li>Numbers on the National Customer Preference Register (DND) must not get promotional calls. Only use lists you&apos;re allowed to call.</li>
            <li>Calls stay inside {from}–{to} IST — stricter than TRAI&apos;s 9:00–21:00 limit.</li>
            <li>The agent says who it calls for and why, and ends politely if the person isn&apos;t interested.</li>
          </ul>
        </details>
      </SetupStep>

      <SetupStep n={6} id="test" title="Test call" desc={<span className="cp-hint" title={`The agent rings your phone, says it is a Mantis test call, chats and asks what you think. Up to 3 minutes, billed per connected minute (at most ${3 * perMin} credits).`}><PhoneCall size={13} /> Rings you now · up to 3 min · max {3 * perMin} credits</span>}>
        <TestCallCard ready={!!v?.ok} />
      </SetupStep>
    </SetupShell>
  );
}

/** Test calls are a demo: 3 minutes at most (Tarun, 2026-10-23). Mirrors TEST_CALL_MAX_SECONDS. */
const TEST_LIMIT_S = 180;

type TestCall = { id: number; phone: string; status: "calling" | "done" | "failed"; note: string | null; startedAt: string };

/** Ring the user's own phone with the test agent; the latest call's status, polled while it runs. */
function TestCallCard({ ready }: { ready: boolean }) {
  const [info, setInfo] = useState<{ ready: boolean; mobile: string; name: string } | null>(null);
  const [call, setCall] = useState<TestCall | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => fetch("/api/v2/outreach/voice/test-call").then((r) => (r.ok ? r.json() : null)).then((d) => {
    if (!d) return;
    setInfo((x) => x ?? { ready: d.ready, mobile: d.mobile, name: d.name });
    setCall(d.call);
  }).catch(() => {}), []);
  useEffect(() => { void load(); }, [load]);
  // While a call runs, its result is read every 15s (settled server-side once it is in).
  useEffect(() => {
    if (call?.status !== "calling") return;
    const t = setInterval(() => void load(), 15_000);
    return () => clearInterval(t);
  }, [call?.status, load]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true); setErr(null);
    const r = await fetch("/api/v2/outreach/voice/test-call", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: f.phone, name: f.name }) }).catch(() => null);
    const d = (await r?.json().catch(() => ({})) ?? {}) as { ok?: boolean; call?: TestCall; error?: string };
    setBusy(false);
    if (d.ok && d.call) { setCall(d.call); toast.success("Calling you now", "Pick up — the summary and recording land in Inbox."); }
    else { setErr(d.error ?? "Couldn't place the call."); toast.error("Couldn't place the call", d.error ?? "Please try again."); }
  }

  const can = ready && info?.ready !== false;
  const running = call?.status === "calling";
  // A test call runs at most TEST_LIMIT_S (the agent hangs up there; billing stops there too —
  // lib/v2/outreach/voice-test-call.ts). The countdown shows the user how long the demo has left.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  const left = call && running ? Math.max(0, TEST_LIMIT_S - Math.floor((now - new Date(call.startedAt).getTime()) / 1000)) : null;
  const clock = left === null ? "" : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return (
    <form className="ox-form" onSubmit={submit}>
      <div className="ox-sub-title"><PhoneCall size={16} /> Hear the agent</div>
      {info ? (
        <div className="ox-grid2">
          <label>Your mobile<input name="phone" type="tel" required inputMode="tel" placeholder="+91 98765 43210" defaultValue={info.mobile} autoComplete="tel" /></label>
          <label><span>Your name <em>the agent greets you by it</em></span><input name="name" placeholder="Your first name" defaultValue={info.name} autoComplete="given-name" /></label>
        </div>
      ) : <Loader2 size={16} className="ox-spin" />}
      {err && <div className="ox-form-err"><AlertTriangle size={14} /> <span className="ox-setup-flash-text">{err}</span></div>}
      <div className="ox-form-foot">
        {call ? (
          <span className={`tr-badge ${call.status === "failed" ? "warn" : "ok"}`} title={call.status === "calling" ? `Ringing ${call.phone} — answer and talk to the agent. The summary lands in Inbox.` : call.note ?? ""}>
            {call.status === "calling" ? <Loader2 size={12} className="ox-spin" /> : call.status === "done" ? <Check size={12} /> : <AlertTriangle size={12} />}
            {call.status === "calling" ? (left ? `Calling now · ${clock} left` : "3-min test limit reached — ending call") : call.status === "done" ? `Done · ${call.note ?? ""}` : "Failed"}
          </span>
        ) : (
          <span className="cp-hint" title="Campaign calls also have Send test: it plays that touch in brief. Leads always get calling hours."><Info size={13} /> Campaign → <b>Send test</b> plays a touch</span>
        )}
        <button type="submit" className="v2-btn primary" disabled={!can || busy || running} title={!can ? "AI voice calls aren't ready on this server." : undefined}>
          {busy ? <><Loader2 size={15} className="ox-spin" /> Calling…</> : <><PhoneCall size={15} /> Call me</>}
        </button>
      </div>
    </form>
  );
}
