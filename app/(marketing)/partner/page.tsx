import type { Metadata } from "next";
import { ogImageMeta } from "@/lib/og";
import Image from "next/image";
import { COMPANY } from "@/lib/company";
import { PartnerApplicationForm } from "@/components/partner/PartnerApplicationForm";
import { EyebrowPill, FaqAccordion, MarketingCta, OrigamiFloor, SectionHeading } from "@/components/marketing/MarketingPieces";
import { CheckIcon, ShieldCheckIcon, ZapIcon, HelpIcon, ClipboardIcon, RadioIcon, DownloadIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: `Partner Access — ${COMPANY.brandLong} for web & marketing agencies`,
  description:
    "Partner access for web development, software and marketing agencies: higher lead limits, priority support, roadmap influence and referral revenue. Apply in five short steps.",
  keywords: [
    "Mantis AI partner program",
    "agency partner network India",
    "web development agency partnership",
    "marketing agency reseller program",
    "white label lead generation",
  ],
  alternates: { canonical: `${COMPANY.site}/partner` },
  openGraph: {
    images: ogImageMeta({
      v: "partner",
      eyebrow: "Mantis partner network",
      t1: "Grow together.",
      t2: "Win more local clients.",
      url: "mantisai.in/partner",
    }),
    title: `${COMPANY.brandLong} Partner Access — grow together, win more local clients`,
    description: "Higher lead limits, priority support and referral revenue for agencies that deliver for local businesses.",
    url: `${COMPANY.site}/partner`,
    siteName: COMPANY.brand,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${COMPANY.brandLong} Partner Access`,
    description: "Higher lead limits, priority support and referral revenue for tech and marketing agencies.",
  },
};

const BENEFITS = [
  { icon: ShieldCheckIcon, title: "Room to work", desc: "Partner accounts get materially higher lead limits than the standard plans, so a good month doesn't stop halfway through." },
  { icon: RadioIcon, title: "Fresh local leads", desc: "Businesses actively showing the gaps your agency already fixes — no website, thin listing, weak visibility." },
  { icon: ClipboardIcon, title: "Contact enrichment", desc: "Verified names, numbers and addresses, so your first touch reaches someone who can actually say yes." },
  { icon: HelpIcon, title: "Priority support", desc: "A direct channel to the team that builds the product, not a queue behind everyone else." },
  { icon: ZapIcon, title: "Influence on the roadmap", desc: "Partners tell us which categories, cities and signals to add next, and we build against that." },
  { icon: DownloadIcon, title: "Referral revenue", desc: "Introduce agencies who become customers and you earn on what they spend." },
];

const STEPS = [
  { n: "01", title: "Submit your application", desc: "Tell us what you sell, where you work and roughly how many projects you close a month." },
  { n: "02", title: "We review it ourselves", desc: "A person reads every application. We're looking for agencies who deliver for local businesses, not volume resellers." },
  { n: "03", title: "Activate your workspace", desc: "We raise your limits, set up your target cities and walk you through the product." },
  { n: "04", title: "Find and pitch clients", desc: "Discover local opportunities, unlock the contacts and start real conversations." },
];

const WHO = [
  "Web design and development studios",
  "Software development shops",
  "SEO and performance marketing teams",
  "Freelancers and independent consultants",
  "Design and branding studios",
  "CRM, automation and sales partners",
];

const SUPPORT = [
  { title: "Partner onboarding", desc: "We set you up properly — account, search areas and a walkthrough of how scoring works.", items: ["Account setup", "Product walkthrough", "Strategy session"] },
  { title: "Campaign support", desc: "Help with the outreach itself, not just the list — messaging, sequences and what actually lands.", items: ["Outreach playbooks", "Message templates", "Follow-up cadence"] },
  { title: "Roadmap access", desc: "Tell us what's missing and see it get built. Partners shape what we work on next.", items: ["Category requests", "New city coverage", "Signal feedback"] },
];

const FAQS = [
  {
    q: "Who can apply for partner access?",
    a: "Web and software development studios, marketing and performance agencies, full-service shops, and independent consultants who deliver client work. The application asks which one you are up front, because that decides who on our side reviews it.",
  },
  {
    q: "Do I need to be a large agency?",
    a: "No. A two-person studio that closes consistently is a better partner than a big agency that dabbles. We ask about projects per month and typical ticket size to understand your rhythm, not to filter on size.",
  },
  {
    q: "How long does approval take?",
    a: "Two business days in most cases. Every application is read by a person, so a clear picture of what you deliver and your typical project size genuinely speeds it up.",
  },
  {
    q: "Is partner access free?",
    a: "Yes. Approved partners get raised limits and priority support at no extra cost. We make money when you scale usage because the leads are working — not on the partnership itself.",
  },
  {
    q: "Can partners invite team members?",
    a: "Yes. Partner workspaces support multiple seats so your sales and delivery people can work the same lead list without stepping on each other.",
  },
  {
    q: "How does referral revenue work?",
    a: "Introduce another agency, and once they become a paying customer you earn on what they spend. Your partner contact sets this up with you after approval.",
  },
];

export default function PartnerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `${COMPANY.brandLong} Partner Access`,
            url: `${COMPANY.site}/partner`,
            description:
              "Partner programme for web development, software and marketing agencies — higher lead limits, priority support, roadmap influence and referral revenue.",
            isPartOf: { "@type": "WebSite", name: COMPANY.brand, url: COMPANY.site },
            about: { "@type": "Organization", name: COMPANY.legalName, url: COMPANY.site },
          }),
        }}
      />

      {/* Hero — pitch left, stepper right */}
      <section id="apply" style={{ position: "relative", padding: "64px 24px 88px", overflow: "hidden", scrollMarginTop: 80 }}>
        <OrigamiFloor opacity={0.7} height={320} />
        <div
          style={{ maxWidth: 1160, margin: "0 auto", position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 1.02fr", gap: 52, alignItems: "start" }}
          className="contact-grid"
        >
          <div>
            <EyebrowPill>Mantis Partner Network</EyebrowPill>
            <h1
              className="marketing-h1"
              style={{ fontSize: "clamp(32px, 4.8vw, 50px)", fontWeight: 800, color: "var(--g-ink)", letterSpacing: "-0.03em", lineHeight: 1.08, margin: "20px 0 16px", textWrap: "balance" }}
            >
              Grow together. Win more <span style={{ color: "var(--g-green)" }}>local clients.</span>
            </h1>
            <p style={{ fontSize: 16.5, color: "var(--g-gray-500)", lineHeight: 1.6, margin: "0 0 28px", maxWidth: 430 }}>
              If you&apos;re working Mantis hard enough to hit your plan&apos;s ceiling every month, the partner
              programme is built for you — higher limits, a direct line to the team, and revenue on the agencies you
              bring.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 22, marginBottom: 32 }}>
              {["Higher lead limits", "Priority support", "Referral revenue"].map((t) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 600, color: "var(--g-ink)" }}>
                  <CheckIcon size={15} color="var(--g-green)" /> {t}
                </div>
              ))}
            </div>

            <Image aria-hidden="true" alt="" src="/marketing/mantis-partner.webp" width={900} height={600} style={{ width: "100%", maxWidth: 360, height: "auto" }} />
          </div>

          <PartnerApplicationForm variant="page" />
        </div>
      </section>

      {/* Benefits */}
      <section style={{ background: "var(--g-white)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <SectionHeading title="A partnership built for" accent="growth." sub="Everything an agency needs to turn nearby opportunities into signed projects." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} style={{ border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 24, background: "var(--g-cream)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "var(--radius-sm)", background: "var(--g-green-mint)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 15 }}>
                    <Icon color="var(--g-green-text)" />
                  </div>
                  <h3 style={{ fontSize: 15.5, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 7px" }}>{b.title}</h3>
                  <p style={{ fontSize: 13.5, color: "var(--g-gray-500)", lineHeight: 1.6, margin: 0 }}>{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works + portal shot */}
      <section style={{ position: "relative", padding: "80px 24px", overflow: "hidden" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 52, alignItems: "center" }} className="contact-grid">
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--g-green-text)", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 12 }}>How it works</div>
            <h2 style={{ fontSize: "clamp(26px, 3.6vw, 38px)", fontWeight: 800, color: "var(--g-ink)", letterSpacing: "-0.02em", margin: "0 0 30px", textWrap: "balance" }}>
              From application to <span style={{ color: "var(--g-green)" }}>opportunities.</span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {STEPS.map((s) => (
                <div key={s.n} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      border: "1px solid var(--g-green)",
                      background: "var(--g-green-mint)",
                      color: "var(--g-green-text)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 800,
                      flexShrink: 0,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {s.n}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15.5, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 4px" }}>{s.title}</h3>
                    <p style={{ fontSize: 13.5, color: "var(--g-gray-500)", lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Image
            alt="The Mantis workspace showing local opportunities on a map, filtered by website and visibility gaps"
            src="/marketing/partner-portal.webp"
            width={1400}
            height={700}
            style={{ width: "100%", height: "auto", borderRadius: "var(--radius-md)", border: "1px solid var(--g-border)" }}
          />
        </div>
      </section>

      {/* Who should partner */}
      <section style={{ background: "var(--g-white)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 52, alignItems: "center" }} className="contact-grid">
          <Image aria-hidden="true" alt="" src="/marketing/partner-network.webp" width={1100} height={734} style={{ width: "100%", height: "auto" }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--g-green-text)", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 12 }}>Who we take</div>
            <h2 style={{ fontSize: "clamp(26px, 3.6vw, 38px)", fontWeight: 800, color: "var(--g-ink)", letterSpacing: "-0.02em", margin: "0 0 20px", textWrap: "balance" }}>
              Built for people who help businesses <span style={{ color: "var(--g-green)" }}>grow.</span>
            </h2>
            <p style={{ fontSize: 15, color: "var(--g-gray-500)", lineHeight: 1.65, margin: "0 0 22px", maxWidth: 440 }}>
              You don&apos;t need to be large. A two-person studio that closes consistently is a better partner than a
              big agency that dabbles.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {WHO.map((w) => (
                <div key={w} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, color: "var(--g-ink)" }}>
                  <CheckIcon size={17} color="var(--g-green)" /> {w}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Support */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <SectionHeading title="More than software." accent="A real partnership." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
            {SUPPORT.map((s) => (
              <div key={s.title} style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 26 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 8px" }}>{s.title}</h3>
                <p style={{ fontSize: 13.5, color: "var(--g-gray-500)", lineHeight: 1.6, margin: "0 0 16px" }}>{s.desc}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {s.items.map((i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--g-ink-soft)" }}>
                      <CheckIcon size={14} color="var(--g-green)" /> {i}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: "var(--g-white)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <SectionHeading title="Partner questions," accent="answered." />
          <FaqAccordion faqs={FAQS} columns={2} />
          <p style={{ fontSize: 14, color: "var(--g-gray-500)", textAlign: "center", marginTop: 26 }}>
            Would rather talk to a person first? Email{" "}
            <a href={`mailto:${COMPANY.email}`} style={{ color: "var(--g-green-text)", fontWeight: 700 }}>{COMPANY.email}</a>.
          </p>
        </div>
      </section>

      <MarketingCta
        title="Ready to find"
        accent="more clients?"
        sub="Join the Mantis Partner Network and turn nearby opportunities into your next projects."
        primary={{ label: "Apply for Partner Access", href: "/partner#apply" }}
        secondary={{ label: "Talk to us", href: "/contact" }}
        pose="/marketing/mantis-partner.webp"
        poseWidth={900}
        poseHeight={600}
      />
    </>
  );
}
