/**
 * Batch 27 — three keyword-targeted posts where the honest answer contradicts the genre.
 *
 * Dentists are the most-recommended web design niche in existence and are 2.0% without a website in
 * the US, 3.9% in the UK, 0.3% in Australia and 0.4% in Germany. In India they are 21.3% of 661.
 * Trades invert by country in a way worth documenting: Indian plumbers are 68.6% and electricians
 * 66.6%, while US plumbers are 4.9% and US electricians 18.8% — a fourfold difference between two
 * trades in one country that nothing published would predict.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · dentists */
{
  slug: "web-design-for-dentists-an-honest-look",
  title: "Web Design for Dentists: An Honest Look at the Niche",
  excerpt: "The most recommended niche in the industry is 98% served in every Western market we measure. Where it is still a real niche, and what to sell where it is not.",
  meta: "Web design for dentists: 2.0% of US dentists lack a website against 21.3% in India. Where the niche is real, and what to sell in the markets where it is not.",
  category: "Comparisons", cluster: "data", hero: "methodology", mins: 9,
  tags: ["Original Data", "Vertical Playbook", "Market Research"],
  body: [
    { type: "prose", text: [
      "Dentistry is the single most recommended web design niche in the English-language agency literature, and in the markets that literature is written for it is effectively gone. **2.0% of the 398 American dentists in our index have no website. In Australia it is 0.3%. In Germany 0.4%. In the United Kingdom 3.9%.**",
      "In India it is **21.3% of 661** — a real vertical, and the only market we measure where a first-website dental niche exists at all. What follows is an honest look at both situations.",
    ]},

    { type: "h2", id: "numbers", text: "Dentists, by country" },
    { type: "table", head: ["Country", "Checked", "No website", "Avg reviews"], rows: [
      ["India", "661", "21.3%", "329"],
      ["United Kingdom", "363", "3.9%", "273"],
      ["United States", "398", "2.0%", "151"],
      ["Germany", "242", "0.4%", "3"],
      ["Australia", "291", "0.3%", "153"],
    ], note: "Dental practices with a verified website check." },
    { type: "prose", text: [
      "Australia at 0.3% means roughly one practice in three hundred. That is not a niche with a small gap; it is a niche with no gap.",
    ]},

    { type: "h2", id: "why-recommended", text: "Why everyone recommends it anyway" },
    { type: "prose", text: [
      "Because the recommendation is about value, and on value it is entirely correct.",
      "A dental patient is worth a great deal — the figures quoted in agency niche guides run to several thousand dollars for implant work — the practices have real marketing budgets, they buy professionally, and the work is repeatable across clients because every dental site needs roughly the same things.",
      "None of that is wrong. **What the guides never check is whether those practices already have websites**, and the answer everywhere except India is essentially all of them. So the advice describes an excellent redesign market and calls it a niche, which sends people prospecting for something that does not exist.",
    ]},

    { type: "h2", id: "redesign", text: "What the dental market actually is" },
    { type: "prose", text: [
      "A redesign and marketing market, and a good one, sold at redesign prices.",
      "**The sites are old.** Practices build once and leave it, so a substantial share of that fully-served market is running something from years ago that no longer reflects the treatments offered.",
      "**The buyer can evaluate quality.** A practice owner who has commissioned two sites understands load time, mobile behaviour and why a booking form must actually work — which means the price competition that makes first-website selling brutal is much weaker here.",
      "**The competition is intense and specialised.** Whole agencies do nothing but dental, with dental-specific case studies and an understanding of local advertising rules for medical practice. Walking in with three restaurant sites will not compete.",
      "So the honest version for a Western agency is: dentistry is a good niche if you commit to it properly as a specialist, and a poor one to dabble in. That is the opposite of how the niche guides present it.",
    ]},

    { type: "h2", id: "india", text: "Where it is still a first-website market" },
    { type: "prose", text: [
      "India, at 21.3%, with 329 average reviews — higher than any other market's dentists in our index, which reflects how much Indian patients rely on Google reviews when choosing a clinic.",
      "That combination is favourable: one in five with nothing, and the ones without it are still carrying substantial public reputation. The pitch is straightforward because the purchase is considered — somebody choosing a dentist for a root canal or braces researches, compares and wants to know what a practice actually does before calling.",
      "The build is well understood: treatments offered, the dentists and their qualifications, the clinic itself in photographs, timings, location, and an appointment enquiry. Tickets sit at the upper end for a local business, ₹35,000–80,000, because the practice economics support it easily.",
      "One thing to handle carefully: medical practice advertising is regulated, and what a clinic may claim about outcomes is not a decision for you. Sell an informational presence, and let the practice and its own advisers decide how far it goes.",
    ]},

    { type: "h2", id: "instead", text: "What to do instead, in a served market" },
    { type: "prose", text: [
      "If you are in a market where dentists are at 2%, the same instinct that pointed you at dentistry points somewhere better.",
      "You wanted a vertical with real ticket sizes and repeatable work. In Western markets, the categories with both a gap and a ticket are **car repair at 36.7% in the US, laundries at 54.2%, and car washes at 24.6%** — none of which appears on a niche list, and all of which are available.",
      "The reason those are absent from the guides is the same reason dentistry is on them: the lists rank by what a customer is worth and never check who is already served. Applying availability as a second filter produces a completely different list, and it is a list nobody is competing on.",
    ]},

    { type: "leads", city: "hyderabad", heading: "Where dental is still open" },

    { type: "cta", variant: "map", title: "Check the niche in your own market.",
      detail: "Category rates by country and city — the same vertical can be 21% in one market and 0.3% in another.",
      action: "Check your market", href: "/login" },
  ],
  faqs: [
    { q: "Is web design for dentists a good niche?", a: "In India yes, at 21.3% without a website. In Western markets it is effectively gone — 2.0% in the US, 3.9% in the UK, 0.4% in Germany and 0.3% in Australia, which is roughly one practice in three hundred." },
    { q: "Why do agency guides recommend dentists?", a: "Because they rank by what a patient is worth, where dentistry genuinely excels — implant work runs to thousands, budgets are real, and the work repeats across clients. None of them checks whether those practices already have websites." },
    { q: "Can I still sell to dentists in a served market?", a: "As a redesign specialist, not as a dabbler. The sites are old, the buyer can evaluate quality so price competition is weaker, and the competition is entire agencies doing nothing but dental. Three restaurant sites will not compete." },
    { q: "What should an Indian dental website contain?", a: "Treatments offered, the dentists and their qualifications, photographs of the clinic, timings, location and an appointment enquiry. Tickets run ₹35,000–80,000. Medical advertising is regulated, so sell an informational presence and let the practice decide how far it goes." },
    { q: "What are better niches than dentistry in Western markets?", a: "The ones with both a gap and a ticket: car repair at 36.7% in the US, laundries at 54.2%, car washes at 24.6%. None appears on a niche list, because those lists rank by customer value and never check availability." },
  ],
  links: [["/resources/which-local-verticals-actually-pay-for-a-website", "the availability-aware ranking"], ["/resources/are-lawyers-and-accountants-a-good-web-design-niche", "the same pattern in professional services"], ["/resources/how-to-price-a-website-redesign", "selling into a served market"], ["/resources/how-to-sell-websites-to-car-repair-shops", "the Western gap nobody lists"]],
},

