import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { Breadcrumbs, breadcrumbJsonLd, type Crumb } from "@/components/pseo/Breadcrumbs";
import { MIN_PUBLISH_LEADS, MIN_RATED_SHARE, MIN_CATEGORIES } from "@/lib/pseo/gate";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "How Mantis measures the local website gap | Methodology",
  description:
    "Where the data comes from, how the website gap rate and Lead Score are calculated, what is excluded, and the threshold a page must clear before we publish it.",
  alternates: { canonical: `${COMPANY.site}/leads/methodology` },
};

/**
 * Linked from every lead page. It exists so the numbers can be checked rather than taken on trust —
 * which is also what separates publishing analysis from republishing a feed.
 */
export default function Methodology() {
  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Lead Market", href: "/leads" },
    { label: "Methodology" },
  ];

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 24px 96px" }}>
      <Breadcrumbs items={crumbs} />
      <h1 style={{ fontSize: 40, lineHeight: 1.1, letterSpacing: -1.3, fontWeight: 800, color: "var(--g-ink)", margin: "22px 0 18px" }} className="marketing-h1">
        How these figures are produced
      </h1>

      <div className="marketing-prose">
        <h2>Where the data comes from</h2>
        <p>
          Business names, categories, addresses, ratings and review counts come from Google Maps
          listings. We record what a listing said on the day we read it; we do not edit it, and we do
          not claim to be the authoritative record for any business shown.
        </p>
        <p>
          Everything else on these pages — the website gap rate, the area rankings, the Lead Score and
          the coverage figures — is calculated by us from the set of businesses we have mapped.
        </p>

        <h2>What &ldquo;no website&rdquo; means</h2>
        <p>
          A business counts as having no website when its Google listing carries no website link at
          the time we checked it. Each card shows the date of that check. A business may of course
          have a site that isn&rsquo;t linked from its listing — from a customer&rsquo;s point of view
          that is close to the same problem, but it is a real limitation and worth stating.
        </p>
        <p>
          Businesses we have not checked either way are <strong>excluded from both sides</strong> of
          every percentage rather than being counted as having no website. The number excluded is
          printed on each page.
        </p>

        <h2>The website gap rate</h2>
        <p>
          Businesses with no website, divided by businesses we have checked, within that area or
          category. It is not an estimate of the whole market — only of the part we have mapped, which
          is why each page also states how much of its ground has been searched to exhaustion.
        </p>

        <h2>The Lead Score</h2>
        <p>
          A 0–100 estimate of how strong an opportunity a business represents, built from four things:
          how many reviews it has (a proxy for real trading activity), its rating, the commercial
          category it sits in, and how complete its listing is. A business that already has a website
          scores near zero by design — it is not the opportunity these pages are about.
        </p>
        <p>
          It is the same calculation the product uses internally, so a score shown here is the score
          you would see after signing in.
        </p>

        <h2>What we publish, and what we hold back</h2>
        <p>
          A page is only published once it clears every one of these:
        </p>
        <ul>
          <li>at least {MIN_PUBLISH_LEADS} businesses with no website;</li>
          <li>at least {MIN_RATED_SHARE * 100}% of them carrying a rating, so there is something to assess;</li>
          <li>at least {MIN_CATEGORIES} distinct categories, so it is a market rather than one repeated shop;</li>
          <li>at least one scan cell covering it searched to exhaustion, so the count reflects the ground rather than how far we got;</li>
          <li>and the same result on two consecutive days, so a page doesn&rsquo;t appear and vanish.</li>
        </ul>
        <p>
          Areas that fall short still have a page, linked from their city, but are kept out of search
          results until the data supports them. They are promoted automatically when it does.
        </p>

        <h2>How current it is</h2>
        <p>
          Each page shows when its underlying listings were last verified, and separately when its
          figures last changed. Those are different dates and we keep them apart on purpose: the
          displayed selection of businesses rotates every 15 days, but rotation is presentation, not
          new information, and never counts as an update.
        </p>

        <h2>Corrections</h2>
        <p>
          If your business is listed here and the information is wrong, or you would like it removed,
          email <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> and we will act on it.
          See also our <Link href="/privacy">privacy policy</Link>.
        </p>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs, COMPANY.site)) }} />
    </div>
  );
}
