import type { Metadata } from "next";
import { ogImageMeta } from "@/lib/og";
import Image from "next/image";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { CREDIT_PACKS, FREE_MONTHLY_CREDITS, rupees } from "@/lib/credits/pricing";
import { PricingPlans } from "@/components/marketing/PricingPlans";
import { EyebrowPill, FaqAccordion, MarketingCta, OrigamiFloor, SectionHeading } from "@/components/marketing/MarketingPieces";
import { UserIcon, GlobeIcon, ZapIcon, PinIcon, TableIcon, ShieldIcon } from "@/components/icons";

export const metadata: Metadata = {
  // "cost" earns its place in the title: it is the phrase people actually type when comparing
  // tools, and the old title spent those characters on "for agencies & freelancers" instead.
  title: { absolute: `Pricing & Lead Credits Cost | ${COMPANY.brandLong} for Agencies` },
  description: `Compare ${COMPANY.brandLong} plans: ${FREE_MONTHLY_CREDITS} free credits a month, then packs from ₹1,999. Pay only for the local leads you unlock — no seats, no contracts. Start free.`,
  keywords: [
    "Mantis Ai pricing",
    "lead generation pricing India",
    "lead credits",
    "agency lead software cost",
    "local lead tool pricing",
  ],
  alternates: { canonical: `${COMPANY.site}/pricing` },
  openGraph: {
    images: ogImageMeta({
      v: "pricing",
      eyebrow: "Simple pricing",
      t1: "More leads. More clients.",
      t2: "No complexity.",
      cta: "Start free →",
      url: "mantisai.in/pricing",
    }),
    title: `${COMPANY.brandLong} Pricing — Pay for Leads, Not Seats`,
    description: "Free forever plan, paid credit packs, and custom Agency plans. Credits are spent only when you unlock a lead.",
    url: `${COMPANY.site}/pricing`,
    siteName: COMPANY.brand,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${COMPANY.brandLong} Pricing`,
    description: "Searching is free. Credits are only spent when you unlock a lead you want to contact.",
  },
};

const AUDIENCES = [
  { icon: UserIcon, title: "Freelancers", desc: "Find local businesses and win more client projects." },
  { icon: GlobeIcon, title: "Web Development Studios", desc: "Fuel your pipeline with qualified, ready-to-reach prospects." },
  { icon: ZapIcon, title: "Marketing Agencies", desc: "Discover new clients and scale your outreach faster." },
  { icon: PinIcon, title: "Multi-location Teams", desc: "Manage leads across cities with centralised access." },
  { icon: TableIcon, title: "Sales Teams", desc: "Empower reps with high-intent leads and smart insights." },
  { icon: ShieldIcon, title: "Enterprise Partners", desc: "Unlock advanced tools, APIs and white-label exports." },
];

const FAQS = [
  {
    q: "What is a credit?",
    a: "One credit unlocks one lead — its name, full address and phone number. Searching the map, seeing how many businesses are in an area and reading their heat score costs nothing; you only spend a credit when you decide a specific lead is worth contacting.",
  },
  {
    q: `Can I use ${COMPANY.brand} for free?`,
    a: `Yes. The Free plan gives you ${FREE_MONTHLY_CREDITS} credits every month with no card, and unlimited searching on top. It's enough to work one neighbourhood properly and judge the lead quality before you pay for anything.`,
  },
  {
    q: "Do unused credits roll over?",
    a: "No. Credits reset at the start of each billing period, so pick the plan that matches what you actually work through in a month rather than stockpiling.",
  },
  {
    q: "Can I change plan later?",
    a: "Yes, up or down, at any time. Changes apply from your next billing period, so you keep what you have already paid for.",
  },
  {
    q: "Is there a contract?",
    a: "No. Plans are monthly and you can cancel whenever you like — your plan simply runs to the end of the period you have paid for.",
  },
  {
    q: "Do you offer agency and enterprise plans?",
    a: "Yes. The Agency plan is quoted around your lead volume, seats and API needs, and includes a dedicated account manager. Talk to sales and we'll scope it with you.",
  },
];

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: COMPANY.brandLong,
            description: "Local lead intelligence for agencies, freelancers and sales teams.",
            url: `${COMPANY.site}/pricing`,
            brand: { "@type": "Brand", name: COMPANY.brandLong },
            offers: [
              {
                "@type": "Offer",
                name: "Free",
                price: "0",
                priceCurrency: "INR",
                url: `${COMPANY.site}/pricing`,
                description: `${FREE_MONTHLY_CREDITS} lead credits every month.`,
              },
              ...CREDIT_PACKS.map((pack) => ({
                "@type": "Offer",
                name: pack.label,
                price: String(rupees(pack.pricePaise)),
                priceCurrency: "INR",
                url: `${COMPANY.site}/pricing`,
                description: `${pack.credits.toLocaleString("en-IN")} lead credits, one-time purchase, never expire.`,
              })),
            ],
          }),
        }}
      />

      <section style={{ position: "relative", padding: "64px 24px 88px", overflow: "hidden" }}>
        <OrigamiFloor opacity={0.55} height={340} />
        <div style={{ maxWidth: 1160, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <EyebrowPill>Simple pricing</EyebrowPill>
            <h1
              className="marketing-h1"
              style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, color: "var(--g-ink)", letterSpacing: "-0.03em", lineHeight: 1.08, margin: "20px 0 14px", textWrap: "balance" }}
            >
              More leads. <span style={{ color: "var(--g-green-dark)" }}>More clients.</span> No complexity.
            </h1>
            <p style={{ fontSize: 16.5, color: "var(--g-gray-500)", margin: "0 auto", maxWidth: 560, lineHeight: 1.6 }}>
              Searching is free. Credits are only spent when you unlock a lead you want to contact — so an afternoon
              exploring the map costs you nothing.
            </p>
          </div>

          <PricingPlans />
        </div>
      </section>

      {/* Who it's for */}
      <section style={{ background: "var(--g-white)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <SectionHeading title="Built for" accent="every stage of your agency." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
            {AUDIENCES.map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.title} style={{ display: "flex", gap: 14, alignItems: "flex-start", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 22, background: "var(--g-cream)" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "var(--radius-sm)", background: "var(--g-green-mint)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon color="var(--g-green-text)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 5px" }}>{a.title}</h3>
                    <p style={{ fontSize: 13.5, color: "var(--g-gray-500)", lineHeight: 1.55, margin: 0 }}>{a.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ, with the seated mantis anchored beside it */}
      <section style={{ position: "relative", padding: "80px 24px", overflow: "hidden" }}>
        <Image
          aria-hidden="true"
          alt=""
          src="/marketing/mantis-pricing.webp"
          width={900}
          height={961}
          style={{ position: "absolute", right: "2%", bottom: 40, width: "20vw", maxWidth: 240, height: "auto", pointerEvents: "none", zIndex: 0 }}
          className="pricing-pose"
        />
        <div style={{ maxWidth: 860, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <SectionHeading title="Pricing questions," accent="answered." />
          <FaqAccordion faqs={FAQS} />
          <p style={{ fontSize: 14, color: "var(--g-gray-500)", textAlign: "center", marginTop: 26 }}>
            Running Mantis across a whole team, or reselling to your own clients?{" "}
            <Link href="/partner" style={{ color: "var(--g-green-text)", fontWeight: 700 }}>Look at partner access</Link>.
          </p>
        </div>
      </section>

      <MarketingCta
        title="Start finding clients"
        accent="near you."
        sub="Join agencies already growing their pipeline with Mantis — free to start, no card needed."
        primary={{ label: "Get Free Access", href: "/login" }}
        secondary={{ label: "Talk to Sales", href: "/contact" }}
        pose="/marketing/mantis-pricing.webp"
        poseWidth={900}
        poseHeight={961}
      />
    </>
  );
}
