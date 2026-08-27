import Link from "next/link";
import { CheckIcon } from "@/components/icons";

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
    <section id="pricing" style={{ position: "relative", padding: "80px 24px", textAlign: "center" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--g-green-text)", marginBottom: 12 }}>• Pricing</div>
        <h2 style={{ fontSize: "clamp(28px, 4.5vw, 42px)", fontWeight: 800, color: "var(--g-ink)", margin: "0 0 10px" }}>
          Simple pricing. <span style={{ color: "var(--g-green)" }}>More clients.</span>
        </h2>
        <p style={{ fontSize: 14.5, color: "var(--g-gray-500)", margin: "0 0 44px" }}>Start free. Upgrade when your pipeline grows.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24, textAlign: "left", alignItems: "stretch" }}>
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              style={{
                background: plan.highlighted ? "var(--g-green-mint)" : "var(--g-white)",
                border: plan.highlighted ? "1px solid var(--g-green)" : "1px solid var(--g-border)",
                borderRadius: "var(--radius-lg)",
                padding: 28,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: plan.highlighted ? "var(--g-green-text)" : "var(--g-ink)" }}>{plan.name}</div>
                {plan.highlighted && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--g-green-text)", border: "1px solid var(--g-green)", padding: "2px 8px", borderRadius: "var(--radius-pill)" }}>
                    Most Popular
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "10px 0 4px" }}>
                <span style={{ fontSize: 34, fontWeight: 800, color: "var(--g-ink)" }}>{plan.price}</span>
                {plan.period && <span style={{ fontSize: 13, color: "var(--g-gray-500)" }}>{plan.period}</span>}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginBottom: 20 }}>{plan.tagline}</div>

              <div style={{ height: 1, background: "var(--g-border)", marginBottom: 18 }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24, flex: 1 }}>
                {plan.features.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--g-ink)" }}>
                    <CheckIcon size={15} /> {f}
                  </div>
                ))}
              </div>

              <Link
                href="/login"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "12px 0",
                  borderRadius: "var(--radius-pill)",
                  fontSize: 13.5,
                  fontWeight: 700,
                  textDecoration: "none",
                  background: plan.ctaStyle === "solid" ? "var(--g-green)" : "transparent",
                  color: plan.ctaStyle === "solid" ? "#fff" : "var(--g-ink)",
                  border: plan.ctaStyle === "outline" ? "1px solid var(--g-border)" : "none",
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginTop: 28 }}>No credit card required · Cancel anytime</div>
      </div>
    </section>
  );
}
