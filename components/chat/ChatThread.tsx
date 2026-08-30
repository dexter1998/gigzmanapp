"use client";

import { useEffect, useRef, useState } from "react";
import { ChatComposer } from "./ChatComposer";
import { ChatLeadsTable, type ChatLead } from "./ChatLeadsTable";
import { ClipboardIcon, LightbulbIcon, ThumbsUpIcon, ThumbsDownIcon, CheckIcon } from "@/components/icons";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";

export type AssistantIntent = {
  action: "search_leads" | "answer_from_existing" | "needs_clarification";
  reply: string;
  tookMs?: number;
  clarification?: { question: string; options: { label: string; description: string; value?: string }[] };
  leads?: ChatLead[];
  nextActions?: string[];
  noWebsiteOnly?: boolean;
  apiDown?: boolean;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent: AssistantIntent | null;
  created_at: string;
  feedback?: "up" | "down" | null;
};

export function ChatThread({ chatId, title, initialMessages }: { chatId: string; title?: string; initialMessages: Message[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [sending, setSending] = useState(false);
  const [thinkingSec, setThinkingSec] = useState(0);
  const [otherDraft, setOtherDraft] = useState("");
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // `sendValue` lets a clarification option show a friendly label in the thread while sending
  // a sentinel the server resolves specially underneath (see USE_LAST_MAP_AREA) — defaults to
  // the displayed text itself for normal typed messages.
  async function send(displayText: string, sendValue?: string) {
    setSending(true);
    setShowOtherInput(false);
    setThinkingSec(0);
    timerRef.current = setInterval(() => setThinkingSec((s) => s + 1), 1000);
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: "user", content: displayText, intent: null, created_at: new Date().toISOString() },
    ]);
    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: sendValue ?? displayText }),
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

  // The pending clarification, if any, lives right above the composer — not buried in the
  // scrolling thread — so it reads the same way a Claude-style question prompt does: anchored
  // at the point of interaction, not just another message in the log.
  const lastMessage = messages[messages.length - 1];
  const pendingClarification = !sending && lastMessage?.role === "assistant" ? lastMessage.intent?.clarification : undefined;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 24px 24px", display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {showMaintenance && <MaintenanceBanner onClose={() => setShowMaintenance(false)} />}
      {title && (
        <div style={{ position: "sticky", top: 0, background: "var(--g-cream)", zIndex: 1, padding: "8px 0 16px", borderBottom: "1px solid var(--g-border)", marginBottom: 20 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--g-ink)", margin: 0 }}>{title}</h1>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, marginBottom: 24 }}>
        {messages.map((m) =>
          m.role === "user" ? (
            <UserTurn key={m.id} content={m.content} />
          ) : (
            <AssistantTurn key={m.id} message={m} onSend={send} onFeedback={setFeedback} />
          )
        )}
        {sending && (
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

      <div style={{ position: "sticky", bottom: 24 }}>
        {pendingClarification && (
          <div className="chat-glow-border" style={{ marginBottom: 10 }}>
            <div style={{ background: "var(--g-white)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)", padding: 16 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--g-ink)", marginBottom: 10 }}>{pendingClarification.question}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pendingClarification.options.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    disabled={sending}
                    onClick={() => send(opt.label, opt.value)}
                    style={{
                      textAlign: "left",
                      padding: "10px 13px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--g-border)",
                      background: "var(--g-cream)",
                      cursor: sending ? "default" : "pointer",
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-ink)" }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: "var(--g-gray-500)" }}>{opt.description}</div>
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
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-ink-soft)" }}>Other</div>
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
                        fontSize: 12.5,
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
                        fontSize: 12.5,
                        fontWeight: 700,
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
}

function UserTurn({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ alignSelf: "flex-end", maxWidth: "80%", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <div style={{ background: "var(--g-green-mint)", color: "var(--g-ink)", padding: "10px 16px", borderRadius: "var(--radius-lg)", fontSize: 14.5 }}>
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
}: {
  message: Message;
  onSend: (displayText: string, sendValue?: string) => void;
  onFeedback: (messageId: string, feedback: "up" | "down") => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const intent = message.intent;
  const hasLeads = intent?.leads && intent.leads.length > 0;

  return (
    <div style={{ alignSelf: "flex-start", maxWidth: "90%" }}>
      {intent?.tookMs != null && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontSize: 11.5, color: "var(--g-gray-500)", padding: 0, marginBottom: 6 }}
        >
          Mantis worked for {Math.max(1, Math.round(intent.tookMs / 1000))}s
        </button>
      )}

      {expanded && (
        <>
          <div style={{ fontSize: 14.5, color: "var(--g-ink)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{message.content}</div>

          {hasLeads && <ChatLeadsTable leads={intent!.leads!} />}
          {/* No generic "nothing found" line here. The server already writes a specific reply into
              message.content — whether we have not mapped the area at all, or have mapped it and
              this trade is not there — and printing a vague duplicate underneath it contradicted
              the accurate one directly above. */}

          {intent?.nextActions && intent.nextActions.length > 0 && (
            <div style={{ marginTop: 14, border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", background: "var(--g-white)", padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "var(--g-gray-500)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>
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
                      fontSize: 12.5,
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
