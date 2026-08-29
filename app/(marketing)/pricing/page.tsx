import type { Metadata } from "next";
import Link from "next/link";
import { PLANS } from "@/components/plans-config";
import { COMPANY } from "@/lib/company";
import { PageHeader, Prose } from "@/components/marketing/Shell";

export const metadata: Metadata = {
  title: `Pricing — ${COMPANY.brandLong}`,
  description:
    "Mantis pricing. Start free with 20 credits a month, or pick a plan sized to how many local leads you actually unlock. No contracts.",
  alternates: { canonical: `${COMPANY.site}/pricing` },
};

const FAQ = [
  {
    q: "What is a credit?",
    a: "One credit unlocks one lead — its name, full address and phone number. Searching the map, seeing how many businesses are in an area and reading their heat score costs nothing; you only spend a credit when you decide a specific lead is worth contacting.",
  },
  {
    q: "Do unused credits roll over?",
    a: "No. Credits reset at the start of each billing period, so pick the plan that matches what you actually work through in a month rather than stockpiling.",
  },
  {
    q: "Can I change plan later?",
    a: "Yes, up or down, at any time. Changes apply from your next billing period.",
  },
  {
    q: "Is there a contract?",
    a: "No. Plans are monthly and you can cancel whenever you like — your plan simply runs to the end of the period you have paid for.",
  },
];

export default function PricingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title="Pay for the leads you actually use"
        intro="Searching is free. Credits are only spent when you unlock a lead you want to contact — so an afternoon spent exploring the map costs you nothing."
      />

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 24px 0" }}>
        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}
          className="pricing-grid"
        >
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              style={{
                background: "var(--g-white)",
                border: plan.badge ? "2px solid var(--g-green)" : "1px solid var(--g-border)",
                borderRadius: 18,
                padding: 26,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {plan.badge && (
                <div
                  style={{
                    alignSelf: "flex-start",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    color: "var(--g-green-text)",
                    background: "var(--g-green-mint)",
                    borderRadius: 999,
                    padding: "5px 11px",
                    marginBottom: 12,
                  }}
                >
                  {plan.badge}
                </div>
              )}
              <div style={{ fontSize: 17, fontWeight: 800, color: "var(--g-ink)" }}>{plan.name}</div>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, color: "var(--g-ink)", marginTop: 10 }}>
                {plan.price}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--g-green-text)", marginTop: 6 }}>
                {plan.credits}
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--g-ink-soft)", marginTop: 12, flex: 1 }}>
                {plan.desc}
              </p>
              <Link
                href="/login"
                style={{
                  marginTop: 18,
                  display: "block",
                  textAlign: "center",
                  borderRadius: 12,
                  padding: "13px 18px",
                  fontSize: 14.5,
                  fontWeight: 700,
                  textDecoration: "none",
                  background: plan.badge ? "var(--g-ink)" : "var(--g-white)",
                  color: plan.badge ? "#fff" : "var(--g-ink)",
                  border: plan.badge ? "none" : "1px solid var(--g-border)",
                }}
              >
                {plan.id === "free" ? "Start free" : "Choose " + plan.name}
              </Link>
            </div>
          ))}
        </div>
      </div>

      <Prose>
        <h2>Questions</h2>
        {FAQ.map((f) => (
          <div key={f.q} style={{ marginBottom: 22 }}>
            <h3 style={{ fontSize: 16.5, fontWeight: 800, margin: "0 0 6px", color: "var(--g-ink)" }}>{f.q}</h3>
            <p style={{ margin: 0 }}>{f.a}</p>
          </div>
        ))}
        <p style={{ marginTop: 30 }}>
          Running Mantis across a whole team, or want to resell it to your own clients? Look at{" "}
          <Link href="/partner">partner access</Link>, or email{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
        </p>
      </Prose>

      {/* FAQPage markup so these answers are eligible for rich results — they are real answers to
          the questions people actually ask before signing up, not keyword filler. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({
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
