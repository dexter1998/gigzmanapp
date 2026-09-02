/**
 * Batch 7 — the scraping reality check, the honest free-methods comparison, and territory planning.
 *
 * SERP checks first:
 *  · "scraping Google Maps at scale" is written almost entirely by people selling scrapers —
 *    Lobstr, RapidSeedbox, Leads-Sniper, Salesforge, Botsol — plus the gosom repo. Their "what
 *    breaks" section is uniformly captchas and IP blocks. Two hard constraints in that SERP are
 *    worth keeping: Maps returns at most ~120 results per search, and the UI changes often enough
 *    to break parsers. The three things that actually break a lead operation are elsewhere, so
 *    that is what this post is about. It deliberately carries no blocking-evasion instructions.
 *  · Free methods: the page-one results are the free tiers themselves (Prospea, B2BLeadFinder,
 *    Origami) plus Trovn, whose honest number — 2 to 3 hours for 50 manual leads — is the most
 *    useful thing on the page and the anchor for costing the alternatives.
 *  · Territory planning: page one is enterprise B2B (Gong, QuotaPath, Maptive, Forma, monday) and
 *    the one principle worth importing is that equal map area is not equal opportunity. None of it
 *    is written for a three-person agency working one city.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · scraping at scale */
{
  slug: "scraping-google-maps-for-leads-what-breaks",
  title: "Scraping Google Maps for Leads: What Breaks at Scale",
  excerpt: "Blocked requests are the problem everyone writes about and the easiest one to survive. Three others quietly ruin the data, and one of them inverts the economics entirely.",
  meta: "Scraping Google Maps for leads: the result cap that forces tiling, the taxonomy mismatch that drops half a run, and what the website field really costs.",
  category: "Enrichment", cluster: "data", hero: "methodology", mins: 10,
  tags: ["Data", "Engineering", "Prospecting"],
  body: [
    { type: "prose", text: [
      "Everything written about scraping Google Maps for leads is written by someone selling a scraper, and it all names the same failure: you will get blocked. That is true and it is the least interesting thing that goes wrong, because a blocked request announces itself.",
      "The failures that cost you are silent. A run finishes, the row count looks plausible, and the data is wrong in ways you will not notice for weeks. Here are the three that matter at scale, in the order you will hit them.",
    ]},

    { type: "h2", id: "cap", text: "What breaks first: the result cap" },
    { type: "prose", text: [
      "A single Maps search returns roughly 120 results and then stops, no matter how many businesses match. Search restaurants in a city of three million and you get 120 of them.",
      "So you tile. The city gets cut into neighbourhoods or a grid, and each cell is searched separately. This works, and it is what any serious index does — but understand what it costs you, because it is the decision everything else follows from:",
    ]},
    { type: "checklist", items: [
      { title: "Request volume multiplies", detail: "One city query becomes forty. Whatever your per-request risk or cost was, multiply it." },
      { title: "Boundaries produce duplicates", detail: "A business near a cell edge appears in two searches. Dedupe on the place ID, not the name — chains and franchises share names constantly." },
      { title: "Coverage becomes uneven", detail: "A dense market centre still hits the cap inside one cell while a suburb returns nine results. Uniform grids produce non-uniform coverage." },
    ]},
    { type: "prose", text: [
      "The third one is the trap. A uniform grid feels rigorous and quietly under-samples exactly the areas with the most businesses in them — which are the areas you most wanted.",
    ]},

    { type: "h2", id: "taxonomy", text: "The taxonomy mismatch that eats half a run" },
    { type: "prose", text: [
      "This is the one that has cost us the most, and we have never seen it mentioned anywhere.",
      "The category label shown on a Maps listing and the category taxonomy an API returns are **not the same vocabulary**. A listing that reads \"Sweet Shop\" or \"Cake Shop\" to a human does not necessarily arrive as anything your pipeline recognises, and if your ingest keys on a fixed list of category names, everything unmapped is dropped on the floor.",
      "It fails silently. The run completes, the rows are real, and a large share of what you paid to fetch never lands. The only way to catch it is to count what you discarded — log every unrecognised label, and read that log. Ours turns into a mapping table that gets extended every time a scan runs into something new.",
    ]},
    { type: "tip", title: "The one metric that catches this",
      text: "Track discovered-versus-stored per run. If a scan discovers 900 listings and stores 500, you do not have a scraping problem, you have a mapping problem — and no amount of proxy work fixes it." },

    { type: "h2", id: "website", text: "Why the website field changes the economics" },
    { type: "prose", text: [
      "This is the point where scraping and the official API stop being interchangeable, and it is specific to this use case.",
      "If you only want names and addresses, discovery is cheap on any path. But the entire premise here is the **website field** — you are looking for businesses that do not have one. On Google's official Places API, asking for `websiteUri` alongside rating and review count moves the request onto the Enterprise field tier: **$0.035 a call, about ₹3.08.**",
      "That single field is what sets the cost floor of the whole operation. And because Places bills per call rather than per result, cost tracks the *shape* of the query rather than its yield — a narrow neighbourhood query is around six calls, a broad city-wide filtered one around forty, and both can return roughly twenty usable businesses. Same output, seven times the cost.",
    ]},
    { type: "table", head: ["Query shape", "Approx. calls", "Usable leads", "Cost per lead"], rows: [
      ["One category, one neighbourhood", "~6", "~20", "≈ ₹0.92"],
      ["One category, whole city, filtered", "~40", "~20", "≈ ₹6.16"],
    ], note: "At ₹3.08 a billed call. The lesson is not that one is wrong — it is that yield per call, not leads per hour, is the number to optimise." },
    { type: "prose", text: [
      "Anyone quoting you a flat cost per lead for this data either has a different cost structure or has not measured theirs.",
    ]},

    { type: "h2", id: "stale", text: "The data starts decaying immediately" },
    { type: "prose", text: [
      "A scrape is a photograph, and the thing you photographed is the one field most likely to change. Businesses add websites. Sites die and the listing keeps the dead URL. Listings get claimed and edited. A business closes and stays on the map for months.",
      "If your list is three months old, some meaningful share of it is now wrong in the direction that embarrasses you — you will tell someone they have no website while looking at the one they launched in March.",
      "Which makes re-checking, not discovery, the ongoing cost of running an index. When a later check reveals a site we did not know about, we correct the record rather than leaving it, specifically so the published gap figures do not drift upward over time. Every number on this site is {{checked}} businesses read that way.",
    ]},

    { type: "h2", id: "legal", text: "The part worth being sober about" },
    { type: "prose", text: [
      "Scraping Google Maps is against Google's terms of service. That is not a technical constraint and no amount of engineering resolves it — it is a business risk you are choosing to carry, and it is worth knowing you are choosing it rather than discovering it later.",
      "The official Places API is the licensed path for exactly this data, which is why our own index is built on it and why the cost figures above are real numbers off our own bill rather than estimates. It is more expensive per call than a scraper and it is the reason we can publish the methodology at all.",
      "None of which is an argument that you should never scrape anything. It is an argument for knowing which of the two you are doing, and for not being surprised by the bill or the terms.",
    ]},

    { type: "leads", city: "gurgaon", heading: "What a maintained index looks like" },

    { type: "cta", variant: "map", title: "Skip the pipeline.",
      detail: "{{checked}} businesses across {{cities}} cities, already checked, already deduplicated, already re-verified.",
      action: "Search instead of scraping", href: "/login" },
  ],
  faqs: [
    { q: "How many results does a Google Maps search return?", a: "Around 120, regardless of how many businesses match. Covering a real city means splitting it into smaller areas and searching each one, which multiplies your request volume and introduces duplicates at every boundary." },
    { q: "What actually breaks when scraping Google Maps at scale?", a: "Blocking is the visible failure. The expensive ones are silent: the result cap forcing uneven tiling, category labels that do not map to your taxonomy so rows are dropped without warning, and the data decaying from the day it is collected." },
    { q: "Why is the website field expensive to collect?", a: "On the official Places API, requesting websiteUri alongside rating and review count puts the call on the Enterprise field tier at $0.035 — about ₹3.08 a call. Since billing is per call rather than per result, a broad query can cost seven times a narrow one for the same twenty leads." },
    { q: "Is scraping Google Maps legal?", a: "It is against Google's terms of service, which is a business risk rather than a technical one. The Places API is the licensed route to the same data and costs more per call, which is the trade being made." },
    { q: "How quickly does scraped lead data go stale?", a: "Immediately, and in the worst field. Businesses add websites, sites die while the listing keeps the dead URL, and closed businesses linger for months. Re-checking is the ongoing cost of an index — discovery is the one-off." },
  ],
  links: [["/resources/apollo-alternative-local-business-leads", "why B2B databases miss these businesses"], ["/resources/free-ways-to-find-businesses-without-websites", "the free alternatives, costed"], ["/resources/how-to-find-businesses-that-need-a-website", "what to do with the list"]],
},

