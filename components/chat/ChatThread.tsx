"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { FOCUS_COMPOSER } from "@/lib/chat-clarifications";
import { ChatComposer } from "./ChatComposer";
import { ChatLeadsTable, type ChatLead } from "./ChatLeadsTable";
import { ClipboardIcon, LightbulbIcon, ThumbsUpIcon, ThumbsDownIcon, CheckIcon } from "@/components/icons";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import type { ChatAction, Chip } from "@/lib/v2/state";
import type { TurnStep, PlanCard as PlanCardData } from "@/lib/v2/turn";
import type { RunSnapshot } from "@/lib/v2/runner";
import { V2Panel, PlanCard, type PanelContent } from "./v2/V2Panel";
import { RunProgressCard, ShimmerLine, QuoteCard } from "./v2/RunProgress";
import { Blocks } from "./v2/Blocks";
import { Markdown } from "./v2/Markdown";
import type { Block } from "@/lib/v2/blocks";
import { driveRun } from "@/lib/v2/run-driver";

export type AssistantIntent = {
  action: "search_leads" | "answer_from_existing" | "needs_clarification";
  reply: string;
  tookMs?: number;
  clarification?: { question: string; options: { label: string; description: string; value?: string; action?: ChatAction }[] };
  leads?: ChatLead[];
  nextActions?: string[];
  noWebsiteOnly?: boolean;
  apiDown?: boolean;
  /** V2 only (docs/v2-agents.md): chips carry a typed action instead of text to re-interpret. */
  v2?: true;
  chips?: Chip[];
  steps?: TurnStep[];
  plan?: PlanCardData;
  runId?: string;
  question?: string;
  blocks?: Block[];
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent: AssistantIntent | null;
  created_at: string;
  feedback?: "up" | "down" | null;
};

