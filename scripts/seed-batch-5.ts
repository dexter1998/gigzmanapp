/**
 * Batch 5 — three vertical playbooks, each chosen because the SERP for it is not competing.
 *
 * SERP checks first:
 *  · Bakeries/cafes: the ranking page (INSIDEA, ~2,200 words) is a "top 10 web development
 *    companies" directory written for the cafe owner, with no pricing at all. The rest of page one
 *    is template galleries — Wix, Colorlib, SiteBuilderReport. Nothing agency-side exists, and the
 *    only case-study numbers in circulation are US DTC coffee ecommerce, not local bakeries.
 *  · Tailors: page one is a single-H2 inspiration gallery with twenty H3s (Colorlib), FounderJar's
 *    copy of it, and generic "best web design companies" listicles. Zero commercial content. The
 *    query is also polluted by Tailor Brands, an unrelated LLC/logo product.
 *  · Sports academies: the query returns the academies themselves — NSNIS, SAI, Somaiya, The Sports
 *    School — which is the finding. Academies that have a site own their own category SERP, and no
 *    agency-side content competes for the term at all.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · bakeries & cafes */
{
  slug: "how-to-sell-websites-to-bakeries-and-cafes",
  title: "How to Sell Websites to Bakeries and Cafes in 2026",
  excerpt: "The gap is smaller here than in most verticals — and it sits in a very specific place. Which bakeries and cafes are worth approaching, what to pitch, and the Zomato objection you will hear every time.",
  meta: "How to sell websites to bakeries and cafes: where the 28% gap actually concentrates, what to pitch beyond a menu, and how to answer the Zomato objection.",
  category: "Lead Generation", cluster: "playbooks", hero: "leads", mins: 9,
  tags: ["Vertical Playbook", "Food & Beverage", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "If you want to sell websites to bakeries and cafes, the first thing worth knowing is that this is not a high-gap vertical. Across our index, **28.5% of 5,215 bakeries** and **28.1% of 4,987 cafes** have no website — respectable, but nowhere near the 41.7% we measure in hardware or the 59.4% in tailoring.",
      "What makes it worth working anyway is where the gap sits. It is not spread evenly across the category, and once you see the shape of it your prospect list gets considerably shorter and considerably better.",
    ]},

    { type: "h2", id: "shape", text: "The gap is in the middle, not the bottom" },
    { type: "prose", text: [
      "The intuition is that the smallest, newest shops are the ones without a site. That is not what the data says. Splitting every bakery, cafe and coffee shop we have checked by how many Google reviews they carry:",
    ]},
    { type: "table", head: ["Google reviews", "Businesses checked", "No website"], rows: [
      ["Under 50", "9,784", "25.3%"],
      ["50 – 199", "1,021", "37.2%"],
      ["200 – 499", "1,048", "26.7%"],
      ["500 and above", "1,881", "23.4%"],
    ], note: "Bakeries, cafes and coffee shops in the Mantis index with a verified website check." },
    { type: "prose", text: [
      "The middle band is the outlier. A cafe with 50 to 199 reviews is a third more likely to have nothing than one with under 50, and substantially more likely than one with 500.",
      "That inversion has a plain explanation. Under fifty reviews the business is often too new or too small to have needed anything. Over five hundred it is either a chain, or successful enough for years that somebody eventually built it something. The 50–199 band is the awkward middle: **proven, busy, past the survival phase — and still running entirely on a Google listing and a WhatsApp number.**",
      "That is your list. Not the newest cafes and not the famous ones. The ones with a couple of hundred reviews, a 4.5 rating, and no domain.",
    ]},
    { type: "tip", title: "One filter does most of the work",
      text: "Filter to no website, review count between 50 and 199, rating above 4.3. In a mid-sized Indian city that typically returns 30–60 businesses that are demonstrably working and demonstrably invisible outside Maps." },

    { type: "h2", id: "pitch", text: "What to pitch bakeries and cafes beyond a menu" },
    { type: "prose", text: [
      "Every published guide on cafe websites lands on the same three things: a mobile menu, Google Maps visibility, and brand photography. They are not wrong, but they are also not worth money to the owner, because a menu already exists on Zomato and the Maps listing already works.",
      "For a bakery specifically, there is a better answer, and it is the highest-value transaction in the shop: **the custom cake order.**",
      "A walk-in customer spends ₹200. A birthday cake order is ₹1,500 to ₹4,000, a wedding order considerably more, and it is decided days in advance by someone scrolling through photographs. Right now that decision happens over WhatsApp — the customer asks for designs, someone at the counter forwards four photos between serving people, and half the enquiries go cold because nobody replied for two hours.",
      "The site you are selling is not a menu. It is a photographed catalogue of past orders with sizes, prices and an enquiry form that captures the date and the occasion. That is a specific, expensive problem, and you can describe it back to them in a sentence.",
    ]},
    { type: "table", head: ["Business", "Pitch that lands", "Pitch that does not"], rows: [
      ["Bakery", "Custom order catalogue and enquiry form", "\"Your menu should be online\""],
      ["Cafe", "Bookings, private events, franchise enquiries", "\"You need brand storytelling\""],
      ["Coffee roastery", "Wholesale and subscription — real ecommerce", "A single-page presence site"],
      ["Sweet shop", "Festival pre-orders and corporate gifting", "Daily counter items"],
    ]},

    { type: "h2", id: "zomato", text: "Answering \"we are already on Zomato\"" },
    { type: "prose", text: [
      "You will hear this in the first ninety seconds of every conversation, and it is a fair point, so do not argue with it.",
      "Agree first: Zomato and Swiggy do the job of getting somebody to order food tonight, and they do it better than a website would. Then move the conversation to the things the aggregator structurally cannot carry — the cake order, the private party booking, the corporate gifting enquiry, the catering job. **None of those are on Zomato, and all of them are worth more per transaction than anything that is.**",
      "There is a commission argument too, and it is real, but lead with the first one. Owners have heard the commission complaint from every salesperson who has walked in, and it makes you sound like the last four.",
    ]},
    { type: "quote", text: "The aggregator owns their ₹200 transactions. Nobody owns their ₹4,000 ones.", attribution: "The whole pitch, in one line" },

    { type: "h2", id: "proof", text: "Be careful which numbers you quote" },
    { type: "prose", text: [
      "The case studies circulating in this niche are worth knowing about, and worth not repeating. The headline results published for cafe and coffee web design — conversion lifts of 214%, subscription growth of 40% — come from American direct-to-consumer coffee brands selling beans online. They are ecommerce numbers from an ecommerce business.",
      "A bakery in Kanpur is not that business, and an owner who senses the number does not fit their world will discount everything else you say with it. Use what is in front of you instead: their own review count, their own rating, and the competitor two streets away who does have a site. That evidence is local, checkable and much harder to wave off.",
    ]},

    { type: "h2", id: "where", text: "Where the density is" },
    { type: "prose", text: [
      "The gap concentrates in tier-two India rather than the metros, which is consistent with every other vertical we have measured. Cafes and bakeries with no website, by city:",
    ]},
    { type: "table", head: ["City", "No website", "Checked"], rows: [
      ["Kanpur", "113", "169"],
      ["Vadodara", "105", "181"],
      ["Bhopal", "99", "162"],
      ["Patna", "98", "171"],
      ["Nagpur", "93", "153"],
      ["Kota", "88", "122"],
      ["Glasgow", "78", "225"],
    ], note: "Bakeries, cafes, coffee shops, dessert shops and confectioners with a verified website check." },
    { type: "prose", text: [
      "Two things stand out. Kanpur and Kota are running at roughly two in three with nothing — high enough that you can work a single neighbourhood on foot. And Glasgow is on the list at all, which is unusual for a UK city in our data; the UK gap overall sits at 17.0%, so food and drink there runs well above its national average.",
    ]},

    { type: "leads", city: "kanpur", heading: "Bakeries and cafes with no website" },

    { type: "h2", id: "price", text: "What to charge" },
    { type: "table", head: ["Build", "Contents", "Quote"], rows: [
      ["Presence", "One page, timings, photos, map, call button", "₹8,000–14,000"],
      ["Standard", "Menu, gallery, custom order enquiry form", "₹18,000–32,000"],
      ["Catalogue", "Photographed order catalogue with pricing, occasion filters", "₹35,000–60,000"],
      ["Care plan", "Seasonal menu and festival updates, photos", "₹1,500–3,000/month"],
    ], note: "Anchored to the Indian market bands — see the pricing guide for how these are derived." },
    { type: "prose", text: [
      "The care plan matters more here than in most verticals, because a bakery's stock genuinely changes — festivals, seasonal items, new cake designs every month. It is one of the few categories where the monthly fee is obviously earned rather than argued over.",
    ]},

    { type: "cta", variant: "map", title: "Find the middle band.",
      detail: "Bakeries and cafes with real review counts and no website — the segment where the gap actually concentrates.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "What percentage of bakeries and cafes have no website?", a: "28.5% of 5,215 bakeries and 28.1% of 4,987 cafes in our index have no website, along with 21.3% of coffee shops. It is a mid-range gap — well below hardware at 41.7% or tailoring at 59.4%." },
    { q: "Which bakeries and cafes are worth approaching?", a: "The ones carrying 50 to 199 Google reviews. That band runs at 37.2% with no website, against 25.3% for those under 50 reviews and 23.4% for those above 500 — proven businesses that never got past a Maps listing." },
    { q: "What should I pitch a bakery?", a: "The custom order catalogue, not the menu. A walk-in spends ₹200; a cake order is ₹1,500–4,000 and is decided days ahead from photographs currently being forwarded one at a time over WhatsApp." },
    { q: "How do I answer \"we are already on Zomato\"?", a: "Agree with it, then move to what the aggregator cannot carry — cake orders, private party bookings, catering and corporate gifting. All are worth more per transaction than anything on Zomato, and none of them are on it." },
    { q: "What should I charge a cafe for a website?", a: "₹8,000–14,000 for a single-page presence, ₹18,000–32,000 for a standard site with an order enquiry form, and ₹35,000–60,000 for a photographed catalogue. A ₹1,500–3,000 monthly care plan is easy to justify because the stock genuinely changes." },
  ],
  links: [["/resources/how-to-sell-websites-to-restaurants", "the restaurant playbook"], ["/resources/how-much-to-charge-for-a-website-india", "pricing the build"], ["/resources/website-maintenance-plans-what-to-charge", "pricing the care plan"], ["/leads/website-development/in/kanpur", "bakeries and cafes in Kanpur"]],
},

