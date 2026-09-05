import Image from "next/image";
import { BuildingIcon, ClipboardIcon, LinkIcon, PartnerIcon, ZapIcon, GlobeIcon, ShieldCheckIcon, ClockIcon } from "@/components/icons";

/** "We search the web, not a stale job board" — matches 04-realtime-web-search.png, using the
 * real exported globe illustration in place of the reference's 3D render. */
const SOURCES = [
  { icon: BuildingIcon, title: "Company Career Pages", note: "Direct from company sites" },
  { icon: ClipboardIcon, title: "Greenhouse ATS", note: "Live job listings" },
  { icon: LinkIcon, title: "Lever ATS", note: "Open positions" },
  { icon: PartnerIcon, title: "Professional Networks", note: "Career opportunities" },
  { icon: ZapIcon, title: "Startup Job Boards", note: "Emerging companies" },
  { icon: GlobeIcon, title: "Open Web", note: "The broader internet" },
];

const STATS = [
  { icon: GlobeIcon, value: "50+", label: "Live sources" },
  { icon: ZapIcon, value: "Fresh", label: "Listings" },
  { icon: ShieldCheckIcon, value: "Multi-source", label: "Verified" },
  { icon: ClockIcon, value: "Real-time", label: "Discovery" },
];

export function JobsWebSearch() {
  return (
    <section style={{ padding: "96px 24px", background: "var(--g-white)", overflow: "hidden" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1fr) minmax(260px, 0.9fr) minmax(260px, 1fr)", gap: 32, alignItems: "center" }} className="jobs-websearch-grid">
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: "var(--radius-pill)", background: "var(--g-green-mint)", fontSize: 11.5, fontWeight: 800, color: "var(--g-green-text)", marginBottom: 18 }}>
              LIVE DISCOVERY
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px, 3.6vw, 34px)", fontWeight: 600, color: "var(--g-ink)", margin: "0 0 14px", lineHeight: 1.2 }}>
              We search the web.<br />
              <span style={{ color: "var(--g-green)" }}>Not a stale job board.</span>
            </h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--g-gray-500)", margin: 0, maxWidth: 380 }}>
              Every search scans live company career pages, ATS platforms and trusted sources in real time.
            </p>
          </div>

          <div style={{ position: "relative", width: "100%", aspectRatio: "1384 / 1136" }}>
            <Image src="/landing/jobs/realtime-web-search-globe.png" alt="" fill sizes="(max-width: 900px) 60vw, 340px" style={{ objectFit: "contain" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {SOURCES.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--g-cream)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)" }}>
                  <Icon size={17} color="var(--g-green-text)" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-ink)", whiteSpace: "nowrap" }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: "var(--g-gray-500)" }}>{s.note}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1, background: "var(--g-border)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginTop: 48 }}>
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} style={{ background: "var(--g-white)", padding: "22px 16px", textAlign: "center" }}>
                <Icon size={20} color="var(--g-green-text)" />
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--g-ink)", margin: "8px 0 2px" }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "var(--g-gray-500)" }}>{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
