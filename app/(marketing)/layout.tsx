import type { ReactNode } from "react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { organizationJsonLd } from "@/lib/company";

/**
 * Shared chrome for the standalone marketing and legal pages, so leaving the landing page doesn't
 * land you somewhere that looks like a different product.
 *
 * The LocalBusiness/Organization block is emitted once here rather than per page: repeating the
 * same @id on every page is redundant, and these pages (contact, company, legal) are exactly the
 * ones a search engine reconciles against the Google Business Profile.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <LandingNav />
      <main style={{ background: "var(--g-cream)", minHeight: "70vh" }}>{children}</main>
      <LandingFooter />
    </>
  );
}
