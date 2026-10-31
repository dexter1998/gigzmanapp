"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChatComposer } from "./ChatComposer";
import { FeatureCards } from "./FeatureCards";
import { SparkleIcon } from "@/components/icons";

type Unfinished = { chatId: string; title: string; delivered: number; target: number };

export function ChatLanding({ name, suggestions, v2 = false, prefill = "", unfinished = [] }: { name: string | null; suggestions: string[]; v2?: boolean; prefill?: string; unfinished?: Unfinished[] }) {
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

      // V2: open the chat now and let it send the message, so the work is visible there.
      if (v2) {
        router.push(`/chat/${chat.id}?q=${encodeURIComponent(message)}`);
        return;
      }

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
    <>
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "88px 24px 48px", textAlign: "center" }}>
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

      <ChatComposer key={prefill} onSubmit={startChat} disabled={sending} autoFocus initialValue={prefill} />

      {unfinished.length > 0 && (
        <div className="chat-unfinished" data-track="chat.unfinished">
          <span>Unfinished — pick up where it stopped:</span>
          {unfinished.map((u) => (
            <Link key={u.chatId} href={`/chat/${u.chatId}`} className="chat-unfinished-item">
              {u.title.split(" · ")[0].slice(0, 48)} <b>{u.delivered}/{u.target}</b> · Continue →
            </Link>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div
          className="chat-suggestion-marquee"
          style={{ marginTop: 20, overflow: "hidden", maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)" }}
        >
          <div className="chat-suggestion-track" style={{ display: "flex", gap: 8, width: "max-content" }}>
            {[...suggestions, ...suggestions].map((s, i) => (
              <button
                key={`${s}-${i}`}
                type="button"
                onClick={() => startChat(s)}
                disabled={sending}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: "var(--radius-pill)",
                  border: "none",
                  background: "var(--g-gray-100)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--g-ink-soft)",
                  cursor: sending ? "default" : "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <SparkleIcon size={12} color="var(--g-gray-500)" />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
    <FeatureCards />
    </>
  );
}