/* ───────────────────────────── 2 · contractors */
{
  slug: "web-design-for-contractors-where-the-leads-are",
  title: "Web Design for Contractors: Where the Leads Are",
  excerpt: "Indian plumbers run at 68.6% and American ones at 4.9%. Between two trades in one country the gap varies fourfold, and no published niche list predicts any of it.",
  meta: "Web design for contractors: gap figures for plumbers, electricians, roofers and painters by country, and why the trades vary so much between markets.",
  category: "Lead Generation", cluster: "playbooks", hero: "leads", mins: 9,
  tags: ["Vertical Playbook", "Market Research", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Web design for contractors is the one recommendation in the niche-list genre our data supports, and only in the right country and the right trade — which is why the leads are not where the lists say. **Indian plumbers run at 68.6% without a website and Indian electricians at 66.6%. American plumbers run at 4.9% — and American electricians at 18.8%.**",
      "A fourfold difference between two adjacent trades inside one market is not something any published guide anticipates, and it is the reason \"contractors\" is too coarse a target to plan around.",
    ]},

    { type: "h2", id: "numbers", text: "The trades, measured" },
    { type: "table", head: ["Trade", "Checked", "No website", "Avg reviews"], rows: [
      ["Plumber", "1,871", "39.4%", "89"],
      ["Electrician", "2,042", "38.7%", "56"],
      ["Painter", "1,704", "19.9%", "48"],
      ["Roofing contractor", "1,464", "13.6%", "38"],
    ], note: "Trade businesses with a verified website check, all markets combined." },
    { type: "table", head: ["Trade and country", "Checked", "No website"], rows: [
      ["Plumber — India", "965", "68.6%"],
      ["Electrician — India", "1,013", "66.6%"],
      ["Electrician — United States", "245", "18.8%"],
      ["Germany — electrician", "194", "4.1%"],
      ["Plumber — Germany", "183", "8.2%"],
      ["Plumber — United States", "244", "4.9%"],
    ], note: "The same two trades, by market. The ordering does not hold across countries." },
    { type: "prose", text: [
      "Roofing at 13.6% is the clearest correction to the published advice, because roofing appears on almost every niche list on the strength of its ticket size. Those businesses overwhelmingly already have websites, and the ones that do not are usually very small.",
    ]},

    { type: "h2", id: "why-vary", text: "Why the trades vary so much" },
    { type: "prose", text: [
      "Two things, and they explain most of the table.",
      "**Whether the work is planned or urgent.** A roof is a planned, expensive, compared purchase — customers research for weeks, so roofers were forced online early. A blocked drain is an emergency and the customer calls whoever appears first, which for years meant a directory rather than a website.",
      "**Whether the market has a lead-generation platform.** In the US and UK, home-services lead platforms captured the trades early and gave them a channel that felt like enough. Where those platforms are weaker, trades stayed on word of mouth and never built anything — which is a large part of why Indian plumbers sit at 68.6%.",
      "The American plumber-versus-electrician gap fits this: both are urgent trades, but electrical work skews further toward planned jobs — rewiring, panel upgrades, commercial contracts — and planned work does not necessarily get you onto an emergency-call platform.",
    ]},

    { type: "h2", id: "pitch", text: "What to pitch a trade business" },
    { type: "prose", text: [
      "Not \"more customers\". A busy plumber does not want more calls, and saying so is the fastest way to be dismissed.",
      "**The job type they want more of.** Every trade has profitable work and unprofitable work, and the profitable kind is usually planned rather than emergency. A plumber wants bathroom installations, not blocked drains at midnight. An electrician wants rewiring contracts, not a socket. Ask what work they wish they got more of — the answer is the website, and it sidesteps the busy objection entirely.",
      "**Getting off the platform.** In markets where lead platforms dominate, trades pay per lead for work they are then quoting against three competitors. A website that produces direct enquiries is a margin argument rather than a volume one, and tradespeople understand margin arguments immediately.",
      "**Being verifiable.** A customer letting somebody into their home checks who they are, and increasingly that check happens before the call rather than after. Photographs of completed work, a real address and visible qualifications do more here than in almost any other vertical.",
    ]},
    { type: "tip", title: "The photographs are the build",
      text: "Every tradesperson has hundreds of photographs of completed jobs on a phone, taken for quoting and for proof. Organised by job type with a rough price band, that is most of the site and none of it needs creating." },

    { type: "h2", id: "seasonal", text: "The trades have a calendar" },
    { type: "prose", text: [
      "Worth knowing before planning a month around this vertical, because trade demand is not flat and neither is trade cash.",
      "**Monsoon and winter reshape the year.** Roofing, painting and exterior work concentrate before and after the rains in India, and the trades that depend on them have money at predictable points and none at others. An electrician doing installations is steadier than a painter, whose year has a shape.",
      "**The busy season is the wrong time to sell.** A trade business mid-season is on-site all day and unreachable by any channel, and the quote you leave will not be read. The off-season is when the owner is in the workshop, has cash from the season, and has time to look at photographs of their own work.",
      "**Which makes the pitch timing explicit and useful:** approach before a season with a build that will be ready for it, or during the quiet months framed as getting ready for the next one. Both are reasons that match how a tradesperson already thinks about their year, which is more persuasive than any argument about being online.",
    ]},

    { type: "h2", id: "commercial", text: "The commercial accounts are where the money is" },
    { type: "prose", text: [
      "The part most agencies miss because they think about trades as domestic services.",
      "A plumber or electrician with commercial accounts — a builder, a property manager, a facilities company, a small chain — has a completely different business from one doing domestic call-outs. The work is scheduled, invoiced monthly, and worth many times a household job.",
      "Those accounts are won by being findable and looking substantial, because a facilities manager sourcing a contractor searches, checks, and needs something to show whoever approves it. **A trade business with no website is invisible to exactly that buyer**, and that is a far sharper loss than a missed domestic call.",
      "It also raises the ticket. A trade site pitched at commercial work supports ₹35,000–60,000 in India and considerably more in Western markets, against ₹12,000–20,000 for a domestic presence page.",
    ]},

    { type: "leads", city: "lucknow", heading: "Trades with no website" },

    { type: "cta", variant: "map", title: "Check the trade, not the sector.",
      detail: "Plumbers and electricians differ fourfold between markets — check yours before committing an afternoon.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "Are contractors a good web design niche?", a: "Depends on the trade and the country. Indian plumbers run at 68.6% and electricians at 66.6%; American plumbers are 4.9% while American electricians are 18.8%. \"Contractors\" is too coarse a target — a fourfold difference exists between adjacent trades in one market." },
    { q: "Why do so many niche lists recommend roofing?", a: "Because of ticket size. Our data puts roofing contractors at 13.6% without a website, one of the lower gaps we measure — a roof is a planned, compared, expensive purchase, so those businesses were forced online early." },
    { q: "What should I pitch a plumber or electrician?", a: "The job type they want more of, not more customers. Every trade has profitable planned work and unprofitable emergency work — a plumber wants bathroom installations, not blocked drains at midnight — and asking sidesteps the busy objection entirely." },
    { q: "Why do the trades vary so much between countries?", a: "Urgency and platforms. Planned work like roofing forced businesses online early everywhere. And where home-services lead platforms captured the trades, they provided a channel that felt like enough — where those platforms are weaker, trades stayed on word of mouth." },
    { q: "Where is the biggest ticket in trade work?", a: "Commercial accounts. A plumber with builder or facilities clients has scheduled, monthly-invoiced work worth many times a domestic call-out, and that buyer searches and needs something to show an approver. A site pitched at commercial work supports ₹35,000–60,000 in India." },
  ],
  links: [["/resources/which-local-verticals-actually-pay-for-a-website", "how the trades rank"], ["/resources/how-to-sell-websites-to-car-repair-shops", "the adjacent skilled trade"], ["/resources/india-vs-uk-vs-australia-website-adoption", "why country changes everything"], ["/resources/web-design-for-dentists-an-honest-look", "the other most-recommended niche"]],
},

