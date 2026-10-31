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

// Live counts come from the database; see app/(marketing)/find-businesses-without-websites.
export const dynamic = "force-dynamic";

const PATH = "/zoominfo-alternative" as const;
const TITLE = "ZoomInfo Alternative for SMB and Local Leads";
const DESCRIPTION =
  "Compare Mantis Ai with ZoomInfo for SMB prospecting: live search, businesses with no website, AI calls, no contract. Start with 500 free credits.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${COMPANY.site}${PATH}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${COMPANY.site}${PATH}`,
    images: ogImageMeta({ v: "network", eyebrow: "ZoomInfo alternative", t1: "The businesses big", t2: "databases miss.", cta: "Start free →", url: "mantisai.in/zoominfo-alternative" }),
  },
  twitter: { card: "summary_large_image" },
};

const FAQS = [
  {
    q: "What is a good ZoomInfo alternative for small businesses?",
    a: "If you sell to small and local businesses, a tool built on live listings will reach far more of your market than any contact database, because many of those businesses have no domain for a database to index. If you sell to mid-sized companies and just want a cheaper database, look at the other contact databases instead. Mantis is built for the first case.",
  },
  {
    q: "Why does ZoomInfo have so few small Indian businesses?",
    a: "Two separate reasons. ZoomInfo's coverage is concentrated in North America, with international data sold as a paid add-on. More fundamentally, its record is a named person in a role at a company with a domain. A shop or clinic with no website has no domain and no employees on professional networks, so the record cannot be formed in any country.",
  },
  {
    q: "Is Mantis as accurate as ZoomInfo?",
    a: "For named people at large companies, no — ZoomInfo's depth there is its strength. For whether a small business exists, is trading, and has a website, Mantis reads live sources at the time you search, which is often more current than a stored record. Emails in Mantis are graded by who they reach but not bounce-verified.",
  },
  {
    q: "Do I need an annual contract?",
    a: `No. Mantis plans run for 30 days and never auto-renew. Every account starts with ${FREE_SIGNUP_CREDITS} free credits; paid plans start at ${formatINR(CREDIT_PACKS[0].pricePaise)} for ${CREDIT_PACKS[0].credits.toLocaleString("en-IN")} credits, and credits never expire.`,
  },
  {
    q: "Does Mantis have intent data or org charts?",
    a: "Not in ZoomInfo's sense. Mantis reads buying signals from each business itself — hiring now with role titles, recent funding, several branches, weak reviews, an outdated or missing website — rather than from third-party intent feeds. It does not build org charts.",
  },
  {
    q: "Can I use both?",
    a: "Many teams that sell to both large companies and small ones do. ZoomInfo answers which companies match a firmographic profile and who works there; Mantis answers which businesses near here are missing something you sell. They do not cover each other's ground.",
  },
];

