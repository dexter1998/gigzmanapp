import Link from "next/link";
import Image from "next/image";

/**
 * The "there is a second product" section on the main landing page.
 *
 * A mid-page section rather than an entry popup, deliberately: a modal that interrupts before the
 * page has said what Mantis is forces a choice from someone who has no basis for making one, and
 * it is the first thing an ad-clicking visitor bounces off. By this point in the scroll they know
 * what the leads product does, so "there is also this" is a useful branch instead of a toll gate.
 *
 * Light, not the dark --g-ink band the rest of the marketing page uses for CTA sections — this one
 * is its own product pitch with its own hero-style composition, so it reads as a distinct card
 * rather than another dark closer stacked on the real one.
 */

const FEATURES = [
  { icon: "roles-near-you", title: "Roles near you" },
  { icon: "meaningful-levels", title: "Meaningful levels" },
  { icon: "opportunity-match", title: "Opportunity match" },
  { icon: "apply-one-click", title: "Apply in one click" },
] as const;

export function LandingJobsSection() {
  return (
    <section
      id="jobs"
      style={{
        position: "relative",
        padding: "88px 24px",
        background: "var(--g-cream)",
        overflow: "hidden",
      }}
    >
      <Image
        aria-hidden="true"
        alt=""
        src="/landing/jobs/cross-sell/mountains-left.png"
        width={1774}
        height={887}
        style={{ position: "absolute", left: 0, bottom: 0, width: "34vw", maxWidth: 480, height: "auto", opacity: 0.7, pointerEvents: "none", zIndex: 0 }}
      />
      <Image
        aria-hidden="true"
        alt=""
        src="/landing/jobs/cross-sell/mountains-right.png"
        width={1672}
        height={941}
        style={{ position: "absolute", right: 0, bottom: 0, width: "34vw", maxWidth: 480, height: "auto", opacity: 0.7, pointerEvents: "none", zIndex: 0 }}
      />

      <div
        style={{
          maxWidth: 1140,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "minmax(280px, 460px) 1fr",
          gap: 48,
          alignItems: "center",
        }}
        className="jobs-cross-sell-grid"
      >
        <div>
          <span
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              padding: "5px 12px",
              borderRadius: "var(--radius-pill)",
              background: "var(--g-green-mint)",
              color: "var(--g-green-text)",
              marginBottom: 18,
            }}
          >
            Mantis Jobs
          </span>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(30px, 4vw, 44px)",
              fontWeight: 600,
              lineHeight: 1.15,
              color: "var(--g-ink)",
              margin: "0 0 16px",
            }}
          >
            Looking for a job, not clients?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--g-gray-500)", margin: "0 0 28px" }}>
            Discover fresh roles near you, understand the level and pay, match your profile, and
            apply with confidence.
          </p>

          <Link
            href="/jobs"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 26px",
              borderRadius: "var(--radius-pill)",
              background: "var(--g-green)",
              color: "#fff",
              fontSize: 14.5,
              fontWeight: 700,
              textDecoration: "none",
              marginBottom: 36,
            }}
          >
            Explore jobs on Mantis →
          </Link>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {FEATURES.map((f) => (
              <div
                key={f.icon}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  background: "var(--g-white)",
                  border: "1px solid var(--g-border)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <Image
                  aria-hidden="true"
                  alt=""
                  src={`/landing/jobs/cross-sell/${f.icon}.png`}
                  width={64}
                  height={64}
                  style={{ width: 34, height: 34, objectFit: "contain", flexShrink: 0 }}
                />
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--g-ink)" }}>{f.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: "relative" }}>
          <Image
            src="/landing/jobs/cross-sell/jobs-map-composition.png"
            alt="Map of open roles near Gurugram, with matching job cards and an opportunity-match score"
            width={1536}
            height={1024}
            style={{ width: "100%", height: "auto" }}
          />
          <Image
            aria-hidden="true"
            alt=""
            src="/landing/jobs/cross-sell/origami-mantis.png"
            width={1536}
            height={1024}
            style={{ position: "absolute", top: "-14%", right: "2%", width: "26%", height: "auto", pointerEvents: "none" }}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .jobs-cross-sell-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
