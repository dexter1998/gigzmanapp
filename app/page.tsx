import type { Metadata } from "next";
import { ogImageMeta } from "@/lib/og";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingCapabilities } from "@/components/landing/LandingCapabilities";
import { LandingPipeline } from "@/components/landing/LandingPipeline";
import { LandingWebSearch } from "@/components/landing/LandingWebSearch";
import { LandingEnrichment } from "@/components/landing/LandingEnrichment";
import { LandingTestimonials } from "@/components/landing/LandingTestimonials";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingCta } from "@/components/landing/LandingCta";
import { LandingFooter } from "@/components/landing/LandingFooter";

const SITE_URL = "https://mantisai.in";

export const metadata: Metadata = {
  // `absolute` opts out of the root layout's "%s | Mantis" template — the brand is already the
  // first word here, and the template would append it a second time.
  title: { absolute: "Mantis Ai — Find Local Clients Who Need a Website" },
  description:
    "Find local businesses with no website and turn them into high-intent leads for your agency. " +
    "Real-time map search, not a stale database. Start free.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    images: ogImageMeta({
      v: "hero",
      eyebrow: "Mantis Ai",
      t1: "Find local clients.",
      t2: "Reach the right people.",
      cta: "Get free access →",
      url: "mantisai.in",
    }),
    title: "Mantis Ai — Find Local Clients Who Need a Website",
    description:
      "Find local businesses with no website and turn them into high-intent leads for your agency. " +
      "Real-time map search, not a stale database. Start free.",
    url: SITE_URL,
    siteName: "Mantis",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default async function RootPage() {
  const session = await auth();
  if (session) redirect("/home");

  return (
    <>
      {/* Organization + WebSite structured data — the concrete, controllable levers for sitelink
          eligibility (Google decides algorithmically, but a clean Organization/WebSite graph plus
          the section-anchor nav below are exactly the signals that make a site's structure
          legible enough to earn them). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Mantis Ai",
            url: SITE_URL,
            logo: `${SITE_URL}/icon.png`,
            sameAs: [],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "mantis",
            url: SITE_URL,
          }),
        }}
      />

      <LandingNav />
      <main>
        <LandingHero />
        <LandingCapabilities />
        <LandingPipeline />
        <LandingWebSearch />
        <LandingEnrichment />
        <LandingTestimonials />
        <LandingPricing />
        <LandingFaq />
        <LandingCta />
      </main>
      <LandingFooter />
    </>
  );
}
