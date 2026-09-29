import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { ogImageMeta } from "@/lib/og";
import { cityPath } from "@/lib/pseo/urls";
import { CITY_BY_SLUG } from "@/lib/pseo/locations";
import { getCityCards, getCountryBreakdown, getGapTotals, fmtCount, fmtPct } from "@/lib/landing/no-website";
import { PageShell, Hero, StatStrip, Section, Prose, GapTable, Cta, Faq, CityStrip } from "@/components/landing/NoWebsitePieces";

export const dynamic = "force-dynamic";

const TITLE = "Find Local Businesses Without Websites";

export async function generateMetadata(): Promise<Metadata> {
  const [totals, countries] = await Promise.all([
    getGapTotals().catch(() => null),
    getCountryBreakdown().catch(() => []),
  ]);
  const india = countries.find((c) => c.code === "in");

  return {
    // 38 chars -> 47 with the " — Mantis" suffix.
    title: TITLE,
    description: india
      ? `Find local businesses with no website, in any city we cover. ${fmtPct(india.gapRate)} of the businesses we checked in India have no site at all. Free to browse.`
      : totals?.qualifying
        ? `Find local businesses with no website. ${fmtCount(totals.qualifying)} verified across ${fmtCount(totals.cities)} cities, with ratings, categories and review counts.`
        : "Find local businesses with no website, city by city. Verified against live map data, free to browse.",
    alternates: { canonical: `${COMPANY.site}/find-businesses-without-websites` },
    openGraph: {
      title: TITLE,
      url: `${COMPANY.site}/find-businesses-without-websites`,
      images: ogImageMeta({
        v: "leads",
        eyebrow: "No-website leads",
        t1: "Find local businesses",
        t2: "with no website.",
        cta: "Browse free →",
        url: "mantisai.in/find-businesses-without-websites",
      }),
    },
    twitter: { card: "summary_large_image" },
  };
}

const FAQS = [
  {
    q: "How do I find businesses without websites for free?",
    a: "Search a category and area in Google Maps and open each listing to see whether the website field is set. It is free and it works for a small area. It does not scale, because Maps has no filter for the absent website field, caps results per search, and shows a website link for profiles pointing at dead domains and social pages. The city pages here are that work already done and re-verified.",
  },
  {
    q: "How many small businesses have no website?",
    a: "It depends enormously on the country, which is why a single global figure is misleading. In India roughly two in three of the small businesses we check have no website. In the US and UK it is a small fraction of that. The country table on this page shows our measured rate for each place we cover, with the number of listings behind it.",
  },
  {
    q: "Can I get a list of businesses without websites in my country?",
    a: "Only where we have actually scanned and verified listings, which is what the country table shows. We would rather publish five countries with real counts than claim worldwide coverage and return an empty page for most of it.",
  },
  {
    q: "Do I need an account?",
    a: "No. Every city page, count and gap rate on this site is public and needs no signup. An account and credits are only involved when you unlock a specific business's phone number and address to contact it.",
  },
];

export default async function FindBusinessesPage() {
  const [totals, countries, cityRows] = await Promise.all([
    getGapTotals().catch(() => null),
    getCountryBreakdown().catch(() => []),
    getCityCards().catch(() => []),
  ]);

  const cities = cityRows
    .map((p) => {
      const city = CITY_BY_SLUG.get(p.city_slug);
      if (!city) return null;
      return { slug: p.city_slug, name: city.name, href: cityPath(p.service_slug, p.city_slug), qualifying: p.qualifying_leads };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <PageShell>
      <Hero
        eyebrow="No-website leads"
        h1="Find local businesses without websites"
        lede={
          totals && totals.qualifying > 0 ? (
            <>
              Every business here has been checked, not guessed:{" "}
              <strong style={{ color: "var(--g-ink)" }}>{fmtCount(totals.qualifying)}</strong> with an
              active Google listing and no website, out of {fmtCount(totals.checked)} listings verified
              either way. Browse by city, or see which countries have the biggest gap.
            </>
          ) : (
            <>
              Businesses with an active Google listing and no website of their own — checked rather
              than guessed, and published city by city.
            </>
          )
        }
      />

      {totals && totals.checked > 0 && (
        <StatStrip
          stats={[
            { value: fmtCount(totals.qualifying), label: "with no website" },
            { value: fmtPct(totals.gapRate), label: "gap rate overall" },
            { value: fmtCount(totals.countries), label: "countries" },
            { value: fmtCount(totals.cities), label: "cities" },
          ]}
        />
      )}

      {countries.length > 0 && (
        <Section h2="The website gap is not the same everywhere">
          <Prose>
            <p style={{ margin: "0 0 16px" }}>
              This is the figure that decides whether prospecting this way is worth your time, and
              almost nobody publishes it. The share of small businesses with no website varies by an
              order of magnitude between countries — so the same hour of prospecting produces a
              wildly different number of qualifying leads depending on where you point it.
            </p>
          </Prose>
          <GapTable
            caption="Measured from listings we have verified in each country, not modelled."
            head={["Country", "No website", "Checked", "Gap rate"]}
            rows={countries.map((c) => ({
              key: c.code,
              cells: [c.name, fmtCount(c.qualifying), fmtCount(c.checked), fmtPct(c.gapRate)],
            }))}
          />
        </Section>
      )}

      <CityStrip cities={cities} heading="Browse by city" />

      <Section h2="What we count as “no website”">
        <Prose>
          <p style={{ margin: "0 0 14px" }}>
            A business counts as having no website when its Google Business Profile has no site of its
            own. A Facebook page, an Instagram profile or a Linktree in that field still counts as no
            website, because the business owns none of them — it is renting an audience on a platform
            that can change the rules or disappear.
          </p>
          <p style={{ margin: "0 0 14px" }}>
            That choice makes our counts higher than a raw export of the website field, and it is the
            honest version for anyone selling websites: those businesses are exactly the ones who will
            tell you “we already have a Facebook page” on the first call, and exactly the ones for
            whom that is not the same thing.
          </p>
          <p style={{ margin: 0 }}>
            Listings we have not managed to verify either way are excluded from both the numerator and
            the denominator rather than assumed to have no site. The full method is on{" "}
            <Link href="/leads/methodology" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>
              the methodology page
            </Link>
            .
          </p>
        </Prose>
      </Section>

      <Faq items={FAQS} />

      <Cta
        title="See which industries have the biggest gap"
        body="Some categories run three or four times the average. Knowing which ones is the difference between a good day of calls and a wasted one."
        href="/industries-without-websites"
        label="View industries ranked"
      />
    </PageShell>
  );
}
