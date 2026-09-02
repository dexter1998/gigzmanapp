/**
 * Batch 26 — the tools cluster, written by somebody who sells a tool in it. Each post says so.
 *
 * SERP notes:
 *  · Credit vs seat is well documented and one trend is worth carrying: per-seat adoption fell from
 *    21% to 15% of SaaS companies in twelve months, and pure per-seat businesses churn 2.3x higher
 *    than hybrid ones. The mechanism — casual users overpay, heavy users underpay — is exactly why
 *    our own model is metered.
 *  · "Best lead generation tools for agencies" returns agency directories and generic funnel
 *    software (Unbounce, Typeform, Intercom, Calendly) alongside the contact databases. Nothing on
 *    page one addresses finding local businesses with no website as a job to be done.
 *  · The India SERP supplies real figures: LinkedIn Sales Navigator ₹8,300/user, Lusha ₹3,000/user
 *    and Zoho CRM ₹800/user — about ₹12,000 per user per month for that stack — plus JustDial Leads
 *    from ₹5,000/month and IndiaMART LeadManager from ₹3,000. It also states plainly that Indian
 *    SMBs are found on Maps, JustDial and IndiaMART rather than LinkedIn, which is the argument
 *    this whole corpus makes, from an independent source.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · credit vs seat */
{
  slug: "credit-based-vs-seat-based-lead-tools",
  title: "Credit-Based vs Seat-Based Lead Tools: Which Is Cheaper",
  excerpt: "Seats are predictable and wrong for most small agencies. Credits are fair and unpredictable. Which one costs you less depends on a number you probably have not measured.",
  meta: "Credit-based vs seat-based lead tools: which costs less for a small agency, why per-seat pricing is declining, and the number that decides it for you.",
  category: "Comparisons", cluster: "tools", hero: "pricing", mins: 8,
  tags: ["Comparisons", "Tools", "Pricing"],
  body: [
    { type: "prose", text: [
      "For a one- or two-person agency, credits are almost always cheaper. For a team of five where everybody prospects daily, seats usually win. The number that decides it is **how much you actually use the tool in a month**, and most people have never measured it.",
      "Worth saying up front: we sell a credit-based tool, so treat the conclusion as an interested party's — the mechanics below are not in dispute either way.",
    ]},

    { type: "h2", id: "mechanics", text: "What each model actually charges for" },
    { type: "prose", text: [
      "**Seat-based** charges per person with a login, whether or not they use it. Simple to budget, and it works when headcount is predictable and everybody genuinely works the tool.",
      "**Credit-based** charges for what you consume. You buy a pool and spend it, and the bill tracks usage rather than headcount.",
      "The structural criticism of seats is well documented and it is about fairness in both directions: **casual users pay far more than the value they get, and heavy users generate disproportionate load without paying more.** That is also why per-seat pricing is in decline — adoption fell from 21% to 15% of SaaS companies in a single year, and businesses on pure per-seat models churn considerably more than hybrid ones.",
    ]},

    { type: "h2", id: "which", text: "Which is cheaper for you" },
    { type: "table", head: ["Your situation", "Cheaper model", "Why"], rows: [
      ["Solo, prospecting two afternoons a week", "Credits", "You use it in bursts and pay nothing between them"],
      ["Two people, one prospects", "Credits", "A seat for somebody who logs in monthly is pure waste"],
      ["Team of five, all prospecting daily", "Seats", "Consumption is high and constant, so a flat fee is predictable and lower"],
      ["Seasonal — heavy some months, quiet others", "Credits", "The quiet months cost nothing"],
      ["Agency running client accounts", "Seats or hybrid", "Usage is continuous and needs to be attributable"],
    ]},
    { type: "prose", text: [
      "The pattern underneath: **credits reward intermittent use and seats reward constant use.** Local agency prospecting is intermittent almost by definition — two afternoons a week, heavier before a season, quiet during a delivery month — which is why the smaller the agency, the more likely credits win.",
    ]},

    { type: "h2", id: "hidden", text: "Where each one bites" },
    { type: "prose", text: [
      "**Seats bite on the second person.** The moment you add somebody who prospects occasionally, you are paying a full seat for partial use, and small agencies frequently respond by sharing a login — which breaks attribution, breaks any per-user history, and usually breaks the terms of service.",
      "**Credits bite on unpredictability.** You cannot know next month's bill in advance, and worse, the cost of a search depends on its shape rather than its yield. A narrow neighbourhood query and a broad filtered city query can return the same twenty businesses and cost several times different, because the underlying data is billed per request rather than per result.",
      "That second point is the genuine downside of metered pricing and it is worth understanding rather than resenting: it is not a pricing trick, it is what the upstream cost actually looks like. **A billed Places call costs about ₹3.08 regardless of how many usable businesses come back.** Any tool that charges you a flat per-lead rate is averaging that risk and pricing the average into your bill.",
    ]},

    { type: "h2", id: "measure", text: "The number to measure" },
    { type: "prose", text: [
      "Before choosing, spend a month recording one thing: **how many prospecting sessions you actually ran, and roughly how many businesses you pulled.**",
      "Most people are surprised, and in the same direction. The plan was three afternoons a week; the reality was five sessions in the month, two of which produced most of the list. On a seat you paid for thirty days of availability to use it five times.",
      "Then the comparison is arithmetic rather than preference. Take the seat price, divide by your actual sessions, and compare against what those sessions would have cost in credits. If the seat is costing more than double the credit equivalent, the model is wrong for you regardless of which one you prefer.",
    ]},
    { type: "checklist", items: [
      { title: "Sessions per month", detail: "Actual, not planned. Count them for one month before deciding anything." },
      { title: "Businesses pulled per session", detail: "This is what a credit model bills against." },
      { title: "People who genuinely need access", detail: "Not people who might. A seat for occasional use is the most common waste in this category." },
      { title: "Seasonality", detail: "If three months of your year are quiet, a flat annual seat charges you for them." },
    ]},

    { type: "h2", id: "hybrid", text: "Why hybrids are winning" },
    { type: "prose", text: [
      "The direction of the whole software market, and it is a reasonable answer rather than a fudge: a small base fee for access and predictability, plus metered usage on top for fairness.",
      "It solves the two real complaints simultaneously — the vendor gets some revenue predictability, and the customer stops paying full price for a month they barely used. If you are choosing between three tools and one offers a hybrid, that is usually the one to test first.",
      "The exception is genuine occasional use. If you prospect four times a year before seasons, pure credits with no base fee remains the cheapest thing available, and a base fee is just a smaller version of the seat problem.",
    ]},

    { type: "leads", city: "indore", heading: "What a session actually produces" },

    { type: "cta", variant: "map", title: "Pay for what you pull.",
      detail: "Metered rather than per-seat — the quiet months between prospecting rounds cost nothing.",
      action: "See the model", href: "/login" },
  ],
  faqs: [
    { q: "Is credit-based or seat-based pricing cheaper for a lead tool?", a: "Credits for solo and small agencies, seats for teams where everybody prospects daily. Credits reward intermittent use and seats reward constant use, and local agency prospecting is intermittent almost by definition." },
    { q: "Why is per-seat pricing declining?", a: "Because it is unfair in both directions — casual users pay far more than the value they receive while heavy users generate disproportionate load without paying more. Adoption fell from 21% to 15% of SaaS companies in a year, with pure per-seat businesses churning considerably more." },
    { q: "What is the downside of credit-based pricing?", a: "Unpredictability, and that the cost of a search depends on its shape rather than its yield. A narrow query and a broad one can return the same twenty businesses at very different costs, because the underlying data is billed per request — a Places call costs about ₹3.08 whatever comes back." },
    { q: "How do I decide which model to buy?", a: "Record one month of actual usage: how many prospecting sessions you ran and roughly how many businesses you pulled. Most people find they used it five times when they planned twelve. Then divide the seat price by real sessions and compare." },
    { q: "Are hybrid pricing models better?", a: "Usually, and they are where the market is heading — a small base fee for predictability plus metered usage for fairness. The exception is genuinely occasional use, where a base fee is just a smaller version of the seat problem." },
  ],
  links: [["/resources/should-you-buy-web-design-leads", "what to pay for leads at all"], ["/resources/exclusive-leads-vs-your-own-list", "bought against self-built"], ["/resources/lead-generation-tools-that-work-outside-the-us", "coverage rather than pricing"], ["/resources/best-lead-generation-tools-for-web-design-agencies", "the tools themselves"]],
},

