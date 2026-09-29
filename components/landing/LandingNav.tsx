"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon } from "@/components/icons";

// Root-relative rather than bare "#anchor": this same nav now renders on /pricing, /partner,
// /about and /contact, where a bare fragment would scroll the current page to nothing instead
// of navigating home to that section.
// Six items, all real pages. Nine wrapped onto two lines at common widths, which is what made the
// bar look crowded next to the two buttons on the right.
//
// Removed: "Partner Access" (the right-hand button already carries the access CTA), "Use Cases" and
// "Free Leads". The last two move to the footer rather than disappearing — a footer link is still
// site-wide, so /find-businesses-without-websites keeps a link from every page on the site, which
// was the point of putting it here. "Resources" stays in the nav: 87 articles had no inbound link
// from anywhere before it was added, and that is the one link doing real work.
const NAV_LINKS = [
  { label: "Product", href: "/#capabilities" },
  { label: "Resources", href: "/resources" },
  { label: "Jobs", href: "/jobs" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/company" },
  { label: "Contact", href: "/contact" },
];

export function LandingNav() {
  const pathname = usePathname();
  // The jobs landing page's CTAs carry ?mode=jobs so onboarding can skip asking the question this
  // page already answered (see app/(onboarding-flow)/onboarding/page.tsx) — the shared nav's login
  // links need the same hint when rendered on that page, not just the page body's own buttons.
  const isJobsPage = pathname === "/jobs";
  const loginHref = isJobsPage ? "/login?mode=jobs" : "/login";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--g-cream)",
        borderBottom: "1px solid var(--g-border)",
      }}
    >
      <nav
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "18px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center" }}>
          <Image src="/mantis-logo-wordmark.png" alt="Mantis Ai" width={148} height={36} style={{ objectFit: "contain", height: "auto" }} priority />
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 32 }} className="landing-nav-links">
          {NAV_LINKS.map((link) => {
            const active = link.href.startsWith("/") && !link.href.includes("#") && pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 15,
                  fontWeight: active ? 700 : 600,
                  color: active ? "var(--g-green-text)" : "var(--g-ink)",
                  textDecoration: "none",
                  paddingBottom: 3,
                  borderBottom: active ? "2px solid var(--g-green)" : "2px solid transparent",
                }}
              >
                {link.label}
                {link.label === "Product" && <ChevronDownIcon size={13} color="var(--g-gray-500)" />}
              </Link>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href={loginHref}
            style={{
              padding: "11px 20px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--g-border)",
              fontSize: 14.5,
              fontWeight: 700,
              color: "var(--g-ink)",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Log in
          </Link>
          <Link
            href={loginHref}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "11px 20px",
              borderRadius: "var(--radius-sm)",
              background: "var(--g-ink)",
              color: "#fff",
              fontSize: 14.5,
              fontWeight: 700,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Get Free Access →
          </Link>
        </div>
      </nav>
    </header>
  );
}