/* ───────────────────────────── 3 · high ticket india */
{
  slug: "high-ticket-web-design-niches-in-india",
  title: "High-Ticket Web Design Niches in India, Ranked",
  excerpt: "Ranked by what you can actually quote rather than by how many prospects exist. Four verticals support six-figure builds, and three of them are ignored entirely.",
  meta: "High-ticket web design niches in India ranked by what each supports: which verticals justify ₹50,000 and above, and why the gap rate is the wrong filter here.",
  category: "Comparisons", cluster: "data", hero: "pricing", mins: 9,
  tags: ["Pricing", "Market Research", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Most rankings of web design niches sort by how many prospects exist. This one sorts the same Indian niches by **what you can quote**, which is a different question and often the more useful one — twenty ₹60,000 projects is a better year than fifty ₹18,000 ones, and it is less work.",
      "The ticket a vertical supports is set by one thing: what a single customer is worth to that business over a year. Not their turnover, not their size.",
    ]},

    { type: "h2", id: "ranked", text: "Ranked by supportable ticket" },
    { type: "table", head: ["#", "Vertical", "Supports", "Why"], rows: [
      ["1", "Wholesalers and distributors", "₹70,000–1,50,000", "One trade account is worth lakhs a year"],
      ["2", "Coaching and education", "₹40,000–90,000", "An annual admission, repeated"],
      ["3", "Caterers", "₹45,000–80,000", "One wedding covers the build"],
      ["4", "Sports academies", "₹45,000–90,000", "Annual fees, per child, per year"],
      ["5", "Electronics and appliance retail", "₹40,000–75,000", "High-margin single sales"],
      ["6", "Dental and medical practices", "₹35,000–80,000", "Considered, high-value treatment"],
      ["7", "Car repair with fleet work", "₹40,000–70,000", "Commercial accounts, not walk-ins"],
      ["8", "Guest houses and small hotels", "₹32,000–55,000", "Repeat bookings off the platforms"],
    ], note: "What the vertical supports, not what most people charge it. Gap rates are deliberately absent from this table." },
    { type: "prose", text: [
      "Wholesalers top it by a wide margin and are the least worked vertical on the list, which is an unusual combination. Their buyer is another business, that buyer researches before choosing a supplier, and a single account can be worth more than every retail customer a shop sees in a month.",
    ]},

    { type: "h2", id: "why-ignored", text: "Why the top of this list is ignored" },
    { type: "prose", text: [
      "Three reasons, and none of them is that the work is harder.",
      "**They are not on the high street.** Wholesalers sit in industrial areas and wholesale markets, which breaks the clustered walk-in round that makes retail prospecting efficient. Most agencies never go there.",
      "**Their listings are thin.** A name, a phone number, few photographs, few reviews. The qualification signals used everywhere else barely function, so they look unpromising to anyone scanning a list.",
      "**They do not feel like web design clients.** A trade supplier does not present as a business that wants a website, and an agency thinking about \"who needs a website\" pictures a restaurant rather than a bearings distributor.",
      "All three are reasons for the low competition rather than reasons to avoid them.",
    ]},

    { type: "h2", id: "test", text: "The test for any vertical" },
    { type: "prose", text: [
      "You do not need this table. You need the question that produced it: **what is one customer worth to this business over a year?**",
      "A convenience store: a few hundred rupees. A restaurant: a few thousand. A coaching institute: twenty-five to forty thousand, because it is an annual fee. A wholesaler with trade accounts: lakhs.",
      "That number sets the ceiling on what the website is worth, and the owner will tell you it in the first conversation if you ask. Everything else — page count, design complexity, how long it takes you — is your problem rather than a pricing input.",
      "The corollary matters as much: **a vertical with a huge gap and a small customer value cannot be made to pay.** Convenience stores are half without a website and a customer is worth a few hundred rupees, and no amount of prospecting skill changes what they can justify.",
    ]},

    { type: "h2", id: "selling-up", text: "Selling at the top of a band" },
    { type: "prose", text: [
      "Knowing a vertical supports ₹70,000 does not mean you will get it, and the gap between what a vertical supports and what most people charge it is almost entirely about evidence.",
      "**Three examples in the same trade.** A wholesaler looking at three sites you built for other wholesalers will pay the top of the band. The same wholesaler looking at three restaurant sites will not, regardless of quality, because they cannot evaluate whether you understand their business.",
      "**A scope that matches the ticket.** A ₹70,000 quote for five pages reads as overpriced. The same ₹70,000 for a categorised range, minimum order quantities, credit terms and a trade enquiry form reads as a specification. The number has to be attached to something visibly larger.",
      "**Their number, not yours.** Ask what a trade account is worth over a year before quoting. When the answer is lakhs, ₹70,000 is a sentence they complete themselves — and a price the client has justified internally does not get negotiated the way one you asserted does.",
      "The practical sequence for anyone starting: work the vertical at the middle of the band until three examples exist, then quote the top. That is a quarter of work, not a positioning exercise.",
    ]},

    { type: "h2", id: "combine", text: "Combining ticket with availability" },
    { type: "prose", text: [
      "The two rankings — by ticket and by gap — do not agree, and the verticals that appear high on both are where a small agency should actually work.",
      "**On both lists:** wholesalers (51.3% gap, highest ticket), coaching, electronics retail, car repair, guest houses. That overlap is the practical target list for Indian local work.",
      "**High ticket, low gap:** dental and medical, which is mostly a redesign market outside India and a real one inside it.",
      "**High gap, low ticket:** tailors, barbers, laundries, convenience stores. Workable at volume on templates with care plans, and never as a primary target.",
      "If you take one thing from this: **pick from the overlap, and let the gap rate decide the city rather than the vertical.**",
    ]},

    { type: "leads", city: "surat", heading: "The top of the list" },

    { type: "cta", variant: "map", title: "Find the overlap.",
      detail: "Verticals with both a real gap and a real ticket — filtered by category, city and review count.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "What is the highest-ticket web design niche in India?", a: "Wholesalers and distributors, supporting ₹70,000–1,50,000, because one trade account is worth lakhs a year to that business. They are also among the least worked verticals, since they sit in industrial areas rather than on the high street." },
    { q: "How do I know what ticket a vertical supports?", a: "Ask what one customer is worth to that business over a year. A convenience store is a few hundred rupees, a restaurant a few thousand, a coaching institute twenty-five to forty thousand, a wholesaler with trade accounts lakhs. That sets the ceiling." },
    { q: "Why are high-ticket verticals ignored?", a: "They are not on the high street, so the clustered walk-in round breaks; their listings are thin, so the usual qualification signals barely function; and they do not present as businesses that want a website. All three explain the low competition." },
    { q: "Can a high-gap vertical be made to pay?", a: "Not if the customer value is small. Convenience stores are half without a website and a customer is worth a few hundred rupees — no amount of prospecting skill changes what they can justify. Gap and ticket have to be read together." },
    { q: "Which verticals rank well on both gap and ticket?", a: "Wholesalers, coaching, electronics retail, car repair and guest houses. That overlap is the practical target list — pick from it, and let the gap rate decide which city to work rather than which vertical." },
  ],
  links: [["/resources/which-local-verticals-actually-pay-for-a-website", "the ranking by gap and demand"], ["/resources/how-to-sell-websites-to-wholesalers", "the top of this list"], ["/resources/how-much-to-charge-for-a-website-india", "the pricing bands"], ["/resources/should-you-niche-down-what-the-data-says", "how large a niche needs to be"]],
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
