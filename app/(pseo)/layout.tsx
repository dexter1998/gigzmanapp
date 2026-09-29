import type { ReactNode } from "react";

/**
 * Rendered on demand, then cached — not per request.
 *
 * The build must never require a reachable database: prerendering these made `next build` query
 * production, which is how a database outage blocked deploys for a day (the Neon quota suspension)
 * and how the container build failed with ECONNREFUSED. That constraint still holds and is why no
 * route under here declares generateStaticParams.
 *
 * It does NOT require `force-dynamic`, which is what this used to be. A dynamic segment with a
 * `revalidate` and no generateStaticParams is already built at request time, not build time — so
 * the build stays database-free either way. `force-dynamic` additionally threw the cache away, and
 * because a layout's setting wins over the pages beneath it, the `export const revalidate = 86400`
 * on every city, area and category page was dead code. Every visit re-ran the whole page: five
 * sequential queries, up to 6,000 rows scored in JavaScript, through a three-connection pool. That
 * is the "clicking a city takes forever" report.
 *
 * The claim that "at current traffic ISR bought nothing" was the expensive part — at low traffic
 * almost every hit is a cold render, so caching is worth more, not less.
 */
export const revalidate = 86400;
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
        // Public-facing name, not the legal entity: this @id is shared with the marketing
        // layout's own Organization node (see lib/company.ts), and every place THAT reads it
        // (terms, privacy, the company page) already discloses COMPANY.legalName once, in the
        // context that expects a registered entity name. Repeating it here, on every one of
        // ~2,000 lead pages, put "Reverblunt Private Limited" in front of visitors who only ever
        // asked to see "Mantis" -- the same brand-vs-legal-entity split the root layout's own
        // title template already draws.
        name: COMPANY.brandLong,
        alternateName: COMPANY.brand,
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
