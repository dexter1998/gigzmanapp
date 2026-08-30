import type { Metadata } from "next";
import { ogImageMeta } from "@/lib/og";
import Image from "next/image";
import Link from "next/link";
import { COMPANY, addressOneLine } from "@/lib/company";
import { ContactForm } from "@/components/marketing/ContactForm";
import { EyebrowPill, FaqAccordion, MarketingCta, OrigamiFloor, SectionHeading } from "@/components/marketing/MarketingPieces";
import { MailIcon, PartnerIcon, MapsPinIcon, HelpIcon, ClockIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: `Contact ${COMPANY.brandLong} — ${COMPANY.legalName}, Gurugram`,
  description: `Talk to the team behind ${COMPANY.brandLong} about leads, enrichment, pricing or agency partnerships. ${COMPANY.legalName}, ${COMPANY.address.locality}, ${COMPANY.address.city}. A person reads every message.`,
  keywords: [
    "contact Mantis AI",
    "Mantis AI support",
    "lead generation software Gurugram",
    "agency partnership enquiry India",
  ],
  alternates: { canonical: `${COMPANY.site}/contact` },
  openGraph: {
    images: ogImageMeta({
      v: "contact",
      eyebrow: "Contact Mantis",
      t1: "Let's help you",
      t2: "grow.",
      sub: "Questions about leads, enrichment, pricing or partnerships? We're ready to help.",
      url: "mantisai.in/contact",
    }),
    title: `Contact ${COMPANY.brandLong}`,
    description:
      "Questions about leads, enrichment, pricing or partnerships? A person reads every message — replies usually land within one business day.",
    url: `${COMPANY.site}/contact`,
    siteName: COMPANY.brand,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Contact ${COMPANY.brandLong}`,
    description: "Talk to our team about leads, enrichment, pricing or partnerships.",
  },
};

// Every card routes to the one published address. lib/company.ts is deliberate about this:
// inventing support@ / sales@ / partners@ aliases that don't exist would bounce real enquiries
// and break the NAP consistency the rest of the site is built around.
const CHANNELS = [
  { icon: HelpIcon, title: "Product Support", desc: "Help with your account, lead data, exports or anything technical." },
  { icon: MailIcon, title: "Sales & Pricing", desc: "Questions about plans, credits, or a live walkthrough of the product." },
  { icon: PartnerIcon, title: "Partner Access", desc: "Agency partnerships, reselling and co-marketing opportunities." },
];

const FAQS = [
  {
    q: "How quickly will Mantis respond?",
    a: "Within one business day for support and sales. Partner applications go through a short review by a person, so those usually take two business days.",
  },
  {
    q: "Can I request a product demo?",
    a: "Yes. Pick “Book a demo” above and tell us roughly what your agency sells and which cities you work in — we'll tailor the walkthrough to that instead of giving you a generic tour.",
  },
  {
    q: "Where can I report incorrect lead data?",
    a: "Use this form with “Incorrect lead data” selected, and include the business name and city. Mantis reads live public sources rather than a stored database, so a wrong result usually means a source we should be weighting differently — those reports genuinely change the product.",
  },
  {
    q: "Can you help with agency onboarding?",
    a: "Yes. We'll set up your search areas, categories and lead filters with you on a call, so your first list is one you would actually work through.",
  },
  {
    q: "How does partner access work?",
    a: "Approved agency partners get higher lead limits, priority support and referral revenue on agencies they introduce. Apply through the Partner Access page — we read every application ourselves.",
  },
  {
    q: "Do you offer custom agency plans?",
    a: "Yes — for teams running Mantis at volume we price around your actual lead usage, seats and support needs. Get in touch and we'll scope it with you.",
  },
];

export default function ContactPage() {
  const a = COMPANY.address;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: `Contact ${COMPANY.brandLong}`,
            url: `${COMPANY.site}/contact`,
            mainEntity: {
              "@type": "Organization",
              name: COMPANY.legalName,
              url: COMPANY.site,
              email: COMPANY.email,
              address: {
                "@type": "PostalAddress",
                streetAddress: `${a.street}, ${a.locality}`,
                addressLocality: a.city,
                addressRegion: a.region,
                postalCode: a.postalCode,
                addressCountry: a.country,
              },
              contactPoint: [
                { "@type": "ContactPoint", contactType: "customer support", email: COMPANY.email, availableLanguage: ["en", "hi"] },
              ],
            },
          }),
        }}
      />

      {/* Hero — copy and contact rails left, form card right */}
      <section style={{ position: "relative", padding: "64px 24px 88px", overflow: "hidden" }}>
        <OrigamiFloor opacity={0.7} height={300} />
        <div
          style={{ maxWidth: 1160, margin: "0 auto", position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: 56, alignItems: "start" }}
          className="contact-grid"
        >
          <div>
            <EyebrowPill>Contact Mantis</EyebrowPill>
            <h1
              className="marketing-h1"
              style={{ fontSize: "clamp(34px, 5vw, 52px)", fontWeight: 800, color: "var(--g-ink)", letterSpacing: "-0.03em", lineHeight: 1.08, margin: "20px 0 16px", textWrap: "balance" }}
            >
              How can we help you <span style={{ color: "var(--g-green)" }}>grow?</span>
            </h1>
            <p style={{ fontSize: 16.5, color: "var(--g-gray-500)", lineHeight: 1.6, margin: "0 0 34px", maxWidth: 410 }}>
              Questions about leads, enrichment, pricing or partnerships? {COMPANY.brandLong} is built in{" "}
              {a.city} by {COMPANY.legalName}, and a person reads every message.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <ContactRail icon={<MailIcon size={17} color="var(--g-green-text)" />} label="Email" value={COMPANY.email} href={`mailto:${COMPANY.email}`} />
              <ContactRail icon={<ClockIcon size={17} color="var(--g-green-text)" />} label="Hours" value={COMPANY.gbp.hours} />
              <ContactRail icon={<MapsPinIcon size={17} color="var(--g-green-text)" />} label="Location" value={`${a.city}, ${a.region}`} href={COMPANY.gbp.mapsUrl} />
            </div>

            <Image
              aria-hidden="true"
              alt=""
              src="/marketing/mantis-contact.webp"
              width={900}
              height={922}
              style={{ width: "100%", maxWidth: 240, height: "auto", marginTop: 30 }}
              className="contact-pose"
            />
          </div>

          <ContactForm />
        </div>
      </section>

      {/* Reassurance + routing cards */}
      <section style={{ background: "var(--g-white)", padding: "56px 24px 80px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 34 }}>
            <ClockIcon size={16} color="var(--g-green-text)" />
            <span style={{ fontSize: 14, color: "var(--g-ink-soft)", fontWeight: 600 }}>We usually respond within one business day.</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {CHANNELS.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.title} style={{ background: "var(--g-cream)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 26 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--g-green-mint)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <Icon />
                  </div>
                  <h2 style={{ fontSize: 16.5, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 7px" }}>{c.title}</h2>
                  <p style={{ fontSize: 13.5, color: "var(--g-gray-500)", lineHeight: 1.6, margin: "0 0 16px" }}>{c.desc}</p>
                  <a href={`mailto:${COMPANY.email}`} style={{ fontSize: 13.5, fontWeight: 700, color: "var(--g-green-text)", textDecoration: "none" }}>
                    Email {COMPANY.email} →
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Registered office — kept character-for-character in step with the Google Business
          Profile, so the two records reinforce each other instead of reading as two businesses. */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.25fr", gap: 40, alignItems: "start" }} className="contact-grid">
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--g-ink)", letterSpacing: "-0.02em", margin: "0 0 16px" }}>Registered office</h2>
            <address style={{ fontStyle: "normal", fontSize: 15.5, lineHeight: 1.75, color: "var(--g-ink)" }}>
              <strong>{COMPANY.legalName}</strong>
              <br />
              {a.street}
              <br />
              {a.locality}
              <br />
              {a.city}, {a.region} {a.postalCode}
              <br />
              {a.countryName}
            </address>
            <p style={{ margin: "14px 0 0" }}>
              <a href={COMPANY.gbp.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 700, color: "var(--g-green-text)" }}>
                Open in Google Maps →
              </a>
            </p>
            <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "18px 0 0", lineHeight: 1.6 }}>
              Postal address for correspondence: {addressOneLine()}
            </p>
          </div>

          <div style={{ border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <iframe
              title={`Map to ${COMPANY.legalName}, ${a.city}`}
              src={COMPANY.gbp.embedUrl}
              width="100%"
              height="330"
              style={{ border: 0, display: "block" }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: "var(--g-white)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <SectionHeading title="Questions," accent="answered." sub={`Everything you need to know about ${COMPANY.brandLong} and how we work.`} />
          <FaqAccordion faqs={FAQS} />
          <p style={{ fontSize: 14, color: "var(--g-gray-500)", textAlign: "center", marginTop: 26 }}>
            Still stuck? <Link href="/partner" style={{ color: "var(--g-green-text)", fontWeight: 700 }}>Partner access</Link> and{" "}
            <Link href="/pricing" style={{ color: "var(--g-green-text)", fontWeight: 700 }}>pricing</Link> have their own answers.
          </p>
        </div>
      </section>

      <MarketingCta
        title="Your next clients are"
        accent="already nearby."
        sub="Let's help you find them and start the right conversation."
        primary={{ label: "Get Free Access", href: "/login" }}
        secondary={{ label: "Explore Mantis", href: "/#capabilities" }}
        pose="/marketing/mantis-contact.webp"
        poseWidth={900}
        poseHeight={922}
      />
    </>
  );
}

function ContactRail({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const body = (
    <>
      <div style={{ width: 40, height: 40, borderRadius: "var(--radius-sm)", background: "var(--g-white)", border: "1px solid var(--g-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, color: "var(--g-gray-500)", marginBottom: 1 }}>{label} —</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--g-ink)" }}>{value}</div>
      </div>
    </>
  );

  const style: React.CSSProperties = { display: "flex", alignItems: "center", gap: 13, textDecoration: "none" };
  return href ? (
    <a href={href} style={style} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {body}
    </a>
  ) : (
    <div style={style}>{body}</div>
  );
}
