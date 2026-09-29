import Image from "next/image";
import Link from "next/link";
import { ChevronRightIcon, ArrowRightIcon, LinkedInIcon, XSocialIcon, YouTubeIcon } from "@/components/icons";
import { FooterBadges } from "./FooterBadges";

// Root-relative fragments ("/#capabilities") rather than bare ones — this footer now renders on
// /pricing, /partner, /about and /contact too, where a bare "#capabilities" points at nothing on
// the current page instead of navigating home to that section.
const COLUMNS = [
  { title: "Product", links: [["Features", "/#capabilities"], ["Lead Search", "/#capabilities"], ["Local Lead Market", "/leads"], ["Jobs", "/jobs", "NEW"], ["Pricing", "/pricing"]] },
  // The no-website pages. Footer links are site-wide, which is the cheapest internal-linking win
  // available to a brand-new page: every page on the site links here from the day it ships.
  { title: "Find Leads", links: [["Businesses Near Me", "/businesses-near-me-without-websites"], ["Businesses With No Website", "/find-businesses-without-websites"], ["Small Businesses", "/small-businesses-without-websites"], ["Web Design Leads", "/web-design-leads"], ["Industries Ranked", "/industries-without-websites"]] },
  { title: "Use Cases", links: [["Agencies", "/#testimonials"], ["Freelancers", "/#testimonials"], ["Consultants", "/#testimonials"]] },
  // This column was titled "Resources" and linked to everything except /resources — two fragments
  // and /preferences, which robots.txt disallows. The articles it should have been pointing at have
  // had no inbound link from anywhere on the site since they were published.
  { title: "Resources", links: [["All Guides", "/resources"], ["How These Figures Are Made", "/leads/methodology"], ["Help Center", "/#faq"], ["Email Preferences", "/preferences"]] },
  { title: "Company", links: [["About Us", "/company"], ["Partner Access", "/partner"], ["Contact", "/contact"]] },
  { title: "Legal", links: [["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"]] },
] as const;

/** Icon-only links announce as "link" to a screen reader unless they carry a name of their own. */
/**
 * Only profiles that actually exist. An icon linking to a guessed handle is worse than no icon:
 * it sends people to someone else's account, or to a 404 with our name on it. Fill the URL in and
 * the icon appears; leave it empty and it does not render.
 */
const SOCIALS = [
  { Icon: LinkedInIcon, label: "LinkedIn", href: "https://www.linkedin.com/company/mantis-leads" },
  { Icon: XSocialIcon, label: "X", href: "https://x.com/mantisleads" },
  { Icon: YouTubeIcon, label: "YouTube", href: "" }, // not created yet
].filter((s) => s.href);

export function LandingFooter() {
  return (
    <footer style={{ position: "relative", background: "var(--g-green-mint)", padding: "88px 24px 32px", marginTop: 0 }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr repeat(5, 1fr)", gap: 32 }} className="landing-footer-grid">
          <div>
            <Image src="/mantis-logo-wordmark.png" alt="Mantis Ai" width={170} height={40} style={{ objectFit: "contain", height: "auto", marginBottom: 14 }} />
            <p style={{ fontSize: 13.5, color: "var(--g-ink-soft)", lineHeight: 1.55, maxWidth: 230 }}>
              AI-powered local lead intelligence for agencies and consultants.
            </p>

            {/* Socials sit with the brand rather than in the bottom bar — the block reads as one
                identity: who we are, where to find us, and who lists us. */}
            <div style={{ display: SOCIALS.length ? "flex" : "none", gap: 12, marginTop: 18 }}>
              {SOCIALS.map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener"
                  aria-label={`Mantis Ai on ${label}`}
                  style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--g-border)", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>

            <FooterBadges />
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--g-ink)", marginBottom: 16 }}>{col.title}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {col.links.map(([label, href, badge]) => (
                  <Link key={label} href={href} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "var(--g-ink-soft)", textDecoration: "none" }}>
                    {label}
                    {badge && (
                      <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.04em", color: "#fff", background: "var(--g-ink)", borderRadius: "var(--radius-pill)", padding: "2px 6px" }}>
                        {badge}
                      </span>
                    )}
                    <ChevronRightIcon size={12} color="var(--g-green-text)" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 44 }}>
          <form style={{ display: "flex", width: "100%", maxWidth: 420, background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-sm)", padding: 5 }}>
            <input
              type="email"
              placeholder="Enter your email"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", padding: "12px 16px", fontSize: 14, color: "var(--g-ink)" }}
            />
            <button type="submit" aria-label="Subscribe to updates" style={{ width: 42, height: 42, borderRadius: 8, border: "none", background: "var(--g-green)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <ArrowRightIcon />
            </button>
          </form>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginTop: 44, paddingTop: 24, borderTop: "1px solid rgba(20,32,51,0.12)" }}>
          <span style={{ fontSize: 13, color: "var(--g-ink-soft)" }}>© {new Date().getFullYear()} Mantis Ai. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
