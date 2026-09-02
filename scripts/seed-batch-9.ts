/**
 * Batch 9 — the tools and buying-decision cluster.
 *
 * SERP checks first:
 *  · "Should you buy web design leads" is mostly written by lead sellers (lpagery, fludileads,
 *    webdesignleads.co) plus agency-marketing shops. The one genuinely useful idea in it, from
 *    ClicksGeek, is that cost per lead is the wrong metric and cost per customer is the right one.
 *    The published benchmarks worth anchoring to are home services at £20–60 a lead and legal or
 *    financial at £150–400. Nobody in that SERP publishes what the underlying data costs, which is
 *    the number that makes the arithmetic decidable, and we can.
 *  · JustDial vs IndiaMART is covered by Indian B2B blogs (vedain, ecomdigest,
 *    bharatbusinessautomation) and consistently as a question for the *listed business*, never for
 *    an agency deciding whether to buy leads or mine listings. Both readings are covered here.
 *  · Email finders: the SERP already concedes the point — Hunter is domain-based and returns
 *    nothing without a website, Apollo is LinkedIn-built so owner records come back blank, and hit
 *    rates for sub-50-employee businesses are quoted at 20–30%. Our own index closes it: 95.6% of
 *    the businesses in it have a phone number and 0% have an email, because Places does not carry
 *    one.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · buying leads */
{
  slug: "should-you-buy-web-design-leads",
  title: "Should You Buy Web Design Leads? An Honest Cost Breakdown",
  excerpt: "The arithmetic decides this, not the sales page. What the underlying data actually costs, what sellers charge, and the close rate at which each one stops making sense.",
  meta: "Should you buy web design leads? The cost breakdown: what raw lead data costs, what sellers charge per lead, and the close rate where buying stops paying.",
  category: "Comparisons", cluster: "tools", hero: "pricing", mins: 9,
  tags: ["Comparisons", "Pricing", "Tools"],
  body: [
    { type: "prose", text: [
      "Whether you should buy web design leads comes down to one calculation, and it is not the one the sales pages run. Cost per lead is close to meaningless on its own — **cost per customer** is the number that decides it, and you cannot work that out without knowing your own close rate.",
      "Here is that breakdown, with real figures on both sides of it: what the raw data costs to produce, and what it costs to buy ready-made.",
    ]},

    { type: "h2", id: "what-buying-means", text: "Three different things called \"buying leads\"" },
    { type: "prose", text: [
      "They have wildly different prices and get discussed as though they were one product.",
    ]},
    { type: "features", items: [
      { title: "Raw data", icon: "data", detail: "A list of businesses matching a filter. No intent, no qualification. Cheap, and the closest thing to a commodity in this market." },
      { title: "Qualified leads", icon: "verified", detail: "Someone has confirmed the business exists, wants something, and can pay. Expensive, and what most pay-per-lead sellers claim to sell." },
      { title: "Exclusive leads", icon: "score", detail: "Qualified, and sold to you alone. The most expensive tier, and the only one where the price is defensible on its own terms." },
    ]},
    { type: "prose", text: [
      "Most disappointment in this category comes from paying tier-three prices for tier-one data. The tell is a seller who cannot describe how a lead was qualified beyond \"our network\" — which is the same red flag published on every honest guide to this, alongside prices that are implausibly low.",
    ]},

    { type: "h2", id: "raw-cost", text: "What the raw data actually costs" },
    { type: "prose", text: [
      "Almost nobody publishes this, and it makes the rest of the decision much easier.",
      "Local business data of the kind you need — name, category, phone, rating, and crucially whether there is a website — comes from Google's Places API. Requesting the website field alongside ratings puts the call on the Enterprise field tier at **$0.035, about ₹3.08 a call.** Billing is per call, not per result.",
      "So the cost of the underlying data is somewhere between roughly ₹0.92 and ₹6.16 a business, depending entirely on how broad the query was. That is the floor. Anything you are quoted above it is paying for qualification, exclusivity, or margin — which is fine, as long as you know which.",
    ]},
    { type: "table", head: ["What you are buying", "Typical price", "What the money is for"], rows: [
      ["Raw local data", "₹1–10 per business", "The API call and the maintenance"],
      ["Home-services lead", "£20–60", "Qualification and intent"],
      ["Legal or financial lead", "£150–400", "Qualification, intent, ticket size"],
      ["Exclusive lead", "Highest tier", "Not being sold to four competitors"],
    ], note: "Published benchmarks from lead-generation pricing guides, alongside our own measured data cost." },

    { type: "h2", id: "math", text: "The close rate that decides it" },
    { type: "prose", text: [
      "Take a ₹25,000 website. Take a close rate of one in twenty on qualified conversations, which is a realistic figure for local outbound once you are past the learning phase.",
      "**At ₹50 a lead**, twenty leads costs ₹1,000 to win ₹25,000. That works, comfortably, and would still work at half the close rate.",
      "**At ₹3,000 a lead**, twenty leads costs ₹60,000 to win ₹25,000. That loses money on every customer, and no amount of sales skill rescues it — you would need to close better than one in eight before it breaks even.",
    ]},
    { type: "table", head: ["Price per lead", "Leads per sale", "Cost per customer", "On a ₹25,000 site"], rows: [
      ["₹50", "20", "₹1,000", "Works"],
      ["₹500", "20", "₹10,000", "Thin, but viable"],
      ["₹1,500", "20", "₹30,000", "Loses money"],
      ["₹3,000", "20", "₹60,000", "Loses money badly"],
    ], note: "At a 1-in-20 close rate. Halve the close rate and every row moves one step worse." },
    { type: "prose", text: [
      "This is why the expensive-lead model works for legal and financial services and not for websites. A £300 lead is rational when the customer is worth £8,000; the same lead is absurd when the customer is worth ₹25,000. **The lead price has to be set against the ticket, and web design has a small ticket.**",
    ]},

    { type: "h2", id: "exclusivity", text: "What exclusivity is actually worth" },
    { type: "prose", text: [
      "The one place a high price genuinely earns itself. A shared lead sold to four agencies is not a quarter as valuable — it is worse than that, because the business now has four proposals, the conversation becomes a price comparison immediately, and you are the third person to call this week.",
      "So the question to ask any seller is simply how many people receive each lead. If the answer is evasive, assume several. If the answer is one, the price should be substantially higher and it may be worth it.",
      "Raw data has the same property in reverse: a list everyone can generate is not exclusive, but nor is it being worked by four agencies at once, because generating it takes effort that most people do not put in.",
    ]},

    { type: "h2", id: "verdict", text: "When buying makes sense" },
    { type: "checklist", items: [
      { title: "Buy raw data", detail: "Almost always. It is cheap, the alternative is hours of your own time, and you control the qualification." },
      { title: "Buy qualified leads", detail: "Only if your average project is large enough that a four-figure cost per customer still leaves margin." },
      { title: "Buy exclusive leads", detail: "If the seller can prove exclusivity and your close rate is already known. Not while you are still learning it." },
      { title: "Buy nothing", detail: "If you have not yet closed anyone from outbound. Find that out with free methods before spending." },
    ]},
    { type: "prose", text: [
      "The last one is the honest recommendation for most people reading this. Until you know your own close rate, every figure in this post is a guess, and the cheapest way to find it out is a hundred leads you gathered yourself.",
    ]},

    { type: "leads", city: "coimbatore", heading: "What raw data looks like" },

    { type: "cta", variant: "map", title: "Know your close rate first.",
      detail: "Free credits, enough leads to find out what you close, before anybody quotes you a price per lead.",
      action: "Start free", href: "/login" },
  ],
  faqs: [
    { q: "Should I buy web design leads?", a: "Raw data almost always, qualified leads rarely. A ₹25,000 website at a 1-in-20 close rate supports about ₹50 a lead comfortably and loses money at ₹1,500. The lead price has to be set against the ticket, and web design has a small ticket." },
    { q: "How much do web design leads cost?", a: "Published benchmarks run £20–60 for home-services leads and £150–400 for legal or financial. Raw local business data is far cheaper — the underlying Places API call costs about ₹3.08 and returns several businesses, so the data floor is roughly ₹1–10 each." },
    { q: "What is a good cost per lead for a web design agency?", a: "Work backwards from cost per customer. At a 1-in-20 close rate on a ₹25,000 project, ₹50 a lead means ₹1,000 per customer and works; ₹1,500 a lead means ₹30,000 per customer and does not." },
    { q: "Are exclusive leads worth the extra cost?", a: "Sometimes, and it is the one premium that earns itself. A lead sold to four agencies turns into a price comparison before you have spoken. Ask any seller how many people receive each lead — evasiveness means several." },
    { q: "What are the red flags when buying leads?", a: "Prices that are implausibly low, and any seller who cannot explain how a lead was qualified beyond \"our network of partners\". Most disappointment in this category is paying qualified-lead prices for raw data." },
  ],
  links: [["/resources/free-ways-to-find-businesses-without-websites", "finding your close rate for free"], ["/resources/scraping-google-maps-for-leads-what-breaks", "what the underlying data costs to produce"], ["/resources/how-much-to-charge-for-a-website-india", "the ticket the lead price has to fit"], ["/resources/apollo-alternative-local-business-leads", "why B2B databases price differently"]],
},

