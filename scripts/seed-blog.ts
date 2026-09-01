/**
 * Seeds the Resource Center's first post plus its author.
 *
 * Written as a script rather than a migration because content is data, not schema: re-running it
 * updates the post in place, which is how an edit should behave.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

const AUTHOR = {
  slug: "tarun",
  name: "Tarun",
  role: "Founder, Mantis",
  // Only what is verifiable. An invented credential is a Low-quality signal in Google's own
  // rater guidelines, so this stays short rather than padded.
  bio: "Builds Mantis and runs Gigzman, a web design and software studio in Gurugram. Sells websites to local businesses for a living, which is where these playbooks come from.",
  linkedin_url: null as string | null,
};

const body: Block[] = [
  { type: "prose", text: [
    "A local business with no website is the clearest buying signal an agency can act on. There is no ambiguity about whether they need what you sell, no competitor already embedded, and no long education cycle — the gap is visible in ten seconds on Google Maps.",
    "The hard part was never identifying the signal. It is finding these businesses at any useful scale, because **the databases every sales team already pays for cannot see them.**",
  ]},

  { type: "h2", id: "why-invisible", text: "Why B2B databases can't find them" },
  { type: "prose", text: [
    "Apollo, ZoomInfo, Lusha and the rest are built by crawling the web. A company gets into those databases because it has a website to crawl, a LinkedIn page to parse, or a funding filing to scrape.",
    "A business with no website has none of those. It exists on Google Maps, on a licence board, in a local directory — sources those crawlers were never pointed at. So the businesses with the strongest need for your service are precisely the ones missing from the tool you use to find prospects.",
  ]},
  { type: "checklist", items: [
    { title: "No website means no crawl target", detail: "the database has nothing to land on" },
    { title: "No LinkedIn company page", detail: "most local operators never made one" },
    { title: "No funding or filings", detail: "a two-person salon files nothing a scraper reads" },
    { title: "Phone, not email", detail: "the one contact field that does exist is the one these tools rank lowest" },
  ]},

  { type: "h2", id: "signals", text: "Which gaps actually signal buying intent" },
  { type: "prose", text: [
    "Not every gap is worth a call. A business with no website and no reviews is usually dormant. A business with no website and 200 reviews is a working business turning away online enquiries — that is the one to call first.",
  ]},
  { type: "table", head: ["Gap", "What it means", "Why it matters", "Buyer intent"], rows: [
    ["No website", "Business has no site at all", "You can be their first digital presence", "Very high"],
    ["Outdated design", "Old, non-mobile, or broken site", "Hurts trust and credibility", "High"],
    ["No contact clarity", "Hard to find a number or CTA", "Leads drop before they reach out", "High"],
    ["Poor local ranking", "Not showing for key local searches", "Missing steady organic leads", "Medium"],
    ["Few reviews", "Little social proof", "Often a dormant business", "Medium"],
  ]},

  { type: "h2", id: "methods", text: "Six ways to find them, ranked by what they cost you" },
  { type: "prose", text: [
    "These are ordered by effort per usable lead, worst to best. Most agencies start at the top and never get past it.",
  ]},
  { type: "h3", text: "1. Google Maps, by hand" },
  { type: "prose", text: [
    "Search a category and area, open each listing, check for a website link, copy the name and number. It works and it costs nothing but time — roughly two minutes per lead, and you cannot filter for the ones worth calling.",
  ]},
  { type: "h3", text: "2. Buying a list" },
  { type: "prose", text: [
    "Fast, and usually stale. A bought list is a snapshot of whatever the vendor crawled months ago, and it inherits the same blind spot: it was built from websites, so businesses without one are underrepresented in the very list you bought to find them.",
  ]},
  { type: "h3", text: "3. Local directories and licence boards" },
  { type: "prose", text: [
    "Trade bodies, municipal registrations and licence boards do list businesses with no web presence. The data is real but unstructured, rarely has a phone number attached, and needs manual cleaning before anyone can call it.",
  ]},
  { type: "h3", text: "4. Facebook and Instagram business pages" },
  { type: "prose", text: [
    "A business with an active Instagram and no website is a strong prospect — they have already accepted they need to be online. Discovery is the problem: there is no way to filter Instagram for \"has a page, has no site\".",
  ]},
  { type: "h3", text: "5. Referrals from existing clients" },
  { type: "prose", text: [
    "The highest close rate of anything on this list, and the least controllable. Worth systematising, but it will not fill a pipeline on its own.",
  ]},
  { type: "h3", text: "6. Searching the live web by intent" },
  { type: "prose", text: [
    "Describe the business you want, let the search run against live sources rather than a stored database, and filter on the gap itself. This is what Mantis does, and it is the only method on this list where \"has no website\" is a filter rather than something you check by hand afterwards.",
  ]},

  { type: "features", items: [
    { icon: "search", title: "Live web discovery", detail: "Sources are read at search time, not months ago." },
    { icon: "signal", title: "Gap detection", detail: "Website presence is checked per business, not assumed." },
    { icon: "score", title: "Intent scoring", detail: "Reviews and ratings rank who is worth calling first." },
    { icon: "phone", title: "Phone-first contact", detail: "The field local businesses actually answer on." },
  ]},

  { type: "cta", variant: "map", title: "Businesses near you are already looking for help.",
    detail: "Find local businesses with no website, weak SEO, or poor online presence — and reach out first.",
    action: "Find leads near you", href: "/login" },

  { type: "h2", id: "workflow", text: "The four-step workflow" },
  { type: "steps", items: [
    { icon: "search", title: "Discover", detail: "Find local businesses with website gaps and intent signals." },
    { icon: "score", title: "Score", detail: "Prioritise by reviews, gap severity, and deal potential." },
    { icon: "enrich", title: "Qualify", detail: "Confirm the business is trading and reachable." },
    { icon: "send", title: "Pitch", detail: "Open with the specific gap, not a generic template." },
  ]},

  { type: "h2", id: "outreach", text: "Why your outreach channel matters more than your list" },
  { type: "prose", text: [
    "Agencies default to cold email because that is what the sales tooling is built for. For local businesses — especially trades and small retail — it is the wrong channel, and the people selling into that market say so plainly.",
  ]},
  { type: "quote", text: "Paving is a good example where they just don't do email, so it's just all call, call, call, call and text.",
    attribution: "A contractor-focused salesperson, quoted in Origami's own research" },
  { type: "prose", text: [
    "That matches what the data looks like from our side. The businesses with no website are also the ones with no listed email — a phone number is very often the only contact that exists. If your entire outreach stack assumes an email address, you have filtered out your best prospects before you have called one.",
    "In India this goes further: a WhatsApp message on the number listed on the Maps profile gets read where an email would not have been delivered at all.",
  ]},

  { type: "h2", id: "qualify", text: "How to qualify before you call" },
  { type: "prose", text: [
    "A list is not a pipeline. Four checks, in this order, cut a raw list to the ones worth a conversation:",
  ]},
  { type: "checklist", items: [
    { title: "Is it trading?", detail: "recent reviews are the fastest proof" },
    { title: "Is the gap real?", detail: "a Facebook page is not a website, but it does change the pitch" },
    { title: "Can they pay?", detail: "review volume and category are decent proxies for ticket size" },
    { title: "Can you reach a decision-maker?", detail: "in a small local business the number on Maps usually is the owner" },
  ]},
  { type: "tip", title: "Practical tip",
    text: "Start with the top 20 businesses by review count that have no website. High review counts mean real customers and real revenue — and someone who already understands that being findable matters." },

  { type: "leads", city: "gurgaon", heading: "What this looks like in practice" },

  { type: "h2", id: "pitch", text: "What to say on the first call" },
  { type: "prose", text: [
    "Lead with the gap, not your services. \"I noticed you don't have a website\" is a statement about them; \"we build websites\" is a statement about you. The first earns thirty more seconds, the second ends the call.",
    "Then make it concrete: name a competitor in the same area who does rank, and say what that costs them. Specific beats persuasive.",
  ]},
];

const faqs = [
  { q: "How do I find businesses without a website for free?",
    a: "Search your category and area on Google Maps and check each listing for a website link. It is free and it works — it just costs about two minutes per lead, and you cannot filter for the ones worth calling first." },
  { q: "Why don't Apollo or ZoomInfo have these businesses?",
    a: "Those databases are built by crawling websites, LinkedIn pages and filings. A business with none of those has nothing for the crawler to land on, so it never enters the database." },
  { q: "Is a business with no website actually a good prospect?",
    a: "Only if it is trading. No website plus no recent reviews usually means dormant. No website plus a high review count means a working business turning away online enquiries — that is the strong signal." },
  { q: "Should I email or call local businesses?",
    a: "Call, or message on WhatsApp in India. Businesses with no website very often have no listed email either, and the phone number on their Maps profile is usually answered by the owner." },
  { q: "How often does this data change?",
    a: "Businesses open, close and add websites continuously. That is the argument against a bought list — it is accurate on the day it was compiled and decays from there." },
];

async function main() {
  await sql`
    INSERT INTO blog_authors (slug, name, role, bio, linkedin_url)
    VALUES (${AUTHOR.slug}, ${AUTHOR.name}, ${AUTHOR.role}, ${AUTHOR.bio}, ${AUTHOR.linkedin_url})
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, bio = EXCLUDED.bio
  `;

  const slug = "how-to-find-businesses-that-need-a-website";
  await sql`
    INSERT INTO blog_posts (
      slug, title, excerpt, meta_description, category, cluster, tags, author_slug,
      hero_variant, read_minutes, body, faqs, status, featured, published_at, content_updated_at
    ) VALUES (
      ${slug},
      ${"How to Find Businesses Without a Website in 2026"},
      ${"A practical playbook for finding local businesses with no website — why the databases you already pay for cannot see them, which gaps actually signal intent, and how to reach owners who never answer email."},
      ${"Find local businesses with no website. Why Apollo and ZoomInfo cannot see them, which gaps signal real intent, and how to reach owners who never read email."},
      ${"Lead Generation"}, ${"operations"},
      ${["Lead Generation", "Web Development", "Local SEO", "Sales Playbook"]},
      ${AUTHOR.slug}, ${"leads"}, ${12},
      ${sql.json(body as unknown as Parameters<typeof sql.json>[0])},
      ${sql.json(faqs as unknown as Parameters<typeof sql.json>[0])},
      ${"published"}, ${true}, ${new Date(Date.now() - 3600_000)}, ${null}
    )
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, meta_description = EXCLUDED.meta_description,
      category = EXCLUDED.category, cluster = EXCLUDED.cluster, tags = EXCLUDED.tags,
      hero_variant = EXCLUDED.hero_variant, read_minutes = EXCLUDED.read_minutes,
      body = EXCLUDED.body, faqs = EXCLUDED.faqs, featured = EXCLUDED.featured,
      updated_at = now()
  `;

  // Editorial links out. Descriptive anchors that make sense read alone, per Google's own test.
  await sql`DELETE FROM blog_links WHERE from_slug = ${slug}`;
  for (const [i, l] of [
    { href: "/leads/web-development/gurgaon", anchor: "businesses with no website in Gurugram", kind: "lead_page" },
    { href: "/pricing", anchor: "what lead credits cost", kind: "hub" },
  ].entries()) {
    await sql`
      INSERT INTO blog_links (from_slug, to_href, anchor, kind, position)
      VALUES (${slug}, ${l.href}, ${l.anchor}, ${l.kind}, ${i})
    `;
  }
  console.log("seeded:", slug);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
