import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { ogImageMeta } from "@/lib/og";
import { cityPath } from "@/lib/pseo/urls";
import { CITY_BY_SLUG } from "@/lib/pseo/locations";
import { getCityCards, getGapTotals, fmtCount, fmtPct } from "@/lib/landing/no-website";
import { PageShell, Hero, StatStrip, Section, Prose, GapTable, Cta, Faq, CityStrip } from "@/components/landing/NoWebsitePieces";

export const dynamic = "force-dynamic";

const TITLE = "Web Design Leads From No-Website Firms";

export async function generateMetadata(): Promise<Metadata> {
  const totals = await getGapTotals().catch(() => null);

  return {
    // 38 chars -> 47 with the suffix.
    title: TITLE,
    description: totals?.qualifying
      ? `Web design leads with no website at all — not a redesign pitch. ${fmtCount(totals.qualifying)} verified businesses with active listings, ratings and review counts. No per-lead fees.`
      : "Web design leads that have no website at all, not a redesign pitch. Verified active listings with ratings and review counts. No per-lead fees.",
    alternates: { canonical: `${COMPANY.site}/web-design-leads` },
    openGraph: {
      title: TITLE,
      url: `${COMPANY.site}/web-design-leads`,
      images: ogImageMeta({
        v: "leads",
        eyebrow: "Web design leads",
        t1: "Businesses with no",
        t2: "website at all.",
        cta: "Browse free →",
        url: "mantisai.in/web-design-leads",
      }),
    },
    twitter: { card: "summary_large_image" },
  };
}

const FAQS = [
  {
    q: "How much do web design leads cost here?",
    a: "There is no per-lead price. Browsing every business, count, rating and category is free and needs no account; credits are spent only when you unlock a specific business's phone number and address. That is a different model from lead vendors, who typically charge a hundred dollars or more per introduction with no guarantee it closes.",
  },
  {
    q: "Are these exclusive leads?",
    a: "No, and you should be careful with anyone who promises otherwise. These are public businesses with public Google listings — nobody can sell you exclusive rights to phone a shop. What you get instead is a list nobody else has bothered to verify, and the ranking signals to work it in a sensible order.",
  },
  {
    q: "How is this different from buying web design leads?",
    a: "A bought lead is usually someone who filled in a form saying they want a website, sold simultaneously to four agencies. A lead here is a trading business that demonstrably has no website and has not asked anyone for one. The first is warmer and contested; the second is colder and uncontested. The second is also far cheaper, which changes what a low close rate costs you.",
  },
  {
    q: "Are the businesses actually active?",
    a: "Review counts and ratings are shown for exactly this reason, and the ranking uses them. A listing with no reviews may be dormant. A listing with twenty or more recent reviews and a good rating is a business with customers and nowhere online to send them — the strongest prospect on the list.",
  },
];

export default async function WebDesignLeadsPage() {
  const [totals, cityRows] = await Promise.all([
    getGapTotals().catch(() => null),
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
        eyebrow="Web design leads"
        h1="Web design leads from businesses with no website"
        lede={
          totals && totals.qualifying > 0 ? (
            <>
              Not "might want a redesign" — <strong style={{ color: "var(--g-ink)" }}>no website at
              all</strong>. {fmtCount(totals.qualifying)} verified businesses across{" "}
              {fmtCount(totals.cities)} cities, each with an active Google listing, real reviews and
              nowhere to send a customer online. Free to browse, no per-lead fee.
            </>
          ) : (
            <>
              Web design leads that have no website at all, rather than one they might want replaced.
              Free to browse, no per-lead fee.
            </>
          )
        }
      />

      {totals && totals.checked > 0 && (
        <StatStrip
          stats={[
            { value: fmtCount(totals.qualifying), label: "leads with no website" },
            { value: fmtPct(totals.gapRate), label: "of listings checked" },
            { value: fmtCount(totals.cities), label: "cities" },
            { value: "₹0", label: "per lead to browse" },
          ]}
        />
      )}

      <Section h2="Bought leads versus found leads">
        <Prose>
          <p style={{ margin: "0 0 16px" }}>
            Most agencies buy leads, which means buying an introduction to someone who filled in a
            form — and who usually filled in four. The economics are worth laying out side by side,
            because the cheaper option is not automatically the better one and it depends entirely on
            your close rate.
          </p>
        </Prose>
        <GapTable
          head={["", "Bought lead", "No-website lead"]}
          rows={[
            { key: "cost", cells: ["Typical cost", "$100–200 each", "Free to browse"] },
            { key: "excl", cells: ["Exclusivity", "Often shared 3–4 ways", "Uncontested, but public"] },
            { key: "warm", cells: ["Warmth", "Asked for a quote", "Has not asked anyone"] },
            { key: "comp", cells: ["Competing with", "Other agencies, now", "Nobody yet"] },
            { key: "incumbent", cells: ["Existing site", "Usually has one", "None at all"] },
            { key: "effort", cells: ["Work per close", "Lower", "Higher"] },
          ]}
        />
        <Prose>
          <p style={{ margin: "16px 0 0" }}>
            The honest summary: a bought lead converts more often per conversation and costs
            enough that a bad month hurts. A no-website lead converts less often and costs almost
            nothing, so the constraint moves from budget to your own time. If you have more time than
            money — which describes most freelancers and new agencies — the second column wins.
          </p>
        </Prose>
      </Section>

      <Section h2="What you get on each lead">
        <Prose>
          <p style={{ margin: "0 0 14px" }}>
            Business name, category, rating, review count, the area it trades in, and when we last
            verified that it still has no website. That is enough to decide whether it is worth a call
            before spending anything.
          </p>
          <p style={{ margin: 0 }}>
            Phone number and full address sit behind a credit, because that is the part that is
            genuinely expensive to keep accurate.{" "}
            <Link href="/pricing" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>
              Pricing
            </Link>{" "}
            has the current rate.
          </p>
        </Prose>
      </Section>

      <CityStrip cities={cities} heading="Browse leads by city" />

      <Faq items={FAQS} />

      <Cta
        title="Work the highest-gap industries first"
        body="Some categories run several times the average no-website rate. Starting there is the cheapest way to raise your leads-per-hour."
        href="/industries-without-websites"
        label="See industries ranked"
      />
    </PageShell>
  );
}
