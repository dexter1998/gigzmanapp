"use client";

import { useState } from "react";
import { XIcon, CheckIcon } from "./icons";

const SERVICES = [
  "Website Development",
  "Web Design",
  "SEO",
  "Performance Marketing",
  "Social Media Marketing",
  "Branding",
  "Lead Generation",
  "Content Marketing",
  "AI Automation",
  "Consulting",
  "Other",
];

const TEAM_SIZES = ["Solo", "2–5", "6–10", "11–25", "26–50", "51–100", "100+"];
const PROJECTS_PER_MONTH = ["1–5", "6–10", "11–25", "26–50", "50+"];
const REVENUE_RANGES = ["Under ₹1 lakh", "₹1–5 lakh", "₹5–10 lakh", "₹10–25 lakh", "₹25–50 lakh", "₹50 lakh+", "Prefer not to say"];
const APPROACHES = ["Offer it as part of our services", "Resell Mantis AI", "Use it internally for client delivery", "Refer clients", "Not sure yet"];
const CLIENT_INTROS = ["1–5", "6–10", "11–25", "26–50", "50+"];

export function PartnerApplicationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  const [services, setServices] = useState<string[]>([]);
  const [otherService, setOtherService] = useState("");
  const [yearEstablished, setYearEstablished] = useState("");
  const [teamSize, setTeamSize] = useState("");

  const [projectsClosedPerMonth, setProjectsClosedPerMonth] = useState("");
  const [monthlyRevenueRange, setMonthlyRevenueRange] = useState("");
  const [activeClients, setActiveClients] = useState("");

  const [partnershipReason, setPartnershipReason] = useState("");
  const [partnershipApproach, setPartnershipApproach] = useState<string[]>([]);
  const [estimatedClientIntroductions, setEstimatedClientIntroductions] = useState("");

  if (!open) return null;

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await fetch("/api/partner-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName, email, phone, agencyName, website, linkedin, country, city,
          services, otherService, yearEstablished, teamSize,
          projectsClosedPerMonth, monthlyRevenueRange, activeClients,
          partnershipReason, partnershipApproach, estimatedClientIntroductions,
        }),
      });
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = fullName.trim() && email.trim();

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} style={closeBtnStyle}>
          <XIcon />
        </button>

        {done ? (
          <div style={{ textAlign: "center", padding: "24px 8px" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--g-green-mint)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CheckIcon size={22} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 8px" }}>Application received</h2>
            <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 24px" }}>
              Thanks for your interest in partnering with Mantis AI. We&apos;ll review your application and get in touch with you.
            </p>
            <button type="button" onClick={onClose} style={primaryBtnStyle}>
              Done
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 4px" }}>Partner with us</h2>
            <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", margin: "0 0 20px" }}>
              Bring Mantis AI to your clients. Qualified agency partners can get free portal access.
            </p>

            <div style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: 4 }}>
              <SectionTitle>Contact details</SectionTitle>
              <Row2>
                <Field label="Full name *" value={fullName} onChange={setFullName} />
                <Field label="Work email *" value={email} onChange={setEmail} type="email" />
              </Row2>
              <Row2>
                <Field label="Phone" value={phone} onChange={setPhone} />
                <Field label="Agency name" value={agencyName} onChange={setAgencyName} />
              </Row2>
              <Row2>
                <Field label="Website" value={website} onChange={setWebsite} />
                <Field label="LinkedIn (optional)" value={linkedin} onChange={setLinkedin} />
              </Row2>
              <Row2>
                <Field label="Country" value={country} onChange={setCountry} />
                <Field label="City" value={city} onChange={setCity} />
              </Row2>

              <SectionTitle>Agency profile</SectionTitle>
              <label style={labelStyle}>Services offered</label>
              <ChipGroup options={SERVICES} selected={services} onToggle={(v) => toggle(services, setServices, v)} />
              {services.includes("Other") && (
                <input value={otherService} onChange={(e) => setOtherService(e.target.value)} placeholder="Describe your services" style={{ ...inputStyle, marginTop: 8 }} />
              )}
              <Row2>
                <Field label="Year established" value={yearEstablished} onChange={setYearEstablished} />
                <div>
                  <label style={labelStyle}>Team size</label>
                  <select value={teamSize} onChange={(e) => setTeamSize(e.target.value)} style={inputStyle}>
                    <option value="">Select</option>
                    {TEAM_SIZES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </Row2>

              <SectionTitle>Business metrics</SectionTitle>
              <Row2>
                <div>
                  <label style={labelStyle}>Projects closed / month</label>
                  <select value={projectsClosedPerMonth} onChange={(e) => setProjectsClosedPerMonth(e.target.value)} style={inputStyle}>
                    <option value="">Select</option>
                    {PROJECTS_PER_MONTH.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Monthly revenue</label>
                  <select value={monthlyRevenueRange} onChange={(e) => setMonthlyRevenueRange(e.target.value)} style={inputStyle}>
                    <option value="">Select</option>
                    {REVENUE_RANGES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </Row2>
              <Field label="Active clients (optional)" value={activeClients} onChange={setActiveClients} />

              <SectionTitle>Partnership fit</SectionTitle>
              <label style={labelStyle}>Why do you want to partner with Mantis AI?</label>
              <textarea value={partnershipReason} onChange={(e) => setPartnershipReason(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
              <label style={{ ...labelStyle, marginTop: 12 }}>How would you introduce Mantis to clients?</label>
              <ChipGroup options={APPROACHES} selected={partnershipApproach} onToggle={(v) => toggle(partnershipApproach, setPartnershipApproach, v)} />
              <label style={{ ...labelStyle, marginTop: 12 }}>Estimated clients you could introduce / month</label>
              <select value={estimatedClientIntroductions} onChange={(e) => setEstimatedClientIntroductions(e.target.value)} style={inputStyle}>
                <option value="">Select</option>
                {CLIENT_INTROS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <button type="button" disabled={!canSubmit || submitting} onClick={handleSubmit} style={{ ...primaryBtnStyle, width: "100%", marginTop: 20, opacity: canSubmit ? 1 : 0.5 }}>
              {submitting ? "Submitting…" : "Submit application"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--g-green-text)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "18px 0 10px" }}>
      {children}
    </div>
  );
}

function Row2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>{children}</div>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
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
              padding: "6px 12px",
              borderRadius: "var(--radius-pill)",
              border: active ? "none" : "1px solid var(--g-border)",
              background: active ? "var(--g-green)" : "var(--g-white)",
              color: active ? "#fff" : "var(--g-ink)",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(20,32,51,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  padding: 20,
};

const modalStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--g-white)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-card)",
  padding: 28,
  position: "relative",
};

const closeBtnStyle: React.CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
  border: "none",
  background: "none",
  cursor: "pointer",
  display: "flex",
};

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--g-gray-500)", marginBottom: 5 };

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--g-border)",
  fontSize: 13,
  color: "var(--g-ink)",
  background: "var(--g-white)",
  outline: "none",
  fontFamily: "inherit",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "12px 0",
  borderRadius: "var(--radius-pill)",
  border: "none",
  background: "var(--g-green)",
  color: "#fff",
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
};
