import type { Metadata } from "next";
import { ogImageMeta } from "@/lib/og";
import Image from "next/image";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { EyebrowPill, MarketingCta, OrigamiFloor, SectionHeading } from "@/components/marketing/MarketingPieces";
import { CheckIcon, QuoteIcon, ZapIcon, ShieldCheckIcon, TableIcon, PartnerIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: { absolute: `About ${COMPANY.brandLong} | Local Lead Intelligence from Gurugram` },
  // Was 253 characters — past what any SERP renders, so the half that mattered was cut.
  description: `Meet the team making local opportunity visible. Built in ${COMPANY.address.city} by Reverblunt, ${COMPANY.brandLong} turns businesses with a weak web presence into ranked leads.`,
  keywords: [
    "about Mantis Ai",
    "local lead intelligence",
    "Reverblunt Private Limited",
    "Gurugram SaaS company",
    "agency lead generation platform India",
  ],
  alternates: { canonical: `${COMPANY.site}/company` },
  openGraph: {
    images: ogImageMeta({
      v: "company",
      eyebrow: "About Mantis Ai",
      t1: "We make local",
      t2: "opportunity visible.",
      cta: "See how it works →",
      url: "mantisai.in/company",
    }),
    title: `About ${COMPANY.brandLong} — we make local opportunity visible`,
    description: "Built in Gurugram by the agency that needed it first. Live public business data, scored for who actually needs what you sell.",
    url: `${COMPANY.site}/company`,
    siteName: COMPANY.brand,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `About ${COMPANY.brandLong}`,
    description: "Built in Gurugram by the agency that needed it first.",
  },
};

const STATS = [
  { value: "Live", label: "public business data" },
  { value: "Map-first", label: "discovery" },
  { value: "Scored", label: "not just listed" },
  { value: "One workspace", label: "to close" },
];

const PRINCIPLES = [
  { icon: ZapIcon, title: "Freshness over volume", desc: "We read live public sources rather than reselling a stale database, so what you see reflects the area as it is now." },
  { icon: ShieldCheckIcon, title: "Evidence before outreach", desc: "Every lead carries the reason it scored the way it did, so you reach out with something specific rather than a guess." },
  { icon: TableIcon, title: "Useful intelligence, not noise", desc: "A ranked list you can work through beats ten thousand rows you'll never open. We drop what isn't sellable." },
  { icon: PartnerIcon, title: "Agencies grow when local businesses grow", desc: "The business you help get online is the point. We're just the part that finds them." },
];

const PLACES = [
  { img: "/marketing/card-gurugram.webp", w: 800, h: 523, title: "Gurugram headquarters", desc: `Built in ${COMPANY.address.city}, close to the local business ecosystem we serve.` },
  { img: "/marketing/card-india.webp", w: 800, h: 822, title: "India-wide discovery", desc: "Coverage that grows city by city, as each area's data is good enough to trust." },
  { img: "/marketing/card-globe.webp", w: 800, h: 764, title: "Global-ready platform", desc: "Nothing in the product is India-specific — the map works wherever the data does." },
];

