"use client";

/**
 * The run as it appears in the chat (reference: Mantis mock + Conductor/Claude). A shimmering
 * status line names what is happening now; under it, a card lists the steps — done, working,
 * queued — with timers, and the running step shows its live sub-tasks ("Reading a website").
 */

import { useEffect, useRef, useState } from "react";
import { Search, Check, Pause, Play, SlidersHorizontal, Info, ChevronDown, ChevronUp, BookOpen, ArrowUpRight, Minus, Square } from "lucide-react";
import type { RunSnapshot } from "@/lib/v2/runner";
import { refreshNavBadges } from "@/components/nav-badges/useNavBadges";
import type { PlanCard } from "@/lib/v2/turn";

/**
 * The quote before a run: what Mantis understood, roughly what it costs, and the pipeline it will
 * try first — so a wrong reading is caught before the run, not after twenty wrong leads.
 */
export function QuoteCard({ plan }: { plan: PlanCard }) {
  if (!plan.understood) return null;
  const cost = plan.estCredits > 0 ? `≈ up to ${plan.estCredits} credits` : "≈ 0 credits";
  return (
    <figure className="v2-quote">
      <figcaption className="v2-quote-kicker">{plan.more ? "Finding more · understood" : "Understood"}</figcaption>
      <blockquote className="v2-quote-text">{plan.understood}</blockquote>
      <div className="v2-quote-meta">
        <span className="v2-quote-cost" title="5 credits per new lead (businesses you already have are free), plus live map searches. Website checks are free.">{cost}</span>
        <span className="v2-quote-sep" aria-hidden>·</span>
        <span>Balance {plan.credits.toLocaleString("en-IN")}</span>
        {plan.pipeline && plan.pipeline.length > 0 && (
          <span className="v2-quote-pipe">
            {plan.more ? "Same pipeline: " : "Pipeline: "}
            {plan.pipeline.map((p, i) => <span key={p}>{i > 0 && <i aria-hidden>→</i>}{p}</span>)}
          </span>
        )}
      </div>
      {plan.assumptions && <div className="v2-quote-note">{plan.assumptions}</div>}
      {plan.cannotDo && <div className="v2-quote-note warn">Not yet: {plan.cannotDo}</div>}
    </figure>
  );
}

export function useNow(active: boolean, every = 500) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(t);
  }, [active, every]);
  return now;
}

export const fmtDur = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
};

/** Claude-style live line: the current action, shimmering, with its timer and a chevron. */
export function ShimmerLine({ text, ms, onClick }: { text: string; ms?: number; onClick?: () => void }) {
  return (
    <button type="button" className="v2-shimmer-line" onClick={onClick} disabled={!onClick}>
      <span className="v2-shimmer-dots" aria-hidden><i /><i /><i /></span>
      <span key={text} className="v2-shimmer-text">{text}</span>
      {ms != null && <span className="v2-shimmer-ms">{fmtDur(ms)}</span>}
      {onClick && <span aria-hidden className="v2-shimmer-caret">›</span>}
    </button>
  );
}

type Phase = { title: string; detail: string; status: "done" | "active" | "queued" | "interrupted" | "skipped"; ms: number | null; subs: Array<{ label: string; detail: string | null; status: string }> };

/**
 * The run's real steps grouped into the seven phases the reference shows. The ladder's extra
 * rungs (wider area, registry, web search…) become sub-steps of "Discover businesses" /
 * "Verify website signals" rather than a list of twenty-six lines.
 */
