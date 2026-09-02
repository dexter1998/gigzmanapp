/**
 * Batch 13 — the international cluster.
 *
 * The finding driving all three: the UK's headline 17% hides categories running at 38–54%. Car
 * washes are 53.6% without a website in Britain, barbers 42.5%, car repair 40.3%. The gap is a
 * property of the business model — proximity-served, walk-in customers — rather than of the
 * country, and the country only shifts the level. That reframes "developed markets are saturated"
 * from a fact into a category error, and it is the argument all three posts rest on.
 *
 * Market sizing deliberately does NOT invent a national TAM. It sizes what we have actually
 * measured and says plainly that it is a floor for those cities rather than a figure for India.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · country comparison */
{
  slug: "india-vs-uk-vs-australia-website-adoption",
  title: "India vs UK vs Australia: Small Business Website Adoption",
  excerpt: "India runs four times Australia's rate. But Britain's headline 17% hides car washes at 53.6%, and that is the finding that matters more than any national average.",
  meta: "India vs UK vs Australia small business website adoption, measured from live listings — the national rates, and the categories where every market has a gap.",
  category: "Website Gaps", cluster: "data", hero: "methodology", mins: 9,
  tags: ["Original Data", "Market Research", "Website Gaps"],
  body: [
    { type: "prose", text: [
      "Across the {{checked}} businesses we have checked, small business website adoption differs enormously by country — **India sits at {{inPct}} without a website, the United Kingdom at {{gbPct}}, and Australia at {{auPct}}.** Roughly a four-fold spread between the ends.",
      "The national averages are also the least useful numbers in this post, because they hide the thing an agency in any of these countries actually needs to know.",
    ]},

    { type: "h2", id: "national", text: "Website adoption in India, the UK and Australia" },
    { type: "countrytable", note: "Read from the index at build time. Countries with under 500 checked businesses are not shown." },
    { type: "prose", text: [
      "The ordering is not surprising and the size of the difference is. What the table cannot show is that these averages are made of very different things.",
    ]},

    { type: "h2", id: "categories", text: "Where Britain's gap actually lives" },
    { type: "prose", text: [
      "A UK agency reading a 17% national figure would reasonably conclude the market is served and go and sell redesigns. That conclusion is wrong, and the reason is that the gap concentrates hard by category:",
    ]},
    { type: "table", head: ["Category", "UK", "India", "UK sample"], rows: [
      ["Car wash", "53.6%", "59.5%", "412"],
      ["Barber shop", "42.5%", "77.6%", "1,105"],
      ["Car repair", "40.3%", "54.4%", "755"],
      ["Laundry", "38.6%", "41.9%", "396"],
      ["Hardware store", "34.5%", "79.8%", "354"],
      ["Nail salon", "31.0%", "42.7%", "697"],
      ["Beauty salon", "29.3%", "40.8%", "771"],
      ["Cafe", "28.9%", "48.6%", "539"],
      ["Coffee shop", "24.0%", "45.4%", "505"],
    ], note: "Categories with at least 300 checked businesses in both countries." },
    { type: "prose", text: [
      "**More than half of British car washes have no website.** So do four in ten barbers and four in ten car repair shops — in a country whose overall rate is {{gbPct}}. Those are not marginal categories either; the barber sample alone is over a thousand businesses.",
      "Laundries are the clearest case in the whole dataset: 38.6% in the UK against 41.9% in India. Essentially the same rate in two economies twenty years apart in digital maturity.",
    ]},

    { type: "h2", id: "why", text: "Why the same categories, everywhere" },
    { type: "prose", text: [
      "The pattern is consistent enough to state as a rule: **the gap is a property of the business model, not of the country.**",
      "Every high-gap category in every market we measure has the same shape. The customer is local, arrives in person, and chooses on proximity rather than research. A car wash in Liverpool and a car wash in Kota have the same relationship with the internet, because nobody in either city searches before deciding where to wash a car.",
      "What the country changes is the level, not the ranking. India's barbers run at 77.6% and Britain's at 42.5% — a huge difference in absolute terms, and both are far above their national averages. The country moves everything up or down; the business model decides the order.",
      "Which means \"developed markets are saturated\" is a category error rather than a fact. Britain's saturated categories are saturated. Its walk-in trades are not.",
    ]},

    { type: "h2", id: "within", text: "The spread inside each country" },
    { type: "prose", text: [
      "The second thing the national number hides is geography, and the same tier pattern shows up in Britain as in India.",
      "Liverpool runs at 22.7% and Birmingham at 21.8%, against London at 11.9% — roughly double, inside one country. In Australia the range is narrower and lower: the Gold Coast at 16.7% and Adelaide at 16.1% against a national {{auPct}}.",
      "Australia is the genuinely difficult market of the three. There is no Australian city in our index above 17%, and no category with the kind of gap Britain's car washes show. An Australian agency selling first websites is working a much thinner market than a British one, and considerably thinner than an Indian one.",
    ]},

    { type: "h2", id: "choosing", text: "What this means if you are choosing a market" },
    { type: "prose", text: [
      "Three practical readings, depending on where you are sitting.",
      "**If you are in India**, the national rate is not the interesting part — it is that the gap is wide enough in enough categories that market selection is barely a constraint. The binding constraint is how many conversations you can have, not how many prospects exist.",
      "**If you are in Britain**, ignore the national figure entirely and pick a trade. A specialist in car washes, barbers or independent garages is working a market with a genuine first-website gap, in a country everyone else has written off as served. That is an unusually good position: real demand, and competitors who believe the demand is gone.",
      "**If you are in Australia**, accept that you are mostly in the redesign business and price accordingly. Selling a rebuild against an existing site is a different conversation — there is an incumbent, a known previous cost, and a comparison — and it is worth being good at that rather than hunting for a gap that is not there.",
      "The general rule across all three: **the country sets how hard the market is, and the category decides whether you have a business in it.** Picking the category is the higher-leverage decision almost everywhere.",
    ]},

    { type: "h2", id: "caveats", text: "What these numbers are not" },
    { type: "prose", text: [
      "Our index, not a census. Coverage is uneven — {{inChecked}} Indian businesses against {{auChecked}} Australian ones — and a country lower down the table rests on a thinner, more city-specific sample.",
      "Every rate is also conservative in the same direction: a business counts as having a website whenever there is anything in its listing's website field, including a Facebook page, a directory profile or a domain that no longer loads. **The true first-website opportunity is larger than every figure here**, and probably by more in the markets where social-only presence is common.",
    ]},

    { type: "leads", city: "birmingham", country: "gb", heading: "The UK gap on the ground" },

    { type: "cta", variant: "map", title: "Check your own market by category.",
      detail: "National averages hide the categories worth working. Search a category in your city and see the real rate.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "What percentage of small businesses have no website in the UK?", a: "About {{gbPct}} across the {{gbChecked}} British businesses in our index. That national figure is misleading on its own — car washes run at 53.6%, barbers at 42.5% and car repair shops at 40.3%." },
    { q: "How does India compare to the UK and Australia?", a: "India sits at {{inPct}} without a website, the UK at {{gbPct}} and Australia at {{auPct}} — roughly a fourfold spread. The ordering of categories within each country is remarkably similar; only the level changes." },
    { q: "Is Australia a good market for selling first websites?", a: "It is the thinnest of the three. No Australian city in our index runs above 17%, and no category shows the kind of gap Britain's car washes do. Australian agencies are mostly selling redesigns rather than first websites." },
    { q: "Which categories have the biggest website gap in developed markets?", a: "The walk-in trades: car washes, barbers, car repair, laundries and nail salons. Their customers choose on proximity rather than research, so nothing ever forced the question — and that holds in Britain as much as in India." },
    { q: "Why do laundries have a similar gap in the UK and India?", a: "38.6% against 41.9%, in two economies at very different stages of digital maturity. It is the clearest evidence that the gap follows the business model rather than the country — nobody searches online before choosing a laundry anywhere." },
  ],
  links: [["/resources/how-many-local-businesses-have-no-website", "the global measurement"], ["/resources/which-business-types-least-likely-to-have-a-website", "the category breakdown"], ["/resources/how-indian-agencies-win-uk-and-australian-clients", "selling into these markets from India"], ["/resources/which-indian-cities-have-the-biggest-website-gap", "the same spread inside India"]],
},

/* ───────────────────────────── 2 · winning overseas clients */
{
  slug: "how-indian-agencies-win-uk-and-australian-clients",
  title: "How Indian Agencies Win UK and Australian Clients",
  excerpt: "The gap is thinner and the tickets are several times larger. What actually changes — the channel, the objection, the pricing, and the one thing that disqualifies most people.",
  meta: "How Indian agencies win UK and Australian clients: which categories still have a gap, what changes in the pitch, and how to price against local firms.",
  category: "Outreach", cluster: "playbooks", hero: "network", mins: 9,
  tags: ["Agency Playbook", "Outreach", "Market Research"],
  body: [
    { type: "prose", text: [
      "Indian agencies win UK and Australian clients on specificity, not on price — and the trade is straightforward: **the gap in those markets is roughly half to a quarter of India's, and the tickets are several times larger.**",
      "What changes is almost everything about how you reach them. The strongest channel in the Indian market — walking in — is unavailable, and that removes the thing that was doing most of the work.",
    ]},

    { type: "h2", id: "where", text: "Where Indian agencies still find a UK gap" },
    { type: "prose", text: [
      "The mistake is to treat these as saturated markets. Britain's national rate is {{gbPct}}, and the categories underneath it look nothing like that number: **car washes at 53.6%, barbers at 42.5%, car repair at 40.3%, laundries at 38.6%.**",
      "Geographically it concentrates the same way it does in India. Liverpool at 22.7% and Birmingham at 21.8% against London at 11.9% — the second cities, not the capital.",
      "Australia is harder. Nothing in our Australian index runs above 17%, and the best cities are the Gold Coast and Adelaide. It is a redesign market far more than a first-website one.",
    ]},

    { type: "h2", id: "channel", text: "The channel problem" },
    { type: "prose", text: [
      "This is the part that decides whether this works for you, and it is worth being blunt about.",
      "In India the strongest thing you can do is walk in. It reaches the owner, it lets you show evidence on a screen, and it makes you a person from the same city rather than an unknown number. Selling to Liverpool from Lucknow, you have none of that, and you are competing against local agencies who do.",
      "So the channel set shrinks to email, phone at awkward hours, and inbound. Which inverts the usual advice: **for overseas work, the email finder that is useless for Indian local business becomes relevant again**, because a UK car wash with a Facebook page and a trading name is often findable in ways an Indian one is not.",
      "It also means the qualification bar has to be much higher. A local walk-in costs you twenty minutes; a transatlantic sales cycle costs weeks, so the prospect has to be worth weeks.",
    ]},
    { type: "table", head: ["", "Selling locally", "Selling to UK/AU"], rows: [
      ["Best channel", "Walk in", "Email and inbound"],
      ["Gap", "{{inPct}}", "{{gbPct}} / {{auPct}}"],
      ["Typical ticket", "₹10,000–45,000", "£800–3,000+"],
      ["Sales cycle", "Days", "Weeks"],
      ["Main objection", "Do I need one", "Who are you"],
      ["Competition", "Few, locally", "Every local agency"],
    ]},

    { type: "h2", id: "objection", text: "The objection is different" },
    { type: "prose", text: [
      "Locally you are answering \"do I need a website\". Overseas you are answering \"why would I use somebody in another country\", and the honest answer is not price.",
      "**Leading on price is the losing move**, even though it is the obvious one and the thing that got you the enquiry. It positions you as the cheap option, invites comparison against every other offshore quote, and sets up an ongoing relationship where the only lever anyone reaches for is discount.",
      "What works better is specificity — the same thing that works locally. Three finished sites for British car washes is a far stronger opening to a fourth British car wash than any rate could be. The vertical does the work that being local would have done.",
      "The practical implication is that the niche question changes completely here. Locally, a single vertical in one city is sixteen businesses. Nationally in Britain, one vertical is thousands, which makes single-vertical specialisation viable in a way it never is at home.",
    ]},

    { type: "h2", id: "pricing", text: "Pricing without racing to the bottom" },
    { type: "prose", text: [
      "You will be cheaper than a local agency regardless. The question is how much cheaper you choose to be, and the answer should be less than you think.",
      "Price in the client's currency and at a number that reads as a real business rather than as an arbitrage. A quote that is a tenth of the local rate does not read as good value — it reads as risk, and it attracts the clients who will be hardest to work with.",
      "The care plan matters even more here than locally. It converts a one-off overseas project, where trust is the whole problem, into an ongoing relationship where each month makes the next one easier — and it is the only realistic path to referrals in a market you cannot walk into.",
    ]},

    { type: "h2", id: "disqualifies", text: "What disqualifies most people" },
    { type: "prose", text: [
      "Two things, and both are worth checking before spending a quarter on this.",
      "**No portfolio in that market.** A British business looking at three Indian projects cannot evaluate them — different design conventions, different expectations, sometimes a different language on the page. One British or Australian site is worth more than ten local ones for this purpose, which is a genuine chicken-and-egg problem and the main reason to start with a small, cheap, well-executed first project there.",
      "**Availability at their hours.** A UK client expecting a reply during a British working day and receiving one at midnight IST is fine; one who gets a reply the following afternoon, twice, will find somebody else. This is an operational commitment, not a preference, and it is the most common reason these relationships quietly end.",
      "If you cannot commit to either, the honest answer is that the Indian market's {{inPct}} gap is a better use of the same quarter.",
    ]},

    { type: "leads", city: "liverpool", country: "gb", heading: "UK businesses with no website" },

    { type: "cta", variant: "map", title: "Check the overseas market properly.",
      detail: "Category-level rates for UK, Australian and other cities — the national averages hide where the work is.",
      action: "Search a UK city", href: "/login" },
  ],
  faqs: [
    { q: "Can Indian agencies sell websites to UK clients?", a: "Yes, and the tickets are several times larger — but the gap is much smaller at {{gbPct}} nationally, and you lose the walk-in channel that does most of the work locally. The qualification bar has to be far higher because the sales cycle is weeks rather than days." },
    { q: "Which UK businesses still have no website?", a: "The walk-in trades. Car washes run at 53.6%, barbers at 42.5%, car repair at 40.3% and laundries at 38.6% — well above the {{gbPct}} national rate. Geographically it concentrates in Liverpool and Birmingham rather than London." },
    { q: "Should I compete on price against UK agencies?", a: "No. You will be cheaper regardless, and leading on price positions you as the cheap option, invites comparison with every other offshore quote, and sets up a relationship where discount is the only lever. Lead on vertical specificity instead." },
    { q: "Is Australia worth targeting from India?", a: "Less so. No Australian city in our index runs above 17% without a website, and no category shows the gap Britain's car washes do. It is a redesign market, which is a harder first sale from overseas." },
    { q: "What stops most Indian agencies from winning overseas clients?", a: "No portfolio in that market — a British business cannot evaluate three Indian projects — and not being reliably available during the client's working hours. The second is an operational commitment, and failing it is the most common way these relationships end." },
  ],
  links: [["/resources/india-vs-uk-vs-australia-website-adoption", "the country-by-country data"], ["/resources/should-you-niche-down-what-the-data-says", "why niching works differently overseas"], ["/resources/do-you-need-an-email-finder-for-local-businesses", "when email finders become relevant"], ["/resources/website-maintenance-plans-what-to-charge", "the care plan that carries the relationship"]],
},

/* ───────────────────────────── 3 · market size */
{
  slug: "the-real-size-of-the-indian-web-design-market",
  title: "The Real Size of the Indian Web Design Market in 2026",
  excerpt: "Not a projected national figure — the businesses we have actually looked at, multiplied by what a website actually sells for. It is a floor, and the floor is large.",
  meta: "The real size of the Indian web design market: what the businesses we have measured are worth at market rates, and why projected figures are unusable.",
  category: "Website Gaps", cluster: "data", hero: "pricing", mins: 9,
  tags: ["Original Data", "India", "Market Research"],
  body: [
    { type: "prose", text: [
      "Every market-size figure published for this industry is a projection built on other projections, and none of them can tell you whether the business two streets away needs a website. So this one is built differently: **it counts businesses we have actually checked, and prices them at what the market actually pays.**",
      "That makes it a floor rather than a total — a lower bound on a segment we can see — and the floor is already large enough to make the point.",
    ]},

    { type: "h2", id: "count", text: "What we have counted" },
    { type: "prose", text: [
      "Across the Indian cities in our index we have verified the website status of {{inChecked}} businesses. **{{inNoSite}} of them have no website at all** — {{inPct}}.",
      "Every one of those is a business with an active Google listing, a phone number in most cases, and a real customer base. Not a projection, not a survey response, not an estimate of how many businesses exist in India. Businesses we looked at, one at a time.",
    ]},
    { type: "citytable", country: "in", min: 400, limit: 10, order: "size",
      note: "The largest indexed Indian cities by businesses checked. Read live at build time." },

    { type: "h2", id: "value", text: "What that is worth at market rates" },
    { type: "prose", text: [
      "Priced at the bands the Indian market actually pays — ₹10,000–40,000 for a standard small business site, with ₹25,000 as a reasonable middle — the arithmetic is straightforward:",
    ]},
    { type: "table", head: ["", "At ₹10,000", "At ₹25,000", "At ₹40,000"], rows: [
      ["One-off build value", "~₹40 crore", "~₹100 crore", "~₹162 crore"],
      ["Plus care plans at ₹2,000/month", "+₹97 crore/year", "+₹97 crore/year", "+₹97 crore/year"],
    ], note: "Applied to the businesses with no website in our indexed Indian cities alone. Not a national figure — see the caveats below." },
    { type: "prose", text: [
      "Roughly a hundred crore of first-website work, in twenty-five cities, among businesses we have individually verified. The recurring line is the one worth noticing: **the care plans on that same set of businesses are worth more per year than the builds are once, forever**, which is the entire argument for selling them.",
    ]},

    { type: "h2", id: "not", text: "What this figure is not" },
    { type: "prose", text: [
      "Being precise about this matters more than the number, because every inflated market-size claim in this industry got that way by skipping this section.",
      "**It is not a national total.** India has vastly more businesses than we have indexed, in cities we have never scanned. This counts twenty-five cities.",
      "**It is not addressable revenue for any one agency.** Nobody sells to forty thousand businesses. It is a statement about the size of the pool, not about anybody's pipeline.",
      "**A large share of those businesses will never buy.** Convenience stores averaging eleven reviews, alterations counters doing ₹300 hems — real businesses, real listings, and no realistic path to a website sale. The payable subset is meaningfully smaller than the counted one.",
      "**And it is conservative in the other direction.** Businesses whose listing points at a Facebook page or a dead domain are counted as having a website, and they are frequently better prospects than the ones with nothing.",
      "Those pull in opposite directions and we are not going to pretend to know the net. The honest claim is narrow: this many businesses, verified, at these prices.",
    ]},

    { type: "h2", id: "compare", text: "Why the published figures are unusable" },
    { type: "prose", text: [
      "The market-size numbers circulating for web design and digital services in India are top-down: a total business count from a government or industry source, an assumed digital adoption rate, an assumed spend, compounded forward at an assumed growth rate.",
      "Each assumption is defensible and the product of four of them is not. More to the point, none of it is actionable — a number in crores tells an agency nothing about which businesses in their own city to visit on Thursday.",
      "The bottom-up version answers a smaller question honestly: **in Kota, how many businesses have no website today?** That is a number you can act on, and it is the only kind we publish.",
    ]},

    { type: "h2", id: "shrinking", text: "Is the market shrinking?" },
    { type: "prose", text: [
      "Fair question, since every business that builds a site leaves this pool.",
      "The honest answer is that we cannot yet measure the rate of change reliably — our index has grown faster than any underlying trend, so period-on-period comparisons are measuring our own scanning rather than the market. Anybody claiming a precise annual decline is guessing.",
      "What we can say is that the pool is large enough that its rate of change is not the constraint on any individual agency. Forty thousand businesses in twenty-five cities, and the working limit for one agency is a few hundred conversations a year. The market shrinking by some percentage is not what will stop you.",
    ]},

    { type: "leads", city: "kota", heading: "The pool, on the ground" },

    { type: "cta", variant: "map", title: "The only number that matters is your city's.",
      detail: "How many businesses in your category and city have no website today, counted rather than projected.",
      action: "Count your market", href: "/login" },
  ],
  faqs: [
    { q: "How big is the Indian web design market?", a: "Counted bottom-up: {{inNoSite}} businesses with no website across the Indian cities in our index, worth roughly ₹100 crore in one-off builds at ₹25,000 each, plus around ₹97 crore a year if each took a ₹2,000 monthly care plan." },
    { q: "Is that a national figure?", a: "No, and it is important that it is not. It covers about twenty-five indexed cities, and India has far more businesses in cities we have never scanned. It is a floor for a segment we can see rather than a total for the country." },
    { q: "Why not use published market-size projections?", a: "Because they are top-down — a business count, an assumed adoption rate, an assumed spend, compounded forward — and the product of four defensible assumptions is not defensible. They also cannot tell an agency which businesses to visit on Thursday." },
    { q: "Will every one of those businesses buy a website?", a: "No, and a large share never will. Convenience stores averaging eleven reviews and alterations counters doing ₹300 work are real businesses with no realistic path to a website sale. The payable subset is meaningfully smaller than the counted one." },
    { q: "Is the market for first websites shrinking?", a: "Probably, but we cannot measure the rate honestly — our index has grown faster than any underlying trend, so period comparisons measure our own scanning. The pool is large enough that its rate of change is not what limits any single agency." },
  ],
  links: [["/resources/how-many-local-businesses-have-no-website", "how the counting works"], ["/resources/which-indian-cities-have-the-biggest-website-gap", "the city-level numbers"], ["/resources/how-much-to-charge-for-a-website-india", "the prices used here"], ["/resources/website-maintenance-plans-what-to-charge", "the recurring line"]],
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
