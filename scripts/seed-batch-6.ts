/**
 * Batch 6 — the ranking hub, the qualifying checks, and the price objection.
 *
 * SERP checks first:
 *  · "best niches for a web design agency" is a settled genre — TheBlueprint, Synup, SEOProspects,
 *    Reapify, Adzeem, WebLeadr all rank verticals by ticket size and lifetime value (dentists at
 *    $3,000–15,000 a patient, HVAC at $15,000 LTV, roofing at $8,000–15,000 a job) and not one of
 *    them checks whether those businesses already have a website. Our data says they overwhelmingly
 *    do — dentists at 7.6% without — which makes the whole genre answerable with evidence.
 *  · Lead qualification: page one is Oracle CRM documentation and generic B2B process. Nothing
 *    local, nothing about what you can check before dialling.
 *  · "Too expensive": a mature SERP — HubSpot, Sandler, Close, SBI — and the advice is sound
 *    (diagnose rather than defend, trade rather than discount, unbundle transparently). Nothing to
 *    contradict, so this post carries that framing into a market they never write about, with the
 *    unbundling ladder made concrete in rupees.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · the ranking hub */
{
  slug: "which-local-verticals-actually-pay-for-a-website",
  title: "Which Local Verticals Actually Pay for a Website — Ranked",
  excerpt: "Every niche list ranks verticals by what a customer is worth and never checks whether those businesses already have a site. We checked. Dentists are 7.6%.",
  meta: "Which local verticals actually pay for a website, ranked by gap, demand evidence and ticket size — and why every published niche list picks served markets.",
  category: "Website Gaps", cluster: "data", hero: "methodology", mins: 11,
  tags: ["Data", "Vertical Playbook", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Ask which local verticals actually pay for a website and every published answer ranks them the same way: by what one customer is worth. Dentists, because an implant patient is worth thousands. Roofing, because a job is worth thousands. HVAC, because it has no dead month.",
      "All of that is true and none of it answers the question, because it never asks whether those businesses already have a website. We check that for a living. **7.6% of dentists do not.** The most recommended niche in the genre is 92.4% served.",
    ]},

    { type: "h2", id: "recommended", text: "What the niche lists recommend, checked" },
    { type: "prose", text: [
      "These are the categories that appear on essentially every agency niche list, with the share of each that has no website at all in our index:",
    ]},
    { type: "table", head: ["Recommended niche", "Checked", "No website"], rows: [
      ["Dentist", "2,321", "7.6%"],
      ["Moving company", "898", "10.5%"],
      ["Real estate agency", "3,159", "10.9%"],
      ["Accounting practice", "1,874", "12.1%"],
      ["Spa", "1,756", "13.6%"],
      ["Roofing contractor", "1,464", "13.6%"],
      ["Lawyer", "2,554", "15.5%"],
      ["Doctor", "1,647", "19.2%"],
      ["Veterinary clinic", "2,432", "21.5%"],
      ["Beauty salon", "6,659", "29.9%"],
    ], note: "Businesses with a verified website check. The lists are not wrong about ticket size — they are silent on availability." },
    { type: "prose", text: [
      "Read that as a market map rather than a criticism. Selling into a dentist market means selling a **redesign**, competing against an incumbent site, a known previous invoice, and every other agency reading the same listicle. That is a real business, and it is a completely different sale from the one most people picking a niche think they are entering.",
      "The two exceptions worth noting are plumbers at 39.4% and electricians at 38.7%. The trades genuinely do carry the gap the lists claim for them — they are the only recommendation in the genre our data supports.",
    ]},

    { type: "h2", id: "three", text: "Three things decide whether a vertical pays" },
    { type: "prose", text: [
      "Ticket size is one of them, not all of them. A vertical is worth working when all three of these hold at once.",
    ]},
    { type: "features", items: [
      { title: "Availability", icon: "verified", detail: "What share has no website. Below roughly 20% you are selling redesigns into a served market." },
      { title: "Evidence of demand", icon: "data", detail: "Review count. It is the only public proof that a business has customers and money moving through it." },
      { title: "Ticket size", icon: "score", detail: "What one customer is worth to them over a year, which is what sets your price ceiling." },
    ]},
    { type: "prose", text: [
      "Review count is the one people skip, and it is the one that separates a large prospect list from a payable one. It is public, it is on the same listing as the website field, and it costs nothing to filter on.",
    ]},

    { type: "h2", id: "trap", text: "The trap at the top of the gap table" },
    { type: "prose", text: [
      "Rank purely by gap and you get a list of businesses that cannot pay you. These are the highest-gap categories we measure at scale, with what else is on the listing:",
    ]},
    { type: "table", head: ["Category", "No website", "Avg reviews", "Avg rating"], rows: [
      ["Convenience store", "51.8%", "11", "3.62"],
      ["Laundry", "43.6%", "36", "4.31"],
      ["Tailor", "59.4%", "48", "4.51"],
      ["Hardware store", "50.2%", "51", "4.28"],
      ["Grocery store", "64.1%", "57", "4.08"],
    ], note: "High gap, thin evidence of demand. Availability without customers is not an opportunity." },
    { type: "prose", text: [
      "Convenience stores are the clearest case. Half of them have nothing, and the average one carries **eleven reviews and a 3.62 rating** — the lowest of any category we track. That is not a business with a website problem. Eleven reviews means almost nobody has ever thought about this shop long enough to rate it, and a website will not change that.",
      "Tailoring is the interesting middle: a 59.4% gap against 48 reviews, which is why that vertical splits so sharply between boutiques worth approaching and alterations counters that are not.",
    ]},

    { type: "h2", id: "sweet-spot", text: "Where the gap and the money overlap" },
    { type: "prose", text: [
      "Filter for both — a gap above 30% and an average review count above 150 — and the list looks nothing like a published niche list:",
    ]},
    { type: "table", head: ["Category", "Checked", "No website", "Avg reviews"], rows: [
      ["South Indian restaurant", "251", "47.8%", "4,987"],
      ["North Indian restaurant", "639", "45.7%", "2,303"],
      ["Vegetarian restaurant", "257", "63.8%", "1,650"],
      ["Electronics store", "2,125", "30.7%", "1,110"],
      ["Sporting goods store", "1,549", "37.8%", "623"],
      ["Restaurant (general)", "3,588", "34.4%", "609"],
      ["Cell phone store", "2,437", "38.4%", "334"],
      ["Swimming facility", "1,017", "44.0%", "300"],
      ["Auto parts store", "259", "49.8%", "282"],
    ], note: "Both conditions met: real availability, and demonstrable customer volume." },
    { type: "prose", text: [
      "Restaurants dominate the top of it, and the review counts are extraordinary — a South Indian restaurant in our index averages close to five thousand Google reviews and nearly half of them have no website. That is a business with more public demand than most dentists and less web presence than most tailors.",
      "Electronics and cell phone stores are the quiet entry on this list. High footfall, high review counts, a third with nothing, and they appear on no niche list anywhere because nobody publishing those lists has checked.",
    ]},

    { type: "h2", id: "ranked", text: "The ranked list" },
    { type: "prose", text: [
      "Scoring availability, demand evidence and ticket size together, in the order we would actually work them:",
    ]},
    { type: "table", head: ["#", "Vertical", "Why it ranks here"], rows: [
      ["1", "Restaurants and food", "34–64% gap with the highest review counts in the index. Multiple sub-categories to work."],
      ["2", "Coaching and education", "Real gap, high annual ticket, and a parent who researches before choosing."],
      ["3", "Hardware and trade supply", "50.2% gap, contractor customers, and a care plan that sells itself because prices move."],
      ["4", "Electronics and phone stores", "30–38% gap against 300–1,100 average reviews. Nobody is pitching them."],
      ["5", "Sports academies and clubs", "31.9% gap, 4.84 average rating, and an admission window that creates urgency."],
      ["6", "Plumbers and electricians", "The only listicle recommendation our data supports — 39.4% and 38.7%."],
      ["7", "Bakeries and cafes", "28% gap, but it concentrates cleanly in the 50–199 review band."],
      ["8", "Boutiques (not alterations)", "Widest gap on the board, lowest ticket. Workable at volume with care plans."],
    ], note: "Ordering assumes an agency selling first websites. Reverse it if you sell redesigns." },

    { type: "leads", city: "jaipur", heading: "Businesses with no website near you" },

    { type: "h2", id: "method", text: "How these numbers are produced" },
    { type: "prose", text: [
      "Every figure above comes from businesses we have checked directly rather than from a purchased database. The website field is read from the business's own Google listing at the time of the check, and when a later enrichment reveals a site we did not know about, the record is corrected so the gap figures do not drift upward.",
      "Two caveats worth stating plainly. **A business that puts its Facebook page in the website field counts as having a website**, which means these gap figures are conservative rather than generous. And a category with fewer than 250 checked businesses is excluded from the ranked tables here, because small samples in this dataset move a great deal.",
    ]},

    { type: "cta", variant: "map", title: "Check your own city against this.",
      detail: "Category rates vary widely by city — the ranked list is national, your territory is not.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "What is the best niche for a web design agency?", a: "By availability and demand together, restaurants and food businesses — a 34–64% gap depending on sub-category, against the highest review counts in our index. Every published niche list picks dentists, legal and roofing, which are 7.6%, 15.5% and 13.6% without a website respectively." },
    { q: "Are dentists a good web design niche?", a: "Only if you sell redesigns. 92.4% of the 2,321 dentists in our index already have a website, so you are competing against an incumbent site and a known previous invoice rather than selling a first website." },
    { q: "Why not just target the highest-gap categories?", a: "Because the top of that table cannot pay. Convenience stores are 51.8% without a website and average eleven reviews and a 3.62 rating — availability with no evidence of customers is not an opportunity." },
    { q: "How many reviews should a prospect have?", a: "Enough to prove customers exist. Under about 25 reviews the business is usually too small to pay; the useful band is category-dependent, and for food businesses the gap concentrates sharply between 50 and 199." },
    { q: "Do these gap rates vary by city?", a: "Considerably. National category rates are a starting point, not a territory plan — tailoring runs at 98.6% in Kanpur against 59.4% nationally, and food and drink in Glasgow runs well above the UK average of 17.0%." },
  ],
  links: [["/resources/which-business-types-least-likely-to-have-a-website", "the full category breakdown"], ["/resources/how-to-sell-websites-to-restaurants", "the restaurant playbook"], ["/resources/how-to-sell-websites-to-tailors", "the boutique-versus-alterations split"], ["/resources/how-to-sell-websites-to-sports-academies", "the academy playbook"], ["/resources/qualifying-a-local-lead-before-you-call", "qualifying an individual business"]],
},