export function ChatThread({ chatId, title, initialMessages, v2 = false, userInitial = "" }: { chatId: string; title?: string; initialMessages: Message[]; v2?: boolean; userInitial?: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [sending, setSending] = useState(false);
  const [thinkingSec, setThinkingSec] = useState(0);
  const [otherDraft, setOtherDraft] = useState("");
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // V2: the right panel shows the newest result set — a run, or a plain search's leads — unless
  // the user picked an older one with "View results".
  const [run, setRun] = useState<RunSnapshot | null>(null);
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const [pollKey, setPollKey] = useState(0);
  const sourceIdx = useMemo(() => {
    if (!v2) return -1;
    if (focusIdx !== null && focusIdx < messages.length) return focusIdx;
    for (let i = messages.length - 1; i >= 0; i--) {
      const it = messages[i].intent;
      if (it?.runId || (it?.leads && it.leads.length)) return i;
    }
    return -1;
  }, [messages, focusIdx, v2]);
  const source = sourceIdx >= 0 ? messages[sourceIdx] : null;
  const sourceRunId = source?.intent?.runId ?? null;
  const startedRunIds = useMemo(() => new Set(messages.map((m) => m.intent?.runId).filter(Boolean) as string[]), [messages]);

  // Load the run; while it is running, lib/v2/run-driver.ts ticks it. The driver outlives this page,
  // so the run keeps going when the user opens Leads or Settings, and stops only with the tab.
  useEffect(() => {
    if (!sourceRunId) return;
    let cancelled = false;
    let stop: (() => void) | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    const onSnap = (snap: RunSnapshot) => {
      if (cancelled) return;
      setRun(snap);
      const summary = snap.summaryMessage as unknown as Message | undefined;
      if (summary) setMessages((prev) => (prev.some((m) => m.id === summary.id) ? prev : [...prev, summary]));
      if (snap.status !== "running" && poll) { clearInterval(poll); poll = null; }
    };
    (async () => {
      const snap = ((await (await fetch(`/api/v2/runs/${sourceRunId}`)).json()) as { run?: RunSnapshot }).run ?? null;
      if (cancelled || !snap) return;
      setRun(snap);
      if (snap.status !== "running") return;
      stop = driveRun(sourceRunId, onSnap);
      // A tick answers only after ~15s of work; while this page is open the plain snapshot is read
      // every 1.5s so the steps and table rows move as soon as the database does.
      poll = setInterval(async () => {
        try {
          const mid = ((await (await fetch(`/api/v2/runs/${sourceRunId}`)).json()) as { run?: RunSnapshot }).run;
          if (!cancelled && mid?.status === "running") setRun(mid);
        } catch { /* the next tick's answer follows anyway */ }
      }, 1500);
    })().catch(() => {});
    return () => { cancelled = true; stop?.(); if (poll) clearInterval(poll); };
  }, [sourceRunId, pollKey]);

  // Pause / resume / stop from the chat card or the panel. Resume restarts the tick loop.
  async function controlRun(action: "pause" | "resume" | "stop") {
    if (!sourceRunId) return;
    const d = (await (await fetch(`/api/v2/runs/${sourceRunId}/control`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) })).json()) as { run?: RunSnapshot };
    if (d.run) {
      setRun(d.run);
      const summary = d.run.summaryMessage as unknown as Message | undefined;
      if (summary) setMessages((prev) => (prev.some((m) => m.id === summary.id) ? prev : [...prev, summary]));
    }
    if (action === "resume") setPollKey((k) => k + 1);
  }

  // A run is drawn once in the chat — on the first message that carries it.
  const firstRunMsg = useMemo(() => {
    const m = new Map<string, string>();
    for (const msg of messages) { const rid = msg.intent?.runId; if (rid && !m.has(rid)) m.set(rid, msg.id); }
    return m;
  }, [messages]);

  // Chat ↔ results divider. The user can move it ±15% of the workspace from where it starts, and
  // never so far that the chat's text or the table's columns would have to overflow.
  const splitRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  // The saved width is read through useSyncExternalStore: the server renders without it, so the
  // first client render matches and the stored width applies right after.
  const storedW = useSyncExternalStore(subscribeChatW, readChatW, () => null);
  const [dragW, setDragW] = useState<number | null>(null);
  const chatW = dragW ?? storedW;
  function clampChatW(w: number) {
    const total = splitRef.current?.getBoundingClientRect().width ?? window.innerWidth;
    // Same default as the CSS: 575px, less on narrow screens.
    const base = Math.min(575, Math.max(CHAT_MIN_W, total - TABLE_ROOM_W));
    const lo = Math.max(CHAT_MIN_W, base - total * 0.15);
    const hi = Math.min(base + total * 0.15, total - PANEL_MIN_W);
    return Math.round(Math.max(lo, Math.min(Math.max(lo, hi), w)));
  }
  function saveChatW(w: number | null) {
    try { if (w) window.localStorage.setItem(CHAT_W_KEY, String(w)); else window.localStorage.removeItem(CHAT_W_KEY); } catch { /* private mode */ }
    window.dispatchEvent(new Event(CHAT_W_EVENT));
    setDragW(null);
  }
  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const left = splitRef.current?.getBoundingClientRect().left ?? 0;
    setDragging(true);
    // The results table scrolls sideways when it is narrow, so the chat may grow freely inside the clamp.
    const move = (ev: PointerEvent) => setDragW(clampChatW(ev.clientX - left));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDragging(false);
      saveChatW(Math.round(colRef.current?.getBoundingClientRect().width ?? 0) || null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // New turns land under the sticky composer otherwise; keep the newest message in view. The chat
  // column scrolls by itself in V2, so it is the column that moves, never the page.
  const colRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (v2) colRef.current?.scrollTo({ top: colRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending, v2]);

  const panelContent: PanelContent = !source
    ? { kind: "idle" }
    : sourceRunId
      ? { kind: "run", run: run?.id === sourceRunId ? run : null }
      : { kind: "leads", title: source.content.split("\n\n").pop() ?? source.content, leads: source.intent!.leads!, steps: source.intent?.steps ?? [] };
  const panelOpen = v2 && !!source;

  // `sendValue` lets a clarification option show a friendly label in the thread while sending
  // a sentinel the server resolves specially underneath (see USE_LAST_MAP_AREA) — defaults to
  // the displayed text itself for normal typed messages.
  async function send(displayText: string, sendValue?: string, action?: ChatAction) {
    // "Open Billing" and the like: a screen of the app, not a message to the assistant.
    if (action?.type === "open") { router.push(action.href); return; }
    setFocusIdx(null);
    setSending(true);
    setShowOtherInput(false);
    setThinkingSec(0);
    timerRef.current = setInterval(() => setThinkingSec((s) => s + 1), 1000);
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: "user", content: displayText, intent: null, created_at: new Date().toISOString() },
    ]);
    try {
      const text = sendValue ?? displayText;
      const here = NEAR_ME.test(text) && !/\blast\s+(searched\s+)?(area|location|place)\b/i.test(text) ? await deviceLocation() : null;
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, action, ...(here ? { here } : {}) }),
      });
      const { message: assistantMessage } = (await res.json()) as { message: Message };
      setMessages((prev) => [...prev, assistantMessage]);
      if (assistantMessage.intent?.apiDown) setShowMaintenance(true);
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setSending(false);
    }
  }

  async function setFeedback(messageId: string, feedback: "up" | "down") {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, feedback: m.feedback === feedback ? null : feedback } : m)));
    const next = messages.find((m) => m.id === messageId)?.feedback === feedback ? null : feedback;
    await fetch(`/api/chats/${chatId}/messages/${messageId}/feedback`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ feedback: next }),
    });
  }

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // V2 landing hands the first message over in ?q= and navigates at once, so the processing is
  // watched here in the chat — not as a frozen landing page for five seconds.
  const autoSent = useRef(false);
  useEffect(() => {
    if (!v2 || autoSent.current || initialMessages.length) return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (!q) return;
    // Next tick, not inside the effect body: send() sets state. The flag is set inside the timer
    // so React's dev double-run (mount, cleanup, mount) still sends exactly once.
    const t = setTimeout(() => {
      if (autoSent.current) return;
      autoSent.current = true;
      window.history.replaceState(null, "", window.location.pathname);
      void send(q);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The pending clarification, if any, lives right above the composer — not buried in the
  // scrolling thread — so it reads the same way a Claude-style question prompt does: anchored
  // at the point of interaction, not just another message in the log.
  const lastMessage = messages[messages.length - 1];
  const lastIntent = !sending && lastMessage?.role === "assistant" ? lastMessage.intent : undefined;
  // V2: the latest turn's next steps (widen, more, run…) are asked as the question above the
  // composer, the same place a clarification is asked — not as chips buried in the thread.
  const nextChips = (lastIntent?.chips ?? []).filter((c) => !(c.action.type === "run_plan" && startedRunIds.has(c.action.runId)));
  // Closing the question hides it for that message only; the next turn may ask again.
  const pendingClarification = dismissedId === lastMessage?.id ? undefined : lastIntent?.clarification
    ?? (v2 && nextChips.length
      ? { question: lastIntent?.question ?? "What next?", options: nextChips.map((c) => ({ label: c.label, description: "", value: undefined as string | undefined, action: c.action })) }
      : undefined);

  const chatColumn = (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 24px 24px", display: "flex", flexDirection: "column", minHeight: "100vh", width: "100%" }}>
      {showMaintenance && <MaintenanceBanner onClose={() => setShowMaintenance(false)} />}
      {title && (
        <div style={{ position: "sticky", top: 0, background: "var(--g-cream)", zIndex: 1, padding: "8px 0 16px", borderBottom: "1px solid var(--g-border)", marginBottom: 20 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, color: "var(--g-ink)", margin: 0 }}>{title}</h1>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, marginBottom: 24 }}>
        {messages.map((m, i) =>
          m.role === "user" ? (
            <UserTurn key={m.id} content={m.content} avatar={v2 ? userInitial || "•" : null} />
          ) : (
            <AssistantTurn
              key={m.id}
              message={m}
              onSend={send}
              onFeedback={setFeedback}
              v2={v2}
              inPanel={i === sourceIdx}
              onView={() => setFocusIdx(i)}
              startedRunIds={startedRunIds}
              run={run && m.intent?.runId === run.id && firstRunMsg.get(run.id) === m.id ? run : null}
              onControl={controlRun}
            />
          )
        )}
        {sending && v2 && <ShimmerLine text={thinkingSec < 3 ? "Understanding your request" : thinkingSec < 8 ? "Working out the best way to find them" : "Still working"} ms={thinkingSec * 1000} />}
        {sending && !v2 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--g-gray-500)" }}>
            <span style={{ display: "inline-flex", gap: 3 }}>
              <span className="chat-searching-dot" style={{ animationDelay: "0ms" }} />
              <span className="chat-searching-dot" style={{ animationDelay: "150ms" }} />
              <span className="chat-searching-dot" style={{ animationDelay: "300ms" }} />
            </span>
            Mantis is searching… {thinkingSec}s
          </div>
        )}
      </div>

      <div className={v2 ? "v2-dock" : undefined} style={{ position: "sticky", bottom: v2 ? 0 : 24 }}>
        {pendingClarification && (
          <div className="chat-glow-border" style={{ marginBottom: 10 }}>
            <div style={{ background: "var(--g-white)", borderRadius: "var(--radius-lg)", border: "1px solid var(--g-border)", padding: 16, position: "relative" }}>
              <button
                type="button"
                className="chat-question-x"
                aria-label="Close question"
                title="Close"
                onClick={() => { setDismissedId(lastMessage?.id ?? null); setShowOtherInput(false); }}
              >
                ×
              </button>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--g-ink)", marginBottom: 10, paddingRight: 28 }}>{pendingClarification.question}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pendingClarification.options.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    disabled={sending}
                    onClick={() => (opt.value === FOCUS_COMPOSER ? setShowOtherInput(true) : send(opt.label, opt.value, opt.action))}
                    style={{
                      textAlign: "left",
                      padding: "10px 13px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--g-border)",
                      background: "var(--g-cream)",
                      cursor: sending ? "default" : "pointer",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--g-ink)" }}>{opt.label}</div>
                    {opt.description && <div style={{ fontSize: 11, color: "var(--g-gray-500)" }}>{opt.description}</div>}
                  </button>
                ))}

                {!showOtherInput ? (
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => setShowOtherInput(true)}
                    style={{
                      textAlign: "left",
                      padding: "10px 13px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px dashed var(--g-border)",
                      background: "transparent",
                      cursor: sending ? "default" : "pointer",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--g-ink-soft)" }}>Other</div>
                    <div style={{ fontSize: 11, color: "var(--g-gray-500)" }}>Type your own answer</div>
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      autoFocus
                      value={otherDraft}
                      onChange={(e) => setOtherDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && otherDraft.trim()) {
                          send(otherDraft.trim());
                          setOtherDraft("");
                        }
                      }}
                      placeholder="Type your answer…"
                      style={{
                        flex: 1,
                        padding: "9px 12px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--g-border)",
                        fontSize: 12,
                        outline: "none",
                        background: "var(--g-white)",
                        color: "var(--g-ink)",
                      }}
                    />
                    <button
                      type="button"
                      disabled={!otherDraft.trim() || sending}
                      onClick={() => {
                        send(otherDraft.trim());
                        setOtherDraft("");
                      }}
                      style={{
                        padding: "0 14px",
                        borderRadius: "var(--radius-sm)",
                        border: "none",
                        background: otherDraft.trim() ? "var(--g-green-dark)" : "var(--g-gray-100)",
                        color: otherDraft.trim() ? "#fff" : "var(--g-gray-500)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: otherDraft.trim() ? "pointer" : "default",
                      }}
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <ChatComposer onSubmit={send} disabled={sending} placeholder="Ask a follow-up…" />
      </div>
    </div>
  );

  if (!v2) return chatColumn;
  return (
    <div ref={splitRef} className={`v2-split${panelOpen ? " open" : ""}${dragging ? " dragging" : ""}`} style={chatW ? ({ "--v2-chat-w": `${chatW}px` } as React.CSSProperties) : undefined}>
      <div className="v2-chatcol" ref={colRef}>{chatColumn}</div>
      {panelOpen && (
        <div
          className="v2-divider"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat and results"
          tabIndex={0}
          onPointerDown={startDrag}
          onDoubleClick={() => saveChatW(null)}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            const cur = colRef.current?.getBoundingClientRect().width ?? 500;
            saveChatW(clampChatW(cur + (e.key === "ArrowRight" ? 24 : -24)));
          }}
        />
      )}
      {panelOpen && (
        <V2Panel
          content={panelContent}
          working={sending}
          workingSec={thinkingSec}
          onControl={controlRun}
          onFindMore={run && run.status !== "running" && run.status !== "paused" ? () => send("Find more leads like these", undefined, { type: "more_run", runId: run.id }) : undefined}
          onQuickOutreach={run && (run.status === "done" || run.status === "stopped") && run.delivered > 0 ? async () => {
            // The chat's list goes straight into the builder; the planner starts drafting there.
            const d = (await (await fetch("/api/v2/outreach/campaigns", { method: "POST", headers: { "content-type": "application/json" },
              body: JSON.stringify({ listChatId: chatId, origin: "chat", kind: "sequence" }) })).json()) as { id?: string };
            if (d.id) router.push(`/campaigns/${d.id}`);
          } : undefined}
          onRefresh={() => {
            if (sourceRunId) fetch(`/api/v2/runs/${sourceRunId}`).then((r) => r.json()).then((d: { run?: RunSnapshot }) => d.run && setRun(d.run)).catch(() => {});
          }}
        />
      )}
    </div>
  );
}

