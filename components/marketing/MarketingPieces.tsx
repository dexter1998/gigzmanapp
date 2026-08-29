"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PlusIcon, MinusIcon } from "@/components/icons";

/** The faceted paper-mountain band that floors every marketing hero and CTA section, matching
 * the reference design's recurring origami motif. Purely decorative — aria-hidden and
 * non-interactive, never carries content. */
export function OrigamiFloor({ opacity = 0.85, height = 260 }: { opacity?: number; height?: number }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: "auto 0 0 0", height, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      <Image
        alt=""
        src="/marketing/origami-mountain.webp"
        width={1600}
        height={570}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "bottom", opacity }}
      />
    </div>
  );
}

export function EyebrowPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 14px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid var(--g-border)",
        background: "var(--g-white)",
        fontSize: 12.5,
        fontWeight: 700,
        color: "var(--g-ink)",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--g-green)" }} />
      {children}
    </span>
  );
}

export function SectionHeading({
  title,
  accent,
  sub,
  align = "center",
}: {
  title: string;
  accent?: string;
  sub?: string;
  align?: "center" | "left";
}) {
  return (
    <div style={{ textAlign: align, marginBottom: 44 }}>
      <h2
        style={{
          fontSize: "clamp(27px, 4vw, 42px)",
          fontWeight: 800,
          color: "var(--g-ink)",
          letterSpacing: "-0.02em",
          margin: "0 0 12px",
          textWrap: "balance",
        }}
      >
        {title} {accent && <span style={{ color: "var(--g-green)" }}>{accent}</span>}
      </h2>
      {sub && (
        <p style={{ fontSize: 16, color: "var(--g-gray-500)", margin: 0, maxWidth: 620, marginLeft: align === "center" ? "auto" : 0, marginRight: align === "center" ? "auto" : 0, lineHeight: 1.6 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export type Faq = { q: string; a: string };

/**
 * Shared accordion for the FAQ block on /contact, /pricing and /partner. Emits FAQPage
 * structured data for every pair rather than only the open one — same reasoning as the landing
 * page's FAQ: rich-result eligibility shouldn't depend on which item a visitor happened to
 * expand.
 */
export function FaqAccordion({ faqs, columns = 1 }: { faqs: Faq[]; columns?: 1 | 2 }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: columns === 2 ? "repeat(auto-fit, minmax(340px, 1fr))" : "1fr",
          gap: columns === 2 ? "0 48px" : 0,
          textAlign: "left",
        }}
      >
        {faqs.map((faq, i) => {
          const open = openIndex === i;
          return (
            <div
              key={faq.q}
              style={{
                background: "var(--g-white)",
                border: "1px solid var(--g-border)",
                borderRadius: "var(--radius-sm)",
                marginBottom: 10,
                overflow: "hidden",
                height: "fit-content",
              }}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  padding: "17px 20px",
                  fontFamily: "inherit",
                }}
              >
                <span style={{ fontSize: 14.5, fontWeight: 700, color: open ? "var(--g-green-text)" : "var(--g-ink)" }}>{faq.q}</span>
                {open ? <MinusIcon size={17} color="var(--g-green-text)" /> : <PlusIcon size={17} color="var(--g-green)" />}
              </button>
              {open && (
                <p style={{ fontSize: 14, color: "var(--g-gray-500)", lineHeight: 1.68, margin: 0, padding: "0 20px 18px" }}>{faq.a}</p>
              )}
            </div>
          );
        })}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </>
  );
}

/** The green closing band every marketing page ends on, with a mantis pose anchored right. */
export function MarketingCta({
  title,
  accent,
  sub,
  primary,
  secondary,
  pose = "/marketing/mantis-partner.webp",
  poseWidth = 900,
  poseHeight = 600,
}: {
  title: string;
  accent: string;
  sub: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  pose?: string;
  poseWidth?: number;
  poseHeight?: number;
}) {
  return (
    <section style={{ position: "relative", background: "var(--g-green-mint)", padding: "80px 24px", overflow: "hidden" }}>
      <OrigamiFloor opacity={0.5} height={220} />
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "1.35fr 1fr",
          gap: 32,
          alignItems: "center",
        }}
        className="marketing-cta-grid"
      >
        <div>
          <h2 style={{ fontSize: "clamp(28px, 4.4vw, 44px)", fontWeight: 800, color: "var(--g-ink)", letterSpacing: "-0.02em", margin: "0 0 12px", textWrap: "balance" }}>
            {title} <span style={{ color: "var(--g-green-dark)" }}>{accent}</span>
          </h2>
          <p style={{ fontSize: 16, color: "var(--g-ink-soft)", margin: "0 0 28px", maxWidth: 460, lineHeight: 1.6 }}>{sub}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Link
              href={primary.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "14px 26px",
                borderRadius: "var(--radius-sm)",
                background: "var(--g-green-dark)",
                color: "#fff",
                fontSize: 14.5,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              {primary.label} ↗
            </Link>
            {secondary && (
              <Link
                href={secondary.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "14px 26px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--g-white)",
                  border: "1px solid var(--g-border)",
                  color: "var(--g-ink)",
                  fontSize: 14.5,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                {secondary.label} →
              </Link>
            )}
          </div>
        </div>
        <Image
          aria-hidden="true"
          alt=""
          src={pose}
          width={poseWidth}
          height={poseHeight}
          style={{ width: "100%", height: "auto", justifySelf: "end", maxWidth: 340 }}
          className="marketing-cta-pose"
        />
      </div>
    </section>
  );
}
