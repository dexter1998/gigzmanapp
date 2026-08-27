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

export function LandingWebSearch() {
  return (
    <section style={{ position: "relative", padding: "80px 24px", overflow: "hidden" }}>
      <OrigamiDecoration variant="corner-right" opacity={0.4} />
      <div style={{ maxWidth: 1080, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: "var(--radius-pill)", background: "var(--g-green-mint)", color: "var(--g-green-text)", fontSize: 12, fontWeight: 700, marginBottom: 20 }}>
          <SearchIcon color="var(--g-green-text)" /> Live web search
        </div>
        <h2 style={{ fontSize: "clamp(28px, 4.5vw, 44px)", fontWeight: 800, color: "var(--g-ink)", lineHeight: 1.15, margin: "0 0 16px", maxWidth: 640 }}>
          We search the web. <br />
          <span style={{ color: "var(--g-green)" }}>Not a stale database.</span>
        </h2>
        <p style={{ fontSize: 15, color: "var(--g-gray-500)", lineHeight: 1.6, maxWidth: 560, margin: "0 0 32px" }}>
          Every search scans multiple live sources across Google Maps, business websites, social profiles and the open web. Results are verified before they reach your workspace.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 40 }}>
          {SOURCE_ICONS.map((Icon, i) => (
            <div key={i} style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid var(--g-border)", background: "var(--g-white)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={17} />
            </div>
          ))}
          <div style={{ height: 40, display: "flex", alignItems: "center", padding: "0 14px", borderRadius: "var(--radius-pill)", border: "1px solid var(--g-border)", fontSize: 12.5, fontWeight: 700, color: "var(--g-gray-500)" }}>
            +50 more
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24, paddingTop: 32, borderTop: "1px solid var(--g-border)" }}>
          {STATS.map((s) => (
            <div key={s.title}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--g-green-mint)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <s.icon color="var(--g-green-text)" size={18} />
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--g-ink)", marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", lineHeight: 1.55 }}>{s.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
