/**
 * Batch 18 — why the standard lead-data stack fails for this market, from three angles.
 *
 * SERP checks first, and this one is unusually well-supplied with real figures:
 *  · B2B contact data decays at 22–30% a year, about 2.1% a month, and most providers deliver
 *    around 50% accuracy. A static list rots from the moment it is downloaded. All of that is
 *    published and none of it is applied to the one field this market depends on.
 *  · Coverage: ZoomInfo's data is concentrated in North America and international access is a
 *    separate $5–15K/yr add-on; Apollo's European coverage is inconsistent; Cognism and SMARTe
 *    exist because of those gaps. The geography argument is well covered — the segment argument
 *    is not.
 *  · Technographics: BuiltWith tracks 111,000+ technologies, Wappalyzer around 8,000 across 106
 *    categories, and both detect by scanning source code, headers and DNS. That mechanism is the
 *    whole post: a business with no website presents nothing to scan.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · bought vs live */
{
  slug: "bought-database-vs-live-search",
  title: "Bought Database vs Live Search: Which Leads Are Real",
  excerpt: "B2B data decays at up to 30% a year. For a list of businesses without websites, it decays in the one direction that makes you look like you did not check.",
  meta: "Bought lead database vs live search: published decay rates, why a no-website list rots in the worst direction, and when a static export is still fine.",
  category: "Comparisons", cluster: "tools", hero: "methodology", mins: 8,
  tags: ["Comparisons", "Data", "Tools"],
  body: [
    { type: "prose", text: [
      "A bought list is a photograph and a live search is a window, and the difference matters more for this market than for almost any other — because the field your entire pitch rests on is the one most likely to have changed.",
      "The published numbers are not gentle, and they apply to every source of leads in this category. **B2B contact data decays at 22–30% a year**, roughly 2.1% a month, and in some industries considerably faster. Independent testing puts typical provider accuracy at around 50%. A list bought in January is materially worse by summer, and it was already half wrong on the day it arrived.",
    ]},

    { type: "h2", id: "worst-direction", text: "It rots in the worst possible direction" },
    { type: "prose", text: [
      "For most lead data, decay means a wasted call — the person left, the number changed, the company moved. Annoying and survivable.",
      "For a list of **businesses without websites**, decay means something worse. The businesses that drop off your list are the ones that *got a website*, which is to say the ones who solved the problem you were about to describe to them. You do not lose a contact, you lose your entire premise, and you find out mid-sentence.",
      "\"I noticed you don't have a website\" — said to somebody who launched one in March — ends a conversation in a way no other data error does. It establishes, in eight words, that you did not look before you called.",
      "That asymmetry is the whole argument. This is the rare market where the decay is concentrated in exactly the field the pitch depends on.",
    ]},
    { type: "table", head: ["What changed", "Cost on a normal list", "Cost on a no-website list"], rows: [
      ["Phone number changed", "A wasted call", "A wasted call"],
      ["Business closed", "A wasted call", "A wasted call"],
      ["Contact left", "A wasted call", "Irrelevant — you want the owner"],
      ["Business built a website", "Nothing", "The pitch is dead, in public"],
    ]},

    { type: "h2", id: "live", text: "What live search actually means" },
    { type: "prose", text: [
      "Not a marketing word, and worth being precise about, because everything calls itself real-time.",
      "**A static export** is a file. It was true when generated and nothing updates it, including the export you pulled from a live tool last month.",
      "**A maintained index** is a database that is re-checked on a cycle. When a later check shows a business now has a site, the record is corrected. Ours works this way specifically so the published gap figures do not drift upward as businesses build sites — a correction that quietly makes our own headline number smaller.",
      "**A genuinely live query** hits the source at the moment you ask. Most accurate, slowest, and most expensive per request, which is why nobody uses it for bulk work.",
      "In practice the useful distinction is between the first and the second. A maintained index is right most of the time; a file is right on the day it was made.",
    ]},

    { type: "h2", id: "how-old", text: "How old is too old" },
    { type: "prose", text: [
      "At roughly 2% a month, arithmetic gives a usable rule of thumb for this market specifically — and it is stricter than for general B2B data, because of the asymmetry above.",
    ]},
    { type: "table", head: ["List age", "Roughly wrong", "Verdict"], rows: [
      ["Under 2 weeks", "~1%", "Work it freely"],
      ["1 month", "~2%", "Fine"],
      ["3 months", "~6%", "Re-check before a walk-in round"],
      ["6 months", "~12%", "Re-check, or expect a bad conversation a day"],
      ["12 months", "~25%", "Rebuild it"],
    ], note: "Applied to the website field rather than to contact details, which decay differently." },
    { type: "prose", text: [
      "The cheap mitigation costs eight seconds: **check the listing on your phone before you walk in.** It catches the one error that matters, needs no tooling, and is worth more than any freshness guarantee a vendor can offer you.",
    ]},

    { type: "h2", id: "verify", text: "Verifying a list you already have" },
    { type: "prose", text: [
      "Most people reading this already own a list of some age, and rebuilding it is usually unnecessary. Verifying it is cheap if you do it in the right order.",
      "**Spot-check twenty before you re-check a thousand.** Pull twenty at random and load each listing. If nineteen are still correct, the list is fine and you have spent ten minutes. If four have changed, you know the whole thing needs work before you know how much work.",
      "**Re-check by age, not by whole list.** The businesses added most recently are the ones least likely to have changed. Sorting by when a record was last verified and re-checking only the oldest third gets most of the benefit for a third of the effort.",
      "**Never re-check by calling.** The point of verification is to avoid the bad conversation, and using the conversation to verify is the same error with extra steps.",
    ]},

    { type: "h2", id: "when-fine", text: "When a bought list is fine" },
    { type: "prose", text: [
      "It often is, and the honest version of this comparison has to say so.",
      "**If you are working it within a few weeks**, a static export is functionally identical to a live one and usually cheaper. Decay of 2% a month is not a reason to pay a subscription for a list you will exhaust in a fortnight.",
      "**If the field you care about is stable**, buy the file. Category, address and business name barely move. It is website status, phone numbers and staff that rot.",
      "**If you are testing whether outbound works at all**, a cheap static list answers that question perfectly well, and it is a better first spend than tooling.",
      "The case for a maintained index is specifically: repeated use over months, a field that changes, and a pitch that is embarrassing when the field is wrong. All three happen to describe this market, which is why we built one — but they do not describe everybody's.",
    ]},

    { type: "leads", city: "patna", heading: "Checked, and re-checked" },

    { type: "cta", variant: "map", title: "Checked before you call.",
      detail: "A maintained index rather than a file — records corrected when a business builds a site.",
      action: "Search live", href: "/login" },
  ],
  faqs: [
    { q: "How fast does bought lead data go out of date?", a: "Published decay rates for B2B contact data run 22–30% a year, about 2.1% a month, and independent testing puts typical provider accuracy near 50% on arrival. A list bought in January is materially worse by summer." },
    { q: "Why does data decay matter more for no-website lists?", a: "Because the businesses that fall off are the ones that got a website — the exact people whose problem you were about to describe. You do not lose a contact, you lose the premise, and \"I noticed you don't have a website\" said to someone who launched one in March ends the conversation." },
    { q: "How old can a lead list be before I rebuild it?", a: "Under a month is fine, three months warrants a re-check before a walk-in round, six months means expect a bad conversation a day, and twelve months means rebuild. Checking the listing on your phone before walking in costs eight seconds and catches the error that matters." },
    { q: "What is the difference between a live search and a static export?", a: "A static export is a file that was true when it was generated. A maintained index is re-checked on a cycle and corrected when a business builds a site. A genuinely live query hits the source as you ask — most accurate, and too slow and expensive for bulk work." },
    { q: "When is a bought list good enough?", a: "When you will work it within a few weeks, when the fields you care about are stable ones like category and address, or when you are testing whether outbound works at all. A cheap static list answers that question perfectly well." },
  ],
  links: [["/resources/should-you-buy-web-design-leads", "what to pay for leads"], ["/resources/scraping-google-maps-for-leads-what-breaks", "why maintaining an index is the expensive part"], ["/resources/apollo-alternative-local-business-leads", "why B2B databases miss this segment"], ["/resources/qualifying-a-local-lead-before-you-call", "the eight-second check"]],
},