/* ───────────────────────────── 2 · tailors & boutiques */
{
  slug: "how-to-sell-websites-to-tailors",
  title: "How to Sell Websites to Tailors and Boutique Shops",
  excerpt: "The highest-gap vertical we measure that anyone can actually name — and the one most likely to waste your time. The split between a tailor who can pay you and one who cannot.",
  meta: "How to sell websites to tailors: why 59.4% have none, the boutique-versus-alterations split that decides who can pay, and what a portfolio site is worth.",
  category: "Lead Generation", cluster: "playbooks", hero: "leads", mins: 9,
  tags: ["Vertical Playbook", "India", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Sell websites to tailors and you are working the widest gap of any vertical you could name to a client. **59.4% of the 2,943 tailoring businesses in our index have no website** — 1,748 of them. In Kanpur it is 68 out of 69. In Patna, 71 out of 78.",
      "It is also the vertical most likely to waste a month of your time, and the reason is in the same dataset. The average tailoring business we have checked carries **48 Google reviews** — the lowest of any category we track, against 226 for bakeries and 457 for cafes. A gap that wide next to a number that small is telling you something specific: there are thousands of them and most are very small.",
      "So the question is not whether to work this vertical. It is which half of it.",
    ]},

    { type: "h2", id: "split", text: "Two businesses, one Google category" },
    { type: "prose", text: [
      "Google files both of these under the same label, and the difference between them decides whether you get paid.",
      "**The alterations counter.** Trouser hems, blouse fittings, a zip replacement. Ticket size ₹150 to ₹600, customers from within a kilometre, chosen on proximity and nothing else. This business does not need a website and cannot afford one, and no pitch fixes that. If someone visits an alterations tailor because they found him online, something unusual has happened.",
      "**The boutique.** Bridal and occasion wear, custom suiting, designer blouses, festival collections. Ticket size ₹8,000 to ₹60,000, customers travelling across a city, chosen on evidence of past work. This business is bought on portfolio, and it has no portfolio anywhere permanent.",
      "Same category in the data. Completely different conversation.",
    ]},
    { type: "table", head: ["Signal", "Alterations counter", "Boutique"], rows: [
      ["Google reviews", "Usually under 25", "60+"],
      ["Photos on the listing", "Shopfront, or none", "Garments, worn"],
      ["Name", "\"<Name> Tailors\"", "\"<Name> Designer Studio / Boutique\""],
      ["Instagram", "None", "Active, with work posted"],
      ["Worth approaching", "No", "Yes"],
    ], note: "The Instagram check is the fastest of these and the most reliable." },
    { type: "tip", title: "Qualify before you walk in",
      text: "If the business posts its work to Instagram, it already believes photographs of past garments win customers — you are extending something it has decided, not selling it an idea. If there is no Instagram and under 25 reviews, walk past." },

    { type: "h2", id: "portfolio", text: "You are selling a portfolio that does not expire" },
    { type: "prose", text: [
      "Tailoring is bought on proof. A customer commissioning a ₹40,000 lehenga wants to see twenty things this person has made before handing over the fabric, and there is no way around that.",
      "That portfolio currently lives in three places, all bad. **WhatsApp status**, which disappears in twenty-four hours. **The Instagram grid**, which is chronological rather than organised, so a bride hunting for bridal work scrolls past nine months of kurtas. And **a phone gallery**, shown to whoever happens to be standing in the shop.",
      "What you are selling is that same body of work, organised the way a customer actually shops: bridal here, suiting there, festival collections in a third place, each with fabric, turnaround time and a price band. Plus an enquiry form that captures the one thing that decides everything — **the date of the function.**",
      "That last detail is worth stating in the pitch, because it is the thing an experienced tailor immediately recognises. Every enquiry they take begins with working out whether the date is possible.",
    ]},

    { type: "h2", id: "money", text: "Being honest about the money" },
    { type: "prose", text: [
      "This is a lower-ticket vertical than hardware or coaching, and pretending otherwise leads to quoted proposals that go nowhere.",
      "A boutique doing ₹8,000 to ₹60,000 commissions can comfortably pay ₹15,000 to ₹30,000 for a site. It will not pay ₹80,000, and the alterations counter next door will not pay ₹5,000. Price for the first, and do not spend an afternoon on the second.",
    ]},
    { type: "table", head: ["Build", "Contents", "Quote"], rows: [
      ["Portfolio", "Categorised gallery, about, enquiry form with date field", "₹12,000–20,000"],
      ["Standard", "Portfolio plus collections, fabrics, price bands, testimonials", "₹22,000–35,000"],
      ["Care plan", "Monthly new work added, festival collection updates", "₹1,500–2,500/month"],
    ]},
    { type: "prose", text: [
      "The care plan is the real business here. A boutique produces new work every single week and none of it reaches the site by itself — which makes this one of the few verticals where a monthly fee needs no defending. Twenty boutiques on ₹2,000 a month is a better business than six of them on a one-time ₹30,000 build.",
    ]},

    { type: "h2", id: "where", text: "Where tailoring is most exposed" },
    { type: "prose", text: [
      "The city numbers here are the most extreme in our entire index — several cities are effectively at total absence:",
    ]},
    { type: "table", head: ["City", "No website", "Checked", "Rate"], rows: [
      ["Kanpur", "68", "69", "98.6%"],
      ["Patna", "71", "78", "91.0%"],
      ["Nagpur", "46", "50", "92.0%"],
      ["Bhopal", "46", "51", "90.2%"],
      ["Faridabad", "43", "48", "89.6%"],
      ["Vadodara", "59", "68", "86.8%"],
      ["Vienna", "43", "72", "59.7%"],
    ], note: "Businesses in the tailoring category with a verified website check." },
    { type: "prose", text: [
      "Kanpur at 68 of 69 is the single highest rate we have recorded for any category in any city. Vienna appearing here is worth a note of its own — European tailoring runs far above the Austrian national gap, and bespoke suiting is a considerably higher-ticket version of the same portfolio pitch.",
    ]},

    { type: "leads", city: "kanpur", heading: "Tailors and boutiques with no website" },

    { type: "h2", id: "serp", text: "Why nobody is competing for this" },
    { type: "prose", text: [
      "Search for anything about tailor websites and page one is inspiration galleries — twenty screenshots of tailoring sites with a note on what each does well, and no discussion of cost, business case or who should buy one. The query is further muddied by an unrelated American product called Tailor Brands, which absorbs a good share of the search volume.",
      "The practical consequence is that nothing exists to educate this buyer. A boutique owner who goes looking finds a gallery of designs and no answer to what it costs or whether it is worth it — which means every objection has to be handled by you, in person, and there is no competitor's content doing half the work first. That cuts both ways, and it is why walking in beats sending a proposal in this vertical.",
    ]},

    { type: "cta", variant: "map", title: "The widest gap on the board.",
      detail: "Tailoring and boutique businesses with no website — filter by review count to find the half that can pay.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "What percentage of tailors have no website?", a: "59.4% — 1,748 of the 2,943 tailoring businesses in our index. It is the widest gap of any commonly named vertical, and in some cities it is near total: 68 of 69 in Kanpur, 71 of 78 in Patna." },
    { q: "Are tailors worth approaching for web design work?", a: "Half of them are. Boutiques doing bridal and occasion wear at ₹8,000–60,000 a commission can pay ₹15,000–30,000 for a portfolio site. Alterations counters doing ₹150 hems cannot, and no pitch changes that." },
    { q: "How do I tell a boutique from an alterations tailor?", a: "Check Instagram first. A business posting its garments already believes photographs of past work win customers. Combine that with 60+ Google reviews and garment photos on the listing; under 25 reviews and no Instagram means walk past." },
    { q: "What should I pitch a tailor?", a: "A portfolio that does not expire. Their work currently lives on WhatsApp status for 24 hours or in a chronological Instagram grid. Sell it organised by occasion, with fabric, turnaround and price bands, and an enquiry form that captures the date of the function." },
    { q: "What should I charge a boutique for a website?", a: "₹12,000–20,000 for a categorised portfolio site, ₹22,000–35,000 with collections and price bands, plus ₹1,500–2,500 a month to keep new work on it. The care plan is the real business — boutiques produce new work weekly." },
  ],
  links: [["/resources/which-business-types-least-likely-to-have-a-website", "how tailoring ranks against other categories"], ["/resources/how-much-to-charge-for-a-website-india", "pricing the build"], ["/resources/how-to-sell-websites-to-hardware-stores", "the hardware playbook"], ["/leads/website-development/in/kanpur", "tailors in Kanpur"]],
},

