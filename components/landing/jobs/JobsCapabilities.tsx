import Image from "next/image";

/** Six-card capability grid, matching 02-capabilities-two-rows.png — each card's illustration is
 * a real exported asset (public/landing/jobs/), not an icon+number placeholder. */
const CAPABILITIES = [
  {
    n: "01",
    title: "Live Job Discovery",
    body: "Real-time openings from company career pages, ATS platforms and the open web.",
    image: { src: "/landing/jobs/live-job-map-module.png", width: 1536, height: 1024 },
  },
  {
    n: "02",
    title: "Hotness Score",
    body: "A fresh opportunity score based on recency, demand and competition.",
    image: { src: "/landing/jobs/job-hotness-score.png", width: 1536, height: 1024 },
  },
  {
    n: "03",
    title: "Role & Skill Match",
    body: "Get matched roles based on your skills, experience and preferences.",
    image: { src: "/landing/jobs/role-skill-match.png", width: 1536, height: 1024 },
  },
  {
    n: "04",
    title: "Recruiter Finder",
    body: "Find and get in touch with verified hiring managers and recruiters.",
    image: { src: "/landing/jobs/recruiter-verified-profile.png", width: 1536, height: 1024 },
  },
  {
    n: "05",
    title: "Instant Job Alerts",
    body: "Get notified the moment hot jobs match your profile and location.",
    image: { src: "/landing/jobs/instant-job-alerts.png", width: 1536, height: 1024 },
  },
  {
    n: "06",
    title: "Application Tracker",
    body: "Track every application, status and follow-up in one place.",
    image: { src: "/landing/jobs/application-tracker-kanban.png", width: 1536, height: 1024 },
  },
];

export function JobsCapabilities() {
  return (
    <section id="how-it-works" style={{ padding: "96px 24px", background: "var(--g-white)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: "var(--radius-pill)", background: "var(--g-cream)", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.04em", color: "var(--g-green-text)", marginBottom: 18 }}>
            MANTIS JOBS
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4.5vw, 44px)", fontWeight: 600, color: "var(--g-ink)", margin: "0 0 14px" }}>
            Everything you need to <span style={{ color: "var(--g-green)" }}>find and land</span> your next role
          </h2>
          <p style={{ fontSize: 15.5, color: "var(--g-gray-500)", margin: "0 auto", maxWidth: 560 }}>
            Discover fresh opportunities, get the right insights, and take action before everyone else.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
          {CAPABILITIES.map((c) => (
            <div key={c.n} style={{ background: "var(--g-cream)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 20, display: "flex", flexDirection: "column" }}>
              <div style={{ position: "relative", width: "100%", aspectRatio: `${c.image.width} / ${c.image.height}`, marginBottom: 16, borderRadius: "var(--radius-sm)", overflow: "hidden", background: "var(--g-white)" }}>
                <Image src={c.image.src} alt="" fill sizes="(max-width: 700px) 90vw, 380px" style={{ objectFit: "contain" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--g-green-text)", background: "var(--g-green-mint)", padding: "3px 9px", borderRadius: "var(--radius-pill)" }}>{c.n}</span>
              </div>
              <h3 style={{ fontSize: 15.5, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 6px" }}>{c.title}</h3>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--g-gray-500)", margin: 0 }}>{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
