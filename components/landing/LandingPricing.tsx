import Link from "next/link";
import { OrigamiDecoration } from "./OrigamiDecoration";
import { CreditPackCards, CreditPackFootnote } from "@/components/billing/CreditPackCards";
import { CREDIT_COST } from "@/lib/credits/pricing";

/**
 * Landing-page pricing. The cards come from CREDIT_PACKS, the same list the in-app buy modal and
 * /pricing render — this section used to carry its own hardcoded plan table, which is how the
 * marketing site ended up advertising prices the product never actually charged.
 */
export function LandingPricing() {
  return (
    <section id="pricing" style={{ position: "relative", padding: "96px 24px", textAlign: "center", overflow: "hidden" }}>
      <OrigamiDecoration variant="corner-left" opacity={0.3} width="34vw" />
      <OrigamiDecoration variant="corner-right" opacity={0.3} width="34vw" />
      <div style={{ maxWidth: 1180, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--g-green-text)", marginBottom: 14 }}>• Pricing</div>
        <h2 style={{ fontSize: "clamp(30px, 4.5vw, 46px)", fontWeight: 800, color: "var(--g-ink)", margin: "0 0 12px" }}>
          Pay for the leads you <span style={{ color: "var(--g-green)" }}>actually use.</span>
        </h2>
        <p style={{ fontSize: 16, color: "var(--g-gray-500)", margin: "0 auto 48px", maxWidth: 560, lineHeight: 1.6 }}>
          No subscription. Buy credits once and spend them only when Mantis does real work —
          searching an area you&apos;ve already covered is always free.
        </p>

        <CreditPackCards />
        <CreditPackFootnote />

        {/* The two prices that decide whether the packs read as expensive. Stated here rather than
            left to /pricing, because this is where most people form the impression. */}
        <div
          style={{
            display: "inline-flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 28,
            marginTop: 32,
            padding: "16px 26px",
            background: "var(--g-white)",
            border: "1px solid var(--g-border)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <Priced credits={CREDIT_COST.lead_unlock} label="to add a lead with its contact" />
          <Priced credits={0} label="to search an area already scanned" />
        </div>

        <div style={{ marginTop: 26 }}>
          <Link href="/pricing" style={{ fontSize: 14, fontWeight: 700, color: "var(--g-green-text)", textDecoration: "none" }}>
            See exactly what credits buy →
          </Link>
        </div>
      </div>
    </section>
  );
}

function Priced({ credits, label }: { credits: number; label: string }) {
  return (
    <span style={{ display: "flex", alignItems: "baseline", gap: 7, fontSize: 13.5, color: "var(--g-gray-500)" }}>
      <strong style={{ fontSize: 15, fontWeight: 800, color: credits === 0 ? "var(--g-green-text)" : "var(--g-ink)" }}>
        {credits === 0 ? "Free" : `${credits} credits`}
      </strong>
      {label}
    </span>
  );
}