/* ───────────────────────────── 3 · sports academies */
{
  slug: "how-to-sell-websites-to-sports-academies",
  title: "How to Sell Websites to Sports Academies and Clubs",
  excerpt: "The highest-rated vertical we measure, with nowhere to show it. Why academies differ from gyms, why the admission cycle decides your timing, and what the parent is actually researching.",
  meta: "How to sell websites to sports academies: why 31.9% have none despite 4.84 ratings, how the admission cycle sets your timing, and what parents research.",
  category: "Lead Generation", cluster: "playbooks", hero: "leads", mins: 9,
  tags: ["Vertical Playbook", "Education", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Sell websites to sports academies and you are working a vertical with an unusual profile: **31.9% of the 2,677 sports schools and academies in our index have no website**, and the category carries an average Google rating of **4.84** — the highest of any vertical we measure.",
      "That combination is the whole pitch. These are businesses whose customers are delighted with them and who have no way to demonstrate that beyond a Maps listing. Swimming facilities run higher still at 44.0% of 1,017, and sports clubs at 39.5%.",
    ]},

    { type: "h2", id: "vs-gyms", text: "Why an academy is not a gym" },
    { type: "prose", text: [
      "The temptation is to treat these as fitness businesses. The data says not to. Gyms sit at 21.8% with no website and fitness centres at 23.2% — both meaningfully better covered than academies at 31.9%. Gyms got online earlier because memberships are sold online.",
      "But the buying behaviour runs the opposite way, and that mismatch is the opportunity:",
    ]},
    { type: "table", head: ["", "Gym", "Sports academy"], rows: [
      ["Who decides", "The member, for themselves", "A parent, for a child"],
      ["How they choose", "Proximity and price", "Coach credentials and safety"],
      ["Research depth", "Minutes", "Weeks"],
      ["When", "Any month", "A six-week admission window"],
      ["No website", "21.8%", "31.9%"],
    ], note: "Rates from businesses in each category with a verified website check." },
    { type: "prose", text: [
      "A parent choosing where to send a nine-year-old for cricket coaching is doing genuine research: who coaches, what they have played, how many children per batch, whether the ground is safe, what previous students went on to do. **None of that fits in a Google listing**, and a parent who cannot find it looks at the academy that published it instead.",
      "That is why the gap matters more here than the percentage suggests. Gyms with no website lose a walk-in. Academies with no website lose an admission worth a full year of fees.",
    ]},

    { type: "h2", id: "timing", text: "The admission window decides your calendar" },
    { type: "prose", text: [
      "This is the single most useful thing to know about the vertical, and it is a timing rule rather than a pitch.",
      "Academy revenue arrives in batches. Summer camps sell in March and April; annual programmes fill alongside the school year. Outside those windows an owner is coaching, not buying, and a proposal sent in the wrong month gets a polite nothing.",
      "Which gives you two workable approaches, six to eight weeks before an intake:",
    ]},
    { type: "steps", items: [
      { title: "Pitch the enquiry form, not the website", icon: "send", detail: "Frame the whole build around one outcome: capturing admission enquiries for the coming batch. That is a deadline they already have in their head, and it converts far better than a general case for being online." },
      { title: "Sell the off-season as build time", icon: "score", detail: "If you have missed the window, do not chase the current intake. Say plainly that you want it live before the next one and that building it in the quiet months is why it will be ready. Owners respect this because it matches how they run their own year." },
    ]},

    { type: "h2", id: "content", text: "What the parent is actually looking for" },
    { type: "prose", text: [
      "Search for sports academies in any Indian city and the results are the academies themselves — the national institutes, the established schools, the ones with proper sites. They rank for their own category because nothing else is competing for it. Your prospect's competitor is doing that today.",
      "Look at what those ranking pages carry and it is the same short list every time, all of it about reassurance rather than marketing:",
    ]},
    { type: "checklist", items: [
      { title: "Coach profiles", detail: "Who they played for, what they are certified in, and how long they have coached." },
      { title: "Batch sizes and age groups", detail: "Stated as numbers. A parent wants to know how many children one coach is watching." },
      { title: "Facility photographs", detail: "The ground itself, the equipment, and anything that speaks to safety." },
      { title: "Fee structure", detail: "A band is enough, but say what it includes — kit, tournament entry, coaching hours." },
      { title: "Where past students went", detail: "Trials, district selections, state teams. This is the section parents read twice." },
      { title: "An enquiry form that asks age and sport", detail: "So the callback starts at the useful part of the conversation." },
    ]},
    { type: "prose", text: [
      "The last one matters more than it looks. An academy fielding phone enquiries spends the first two minutes of every call establishing age and sport before it can say anything useful. A form that collects both means the callback starts at the part that matters.",
      "And the 4.84 average rating is your strongest raw material. Most academies have dozens of genuinely warm reviews from parents sitting on a Maps listing where nobody researching a decision will read them properly. Pulling those onto a page next to coach credentials is the cheapest credibility on the site.",
    ]},
    { type: "quote", text: "They have the highest ratings of any vertical we measure, and no page on which to show them.", attribution: "Why this category converts" },

    { type: "h2", id: "where", text: "Where the academies are" },
    { type: "prose", text: [
      "Unusually, this vertical concentrates in metros rather than tier-two cities — sports academies follow disposable income and organised youth leagues:",
    ]},
    { type: "table", head: ["City", "No website", "Checked"], rows: [
      ["Jaipur", "116", "186"],
      ["Faridabad", "109", "160"],
      ["Coimbatore", "103", "173"],
      ["Hyderabad", "97", "182"],
      ["Lucknow", "94", "151"],
      ["Pune", "94", "185"],
      ["Gurgaon", "94", "210"],
    ], note: "Sports schools, clubs, complexes, swimming facilities and fitness centres with a verified website check." },
    { type: "prose", text: [
      "Gurgaon is the one to read carefully. It has the largest checked pool on this list and the lowest rate, which means the market there is already partly served — the academies without a site are competing against neighbours who have one. That is a harder city to prospect and an easier one to close.",
    ]},

    { type: "leads", city: "jaipur", heading: "Sports academies with no website" },

    { type: "h2", id: "price", text: "What to charge" },
    { type: "table", head: ["Build", "Contents", "Quote"], rows: [
      ["Presence", "One page, sports offered, timings, location, call button", "₹10,000–16,000"],
      ["Standard", "Coach profiles, batches, fees, gallery, enquiry form", "₹25,000–45,000"],
      ["Programme site", "Per-sport pages, achievements, online registration", "₹45,000–90,000"],
      ["Care plan", "Batch and fee updates, new achievements, seasonal camps", "₹2,000–4,000/month"],
    ], note: "Justified against annual fees rather than the build — one recovered admission usually covers the site." },
    { type: "prose", text: [
      "Anchor to annual fees rather than to page count. An academy charging ₹2,000 a month per child recovers a ₹35,000 site from a little over one additional annual admission. Ask what a student is worth over a year and they will do that arithmetic themselves — which is a far better position than you doing it for them.",
    ]},

    { type: "cta", variant: "map", title: "Time it to the intake.",
      detail: "Sports academies and clubs with no website — approach six weeks before an admission window.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "What percentage of sports academies have no website?", a: "31.9% of the 2,677 sports schools in our index, rising to 44.0% of swimming facilities and 39.5% of sports clubs. Gyms and fitness centres are better covered at 21.8% and 23.2%." },
    { q: "Why do sports academies need a website when gyms manage without one?", a: "Because the buyer is different. A gym member chooses on proximity and price in minutes; a parent choosing a coaching academy for a child researches coach credentials, batch sizes and safety over weeks, and none of that fits in a Google listing." },
    { q: "When should I approach a sports academy?", a: "Six to eight weeks before an admission window — March and April for summer camps, and alongside the school year for annual programmes. Outside those months the owner is coaching, not buying." },
    { q: "What should a sports academy website contain?", a: "Coach profiles with playing and coaching history, batch sizes and age groups as numbers, facility photographs, a fee band, where past students went, and an enquiry form that captures the child's age and sport." },
    { q: "What should I charge a sports academy?", a: "₹10,000–16,000 for a presence page, ₹25,000–45,000 for a standard site with coach profiles and an enquiry form, and ₹45,000–90,000 for per-sport pages with registration. Anchor it to annual fees — one extra admission usually covers the build." },
  ],
  links: [["/resources/how-to-sell-websites-to-coaching-centres", "the coaching centre playbook"], ["/resources/how-much-to-charge-for-a-website-india", "pricing the build"], ["/resources/which-business-types-least-likely-to-have-a-website", "gap rates by category"], ["/leads/website-development/in/jaipur", "academies in Jaipur"]],
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
