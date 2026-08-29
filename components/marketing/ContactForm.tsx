"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/icons";

const TOPICS = [
  "Product support",
  "Sales & pricing",
  "Partnership enquiry",
  "Incorrect lead data",
  "Book a demo",
  "Something else",
];

export function ContactForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = firstName.trim() && /\S+@\S+\.\S+/.test(email) && message.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, company, topic, message, website: honeypot }),
      });
      if (!res.ok) {
        setError("Something went wrong on our side. Please try again, or email us directly.");
        return;
      }
      setDone(true);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div style={{ ...cardStyle, textAlign: "center", padding: "56px 32px" }}>
        <div style={{ width: 54, height: 54, borderRadius: "50%", background: "var(--g-green-mint)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <CheckIcon size={24} color="var(--g-green-text)" />
        </div>
        <h2 style={{ fontSize: 21, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 8px" }}>Message sent</h2>
        <p style={{ fontSize: 14.5, color: "var(--g-gray-500)", margin: "0 auto", maxWidth: 360, lineHeight: 1.6 }}>
          Thanks{firstName.trim() ? `, ${firstName.trim()}` : ""} — a person reads every message, and replies usually
          land within one business day at <strong style={{ color: "var(--g-ink)" }}>{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={cardStyle}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }} className="partner-form-row">
        <Field label="First name *" value={firstName} onChange={setFirstName} placeholder="First name" />
        <Field label="Last name" value={lastName} onChange={setLastName} placeholder="Last name" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <Field label="Work email *" type="email" value={email} onChange={setEmail} placeholder="you@company.com" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <Field label="Company / Agency" value={company} onChange={setCompany} placeholder="Your company or agency name" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>What can we help with?</label>
        <select value={topic} onChange={(e) => setTopic(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
          <option value="">Select an option</option>
          {TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Message *</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Tell us how we can help you…"
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
        />
      </div>

      {/* Honeypot — hidden from real users; anything typed here came from a bot, and the API
          drops those submissions silently rather than telling the bot what to fix. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      {error && (
        <p style={{ fontSize: 12.5, color: "var(--g-red-text)", background: "var(--g-red-tint)", padding: "9px 12px", borderRadius: "var(--radius-sm)", margin: "0 0 14px" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "13px 26px",
          borderRadius: "var(--radius-sm)",
          border: "none",
          background: "var(--g-green)",
          color: "#fff",
          fontSize: 14.5,
          fontWeight: 700,
          fontFamily: "inherit",
          cursor: canSubmit && !submitting ? "pointer" : "not-allowed",
          opacity: canSubmit && !submitting ? 1 : 0.55,
        }}
      >
        {submitting ? "Sending…" : "Send Message"} ↗
      </button>
    </form>
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
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--g-white)",
  border: "1px solid var(--g-border)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-card)",
  padding: 30,
  position: "relative",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12.5,
  fontWeight: 700,
  color: "var(--g-ink)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--g-border)",
  fontSize: 13.5,
  color: "var(--g-ink)",
  background: "var(--g-white)",
  outline: "none",
  fontFamily: "inherit",
};
