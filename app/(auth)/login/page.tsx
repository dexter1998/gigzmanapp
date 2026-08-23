"use client";

import { useState } from "react";
import { googleSignIn } from "./actions";

export default function LoginPage() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const isSignup = tab === "signup";

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
          maxWidth: 900,
          minHeight: 560,
          background: "var(--g-cream)",
          borderRadius: 28,
          boxShadow: "var(--shadow-card)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          overflow: "hidden",
        }}
      >
        {/* Left — auth form */}
        <div style={{ padding: "40px 48px", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--g-green)", marginBottom: 32 }}>
            gigzman
          </div>

          <div
            style={{
              display: "inline-flex",
              background: "var(--g-gray-100)",
              borderRadius: "var(--radius-pill)",
              padding: 4,
              width: "fit-content",
              marginBottom: 24,
            }}
          >
            <TabButton active={!isSignup} onClick={() => setTab("signin")}>
              Sign in
            </TabButton>
            <TabButton active={isSignup} onClick={() => setTab("signup")}>
              Create account
            </TabButton>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 6px" }}>
            {isSignup ? "Create account" : "Sign in"}
          </h1>
          <div style={{ width: 32, height: 3, background: "var(--g-green)", borderRadius: 2, marginBottom: 28 }} />

          <form action={googleSignIn}>
            <p style={{ fontSize: 12, color: "var(--g-gray-500)", marginBottom: 20 }}>
              gigzman uses Google Sign-In only — no separate password to manage. New here?
              Continuing with Google creates your account automatically.
            </p>

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "13px 0",
                borderRadius: "var(--radius-pill)",
                border: "none",
                background: "var(--g-green)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(58,166,92,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <GoogleGlyph />
              {isSignup ? "Sign up with Google" : "Continue with Google"}
            </button>
          </form>

          <p style={{ fontSize: 11, color: "var(--g-gray-500)", marginTop: "auto", paddingTop: 32 }}>
            By continuing you agree to our <u>Terms</u> and <u>Privacy Policy</u>.
          </p>
        </div>

        {/* Right — welcome panel */}
        <div
          style={{
            background: "linear-gradient(160deg, var(--g-green-dark), var(--g-green-darker))",
            padding: "40px 44px",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h2 style={{ fontSize: 34, fontWeight: 800, margin: 0, lineHeight: 1.1 }}>
            {isSignup ? (
              <>
                Start
                <br />
                <span className="g-accent-italic">finding.</span>
              </>
            ) : (
              <>
                Welcome
                <br />
                <span className="g-accent-italic">back.</span>
              </>
            )}
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 12, maxWidth: 260 }}>
            {isSignup
              ? "Businesses without a website, found for you automatically."
              : "Your leads are exactly where you left them."}
          </p>

          <div
            style={{
              marginTop: "auto",
              alignSelf: "center",
              background: "#fff",
              borderRadius: 20,
              width: 200,
              padding: 16,
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--g-gray-500)", marginBottom: 10 }}>9:41</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--g-ink)" }}>No website found</div>
            <div style={{ fontSize: 11, color: "var(--g-gray-500)", marginBottom: 10 }}>Oak Street Barbers</div>
            {["Discovering leads", "Checking websites"].map((step, i) => (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: i === 0 ? "var(--g-green)" : "var(--g-gray-100)",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 11.5, color: "var(--g-ink)" }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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