/** Narrowest chat column that still reads well, and the table's narrowest width with every column. */
const CHAT_MIN_W = 437;
const PANEL_MIN_W = 560;
/** Room the results table needs with the panel's padding — mirrored in globals.css. */
const TABLE_ROOM_W = 760;
const CHAT_W_KEY = "mantis.v2.chatW";
const CHAT_W_EVENT = "mantis:chatw";
function subscribeChatW(cb: () => void) {
  window.addEventListener(CHAT_W_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(CHAT_W_EVENT, cb); window.removeEventListener("storage", cb); };
}
function readChatW(): number | null {
  try { const v = Number(window.localStorage.getItem(CHAT_W_KEY)); return v > 0 ? v : null; } catch { return null; }
}

function UserTurn({ content, avatar = null }: { content: string; avatar?: string | null }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ alignSelf: "flex-end", maxWidth: "80%", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, position: "relative", paddingRight: avatar ? 40 : 0 }}>
      {avatar && <span className="v2-avatar user" aria-hidden>{avatar}</span>}
      <div style={{ background: "var(--g-green-mint)", color: "var(--g-ink)", padding: "10px 16px", borderRadius: "var(--radius-lg)", fontSize: 14 }}>
        {content}
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(content);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        title="Copy"
        style={iconBtnStyle}
      >
        {copied ? <CheckIcon size={12} /> : <ClipboardIcon size={12} color="var(--g-gray-500)" />}
      </button>
    </div>
  );
}

