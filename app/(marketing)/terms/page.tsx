import type { Metadata } from "next";
import { ogImageMeta } from "@/lib/og";
import Link from "next/link";
import { COMPANY, addressOneLine } from "@/lib/company";
import { PageHeader, Prose } from "@/components/marketing/Shell";

export const metadata: Metadata = {
  openGraph: {
    images: ogImageMeta({
      v: "terms",
      eyebrow: "Terms of service",
      t1: "Clear terms.",
      t2: "Fair access.",
      url: "mantisai.in/terms",
    }),
  },
  twitter: { card: "summary_large_image" },
  title: { absolute: `Terms of Service — ${COMPANY.brandLong}` },
  description: `The terms you agree to when using ${COMPANY.brandLong}, operated by ${COMPANY.legalName}: your account, acceptable use, credits, billing and cancellation.`,
  alternates: { canonical: `${COMPANY.site}/terms` },
};

const UPDATED = "29 August 2026";

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Terms of Service"
        intro={`The agreement between you and ${COMPANY.legalName} for using ${COMPANY.brandLong}. Last updated ${UPDATED}.`}
      />
      <Prose>
        <h2>1. Who this is with</h2>
        <p>
          These terms are between you and <strong>{COMPANY.legalName}</strong>, {addressOneLine()}
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using {COMPANY.brandLong} you
          accept them.
        </p>

        <h2>2. Your account</h2>
        <p>
          You must give accurate details and keep your login secure. You are responsible for what
          happens under your account. One account is for one person or business — don&apos;t share
          logins.
        </p>

        <h2>3. Credits and plans</h2>
        <p>
          Unlocking a lead spends credits. Credits are allocated by your plan and reset with your
          billing period; unused credits do not carry over unless we say otherwise. Prices are shown
          on the <Link href="/pricing">pricing page</Link> and may change with notice for future
          billing periods. Credits have no cash value and are not refundable once spent.
        </p>

        <h2>4. What you may do with the data</h2>
        <p>
          Leads you unlock are yours to use for your own business development. You may contact those
          businesses, store the details in your own CRM, and work them as you see fit.
        </p>
        <p>You may not:</p>
        <ul>
          <li>resell, republish or redistribute Mantis data as a data product of your own;</li>
          <li>scrape, bulk-export or automate against the service outside its intended use;</li>
          <li>
            use the data for anything unlawful, including sending communications that break the
            marketing, telemarketing or anti-spam laws that apply to you.
          </li>
        </ul>
        <p>
          You are responsible for complying with the rules that govern how you contact businesses in
          your jurisdiction. We provide information; how you use it is your call and your liability.
        </p>

        <h2>5. Accuracy</h2>
        <p>
          Mantis reports what public business listings say at the time we read them. Listings go
          stale, businesses close, and ratings change. We do not warrant that any lead is accurate,
          current, or a good fit — check before you rely on it.
        </p>

        <h2>6. Availability</h2>
        <p>
          We aim to keep the service running but do not guarantee uninterrupted availability. We may
          change or discontinue features. If we make a material change that harms a paid plan, you may
          cancel and we will refund the unused portion of that billing period.
        </p>

        <h2>7. Acceptable use</h2>
        <p>
          Don&apos;t attempt to break, overload or reverse-engineer the service, don&apos;t attempt to
          access other users&apos; data, and don&apos;t use the service to harass anyone. We may
          suspend accounts that do.
        </p>

        <h2>8. Cancellation</h2>
        <p>
          You can cancel at any time; your plan runs to the end of the paid period. We may suspend or
          close an account that breaches these terms, and will tell you why where we reasonably can.
        </p>

        <h2>9. Liability</h2>
        <p>
          To the extent the law allows, our total liability for any claim relating to the service is
          limited to the amount you paid us in the twelve months before the claim. We are not liable
          for lost profits, lost business or indirect losses.
        </p>

        <h2>10. Governing law</h2>
        <p>
          These terms are governed by the laws of India, and the courts of Gurugram, Haryana have
          exclusive jurisdiction.
        </p>

        <h2>11. Contact</h2>
        <p>
          Questions about these terms: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
        </p>
      </Prose>
    </>
  );
}