/* ───────────────────────────── 2 · tools roundup */
{
  slug: "best-lead-generation-tools-for-web-design-agencies",
  title: "The Best Lead Generation Tools for Web Design Agencies",
  excerpt: "Organised by the job rather than ranked, because most agencies buy an excellent tool for a job it was never built to do — and then conclude the channel does not work.",
  meta: "The best lead generation tools for web design agencies, organised by job: finding no-website businesses, finding contacts, technographics, and pipeline.",
  category: "Comparisons", cluster: "tools", hero: "network", mins: 9,
  tags: ["Comparisons", "Tools", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "There is no best lead generation tool for a web design agency, because the category contains four unrelated jobs and the products for each are different. **The most common expensive mistake is buying a genuinely excellent product from one row for a job in another**, deciding outbound does not work, and stopping.",
      "We sell one of these, in the first row. That is disclosed rather than hidden, and the rest of the rows are described as accurately as we can manage. Most agencies reading this need row one and buy row two.",
    ]},

    { type: "h2", id: "jobs", text: "The four jobs agencies buy tools for" },
    { type: "table", head: ["Job", "What it needs", "What it does not"], rows: [
      ["Find businesses with no website", "Map-listing data", "Contact databases, technographics"],
      ["Find a named contact at a company", "Domain or professional-network data", "Map listings"],
      ["Find businesses on a given tech stack", "Website scanning", "Anything about businesses with no site"],
      ["Manage what you found", "A simple pipeline", "Enterprise CRM"],
    ]},
    { type: "prose", text: [
      "If you sell first websites to local businesses, your job is row one and almost nothing sold as a lead generation tool addresses it — which is why the SERP for this question returns contact databases and landing-page builders.",
    ]},

    { type: "h2", id: "row-one", text: "Finding businesses with no website" },
    { type: "prose", text: [
      "A small category built on the same underlying source — business map listings, where the website field exists whether or not the business has a site. Products here include B2BLeadFinder, Prospea, Origami, Oppora, GrabNear and ours.",
      "They differ on three axes worth checking before paying: **geographic coverage** (many are US-first and thin elsewhere), **whether the data is maintained or exported once**, and **the pricing model**, which is where per-seat products fit this use case badly because prospecting is intermittent.",
      "The one thing to verify yourself, in a free tier, is coverage of your actual city. Every product in this category demos well on Austin and Manchester. Check Kota.",
    ]},

    { type: "h2", id: "row-two", text: "Finding contacts, and when you need it" },
    { type: "prose", text: [
      "Apollo, ZoomInfo, Cognism, Lusha and Hunter are excellent at their job and their job is not this one. They resolve **a named person, in a role, at a company with a domain**, from professional networks and email patterns.",
      "A business with no website has no domain, no email pattern and an owner who is not on a professional network in any useful way. These products return blanks against exactly the prospects you wanted, which is a design consequence rather than a failure.",
      "They become the right tools the moment your prospect has a website — redesign work, larger multi-branch operations, and overseas selling where you cannot walk in and email is the only channel available.",
    ]},

    { type: "h2", id: "row-three", text: "Technographics" },
    { type: "prose", text: [
      "BuiltWith and Wappalyzer detect what a site runs by scanning its source, headers and DNS. BuiltWith tracks over 111,000 technologies, Wappalyzer around 8,000 across 106 categories, and both are good.",
      "Their universe is, by construction, businesses that have a website. That makes them genuinely useful for redesign and migration prospecting — finding businesses on an unsupported CMS is exactly the job — and structurally unable to help with first websites.",
      "One warning worth repeating: **\"no technologies detected\" is not a no-website signal.** It mixes absent sites with blocked scanners, CDN-hidden headers and unassociated domains, and a list built on it produces the worst cold call there is.",
    ]},

    { type: "h2", id: "row-four", text: "Managing what you found" },
    { type: "prose", text: [
      "The most over-bought row. A local agency running a hundred prospects does not need an enterprise CRM, and the time spent configuring one is time not spent prospecting.",
      "What is actually needed: a list with a status, a date, and one line of notes per business. A spreadsheet does this. A ₹800-a-month simple CRM does it slightly better once you have two people. Anything beyond that is solving a problem you do not have yet.",
      "The one feature worth paying for eventually is **a reminder that a follow-up is due**, because follow-up is where local sales are won and it is the first thing to slip.",
    ]},
    { type: "checklist", items: [
      { title: "Buy for row one if you sell first websites", detail: "Map-listing data. Verify coverage of your own city in a free tier before paying." },
      { title: "Buy for row two if you sell redesigns", detail: "Every prospect has a domain, so contact databases work normally." },
      { title: "Buy row three only for migration work", detail: "And never use empty results as a no-website proxy." },
      { title: "Delay row four", detail: "A spreadsheet with a status and a date beats a CRM you have not configured." },
    ]},

    { type: "leads", city: "jaipur", heading: "What row one produces" },

    { type: "cta", variant: "map", title: "Check the job before the tool.",
      detail: "If you sell first websites, the job is map-listing data — try it on your own city first.",
      action: "Try it free", href: "/login" },
  ],
  faqs: [
    { q: "What is the best lead generation tool for a web design agency?", a: "It depends entirely on which of four jobs you have: finding businesses with no website, finding a named contact at a company with a domain, finding businesses on a tech stack, or managing a pipeline. Buying an excellent tool for the wrong job is the common expensive mistake." },
    { q: "Why doesn't Apollo or ZoomInfo work for local prospecting?", a: "They resolve a named person in a role at a company with a domain, from professional networks and email patterns. A business with no website has none of those, so they return blanks — a design consequence rather than a failure. They are the right tools for redesign work." },
    { q: "Are BuiltWith and Wappalyzer useful for finding clients?", a: "For redesign and migration work, yes — finding businesses on an unsupported CMS is exactly their job. For first websites, no: their universe is businesses that have a site, and \"no technologies detected\" mixes absent sites with blocked scanners and unassociated domains." },
    { q: "Do I need a CRM for a web design agency?", a: "Not early. A hundred prospects needs a list with a status, a date and one line of notes, which a spreadsheet does. The one feature worth paying for eventually is a reminder that a follow-up is due, because follow-up is the first thing to slip." },
    { q: "How do I compare no-website lead tools?", a: "On coverage of your actual city, on whether the data is maintained or exported once, and on the pricing model — per-seat fits this use case badly because prospecting is intermittent. Every product demos well on Austin; check your own city in a free tier." },
  ],
  links: [["/resources/apollo-alternative-local-business-leads", "why contact databases miss this segment"], ["/resources/why-tech-stack-filtering-misses-your-best-prospects", "the technographic blind spot"], ["/resources/credit-based-vs-seat-based-lead-tools", "which pricing model fits"], ["/resources/free-ways-to-find-businesses-without-websites", "doing it without tools"]],
},

