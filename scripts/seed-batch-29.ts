/**
 * Batch 29 — the annual synthesis, the mechanism post, and the tier-2 argument.
 *
 * The state-of-the-market post is built entirely on live blocks — the country table, the city table
 * and index tokens — so it does not go stale between annual updates the way every other "state of"
 * report in this industry does. That is the point of it as much as the content.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · state of the market */
{
  slug: "state-of-local-lead-generation-2026",
  title: "State of Local Lead Generation 2026: What We Measured",
  excerpt: "Everything we can say with numbers behind it, in one place — the gap, where it concentrates, which channels work, and what the whole thing costs.",
  meta: "State of local lead generation in 2026: the measured website gap by country and city, which categories carry it, and what prospecting actually costs.",
  category: "Website Gaps", cluster: "data", hero: "methodology", mins: 11,
  tags: ["Original Data", "Market Research", "Website Gaps"],
  body: [
    { type: "prose", text: [
      "This is everything we can state with a measurement behind it, gathered in one place. **{{checked}} businesses checked across {{cities}} cities in {{countries}} countries, of which {{noSite}} — {{pct}} — have no website at all.**",
      "Everything here is measured rather than surveyed, and unlike most annual reports in this industry the figures are queried when this page is built rather than typed into it, so what you are reading is the index as it stands rather than as it stood when somebody wrote a paragraph.",
    ]},

    { type: "h2", id: "gap", text: "The lead generation gap, by country" },
    { type: "countrytable", note: "Read live at build time. Countries under 500 checked businesses are not shown." },
    { type: "prose", text: [
      "The spread is the finding rather than any single row. A fourfold difference between the top and bottom of that table means no global figure is usable for a decision, and the variation inside each country is wider still.",
    ]},

    { type: "h2", id: "cities", text: "Where it concentrates" },
    { type: "citytable", country: "in", min: 400, limit: 10, order: "gap",
      note: "Indian cities by gap rate, at least 400 checked. Also read live." },
    { type: "prose", text: [
      "The pattern holds across every market we measure: **the gap runs inversely to city size.** Second cities carry it, capitals do not. In Britain that means Liverpool and Birmingham against London; in India, Morena and Kota against Bengaluru and Mumbai.",
      "Inside a single city the spread is nearly as wide — neighbourhood-level rates range from the mid twenties to above fifty percent — which makes the area a better planning unit than the city.",
    ]},

    { type: "h2", id: "categories", text: "Which categories carry it" },
    { type: "prose", text: [
      "Category variation is the widest axis in the entire dataset, over tenfold from top to bottom, and it beats both country and city as a predictor.",
    ]},
    { type: "table", head: ["Category", "No website", "What it tells you"], rows: [
      ["Food court", "70.6%", "High gap, weak prospects — units inside buildings"],
      ["Guest house", "64.1%", "Against hotels at 14.4%, in one industry"],
      ["Farm", "65.9%", "Mostly not addressable"],
      ["Tailor", "59.4%", "Widest nameable gap, smallest tickets"],
      ["Hardware store", "50.2%", "Contractor customers, real money"],
      ["Car repair", "39.8%", "Largest category we track"],
      ["Laundry", "43.6%", "Higher in the US than in India"],
      ["Beauty salon", "29.9%", "Volume vertical, template work"],
      ["Dentist", "7.6%", "The most recommended niche in the industry"],
    ], note: "The last row against the first is the whole argument about niche lists." },
    { type: "prose", text: [
      "The single most consistent finding across all of it: **the gap is a property of the business model rather than of the country.** Every high-gap category anywhere has the same shape — a local customer who arrives in person and chooses on proximity rather than research. Country moves the level; the business model sets the order.",
    ]},

    { type: "h2", id: "quality", text: "What the businesses without websites are like" },
    { type: "prose", text: [
      "The finding we did not expect, and the one most useful in a sales conversation.",
      "Businesses without websites carry **roughly a third of the Google reviews** of businesses with them — a median of 36 against 120 in India — and the effect holds inside every large category we tested, so it is not a category artefact.",
      "But their **ratings are identical**. 4.77 against 4.74 for service businesses, 4.79 against 4.79 for educational institutions, and in two categories the businesses without websites rate slightly higher.",
      "Which rules out the convenient explanation. They are not worse businesses. They are equally good businesses that fewer people know about — and the causation is genuinely unproven in either direction, so nobody should be promising an owner that a website produces reviews.",
    ]},

    { type: "h2", id: "reachability", text: "How reachable they are" },
    { type: "table", head: ["", "Share"], rows: [
      ["Have a phone number", "95.6%"],
      ["Have a phone number, among those with no website", "90.7%"],
      ["Have a listed email address", "0%"],
    ], note: "Google's Places data carries no email field, which is why the third row is not a coverage gap." },
    { type: "prose", text: [
      "That table decides the channel question on its own. Email tooling — finders, verifiers, sequencers — returns blanks against this market by construction, and the entire outbound stack built around a named person at a domain has nothing to attach to.",
      "What works instead, in order: **walking in for anything counter-based, WhatsApp at low volume for appointment businesses, and the phone for verticals where the owner sits at a desk.** Cold calling here does not fail at the pickup — a business line is published on purpose and gets answered — it fails at the handoff, because whoever is nearest the counter answers it.",
    ]},

    { type: "h2", id: "economics", text: "What prospecting actually costs" },
    { type: "prose", text: [
      "The numbers that decide whether any of this is a business.",
      "**Data.** A licensed Places call costs about ₹3.08 and returns several businesses, so the underlying data is roughly ₹1–10 a prospect. Scraped Maps data is cheaper still at around ₹0.26 a record, with terms-of-service exposure as the trade.",
      "**Bought leads.** Shared leads run around ₹800 and exclusive around ₹3,000, at conversion rates that put cost per customer above ₹40,000 either way — which does not work against a ₹25,000 project. That entire model is priced for industries where a customer is worth ten to a hundred times more.",
      "**Conversations.** Roughly one in twenty qualified conversations closes, half of contact attempts reach a decision-maker, and ten clients takes about 250 qualified prospects.",
      "**Lifetime value.** A ₹25,000 first website is worth roughly ₹1.5 lakh over the relationship on conservative assumptions, of which the build is about 17%. The care plan and referrals are two-thirds.",
    ]},

    { type: "h2", id: "caveats", text: "What this is not" },
    { type: "prose", text: [
      "**It is our index, not a census.** We cover {{cities}} cities. A business we have never scanned is not in these figures, and a country low in the table may simply be one we have not worked.",
      "**Every rate is conservative.** A business counts as having a website if there is anything in its listing's website field — including a Facebook page, a directory profile, or a domain that no longer loads. The real first-website opportunity is larger than every number here.",
      "**Correction runs one way.** When a later check finds a business has built a site, we correct the record, which makes our own headline figure smaller over time. That is the right behaviour for a measurement and the wrong behaviour for a marketing statistic, and it is why these numbers move when the widely-quoted ones do not.",
    ]},

    { type: "leads", city: "kanpur", heading: "The index, on the ground" },

    { type: "cta", variant: "map", title: "The only number that matters is yours.",
      detail: "Your category, your city, counted rather than estimated.",
      action: "Check your market", href: "/login" },
  ],
  faqs: [
    { q: "How many local businesses have no website in 2026?", a: "{{pct}} of the {{checked}} businesses we have checked across {{cities}} cities in {{countries}} countries — {{noSite}} of them. The global figure is the least useful number in the report, though, because category variation runs over tenfold." },
    { q: "Where is the website gap biggest?", a: "In second cities rather than capitals, and in walk-in trades rather than researched purchases. The pattern holds in every market: Liverpool and Birmingham against London, Morena and Kota against Bengaluru." },
    { q: "Are businesses without websites worse businesses?", a: "No. They carry about a third of the Google reviews but their ratings are identical — 4.79 against 4.79 for educational institutions, and in two categories the businesses without websites rate slightly higher. They are equally good and less visible." },
    { q: "How do you reach businesses that have no website?", a: "By phone or in person. 95.6% have a phone number and none has a listed email, because Places data carries no email field. Walking in works best for counter businesses, WhatsApp for appointment businesses, and the phone where the owner sits at a desk." },
    { q: "What does prospecting this market cost?", a: "Data is roughly ₹1–10 a prospect licensed, or around ₹0.26 scraped. Bought leads do not work at this ticket — cost per customer exceeds ₹40,000 either shared or exclusive. Ten clients takes about 250 qualified prospects." },
  ],
  links: [["/resources/how-many-local-businesses-have-no-website", "the headline measurement"], ["/resources/which-local-verticals-actually-pay-for-a-website", "the vertical ranking"], ["/resources/which-indian-cities-have-the-biggest-website-gap", "the city table"], ["/resources/do-businesses-without-websites-get-fewer-reviews", "the review finding"], ["/resources/why-every-no-website-statistic-is-outdated", "why other figures disagree"]],
},

