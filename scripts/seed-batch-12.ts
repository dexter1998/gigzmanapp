/**
 * Batch 12 — the agency-building cluster.
 *
 * SERP checks first:
 *  · "First web design clients" is a settled genre (Elementor, Kinsta, Paperform, ZipWP, SEOSpace)
 *    and all of it points at your network, Upwork, and free work for portfolio. None of it mentions
 *    outbound to businesses with no website, and none of it puts a number on how many prospects ten
 *    clients actually takes.
 *  · "Start a web design agency in India" is polluted by design *registration* (IP law, a keyword
 *    collision) and by US startup-cost calculators quoting $6,757–41,334, which is not a number
 *    that means anything here. The Indian-authored advice that does exist recommends ₹2,000 static
 *    sites and free work for portfolio, which is the trap this post argues against.
 *  · Niche-down advice is unanimous, with one honest caveat — stay generalist when the geographic
 *    market is too small — that nobody quantifies. We can: the median category inside one Indian
 *    city holds 16 businesses with no website, and the 90th percentile is 41. That number settles
 *    the argument.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · first ten clients */
{
  slug: "your-first-10-web-design-clients",
  title: "Your First 10 Web Design Clients: A Realistic Playbook",
  excerpt: "How many prospects it actually takes, what to charge the first one versus the tenth, and why the free-work-for-portfolio advice costs more than it earns.",
  meta: "Your first 10 web design clients: how many prospects each one takes, what to charge along the way, and why free portfolio work is the wrong start.",
  category: "Lead Generation", cluster: "playbooks", hero: "leads", mins: 10,
  tags: ["Agency Playbook", "Prospecting", "Pricing"],
  body: [
    { type: "prose", text: [
      "Ten clients is roughly two hundred conversations, and almost every guide on this subject skips the number because the number is the discouraging part. Two hundred is not many — it is a few months of steady work — but it has to be planned for rather than hoped through.",
      "The standard advice is your network, then Upwork, then free work to build a portfolio. The first is worth doing once, the second is a different business, and the third is where most people lose six months.",
      "What follows is the playbook we would actually run, with the numbers attached at each step.",
    ]},

    { type: "h2", id: "arithmetic", text: "The web design client arithmetic nobody publishes" },
    { type: "prose", text: [
      "Work backwards. A realistic close rate on cold local outbound, once you are past the first few weeks, is about one in twenty qualified conversations. Reaching a decision-maker takes roughly two attempts. So:",
    ]},
    { type: "table", head: ["To get", "You need", "At a rate of"], rows: [
      ["1 client", "~20 conversations", "1 in 20"],
      ["10 clients", "~200 conversations", "1 in 20"],
      ["200 conversations", "~400 contact attempts", "Half reach someone"],
      ["400 attempts", "~250 qualified prospects", "Some are revisits"],
    ], note: "Close rates start worse than 1 in 20 and improve. The first two clients cost far more attempts than the last two." },
    { type: "prose", text: [
      "Two hundred and fifty qualified prospects is the useful figure, because it is a list you can actually build. In most Indian cities that is two or three categories with no website, filtered to businesses with real review counts — an afternoon of work, not a strategy.",
      "It also tells you the honest timeline. Ten businesses walked into per afternoon, three afternoons a week, is about six weeks of prospecting for the whole thing.",
    ]},

    { type: "h2", id: "free-work", text: "Why free work is the wrong start" },
    { type: "prose", text: [
      "The near-universal advice — build three sites free to have a portfolio, or charge only for hosting — sounds like paying dues and is usually a trap.",
      "**A free client behaves like a free client.** They do not send content, they do not turn up to review calls, and they do not launch, because nothing is at stake for them. You end up with three unfinished projects rather than three portfolio pieces, which is the exact opposite of the intended outcome.",
      "**It also sets your price at zero with the only people who will refer you.** In a local market the first clients are the ones who introduce you to the next five, and \"he did ours for free\" is not the introduction you want.",
      "The version that works is a **small paid project rather than a free large one.** A one-page presence site at ₹8,000–12,000 is a real transaction, produces a real deliverable, gets you a real testimonial, and takes a day. Three of those beats three free five-page projects that never launched.",
    ]},

    { type: "h2", id: "sequence", text: "The sequence" },
    { type: "steps", items: [
      { title: "Clients 1–2: people who already trust you", icon: "phone", detail: "Your network, once. Charge them properly but at the bottom of your range, and ask for photographs of the finished work and one sentence you can quote. Do not go back to this well repeatedly — it is small and you will exhaust it." },
      { title: "Clients 3–5: one category, walked into", icon: "map", detail: "Pick a single vertical with a real gap and work it on foot. The repetition is the point: by the fifth conversation you know the objections, the price band, and what these businesses actually lose by being invisible." },
      { title: "Clients 6–8: the same category, priced up", icon: "score", detail: "You now have three examples in their exact trade, which is the only portfolio that matters to a local business. Raise the price. This is the step people skip and it is where the business either becomes viable or does not." },
      { title: "Clients 9–10: referrals and a second category", icon: "signal", detail: "Ask every one of the first eight for one introduction. Start a second vertical before the first is exhausted, because a single category in a single city is smaller than it looks." },
    ]},

    { type: "h2", id: "pricing", text: "What to charge along the way" },
    { type: "prose", text: [
      "The mistake is picking one price and holding it for a year. The first client and the tenth should not pay the same, and the reason is not confidence — it is that you are demonstrably worth more by then.",
    ]},
    { type: "table", head: ["Client", "Typical quote", "What changed"], rows: [
      ["1–2", "₹8,000–15,000", "Nothing yet. You are buying evidence."],
      ["3–5", "₹12,000–20,000", "You have work to show, in a trade you have not yet specialised in."],
      ["6–8", "₹20,000–35,000", "Three examples in their exact category. This is worth real money."],
      ["9–10", "₹25,000–45,000", "Referrals, testimonials, and a repeatable process."],
    ], note: "Add a care plan from client three onward. It is the difference between ten projects and a business." },
    { type: "prose", text: [
      "The care plan matters more than any of these numbers. Ten builds is ten builds. Ten builds with a ₹2,000 monthly attached is ₹20,000 a month arriving before you sell anything in a given week, and it is the entire reason the eleventh client is easier than the first.",
    ]},

    { type: "h2", id: "mistakes", text: "The four ways this goes wrong" },
    { type: "checklist", items: [
      { title: "Prospecting only when the pipeline is empty", detail: "The month you spend delivering is the month with no new conversations, and the gap shows up two months later. Three fixed afternoons a week, regardless of workload." },
      { title: "Working across the whole city", detail: "Every call starts cold and nothing compounds. One category, one dense area, until it is finished." },
      { title: "Never raising the price", detail: "The tenth client at the first client's price is the most common reason this stops being worth doing." },
      { title: "No advance", detail: "Work started on goodwill produces the clients who are hardest to bill monthly later." },
    ]},

    { type: "leads", city: "indore", heading: "A list to start from" },

    { type: "cta", variant: "map", title: "250 prospects is one afternoon.",
      detail: "Filter a category by city, review count and rating, and the list for your first ten clients exists by this evening.",
      action: "Build the list", href: "/login" },
  ],
  faqs: [
    { q: "How many prospects do I need for my first 10 web design clients?", a: "Around 250 qualified prospects. At a realistic one-in-twenty close rate that is roughly 200 conversations, which takes about 400 contact attempts because only around half reach a decision-maker on the first try." },
    { q: "Should I build websites for free to get a portfolio?", a: "No. A free client does not send content, does not review, and does not launch, so you end up with unfinished projects rather than portfolio pieces — and you have set your price at zero with the people most likely to refer you. Sell a small paid project instead." },
    { q: "What should I charge my first web design client?", a: "₹8,000–15,000 for the first two, rising to ₹20,000–35,000 by clients six to eight once you have three examples in the same trade. Holding one price for a year is the most common reason this stops being worth doing." },
    { q: "How long does it take to get 10 web design clients?", a: "Roughly six weeks of prospecting if you are working ten businesses per afternoon, three afternoons a week — plus delivery time. The first two clients cost far more attempts than the last two." },
    { q: "What is the biggest mistake when starting out?", a: "Prospecting only when the pipeline is empty. The month spent delivering is the month with no new conversations, and that gap arrives two months later. Fix three afternoons a week regardless of workload." },
  ],
  links: [["/resources/how-to-start-a-web-design-agency-in-india", "what you actually need to start"], ["/resources/should-you-niche-down-what-the-data-says", "how big one category really is"], ["/resources/how-much-to-charge-for-a-website-india", "the pricing bands"], ["/resources/free-ways-to-find-businesses-without-websites", "building the first list free"]],
},

