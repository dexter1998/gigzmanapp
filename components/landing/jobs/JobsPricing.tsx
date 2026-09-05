"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CREDIT_COST, CREDIT_PACKS, FREE_MONTHLY_CREDITS, formatINR, rupees } from "@/lib/credits/pricing";
import { CheckIcon, HelpIcon } from "@/components/icons";

/**
 * Jobs-mode pricing — the exact same credit packs the leads side sells (CREDIT_PACKS is the one
 * source of truth for what anything costs; see LandingPricing.tsx and lib/credits/pricing.ts),
 * displayed with a 55%-off job-seeker discount.
 *
 * Display only, deliberately: this section shows the discounted price, but nothing here changes
 * what checkout actually charges. Wiring a real discount requires a promo-code path through
 * Cashfree checkout — a backend change, not a landing-page one — and is not done yet. Whoever
 * wires that should also re-check CREDIT_FLOOR_INR in lib/credits/pricing.ts first: 55% off the
 * 10k pack prices a credit at ~₹0.34, under the ₹0.385 floor that assertion exists to enforce, so
 * that pack cannot take the full 55% without either raising its price or accepting a loss on every
 * billed Places call it funds.
 */
const DISCOUNT_PCT = 55;

const leadsFor = (credits: number) => Math.floor(credits / CREDIT_COST.lead_unlock);

export function JobsPricing() {
  const [showNote, setShowNote] = useState(false);

  return (
    <section id="pricing" style={{ position: "relative", padding: "96px 24px", background: "var(--g-cream)", textAlign: "center", overflow: "hidden" }}>
      <Image
        aria-hidden="true"
        alt=""
        src="/landing/jobs/pricing-growth-sculpture.png"
        width={1536}
        height={1024}
        style={{ position: "absolute", top: "8%", right: "-4%", width: "clamp(160px, 20vw, 300px)", height: "auto", opacity: 0.85, pointerEvents: "none" }}
      />
      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: "var(--radius-pill)", background: "var(--g-white)", border: "1px solid var(--g-border)", fontSize: 11.5, fontWeight: 800, color: "var(--g-green-text)", marginBottom: 18 }}>
          PRICING
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4.5vw, 44px)", fontWeight: 600, color: "var(--g-ink)", margin: "0 0 12px" }}>
          Simple pricing. <span style={{ color: "var(--g-green)" }}>Better opportunities.</span>
        </h2>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 40, position: "relative" }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: "#fff", background: "var(--g-green-darker)", padding: "6px 14px", borderRadius: "var(--radius-pill)" }}>
            {DISCOUNT_PCT}% off every plan — job seekers only
          </span>
          <button
            type="button"
            aria-label="Why job seekers get this discount"
            onMouseEnter={() => setShowNote(true)}
            onMouseLeave={() => setShowNote(false)}
            onClick={() => setShowNote((v) => !v)}
            style={{ display: "inline-flex", background: "none", border: "none", cursor: "pointer", padding: 2 }}
          >
            <HelpIcon size={16} color="var(--g-gray-500)" />
          </button>
          {showNote && (
            <div
              role="tooltip"
              style={{
                position: "absolute", top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
                width: 260, background: "var(--g-ink)", color: "#fff", fontSize: 12, lineHeight: 1.5,
                padding: "10px 14px", borderRadius: "var(--radius-sm)", zIndex: 5, textAlign: "left",
              }}
            >
              Only for job seekers — we&apos;re giving 55% off on all plans. Agencies and freelancers on
              the leads side pay the standard rate card.
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18, textAlign: "left" }}>
          <Card
            title="Free"
            fullPrice="₹0"
            price="₹0"
            priceNote="every month, forever"
            headline={`${FREE_MONTHLY_CREDITS} credits`}
            features={[
              `≈ ${leadsFor(FREE_MONTHLY_CREDITS)} job applications tracked`,
              "Unlimited search in scanned areas",
              "5 new-area searches a day",
              "Basic opportunity match",
            ]}
            cta={{ label: "Get started free", href: "/login?mode=jobs" }}
          />
          {CREDIT_PACKS.map((pack) => {
            const discounted = pack.pricePaise * (1 - DISCOUNT_PCT / 100);
            return (
              <Card
                key={pack.id}
                title={pack.label}
                fullPrice={formatINR(pack.pricePaise)}
                price={formatINR(Math.round(discounted))}
                priceNote={`₹${(rupees(discounted) / pack.credits).toFixed(2)} per credit`}
                headline={`${pack.credits.toLocaleString("en-IN")} credits`}
                badge={pack.badge}
                highlighted={pack.badge === "Most popular"}
                features={[
                  `≈ ${leadsFor(pack.credits).toLocaleString("en-IN")} job applications tracked`,
                  "Unlimited search in scanned areas",
                  "Advanced opportunity match",
                  "Recruiter contact details",
                  "Priority support",
                ]}
                cta={{ label: "Get started", href: "/login?mode=jobs" }}
              />
            );
          })}
        </div>

        <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginTop: 28 }}>
          Job seeker pricing applies automatically when your account is set to Jobs mode.{" "}
          <Link href="/pricing" style={{ color: "var(--g-green-text)", fontWeight: 700 }}>See what credits buy →</Link>
        </p>
      </div>
    </section>
  );
}

function Card({
  title, fullPrice, price, priceNote, headline, features, badge, highlighted, cta,
}: {
  title: string; fullPrice: string; price: string; priceNote: string; headline: string;
  features: string[]; badge?: string; highlighted?: boolean; cta: { label: string; href: string };
}) {
  const discounted = price !== fullPrice;
  return (
    <div
      style={{
        position: "relative", background: highlighted ? "var(--g-green-mint)" : "var(--g-white)",
        border: highlighted ? "1.5px solid var(--g-green)" : "1px solid var(--g-border)",
        borderRadius: "var(--radius-lg)", padding: 26, display: "flex", flexDirection: "column",
      }}
    >
      {badge && (
        <span style={{ position: "absolute", top: -11, left: 22, fontSize: 10.5, fontWeight: 700, padding: "4px 11px", borderRadius: "var(--radius-pill)", background: highlighted ? "var(--g-green-dark)" : "var(--g-ink)", color: "#fff", whiteSpace: "nowrap" }}>
          {badge}
        </span>
      )}
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--g-gray-500)", marginTop: badge ? 8 : 0 }}>{title}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "8px 0 2px" }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: "var(--g-ink)" }}>{price}</span>
        {discounted && <span style={{ fontSize: 15, color: "var(--g-gray-500)", textDecoration: "line-through" }}>{fullPrice}</span>}
      </div>
      <div style={{ fontSize: 12, color: "var(--g-gray-500)", marginBottom: 4 }}>{priceNote}</div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--g-green-text)", marginBottom: 18 }}>{headline}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 22, flex: 1 }}>
        {features.map((f) => (
          <span key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--g-ink-soft, var(--g-gray-500))" }}>
            <CheckIcon size={14} color="var(--g-green)" /> {f}
          </span>
        ))}
      </div>
      <Link
        href={cta.href}
        style={{
          textAlign: "center", padding: "11px 0", borderRadius: "var(--radius-sm)", textDecoration: "none",
          fontSize: 13.5, fontWeight: 700,
          background: highlighted ? "var(--g-green-darker)" : "var(--g-white)",
          color: highlighted ? "#fff" : "var(--g-ink)",
          border: highlighted ? "none" : "1px solid var(--g-border)",
        }}
      >
        {cta.label}
      </Link>
    </div>
  );
}
