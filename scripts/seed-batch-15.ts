/**
 * Batch 15 — three verticals with real gaps that appear on no published niche list.
 *
 * Event venues were the fourth candidate and were dropped: 144 checked is too thin a sample to
 * build a post on, and a vertical playbook with no numbers behind it is exactly the thing the rest
 * of this corpus argues against.
 *
 * Car washes are the strongest international story in the index — 59.5% in India, 53.6% in the UK,
 * and still 24.6% in the US. Salons and barbers are the first vertical where the highest-density
 * cities are not Indian: Liverpool, Birmingham and Milan lead. Electronics stores carry 1,110
 * average reviews, the highest of any retail category we track, against a 30.7% gap.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · phone & electronics */
{
  slug: "how-to-sell-websites-to-electronics-stores",
  title: "How to Sell Websites to Cell Phone and Electronics Stores",
  excerpt: "The highest review counts of any retail category we measure, a third with no website, and absent from every niche list — because nobody publishing those lists has checked.",
  meta: "How to sell websites to cell phone and electronics stores: a 30-38% gap against the highest review counts in retail, and the pitch that actually works.",
  category: "Lead Generation", cluster: "playbooks", hero: "leads", mins: 9,
  tags: ["Vertical Playbook", "Retail", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Cell phone and electronics stores are the quietest opportunity in our index. **38.4% of 2,437 cell phone stores and 30.7% of 2,125 electronics stores have no website** — and electronics retailers carry an average of 1,110 Google reviews, the highest of any retail category we measure.",
      "That combination is unusual: demonstrable footfall on a scale most categories never reach, and a third of them with nowhere to send a customer who is deciding at home. Nobody is selling websites to this category — they appear on no published niche list, which is a reasonable proxy for how little competition you will meet.",
    ]},

    { type: "h2", id: "numbers", text: "The numbers" },
    { type: "table", head: ["Category", "Checked", "No website", "Avg reviews", "Avg rating"], rows: [
      ["Cell phone store", "2,437", "38.4%", "334", "4.61"],
      ["Electronics store", "2,125", "30.7%", "1,110", "4.36"],
    ], note: "Businesses with a verified website check. The review counts are what make this category unusual." },
    { type: "prose", text: [
      "Eleven hundred reviews is a shop that hundreds of people walk into every week. The rating being lower than most categories — 4.36 against a 4.6-ish norm — is also informative rather than a warning: electronics retail attracts warranty and repair complaints that a bakery never will, and it does not mean the business is weak.",
    ]},

    { type: "h2", id: "pitch", text: "What to pitch electronics stores, and it is not a brochure" },
    { type: "prose", text: [
      "Not a brochure, and not \"be online\". The transaction this vertical loses is specific and the owner will recognise it immediately: **somebody deciding at home whether this shop has the thing they want.**",
      "A customer choosing a phone, a washing machine or a laptop researches for days and then wants to know two things before travelling — do you have it, and roughly what does it cost here. Right now they cannot find out, so they call during shop hours, or more often they simply go to the retailer whose stock they could check.",
      "So what you are building is not a website in the way the owner imagines it. It is a **current range page with prices or price bands, and a WhatsApp enquiry button.** That is the entire product, and it is worth saying in one sentence rather than presenting as a five-page proposal.",
    ]},
    { type: "tip", title: "The evidence to walk in with",
      text: "Search their own category and city on your phone in front of them. The chains rank, and one or two local competitors with sites rank. They will not be there. In a category where the customer explicitly checks before travelling, that omission argues itself." },

    { type: "h2", id: "objection", text: "The two objections you will get" },
    { type: "prose", text: [
      "**\"We can't compete with Amazon and Flipkart on price.\"** True, and irrelevant, and you should say so plainly. Nobody buying from a local electronics shop is expecting to beat online pricing — they are buying same-day availability, someone who will install it, and somebody to shout at if it breaks. A website that leads on price is competing on the one axis they lose. A website that leads on **in stock today, delivered and installed this evening, service if it fails** is competing where they win.",
      "**\"Our stock changes every week.\"** The real objection, and it is a genuine one. The answer is not to promise a live inventory system, which you cannot maintain at this price. It is to build **categories and brands rather than individual SKUs** — \"Samsung, LG and Whirlpool washing machines, ₹18,000–45,000\" is true for a year and answers the customer's question. Then sell a care plan for the things that do change.",
      "That second objection is the reason this vertical monetises well. Stock genuinely moves, so the monthly is obviously earned rather than argued over.",
    ]},

    { type: "h2", id: "price", text: "What to charge" },
    { type: "table", head: ["Build", "Contents", "Quote"], rows: [
      ["Presence", "One page, brands carried, timings, map, call button", "₹10,000–16,000"],
      ["Standard", "Category pages, brands, price bands, enquiry form", "₹22,000–40,000"],
      ["Catalogue", "Product categories with photos, service and warranty pages", "₹40,000–75,000"],
      ["Care plan", "Monthly range and price-band updates, new arrivals", "₹2,500–5,000/month"],
    ], note: "The care plan is higher here than in most verticals because the content genuinely changes monthly." },
    { type: "prose", text: [
      "Anchor against one sale rather than the build. A single washing machine or mid-range phone is several thousand rupees of margin, so the arithmetic on a ₹30,000 site is a handful of customers who would otherwise have gone elsewhere. Ask what their average sale is worth and let them run it.",
    ]},

    { type: "h2", id: "where", text: "Where the density is" },
    { type: "prose", text: [
      "Concentrated in tier-2 India, as with most retail:",
    ]},
    { type: "table", head: ["City", "No website", "Checked"], rows: [
      ["Morena", "79", "91"],
      ["Kota", "75", "100"],
      ["Faridabad", "70", "115"],
      ["Surat", "68", "133"],
      ["Gurgaon", "68", "147"],
      ["Lucknow", "60", "105"],
    ], note: "Cell phone and electronics stores with a verified website check." },
    { type: "prose", text: [
      "Morena at 79 of 91 is the most extreme figure in this vertical, and these shops cluster on electronics markets and main roads — which makes them unusually efficient to work on foot. Eight or ten in an afternoon is realistic in a way it is not for scattered categories.",
    ]},

    { type: "leads", city: "surat", heading: "Electronics retail with no website" },

    { type: "cta", variant: "map", title: "A category with real footfall.",
      detail: "Electronics and phone retailers with no website — high review counts and nobody pitching them.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "What percentage of electronics stores have no website?", a: "30.7% of the 2,125 electronics stores in our index and 38.4% of 2,437 cell phone stores. Electronics retailers also carry an average of 1,110 Google reviews, the highest of any retail category we measure." },
    { q: "What should I pitch an electronics shop?", a: "The stock question. Customers researching a phone or an appliance want to know whether the shop has it and roughly what it costs before travelling, and right now they cannot find out — so they go to the retailer whose range they could check." },
    { q: "How do I answer \"we can't compete with Amazon on price\"?", a: "Agree, and change the axis. Nobody buying locally expects to beat online pricing — they are buying same-day availability, installation and somebody to hold responsible. A site leading on price competes where they lose; one leading on stock and service competes where they win." },
    { q: "What about stock changing every week?", a: "Do not promise live inventory at this price. Build categories and brands with price bands — \"Samsung, LG and Whirlpool washing machines, ₹18,000–45,000\" answers the customer's question and stays true for a year. Sell a care plan for what does change." },
    { q: "What should I charge an electronics store?", a: "₹10,000–16,000 for a presence page, ₹22,000–40,000 for category pages with price bands, and ₹40,000–75,000 for a full catalogue. The care plan runs higher than most verticals at ₹2,500–5,000 a month because stock genuinely moves." },
  ],
  links: [["/resources/which-local-verticals-actually-pay-for-a-website", "how this ranks against other verticals"], ["/resources/how-to-sell-websites-to-hardware-stores", "the closest adjacent vertical"], ["/resources/website-maintenance-plans-what-to-charge", "pricing the monthly"], ["/resources/how-much-to-charge-for-a-website-india", "the build bands"]],
},