/* ───────────────────────────── 2 · why apollo/zoominfo miss */
{
  slug: "why-apollo-and-zoominfo-miss-businesses-without-websites",
  title: "Why Apollo and ZoomInfo Miss Businesses Without Websites",
  excerpt: "Not a coverage gap they will close. The unit these databases are built around does not exist for a business with no domain, which makes the omission structural.",
  meta: "Why Apollo and ZoomInfo miss businesses without websites: the unit they are built around, why coverage add-ons do not help, and what does find them.",
  category: "Comparisons", cluster: "tools", hero: "network", mins: 8,
  tags: ["Comparisons", "Tools", "Data"],
  body: [
    { type: "prose", text: [
      "Apollo and ZoomInfo do not miss businesses without websites because their coverage is thin. They miss them because **the record these databases are built around does not exist for such a business**, and no amount of additional coverage creates one.",
      "That distinction matters commercially. A coverage problem is solved by paying for more coverage. A structural one is not, and paying for an international data add-on to find businesses with no website is money spent on the wrong axis entirely.",
    ]},

    { type: "h2", id: "unit", text: "Why Apollo and ZoomInfo cannot form the record" },
    { type: "prose", text: [
      "Every contact database in this category stores the same shape of record: **a named person, holding a role, at a company identified by a domain.** That is the atom. Everything else — the filters, the enrichment, the email verification, the intent signals — hangs off it.",
      "The record gets assembled from sources that all presuppose a company with a web presence: corporate domains, email patterns inferred from them, professional networks where employees list an employer, and site-based firmographic scraping.",
      "Now take a hardware supplier in Kanpur with four hundred reviews and no website. **There is no domain, so there is no email pattern.** The owner is not on a professional network in any way the database can use. Nothing on the open web asserts who works there. The atom cannot be formed, so the business is not in the index — not sparsely covered, absent.",
    ]},
    { type: "table", head: ["What the database needs", "What this business has"], rows: [
      ["A company domain", "None — that is the premise"],
      ["An email pattern", "None, since there is no domain"],
      ["Employees with professional profiles", "An owner and three staff"],
      ["Firmographic web footprint", "A map listing"],
      ["A named decision-maker", "Whoever is at the counter"],
    ]},

    { type: "h2", id: "not-criticism", text: "This is not a criticism of the products" },
    { type: "prose", text: [
      "Worth saying plainly, because the point is often made unfairly.",
      "Both products are excellent at the job they were built for, which is finding and reaching decision-makers at companies that have websites. ZoomInfo's scale and Apollo's verification are genuinely strong, and for anyone selling B2B software, professional services or anything to companies with domains, they are the correct tools.",
      "The mismatch is entirely on the buyer's side. **An agency selling first websites is prospecting the one population these products define themselves out of** — and it is easy to miss, because the interface returns results for your search, they are just the wrong businesses.",
      "That last part causes real waste. A search for hardware stores in a city returns something, so it looks like coverage. What it returns is the larger, better-established businesses that already have websites, which is the precise inverse of what you wanted.",
    ]},

    { type: "h2", id: "add-ons", text: "Why the coverage add-ons do not help" },
    { type: "prose", text: [
      "ZoomInfo's data is concentrated in North America and international access comes through a separate paid add-on; Apollo's European coverage is inconsistent, which is why regional specialists exist and do well.",
      "All of that is true and none of it is your problem. **The geography add-on solves geography, and geography was never why those businesses were missing.** Buy the best European database available and search for barbers in Liverpool with no website: you will find very little, and it will not be because the product is weak in Britain.",
      "The test before paying for coverage: ask whether the businesses you want have domains. If they do, coverage is your constraint and an add-on may be worth it. If they do not, no product in this category will contain them at any price.",
    ]},

    { type: "h2", id: "partial", text: "The businesses they half-see" },
    { type: "prose", text: [
      "There is a middle case worth knowing about, because it produces the most misleading results of all.",
      "Some local businesses do have a domain — a free-builder subdomain, a directory profile, a domain bought years ago and abandoned — and those occasionally generate a thin record in a contact database. You get a company row with no people attached, or a single guessed address, or an employee count that is a guess.",
      "A thin record is worse than no record, because it looks like coverage. A search returns rows, the rows have names you recognise, and it is not obvious that the contact behind each one is inferred rather than known. That is how a campaign ends up sending guessed addresses at a domain that may not accept mail — which is precisely the pattern that damages a sending reputation.",
      "The practical guard: **check what a specific record actually asserts before trusting a list of them.** If the person, the title and the email were all inferred from a domain, you have a domain, not a contact.",
    ]},

    { type: "h2", id: "instead", text: "What does find them" },
    { type: "prose", text: [
      "Map listings, because a business appears there regardless of whether it has a website, a domain or an email. It is the only source with that property, which is why every tool that finds no-website businesses is built on it.",
      "The record you get is different in shape and it is worth knowing what you are trading. **You get a business rather than a person**: name, category, address, phone number, rating, review count and the website field. You do not get a named owner, a title, or an email address — and 95.6% of the businesses in our index have a phone number while none has a listed email.",
      "For this market that trade is favourable, because the owner is reachable at the business and the channels that work are the phone and the front door. It is unfavourable the moment you need to reach a specific person inside a larger organisation, which is when the contact databases become the right tool again.",
    ]},

    { type: "leads", city: "kanpur", heading: "What map data returns" },

    { type: "cta", variant: "map", title: "A different record shape.",
      detail: "Businesses rather than contacts — with the website field, the review count and a phone number.",
      action: "See the difference", href: "/login" },
  ],
  faqs: [
    { q: "Why can't Apollo or ZoomInfo find businesses without websites?", a: "Because their record is a named person, in a role, at a company identified by a domain, assembled from corporate domains, email patterns and professional networks. A business with no website has none of those, so the record cannot be formed and the business is absent rather than sparse." },
    { q: "Will a bigger plan or coverage add-on fix it?", a: "No. ZoomInfo sells international data as a paid add-on and Apollo's European coverage is inconsistent, but the geography add-on solves geography — and geography was never why those businesses were missing." },
    { q: "Are Apollo and ZoomInfo bad products?", a: "Not at all. They are excellent at reaching decision-makers at companies that have websites, which is a different job. The mismatch is on the buyer's side, and it is easy to miss because a search does return results — just the larger businesses that already have sites." },
    { q: "How do I know whether a contact database will work for me?", a: "Ask whether the businesses you want have domains. If they do, coverage may genuinely be your constraint and an add-on can be worth it. If they do not, no product in this category will contain them at any price." },
    { q: "What finds businesses without websites instead?", a: "Map listings, the only source where a business appears regardless of whether it has a website. You get a business rather than a person — name, category, phone, rating, reviews and the website field — which suits a market reached by phone and front door." },
  ],
  links: [["/resources/apollo-alternative-local-business-leads", "the comparison in full"], ["/resources/do-you-need-an-email-finder-for-local-businesses", "the same problem at the email layer"], ["/resources/lead-generation-tools-that-work-outside-the-us", "why coverage add-ons do not help"], ["/resources/best-lead-generation-tools-for-web-design-agencies", "the tools, by job"]],
},

