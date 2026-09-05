import { BuildingIcon, PinIcon, MailIcon, PhoneIcon, ShieldCheckIcon, PartnerIcon } from "@/components/icons";

/** "Know the role. Reach the right person." — matches 05-job-recruiter-enrichment.png. */
export function JobsIntelligence() {
  return (
    <section style={{ padding: "96px 24px", background: "var(--g-cream)", textAlign: "center" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: "var(--radius-pill)", background: "var(--g-white)", border: "1px solid var(--g-border)", fontSize: 11.5, fontWeight: 800, color: "var(--g-green-text)", marginBottom: 18 }}>
          JOB INTELLIGENCE
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4.5vw, 44px)", fontWeight: 600, color: "var(--g-ink)", margin: "0 0 12px" }}>
          Know the role. Reach the <span style={{ color: "var(--g-green)" }}>right person.</span>
        </h2>
        <p style={{ fontSize: 15.5, color: "var(--g-gray-500)", margin: "0 auto 44px", maxWidth: 560 }}>
          Understand the company, team, skills and salary signals — then connect with the recruiter who owns the role.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 0.9fr) minmax(280px, 1.4fr) minmax(220px, 1fr)", gap: 16, textAlign: "left" }} className="jobs-intel-grid">
          {/* Company card */}
          <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", padding: 20 }}>
            <div style={{ width: 42, height: 42, borderRadius: 9, background: "var(--g-ink)", color: "#fff", display: "grid", placeItems: "center", fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Z</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--g-ink)" }}>ZyloTech</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--g-gray-500)", marginBottom: 10 }}>
              <PinIcon size={12} /> Gurugram, Haryana
            </div>
            <Fact label="Industry" value="SaaS / B2B" />
            <Fact label="Team size" value="251–500" />
            <Fact label="Funding" value="Series C" />
            <Fact label="Rating" value="4.2 / 5" last />
          </div>

          {/* Role card */}
          <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: "#a15c00", background: "#fdf1d8", padding: "3px 9px", borderRadius: "var(--radius-pill)" }}>Hot</span>
              <span style={{ fontSize: 11.5, color: "var(--g-gray-500)" }}>Posted 2h ago</span>
              <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 800, color: "var(--g-green-text)", background: "var(--g-green-mint)", padding: "3px 9px", borderRadius: "var(--radius-pill)" }}>92% Match</span>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 10px" }}>Product Designer</h3>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--g-gray-500)", margin: "0 0 14px" }}>
              Design intuitive experiences across ZyloTech&apos;s products. Collaborate with product,
              engineering and research teams.
            </p>
            <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
              <Fact label="Experience" value="3–6 years" inline />
              <Fact label="Job type" value="Full-time" inline />
              <Fact label="Salary" value="₹14L – ₹22L (est.)" inline />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["User Research", "Figma", "Design Systems"].map((s) => (
                <span key={s} style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: "var(--radius-pill)", background: "var(--g-cream)", color: "var(--g-ink-soft, var(--g-gray-500))", border: "1px solid var(--g-border)" }}>{s}</span>
              ))}
            </div>
          </div>

          {/* Hiring team card */}
          <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--g-ink)" }}>Hiring team</span>
              <ShieldCheckIcon size={15} color="var(--g-green-text)" />
            </div>
            {[
              { name: "Anjali Sharma", role: "Talent Partner" },
              { name: "Karan Mehta", role: "Design Manager" },
            ].map((p) => (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--g-border)" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--g-green-mint)", color: "var(--g-green-text)", display: "grid", placeItems: "center", fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
                  {p.name.charAt(0)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-ink)" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "var(--g-gray-500)" }}>{p.role}</div>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <IconPill icon={MailIcon} label="Email" />
              <IconPill icon={PhoneIcon} label="Call" />
              <IconPill icon={PartnerIcon} label="LinkedIn" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Fact({ label, value, last, inline }: { label: string; value: string; last?: boolean; inline?: boolean }) {
  if (inline) {
    return (
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--g-gray-500)" }}>{label}</div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-ink)", marginTop: 2 }}>{value}</div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: last ? "none" : "1px solid var(--g-border)" }}>
      <span style={{ fontSize: 12, color: "var(--g-gray-500)" }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-ink)" }}>{value}</span>
    </div>
  );
}

function IconPill({ icon: Icon, label }: { icon: typeof BuildingIcon; label: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px", border: "1px solid var(--g-border)", borderRadius: "var(--radius-sm)" }}>
      <Icon size={14} color="var(--g-gray-500)" />
      <span style={{ fontSize: 10, color: "var(--g-gray-500)" }}>{label}</span>
    </div>
  );
}
