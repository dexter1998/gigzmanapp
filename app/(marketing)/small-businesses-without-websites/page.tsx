import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { ogImageMeta } from "@/lib/og";
import { cityPath } from "@/lib/pseo/urls";
import { CITY_BY_SLUG } from "@/lib/pseo/locations";
import { getCityCards, getCountryBreakdown, getGapTotals, fmtCount, fmtPct } from "@/lib/landing/no-website";
import { PageShell, Hero, StatStrip, Section, Prose, GapTable, Cta, Faq, CityStrip } from "@/components/landing/NoWebsitePieces";

export const dynamic = "force-dynamic";

const TITLE = "Small Businesses Without Websites";

export async function generateMetadata(): Promise<Metadata> {
  const [totals, countries] = await Promise.all([
    getGapTotals().catch(() => null),
    getCountryBreakdown().catch(() => []),
  ]);
  const india = countries.find((c) => c.code === "in");

  return {
    // 33 chars -> 42 with the suffix.
    title: TITLE,
    description: india
      ? `How many small businesses still have no website, measured: ${fmtPct(india.gapRate)} in India, and far less elsewhere. Real counts by country, city and industry.`
      : totals?.qualifying
        ? `How many small businesses still have no website, measured rather than estimated — ${fmtCount(totals.qualifying)} verified across ${fmtCount(totals.cities)} cities.`
        : "How many small businesses still have no website — counted from live listing data rather than estimated.",
    alternates: { canonical: `${COMPANY.site}/small-businesses-without-websites` },
    openGraph: {
      title: TITLE,
      url: `${COMPANY.site}/small-businesses-without-websites`,
      images: ogImageMeta({
        v: "network",
        eyebrow: "The website gap",
        t1: "Small businesses",
        t2: "with no website.",
        cta: "See the numbers →",
        url: "mantisai.in/small-businesses-without-websites",
      }),
    },
    twitter: { card: "summary_large_image" },
  };
}

const FAQS = [
  {
    q: "What percentage of small businesses have no website?",
    a: "There is no single honest answer, because it varies by an order of magnitude between countries. The country table on this page gives our measured rate for each place we cover, with the number of verified listings behind each figure. Treat any article quoting one global percentage with suspicion — it is almost always a US survey applied to the world.",
  },
  {
    q: "Why do so many small businesses still not have a website?",
    a: "Mostly because a Google listing plus a phone number already works well enough to keep them busy, and nothing has forced the question. Cost matters less than it used to; time and uncertainty matter more. The common view among owners is that a website is a project rather than a purchase, and no one has ever made it feel small.",
  },
  {
    q: "Is a Facebook page enough for a small business?",
    a: "It is enough to be found and not enough to be chosen. A social page gives no control over reach, no stable address to put on a card or a van, and nothing that survives the platform changing its rules. For the businesses on this site it is also the single most common objection you will hear on a first call, so it is worth having a real answer to rather than a dismissal.",
  },
  {
    q: "Can I see the actual businesses?",
    a: "Yes, and free. Each city page lists businesses with no website, ranked by how strong a prospect they are, with category, rating and review count. Credits are only spent when you unlock a specific business's phone number and address.",
  },
];

export default async function SmallBusinessesPage() {
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
        eyebrow="The website gap, measured"
        h1="Small businesses without websites"
        lede={
          totals && totals.checked > 0 ? (
            <>
              Of {fmtCount(totals.checked)} small-business listings we have checked,{" "}
              <strong style={{ color: "var(--g-ink)" }}>{fmtCount(totals.qualifying)}</strong> have no
              website at all — {fmtPct(totals.gapRate)}. Here is how that breaks down by country and
              by city, and what it means if you sell websites for a living.
            </>
          ) : (
            <>
              How many small businesses still have no website of their own, counted from live listing
              data rather than estimated from a survey.
            </>
          )
        }
      />

      {totals && totals.checked > 0 && (
        <StatStrip
          stats={[
            { value: fmtPct(totals.gapRate), label: "have no website" },
            { value: fmtCount(totals.qualifying), label: "businesses, verified" },
            { value: fmtCount(totals.countries), label: "countries measured" },
            { value: fmtCount(totals.cities), label: "cities measured" },
          ]}
        />
      )}

      {countries.length > 0 && (
        <Section h2="The number depends entirely on where you look">
          <Prose>
            <p style={{ margin: "0 0 16px" }}>
              This is the part most articles get wrong. A US survey figure tells you nothing useful
              about a market where the rate is many times higher, and a global average tells you
              nothing about anywhere. Each row below is counted from listings we verified in that
              country.
            </p>
          </Prose>
          <GapTable
            head={["Country", "No website", "Checked", "Gap rate"]}
            rows={countries.map((c) => ({
              key: c.code,
              cells: [c.name, fmtCount(c.qualifying), fmtCount(c.checked), fmtPct(c.gapRate)],
            }))}
          />
        </Section>
      )}

      <Section h2="What this means if you sell websites">
        <Prose>
          <p style={{ margin: "0 0 14px" }}>
            The practical consequence of the table above is that the same prospecting method produces
            completely different results in different markets. Where the gap rate is high, almost
            every third listing you open is a qualifying lead and volume is never the constraint —
            closing is. Where it is low, finding a business without a website is itself the hard part,
            and a list is worth far more than a method.
          </p>
          <p style={{ margin: 0 }}>
            Worth saying plainly: a high gap rate is not the same as a high close rate. The businesses
            least likely to have a website are often the smallest and least able to pay for one. The
            reviews and ratings on each city page exist precisely to separate a trading business with
            real customers from a listing that has been quiet for two years.
          </p>
        </Prose>
      </Section>

      <CityStrip cities={cities} heading="See the businesses, city by city" />

      <Faq items={FAQS} />

      <Cta
        title="Which industries have the biggest gap?"
        body="Some categories run several times the average rate. The ranked table shows which, with the verified count behind every row."
        href="/industries-without-websites"
        label="View industries ranked"
      />
    </PageShell>
  );
}