/* ───────────────────────────── 3 · tier-2 thesis */
{
  slug: "tier-2-indian-cities-are-the-real-web-design-market",
  title: "Tier-2 Indian Cities Are the Real Web Design Market",
  excerpt: "Half the businesses have nothing and almost no agency is working them. The argument for basing a practice there, and the three things that make it harder than the numbers suggest.",
  meta: "Why tier-2 Indian cities are the real web design market: a 49.8% gap against 32.9% in the metros, and the three constraints that come with it.",
  category: "Website Gaps", cluster: "data", hero: "methodology", mins: 9,
  tags: ["India", "Market Research", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Half the businesses in India's tier-2 cities have no website and almost nobody is selling to them. **49.8% across the tier-2 and smaller cities in our index, against 32.9% in the metros and NCR** — a seventeen-point difference, and the largest structural split in the Indian data.",
      "The argument for working them is straightforward. The argument against is usually made badly, and the three genuine constraints are worth stating properly.",
    ]},

    { type: "h2", id: "case", text: "The case, in numbers" },
    { type: "table", head: ["", "Tier-1 and NCR", "Tier-2 and below"], rows: [
      ["Businesses checked", "50,165", "48,344"],
      ["No website", "16,485", "24,078"],
      ["Gap rate", "32.9%", "49.8%"],
      ["Average reviews", "644", "273"],
      ["Competing agencies", "Hundreds per city", "A handful"],
      ["What you mostly sell", "Redesigns", "First websites"],
    ]},
    { type: "prose", text: [
      "Roughly equal sample sizes on both sides, which makes this an unusually clean comparison. Half again as many prospects, and — the part that matters more — most of them have never been approached by anybody.",
      "The individual city figures are more striking than the aggregate. Morena runs near 80%, Kota above 64%, Kanpur above 62%. In a city like that a single market street is a week of work and there is no incumbent to displace.",
    ]},

    { type: "h2", id: "constraints", text: "The three real constraints" },
    { type: "prose", text: [
      "None of them is that the businesses cannot pay, which is the usual assumption and the wrong one. The businesses at the top of that table include hardware suppliers and clothing retailers with substantial turnover.",
      "**Tickets are lower, because the businesses are smaller.** Tier-1 businesses average 644 Google reviews against 273 in tier-2. That difference is real and it means a tier-2 practice needs more clients for the same revenue — volume rather than value, which changes how you build the business.",
      "**Delivery is slower.** First-time buyers have never assembled photographs, prices and descriptions for anything, so projects stall on content rather than on build. A content deadline in writing matters more here than in a metro, and a smaller first scope you can actually finish matters more still.",
      "**Expectations are less formed.** A metro business that has commissioned two sites knows what a revision round is. A first-time buyer often does not distinguish a change from a new project, which is exactly why counted revision rounds and a written scope are not bureaucracy at this end — they are how the project ends.",
    ]},

    { type: "h2", id: "not-travel", text: "This is an argument for basing, not for travelling" },
    { type: "prose", text: [
      "The most common mistake made with this data is treating a high tier-2 gap as a reason to travel, and it does not survive the economics.",
      "Walking in is the strongest channel in this market and it requires being there. A 49.8% gap four hours away is worse than a 32.9% gap you can reach on a scooter, because the channel that converts best needs you physically present and travel destroys the margin on a ₹25,000 ticket before you have quoted.",
      "**So the finding is about where a practice should be based, not where it should sell.** If you are already in a tier-2 city, you are sitting in the best market in the country for this work and should stop looking at metro clients. If you are in a metro, the honest answer is to sell redesigns and larger tickets locally rather than driving four hours for a better rate on a smaller job.",
      "The exception is a genuine adjacency. Faridabad from Delhi, or a satellite town from any metro, is a tier-2 market inside commuting distance — and that is the best of both, which is why the NCR figures reward being read city by city rather than as a block.",
    ]},

    { type: "h2", id: "competition", text: "What happens when competition arrives" },
    { type: "prose", text: [
      "Worth thinking about before building a practice on an absence, because absences close.",
      "The tier-2 gap exists partly because few agencies work these cities, and that is not permanent. As more do, the easiest half of each market gets taken — and the businesses that go first are exactly the ones everybody can identify: high review counts, on the main road, obviously successful.",
      "Two things protect a practice against that, and neither is being early. **Depth in a vertical**, because three sites for hardware suppliers in one city is a credential a newcomer cannot assemble quickly. And **the care plan base**, because recurring clients do not get re-sold and referrals compound inside a trade that talks to itself.",
      "The version that does not protect you is being the cheapest, which is the reflex when a second agency appears. In a market where the buyer cannot evaluate quality, price is the only visible axis — and the way out of that is having work to show in their trade, which takes a quarter and cannot be started once the competition has arrived.",
    ]},

    { type: "h2", id: "verticals", text: "Different verticals win there" },
    { type: "prose", text: [
      "The tier split is not uniform across categories, and this is where planning gets useful.",
      "**Proximity businesses carry enormous gaps in tier-2** — hardware, laundry, tailoring, convenience — because their customers are local by definition and nothing ever forced the question. Hardware in India runs near 80%.",
      "**Categories whose customers compare carry gaps in both** — coaching institutes, clinics, event venues, wholesalers — because the customer researches regardless of city size.",
      "Which produces a rule that inverts the standard advice to pick one vertical and work it everywhere: **in tier-2, sell to the proximity businesses; in tier-1, sell to the businesses whose customers compare.** The right vertical depends on where you are standing.",
    ]},

    { type: "leads", city: "kota", heading: "What a tier-2 market holds" },

    { type: "cta", variant: "map", title: "Check the city you are actually in.",
      detail: "Gap rates by Indian city and area, read live — including the tier-2 markets inside the NCR.",
      action: "Check your city", href: "/login" },
  ],
  faqs: [
    { q: "What is the website gap in tier-2 Indian cities?", a: "49.8% across the tier-2 and smaller cities in our index against 32.9% in the metros and NCR. Individual cities go much higher — Morena near 80%, Kota above 64%, Kanpur above 62%." },
    { q: "Why is tier-2 India a better web design market?", a: "Half again as many prospects, and most have never been approached. Metros have hundreds of agencies per city; a tier-2 city has a handful, and in the highest-gap cities a single market street is a week of work with no incumbent to displace." },
    { q: "What are the downsides of working tier-2?", a: "Lower tickets, because businesses are smaller — 273 average reviews against 644 in the metros. Slower delivery, because first-time buyers stall on content. And less formed expectations, which is why counted revision rounds matter more at this end." },
    { q: "Should I travel to a tier-2 city to sell websites?", a: "No. Walking in is the strongest channel and it needs you present, so a 49.8% gap four hours away is worse than a 32.9% gap you can reach on a scooter. This is an argument about where to base a practice, not where to sell." },
    { q: "Which verticals work best in tier-2 cities?", a: "Proximity businesses — hardware near 80%, laundry, tailoring — whose customers are local by definition so nothing forced the question. In metros, sell instead to businesses whose customers compare before choosing, like coaching institutes and clinics." },
  ],
  links: [["/resources/tier-1-vs-tier-2-india-website-gap", "the full comparison"], ["/resources/which-indian-cities-have-the-biggest-website-gap", "the city table"], ["/resources/how-to-start-a-web-design-agency-in-india", "starting one there"], ["/resources/which-local-verticals-actually-pay-for-a-website", "picking the vertical"]],
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
