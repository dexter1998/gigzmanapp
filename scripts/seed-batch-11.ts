/**
 * Batch 11 — the India data reports. All three are first-party findings, and all three use the
 * live citytable block rather than pasted rows, because city figures move faster than anything
 * else in the corpus as scanning continues.
 *
 * The reviews question is the one worth flagging: it is a real research finding and it needed a
 * within-category control before it was publishable, because the naive comparison confounds size
 * with website ownership. It survives the control in all ten large shared categories, and the
 * rating equality is what makes it interesting rather than obvious.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · city ranking */
{
  slug: "which-indian-cities-have-the-biggest-website-gap",
  title: "Which Indian Cities Have the Biggest Website Gap",
  excerpt: "Morena runs at four in five. Bengaluru at one in four. The spread between Indian cities is wider than the spread between countries, and it decides where an agency should work.",
  meta: "Which Indian cities have the biggest website gap, measured from live listings: the ranked table, why tier-2 leads it, and what the spread means.",
  category: "Website Gaps", cluster: "data", hero: "methodology", mins: 9,
  tags: ["Original Data", "India", "Website Gaps"],
  body: [
    { type: "prose", text: [
      "The Indian cities with the biggest website gap are not the ones with the most businesses. Across the {{inChecked}} Indian businesses in our index, the rate ranges from **four in five in Morena to roughly one in four in Bengaluru** — a spread wider than the one between entire countries.",
      "Which makes the choice of city a bigger decision than the choice of vertical for most agencies, and it is one almost nobody makes deliberately.",
    ]},

    { type: "h2", id: "table", text: "The ranked table" },
    { type: "prose", text: [
      "Indian cities where we have checked at least four hundred businesses, ordered by the share with no website. This is read from the index each time the page is built rather than pasted in, so it moves as we scan:",
    ]},
    { type: "citytable", country: "in", min: 400, limit: 15, order: "gap",
      note: "Businesses with a verified website check. Cities below 400 checked are excluded — small samples move a great deal in this data." },
    { type: "prose", text: [
      "Two things stand out immediately. The top of the table is entirely tier-2 and smaller cities, and the gap in several of them is high enough that a single market street is a week of work.",
      "The other is how uneven the sampling looks: a city with 1,500 checked businesses and one with 6,700 are both on this list. That is a property of where we have scanned, not of the cities, and it is the main caveat on reading the ordering too precisely.",
    ]},

    { type: "h2", id: "metros", text: "What the metros look like" },
    { type: "prose", text: [
      "The bottom of the same list is exactly what you would expect, and it is worth stating so nobody plans a metro campaign on the assumption that this is untouched ground.",
      "Bengaluru sits around 26%, Mumbai around 28%, Delhi around 29%. Those are still large absolute numbers — a quarter of five thousand checked businesses is a lot of prospects — but the businesses are bigger, better served and more likely to have been approached by somebody already.",
      "The practical difference is what you are selling. In Morena or Kota you are mostly selling a first website. In Bengaluru you are mostly selling a redesign, competing with an incumbent and a known previous price. Same product, different sale.",
    ]},

    { type: "h2", id: "why", text: "Why the smaller cities run higher" },
    { type: "prose", text: [
      "Three things, and they compound.",
      "**Fewer agencies.** A metro has hundreds of web shops working the same map. A tier-2 city has a handful, and the businesses there have often never been pitched by anyone.",
      "**Different customer expectations.** A shop whose customers all live within two kilometres has never lost a visible sale to not being findable, so nothing forced the question. Nobody walked in and said they nearly went elsewhere because they could not find a website.",
      "**Directory habit.** Where a JustDial or IndiaMART listing is the norm, the web-presence question feels answered — and it is answered, in a way that costs them monthly and that they do not own.",
      "None of those is about affordability, which is the usual assumption. The businesses at the top of that table include hardware suppliers and clothing stores with substantial turnover.",
    ]},

    { type: "h2", id: "caveats", text: "What this table is not" },
    { type: "prose", text: [
      "It is our index, not a census. A city we have not scanned deeply appears low or not at all, and that says nothing about the city.",
      "It also counts a business as having a website whenever there is anything in the listing's website field — including a Facebook page, a directory profile or a dead domain. **Every rate here is therefore conservative**, and the real first-website opportunity in each city is larger than the number shown.",
      "Finally, a city-level rate hides enormous variation inside the city. Neighbourhood-level gaps within a single city range from the mid twenties to above fifty percent, which matters more for planning an actual week of work than the city figure does.",
    ]},

    { type: "leads", city: "kota", heading: "What the top of the table looks like" },

    { type: "h2", id: "use", text: "How to use it" },
    { type: "checklist", items: [
      { title: "Pick the city before the vertical", detail: "A 26% market and a 64% market are different businesses, not different territories." },
      { title: "Check your own city first", detail: "Travel costs are real and walk-ins are the strongest channel. A slightly worse rate nearby usually beats a better one four hours away." },
      { title: "Then go one level down", detail: "Within a chosen city, the neighbourhood spread is as wide as the city spread. Work the dense areas, not the map." },
      { title: "Read the rate as a floor", detail: "Social-only and directory-only businesses are counted as served, so the real opportunity is above the number." },
    ]},

    { type: "cta", variant: "map", title: "Check the city you can actually reach.",
      detail: "Gap rates by city and by area across {{cities}} cities, read from live listings.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "Which Indian city has the biggest website gap?", a: "Morena, at close to four in five businesses with no website across roughly 1,500 checked, followed by Kota and Kanpur above 60%. The top of the table is entirely tier-2 and smaller cities." },
    { q: "What is the website gap in Indian metros?", a: "Considerably lower — around 26% in Bengaluru, 28% in Mumbai and 29% in Delhi. The absolute numbers are still large, but you are mostly selling redesigns there rather than first websites." },
    { q: "Why do smaller Indian cities have more businesses without websites?", a: "Fewer agencies working the market, customers who live close enough that nothing ever forced the question, and a strong directory habit that makes the web-presence question feel already answered. Affordability is rarely the reason." },
    { q: "Are these city gap figures accurate?", a: "They are our index rather than a census, and they are deliberately conservative: a business counts as having a website if there is anything in its listing's website field, including a Facebook page or a dead domain. The real first-website opportunity is larger." },
    { q: "Should I target a city with a higher gap even if it is far away?", a: "Usually not. Walking in is the strongest channel for local business, and travel eats the advantage quickly. A slightly lower rate in a city you can work on foot generally beats a better rate four hours away." },
  ],
  links: [["/resources/how-many-local-businesses-have-no-website", "the global picture"], ["/resources/tier-1-vs-tier-2-india-website-gap", "whether tier-2 is actually the better market"], ["/resources/territory-planning-splitting-a-city-between-reps", "working a city once you have picked one"], ["/resources/which-local-verticals-actually-pay-for-a-website", "picking the vertical inside it"]],
},

/* ───────────────────────────── 2 · reviews research */
{
  slug: "do-businesses-without-websites-get-fewer-reviews",
  title: "Do Businesses Without Websites Get Fewer Reviews?",
  excerpt: "Yes — dramatically, and it holds inside every large category we tested. Their ratings are identical, though, and that second finding is the one that matters.",
  meta: "Do businesses without websites get fewer reviews? Measured across Indian listings: 3x fewer at the median, identical ratings, and what that means.",
  category: "Website Gaps", cluster: "data", hero: "methodology", mins: 9,
  tags: ["Original Data", "Website Gaps", "Market Research"],
  body: [
    { type: "prose", text: [
      "Yes, and the difference is larger than we expected. Across Indian businesses in our index, those with a website carry a **median of 120 Google reviews against 36 for those without** — more than three times as many. On the mean it is 630 against 222.",
      "The more interesting finding is the second one: **their ratings are effectively identical.** 4.71 against 4.61 overall, and within individual categories the difference frequently vanishes entirely.",
    ]},

    { type: "h2", id: "control", text: "Controlling for the obvious objection" },
    { type: "prose", text: [
      "The naive comparison is worthless on its own, because category confounds it. Restaurants collect thousands of reviews and tailors collect dozens, and restaurants are more likely to have websites, so a raw average could show this effect without anything real underneath it.",
      "So the same comparison, inside single categories, using only categories where we have at least 150 businesses on both sides:",
    ]},
    { type: "table", head: ["Category", "Avg reviews — has site", "Avg reviews — no site", "Ratio"], rows: [
      ["Clothing store", "1,265", "167", "7.6×"],
      ["Beauty salon", "835", "229", "3.6×"],
      ["Hardware store", "174", "37", "4.7×"],
      ["General store", "690", "263", "2.6×"],
      ["Laundry", "114", "46", "2.5×"],
      ["Consultant", "139", "69", "2.0×"],
      ["Manufacturer", "173", "91", "1.9×"],
      ["Service business", "194", "105", "1.8×"],
      ["Educational institution", "285", "222", "1.3×"],
      ["Sports academy", "131", "95", "1.4×"],
    ], note: "Indian businesses with a verified website check, in categories with 150+ businesses on both sides." },
    { type: "prose", text: [
      "It holds in all ten. The size of the effect varies a lot — clothing stores show a 7.6× difference and educational institutions only 1.3× — but the direction never reverses.",
    ]},

    { type: "h2", id: "causation", text: "What fewer reviews does not prove" },
    { type: "prose", text: [
      "It does not show that building a website gets a business more reviews, and anyone selling you that claim is overreaching. At least three explanations fit this data equally well.",
      "**Size drives both.** A larger business has more customers, so more reviews, and more reason and budget to have built a site. The website is a symptom of scale rather than a cause of anything.",
      "**Disposition drives both.** An owner who invested in being findable is the same owner who asks customers to leave a review. One habit, two visible outputs.",
      "**The site genuinely helps.** A website gives another surface to point people at, and businesses that have one often run the follow-up habits that generate reviews.",
      "Our data cannot separate these, and honestly, neither can anybody else's without an experiment nobody has run. What we can say is that the correlation is strong, consistent, and survives the obvious control.",
    ]},

    { type: "h2", id: "ratings", text: "The finding that actually matters" },
    { type: "prose", text: [
      "Ratings barely move. Within the same categories: service businesses 4.77 with a site against 4.74 without, consultants 4.81 against 4.84, educational institutions 4.79 against 4.79, clothing stores 4.60 against 4.61.",
      "In two of those, the businesses without websites rate *higher*.",
      "Which rules out the most convenient explanation available to anyone selling websites — that the businesses without them are simply worse businesses. **They are not.** Their customers are exactly as happy. They are serving fewer of them, or serving them with less of a public trail.",
      "That is the single most useful sentence in this whole dataset for anybody prospecting: you are not calling failing businesses. You are calling good businesses that fewer people know about.",
    ]},
    { type: "quote", text: "Same ratings, a third of the reviews. They are not worse — they are less visible.", attribution: "The finding, in one line" },

    { type: "h2", id: "benchmark", text: "What counts as a lot of reviews with no website" },
    { type: "prose", text: [
      "The practical version of this finding is a benchmark, because \"a lot of reviews\" means nothing without a category attached. A hardware store with 90 reviews is exceptional. A restaurant with 90 is unremarkable.",
      "These are the no-website averages by category from the table above, which is the number a prospect should be measured against rather than some general idea of what a busy business looks like:",
    ]},
    { type: "table", head: ["Category", "Typical with no website", "Unusual above"], rows: [
      ["Hardware store", "37", "80"],
      ["Laundry", "46", "100"],
      ["Consultant", "69", "150"],
      ["Sports academy", "95", "200"],
      ["Service business", "105", "220"],
      ["Clothing store", "167", "350"],
      ["Educational institution", "222", "450"],
      ["Beauty salon", "229", "480"],
      ["General store", "263", "550"],
    ], note: "\"Unusual above\" is roughly twice the category's no-website average — demand well ahead of visibility." },
    { type: "prose", text: [
      "A business sitting in the right-hand column is the strongest profile in this whole dataset: proven demand, no web presence, and rated as well as the competitors who have one. Those are worth calling first.",
    ]},

    { type: "h2", id: "use", text: "What to do with it" },
    { type: "prose", text: [
      "Two practical uses, one for prospecting and one for the conversation.",
      "**For prospecting**, it explains why the review-count filter works so well. A business with no website and a review count well above its category's no-website average is unusual — it has demand without visibility, which is precisely the profile that converts.",
      "**In the conversation**, it is worth being careful. Do not tell an owner that a website will get them more reviews, because the data does not support that and they will hold you to it. What you can say honestly is the observation itself: businesses like theirs, rated exactly as well as they are, are being found by three times as many people. That is true, checkable and does not promise anything you cannot deliver.",
    ]},

    { type: "leads", city: "indore", heading: "Good businesses, fewer people know" },

    { type: "cta", variant: "map", title: "Find demand without visibility.",
      detail: "Filter by review count and rating to find businesses performing well above their category's no-website norm.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "Do businesses without websites get fewer Google reviews?", a: "Yes, substantially. Across Indian businesses in our index, those with a website carry a median of 120 reviews against 36 without — more than three times as many — and the gap holds inside every large category we tested." },
    { q: "Does building a website increase Google reviews?", a: "The data does not show that. Size could drive both, an owner's disposition could drive both, or the site could genuinely help — no dataset separates those without an experiment. The correlation is strong and consistent; the causation is unproven." },
    { q: "Are businesses without websites lower quality?", a: "No. Ratings are effectively identical — 4.77 versus 4.74 for service businesses, 4.79 versus 4.79 for educational institutions — and in some categories the businesses without websites rate slightly higher. They are as good, just less visible." },
    { q: "Which category shows the biggest review gap?", a: "Clothing stores, at 7.6× — 1,265 average reviews with a website against 167 without. Educational institutions show the smallest at 1.3×, which fits a category where people choose on reputation rather than search." },
    { q: "Can I tell a prospect a website will get them more reviews?", a: "Not honestly. What you can say is the observation itself: businesses in their category, rated exactly as well as they are, are being found by three times as many people. That is checkable and promises nothing you cannot deliver." },
  ],
  links: [["/resources/how-many-local-businesses-have-no-website", "the gap this sits alongside"], ["/resources/qualifying-a-local-lead-before-you-call", "using review counts to qualify"], ["/resources/which-local-verticals-actually-pay-for-a-website", "categories ranked by gap and demand"]],
},

/* ───────────────────────────── 3 · tier comparison */
{
  slug: "tier-1-vs-tier-2-india-website-gap",
  title: "Tier-1 vs Tier-2 India: The Website Gap Compared",
  excerpt: "Tier-2 has half again as many prospects. Tier-1 businesses are twice the size. Everything about which one to work follows from that trade, including the answer for most people.",
  meta: "Tier-1 vs tier-2 India website gap compared: 32.9% against 49.8%, why tier-1 businesses are larger, and which market is actually better to sell websites in.",
  category: "Website Gaps", cluster: "data", hero: "methodology", mins: 9,
  tags: ["Original Data", "India", "Market Research"],
  body: [
    { type: "prose", text: [
      "Tier-2 India has a far bigger website gap and tier-1 India has far bigger businesses, and those two facts pull in opposite directions.",
      "Measured across the Indian businesses in our index: **tier-1 cities and the NCR run at 32.9% with no website; tier-2 and smaller cities run at 49.8%.** That is a seventeen-point difference, and it is the single largest structural split in the Indian data.",
      "The counterweight is on the same row of the same query. Tier-1 businesses average 644 Google reviews. Tier-2 businesses average 273.",
    ]},

    { type: "h2", id: "split", text: "The website gap, compared" },
    { type: "table", head: ["", "Tier-1 and NCR", "Tier-2 and below"], rows: [
      ["Businesses checked", "50,165", "48,344"],
      ["No website", "16,485", "24,078"],
      ["Gap rate", "32.9%", "49.8%"],
      ["Average reviews", "644", "273"],
      ["What you mostly sell", "Redesigns", "First websites"],
      ["Competing agencies", "Many", "Few"],
    ], note: "Tier-1 defined as Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad and the NCR." },
    { type: "prose", text: [
      "Roughly equal sample sizes on both sides, which is unusual and makes the comparison unusually clean.",
    ]},

    { type: "h2", id: "trade", text: "What the trade actually is" },
    { type: "prose", text: [
      "It is not really about the gap. It is about which problem you would rather have.",
      "**In tier-2 you have more prospects and a harder sale per rupee.** The businesses are smaller, the tickets are smaller, and more of them will genuinely not need a website. You win on volume and on the fact that half the market has never been pitched.",
      "**In tier-1 you have fewer first-website prospects and a much larger ticket.** A business with 644 reviews has real revenue and can justify ₹50,000 without flinching. You are competing with everyone, and you are usually replacing something rather than starting from nothing.",
      "The 644-to-273 review difference is the honest counterweight to the gap figure, and most of the enthusiasm for tier-2 that you will read skips it entirely.",
    ]},

    { type: "h2", id: "answer", text: "Which is better" },
    { type: "prose", text: [
      "For most people reading this, **the city you already live in**, and the reason is boring and decisive: walking in is the strongest channel in this market, and it requires being there.",
      "A 49.8% gap four hours away is worse than a 32.9% gap you can reach on a scooter, because the channel that converts best is the one that needs you physically present. Travel also destroys the economics on a ₹25,000 ticket faster than any gap rate improves them.",
      "Where the tier question genuinely bites is when you have a real choice — you are in the NCR and could work Faridabad instead of Gurugram, or you are in a metro deciding whether to open a second territory. Then the answer is that tier-2 is the better *expansion*, not the better base: work your own city first, and use the tier-2 gap when your home market's best category is largely contacted.",
    ]},
    { type: "features", items: [
      { title: "If you are in a tier-2 city", icon: "map", detail: "Work it hard. You have a market with a 50% gap and almost no competition, and you are already there." },
      { title: "If you are in a metro", icon: "search", detail: "Sell redesigns and larger tickets locally before travelling for a better rate on a smaller job." },
      { title: "If you are expanding", icon: "signal", detail: "The nearest tier-2 city, not the highest-gap one. Reachability beats rate every time on this ticket size." },
    ]},

    { type: "h2", id: "delivery", text: "Delivery differs, not just the sale" },
    { type: "prose", text: [
      "The part nobody plans for. The two markets behave differently after the contract, and it changes what the same rupee figure is worth to you.",
      "**Content arrives slower in tier-2.** A first-time buyer has never assembled photographs, descriptions and prices for anything, and the project stalls there rather than in the build. That is the argument for a hard content deadline in writing and for a smaller first scope you can actually finish.",
      "**Expectations are clearer in tier-1.** A metro business that has had two previous websites knows what a revision round is and what it is not. A first-time buyer often does not distinguish between a change and a new project, which is exactly why counted revision rounds matter more at the smaller end.",
      "**Payment behaviour is better than the stereotype in both**, provided the advance is taken properly and the final payment lands before launch. Where it goes wrong is the same everywhere: work started without an advance, and a balance chased after go-live.",
    ]},

    { type: "h2", id: "verticals", text: "The verticals differ too" },
    { type: "prose", text: [
      "The tier split is not uniform across categories, and this is where the planning gets useful.",
      "Categories built on proximity — hardware, laundry, convenience, tailoring — carry very high gaps in tier-2 because their customers are local by definition and nothing ever forced the question. Categories where customers travel or compare — coaching institutes, clinics, event venues — carry gaps in both, because the customer researches regardless of city size.",
      "So the practical version is: **in tier-2, sell to the proximity businesses. In tier-1, sell to the businesses whose customers compare.** That inverts the usual advice to pick one vertical and work it everywhere.",
    ]},

    { type: "leads", city: "faridabad", heading: "A tier-2 market inside the NCR" },

    { type: "cta", variant: "map", title: "Compare the two markets you can reach.",
      detail: "Gap rates for every indexed city, read live, so the comparison is your actual options.",
      action: "Compare cities", href: "/login" },
  ],
  faqs: [
    { q: "What is the website gap in tier-2 Indian cities?", a: "49.8% across the tier-2 and smaller cities in our index, against 32.9% in tier-1 cities and the NCR. That seventeen-point difference is the largest structural split in the Indian data." },
    { q: "Is tier-2 India a better market for web design?", a: "It has more prospects and smaller ones. Tier-1 businesses average 644 Google reviews against 273 in tier-2, so the tickets are larger there. Tier-2 wins on volume and lack of competition; tier-1 wins on revenue per client." },
    { q: "Should I travel to a tier-2 city to sell websites?", a: "Usually not. Walking in is the strongest channel and it needs you physically present, and travel destroys the economics of a ₹25,000 ticket faster than a better gap rate improves them. Tier-2 is a good expansion, not a good base." },
    { q: "Which verticals should I target in tier-2 versus tier-1?", a: "In tier-2, proximity businesses — hardware, laundry, tailoring — where customers are local by definition and nothing forced the question. In tier-1, businesses whose customers compare before choosing, like coaching institutes and clinics." },
    { q: "How is tier-1 defined in this comparison?", a: "Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad and the NCR including Gurugram and Noida. Everything else in the Indian index is counted as tier-2 and below." },
  ],
  links: [["/resources/which-indian-cities-have-the-biggest-website-gap", "the city-by-city table"], ["/resources/how-many-local-businesses-have-no-website", "the same measurement globally"], ["/resources/territory-planning-splitting-a-city-between-reps", "working the city you pick"], ["/resources/which-local-verticals-actually-pay-for-a-website", "the vertical ranking"]],
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
