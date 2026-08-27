import Image from "next/image";
import { PinIcon, ChevronDownIcon, DownloadIcon } from "@/components/icons";
import { OrigamiDecoration } from "./OrigamiDecoration";

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
    <section style={{ position: "relative", padding: "96px 24px", textAlign: "center", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <Image src="/mantis-logo-wordmark.png" alt="mantis" width={110} height={26} style={{ objectFit: "contain", height: "auto" }} />
      </div>
      <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, color: "var(--g-ink)", margin: "0 0 14px", letterSpacing: "-0.01em" }}>
        Find. Enrich. Export. Close.
      </h2>
      <p style={{ fontSize: 16.5, color: "var(--g-gray-500)", margin: "0 0 48px" }}>Turn fresh local opportunities into a managed sales pipeline.</p>

      <div style={{ maxWidth: 1240, margin: "0 auto", position: "relative", background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)", overflow: "hidden", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 22px", borderBottom: "1px solid var(--g-border)", flexWrap: "wrap" }}>
          <span style={pill}><PinIcon size={14} color="var(--g-green-text)" /> Gurugram <ChevronDownIcon size={13} color="var(--g-gray-500)" /></span>
          <span style={pillOutline}>All Categories <ChevronDownIcon size={13} color="var(--g-gray-500)" /></span>
          <span style={pillOutline}>High Intent <ChevronDownIcon size={13} color="var(--g-gray-500)" /></span>
          <span style={pillOutline}>Website Status <ChevronDownIcon size={13} color="var(--g-gray-500)" /></span>
          <span style={{ ...pillOutline, marginLeft: "auto" }}><DownloadIcon size={14} /> Export CSV</span>
          <span style={{ ...pill, background: "var(--g-green-dark)", color: "#fff", borderColor: "var(--g-green-dark)" }}>+ Add to Pipeline</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
            <thead>
              <tr style={{ fontSize: 11.5, fontWeight: 700, color: "var(--g-gray-500)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                {["Business", "Area", "Website Status", "Intent Score", "Contact", "Follow-up", "Stage"].map((h) => (
                  <th key={h} style={{ padding: "14px 20px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const tone = STAGE_TONE[row.stage];
                return (
                  <tr key={row.name} style={{ borderBottom: "1px solid var(--g-border)" }}>
                    <td style={{ padding: "16px 20px", fontSize: 14, fontWeight: 700, color: "var(--g-ink)" }}>
                      {row.name}
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--g-gray-500)" }}>{row.category}</div>
                    </td>
                    <td style={{ padding: "16px 20px", fontSize: 13.5, color: "var(--g-ink-soft)" }}>{row.area}</td>
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: "var(--radius-pill)", background: "var(--g-red-tint)", color: "var(--g-red-text)" }}>
                        {STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td style={{ padding: "16px 20px", fontSize: 14, fontWeight: 700, color: "var(--g-green-text)" }}>{row.intent}</td>
                    <td style={{ padding: "16px 20px", fontSize: 13.5, color: "var(--g-ink-soft)" }}>{row.contact}</td>
                    <td style={{ padding: "16px 20px", fontSize: 13.5, color: "var(--g-ink-soft)" }}>{row.followUp}</td>
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: "var(--radius-pill)", background: tone.bg, color: tone.text }}>{row.stage}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", gap: 24, padding: "16px 22px", fontSize: 13.5, fontWeight: 700, color: "var(--g-gray-500)" }}>
          <span style={{ color: "var(--g-green-text)", borderBottom: "2px solid var(--g-green)", paddingBottom: 5 }}>All Leads (248)</span>
          <span>Qualified (86)</span>
          <span>Contacted (64)</span>
          <span>Won (18)</span>
        </div>
      </div>

      <div style={{ position: "relative", height: 0 }}>
        <div style={{ position: "absolute", bottom: -20, right: "calc(50% - 640px)", width: 220, height: 130, zIndex: 0 }}>
          <OrigamiDecoration variant="corner-right" opacity={0.5} width="100%" />
        </div>
        <div style={{ position: "absolute", bottom: -40, right: "calc(50% - 610px)", width: 130, zIndex: 1 }}>
          <Image aria-hidden="true" alt="" src="/landing/mantis-crouch.png" width={1254} height={1254} style={{ width: "100%", height: "auto" }} />
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
