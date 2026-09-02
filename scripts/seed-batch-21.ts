/**
 * Batch 21 — the discovery cluster, kept deliberately distinct from the existing head-term post.
 *
 * The India post exists because of a correctable error on page one. A tool vendor ranking for this
 * query states that "India's cities like Mumbai, Delhi, and Bangalore have 55–65% of listed
 * businesses with no website" and that over 60% of Indian SMBs have none. Our measurements are
 * Mumbai 28.2%, Delhi 29.0%, Bengaluru 26.2% — roughly half the published claim. The 55–65% band
 * does exist, but in cities nobody in that SERP names: Morena at 79.8%, Kota at 64.3%.
 *
 * Also noted and deliberately not repeated: the widely-quoted "invisible to 60% of search traffic"
 * figure appears in this SERP with no source attached to it.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · maps prospecting */
{
  slug: "google-maps-prospecting-for-web-designers",
  title: "Google Maps Prospecting for Web Designers in 2026",
  excerpt: "Maps is the best prospect database in this business and it will not let you filter on the one field you need. What it does give you, and how to work around what it does not.",
  meta: "Google Maps prospecting for web designers: which filters Maps actually offers, the result cap, and why the no-website field cannot be filtered directly.",
  category: "Lead Generation", cluster: "operations", hero: "nearby", mins: 8,
  tags: ["Prospecting", "Tools", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "For web designers, Google Maps is the best prospect database available and it is deliberately not built to be one. Understanding exactly where it helps and where it stops is worth more than any technique.",
      "The core limitation first, because everything follows from it: **Maps has no filter for \"no website\".** You can filter by rating, by opening hours, by category and by a few attributes. The website field is visible on each listing individually and is not a search criterion, which means the one thing you want has to be checked one business at a time.",
    ]},

    { type: "h2", id: "what-it-gives", text: "What Maps actually gives you" },
    { type: "prose", text: [
      "More than people use. Each listing carries the pieces you need to qualify a prospect before speaking to anybody:",
    ]},
    { type: "checklist", items: [
      { title: "The website field", detail: "Present, absent, a Facebook page, or a domain that no longer loads. All four are different conversations." },
      { title: "Review count and rating", detail: "The only public evidence of customer volume, and the strongest qualification signal available anywhere." },
      { title: "Photographs", detail: "Whose photos — the owner's or customers' — tells you whether anybody is tending the listing." },
      { title: "Category", detail: "How Google classifies them, which is often not how they would describe themselves." },
      { title: "Opening hours", detail: "Which decides when to visit, and that decides whether you reach the owner." },
      { title: "Posts and updates", detail: "A business posting to its listing has already decided being findable matters." },
    ]},
    { type: "prose", text: [
      "The filters Maps does offer are worth using in combination: **rating above 4.0, plus a specific category, plus open now** narrows a city search to businesses that are trading, well-regarded and currently staffed. That is not the no-website filter you wanted, but it removes most of the businesses you would have discarded anyway.",
    ]},

    { type: "h2", id: "cap", text: "The result cap, and what it means for you" },
    { type: "prose", text: [
      "A Maps search returns roughly 120 results and then stops, regardless of how many businesses match. Search restaurants in a large city and you are seeing a fraction.",
      "For manual prospecting this is less of a problem than it sounds, because 120 is already more than an afternoon of work. It becomes a problem when you assume you have seen a category, conclude the market is small, and move on. **You have seen 120 of them.**",
      "The workaround is the same one every index uses: search by neighbourhood rather than by city. \"Hardware store Mansarovar\" and \"hardware store Vaishali Nagar\" return different sets, and between them cover ground a single city query never reaches. It also produces exactly the clustered list a walk-in round needs.",
    ]},

    { type: "h2", id: "signals", text: "Signals worth reading off a listing" },
    { type: "prose", text: [
      "Beyond the obvious ones, three that change how you open a conversation.",
      "**A dead domain in the website field.** Better than an empty one. \"Your site has been down since last year\" is specific, checkable, and establishes that you looked before you called.",
      "**A social URL in the website field.** These businesses do not appear in any no-website filter, and they have already decided they need somewhere to send people. Frequently the best prospects on the map and almost nobody is calling them.",
      "**Owner-uploaded photographs and a recent post.** Somebody is tending this listing, which means somebody in that business already believes online presence matters. That is half the argument won before you arrive.",
      "The inverse is also worth reading. A listing with no photographs, under twenty reviews and a category that reads as generic is usually a business that will not pay, and the ten seconds it takes to notice saves the visit.",
    ]},

    { type: "h2", id: "manual", text: "How long it actually takes" },
    { type: "table", head: ["Method", "50 leads", "Also gives you"], rows: [
      ["Maps by hand", "2–3 hours", "Full context on every business"],
      ["Maps by hand, one neighbourhood", "1–2 hours", "A clustered walk-in round"],
      ["A tool", "Minutes", "Less context, more coverage"],
    ], note: "Manual figures assume you are recording phone numbers and review counts, not just names." },
    { type: "prose", text: [
      "Roughly three minutes a lead by hand, and the underrated part is that you are looking at the whole listing while you work. By the time you visit, you know what they sell, what customers say and what the shopfront looks like — which is a real advantage over a row in an exported spreadsheet.",
      "The honest threshold is volume. Below about fifty leads a week, doing it by hand in Maps is the correct answer and paying for anything is premature.",
    ]},

    { type: "h2", id: "limits", text: "What Maps will not tell you" },
    { type: "prose", text: [
      "**Whether the listing is current.** A business can have closed, moved or built a website since the listing was last touched. Checking the website field is eight seconds and catches the error that matters most.",
      "**Anything about the owner.** No name, no email, no indication of who decides. That is what the first conversation is for, and no tool changes it.",
      "**Whether they can pay.** Review count is a proxy for customer volume, not for margin. A busy convenience store and a busy hardware supplier look similar on a listing and are entirely different prospects.",
      "Maps tells you who exists and who is visible. Everything else is your judgement, which is the part of this job that does not automate.",
    ]},

    { type: "leads", city: "jaipur", heading: "The same listings, filtered" },

    { type: "cta", variant: "map", title: "The filter Maps does not have.",
      detail: "Search a category and city and see only the businesses with no website — with review counts and ratings attached.",
      action: "Try it", href: "/login" },
  ],
  faqs: [
    { q: "Can you filter Google Maps for businesses without a website?", a: "No. Maps offers filters for rating, hours, category and a few attributes, but the website field is only visible on each listing individually. It has to be checked one business at a time, which is why tools for this exist." },
    { q: "How many results does a Google Maps search return?", a: "Around 120, however many businesses match. That is more than an afternoon of work for manual prospecting, but it means you should not conclude a category is small from one city-wide search — search by neighbourhood instead." },
    { q: "What should I look at on a Maps listing before calling?", a: "The website field first — empty, dead, or a social page are three different conversations. Then review count and rating as evidence of customer volume, whether the photographs are owner-uploaded, and the opening hours, which decide when you can reach the owner." },
    { q: "How long does manual Google Maps prospecting take?", a: "About three minutes a lead, or two to three hours for fifty if you are recording phone numbers and review counts. Below about fifty leads a week, doing it by hand is the correct answer." },
    { q: "What does Google Maps not tell you about a prospect?", a: "Whether the listing is current, anything about who owns or decides, and whether the business can actually pay. Review count measures customer volume rather than margin — a busy convenience store and a busy hardware supplier look alike and are not." },
  ],
  links: [["/resources/how-to-find-businesses-that-need-a-website", "the wider method"], ["/resources/free-ways-to-find-businesses-without-websites", "the other free routes, costed"], ["/resources/qualifying-a-local-lead-before-you-call", "reading the listing properly"], ["/resources/how-to-build-a-lead-list-for-a-web-design-agency", "turning listings into a list"]],
},