/* ───────────────────────────── 2 · free methods */
{
  slug: "free-ways-to-find-businesses-without-websites",
  title: "Free Ways to Find Businesses Without Websites (And Limits)",
  excerpt: "Four methods that cost nothing, what each one actually takes in hours, and the volume at which every one of them stops working.",
  meta: "Free ways to find businesses without websites: four methods costed in hours, the free-tool limits published by each vendor, and where each one stops working.",
  category: "Lead Generation", cluster: "tools", hero: "nearby", mins: 8,
  tags: ["Prospecting", "Comparisons", "Tools"],
  body: [
    { type: "prose", text: [
      "There are genuinely free ways to find businesses without websites, and below about fifty leads a week they are the correct answer. Paying for tooling to build a list you could assemble in an afternoon is a way of feeling busy.",
      "What follows is each method costed honestly in hours, and the point at which it stops scaling. We sell a paid tool for this, so treat the last section as the interested party talking — the hours are not made up, though.",
    ]},

    { type: "h2", id: "manual", text: "1. Google Maps, by hand" },
    { type: "prose", text: [
      "Search a category and a city, then click each result and look for the website button. Absent means a lead.",
      "It works, it is completely free, and the published estimate — two to three hours for fifty leads — matches what we see. That is roughly **three minutes a lead**, and about a third of them will be duplicates or businesses you have already contacted once you are a few weeks in.",
      "It also has one advantage nothing else has: you are looking at the whole listing while you work. Photos, review text, opening hours. By the time you call, you know something about the business, which is a real head start.",
    ]},

    { type: "h2", id: "operators", text: "2. Search operators, for the Facebook-only ones" },
    { type: "prose", text: [
      "A different population, and a better one. Searching `site:facebook.com` alongside a category and city surfaces businesses whose only web presence is a page they do not own.",
      "These prospects rarely show up when you filter for \"no website\", because **a business that puts its Facebook page in the Maps website field counts as having a website.** They are also further along than a business with nothing: they have already accepted they need somewhere to send people and settled for rented ground.",
      "The limit is that you get a page, not a business record. No phone number, no rating, no address unless the page carries one, and no way to tell a business page from a personal one at a glance.",
    ]},

    { type: "h2", id: "directories", text: "3. Directories" },
    { type: "prose", text: [
      "Justdial, IndiaMART and Sulekha in India; Yelp and Yellow Pages elsewhere. Browse a category and read the website field on each listing.",
      "Two real problems. Listings are stale — directories rarely remove businesses that closed — and a directory profile is itself a kind of web presence, so an owner who pays for a Justdial listing often believes the question is settled. That is a harder conversation than a business with nothing at all, not an easier one.",
    ]},

    { type: "h2", id: "free-tiers", text: "4. Free tiers of the paid tools" },
    { type: "prose", text: [
      "Every tool in this category has a free allowance, and stacked together they will build a small list at no cost. The published limits at the time of writing:",
    ]},
    { type: "table", head: ["Tool", "Free allowance", "What runs out"], rows: [
      ["Prospea", "5 searches per hour, per IP", "Throughput — fine for a few dozen leads"],
      ["B2BLeadFinder", "7-day trial, 25 lead scans", "Time, then scans"],
      ["Origami", "1,000 credits, no card", "Credits, once"],
      ["Mantis", "Free credits on signup", "Credits, once"],
    ], note: "Vendor-published limits, ours included. They change; check before planning around one." },
    { type: "prose", text: [
      "Used in sequence these will get you to a hundred leads or so without paying anybody. That is a legitimate way to test whether this channel works for you before spending anything, and we would rather you did that than bought credits and discovered outbound is not for you.",
    ]},

    { type: "h2", id: "compare", text: "What each one actually costs" },
    { type: "table", head: ["Method", "Money", "Time for 100 leads", "Breaks at"], rows: [
      ["Maps by hand", "Free", "4–6 hours", "Weekly repetition"],
      ["Search operators", "Free", "2–4 hours", "No contact details"],
      ["Directories", "Free", "3–5 hours", "Stale and pre-objected"],
      ["Stacked free tiers", "Free", "1–2 hours", "Once, then it stops"],
      ["Paid tooling", "Metered", "Minutes", "Nothing, but it costs money"],
    ], note: "Time figures assume you are also recording phone numbers and ratings, not just names." },
    { type: "prose", text: [
      "The honest line is where the hours cross your own rate. Four hours a week at a ₹1,500 hourly rate is ₹6,000 of your time a month, which is more than most tooling in this category. Below that volume, free wins on every axis and you should use it.",
      "The other thing that changes with volume is re-checking. A hundred leads collected by hand are accurate the day you collect them and progressively wrong afterwards, and nobody re-checks a spreadsheet by hand. That is the job that stops being free first.",
    ]},

    { type: "leads", city: "kanpur", heading: "What the same search returns here" },

    { type: "cta", variant: "map", title: "Start with the free credits.",
      detail: "Enough to build a real list and find out whether this channel works for you. No card.",
      action: "Try it free", href: "/login" },
  ],
  faqs: [
    { q: "What is the best free way to find businesses without a website?", a: "Google Maps by hand for businesses with nothing at all, and a site:facebook.com search for the ones whose only presence is a Facebook page. The second group is invisible to no-website filters and is often further along in accepting they need something." },
    { q: "How long does it take to find leads manually?", a: "About three minutes a lead, or two to three hours for fifty, if you are recording phone numbers and ratings rather than just names. Expect roughly a third to be duplicates once you have been at it a few weeks." },
    { q: "Do free lead-finding tools have limits?", a: "All of them. Prospea allows five searches an hour per IP, B2BLeadFinder gives a 7-day trial with 25 scans, and Origami and Mantis both start you with credits that run out once. Stacked in sequence they will reach roughly a hundred leads free." },
    { q: "When should I stop doing this manually?", a: "When the hours cross your own rate. Four hours a week at ₹1,500 an hour is ₹6,000 a month of your time, which exceeds most tooling in this category. Below fifty leads a week, manual is genuinely the right answer." },
    { q: "Are directory listings a good source?", a: "They are free but weaker. Listings go stale because directories rarely remove closed businesses, and an owner paying for a Justdial or Yelp profile often considers the web presence question already settled — which is a harder conversation than one with a business that has nothing." },
  ],
  links: [["/resources/scraping-google-maps-for-leads-what-breaks", "why building it yourself is harder than it looks"], ["/resources/apollo-alternative-local-business-leads", "why B2B databases do not cover this"], ["/resources/qualifying-a-local-lead-before-you-call", "qualifying what you collect"]],
},

