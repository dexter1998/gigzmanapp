"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChatComposer } from "./ChatComposer";

export function ChatLanding({ name, suggestions }: { name: string | null; suggestions: string[] }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const firstName = name?.split(" ")[0] ?? null;

  async function startChat(message: string) {
    setSending(true);
    try {
      const createRes = await fetch("/api/chats", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firstMessage: message }),
      });
      const { chat } = (await createRes.json()) as { chat: { id: string } };

      await fetch(`/api/chats/${chat.id}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });

      router.push(`/chat/${chat.id}`);
    } catch {
      setSending(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "88px 24px", textAlign: "center" }}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 34,
          fontWeight: 600,
          color: "var(--g-ink)",
          margin: "0 0 32px",
        }}
      >
        {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
      </h1>

      <ChatComposer onSubmit={startChat} disabled={sending} autoFocus />

      {suggestions.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 16 }}>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => startChat(s)}
              disabled={sending}
              style={{
                padding: "8px 14px",
                borderRadius: "var(--radius-pill)",
                border: "1px solid var(--g-border)",
                background: "var(--g-white)",
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--g-ink-soft)",
                cursor: sending ? "default" : "pointer",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
