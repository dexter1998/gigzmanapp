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

const PATH = "/apollo-alternative" as const;
const TITLE = "Apollo Alternative: Find Leads Apollo Can't See";
const DESCRIPTION =
  "Compare Mantis Ai with Apollo for SMB and local prospecting: no-website leads, phone-first contacts, AI calls in Hindi. Start with 500 free credits.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${COMPANY.site}${PATH}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${COMPANY.site}${PATH}`,
    images: ogImageMeta({ v: "leads", eyebrow: "Apollo alternative", t1: "Find the leads", t2: "Apollo can't see.", cta: "Start free →", url: "mantisai.in/apollo-alternative" }),
  },
  twitter: { card: "summary_large_image" },
};

const FAQS = [
  {
    q: "What is the best Apollo alternative?",
    a: "For selling to companies with a web presence, the closest alternatives are other contact databases with built-in sequencing. For selling to small and local businesses — many of which have no website and so no record in Apollo — you need a tool built on live listings that treats the missing website as a filter. Mantis is that second kind.",
  },
  {
    q: "Why can't Apollo find businesses without a website?",
    a: "Apollo builds its records from crawlable sources: company websites, professional profiles, email patterns, filings. A business with none of those gives it nothing to index, so no record is created. That is a design consequence, not a coverage gap a bigger plan will close.",
  },
  {
    q: "Is Mantis cheaper than Apollo?",
    a: `They price differently, so it depends on use. Mantis has no seats: every account starts with ${FREE_SIGNUP_CREDITS} free credits, a new lead costs ${CREDIT_COST.lead_unlock} credits, and plans are monthly in rupees. Apollo also has a free tier and paid plans per user; check its current pricing page rather than any number quoted secondhand.`,
  },
  {
    q: "Does Mantis have email sequences like Apollo?",
    a: "Yes. The campaign planner builds a sequence of email and AI voice call steps. Mail goes from your own connected mailbox (Gmail or any IMAP/SMTP), a reply stops that lead's sequence, and replies, call outcomes and booked meetings land in the Inbox with an AI summary.",
  },
  {
    q: "Is Mantis data as good as Apollo's?",
    a: "Different, not better across the board. Apollo has far more named people and verified emails at companies with domains. Mantis has businesses Apollo does not hold at all, with phone numbers on almost every local lead and emails graded by who they reach. Pick by who you sell to.",
  },
  {
    q: "Should I cancel Apollo?",
    a: "Not if you also sell to companies that already operate online — Apollo does that well. Most agencies doing both kinds of work end up using both. The mistake is expecting either to cover the other's ground.",
  },
];

