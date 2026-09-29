import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { ogImageMeta } from "@/lib/og";
import { getIndustryBreakdown, getGapTotals, fmtCount, fmtPct } from "@/lib/landing/no-website";
import { PageShell, Hero, StatStrip, Section, Prose, GapTable, Cta, Faq } from "@/components/landing/NoWebsitePieces";

export const dynamic = "force-dynamic";

const TITLE = "Industries With the Most Missing Websites";

export async function generateMetadata(): Promise<Metadata> {
  const industries = await getIndustryBreakdown().catch(() => []);
  const top = industries[0];

  return {
    // 41 chars -> 50 with the suffix.
    title: TITLE,
    description: top
      ? `Which industries have the most businesses with no website, ranked from real listing data. ${top.label} leads with ${fmtCount(top.qualifying)} — a ${fmtPct(top.gapRate)} gap rate.`
      : "Which industries have the most businesses with no website, ranked from verified listing data rather than estimated.",
    alternates: { canonical: `${COMPANY.site}/industries-without-websites` },
    openGraph: {
      title: TITLE,
      url: `${COMPANY.site}/industries-without-websites`,
      images: ogImageMeta({
        v: "methodology",
        eyebrow: "The website gap",
        t1: "Which industries",
        t2: "still have no website.",
        cta: "See the ranking →",
        url: "mantisai.in/industries-without-websites",
      }),
    },
    twitter: { card: "summary_large_image" },
  };
}

const FAQS = [
  {
    q: "Which industry has the most businesses without websites?",
    a: "It is not the one most guides name. Ranked by absolute count from the listings we have verified, the table on this page shows the real order, alongside the gap rate for each — which is a different ranking again, because a large category with a modest gap rate can still contain more prospects than a small category where almost nobody has a site.",
  },
  {
    q: "Should I target the biggest count or the highest gap rate?",
    a: "Gap rate tells you how efficient your prospecting will be — how many listings you have to look at per qualifying lead. Absolute count tells you how long you can keep working that category before running out. For cold outreach at volume, sort by count; for a narrow, well-researched campaign in one city, sort by gap rate.",
  },
  {
    q: "Where do these percentages come from?",
    a: "They are counted, not modelled. Each row is the businesses in that category whose Google Business Profile has no website of its own, over the businesses in that category we have checked either way. Categories with fewer than twenty-five verified listings are left out, because a category with four businesses in it can show a 100% gap rate and mean nothing.",
  },
  {
    q: "Why is a business with a Facebook page counted as having no website?",
    a: "Because it does not own it. A social profile in the website field means the business is renting an audience on a platform whose rules and reach it does not control, and has no place of its own to send a customer. That is the pitch, so it is counted as a gap rather than as a site.",
  },
];

export default async function IndustriesPage() {
  const [industries, totals] = await Promise.all([
    getIndustryBreakdown().catch(() => []),
    getGapTotals().catch(() => null),
  ]);

  const byGapRate = [...industries].sort((a, b) => b.gapRate - a.gapRate).slice(0, 10);

  return (
    <PageShell>
      <Hero
        eyebrow="The website gap, measured"
        h1="Which industries have the most businesses without websites"
        lede={
          industries.length > 0 ? (
            <>
              Ranked from listings we have actually checked, not estimated from a sample or quoted
              from someone else's blog post. {fmtCount(industries.length)} categories, each with its
              real count and its real gap rate — so you can pick a category to call on evidence rather
              than on the usual guesses.
            </>
          ) : (
            <>
              Which kinds of business still have no website, ranked from verified listing data. The
              figures load from live data and are refreshed daily.
            </>
          )
        }
      />

      {totals && totals.checked > 0 && (
        <StatStrip
          stats={[
            { value: fmtCount(industries.length), label: "categories ranked" },
            { value: fmtCount(totals.qualifying), label: "businesses with no website" },
            { value: fmtPct(totals.gapRate), label: "average gap rate" },
            { value: fmtCount(totals.checked), label: "listings verified" },
          ]}
        />
      )}

      {industries.length > 0 ? (
        <>
          <Section h2="Ranked by how many businesses have no website">
            <Prose>
              <p style={{ margin: "0 0 16px" }}>
                This is the list to work from for volume. The top categories are where you can keep
                prospecting for weeks without exhausting the supply.
              </p>
            </Prose>
            <GapTable
              caption="Categories with at least 25 verified listings. Counted from live listing data, refreshed daily."
              head={["Industry", "No website", "Checked", "Gap rate"]}
              rows={industries.map((r) => ({
                key: r.category,
                cells: [r.label, fmtCount(r.qualifying), fmtCount(r.checked), fmtPct(r.gapRate)],
              }))}
            />
          </Section>

          <Section h2="Ranked by gap rate — where prospecting is most efficient">
            <Prose>
              <p style={{ margin: "0 0 16px" }}>
                A different question, and often a different answer. These are the categories where the
                highest share of businesses have no site, so the fewest listings have to be opened per
                qualifying lead. Useful when you are working one city carefully rather than at volume.
              </p>
            </Prose>
            <GapTable
              head={["Industry", "Gap rate", "No website", "Checked"]}
              rows={byGapRate.map((r) => ({
                key: r.category,
                cells: [r.label, fmtPct(r.gapRate), fmtCount(r.qualifying), fmtCount(r.checked)],
              }))}
            />
          </Section>
        </>
      ) : (
        <Section h2="Figures are loading">
          <Prose>
            <p style={{ margin: 0 }}>
              The industry breakdown is generated from live listing data and is briefly unavailable.
              The{" "}
              <Link href="/leads" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>
                city pages
              </Link>{" "}
              carry the same figures broken down by place.
            </p>
          </Prose>
        </Section>
      )}

      <Section h2="Why the two rankings disagree">
        <Prose>
          <p style={{ margin: "0 0 14px" }}>
            A category can top one table and be absent from the other, and the reason matters when you
            are deciding where to spend a week. Gap rate is a ratio; count is a quantity. A niche
            category where almost nobody has a website may have a 70% gap rate and only forty
            businesses in the city — a good afternoon, not a good quarter.
          </p>
          <p style={{ margin: 0 }}>
            The other thing the tables will not tell you is ability to pay, and it is worth being
            blunt about it: the categories with the very highest gap rates are often the smallest and
            least commercial businesses. A high gap rate means it is easy to find someone without a
            website; it does not mean it is easy to sell one.
          </p>
        </Prose>
      </Section>

      <Faq items={FAQS} />

      <Cta
        title="Pick a category and start calling"
        body="Each city page breaks the same figures down by area and category, with names, ratings and review counts for the strongest prospects."
        href="/leads"
        label="Browse cities"
      />
    </PageShell>
  );
}