function toPhases(run: RunSnapshot, now: number): Phase[] {
  const group = (ops: string[]) => run.steps.filter((s) => ops.includes(s.op));
  const span = (steps: RunSnapshot["steps"]) => {
    const starts = steps.map((s) => s.startedAt && Date.parse(s.startedAt)).filter(Boolean) as number[];
    if (!starts.length) return null;
    const ends = steps.map((s) => (s.endedAt ? Date.parse(s.endedAt) : s.status === "running" ? now : null)).filter(Boolean) as number[];
    return (ends.length ? Math.max(...ends) : now) - Math.min(...starts);
  };
  // Paused or stopped: the phase that was mid-way turns amber ("Interrupted"), never a green tick.
  const halted = run.status === "paused" || run.status === "stopped";
  const state = (steps: RunSnapshot["steps"]): Phase["status"] => {
    if (!steps.length) return halted ? "skipped" : "queued";
    if (steps.every((s) => s.status === "done")) return "done";
    if (halted) return steps.some((s) => s.status === "done" || s.status === "running" || (s.status === "skipped" && s.startedAt)) ? "interrupted" : "skipped";
    if (steps.some((s) => s.status === "running")) return "active";
    return steps.some((s) => s.status === "done") && run.status === "running" ? "active" : "queued";
  };
  const discover = group(["discover", "collect"]);
  const verify = group(["qualify", "contacts"]);
  const rank = group(["rank"]);
  const done = run.status === "done";
  const stopped = run.status === "stopped";
  const sub = (steps: RunSnapshot["steps"]) => steps.map((s) => ({ label: s.label, detail: s.detail, status: s.status }));
  const verifyState = done ? "done" as const : state(verify);
  const phases: Phase[] = [
    { title: "Understand request", detail: run.phaseInfo.request, status: "done", ms: null, subs: [] },
    { title: "Resolve location", detail: run.area, status: "done", ms: null, subs: [] },
    { title: "Choose discovery sources", detail: run.phaseInfo.sources, status: "done", ms: null, subs: [] },
    { title: "Discover businesses", detail: `${run.candidates} candidates found`, status: done ? "done" : state(discover), ms: span(discover), subs: sub(discover) },
    ...(verify.length ? [{ title: "Verify website signals", detail: verifyState === "active" ? `Site · ads · analytics · pixels… ${run.checked}/${run.toCheck}` : verifyState === "interrupted" ? `${run.checked}/${run.toCheck} read · ${stopped ? "stopped" : "paused"}` : `${run.checked} websites read`, status: verifyState, ms: span(verify), subs: sub(verify) }] : []),
    stopped
      ? { title: "Deduplicate & score", detail: `${run.delivered} matched`, status: "interrupted", ms: null, subs: [] }
      : { title: "Deduplicate & score", detail: rank.some((s) => s.status === "done") ? `${run.delivered} kept · ranked` : "Rank by relevance + evidence", status: done ? "done" : state(rank), ms: span(rank), subs: [] },
    stopped
      ? { title: "Prepare results", detail: run.delivered ? `${run.delivered} ${run.delivered === 1 ? "lead" : "leads"} added · interrupted` : "Interrupted · 0 added", status: "interrupted", ms: null, subs: [] }
      : { title: "Prepare results", detail: done ? `${run.delivered} ${run.delivered === 1 ? "lead" : "leads"} added to Leads` : "Build your lead table", status: done ? "done" : halted ? "skipped" : "queued", ms: null, subs: [] },
  ];
  // Between two steps (one finished, the next not yet claimed) no phase reads as active, and a
  // running run showed a column of ticks then blank circles — the next unfinished phase spins.
  if (run.status === "running" && !phases.some((p) => p.status === "active")) {
    const next = phases.find((p) => p.status === "queued");
    if (next) next.status = "active";
  }
  return phases;
}

/** The nearest ancestor that scrolls (the V2 chat column); null when the window does. */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let n = el.parentElement; n; n = n.parentElement) {
    const { overflowY } = getComputedStyle(n);
    if ((overflowY === "auto" || overflowY === "scroll") && n.scrollHeight > n.clientHeight) return n;
  }
  return null;
}