export default async function ApolloAlternativePage() {
  const [totals, countries] = await Promise.all([getGapTotals().catch(() => null), getCountryBreakdown().catch(() => [])]);
  const india = countries.find((c) => c.code === "in");

  return (
    <>
      <ToolJsonLd path={PATH} name="Apollo alternative" description={DESCRIPTION} />

      <ToolHero
        eyebrow="Apollo alternative"
        title="An Apollo alternative for leads"
        accent="Apollo was never built to see."
        lede={
          <>
            Apollo is excellent at reaching people at companies with websites. The busy clinic, the 400-review hardware store and
            the family-run manufacturer often have no website, so they have no Apollo record. Mantis finds them live, tells you
            what they are missing, and calls or emails them for you.
          </>
        }
        image={{ src: "/resources/thumbs/apollo-alternative-local-business-leads.webp", width: 1600, height: 900, alt: "Illustration of a tangled contact database on one side and a live map of local shopfronts with phone and WhatsApp contacts on the other" }}
        secondary={{ label: "Browse free leads", href: "/leads" }}
        note="No seats. Credits never expire."
      />

      {totals && totals.checked > 0 && (
        <ToolStats
          stats={[
            { value: fmtCount(totals.checked), label: "local businesses checked" },
            { value: fmtCount(totals.qualifying), label: "have no website — no domain for Apollo to index" },
            { value: india ? fmtPct(india.gapRate) : fmtPct(totals.gapRate), label: india ? "of Indian businesses checked" : "of businesses checked" },
            { value: `${CREDIT_COST.lead_unlock}`, label: "credits per new lead" },
          ]}
          caption="Live from our index, refreshed daily."
        />
      )}

      <Band title="Apollo's blind spot" accent="is structural.">
        <Split
          aside={
            <Shot
              src="/marketing/product-leads-table.webp"
              width={1600}
              height={687}
              alt="Mantis leads table showing local businesses tagged No website, with category, rating, review count and heat score"
              caption="Leads Apollo has no record of: active businesses, real reviews, no website. Contacts blurred in this screenshot."
            />
          }
        >
          <p>
            Apollo’s database is built by crawling. A company enters it because there is something to crawl — a website, a
            LinkedIn page, a funding record, a job posting. By its own count it holds more than two hundred million contacts, and for selling to
            companies that already operate online it is one of the best tools there is.
          </p>
          <p>
            A business with a map listing, a phone number and no website gives the crawler nothing. It does not appear as a thin
            record; it does not appear at all. Technographic filters do not help either, because they need a website to
            fingerprint.{" "}
            {india ? <>In India, {fmtPct(india.gapRate)} of the businesses we have checked have no website</> : <>In India, a large share of small businesses have no website</>}
            , which makes this the largest segment of the market for anyone selling websites, marketing or SMB software.
          </p>
          <p>
            Mantis starts from where those businesses actually appear — map listings and the open web — and makes the missing
            website a filter rather than an empty column.
          </p>
        </Split>
      </Band>

      <Band title="Mantis and Apollo," accent="compared honestly." tone="white">
        <CompareTable
          head={["", "Mantis Ai", "Apollo"]}
          rows={[
            ["Best for", "Small, local and SMB businesses; India-first teams", "Companies with a web presence; B2B software and services"],
            ["Company with a dated website", "Yes, with website-quality signals", "Yes, including technographic filters"],
            ["Company with no website at all", "Yes — it is the core filter", "No record to find"],
            ["Named decision-makers", "Where the business's own site names them", "Broad coverage — its main strength"],
            ["Email", "Read from the business's site, graded Tier 1–3; not bounce-verified", "Large verified email database"],
            ["Phone", "On almost every local lead, graded mobile, landline or toll-free", "Available for many contacts, varying by region"],
            ["Review count and rating as signals", "Yes", "No"],
            ["Outreach", "Email sequences plus AI voice calls in English, Hindi or Hinglish", "Email sequences and a dialer"],
            ["CRM sync and export", "Not available yet", "Mature"],
            ["Pricing", "Credits, INR, no seats, monthly", "Free tier plus per-user plans"],
          ]}
          note="Apollo details from its public product pages and our earlier comparison. We do not quote Apollo's prices because they change."
        />
      </Band>

      <Band title="Switching" accent="in an afternoon.">
        <Steps
          steps={[
            { title: "Find the segment Apollo returns blank", body: "Searches for local trades in your city that come back empty or full of large chains." },
            { title: "Describe it to Mantis", body: "“Hardware stores in Kanpur with no website and 50+ reviews.” See the plan and the credit quote." },
            { title: "Work the list by phone first", body: "These businesses are reached by phone and in person. Emails come where a website exists." },
            { title: "Add an AI call step", body: "Let the voice agent pitch and book meetings in the language the owner speaks." },
          ]}
        />
        <Copy>
          <p style={{ marginTop: 26 }}>
            One thing changes when you move from Apollo to local prospecting: the channel. In our index, almost every business
            has a phone number on its listing, while businesses with no website rarely have any findable email. Plan for calls,
            WhatsApp and walk-ins rather than an email-only sequence — see{" "}
            <Link href="/resources/do-you-need-an-email-finder-for-local-businesses">do you need an email finder for local businesses</Link>.
          </p>
        </Copy>
      </Band>

      <Band title="Who it" accent="suits." tone="white">
        <Cards
          items={[
            { title: "Web design and marketing agencies", body: "The prospects with the strongest need for a website are exactly the ones a website crawler cannot find." },
            { title: "Freelancers on a budget", body: "No per-seat bill. 500 free credits to test a niche, then monthly plans in rupees." },
            { title: "SMB-focused B2B sellers", body: "Distributors, local SaaS, fintech and logistics teams whose buyers are owners, not job titles." },
            { title: "Teams using Apollo for enterprise", body: "Keep Apollo for companies with domains and add Mantis for the long tail it does not hold." },
          ]}
        />
      </Band>

      <Band title="Where Apollo" accent="is the better tool.">
        <Limits
          items={[
            { title: "Selling to people at companies with domains", body: "Apollo's named contacts, titles and verified emails beat anything Mantis offers for that job." },
            { title: "Email-first outreach at scale", body: "Mantis grades emails but does not verify them, and many of its best leads have no email at all." },
            { title: "Integrations and exports", body: "No CRM sync or CSV export from the leads view yet; WhatsApp campaign steps are still coming." },
            { title: "Consumer lists", body: "Neither tool sells consumer data, and Mantis finds businesses only." },
          ]}
        />
      </Band>

      <Band title="What it" accent="costs." tone="white">
        <PricingSummary />
      </Band>

      <Band title="Apollo alternative" accent="questions.">
        <ToolFaq faqs={FAQS} />
      </Band>

      <Band title="Related" accent="guides." tone="white">
        <RelatedReading
          posts={[
            { slug: "apollo-alternative-local-business-leads", title: "Apollo Alternative for Local Business Leads", blurb: "Where Apollo works, where it structurally cannot, and what to use instead." },
            { slug: "why-apollo-and-zoominfo-miss-businesses-without-websites", title: "Why Apollo and ZoomInfo Miss Businesses Without Websites", blurb: "The unit these databases are built around, and why add-ons do not help." },
            { slug: "do-you-need-an-email-finder-for-local-businesses", title: "Do You Need an Email Finder for Local Businesses?", blurb: "Why phone-first is the honest default for local prospecting." },
          ]}
        />
        <ToolLinks current={PATH} />
      </Band>

      <MarketingCta
        title="Find the leads"
        accent="Apollo can't see."
        sub={`Describe them in a sentence and see the plan before anything runs. ${FREE_SIGNUP_CREDITS} free credits, no card.`}
        primary={{ label: "Get Free Access", href: "/login" }}
        secondary={{ label: "See pricing", href: "/pricing" }}
      />
    </>
  );
}
