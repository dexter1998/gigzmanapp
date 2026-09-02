/**
 * Batch 3 — the Apollo comparison and the first two vertical playbooks.
 *
 * SERP checks done first, per the rule:
 *  · "apollo alternative" — 10/10 enterprise vendors, every one ranking itself first. The local
 *    qualifier flips it entirely, and that is where the highest-conviction buyer sits.
 *  · SiteSwan's restaurant page is the only real competitor at 2,100 words, and carries no
 *    scripts, no pricing and no objection handling. Confirmed by fetching it.
 *  · "sell websites to coaching centres" returns only agencies selling TO institutes. There is no
 *    agency-facing page in this vertical at all. Market price anchor from that SERP: ₹65k–90k.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ─────────────────────────────────────── 1 · Apollo alternative */
{
  slug: "apollo-alternative-local-business-leads",
  title: "Apollo Alternative for Local Business Leads (2026)",
  excerpt: "Apollo is excellent at what it does. What it cannot do is see a business with no website — and that is structural, not a coverage gap they will fix.",
  meta: "Apollo cannot index businesses without a website — it is built on crawling. What that means for agencies selling local, and what to use instead.",
  category: "Comparisons", cluster: "tools", hero: "network", mins: 9,
  tags: ["Comparisons", "Lead Tools", "Apollo"],
  body: [
    { type: "prose", text: [
      "If you sell websites to local businesses and you pay for Apollo, you have probably noticed that the prospects you most want are the ones it never returns. That is not a coverage gap. It is how the product is built, and no amount of filtering will get around it.",
      "This is a straight look at where Apollo works, where it structurally cannot, and what an Apollo alternative actually needs to do differently for local work.",
    ]},
    { type: "image", src: "/resources/logos/apollo.png", width: 200, height: 60,
      alt: "Apollo.io logo — the B2B sales intelligence platform discussed in this comparison",
      caption: "Apollo indexes over 200 million contacts. The constraint is not size.",
      credit: "Logo: Apollo.io" },

    { type: "h2", id: "structural", text: "Why Apollo cannot see businesses without a website" },
    { type: "prose", text: [
      "Apollo builds its database by crawling. A company enters it because there is something to crawl — a website with an about page, a LinkedIn company profile, a funding record, a job posting.",
      "A hardware store with 400 reviews and no website has none of those. It has a Google Maps listing and a phone number. Nothing in Apollo's pipeline is pointed at that, so the business does not exist as a record. **The businesses with the strongest need for a website are precisely the ones a website-crawler cannot find.**",
      "This is worth being fair about: it is not a flaw. Apollo is built for selling software to companies that already operate online, and for that it is very good. It is the wrong instrument for a different job.",
    ]},
    { type: "h2", id: "tech-stack", text: "The technographic workaround does not work either" },
    { type: "prose", text: [
      "The standard advice for finding redesign prospects in Apollo is to filter on technology — target companies still on WordPress or jQuery, exclude the ones on Shopify or React.",
      "That does find businesses with dated sites, and it is a legitimate play. But notice what it requires: **a website to fingerprint.** Technographic filtering can only see businesses that already have one. By construction it cannot surface the no-website segment, and the guides recommending it never say so.",
    ]},
    { type: "table", head: ["What you need to find", "Apollo", "Technographic filters", "Live local search"], rows: [
      ["Company with a dated website", "Yes", "Yes", "Yes"],
      ["Company with no website at all", "No", "No", "Yes"],
      ["Owner's direct phone", "Sometimes", "Sometimes", "Yes — it is on the listing"],
      ["Business email", "Yes", "Yes", "Often none exists"],
      ["Review count as an intent signal", "No", "No", "Yes"],
    ]},

    { type: "h2", id: "how-many", text: "How much of the market this actually excludes" },
    { type: "prose", text: [
      "We checked 152,311 local businesses across 37 cities rather than surveying them. **32.8% have no website at all** — rising to 38.8% in India and falling to single digits in our US sample.",
      "So for an agency selling first websites in India, a crawler-built database is blind to roughly two in five of the market. The full breakdown by country and category is in [the website gap report](/resources/how-many-local-businesses-have-no-website).",
    ]},
    { type: "table", head: ["Category", "Checked", "No website", "Rate"], rows: [
      ["Guest houses", "740", "543", "73.4%"],
      ["Hardware stores", "2,098", "1,405", "67.0%"],
      ["Tailors", "1,546", "1,015", "65.7%"],
      ["Plumbers", "1,164", "653", "56.1%"],
      ["Dentists", "1,465", "158", "10.8%"],
    ], note: "The high-rate categories are the ones missing from crawler-built databases entirely." },

    { type: "h2", id: "what-instead", text: "What an Apollo alternative needs to do differently" },
    { type: "features", items: [
      { icon: "search", title: "Read live sources", detail: "Maps and directories at search time, not a stored crawl." },
      { icon: "signal", title: "Treat absence as a filter", detail: "\"Has no website\" is the query, not something you check afterwards." },
      { icon: "phone", title: "Lead with phone", detail: "The contact that exists for these businesses, not the one that doesn't." },
      { icon: "score", title: "Rank by review count", detail: "The only reliable proxy for whether a no-website business is trading." },
    ]},
    { type: "prose", text: [
      "That last one matters more than it sounds. A no-website business with eight reviews is usually dormant. One with 400 is a working business turning away online enquiries, and it is a completely different call.",
    ]},

    { type: "h2", id: "cost", text: "What local leads cost either way" },
    { type: "prose", text: [
      "Worth being concrete, because the alternatives are not all priced alike. Raw scraped rows sell for as little as $4.90 per thousand. Done-for-you lead brokers charge $20 to $200 per individual lead and compete almost entirely on the word *exclusive*. Self-serve local databases sit between, around $15 to $99 a month.",
      "Those are three different products, not three prices for one. A broker sells you exclusivity and a scraper sells you rows; neither is qualification. What you are actually paying for in the middle tier is that the leads arrive already filtered on the thing you sell against.",
      "If you are comparing an Apollo seat against a local index, compare on that rather than on record counts. Apollo's 200 million contacts are irrelevant if none of them is the hardware store two streets away.",
    ]},

    { type: "h2", id: "keep-apollo", text: "When to keep paying for Apollo" },
    { type: "prose", text: [
      "Do not cancel it because of this article. If you also sell to funded startups, SaaS companies or anyone with a real web presence, Apollo does that better than a local index will.",
      "The two are not substitutes. They answer different questions — *which companies match this firmographic profile* versus *which businesses near here are missing something I sell*. Most agencies that do both kinds of work end up paying for both, and the mistake is expecting either one to cover the other.",
    ]},
    { type: "leads", city: "gurgaon", heading: "What Apollo has no record of" },

    { type: "cta", variant: "map", title: "Search the half a crawler cannot reach.",
      detail: "Businesses with a live listing, real reviews and no website — filtered on the gap itself, sorted by who is actually trading.",
      action: "Find leads near you", href: "/login" },
  ],
  faqs: [
    { q: "Does Apollo have data on local businesses without websites?", a: "No, and not because of a coverage gap. Apollo builds its database by crawling websites, LinkedIn profiles and filings. A business with none of those gives it nothing to index, so no record is created." },
    { q: "Can I filter Apollo for businesses with bad websites?", a: "Yes, using technographic filters — target dated stacks like WordPress or jQuery. It works for redesign prospects, but it requires a website to fingerprint, so it cannot surface businesses that have none." },
    { q: "What is the best Apollo alternative for a web design agency?", a: "Anything that reads live local sources and treats the absence of a website as a filter rather than a field to check afterwards. The specific requirement is phone-first contact data, because these businesses frequently have no listed email." },
    { q: "Should I cancel Apollo?", a: "Not if you also sell to companies that already operate online — it is better at that than a local index will be. They answer different questions and most agencies doing both kinds of work pay for both." },
    { q: "How many local businesses does this affect?", a: "In our index of 152,311 businesses, 32.8% have no website at all, rising to 38.8% in India. For an agency selling first websites there, a crawler-built database is blind to roughly two in five of the market." },
  ],
  links: [["/resources/how-many-local-businesses-have-no-website", "the full website gap data"], ["/resources/how-to-find-businesses-that-need-a-website", "how to find these businesses instead"], ["/leads/website-development/in/gurgaon", "no-website businesses in Gurugram"]],
},
/* ─────────────────────────────────────── 2 · Restaurants */
{
  slug: "how-to-sell-websites-to-restaurants",
  title: "How to Sell Websites to Restaurants (2026 Playbook)",
  excerpt: "A third of restaurants have no website, and the ones with hundreds of reviews are the best prospects in local. Here is the pitch, the price, and the objection you will hear every time.",
  meta: "How to sell websites to restaurants: which ones to target, what to charge, the menu pitch, and handling \"we're on Zomato\". With live no-website counts.",
  category: "Lead Generation", cluster: "playbooks", hero: "leads", mins: 10,
  tags: ["Vertical Playbook", "Restaurants", "Sales Playbook"],
  body: [
    { type: "prose", text: [
      "Restaurants are the most-recommended web design niche and one of the least understood. The recommendation is right — **33.8% of the 16,154 restaurants we checked have no website** — but almost every guide stops at \"restaurants are a good target\" and never says which restaurant, what to charge, or what to do when they tell you they are already on Zomato.",
      "This playbook has those answers in it: which restaurants to call, what to charge them, and the two objections that come up on nearly every call.",
    ]},

    { type: "h2", id: "which", text: "Which restaurants to sell websites to" },
    { type: "prose", text: [
      "Not all of them. A third have no site, but most of that third should not be your first call.",
      "The filter is review count. Restaurants in our index that have no website average **321 reviews**, and 1,264 of them have more than a hundred. That upper group is the target: a restaurant with 300 reviews and no website is a functioning business with real footfall that is invisible the moment someone searches for it.",
    ]},
    { type: "checklist", items: [
      { title: "100+ reviews", detail: "proof of real trade; below this you are often looking at a stall or a closed kitchen" },
      { title: "Rating above 4.0", detail: "below that they have a product problem a website will not solve" },
      { title: "Independent, not a chain outlet", detail: "a franchise cannot commission its own site" },
      { title: "Recent reviews", detail: "restaurants close quietly and listings stay up for months" },
    ]},
    { type: "table", head: ["City", "Restaurants with no website"], rows: [
      ["Kanpur", "211"], ["Vadodara", "169"], ["Patna", "161"], ["Bhopal", "150"], ["Kota", "139"],
    ], note: "Restaurant, fast food, cafe and bakery categories combined. Tier-2 cities lead — the metros are further along." },

    { type: "h2", id: "pitch", text: "The pitch that works on a restaurant" },
    { type: "prose", text: [
      "Do not open with online presence, branding, or being findable. Open with **the menu**.",
      "Every restaurant owner has the same daily irritation: people call or message to ask what is on the menu, what it costs, whether they deliver, and what time they close. Somebody has to answer, every time, during service.",
      "\"Right now anyone who wants your menu has to message you or call. A page with the menu, prices and timings answers that without anyone picking up.\" That is a problem they had this week, not a marketing concept.",
    ]},
    { type: "tip", title: "Bring the menu photo",
      text: "Before the call, screenshot the menu photos customers have uploaded to their Google listing — usually blurry, often years out of date, sometimes a competitor's. Showing that is a faster argument than any sentence about digital presence: this is what people see when they look you up." },

    { type: "h2", id: "zomato", text: "\"We're already on Zomato and Swiggy\"" },
    { type: "prose", text: [
      "You will hear this on almost every call in India, and it is a reasonable thing to say. The wrong answer is that aggregators are not a website.",
      "The right answer is arithmetic. Aggregators charge commission on every order — typically **18–25%** — and they own the customer relationship. A direct order costs the restaurant nothing beyond the payment fee.",
      "\"Keep both. Zomato brings people who don't know you. The site is for the ones who already do — repeat customers ordering direct, where you keep the whole ticket instead of three-quarters of it.\" That is a P&L conversation, and restaurant owners are fluent in it.",
    ]},

    { type: "h2", id: "price", text: "What to charge a restaurant" },
    { type: "prose", text: [
      "Restaurants are price-sensitive and cash-conscious, and they will ask early. Give a band rather than deflecting.",
    ]},
    { type: "table", head: ["Package", "What it is", "India band"], rows: [
      ["Menu page", "One page: menu, photos, timings, map, call button", "₹8,000–15,000"],
      ["Standard site", "4–5 pages, gallery, contact form, WhatsApp button", "₹15,000–30,000"],
      ["With direct ordering", "Above, plus order form or payment link", "₹30,000–60,000"],
      ["Monthly care", "Menu updates, hosting, small changes", "₹1,500–3,000/month"],
    ], note: "The care plan matters more here than in most verticals: menus and prices change, and a site nobody updates stops being useful within a year." },
    { type: "prose", text: [
      "Sell the care plan at the same time as the build, not later. A restaurant that changes its menu quarterly and cannot edit the site will stop trusting it — and that is how this vertical earns its reputation for churn.",
    ]},

    { type: "h2", id: "reach", text: "How to reach restaurant owners" },
    { type: "prose", text: [
      "**Never between noon and 3pm, or after 7pm.** That is service, and you will be remembered as the person who called during it. Mid-morning, around 11am, is when the owner is doing paperwork and will actually talk.",
      "Walking in works better here than in almost any other vertical — restaurants are public spaces and the owner is usually on site. Order something, wait for a quiet moment, ask who handles their online stuff.",
      "For messaging, the number on the listing is answered by whoever runs the counter. [The WhatsApp approach](/resources/whatsapp-outreach-local-business-india) works, but expect to be passed along rather than reaching the owner first.",
    ]},
    { type: "leads", city: "gurgaon", heading: "Restaurants with no website right now" },

    { type: "cta", variant: "map", title: "Find the restaurants worth calling.",
      detail: "Filter for no website, sort by review count, and start with the ones already busy enough to need the menu online.",
      action: "Find restaurants near you", href: "/login" },
  ],
  faqs: [
    { q: "What percentage of restaurants have no website?", a: "In our index, 33.8% of 16,154 restaurants, cafes, fast food outlets and bakeries have no website. Those without one average 321 reviews, so a large share are functioning businesses rather than dormant listings." },
    { q: "How much should I charge a restaurant for a website?", a: "In India, ₹8,000–15,000 for a single menu page, ₹15,000–30,000 for a standard 4–5 page site, and ₹30,000–60,000 with direct ordering. Sell a ₹1,500–3,000 monthly care plan alongside it — menus change and an unmaintained site loses their trust fast." },
    { q: "How do I answer \"we're already on Zomato\"?", a: "With arithmetic, not argument. Aggregators take 18–25% commission and own the customer. Position the site for repeat customers ordering direct, where the restaurant keeps the full ticket. Keep both — do not ask them to leave the aggregator." },
    { q: "When is the best time to contact a restaurant owner?", a: "Mid-morning, around 11am. Never between noon and 3pm or after 7pm — that is service. Walking in works unusually well in this vertical because the owner is normally on site." },
    { q: "Which restaurants make the best prospects?", a: "Independent restaurants with more than 100 reviews, a rating above 4.0, and recent activity. High review counts with no website means real footfall and no online presence — the clearest version of the signal." },
  ],
  links: [["/resources/which-business-types-least-likely-to-have-a-website", "how restaurants compare to other verticals"], ["/resources/cold-call-script-selling-websites-local-businesses", "the cold call script"], ["/leads/website-development/in/gurgaon", "restaurants with no website in Gurugram"]],
},
/* ─────────────────────────────────────── 3 · Coaching centres */
{
  slug: "how-to-sell-websites-to-coaching-centres",
  title: "How to Sell Websites to Coaching Centres in India",
  excerpt: "3,056 coaching institutes in our index have no website, and they buy differently from every other local vertical — admissions run on a calendar, and so does the sale.",
  meta: "How to sell websites to coaching centres and tuition institutes in India: the admission-season timing, what to charge, and the results-page pitch.",
  category: "Lead Generation", cluster: "playbooks", hero: "leads", mins: 10,
  tags: ["Vertical Playbook", "Coaching Institutes", "India"],
  body: [
    { type: "prose", text: [
      "Search for how to sell websites to coaching centres and you will find nothing written for you. Every result is an agency selling **to** institutes — website design for coaching institutes, ready-made templates, packages. Not one page is written for the person doing the selling.",
      "That is odd, because **3,056 of the 11,625 coaching institutes and schools we checked have no website**, and this vertical buys more predictably than any other local category once you understand its calendar.",
    ]},

    { type: "h2", id: "why", text: "Why coaching centres buy websites differently" },
    { type: "prose", text: [
      "Most local businesses buy a website when someone finally convinces them. Coaching institutes buy when **admission season starts**, and they buy in a hurry.",
      "A restaurant can open without a website and lose nothing measurable. A coaching centre competing for the same students as four others on the same road is being compared directly, by parents, on their phones, in a two-week window. The absence is felt as lost admissions rather than as a general marketing gap.",
      "That makes the sale seasonal, which is a problem in January and an advantage in March.",
    ]},
    { type: "table", head: ["Period", "What is happening", "What to sell"], rows: [
      ["Jan–Mar", "Admission season begins; enquiries peak", "Build now — highest urgency, least price resistance"],
      ["Apr–Jun", "Results published, new batches form", "Results page, testimonials, next-batch pages"],
      ["Jul–Oct", "Quiet; classes running", "Care plans, SEO, content — the retainer window"],
      ["Nov–Dec", "Planning for next intake", "Pitch the build, close in January"],
    ]},

    { type: "h2", id: "results", text: "The results page is the entire pitch" },
    { type: "prose", text: [
      "Every coaching centre in India sells on one thing: how many of its students got in. That claim currently lives on a printed banner outside the building and in a WhatsApp forward.",
      "\"Your board is outside your gate. Anyone comparing you to the institute down the road is doing it on their phone, and they cannot see it.\" A results page — names, ranks, years, photos — is the single feature that closes this vertical, and it is the one they will engage with immediately because they are already proud of it.",
      "Everything else on the site is supporting material. Faculty profiles, batch timings, fee structure, an enquiry form that goes to WhatsApp. Lead with results and the rest sells itself.",
    ]},
    { type: "checklist", items: [
      { title: "Results page", detail: "names, ranks, year — the reason parents choose one institute over another" },
      { title: "Faculty with photographs", detail: "in this vertical the teacher is the product" },
      { title: "Batch timings and fees", detail: "the two questions every enquiry asks before anything else" },
      { title: "WhatsApp enquiry button", detail: "parents will not fill a form; they will send a message" },
    ]},

    { type: "h2", id: "price", text: "What to charge a coaching centre" },
    { type: "prose", text: [
      "This vertical pays better than most local categories, because admissions are worth a lot per student and they know it. Agencies openly advertise ₹65,000–90,000 for a full coaching institute site.",
      "You do not have to start there. But do not price it like a shop either — a centre with 200 students paying ₹30,000 a year is running a ₹60 lakh business, and pricing at ₹12,000 signals that you think it is smaller than it is.",
    ]},
    { type: "table", head: ["Package", "What it is", "India band"], rows: [
      ["Single-page", "Courses, timings, results, enquiry button", "₹15,000–25,000"],
      ["Standard institute site", "Course pages, faculty, results, gallery, forms", "₹35,000–65,000"],
      ["With admissions flow", "Above, plus online enquiry pipeline and follow-up", "₹65,000–90,000"],
      ["Monthly care", "Result updates, batch changes, new course pages", "₹3,000–6,000/month"],
    ]},

    { type: "h2", id: "where", text: "Where the coaching centres without websites are" },
    { type: "prose", text: [
      "Concentrated in tier-2 cities, and heavily so — the coaching economy is not a metro phenomenon.",
    ]},
    { type: "table", head: ["City", "Institutes with no website"], rows: [
      ["Coimbatore", "189"], ["Ahmedabad", "163"], ["Surat", "161"], ["Faridabad", "151"], ["Jaipur", "150"],
    ], note: "Educational institutions, schools, preschools and sports academies combined." },
    { type: "prose", text: [
      "The overall rate for this category is **26.3%** — lower than restaurants or hardware stores, because larger institutes built sites years ago. What remains is the mid-sized centre with real enrolment and no online presence, which is exactly the segment that can afford you.",
    ]},
    { type: "leads", city: "gurgaon", heading: "Institutes with no website right now" },

    { type: "h2", id: "objection", text: "\"Parents find us by word of mouth\"" },
    { type: "prose", text: [
      "True, and it will stay true. Do not argue with it.",
      "\"That's how they hear about you. But a parent who's been told about three institutes checks all three on their phone before deciding. Right now the other two have something to show and you have a Maps listing.\"",
      "The comparison is the point. This vertical is uniquely competitive at the exact moment of decision, and that is the discomfort worth naming — not the abstract value of being online.",
    ]},

    { type: "cta", variant: "map", title: "Find institutes before admission season.",
      detail: "Coaching centres with real enrolment and no website — the ones who will feel it most in January.",
      action: "Find institutes near you", href: "/login" },
  ],
  faqs: [
    { q: "How many coaching centres in India have no website?", a: "In our index, 3,056 of 11,625 coaching institutes, schools and academies checked — about 26.3%. The rate is lower than restaurants or hardware stores because larger institutes built sites years ago; what remains is the mid-sized centre with real enrolment." },
    { q: "What should I charge a coaching institute for a website?", a: "₹15,000–25,000 for a single page, ₹35,000–65,000 for a full institute site, and up to ₹90,000 with an admissions enquiry flow. Agencies openly advertise the upper band. Add ₹3,000–6,000 monthly for result and batch updates." },
    { q: "When is the best time to sell to a coaching centre?", a: "Pitch in November and December, close in January when admission season starts and urgency is highest. The July to October lull is when to sell care plans and SEO rather than builds." },
    { q: "What feature closes this vertical?", a: "The results page. Every institute sells on how many of its students got in, and that claim currently lives on a banner outside the gate where no one comparing options on a phone can see it." },
    { q: "How do I answer \"parents find us by word of mouth\"?", a: "Agree, then point at the comparison. A parent told about three institutes checks all three on their phone before deciding. The other two have something to show." },
  ],
  links: [["/resources/which-business-types-least-likely-to-have-a-website", "gap rates by business type"], ["/resources/whatsapp-outreach-local-business-india", "reaching owners on WhatsApp"], ["/leads/website-development/in/gurgaon", "institutes with no website in Gurugram"]],
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
        ${"published"}, ${false}, ${new Date(Date.now() - 300_000)})
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
  // Existing posts link forward, so nothing new lands as an orphan.
  for (const [from, href, anchor] of [
    ["how-to-find-businesses-that-need-a-website", "/resources/apollo-alternative-local-business-leads", "why Apollo cannot see them"],
    ["which-business-types-least-likely-to-have-a-website", "/resources/how-to-sell-websites-to-restaurants", "the restaurant playbook"],
    ["which-business-types-least-likely-to-have-a-website", "/resources/how-to-sell-websites-to-coaching-centres", "the coaching centre playbook"],
  ] as [string, string, string][]) {
    await sql`INSERT INTO blog_links (from_slug, to_href, anchor, kind, position)
              VALUES (${from}, ${href}, ${anchor}, ${"sibling"}, ${9})
              ON CONFLICT (from_slug, to_href) DO NOTHING`;
  }
  console.log("  ✓ inbound links added");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
