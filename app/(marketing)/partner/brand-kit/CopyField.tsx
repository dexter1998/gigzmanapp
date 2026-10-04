"use client";

import { useState } from "react";

/**
 * A code block with a copy button.
 *
 * Client-side because the whole value of this page is that a partner never has to select text by
 * hand out of a <pre> and hope they got the closing tag. The fallback matters: clipboard.writeText
 * is unavailable on non-HTTPS origins and in some embedded browsers, and silently doing nothing
 * there would be worse than not offering the button -- so it falls back to selecting the code,
 * which at least leaves Ctrl+C working.
 */
export function CopyField({
  label, code, hint, wrap,
}: {
  label: string;
  code: string;
  hint?: string;
  /** Prose (a post caption) should wrap; markup should scroll, because a wrapped tag reads as
   *  broken and invites someone to "fix" it on the way into their site. */
  wrap?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const pre = document.getElementById(`code-${label}`);
      if (pre) {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--g-gray-500)" }}>
          {label}
        </span>
        <button
          type="button"
          onClick={copy}
          style={{
            fontSize: 11.5, fontWeight: 700, padding: "5px 12px", borderRadius: "var(--radius-pill)",
            border: "1px solid var(--g-border)", cursor: "pointer",
            background: copied ? "var(--g-green-mint)" : "var(--g-white)",
            color: copied ? "var(--g-green-text)" : "var(--g-ink)",
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {hint && <p style={{ fontSize: 12, color: "var(--g-gray-500)", margin: "0 0 6px", lineHeight: 1.5 }}>{hint}</p>}
      <pre
        id={`code-${label}`}
        style={{
          margin: 0, padding: "14px 16px",
          overflowX: wrap ? "visible" : "auto",
          whiteSpace: wrap ? "pre-wrap" : "pre",
          wordBreak: wrap ? "break-word" : "normal",
          background: "var(--g-cream)", border: "1px solid var(--g-border)",
          borderRadius: "var(--radius-sm)", fontSize: 12, lineHeight: 1.6,
          color: "var(--g-ink)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        {code}
      </pre>
    </div>
  );
}
