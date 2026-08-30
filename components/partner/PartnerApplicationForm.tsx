"use client";

import { useState } from "react";
import { CheckIcon, ChevronRightIcon } from "@/components/icons";
import {
  AGENCY_TYPES,
  ACTIVE_CLIENT_RANGES,
  CLIENT_INTROS,
  EMPTY_PARTNER_FORM,
  PARTNERSHIP_APPROACHES,
  PROJECTS_PER_MONTH,
  STEPS,
  TEAM_SIZES,
  TICKET_SIZES,
  canAdvance,
  servicesFor,
  type AgencyType,
  type PartnerFormState,
} from "./partner-form-config";

/**
 * One stepper, two homes: the public /partner hero and the in-dashboard "Partner with us" modal.
 * `variant` only changes chrome (a modal is already inside a card and has its own scroll body) —
 * the questions, validation and submitted payload are identical, so an application never depends
 * on which surface it came in through.
 */
export function PartnerApplicationForm({
  variant = "page",
  onDone,
}: {
  variant?: "page" | "modal";
  onDone?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState<PartnerFormState>(EMPTY_PARTNER_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isModal = variant === "modal";
  const set = <K extends keyof PartnerFormState>(key: K, value: PartnerFormState[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  function toggle(key: "services" | "partnershipApproach", value: string) {
    setF((prev) => {
      const list = prev[key];
      return { ...prev, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/partner-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, source: isModal ? "dashboard" : "partner_page" }),
      });
      if (!res.ok) {
        setError("Something went wrong on our side. Please try again, or email partners@mantisai.in.");
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
      <div style={{ ...cardStyle(isModal), textAlign: "center", padding: isModal ? "24px 8px" : "48px 32px" }}>
        <div style={successRing}>
          <CheckIcon size={24} color="var(--g-green-text)" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 8px" }}>Application received</h2>
        <p style={{ fontSize: 14, color: "var(--g-gray-500)", margin: "0 auto 24px", maxWidth: 380, lineHeight: 1.6 }}>
          Thanks — we review every application ourselves. Expect to hear from our partnerships team within two
          business days at <strong style={{ color: "var(--g-ink)" }}>{f.email}</strong>.
        </p>
        {onDone && (
          <button type="button" onClick={onDone} style={primaryBtn}>
            Done
          </button>
        )}
      </div>
    );
  }

  const services = servicesFor(f.agencyType);
  const isLast = step === STEPS.length - 1;
  const ready = canAdvance(step, f);

  return (
    <div style={cardStyle(isModal)}>
      {!isModal && (
        <>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 4px" }}>Apply for Partner Access</h2>
          <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 18px" }}>
            Five short steps. Free portal access for approved partners.
          </p>
        </>
      )}

      {/* Progress — a labelled current step rather than bare dots, so someone mid-form knows both
          where they are and what's left before they abandon it. */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", gap: 5, marginBottom: 9 }}>
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i <= step ? "var(--g-green)" : "var(--g-border)",
                transition: "background 160ms ease",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-green-text)" }}>{STEPS[step].label}</span>
          <span style={{ fontSize: 11.5, color: "var(--g-gray-500)", fontVariantNumeric: "tabular-nums" }}>
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
      </div>

      <div style={{ maxHeight: isModal ? "52vh" : undefined, overflowY: isModal ? "auto" : undefined, paddingRight: isModal ? 4 : 0 }}>
        {step === 0 && (
          <>
            <p style={helpText}>
              This is the one answer that decides who reviews your application — pick what your agency mainly does.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {AGENCY_TYPES.map((t) => {
                const active = f.agencyType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      // Switching type changes which service chips exist, so previously-picked
                      // ones can no longer be valid — clear them rather than submit orphans.
                      setF((prev) => ({ ...prev, agencyType: t.value as AgencyType, services: [] }));
                    }}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 11,
                      textAlign: "left",
                      padding: "14px 16px",
                      borderRadius: "var(--radius-sm)",
                      border: active ? "1px solid var(--g-green)" : "1px solid var(--g-border)",
                      background: active ? "var(--g-green-mint)" : "var(--g-white)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <span
                      style={{
                        width: 17,
                        height: 17,
                        borderRadius: "50%",
                        border: active ? "5px solid var(--g-green)" : "1.5px solid var(--g-gray-300)",
                        flexShrink: 0,
                        marginTop: 2,
                        background: "var(--g-white)",
                      }}
                    />
                    <span>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--g-ink)" }}>{t.label}</span>
                      <span style={{ display: "block", fontSize: 12.5, color: "var(--g-gray-500)", marginTop: 2 }}>{t.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <Row2>
              <Field label="Full name *" value={f.fullName} onChange={(v) => set("fullName", v)} placeholder="Your name" />
              <Field label="Your role" value={f.designation} onChange={(v) => set("designation", v)} placeholder="Founder, BD Head…" />
            </Row2>
            <Row2>
              <Field label="Work email *" type="email" value={f.email} onChange={(v) => set("email", v)} placeholder="you@agency.com" />
              <Field label="Phone / WhatsApp" value={f.phone} onChange={(v) => set("phone", v)} placeholder="+91 98765 43210" />
            </Row2>
          </>
        )}

        {step === 2 && (
          <>
            <Row2>
              <Field label="Agency name *" value={f.agencyName} onChange={(v) => set("agencyName", v)} placeholder="Your agency" />
              <Field label="Website" value={f.website} onChange={(v) => set("website", v)} placeholder="https://agency.com" />
            </Row2>
            <Row2>
              <Field label="Primary city" value={f.city} onChange={(v) => set("city", v)} placeholder="Gurugram" />
              <Field label="Country" value={f.country} onChange={(v) => set("country", v)} />
            </Row2>
            <Row2>
              <Field label="Year established" value={f.yearEstablished} onChange={(v) => set("yearEstablished", v)} placeholder="2021" />
              <Select label="Team size" value={f.teamSize} onChange={(v) => set("teamSize", v)} options={TEAM_SIZES} />
            </Row2>
          </>
        )}

        {step === 3 && (
          <>
            <label style={labelStyle}>Services you deliver *</label>
            <ChipGroup options={services} selected={f.services} onToggle={(v) => toggle("services", v)} />
            {f.services.includes("Other") && (
              <input
                value={f.otherService}
                onChange={(e) => set("otherService", e.target.value)}
                placeholder="Tell us what else you do"
                style={{ ...inputStyle, marginTop: 9 }}
              />
            )}
            <div style={{ height: 14 }} />
            <Row2>
              <Select
                label="Projects delivered / month *"
                value={f.projectsClosedPerMonth}
                onChange={(v) => set("projectsClosedPerMonth", v)}
                options={PROJECTS_PER_MONTH}
              />
              <Select
                label="Average ticket size *"
                value={f.avgTicketSize}
                onChange={(v) => set("avgTicketSize", v)}
                options={TICKET_SIZES}
              />
            </Row2>
            <Select
              label="Active clients right now"
              value={f.activeClients}
              onChange={(v) => set("activeClients", v)}
              options={ACTIVE_CLIENT_RANGES}
            />
          </>
        )}

        {step === 4 && (
          <>
            <label style={labelStyle}>How would you work with Mantis?</label>
            <ChipGroup
              options={PARTNERSHIP_APPROACHES}
              selected={f.partnershipApproach}
              onToggle={(v) => toggle("partnershipApproach", v)}
            />
            <div style={{ height: 14 }} />
            <Select
              label="Clients you could introduce / month"
              value={f.estimatedClientIntroductions}
              onChange={(v) => set("estimatedClientIntroductions", v)}
              options={CLIENT_INTROS}
            />
            <label style={{ ...labelStyle, marginTop: 12 }}>Anything else we should know?</label>
            <textarea
              value={f.partnershipReason}
              onChange={(e) => set("partnershipReason", e.target.value)}
              rows={4}
              placeholder="What you're hoping to get out of a Mantis partnership."
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
            />
          </>
        )}
      </div>

      {error && (
        <p style={{ fontSize: 12.5, color: "var(--g-red-text)", background: "var(--g-red-tint)", padding: "9px 12px", borderRadius: "var(--radius-sm)", margin: "14px 0 0" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20 }}>
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} style={ghostBtn}>
            Back
          </button>
        )}
        <button
          type="button"
          disabled={!ready || submitting}
          onClick={() => (isLast ? handleSubmit() : setStep((s) => s + 1))}
          style={{ ...primaryBtn, flex: 1, opacity: ready && !submitting ? 1 : 0.5, cursor: ready && !submitting ? "pointer" : "not-allowed" }}
        >
          {submitting ? "Submitting…" : isLast ? "Submit application" : "Continue"}
          {!submitting && !isLast && <ChevronRightIcon size={14} color="#fff" />}
        </button>
      </div>
    </div>
  );
}

/* ---------- shared field primitives ---------- */

function Row2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }} className="partner-form-row">{children}</div>;
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

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
        <option value="">Select</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function ChipGroup({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            style={{
              padding: "7px 13px",
              borderRadius: "var(--radius-pill)",
              border: active ? "1px solid var(--g-green)" : "1px solid var(--g-border)",
              background: active ? "var(--g-green)" : "var(--g-white)",
              color: active ? "#fff" : "var(--g-ink)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- styles ---------- */

const cardStyle = (isModal: boolean): React.CSSProperties =>
  isModal
    ? { background: "transparent" }
    : {
        background: "var(--g-white)",
        border: "1px solid var(--g-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-card)",
        padding: 28,
      };

const helpText: React.CSSProperties = { fontSize: 12.5, color: "var(--g-gray-500)", margin: "0 0 14px", lineHeight: 1.55 };

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11.5,
  fontWeight: 700,
  color: "var(--g-gray-500)",
  marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--g-border)",
  fontSize: 13.5,
  color: "var(--g-ink)",
  background: "var(--g-white)",
  outline: "none",
  fontFamily: "inherit",
};

const primaryBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "13px 22px",
  borderRadius: "var(--radius-sm)",
  border: "none",
  background: "var(--g-green-darker)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const ghostBtn: React.CSSProperties = {
  padding: "13px 20px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--g-border)",
  background: "var(--g-white)",
  color: "var(--g-ink)",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const successRing: React.CSSProperties = {
  width: 54,
  height: 54,
  borderRadius: "50%",
  background: "var(--g-green-mint)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 18px",
};
