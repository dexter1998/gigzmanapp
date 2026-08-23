"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = [
  { value: "ceo_founder", label: "CEO / Founder" },
  { value: "agency_owner", label: "Agency Owner" },
  { value: "freelancer", label: "Freelancer" },
  { value: "business_owner", label: "Business Owner" },
  { value: "growth_manager", label: "Growth Manager" },
  { value: "marketing_manager", label: "Marketing Manager" },
  { value: "sales_manager", label: "Sales Manager" },
  { value: "other", label: "Other" },
];

const SERVICES = ["Web Development", "Marketing", "SEO", "Design", "Lead Generation", "Consulting", "Other"];
const TEAM_SIZES = ["1–5", "6–10", "11–25", "26–50", "51–100", "100+"];

type BusinessType = "agency" | "freelancer";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [role, setRole] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);

  const [agencyName, setAgencyName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [designation, setDesignation] = useState("");
  const [teamSize, setTeamSize] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [primaryService, setPrimaryService] = useState(SERVICES[0]);
  const [customService, setCustomService] = useState("");
  const [activeClients, setActiveClients] = useState("");

  const totalSteps = 3;

  const step1Valid = role && (role !== "other" || customRole.trim());
  const step3Valid =
    businessType === "agency"
      ? agencyName.trim() && workEmail.trim() && designation.trim()
      : businessName.trim() && workEmail.trim() && (primaryService !== "Other" || customService.trim());

  async function handleFinish() {
    setSubmitting(true);
    try {
      await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          customRole: role === "other" ? customRole : undefined,
          businessType,
          agency:
            businessType === "agency"
              ? { agencyName, workEmail, website, designation, teamSize }
              : undefined,
          freelancer:
            businessType === "freelancer"
              ? { businessName, workEmail, website, primaryService, customService, activeClients }
              : undefined,
        }),
      });
      setStep(4);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--g-cream)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        {step <= totalSteps && (
          <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: i < step ? "var(--g-green)" : "var(--g-border)",
                }}
              />
            ))}
          </div>
        )}

        <div style={{ background: "var(--g-white)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)", padding: 32 }}>
          {step === 1 && (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 6px" }}>Who are you?</h1>
              <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 24px" }}>
                Tell us a little about your role so we can personalize gigzman for you.
              </p>

              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={selectStyle}
              >
                <option value="">Select your role</option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>

              {role === "other" && (
                <input
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="What best describes you?"
                  style={{ ...selectStyle, marginTop: 12 }}
                />
              )}

              <button type="button" disabled={!step1Valid} onClick={() => setStep(2)} style={primaryBtn(!!step1Valid)}>
                Continue →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 6px" }}>How do you work?</h1>
              <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 24px" }}>
                This helps us shape your workspace around how you actually operate.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                <SelectCard
                  title="Agency"
                  desc="For teams or agencies working with multiple clients."
                  selected={businessType === "agency"}
                  onClick={() => setBusinessType("agency")}
                />
                <SelectCard
                  title="Freelancer"
                  desc="For independent professionals working with clients."
                  selected={businessType === "freelancer"}
                  onClick={() => setBusinessType("freelancer")}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setStep(1)} style={secondaryBtn}>
                  Back
                </button>
                <button type="button" disabled={!businessType} onClick={() => setStep(3)} style={primaryBtn(!!businessType)}>
                  Continue →
                </button>
              </div>
            </>
          )}

          {step === 3 && businessType === "agency" && (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 6px" }}>Tell us about your agency</h1>
              <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 20px" }}>
                This helps us personalize your workspace and future client workflows.
              </p>

              <Field label="Agency Name" value={agencyName} onChange={setAgencyName} required />
              <Field label="Work Email" value={workEmail} onChange={setWorkEmail} required type="email" />
              <Field label="Website / Agency Domain" value={website} onChange={setWebsite} />
              <Field label="Your Designation" value={designation} onChange={setDesignation} required />

              <label style={labelStyle}>Team size (optional)</label>
              <select value={teamSize} onChange={(e) => setTeamSize(e.target.value)} style={selectStyle}>
                <option value="">How many people are on your team?</option>
                {TEAM_SIZES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setStep(2)} style={secondaryBtn}>
                  Back
                </button>
                <button type="button" disabled={!step3Valid || submitting} onClick={handleFinish} style={primaryBtn(!!step3Valid && !submitting)}>
                  {submitting ? "Saving…" : "Continue →"}
                </button>
              </div>
            </>
          )}

          {step === 3 && businessType === "freelancer" && (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 6px" }}>Tell us about your work</h1>
              <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 20px" }}>
                A quick profile so gigzman fits how you actually work.
              </p>

              <Field label="Professional / Business Name" value={businessName} onChange={setBusinessName} required />
              <Field label="Work Email" value={workEmail} onChange={setWorkEmail} required type="email" />
              <Field label="Website or Portfolio" value={website} onChange={setWebsite} />

              <label style={labelStyle}>Primary Service</label>
              <select value={primaryService} onChange={(e) => setPrimaryService(e.target.value)} style={selectStyle}>
                {SERVICES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {primaryService === "Other" && (
                <input
                  value={customService}
                  onChange={(e) => setCustomService(e.target.value)}
                  placeholder="Describe your service"
                  style={{ ...selectStyle, marginTop: 8 }}
                />
              )}

              <label style={labelStyle}>Active clients (optional)</label>
              <input value={activeClients} onChange={(e) => setActiveClients(e.target.value)} style={selectStyle} placeholder="e.g. 5" />

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setStep(2)} style={secondaryBtn}>
                  Back
                </button>
                <button type="button" disabled={!step3Valid || submitting} onClick={handleFinish} style={primaryBtn(!!step3Valid && !submitting)}>
                  {submitting ? "Saving…" : "Continue →"}
                </button>
              </div>
            </>
          )}

          {step === 4 && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "var(--g-green-mint)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  fontSize: 22,
                }}
              >
                ✓
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 8px" }}>You&apos;re all set.</h1>
              <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 24px" }}>Your gigzman workspace is ready.</p>
              <button type="button" onClick={() => router.push("/home")} style={primaryBtn(true)}>
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectCard({ title, desc, selected, onClick }: { title: string; desc: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: 16,
        borderRadius: "var(--radius-md)",
        border: selected ? "2px solid var(--g-green)" : "1px solid var(--g-border)",
        background: selected ? "var(--g-green-mint)" : "var(--g-white)",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--g-ink)", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11.5, color: "var(--g-gray-500)", lineHeight: 1.4 }}>{desc}</div>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: "var(--g-amber)" }}> *</span>}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle} />
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "var(--g-gray-500)", marginBottom: 6 };

const selectStyle: React.CSSProperties = {
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
    marginTop: 20,
    padding: "12px 0",
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
  marginTop: 20,
  padding: "12px 20px",
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--g-border)",
  background: "var(--g-white)",
  color: "var(--g-ink)",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};
