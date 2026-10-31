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

const PATH = "/lead-generation-tool" as const;
const TITLE = "Lead Generation Tool for Agencies and B2B Sellers";
const DESCRIPTION =
  "Find B2B and local leads from a plain-language brief, read their websites for signals, then run email and AI calls. Start with 500 free credits.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${COMPANY.site}${PATH}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${COMPANY.site}${PATH}`,
    images: ogImageMeta({ v: "hero", eyebrow: "Lead generation tool", t1: "Find, qualify, reach.", t2: "One tool, no seats.", cta: "Start free →", url: "mantisai.in/lead-generation-tool" }),
  },
  twitter: { card: "summary_large_image" },
};

const FAQS = [
  {
    q: "What does a lead generation tool actually do?",
    a: "Three jobs, and most tools only do one of them well. Discovery finds the businesses that match your customer. Qualification decides which of them are worth contacting, usually from signals such as company size, reviews, technology or hiring. Outreach reaches them by email, phone or messaging. Mantis covers all three for businesses that sell to other businesses, and is strongest on small and local companies that contact databases cover badly.",
  },
  {
    q: "Is Mantis a B2B lead generation tool?",
    a: "Yes. It finds businesses for any seller: local businesses by trade and area, companies that are not on maps (SaaS, importers, product companies) through web search, startups that recently raised funding, and developers and dev companies. It does not produce lists of individual consumers.",
  },
  {
    q: "What is the best lead generation tool in India?",
    a: "It depends on who you sell to. If your buyers are companies with websites and staff on LinkedIn, a contact database is the right tool. If they are shops, clinics, contractors, schools or small manufacturers, most of them are found on map listings rather than in contact databases, and a tool built on live listings will reach far more of them. Mantis is built India-first, with INR pricing and an AI caller that speaks Hindi and Hinglish.",
  },
  {
    q: "How much does it cost?",
    a: `Every account starts with ${FREE_SIGNUP_CREDITS} free credits, once, with no card. Each new lead added to your list costs ${CREDIT_COST.lead_unlock} credits; leads you already have are free. Monthly plans start at ${formatINR(CREDIT_PACKS[0].pricePaise)} for ${CREDIT_PACKS[0].credits.toLocaleString("en-IN")} credits, never auto-renew, and are only needed to launch campaigns.`,
  },
  {
    q: "Does it verify emails?",
    a: "Emails are graded rather than bounce-verified. Tier 1 is a named person, Tier 2 a role inbox that reaches a decision on a small business (sales@, hello@), Tier 3 generic or support addresses. Mail goes from your own connected mailbox, so starting with Tier 1 and 2 addresses is the safest way to protect your sending reputation.",
  },
  {
    q: "Can it send the outreach too?",
    a: "Yes. The campaign planner builds a sequence of email and AI voice call steps for a lead list. You edit it, send yourself a test, then approve and schedule it. A reply stops that lead's sequence, and replies, call outcomes and booked meetings land in the Inbox with an AI summary. WhatsApp steps are shown as coming soon and are skipped for now.",
  },
  {
    q: "Does it integrate with my CRM?",
    a: "Not yet. HubSpot, Zoho and Pipedrive connectors and CSV export from the leads view are on the list but not live. If a CRM sync on day one is essential, factor that in.",
  },
];

