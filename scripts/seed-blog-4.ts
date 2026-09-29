/**
 * Blog 4 — the informational half of the no-website keyword cluster.
 *
 * Chosen from measured volume rather than from autocomplete breadth. The keyword research that
 * drove this batch found the "businesses without websites" cluster at roughly 2,600/mo in the US at
 * KD 0, against roughly 300/mo for the entire "how to get web design clients" cluster — the reverse
 * of what a variant count suggested. Three of those queries have SERPs made of guides rather than
 * tools, which is why they are articles here and not landing pages:
 *
 *   how to find businesses without websites   210/mo  KD 0   -> retarget of an existing post
 *   google maps businesses without websites     —     KD 0   -> new
 *   how to get web design clients              90/mo  KD 0   -> new
 *   buy web design leads (+ exclusive/usa)    ~40/mo  KD 0-18-> new
 *
 * The platform-qualified variants people expect as their own pages ("...on linkedin", "...on
 * instagram", "...reddit", "...fast") are 10/mo each. They are H2 sections of the web-design-clients
 * post rather than eight separate pages, which is the mistake the /leads tree already made at scale.
 *
 * Hero art reuses the existing OG variants (hero/leads/nearby/methodology) rather than adding new
 * files — the renderer composes the title over them, so a variant is a background, not a per-post
 * asset.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

/* ------------------------------------------------------------------ 1. google maps */

const mapsBody: Block[] = [
  { type: "prose", text: [
    "Google Maps knows which businesses have no website. It will not let you search for them. There is a filter for rating, for price, for whether a place is open now — and nothing at all for the one field that matters if you sell websites for a living.",
    "This is how to work around that, starting with the manual method that costs nothing, and being honest about the point where it stops being worth your time.",
  ]},

  { type: "h2", id: "why-no-filter", text: "Why there is no “no website” filter" },
  { type: "prose", text: [
    "Maps filters are built for people choosing somewhere to go, not for people prospecting. Every filter it offers answers a consumer question — is it open, is it cheap, is it any good. \"Does this business have a website\" is not a question a customer asks, so the filter does not exist and is not going to.",
    "The website field is still there on every listing. It is simply only visible one listing at a time, which is the whole problem: the information is public and the access pattern is hostile.",
  ]},

  { type: "h2", id: "manual", text: "The manual method, step by step" },
  { type: "steps", items: [
    { title: "Search a category and an area together", detail: "\"dentist Sector 14 Gurugram\" rather than \"dentist near me\" — you want a repeatable box you can move, not a result set centred on you.", icon: "search" },
    { title: "Switch to the list view and zoom in", detail: "Maps caps what it returns per search. Zoomed out, you get the famous ones. Zoomed in to a few streets, you get the ones nobody has prospected.", icon: "map" },
    { title: "Open each listing and look for the Website button", detail: "Absent means no site. This is the part that does not scale, and it is about six seconds per listing.", icon: "verified" },
    { title: "Check what the button actually points at", detail: "A Facebook page, an Instagram profile, a Linktree or a dead domain all render as a Website button. Judging these is the real work.", icon: "signal" },
    { title: "Record the review count, not just the name", detail: "It is the difference between a trading business and a dormant listing, and you cannot get it back later without reopening the listing.", icon: "score" },
  ]},

  { type: "tip", title: "Move the map, don't page the results",
    text: "Maps returns a limited set per search and will not hand you result 200. Covering a dense area means dragging the map to a new box and searching again, which is why a single neighbourhood can take an hour and why a whole city by hand is not a plan." },

  { type: "h2", id: "false-positives", text: "The four false positives that waste your morning" },
  { type: "prose", text: [
    "Every one of these shows a Website button. None of them is a website in any sense that matters to a pitch.",
  ]},
  { type: "table", head: ["What you see", "What it is", "Worth calling?"], rows: [
    ["A facebook.com URL", "A social page the business does not own", "Yes — and it is your best opener"],
    ["A linktr.ee URL", "A link list, usually from an Instagram bio", "Yes — they already know they need somewhere to send people"],
    ["A parked or expired domain", "A site that existed once and lapsed", "Yes — someone already sold them on the idea"],
    ["A marketplace or aggregator page", "A JustDial, Zomato or Practo profile", "Yes — they are paying rent for traffic"],
  ], note: "All four count as “no website” in our own data, for the reason in the right-hand column: the business owns nothing and has no stable address of its own." },

  { type: "h2", id: "scale", text: "Where the manual method stops paying" },
  { type: "prose", text: [
    "The arithmetic is not complicated. Six seconds to open a listing, plus judging the website field, plus noting the reviews, is realistically twenty to thirty seconds per business once you include the map-dragging. A hundred businesses is most of an hour, and in a market where two in five have no website that hour produces perhaps forty leads.",
    "That is a good hour, once. The problem is the second hour, because you have to remember which boxes you have already covered, and the third, because the useful ordering — by review count, so you call the busy ones first — is something you can only do after collecting everything.",
    "Which is the point at which you either write a scraper, buy an export, or use a list somebody else has already verified.",
  ]},

  { type: "citytable", country: "in", order: "gap", limit: 8,
    note: "Our own measured gap rate by city, from listings verified either way. The manual method above is what produced the first version of this table." },

  { type: "h2", id: "scraping", text: "Scraping Maps: what actually happens" },
  { type: "prose", text: [
    "Two honest warnings before the mechanics. Scraping Google Maps is against its terms of service, and the Places API — the sanctioned route — charges per request and does not return a \"has website\" filter either, so you pay to fetch listings and then discard most of them.",
    "That second point is the one people miss when they price this out. You are not billed for the businesses without websites; you are billed for every business you had to look at to find them. In a market with a 4% gap rate that is twenty-five paid lookups per usable lead. In one with a 40% gap rate it is closer to two and a half.",
  ]},
  { type: "prose", text: [
    "This is also why the same tool feels cheap to one agency and absurd to another, and why any pricing comparison that ignores the local gap rate is not telling you anything.",
  ]},

  { type: "cta", variant: "map", title: "Skip the map-dragging.",
    detail: "Search any city we cover and get businesses with no website, already verified and sorted by review count so the busy ones are at the top.",
    action: "Browse free", href: "/find-businesses-without-websites" },
];

