"use client";

import { useState } from "react";
import Link from "next/link";
import { HeatGauge } from "@/components/HeatGauge";
import { ChatComposer } from "./ChatComposer";

type LeadSummary = {
  id: string;
  business_name: string;
  category: string | null;
  has_website: boolean | null;
  heat_score: number | null;
};

export type AssistantIntent = {
  action: "search_leads" | "answer_from_existing" | "needs_clarification";
  reply: string;
  tookMs?: number;
  clarification?: { question: string; options: { label: string; description: string }[] };
  leads?: LeadSummary[];
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

  async function send(message: string) {
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: "user", content: message, intent: null, created_at: new Date().toISOString() },
    ]);
    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const { message: assistantMessage } = (await res.json()) as { message: Message };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px 24px", display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, marginBottom: 24 }}>
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} style={{ alignSelf: "flex-end", maxWidth: "80%", background: "var(--g-green-mint)", color: "var(--g-ink)", padding: "10px 16px", borderRadius: "var(--radius-lg)", fontSize: 14.5 }}>
              {m.content}
            </div>
          ) : (
            <AssistantTurn key={m.id} message={m} onPickOption={send} disabled={sending} />
          )
        )}
        {sending && <div style={{ fontSize: 13, color: "var(--g-gray-500)" }}>Mantis is thinking…</div>}
      </div>

      <div style={{ position: "sticky", bottom: 24 }}>
        <ChatComposer onSubmit={send} disabled={sending} placeholder="Ask a follow-up…" />
      </div>
    </div>
  );
}

function AssistantTurn({ message, onPickOption, disabled }: { message: Message; onPickOption: (text: string) => void; disabled: boolean }) {
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

          {intent?.clarification && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {intent.clarification.options.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  disabled={disabled}
                  onClick={() => onPickOption(opt.label)}
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--g-border)",
                    background: "var(--g-white)",
                    cursor: disabled ? "default" : "pointer",
                  }}
                >
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--g-ink)" }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: "var(--g-gray-500)" }}>{opt.description}</div>
                </button>
              ))}
            </div>
          )}

          {intent?.leads && intent.leads.length > 0 && (
            <div style={{ marginTop: 14, border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
              {intent.leads.map((lead) => (
                <Link
                  key={lead.id}
                  href="/home"
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: "1px solid var(--g-border)", textDecoration: "none" }}
                >
                  <HeatGauge score={lead.heat_score ?? 0} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--g-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {lead.business_name}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--g-gray-500)" }}>{lead.category ?? "Business"}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: "var(--radius-pill)", background: lead.has_website ? "var(--g-green-mint)" : "var(--g-amber-tint)", color: lead.has_website ? "var(--g-green-text)" : "#b45309" }}>
                    {lead.has_website ? "Has website" : "No website"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
