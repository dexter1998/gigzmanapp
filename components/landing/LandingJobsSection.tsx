import Link from "next/link";
import { OrigamiDecoration } from "./OrigamiDecoration";

/**
 * The "there is a second product" section on the main landing page.
 *
 * A mid-page section rather than an entry popup, deliberately: a modal that interrupts before the
 * page has said what Mantis is forces a choice from someone who has no basis for making one, and
 * it is the first thing an ad-clicking visitor bounces off. By this point in the scroll they know
 * what the leads product does, so "there is also this" is a useful branch instead of a toll gate.
 */
export function LandingJobsSection() {
  return (
    <section
      id="jobs"
      style={{
        position: "relative",
        padding: "96px 24px",
        background: "var(--g-ink)",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      <OrigamiDecoration />

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
        <div style={{ maxWidth: 640, marginBottom: 44 }}>
          <span
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              padding: "5px 12px",
              borderRadius: "var(--radius-pill)",
              background: "rgba(255,255,255,0.12)",
              marginBottom: 18,
            }}
          >
            Also on Mantis
          </span>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 600,
              lineHeight: 1.15,
              margin: "0 0 14px",
            }}
          >
            Looking for a job, not clients?
          </h2>
          <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "rgba(255,255,255,0.72)", margin: 0 }}>
            The same map, pointed the other way. Mantis crawls the careers pages of real businesses
            around you and puts every open role on a map — with the level, the work mode, and the
            pay band read out of the posting itself.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18, marginBottom: 40 }}>
          <Feature
            title="Roles on a map"
            body="See who is hiring within walking distance, not a feed of postings from three cities away."
          />
          <Feature
            title="Levels that mean something"
            body="SDE I, SDE II, Senior, Staff — normalized, so filtering by level actually filters by level."
          />
          <Feature
            title="Your opportunity match"
            body="Add your resume once and every role shows how well it fits you, and why."
          />
          <Feature
            title="One-click apply"
            body="Your details travel with you. Review and submit on the employer's own form — never auto-sent."
          />
        </div>

        <Link
          href="/jobs"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "13px 26px",
            borderRadius: "var(--radius-pill)",
            background: "var(--g-green)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Explore jobs on Mantis →
        </Link>
      </div>
    </section>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "var(--radius-md)",
        padding: 20,
      }}
    >
      <h3 style={{ fontSize: 14.5, fontWeight: 800, margin: "0 0 7px" }}>{title}</h3>
      <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.66)", margin: 0 }}>{body}</p>
    </div>
  );
}