/* ───────────────────────────── 2 · qualifying */
{
  slug: "qualifying-a-local-lead-before-you-call",
  title: "Qualifying a Local Lead Before You Call: 4 Checks",
  excerpt: "Four things you can verify from a Google listing in under a minute, what each one actually tells you, and the one thing none of them can.",
  meta: "Qualifying a local lead before you call: four checks you can run from a Google listing in a minute, and what none of them can tell you about a business.",
  category: "Lead Generation", cluster: "operations", hero: "leads", mins: 8,
  tags: ["Prospecting", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Qualifying a local lead before you call takes about a minute and removes most of the calls that were never going to go anywhere. All four checks below read off the same Google listing you found the business on.",
      "The generic advice on this — put a qualification form on your site, ask better discovery questions — assumes an inbound lead who has already raised a hand. Prospecting outbound into local businesses is the opposite situation, and it needs checks you can run before anybody has spoken to you.",
    ]},

    { type: "h2", id: "check-1", text: "Check 1 — is the gap actually real" },
    { type: "prose", text: [
      "The website field on a Google listing is the source of the claim you are about to make, so it is worth knowing how it fails.",
      "It goes stale in both directions. A business that built a site last month may not have added it, and a business whose site died two years ago may still have the old URL listed. Before you tell someone they have no website, load whatever is in that field. **A dead domain is a better opening than an empty one** — \"your site has been down since last year\" is a specific, verifiable problem.",
      "The other failure mode matters more. **A business that put its Facebook page in the website field counts as having a website.** So does a link to a Justdial listing, an IndiaMART page, or a Linktree. Those businesses do not show up when you filter for no website, and they are frequently better prospects than the ones that do — they have already decided they need somewhere to send people, and they settled for a page they do not own.",
    ]},
    { type: "tip", title: "The thirty-second version",
      text: "Open the website field. Nothing there is one conversation. A dead domain is a better one. A facebook.com URL is the best of the three, and it is invisible to anyone filtering on the field alone." },

    { type: "h2", id: "check-2", text: "Check 2 — review count, read as a band" },
    { type: "prose", text: [
      "Review count is the only public evidence that a business has customers, and it should be read as a band rather than a number.",
      "**Under 25.** Too small, too new, or not really trading. Whatever the gap, there is usually no budget behind it.",
      "**25 to 200.** The band where the gap concentrates. Across bakeries, cafes and coffee shops, businesses with 50 to 199 reviews run at 37.2% with no website, against 25.3% for those under 50 and 23.4% for those above 500. Proven, busy, still on a listing alone.",
      "**Above 500.** Either well-served already or a chain. Worth checking, not worth building a list from.",
    ]},
    { type: "table", head: ["Reviews", "What it usually means", "Worth a call"], rows: [
      ["Under 25", "Too small or too new to have a budget", "No"],
      ["25–200", "Trading, proven, frequently invisible", "Yes — this is the list"],
      ["200–500", "Established, may already have something", "Yes, check first"],
      ["500+", "Well-known, often a chain or franchise", "Rarely worth prospecting"],
    ]},

    { type: "h2", id: "check-3", text: "Check 3 — the rating, as a disqualifier" },
    { type: "prose", text: [
      "Rating does not tell you a business is good. It tells you whether a website is the problem it currently has.",
      "Below roughly 4.0, something else is wrong — service, quality, or a dispute playing out in the reviews — and no website fixes it. You will also find that owner is not in a buying mood. The convenience store category averages a 3.62 rating alongside a 51.8% website gap, and it is one of the least productive categories to work for exactly that reason.",
      "Above 4.5 with a decent review count is the opposite situation and the strongest signal on the listing: **a business people demonstrably like, with nowhere for that to be visible.** Sports academies average 4.84 and nearly a third have no site at all.",
    ]},

    { type: "h2", id: "check-4", text: "Check 4 — what one customer is worth" },
    { type: "prose", text: [
      "This is the check that sets your price before you have quoted anything, and it is a judgement rather than a number on the listing.",
      "Estimate what one additional customer is worth to this business over a year. A convenience store: a few hundred rupees. A restaurant: a few thousand. A coaching institute or a sports academy: twenty-five to forty thousand, because it is an annual fee. A hardware supplier with contractor accounts: potentially more than any of them.",
      "That figure, not the page count, is what the site is worth to them — and it tells you whether this is a ₹12,000 conversation or a ₹45,000 one before you pick up the phone.",
    ]},
    { type: "checklist", items: [
      { title: "Website field", detail: "Empty, dead, or a social page. All three are openings; only one is visible to a filter." },
      { title: "Review count", detail: "25 to 200 is the band. Under 25, move on." },
      { title: "Rating", detail: "Below 4.0 means their problem is not the website." },
      { title: "Annual customer value", detail: "Sets your quote before the first call." },
    ]},

    { type: "h2", id: "limits", text: "What these checks cannot tell you" },
    { type: "prose", text: [
      "Worth being straight about, because a qualification process that pretends to certainty produces confident calls to the wrong people.",
      "None of this tells you whether the owner is reachable, whether there is a nephew who \"does computers\", whether the business is being sold, or whether they were burned by an agency two years ago and will not discuss it. Those come out in the first ninety seconds of the conversation and cannot be checked in advance.",
      "What the four checks do is make sure the ninety seconds is spent on a business that has customers, has money, and has a gap you can describe accurately. That is the whole job.",
    ]},

    { type: "leads", city: "gurgaon", heading: "Businesses that pass these checks" },

    { type: "cta", variant: "map", title: "Filter before you dial.",
      detail: "Search by category and city, then narrow by review count and rating before anyone picks up a phone.",
      action: "Try it on your city", href: "/login" },
  ],
  faqs: [
    { q: "How do I qualify a local business lead before calling?", a: "Four checks off the Google listing: load the website field to see whether the gap is real, read the review count as a band, use the rating as a disqualifier below 4.0, and estimate what one customer is worth to them over a year." },
    { q: "How many Google reviews should a prospect have?", a: "Between 25 and 200 for most categories. Under 25 there is usually no budget; above 500 the business is typically well-served or a chain. In food businesses the 50–199 band runs at 37.2% with no website against 23.4% above 500." },
    { q: "Should I skip businesses with low ratings?", a: "Below about 4.0, yes. A low rating means the business has a problem a website will not fix, and the owner is rarely in a buying mood. Convenience stores average 3.62 alongside a 51.8% website gap and are among the least productive categories to work." },
    { q: "Does a Facebook page count as having a website?", a: "In the Google listing's website field, yes — which makes those businesses invisible to a no-website filter. They are often better prospects, because they have already decided they need somewhere to send people and settled for a page they do not own." },
    { q: "What if the website in the listing is dead?", a: "That is a stronger opening than an empty field. \"Your site has been down since last year\" is specific and verifiable, and it establishes that you looked before you called." },
  ],
  links: [["/resources/which-local-verticals-actually-pay-for-a-website", "picking the vertical first"], ["/resources/cold-call-script-selling-websites-local-businesses", "what to say once they pick up"], ["/resources/how-much-to-charge-for-a-website-india", "turning customer value into a quote"]],
},

