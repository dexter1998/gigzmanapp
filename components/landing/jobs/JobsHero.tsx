import Link from "next/link";
import Image from "next/image";
import { OrigamiDecoration } from "../OrigamiDecoration";
import { SearchIcon, PinIcon, BellIcon, TableIcon, PartnerIcon, StarIcon, SettingsIcon } from "@/components/icons";

/**
 * Hero for the jobs landing page. The mock dashboard below the fold is built from real UI
 * primitives (pin, star, chips) rather than a screenshot — it stays accurate as the actual
 * product changes shape, and it is what the design reference's own mock panel is standing in for
 * until real screenshots replace it.
 */

const MOCK_JOBS = [
  { title: "Product Designer", company: "ZyloTech", tag: "★", posted: "2h ago" },
  { title: "Frontend Engineer", company: "Finova Labs", tag: "★", posted: "3h ago" },
  { title: "Growth Marketer", company: "BrightScale", tag: "★", posted: "4h ago" },
  { title: "Data Analyst", company: "Healthify", tag: "★", posted: "6h ago" },
];

export function JobsHero() {
  return (
    <section style={{ position: "relative", padding: "72px 24px 0", overflow: "hidden" }}>
      <OrigamiDecoration variant="corner-right" opacity={0.5} width="30vw" priority />

      <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px",
            borderRadius: "var(--radius-pill)", background: "var(--g-green-mint)",
            color: "var(--g-green-text)", fontSize: 12.5, fontWeight: 700, marginBottom: 22,
          }}
        >
          <StarIcon size={13} /> AI-powered local job intelligence
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)", fontSize: "clamp(34px, 6vw, 58px)", fontWeight: 600,
            lineHeight: 1.1, color: "var(--g-ink)", margin: "0 0 18px",
          }}
        >
          Hot jobs <span style={{ color: "var(--g-green)" }}>near you.</span><br />
          Before everyone else.
        </h1>
        <p style={{ fontSize: 16.5, lineHeight: 1.6, color: "var(--g-gray-500)", margin: "0 auto 32px", maxWidth: 600 }}>
          Mantis searches company career pages, ATS platforms and the open web in real time — so
          you discover fresh opportunities while they&apos;re still hot.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/login?mode=jobs"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px",
              borderRadius: "var(--radius-sm)", background: "var(--g-green-darker)", color: "#fff",
              fontSize: 15, fontWeight: 700, textDecoration: "none",
            }}
          >
            Find Jobs Near Me →
          </Link>
          <a
            href="#how-it-works"
            style={{
              display: "inline-flex", alignItems: "center", padding: "14px 28px",
              borderRadius: "var(--radius-sm)", border: "1px solid var(--g-border)",
              background: "var(--g-white)", color: "var(--g-ink)", fontSize: 15, fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Explore Live Jobs
          </a>
        </div>
      </div>

      {/* Mock dashboard panel */}
      <div style={{ maxWidth: 1180, margin: "48px auto 0", position: "relative", zIndex: 1 }}>
        <div
          style={{
            background: "var(--g-white)", border: "1px solid var(--g-border)",
            borderRadius: "var(--radius-lg) var(--radius-lg) 0 0", boxShadow: "var(--shadow-card)",
            display: "flex", overflow: "hidden",
          }}
        >
          {/* Left icon rail — decorative, mirrors the in-app sidebar */}
          <div
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 18,
              padding: "20px 14px", borderRight: "1px solid var(--g-border)", background: "var(--g-cream)",
            }}
            className="jobs-hero-rail"
          >
            {[SearchIcon, PinIcon, BellIcon, TableIcon, PartnerIcon].map((Icon, i) => (
              <Icon key={i} size={17} color="var(--g-gray-500)" />
            ))}
            <div style={{ flex: 1 }} />
            <SettingsIcon size={17} color="var(--g-gray-500)" />
          </div>

          {/* Live map illustration */}
          <div style={{ flex: "1 1 55%", minHeight: 320, position: "relative", background: "var(--g-cream)" }}>
            <Image src="/landing/jobs/live-job-map-module.png" alt="" fill sizes="(max-width: 900px) 90vw, 620px" style={{ objectFit: "contain", padding: 24 }} priority />
          </div>

          {/* Job list */}
          <div style={{ flex: "1 1 45%", padding: 18, display: "flex", flexDirection: "column", gap: 10 }} className="jobs-hero-list">
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--g-ink)", marginBottom: 4 }}>Hot jobs nearby</div>
            {MOCK_JOBS.map((j) => (
              <div key={j.title} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--g-border)" }}>
                <div style={{ width: 30, height: 30, borderRadius: 7, background: "var(--g-green-mint)", color: "var(--g-green-text)", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                  {j.company.charAt(0)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{j.title}</div>
                  <div style={{ fontSize: 11, color: "var(--g-gray-500)" }}>{j.company} · {j.posted}</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--g-green-text)", background: "var(--g-green-mint)", padding: "3px 8px", borderRadius: "var(--radius-pill)", whiteSpace: "nowrap" }}>
                  High match
                </span>
              </div>
            ))}
          </div>
        </div>

        <Image
          aria-hidden="true"
          alt=""
          src="/landing/jobs/mantis-cta-walking.png"
          width={1536}
          height={1024}
          style={{ position: "absolute", top: -70, right: "1%", width: "clamp(160px, 16vw, 260px)", height: "auto", zIndex: -1, opacity: 0.95 }}
        />
      </div>
    </section>
  );
}
