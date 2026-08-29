import type { Metadata } from "next";
import { COMPANY, addressOneLine } from "@/lib/company";
import { PageHeader, Prose, Card } from "@/components/marketing/Shell";

export const metadata: Metadata = {
  title: `Contact ${COMPANY.brandLong} — ${COMPANY.legalName}, Gurugram`,
  description: `Get in touch with the team behind ${COMPANY.brandLong}. ${COMPANY.legalName}, ${COMPANY.address.locality}, ${COMPANY.address.city}, ${COMPANY.address.region}. Email ${COMPANY.email}.`,
  alternates: { canonical: `${COMPANY.site}/contact` },
};

export default function ContactPage() {
  const a = COMPANY.address;
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Talk to the team"
        intro={
          <>
            {COMPANY.brandLong} is built in Gurugram by {COMPANY.legalName}. Email is the fastest way
            to reach us — a person reads every one.
          </>
        }
      />
      <Prose>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="contact-grid">
          <Card>
            <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 10px" }}>Email</h2>
            <a href={`mailto:${COMPANY.email}`} style={{ fontSize: 17, fontWeight: 700, color: "var(--g-green-text)" }}>
              {COMPANY.email}
            </a>
            <p style={{ fontSize: 14, color: "var(--g-ink-soft)", marginTop: 10, marginBottom: 0 }}>
              Sales, support, partnerships and press.
            </p>
          </Card>

          <Card>
            <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 10px" }}>Hours</h2>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--g-ink)" }}>{COMPANY.gbp.hours}</div>
            <p style={{ fontSize: 14, color: "var(--g-ink-soft)", marginTop: 10, marginBottom: 0 }}>
              Replies usually land within one business day.
            </p>
          </Card>
        </div>

        <h2>Registered office</h2>
        {/* Marked up so the address a crawler reads here is character-for-character the address on
            the Google Business Profile — that match is what makes the two records reinforce each
            other instead of looking like two different businesses. */}
        <address style={{ fontStyle: "normal", fontSize: 16, lineHeight: 1.75, color: "var(--g-ink)" }}>
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

        <p>
          <a href={COMPANY.gbp.mapsUrl} target="_blank" rel="noopener noreferrer">
            Open in Google Maps
          </a>
        </p>

        <div
          style={{
            border: "1px solid var(--g-border)",
            borderRadius: "var(--radius-lg, 18px)",
            overflow: "hidden",
            marginTop: 12,
          }}
        >
          <iframe
            title={`Map to ${COMPANY.legalName}, ${a.city}`}
            src={COMPANY.gbp.embedUrl}
            width="100%"
            height="340"
            style={{ border: 0, display: "block" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <h2>The team behind Mantis</h2>
        <p>
          {COMPANY.legalName} also operates{" "}
          <a href={COMPANY.agencySite} target="_blank" rel="noopener noreferrer">
            Gigzman
          </a>
          , a website design and software development studio working with local businesses across
          Gurugram and Delhi NCR. Mantis grew directly out of that work: finding businesses that
          needed a website was the slowest part of running the studio, so we built the tool we
          wanted, then opened it to other agencies.
        </p>
        <p style={{ fontSize: 14, color: "var(--g-ink-soft)" }}>
          Postal address for correspondence: {addressOneLine()}
        </p>
      </Prose>
    </>
  );
}
