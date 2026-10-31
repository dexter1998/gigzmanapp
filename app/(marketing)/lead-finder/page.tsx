import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { ogImageMeta } from "@/lib/og";
import { CREDIT_COST, FREE_SIGNUP_CREDITS } from "@/lib/credits/pricing";
import { getCountryBreakdown, getGapTotals, fmtCount, fmtPct } from "@/lib/landing/no-website";
import { MarketingCta } from "@/components/marketing/MarketingPieces";
import {
  Band, Cards, CompareTable, Copy, Limits, PricingSummary, RelatedReading, Shot, Split, Steps, ToolFaq, ToolHero, ToolJsonLd, ToolLinks, ToolStats,
} from "@/components/marketing/ToolPagePieces";

// Live counts come from the database; see app/(marketing)/find-businesses-without-websites.
export const dynamic = "force-dynamic";

const PATH = "/lead-finder" as const;
const TITLE = "Lead Finder: Find B2B and Local Business Leads";
const DESCRIPTION =
  "Find leads by describing your customer: local businesses, B2B companies, funded startups, with graded emails and phones. Start with 500 free credits.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${COMPANY.site}${PATH}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${COMPANY.site}${PATH}`,
    images: ogImageMeta({ v: "nearby", eyebrow: "Lead finder", t1: "Describe your customer.", t2: "Get the leads.", cta: "Find leads free →", url: "mantisai.in/lead-finder" }),
  },
  twitter: { card: "summary_large_image" },
};

const FAQS = [
  {
    q: "What is a lead finder?",
    a: "A tool that turns a description of your customer into a list of businesses you can contact. Some search a stored database of companies and people; others search live sources at the moment you ask. Mantis does the second: it searches map listings, the web, funding news and developer profiles, then reads each business's own website for contacts and signals.",
  },
  {
    q: "How do I find leads for my business?",
    a: "Start with one sentence that names the trade, the place and the reason they would buy: “restaurants in Indore with no online menu”, “logistics startups in Mumbai that raised money this year”. Then work a small list well before buying a big one. Fifty well-chosen businesses, each with a reason to call, beat five thousand rows nobody qualifies.",
  },
  {
    q: "Can I find leads for free?",
    a: `Yes, in two ways. The public lead pages on this site list verified businesses with no website by city and industry, free and without an account. And every new account gets ${FREE_SIGNUP_CREDITS} free credits once; at ${CREDIT_COST.lead_unlock} credits per new lead that is enough to build and test a real first list.`,
  },
  {
    q: "Does the lead finder give emails and phone numbers?",
    a: "Phones come from the business listing, graded mobile, landline or toll-free, with a WhatsApp link only for mobiles. Emails are read from the business's own website and graded: Tier 1 a named person, Tier 2 a role inbox that reaches a decision, Tier 3 generic or support. Businesses with no website usually have no email to find, so for them the phone is the contact.",
  },
  {
    q: "Can it find leads outside India?",
    a: "Yes. A run can target a foreign city as well as an Indian neighbourhood, a whole city or all of India. Coverage is deepest where we have scanned most, which the country table on our no-website pages shows openly.",
  },
  {
    q: "Is it a B2B lead finder or for local businesses?",
    a: "Both. Local businesses come from map listings by trade and area. Companies that are not on maps, such as SaaS firms, importers and product companies, come from web search. It finds businesses only, never individual consumers.",
  },
];

