import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { PageHeader, Prose, Card } from "@/components/marketing/Shell";

export const metadata: Metadata = {
  title: `About ${COMPANY.brandLong} — built by ${COMPANY.legalName}`,
  description: `${COMPANY.brandLong} is local lead intelligence for agencies, built in Gurugram by ${COMPANY.legalName}, the team behind the Gigzman web design and software development studio.`,
  alternates: { canonical: `${COMPANY.site}/company` },
};

export default function CompanyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Company"
        title="We built Mantis because we needed it"
        intro="Before Mantis was a product, it was an internal tool at a web design studio that was tired of guessing which local businesses were worth a call."
      />
      <Prose>
        <h2>What we do</h2>
        <p>
          Mantis finds local businesses that have a weak digital presence — no website, a thin
          listing, poor ratings — and turns them into a ranked list an agency can actually work
          through. It reads the same public business data anyone can see on a map, scores it for how
          likely that business is to need what you sell, and shows it as a map you can pan around.
        </p>

        <h2>Who we are</h2>
        <p>
          Mantis is operated by <strong>{COMPANY.legalName}</strong>, registered in {COMPANY.address.city},{" "}
          {COMPANY.address.region}. The same team runs{" "}
          <a href={COMPANY.agencySite} target="_blank" rel="noopener noreferrer">
            Gigzman
          </a>
          , a website design and software development company serving local businesses across
          Gurugram and Delhi NCR.
        </p>
        <p>
          That order matters. We ran the agency first, spent years doing the prospecting by hand, and
          built Mantis to remove the worst part of it. Every scoring decision in the product comes
          from a call we actually had to make ourselves.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, margin: "28px 0" }} className="contact-grid">
          <Card>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--g-green-text)", marginBottom: 6 }}>
              LEGAL ENTITY
            </div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{COMPANY.legalName}</div>
            <div style={{ fontSize: 14, color: "var(--g-ink-soft)", marginTop: 6 }}>
              {COMPANY.address.city}, {COMPANY.address.region}, {COMPANY.address.countryName}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--g-green-text)", marginBottom: 6 }}>
              GET IN TOUCH
            </div>
            <a href={`mailto:${COMPANY.email}`} style={{ fontSize: 16, fontWeight: 700, color: "var(--g-ink)" }}>
              {COMPANY.email}
            </a>
            <div style={{ fontSize: 14, color: "var(--g-ink-soft)", marginTop: 6 }}>
              <Link href="/contact">Full contact details</Link>
            </div>
          </Card>
        </div>

        <h2>How we think about the data</h2>
        <p>
          Everything Mantis shows is public information about businesses — the kind of thing you
          would see by searching a map yourself. We don&apos;t buy personal contact databases, and we
          don&apos;t sell your lead lists to anyone else. A lead you unlock is yours.
        </p>
        <p>
          The details are in our <Link href="/privacy">privacy policy</Link> and{" "}
          <Link href="/terms">terms of service</Link>.
        </p>
      </Prose>
    </>
  );
}
