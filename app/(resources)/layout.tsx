import type { ReactNode } from "react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingCta } from "@/components/landing/LandingCta";
import "./resources/resources.css";

/**
 * The Resource Center wears the same chrome as the rest of the site — the landing nav, the
 * landing closing band, and the landing footer.
 *
 * This is the fix for the failure the gigzman audit rated Critical: a content section built with
 * its own header and footer reads as a different company, and the reader notices before they read
 * a word. The CTA band takes props, so it carries resource-specific copy without forking.
 */
export default function ResourcesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <LandingNav />
      <main className="rc">{children}</main>
      <LandingCta
        pill="Start finding clients today"
        title="Your next clients are"
        accent="already nearby."
        sub="Find high-intent local businesses and grow your agency with confidence."
        primary={{ label: "Get Free Access →", href: "/login" }}
        secondary={{ label: "Partner with us ›", href: "/partner" }}
      />
      <LandingFooter />
    </>
  );
}