/* ───────────────────────────── 3 · price objection */
{
  slug: "handling-its-too-expensive-without-discounting",
  title: "How to Handle \"It's Too Expensive\" Without Discounting",
  excerpt: "The objection is almost never about the number. What it usually means, the four things to trade instead of price, and an unbundling ladder in real rupees.",
  meta: "How to handle \"it's too expensive\" without discounting: what the objection means, what to trade instead of price, and an unbundling ladder in rupees.",
  category: "Outreach", cluster: "operations", hero: "network", mins: 8,
  tags: ["Objection Handling", "Pricing", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "When a local business owner says it is too expensive, they are almost never telling you the number is wrong. They are telling you they cannot picture what comes back, and the price is the only part of your proposal concrete enough to argue with.",
      "Which means discounting is the one response guaranteed to fail. Cut ten percent and you have confirmed the price was arbitrary, and the next objection arrives immediately.",
      "So the way to handle it without discounting is to stop defending the number and find out which objection you actually have.",
    ]},

    { type: "h2", id: "means", text: "What it usually means instead" },
    { type: "prose", text: [
      "Four different objections arrive wearing the same words. They need different answers, and the only way to find out which one you have is to ask.",
    ]},
    { type: "table", head: ["What they say", "What it often means", "What to do"], rows: [
      ["\"Too expensive\"", "I cannot picture the return", "Convert to customers, not features"],
      ["\"Too expensive right now\"", "Cash flow, not price", "Change the payment shape"],
      ["\"That's more than I expected\"", "They have an anchor from somewhere", "Find out where"],
      ["\"I'll think about it\"", "Somebody else decides", "Ask who else should see it"],
    ]},
    { type: "prose", text: [
      "The question that separates them is a plain one: **\"Can I ask what feels expensive about it — the amount, or the timing?\"** Almost everyone answers honestly, because it is not a challenge, and the answer tells you which of the four conversations you are in.",
    ]},

    { type: "h2", id: "convert", text: "Convert the price into customers" },
    { type: "prose", text: [
      "This is the answer to the real objection, and it works because the arithmetic is theirs rather than yours.",
      "Ask what one new customer is worth to them over a year. They will tell you — owners know this number well. Then divide.",
      "A ₹30,000 site for a restaurant where a regular is worth ₹5,000 a year is six customers. For a coaching institute at ₹25,000 a year per student, it is a little over one admission. For a hardware supplier with contractor accounts, it is frequently less than one account. **Say the number back to them and stop talking.**",
      "The reason this beats a discount is that it never disputes the price. You have agreed it is a lot of money and moved the question to whether it comes back, which is the question they were actually asking.",
    ]},
    { type: "quote", text: "It is not thirty thousand rupees. It is six customers, once.", attribution: "The line that does the work" },

    { type: "h2", id: "trade", text: "Trade something instead of discounting" },
    { type: "prose", text: [
      "If you must move, move something that costs you little and is worth something to them. Never move the number alone.",
    ]},
    { type: "features", items: [
      { title: "Payment shape", icon: "calendar", detail: "Half now, half on launch. Or three instalments. Costs you timing, not margin." },
      { title: "Scope", icon: "map", detail: "Fewer pages now, the rest when it earns. Transparently less, not secretly cheaper." },
      { title: "Time", icon: "clock", detail: "A slower build slotted into your quiet weeks. Genuinely cheaper for you to deliver." },
      { title: "Proof", icon: "verified", detail: "Their logo and a case study, in exchange for a first-project rate that is stated as one." },
    ]},
    { type: "prose", text: [
      "The rule underneath all four: if the price comes down, something visible comes out. A client who gets the same thing for less learns that your prices are negotiable, and every future conversation starts there — including the renewal on the care plan.",
    ]},

    { type: "h2", id: "ladder", text: "The unbundling ladder, in rupees" },
    { type: "prose", text: [
      "Have this ready before the call so you are choosing from a ladder rather than inventing a number under pressure. Each step is a real deliverable, not a worse version of the last one:",
    ]},
    { type: "table", head: ["Step", "What they get", "Typical"], rows: [
      ["Presence", "One page — what they do, photos, timings, map, call button", "₹8,000–16,000"],
      ["Standard", "Five to eight pages with an enquiry form", "₹18,000–35,000"],
      ["Full", "Catalogue, per-service pages, registration or ordering", "₹35,000–90,000"],
      ["Care plan", "Monthly updates, added after any of the above", "₹1,500–4,000/month"],
    ], note: "Move down the ladder rather than down the price. The care plan is often what makes the smaller build viable for you." },
    { type: "prose", text: [
      "Dropping from Full to Standard is a legitimate answer to a price objection. Dropping from ₹35,000 to ₹28,000 for the identical scope is not — and the second one is what they will remember when you quote them again.",
    ]},

    { type: "h2", id: "walk", text: "When the answer is that they cannot afford it" },
    { type: "prose", text: [
      "Sometimes the objection is exactly what it says. A tailor doing ₹300 alterations, a convenience store averaging eleven reviews — these are businesses where the smallest sensible build is still more than the business can justify, and no framing changes that.",
      "Say so cleanly and leave. \"I do not think this is worth it for you right now — here is what would have to change for it to be.\" It costs you nothing, it is true, and in a local market where owners talk to each other it is the single most valuable thing you can be known for.",
      "The more useful conclusion is upstream: if you are hearing a genuine affordability objection often, the problem is the prospect list, not the pitch.",
    ]},

    { type: "cta", variant: "map", title: "Fewer of these conversations.",
      detail: "Filter by review count and rating first, and the affordability objection largely stops arriving.",
      action: "Build a better list", href: "/login" },
  ],
  faqs: [
    { q: "How do I handle \"it's too expensive\" without discounting?", a: "Ask whether the problem is the amount or the timing, then convert the price into customers using their own number for what one customer is worth over a year. A ₹30,000 site for a restaurant where a regular is worth ₹5,000 annually is six customers, once." },
    { q: "Should I ever lower my price?", a: "Only in exchange for something visible — fewer pages, a slower build in your quiet weeks, split payments, or a case study. If the price drops and the scope does not, you have taught the client that your prices are negotiable, and every future conversation starts there." },
    { q: "What does \"too expensive\" usually really mean?", a: "Most often that they cannot picture the return, and the price is the only concrete thing in your proposal to push back on. It can also mean cash flow rather than price, an anchor from a quote elsewhere, or that somebody else makes the decision." },
    { q: "What if the business genuinely cannot afford it?", a: "Say so and leave. Some businesses cannot justify even the smallest sensible build, and being the person who said that honestly is worth more in a local market than the sale was. If it happens often, the prospect list is the problem, not the pitch." },
    { q: "How should I structure options to avoid discounting?", a: "Prepare a ladder before the call — a one-page presence at ₹8,000–16,000, a standard site at ₹18,000–35,000, and a full build at ₹35,000–90,000, with a care plan added to any of them. Then move down the ladder rather than down the price." },
  ],
  links: [["/resources/how-much-to-charge-for-a-website-india", "setting the price in the first place"], ["/resources/we-already-have-a-facebook-page-objection", "the other objection you will hear most"], ["/resources/qualifying-a-local-lead-before-you-call", "qualifying before you quote"], ["/resources/website-maintenance-plans-what-to-charge", "what the care plan should cost"]],
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
