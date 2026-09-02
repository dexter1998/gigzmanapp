/**
 * Batch 4 — pricing, retainers, and the hardware/trade playbook.
 *
 * SERP checks first:
 *  · "how much to charge for a website India" — dominated by buyer-education from Indian
 *    agencies farming their own leads. The seller-side framing is nearly unclaimed, and the
 *    benchmark bands below are read off those same pages.
 *  · Retainers: Google is ranking agency pricing pages for an informational query, which is what
 *    a short editorial supply looks like.
 *  · Hardware stores are the highest-gap nameable vertical we measure and appear on no niche list.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · pricing */
{
  slug: "how-much-to-charge-for-a-website-india",
  title: "How Much to Charge for a Small Business Website in India",
  excerpt: "Every pricing guide in this market is written for the buyer. This one is written for you — what to quote, when to quote it, and what a first website is worth versus a redesign.",
  meta: "What to charge for a small business website in India: real bands by project type, why first-website pricing differs from a redesign, and when to quote.",
  category: "Lead Generation", cluster: "playbooks", hero: "pricing", mins: 10,
  tags: ["Pricing", "India", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Search what to charge for a website in India and every result answers a different question. GoDaddy, the agency blogs, the cost calculators — all of them are telling a **buyer** what to expect. That is deliberate: those pages are lead magnets for the agencies that publish them.",
      "This is the other side. How much you should quote, what the market actually pays, and the one distinction that changes the number more than page count ever will.",
    ]},

    { type: "h2", id: "bands", text: "What the Indian market actually pays" },
    { type: "prose", text: [
      "Read off the same published sources that quote these numbers to buyers, so you are anchored to what your prospect has probably already read.",
    ]},
    { type: "table", head: ["Type of build", "Common range", "Who charges it"], rows: [
      ["Basic static site", "₹5,000–15,000", "Junior freelancer, template-based"],
      ["WordPress business site", "₹10,000–40,000", "Freelancer, 5–10 pages"],
      ["Custom small business site", "₹25,000–80,000", "Experienced freelancer or small studio"],
      ["Ecommerce", "₹30,000–1,50,000", "Studio or agency"],
      ["Hourly — junior", "₹500–1,500", "0–2 years"],
      ["Hourly — mid", "₹1,500–3,000", "2–5 years"],
      ["Hourly — senior", "₹3,000–5,000", "5+ years or specialised"],
    ], note: "Bands compiled from Indian pricing guides published for buyers — which is what your prospect has read before speaking to you." },

    { type: "h2", id: "first-vs-redesign", text: "A first website is not priced like a redesign" },
    { type: "prose", text: [
      "This is the distinction the guides never make, and it moves the number more than anything else.",
      "**A redesign is a comparison.** They have a site, they know roughly what the last one cost, and there is an incumbent to beat. You are competing on price against a known figure.",
      "**A first website is a decision.** There is no anchor, no incumbent, and no prior invoice. What you are selling is not pages — it is the first time this business is findable. Price it against what that is worth to them, not against what a template costs you.",
      "In practice that means a hardware store with 400 reviews and no website should not be quoted ₹8,000 because the build is simple. It is simple *for you*. For them it is the difference between existing online and not.",
    ]},
    { type: "tip", title: "The question that sets the price",
      text: "Ask what one new customer is worth to them over a year. A restaurant will say a few thousand rupees. A coaching institute will say thirty thousand. A hardware store supplying contractors may say more than either. That number, not your page count, is what the site is worth — and they told you themselves." },

    { type: "h2", id: "what-to-quote", text: "What to quote a business with no website" },
    { type: "table", head: ["Package", "Contents", "Quote"], rows: [
      ["Presence", "One page: what they do, photos, timings, map, call button", "₹10,000–18,000"],
      ["Standard", "4–6 pages, gallery, enquiry form, WhatsApp button", "₹20,000–45,000"],
      ["Standard + local SEO", "Above, plus Maps optimisation and basic on-page work", "₹45,000–75,000"],
      ["Care plan", "Hosting, updates, small changes, monthly", "₹1,500–5,000/month"],
    ], note: "Vertical shifts these materially — coaching institutes pay near the top of each band, food stalls near the bottom. See the vertical playbooks." },

    { type: "h2", id: "when", text: "When to say the number" },
    { type: "prose", text: [
      "On the first call, when they ask. Deflecting to \"it depends on requirements\" reads as expensive and evasive, and it costs you the prospects who were only ever going to buy at a certain level — you find that out three meetings later instead of in the first two minutes.",
      "Give a band, anchor the low end, then immediately move to a next step: \"₹20,000 to ₹45,000 depending on how many pages. Want me to send two examples in that range?\" The price question becomes a step forward rather than an ending.",
    ]},

    { type: "h2", id: "advance", text: "Taking advance payment" },
    { type: "prose", text: [
      "Standard in this market and worth being direct about. **Fifty percent up front, fifty on launch** is normal and rarely questioned. For a client you have not worked with, do not start on a promise.",
      "Where it gets awkward is the middle: a client who goes quiet after paying the advance, then reappears two months later expecting the same timeline. Put a clause in the quote — content not supplied within thirty days pauses the project — and mention it once, lightly, when they agree the advance. It costs nothing to say up front and is unwinnable to argue later.",
    ]},

    { type: "h2", id: "cheap", text: "Competing against ₹5,000 quotes" },
    { type: "prose", text: [
      "You will lose some of these and should. A business that wants a ₹5,000 website wants a template with their name on it, and there is a real supply of people who will do that.",
      "Where you win is on the thing the ₹5,000 quote never includes: someone who answers next year. Say it plainly — \"the cheaper option is real, and it usually means the site never gets touched again. If that's fine for you, take it.\" Prospects rarely hear an agency concede a point, and the ones who then choose you are choosing for the right reason.",
    ]},
    { type: "leads", city: "gurgaon", heading: "Businesses at first-website pricing right now" },

    { type: "cta", variant: "map", title: "Quote the ones who have never bought before.",
      detail: "Businesses with no website and real review counts — where the price is a decision rather than a comparison.",
      action: "Find leads near you", href: "/login" },
  ],
  faqs: [
    { q: "How much should I charge for a small business website in India?", a: "₹10,000–18,000 for a single-page presence site, ₹20,000–45,000 for a standard 4–6 page build, and ₹45,000–75,000 with local SEO. Add ₹1,500–5,000 monthly for a care plan. Vertical matters — coaching institutes pay near the top of each band." },
    { q: "Should I charge hourly or per project?", a: "Per project for local small businesses. They think in a total, not a rate, and an hourly quote invites questions about how long things take. Keep hourly for ongoing or open-ended work where the scope genuinely is not known." },
    { q: "What is the hourly rate for web designers in India?", a: "Roughly ₹500–1,500 for junior, ₹1,500–3,000 for mid-level and ₹3,000–5,000 for senior or specialised work. Agencies quote considerably higher, but they are selling a team rather than a person." },
    { q: "How much advance payment should I take?", a: "Fifty percent up front and fifty on launch is standard in India and rarely questioned. Add a clause that content not supplied within thirty days pauses the project — cheap to say at the start, unwinnable to argue later." },
    { q: "How do I compete with someone quoting ₹5,000?", a: "Often you should not. That price buys a template, and there is real supply for it. Where you win is on someone answering next year — say so plainly, and concede that the cheap option is real. The prospects who then pick you are picking for the right reason." },
  ],
  links: [["/resources/how-to-sell-websites-to-coaching-centres", "what coaching institutes pay"], ["/resources/how-to-sell-websites-to-restaurants", "what restaurants pay"], ["/leads/website-development/in/gurgaon", "businesses with no website in Gurugram"]],
},
/* ───────────────────────────── 2 · retainers */
{
  slug: "website-maintenance-plans-what-to-charge",
  title: "Website Maintenance Plans: What to Charge Monthly",
  excerpt: "The build pays once. The care plan is what turns a project business into a predictable one — and most agencies price it at a fraction of what it is worth.",
  meta: "What to charge for website maintenance in India: monthly bands, what to include, how to sell it at the same time as the build, and when to refuse.",
  category: "Lead Generation", cluster: "playbooks", hero: "pricing", mins: 9,
  tags: ["Pricing", "Retainers", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Search for website maintenance pricing and Google will show you agency pricing pages rather than articles. That is what a thin editorial supply looks like: there is demand for the answer and almost nobody has written it, so the search engine falls back to commercial pages.",
      "Here is the answer. What a maintenance plan should cost monthly, what belongs in it, and the mistake that makes agencies price it at a tenth of its value.",
    ]},

    { type: "h2", id: "why", text: "Why the maintenance plan matters more than the build" },
    { type: "prose", text: [
      "A build is revenue once. Twenty builds a year at ₹30,000 is ₹6 lakh, and every January you start from zero.",
      "Twenty care plans at ₹3,000 a month is ₹7.2 lakh a year that arrives whether or not you sell anything — and it compounds, because year two starts at ₹7.2 lakh before the first new client.",
      "That is the whole argument, and it is why the plan should be sold at the same moment as the build rather than offered afterwards.",
    ]},
    { type: "table", head: ["Model", "Year 1", "Year 2", "Year 3"], rows: [
      ["20 builds/year only", "₹6,00,000", "₹6,00,000", "₹6,00,000"],
      ["20 builds + care plans", "₹9,60,000", "₹13,20,000", "₹16,80,000"],
    ], note: "Assumes ₹30,000 per build, ₹3,000/month care, and that plans persist. The gap is not the plan price — it is that the plan does not reset each year." },

    { type: "h2", id: "bands", text: "What to charge monthly" },
    { type: "table", head: ["Tier", "What is in it", "India band"], rows: [
      ["Hosting only", "Hosting, SSL, backups, uptime", "₹500–1,500"],
      ["Basic care", "Above, plus small text and image changes", "₹1,500–3,000"],
      ["Standard care", "Above, plus monthly updates, one content change, priority reply", "₹3,000–6,000"],
      ["Care + local SEO", "Above, plus Maps upkeep, review responses, reporting", "₹6,000–15,000"],
    ], note: "The jump from hosting-only to basic care is the important one: it is where you stop selling a commodity and start selling availability." },

    { type: "h2", id: "mistake", text: "The mistake: pricing it as hosting" },
    { type: "prose", text: [
      "Most agencies price the plan at what hosting costs them plus a margin. That is pricing your cost, not their value, and it is why so many care plans sit at ₹500 a month doing real work.",
      "What the client is actually buying is that **somebody answers**. Their menu changed, their timings changed, a photo is wrong, the site is down and they do not know who to call. The technical content of that is an hour a month; the value of it is that the site does not quietly rot.",
      "Say it that way. \"₹3,000 a month means when something needs changing, you message me and it is done. Without it you're finding a new developer every time.\" Every business that has been abandoned by a previous developer — which is most of them — understands that sentence immediately.",
    ]},

    { type: "h2", id: "selling", text: "Selling the plan with the build, not after" },
    { type: "prose", text: [
      "Offered afterwards it sounds like an upsell. Included in the original quote as a line item, it sounds like part of how this works.",
      "Quote it as: build ₹30,000, then ₹3,000 a month from launch. Not \"and we also offer maintenance\". The plan should appear on the first piece of paper they see.",
      "**Bundle the first three months into the build price** if you need to close. It costs you very little, it gets the habit started, and a client who has had three months of things being fixed rarely cancels in month four.",
    ]},
    { type: "checklist", items: [
      { title: "Put it in the original quote", detail: "as a line, not as an option" },
      { title: "Bill monthly, not annually", detail: "annual invoices become annual decisions" },
      { title: "Send something every month", detail: "even \"checked, all fine\" — silence is what makes people cancel" },
      { title: "Cap what is included", detail: "\"small changes\" needs a boundary or it becomes free redesign work" },
    ]},

    { type: "h2", id: "scope", text: "Defining \"small changes\" before it defines you" },
    { type: "prose", text: [
      "This is where care plans go wrong. \"Small changes included\" sounds generous and reads, to a client, as unlimited. Six months later you are rebuilding a page for ₹3,000 a month and quietly resenting it.",
      "The boundary that works is time, not task type. **\"Up to an hour of changes a month, carried over up to three months.\"** Nobody argues with an hour, everybody argues with whether adding a page counts as small, and the carry-over stops them feeling they lose it by not asking.",
      "Beyond that, quote separately and cheerfully. A client who has a happy monthly relationship approves a ₹6,000 extra without much thought; the same client on an unbounded plan treats every request as a test of whether you will push back.",
    ]},
    { type: "table", head: ["Request", "In the plan", "Quoted separately"], rows: [
      ["Change timings or a phone number", "Yes", ""],
      ["Swap photos, update prices", "Yes", ""],
      ["Add a new page", "", "Yes — ₹2,000–5,000"],
      ["New section or feature", "", "Yes — scoped"],
      ["Redesign", "", "Yes — a new project"],
    ]},

    { type: "h2", id: "refuse", text: "When to refuse the plan" },
    { type: "prose", text: [
      "A client who negotiates the care plan down to ₹800 is telling you they will still expect the same responsiveness. Take the build and let the plan go rather than accepting a number that makes every request feel like an imposition.",
      "The same applies to a site you did not build. Taking over someone else's code for ₹2,000 a month is how agencies end up maintaining things they cannot fix. Quote an audit first, separately, and decide afterwards.",
    ]},
    { type: "leads", city: "gurgaon", heading: "Where the next twenty care plans come from" },

    { type: "cta", variant: "map", title: "Every build is a care plan waiting to start.",
      detail: "Find businesses with no website — the ones where you set the terms from the beginning rather than inheriting someone else's.",
      action: "Find leads near you", href: "/login" },
  ],
  faqs: [
    { q: "How much should I charge for website maintenance in India?", a: "₹500–1,500 for hosting only, ₹1,500–3,000 for basic care with small changes, ₹3,000–6,000 for standard care with monthly updates, and ₹6,000–15,000 when local SEO is included." },
    { q: "When should I sell the maintenance plan?", a: "At the same time as the build, as a line in the original quote rather than an option offered afterwards. Offered later it sounds like an upsell; included from the start it sounds like how this works." },
    { q: "Why do most agencies underprice maintenance?", a: "Because they price it as hosting plus margin — their cost rather than the client's value. What the client actually buys is that somebody answers when something needs changing, which is worth far more than the server." },
    { q: "Should I take over maintenance of a site I didn't build?", a: "Only after a paid audit. Inheriting someone else's code on a low monthly fee is how agencies end up maintaining things they cannot fix. Quote the audit separately and decide afterwards." },
    { q: "Monthly or annual billing?", a: "Monthly. An annual invoice becomes an annual decision, and a client re-deciding once a year churns more than one who never thinks about it." },
  ],
  links: [["/resources/how-much-to-charge-for-a-website-india", "what to charge for the build itself"], ["/leads/website-development/in/gurgaon", "businesses with no website in Gurugram"]],
},
/* ───────────────────────────── 3 · hardware stores */
{
  slug: "how-to-sell-websites-to-hardware-stores",
  title: "How to Sell Websites to Hardware and Trade Suppliers",
  excerpt: "The highest website gap of any category we measure, and it appears on no niche list. 41.7% of hardware and trade suppliers have no site — and their customers are contractors, not walk-ins.",
  meta: "How to sell websites to hardware stores and trade suppliers: why 41.7% have no site, the contractor angle, and what to charge. With live counts.",
  category: "Lead Generation", cluster: "playbooks", hero: "leads", mins: 9,
  tags: ["Vertical Playbook", "Hardware Stores", "Trade Suppliers"],
  body: [
    { type: "prose", text: [
      "Hardware stores do not appear on a single published list of the best web design niches. In our index they have one of the highest website gaps of any category we can name: **41.7% of the 7,096 hardware, building supply, auto parts and electronics retailers we checked have no website at all.**",
      "That combination — a large, underserved gap and zero competitive attention — is why this is the vertical to sell websites to before anyone writes about it.",
    ]},

    { type: "h2", id: "why-gap", text: "Why hardware stores never built one" },
    { type: "prose", text: [
      "Not money, and not age. The pattern across our data is about whether the customer researches before arriving.",
      "Nobody compares three hardware stores online before buying cement. You go to the nearest one, or the one your contractor uses. So the absence was never felt — no enquiry was visibly lost, and nothing forced the question.",
      "That makes the pitch harder than for a restaurant, and it means leading with *being findable* will not land. The angle that does is different.",
    ]},

    { type: "h2", id: "angle", text: "The angle: their customer is a contractor" },
    { type: "prose", text: [
      "A hardware store's best customers are not walk-ins. They are contractors, builders and electricians placing repeat orders, often by phone, often for the same twenty items.",
      "That is the pitch. Not a shopfront — **a price list and a stock page the contractor can check at eleven at night before a site visit.** \"Right now your regulars ring you to ask if you have something. A page with your range means they check and then ring to order.\"",
      "The owner recognises this immediately, because the calls are a real part of their day.",
    ]},
    { type: "checklist", items: [
      { title: "Product range page", detail: "not a catalogue — categories and brands carried" },
      { title: "Trade enquiry form", detail: "bulk or account enquiries, separate from retail" },
      { title: "Delivery area and terms", detail: "the second-most-asked question after price" },
      { title: "WhatsApp order button", detail: "how the orders actually arrive in this trade" },
    ]},

    { type: "h2", id: "who", text: "Which hardware stores to approach" },
    { type: "prose", text: [
      "Review counts run lower here than in food or coaching — the ones without a site average **86 reviews**, against 321 for restaurants. That is not weakness; a hardware store's customers rarely leave reviews. It does mean the review filter has to be set lower.",
    ]},
    { type: "table", head: ["Signal", "What to look for"], rows: [
      ["Reviews", "40+ is a working store here, not 100+"],
      ["Rating", "4.0 and above — these stores live on reliability"],
      ["Photos on the listing", "a stocked shop, not an empty counter"],
      ["Trade language in reviews", "\"bulk\", \"site\", \"contractor\" means the customer base you want"],
    ]},
    { type: "table", head: ["City", "Suppliers with no website"], rows: [
      ["Kanpur", "136"], ["Patna", "132"], ["Morena", "124"], ["Vadodara", "107"], ["Kota", "106"],
    ], note: "Hardware, building materials, auto parts and electronics retailers combined." },

    { type: "h2", id: "price", text: "What to charge a hardware store" },
    { type: "prose", text: [
      "Below coaching institutes, around restaurants. These are real businesses with real turnover, but they are cash-conscious and unimpressed by design.",
    ]},
    { type: "table", head: ["Package", "Contents", "Quote"], rows: [
      ["Presence", "One page: range, timings, delivery area, call button", "₹10,000–15,000"],
      ["Standard", "4–5 pages, product categories, trade enquiry form", "₹20,000–35,000"],
      ["With price list", "Above, plus a maintained rate list or catalogue", "₹35,000–55,000"],
      ["Care plan", "Rate and stock updates — sell this one hard", "₹2,000–4,000/month"],
    ], note: "The care plan matters unusually here: prices move, and a rate list nobody updates is worse than none." },

    { type: "h2", id: "objection", text: "\"Our customers just call us\"" },
    { type: "prose", text: [
      "The objection you will hear, and it is true. Do not dispute it.",
      "\"They do, and they'll keep calling. The difference is what they're calling about. Right now half those calls are 'do you have it' — if that's on a page, the call you get is 'send me twenty'.\"",
      "You are not proposing to replace the phone. You are proposing to change what the phone is used for, which for a busy counter is an immediately attractive idea.",
    ]},
    { type: "h2", id: "reach", text: "How to reach a hardware store owner" },
    { type: "prose", text: [
      "Walk in. This vertical rewards it more than any other, and phone calls do worse here than almost anywhere.",
      "The counter is busy in the morning and again at closing; the useful window is mid-afternoon, roughly 2pm to 4pm, which is the opposite of the advice for restaurants. The owner is usually behind the counter and will talk while doing something else — which is fine, because your pitch is short.",
      "If you cannot visit, message rather than call. The number rings at the counter during trade and gets answered by whoever is nearest, so a call rarely reaches the owner. A WhatsApp message sits there until the evening, when they read it properly.",
    ]},
    { type: "tip", title: "Bring one thing",
      text: "A printed screenshot of a competing supplier two streets away who does have a page, with their range visible. This trade is unsentimental and competitive on exactly this axis — a rival being findable is a far better argument than anything about digital presence." },

    { type: "leads", city: "gurgaon", heading: "Trade suppliers with no website" },

    { type: "cta", variant: "map", title: "A vertical nobody else is pitching.",
      detail: "Hardware and trade suppliers with no website — the highest gap we measure, and absent from every niche list.",
      action: "Find suppliers near you", href: "/login" },
  ],
  faqs: [
    { q: "What percentage of hardware stores have no website?", a: "41.7% of the 7,096 hardware, building supply, auto parts and electronics retailers in our index have no website — one of the highest gaps of any nameable category, and a vertical that appears on no published niche list." },
    { q: "Why don't hardware stores have websites?", a: "Because their customers do not research before arriving. You go to the nearest store or the one your contractor uses, so no enquiry was ever visibly lost and nothing forced the question." },
    { q: "What is the pitch for a hardware store?", a: "Their contractors, not walk-ins. A price list and range page a contractor can check late at night before a site visit — so the call they get is an order rather than a stock question." },
    { q: "What should I charge a hardware store for a website?", a: "₹10,000–15,000 for a single-page presence, ₹20,000–35,000 for a standard site with product categories and a trade enquiry form, and ₹35,000–55,000 with a maintained rate list. Sell a ₹2,000–4,000 monthly care plan — prices move." },
    { q: "How do I answer \"our customers just call us\"?", a: "Agree, then change the subject of the call. Half those calls are stock questions; if the range is on a page, the calls you get are orders. You are not replacing the phone, you are changing what it is used for." },
  ],
  links: [["/resources/which-business-types-least-likely-to-have-a-website", "how hardware compares to other categories"], ["/resources/how-much-to-charge-for-a-website-india", "pricing the build"], ["/leads/website-development/in/gurgaon", "trade suppliers in Gurugram"]],
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