/* ───────────────────────────── 2 · outside the US */
{
  slug: "lead-generation-tools-that-work-outside-the-us",
  title: "Lead Generation Tools That Work Outside the US",
  excerpt: "Every major B2B database is a North American product with international coverage sold as an add-on. Two different problems hide behind that, and only one has a workaround.",
  meta: "Which lead generation tools work outside the US: why the major databases thin out abroad, and the segment problem no coverage add-on solves.",
  category: "Comparisons", cluster: "tools", hero: "network", mins: 8,
  tags: ["Comparisons", "Tools", "Market Research"],
  body: [
    { type: "prose", text: [
      "The major B2B lead databases are North American products, and outside that market they thin out in two quite different ways. One is geography and it has workarounds. The other is segment, and it does not.",
      "Worth separating the two before spending anything on lead generation tooling, because the products that fix the first do nothing about the second.",
    ]},

    { type: "h2", id: "geography", text: "The geography problem" },
    { type: "prose", text: [
      "This one is openly acknowledged by the vendors themselves.",
      "**ZoomInfo's coverage is concentrated in North America**, and international data comes through a separate Data Passport add-on priced in the thousands of dollars a year. **Apollo's European coverage is inconsistent**, which is why an entire category of European-first competitors exists — Cognism built a business on EMEA coverage precisely because the American products thin out there, and others cover LATAM and APAC for the same reason.",
      "So the geography problem has an answer: buy a regional specialist rather than the biggest name. If you are selling into Europe, a European-first database will outperform the larger American one, and the pricing reflects that rather than the database size.",
    ]},
    { type: "table", head: ["Tool", "Strong where", "International"], rows: [
      ["ZoomInfo", "North America", "Separate paid add-on"],
      ["Apollo", "North America, global email", "Inconsistent in Europe"],
      ["Cognism", "UK, DACH, Benelux, Nordics", "Native"],
      ["Regional specialists", "LATAM, APAC", "Native"],
    ], note: "Vendor-published positioning. All four solve geography; none solves the second problem below." },

    { type: "h2", id: "segment", text: "The segment problem, which nothing fixes" },
    { type: "prose", text: [
      "Buy the best European database available and search for barbershops in Liverpool with no website. You will find very little, and it is not a coverage failure — it is what these products are.",
      "Every one of them is built to find **a named person, in a role, at a company with a domain.** That is the unit. The database is assembled from professional networks, corporate domains and email patterns, and it is genuinely excellent at that job.",
      "A business with no website has no domain, no corporate email pattern, and an owner who is not on a professional network in any useful way. **There is nothing for the machinery to attach to**, in any country. Across the {{checked}} businesses in our own index, 95.6% have a phone number and none has a listed email — because the source these businesses actually appear in, their map listing, does not carry one.",
      "So the honest answer for anyone selling to local businesses internationally is that the geography add-on does not help, because the geography was never the reason those businesses were missing.",
    ]},

    { type: "h2", id: "what-works", text: "What does work internationally" },
    { type: "prose", text: [
      "Map-listing data, in every market, for the same reason: it is the one source that exists for a business regardless of whether it has a website, a domain or a professional profile.",
      "Our own index runs across {{countries}} countries on exactly that basis, and the coverage pattern is very different from a B2B database's. It is thin where we have not scanned rather than thin where the professional-network data is sparse, which means it is a question of effort rather than of structure.",
      "The practical consequence: **for local business prospecting, geography is a scanning problem rather than a data-availability problem.** For B2B contact prospecting, it is a structural one. Which of those you have determines whether paying for a coverage add-on is sensible.",
    ]},
    { type: "checklist", items: [
      { title: "Selling to companies with domains, internationally", detail: "Buy the regional specialist. The geography problem is real and it has been solved commercially." },
      { title: "Selling to local businesses, anywhere", detail: "Map-listing data. The B2B databases are missing these businesses in the US too, not just abroad." },
      { title: "Selling redesigns internationally", detail: "Domain-based tools work normally — every prospect has a website by definition." },
      { title: "Selling first websites internationally", detail: "Nothing in the B2B stack helps. This is a different data problem entirely." },
    ]},

    { type: "h2", id: "language", text: "The parts nobody prices in" },
    { type: "prose", text: [
      "Two practical costs of working an international list that no comparison table carries, and both are larger than the subscription.",
      "**Time zones make the phone nearly useless.** A list of British prospects worked from India means calling between roughly 2pm and 8pm IST to catch a British working day, which is the same window your local clients want you in. That is a scheduling problem rather than a data problem, and it decides how many international prospects one person can actually carry.",
      "**Local names and categories do not transfer.** A category label that identifies the right businesses in one market returns something different in another, and a business name that reads as a small independent in one country reads as a chain in another. Working an unfamiliar market means a first week where a meaningful share of the list is simply wrong for reasons no tool will flag.",
      "Neither is a reason not to do it. Both are reasons to start with fifty prospects rather than five hundred, and to treat the first fifty as calibration.",
    ]},

    { type: "h2", id: "cost", text: "What the add-ons cost against what you sell" },
    { type: "prose", text: [
      "The pricing on international B2B data assumes a deal size these products were designed around, and it is worth doing the arithmetic before assuming a bigger tool is a better one.",
      "A coverage add-on in the thousands of dollars a year is trivially worth it against a £30,000 enterprise contract and absurd against a £1,500 website. **Tools are priced against the tickets of the market they were built for**, which is why so much of the sales stack feels wrong at this end — it is not wrong, it is aimed elsewhere.",
      "The same test applies to everything in this category: divide the annual cost by your average project value. If the answer is more than a handful of projects, the tool was built for somebody else.",
    ]},

    { type: "leads", city: "birmingham", country: "gb", heading: "What map data finds in the UK" },

    { type: "cta", variant: "map", title: "The same data, in {{countries}} countries.",
      detail: "Local businesses with no website, from map listings rather than corporate domains.",
      action: "Search any city", href: "/login" },
  ],
  faqs: [
    { q: "Which lead generation tools work outside the US?", a: "For companies with domains, the regional specialists — Cognism for Europe and others for LATAM and APAC — outperform the American databases, whose coverage is concentrated in North America and sold internationally as a paid add-on." },
    { q: "Why do B2B databases miss local businesses abroad?", a: "For the same reason they miss them in the US. They are built to find a named person, in a role, at a company with a domain. A business with no website has no domain, no email pattern and no professional profile, so there is nothing to attach to in any country." },
    { q: "Does buying international coverage fix the problem?", a: "Not for local business prospecting. The geography add-on solves geography, and geography was never why those businesses were missing. Map-listing data is the source that exists for a business regardless of whether it has a domain." },
    { q: "Is international lead data worth the extra cost?", a: "Divide the annual cost by your average project value. A coverage add-on costing thousands a year is trivially worth it against a £30,000 contract and absurd against a £1,500 website — these tools are priced against the market they were built for." },
    { q: "How does map-based coverage differ internationally?", a: "It is thin where nobody has scanned rather than thin where professional-network data is sparse, which makes it an effort problem rather than a structural one. Our own index covers {{countries}} countries on that basis." },
  ],
  links: [["/resources/apollo-alternative-local-business-leads", "the same argument for one product"], ["/resources/do-you-need-an-email-finder-for-local-businesses", "why the email layer is missing"], ["/resources/how-indian-agencies-win-uk-and-australian-clients", "selling into these markets"], ["/resources/india-vs-uk-vs-australia-website-adoption", "what the map data shows"]],
},