/* ───────────────────────────── 2 · building a list */
{
  slug: "how-to-build-a-lead-list-for-a-web-design-agency",
  title: "How to Build a Lead List for a Web Design Agency",
  excerpt: "Most lead lists fail at maintenance rather than at collection. The five stages, the deduplication rule that matters, and how often the whole thing has to be re-checked.",
  meta: "How to build a lead list for a web design agency: defining the profile, sourcing, qualifying, deduplicating on place ID, and how often to re-check it.",
  category: "Lead Generation", cluster: "operations", hero: "leads", mins: 9,
  tags: ["Prospecting", "Operations", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "A lead list for a web design agency is easy to build and hard to keep. Most people get the collection right and lose the value in the six weeks afterwards, when nothing is re-checked and nobody removes anyone.",
      "Five stages, of which the last two are where the work actually is.",
    ]},

    { type: "h2", id: "profile", text: "1. Define what a good prospect looks like" },
    { type: "prose", text: [
      "Not a paragraph about ideal customers — three or four checkable conditions, so that building the list is mechanical rather than a judgement call each time.",
      "For local first-website work the useful conditions are: **a category with a real gap, a review count above the category norm, a rating above 4.0, and a location you can reach.** Everything else is refinement.",
      "The mistake is defining this by industry alone. \"Small businesses in Jaipur\" is not a profile; \"hardware and electronics retailers in Mansarovar and Sanganer with 40+ reviews and no website\" is one, and it produces a list you can work on foot next Tuesday.",
    ]},

    { type: "h2", id: "source", text: "2. Source it" },
    { type: "prose", text: [
      "Map listings, for the reason that runs through this whole corpus: it is the only source that contains a business regardless of whether it has a website, a domain or an email. B2B databases are built around a domain and a named person, and a business with no website has neither.",
      "Whether you gather it by hand, use a tool, or buy an export is a volume question rather than a quality one. Below fifty leads a week, by hand in Maps is genuinely correct and costs nothing.",
    ]},

    { type: "h2", id: "qualify", text: "3. Qualify before it enters the list" },
    { type: "prose", text: [
      "The single highest-leverage habit, and the one most people skip because it feels like throwing away work.",
      "A list of eight hundred unfiltered businesses is worse than a list of a hundred qualified ones — not just less efficient, actively worse, because the close rate on the unfiltered version teaches you the wrong thing about your pitch and your market.",
      "Qualify on what the listing shows: the website field is really empty, the review count clears the category's norm, the rating is above 4.0, and the business is in an area you will actually visit. Four checks, under a minute each.",
    ]},
    { type: "table", head: ["Stage", "Typical count", "What happens here"], rows: [
      ["Collected", "800", "Everything in the category and city"],
      ["After website check", "300", "Genuinely no site, or social-only"],
      ["After review and rating", "120", "Proven customers, no obvious problem"],
      ["After geography", "100", "Reachable in a clustered round"],
    ], note: "Illustrative. The shape matters more than the numbers — most of what you collect should not survive." },

    { type: "h2", id: "dedupe", text: "4. Deduplicate on the ID, never the name" },
    { type: "prose", text: [
      "Duplicates arrive constantly and from a specific place: **searching by neighbourhood means businesses near a boundary appear in two searches.** That is not a flaw in the method, it is the cost of getting past the result cap, and it has to be handled at ingest rather than later.",
      "Deduplicate on the place identifier rather than the business name. Names collide far more than people expect — chains, franchises, family businesses using the same surname, and two unrelated \"Sharma Electronics\" on opposite sides of a city. Names also differ trivially between records: an extra full stop, \"and\" versus \"&\", a suffix.",
      "The failure this prevents is the expensive one in a local market: **two people from your agency approaching the same shop in one week**, or worse, you approaching a business you already pitched two months ago and forgot.",
    ]},

    { type: "h2", id: "maintain", text: "5. Maintain it, which is the whole job" },
    { type: "prose", text: [
      "Collection is an afternoon. Maintenance is the reason a list is worth anything in month three.",
      "**Re-check the website field on a cycle.** This is the field that decays in the direction that embarrasses you — a business that built a site is a business whose problem you can no longer describe. Published B2B decay runs 22–30% a year; treat a list older than three months as needing a re-check before a round.",
      "**Remove people properly.** A no should come off, or be marked so clearly that it never enters a round again. Lists that only grow stop being trusted, and a list you do not trust is a spreadsheet.",
      "**Record what happened, in one line.** Not a CRM — a column with the date and what they said. \"Nov 12, said maybe after Diwali\" is the difference between a follow-up that works and one that reads as a stranger's cold message.",
    ]},
    { type: "checklist", items: [
      { title: "Website field re-checked", detail: "Before any round on a list older than three months. Eight seconds each on the ones you are about to visit." },
      { title: "Outcomes recorded", detail: "One line, one date. This is what makes the second conversation better than the first." },
      { title: "Declines removed", detail: "Or marked so they never re-enter a round. A list that only grows becomes untrusted." },
      { title: "Refilled at 40%", detail: "When a hundred is down to forty uncontacted, that is two weeks left — enough to build the next list without a gap." },
    ]},

    { type: "leads", city: "indore", heading: "A list, already filtered" },

    { type: "cta", variant: "map", title: "Skip to the qualified hundred.",
      detail: "Category, city, review count and rating — filtered before it reaches your list rather than after.",
      action: "Build a list", href: "/login" },
  ],
  faqs: [
    { q: "How do I build a lead list for a web design agency?", a: "Define three or four checkable conditions rather than an industry, source from map listings, qualify before anything enters the list, deduplicate on the place identifier, and re-check the website field on a cycle. The last two are where the work is." },
    { q: "How many prospects should a lead list contain?", a: "About 100 qualified prospects supports four builds a month. It matters that they are qualified — an unfiltered list of 800 is actively worse than a filtered 100, because its close rate teaches you the wrong thing about your pitch." },
    { q: "How do I deduplicate a lead list?", a: "On the place identifier, never the business name. Names collide constantly — chains, franchises, two unrelated Sharma Electronics — and differ trivially between records. Duplicates arrive because neighbourhood searches overlap at boundaries." },
    { q: "How often should I refresh a lead list?", a: "Treat anything older than three months as needing a re-check before a round, because the website field decays in the direction that embarrasses you. Published B2B data decay runs 22–30% a year." },
    { q: "What is the most common mistake with lead lists?", a: "Never removing anybody. A list that only grows stops being trusted, and a list you do not trust is a spreadsheet. Declines should come off or be marked so clearly they never re-enter a round." },
  ],
  links: [["/resources/google-maps-prospecting-for-web-designers", "where the listings come from"], ["/resources/qualifying-a-local-lead-before-you-call", "the qualification checks"], ["/resources/bought-database-vs-live-search", "why the field decays"], ["/resources/how-many-businesses-should-be-in-your-pipeline", "how large the list should be"]],
},

