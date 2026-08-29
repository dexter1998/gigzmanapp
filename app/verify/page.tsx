"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * Standalone email verification, in the same card the onboarding flow uses.
 *
 * Verification is code-based, not link-based — /api/auth/verify-email takes an email and the code
 * from the message, so there is no one-click link to honour here. This page covers the case the
 * signup flow doesn't: someone closed the tab, or came back to the code later from the email
 * itself. The address can be prefilled with ?email=.
 */
function VerifyInner() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "working" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const ready = email.trim().length > 3 && code.trim().length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setState("working");
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "That didn't work. Check the code and try again.");
        setState("idle");
        return;
      }
      setState("done");
    } catch {
      setError("Couldn't reach the server. Try again in a moment.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <>
        <h1 style={titleStyle}>Email verified</h1>
        <p style={subStyle}>You&apos;re all set — your address is confirmed.</p>
        <Link href="/login" style={{ ...primaryBtn(true), display: "block", textAlign: "center", textDecoration: "none" }}>
          Go to sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 style={titleStyle}>Verify your email</h1>
      <p style={subStyle}>Enter the address you signed up with and the code we emailed you.</p>

      <form onSubmit={submit}>
        <label style={labelStyle} htmlFor="v-email">
          Email address
        </label>
        <input
          id="v-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          style={inputStyle}
        />

        <label style={{ ...labelStyle, marginTop: 16 }} htmlFor="v-code">
          Verification code
        </label>
        <input
          id="v-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
          style={{ ...inputStyle, letterSpacing: 3, fontWeight: 700 }}
        />

        {error && (
          <p style={{ fontSize: 13, color: "var(--g-red-text)", margin: "14px 0 0" }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button type="submit" disabled={!ready || state === "working"} style={primaryBtn(ready && state !== "working")}>
            {state === "working" ? "Verifying…" : "Verify email"}
          </button>
        </div>
      </form>

      <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", margin: "18px 0 0" }}>
        Code expired? <Link href="/login">Sign in</Link> and request a new one.
      </p>
    </>
  );
}

export default function VerifyPage() {
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
          <Suspense fallback={<p style={subStyle}>Loading…</p>}>
            <VerifyInner />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

// Same tokens as the onboarding cards, so this reads as one flow rather than a page from a
// different part of the product.
const titleStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 26,
  fontWeight: 600,
  color: "var(--g-ink)",
  margin: "0 0 6px",
};
const subStyle: React.CSSProperties = { fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 24px" };
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "var(--g-gray-500)",
  marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--g-border)",
  fontSize: 13.5,
  color: "var(--g-ink)",
  background: "var(--g-white)",
  outline: "none",
};
function primaryBtn(enabled: boolean): React.CSSProperties {
  return {
    flex: 1,
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