/* ───────────────────────────── 3 · india tools */
{
  slug: "best-lead-generation-tools-for-indian-agencies",
  title: "The Best Lead Generation Tools for Indian Agencies",
  excerpt: "The standard Indian B2B stack costs about ₹12,000 per user per month and finds almost none of the businesses an Indian web agency sells to. What to use instead, and why.",
  meta: "The best lead generation tools for Indian agencies: what the standard stack costs, why it misses local businesses, and which tools fit a ₹25,000 ticket.",
  category: "Comparisons", cluster: "tools", hero: "network", mins: 9,
  tags: ["Comparisons", "Tools", "India"],
  body: [
    { type: "prose", text: [
      "The tooling recommended to Indian B2B teams costs roughly **₹12,000 per user per month** — LinkedIn Sales Navigator at around ₹8,300, Lusha at around ₹3,000, and a CRM at around ₹800 — and for an agency selling websites to local businesses it finds almost nobody.",
      "The reason is stated plainly even in the guides recommending it: **Indian SMBs are found on Google Maps, JustDial and IndiaMART rather than on LinkedIn.** A hardware supplier in Kanpur has no professional profile and no corporate domain, so a stack built on both returns nothing.",
      "We sell a tool in this category, which is disclosed rather than buried — so treat any claim about the best lead generation setup here as an interested party's. The arithmetic below does not depend on it.",
    ]},

    { type: "h2", id: "arithmetic", text: "The arithmetic against a ₹25,000 ticket" },
    { type: "prose", text: [
      "Whatever a tool costs, divide it by your average project value. That single test disqualifies most of this category for Indian local web work.",
    ]},
    { type: "table", head: ["Tool", "Roughly", "Projects to break even"], rows: [
      ["LinkedIn Sales Navigator", "₹8,300/user/month", "Four a year, just for this"],
      ["Lusha", "₹3,000/user/month", "One and a half a year"],
      ["JustDial Leads", "From ₹5,000/month", "Two and a half a year"],
      ["IndiaMART LeadManager", "From ₹3,000/month", "One and a half a year"],
      ["Simple CRM", "₹800–2,000/month", "Under one"],
    ], note: "Break-even against a ₹25,000 project, ignoring that you also have to close it. Published Indian pricing." },
    { type: "prose", text: [
      "None of those numbers is unreasonable for the buyer they were priced for. LinkedIn Sales Navigator at ₹8,300 is trivially worth it to somebody selling enterprise software with a ₹15 lakh contract value. Against a ₹25,000 website it is four projects a year of pure tooling cost for a database that does not contain your prospects.",
    ]},

    { type: "h2", id: "what-works", text: "What Indian local agencies should actually use" },
    { type: "prose", text: [
      "**Map-listing data.** The only source where a business appears regardless of whether it has a website, a domain or an email. This is the row that matters, and options include GrabNear, Origami, B2BLeadFinder and ours. GrabNear is worth knowing about as a free-with-your-own-API-key option, which is a genuinely reasonable route if you are comfortable managing a Google Cloud project.",
      "**Directory listings as a free prospect source.** JustDial and IndiaMART listings are free to browse even if their lead packages are not. Mining those listings is a better use of both platforms than buying from them, with the caveat that a business paying for a listing is a harder objection than one with nothing.",
      "**A cheap CRM, later.** ₹800–2,000 a month buys a pipeline with reminders, and that is the only software an Indian local agency genuinely needs beyond the data source. Zoho and the Indian-built alternatives are priced sensibly for this market in a way the international products are not.",
      "**Nothing for email.** 95.6% of the businesses in our index have a phone number and none has a listed email. An email finder is a subscription that returns blanks against exactly the prospects you were trying to reach.",
    ]},

    { type: "h2", id: "when-linkedin", text: "When the standard stack is right after all" },
    { type: "prose", text: [
      "Three situations, and they are real rather than concessions.",
      "**Selling to Indian companies rather than shops.** A software firm, a manufacturer with a head office, a hospital group — these have domains, staff with profiles, and named decision-makers. The standard stack works exactly as advertised.",
      "**Selling overseas from India.** A UK or US prospect is reachable by email in a way an Indian shop is not, and the walk-in channel is unavailable, so the tooling that fails locally becomes appropriate.",
      "**Selling development or retainer work at higher tickets.** At ₹2 lakh a project the divide-by-your-ticket test passes comfortably and the maths changes.",
      "The mistake is not using these tools. It is using them for local first-website prospecting and concluding, when they return nothing, that the market is not there.",
    ]},

    { type: "h2", id: "stack", text: "The stack that fits" },
    { type: "prose", text: [
      "Assembled from what actually applies, the whole tooling requirement for an Indian local web agency comes to less than one seat of the standard stack.",
    ]},
    { type: "table", head: ["Job", "What to use", "Roughly"], rows: [
      ["Finding prospects", "Map-listing data, metered", "Pay per use"],
      ["Free supplement", "JustDial and IndiaMART listings", "Nothing"],
      ["Pipeline", "A spreadsheet, then a cheap Indian CRM", "₹0–2,000/month"],
      ["Contact", "The phone number already on the listing", "Nothing"],
      ["Follow-up", "WhatsApp", "Nothing"],
    ], note: "Against roughly ₹12,000 per user per month for the standard B2B stack, which does not contain these businesses." },
    { type: "prose", text: [
      "The gap between those two figures is the whole argument, and it is not because the expensive tools are bad. It is because they were built for a buyer whose prospects have domains, and yours do not.",
    ]},

    { type: "h2", id: "payments", text: "The practical details nobody lists" },
    { type: "prose", text: [
      "Two things that decide whether a tool is actually usable from India, and neither appears in any comparison table.",
      "**Whether it bills in rupees.** A tool priced in dollars costs more than the sticker every time the rupee moves, adds foreign transaction charges on most Indian cards, and makes the expense harder to account for. Rupee pricing is not a minor convenience.",
      "**Whether Indian payment methods work.** International SaaS billing and Indian card recurring-payment rules interact badly, and a subscription that silently fails to renew mid-month is worse than one you never bought. Tools built for this market handle UPI and Indian cards natively; many international ones do not.",
      "Both of these sound like small operational points and both are common reasons an Indian agency abandons a tool it was otherwise happy with.",
    ]},

    { type: "leads", city: "kanpur", heading: "What map data finds here" },

    { type: "cta", variant: "map", title: "Priced for this market.",
      detail: "Rupee pricing, metered rather than per-seat, on the source Indian local businesses actually appear in.",
      action: "Try it free", href: "/login" },
  ],
  faqs: [
    { q: "What lead generation tools should an Indian web agency use?", a: "Map-listing data as the primary source, directory listings as a free supplement, and a cheap Indian CRM later. The standard B2B stack — Sales Navigator, Lusha, a CRM — costs about ₹12,000 per user per month and does not contain local businesses." },
    { q: "Why doesn't LinkedIn work for Indian local prospecting?", a: "Because Indian SMBs are found on Google Maps, JustDial and IndiaMART rather than LinkedIn — a point stated even in the guides that recommend the LinkedIn stack. A hardware supplier in Kanpur has no professional profile and no corporate domain." },
    { q: "How do I judge whether a tool is worth its price?", a: "Divide the annual cost by your average project value. Sales Navigator at ₹8,300 a month is four ₹25,000 projects a year of pure tooling cost, which is trivially worth it against a ₹15 lakh enterprise contract and absurd against a website." },
    { q: "Do I need an email finder in India?", a: "No. 95.6% of the businesses in our index have a phone number and none has a listed email, because Google's Places data carries no email field. An email finder returns blanks against exactly the prospects you wanted." },
    { q: "What practical details matter when buying tools from India?", a: "Whether it bills in rupees, and whether Indian payment methods work. Dollar pricing adds foreign transaction charges and accounting friction, and international recurring-billing interacts badly with Indian card rules — a subscription that silently fails to renew is worse than one you never bought." },
  ],
  links: [["/resources/best-lead-generation-tools-for-web-design-agencies", "the same question without the India lens"], ["/resources/justdial-indiamart-as-lead-sources", "using the directories properly"], ["/resources/do-you-need-an-email-finder-for-local-businesses", "why email tooling fails here"], ["/resources/how-to-find-small-businesses-without-a-website-in-india", "the market these tools are for"]],
},
];