function AssistantTurn({
  message,
  onSend,
  onFeedback,
  v2 = false,
  inPanel = false,
  onView,
  startedRunIds,
  run = null,
  onControl,
}: {
  message: Message;
  onSend: (displayText: string, sendValue?: string, action?: ChatAction) => void;
  onFeedback: (messageId: string, feedback: "up" | "down") => void;
  v2?: boolean;
  inPanel?: boolean;
  onView?: () => void;
  startedRunIds?: Set<string>;
  run?: RunSnapshot | null;
  onControl?: (action: "pause" | "resume" | "stop") => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [stepsOpen, setStepsOpen] = useState(!v2);
  const [copied, setCopied] = useState(false);
  const intent = message.intent;
  const hasLeads = intent?.leads && intent.leads.length > 0;

  return (
    <div style={{ alignSelf: "flex-start", maxWidth: v2 ? "100%" : "90%", position: "relative", paddingLeft: v2 ? 44 : 0, width: v2 ? "100%" : undefined }}>
      {v2 && <span className="v2-avatar bot" aria-hidden><span className="v2-avatar-mark" /></span>}
      {intent?.tookMs != null && (
        <button
          type="button"
          // V2 with no steps has nothing to fold — a button that does nothing reads as broken.
          disabled={v2 && !intent.steps?.length}
          onClick={() => (v2 ? setStepsOpen((o) => !o) : setExpanded((e) => !e))}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: v2 && !intent.steps?.length ? "default" : "pointer", fontSize: 12, color: "var(--g-gray-500)", padding: 0, marginBottom: 6 }}
        >
          Mantis worked for {Math.max(1, Math.round(intent.tookMs / 1000))}s
          {v2 && intent.steps && intent.steps.length > 0 && <span aria-hidden>{stepsOpen ? "⌄" : "›"}</span>}
        </button>
      )}
      {/* V2: steps collapsed behind "Mantis worked for Ns ›" — the full list is in the panel. */}
      {stepsOpen && intent?.steps && intent.steps.length > 0 && <StepLines steps={intent.steps} />}

      {expanded && (
        <>
          {/* V2: structured blocks when the reply has them, markdown otherwise; v1 stays plain text. */}
          {v2 && intent?.blocks?.length
            ? <Blocks blocks={intent.blocks} onSend={onSend} startedRunIds={startedRunIds} onViewRun={run ? () => document.getElementById(`run-${run.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }) : undefined} />
            : v2 ? <Markdown text={message.content} />
            : <div style={{ fontSize: 14, color: "var(--g-ink)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{message.content}</div>}

          {hasLeads && !v2 && <ChatLeadsTable leads={intent!.leads!} />}
          {v2 && (hasLeads || (intent?.runId && !run)) && (
            <button type="button" className={`v2-view${inPanel ? " active" : ""}`} onClick={onView}>
              {inPanel ? "Shown on the right" : hasLeads ? `View ${intent!.leads!.length} results →` : "View run →"}
            </button>
          )}
          {intent?.plan && !intent.plan.started && !intent.blocks?.some((b) => b.type === "scope") && <PlanCard plan={intent.plan} started={!!startedRunIds?.has(intent.plan.runId)} />}
          {intent?.plan?.started && !intent.blocks?.some((b) => b.type === "scope") && <QuoteCard plan={intent.plan} />}
          {run && onControl && <div id={`run-${run.id}`}><RunProgressCard run={run} more={!!intent?.plan?.more} onControl={onControl} onViewDetails={() => onView?.()} /></div>}
          {/* No generic "nothing found" line here. The server already writes a specific reply into
              message.content — whether we have not mapped the area at all, or have mapped it and
              this trade is not there — and printing a vague duplicate underneath it contradicted
              the accurate one directly above. */}

          {!v2 && intent?.chips && intent.chips.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {intent.chips.filter((c) => !(c.action.type === "run_plan" && startedRunIds?.has(c.action.runId))).map((chip) => (
                <button key={chip.label} type="button" className="v2-chip" onClick={() => onSend(chip.label, undefined, chip.action)}>
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {intent?.nextActions && intent.nextActions.length > 0 && (
            <div style={{ marginTop: 14, border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", background: "var(--g-white)", padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--g-gray-500)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>
                <LightbulbIcon size={13} color="var(--g-gray-500)" />
                Suggested next actions
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {intent.nextActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => onSend(action)}
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      border: "none",
                      background: "transparent",
                      fontSize: 12,
                      color: "var(--g-ink-soft)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--g-cream)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(message.content);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              title="Copy"
              style={iconBtnStyle}
            >
              {copied ? <CheckIcon size={12} /> : <ClipboardIcon size={12} color="var(--g-gray-500)" />}
            </button>
            <button type="button" onClick={() => onFeedback(message.id, "up")} title="Good response" style={iconBtnStyle}>
              <ThumbsUpIcon size={13} color={message.feedback === "up" ? "var(--g-green-text)" : "var(--g-gray-500)"} filled={message.feedback === "up"} />
            </button>
            <button type="button" onClick={() => onFeedback(message.id, "down")} title="Bad response" style={iconBtnStyle}>
              <ThumbsDownIcon size={13} color={message.feedback === "down" ? "var(--g-red-text)" : "var(--g-gray-500)"} filled={message.feedback === "down"} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** What actually ran this turn, one line per step: label, time, and an expandable detail. */
function StepLines({ steps }: { steps: TurnStep[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
      {steps.map((st, i) => (
        <div key={i}>
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            disabled={!st.detail}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, fontSize: 12, color: "var(--g-gray-500)", cursor: st.detail ? "pointer" : "default" }}
          >
            <span style={{ color: st.status === "done" ? "var(--g-green-text)" : "var(--g-red-text)" }}>{st.status === "done" ? "✓" : "✕"}</span>
            <span>{st.label}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{(st.ms / 1000).toFixed(1)}s</span>
            {st.detail && <span aria-hidden>{open === i ? "⌄" : "›"}</span>}
          </button>
          {open === i && st.detail && <div style={{ fontSize: 12, color: "var(--g-gray-500)", paddingLeft: 18 }}>{st.detail}</div>}
        </div>
      ))}
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
};

/** "near me / my location": the planner should use where the user actually is (prod: it used the
 *  business's city or an old map area). Same phrases as the planner's NEAR_ME_RE. */
const NEAR_ME = /\b(last\s+(searched\s+)?(area|location|place)|near\s*(me|by)|nearby|around\s+me|my\s+(city|area|location|locality)|aas[\s-]?paas|mere\s+(paas|area|shehar))\b/i;

/** The browser's location — asks permission once; null if refused, unavailable or slow. */
function deviceLocation(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    const done = setTimeout(() => resolve(null), 9000);
    navigator.geolocation.getCurrentPosition(
      (p) => { clearTimeout(done); resolve({ lat: p.coords.latitude, lng: p.coords.longitude }); },
      () => { clearTimeout(done); resolve(null); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60_000 },
    );
  });
}
