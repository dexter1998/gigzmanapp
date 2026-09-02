/**
 * Batch 28 — proximity search, cold email, and the scraper comparison.
 *
 * The scraper post required an uncomfortable admission and makes it explicitly: scraped Maps data
 * is genuinely cheaper per record than the licensed API we use. Outscraper is $3 per 1,000 base
 * (about ₹0.26 a record) against our ₹3.08 per billed Places call. Claiming otherwise would be
 * false, so the post states the price gap plainly and argues the trade on terms and maintenance
 * instead — which is the honest case and the only one that survives a reader checking.
 *
 * Cold email numbers worth carrying: platform-reported open rates of 40-55% are inflated by Apple
 * Mail Privacy Protection, which fabricates around 64.66% of opens; the real average is nearer 21%.
 * Good deliverability is 95%+ with bounces under 2%, and deliverability operations rather than
 * copywriting decide outcomes. Those bounce thresholds are what make inferred addresses dangerous.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · near me */
{
  slug: "businesses-near-me-without-a-website",
  title: "Businesses Near Me Without a Website: How to Find Them",
  excerpt: "Proximity is the most underrated filter in this business, because the channel that converts best is the one that needs you standing there. How to search close in rather than wide.",
  meta: "How to find businesses near you without a website: why proximity beats gap rate, how to search by area rather than city, and what a walkable radius holds.",
  category: "Lead Generation", cluster: "operations", hero: "nearby", mins: 8,
  tags: ["Prospecting", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Searching near you rather than across a city is not a compromise — it is the correct approach, because **the channel that converts best in this market is walking in**, and that requires being there.",
      "So the useful question is not where the gap is highest but where you can find one on foot. A business three streets away with a 30% category gap is a better prospect than one across the city with a 60% gap, and considerably better than one in a higher-gap city four hours away. Proximity is a multiplier on everything else.",
    ]},

    { type: "h2", id: "why", text: "Why close beats high-gap" },
    { type: "prose", text: [
      "Three reasons, and they compound rather than add.",
      "**You can visit, which is worth about five of any other touch.** Standing in front of the owner reaches the decision-maker, lets you show evidence on a screen, and makes you a person from the same area rather than an unknown number.",
      "**You can go back.** Local sales are won on the second and third visit, and the second visit costs twenty minutes when the shop is nearby and half a day when it is not. Distance quietly converts a five-touch sequence into a two-touch one.",
      "**You are checkable.** A business deciding whether to hand over ₹25,000 in advance will ask around, and being locally known is a form of credential no portfolio replaces.",
      "The arithmetic is blunt: a 60% gap four hours away is not four hours better than a 30% gap nearby, and travel eats the difference on a ₹25,000 ticket before you have quoted anything.",
    ]},

    { type: "h2", id: "how", text: "How to search near you properly" },
    { type: "prose", text: [
      "The mistake is searching by city, which is both too broad and, because of the result cap, silently incomplete.",
      "**Search by neighbourhood or postcode.** A Maps search returns roughly 120 results whatever you ask, so a city query truncates without telling you. Neighbourhood queries cover more ground in total and produce something a city query never does: a list you can walk.",
      "**Work outward in rings.** Start with the area you are in, exhaust it, then take the next one. This keeps every round clustered and means your travel time stays near zero while the list lasts.",
      "**Combine area with category, not city with category.** \"Hardware stores in Mansarovar\" is a round. \"Hardware stores in Jaipur\" is a spreadsheet.",
    ]},
    { type: "table", head: ["Search shape", "Returns", "Good for"], rows: [
      ["Category + city", "Capped, scattered", "Estimating a market"],
      ["Category + neighbourhood", "Complete, clustered", "An actual afternoon"],
      ["Category + postcode", "Tight, walkable", "A street-by-street round"],
      ["All categories + neighbourhood", "Everything nearby", "Learning what an area holds"],
    ]},

    { type: "h2", id: "radius", text: "What a walkable radius actually holds" },
    { type: "prose", text: [
      "Smaller than people fear and larger than they expect once they look.",
      "Within a single dense neighbourhood in a mid-sized Indian city, our index typically holds a few hundred businesses with a verified website check, of which a meaningful share have nothing. The area-level gap rate varies widely — inside one city we measure neighbourhoods ranging from the mid twenties to above fifty percent — so the area you are standing in may be considerably better or worse than the city average.",
      "That variation is the argument for checking rather than assuming. A rate you read for your city tells you very little about the street outside your window, and the street outside your window is where the cheapest possible prospecting happens.",
    ]},

    { type: "h2", id: "know", text: "The advantage of already knowing the area" },
    { type: "prose", text: [
      "Underrated, and it is the reason your own neighbourhood outperforms a statistically better one.",
      "**You know which businesses are actually busy.** A listing shows a review count; you know that the hardware shop on the corner has a queue at 4pm and the one two streets down does not. That is information no dataset carries and it is a better qualifier than anything on the listing.",
      "**You know the trading patterns.** Which street is dead on a Monday, when the market closes, which area floods in the monsoon. Every one of those decides whether an afternoon produces eight conversations or three.",
      "**You have context in the conversation.** Mentioning the shop next door, or the road being dug up, or that you buy from them — these are not sales techniques, they are simply true, and they place you as a person from the area rather than somebody who found them in a list.",
      "None of this transfers to a city you have researched. It is why the first hundred prospects should be businesses you could describe from memory.",
    ]},

    { type: "h2", id: "routine", text: "Turning proximity into a routine" },
    { type: "steps", items: [
      { title: "Map your own area first", icon: "map", detail: "One category, one neighbourhood, everything with no website. This is the cheapest list you will ever build and the fastest to work." },
      { title: "Walk it in one afternoon", icon: "clock", detail: "Eight to ten businesses clustered on one street. Mid-afternoon for retail and trade, later for food." },
      { title: "Take the next ring", icon: "search", detail: "When an area is 80% contacted, move outward rather than jumping across the city. Adjacent areas keep travel near zero." },
      { title: "Keep the far ones for calls", icon: "phone", detail: "Anything you cannot reach on foot becomes a different list with a different channel — that is what calling is for." },
    ]},
    { type: "prose", text: [
      "That last split is worth making explicit. **The businesses you can walk to and the businesses you have to call are two lists, not one**, and treating them as one produces a plan where half the entries need a channel you were not using.",
    ]},

    { type: "leads", city: "jaipur", heading: "What one area holds" },

    { type: "cta", variant: "map", title: "Start with the street outside.",
      detail: "Search by area rather than city and get a list you can walk this afternoon.",
      action: "Search near you", href: "/login" },
  ],
  faqs: [
    { q: "How do I find businesses near me without a website?", a: "Search by neighbourhood or postcode rather than by city, combined with a category. A Maps search returns about 120 results whatever you ask, so a city query truncates silently — a neighbourhood query covers more ground and produces a list you can walk." },
    { q: "Is it better to target a nearby area or a higher-gap city?", a: "Nearby, almost always. Walking in is worth about five of any other touch, the second visit costs twenty minutes instead of half a day, and travel eats the difference on a ₹25,000 ticket before you have quoted." },
    { q: "How many prospects are in a walkable area?", a: "In a dense neighbourhood of a mid-sized Indian city, typically a few hundred checked businesses with a meaningful share having nothing. Area-level rates inside one city range from the mid twenties to above fifty percent, so checking beats assuming." },
    { q: "How should I expand beyond my own area?", a: "In rings. Exhaust the area you are in, then take the adjacent one, which keeps travel near zero. Jumping across the city converts a clustered afternoon into a day and a half." },
    { q: "What about businesses too far to visit?", a: "Keep them as a separate list worked by phone. The businesses you can walk to and the ones you have to call need different channels, and treating them as one list produces a plan where half the entries need a method you were not using." },
  ],
  links: [["/resources/google-maps-prospecting-for-web-designers", "the search method in detail"], ["/resources/territory-planning-splitting-a-city-between-reps", "planning areas properly"], ["/resources/call-whatsapp-or-walk-in-indian-smbs", "why the visit is worth five touches"], ["/resources/building-a-weekly-prospecting-routine", "fitting rounds into a week"]],
},

