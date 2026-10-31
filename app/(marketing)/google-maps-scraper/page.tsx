import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { ogImageMeta } from "@/lib/og";
import { CREDIT_COST, CREDIT_PACKS, FREE_SIGNUP_CREDITS, formatINR } from "@/lib/credits/pricing";
import { getCountryBreakdown, getGapTotals, fmtCount, fmtPct } from "@/lib/landing/no-website";
import { MarketingCta } from "@/components/marketing/MarketingPieces";
import {
  Band, Cards, CompareTable, Copy, Limits, PricingSummary, RelatedReading, Shot, Split, Steps, ToolFaq, ToolHero, ToolJsonLd, ToolLinks, ToolStats,
} from "@/components/marketing/ToolPagePieces";

// Same reason as the no-website pages: the live counts come from the database, and a prerender at
// build time would make `next build` need Postgres. The aggregates are cached for a day upstream.
export const dynamic = "force-dynamic";

const PATH = "/google-maps-scraper" as const;
const TITLE = "Google Maps Lead Scraper: Verified Local Leads";
const DESCRIPTION =
  "Find local business leads from Google Maps without running a scraper. Filter by no website, rating and reviews, get phones. Start with 500 free credits.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${COMPANY.site}${PATH}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${COMPANY.site}${PATH}`,
    images: ogImageMeta({ v: "leads", eyebrow: "Google Maps leads", t1: "Map leads, checked,", t2: "not just scraped.", cta: "Start free →", url: "mantisai.in/google-maps-scraper" }),
  },
  twitter: { card: "summary_large_image" },
};

const FAQS = [
  {
    q: "Is Mantis a Google Maps scraper?",
    a: "Not in the technical sense. It does not drive a browser over the Maps interface. It reads business listings through licensed map data, checks each business's website and public profiles, and keeps the results as leads you can filter and contact. The output is what most people want from a scraper — a list of local businesses with phone numbers, ratings and review counts — without the maintenance and terms-of-service risk of running one.",
  },
  {
    q: "Is scraping Google Maps legal?",
    a: "Scraping the Maps interface is against Google's terms of service. Whether that matters to you is a business decision rather than an engineering one, and it does not go away with better code. Licensed map data is the permitted route to the same listings, which is why it costs more per record than a scraper does.",
  },
  {
    q: "How many results can I get for one search?",
    a: "Google Maps itself shows a limited number of results per search (roughly 120), which is why scrapers have to split a city into many small areas. Mantis does that splitting for you: a run can cover a neighbourhood, a whole city, several cities or all of India, and it removes duplicates by place identity rather than by name.",
  },
  {
    q: "Can I get email addresses from Google Maps?",
    a: "A Maps listing does not carry an email address. Mantis reads the business's own website when it has one and grades the emails it finds: Tier 1 is a named person, Tier 2 a role inbox that reaches a decision (sales@, hello@), Tier 3 generic or support addresses. Businesses with no website usually have no email to find, and for those the phone number on the listing is the contact.",
  },
  {
    q: "Can I find businesses on Google Maps without a website?",
    a: "Yes, and it is the filter Mantis was built around. A business counts as having no website when its listing has none of its own; a Facebook page or Linktree in that field still counts as no website. The public lead pages on this site show how many verified no-website businesses there are by city and industry.",
  },
  {
    q: "How much does it cost compared with a scraper?",
    a: `Per raw record a scraper is cheaper, and we will not pretend otherwise. On Mantis, every account gets ${FREE_SIGNUP_CREDITS} free credits once; a live map lookup costs ${CREDIT_COST.billed_places_call} credits past the free daily allowance, searching an area that has already been scanned is free, and each new lead added to your list is ${CREDIT_COST.lead_unlock} credits. Paid plans start at ${formatINR(CREDIT_PACKS[0].pricePaise)} for ${CREDIT_PACKS[0].credits.toLocaleString("en-IN")} credits.`,
  },
  {
    q: "Can I export the leads to CSV or a CRM?",
    a: "Not from the current leads view: CSV export and CRM connectors such as HubSpot, Zoho or Pipedrive are not available yet. Leads stay in Mantis, where you can run email and AI voice call campaigns against them directly. If a CSV file is the whole point for you, a scraper is the better fit today.",
  },
];

