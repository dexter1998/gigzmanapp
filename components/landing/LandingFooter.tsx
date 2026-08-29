import Image from "next/image";
import Link from "next/link";
import { ChevronRightIcon, ArrowRightIcon, LinkedInIcon, XSocialIcon, YouTubeIcon } from "@/components/icons";

// Root-relative fragments ("/#capabilities") rather than bare ones — this footer now renders on
// /pricing, /partner, /about and /contact too, where a bare "#capabilities" points at nothing on
// the current page instead of navigating home to that section.
const COLUMNS = [
  { title: "Product", links: [["Features", "/#capabilities"], ["Lead Search", "/#capabilities"], ["Local Lead Market", "/leads"], ["Pricing", "/pricing"]] },
  { title: "Use Cases", links: [["Agencies", "/#testimonials"], ["Freelancers", "/#testimonials"], ["Consultants", "/#testimonials"]] },
  { title: "Resources", links: [["Help Center", "/#faq"], ["Guides", "/#faq"], ["Email Preferences", "/preferences"]] },
  { title: "Company", links: [["About Us", "/company"], ["Partner Access", "/partner"], ["Contact", "/contact"]] },
  { title: "Legal", links: [["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"]] },
] as const;

export function LandingFooter() {
  return (
    <footer style={{ position: "relative", background: "var(--g-green-mint)", padding: "88px 24px 32px", marginTop: 0 }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr repeat(5, 1fr)", gap: 32 }} className="landing-footer-grid">
          <div>
            <Image src="/mantis-logo-wordmark.png" alt="Mantis AI" width={170} height={40} style={{ objectFit: "contain", height: "auto", marginBottom: 14 }} />
            <p style={{ fontSize: 13.5, color: "var(--g-ink-soft)", lineHeight: 1.55, maxWidth: 230 }}>
              AI-powered local lead intelligence for agencies and consultants.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--g-ink)", marginBottom: 16 }}>{col.title}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {col.links.map(([label, href]) => (
                  <Link key={label} href={href} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13.5, color: "var(--g-ink-soft)", textDecoration: "none" }}>
                    {label} <ChevronRightIcon size={12} color="var(--g-green-text)" />
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
            <button type="submit" style={{ width: 42, height: 42, borderRadius: 8, border: "none", background: "var(--g-green)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <ArrowRightIcon />
            </button>
          </form>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginTop: 44, paddingTop: 24, borderTop: "1px solid rgba(20,32,51,0.12)" }}>
          <span style={{ fontSize: 13, color: "var(--g-ink-soft)" }}>© {new Date().getFullYear()} Mantis AI. All rights reserved.</span>
          <div style={{ display: "flex", gap: 12 }}>
            {[LinkedInIcon, XSocialIcon, YouTubeIcon].map((Icon, i) => (
              <a key={i} href="#" style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--g-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