/* ───────────────────────────── 3 · territory */
{
  slug: "territory-planning-splitting-a-city-between-reps",
  title: "Territory Planning: Splitting a City Between Reps",
  excerpt: "Splitting the map in half is the obvious answer and it hands one rep twice the opportunity. What to split instead, using density you can measure before you assign anything.",
  meta: "Territory planning for a small agency: why splitting a city by area hands one rep twice the opportunity, and how to split by category and density instead.",
  category: "Lead Generation", cluster: "operations", hero: "network", mins: 8,
  tags: ["Operations", "Prospecting", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "The one principle worth importing from enterprise territory planning is that equal map area is not equal opportunity. Everything else written on the subject assumes twelve reps, a CRM and a quota model, and none of it survives contact with a three-person agency working one city.",
      "For a small team the useful version is short: split by density and category, not by geography, and measure the density before you assign anything.",
    ]},

    { type: "h2", id: "why-not-map", text: "Why splitting the map fails" },
    { type: "prose", text: [
      "North and south of the river feels fair because it is visibly symmetrical. Here is one city from our index — every area in Jaipur where we have checked more than thirty businesses:",
    ]},
    { type: "table", head: ["Area", "No website", "Checked", "Rate"], rows: [
      ["Mansarovar", "182", "410", "44.4%"],
      ["Vaishali Nagar", "102", "388", "26.3%"],
      ["Ashok Nagar", "75", "249", "30.1%"],
      ["Jagatpura", "69", "156", "44.2%"],
      ["Malviya Nagar", "64", "218", "29.4%"],
      ["Raja Park", "57", "132", "43.2%"],
      ["Sanganer", "53", "103", "51.5%"],
      ["Pratap Nagar", "37", "83", "44.6%"],
    ], note: "Businesses with a verified website check, by area, in a single city." },
    { type: "prose", text: [
      "Mansarovar alone holds more prospects than the bottom four areas combined, and the *rate* varies from 26.3% to 51.5% between neighbourhoods a twenty-minute drive apart. A rep who gets Mansarovar and a rep who gets Vaishali Nagar are not doing the same job, and by the end of the quarter one of them will look like a much better salesperson than the other for reasons that have nothing to do with either.",
      "Density and rate are separate problems, too. Vaishali Nagar has almost as many businesses checked as Mansarovar and far fewer prospects in them — high footfall, better-served market. Splitting on either number alone still gets it wrong.",
    ]},

    { type: "h2", id: "category", text: "Split by category first" },
    { type: "prose", text: [
      "The better first cut is not geographic at all, because the thing that actually varies between reps is what they can say.",
      "Within the same city, the gap by category swings harder than it does by area. In Jaipur: car repair at 66.7%, restaurants at 54.1%, sports academies at 51.6%, general retail at 47.1% — against consultants at 26.3%. And each of those needs a different opening, a different price and a different objection handled.",
      "A rep who spends a month exclusively on restaurants learns the Zomato objection cold, knows what a cake order is worth, and stops improvising. A rep covering \"everything south of the highway\" starts every call from scratch. **Category specialisation compounds; geographic coverage does not.**",
    ]},
    { type: "features", items: [
      { title: "Category", icon: "search", detail: "The primary split. It decides the script, the price band and the objections." },
      { title: "Density", icon: "map", detail: "The secondary split, once a category is too big for one person." },
      { title: "Walk-in areas", icon: "signal", detail: "Kept whole. Splitting a market street between two reps is how the same shop gets pitched twice." },
    ]},

    { type: "h2", id: "balance", text: "Balancing the split" },
    { type: "steps", items: [
      { title: "Count prospects, not businesses", icon: "score", detail: "Pull the number of businesses with no website per area and per category before assigning anything. An area with 400 businesses and a 26% gap is a smaller territory than one with 200 at 52%." },
      { title: "Assign categories, then split the big ones by area", icon: "search", detail: "Restaurants across the whole city is usually one person's job. If it is not, split it by area within the category rather than handing half the categories to each rep." },
      { title: "Keep walk-in clusters intact", icon: "map", detail: "Any market street, mandi or high street goes to one rep whole. This is the rule that prevents the worst failure mode, which is two of your people walking into the same shop in one week." },
      { title: "Re-balance quarterly, not never", icon: "calendar", detail: "Territories decay as they get worked. The rep who cleared Mansarovar has a harder next quarter than the one who is halfway through Sanganer, and that shows up as a performance problem if you do not go looking for it." },
    ]},

    { type: "h2", id: "second-city", text: "When to add a second city instead of a third rep" },
    { type: "prose", text: [
      "The question that follows a working split, and the answer is not obvious.",
      "A territory is finished when the businesses left in it are the ones you have already decided are not worth approaching — the sub-25-review businesses, the categories that cannot pay. That point arrives faster than people expect in a mid-sized city, because the addressable list was never the whole map.",
      "Adding a rep to a finished city splits a shrinking pool and both reps do worse. Adding a city gives you a fresh one at the same conversion rate, at the cost of travel and no walk-in option. **The signal to watch is contacted-versus-remaining in your best category**, not headcount or revenue — when the densest category in your best area is 80% contacted, you are choosing between a new city and a new vertical, and the new vertical is almost always cheaper.",
    ]},

    { type: "h2", id: "solo", text: "If it is just you" },
    { type: "prose", text: [
      "Same logic, applied to weeks instead of people. One category at a time, one dense area at a time, worked until it is genuinely finished rather than sampled.",
      "The mistake solo operators make is prospecting across the whole city at once, which means starting every call cold and never getting the compounding return of knowing one vertical properly. Pick the category, pick the two densest areas for it, and stay there until you have spoken to everybody worth speaking to.",
    ]},

    { type: "leads", city: "jaipur", heading: "Density in one city" },

    { type: "cta", variant: "map", title: "Count before you assign.",
      detail: "Prospect counts by area and category across {{cities}} cities — the numbers a territory split should be built on.",
      action: "Check your city", href: "/login" },
  ],
  faqs: [
    { q: "How should a small agency split a city between reps?", a: "By category first, then by density within a category that is too large for one person. Splitting the map geographically hands one rep far more opportunity than another — in Jaipur, area-level gap rates range from 26.3% to 51.5%." },
    { q: "Why is splitting a city geographically a bad idea?", a: "Because equal area is not equal opportunity. One Jaipur neighbourhood holds more prospects than the bottom four combined, so two reps on either side of a line are doing different jobs and one will look like a better salesperson for reasons unrelated to selling." },
    { q: "Should reps specialise by business type?", a: "Yes, and it is the strongest reason to split this way. A rep working only restaurants learns the objections, the price band and what a booking is worth, and stops improvising. Category specialisation compounds across calls in a way geographic coverage does not." },
    { q: "How do I stop two reps pitching the same business?", a: "Keep walk-in clusters whole. Any market street or high street goes to one rep entirely, regardless of how the rest of the split falls — this is the single rule that prevents the same shop being approached twice in a week." },
    { q: "How often should territories be rebalanced?", a: "Quarterly. Territories decay as they are worked, so a rep who has cleared a dense area faces a harder next quarter than one still halfway through theirs, and it will read as a performance problem if nobody is checking." },
  ],
  links: [["/resources/which-local-verticals-actually-pay-for-a-website", "picking the category to specialise in"], ["/resources/qualifying-a-local-lead-before-you-call", "qualifying within a territory"], ["/resources/how-many-local-businesses-have-no-website", "how much the rate varies by place"]],
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
