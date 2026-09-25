"use client";

import { useEffect, useState } from "react";

const CONSENT_KEY = "mantis-cookie-consent";

/** Gate for the GA scripts in app/layout.tsx: nothing fires them until this reports "granted",
 * so first paint never sets a tracking cookie before the visitor has said yes. Reads/writes
 * localStorage directly rather than through a React context — the two GA <Script> tags in the
 * root layout need the same value before this component has necessarily mounted. */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(CONSENT_KEY) === null);
    } catch {
      // Storage unavailable (private mode, blocked cookies) — leave the banner hidden rather
      // than nag on every load with no way to persist the answer.
    }
  }, []);

  function choose(value: "granted" | "denied") {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // Nothing to fall back to — the choice just won't persist across reloads.
    }
    setVisible(false);
    if (value === "granted") {
      // Reload once so the gated GA <Script> tags in the root layout re-evaluate and load.
      window.location.reload();
    }
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 70,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
        maxWidth: 520,
        margin: "0 auto",
        background: "var(--g-ink)",
        color: "#fff",
        padding: "14px 16px",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-toolbar)",
      }}
    >
      <span style={{ fontSize: 12.5, lineHeight: 1.4, flex: "1 1 240px" }}>
        We use cookies for analytics to understand how Mantis is used.{" "}
        <a href="/privacy" style={{ color: "inherit", textDecoration: "underline" }}>
          Privacy policy
        </a>
      </span>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => choose("denied")}
          style={{
            fontSize: 12.5,
            padding: "8px 14px",
            borderRadius: "var(--radius-sm, 8px)",
            border: "1px solid rgba(255,255,255,0.24)",
            background: "transparent",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => choose("granted")}
          style={{
            fontSize: 12.5,
            padding: "8px 14px",
            borderRadius: "var(--radius-sm, 8px)",
            border: "none",
            background: "#fff",
            color: "var(--g-ink)",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