export default async function LeadFinderPage() {
  const [totals, countries] = await Promise.all([getGapTotals().catch(() => null), getCountryBreakdown().catch(() => [])]);
  const india = countries.find((c) => c.code === "in");
  const us = countries.find((c) => c.code === "us");

  return (
    <>
      <ToolJsonLd path={PATH} name="Lead finder" description={DESCRIPTION} />

      <ToolHero
        eyebrow="Lead finder"
        title="Find leads by describing"
        accent="your customer."
        lede={
          <>
            No filter trees, no boolean strings. Write who you sell to the way you would explain it to a colleague, check the plan
            Mantis proposes, and get a ranked list of businesses with graded contacts and the reason each one matched.
          </>
        }
        image={{ src: "/marketing/product-leads-table.webp", width: 1600, height: 687, alt: "Mantis leads list with businesses tagged No website or Has website, their category, rating, review count and heat score" }}
        secondary={{ label: "Browse free leads", href: "/leads" }}
        note="Contact details are blurred in the screenshot; in the app they are on every lead you add."
      />

      {totals && totals.checked > 0 && (
        <ToolStats
          stats={[
            { value: fmtCount(totals.checked), label: "businesses verified in our index" },
            { value: fmtCount(totals.qualifying), label: "with no website of their own" },
            { value: india ? fmtPct(india.gapRate) : "—", label: "no-website rate in India" },
            { value: us ? fmtPct(us.gapRate) : fmtCount(totals.countries), label: us ? "no-website rate in the US" : "countries covered" },
          ]}
          caption="Live from our index. The gap between countries is the reason a lead finder that only reads websites misses most of the Indian market."
        />
      )}

      <Band title="Where a lead finder" accent="looks decides what it finds.">
        <Split
          aside={
            <Shot
              src="/resources/thumbs/bought-database-vs-live-search.webp"
              width={1600}
              height={900}
              alt="Illustration contrasting a filing cabinet of stored contact cards with a live map search returning checked local businesses"
              caption="A stored database answers from what it collected. A live search answers from what is there today."
            />
          }
        >
          <p>
            Most lead finders search a database somebody built earlier, and that database is assembled from what is easy to crawl:
            company websites, professional profiles, email patterns. It works well for companies that live online. It quietly
            excludes the ones that do not — and in India that is a very large share of the market.
          </p>
          <p>
            In our own index, {india ? <strong>{fmtPct(india.gapRate)} of Indian businesses checked have no website</strong> : <strong>a large share of Indian businesses have no website</strong>}
            {us ? <>, against {fmtPct(us.gapRate)} in the US</> : null}. A lead finder that starts from websites cannot see those
            businesses at all, however good its filters are.
          </p>
          <p>
            Mantis searches at the moment you ask, across the sources where each kind of business actually shows up: map listings
            for local trades, web search for companies that are not on maps, funding news for startups, public developer profiles
            for software teams.
          </p>
        </Split>
      </Band>

      <Band title="Four ways" accent="to find leads." tone="white">
        <Cards
          items={[
            { title: "Local businesses by trade and area", body: "Gyms in Gurugram, tailors in Surat, plumbers in Leeds. From a neighbourhood up to all of India, with the no-website filter built in." },
            { title: "Companies that are not on maps", body: "SaaS firms, importers, product companies and B2B services, found through web search and read from their own sites." },
            { title: "Startups that raised money", body: "Funding round, amount and date, so you can reach a company in the months it is spending on new suppliers." },
            { title: "Developers and dev companies", body: "From public developer profiles, for anyone selling tools, hiring or partnerships to software teams." },
          ]}
        />
      </Band>

      <Band title="How to find leads" accent="with Mantis.">
        <Steps
          steps={[
            { title: "Say who you want", body: "Trade or company type, place, count, and what makes them a fit: no website, a rating range, hiring now, several branches." },
            { title: "Pick the business profile", body: "Tell Mantis what you sell — from your website or one line — so it can judge fit and size for your offer, not just keywords." },
            { title: "Check the plan", body: "The scope and a credit quote appear before anything runs. Adjust the brief or tap Run." },
            { title: "Work the list", body: `New leads cost ${CREDIT_COST.lead_unlock} credits each; ones you already have are free. Each shows why it matched and how to reach it.` },
          ]}
        />
        <Copy>
          <p style={{ marginTop: 28 }}>
            A good first brief is narrow. “Clinics in Gurgaon that don’t have a website” returns a list you can call this week;
            “all businesses in Delhi” returns a list nobody will finish. If you are not sure which niche to start with,{" "}
            <Link href="/industries-without-websites">the industries ranked by website gap</Link> is a useful place to look, and
            the chat will also answer strategy questions using our own coverage numbers.
          </p>
        </Copy>
      </Band>

      <Band title="Live search versus" accent="a stored database." tone="white">
        <CompareTable
          head={["", "Mantis Ai (live search)", "Database lead finder"]}
          rows={[
            ["Small businesses with no website", "Found — it is the core filter", "Mostly absent"],
            ["Freshness", "Read when you search; already-scanned areas are re-used for free", "As fresh as the last crawl"],
            ["Named people at large companies", "Only where a company's site names them", "Broad coverage — their strength"],
            ["Speed for a big list", "Slower: each business is read", "Instant: the rows already exist"],
            ["Reason to contact", "The matching signal on every lead", "Usually firmographics only"],
            ["Contacts", "Phones on almost every local lead; emails graded Tier 1–3", "Verified emails and direct dials, varying by region"],
            ["Next step", "Email and AI voice call campaigns in the same tool", "Export to a sequencer"],
          ]}
          note="A database is the faster tool for large, well-documented companies. Live search wins where the businesses you want are not documented yet."
        />
      </Band>

      <Band title="Before you" accent="sign up.">
        <Limits
          items={[
            { title: "Businesses only", body: "Mantis does not find individual consumers. For a consumer-facing business it suggests partners and suppliers to approach instead." },
            { title: "No verified emails or named owner on every lead", body: "Owners appear only where the business's site names them, and emails are graded rather than bounce-checked." },
            { title: "Some signals are not available yet", body: "New registrations (MCA, GST), RERA projects, ad libraries, Instagram last-post date and page-speed scores are not read today." },
            { title: "No CSV export or CRM sync from the leads view", body: "You work the list inside Mantis, with its own email and AI call campaigns." },
          ]}
        />
      </Band>

      <Band title="What it" accent="costs." tone="white">
        <PricingSummary />
      </Band>

      <Band title="Lead finder" accent="questions.">
        <ToolFaq faqs={FAQS} />
      </Band>

      <Band title="Related" accent="guides." tone="white">
        <RelatedReading
          posts={[
            { slug: "bought-database-vs-live-search", title: "Bought Database vs Live Search", blurb: "Why maintenance, not collection, is the real cost of a lead list." },
            { slug: "how-to-build-a-lead-list-for-a-web-design-agency", title: "How to Build a Lead List for a Web Design Agency", blurb: "From niche choice to a list you can actually call." },
            { slug: "qualifying-a-local-lead-before-you-call", title: "Qualifying a Local Lead Before You Call", blurb: "The checks that separate a busy business from a dormant listing." },
          ]}
        />
        <ToolLinks current={PATH} />
      </Band>

      <MarketingCta
        title="Find your first fifty"
        accent="leads today."
        sub={`Write one sentence about your customer and see the plan before anything runs. ${FREE_SIGNUP_CREDITS} free credits, no card.`}
        primary={{ label: "Get Free Access", href: "/login" }}
        secondary={{ label: "Browse free leads", href: "/leads" }}
      />
    </>
  );
}
