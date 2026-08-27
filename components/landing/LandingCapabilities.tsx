import {
  SearchIcon,
  UserIcon,
  ClipboardIcon,
  DownloadIcon,
  CheckIcon,
  ShieldIcon,
} from "@/components/icons";

const previewCard: React.CSSProperties = {
  background: "var(--g-cream)",
  border: "1px solid var(--g-border)",
  borderRadius: "var(--radius-sm)",
  padding: 12,
  marginBottom: 16,
};

const CAPABILITIES = [
  {
    n: "01",
    icon: ShieldIcon,
    title: "Website Gap Detection",
    description: "Find businesses without websites or with poor digital presence.",
    preview: (
      <div style={previewCard}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--g-ink)", marginBottom: 6 }}>Website Gap</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--g-ink)" }}>68%</div>
        <div style={{ fontSize: 10.5, color: "var(--g-gray-500)" }}>No website · 324 businesses</div>
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
        <div style={{ fontSize: 11, color: "var(--g-gray-500)", marginBottom: 6 }}>Searching 50+ sources…</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--g-green-text)" }}>1,248</div>
        <div style={{ fontSize: 10.5, color: "var(--g-gray-500)" }}>fresh results</div>
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
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--g-ink)" }}>Arjun Mehta</div>
        <div style={{ fontSize: 10.5, color: "var(--g-gray-500)", marginBottom: 4 }}>Owner at Brewz Cafe</div>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--g-green-text)", background: "var(--g-green-mint)", padding: "1px 7px", borderRadius: "var(--radius-pill)" }}>Enriched</span>
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
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--g-gray-500)", marginBottom: 6 }}>Decision makers</div>
        <div style={{ fontSize: 11, color: "var(--g-ink)" }}>Arjun Mehta · Owner</div>
        <div style={{ fontSize: 11, color: "var(--g-ink)" }}>Neha Kapoor · Marketing</div>
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
        <div style={{ display: "flex", gap: 10 }}>
          <div><div style={{ fontSize: 15, fontWeight: 800, color: "var(--g-ink)" }}>248</div><div style={{ fontSize: 9.5, color: "var(--g-gray-500)" }}>New</div></div>
          <div><div style={{ fontSize: 15, fontWeight: 800, color: "var(--g-ink)" }}>67</div><div style={{ fontSize: 9.5, color: "var(--g-gray-500)" }}>In Progress</div></div>
          <div><div style={{ fontSize: 15, fontWeight: 800, color: "var(--g-green-text)" }}>32</div><div style={{ fontSize: 9.5, color: "var(--g-gray-500)" }}>Won</div></div>
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
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "var(--g-green-text)", marginBottom: 6 }}>
          <CheckIcon size={12} /> 1,248 leads ready
        </div>
        <div style={{ fontSize: 10, color: "var(--g-gray-500)" }}>Business Name · Email · Phone · Website</div>
      </div>
    ),
  },
];

export function LandingCapabilities() {
  return (
    <section id="capabilities" style={{ position: "relative", padding: "80px 24px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <h2
          style={{
            fontSize: "clamp(28px, 4vw, 42px)",
            fontWeight: 800,
            color: "var(--g-ink)",
            textAlign: "center",
            letterSpacing: "-0.01em",
            margin: "0 0 44px",
            textWrap: "balance",
          }}
        >
          Everything you need to <span style={{ color: "var(--g-green)" }}>find and close</span> local clients
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.n}
              style={{
                background: "var(--g-white)",
                border: "1px solid var(--g-border)",
                borderRadius: "var(--radius-lg)",
                padding: 24,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "var(--g-green-mint)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <cap.icon color="var(--g-green-text)" size={20} />
              </div>
              {cap.preview}
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--g-green)", marginBottom: 4 }}>{cap.n}</div>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: "var(--g-ink)", marginBottom: 6 }}>{cap.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", lineHeight: 1.5 }}>{cap.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