/* ───────────────────────────── 3 · technographics */
{
  slug: "why-tech-stack-filtering-misses-your-best-prospects",
  title: "Why Tech-Stack Filtering Misses Your Best Prospects",
  excerpt: "BuiltWith and Wappalyzer detect technology by reading a website's source, headers and DNS. A business with no website hands them nothing to read.",
  meta: "Why tech-stack filtering misses your best prospects: technographic tools detect by scanning a site, so businesses without one are structurally invisible.",
  category: "Comparisons", cluster: "tools", hero: "methodology", mins: 8,
  tags: ["Comparisons", "Tools", "Prospecting"],
  body: [
    { type: "prose", text: [
      "Tech-stack filtering — finding prospects by what technology their site runs — is a genuinely good prospecting method with one structural blind spot, and for anyone selling first websites that blind spot is the entire market. It misses your best prospects not by accident but by construction.",
      "**BuiltWith and Wappalyzer detect technology by scanning a website's source code, HTTP headers and DNS records.** BuiltWith tracks over 111,000 technologies, Wappalyzer around 8,000 across 106 categories, and both are good at what they do. But the detection method is the limitation: a business with no website presents nothing to scan.",
    ]},

    { type: "h2", id: "mechanism", text: "The mechanism, and why it excludes" },
    { type: "prose", text: [
      "Every technographic tool works the same way. Fetch the page, read the markup, the headers and the DNS, and match the fingerprints against a library of known technologies. It is a clean approach and it is why these tools can tell you which of a thousand sites run WordPress.",
      "It also means the tool's universe is **the set of businesses that have a website**. Not a filter you applied — the boundary of what it can see at all.",
      "So a query like \"businesses running an outdated CMS\" returns exactly the prospects who already invested in a site once. Useful if you sell redesigns and migrations. Structurally empty if you sell first websites, because the businesses you want are not in the index and never will be.",
    ]},
    { type: "table", head: ["What you want to find", "Technographics", "Why"], rows: [
      ["Sites on an old CMS", "Yes", "Fingerprints are in the markup"],
      ["Sites with no analytics", "Yes", "Absence of a known script"],
      ["Sites on a free builder", "Yes", "Subdomain and headers give it away"],
      ["Businesses with no website", "No", "Nothing to scan"],
      ["Businesses on a Facebook page only", "No", "No domain to look up"],
      ["Businesses whose site has died", "Partly", "Often reads as no data rather than as dead"],
    ]},

    { type: "h2", id: "no-data", text: "\"No data\" is not a signal" },
    { type: "prose", text: [
      "The subtler trap, and it catches people who know about the first one.",
      "It is tempting to treat an empty technographic result as a proxy for having no website. It is not, and the failure modes point in several directions at once. A site can block the scanner. A site can be too new to have been crawled. A site can be behind a CDN that hides its headers. A business can have a perfectly good site on a domain the tool never associated with it.",
      "So \"no technologies detected\" mixes together businesses with no site, businesses whose site was unreadable, and businesses the tool simply does not know about — and you cannot tell which from the output. Building a prospect list on that produces the worst version of a cold call: **claiming somebody has no website when they have a good one.**",
      "The reliable source for that question is the business's own map listing, which is the one place the answer is stated rather than inferred.",
    ]},

    { type: "h2", id: "combine", text: "Using both, in the right order" },
    { type: "prose", text: [
      "The two data sources are complementary rather than competing, and there is an order that makes sense of both.",
      "**Map data first, to decide who exists and who has nothing.** That is the question technographics cannot answer, and it is the one that produces a first-website list.",
      "**Tech-stack data second, on the businesses that do have a site.** Once you know a business has a website, knowing what it runs on is genuinely useful — it tells you whether a redesign is a template swap or a migration, and it is the difference between a ₹20,000 quote and a ₹60,000 one.",
      "Run in that order, a single city produces two lists from one afternoon: the first-website prospects and the redesign prospects, each of which needs a different pitch, a different price and a different opening. Most agencies work only one of the two and never notice the other was sitting in the same data.",
    ]},

    { type: "h2", id: "pricing", text: "The pricing does not fit either" },
    { type: "prose", text: [
      "Even setting the mechanism aside, the commercial shape is wrong for this end of the market.",
      "Wappalyzer's Pro plan starts around $250 a month for 5,000 lookups and caps technology targets at two; the Business tier is roughly $450. Those are sensible numbers for a SaaS company prospecting enterprise accounts worth tens of thousands.",
      "Against a ₹25,000 website they are not. At ₹22,000 a month you need a client a month from the tool alone before it breaks even, from a data source that structurally cannot contain the prospects you want. The same divide-by-your-ticket test that applies to every tool in this category applies here, and it fails twice over.",
    ]},

    { type: "h2", id: "when-useful", text: "When technographics genuinely help" },
    { type: "prose", text: [
      "The tools are good and there is a real use for them in this business — it is just not first-website prospecting.",
      "**Redesign and migration work.** Every prospect has a site by definition, so the entire universe is visible. Finding businesses on an unsupported CMS, an abandoned page builder or a platform that has stopped shipping updates is exactly what these tools are for, and it is a legitimate agency niche.",
      "**Qualifying a specific prospect.** Checking one business before a meeting is a free lookup and takes seconds. Knowing what they are on before you quote a redesign is worth doing.",
      "**Understanding a market.** What share of dentists in a city run WordPress is a real question with a real answer, and it can inform what you build on.",
      "None of those is list building for first websites, which is the job people usually buy these tools for.",
    ]},

    { type: "leads", city: "kota", heading: "The prospects no scanner can see" },

    { type: "cta", variant: "map", title: "Stated, not inferred.",
      detail: "The website field read from the business's own listing — the one place the answer is not a guess.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "Can BuiltWith or Wappalyzer find businesses without websites?", a: "No, and it is structural rather than a gap. Both detect technology by scanning a site's source code, headers and DNS records, so a business with no website presents nothing to scan and is not in the index at all." },
    { q: "Can I use \"no technologies detected\" as a no-website signal?", a: "No. That result mixes businesses with no site, sites that blocked the scanner, sites behind a CDN, and domains the tool never associated with the business — and you cannot tell which from the output. It produces the worst cold call: telling somebody they have no website when they have a good one." },
    { q: "What is technographic filtering actually good for?", a: "Redesign and migration work, where every prospect has a site by definition — finding businesses on an unsupported CMS or an abandoned page builder is exactly what these tools do well. Also for qualifying a single prospect before a meeting." },
    { q: "How much do tech-stack tools cost?", a: "Wappalyzer's Pro plan starts around $250 a month for 5,000 lookups with technology targets capped at two, and Business is around $450. Sensible against enterprise deals, and roughly a client a month against a ₹25,000 website." },
    { q: "What should I use instead to find businesses without websites?", a: "The business's own map listing, where the website field is stated rather than inferred from what a scanner could or could not read. That is the one source that exists whether or not the business has a site." },
  ],
  links: [["/resources/apollo-alternative-local-business-leads", "the same blind spot in contact databases"], ["/resources/bought-database-vs-live-search", "why the field goes stale"], ["/resources/how-to-price-a-website-redesign", "the work technographics is actually for"], ["/resources/qualifying-a-local-lead-before-you-call", "reading the listing instead"]],
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