export default function CompanyPage() {
  const a = COMPANY.address;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: `About ${COMPANY.brandLong}`,
            url: `${COMPANY.site}/company`,
            mainEntity: {
              "@type": "Organization",
              name: COMPANY.legalName,
              alternateName: COMPANY.brandLong,
              url: COMPANY.site,
              email: COMPANY.email,
              description:
                "Mantis finds local businesses with a weak digital presence and turns them into a ranked list agencies can work through.",
              address: {
                "@type": "PostalAddress",
                streetAddress: `${a.street}, ${a.locality}`,
                addressLocality: a.city,
                addressRegion: a.region,
                postalCode: a.postalCode,
                addressCountry: a.country,
              },
            },
          }),
        }}
      />

      {/* Hero */}
      <section style={{ position: "relative", padding: "64px 24px 80px", overflow: "hidden", textAlign: "center" }}>
        <OrigamiFloor opacity={0.6} height={320} />
        <div style={{ maxWidth: 1060, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <EyebrowPill>About {COMPANY.brandLong}</EyebrowPill>
          <h1
            className="marketing-h1"
            style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, color: "var(--g-ink)", letterSpacing: "-0.03em", lineHeight: 1.08, margin: "20px 0 16px", textWrap: "balance" }}
          >
            We make <span style={{ color: "var(--g-green-dark)" }}>local opportunity</span> visible.
          </h1>
          <p style={{ fontSize: 16.5, color: "var(--g-gray-500)", lineHeight: 1.6, margin: "0 auto 40px", maxWidth: 560 }}>
            Mantis reads the public business data anyone can see on a map, scores it for who actually needs what you
            sell, and hands you a list worth working.
          </p>

          <Image
            alt="The Mantis workspace showing a live search across Gurugram, with sources being scanned in real time"
            src="/marketing/about-hero-search.webp"
            width={1400}
            height={934}
            priority
            style={{ width: "100%", height: "auto", borderRadius: "var(--radius-lg)", maxWidth: 900 }}
          />
        </div>
      </section>

      {/* Why it exists */}
      <section style={{ background: "var(--g-white)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 52, alignItems: "start" }} className="contact-grid">
            <h2 style={{ fontSize: "clamp(24px, 3.4vw, 34px)", fontWeight: 800, color: "var(--g-ink)", letterSpacing: "-0.02em", margin: 0, lineHeight: 1.2, textWrap: "balance" }}>
              We built Mantis because <span style={{ color: "var(--g-green-dark)" }}>we needed it.</span>
            </h2>
            <div>
              <p style={{ fontSize: 15.5, color: "var(--g-gray-500)", lineHeight: 1.75, margin: "0 0 16px" }}>
                Before Mantis was a product, it was an internal tool at a web design studio that was tired of guessing
                which local businesses were worth a call. Local businesses need better digital services to grow.
                Agencies need a smarter way to find them. Most lead data is outdated, incomplete or hard to trust.
              </p>
              <p style={{ fontSize: 15.5, color: "var(--g-gray-500)", lineHeight: 1.75, margin: 0 }}>
                We ran the agency first, spent years doing the prospecting by hand, and built Mantis to remove the worst
                part of it. Every scoring decision in the product comes from a call we actually had to make ourselves.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 1, background: "var(--g-border)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginTop: 48 }}>
            {STATS.map((s) => (
              <div key={s.label} style={{ background: "var(--g-white)", padding: "24px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--g-ink)", marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: "var(--g-gray-500)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <SectionHeading title="How we build" accent="Mantis." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 18 }}>
            {PRINCIPLES.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 24 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "var(--radius-sm)", background: "var(--g-green-mint)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <Icon color="var(--g-green-text)" />
                  </div>
                  <h3 style={{ fontSize: 15.5, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 7px", lineHeight: 1.3 }}>{p.title}</h3>
                  <p style={{ fontSize: 13.5, color: "var(--g-gray-500)", lineHeight: 1.6, margin: 0 }}>{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Live data */}
      <section style={{ background: "var(--g-green-mint)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: 52, alignItems: "center" }} className="contact-grid">
          <div>
            <h2 style={{ fontSize: "clamp(25px, 3.5vw, 36px)", fontWeight: 800, color: "var(--g-ink)", letterSpacing: "-0.02em", margin: "0 0 16px", lineHeight: 1.2, textWrap: "balance" }}>
              The internet changes every day. Your <span style={{ color: "var(--g-green-dark)" }}>lead data</span> should too.
            </h2>
            <p style={{ fontSize: 15.5, color: "var(--g-ink-soft)", lineHeight: 1.7, margin: "0 0 24px" }}>
              Stale databases miss real opportunities. Mantis searches live and caches per area, so repeat searches stay
              fast without going out of date.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {["Read live public sources", "Score for who actually needs you", "Verify before you spend a credit"].map((t) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, color: "var(--g-ink)", fontWeight: 600 }}>
                  <CheckIcon size={17} color="var(--g-green-dark)" /> {t}
                </div>
              ))}
            </div>
          </div>
          {/* The source art carries a wide margin of its own. Framed and overscaled so the artwork
              fills the column edge to edge instead of floating in the middle of it. */}
          <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", aspectRatio: "16 / 11", background: "var(--g-white)" }} className="about-frame">
            <Image
              aria-hidden="true"
              alt=""
              src="/marketing/about-source-network.webp"
              width={1200}
              height={800}
              style={{ width: "122%", height: "100%", objectFit: "cover", objectPosition: "center", marginLeft: "-11%" }}
            />
          </div>
        </div>
      </section>

      {/* Founder quote */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }} className="contact-grid">
          <div>
            <QuoteIcon size={34} color="var(--g-green)" />
            <p style={{ fontSize: "clamp(19px, 2.4vw, 25px)", fontWeight: 700, color: "var(--g-ink)", lineHeight: 1.42, margin: "14px 0 22px", letterSpacing: "-0.01em" }}>
              The best client opportunities are often closer than agencies think. Mantis exists to make those
              opportunities visible and actionable.
            </p>
            <div style={{ width: 34, height: 2, background: "var(--g-green)", marginBottom: 14 }} />
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--g-ink)" }}>Tarun Kumar</div>
            <div style={{ fontSize: 13.5, color: "var(--g-gray-500)" }}>Founder, {COMPANY.brandLong}</div>
          </div>
          <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", aspectRatio: "4 / 3", background: "var(--g-cream)" }} className="about-frame">
            <Image
              aria-hidden="true"
              alt=""
              src="/marketing/about-founder.webp"
              width={1100}
              height={734}
              style={{ width: "128%", height: "100%", objectFit: "cover", objectPosition: "center 45%", marginLeft: "-14%" }}
            />
          </div>
        </div>
      </section>

      {/* Who we are — the legal-entity block, kept in step with lib/company.ts */}
      <section style={{ background: "var(--g-white)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <SectionHeading title="Who we" accent="are." align="left" />
          <p style={{ fontSize: 15.5, color: "var(--g-gray-500)", lineHeight: 1.75, margin: "0 0 16px", maxWidth: 720 }}>
            Mantis is operated by <strong style={{ color: "var(--g-ink)" }}>{COMPANY.legalName}</strong>, registered in{" "}
            {a.city}, {a.region}. The same team runs{" "}
            <a href={COMPANY.agencySite} target="_blank" rel="noopener noreferrer" style={{ color: "var(--g-green-text)", fontWeight: 700 }}>
              Gigzman
            </a>
            , a website design and software development company serving local businesses across Gurugram and Delhi NCR.
          </p>
          <p style={{ fontSize: 15.5, color: "var(--g-gray-500)", lineHeight: 1.75, margin: "0 0 28px", maxWidth: 720 }}>
            Everything Mantis shows is public information about businesses — the kind of thing you would see by
            searching a map yourself. We don&apos;t buy personal contact databases, and we don&apos;t sell your lead
            lists to anyone else. A lead you unlock is yours. The details are in our{" "}
            <Link href="/privacy" style={{ color: "var(--g-green-text)", fontWeight: 700 }}>privacy policy</Link> and{" "}
            <Link href="/terms" style={{ color: "var(--g-green-text)", fontWeight: 700 }}>terms of service</Link>.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="contact-grid">
            <div style={{ border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 24, background: "var(--g-cream)" }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--g-green-text)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Legal entity</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--g-ink)" }}>{COMPANY.legalName}</div>
              <div style={{ fontSize: 14, color: "var(--g-gray-500)", marginTop: 6 }}>
                {a.city}, {a.region}, {a.countryName}
              </div>
            </div>
            <div style={{ border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 24, background: "var(--g-cream)" }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--g-green-text)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Get in touch</div>
              <a href={`mailto:${COMPANY.email}`} style={{ fontSize: 16, fontWeight: 800, color: "var(--g-ink)", textDecoration: "none" }}>
                {COMPANY.email}
              </a>
              <div style={{ fontSize: 14, marginTop: 6 }}>
                <Link href="/contact" style={{ color: "var(--g-green-text)", fontWeight: 700 }}>Full contact details →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Where we are */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <SectionHeading title="Built in Gurugram. Designed for" accent="agencies everywhere." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 18 }}>
            {PLACES.map((p) => (
              <div key={p.title} style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 22 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 6px" }}>{p.title}</h3>
                <p style={{ fontSize: 13.5, color: "var(--g-gray-500)", lineHeight: 1.6, margin: "0 0 16px" }}>{p.desc}</p>
                <Image aria-hidden="true" alt="" src={p.img} width={p.w} height={p.h} style={{ width: "100%", height: "auto", borderRadius: "var(--radius-sm)" }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingCta
        title="Your next clients are"
        accent="already nearby."
        sub="Find them, understand them, and start the right conversation today."
        primary={{ label: "Get Free Access", href: "/login" }}
        secondary={{ label: "Explore Product", href: "/#capabilities" }}
        pose="/marketing/mantis-contact.webp"
        poseWidth={900}
        poseHeight={922}
      />
    </>
  );
}
