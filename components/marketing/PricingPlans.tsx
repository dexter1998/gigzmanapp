"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckIcon, ChevronDownIcon, StarIcon } from "@/components/icons";
import { FREE_PLAN, PAID_PLANS } from "@/components/plans-config";

/**
 * Pro is the only plan a buyer sizes, so it's the only card with a credit selector — Free is fixed
 * and Agency is quoted. The tiers come from plans-config rather than being typed in here, so the
 * page can never quote a price the in-app upgrade modal disagrees with.
 *
 * The card states the per-1,000-lead rate rather than a "save X%" badge, because the ladder isn't
 * uniformly cheaper as it climbs and a savings badge would have to either lie or look broken.
 */

/** Billed annually, charged monthly — 20% off, matching the toggle's own claim. */
const ANNUAL_DISCOUNT = 0.2;

const FREE_FEATURES = ["Unlimited map search", "Website-gap detection", "Heat score on every lead", "CSV export", "Community support"];
const PRO_FEATURES = ["Advanced filters & saved searches", "Contact enrichment", "Bulk export", "Lead management workspace", "Priority support"];
const AGENCY_FEATURES = ["Custom lead volume", "Dedicated account manager", "API access", "White-label export", "Team workspaces", "Priority data sourcing"];

const COMPARISON: Array<{ row: string; free: string | boolean; pro: string | boolean; agency: string | boolean }> = [
  { row: "Monthly lead credits", free: "20", pro: "2,000 – 30,000", agency: "Custom" },
  { row: "Map search & filters", free: true, pro: true, agency: true },
  { row: "Website gap detection", free: true, pro: true, agency: true },
  { row: "Heat score", free: true, pro: true, agency: true },
  { row: "Contact enrichment", free: "Basic", pro: true, agency: true },
  { row: "Saved searches", free: false, pro: true, agency: true },
  { row: "Lead management", free: false, pro: true, agency: true },
  { row: "CSV export", free: true, pro: true, agency: true },
  { row: "Bulk export", free: false, pro: true, agency: true },
  { row: "Team members", free: "1", pro: "5", agency: "Unlimited" },
  { row: "API access", free: false, pro: false, agency: true },
  { row: "Support", free: "Community", pro: "Priority", agency: "Priority + Dedicated" },
];

const money = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

