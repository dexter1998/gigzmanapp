"use client";

import Link from "next/link";
import { CREDIT_COST, CREDIT_PACKS, FREE_MONTHLY_CREDITS, formatINR, rupees } from "@/lib/credits/pricing";
import { CheckIcon } from "@/components/icons";

/**
 * The pack line-up, rendered identically wherever pricing is shown — landing page, /pricing, and
 * the in-app buy modal. All three read CREDIT_PACKS, so a price can only be changed in one place;
 * the previous split (a hardcoded landing table, a separate plans-config, a third list in the
 * modal) is how the marketing site ended up quoting prices the product never charged.
 *
 * `onBuy` is what separates the surfaces: signed-in callers pass a handler that opens checkout,
 * logged-out ones leave it undefined and the cards link to sign-up instead.
 */

/** Credits are abstract; leads are not. Every card leads with how many leads it actually buys,
 * derived from the real rate card so the two can't drift apart. */
const leadsFor = (credits: number) => Math.floor(credits / CREDIT_COST.lead_unlock);

export function CreditPackCards({
  onBuy,
  busyPackId,
  disabled,
  showFree = true,
}: {
  onBuy?: (packId: string) => void;
  busyPackId?: string | null;
  disabled?: boolean;
  showFree?: boolean;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18, alignItems: "stretch", textAlign: "left" }}>
      {showFree && (
        <Card
          title="Free"
          price="₹0"
          priceNote="every month, forever"
          headline={`${FREE_MONTHLY_CREDITS} credits`}
          features={[
            `≈ ${leadsFor(FREE_MONTHLY_CREDITS)} leads with contact details`,
            "Unlimited search in scanned areas",
            "5 new-area searches a day",
            "CSV export",
          ]}
          cta={onBuy ? null : { label: "Get started", href: "/login" }}
        />
      )}

      {CREDIT_PACKS.map((pack) => (
        <Card
          key={pack.id}
          title={pack.label}
          price={formatINR(pack.pricePaise)}
          priceNote={`₹${(rupees(pack.pricePaise) / pack.credits).toFixed(2)} per credit`}
          headline={`${pack.credits.toLocaleString("en-IN")} credits`}
          badge={pack.badge}
          highlighted={pack.badge === "Most popular"}
          features={[
            `≈ ${leadsFor(pack.credits).toLocaleString("en-IN")} leads with contact details`,
            "Unlimited search in scanned areas",
            "Credits never expire",
            "Buy again any time",
            ...(pack.credits >= 10_000 ? ["Priority support"] : []),
          ]}
          cta={
            onBuy
              ? { label: busyPackId === pack.id ? "Opening…" : "Buy credits", onClick: () => onBuy(pack.id), disabled }
              : { label: "Get started", href: "/login" }
          }
        />
      ))}

      <Card
        title="Enterprise"
        price="Talk to us"
        priceNote="volume pricing"
        headline="Custom credits"
        features={["Volume discounts", "Invoicing & PO", "API access", "Dedicated support"]}
        cta={{ label: "Contact us", href: "/contact" }}
      />
    </div>
  );
}

type Cta = { label: string; href?: string; onClick?: () => void; disabled?: boolean };

function Card({
  title,
  price,
  priceNote,
  headline,
  features,
  badge,
  highlighted,
  cta,
}: {
  title: string;
  price: string;
  priceNote: string;
  headline: string;
  features: string[];
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
            fontSize: 10.5,
            fontWeight: 700,
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

      <div style={{ fontSize: 14, fontWeight: 800, color: highlighted ? "var(--g-green-text)" : "var(--g-ink)", marginBottom: 14 }}>
        {title}
      </div>

      <div style={{ fontSize: 30, fontWeight: 800, color: "var(--g-ink)", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
        {price}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginTop: 4, minHeight: 18 }}>{priceNote}</div>

      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--g-ink)", margin: "18px 0 16px" }}>{headline}</div>

      <div style={{ height: 1, background: highlighted ? "rgba(20,32,51,0.1)" : "var(--g-border)", marginBottom: 16 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 11, flex: 1 }}>
        {features.map((f) => (
          <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13.5, color: "var(--g-ink)", lineHeight: 1.45 }}>
            <span style={{ flexShrink: 0, marginTop: 2 }}>
              <CheckIcon size={14} color={highlighted ? "var(--g-green-dark)" : "var(--g-green)"} />
            </span>
            {f}
          </div>
        ))}
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

const btnStyle = (highlighted: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "13px 0",
  marginTop: 24,
  borderRadius: "var(--radius-sm)",
  border: highlighted ? "none" : "1px solid var(--g-border)",
  background: highlighted ? "var(--g-green-dark)" : "var(--g-white)",
  color: highlighted ? "#fff" : "var(--g-ink)",
  fontSize: 14,
  fontWeight: 700,
});

/** Shown under the cards on every surface — the reassurance that stops "credits" reading as a
 * subscription, and states outright that a pack can be bought again mid-month. */
export function CreditPackFootnote() {
  return (
    <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontSize: 12.5, color: "var(--g-gray-500)", marginTop: 20, textAlign: "center" }}>
      <CheckIcon size={14} color="var(--g-green)" />
      Credits never expire · No subscription · Top up as often as you like · UPI, cards &amp; net banking
    </p>
  );
}
