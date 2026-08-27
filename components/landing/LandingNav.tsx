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
          padding: "18px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center" }}>
          <Image src="/mantis-logo-wordmark.png" alt="Mantis AI" width={148} height={36} style={{ objectFit: "contain", height: "auto" }} priority />
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 32 }} className="landing-nav-links">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 15,
                fontWeight: 600,
                color: "var(--g-ink)",
                textDecoration: "none",
              }}
            >
              {link.label}
              {(link.label === "Product" || link.label === "Resources") && <ChevronDownIcon size={13} color="var(--g-gray-500)" />}
            </a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/login"
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
            href="/login"
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