export default async function GoogleMapsScraperPage() {
  const [totals, countries] = await Promise.all([getGapTotals().catch(() => null), getCountryBreakdown().catch(() => [])]);
  const india = countries.find((c) => c.code === "in");

  return (
    <>
      <ToolJsonLd path={PATH} name="Google Maps lead scraper" description={DESCRIPTION} />

      <ToolHero
        eyebrow="Google Maps leads"
        title="A Google Maps lead scraper"
        accent="that checks every lead."
        lede={
          <>
            Describe the businesses you want — <em>“salons in Pune with no website and at least 20 reviews”</em> — and Mantis pulls
            them from live map listings, reads each one’s website, and hands you phones, graded emails and the signals that make
            a lead worth calling. No browser bots to babysit, no proxies, no CSV clean-up.
          </>
        }
        image={{ src: "/marketing/product-lead-map.webp", width: 1600, height: 1068, alt: "Mantis lead map showing local businesses as pins, with a card for an internet cafe marked No website found and a 57% heat score" }}
        secondary={{ label: "Browse free leads", href: "/leads" }}
        note="No card needed. Searching ground we have already scanned is free."
      />

      {totals && totals.checked > 0 && (
        <ToolStats
          stats={[
            { value: fmtCount(totals.checked), label: "map listings checked for a website" },
            { value: fmtCount(totals.qualifying), label: "verified with no website" },
            { value: india ? fmtPct(india.gapRate) : fmtPct(totals.gapRate), label: india ? "of Indian businesses checked have no site" : "gap rate overall" },
            { value: fmtCount(totals.cities), label: "cities with published lead pages" },
          ]}
          caption="Live from our index, refreshed daily. Counts only include listings we have verified either way."
        />
      )}

      <Band title="What people actually want" accent="from a Maps scraper." sub="Hardly anyone wants raw Maps data. They want a short list of businesses worth contacting this week.">
        <Split
          aside={
            <Shot
              src="/resources/thumbs/scraping-google-maps-for-leads-what-breaks.webp"
              width={1600}
              height={900}
              alt="Illustration of a map feeding a conveyor of business cards, with a warning sign where duplicates and unmapped categories fall off"
              caption="Collection is the easy part. Deduplication, category mapping and re-checking are where a scraped list goes wrong."
            />
          }
        >
          <p>
            Search for “google maps scraper” and you will find browser extensions, cloud actors and open-source tools that turn a
            Maps search into a spreadsheet. They work, and for a one-off export they are the cheapest way to get rows. The
            trouble starts after the export.
          </p>
          <p>
            A raw scrape gives you every business in the search, including the ones that closed, the ones with three reviews from
            2019, and the chains you will never sell to. It does not tell you whether the website field points at a real site or a
            Facebook page. It has no email addresses, because Maps listings do not carry them. And it is a photograph: the website
            field is exactly the one that changes when a business does the thing you were going to sell them.
          </p>
          <p>
            Mantis treats Maps as the starting point rather than the deliverable. Discovery comes from map listings; qualification
            comes from reading what each business has (or lacks) online; and the list you get is ranked by who is most worth a call.
          </p>
        </Split>
      </Band>

      <Band title="How it works," accent="step by step." tone="white">
        <Steps
          steps={[
            { title: "Describe the lead", body: "Type the trade, the area and the filters in plain language: no website, review count range, rating range, trades to exclude. A neighbourhood, a city, a foreign city or all of India." },
            { title: "See the plan and the cost", body: "Mantis shows what it will search and quotes the credits before anything runs. You tap Run; nothing is spent on a plan you did not approve." },
            { title: "Listings are pulled and de-duplicated", body: "The area is split into small enough pieces to get past the per-search result cap, and repeats are removed by place identity rather than by name." },
            { title: "Each business is checked", body: "Its website is read for contacts and signals — no HTTPS, not mobile-ready, old copyright year, no analytics, a social page used as a website, site down." },
            { title: "Leads land in your list", body: "New businesses are added to Leads in a list named after the chat. Ones you already have cost nothing. From there you can run email and AI call campaigns." },
          ]}
        />
      </Band>

      <Band title="Scraper versus" accent="Mantis, honestly." sub="Both start from the same public listings. They differ in what happens next and in who carries the maintenance.">
        <CompareTable
          head={["", "Mantis Ai", "A typical Google Maps scraper"]}
          rows={[
            ["Price per raw record", "Higher — licensed data and per-lead credits", "Lower — published rates around $1.50–4 per 1,000 places"],
            ["Terms of service", "Licensed map data", "Scraping the Maps interface is against Google's terms"],
            ["When Maps changes its layout", "Nothing for you to fix", "The scraper can break until its maintainer updates it"],
            ["“No website” as a filter", "Built in, and verified (a Facebook page counts as no website)", "Usually a column you filter yourself"],
            ["Emails", "Read from the business's own site, graded Tier 1–3", "Not on the listing; extra enrichment step, often billed separately"],
            ["Website signals", "HTTPS, mobile, analytics, ad pixel, booking page, copyright year", "Not included"],
            ["Duplicates across overlapping searches", "Removed by place identity", "Yours to clean up"],
            ["Output", "Leads in Mantis, ready for email and AI call campaigns", "A CSV or JSON file you own outright"],
            ["CSV export", "Not available yet", "Yes — the whole point"],
          ]}
          note="Scraper pricing from the vendors' published pages, summarised in our comparison of Maps scrapers. Prices change; check before you buy."
        />
        <Copy>
          <p style={{ marginTop: 24 }}>
            If you need ten thousand rows in a file tonight and you are comfortable with the terms risk, a scraper is the right
            tool and it will cost less. If what you need is fifty businesses worth phoning tomorrow, with the dead ones already
            removed and a reason to call each one, that is the job Mantis is built for. Below about fifty leads a week, doing it by
            hand in Google Maps costs nothing at all —{" "}
            <Link href="/resources/google-maps-prospecting-for-web-designers">here is how to do that well</Link>.
          </p>
        </Copy>
      </Band>

      <Band title="What each lead" accent="comes with." tone="white">
        <Split
          reverse
          aside={
            <Shot
              src="/marketing/product-leads-table.webp"
              width={1600}
              height={687}
              alt="Mantis leads table with business name, a No website or Has website badge, category, rating, review count and a heat score for each lead"
              caption="A leads list with website status, rating, review count and heat score. Contact details are blurred in this screenshot."
            />
          }
        >
          <p>
            <strong>From the listing:</strong> business name, category, address, phone number, rating, review count, and whether it
            has a website of its own.
          </p>
          <p>
            <strong>From its website, when it has one:</strong> emails graded by who they reach, phones graded mobile, landline or
            toll-free (with a WhatsApp link only for mobiles), the company LinkedIn, the founder or owner name where the site
            states it, and the signals you picked — no HTTPS, not mobile-ready, no analytics, no ad pixel, an online booking or
            menu page present or missing.
          </p>
          <p>
            <strong>From the ranking:</strong> a heat score that weighs the gap you sell against with signs the business is
            trading. A no-website listing with eight reviews is usually dormant; one with four hundred is turning away online
            enquiries every week, and it is a completely different call.
          </p>
        </Split>
      </Band>

      <Band title="Who uses it" accent="this way.">
        <Cards
          items={[
            { title: "Web design agencies and freelancers", body: "Businesses with an active listing, real reviews and no website at all — the most direct pitch there is." },
            { title: "Marketing and SEO agencies", body: "Weak reviews, a low rating, no analytics or ad pixel, a site that is not mobile-ready: each is a reason to call." },
            { title: "Local B2B suppliers", body: "Find every restaurant, clinic or hardware store in a territory, then let the AI voice agent ask who handles purchasing." },
            { title: "Sales teams entering a new city", body: "Map a market before the first visit: how many businesses, which ones are busy, and who is reachable by phone." },
          ]}
        />
      </Band>

      <Band title="Where it falls short" accent="today." tone="white" sub="Worth knowing before you spend a credit.">
        <Limits
          items={[
            { title: "No CSV export or CRM sync yet", body: "Leads live in Mantis. If you need a file for another tool, a scraper or a manual export is the better route for now." },
            { title: "No emails for businesses without a website", body: "There is nowhere to read one from. You get the phone number on the listing, which for this segment is the channel that works anyway." },
            { title: "Not every lead has a named decision-maker", body: "The owner's name appears only where the business's own site states it. Emails are graded but not bounce-verified." },
            { title: "Businesses only, never consumers", body: "Mantis finds businesses. It does not produce lists of individual people." },
          ]}
        />
      </Band>

      <Band title="What it" accent="costs.">
        <PricingSummary />
      </Band>

      <Band title="Questions about" accent="Maps lead scraping." tone="white">
        <ToolFaq faqs={FAQS} />
      </Band>

      <Band title="Read the" accent="longer versions.">
        <RelatedReading
          posts={[
            { slug: "google-maps-scrapers-compared", title: "Google Maps Scrapers Compared: What Each One Costs", blurb: "Per-record pricing for the main scrapers, and where the costs stack." },
            { slug: "scraping-google-maps-for-leads-what-breaks", title: "Scraping Google Maps for Leads: What Breaks", blurb: "Deduplication, category mapping and the result cap, from building one." },
            { slug: "google-maps-prospecting-for-web-designers", title: "Google Maps Prospecting for Web Designers", blurb: "The free, manual version — and when it beats any tool." },
          ]}
        />
        <ToolLinks current={PATH} />
      </Band>

      <MarketingCta
        title="Skip the scraper,"
        accent="keep the leads."
        sub={`Describe the businesses you want and see the plan before anything runs. ${FREE_SIGNUP_CREDITS} free credits, no card.`}
        primary={{ label: "Get Free Access", href: "/login" }}
        secondary={{ label: "See pricing", href: "/pricing" }}
      />
    </>
  );
}
