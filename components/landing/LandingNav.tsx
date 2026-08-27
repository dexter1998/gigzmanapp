"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDownIcon } from "@/components/icons";

const NAV_LINKS = [
  { label: "Product", href: "#capabilities" },
  { label: "Use Cases", href: "#testimonials" },
  { label: "Pricing", href: "#pricing" },
  { label: "Partner Access", href: "/partner" },
  { label: "Resources", href: "#faq" },
];

export function LandingNav() {
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
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center" }}>
          <Image src="/mantis-logo-wordmark.png" alt="Mantis AI" width={140} height={34} style={{ objectFit: "contain", height: "auto" }} priority />
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 28 }} className="landing-nav-links">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 14,
                fontWeight: 600,
                color: "var(--g-ink)",
                textDecoration: "none",
              }}
            >
              {link.label}
              {(link.label === "Product" || link.label === "Resources") && <ChevronDownIcon size={12} color="var(--g-gray-500)" />}
            </a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/login"
            style={{
              padding: "9px 18px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--g-border)",
              fontSize: 13.5,
              fontWeight: 700,
              color: "var(--g-ink)",
              textDecoration: "none",
            }}
          >
            Log in
          </Link>
          <Link
            href="/login"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 18px",
              borderRadius: "var(--radius-pill)",
              background: "var(--g-ink)",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Get Free Access →
          </Link>
        </div>
      </nav>
    </header>
  );
}
