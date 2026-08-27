import {
  SearchIcon,
  UserIcon,
  ClipboardIcon,
  DownloadIcon,
  CheckIcon,
  ShieldIcon,
} from "@/components/icons";
import { OrigamiDecoration } from "./OrigamiDecoration";

const previewCard: React.CSSProperties = {
  background: "var(--g-cream)",
  border: "1px solid var(--g-border)",
  borderRadius: "var(--radius-sm)",
  padding: 16,
  marginBottom: 20,
};

const CAPABILITIES = [
  {
    n: "01",
    icon: ShieldIcon,
    title: "Website Gap Detection",
    description: "Find businesses without websites or with poor digital presence.",
    preview: (
      <div style={previewCard}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-ink)", marginBottom: 8 }}>Website Gap</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "var(--g-ink)" }}>68%</div>
        <div style={{ fontSize: 11.5, color: "var(--g-gray-500)" }}>No website · 324 businesses</div>
      </div>
    ),
  },
  {
    n: "02",
    icon: SearchIcon,
    title: "Real-Time Web Search",
    description: "Search 50+ live sources for fresh, verified business data.",
    preview: (
      <div style={previewCard}>
        <div style={{ fontSize: 12, color: "var(--g-gray-500)", marginBottom: 8 }}>Searching 50+ sources…</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "var(--g-green-text)" }}>1,248</div>
        <div style={{ fontSize: 11.5, color: "var(--g-gray-500)" }}>fresh results</div>
      </div>
    ),
  },
  {
    n: "03",
    icon: UserIcon,
    title: "Profile Enrichment",
    description: "Enrich profiles with people, skills, reviews, and more.",
    preview: (
      <div style={previewCard}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-ink)" }}>Arjun Mehta</div>
        <div style={{ fontSize: 11.5, color: "var(--g-gray-500)", marginBottom: 6 }}>Owner at Brewz Cafe</div>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--g-green-text)", background: "var(--g-green-mint)", padding: "2px 8px", borderRadius: "var(--radius-pill)" }}>Enriched</span>
      </div>
    ),
  },
  {
    n: "04",
    icon: UserIcon,
    title: "Founder & Contact Finder",
    description: "Identify decision-makers and connect with the right people.",
    preview: (
      <div style={previewCard}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--g-gray-500)", marginBottom: 8 }}>Decision makers</div>
        <div style={{ fontSize: 12.5, color: "var(--g-ink)", marginBottom: 3 }}>Arjun Mehta · Owner</div>
        <div style={{ fontSize: 12.5, color: "var(--g-ink)" }}>Neha Kapoor · Marketing</div>
      </div>
    ),
  },
  {
    n: "05",
    icon: ClipboardIcon,
    title: "Lead Management",
    description: "Organize, score, and track leads in your workspace.",
    preview: (
      <div style={previewCard}>
        <div style={{ display: "flex", gap: 14 }}>
          <div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--g-ink)" }}>248</div><div style={{ fontSize: 10.5, color: "var(--g-gray-500)" }}>New</div></div>
          <div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--g-ink)" }}>67</div><div style={{ fontSize: 10.5, color: "var(--g-gray-500)" }}>In Progress</div></div>
          <div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--g-green-text)" }}>32</div><div style={{ fontSize: 10.5, color: "var(--g-gray-500)" }}>Won</div></div>
        </div>
      </div>
    ),
  },
  {
    n: "06",
    icon: DownloadIcon,
    title: "Bulk Extraction & Export",
    description: "Extract leads in bulk and export to CSV, Excel, or CRM.",
    preview: (
      <div style={previewCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "var(--g-green-text)", marginBottom: 8 }}>
          <CheckIcon size={14} /> 1,248 leads ready
        </div>
        <div style={{ fontSize: 11, color: "var(--g-gray-500)" }}>Business Name · Email · Phone · Website</div>
      </div>
    ),
  },
];

export function LandingCapabilities() {
  return (
    <section id="capabilities" style={{ position: "relative", padding: "96px 24px", overflow: "hidden" }}>
      <OrigamiDecoration variant="corner-left" opacity={0.3} width="38vw" />
      <div style={{ maxWidth: 1240, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <h2
          style={{
            fontSize: "clamp(30px, 4.5vw, 48px)",
            fontWeight: 800,
            color: "var(--g-ink)",
            textAlign: "center",
            letterSpacing: "-0.01em",
            margin: "0 0 24px",
            textWrap: "balance",
          }}
        >
          Everything you need to <span style={{ color: "var(--g-green)" }}>find and close</span> local clients
        </h2>

        {/* Discover → Close journey line, matching the approved reference's dotted progress indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 56 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-green-text)", border: "1px solid var(--g-green)", borderRadius: "var(--radius-pill)", padding: "6px 16px" }}>Discover</span>
          <span style={{ flex: 1, maxWidth: 220, borderTop: "2px dotted var(--g-green)" }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--g-green)" }} />
          <span style={{ flex: 1, maxWidth: 220, borderTop: "2px dotted var(--g-border)" }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-gray-500)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-pill)", padding: "6px 16px" }}>Close</span>
        </div>

        <div className="landing-capabilities-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.n}
              style={{
                background: "var(--g-white)",
                border: "1px solid var(--g-border)",
                borderRadius: "var(--radius-lg)",
                padding: 28,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: "var(--g-green-mint)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                <cap.icon color="var(--g-green-text)" size={22} />
              </div>
              {cap.preview}
              <div style={{ fontSize: 34, fontWeight: 800, color: "var(--g-green)", marginBottom: 6, lineHeight: 1 }}>{cap.n}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--g-ink)", marginBottom: 8 }}>{cap.title}</div>
              <div style={{ fontSize: 13.5, color: "var(--g-gray-500)", lineHeight: 1.55 }}>{cap.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
