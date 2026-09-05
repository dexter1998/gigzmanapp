import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ogImageMeta } from "@/lib/og";
import { LandingFaq, type Faq } from "@/components/landing/LandingFaq";
import { LandingCta } from "@/components/landing/LandingCta";
import { JobsHero } from "@/components/landing/jobs/JobsHero";
import { JobsCapabilities } from "@/components/landing/jobs/JobsCapabilities";
import { JobsPipeline } from "@/components/landing/jobs/JobsPipeline";
import { JobsWebSearch } from "@/components/landing/jobs/JobsWebSearch";
import { JobsIntelligence } from "@/components/landing/jobs/JobsIntelligence";
import { JobsNearby } from "@/components/landing/jobs/JobsNearby";
import { JobsTestimonials } from "@/components/landing/jobs/JobsTestimonials";
import { JobsPricing } from "@/components/landing/jobs/JobsPricing";

const SITE_URL = "https://mantisai.in";

export const metadata: Metadata = {
  title: "Jobs on a map — find who's hiring near you",
  description:
    "Mantis reads the careers pages of real businesses around you and puts every open role on a map. " +
    "Normalized levels, work mode, pay bands, and a match score against your own resume.",
  alternates: { canonical: `${SITE_URL}/jobs` },
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

const JOBS_FAQS: Faq[] = [
  { q: "How does Mantis find jobs?", a: "Mantis searches live company career pages, ATS platforms (Greenhouse, Lever and others) and the open web, then verifies freshness before adding a role to the map." },
  { q: "Are the jobs really real-time?", a: "Every company on the map is re-scraped roughly every 10 days, and a role that disappears from its source is marked closed rather than left up." },
  { q: "How does the match score work?", a: "Add your resume and a few details once — job profile, level, experience, expected CTC. Every listing is then scored against that profile, with the reasons shown alongside the number." },
  { q: "Can I track my applications?", a: "Yes — save a role or mark it applied and it moves into your Applications tab, with status columns from Saved through Offer." },
  { q: "Can I find recruiter contact details?", a: "When a listing's source publishes them, yes. Coverage depends on what the employer's own careers page or ATS makes public." },
  { q: "Is my profile data secure?", a: "Your résumé and details are stored against your account only and used to compute your own match score — they are never shown to other users or sold to third parties." },
  { q: "Is there a free plan?", a: "Yes — the free tier includes live job search and basic match scoring, no card required." },
];

/**
 * Public landing for jobs mode. See components/landing/jobs/ for each section — built from the
 * mantis-jobs-sections reference screenshots, now wired to the real exported assets in
 * public/landing/jobs/ (mantis-jobs-assets-transparent pack) rather than hand-built placeholders.
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
    <>
      <JobsHero />
      <JobsCapabilities />
      <JobsPipeline />
      <JobsWebSearch />
      <JobsIntelligence />
      <JobsNearby />
      <JobsTestimonials />
      <JobsPricing />
      <LandingFaq
        faqs={JOBS_FAQS}
        title="Questions,"
        accent="answered."
        sub="Everything you need to know before finding your next opportunity."
      />
      <LandingCta
        pill="Fresh opportunities near you"
        title="Your next opportunity is"
        accent="already nearby."
        sub="Discover hot roles around you before they become crowded."
        primary={{ label: "Find Jobs Near Me →", href: "/login?mode=jobs" }}
        secondary={{ label: "Explore how it works ›", href: "#how-it-works" }}
      />
    </>
  );
}
