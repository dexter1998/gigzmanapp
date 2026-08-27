"use client";

import { useState } from "react";
import { PaperclipIcon, LinkIcon, MicIcon, ChevronDownIcon, ArrowRightIcon } from "@/components/icons";

/** Shared composer for both the chat landing page and an active thread. The attach, link,
 * and mic buttons are visual only (origami.chat reference has them; no behavior behind
 * them yet, per explicit instruction) — only the text input and submit are functional.
 * The model-selector chip always shows "Mantis Lite 1.2" — the real underlying model is
 * never surfaced in the UI. */
export function ChatComposer({
  onSubmit,
  placeholder = "Ask Mantis to find leads for you…",
  autoFocus = false,
  disabled = false,
}: {
  onSubmit: (message: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const message = value.trim();
    if (!message || disabled) return;
    onSubmit(message);
    setValue("");
  }

  return (
    <div
      style={{
        background: "var(--g-white)",
        border: "1px solid var(--g-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-card)",
        padding: "16px 18px 12px",
      }}
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={2}
        style={{
          width: "100%",
          border: "none",
          outline: "none",
          resize: "none",
          background: "transparent",
          fontFamily: "inherit",
          fontSize: 15,
          color: "var(--g-ink)",
          marginBottom: 10,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button type="button" disabled title="Attach a file (coming soon)" style={composerIconButton}>
          <PaperclipIcon size={16} color="var(--g-gray-500)" />
        </button>
        <button type="button" disabled title="Add a link (coming soon)" style={composerIconButton}>
          <LinkIcon size={16} color="var(--g-gray-500)" />
        </button>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: "var(--radius-pill)", border: "1px solid var(--g-border)", fontSize: 12.5, fontWeight: 700, color: "var(--g-ink-soft)" }}>
          ⚡ Mantis Lite 1.2 <ChevronDownIcon size={12} color="var(--g-gray-500)" />
        </div>
        <button type="button" disabled title="Voice input (coming soon)" style={composerIconButton}>
          <MicIcon size={16} color="var(--g-gray-500)" />
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim() || disabled}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "none",
            background: value.trim() && !disabled ? "var(--g-green-dark)" : "var(--g-gray-100)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: value.trim() && !disabled ? "pointer" : "default",
            flexShrink: 0,
          }}
        >
          <ArrowRightIcon />
        </button>
      </div>
    </div>
  );
}

const composerIconButton: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  border: "none",
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "not-allowed",
  flexShrink: 0,
};