const mapsFaqs = [
  { q: "Can you filter Google Maps for businesses without a website?",
    a: "No. Maps has filters for rating, price and opening hours, but none for the website field — those filters are built for consumers choosing somewhere to go, not for prospecting. The field is visible on each listing individually, which is why the manual method is one listing at a time." },
  { q: "How do you find businesses with no website on Google Maps?",
    a: "Search a category plus a small area, zoom in so the result cap does not hide anything, open each listing and check whether a Website button is present. Record the review count while you are there — it is what tells a trading business apart from a dormant one, and you cannot recover it without reopening the listing." },
  { q: "Does a Facebook page count as a website?",
    a: "Google will show it in the website field, but it should not count as a site for prospecting. The business does not own the page, controls neither its reach nor its rules, and has no stable address of its own. In our data those listings are counted as having no website, which is why our figures run higher than a raw field export." },
  { q: "Is scraping Google Maps allowed?",
    a: "It is against Google's terms of service. The sanctioned route is the Places API, which charges per request and has no \"no website\" filter either — so you pay for every listing you look at, not only the ones that qualify. That makes the local gap rate the single biggest factor in what a lead actually costs you." },
  { q: "How long does it take to find 100 businesses without websites?",
    a: "By hand, realistically twenty to thirty seconds per listing once map-dragging is included, so roughly an hour per hundred listings checked. How many of those hundred qualify depends entirely on the market — in India it is most of them, in the US it is a handful." },
];

/* ------------------------------------------------------------------ 2. web design clients */