/* ───────────────────────────── 2 · justdial / indiamart */
{
  slug: "justdial-indiamart-as-lead-sources",
  title: "JustDial and IndiaMART as Lead Sources: An Honest Review",
  excerpt: "Two completely different platforms that get discussed as one, and two completely different ways an agency can use them. One of those ways is much better than the other.",
  meta: "JustDial and IndiaMART as lead sources for agencies: what each platform actually is, and why buying their leads differs from mining their listings.",
  category: "Comparisons", cluster: "tools", hero: "nearby", mins: 8,
  tags: ["Comparisons", "India", "Tools"],
  body: [
    { type: "prose", text: [
      "JustDial and IndiaMART are not the same product and should not be compared as though they were. **IndiaMART is a B2B marketplace** where buyers look for suppliers and bulk trade; **JustDial is a local services directory** where consumers look for somebody nearby. For an agency selling websites, that difference decides everything.",
      "There is also a second distinction nobody makes, and it matters more: there are two entirely different ways to use these platforms as lead sources, and they have opposite risk profiles.",
      "The honest summary is that the free use of both is better than the paid one, which is not what either platform's sales team will tell you.",
    ]},

    { type: "h2", id: "two-ways", text: "Buying their leads, or mining their listings" },
    { type: "table", head: ["", "Buying leads from them", "Mining their listings"], rows: [
      ["What you get", "Enquiries from people wanting a website", "Businesses listed on the platform"],
      ["Cost", "Paid package", "Free"],
      ["Intent", "Claimed, often shared", "None — cold"],
      ["Volume", "Limited by the package", "Large"],
      ["Main problem", "Attribution and authenticity", "The listing itself is an objection"],
    ]},
    { type: "prose", text: [
      "Most agencies mean the first when they ask about this, and the second is usually the better answer.",
    ]},

    { type: "h2", id: "buying", text: "Buying leads: what to watch" },
    { type: "prose", text: [
      "Both platforms face persistent criticism on the same three points, and they are worth knowing before you sign anything: **lead authenticity, pricing transparency, and attribution.**",
      "Attribution is the one that quietly costs the most. A listed business receives calls and enquiries and often cannot separate what came from paid promotion from what would have arrived anyway. If you cannot attribute, you cannot calculate a cost per customer, and without that number every renewal decision is a guess dressed up as a judgement.",
      "The other structural issue is sharing. An enquiry that reaches several providers turns into a price comparison before you have said anything, which is the same problem as any shared lead and it is priced as though it were not.",
    ]},

    { type: "h2", id: "mining", text: "Mining the listings: the better use" },
    { type: "prose", text: [
      "Both platforms are, incidentally, large directories of businesses with their contact details and an indication of whether they have a website. That is a free prospect list, and it is how most agencies should actually be using them.",
      "IndiaMART skews toward manufacturers, wholesalers and bulk traders — which happens to overlap with some of the highest-gap categories we measure. Wholesalers run at 51.3% with no website in our index. JustDial skews hyperlocal and consumer-facing, which is the restaurants, salons and service businesses.",
      "The catch is real, though, and it is the reason this is not free money.",
    ]},
    { type: "tip", title: "The listing is itself an objection",
      text: "A business paying for a JustDial or IndiaMART listing has already spent money on being findable and frequently considers the question closed. \"We are on JustDial\" is a harder version of the Facebook objection, because unlike a free page this one has an invoice attached to it." },

    { type: "h2", id: "objection", text: "Answering \"we are already on JustDial\"" },
    { type: "prose", text: [
      "Do not attack the platform. They are paying for it, so criticising it makes them defend the decision rather than examine it.",
      "The useful distinction is **rented versus owned**, told through what happens when they stop paying. The listing disappears the month the subscription lapses, along with every enquiry route it carried, and the reviews on it do not travel. A site they own does not have that property.",
      "The second angle is what the listing cannot do. A directory profile shows a name, a category and a phone number. It does not show a hardware supplier's range, a boutique's previous work, a coaching institute's results, or a bakery's cake catalogue — and those are the things that actually convert an enquiry into an order.",
      "Framed that way it is not a competitor to their listing at all, which is the only framing that gets a fair hearing.",
    ]},

    { type: "h2", id: "verdict", text: "The verdict" },
    { type: "checklist", items: [
      { title: "IndiaMART for B2B and trade", detail: "Wholesalers, manufacturers, suppliers. Overlaps well with high-gap categories, and those businesses have contractor customers worth building for." },
      { title: "JustDial for consumer-facing local", detail: "Restaurants, salons, services. Larger volume, smaller tickets, more of them already listed somewhere." },
      { title: "Mine before you buy", detail: "The listings are free and the packages are not. Work the free version first and you will know your close rate before anybody sells you a package." },
      { title: "Expect the objection", detail: "Every business you find this way is paying for a listing. Have the rented-versus-owned answer ready before you dial." },
    ]},

    { type: "leads", city: "surat", heading: "Trade and wholesale with no website" },

    { type: "cta", variant: "map", title: "A cleaner list than a directory.",
      detail: "Businesses filtered by category, city and whether they actually have a website — without the listing already in the way.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "Is JustDial or IndiaMART better for finding leads?", a: "They serve different markets. IndiaMART is a B2B marketplace suited to manufacturers, wholesalers and bulk trade; JustDial is a hyperlocal consumer directory suited to restaurants, salons and local services. Which is better depends entirely on the vertical you sell to." },
    { q: "Should an agency buy leads from JustDial or IndiaMART?", a: "Usually not as a first step. Both attract persistent criticism on lead authenticity, pricing transparency and attribution — and if you cannot attribute a sale to the package, you cannot calculate a cost per customer or make a sound renewal decision." },
    { q: "Can I use JustDial listings as a prospect list?", a: "Yes, and it is the better use of both platforms. They are large directories of businesses with contact details, and it costs nothing. IndiaMART skews to trade and wholesale, where our index shows wholesalers at 51.3% with no website." },
    { q: "How do I answer \"we are already on JustDial\"?", a: "Do not attack the platform they are paying for. Use rented versus owned: the listing vanishes the month the subscription lapses, and the reviews do not travel. Then name what a directory profile cannot show — range, past work, results, a catalogue." },
    { q: "Is a directory listing the same as a website?", a: "No, and the difference is what converts. A profile shows a name, category and phone number. It cannot show a supplier's range, a boutique's previous work or a bakery's order catalogue, which is what turns an enquiry into an order." },
  ],
  links: [["/resources/free-ways-to-find-businesses-without-websites", "the other free sources, costed"], ["/resources/why-facebook-only-businesses-are-your-best-prospects", "the same objection in a different form"], ["/resources/should-you-buy-web-design-leads", "whether to pay for leads at all"], ["/resources/which-local-verticals-actually-pay-for-a-website", "which of these verticals pays"]],
},

/* ───────────────────────────── 3 · email finders */
{
  slug: "do-you-need-an-email-finder-for-local-businesses",
  title: "Do You Need an Email Finder to Sell to Local Businesses?",
  excerpt: "No — and the reason is structural rather than a matter of picking a better tool. Every email finder resolves a person at a domain, and these businesses do not have one.",
  meta: "Do you need an email finder for local businesses? No — they resolve a person at a domain, and 95.6% of local businesses have a phone but no listed email.",
  category: "Comparisons", cluster: "tools", hero: "network", mins: 8,
  tags: ["Comparisons", "Tools", "Outreach"],
  body: [
    { type: "prose", text: [
      "No. And it is worth understanding why, because the answer is structural rather than a matter of finding a better tool — every email finder on the market would have to work differently, not just harder.",
      "Across the {{checked}} businesses in our index, **95.6% have a phone number and none has a listed email address.** Among the ones with no website, 90.7% still have a phone. That is not a gap in our data collection. It is what this market looks like.",
    ]},

    { type: "h2", id: "mechanism", text: "How email finders actually work" },
    { type: "prose", text: [
      "Every tool in this category does one of two things, and both of them fail here for the same reason.",
      "**Domain-based finders** — Hunter and its equivalents — take a company domain and a person's name and infer the address, then verify it. The published limitation is unambiguous: without a website there is no domain, and the tool returns nothing. Even where a small business does have a domain, accuracy falls off sharply because there is less public footprint to triangulate from; hit rates for businesses under fifty people are quoted at 20–30%.",
      "**Database lookups** — Apollo, ZoomInfo and similar — match against a store of contacts built largely from professional networks. Independent local operators are not on those networks in any useful way, so owner records come back thin or blank. This is a documented weakness of those products rather than a criticism: they were built for a different buyer.",
      "Both approaches assume a company with a domain and staff with professional profiles. **A tailor with 48 reviews and no website has neither**, so there is nothing for either method to attach to.",
    ]},
    { type: "table", head: ["Approach", "What it needs", "What local businesses have"], rows: [
      ["Domain pattern matching", "A company domain", "No domain — that is the premise"],
      ["Professional network data", "Staff with profiles", "An owner and three employees"],
      ["Website contact scraping", "A website to scrape", "A Google listing"],
      ["Directory scraping", "A directory listing", "Sometimes — usually just a phone number"],
    ]},

    { type: "h2", id: "phone", text: "What is actually there" },
    { type: "prose", text: [
      "The contact detail these businesses do have is a phone number, and it is nearly universal. In our index it runs at 91.3% in India, 93.9% in the UK, 99.7% in the US, and 100% in Germany and Italy.",
      "Which is a slightly odd relief: the channel that works for this market is the one you can always reach. You are not missing a contact method — you are trying to use a method that does not exist here.",
      "It is worth being clear about what a phone number gets you, though. It usually rings at a counter rather than reaching the owner, which is why the strongest channels for local business are walking in and messaging, with the number used mostly to follow up.",
    ]},
    { type: "tip", title: "One number worth remembering",
      text: "Google's Places API does not carry an email field at all. Any tool showing you an email for a local business either scraped it from a website — meaning that business has one — or inferred it, meaning it may not exist." },

    { type: "h2", id: "when", text: "When an email finder is still worth having" },
    { type: "prose", text: [
      "Two real cases, and neither is prospecting local businesses with no website.",
      "**If you sell redesigns**, your prospects have domains by definition, and a domain-based finder works normally. That is a different business from selling first websites and it is served well by the existing tools.",
      "**If you sell to larger local operations** — chains, multi-branch clinics, franchise groups — there is often a head office with a domain and staff with professional profiles, and the standard stack applies.",
      "For everybody else, an email finder is a subscription that returns blanks against exactly the prospects you were trying to reach.",
    ]},

    { type: "h2", id: "anyway", text: "If you are going to send email anyway" },
    { type: "prose", text: [
      "Some people will, and there is a version of it that is not a waste of time — it is just much narrower than the tooling implies.",
      "The address you can actually get for a local business is a generic one, published by the business itself: the `info@` on a Facebook page's contact section, the address printed on a shopfront or a menu, the one a directory profile lists. Those are real, confirmed, and collected by reading rather than by inferring.",
      "An inferred address is the opposite. It has not been confirmed to exist, it bounces at a rate that damages your sending domain, and it lands — if it lands — in a mailbox nobody in that business opens daily. The failure is not that the message is ignored; it is that you are training a domain you will later need for client work to look like a spam source.",
      "So: collect the published ones as you go, use them for follow-up after a real conversation, and do not build a channel on them.",
    ]},

    { type: "h2", id: "instead", text: "What to spend the subscription on instead" },
    { type: "prose", text: [
      "The constraint here is not contact discovery. Every one of these businesses is publicly listed with a phone number and an address, and most are a twenty-minute drive away.",
      "The scarce thing is **knowing which of them is worth the visit** — which have customers, which have money, which have a gap you can describe accurately, and which are clustered closely enough to work in one afternoon. That is a filtering problem, not a contact-finding one, and it is where the money is better spent.",
      "The uncomfortable version: if you are looking for an email finder for this market, the plan is probably to send cold email to local businesses, and that is the weakest channel available to you here. The businesses barely use email, the addresses would be inferred rather than confirmed, and the same afternoon spent walking one market street would reach more owners.",
    ]},

    { type: "leads", city: "lucknow", heading: "Businesses with a phone and no website" },

    { type: "cta", variant: "map", title: "Filter, don't find addresses.",
      detail: "Phone numbers on {{noSite}} businesses with no website. The hard part is choosing which ones to call.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "Do I need an email finder to sell to local businesses?", a: "No. Email finders resolve a person at a company domain, and a business with no website has no domain. Across our index 95.6% of businesses have a phone number and none lists an email address." },
    { q: "Why doesn't Hunter work for local businesses?", a: "Because it is domain-based. Without a website there is no domain to pattern-match against, and even where a small business has one, accuracy drops sharply — published hit rates for businesses under fifty people run around 20–30%." },
    { q: "Why doesn't Apollo have local business owners?", a: "Its contact data is built largely from professional networks, and independent local operators are not meaningfully present on them. Owner records for small local businesses come back thin or blank. It was built for a different buyer, not badly." },
    { q: "What contact details do local businesses actually have?", a: "A phone number, almost always — 91.3% in India, 93.9% in the UK, 99.7% in the US and effectively 100% in Germany and Italy. Google's Places API does not carry an email field at all." },
    { q: "When is an email finder worth paying for?", a: "If you sell redesigns, where every prospect has a domain by definition, or if you sell to chains and multi-branch operations with a head office. For first websites to independent local businesses, it returns blanks against exactly the prospects you wanted." },
  ],
  links: [["/resources/apollo-alternative-local-business-leads", "why B2B databases miss these businesses"], ["/resources/call-whatsapp-or-walk-in-indian-smbs", "the channels that do work"], ["/resources/qualifying-a-local-lead-before-you-call", "the filtering problem worth solving"], ["/resources/should-you-buy-web-design-leads", "where the subscription is better spent"]],
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