/* ───────────────────────────── 2 · cold email */
{
  slug: "cold-email-for-local-businesses-when-it-works",
  title: "Cold Email for Local Businesses: When It Actually Works",
  excerpt: "Almost never, and the reason is arithmetic rather than opinion. Bounce thresholds, inferred addresses, and the two situations where email is genuinely the right channel.",
  meta: "Cold email for local businesses: why inferred addresses breach bounce thresholds, what the real open rates are, and the two cases where email is right.",
  category: "Outreach", cluster: "operations", hero: "network", mins: 8,
  tags: ["Outreach", "Comparisons", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Cold email for local businesses actually works in two situations and almost nowhere else, and the reason is not that the messages are ignored. It is that **the addresses do not exist**, and the ones you can manufacture will damage the domain you send them from.",
      "Across the businesses in our index, 95.6% have a phone number and none has a listed email address, because the map listing they appear in does not carry the field. Any email address for these prospects is either published somewhere else or inferred, and those two are very different things.",
    ]},

    { type: "h2", id: "bounce", text: "The bounce arithmetic" },
    { type: "prose", text: [
      "This is the part that decides it, and it is worth understanding before running any campaign.",
      "The published deliverability thresholds are strict: **a healthy cold campaign keeps bounces under 2%, with the best under 1%**, and good deliverability means 95% or better. Those are not aspirational targets — mailbox providers use bounce rate as a primary spam signal, and exceeding it degrades the sending reputation of your domain.",
      "Now consider an inferred address for a local business — a guessed pattern at a domain that may not exist, for a business that may not have email at all. Bounce rates on that kind of list are not 2%. They are frequently a large fraction of the list.",
      "**The cost is not a failed campaign, it is the domain.** The same domain your existing clients receive invoices and project updates on. A ruined sending reputation takes months to rebuild and it breaks things you were relying on quietly, which is the worst kind of damage.",
    ]},

    { type: "h2", id: "opens", text: "Why the open-rate numbers mislead" },
    { type: "prose", text: [
      "Worth a paragraph, because the reported figures make cold email look better than it is.",
      "Platforms report open rates of 40–55%, and the honest analysis puts the real average nearer **21%** — roughly one in five. The inflation comes from Apple Mail Privacy Protection, which pre-fetches images and so fabricates a large share of recorded opens, and from ESP scanning doing the same.",
      "Which means an open rate is no longer evidence that anybody read anything. Reply rate is the only figure worth watching, and if you are running a small local campaign, the replies are countable by hand anyway.",
    ]},

    { type: "h2", id: "when", text: "The two cases where email is right" },
    { type: "prose", text: [
      "Both exist and both are narrow.",
      "**A published address, used for follow-up.** If a business prints an address on its shopfront, its menu, or the contact section of a Facebook page, that address is real and confirmed. Using it to follow up after a conversation is not cold email at all — it is correspondence with somebody who has met you, and it carries none of the bounce risk.",
      "**Selling overseas.** A UK or US prospect is reachable by email in a way an Indian shop is not, the walk-in channel is unavailable, and those markets have the domain-and-professional-network infrastructure that makes address discovery reliable. Here the tooling that fails locally becomes appropriate, and the deliverability rules apply normally.",
      "Outside those two, the honest answer is that the afternoon spent building an email campaign would reach more owners spent walking one market street.",
    ]},
    { type: "table", head: ["Situation", "Email?", "Better channel"], rows: [
      ["Local business, no website", "No — no address exists", "Walk in"],
      ["Local business, published address", "For follow-up only", "Visit, then email"],
      ["Local business, inferred address", "No — bounce risk", "Phone"],
      ["Overseas prospect", "Yes", "Email is the channel"],
      ["Existing client", "Yes", "Email or WhatsApp"],
    ]},

    { type: "h2", id: "what-actually-works", text: "What replaces it" },
    { type: "prose", text: [
      "The instinct behind wanting cold email is sound: it scales, it costs nothing per message, and it can be done from a desk. Two channels give you most of that in this market.",
      "**WhatsApp, at low volume.** Reply rates above 4% are reported by Indian teams doing this, which beats cold email in this market by a wide margin, and the message sits until the owner reads it properly in the evening. The constraint is real and worth respecting — bulk unsolicited messaging violates Meta's policies and gets numbers restricted — so it is personal, low-volume, and never from the number your clients use.",
      "**The phone, for anyone too far to visit.** A local business line is published on purpose and has to be answered, so pickup is far above the collapsed rates quoted for cold calling generally. The constraint is who answers rather than whether anyone does.",
      "Neither scales the way an email campaign promises to. That promise is what makes cold email attractive here and it is precisely the part that does not survive contact with a market where the addresses do not exist.",
    ]},

    { type: "h2", id: "if-you-must", text: "If you are going to do it anyway" },
    { type: "prose", text: [
      "Some people will, and there is a version that does not damage anything.",
      "**Use a separate domain.** Never your client-facing one. A cold-outreach domain that gets burned is an inconvenience; your main domain getting burned is a client-communication outage you will not notice until an invoice goes missing.",
      "**Only send to addresses you found published.** Not inferred, not pattern-guessed, not bought. If you cannot point at where the address was published, do not send to it.",
      "**Keep the volume small enough to count by hand.** A local campaign is thirty messages, not three thousand. At that size you can personalise properly, and personalisation is the only thing that produces replies in a market where nobody expects to be emailed.",
      "**Watch bounces, not opens.** If bounces go above a couple of percent, stop immediately and clean the list rather than pushing through.",
    ]},

    { type: "leads", city: "gurgaon", heading: "The channel that does work" },

    { type: "cta", variant: "map", title: "Phone numbers, not guessed addresses.",
      detail: "Over 95% of the businesses in our index have a phone number. None has a listed email.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "Does cold email work for local businesses?", a: "Rarely, and the reason is that the addresses do not exist. 95.6% of the businesses in our index have a phone number and none has a listed email, so any address is either published elsewhere or inferred — and inferred addresses bounce." },
    { q: "Why are inferred email addresses dangerous?", a: "Because bounce rate is a primary spam signal. Healthy campaigns keep bounces under 2%, and a list of guessed addresses for businesses that may not have email at all breaches that badly — damaging the sending reputation of the domain your clients receive invoices on." },
    { q: "What is a realistic cold email open rate?", a: "Around 21%, not the 40–55% platforms report. Apple Mail Privacy Protection pre-fetches images and fabricates a large share of recorded opens, so an open is no longer evidence anybody read anything. Watch replies instead." },
    { q: "When is email the right channel?", a: "Two cases. A published address used to follow up after a real conversation, which is correspondence rather than cold email. And selling overseas, where walking in is unavailable and address discovery is reliable." },
    { q: "How do I run cold email safely if I must?", a: "A separate domain from your client-facing one, only addresses you found published, volumes small enough to count by hand, and stop immediately if bounces pass a couple of percent rather than pushing through." },
  ],
  links: [["/resources/do-you-need-an-email-finder-for-local-businesses", "why the addresses are missing"], ["/resources/call-whatsapp-or-walk-in-indian-smbs", "the channels that do work"], ["/resources/how-indian-agencies-win-uk-and-australian-clients", "where email becomes the channel"], ["/resources/what-to-send-a-local-business-after-the-call", "the follow-up that works instead"]],
},

