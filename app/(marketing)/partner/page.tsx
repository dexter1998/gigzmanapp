import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { PageHeader, Prose, Card } from "@/components/marketing/Shell";

export const metadata: Metadata = {
  title: `Partner Access — ${COMPANY.brandLong} for agencies`,
  description:
    "Mantis partner access for web design, software and marketing agencies: higher lead volume, priority support and revenue share for the clients you bring.",
  alternates: { canonical: `${COMPANY.site}/partner` },
};

const STEPS = [
  {
    n: "01",
    title: "Apply",
    body: "Tell us about your agency — what you sell, where you work, roughly how many clients you close a month. It takes a few minutes.",
  },
  {
    n: "02",
    title: "We review it",
    body: "We read every application ourselves. We are looking for agencies who actually deliver for local businesses, not volume resellers.",
  },
  {
    n: "03",
    title: "You get partner access",
    body: "Higher limits, priority support, and a direct line to us when a lead looks wrong or a category is missing.",
  },
];

export default function PartnerPage() {
  return (
    <>
      <PageHeader
        eyebrow="Partner Access"
        title="For agencies that outgrow the normal limits"
        intro="If you are working Mantis hard enough to hit your plan's ceiling every month, the partner programme is built for you."
      />
      <Prose>
        <h2>What you get</h2>
        <ul>
          <li>
            <strong>Room to work.</strong> Partner accounts get materially higher lead limits than the
            standard plans, so a good month doesn&apos;t stop halfway through.
          </li>
          <li>
            <strong>Priority support.</strong> A direct channel to the team that builds the product,
            not a queue.
          </li>
          <li>
            <strong>Influence on the roadmap.</strong> Partners tell us which categories, cities and
            signals to add next, and we build against that.
          </li>
          <li>
            <strong>Referral revenue.</strong> Introduce agencies who become customers and you earn on
            what they spend.
          </li>
        </ul>

        <h2>How it works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, margin: "22px 0 30px" }} className="pricing-grid">
          {STEPS.map((s) => (
            <Card key={s.n}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--g-green-text)", marginBottom: 8 }}>{s.n}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--g-ink)", marginBottom: 8 }}>{s.title}</div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--g-ink-soft)", margin: 0 }}>{s.body}</p>
            </Card>
          ))}
        </div>

        <h2>Who we take</h2>
        <p>
          Web design studios, software development shops, and marketing agencies working with local
          businesses. You do not need to be large — a two-person studio that closes consistently is a
          better partner than a big agency that dabbles.
        </p>

        <p style={{ marginTop: 28 }}>
          <Link
            href="/login?next=/home"
            style={{
              display: "inline-block",
              background: "var(--g-ink)",
              color: "#fff",
              borderRadius: 12,
              padding: "15px 26px",
              fontSize: 15.5,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Sign in to apply
          </Link>
        </p>
        <p style={{ fontSize: 14, color: "var(--g-ink-soft)" }}>
          The application lives inside the product so we can see how you actually use Mantis. If you
          would rather just talk to a person first, email{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
        </p>
      </Prose>
    </>
  );
}
