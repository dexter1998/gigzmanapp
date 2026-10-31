import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { ogImageMeta } from "@/lib/og";
import { cityPath } from "@/lib/pseo/urls";
import { CITY_BY_SLUG } from "@/lib/pseo/locations";
import { getCityCards, getCountryBreakdown, getGapTotals, getIndustryBreakdown, fmtCount, fmtPct } from "@/lib/landing/no-website";
import { PageShell, Hero, StatStrip, Section, Prose, GapTable, Cta, Faq, CityStrip } from "@/components/landing/NoWebsitePieces";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/pseo/Breadcrumbs";
import { NOSITE_LISTS } from "@/lib/lists/defs";
import { listPath } from "@/components/lists/ListView";

/**
 * The pillar for the whole no-website cluster (2026-10-24). Head terms measured that day: "businesses
 * without (a) website(s)" 1,600/mo US, "local businesses without websites" 720, "businesses that need
 * websites" 320, India 390 — all KD 0, and we sat at positions 74–85 with no page aimed at the head.
 * It links down to every category page, every published city and the four older angle pages, so the
 * cluster has one obvious parent instead of five siblings competing for the same query.
 */
const TITLE = "Businesses Without Websites: Verified List by City";
const URL = `${COMPANY.site}/businesses-without-websites`;