/* ───────────────────────────── 3 · scrapers compared */
{
  slug: "google-maps-scrapers-compared",
  title: "Google Maps Scrapers Compared: What Each One Costs",
  excerpt: "Scraped data is cheaper than the licensed API and we are not going to pretend otherwise. What each tool charges, where the costs stack, and what the price difference buys.",
  meta: "Google Maps scrapers compared: real per-record pricing for Outscraper and Apify, where enrichment costs stack, and how they compare to the licensed API.",
  category: "Comparisons", cluster: "tools", hero: "methodology", mins: 8,
  tags: ["Comparisons", "Tools", "Data"],
  body: [
    { type: "prose", text: [
      "Scraped Google Maps data is cheaper per record than the licensed Places API, and any comparison that claims otherwise is not worth reading. **Outscraper charges around $3 per 1,000 records for base Maps data — roughly ₹0.26 each — against about ₹3.08 for a billed Places call** on our side.",
      "We use the licensed path and sell a product built on it, so that is an uncomfortable number to open a comparison with. It is also the true one, and the rest of this only makes sense once it is on the table.",
    ]},

    { type: "h2", id: "pricing", text: "What each one charges" },
    { type: "table", head: ["Tool", "Base Maps data", "Notes"], rows: [
      ["Outscraper", "~$3 per 1,000 records", "Built specifically around Google data"],
      ["Apify (Maps actor)", "~$1.50–4 per 1,000 places", "General scraping platform; Maps is one actor among many"],
      ["Licensed Places API", "~$0.035 per call", "Per request, not per result — several businesses per call"],
    ], note: "Published pricing. Both scrapers bill per record and run in the cloud." },
    { type: "prose", text: [
      "The headline numbers understate the scrapers' real cost, though, and in a predictable way. **Costs stack across separate tasks** — scrape, then find email, then verify, then enrich — and a full lead profile on Outscraper is quoted at around $14 per 1,000 rather than $3. Apify's base is lower and its enrichment costs can match or exceed Outscraper's depending on which actor you run.",
      "The comparison to make is therefore not base-to-base. It is **what a usable record costs after everything you actually need is attached**, and both platforms are considerably more expensive by that measure than the first line of their pricing page suggests.",
    ]},

    { type: "h2", id: "difference", text: "What the price difference buys" },
    { type: "prose", text: [
      "Three things, and only one of them is technical.",
      "**Terms.** Scraping Maps is against Google's terms of service. That is a business risk rather than an engineering problem, it does not go away with better code, and it is a choice worth making knowingly rather than discovering later. The licensed API is the permitted route to the same data and costs more for exactly that reason.",
      "**Maintenance rather than collection.** A scrape is a photograph. The expensive part of running an index is not gathering it, it is re-checking — and the website field is the one that changes when a business does the thing you were going to sell them. A cheaper record that is wrong in that specific way costs more than it saved.",
      "**Stability.** Scrapers break when Google changes the Maps interface, which happens regularly. If your prospecting depends on one, it depends on somebody else's maintenance schedule.",
      "None of that makes scraping wrong. It makes it a different product with a different risk profile, and the price gap is roughly what those three things are worth.",
    ]},

    { type: "h2", id: "which", text: "Which to use for what" },
    { type: "table", head: ["If you want", "Use", "Why"], rows: [
      ["A one-off list, cheaply", "Outscraper or Apify", "Cheapest per record by a wide margin"],
      ["Maps data specifically", "Outscraper", "Built around Google data rather than general scraping"],
      ["Many data sources", "Apify", "Maps is one actor among thousands"],
      ["A maintained, re-checked index", "Licensed data", "Freshness is the product, not the collection"],
      ["To not think about terms of service", "Licensed data", "That is most of what the premium is"],
      ["Fifty leads this week", "Neither", "Google Maps by hand costs nothing"],
    ]},
    { type: "prose", text: [
      "That last row is genuine. Below about fifty leads a week, manual Maps prospecting at roughly three minutes a lead beats paying anybody, and it gives you the whole listing while you work rather than a row in a file.",
    ]},

    { type: "h2", id: "compared", text: "How these should be compared" },
    { type: "prose", text: [
      "Per-record price is the wrong unit on which to have these compared, and it flatters whichever one you already prefer.",
      "**Cost per usable record** is closer. A scraped row with no phone number, an unmapped category or a business that closed is not a record you can work, and the share of those is not in anybody's pricing page.",
      "**Cost per conversation** is the one that matters. Take everything you spent on data in a month and divide it by the number of decision-makers you actually spoke to. That number folds in dedup waste, dead listings, wrong categories and the stale website fields — and it is usually several times the per-record price, whichever route you took.",
      "Run that calculation once and the comparison stops being about ₹0.26 against ₹3.08, because both are rounding errors against the value of an afternoon. **What separates the options at that point is how many of your afternoons get wasted**, which is exactly what the cheaper column does not tell you.",
    ]},

    { type: "h2", id: "hidden", text: "The costs nobody quotes" },
    { type: "prose", text: [
      "Whichever route you take, three costs sit outside the per-record price and they are usually larger than it.",
      "**Deduplication.** Getting past the roughly 120-result cap means searching by area, which means the same business appears in overlapping searches. Deduplicating on the place identifier rather than the name is not optional — names collide constantly.",
      "**Category mapping.** The labels on a listing and the taxonomy your pipeline expects are not the same vocabulary, and anything unmapped is silently dropped. If a run discovers 900 businesses and stores 500, the problem is mapping rather than scraping, and no amount of per-record savings fixes it.",
      "**Re-checking.** Published B2B data decay runs 22–30% a year. For this use case it concentrates in the one field the pitch depends on, which makes an unmaintained cheap list expensive in a way that shows up mid-conversation rather than on an invoice.",
    ]},

    { type: "leads", city: "kota", heading: "Checked, and re-checked" },

    { type: "cta", variant: "map", title: "Cheaper is not the only axis.",
      detail: "Licensed, maintained and re-checked — the website field corrected when a business builds a site.",
      action: "See the difference", href: "/login" },
  ],
  faqs: [
    { q: "How much do Google Maps scrapers cost?", a: "Outscraper is around $3 per 1,000 records for base Maps data and Apify's Maps actor around $1.50–4 per 1,000 places. Both stack costs across separate tasks though — a full lead profile on Outscraper is quoted nearer $14 per 1,000." },
    { q: "Is scraping cheaper than the official Places API?", a: "Yes, substantially. Around ₹0.26 a record against roughly ₹3.08 for a billed Places call. Any comparison claiming otherwise is not being straight with you — the price difference buys terms compliance, maintenance and stability rather than cheaper data." },
    { q: "Should I use Outscraper or Apify?", a: "Outscraper is built specifically around Google data and is more cost-effective for Maps work. Apify is a general scraping platform where Maps is one actor among thousands, which is better if you need several data sources." },
    { q: "Is scraping Google Maps allowed?", a: "It is against Google's terms of service, which is a business risk rather than an engineering problem — it does not go away with better code. The licensed Places API is the permitted route to the same data and costs more for that reason." },
    { q: "What costs are not in the per-record price?", a: "Deduplication on the place identifier, category mapping — where unmapped labels get silently dropped, so a run can discover 900 and store 500 — and re-checking, since data decay of 22–30% a year concentrates in the website field this whole pitch depends on." },
  ],
  links: [["/resources/scraping-google-maps-for-leads-what-breaks", "what breaks once you build it"], ["/resources/bought-database-vs-live-search", "why maintenance is the real cost"], ["/resources/free-ways-to-find-businesses-without-websites", "the free route below fifty a week"], ["/resources/best-lead-generation-tools-for-web-design-agencies", "the wider tool comparison"]],
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