export function PricingPlans() {
  const [annual, setAnnual] = useState(false);
  const [tierIndex, setTierIndex] = useState(0);

  const tier = PAID_PLANS[tierIndex];
  const proPrice = annual ? Math.round(tier.monthlyUsd * (1 - ANNUAL_DISCOUNT) * 100) / 100 : tier.monthlyUsd;
  const perThousand = (tier.monthlyUsd / tier.creditsPerMonth) * 1000;

  return (
    <>
      {/* Billing toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 40 }}>
        <div style={{ display: "inline-flex", background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-pill)", padding: 4 }}>
          {(["Monthly", "Annual"] as const).map((label) => {
            const isAnnual = label === "Annual";
            const active = annual === isAnnual;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setAnnual(isAnnual)}
                style={{
                  padding: "9px 22px",
                  borderRadius: "var(--radius-pill)",
                  border: "none",
                  background: active ? "var(--g-ink)" : "transparent",
                  color: active ? "#fff" : "var(--g-ink)",
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--g-green-text)" }}>Save 20%</span>
      </div>

      {/* Plans */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22, alignItems: "stretch", textAlign: "left" }} className="pricing-grid">
        <PlanCard
          name="Free"
          price="$0"
          period="/ month"
          tagline={`${FREE_PLAN.creditsPerMonth} credits a month, free forever.`}
          features={[`${FREE_PLAN.creditsPerMonth} lead credits per month`, ...FREE_FEATURES]}
          cta="Get Started"
          ctaHref="/login"
        />

        {/* Pro — the sized one */}
        <div
          style={{
            background: "var(--g-green-mint)",
            border: "1.5px solid var(--g-green)",
            borderRadius: "var(--radius-lg)",
            padding: 30,
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: -13,
              left: "50%",
              transform: "translateX(-50%)",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 14px",
              borderRadius: "var(--radius-pill)",
              background: "var(--g-green-darker)",
              color: "#fff",
              fontSize: 11.5,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            <StarIcon size={11} color="#fff" /> Most Popular
          </span>

          <div style={{ fontSize: 19, fontWeight: 800, color: "var(--g-green-text)", marginBottom: 14 }}>Pro</div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: "var(--g-ink)", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{money(proPrice)}</span>
            <span style={{ fontSize: 14, color: "var(--g-gray-500)" }}>/ month</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", minHeight: 18, marginBottom: 16 }}>
            {annual ? `Billed annually · ${money(tier.monthlyUsd)}/mo if paid monthly` : "Billed monthly · cancel anytime"}
          </div>

          {/* The credit selector */}
          <label htmlFor="pro-credits" style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--g-green-text)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 7 }}>
            Choose your monthly credits
          </label>
          <div style={{ position: "relative", marginBottom: 10 }}>
            <select
              id="pro-credits"
              value={tierIndex}
              onChange={(e) => setTierIndex(Number(e.target.value))}
              style={{
                width: "100%",
                appearance: "none",
                padding: "13px 40px 13px 15px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--g-green)",
                background: "var(--g-white)",
                fontSize: 14.5,
                fontWeight: 700,
                color: "var(--g-ink)",
                cursor: "pointer",
                fontFamily: "inherit",
                outline: "none",
              }}
            >
              {PAID_PLANS.map((p, i) => (
                <option key={p.id} value={i}>
                  {p.creditsPerMonth.toLocaleString("en-IN")} credits / month
                </option>
              ))}
            </select>
            <span style={{ position: "absolute", right: 15, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex" }}>
              <ChevronDownIcon size={15} color="var(--g-green-text)" />
            </span>
          </div>

          <div style={{ fontSize: 12.5, color: "var(--g-ink-soft)", marginBottom: 20, minHeight: 18, fontVariantNumeric: "tabular-nums" }}>
            Works out to <strong style={{ color: "var(--g-green-text)" }}>${perThousand.toFixed(2)} per 1,000 leads</strong>
          </div>

          <div style={{ height: 1, background: "rgba(20,32,51,0.1)", marginBottom: 18 }} />

          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 11 }}>
            <FeatureRow>{tier.creditsPerMonth.toLocaleString("en-IN")} lead credits per month</FeatureRow>
            {PRO_FEATURES.map((f) => (
              <FeatureRow key={f}>{f}</FeatureRow>
            ))}
          </div>

          <Link
            href="/login"
            style={{
              display: "block",
              textAlign: "center",
              padding: "14px 0",
              borderRadius: "var(--radius-sm)",
              background: "var(--g-green-darker)",
              color: "#fff",
              fontSize: 14.5,
              fontWeight: 700,
              textDecoration: "none",
              marginTop: 24,
            }}
          >
            Get Started
          </Link>
        </div>

        <PlanCard name="Agency" price="Custom" period="" tagline="Built for agencies & teams." features={AGENCY_FEATURES} cta="Talk to Sales" ctaHref="/contact" />
      </div>

      <p style={{ fontSize: 13.5, color: "var(--g-gray-500)", textAlign: "center", marginTop: 28 }}>
        Searching the map is always free · You only spend a credit when you unlock a lead
      </p>

      {/* Comparison */}
      <h2 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 800, color: "var(--g-ink)", textAlign: "center", margin: "72px 0 28px", letterSpacing: "-0.02em" }}>Compare every plan</h2>
      <div style={{ overflowX: "auto", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", background: "var(--g-white)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620, textAlign: "left" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>Feature</th>
              <th style={thStyle}>Free</th>
              <th style={thStyle}>Pro</th>
              <th style={thStyle}>Agency</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((c) => (
              <tr key={c.row}>
                <td style={{ ...tdStyle, fontWeight: 600, color: "var(--g-ink)" }}>{c.row}</td>
                <Cell value={c.free} />
                <Cell value={c.pro} />
                <Cell value={c.agency} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Cell({ value }: { value: string | boolean }) {
  return (
    <td style={{ ...tdStyle, textAlign: "center" }}>
      {value === true ? (
        <CheckIcon size={16} color="var(--g-green)" />
      ) : value === false ? (
        <span style={{ color: "var(--g-gray-300)" }}>—</span>
      ) : (
        value
      )}
    </td>
  );
}

function FeatureRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13.5, color: "var(--g-ink)", lineHeight: 1.45 }}>
      <span style={{ flexShrink: 0, marginTop: 2 }}>
        <CheckIcon size={15} color="var(--g-green-dark)" />
      </span>
      {children}
    </div>
  );
}

function PlanCard({
  name,
  price,
  period,
  tagline,
  features,
  cta,
  ctaHref,
}: {
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  cta: string;
  ctaHref: string;
}) {
  return (
    <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", padding: 30, display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 19, fontWeight: 800, color: "var(--g-ink)", marginBottom: 14 }}>{name}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 40, fontWeight: 800, color: "var(--g-ink)", letterSpacing: "-0.03em" }}>{price}</span>
        {period && <span style={{ fontSize: 14, color: "var(--g-gray-500)" }}>{period}</span>}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginBottom: 24, minHeight: 18 }}>{tagline}</div>

      <div style={{ height: 1, background: "var(--g-border)", marginBottom: 18 }} />

      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 11 }}>
        {features.map((f) => (
          <FeatureRow key={f}>{f}</FeatureRow>
        ))}
      </div>

      <Link
        href={ctaHref}
        style={{
          display: "block",
          textAlign: "center",
          padding: "14px 0",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--g-border)",
          color: "var(--g-ink)",
          fontSize: 14.5,
          fontWeight: 700,
          textDecoration: "none",
          marginTop: 24,
        }}
      >
        {cta}
      </Link>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "14px 16px",
  fontSize: 13,
  fontWeight: 800,
  color: "var(--g-ink)",
  borderBottom: "1px solid var(--g-border)",
  background: "var(--g-cream)",
  textAlign: "center",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "13px 16px",
  fontSize: 13.5,
  color: "var(--g-ink-soft)",
  borderBottom: "1px solid var(--g-border)",
};
