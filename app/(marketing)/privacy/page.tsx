import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, addressOneLine } from "@/lib/company";
import { PageHeader, Prose } from "@/components/marketing/Shell";

export const metadata: Metadata = {
  title: `Privacy Policy — ${COMPANY.brandLong}`,
  description: `How ${COMPANY.legalName} collects, uses and protects data in ${COMPANY.brandLong}.`,
  alternates: { canonical: `${COMPANY.site}/privacy` },
};

const UPDATED = "29 August 2026";

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        intro={`How ${COMPANY.legalName} handles your data in ${COMPANY.brandLong}. Last updated ${UPDATED}.`}
      />
      <Prose>
        <h2>Who we are</h2>
        <p>
          {COMPANY.brandLong} is operated by <strong>{COMPANY.legalName}</strong>, {addressOneLine()}.
          For anything in this policy, write to{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
        </p>

        <h2>What we collect</h2>
        <p>
          <strong>Account details.</strong> Your name, email address and — if you sign in by phone —
          your phone number. If you sign in with Google, we receive your name, email address and
          profile picture from Google; we never receive your Google password. If you register with an
          email and password, we store only a one-way hash of that password, never the password
          itself.
        </p>
        <p>
          <strong>What you tell us during onboarding.</strong> Your role, business type and the kind
          of customer you are looking for. This is used to rank results for you.
        </p>
        <p>
          <strong>How you use the product.</strong> The areas and categories you search, the leads
          you unlock, your credit balance and plan, and the conversations you have with the assistant
          inside the product.
        </p>
        <p>
          <strong>Business information we gather about companies, not people.</strong> Mantis
          collects publicly listed information about businesses — name, address, category, phone
          number, rating, review count and whether they have a website — from Google&apos;s Places
          data. This is information about organisations, published by those organisations for the
          purpose of being contacted.
        </p>

        <h2>What we do not do</h2>
        <p>
          We do not sell your personal data. We do not sell or share the lead lists you build. We do
          not buy personal contact databases, and we do not attempt to find the personal email
          address or personal phone number of individuals at the businesses we list.
        </p>

        <h2>Why we use it</h2>
        <ul>
          <li>To create and secure your account, and to sign you in.</li>
          <li>To run the product: searching areas, scoring leads, tracking credits and unlocks.</li>
          <li>To send transactional email such as sign-in codes and account notices.</li>
          <li>
            To send product and marketing email, which you can stop at any time — see{" "}
            <Link href="/preferences">email preferences</Link>.
          </li>
          <li>To detect abuse and keep costs sane, for example rate limiting rapid repeat searches.</li>
        </ul>

        <h2>Who we share it with</h2>
        <p>
          We use a small number of processors, each doing one job. They receive only what that job
          needs.
        </p>
        <ul>
          <li><strong>Google</strong> — Maps and Places data, and Google Sign-In if you use it.</li>
          <li><strong>Amazon Web Services</strong> — hosting for the assistant&apos;s AI model, and email delivery.</li>
          <li><strong>Vercel</strong> — website and application hosting.</li>
          <li><strong>Our database provider</strong> — stores the data described above.</li>
          <li><strong>An SMS provider</strong> — delivers one-time codes if you sign in by phone.</li>
        </ul>
        <p>
          We will also disclose data where the law requires it, or to protect our rights or the
          safety of others.
        </p>

        <h2>How long we keep it</h2>
        <p>
          Account data is kept while your account is open. Search and lead data is kept while it is
          useful to you and to keep the shared business database current. If you delete your account
          we remove your personal data within 30 days, except where we are required to keep records
          (for example, tax records of payments).
        </p>

        <h2>Your rights</h2>
        <p>
          You can ask us for a copy of your data, ask us to correct it, or ask us to delete it. Email{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> and we will respond within 30 days.
          You can unsubscribe from marketing email using the link at the bottom of any such email, or
          from <Link href="/preferences">your email preferences</Link>. Unsubscribing from marketing
          does not stop essential account email such as sign-in codes.
        </p>
        <p>
          If you are a business listed in our data and want your listing removed from Mantis, email us
          at <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> and we will remove it.
        </p>

        <h2>Security</h2>
        <p>
          Data is transmitted over encrypted connections and stored on managed infrastructure with
          access limited to the people who need it. Passwords are stored only as hashes. No system is
          perfectly secure, and we will tell affected users promptly if a breach occurs.
        </p>

        <h2>Cookies</h2>
        <p>
          We use cookies that are necessary to keep you signed in. We do not use advertising cookies.
        </p>

        <h2>Changes</h2>
        <p>
          If we change this policy materially we will update the date above and, for significant
          changes, tell you by email.
        </p>
      </Prose>
    </>
  );
}