/* ───────────────────────────── 3 · india */
{
  slug: "how-to-find-small-businesses-without-a-website-in-india",
  title: "How to Find Small Businesses Without a Website in India",
  excerpt: "The figures circulating for Indian metros are roughly double what we measure. The 55–65% claim is real — but it belongs to cities nobody writing about this has named.",
  meta: "How to find small businesses without a website in India: measured city rates, why the published metro figures are wrong, and which categories to search.",
  category: "Lead Generation", cluster: "operations", hero: "nearby", mins: 9,
  tags: ["Prospecting", "India", "Original Data"],
  body: [
    { type: "prose", text: [
      "Search for how to find small businesses without a website in India and you will be told that Mumbai, Delhi and Bengaluru run at 55–65% without one, and that more than 60% of Indian SMBs have none.",
      "We measure those three cities directly. **Mumbai is 28.2%, Delhi 29.0%, and Bengaluru 26.2%** — roughly half the published claim. Planning a metro campaign on the higher number means expecting twice the prospects you will find.",
      "The 55–65% band does exist. It is just not where anyone is looking.",
    ]},

    { type: "h2", id: "where", text: "Where the high rates actually are" },
    { type: "citytable", country: "in", min: 400, limit: 12, order: "gap",
      note: "Indian cities with at least 400 businesses checked, read from the index at build time." },
    { type: "prose", text: [
      "Morena, Kota, Kanpur, Bhopal, Vadodara, Patna. These are the cities where the 55–65% figure is true and then some — and none of them appears in the articles making that claim about Mumbai.",
      "The pattern is consistent: **the gap runs inversely to city size**, because smaller cities have fewer agencies working them, customers who live close enough that nothing forced the question, and a strong directory habit that makes the web-presence question feel already answered.",
    ]},

    { type: "h2", id: "categories", text: "Which categories to search" },
    { type: "prose", text: [
      "City choice sets the level; category choice decides whether you have a business. Within India the spread by category is wider than the spread by city:",
    ]},
    { type: "table", head: ["Category", "No website (India)", "Worth working"], rows: [
      ["Hardware store", "79.8%", "Yes — contractor customers"],
      ["Barber shop", "77.6%", "Volume and care plans only"],
      ["Guest house", "77.3%", "Yes — booking value"],
      ["Car repair", "54.4%", "Yes — the biggest category"],
      ["Cafe", "48.6%", "Yes — the 50–199 review band"],
      ["Beauty salon", "40.8%", "Yes — treatments are booked ahead"],
      ["Convenience store", "High", "No — 11 average reviews"],
    ], note: "Rates for Indian businesses with a verified website check." },
    { type: "prose", text: [
      "The last row is the warning. A very high gap with almost no reviews is not an opportunity — it is a category where nobody researches, nobody has budget, and a website changes nothing. High gap and demonstrable customers together is the condition, and only one of those is easy to see.",
    ]},

    { type: "h2", id: "how", text: "How to actually search" },
    { type: "steps", items: [
      { title: "Pick your own city first", icon: "map", detail: "Walking in is the strongest channel in this market and it needs you present. A lower rate nearby beats a higher one four hours away — travel destroys the economics of a ₹25,000 ticket faster than a better rate improves them." },
      { title: "Search by neighbourhood, not by city", icon: "search", detail: "A Maps search returns about 120 results whatever you ask, so a city query silently truncates. Neighbourhood queries cover more ground and produce the clustered list a walk-in round needs." },
      { title: "Read the website field rather than filtering on it", icon: "signal", detail: "A Facebook page or a directory profile in that field counts as having a website everywhere, so those businesses are invisible to a filter — and they are often the better prospects." },
      { title: "Filter on reviews before you go", icon: "score", detail: "25 to 200 reviews for most categories. Under 25 there is usually no budget, and the ten seconds it takes to check saves the visit." },
    ]},

    { type: "h2", id: "language", text: "Searching in a country with a dozen search languages" },
    { type: "prose", text: [
      "A practical problem nobody writing about Indian prospecting mentions, and it costs a real share of any list.",
      "**Business names are transliterated inconsistently.** The same shop can be listed as Shri, Sri or Shree; Lakshmi, Laxmi or Lakhsmi. Searching for one spelling finds one set of businesses, and a category search finds them all regardless — which is one more reason to search by category and area rather than by name.",
      "**The category a business chose may be in a different register than the one you would search.** A trader may have picked \"wholesaler\", \"supplier\", \"distributor\" or \"trading company\" for the same activity, and Maps treats those as distinct. Working a vertical properly means searching four or five labels for what is commercially one category.",
      "**Regional-language listings exist and are searchable in English.** Google resolves these reasonably well, so this is rarely a blocker — but a business whose listing is in Tamil or Gujarati script may carry less English detail, which means the listing looks thinner than the business is. Do not read a sparse listing as a small business without checking the review count.",
    ]},

    { type: "h2", id: "indian", text: "What is different about Indian listings" },
    { type: "prose", text: [
      "Four things that change how you read them, and none of them appear in advice written for other markets.",
      "**The number is often a personal mobile.** Which means a call can reach the owner directly, unlike the counter landline that answers in most Western markets. Worth checking before deciding whether to call or visit.",
      "**Category labels fit poorly.** Google's taxonomy was not built for Indian trade, so businesses land in generic buckets — \"store\", \"service\", \"consultant\" — that hide what they actually do. Searching only tidy categories misses a large part of the market.",
      "**Directory profiles are common in the website field.** A JustDial or IndiaMART URL reads as having a website, and those businesses are paying monthly for something they do not own — a harder objection than a free Facebook page, and a real prospect.",
      "**Review counts run high.** Indian businesses in our index average far more Google reviews than American ones in the same categories, so the review thresholds used in US-written advice are set too low for this market.",
    ]},

    { type: "leads", city: "kota", heading: "Where the real rate is" },

    { type: "cta", variant: "map", title: "Measured, not estimated.",
      detail: "Real rates by Indian city and category, from listings we have checked one at a time.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "What percentage of Indian businesses have no website?", a: "{{inPct}} across the {{inChecked}} Indian businesses in our index. The commonly published claim that Mumbai, Delhi and Bengaluru run at 55–65% is roughly double what we measure — those cities are 28.2%, 29.0% and 26.2%." },
    { q: "Which Indian cities have the most businesses without websites?", a: "Morena at close to 80%, then Kota, Kanpur, Bhopal, Vadodara and Patna above 55%. The gap runs inversely to city size, and none of these cities appears in the articles making the 55–65% claim about the metros." },
    { q: "Which Indian business categories have the biggest gap?", a: "Hardware stores at 79.8%, barbers at 77.6%, guest houses at 77.3% and car repair at 54.4%. But a high gap alone is not an opportunity — convenience stores have a very high gap and eleven average reviews, which means no budget and nothing a website changes." },
    { q: "Should I target a metro or a tier-2 city?", a: "Whichever you live in. Walking in is the strongest channel here and it requires being there, so a 28% rate you can reach on a scooter beats a 64% rate four hours away — travel destroys the economics of a ₹25,000 ticket faster than a better rate improves them." },
    { q: "What is different about Indian business listings?", a: "The listed number is often the owner's personal mobile rather than a counter landline, Google's category labels fit Indian trade poorly so businesses land in generic buckets, directory URLs are common in the website field, and review counts run much higher than in US-written advice assumes." },
  ],
  links: [["/resources/which-indian-cities-have-the-biggest-website-gap", "the full city table"], ["/resources/google-maps-prospecting-for-web-designers", "the search method"], ["/resources/tier-1-vs-tier-2-india-website-gap", "which market to work"], ["/resources/which-local-verticals-actually-pay-for-a-website", "choosing the category"]],
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