const clientsBody: Block[] = [
  { type: "prose", text: [
    "Most advice on getting web design clients is a list of channels: referrals, LinkedIn, cold email, Upwork, networking events. It is not wrong, and it is not useful, because every one of those channels has you competing with designers who are better known than you for businesses that already have a website.",
    "This is that list, with the numbers attached where we have them, and with the one approach that inverts the problem put first rather than last.",
  ]},

  { type: "h2", id: "no-website", text: "Start with businesses that have no website at all" },
  { type: "prose", text: [
    "The reason this goes first is not that it is clever. It is that every other channel puts you in a comparison and this one does not.",
    "A business with an existing website that you are pitching to replace has an incumbent — often someone they know, sometimes a nephew — and an opinion about the current site. You are arguing about taste, price and whether the thing they already paid for was a mistake. A business with no website has none of that. There is no incumbent, no sunk cost to defend, and no comparison.",
  ]},
  { type: "checklist", items: [
    { title: "Nobody else is pitching them", detail: "these businesses do not appear in agency lead lists, because lead lists are built from people who filled in a form" },
    { title: "The problem is self-evident", detail: "you do not have to persuade someone that their site is dated — there is nothing there" },
    { title: "Review count tells you who can pay", detail: "a listing with 400 reviews and no website is a business turning away enquiries weekly" },
    { title: "The list is free to build", detail: "the information is public on Maps; the work is verification, not access" },
  ]},
  { type: "prose", text: [
    "The catch, stated plainly: these are colder leads and more of them will say no. A business that filled in a form wants a website today; a business with no website has been fine without one for eleven years. You are trading conversion rate for volume and for the absence of competition, which is a good trade when you have more time than money and a bad one when you are buying leads at two hundred dollars each.",
  ]},

  { type: "h2", id: "linkedin", text: "How to get web design clients on LinkedIn" },
  { type: "prose", text: [
    "LinkedIn works for B2B service businesses and agencies, and works badly for the local businesses that most new freelancers should be targeting — a salon owner in Indore is not on LinkedIn, and if they are, they are not there for work.",
    "Where it does work, the pattern that converts is not cold outreach. It is posting the work: a teardown of a real site, a before-and-after, a specific number from a project. Connection requests convert at a rate that rounds to nothing; posts that get shared inside an industry produce inbound.",
  ]},

  { type: "h2", id: "instagram", text: "How to get web design clients on Instagram" },
  { type: "prose", text: [
    "Instagram is the inverse of LinkedIn: useless for enterprise, genuinely effective for local businesses, especially in categories that are themselves visual — salons, restaurants, gyms, clinics, boutiques.",
    "The specific move that works is finding businesses whose Instagram bio links to a Linktree or to nothing at all. That is a business already trying to send people somewhere and failing. A DM that says so, referencing their actual posts, is not cold in the way an email is.",
  ]},

  { type: "h2", id: "facebook", text: "How to get web design clients on Facebook" },
  { type: "prose", text: [
    "Local business groups, not your own page. Most towns and most trades have groups where owners ask each other for recommendations, and the useful behaviour is answering the questions that are not about websites — someone asking why their Google listing does not show up is a website conversation two replies later.",
    "Posting your services into those groups gets you removed. Answering three questions a week for a month gets you asked.",
  ]},

  { type: "h2", id: "reddit", text: "Getting web design clients from Reddit" },
  { type: "prose", text: [
    "Worth being blunt: Reddit is where web designers talk to other web designers. r/webdesign and r/freelance are good for learning what other people charge and bad for finding clients, because almost nobody there is buying.",
    "The exception is the subreddits for the industries you want to serve, where the same rule as Facebook groups applies — be useful about the adjacent problem, not visible about your service.",
  ]},

  { type: "h2", id: "cold-calling", text: "Cold calling, which still works better than email here" },
  { type: "prose", text: [
    "For local businesses with no website, the phone beats email for a structural reason: a business with no website usually has no listed email either. The number on the Maps listing is frequently the only contact channel that exists, which means it is also the channel with the least competition.",
    "In India, a WhatsApp message to that same number outperforms the call, because an unknown number ringing is ignored and a message is read.",
  ]},
  { type: "prose", text: [
    "We have written the script separately, including the eight objections and what to do when staff answer: [the cold call script for selling websites](/resources/cold-call-script-selling-websites-local-businesses).",
  ]},

  { type: "h2", id: "fast", text: "How to get web design clients fast" },
  { type: "prose", text: [
    "If \"fast\" means this week, there are exactly two honest answers, and neither is a marketing channel.",
    "The first is your existing network, worked deliberately rather than passively — not \"let me know if you hear of anything\", but naming three businesses you already know have no website and asking for an introduction to each. The second is volume outreach to a filtered list, where the rate is low but the denominator is entirely under your control.",
    "Everything else on this page — posting, SEO, groups, referrals — compounds over months and produces nothing in week one. Advice that promises otherwise is selling something.",
  ]},

  { type: "h2", id: "pricing", text: "What to charge, and why anchoring low costs you the client" },
  { type: "prose", text: [
    "Deflecting the price question reads as expensive. Give a band on the first call, anchor from the low end, and immediately offer to send examples — that turns the price question into a next step rather than an ending.",
    "The mistake specific to no-website prospects is assuming they cannot pay. A business with several hundred reviews and no website is not poor; it is busy. It has never had a reason to prioritise this, which is a completely different objection and needs a different answer.",
  ]},

  { type: "cta", variant: "leadcard", title: "Build the list before the pitch.",
    detail: "Businesses with no website in your city, verified and ranked by review count, so you start with the ones that can actually pay.",
    action: "Find leads free", href: "/web-design-leads" },
];

