import Image from "next/image";
import Link from "next/link";
import { ChevronRightIcon, ArrowRightIcon, LinkedInIcon, XSocialIcon, YouTubeIcon } from "@/components/icons";

const COLUMNS = [
  { title: "Product", links: [["Features", "#capabilities"], ["Lead Search", "#capabilities"], ["Enrichment", "#enrichment"], ["Lead Management", "#capabilities"]] },
  { title: "Use Cases", links: [["Agencies", "#testimonials"], ["Freelancers", "#testimonials"], ["Consultants", "#testimonials"]] },
  { title: "Resources", links: [["Help Center", "#faq"], ["Guides", "#faq"], ["API Docs", "#faq"]] },
  { title: "Company", links: [["About", "/"], ["Partner Access", "/partner"], ["Contact", "mailto:support@gigzmanapp.com"]] },
  { title: "Legal", links: [["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"]] },
] as const;

export function LandingFooter() {
  return (
    <footer style={{ position: "relative", background: "var(--g-green-mint)", padding: "56px 24px 28px", marginTop: 0 }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr repeat(5, 1fr)", gap: 24 }} className="landing-footer-grid">
          <div>
            <Image src="/mantis-logo-wordmark.png" alt="Mantis AI" width={160} height={38} style={{ objectFit: "contain", height: "auto", marginBottom: 12 }} />
            <p style={{ fontSize: 12.5, color: "var(--g-ink-soft)", lineHeight: 1.5, maxWidth: 220 }}>
              AI-powered local lead intelligence for agencies and consultants.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--g-ink)", marginBottom: 14 }}>{col.title}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map(([label, href]) => (
                  <Link key={label} href={href} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "var(--g-ink-soft)", textDecoration: "none" }}>
                    {label} <ChevronRightIcon size={11} color="var(--g-green-text)" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 32 }}>
          <form style={{ display: "flex", width: "100%", maxWidth: 340, background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-sm)", padding: 4 }}>
            <input
              type="email"
              placeholder="Enter your email"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", padding: "8px 14px", fontSize: 13, color: "var(--g-ink)" }}
            />
            <button type="submit" style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: "var(--g-green)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <ArrowRightIcon />
            </button>
          </form>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginTop: 32, paddingTop: 20, borderTop: "1px solid rgba(20,32,51,0.1)" }}>
          <span style={{ fontSize: 12, color: "var(--g-ink-soft)" }}>© {new Date().getFullYear()} Mantis AI. All rights reserved.</span>
          <div style={{ display: "flex", gap: 10 }}>
            {[LinkedInIcon, XSocialIcon, YouTubeIcon].map((Icon, i) => (
              <a key={i} href="#" style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--g-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={15} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
