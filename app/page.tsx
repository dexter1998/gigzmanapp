import type { Metadata } from "next";
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
  title: "mantis — AI-powered local lead intelligence for agencies",
  description:
    "Mantis AI finds local businesses without a website or with weak digital presence, and delivers high-intent leads for tech & marketing agencies near you.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "mantis — AI-powered local lead intelligence",
    description: "We find clients near you. Real-time local lead discovery for agencies and consultants.",
    url: SITE_URL,
    siteName: "mantis",
    type: "website",
  },
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
            name: "Mantis AI",
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