const clientsFaqs = [
  { q: "How do I get my first web design client?",
    a: "The fastest honest route is a filtered list plus direct outreach: find local businesses that have no website at all, sort them by review count so you are calling businesses with real customers, and contact them about their Google listing rather than about your services. It avoids competing with better-known designers for businesses that already have a site." },
  { q: "How do you get web design clients on LinkedIn?",
    a: "By posting work rather than sending connection requests — teardowns, before-and-afters, specific numbers from real projects. LinkedIn works for B2B and agency clients and works poorly for local businesses, whose owners are generally not there." },
  { q: "How do you get web design clients on Instagram?",
    a: "Look for businesses whose bio links to a Linktree or to nothing at all. That is a business already trying to send people somewhere and failing, which makes a DM referencing their actual posts a warm conversation rather than a cold pitch. It works best in visual categories: salons, restaurants, gyms, clinics." },
  { q: "Is cold calling still effective for web design?",
    a: "For local businesses with no website, yes, and often more so than email — a business with no website usually has no listed email either, so the phone number on its Maps listing is the only channel that exists. In India a WhatsApp message on that number does better than the call itself." },
  { q: "How do I get web design clients fast?",
    a: "Two things work in week one: naming specific businesses in your existing network that have no website and asking for introductions, and volume outreach to a filtered list. Posting, SEO and groups compound over months and produce nothing immediately, whatever the article promises." },
  { q: "What should I charge for a small business website?",
    a: "Give a band on the first call rather than deflecting — deflection reads as expensive — and anchor from the low end with an immediate offer to send examples. Do not assume a business with no website cannot pay: one with hundreds of reviews is busy rather than poor, and that is a different objection entirely." },
];

/* ------------------------------------------------------------------ 3. buy web design leads */

const buyBody: Block[] = [
  { type: "prose", text: [
    "Bought web design leads run from roughly a hundred to two hundred dollars each, are usually shared between three or four agencies, and come with no guarantee that anyone closes. That is not a scam — it is the actual market rate for an introduction to someone who has raised their hand.",
    "Whether it is worth it depends on one number you already have and most comparison articles never ask for: your close rate.",
  ]},

  { type: "h2", id: "market", text: "What the market actually charges" },
  { type: "table", head: ["Type", "Typical price", "Exclusive?", "Warmth"], rows: [
    ["Vetted form-fill lead", "$100–200", "Rarely", "Asked for a quote"],
    ["Shared marketplace lead", "$20–60", "No, 3–5 buyers", "Asked, then resold"],
    ["Agency lead-gen retainer", "$1,500+/mo", "Yes", "Varies wildly"],
    ["Self-sourced no-website lead", "Your time", "Uncontested", "Has not asked anyone"],
  ], note: "Prices are what vendors publish or quote openly; the point of the table is the spread, not any one figure." },

  { type: "h2", id: "maths", text: "The arithmetic that decides it" },
  { type: "prose", text: [
    "Take a bought lead at $150 and a close rate of one in eight — optimistic for a shared lead, but let us be generous. That is $1,200 of lead cost per client won. If your average project is $3,000 that is fine. If it is $800 you are working at a loss and the vendor is the only profitable party in the arrangement.",
    "Now take a self-sourced lead from a no-website list. It costs you time rather than money, and the close rate is worse — call it one in twenty-five, because these businesses have not asked anyone for anything. Twenty-five calls at four minutes each is under two hours per client won.",
    "The honest conclusion is that the two are priced for different situations rather than one being better. If your time is worth more than roughly $600 an hour, buy leads. If it is not — which covers almost every freelancer and every new agency — the second column wins by a distance.",
  ]},

  { type: "h2", id: "exclusive", text: "“Exclusive” leads, and what that word is doing" },
  { type: "prose", text: [
    "Exclusivity is the main thing vendors charge a premium for, and it means the vendor did not sell that lead to anyone else. It does not mean nobody else is pitching the business, because the business is also contacting agencies directly, asking friends, and answering other people's cold emails.",
    "It is worth paying for when the vendor genuinely restricts volume in your area. It is worth nothing when \"exclusive\" means exclusive within their own customer list, which is the more common reading and is rarely spelled out.",
  ]},

  { type: "h2", id: "quality", text: "How to check a lead vendor before paying" },
  { type: "checklist", items: [
    { title: "Ask how the lead was generated", detail: "a form on a comparison site, a cold call, or a scrape — these produce completely different conversations" },
    { title: "Ask how many buyers receive it", detail: "\"exclusive\" needs a number attached or it is a word" },
    { title: "Ask for the refund rule in writing", detail: "wrong number, wrong country and out-of-budget should all be refundable" },
    { title: "Buy ten before you buy a hundred", detail: "your close rate on their leads is the only figure that matters, and nobody else's is transferable" },
  ]},

  { type: "h2", id: "free", text: "Where free web design leads actually come from" },
  { type: "prose", text: [
    "The searches for \"free web design leads\" mostly land on lead vendors offering a trial, which is a sample rather than a source. The genuinely free source is public listing data: businesses with an active Google Business Profile and no website are visible to anyone willing to check them one at a time.",
    "That is the work, and it is the only part worth paying for — not access to the businesses, which is public, but the verification and the ordering.",
  ]},

  { type: "cta", variant: "table", title: "See what an unbought lead looks like.",
    detail: "Verified businesses with no website, with ratings and review counts, free to browse. Credits only when you unlock a phone number.",
    action: "Browse leads", href: "/web-design-leads" },
];

