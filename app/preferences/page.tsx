"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Email preferences for the signed-in account, in the same card the onboarding flow uses.
 *
 * Someone arriving from an email may not be signed in, and shouldn't have to be just to stop
 * receiving mail — that path is the signed unsubscribe link in the message itself (/u/<token>),
 * which needs no session at all. This page is the version for people already inside the product.
 */
export default function PreferencesPage() {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [unauthed, setUnauthed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/user/email-preferences");
      if (res.status === 401) {
        setUnauthed(true);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setSubscribed(Boolean(data.subscribed));
    })();
  }, []);

  async function set(next: boolean) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/user/email-preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscribed: next }),
    });
    if (res.ok) setSubscribed(next);
    else setError("Couldn't save that. Try again.");
    setSaving(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--g-cream)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div
          style={{
            background: "var(--g-white)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-card)",
            padding: 32,
          }}
        >
          <h1 style={titleStyle}>Email preferences</h1>

          {unauthed ? (
            <>
              <p style={subStyle}>Sign in to manage which emails Mantis sends you.</p>
              <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", margin: "0 0 24px" }}>
                Just want to stop marketing email without signing in? Use the unsubscribe link at the
                bottom of any Mantis email — it works without an account.
              </p>
              <Link
                href="/login"
                style={{ ...primaryBtn(true), display: "block", textAlign: "center", textDecoration: "none" }}
              >
                Sign in
              </Link>
            </>
          ) : subscribed === null ? (
            <p style={subStyle}>Loading…</p>
          ) : (
            <>
              <p style={subStyle}>
                Product updates, lead alerts and offers. Sign-in codes and account notices aren&apos;t
                affected and will always be delivered.
              </p>

              <div style={rowStyle}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--g-ink)" }}>Marketing email</div>
                  <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginTop: 3 }}>
                    {subscribed ? "You're subscribed" : "You're unsubscribed"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => set(!subscribed)}
                  disabled={saving}
                  style={subscribed ? secondaryBtn : { ...primaryBtn(true), flex: "0 0 auto" }}
                >
                  {saving ? "Saving…" : subscribed ? "Unsubscribe" : "Resubscribe"}
                </button>
              </div>

              {error && <p style={{ fontSize: 13, color: "var(--g-red-text)", margin: "14px 0 0" }}>{error}</p>}

              <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", margin: "18px 0 0" }}>
                <Link href="/privacy">How we handle your data</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 26,
  fontWeight: 600,
  color: "var(--g-ink)",
  margin: "0 0 6px",
};
const subStyle: React.CSSProperties = { fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 24px" };
const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  border: "1px solid var(--g-border)",
  borderRadius: "var(--radius-md)",
  padding: "18px 20px",
};
function primaryBtn(enabled: boolean): React.CSSProperties {
  return {
    padding: "12px 24px",
    borderRadius: "var(--radius-pill)",
    border: "none",
    background: enabled ? "var(--g-green)" : "var(--g-gray-100)",
    color: enabled ? "#fff" : "var(--g-gray-500)",
    fontSize: 14,
    fontWeight: 700,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}
const secondaryBtn: React.CSSProperties = {
  padding: "12px 24px",
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--g-border)",
  background: "var(--g-white)",
  color: "var(--g-ink)",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};
