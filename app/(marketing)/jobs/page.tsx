import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ogImageMeta } from "@/lib/og";

const SITE_URL = "https://mantisai.in";

export const metadata: Metadata = {
  title: "Jobs — coming soon",
  description:
    "Mantis Jobs is being rebuilt and is closed to new sign-ups. Mantis Leads is live today.",
  alternates: { canonical: `${SITE_URL}/jobs` },
  // Hold page: nothing here deserves to rank, and a thin placeholder on these queries is worse
  // than absence. Drop this line when the real page comes back.
  robots: { index: false, follow: true },
  openGraph: {
    images: ogImageMeta({
      v: "jobs",
      eyebrow: "Mantis Jobs",
      t1: "Hot jobs near you.",
      t2: "Before everyone else.",
      cta: "Find jobs near me →",
      url: "mantisai.in/jobs",
    }),
    title: "Jobs on a map — find who's hiring near you | Mantis",
    description: "Every open role at businesses around you, on one map. With levels, pay bands and your own match score.",
    url: `${SITE_URL}/jobs`,
  },
};

/**
 * Public landing for jobs mode — currently a hold page.
 *
 * Jobs is closed to new sign-ups while it is rebuilt (see lib/jobs/access.ts). The page stays up
 * rather than 404ing: it is linked from the nav and footer, it has accumulated real links, and a
 * live page that says "coming soon" keeps that equity while a dead one throws it away.
 *
 * The full pitch it used to render (hero, capabilities, pipeline, intelligence, pricing, FAQs) is
 * not deleted, just no longer imported here: every section still lives in components/landing/jobs/,
 * and the FAQ copy is one `git show` away in the commit that introduced this hold page. Re-opening
 * jobs is re-importing them, not rewriting them.
 *
 * noindex while it is a hold page: there is nothing to rank for "jobs on a map" right now, and a
 * thin placeholder sitting on those queries is worse than being absent from them.
 *
 * No <LandingNav>/<LandingFooter>/<main> here — app/(marketing)/layout.tsx already wraps every
 * page in this route group with all three; rendering them again here is what produced a doubled
 * nav and footer the first time this page shipped.
 *
 * Signed-in users never see this — sent to their dashboard, same as the marketing root.
 */
export default async function JobsLandingPage() {
  const session = await auth();
  if (session) redirect("/start");

  return (
    <section style={{ padding: "120px 24px 140px", display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: 560, textAlign: "center" }}>
        <span
          style={{
            display: "inline-block", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.08em", padding: "6px 14px", borderRadius: "var(--radius-pill)",
            background: "var(--g-gray-100)", color: "var(--g-gray-500)", marginBottom: 20,
          }}
        >
          Coming soon
        </span>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 600, lineHeight: 1.15, color: "var(--g-ink)", margin: "0 0 16px" }}>
          Mantis Jobs is being rebuilt.
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--g-gray-500)", margin: "0 0 32px" }}>
          Open roles at real businesses, on a map, scored against your own resume. We&apos;ve paused
          new sign-ups while we make it properly good. Accounts already using Jobs are unaffected.
        </p>
        {/* Plain buttons rather than <LandingCta>: that component is a full-bleed section with its
            own artwork, and dropping it into this narrow column put the mantis illustration on top
            of its own headline. A hold page does not need a second hero anyway. */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/login"
            style={{
              padding: "13px 24px", borderRadius: "var(--radius-pill)", background: "var(--g-ink)",
              color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap",
            }}
          >
            Try Mantis Leads →
          </Link>
          <Link
            href="/#capabilities"
            style={{
              padding: "13px 24px", borderRadius: "var(--radius-pill)", border: "1px solid var(--g-border)",
              background: "var(--g-white)", color: "var(--g-ink)", fontSize: 14, fontWeight: 600,
              textDecoration: "none", whiteSpace: "nowrap",
            }}
          >
            See how it works ›
          </Link>
        </div>
      </div>
    </section>
  );
}
