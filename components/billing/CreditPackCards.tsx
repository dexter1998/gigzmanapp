"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CREDIT_COST, CREDIT_PACKS, FREE_SIGNUP_CREDITS, PLAN_FEATURES, PLAN_PERIOD_DAYS, JOB_SEEKER_DISCOUNT_PCT, formatINR, jobSeekerDiscountPctFor, jobSeekerPricePaise, rupees } from "@/lib/credits/pricing";
import { CheckIcon, HelpIcon } from "@/components/icons";

/**
 * The pack line-up, rendered identically wherever pricing is shown — landing page, /pricing, and
 * the in-app buy modal. All three read CREDIT_PACKS, so a price can only be changed in one place;
 * the previous split (a hardcoded landing table, a separate plans-config, a third list in the
 * modal) is how the marketing site ended up quoting prices the product never charged.
 *
 * `onBuy` is what separates the surfaces: signed-in callers pass a handler that opens checkout,
 * logged-out ones leave it undefined and the cards link to sign-up instead.
 *
 * Checks the viewer's own dashboard_mode (not a prop) so every surface — landing page, /pricing,
 * the in-app modal — shows the same real price a jobs-mode account would actually be charged (see
 * jobSeekerPricePaise, wired into app/api/payments/order/route.ts). Fails silently to "no
 * discount" for a logged-out visitor; showing the wrong price would be worse than showing the
 * standard one.
 */
function useJobSeekerDiscount(): boolean {
  const [discount, setDiscount] = useState(false);
  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setDiscount(d?.profile?.dashboard_mode === "jobs"))
      .catch(() => {});
  }, []);
  return discount;
}

/** Credits are abstract; leads are not. Every card leads with how many leads it actually buys,
 * derived from the real rate card so the two can't drift apart. */
const leadsFor = (credits: number) => Math.floor(credits / CREDIT_COST.lead_unlock);

