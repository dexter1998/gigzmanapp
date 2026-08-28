"use client";

import { useEffect, useRef, useState } from "react";
import { ChatComposer } from "./ChatComposer";
import { ChatLeadsTable, type ChatLead } from "./ChatLeadsTable";

export type AssistantIntent = {
  action: "search_leads" | "answer_from_existing" | "needs_clarification";
  reply: string;
  tookMs?: number;
  clarification?: { question: string; options: { label: string; description: string; value?: string }[] };
  leads?: ChatLead[];
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent: AssistantIntent | null;
  created_at: string;
};

export function ChatThread({ chatId, initialMessages }: { chatId: string; initialMessages: Message[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [sending, setSending] = useState(false);
  const [thinkingSec, setThinkingSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // `sendValue` lets a clarification option show a friendly label in the thread while sending
  // a sentinel the server resolves specially underneath (see USE_LAST_MAP_AREA) — defaults to
  // the displayed text itself for normal typed messages.
  async function send(displayText: string, sendValue?: string) {
    setSending(true);
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
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setSending(false);
    }
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
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px 24px", display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, marginBottom: 24 }}>
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} style={{ alignSelf: "flex-end", maxWidth: "80%", background: "var(--g-green-mint)", color: "var(--g-ink)", padding: "10px 16px", borderRadius: "var(--radius-lg)", fontSize: 14.5 }}>
              {m.content}
            </div>
          ) : (
            <AssistantTurn key={m.id} message={m} />
          )
        )}
        {sending && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--g-gray-500)" }}>
            <span className="chat-thinking-dot" />
            Thinking for {thinkingSec}s…
          </div>
        )}
      </div>

      <div style={{ position: "sticky", bottom: 24 }}>
        {pendingClarification && (
          <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)", padding: 16, marginBottom: 10 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--g-ink)", marginBottom: 10 }}>{pendingClarification.question}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {pendingClarification.options.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  disabled={sending}
                  onClick={() => send(opt.label, opt.value)}
                  style={{
                    textAlign: "left",
                    padding: "9px 13px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--g-border)",
                    background: "var(--g-cream)",
                    cursor: sending ? "default" : "pointer",
                    maxWidth: 220,
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-ink)" }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: "var(--g-gray-500)" }}>{opt.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        <ChatComposer onSubmit={send} disabled={sending} placeholder="Ask a follow-up…" />
      </div>
    </div>
  );
}

function AssistantTurn({ message }: { message: Message }) {
  const [expanded, setExpanded] = useState(true);
  const intent = message.intent;

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

          {intent?.leads && intent.leads.length > 0 && <ChatLeadsTable leads={intent.leads} />}
        </>
      )}
    </div>
  );
}