/* ───────────────────────────── 2 · starting in india */
{
  slug: "how-to-start-a-web-design-agency-in-india",
  title: "How to Start a Web Design Agency in India in 2026",
  excerpt: "The startup-cost calculators quote figures from another economy. Here is what it actually costs, what you can skip entirely, and the two things that genuinely gate you.",
  meta: "How to start a web design agency in India: what it actually costs, what you can skip on day one, and the two things that genuinely gate getting clients.",
  category: "Lead Generation", cluster: "playbooks", hero: "network", mins: 9,
  tags: ["Agency Playbook", "India", "Operations"],
  body: [
    { type: "prose", text: [
      "You can start a web design agency in India for less than the cost of one month's rent, and almost everything published about it will tell you otherwise. The startup-cost calculators that rank for this quote figures between roughly $6,700 and $41,000 — those are American numbers describing an American business with an office and four salaried designers.",
      "What actually gates you is not money. It is a portfolio of three and a list of people to call, and both of those are a few weeks of work rather than a few lakh of capital.",
    ]},

    { type: "h2", id: "cost", text: "What a web design agency actually costs to start in India" },
    { type: "table", head: ["Item", "Actual cost", "Needed on day one"], rows: [
      ["Laptop", "Already owned", "Yes"],
      ["Domain for your own site", "₹800–1,200/year", "Yes"],
      ["Hosting", "₹200–500/month", "Yes"],
      ["Design tool", "Figma free tier", "Yes"],
      ["Build platform", "WordPress or a builder", "Yes"],
      ["Company registration", "A few thousand", "No — later"],
      ["GST registration", "Depends on turnover", "No — later, with an accountant"],
      ["Office", "₹10,000+/month", "No"],
      ["Adobe Creative Cloud", "₹4,000+/month", "No"],
      ["Staff", "Salaries", "Definitely not"],
    ], note: "Registration and tax treatment depend on your turnover and structure — worth settling once with an accountant rather than guessing per client." },
    { type: "prose", text: [
      "That is a genuinely low bar, and it is the reason this market is competitive at the bottom and thin at the top. Anyone can start. Very few build a list and work it.",
    ]},

    { type: "h2", id: "skip", text: "What to skip on day one" },
    { type: "prose", text: [
      "**An office.** It signals nothing to a local business owner, who will meet you at their counter regardless, and it converts a zero-cost business into one with a monthly obligation before it has a client.",
      "**A company name and logo you agonise over.** Nobody buying a ₹25,000 website has ever chosen a supplier on their logo. Pick something, register the domain, move on.",
      "**A perfect portfolio site.** Three case studies with real photographs beats a beautifully designed site with nothing in it. The prospect is looking for evidence you have done this, not evidence you can design.",
      "**Everything about incorporation, until there is revenue.** Sort the structure and tax treatment once money is arriving and an accountant has something real to work with.",
    ]},

    { type: "h2", id: "gates", text: "The two things that actually gate you" },
    { type: "prose", text: [
      "**A portfolio of three.** Not ten, not one. Three real sites for real businesses, ideally in one trade, with photographs and a sentence from each owner. That is the minimum credential a local business needs to believe you can do this, and it is why the first three clients are priced differently from the rest.",
      "**A list of businesses to approach.** This is the one people skip, and it is why so many new agencies spend their first year posting on social media and waiting. Local businesses with no website are the rarest thing in sales — a need visible before you speak — and building that list is an afternoon rather than a strategy.",
      "Everything else in the standard checklist — the process document, the contract template, the pricing page — is real work that can wait until the third client makes it obvious what it should say.",
    ]},

    { type: "h2", id: "price-trap", text: "The ₹2,000 trap" },
    { type: "prose", text: [
      "The advice circulating in Indian developer communities is to start at around ₹2,000 for a static site and to do the first few free in exchange for hosting costs. It comes from a good place and it is the single most expensive mistake available to you.",
      "**Price sets your client, and your client sets your year.** A business that pays ₹2,000 for a website has no expectation of it mattering, will not send content, will not pay a monthly, and will not refer you to anyone who would pay more. You have not found a starting point, you have found a ceiling.",
      "The market bands are real and they are not ₹2,000: ₹5,000–15,000 for a basic static site, ₹10,000–40,000 for a standard business site, ₹25,000–80,000 for something custom. Start at the bottom of those, not below them.",
      "And there is a whole market above it that the price question ignores entirely. Roughly half the businesses in India's tier-2 cities have no website at all, and a hardware supplier with three hundred reviews is not shopping for a ₹2,000 site — nobody has ever offered them anything.",
    ]},

    { type: "h2", id: "first-90", text: "The first ninety days" },
    { type: "steps", items: [
      { title: "Weeks 1–2: pick a city and a category", icon: "map", detail: "Your own city, and one vertical with a real gap in it. Not \"small businesses\" — restaurants, or hardware, or coaching. The specificity is what makes everything after this easier." },
      { title: "Weeks 3–4: build the list and start walking", icon: "search", detail: "Filter that category by no website, review count and rating. Then visit ten a day. Expect the first week to be bad; it is teaching you the objections." },
      { title: "Weeks 5–8: first three clients, priced low, delivered fast", icon: "send", detail: "One-page presence builds where possible. Finish them. An unfinished project is worth nothing and a finished small one is worth the next three sales." },
      { title: "Weeks 9–12: raise the price and add the monthly", icon: "score", detail: "With three examples in one trade, quote the fourth client properly and attach a care plan. This is the transition from doing jobs to running a business." },
    ]},

    { type: "leads", city: "coimbatore", heading: "Where to start" },

    { type: "cta", variant: "map", title: "The list is the hard part.",
      detail: "Businesses with no website in your city, filtered by category and review count. Free credits to start.",
      action: "Build your first list", href: "/login" },
  ],
  faqs: [
    { q: "How much does it cost to start a web design agency in India?", a: "Under ₹5,000 to begin — a domain, hosting and free-tier tools, assuming you own a laptop. The startup-cost figures of $6,700–41,000 that rank for this question describe an American business with an office and salaried staff." },
    { q: "Do I need to register a company to start?", a: "Not on day one. Registration and tax treatment depend on your turnover and structure, and both are worth settling once with an accountant when revenue is actually arriving rather than guessing before it does." },
    { q: "What do I need before I can get clients?", a: "Two things: a portfolio of three real sites, ideally in one trade, with photographs and a sentence from each owner; and a list of businesses to approach. Everything else in the standard checklist can wait until the third client." },
    { q: "Should I start by charging ₹2,000 for websites?", a: "No. Price sets your client and your client sets your year — a business paying ₹2,000 has no expectation of the site mattering, will not send content and will not pay a monthly. The real market bands start at ₹5,000–15,000 for a basic static site." },
    { q: "What should I do in the first 90 days?", a: "Pick one city and one category, build a filtered list of businesses with no website, visit ten a day, deliver three small paid projects fast, then raise the price and attach a care plan from the fourth client onward." },
  ],
  links: [["/resources/your-first-10-web-design-clients", "the client-by-client sequence"], ["/resources/how-much-to-charge-for-a-website-india", "what the market actually pays"], ["/resources/should-you-niche-down-what-the-data-says", "picking the category"], ["/resources/call-whatsapp-or-walk-in-indian-smbs", "how to approach them"]],
},