export default async function ZoomInfoAlternativePage() {
  const [totals, countries] = await Promise.all([getGapTotals().catch(() => null), getCountryBreakdown().catch(() => [])]);
  const india = countries.find((c) => c.code === "in");

  return (
    <>
      <ToolJsonLd path={PATH} name="ZoomInfo alternative" description={DESCRIPTION} />

      <ToolHero
        eyebrow="ZoomInfo alternative"
        title="A ZoomInfo alternative for"
        accent="the businesses big databases miss."
        lede={
          <>
            ZoomInfo is built to map large companies and the people inside them. If your customers are clinics, contractors,
            retailers, schools and small manufacturers, most of them are not in that kind of database at all. Mantis finds them
            live, reads what they are missing, and helps you reach them — without a contract.
          </>
        }
        image={{ src: "/resources/thumbs/why-apollo-and-zoominfo-miss-businesses-without-websites.webp", width: 1600, height: 900, alt: "Illustration of stored database records on one side and a live map revealing small shopfronts on the other" }}
        secondary={{ label: "Browse free leads", href: "/leads" }}
        note="Monthly plans in INR. No seats, no annual commitment."
      />

      {totals && totals.checked > 0 && (
        <ToolStats
          stats={[
            { value: fmtCount(totals.checked), label: "local businesses checked" },
            { value: fmtCount(totals.qualifying), label: "with no website — invisible to domain-based databases" },
            { value: india ? fmtPct(india.gapRate) : fmtPct(totals.gapRate), label: india ? "no-website rate in India" : "no-website rate" },
            { value: fmtCount(totals.countries), label: "countries with verified listings" },
          ]}
          caption="Live from our index, refreshed daily."
        />
      )}

      <Band title="Why ZoomInfo misses" accent="small businesses.">
        <Split
          aside={
            <Shot
              src="/resources/thumbs/lead-generation-tools-that-work-outside-the-us.webp"
              width={1600}
              height={900}
              alt="Illustration of a globe with local business cards pinned across several countries"
              caption="Coverage add-ons fix geography. They do not fix the record shape."
            />
          }
        >
          <p>
            It is worth being fair: ZoomInfo is very good at what it was built for. Its scale and depth on companies with a web
            presence make it a standard tool for selling software and services to mid-market and enterprise accounts, especially
            in North America.
          </p>
          <p>
            The gap for small-business sellers is structural, not a matter of coverage. Every contact database in this category
            stores the same atom: <strong>a named person, in a role, at a company identified by a domain</strong>. A hardware
            supplier in Kanpur with four hundred reviews and no website has no domain, no email pattern, and an owner who is not
            on a professional network. The record cannot be formed, so the business is not sparse in the database — it is absent.
          </p>
          <p>
            That is why paying for international coverage does not help an agency selling first websites in India. The geography
            add-on solves geography; geography was never why those businesses were missing. The full argument is in{" "}
            <Link href="/resources/why-apollo-and-zoominfo-miss-businesses-without-websites">why Apollo and ZoomInfo miss businesses without websites</Link>.
          </p>
        </Split>
      </Band>

      <Band title="Mantis and ZoomInfo," accent="compared honestly." tone="white">
        <CompareTable
          head={["", "Mantis Ai", "ZoomInfo"]}
          rows={[
            ["Built for", "Selling to small, local and SMB businesses", "Selling to mid-market and enterprise companies"],
            ["Unit of record", "A business, with its listing, website and signals", "A named person, in a role, at a company with a domain"],
            ["Businesses with no website", "Found and filterable", "Generally absent"],
            ["Named contacts and org charts", "Only where a business's site names people", "Deep — its main strength"],
            ["Geography", "India-first; foreign cities searchable; coverage shown openly", "Concentrated in North America; international via a paid add-on"],
            ["Signals", "Read live from each business: website quality, reviews, hiring, funding, branches", "Firmographics, technographics and intent data"],
            ["Outreach", "Email from your mailbox plus AI calls in English, Hindi or Hinglish", "Integrates with sequencers and CRMs"],
            ["Buying it", "Self-serve, monthly, INR, no seats", "Generally sold through a sales process on annual terms"],
            ["CRM integrations", "Not available yet", "Extensive"],
          ]}
          note="ZoomInfo positioning from its public materials. We do not quote its prices; they are not published as a fixed list."
        />
      </Band>

      <Band title="What switching" accent="looks like.">
        <Steps
          steps={[
            { title: "Name the segment ZoomInfo misses", body: "The small businesses in your target market that your database searches keep returning blank or thin." },
            { title: "Describe them to Mantis", body: "Trade, place and signal: “restaurants in Hyderabad with no online menu”, “clinics in Lucknow with weak reviews”." },
            { title: "Approve the plan", body: `Scope and credit quote first. New leads are ${CREDIT_COST.lead_unlock} credits each; areas already scanned cost nothing to search again.` },
            { title: "Reach them by phone and email", body: "Phones come on almost every local lead; emails where the business has a site. Campaigns combine email and AI calls." },
          ]}
        />
        <Copy>
          <p style={{ marginTop: 26 }}>
            Keep ZoomInfo for the accounts it serves well. Use Mantis for the long tail it was never designed to hold. If you have
            been paying for a seat mainly to reach small businesses, that seat is the cost to cut.
          </p>
        </Copy>
      </Band>

      <Band title="Who it" accent="suits." tone="white">
        <Cards
          items={[
            { title: "Agencies selling websites, SEO or ads", body: "Their best prospects are the businesses with the weakest online presence — exactly the ones domain-based databases cannot see." },
            { title: "SMB SaaS and fintech", body: "Products for shops, clinics and small manufacturers need owner phone numbers more than enterprise org charts." },
            { title: "Distributors and B2B suppliers", body: "Map every retailer or workshop in a territory, then let the AI agent ask who handles purchasing." },
            { title: "Teams priced out of enterprise data", body: "Credits instead of seats and a monthly plan instead of an annual contract." },
          ]}
        />
      </Band>

      <Band title="Where ZoomInfo" accent="is still better.">
        <Limits
          items={[
            { title: "Large companies and named buyers", body: "Mantis does not build org charts or guarantee a named decision-maker on every lead." },
            { title: "Verified contact data", body: "Mantis grades emails by who they reach but does not bounce-verify them." },
            { title: "Integrations", body: "No CRM connectors or CSV export from the leads view yet." },
            { title: "Third-party intent data", body: "Mantis reads signals from each business directly; it does not buy research-intent feeds." },
          ]}
        />
      </Band>

      <Band title="What it" accent="costs." tone="white">
        <PricingSummary />
      </Band>

      <Band title="ZoomInfo alternative" accent="questions.">
        <ToolFaq faqs={FAQS} />
      </Band>

      <Band title="Related" accent="guides." tone="white">
        <RelatedReading
          posts={[
            { slug: "why-apollo-and-zoominfo-miss-businesses-without-websites", title: "Why Apollo and ZoomInfo Miss Businesses Without Websites", blurb: "The record they are built around does not exist for these businesses." },
            { slug: "lead-generation-tools-that-work-outside-the-us", title: "Lead Generation Tools That Work Outside the US", blurb: "Geography problems have add-ons. Segment problems do not." },
            { slug: "best-lead-generation-tools-for-indian-agencies", title: "The Best Lead Generation Tools for Indian Agencies", blurb: "What the standard stack costs and what it finds." },
          ]}
        />
        <ToolLinks current={PATH} />
      </Band>

      <MarketingCta
        title="Reach the businesses"
        accent="ZoomInfo can't."
        sub={`Describe them in a sentence and see the plan before anything runs. ${FREE_SIGNUP_CREDITS} free credits, no card.`}
        primary={{ label: "Get Free Access", href: "/login" }}
        secondary={{ label: "Talk to Sales", href: "/contact" }}
      />
    </>
  );
}