/** Per request (data read through day-cached aggregates / one indexed query): a static prerender
 *  would query the database during `next build`, which has no route to it. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getGapTotals().catch(() => null);
  return {
    title: { absolute: `${TITLE} | Mantis` },
    description: t?.qualifying
      ? `${fmtCount(t.qualifying)} local businesses without websites, verified across ${fmtCount(t.cities)} cities in ${fmtCount(t.countries)} countries. Browse by city and industry, free.`
      : "Local businesses without websites, verified city by city from live map data. Browse by city and industry, free.",
    alternates: { canonical: URL },
    openGraph: { title: TITLE, url: URL, images: ogImageMeta({ v: "leads", eyebrow: "No-website leads", t1: "Businesses without", t2: "websites, verified.", url: "mantisai.in/businesses-without-websites" }) },
    twitter: { card: "summary_large_image" },
  };
}

const FAQS = [
  { q: "How do I find businesses without websites?", a: "Search a category and an area on Google Maps and open each listing: if the website field is empty, or points at a Facebook page, Instagram or a directory, the business has no site of its own. It works for one street; it does not scale, because Maps cannot filter on a missing website and caps every search. The city and industry pages linked here are that check already done, and re-done as listings change." },
  { q: "Which businesses are most likely to have no website?", a: "Businesses whose customers arrive in person and choose on proximity: tailors, car repair garages, hardware stores, guest houses, small restaurants and cafés. Professions that are researched before they are chosen — dentists, lawyers, hotels — have far fewer gaps. The industry table on this page shows the measured rate for each." },
  { q: "Do businesses without websites actually buy one?", a: "Some do, many don't — which is why the useful list is not every business without a site but the ones with reviews, recent activity and a phone that is answered. A listing with fifty reviews and no website is a business that customers find and that has nowhere to send them; that is the conversation worth having." },
  { q: "Is a Facebook or Instagram page counted as a website?", a: "No. A business that sends people to a social profile, WhatsApp link, Google's free business site or a directory listing owns none of those, so we count it as having no website. That makes our counts higher than a raw export of the website field, and more honest for anyone selling websites." },
  { q: "Which countries do you cover?", a: "Only the countries in the table above, each with the number of listings we have actually checked. The gap varies enormously — roughly two in five small businesses in India, a small fraction of that in the US — so a single worldwide figure would be misleading." },
  { q: "Do I need an account to browse?", a: "No. Every count, city page and industry page is public. An account (free, with 500 credits once) is only needed to unlock a business's phone number, email and address, or to have Mantis build a list for your own city and category." },
];

export default async function BusinessesWithoutWebsites() {
  const [totals, countries, cityRows, industries] = await Promise.all([
    getGapTotals().catch(() => null), getCountryBreakdown().catch(() => []), getCityCards().catch(() => []), getIndustryBreakdown().catch(() => []),
  ]);
  const cities = cityRows
    .map((p) => { const c = CITY_BY_SLUG.get(p.city_slug); return c ? { slug: p.city_slug, name: c.name, href: cityPath(p.service_slug, p.city_slug), qualifying: p.qualifying_leads } : null; })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => b.qualifying - a.qualifying);
  const crumbs = [{ label: "Home", href: "/" }, { label: "Businesses without websites" }];
  const jsonLd = { "@context": "https://schema.org", "@graph": [
    { "@type": "CollectionPage", "@id": `${URL}#page`, name: TITLE, url: URL, isPartOf: { "@id": `${COMPANY.site}/#website` } },
    { "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    breadcrumbJsonLd(crumbs, COMPANY.site),
  ] };

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs items={crumbs} />
      <Hero
        eyebrow="No-website leads"
        h1="Businesses without websites"
        lede={totals?.qualifying ? (
          <>Mantis has found <strong style={{ color: "var(--g-ink)" }}>{fmtCount(totals.qualifying)} businesses without websites</strong> — each with an active Google listing and no site of its own — out of {fmtCount(totals.checked)} local businesses checked in {fmtCount(totals.cities)} cities. Browse them by city or by industry, free.</>
        ) : <>Local businesses with an active Google listing and no website of their own, checked rather than guessed, published city by city.</>}
      />
      <div style={{ marginTop: 22, borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--g-border)" }}>
        <Image src="/resources/thumbs/businesses-near-me-without-a-website.webp" alt="Illustration of local shops on a map, several without a website" width={1600} height={900} priority sizes="(max-width: 900px) 100vw, 852px" style={{ width: "100%", height: "auto", display: "block" }} />
      </div>
      {totals && totals.checked > 0 && (
        <StatStrip stats={[
          { value: fmtCount(totals.qualifying), label: "businesses without a website" },
          { value: fmtPct(totals.gapRate), label: "of businesses checked" },
          { value: fmtCount(totals.cities), label: "cities" },
          { value: fmtCount(totals.countries), label: "countries" },
        ]} />
      )}

      <Section h2="Browse by industry">
        <Prose><p style={{ margin: "0 0 16px" }}>The gap is a property of the business model more than of the place: categories where customers walk in and choose on proximity carry it, categories that are researched before they are chosen do not. Each page below lists the businesses in that industry with no website, with counts by city.</p></Prose>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {NOSITE_LISTS.map((d) => (
            <Link key={d.slug} href={listPath(d)} style={{ display: "block", padding: "12px 14px", background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", color: "var(--g-ink)", fontWeight: 600, fontSize: 14.5, textDecoration: "none" }}>
              {d.h1.charAt(0).toUpperCase() + d.h1.slice(1)} →
            </Link>
          ))}
        </div>
      </Section>

      {industries.length > 0 && (
        <Section h2="Which industries have the most businesses without websites">
          <GapTable caption="Measured share of checked businesses with no website, by category." head={["Category", "No website", "Checked", "Gap rate"]}
            rows={industries.slice(0, 15).map((r) => ({ key: r.category, cells: [r.label ?? r.category, fmtCount(r.qualifying), fmtCount(r.checked), fmtPct(r.gapRate)] }))} />
          <p style={{ fontSize: 13.5, color: "var(--g-ink-soft)", margin: "12px 0 0" }}>The full ranking is on <Link href="/industries-without-websites" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>industries without websites</Link>.</p>
        </Section>
      )}

      {countries.length > 0 && (
        <Section h2="Businesses without websites, by country">
          <Prose><p style={{ margin: "0 0 16px" }}>The same hour of prospecting finds a very different number of businesses depending on where you point it. This is the measured share in each country we cover — the figure that decides whether looking for businesses without websites is worth your time there.</p></Prose>
          <GapTable caption="Measured from listings we verified in each country, not modelled." head={["Country", "No website", "Checked", "Gap rate"]}
            rows={countries.map((c) => ({ key: c.code, cells: [c.name, fmtCount(c.qualifying), fmtCount(c.checked), fmtPct(c.gapRate)] }))} />
        </Section>
      )}

      <CityStrip cities={cities.slice(0, 60)} heading="Local businesses without websites, by city" />

      <Section h2="How to find businesses that need a website">
        <Prose>
          <p style={{ margin: "0 0 14px" }}><strong style={{ color: "var(--g-ink)" }}>By hand:</strong> search a category and area on Google Maps, open each result, and note the ones whose website field is empty or points at a social page. Expect around a minute per listing and a hard cap on results per search — fine for twenty businesses, not for two thousand. The step-by-step version is in <Link href="/resources/free-ways-to-find-businesses-without-websites" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>free ways to find businesses without websites</Link>.</p>
          <p style={{ margin: "0 0 14px" }}><strong style={{ color: "var(--g-ink)" }}>With Mantis:</strong> tell it what you sell and the area. It searches the map grid street by street, checks every website field (a Facebook page or a directory listing counts as no website), ranks what is left by reviews, recency and whether there is a mobile number, and gives you the list with phone numbers ready to call or message.</p>
          <p style={{ margin: 0 }}><strong style={{ color: "var(--g-ink)" }}>Then qualify:</strong> a business with no website and no reviews may not be trading. The ones worth the first call have reviews, recent activity and a number that is answered — <Link href="/resources/qualifying-a-local-lead-before-you-call" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>four checks before you call</Link>.</p>
        </Prose>
      </Section>

      <Section h2="Selling a website to a business that has none">
        <Prose>
          <p style={{ margin: "0 0 14px" }}>The objection you will hear first is “we already have a Facebook page”, and the answer is not to argue with it but to show what the page cannot do: be found in search for the service, take a booking, or belong to the business. Lead with something you can show in ten seconds — their listing has reviews and nowhere to send the people reading them.</p>
          <p style={{ margin: 0 }}>Guides that go further: <Link href="/resources/what-to-say-to-a-business-with-no-website" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>what to say to a business with no website</Link>, <Link href="/resources/we-already-have-a-facebook-page-objection" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>the Facebook-page objection</Link>, <Link href="/resources/cold-call-script-selling-websites-local-businesses" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>a cold-call script</Link> and <Link href="/resources/how-much-to-charge-for-a-website-india" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>what to charge</Link>.</p>
        </Prose>
      </Section>

      <Section h2="Other ways to look at the same data">
        <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8, fontSize: 15 }}>
          <li><Link href="/find-businesses-without-websites" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>Find businesses without websites</Link> — the country view</li>
          <li><Link href="/small-businesses-without-websites" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>Small businesses without websites</Link> — how many there are and why</li>
          <li><Link href="/businesses-near-me-without-websites" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>Businesses near me without websites</Link> — by nearest city</li>
          <li><Link href="/leads-for/website-redesign" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>Website redesign leads</Link> — businesses whose site is outdated</li>
          <li><Link href="/leads" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>The lead market</Link> — every published city</li>
        </ul>
      </Section>

      <Faq items={FAQS} />
      <Cta title="Find businesses without websites in your city" body="Free to start with 500 credits. Mantis searches your area, checks every website and gives you the ones worth calling." href="/login" label="Start free" />
    </PageShell>
  );
}