/* ───────────────────────────── 2 · car washes */
{
  slug: "how-to-sell-websites-to-car-washes",
  title: "How to Sell Websites to Car Washes and Detailing Shops",
  excerpt: "The only vertical where the gap is genuinely large in every market we measure — 59.5% in India, 53.6% in Britain, and still one in four in the United States.",
  meta: "How to sell websites to car washes and detailing shops: a gap that holds across every market, why booking is the pitch, and what to charge for it.",
  category: "Lead Generation", cluster: "playbooks", hero: "leads", mins: 9,
  tags: ["Vertical Playbook", "Agency Playbook", "Market Research"],
  body: [
    { type: "prose", text: [
      "Car washes are the most internationally consistent opportunity in our data. **43.7% of the 2,620 we have checked have no website**, and unlike almost every other category, that holds up in developed markets: 59.5% in India, **53.6% in the United Kingdom**, and 24.6% in the United States.",
      "For anyone selling websites in Britain or Europe, this is the single clearest counterexample to the belief that those markets are served. More than half of British car washes have nothing.",
    ]},

    { type: "h2", id: "international", text: "The gap by country" },
    { type: "table", head: ["Country", "Checked", "No website"], rows: [
      ["India", "1,053", "59.5%"],
      ["United Kingdom", "412", "53.6%"],
      ["United States", "305", "24.6%"],
      ["Australia", "221", "18.1%"],
      ["Germany", "212", "16.5%"],
    ], note: "Car washes with a verified website check. The UK figure sits against a national average of {{gbPct}}." },
    { type: "prose", text: [
      "Britain is the outlier worth staring at. The national rate across all categories is {{gbPct}}; car washes are more than three times that. A UK agency working from national statistics would never look at this vertical, which is exactly why it is available.",
    ]},

    { type: "h2", id: "why", text: "Why this category, everywhere" },
    { type: "prose", text: [
      "Because the business model is identical in every country. A car wash serves people who are already nearby, chosen on convenience, paid for in minutes, and repeated without thought. Nobody has ever researched a car wash for twenty minutes.",
      "So no enquiry was ever visibly lost, nothing forced the question, and the owner has eleven years of evidence that the business works without one. That is the same story as hardware stores and laundries, and it is why those three categories sit together at the top of every market's list.",
      "The corollary matters for your pitch: **the argument for a website here cannot be discoverability**, because they genuinely are discovered, on Maps, by people driving past. It has to be something else.",
    ]},

    { type: "h2", id: "pitch", text: "Selling websites to car washes on booking, not discovery" },
    { type: "prose", text: [
      "The transaction this vertical loses is the **booked, higher-value job** — detailing, ceramic coating, interior deep clean, paint correction. A ₹300 wash is walk-in. A ₹6,000 detail is scheduled, and it is scheduled by somebody who wanted to compare, see photographs of previous work, and pick a time.",
      "Right now that customer calls during a busy shift, gets a rushed answer from someone holding a pressure hose, and books with whoever answered properly. The economics are stark: one detailing job is worth twenty washes, and it is the only part of the business that a website affects at all.",
      "So the site is a before-and-after gallery, a service and price list, and a booking form with a date. Not a brochure about quality and dedication.",
    ]},
    { type: "table", head: ["Service", "Ticket", "Booked in advance", "Site helps"], rows: [
      ["Basic wash", "Low", "No", "Barely"],
      ["Interior deep clean", "Medium", "Usually", "Yes"],
      ["Full detailing", "High", "Always", "Strongly"],
      ["Ceramic / paint correction", "Highest", "Always", "Strongly"],
      ["Monthly wash plan", "Recurring", "Yes", "Strongly"],
    ]},
    { type: "prose", text: [
      "The last row is the one owners light up at. A subscription wash plan is a genuinely good idea for their business, most of them have considered it, and almost none have a way to sell one. A page that takes a monthly plan signup is a new revenue line rather than a marketing expense, which is a much easier thing to buy.",
    ]},

    { type: "h2", id: "photos", text: "Photographs are the whole product" },
    { type: "prose", text: [
      "This vertical is unusual in that the deliverable's value is almost entirely visual, and the owner already has the assets.",
      "Every detailing shop has hundreds of before-and-after photographs on somebody's phone, because that is how the trade markets itself informally. They are sitting in a camera roll and on a WhatsApp status that expired last Tuesday.",
      "That is your build. Organised by service, with the price and duration of each job next to it. **You are not creating content, you are moving it somewhere permanent** — which also makes this one of the fastest projects to deliver in any vertical, and one of the easiest to sell a monthly against, because new work happens weekly.",
    ]},

    { type: "h2", id: "price", text: "What to charge" },
    { type: "table", head: ["Build", "Contents", "Quote (India)"], rows: [
      ["Presence", "One page, services, timings, map, call button", "₹8,000–14,000"],
      ["Standard", "Service and price list, gallery, booking form", "₹18,000–32,000"],
      ["Full", "Per-service pages, plan signup, before-and-after galleries", "₹35,000–60,000"],
      ["Care plan", "New work added monthly, seasonal offers", "₹1,500–3,000/month"],
    ], note: "UK and European tickets are several times these. The build is the same." },
    { type: "prose", text: [
      "Anchor on the detailing job, not the wash. One additional ceramic coating booking a month covers a ₹30,000 site inside a quarter, and the owner knows what that job is worth without being told.",
    ]},

    { type: "leads", city: "liverpool", country: "gb", heading: "Car washes with no website" },

    { type: "cta", variant: "map", title: "A gap that travels.",
      detail: "Car washes and detailing shops with no website — in Britain and India alike.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "What percentage of car washes have no website?", a: "43.7% of the 2,620 in our index, and unusually the gap holds across markets — 59.5% in India, 53.6% in the United Kingdom and 24.6% in the United States. It is the clearest counterexample to the idea that developed markets are served." },
    { q: "Why do so many British car washes have no website?", a: "Because the business model is the same everywhere: customers are already nearby, choose on convenience and never research. No enquiry was visibly lost, so nothing forced the question — the same reason hardware stores and laundries sit alongside them." },
    { q: "What should I pitch a car wash?", a: "Booking for the high-value jobs, not discoverability. A basic wash is walk-in; a full detail or ceramic coating is scheduled by someone who wants to compare, see previous work and pick a time — and one detailing job is worth twenty washes." },
    { q: "What content does a car wash website need?", a: "Before-and-after photographs organised by service, with price and duration attached, plus a booking form. Every detailing shop already has hundreds of these on a phone — you are moving existing content somewhere permanent rather than creating any." },
    { q: "What should I charge a car wash for a website?", a: "₹8,000–14,000 for a presence page, ₹18,000–32,000 with a service list, gallery and booking form, and ₹35,000–60,000 for per-service pages with plan signup. UK tickets are several times these for the same build." },
  ],
  links: [["/resources/india-vs-uk-vs-australia-website-adoption", "why this category behaves the same everywhere"], ["/resources/how-indian-agencies-win-uk-and-australian-clients", "selling this vertical into Britain"], ["/resources/which-local-verticals-actually-pay-for-a-website", "how it ranks"], ["/resources/website-maintenance-plans-what-to-charge", "the monthly"]],
},

/* ───────────────────────────── 3 · salons & barbers */
{
  slug: "how-to-sell-websites-to-salons-and-barbershops",
  title: "How to Sell Websites to Salons and Barbershops",
  excerpt: "Twenty-five thousand businesses, a third with nothing, and the first vertical where the densest cities are Liverpool and Milan rather than Kanpur. Also the lowest tickets on the board.",
  meta: "How to sell websites to salons and barbershops: a 29-36% gap across 25,000 businesses, why the ticket is small, and the two things that make it profitable.",
  category: "Lead Generation", cluster: "playbooks", hero: "leads", mins: 9,
  tags: ["Vertical Playbook", "Agency Playbook", "Market Research"],
  body: [
    { type: "prose", text: [
      "Salons and barbershops are the largest addressable group in our index — over twenty-five thousand businesses across barbers, beauty salons, nail salons and hair salons — and roughly a third have no website. **Barbers run at 36.3%, beauty salons at 29.9%, nail salons at 29.4%.**",
      "It is also the first vertical where the densest cities are not Indian. Liverpool, Birmingham and Milan sit at the top of the list, alongside Vadodara and Patna. This is a genuinely global category with a genuinely global gap.",
      "It also has the smallest tickets on the board, which is the part that decides whether selling websites here works for you at all.",
    ]},

    { type: "h2", id: "numbers", text: "The numbers, and the catch" },
    { type: "table", head: ["Category", "Checked", "No website", "Avg reviews"], rows: [
      ["Barber shop", "6,955", "36.3%", "70"],
      ["Nail salon", "6,786", "29.4%", "69"],
      ["Beauty salon", "6,659", "29.9%", "187"],
      ["Hair salon", "4,886", "23.2%", "147"],
      ["Spa", "1,756", "13.6%", "212"],
    ], note: "The review counts are the catch. Barbers and nail salons average around 70 — small businesses in volume." },
    { type: "prose", text: [
      "Seventy reviews is a real business and a small one. **Barbers and nail salons will not pay ₹40,000 for a website**, and pitching them as though they will wastes everybody's afternoon.",
      "Beauty salons and spas are a different conversation — 187 and 212 average reviews, higher tickets per customer, and treatments booked in advance. If you work this vertical, that distinction is the first filter, not an afterthought.",
    ]},

    { type: "h2", id: "international", text: "Where it is densest" },
    { type: "table", head: ["City", "No website", "Checked"], rows: [
      ["Liverpool", "217", "436"],
      ["Vadodara", "206", "324"],
      ["Birmingham", "199", "470"],
      ["Patna", "185", "299"],
      ["Milan", "181", "433"],
      ["Philadelphia", "169", "434"],
    ], note: "Barbers, beauty, nail and hair salons with a verified website check." },
    { type: "prose", text: [
      "British barbers run at 42.5% against Italy's 38.7%, America's 26.1% and India's 77.6%. Every one of those is above its national average, which is the same pattern car washes and laundries show: a walk-in trade whose customers never research, in every economy.",
    ]},

    { type: "h2", id: "pitch", text: "Selling websites to salons on the appointment nobody made" },
    { type: "prose", text: [
      "The transaction here is the **appointment made outside opening hours**, and it is a bigger loss than owners realise.",
      "Somebody decides at 10pm that they need a haircut on Saturday. They cannot call. They message an Instagram account that gets checked twice a week, or they go to the salon that let them book. By the time the shop opens on Wednesday and returns the call, that customer has already been somewhere.",
      "For a beauty salon it is worse, because the treatments that matter — bridal packages, colour appointments, a course of treatments — are planned weeks out and researched properly. That is a five-figure booking in India and a much larger one in Britain, and it is being decided from a phone in the evening.",
      "So: a service and price list, a portfolio of actual work, and a booking form that captures the service and a preferred date. The same three components as almost every vertical, arranged around evenings.",
    ]},

    { type: "h2", id: "instagram", text: "The Instagram objection" },
    { type: "prose", text: [
      "You will hear this one immediately, because this is the most Instagram-native vertical there is, and the standard response is wrong.",
      "Do not argue that Instagram is insufficient. It is genuinely working for them — it is where their portfolio lives, where new customers find them, and where the trade's culture sits. Attacking it makes you sound like somebody who does not understand their business.",
      "The two honest arguments are narrower. **Booking**: a customer who wants an appointment at 10pm has to send a DM into an inbox nobody reads until Wednesday, and a booking form does not have that problem. **Ownership**: the account can be lost, hacked or restricted, and every photograph and message goes with it — and in this trade, being locked out of the account is a story most owners have heard from somebody they know.",
      "Framed that way you are proposing something alongside Instagram rather than instead of it, which is both more honest and much easier to sell.",
    ]},

    { type: "h2", id: "profitable", text: "Two things that make this vertical work" },
    { type: "prose", text: [
      "The tickets are small, so the economics only work if you change something structural. Two things do.",
      "**Templates, seriously applied.** Every salon site is the same site: services, prices, gallery, booking, hours, map. Build it properly once and each subsequent one is a day. At ₹15,000 a build that is a good day's work; at three days it is not a business.",
      "**The care plan is the actual product.** This trade produces new work daily and photographs it constantly, so the monthly is easier to sell here than anywhere else in this corpus. Thirty salons on ₹1,500 a month is ₹45,000 recurring, from clients whose content genuinely needs updating.",
      "Volume plus recurring, on a template. Try to sell bespoke work at this ticket and the vertical does not pay.",
    ]},
    { type: "table", head: ["Build", "Contents", "Quote"], rows: [
      ["Presence", "Services, prices, hours, map, call button", "₹8,000–12,000"],
      ["Standard", "Portfolio gallery, price list, booking form", "₹15,000–25,000"],
      ["Salon / spa", "Treatment pages, packages, staff profiles, bookings", "₹30,000–50,000"],
      ["Care plan", "New work added monthly, seasonal offers", "₹1,200–2,500/month"],
    ], note: "The middle row is where most of this vertical sits. The bottom row is where the business is." },

    { type: "leads", city: "liverpool", country: "gb", heading: "Salons and barbers with no website" },

    { type: "cta", variant: "map", title: "Volume, on a template.",
      detail: "The largest addressable category in the index — filter to the ones with review counts worth calling.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "What percentage of salons and barbershops have no website?", a: "Barbers run at 36.3% of 6,955 checked, nail salons at 29.4% of 6,786 and beauty salons at 29.9% of 6,659. Together it is the largest addressable group in our index at over 25,000 businesses." },
    { q: "Are barbershops worth approaching for web design?", a: "Only at the right price. Barbers and nail salons average around 70 Google reviews — real businesses, but small ones that will not pay ₹40,000. Beauty salons and spas at 187 and 212 reviews are the higher-ticket half of this vertical." },
    { q: "How do I answer \"we already use Instagram\"?", a: "Do not attack it — it is genuinely working for them. Use booking and ownership instead: a customer wanting an appointment at 10pm has to DM an inbox nobody reads until Wednesday, and an account that gets restricted takes every photograph with it." },
    { q: "What makes salons profitable to sell to?", a: "Templates and care plans. Every salon site is the same site, so build it once properly and each one is a day's work. Then the monthly is the actual product — this trade produces and photographs new work daily, so it needs no defending." },
    { q: "Where is the salon gap biggest?", a: "It is genuinely global. Liverpool, Birmingham and Milan sit alongside Vadodara and Patna at the top of the density list, and British barbers run at 42.5% against a {{gbPct}} national average." },
  ],
  links: [["/resources/how-to-sell-websites-to-tailors", "the other portfolio-led vertical"], ["/resources/why-facebook-only-businesses-are-your-best-prospects", "the social-only objection"], ["/resources/website-maintenance-plans-what-to-charge", "the monthly this vertical runs on"], ["/resources/india-vs-uk-vs-australia-website-adoption", "why the gap travels"]],
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