export default async function LeadGenerationToolPage() {
  const [totals, countries] = await Promise.all([getGapTotals().catch(() => null), getCountryBreakdown().catch(() => [])]);
  const india = countries.find((c) => c.code === "in");

  return (
    <>
      <ToolJsonLd path={PATH} name="Lead generation tool" description={DESCRIPTION} />

      <ToolHero
        eyebrow="Lead generation tool"
        title="A lead generation tool that finds,"
        accent="qualifies and reaches out."
        lede={
          <>
            Tell Mantis who you sell to in a sentence. It finds the matching businesses — on maps, on the web, in funding news —
            reads each one’s website for buying signals and contacts, and runs the email and AI call sequence that follows. Built
            for agencies, freelancers and B2B teams who sell to small and mid-sized businesses.
          </>
        }
        image={{ src: "/resources/thumbs/best-lead-generation-tools-for-indian-agencies.webp", width: 1600, height: 900, alt: "Illustration of a map of India connected to a lead dashboard with search, charts and contact cards, linked to small shopfronts" }}
        secondary={{ label: "See pricing", href: "/pricing" }}
        note="No seats, no annual contract. Credits never expire."
      />

      {totals && totals.checked > 0 && (
        <ToolStats
          stats={[
            { value: fmtCount(totals.checked), label: "businesses checked in our map index" },
            { value: fmtCount(totals.countries), label: "countries with verified listings" },
            { value: india ? fmtPct(india.gapRate) : fmtPct(totals.gapRate), label: india ? "of Indian businesses have no website" : "have no website" },
            { value: `${FREE_SIGNUP_CREDITS}`, label: "free credits to start, no card" },
          ]}
          caption="Index figures are live and refreshed daily."
        />
      )}

      <Band title="Most lead tools do one job." accent="Selling needs three." sub="Discovery, qualification and outreach usually mean three subscriptions and a spreadsheet in between.">
        <Split
          aside={
            <Shot
              src="/marketing/product-lead-map.webp"
              width={1600}
              height={1068}
              alt="Mantis lead map with local businesses as pins and a lead card showing a heat score and the signals No Website and Excellent Rating"
              caption="Discovery on live map listings, with each lead's signals shown before you spend anything."
            />
          }
        >
          <p>
            A typical stack is a contact database for discovery, an enrichment tool or a spreadsheet of formulas for
            qualification, and a sequencer for outreach. Each is good at its piece. The cost is in the gaps: exports, imports,
            duplicate records, and a list that is already stale by the time the first email goes out.
          </p>
          <p>
            There is a second, quieter problem. Contact databases are built around <strong>a named person, in a role, at a company
            with a domain</strong>. That is the right shape for selling software to companies that already operate online. It is
            the wrong shape for the very large market of small businesses — the shops, clinics, contractors and manufacturers
            whose owner is not on LinkedIn and whose company may not have a website at all.
          </p>
          <p>
            Mantis is one tool for the whole loop, and it starts from sources where small businesses actually appear: map
            listings, the open web, and each business’s own website.
          </p>
        </Split>
      </Band>

      <Band title="How it works," accent="from brief to booked call." tone="white">
        <Steps
          steps={[
            { title: "Write a brief", body: "“Dentists in Jaipur with weak reviews”, “D2C brands in Bengaluru hiring a marketer”, “SaaS startups that raised a seed round”. Any trade, any count, any place." },
            { title: "Approve the plan", body: "Mantis shows the scope and quotes the credits. Nothing runs, and nothing is charged, until you tap Run." },
            { title: "It finds and reads", body: "Businesses come from maps, web search, funding news or developer profiles. Each one's website is read for contacts and the signals you asked for." },
            { title: "Leads are ranked", body: "Results land in Leads, in a list named after the chat, with graded emails, graded phones and the reason each one matched." },
            { title: "Campaign runs", body: "The planner drafts an email and AI call sequence. You edit, test, approve and schedule. Replies and booked meetings arrive in the Inbox." },
          ]}
        />
      </Band>

      <Band title="Signals you can" accent="filter on.">
        <Copy>
          <p>
            Qualification is where a lead generation tool earns its keep, because a list of a thousand businesses is only useful
            once you know which fifty to call first. These are the signals Mantis can read and filter on today:
          </p>
          <ul>
            <li><strong>Presence:</strong> no website at all, a social page used as a website, a site that is down.</li>
            <li><strong>Website quality:</strong> no HTTPS, not mobile-ready, an old copyright year, no analytics, no ad pixel.</li>
            <li><strong>What the site offers:</strong> an online booking, menu or admissions page — present or missing.</li>
            <li><strong>Reputation:</strong> rating range, review count range, weak reviews or a low rating.</li>
            <li><strong>Growth:</strong> hiring now (with the role titles), several branches, a funding round with amount and date.</li>
            <li><strong>Social:</strong> a quiet Instagram or a YouTube channel that has not posted in a while.</li>
          </ul>
          <p>
            Each signal is a reason to call, and a reason is what turns a cold call into a relevant one. A dental clinic with a 3.6
            rating and no booking page is a different conversation from one that simply exists. For more on why the absence of a
            website is so strong a signal, see{" "}
            <Link href="/find-businesses-without-websites">how many businesses still have no website</Link>.
          </p>
        </Copy>
      </Band>

      <Band title="How it compares" accent="with the usual stack." tone="white" sub="Fair to both sides: the database tools are better at some of this.">
        <CompareTable
          head={["", "Mantis Ai", "Contact database + sequencer"]}
          rows={[
            ["Best for", "Small and local businesses, SMB B2B, India-first teams", "Mid-market and enterprise companies with a web presence"],
            ["How you search", "A plain-language brief, then an editable plan", "Firmographic filters on a stored database"],
            ["Businesses with no website", "Found and filterable — it is the core signal", "Usually absent: no domain means no record"],
            ["Named decision-makers", "Where the business's own site names them", "Broad coverage of named people and titles — their strength"],
            ["Email quality", "Graded Tier 1–3, not bounce-verified", "Usually verified, which is a real advantage"],
            ["Phone numbers", "On almost every local lead, graded mobile, landline or toll-free", "Direct dials vary by region and plan"],
            ["Outreach", "Email from your mailbox plus AI voice calls in English, Hindi or Hinglish", "Email sequences; calling usually a separate tool"],
            ["CRM sync and CSV export", "Not available yet", "Mature integrations"],
            ["Pricing model", "Credits, INR, no seats", "Usually per seat, often annual"],
          ]}
        />
      </Band>

      <Band title="Who it" accent="is for.">
        <Cards
          items={[
            { title: "Web, design and marketing agencies", body: "Find businesses with a visible gap — no site, a broken one, weak reviews — and pitch the fix." },
            { title: "Freelancers and consultants", body: "Credits instead of seats means a quiet month costs nothing, and 500 free credits is enough to test one niche properly." },
            { title: "B2B sales teams selling to SMBs", body: "Distributors, SaaS for small businesses, fintech and logistics: reach owners who are not in contact databases." },
            { title: "Founders doing their own sales", body: "Describe the customer, approve the plan, and let the AI caller handle first conversations while you build." },
          ]}
        />
      </Band>

      <Band title="Limits worth" accent="knowing." tone="white">
        <Limits
          items={[
            { title: "Not a contact database for enterprises", body: "If you need org charts and verified direct dials at large companies, a dedicated B2B database will serve you better." },
            { title: "Emails are graded, not verified", body: "There is no bounce check yet. Businesses without a website usually have no findable email; their phone comes with the lead." },
            { title: "No CRM connectors or CSV export from the leads view", body: "Work happens inside Mantis for now. WhatsApp sending in campaigns is also still coming." },
            { title: "Pricing is in rupees", body: "Plans are sold in INR. International teams can use it, but there is no USD billing yet." },
          ]}
        />
      </Band>

      <Band title="What it" accent="costs.">
        <PricingSummary />
      </Band>

      <Band title="Lead generation tool" accent="questions." tone="white">
        <ToolFaq faqs={FAQS} />
      </Band>

      <Band title="Further" accent="reading.">
        <RelatedReading
          posts={[
            { slug: "best-lead-generation-tools-for-indian-agencies", title: "The Best Lead Generation Tools for Indian Agencies", blurb: "What the standard stack costs, and why it misses local businesses." },
            { slug: "credit-based-vs-seat-based-lead-tools", title: "Credit-Based vs Seat-Based Lead Tools", blurb: "Which pricing model is cheaper, and the number that decides it." },
            { slug: "lead-generation-tools-that-work-outside-the-us", title: "Lead Generation Tools That Work Outside the US", blurb: "Geography problems have add-ons. Segment problems do not." },
            { slug: "best-lead-generation-tools-for-web-design-agencies", title: "Best Lead Generation Tools for Web Design Agencies", blurb: "The wider comparison for agencies selling websites." },
          ]}
        />
        <ToolLinks current={PATH} />
      </Band>

      <MarketingCta
        title="Describe your customer."
        accent="Mantis finds them."
        sub={`See the plan and the credit quote before anything runs. ${FREE_SIGNUP_CREDITS} free credits, no card.`}
        primary={{ label: "Get Free Access", href: "/login" }}
        secondary={{ label: "Talk to Sales", href: "/contact" }}
      />
    </>
  );
}