async function main() {
  for (const p of posts) {
    await sql`
      INSERT INTO blog_posts (slug, title, excerpt, meta_description, category, cluster, tags,
        author_slug, hero_variant, read_minutes, body, faqs, status, featured, published_at)
      VALUES (${p.slug}, ${p.title}, ${p.excerpt}, ${p.meta}, ${p.category}, ${p.cluster},
        ${p.tags}, ${"tarun"}, ${p.hero}, ${p.mins},
        ${sql.json(p.body as unknown as Parameters<typeof sql.json>[0])},
        ${sql.json(p.faqs as unknown as Parameters<typeof sql.json>[0])},
        ${"published"}, ${false}, ${new Date(Date.now() - 120_000)})
      ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, excerpt=EXCLUDED.excerpt,
        meta_description=EXCLUDED.meta_description, category=EXCLUDED.category, cluster=EXCLUDED.cluster,
        tags=EXCLUDED.tags, hero_variant=EXCLUDED.hero_variant, read_minutes=EXCLUDED.read_minutes,
        body=EXCLUDED.body, faqs=EXCLUDED.faqs, updated_at=now()
    `;
    await sql`DELETE FROM blog_links WHERE from_slug = ${p.slug}`;
    for (const [i, [href, anchor]] of p.links.entries()) {
      await sql`INSERT INTO blog_links (from_slug, to_href, anchor, kind, position)
                VALUES (${p.slug}, ${href}, ${anchor}, ${href.startsWith("/leads") ? "lead_page" : "sibling"}, ${i})`;
    }
    console.log("  ✓", p.slug);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
