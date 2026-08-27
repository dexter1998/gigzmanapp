import {
  SearchIcon,
  MapsPinIcon,
  XSocialIcon,
  LinkedInIcon,
  FacebookIcon,
  InstagramIcon,
  RadioIcon,
  ZapIcon,
  ShieldCheckIcon,
  ClockIcon,
} from "@/components/icons";
import { OrigamiDecoration } from "./OrigamiDecoration";

const SOURCE_ICONS = [MapsPinIcon, XSocialIcon, LinkedInIcon, FacebookIcon, InstagramIcon];

const STATS = [
  { icon: RadioIcon, title: "50+ Live Sources", description: "We tap into 50+ trusted sources across maps, directories, social networks and the open web." },
  { icon: ZapIcon, title: "Fresh Results", description: "Every search pulls the latest information — no stale records, no outdated listings." },
  { icon: ShieldCheckIcon, title: "Multi-source Verification", description: "We cross-check each data point across multiple sources to ensure accuracy and consistency." },
  { icon: ClockIcon, title: "Real-time Discovery", description: "Find new leads, updates and opportunities as they happen, not hours or days later." },
];

// Nodes plotted along the discovery line, alternating above/below — mirrors the approved
// reference's search → source-network visualization instead of leaving that half empty.
const NODES = [
  { icon: MapsPinIcon, x: 18, y: -46 },
  { icon: FacebookIcon, x: 34, y: 40 },
  { icon: LinkedInIcon, x: 54, y: -58 },
  { icon: InstagramIcon, x: 70, y: 34 },
  { icon: XSocialIcon, x: 88, y: -40 },
];

export function LandingWebSearch() {
  return (
    <section style={{ position: "relative", padding: "96px 24px", overflow: "hidden" }}>
      <OrigamiDecoration variant="corner-right" opacity={0.35} width="40vw" />
      <div style={{ maxWidth: 1240, margin: "0 auto", position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 40, alignItems: "center" }} className="landing-websearch-grid">
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: "var(--radius-pill)", background: "var(--g-green-mint)", color: "var(--g-green-text)", fontSize: 12.5, fontWeight: 700, marginBottom: 22 }}>
            <SearchIcon color="var(--g-green-text)" /> Live web search
          </div>
          <h2 style={{ fontSize: "clamp(30px, 4.5vw, 46px)", fontWeight: 800, color: "var(--g-ink)", lineHeight: 1.15, margin: "0 0 18px" }}>
            We search the web. <br />
            <span style={{ color: "var(--g-green)" }}>Not a stale database.</span>
          </h2>
          <p style={{ fontSize: 16, color: "var(--g-gray-500)", lineHeight: 1.65, maxWidth: 560, margin: "0 0 32px" }}>
            Every search scans multiple live sources across Google Maps, business websites, social profiles and the open web. Results are verified before they reach your workspace.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {SOURCE_ICONS.map((Icon, i) => (
              <div key={i} style={{ width: 44, height: 44, borderRadius: 10, border: "1px solid var(--g-border)", background: "var(--g-white)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={18} />
              </div>
            ))}
            <div style={{ height: 44, display: "flex", alignItems: "center", padding: "0 16px", borderRadius: "var(--radius-pill)", border: "1px solid var(--g-border)", fontSize: 13, fontWeight: 700, color: "var(--g-gray-500)" }}>
              +50 more
            </div>
          </div>
        </div>

        {/* Search → source-network visualization */}
        <div className="landing-websearch-viz" style={{ position: "relative", height: 260 }}>
          <div style={{ position: "absolute", top: "50%", left: "8%", right: "4%", height: 2, background: "linear-gradient(90deg, var(--g-green) 0%, rgba(168,213,30,0.15) 85%)", transform: "translateY(-1px)" }} />
          <div style={{ position: "absolute", top: "50%", left: "8%", width: 40, height: 40, borderRadius: "50%", background: "var(--g-white)", border: "1px solid var(--g-green)", display: "flex", alignItems: "center", justifyContent: "center", transform: "translate(-50%, -50%)", boxShadow: "0 0 0 8px var(--g-green-mint)" }}>
            <SearchIcon color="var(--g-green-text)" />
          </div>
          {NODES.map((node, i) => (
            <div key={i}>
              <svg
                aria-hidden="true"
                style={{ position: "absolute", left: `${node.x}%`, top: "50%", width: 2, height: Math.abs(node.y), transform: node.y < 0 ? `translate(-1px, ${node.y}px)` : "translate(-1px, 0)", overflow: "visible" }}
              >
                <line x1="1" y1={node.y < 0 ? Math.abs(node.y) : 0} x2="1" y2={node.y < 0 ? 0 : Math.abs(node.y)} stroke="var(--g-border)" strokeWidth="2" strokeDasharray="3 4" />
              </svg>
              <div
                style={{
                  position: "absolute",
                  left: `${node.x}%`,
                  top: `calc(50% + ${node.y}px)`,
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "var(--g-white)",
                  border: "1px solid var(--g-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: "translate(-50%, -50%)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <node.icon size={16} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1240, margin: "56px auto 0", position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 28, paddingTop: 40, borderTop: "1px solid var(--g-border)" }}>
        {STATS.map((s) => (
          <div key={s.title}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--g-green-mint)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <s.icon color="var(--g-green-text)" size={19} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--g-ink)", marginBottom: 7 }}>{s.title}</div>
            <div style={{ fontSize: 13.5, color: "var(--g-gray-500)", lineHeight: 1.6 }}>{s.description}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