const buyFaqs = [
  { q: "How much do web design leads cost?",
    a: "Vetted form-fill leads generally run $100–200 each, shared marketplace leads $20–60, and lead-generation retainers upwards of $1,500 a month. Whether any of that is worth it depends on your close rate and average project value — at a one-in-eight close and a $150 lead you are spending $1,200 per client won." },
  { q: "Are exclusive web design leads worth the premium?",
    a: "Only when the vendor restricts volume in your area and will say so with a number. \"Exclusive\" most often means exclusive within that vendor's own customer list, which does not stop the business contacting agencies directly or answering other cold outreach. Ask what the word means before paying for it." },
  { q: "Where can I get free web design leads?",
    a: "Free trials from lead vendors are samples, not sources. The genuinely free source is public listing data: businesses with an active Google Business Profile and no website are visible to anyone prepared to check listings individually. What costs money is the verification and the ranking, not access." },
  { q: "Is it better to buy leads or find them yourself?",
    a: "They suit different situations. Bought leads convert better per conversation and cost enough that a bad month hurts; self-sourced no-website leads convert worse and cost only time. If your hourly time is worth more than roughly $600, buy. For most freelancers and new agencies it is not, and self-sourcing wins." },
  { q: "How do I avoid bad lead vendors?",
    a: "Ask how the lead was generated, how many buyers receive it, and what the refund rule is in writing — wrong number, wrong country and out-of-budget should all qualify. Then buy ten rather than a hundred, because your own close rate on their leads is the only number that transfers." },
];

/* ------------------------------------------------------------------ seed */

type PostSeed = {
  slug: string;
  title: string;
  excerpt: string;
  meta: string;
  category: string;
  cluster: string;
  tags: string[];
  hero: string;
  minutes: number;
  body: Block[];
  faqs: { q: string; a: string }[];
  links: { href: string; anchor: string; kind: string }[];
};

