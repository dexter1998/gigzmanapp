import Link from "next/link";
import { CheckIcon } from "@/components/icons";
import { OrigamiDecoration } from "./OrigamiDecoration";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "/ month",
    tagline: "Start today, free forever.",
    features: ["50 leads / month", "Basic filters", "CSV export"],
    cta: "Get Started",
    ctaStyle: "outline" as const,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/ month",
    tagline: "For growing agencies.",
    features: ["2,000 leads / month", "Advanced filters", "Verified contacts", "Bulk export", "Priority support"],
    cta: "Start Free Trial",
    ctaStyle: "solid" as const,
    highlighted: true,
  },
  {
    name: "Agency",
    price: "Custom",
    period: "",
    tagline: "For large teams & scale.",
    features: ["Custom lead volume", "Dedicated Account Manager", "API access", "White-label export"],
    cta: "Talk to Sales",
    ctaStyle: "outline" as const,
  },
];

export function LandingPricing() {
  return (
    <section id="pricing" style={{ position: "relative", padding: "96px 24px", textAlign: "center", overflow: "hidden" }}>
      <OrigamiDecoration variant="corner-left" opacity={0.3} width="34vw" />
      <OrigamiDecoration variant="corner-right" opacity={0.3} width="34vw" />
      <div style={{ maxWidth: 1080, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--g-green-text)", marginBottom: 14 }}>• Pricing</div>
        <h2 style={{ fontSize: "clamp(30px, 4.5vw, 46px)", fontWeight: 800, color: "var(--g-ink)", margin: "0 0 12px" }}>
          Simple pricing. <span style={{ color: "var(--g-green)" }}>More clients.</span>
        </h2>
        <p style={{ fontSize: 16, color: "var(--g-gray-500)", margin: "0 0 52px" }}>Start free. Upgrade when your pipeline grows.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 28, textAlign: "left", alignItems: "stretch" }}>
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              style={{
                background: plan.highlighted ? "var(--g-green-mint)" : "var(--g-white)",
                border: plan.highlighted ? "1px solid var(--g-green)" : "1px solid var(--g-border)",
                borderRadius: "var(--radius-lg)",
                padding: 36,
                minHeight: 540,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: plan.highlighted ? "var(--g-green-text)" : "var(--g-ink)" }}>{plan.name}</div>
                {plan.highlighted && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--g-green-text)", border: "1px solid var(--g-green)", padding: "3px 10px", borderRadius: "var(--radius-pill)" }}>
                    Most Popular
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5, margin: "16px 0 6px" }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: "var(--g-ink)" }}>{plan.price}</span>
                {plan.period && <span style={{ fontSize: 14, color: "var(--g-gray-500)" }}>{plan.period}</span>}
              </div>
              <div style={{ fontSize: 13.5, color: "var(--g-gray-500)", marginBottom: 26 }}>{plan.tagline}</div>

              <div style={{ height: 1, background: "var(--g-border)", marginBottom: 24 }} />

              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                {plan.features.map((f, i) => (
                  <div
                    key={f}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 14,
                      color: "var(--g-ink)",
                      padding: "12px 0",
                      borderBottom: i < plan.features.length - 1 ? "1px solid var(--g-border)" : "none",
                    }}
                  >
                    <CheckIcon size={16} /> {f}
                  </div>
                ))}
              </div>

              <Link
                href="/login"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "14px 0",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 14.5,
                  fontWeight: 700,
                  textDecoration: "none",
                  marginTop: 28,
                  background: plan.ctaStyle === "solid" ? "var(--g-green-dark)" : "transparent",
                  color: plan.ctaStyle === "solid" ? "#fff" : "var(--g-ink)",
                  border: plan.ctaStyle === "outline" ? "1px solid var(--g-border)" : "none",
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 13.5, color: "var(--g-gray-500)", marginTop: 32 }}>No credit card required · Cancel anytime</div>
      </div>
    </section>
  );
}
