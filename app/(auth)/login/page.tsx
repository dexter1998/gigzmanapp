"use client";

import { useState } from "react";
import Image from "next/image";
import { googleSignIn, emailPasswordSignIn } from "./actions";
import { AuthCarousel } from "@/components/auth/Carousel";

type Tab = "signin" | "signup";

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("signin");
  const isSignup = tab === "signup";

  // Email + password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailStep, setEmailStep] = useState<"form" | "verify">("form");
  const [code, setCode] = useState("");
  const [resent, setResent] = useState(false);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function switchTab(next: Tab) {
    setTab(next);
    setError("");
    setEmailStep("form");
  }

  async function submitEmailSignup() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create that account");
        return;
      }
      setEmailStep("verify");
    } finally {
      setBusy(false);
    }
  }

  async function submitEmailSignin() {
    setError("");
    setBusy(true);
    try {
      const result = await emailPasswordSignIn(email, password);
      if (result) setError(result);
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmailCode() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Incorrect code");
        return;
      }
      const result = await emailPasswordSignIn(email, password);
      if (result) setError(result);
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setError("");
    setResent(false);
    await fetch("/api/auth/resend-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setResent(true);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--g-cream)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1350,
          minHeight: 930,
          background: "var(--g-cream)",
          borderRadius: 28,
          boxShadow: "var(--shadow-card)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          overflow: "hidden",
        }}
      >
        {/* Left — carousel, edge-to-edge (no inset/padding so it fully fills the panel; the
            outer card's own border-radius + overflow:hidden clips its left corners for us). */}
        <div style={{ position: "relative" }}>
          <AuthCarousel />
        </div>

        {/* Right — auth form. Email/password is the primary path (always visible, no mode
            toggle needed to reach it) with Google underneath as the alternative — both
            reachable in one glance instead of switching between them. */}
        <div style={{ padding: "48px 56px", display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: 28 }}>
            <Image src="/mantis-logo-wordmark.png" alt="mantis" width={150} height={36} style={{ objectFit: "contain", height: "auto" }} priority />
          </div>

          <div
            style={{
              display: "inline-flex",
              background: "var(--g-gray-100)",
              borderRadius: "var(--radius-pill)",
              padding: 4,
              width: "fit-content",
              marginBottom: 20,
            }}
          >
            <PillButton active={!isSignup} onClick={() => switchTab("signin")}>
              Sign in
            </PillButton>
            <PillButton active={isSignup} onClick={() => switchTab("signup")}>
              Create account
            </PillButton>
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 6px" }}>
            {isSignup ? "Create account" : "Sign in"}
          </h1>
          <div style={{ width: 32, height: 3, background: "var(--g-green)", borderRadius: 2, marginBottom: 26 }} />

          {(!isSignup || emailStep === "form") && (
            <div>
              <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@company.com" />
              <Field
                label="Password"
                value={password}
                onChange={setPassword}
                type="password"
                placeholder={isSignup ? "At least 8 characters" : "••••••••"}
              />
              {error && <ErrorText>{error}</ErrorText>}
              {isSignup ? (
                <button type="button" disabled={busy || !email || password.length < 8} onClick={submitEmailSignup} style={primaryBtn}>
                  {busy ? "Sending code…" : "Create account"}
                </button>
              ) : (
                <button type="button" disabled={busy || !email || !password} onClick={submitEmailSignin} style={primaryBtn}>
                  {busy ? "Signing in…" : "Sign in"}
                </button>
              )}

              <Divider />

              <form action={googleSignIn}>
                <button type="submit" style={googleBtn}>
                  <GoogleGlyph />
                  {isSignup ? "Sign up with Google" : "Continue with Google"}
                </button>
              </form>
            </div>
          )}

          {isSignup && emailStep === "verify" && (
            <div>
              <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginBottom: 16 }}>
                We sent a 6-digit code to <strong style={{ color: "var(--g-ink)" }}>{email}</strong>.
              </p>
              <Field label="Verification code" value={code} onChange={setCode} placeholder="123456" />
              {error && <ErrorText>{error}</ErrorText>}
              <button type="button" disabled={busy || code.trim().length < 6} onClick={verifyEmailCode} style={primaryBtn}>
                {busy ? "Verifying…" : "Verify & continue"}
              </button>
              <button type="button" onClick={resendCode} style={linkBtn}>
                {resent ? "Code resent" : "Resend code"}
              </button>
            </div>
          )}

          <p style={{ fontSize: 11, color: "var(--g-gray-500)", marginTop: "auto", paddingTop: 32 }}>
            By continuing you agree to our <u>Terms</u> and <u>Privacy Policy</u>.
          </p>
        </div>
      </div>
    </div>
  );
}

function PillButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? "var(--g-white)" : "transparent",
        border: "none",
        borderRadius: "var(--radius-pill)",
        padding: "8px 20px",
        fontSize: 13,
        fontWeight: 700,
        color: active ? "var(--g-ink)" : "var(--g-gray-500)",
        boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
      <div style={{ flex: 1, height: 1, background: "var(--g-border)" }} />
      <span style={{ fontSize: 11, color: "var(--g-gray-500)", fontWeight: 700 }}>OR</span>
      <div style={{ flex: 1, height: 1, background: "var(--g-border)" }} />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--g-gray-500)", marginBottom: 6 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "11px 14px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--g-border)",
          fontSize: 13.5,
          color: "var(--g-ink)",
          background: "var(--g-white)",
          outline: "none",
        }}
      />
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, color: "#b45309", margin: "0 0 12px" }}>{children}</p>;
}

const primaryBtn: React.CSSProperties = {
  width: "100%",
  padding: "13px 0",
  borderRadius: "var(--radius-sm)",
  border: "none",
  background: "var(--g-green-dark)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 4px 14px rgba(58,166,92,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const googleBtn: React.CSSProperties = {
  width: "100%",
  padding: "13px 0",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--g-border)",
  background: "var(--g-white)",
  color: "var(--g-ink)",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const linkBtn: React.CSSProperties = {
  width: "100%",
  padding: "10px 0",
  border: "none",
  background: "none",
  color: "var(--g-gray-500)",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 6,
};

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.7 26.9 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.6l6.6 5.6C41.5 36.2 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"/>
    </svg>
  );
}