/* ───────────────────────────── 3 · niche down */
{
  slug: "should-you-niche-down-what-the-data-says",
  title: "Should You Niche Down? What the Lead Data Says",
  excerpt: "Everyone says yes. The median category inside one Indian city contains sixteen businesses with no website, which makes a single-vertical niche a two-client territory.",
  meta: "Should a web design agency niche down? The median category in one city holds 16 businesses with no website — and what that means for what to niche on.",
  category: "Comparisons", cluster: "data", hero: "methodology", mins: 9,
  tags: ["Original Data", "Agency Playbook", "Market Research"],
  body: [
    { type: "prose", text: [
      "Niche down on the pitch, not on the territory — because a single vertical in a single city is far smaller than the advice assumes.",
      "The published case for specialising is sound and mostly unanimous: higher prices, less competition, faster referrals, shorter sales cycles. It comes with one honest caveat, that you should stay general when your geographic market is too small, and nobody ever puts a number on that caveat.",
      "Our lead data says what that number is, and it is smaller than the advice assumes.",
    ]},

    { type: "h2", id: "size", text: "How big one niche actually is" },
    { type: "prose", text: [
      "Across every Indian city and category in our index, **the median category inside a single city contains sixteen businesses with no website. The ninetieth percentile is forty-one.**",
      "That is the whole argument. At a one-in-twenty close rate, a sixteen-business niche is not a business — it is less than one client. Even a large category in a large city is modest:",
    ]},
    { type: "table", head: ["Category (no website)", "Jaipur", "Indore", "Surat", "All India"], rows: [
      ["Educational institutions", "89", "70", "107", "1,548"],
      ["Hardware stores", "41", "38", "46", "1,362"],
      ["Clothing stores", "43", "55", "52", "1,054"],
      ["Tailors", "36", "39", "32", "907"],
      ["Car repair", "42", "26", "39", "881"],
      ["Sports academies", "49", "40", "39", "769"],
      ["Restaurants", "33", "28", "26", "681"],
      ["Cafes", "30", "24", "27", "662"],
    ], note: "Businesses with no website in our index. City figures are what one specialised agency could actually work on foot." },
    { type: "prose", text: [
      "Thirty-three restaurants with no website in Jaipur. Work that list to exhaustion at a good close rate and you have two clients. **A vertical niche is not a territory.**",
    ]},

    { type: "h2", id: "resolve", text: "What to niche on instead" },
    { type: "prose", text: [
      "The specialisation advice is not wrong — it is aimed at the wrong axis. The benefit of niching is almost entirely about **what you can say**, and none of it requires that the vertical be your only source of work.",
      "A rep who has had thirty conversations with restaurant owners knows the Zomato objection, knows what a private-party booking is worth, and stops improvising. That advantage is real and it compounds. It just does not require that restaurants be the only businesses you sell to.",
      "So: **specialise the pitch, generalise the territory.** Run two or three adjacent verticals in your city rather than one, and become genuinely expert in each in sequence rather than trying to be a generalist across forty categories at once.",
    ]},
    { type: "features", items: [
      { title: "Niche the message", icon: "search", detail: "One category at a time, worked until the objections are memorised. This is where all the compounding is." },
      { title: "Broaden the territory", icon: "map", detail: "Two or three categories, or the same category across nearby cities. Sixteen prospects is not a quarter's work." },
      { title: "Sequence rather than commit", icon: "signal", detail: "Finish a category, then add the next. Adjacent trades reuse most of what you learned." },
    ]},

    { type: "h2", id: "adjacent", text: "Which categories stack well" },
    { type: "prose", text: [
      "Adjacency is what makes this work, because a category that shares a customer or a pitch costs almost nothing extra to learn.",
      "**Food group** — restaurants, cafes, bakeries, sweet shops. Same objection (the aggregators), same timing (avoid meal service), same pitch structure. Roughly a hundred prospects in a mid-sized city rather than thirty.",
      "**Trade group** — hardware, building supply, auto parts, wholesale. Same customer behind the customer, which is a contractor, and the same price-list pitch.",
      "**Education group** — coaching institutes, sports academies, music and dance schools. Same buyer, which is a parent, and the same admission-cycle timing.",
      "**Appearance group** — boutiques, tailors, salons. Same pitch, which is portfolio, and the same problem, which is that the work currently lives on a disappearing WhatsApp status.",
      "Three or four categories in a group gets you to a few hundred prospects in one city, which is a real year of work, while keeping the specialisation benefit almost entirely intact.",
    ]},

    { type: "h2", id: "pricing-effect", text: "Does specialising actually raise your prices?" },
    { type: "prose", text: [
      "This is the headline claim in every piece written on the subject, and it is worth separating what is demonstrable from what is asserted.",
      "What is demonstrably true is that specialising changes what you can charge **because it changes what you can prove**. Three finished sites for hardware suppliers is a credential a fourth hardware supplier can evaluate; three sites for unrelated businesses is not. The price rises because the evidence is better, not because the label is narrower.",
      "What does not follow is the version of this advice that treats the niche as the pricing lever by itself. Calling yourself a restaurant web design specialist with no restaurant work does nothing, and local buyers are unsentimental about it — they will ask which restaurants, and the answer has to be a name they can walk to.",
      "So the price effect is real and it is downstream of the first three projects, which is another reason to sequence categories rather than declare one.",
    ]},

    { type: "h2", id: "when-single", text: "When a single vertical does work" },
    { type: "prose", text: [
      "Two situations, both of which change the arithmetic rather than the argument.",
      "**When you sell remotely.** If the work does not need a walk-in, the niche is national rather than local, and 1,548 educational institutions or 1,362 hardware stores is an entirely viable specialisation. The cost is that you lose the strongest channel in this market.",
      "**When the ticket is large enough.** A vertical where a project is worth ₹1,50,000 needs far fewer clients, so forty prospects can support a business. That is rare at the local first-website end and common in specialised B2B work.",
      "If neither applies, the sixteen-business median is the number that should decide it.",
    ]},

    { type: "leads", city: "jaipur", heading: "One category, one city" },

    { type: "cta", variant: "map", title: "Count the niche before you commit to it.",
      detail: "See how many businesses in your category and city actually have no website, before it becomes your positioning.",
      action: "Check the size", href: "/login" },
  ],
  faqs: [
    { q: "Should a web design agency niche down?", a: "Niche the pitch, not the territory. The median category inside a single Indian city holds sixteen businesses with no website, and the ninetieth percentile is forty-one — which at a one-in-twenty close rate is less than one client." },
    { q: "How many prospects are in one niche in one city?", a: "Fewer than people assume. Thirty-three restaurants, forty-one hardware stores and thirty-six tailors with no website in Jaipur. Even educational institutions, the largest category, is under a hundred in most cities." },
    { q: "What is the actual benefit of specialising?", a: "What you can say. Thirty conversations with restaurant owners teaches you the aggregator objection, the price band and what a private booking is worth. That compounds — and it does not require that restaurants be your only clients." },
    { q: "Which categories work well together?", a: "Groups that share a customer or a pitch: food businesses share the aggregator objection; hardware, building supply and wholesale share the contractor customer; coaching and sports academies share the parent buyer and the admission cycle." },
    { q: "When does a single-vertical niche work?", a: "When you sell remotely, so the niche is national rather than local — 1,362 hardware stores nationally is viable where 41 in one city is not — or when the ticket is large enough that forty prospects can support a business." },
  ],
  links: [["/resources/which-local-verticals-actually-pay-for-a-website", "which verticals to pick from"], ["/resources/territory-planning-splitting-a-city-between-reps", "working the territory once chosen"], ["/resources/your-first-10-web-design-clients", "the sequence through the first ten"], ["/resources/which-indian-cities-have-the-biggest-website-gap", "choosing the city"]],
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
