import type { ReactNode } from "react";

/**
 * Every page under this group renders per-request instead of at build time.
 *
 * These pages are driven by the pSEO registry in Postgres, and prerendering them made `next
 * build` require a reachable production database — which is how a database outage blocked all
 * deploys for a day (the Neon quota suspension), and how the container build failed with
 * ECONNREFUSED: a build environment has no database at all. A build must never depend on the
 * database being up. The pages are still fully server-rendered HTML for crawlers; on a 40 MB
 * database the per-request read is milliseconds, and at current traffic ISR bought nothing.
 */
export const dynamic = "force-dynamic";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { COMPANY } from "@/lib/company";

/**
 * Chrome for the public lead-market pages.
 *
 * Emits Organization and WebSite once for the section, sharing the @id the marketing layout uses so
 * the two describe one entity rather than two. Deliberately not LocalBusiness: that node is about
 * Mantis's own premises in Sector 104 and has no business appearing on ninety pages that aren't
 * about that address.
 */
export default function PseoLayout({ children }: { children: ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${COMPANY.site}/#organization`,
        name: COMPANY.legalName,
        alternateName: COMPANY.brandLong,
        url: COMPANY.site,
        email: COMPANY.email,
      },
      {
        "@type": "WebSite",
        "@id": `${COMPANY.site}/#website`,
        url: COMPANY.site,
        name: COMPANY.brandLong,
        publisher: { "@id": `${COMPANY.site}/#organization` },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingNav />
      <main style={{ background: "var(--g-cream)", minHeight: "70vh" }}>{children}</main>
      <LandingFooter />
    </>
  );
}