export function CreditPackCards({
  onBuy,
  busyPackId,
  disabled,
  showFree = true,
  minCardWidth = 240,
}: {
  onBuy?: (packId: string) => void;
  busyPackId?: string | null;
  disabled?: boolean;
  showFree?: boolean;
  /** Narrower inside the modal, where three cards have to share less width than a page. */
  minCardWidth?: number;
}) {
  const jobSeekerDiscount = useJobSeekerDiscount();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {jobSeekerDiscount && <JobSeekerDiscountBadge />}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${minCardWidth}px, 1fr))`, gap: 18, alignItems: "stretch", textAlign: "left" }}>
        {showFree && (
          <Card
            title="Free"
            price="₹0"
            priceNote="once, when you sign up"
            headline={`${FREE_SIGNUP_CREDITS} credits`}
            features={[
              `≈ ${leadsFor(FREE_SIGNUP_CREDITS)} leads with contact details`,
              "Unlimited search in scanned areas",
              "5 new-area searches a day",
              "CSV export",
              "Build & test campaigns",
            ]}
            cta={onBuy ? null : { label: "Get started", href: "/login" }}
          />
        )}

        {CREDIT_PACKS.map((pack) => {
          const finalPaise = jobSeekerDiscount ? jobSeekerPricePaise(pack) : pack.pricePaise;
          // Actual per-pack pct, not the flat headline number — the 10k pack's discount is capped
          // below JOB_SEEKER_DISCOUNT_PCT to stay above CREDIT_FLOOR_INR (see jobSeekerPricePaise).
          const pctOff = jobSeekerDiscount ? jobSeekerDiscountPctFor(pack) : 0;
          return (
            <Card
              key={pack.id}
              title={pack.label}
              price={formatINR(finalPaise)}
              fullPrice={jobSeekerDiscount ? formatINR(pack.pricePaise) : undefined}
              per="/month"
              priceNote={
                jobSeekerDiscount
                  ? `${pctOff}% off · ₹${(rupees(finalPaise) / pack.credits).toFixed(2)} per credit`
                  : `₹${(rupees(finalPaise) / pack.credits).toFixed(2)} per credit`
              }
              headline={`${pack.credits.toLocaleString("en-IN")} credits`}
              badge={pack.badge}
              highlighted={pack.badge === "Most popular"}
              features={[
                `≈ ${leadsFor(pack.credits).toLocaleString("en-IN")} leads with contact details`,
                ...PLAN_FEATURES,
                "Unlimited search in scanned areas",
                "Credits never expire",
                ...(pack.credits >= 10_000 ? ["Priority support"] : []),
              ]}
              cta={
                onBuy
                  ? { label: busyPackId === pack.id ? "Opening…" : `Get ${pack.label}`, onClick: () => onBuy(pack.id), disabled }
                  : { label: "Get started", href: "/login" }
              }
            />
          );
        })}

      </div>
    </div>
  );
}

function JobSeekerDiscountBadge() {
  const [showNote, setShowNote] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "var(--g-green-darker)", padding: "5px 12px", borderRadius: "var(--radius-pill)" }}>
        Up to {JOB_SEEKER_DISCOUNT_PCT}% off — job seekers only
      </span>
      <button
        type="button"
        aria-label="Why job seekers get this discount"
        onMouseEnter={() => setShowNote(true)}
        onMouseLeave={() => setShowNote(false)}
        onClick={() => setShowNote((v) => !v)}
        style={{ display: "inline-flex", background: "none", border: "none", cursor: "pointer", padding: 2 }}
      >
        <HelpIcon size={15} color="var(--g-gray-500)" />
      </button>
      {showNote && (
        <div
          role="tooltip"
          style={{
            position: "absolute", top: "calc(100% + 8px)", left: 0, width: 260, background: "var(--g-ink)",
            color: "#fff", fontSize: 12, lineHeight: 1.5, padding: "10px 14px", borderRadius: "var(--radius-sm)",
            zIndex: 5, textAlign: "left",
          }}
        >
          Only for job seekers — your account is set to Jobs mode, so every pack here is discounted.
          Agencies and freelancers on the leads side pay the standard rate card.
        </div>
      )}
    </div>
  );
}

/** Quoted rather than priced, so it sits below the grid instead of pretending to be a fifth
 * comparable card. */
export function EnterpriseBand() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 20,
        marginTop: 18,
        padding: "22px 26px",
        background: "var(--g-white)",
        border: "1px solid var(--g-border)",
        borderRadius: "var(--radius-lg)",
        textAlign: "left",
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--g-ink)", marginBottom: 6 }}>Enterprise — go custom</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 22px" }}>
          {["Volume discounts", "Invoicing & PO", "API access", "Dedicated support"].map((f) => (
            <span key={f} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--g-ink-soft)" }}>
              <CheckIcon size={13} color="var(--g-green)" /> {f}
            </span>
          ))}
        </div>
      </div>
      <Link
        href="/contact"
        style={{
          padding: "12px 26px",
          borderRadius: "var(--radius-sm)",
          background: "var(--g-ink)",
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Contact us
      </Link>
    </div>
  );
}

type Cta = { label: string; href?: string; onClick?: () => void; disabled?: boolean };

type Feature = string | { label: string; soon?: boolean };

function Card({
  title,
  price,
  per,
  fullPrice,
  priceNote,
  headline,
  features,
  badge,
  highlighted,
  cta,
}: {
  title: string;
  price: string;
  /** Billing period suffix next to the price ("/month"). */
  per?: string;
  /** Present only when a job-seeker discount actually reduced the price — the 10k pack's real
   * discount is capped below JOB_SEEKER_DISCOUNT_PCT (see jobSeekerPricePaise), so this is read
   * from the price difference itself rather than assumed to always be the flat headline number. */
  fullPrice?: string;
  priceNote: string;
  headline: string;
  features: Feature[];
  badge?: string;
  highlighted?: boolean;
  cta: Cta | null;
}) {
  return (
    <div
      style={{
        position: "relative",
        background: highlighted ? "var(--g-green-mint)" : "var(--g-white)",
        border: highlighted ? "1.5px solid var(--g-green)" : "1px solid var(--g-border)",
        borderRadius: "var(--radius-lg)",
        padding: 26,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {badge && (
        <span
          style={{
            position: "absolute",
            top: -11,
            left: 22,
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 11px",
            borderRadius: "var(--radius-pill)",
            background: highlighted ? "var(--g-green-dark)" : "var(--g-ink)",
            color: "#fff",
            whiteSpace: "nowrap",
          }}
        >
          {badge}
        </span>
      )}

      <div style={{ fontSize: 14, fontWeight: 600, color: highlighted ? "var(--g-green-text)" : "var(--g-ink)", marginBottom: 14 }}>
        {title}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 30, fontWeight: 600, color: "var(--g-ink)", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
          {price}
        </span>
        {per && <span style={{ fontSize: 13, color: "var(--g-gray-500)" }}>{per}</span>}
        {fullPrice && (
          <span style={{ fontSize: 14, color: "var(--g-gray-500)", textDecoration: "line-through" }}>{fullPrice}</span>
        )}
      </div>
      <div style={{ fontSize: 12, color: "var(--g-gray-500)", marginTop: 4, minHeight: 18 }}>{priceNote}</div>

      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--g-ink)", margin: "18px 0 16px" }}>{headline}</div>

      <div style={{ height: 1, background: highlighted ? "rgba(20,32,51,0.1)" : "var(--g-border)", marginBottom: 16 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 11, flex: 1 }}>
        {features.map((raw) => {
          const f = typeof raw === "string" ? { label: raw, soon: false } : raw;
          return (
            <div key={f.label} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: f.soon ? "var(--g-gray-500)" : "var(--g-ink)", lineHeight: 1.45 }}>
              <span style={{ flexShrink: 0, marginTop: 2 }}>
                <CheckIcon size={14} color={f.soon ? "var(--g-gray-300)" : highlighted ? "var(--g-green-dark)" : "var(--g-green)"} />
              </span>
              <span>
                {f.label}
                {f.soon && <SoonTag />}
              </span>
            </div>
          );
        })}
      </div>

      {cta &&
        (cta.href ? (
          <Link href={cta.href} style={{ ...btnStyle(!!highlighted), textAlign: "center", textDecoration: "none", display: "block" }}>
            {cta.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={cta.onClick}
            disabled={cta.disabled}
            style={{ ...btnStyle(!!highlighted), cursor: cta.disabled ? "not-allowed" : "pointer", opacity: cta.disabled ? 0.55 : 1, fontFamily: "inherit" }}
          >
            {cta.label}
          </button>
        ))}
    </div>
  );
}

/** The small neutral "Soon" badge used for features that are listed but not live yet. */
export function SoonTag() {
  return (
    <span
      style={{
        display: "inline-block", marginLeft: 6, verticalAlign: "1px", fontSize: 11, fontWeight: 500, lineHeight: "16px",
        padding: "0 6px", borderRadius: 4, background: "var(--g-gray-100)", color: "var(--g-gray-500)",
        border: "1px solid var(--g-border)", whiteSpace: "nowrap",
      }}
    >
      Coming soon
    </span>
  );
}

const btnStyle = (highlighted: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "13px 0",
  marginTop: 24,
  borderRadius: "var(--radius-sm)",
  border: highlighted ? "none" : "1px solid var(--g-border)",
  background: highlighted ? "var(--g-green-dark)" : "var(--g-white)",
  color: highlighted ? "#fff" : "var(--g-ink)",
  fontSize: 14,
  fontWeight: 600,
});

/** Shown under the cards on every surface. A plan is a one-off 30-day payment, not an auto-renewing
 * subscription — and the credits outlive the plan — so the footnote says both. */
export function CreditPackFootnote() {
  return (
    <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontSize: 12, color: "var(--g-gray-500)", marginTop: 20, textAlign: "center", flexWrap: "wrap" }}>
      <CheckIcon size={14} color="var(--g-green)" />
      {PLAN_PERIOD_DAYS}-day plan · No auto-renew · Credits never expire · UPI, cards &amp; net banking
    </p>
  );
}
