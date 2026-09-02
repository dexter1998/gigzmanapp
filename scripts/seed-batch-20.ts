/**
 * Batch 20 — the three largest remaining verticals.
 *
 * Car repair is the standout finding of this batch and possibly of the whole index: 6,477 checked,
 * 39.8% without a website, and the American figure is 36.7% of 1,526 — roughly double the US
 * national rate of {{usPct}}. It is the one category where the US gap is genuinely large, which
 * makes it the most valuable single entry in this corpus for anyone selling in America.
 *
 * Guest houses at 64.1% sit against hotels at 14.4%, in the same trade, which is the cleanest
 * served-versus-unserved contrast we have inside one industry.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · car repair */
{
  slug: "how-to-sell-websites-to-car-repair-shops",
  title: "How to Sell Websites to Car Repair Shops and Garages",
  excerpt: "The largest category we track, and the only one where the American gap is genuinely large — 36.7% of US garages have no website, double the national rate.",
  meta: "How to sell websites to car repair shops: a 39.8% gap across 6,477 garages, why the US figure is double its national rate, and the pitch that works.",
  category: "Lead Generation", cluster: "playbooks", hero: "leads", mins: 9,
  tags: ["Vertical Playbook", "Agency Playbook", "Market Research"],
  body: [
    { type: "prose", text: [
      "Car repair is the largest single category in our index and one of the most consistently underserved: **6,477 garages checked, 39.8% with no website at all.**",
      "The number that should stop anyone selling websites in America: **36.7% of the 1,526 US garages we have checked have nothing** — roughly double the {{usPct}} national rate. This is the one category where the American gap is genuinely large, and it is not on any published niche list.",
    ]},

    { type: "h2", id: "international", text: "The gap by country" },
    { type: "table", head: ["Country", "Checked", "No website"], rows: [
      ["Italy", "220", "59.1%"],
      ["India", "1,620", "54.4%"],
      ["United Kingdom", "755", "40.3%"],
      ["United States", "1,526", "36.7%"],
      ["Australia", "383", "20.6%"],
      ["Germany", "720", "18.6%"],
    ], note: "Independent car repair businesses with a verified website check." },
    { type: "prose", text: [
      "Four of six markets above a third. For comparison, dentists — the vertical every niche list recommends — run at 7.6% globally. An American agency choosing between the two is choosing between a market that is 92% served and one that is 63% served, in a trade with comparable ticket sizes.",
      "The related categories are worth knowing: **auto parts stores at 49.8% and tyre shops at 29.3%**, the latter carrying an unusually high 278 average reviews.",
    ]},

    { type: "h2", id: "why", text: "Why garages never got one" },
    { type: "prose", text: [
      "The same reason as every other high-gap trade, with one addition specific to this one.",
      "Customers arrive by proximity and by recommendation, and a garage's reputation is built entirely by word of mouth over years. Nothing about the model ever demanded a website, and the owner has a long record of it working without one.",
      "The addition: **a good garage is usually full.** This is the objection you will hear most and it is genuinely true — an established independent with a two-week wait does not want more work, they want better work, and a pitch about getting more customers actively argues against itself.",
      "Which means the pitch cannot be volume. It has to be about which customers, and about what the shop currently loses.",
    ]},

    { type: "h2", id: "pitch", text: "What to pitch a full garage" },
    { type: "prose", text: [
      "Three angles, in order of how well they land on a busy owner.",
      "**The specialisation nobody knows about.** Most independents can do something the general trade cannot — a particular marque, gearboxes, diesel, electrics, classic restoration, fleet work. That capability is invisible, so the shop gets brake pads and oil changes while the high-margin work goes to someone findable. **This is the strongest pitch available in this vertical**, because it is about margin rather than volume, and every owner has an immediate answer to \"what work do you wish you got more of?\"",
      "**The questions eating their day.** Do you work on this model, how much roughly, can you take it Thursday, are you open Saturday. A garage answers these dozens of times a week, mid-job, with dirty hands. Putting them on a page is not marketing to them — it is removing an interruption.",
      "**Fleet and commercial accounts.** A taxi operator, a delivery company or a small logistics firm choosing a workshop does research, does compare, and is worth several times a retail customer. That decision is made online and the shop is not in it.",
    ]},
    { type: "tip", title: "The question that opens it",
      text: "\"What work do you wish you got more of?\" Every garage owner answers this instantly and specifically, and the answer is the entire website. It also sidesteps the full-shop objection, because you are not offering more work — you are offering a different mix." },

    { type: "h2", id: "objection", text: "\"We're already booked out\"" },
    { type: "prose", text: [
      "Agree completely, and then change what is being discussed.",
      "\"That's the point — you're full of the work anyone can do. If people knew you did gearboxes, you'd be full of that instead, at three times the ticket.\" That sentence works because it is true, because it flatters a real skill, and because it costs the owner nothing to imagine.",
      "The second angle for a genuinely full shop is **pricing power rather than volume**. A garage that is findable, has photographs of proper work and visible reviews can charge more than one that is a shed on a back road, for exactly the same job. Owners understand this instinctively about their own trade.",
    ]},

    { type: "h2", id: "price", text: "What to charge" },
    { type: "table", head: ["Build", "Contents", "Quote (India)"], rows: [
      ["Presence", "One page, services, timings, map, call button", "₹10,000–15,000"],
      ["Standard", "Service pages, specialisations, photos, booking enquiry", "₹22,000–38,000"],
      ["Full", "Per-service and per-marque pages, fleet enquiry, reviews", "₹40,000–70,000"],
      ["Care plan", "New work photographed monthly, seasonal service offers", "₹2,000–3,500/month"],
    ], note: "UK and US tickets are several times these for the same build." },
    { type: "prose", text: [
      "Anchor on the specialised job rather than the service. One additional gearbox rebuild or fleet account covers the site, and the owner will name that number themselves if you ask what their best kind of job is worth.",
    ]},

    { type: "leads", city: "kanpur", heading: "Garages with no website" },

    { type: "cta", variant: "map", title: "The biggest category on the board.",
      detail: "Car repair and auto services with no website — including in markets everyone assumes are served.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "What percentage of car repair shops have no website?", a: "39.8% of the 6,477 in our index, the largest single category we track. By country: Italy 59.1%, India 54.4%, the UK 40.3% and the United States 36.7% — roughly double the {{usPct}} US national rate." },
    { q: "Are garages a good niche for a US web design agency?", a: "One of the best available. American garages run at 36.7% without a website against dentists at 7.6% globally, in a trade with comparable ticket sizes — and car repair appears on no published niche list." },
    { q: "How do I answer \"we're already booked out\"?", a: "Agree, then change the subject from volume to mix. A full shop is full of work anyone can do; if people knew they did gearboxes or diesel or fleet work, they would be full of that instead at several times the ticket." },
    { q: "What should a car repair website contain?", a: "The specialisations nobody knows about, the questions that interrupt their day — which models, roughly how much, can you take it Thursday — and a fleet or commercial enquiry route, since operators research and compare before choosing a workshop." },
    { q: "What should I charge a garage for a website?", a: "₹10,000–15,000 for a presence page, ₹22,000–38,000 for service and specialisation pages with a booking enquiry, and ₹40,000–70,000 for per-marque pages with fleet enquiry. UK and US tickets are several times these." },
  ],
  links: [["/resources/how-to-sell-websites-to-car-washes", "the adjacent automotive vertical"], ["/resources/india-vs-uk-vs-australia-website-adoption", "why this gap travels"], ["/resources/which-local-verticals-actually-pay-for-a-website", "how it ranks"], ["/resources/how-indian-agencies-win-uk-and-australian-clients", "selling this vertical overseas"]],
},

/* ───────────────────────────── 2 · guest houses */
{
  slug: "how-to-sell-websites-to-guest-houses",
  title: "How to Sell Websites to Guest Houses and Homestays",
  excerpt: "Hotels are 14.4% without a website. Guest houses in the same trade are 64.1%. The gap between those two numbers is the entire opportunity, and so is the reason for it.",
  meta: "How to sell websites to guest houses and homestays: a 64.1% gap against hotels at 14.4%, the OTA commission argument, and what to charge.",
  category: "Lead Generation", cluster: "playbooks", hero: "leads", mins: 9,
  tags: ["Vertical Playbook", "Agency Playbook", "India"],
  body: [
    { type: "prose", text: [
      "Guest houses are one of the highest-gap categories we measure — **64.1% of 963 have no website, rising to 77.3% in India** — and the contrast that makes them interesting sits in the same industry.",
      "**Hotels run at 14.4%.** Same trade, same customers, same booking behaviour, and a fifty-point difference. That gap is not about technology; it is about who has a revenue manager and who does not.",
      "Which makes selling websites to guest houses and homestays a genuinely different job from selling to hotels, even though the businesses sit side by side on the same street.",
    ]},

    { type: "h2", id: "contrast", text: "The contrast inside one industry" },
    { type: "table", head: ["Category", "Checked", "No website", "Avg reviews"], rows: [
      ["Hotel", "4,180", "14.4%", "1,272"],
      ["Lodging (general)", "964", "27.9%", "182"],
      ["Guest house", "963", "64.1%", "119"],
    ], note: "Accommodation businesses with a verified website check." },
    { type: "prose", text: [
      "The review counts explain most of it. A hotel with 1,272 reviews is an operation with staff, systems and somebody whose job includes distribution. A guest house with 119 is a family running eight rooms, and the person who would build a website is the same person changing the sheets.",
      "It also means the ticket is smaller and the sale is more personal — this is a household as much as a business, and the pitch has to respect that.",
    ]},

    { type: "h2", id: "ota", text: "The commission argument, used carefully" },
    { type: "prose", text: [
      "Every guest house is on the booking platforms, and every owner knows exactly what those platforms take. The commission is not news to them and leading with it makes you the fourth person this month to explain their own costs.",
      "The version that works is narrower and arithmetical: **you are not replacing the platforms, you are trying to move the repeat guests off them.**",
      "A guest who stayed once and liked it will search the property by name next time. If there is no website, that search lands back on the platform and the commission is paid again on a booking the property had already earned. That is the specific, recoverable loss — not new bookings, returning ones.",
      "Ask what share of their guests are repeat visitors. In hill stations, pilgrimage towns and business districts the answer is often large, and the owner will do the multiplication themselves.",
    ]},
    { type: "quote", text: "You are not competing with the platforms for new guests. You are trying to stop paying commission on the old ones.", attribution: "The pitch, in one line" },

    { type: "h2", id: "build", text: "What to build for a guest house" },
    { type: "prose", text: [
      "Modest, and one thing done properly rather than a booking engine.",
      "**Photographs, honestly taken.** The single biggest determinant of whether a small property converts, and most of them have four bad pictures on a platform listing. Rooms, bathroom, view, breakfast, entrance. Nothing that overpromises — a small property gets punished harder for a flattering photograph than for a plain one.",
      "**Rooms, rates and what is included.** Stated plainly. Half the enquiries a guest house fields are questions its listing already fails to answer.",
      "**A WhatsApp enquiry button, not a booking engine.** This is the important call. A small property does not need real-time inventory, cannot maintain it, and will double-book itself within a month. A message with dates, confirmed by hand, matches how they already work.",
      "**How to get there.** Small properties are frequently hard to find, and the directions page is used more than any other on this kind of site.",
    ]},

    { type: "h2", id: "reviews", text: "Reviews are the product, and they are stranded" },
    { type: "prose", text: [
      "The strongest raw material a small property has, and almost none of them use it anywhere except where it was left.",
      "A guest house with 119 reviews and a 4.1 rating has years of guests describing what it is actually like to stay there — the breakfast, the owner, the walk from the station. That writing is better than anything you or the owner could produce, and it is sitting on a platform listing and a map profile where a returning guest never reads it properly.",
      "Pulling the best of it onto a page, attributed and unedited, does two things at once: it answers the question a prospective guest actually has, and it demonstrates to the owner that you understood their business rather than their industry. **This is usually the moment a hesitant guest house owner agrees**, because it is the first time somebody has shown them their own reputation as an asset.",
      "One caution worth respecting: quote reviews accurately, including the middling ones where they are useful. A small property that reads as too polished loses the thing that makes it choosable over a hotel.",
    ]},

    { type: "h2", id: "price", text: "What to charge, and the seasonal problem" },
    { type: "table", head: ["Build", "Contents", "Quote"], rows: [
      ["Presence", "One page, rooms, rates, photos, WhatsApp button", "₹8,000–14,000"],
      ["Standard", "Room pages, rates, gallery, directions, enquiry form", "₹18,000–30,000"],
      ["Full", "Seasonal rates, packages, local guide pages, reviews", "₹32,000–55,000"],
      ["Care plan", "Rate updates, seasonal offers, new photographs", "₹1,500–2,500/month"],
    ]},
    { type: "prose", text: [
      "The scheduling matters more here than the number. **These businesses have money in season and none out of it**, and quoting a hill station property in January is a different conversation from quoting it in April.",
      "Which cuts both ways usefully: sell in the season when cash exists, and build in the off-season when the owner has time to find photographs and answer questions. Saying that out loud — \"let's do it now while you're quiet, so it's live before the season\" — is a genuinely good reason that matches how they already think about their year.",
    ]},

    { type: "leads", city: "jaipur", heading: "Small properties with no website" },

    { type: "cta", variant: "map", title: "A 64% gap in one category.",
      detail: "Guest houses and small properties with no website — the highest gap in hospitality.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "What percentage of guest houses have no website?", a: "64.1% of the 963 in our index, rising to 77.3% in India — one of the highest gaps of any category. Hotels in the same industry run at 14.4%, which is a fifty-point difference inside one trade." },
    { q: "Why do guest houses lack websites when hotels have them?", a: "Scale. A hotel averaging 1,272 reviews has staff, systems and somebody whose job includes distribution. A guest house averaging 119 is a family running eight rooms, where the person who would build a site is the person changing the sheets." },
    { q: "How do I pitch against booking platforms?", a: "Do not try to replace them. Every owner already knows what commission costs. The recoverable loss is repeat guests — someone who stayed once searches the property by name, finds no website, books through the platform again, and commission is paid on a booking already earned." },
    { q: "Should a guest house website have a booking engine?", a: "No. A small property cannot maintain real-time inventory and will double-book itself within a month. A WhatsApp enquiry with dates, confirmed by hand, matches how they already work and is what they will actually use." },
    { q: "When should I approach a guest house?", a: "Sell in season when the cash exists, and build in the off-season when the owner has time to find photographs and answer questions. \"Let's do it while you're quiet, so it's live before the season\" matches how they already think about their year." },
  ],
  links: [["/resources/how-to-sell-websites-to-restaurants", "the other hospitality playbook"], ["/resources/which-local-verticals-actually-pay-for-a-website", "how this ranks"], ["/resources/why-facebook-only-businesses-are-your-best-prospects", "the platform-only objection"], ["/resources/how-much-to-charge-for-a-website-india", "the pricing bands"]],
},

/* ───────────────────────────── 3 · wholesalers */
{
  slug: "how-to-sell-websites-to-wholesalers",
  title: "How to Sell Websites to Wholesalers and Distributors",
  excerpt: "Half of them have nothing, their customers are other businesses, and the ticket is the largest in this corpus — because one recovered trade account is worth a year of retail.",
  meta: "How to sell websites to wholesalers and distributors: a 51.3% gap, why the buyer is another business, and how that changes the pitch and the price.",
  category: "Lead Generation", cluster: "playbooks", hero: "leads", mins: 9,
  tags: ["Vertical Playbook", "Agency Playbook", "B2B"],
  body: [
    { type: "prose", text: [
      "Wholesalers are the highest-value vertical in this corpus and one of the least worked: **51.3% of the 914 we have checked have no website**, and manufacturers alongside them run at 30.5% of 2,237.",
      "What makes selling websites to wholesalers different from every other playbook here is the buyer. A wholesaler's customer is another business — a retailer, a contractor, a restaurant, a workshop — and that changes the pitch, the content and the price simultaneously.",
    ]},

    { type: "h2", id: "buyer", text: "Why wholesalers need a website at all" },
    { type: "prose", text: [
      "This is the whole argument and it is the opposite of every other vertical in this corpus.",
      "A retail customer chooses on proximity and does not research. **A trade buyer researches, compares, and needs to justify the choice to somebody else.** A shop owner sourcing a new supplier, a contractor pricing a job, a restaurant changing its vegetable supplier — every one of those is a considered decision made partly online, often at night, and frequently by someone who has never met the wholesaler.",
      "Which means the no-website wholesaler is not just invisible. They are **excluded from a shortlist that gets made without them**, by buyers who are actively looking for exactly what they sell. That is a much sharper loss than a missed walk-in, and it is one the owner recognises immediately if you describe it.",
      "It also explains why the ticket is larger. A single trade account can be worth lakhs a year, so the arithmetic on a ₹60,000 site is one account, once.",
    ]},

    { type: "h2", id: "content", text: "What a trade buyer needs to see" },
    { type: "prose", text: [
      "A different list from any retail vertical, and it is mostly about qualification rather than persuasion.",
    ]},
    { type: "checklist", items: [
      { title: "The range, by category", detail: "Not a catalogue with prices — the categories and brands carried, so a buyer can tell in ten seconds whether this supplier is relevant." },
      { title: "Minimum order quantities", detail: "The first question every trade buyer has, and the one that disqualifies fastest. Answering it publicly saves both sides a call." },
      { title: "Delivery area and terms", detail: "Where they deliver, how fast, and what the minimum is for free delivery." },
      { title: "Credit terms, at least in principle", detail: "Whether accounts are available. This decides more B2B supplier choices than price does." },
      { title: "Who they already supply", detail: "The trade equivalent of reviews. A list of the kinds of businesses they serve, and any names permitted." },
      { title: "A trade enquiry form", detail: "Business name, what they need, quantity. Not a contact form — a qualification form." },
    ]},
    { type: "prose", text: [
      "Notice what is absent: photographs of the warehouse, a paragraph about the founder's vision, and anything resembling consumer marketing. A trade buyer wants to establish fit and move on, and a site that makes that fast is doing its entire job.",
    ]},

    { type: "h2", id: "objection", text: "\"Our customers already know us\"" },
    { type: "prose", text: [
      "The standard objection here, and unlike in retail it has a precise answer.",
      "Their existing customers do know them. The website is not for those customers — **it is for the buyer whose current supplier just let them down.** That happens constantly in trade: a delayed delivery, a price rise, a quality problem, a shop opening in a new area. At that moment somebody searches, and a shortlist gets made from whoever is findable.",
      "The second angle is generational and lands hard in family businesses. The person who now sources for a retailer is often ten or twenty years younger than the person who did five years ago, and they do not have the relationships their predecessor had. They search. The wholesaler's forty-year reputation exists entirely in the memory of people who are retiring.",
    ]},

    { type: "h2", id: "finding", text: "Finding them, which is harder than it sounds" },
    { type: "prose", text: [
      "Wholesalers are the one vertical here that is genuinely difficult to prospect, and it is worth knowing before you plan a week around it.",
      "**They are not on the high street.** Trade suppliers sit in industrial areas, wholesale markets and unmarked units, which breaks the clustering that makes walk-in rounds efficient everywhere else. A round of eight retail shops on one street becomes four suppliers across an industrial estate.",
      "**Their map listings are thin.** Many carry a name, a phone number and nothing else — no photographs, few reviews, sometimes a category that describes the trade rather than the business. The qualification signals used elsewhere in this corpus, particularly review count, are much weaker here.",
      "**But they concentrate absolutely.** Wholesale markets are the densest prospecting environment in any city — a single market can hold two hundred suppliers in a few streets, and the trade talks to itself constantly, which makes referrals unusually strong once you have one client inside it.",
      "The practical approach is the reverse of the retail one: find the market rather than the businesses, spend a first visit learning what trades in it, and treat the first client there as an introduction to the rest rather than as a single sale.",
    ]},

    { type: "h2", id: "price", text: "The largest tickets in this corpus" },
    { type: "table", head: ["Build", "Contents", "Quote"], rows: [
      ["Presence", "One page, range, contact, delivery area", "₹15,000–25,000"],
      ["Standard", "Category pages, MOQs, terms, trade enquiry form", "₹35,000–65,000"],
      ["Full", "Full range with specifications, account application, downloads", "₹70,000–1,50,000"],
      ["Care plan", "Range and price list updates, new products", "₹3,000–6,000/month"],
    ], note: "Anchored against a trade account rather than a transaction — the only vertical here where a six-figure build is routine." },
    { type: "prose", text: [
      "Ask what one trade account is worth over a year. The answer is usually lakhs, and it makes a ₹65,000 site an obvious decision in a way it never is for a bakery. **This is the one vertical in this corpus where you should not be pricing at the bottom of your range.**",
      "The care plan is also the highest here, and easily justified: rate lists genuinely change, stock ranges move, and a wholesaler's site is wrong within weeks of launch if nobody maintains it.",
    ]},

    { type: "leads", city: "surat", heading: "Wholesalers and suppliers with no website" },

    { type: "cta", variant: "map", title: "The highest tickets on the board.",
      detail: "Wholesalers and distributors with no website — trade buyers are already searching for them.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "What percentage of wholesalers have no website?", a: "51.3% of the 914 wholesalers in our index, with manufacturers alongside them at 30.5% of 2,237. It is one of the highest-gap categories and the highest-value one in this corpus." },
    { q: "Why is the pitch different for wholesalers?", a: "Because the buyer is another business, and businesses research. A retail customer chooses on proximity; a trade buyer compares suppliers and has to justify the choice — so a wholesaler with no website is excluded from a shortlist made without them." },
    { q: "What should a wholesaler's website contain?", a: "Range by category, minimum order quantities, delivery area and terms, whether credit accounts are available, the kinds of businesses they already supply, and a trade enquiry form that captures business name and quantity. Qualification, not persuasion." },
    { q: "How do I answer \"our customers already know us\"?", a: "The site is not for existing customers — it is for the buyer whose current supplier just let them down, which happens constantly in trade. And the person sourcing for a retailer today is often much younger than the one who did five years ago, and does not have those relationships." },
    { q: "What should I charge a wholesaler?", a: "More than any other vertical here: ₹15,000–25,000 for a presence page, ₹35,000–65,000 for category pages with MOQs and a trade enquiry form, and ₹70,000–1,50,000 for a full range with account applications. One trade account is usually worth lakhs a year." },
  ],
  links: [["/resources/how-to-sell-websites-to-hardware-stores", "the adjacent trade vertical"], ["/resources/which-local-verticals-actually-pay-for-a-website", "how this ranks for value"], ["/resources/justdial-indiamart-as-lead-sources", "where these businesses are listed"], ["/resources/how-much-to-charge-for-a-website-india", "pricing at the top of the range"]],
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
