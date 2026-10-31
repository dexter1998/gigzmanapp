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

const PATH = "/clay-alternative" as const;
const TITLE = "Clay Alternative for Local and SMB Prospecting";
const DESCRIPTION =
  "Compare Mantis Ai with Clay: plain-language lead search, no-website signals, built-in email and AI calls, INR credits. Start with 500 free credits.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${COMPANY.site}${PATH}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${COMPANY.site}${PATH}`,
    images: ogImageMeta({ v: "network", eyebrow: "Clay alternative", t1: "Prospecting without", t2: "building a workflow.", cta: "Start free →", url: "mantisai.in/clay-alternative" }),
  },
  twitter: { card: "summary_large_image" },
};

const FAQS = [
  {
    q: "What is the best Clay alternative?",
    a: "It depends on why you are leaving. If Clay's flexibility is what you need but the price or complexity is the problem, the closest substitutes are other enrichment workbenches. If what you actually wanted was a list of the right small businesses with contacts and a reason to call, without building a table and a waterfall first, a lead tool that does the workflow for you is the better fit. Mantis is the second kind.",
  },
  {
    q: "Is Mantis cheaper than Clay?",
    a: `We do not quote Clay's prices here because they change and depend on plan and usage. The structural difference is that Clay charges data credits per enrichment attempt, while Mantis charges ${CREDIT_COST.lead_unlock} credits per new lead added to your list, ${CREDIT_COST.billed_places_call} credits for a live map lookup past the free allowance, and nothing for areas already scanned. Plans are in rupees, start with ${FREE_SIGNUP_CREDITS} free credits and have no seats.`,
  },
  {
    q: "Can Mantis do waterfall enrichment like Clay?",
    a: "Not in the same way. Clay lets you chain many data providers and fall through them until one returns a value. Mantis runs its own pipeline: it finds the business, reads its website and public profiles, and grades the contacts it finds. You cannot add your own providers or write custom formulas.",
  },
  {
    q: "Does Clay find businesses without websites?",
    a: "Clay's enrichment is largely keyed on a company domain, so a business with no website gives most providers nothing to work with. Finding businesses with no website — and filtering on that absence — is the core of what Mantis does.",
  },
  {
    q: "Does Mantis integrate with HubSpot or Salesforce like Clay?",
    a: "No. CRM connectors and CSV export from the leads view are not available yet. Mantis runs the outreach itself, with email from your own mailbox and AI voice calls. If pushing enriched rows into a CRM is your core workflow, Clay is the better tool today.",
  },
  {
    q: "Who should stay on Clay?",
    a: "RevOps and growth teams who enjoy building custom enrichment workflows, need many data providers, and sync everything into a CRM. That is what Clay is excellent at, and Mantis does not try to replace it.",
  },
];