const POSTS: PostSeed[] = [
  {
    slug: "find-businesses-without-websites-google-maps",
    title: "How to Find Businesses Without Websites on Google Maps",
    excerpt:
      "Maps knows which businesses have no website and will not let you filter for it. The manual method, the four false positives that waste your morning, and the point where doing it by hand stops paying.",
    meta: "Google Maps has no filter for businesses without websites. Here is the manual method, the false positives to watch, and where it stops scaling.",
    category: "Lead Generation",
    cluster: "operations",
    tags: ["Lead Generation", "Google Maps", "Prospecting", "No-Website Leads"],
    hero: "leads",
    minutes: 9,
    body: mapsBody,
    faqs: mapsFaqs,
    links: [
      { href: "/find-businesses-without-websites", anchor: "businesses with no website, already verified", kind: "lead_page" },
      { href: "/resources/how-to-find-businesses-that-need-a-website", anchor: "the full prospecting workflow", kind: "hub" },
      { href: "/industries-without-websites", anchor: "which industries have the biggest website gap", kind: "lead_page" },
    ],
  },
  {
    slug: "how-to-get-web-design-clients",
    title: "How to Get Web Design Clients",
    excerpt:
      "Every channel, with the numbers where we have them — and the one approach that removes the competition instead of joining it. Includes LinkedIn, Instagram, Facebook groups, Reddit and cold calling.",
    meta: "How to get web design clients: LinkedIn, Instagram, Facebook, Reddit and cold calling compared — starting with businesses that have no website at all.",
    category: "Outreach",
    cluster: "playbooks",
    tags: ["Outreach", "Freelancing", "Agency Growth", "Client Acquisition"],
    hero: "hero",
    minutes: 11,
    body: clientsBody,
    faqs: clientsFaqs,
    links: [
      { href: "/resources/cold-call-script-selling-websites-local-businesses", anchor: "the cold call script, with the objections", kind: "sibling" },
      { href: "/web-design-leads", anchor: "web design leads with no website at all", kind: "lead_page" },
      { href: "/resources/how-to-find-businesses-that-need-a-website", anchor: "how to build the list first", kind: "hub" },
    ],
  },
  {
    slug: "buy-web-design-leads",
    title: "Should You Buy Web Design Leads?",
    excerpt:
      "What the market charges, what “exclusive” is actually doing in that sentence, and the arithmetic that decides whether buying leads makes sense for you — which comes down to one number you already have.",
    meta: "Web design leads cost $100-200 each and are usually shared. Here is the arithmetic that decides whether buying beats sourcing them yourself.",
    category: "Comparisons",
    cluster: "tools",
    tags: ["Comparisons", "Lead Generation", "Pricing", "Agency Growth"],
    hero: "methodology",
    minutes: 8,
    body: buyBody,
    faqs: buyFaqs,
    links: [
      { href: "/web-design-leads", anchor: "no-website leads, free to browse", kind: "lead_page" },
      { href: "/resources/best-lead-generation-tools-web-design-agencies", anchor: "the lead tool comparison", kind: "hub" },
      { href: "/resources/how-to-get-web-design-clients", anchor: "getting clients without buying leads", kind: "sibling" },
    ],
  },
];

async function main() {
  for (const p of POSTS) {
    await sql`
      INSERT INTO blog_posts (
        slug, title, excerpt, meta_description, category, cluster, tags, author_slug,
        hero_variant, read_minutes, body, faqs, status, featured, published_at, content_updated_at
      ) VALUES (
        ${p.slug}, ${p.title}, ${p.excerpt}, ${p.meta}, ${p.category}, ${p.cluster},
        ${p.tags}, ${"tarun"}, ${p.hero}, ${p.minutes},
        ${sql.json(p.body as unknown as Parameters<typeof sql.json>[0])},
        ${sql.json(p.faqs as unknown as Parameters<typeof sql.json>[0])},
        ${"published"}, ${false}, ${new Date(Date.now() - 900_000)}, ${null}
      )
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, meta_description = EXCLUDED.meta_description,
        category = EXCLUDED.category, cluster = EXCLUDED.cluster, tags = EXCLUDED.tags,
        hero_variant = EXCLUDED.hero_variant, read_minutes = EXCLUDED.read_minutes,
        body = EXCLUDED.body, faqs = EXCLUDED.faqs, updated_at = now()
    `;

    await sql`DELETE FROM blog_links WHERE from_slug = ${p.slug}`;
    for (const [i, l] of p.links.entries()) {
      await sql`
        INSERT INTO blog_links (from_slug, to_href, anchor, kind, position)
        VALUES (${p.slug}, ${l.href}, ${l.anchor}, ${l.kind}, ${i})
      `;
    }
    console.log("seeded:", p.slug);
  }

  /**
   * Retarget, not a new post.
   *
   * "how to find businesses without websites" is 210/mo at KD 0; the existing post was titled for
   * "businesses that need a website", which measures near zero. Publishing a second article for the
   * higher-volume phrasing would have put two of our own pages on one SERP for the sake of a title —
   * so this rewrites the metadata of the post that already exists and leaves its body alone. The
   * slug stays: it is this cluster's hub, four posts link to it by href, and it has no ranking to
   * preserve that a redirect would be protecting.
   */
  const retargeted = await sql`
    UPDATE blog_posts SET
      title = ${"How to Find Businesses Without Websites"},
      meta_description = ${"Six ways to find businesses with no website, compared on speed, cost and accuracy — from Maps filters to scrapers, with the false positives that waste your time."},
      tags = ${["Lead Generation", "Prospecting", "No-Website Leads", "Google Maps"]},
      content_updated_at = now(),
      updated_at = now()
    WHERE slug = ${"how-to-find-businesses-that-need-a-website"}
    RETURNING slug
  `;
  console.log(
    retargeted.length ? "retargeted: how-to-find-businesses-that-need-a-website" : "retarget skipped: post not found"
  );
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
