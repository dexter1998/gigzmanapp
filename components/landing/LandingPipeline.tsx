import Image from "next/image";
import { PinIcon, ChevronDownIcon, DownloadIcon } from "@/components/icons";

const ROWS = [
  { name: "Brewz Cafe", category: "Cafe", area: "Sector 56", status: "no_website", intent: 95, contact: "Arjun Mehta", followUp: "May 19", stage: "Qualified" },
  { name: "Urban Dental Care", category: "Clinic · Dental", area: "Sector 29", status: "no_website", intent: 88, contact: "Neha Kapoor", followUp: "May 20", stage: "Contacted" },
  { name: "Elite Fitness Studio", category: "Gym · Fitness", area: "Sohna Road", status: "weak_seo", intent: 92, contact: "Rohit Sharma", followUp: "May 19", stage: "Qualified" },
  { name: "The Learning Hub", category: "Coaching · Education", area: "Sector 45", status: "no_website", intent: 86, contact: "Pooja Verma", followUp: "May 21", stage: "New" },
];

const STATUS_LABEL: Record<string, string> = { no_website: "No Website", weak_seo: "Weak SEO" };
const STAGE_TONE: Record<string, { bg: string; text: string }> = {
  Qualified: { bg: "var(--g-green-mint)", text: "var(--g-green-text)" },
  Contacted: { bg: "var(--g-blue-tint)", text: "var(--g-blue-text)" },
  New: { bg: "var(--g-gray-100)", text: "var(--g-gray-500)" },
};

export function LandingPipeline() {
  return (
    <section style={{ position: "relative", padding: "80px 24px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <Image src="/mantis-logo-wordmark.png" alt="mantis" width={100} height={24} style={{ objectFit: "contain", height: "auto" }} />
      </div>
      <h2 style={{ fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 800, color: "var(--g-ink)", margin: "0 0 12px", letterSpacing: "-0.01em" }}>
        Find. Enrich. Export. Close.
      </h2>
      <p style={{ fontSize: 15, color: "var(--g-gray-500)", margin: "0 0 40px" }}>Turn fresh local opportunities into a managed sales pipeline.</p>

      <div style={{ maxWidth: 1080, margin: "0 auto", background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)", overflow: "hidden", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid var(--g-border)", flexWrap: "wrap" }}>
          <span style={pill}><PinIcon size={13} color="var(--g-green-text)" /> Gurugram <ChevronDownIcon size={12} color="var(--g-gray-500)" /></span>
          <span style={pillOutline}>All Categories <ChevronDownIcon size={12} color="var(--g-gray-500)" /></span>
          <span style={pillOutline}>High Intent <ChevronDownIcon size={12} color="var(--g-gray-500)" /></span>
          <span style={pillOutline}>Website Status <ChevronDownIcon size={12} color="var(--g-gray-500)" /></span>
          <span style={{ ...pillOutline, marginLeft: "auto" }}><DownloadIcon size={13} /> Export CSV</span>
          <span style={{ ...pill, background: "var(--g-green)", color: "#fff" }}>+ Add to Pipeline</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr style={{ fontSize: 11, fontWeight: 700, color: "var(--g-gray-500)", textTransform: "uppercase" }}>
                {["Business", "Area", "Website Status", "Intent Score", "Contact", "Follow-up", "Stage"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const tone = STAGE_TONE[row.stage];
                return (
                  <tr key={row.name} style={{ borderBottom: "1px solid var(--g-border)" }}>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "var(--g-ink)" }}>
                      {row.name}
                      <div style={{ fontSize: 11, fontWeight: 500, color: "var(--g-gray-500)" }}>{row.category}</div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12.5, color: "var(--g-ink-soft)" }}>{row.area}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: "var(--radius-pill)", background: "var(--g-red-tint)", color: "var(--g-red-text)" }}>
                        {STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "var(--g-green-text)" }}>{row.intent}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12.5, color: "var(--g-ink-soft)" }}>{row.contact}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12.5, color: "var(--g-ink-soft)" }}>{row.followUp}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: "var(--radius-pill)", background: tone.bg, color: tone.text }}>{row.stage}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", gap: 20, padding: "12px 18px", fontSize: 12.5, fontWeight: 700, color: "var(--g-gray-500)" }}>
          <span style={{ color: "var(--g-green-text)", borderBottom: "2px solid var(--g-green)", paddingBottom: 4 }}>All Leads (248)</span>
          <span>Qualified (86)</span>
          <span>Contacted (64)</span>
          <span>Won (18)</span>
        </div>
      </div>
    </section>
  );
}

const pill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "7px 13px",
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--g-green)",
  background: "var(--g-green-mint)",
  color: "var(--g-ink)",
  fontSize: 12,
  fontWeight: 700,
};

const pillOutline: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "7px 13px",
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--g-border)",
  background: "var(--g-white)",
  color: "var(--g-ink)",
  fontSize: 12,
  fontWeight: 700,
};