export default async function ClayAlternativePage() {
  const [totals, countries] = await Promise.all([getGapTotals().catch(() => null), getCountryBreakdown().catch(() => [])]);
  const india = countries.find((c) => c.code === "in");

  return (
    <>
      <ToolJsonLd path={PATH} name="Clay alternative" description={DESCRIPTION} />

      <ToolHero
        eyebrow="Clay alternative"
        title="A Clay alternative for teams that"
        accent="sell to small businesses."
        lede={
          <>
            Clay is a workbench: tables, enrichment providers and formulas you assemble yourself. Mantis is the finished workflow
            for one job — finding small and local businesses that need what you sell, reading why, and reaching them by email and
            AI call. Describe the customer; skip the build.
          </>
        }
        image={{ src: "/marketing/product-lead-map.webp", width: 1600, height: 1068, alt: "Mantis lead map with local businesses as pins and a lead card showing a heat score, No website found and an Add to leads button" }}
        secondary={{ label: "See pricing", href: "/pricing" }}
        note="No seats, no annual contract, INR billing."
      />

      {totals && totals.checked > 0 && (
        <ToolStats
          stats={[
            { value: fmtCount(totals.qualifying), label: "businesses verified with no website" },
            { value: india ? fmtPct(india.gapRate) : fmtPct(totals.gapRate), label: india ? "of Indian businesses checked have no site" : "have no website" },
            { value: `${CREDIT_COST.lead_unlock}`, label: "credits per new lead, not per attempt" },
            { value: `${FREE_SIGNUP_CREDITS}`, label: "free credits to start" },
          ]}
          caption="Index figures are live and refreshed daily."
        />
      )}

      <Band title="Clay is a workbench." accent="Most people wanted the result.">
        <Split
          aside={
            <Shot
              src="/resources/thumbs/why-tech-stack-filtering-misses-your-best-prospects.webp"
              width={1600}
              height={900}
              alt="Illustration of a sieve filtering company website cards while a magnifying glass finds small shopfronts outside it"
              caption="Filters keyed on a website can only see businesses that have one."
            />
          }
        >
          <p>
            Clay deserves its reputation. It turns prospecting into a spreadsheet you can program: pull companies in, run them
            through a long list of data providers until one returns an email, add an AI research step, write formulas, push the
            result into your CRM. For a growth engineer, that flexibility is the product.
          </p>
          <p>
            For a ten-person agency or a founder doing their own sales, the same flexibility is a project. You design the table,
            pick providers, debug why half the rows came back empty, and pay for the attempts along the way. Many teams that search
            for a Clay alternative are not unhappy with Clay — they just never wanted to build the machine.
          </p>
          <p>
            There is also a coverage question. Clay’s enrichment is mostly keyed on a company domain. A clinic, a hardware
            supplier or a coaching centre with no website has no domain to enrich — and{" "}
            {india ? <>in India that is {fmtPct(india.gapRate)} of the businesses we have checked</> : <>in India that is a large share of small businesses</>}.
            Mantis starts from map listings and the web, so those businesses are not just present; their missing website is a
            filter.
          </p>
        </Split>
      </Band>

      <Band title="Mantis and Clay," accent="side by side." tone="white" sub="Where Clay is stronger, the table says so.">
        <CompareTable
          head={["", "Mantis Ai", "Clay"]}
          rows={[
            ["What it is", "A lead tool with the workflow built in", "A programmable enrichment workbench"],
            ["Getting started", "Write one sentence; approve a plan", "Build a table, choose sources and enrichments"],
            ["Data sources", "Its own pipeline: map listings, web search, funding news, developer profiles, each business's website", "A long list of third-party data providers you can chain — far broader"],
            ["Businesses with no website", "Found, verified and filterable", "Hard: most enrichment needs a domain"],
            ["Website signals", "HTTPS, mobile-ready, analytics, ad pixel, booking page, copyright year, site down", "Possible with the right providers and formulas"],
            ["Custom logic", "Not available", "Formulas, AI columns, conditional runs — its biggest strength"],
            ["Outreach", "Email from your mailbox plus AI voice calls in English, Hindi or Hinglish", "Sends to sequencers and CRMs through integrations"],
            ["CRM and exports", "Not available yet", "Mature integrations"],
            ["Billing", "INR credits per new lead; already-scanned areas free", "Credits per data attempt, on a subscription"],
          ]}
          note="Based on Clay's public product pages and our own hands-on use of it in October 2026. We do not quote Clay's prices because they vary by plan and change often."
        />
      </Band>

      <Band title="How the same job" accent="looks in Mantis.">
        <Steps
          steps={[
            { title: "Describe the target", body: "“Physiotherapy clinics in Pune with a rating under 4 and no online booking page.” No table to design." },
            { title: "Approve the plan", body: "Mantis shows which searches it will run and quotes the credits before anything is spent." },
            { title: "It finds and reads", body: "Each clinic's listing and website is read for contacts, booking pages, analytics and the rest of the signals you asked for." },
            { title: "Graded contacts", body: "Emails are graded Tier 1–3 by who they reach; phones are graded mobile, landline or toll-free." },
            { title: "Run the outreach", body: "The campaign planner drafts email and AI call steps. Edit, test, approve. Replies land in the Inbox." },
          ]}
        />
      </Band>

      <Band title="Who switches," accent="and who should not." tone="white">
        <Cards
          items={[
            { title: "Switch if you sell to small businesses", body: "Agencies, local suppliers and SMB SaaS reach owners who have no domain for an enrichment provider to find." },
            { title: "Switch if you never wanted to build", body: "If the table, the waterfall and the formulas were the cost rather than the point, a finished workflow saves the time." },
            { title: "Switch if you sell in India", body: "INR pricing, phone-first leads and an AI caller that speaks Hindi and Hinglish fit the market Clay was not designed for." },
            { title: "Stay on Clay if you live in your CRM", body: "Custom enrichment, many providers and CRM sync are Clay's home ground. Mantis does not do those today." },
          ]}
        />
      </Band>

      <Band title="What Mantis" accent="does not do.">
        <Limits
          items={[
            { title: "No custom providers or formulas", body: "You cannot bring your own data sources or write column logic. The pipeline is fixed, by design." },
            { title: "No CRM sync or CSV export from the leads view", body: "HubSpot, Zoho and Pipedrive connectors are not live, and neither is Outlook one-click connect." },
            { title: "No verified emails", body: "Emails are graded, not bounce-checked, and named decision-makers appear only where a business's site names them." },
            { title: "Narrower data", body: "No new-registration (MCA, GST), RERA, ad-library or page-speed signals yet — things a well-built Clay table could pull in." },
          ]}
        />
      </Band>

      <Band title="What it" accent="costs." tone="white">
        <PricingSummary />
      </Band>

      <Band title="Clay alternative" accent="questions.">
        <ToolFaq faqs={FAQS} />
        <Copy>
          <p style={{ marginTop: 18 }}>
            Comparing more widely? See our <Link href="/apollo-alternative">Apollo alternative</Link> and{" "}
            <Link href="/zoominfo-alternative">ZoomInfo alternative</Link> pages, which cover the contact-database side of the
            market.
          </p>
        </Copy>
      </Band>

      <Band title="Related" accent="guides." tone="white">
        <RelatedReading
          posts={[
            { slug: "why-tech-stack-filtering-misses-your-best-prospects", title: "Why Tech-Stack Filtering Misses Your Best Prospects", blurb: "Filters that need a website cannot find businesses without one." },
            { slug: "credit-based-vs-seat-based-lead-tools", title: "Credit-Based vs Seat-Based Lead Tools", blurb: "Which pricing model costs less for a small team." },
            { slug: "do-you-need-an-email-finder-for-local-businesses", title: "Do You Need an Email Finder for Local Businesses?", blurb: "The same domain problem, at the email layer." },
          ]}
        />
        <ToolLinks current={PATH} />
      </Band>

      <MarketingCta
        title="Skip the build,"
        accent="keep the leads."
        sub={`Describe your customer and see the plan before anything runs. ${FREE_SIGNUP_CREDITS} free credits, no card.`}
        primary={{ label: "Get Free Access", href: "/login" }}
        secondary={{ label: "Talk to Sales", href: "/contact" }}
      />
    </>
  );
}