export function RunProgressCard({ run, onControl, onViewDetails, more = false }: {
  run: RunSnapshot;
  more?: boolean;
  onControl: (action: "pause" | "resume" | "stop") => void;
  onViewDetails: () => void;
}) {
  const running = run.status === "running";
  const now = useNow(running || run.status === "paused");
  const [open, setOpen] = useState(true);
  // A finished run means new leads (and a chat dot): tell the sidebar badges now, not at their next poll.
  const finished = run.status === "done" || run.status === "stopped";
  useEffect(() => { if (finished) refreshNavBadges(); }, [finished]);
  const [expanded, setExpanded] = useState<number | null>(null);

  const phases = toPhases(run, now);
  const activeIdx = phases.findIndex((p) => p.status === "active");
  const haltIdx = phases.findIndex((p) => p.status === "interrupted");
  const currentNo = activeIdx >= 0 ? activeIdx + 1 : haltIdx >= 0 ? haltIdx + 1 : phases.filter((p) => p.status === "done").length;
  const elapsed = run.startedAt ? (run.finishedAt ? Date.parse(run.finishedAt) : now) - Date.parse(run.startedAt) : 0;
  const statusText = running ? "Running" : run.status === "paused" ? "Paused" : run.status === "stopped" ? "Interrupted" : run.status === "done" ? "Done" : run.status === "failed" ? "Failed" : "Ready";
  const live = run.steps.find((s) => s.status === "running");
  // Between two steps no step is "running" yet; the line then names the phase that is about to
  // work, so it never blinks out and back in while the run moves on.
  const activePhase = activeIdx >= 0 ? phases[activeIdx] : null;
  const shimmerText = live ? (live.detail ? `${live.label} — ${live.detail}` : live.label) : activePhase ? `${activePhase.title}…` : "Working…";

  // Follow the running step: when it changes, the card scrolls it into view — unless the user has
  // scrolled away by hand (wheel / touch / keys inside the scrolling column). Scrolling back so the
  // step is visible again re-arms the follow.
  const activeRef = useRef<HTMLLIElement | null>(null);
  const follow = useRef(true);
  const scrollKey = running ? activeIdx : -1;
  useEffect(() => {
    const el = activeRef.current;
    if (!el) return;
    const scroller = scrollParent(el);
    const inside = (t: EventTarget | null) => !!(t instanceof Node && (scroller ? scroller.contains(t) : true));
    const manual = (e: Event) => { if (inside(e.target)) follow.current = false; };
    const keys = (e: KeyboardEvent) => { if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key) && inside(e.target)) follow.current = false; };
    window.addEventListener("wheel", manual, { passive: true });
    window.addEventListener("touchmove", manual, { passive: true });
    window.addEventListener("keydown", keys);
    const io = new IntersectionObserver(([en]) => { if (en?.isIntersecting && en.intersectionRatio >= 0.99) follow.current = true; }, { root: scroller, threshold: [0.99] });
    io.observe(el);
    return () => { window.removeEventListener("wheel", manual); window.removeEventListener("touchmove", manual); window.removeEventListener("keydown", keys); io.disconnect(); };
  }, [scrollKey, open]);
  useEffect(() => {
    if (scrollKey < 0 || !open || !follow.current) return;
    const el = activeRef.current;
    if (!el) return;
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Next frame: the new step's row has to exist and have its size before it can be targeted.
    const raf = requestAnimationFrame(() => el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" }));
    return () => cancelAnimationFrame(raf);
  }, [scrollKey, open]);

  return (
    <div className="v2-runwrap">
      {running && (
        <ShimmerLine text={shimmerText} ms={live?.startedAt ? now - Date.parse(live.startedAt) : undefined} onClick={() => setOpen(true)} />
      )}
      <div className={`v2-runcard${running ? " live" : ""}${run.status === "paused" || run.status === "stopped" ? " halted" : ""}`}>
        <div className="v2-runcard-head">
          <span className="v2-runcard-icon" aria-hidden><Search size={14} /></span>
          <span className="v2-runcard-title">{`Finding ${run.target}${more ? " more" : ""} leads via ${more ? "the same" : "the best"} pipeline`}</span>
          <span className={`v2-runcard-status s-${run.status}`}>
            <i aria-hidden />
            {run.status === "done" || run.status === "stopped" ? `${run.delivered} of ${run.target} found` : `Step ${Math.max(1, currentNo)} of ${phases.length}`} · {statusText}
          </span>
          <span className="v2-runcard-elapsed">{fmtDur(elapsed)} {running ? "elapsed" : ""}</span>
          <button type="button" className="v2-iconbtn" onClick={() => setOpen((o) => !o)} aria-label={open ? "Collapse" : "Expand"}>
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {open && (
          <ol className="v2-steps">
            {phases.map((p, i) => {
              const active = p.status === "active";
              const canExpand = p.subs.length > 1;
              const showSub = active && run.activity.length > 0 && p.title.startsWith("Verify");
              return (
                <li key={p.title} ref={active ? activeRef : undefined} className={`v2-step st-${p.status}`} style={{ animationDelay: `${i * 50}ms` }} aria-current={active ? "step" : undefined}>
                  <span className="v2-step-icon" aria-hidden>
                    {p.status === "done" ? <Check size={10} strokeWidth={3.5} /> : active ? <span className="v2-ring-spin" /> : p.status === "interrupted" ? <Pause size={9} strokeWidth={3} fill="currentColor" /> : p.status === "skipped" ? <Minus size={10} strokeWidth={3} /> : null}
                  </span>
                  <div className="v2-step-body">
                    <button type="button" className="v2-step-row" disabled={!canExpand} onClick={() => setExpanded(expanded === i ? null : i)}>
                      <span className="v2-step-num">{i + 1}.</span>
                      <span className="v2-step-label">{p.title}</span>
                      <span className="v2-step-right">
                        {active ? <span className="v2-pill-working">Working</span>
                          : p.status === "interrupted" ? <span className="v2-pill-halted">{run.status === "paused" ? "Paused" : "Interrupted"}</span>
                          : p.status === "queued" ? <span className="v2-step-queued">Queued</span>
                          : p.status === "skipped" ? <span className="v2-step-queued">Not run</span> : null}
                        {p.ms != null && p.status !== "queued" && <span className="v2-step-ms">{fmtDur(p.ms)}</span>}
                        {canExpand && (expanded === i ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                      </span>
                    </button>
                    <div className="v2-step-detail">{p.detail}</div>
                    {expanded === i && (
                      <div className="v2-subtasks">
                        {p.subs.map((s, k) => (
                          <div key={k} className="v2-subtask">
                            {s.status === "done" ? <Check size={11} /> : s.status === "running" ? <span className="v2-ring-spin sm" /> : <Minus size={11} />}
                            <span>{s.label}</span>{s.detail && <span className="v2-muted2">— {s.detail}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {showSub && (
                      <div className="v2-subtasks">
                        {run.activity.slice(0, 4).map((a, ai) => (
                          <div key={`${ai}-${a.label}`} className="v2-subtask">
                            <BookOpen size={12} aria-hidden />
                            <span>Reading a website</span>
                            {a.url ? <a href={a.url} target="_blank" rel="noopener noreferrer nofollow">{a.label} <ArrowUpRight size={12} /></a> : <span>{a.label}</span>}
                            {!a.ok && <em title="The site didn&apos;t load, so it was skipped">skipped</em>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="v2-runcard-foot">
          <span className="v2-runcard-hint"><Info size={13} aria-hidden /> {running ? "Keep chatting meanwhile" : run.status === "done" ? "Saved to Leads · list = this chat" : run.status === "paused" ? "Paused · resume any time" : run.status === "stopped" ? "Stopped · matches so far saved" : ""}</span>
          {running && <button type="button" className="v2-btn" onClick={() => onControl("pause")}><Pause size={13} /> Pause run</button>}
          {run.status === "paused" && <>
            <button type="button" className="v2-btn" onClick={() => onControl("resume")}><Play size={13} /> Resume</button>
            <button type="button" className="v2-btn" onClick={() => onControl("stop")}><Square size={12} /> Stop</button>
          </>}
          <button type="button" className="v2-btn" onClick={onViewDetails}><SlidersHorizontal size={13} /> View details</button>
        </div>
      </div>
    </div>
  );
}
