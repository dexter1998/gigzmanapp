/**
 * Batch 24 — retail triage, packaging, and the exclusive-lead question.
 *
 * The retail post is deliberately not another vertical playbook. Thirteen of those exist already
 * and a fourteenth in the same shape would be filler; what retail actually needs is triage, because
 * the categories differ enormously and sit next to each other on the same street. Sporting goods in
 * India is 61.0% of 881 with 934 average reviews — the best gap-times-demand profile in the whole
 * index — while jewellers are 11.6% with 1,081 reviews, which is a redesign market.
 *
 * SERP notes:
 *  · Good-better-best is well documented: the middle tier is the volume driver, Better usually sits
 *    at 1.4–1.8x Good and Best at 2.0–3.0x, "provided the value delta is real".
 *  · Exclusive vs shared leads has real arithmetic — exclusive costs 3–5x per lead, shared costs
 *    2–3x per closed deal, shared converts 0.5–2% against exclusive at 2–5%. Every one of those
 *    figures comes from mortgages, insurance and home services, where a customer is worth thousands
 *    of dollars. Carrying them to a ₹25,000 website is where the argument breaks.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · retail triage */
{
  slug: "which-retail-shops-actually-need-a-website",
  title: "Which Retail Shops Actually Need a Website — and Which Don't",
  excerpt: "Sporting goods in India runs at 61% with 934 average reviews. Jewellers run at 11.6% with 1,081. Same street, opposite answers, and the difference is not size.",
  meta: "Which retail shops need a website: gap and demand figures by retail category, why some are served and others untouched, and how to triage a market street.",
  category: "Website Gaps", cluster: "data", hero: "methodology", mins: 9,
  tags: ["Original Data", "Retail", "Vertical Playbook"],
  body: [
    { type: "prose", text: [
      "Retail is not one market. On a single market street you will pass a category running at 61% without a website and another at 11.6%, and the difference has nothing to do with how big the shops are.",
      "This is the triage — which retail shops actually need a website and which do not — because walking a street without it means spending an afternoon on the two categories that were never going to buy.",
    ]},

    { type: "h2", id: "table", text: "Retail categories, measured" },
    { type: "table", head: ["Category", "Checked", "No website", "Avg reviews"], rows: [
      ["Sporting goods", "1,549", "37.8%", "623"],
      ["Gift shop", "4,141", "37.6%", "70"],
      ["Shoe store", "786", "34.4%", "49"],
      ["Women's clothing", "389", "32.1%", "316"],
      ["Clothing store", "4,778", "29.6%", "441"],
      ["Book store", "1,570", "23.8%", "310"],
      ["Sportswear store", "652", "21.6%", "180"],
      ["Furniture store", "2,881", "16.3%", "318"],
      ["Jewellery store", "2,547", "11.6%", "1,081"],
    ], note: "Retail businesses with a verified website check. Read the last two columns together — neither means much alone." },
    { type: "prose", text: [
      "**Sporting goods is the standout, and in India dramatically so: 61.0% of 881 checked, with 934 average reviews.** That is the best combination of availability and demonstrated demand anywhere in our index. Outside India the same category is almost entirely served — 7.6% in Britain, 3.5% in Australia — so this is an India-specific opportunity rather than a travelling one.",
      "**Jewellers are the opposite and instructive.** 11.6% without a site and the highest review count in retail at 1,081. These are large, busy, well-capitalised businesses that all built websites years ago. It is a redesign market with real budgets, and it is a completely different sale.",
    ]},

    { type: "h2", id: "trap", text: "The two-column trap" },
    { type: "prose", text: [
      "Gift shops and shoe stores show why the gap column alone misleads.",
      "Gift shops run at 37.6% — high, and across 4,141 checked, so it looks like a substantial market. Then look at the second column: **70 average reviews.** Shoe stores are worse at 49. These are small businesses with thin customer volume and correspondingly thin budgets, and a high gap there is availability without money behind it.",
      "Clothing stores are the useful contrast: a lower gap at 29.6%, but 441 average reviews across 4,778 businesses. Fewer prospects, considerably better ones, and enough of them that the smaller share still yields more workable leads than the gift shops do.",
      "**The rule for retail: multiply, do not rank.** A 37% gap on 70 reviews is worse than a 29% gap on 441.",
    ]},

    { type: "h2", id: "why", text: "Why some retail categories got online and others did not" },
    { type: "prose", text: [
      "Three factors, and they explain the whole table.",
      "**Whether the purchase is researched.** Jewellery and furniture are considered, high-value, compared purchases — customers research for weeks, so those businesses were forced online early. A gift is bought in ten minutes by someone already in the shop.",
      "**Whether the range matters.** Sporting goods, electronics and clothing have ranges customers want to check before travelling. A shoe shop's range is assumed.",
      "**Whether ecommerce competition arrived.** Categories hit hardest by online retail — books, electronics — either adapted or closed, which is why book stores sit lower than their size suggests. Categories where the product needs to be seen or fitted were left alone longer.",
      "The practical read: **a retail business needs a website when its customers check the range before travelling.** That single question predicts this table better than size, sector or turnover.",
    ]},

    { type: "h2", id: "pitch", text: "What to pitch by category" },
    { type: "table", head: ["Category", "The pitch", "Ticket"], rows: [
      ["Sporting goods", "Range and brands carried, seasonal stock", "High"],
      ["Clothing", "New arrivals, sizes, festival collections", "Medium–high"],
      ["Furniture", "Catalogue with dimensions and delivery area", "High — but mostly redesign"],
      ["Book store", "Stock enquiry and events", "Medium"],
      ["Gift shop", "Volume play only, on a template", "Low"],
      ["Shoe store", "Rarely worth it", "Low"],
      ["Jewellery", "Redesign, at redesign prices", "Highest"],
    ]},
    { type: "prose", text: [
      "The jewellery row is worth taking seriously rather than skipping. 1,081 average reviews means substantial businesses, and their existing sites are frequently years old and built when the shop was smaller. That is a well-funded redesign market sitting inside a category most agencies write off after seeing the 11.6%.",
    ]},

    { type: "h2", id: "street", text: "Triaging an actual street" },
    { type: "checklist", items: [
      { title: "Skip the low-review categories entirely", detail: "Gift and shoe shops on 50–70 reviews. High gap, no budget, and they consume the same time as a better prospect." },
      { title: "Work sporting goods and clothing first", detail: "Real gap, real review counts, and a range customers want to check before travelling." },
      { title: "Note the jewellers for a redesign list", detail: "Different pitch, different price, and a separate afternoon — but they have the largest budgets on the street." },
      { title: "Check the review count before entering", detail: "Ten seconds on the listing. The gap rate is a category property; the budget is a business property." },
    ]},

    { type: "leads", city: "surat", heading: "Retail with no website" },

    { type: "cta", variant: "map", title: "Triage before you walk.",
      detail: "Retail categories filtered by review count, so the street you work is the half worth working.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "Which retail businesses are most likely to have no website?", a: "Sporting goods at 37.8% and gift shops at 37.6%, followed by shoe stores at 34.4% and clothing at 29.6%. In India sporting goods runs at 61.0% of 881 checked, with 934 average reviews — the best combination in our index." },
    { q: "Why do jewellers all have websites?", a: "Because jewellery is a researched, compared, high-value purchase, so those businesses were forced online early. They sit at 11.6% without a site and carry 1,081 average reviews — a well-funded redesign market rather than a first-website one." },
    { q: "Is a high gap enough to make a retail category worth working?", a: "No. Gift shops run at 37.6% with 70 average reviews and shoe stores at 34.4% with 49 — availability with no budget behind it. A 29% gap on 441 reviews is a better market than a 37% gap on 70." },
    { q: "How do I tell which retail shops need a website?", a: "Ask whether customers check the range before travelling. That single question predicts the whole table better than size or turnover — sporting goods and clothing yes, gift shops and shoe shops no." },
    { q: "How should I work a retail street?", a: "Skip the low-review categories entirely, work sporting goods and clothing first, and keep the jewellers on a separate redesign list. Check the review count on each listing before entering — the gap is a category property, the budget is a business property." },
  ],
  links: [["/resources/which-local-verticals-actually-pay-for-a-website", "the full vertical ranking"], ["/resources/how-to-sell-websites-to-electronics-stores", "the adjacent retail playbook"], ["/resources/qualifying-a-local-lead-before-you-call", "the review-count check"], ["/resources/how-to-price-a-website-redesign", "what to do with the jewellers"]],
},

/* ───────────────────────────── 2 · packaging */
{
  slug: "good-better-best-packaging-website-offers",
  title: "Good, Better, Best: How to Package Website Offers",
  excerpt: "Three options beat one because they change the question from whether to buy to which to buy. The multiples that work, and the tier that has to be real rather than crippled.",
  meta: "How to package website offers as good, better and best: the price multiples that work, why the middle tier sells, and the mistake that makes it obvious.",
  category: "Lead Generation", cluster: "playbooks", hero: "pricing", mins: 8,
  tags: ["Pricing", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Packaging website offers as good, better and best changes what the client is deciding. A single quote is a yes-or-no question, and the easiest answer to a yes-or-no question is no. **Three options move the decision from whether to buy to which one to buy**, which is a question people answer rather than defer.",
      "A single quote is a yes-or-no question, and the easiest answer to one of those is no. The documented behaviour is consistent: most buyers take the middle, so the middle is what you are actually selling and the other two exist to define it.",
    ]},

    { type: "h2", id: "multiples", text: "Good, better, best: the multiples that work" },
    { type: "prose", text: [
      "The published guidance puts the middle tier at roughly **1.4 to 1.8 times** the lowest and the top at **2 to 3 times** — with a condition attached that matters more than the numbers: provided the value difference is real.",
      "Applied to a local first website, that produces something like this:",
    ]},
    { type: "table", head: ["Tier", "What it is", "Price", "Multiple"], rows: [
      ["Presence", "One page: what they do, photos, timings, map, call button", "₹12,000", "1×"],
      ["Standard", "Five to eight pages with an enquiry form", "₹22,000", "1.8×"],
      ["Full", "Catalogue or per-service pages, registration or ordering", "₹45,000", "3.75×"],
    ], note: "The top tier here is deliberately above the usual 3× ceiling, because in this market it is a genuinely different build rather than a bigger one." },
    { type: "prose", text: [
      "The reason the top tier can stretch further here is that it is not the same website with extras. A catalogue with a hundred products or a booking flow is a different piece of work, and a client can see that it is.",
    ]},

    { type: "h2", id: "real", text: "The middle tier has to be a real answer" },
    { type: "prose", text: [
      "The most common mistake is building the middle by crippling it — taking the full package and removing things so the top looks better.",
      "Buyers notice. A tier that is obviously the good one with pieces missing reads as manipulation, and in a local market where you are also asking to be trusted with money in advance, that is expensive in a way the extra sale does not cover.",
      "Each tier should be **a genuine answer to a real situation**. A one-page presence is the right answer for a business that needs to exist online and nothing more. A standard site is the right answer for most. A catalogue build is the right answer for a supplier with a range. If you cannot describe the customer each tier is for, the tiers are not real.",
      "The test: could you recommend the bottom tier to somebody without wincing? If not, it is a decoy and it will read as one.",
    ]},

    { type: "h2", id: "naming", text: "Name them for the job, not for metal" },
    { type: "prose", text: [
      "Silver, Gold and Platinum tell a hardware supplier nothing. **Presence, Standard and Catalogue** tell them which one is theirs before you have explained anything.",
      "The same applies to the descriptions. \"Five-page responsive website with CMS\" is a specification. \"Your range, your prices, and a form that sends the enquiry to your phone\" is an answer. Local buyers choose the tier they can picture, and metal names give them nothing to picture.",
      "One more thing that helps more than it should: **put the care plan on all three rows.** It stops being an upsell and becomes part of what having a website means, which is the framing that makes it renew.",
    ]},

    { type: "h2", id: "four", text: "Why not four, or two" },
    { type: "prose", text: [
      "Both are worse, for different reasons, and the failure modes are worth knowing because the temptation runs in both directions.",
      "**Two options is a comparison with no middle**, which means it is functionally still a yes-or-no question with extra steps. The client picks the cheaper one almost every time, because with nothing above it the higher option has nothing making it look reasonable.",
      "**Four or more reintroduces the problem three solved.** Choice becomes work, the differences between adjacent tiers stop being obvious, and a buyer who cannot tell tier two from tier three postpones rather than deciding. In a market where the buyer has never bought a website before and cannot evaluate any of it, that happens quickly.",
      "Three is not magic — it is the largest number of options a buyer can hold at once without the comparison becoming a task. If your work genuinely has four distinct shapes, present three and mention the fourth only if the conversation gets there.",
    ]},

    { type: "h2", id: "present", text: "When and how to present them" },
    { type: "prose", text: [
      "Not in the first follow-up. A single number is right immediately after the first conversation, because three options sent to somebody who has not yet decided they want a website converts a simple decision into a comparison exercise conducted alone.",
      "The right moment is **after they have said yes in principle** and the question has become what to buy. At that point the three options are genuinely helpful and the middle one closes.",
      "Present them on one page, in ascending order, with the middle one slightly emphasised. And say which one you would recommend for them and why — a recommendation is not a hard sell, it is the thing a buyer who cannot evaluate the options is actually asking for.",
    ]},
    { type: "steps", items: [
      { title: "One number after the first conversation", icon: "send", detail: "Not three. A range or a set of options invites anchoring at the bottom and negotiating below it." },
      { title: "Three options once they are in", icon: "score", detail: "When the question is what to buy rather than whether. This is where the middle tier does its work." },
      { title: "Recommend one, with a reason", icon: "verified", detail: "\"For your range I'd do the middle one\" is what they are asking for. Silence reads as indifference." },
      { title: "Care plan on every row", icon: "calendar", detail: "It stops being an upsell and becomes part of what having a website means." },
    ]},

    { type: "leads", city: "vadodara", heading: "Businesses to package for" },

    { type: "cta", variant: "map", title: "Price against the business, not the pages.",
      detail: "Review counts and categories tell you which tier a prospect is before you write the options.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "Should I offer one price or three packages?", a: "One number in the first follow-up, three options once they have said yes in principle. Three options sent too early turn a simple decision into a comparison exercise conducted without you there to explain the difference." },
    { q: "What price multiples work for tiered packages?", a: "The middle at roughly 1.4–1.8 times the lowest and the top at 2–3 times, provided the value difference is real. For local websites the top tier can stretch further because a catalogue or booking build is genuinely different work rather than a bigger version." },
    { q: "Why do most clients pick the middle option?", a: "Because with three choices people gravitate to the middle as the safe, balanced selection. Which means the middle is what you are actually selling, and the outer two exist to define it." },
    { q: "What is the biggest mistake with tiered pricing?", a: "Building the middle by crippling the top. Buyers notice a decoy, and in a market where you are asking to be trusted with money in advance, that costs more than the extra sale earns. Each tier should be a real answer to a real situation." },
    { q: "What should I call the tiers?", a: "What they do, not metals. Presence, Standard and Catalogue tell a hardware supplier which one is theirs; Silver, Gold and Platinum tell them nothing. And put the care plan on all three rows so it stops reading as an upsell." },
  ],
  links: [["/resources/how-much-to-charge-for-a-website-india", "the numbers behind the tiers"], ["/resources/handling-its-too-expensive-without-discounting", "moving down the ladder instead of the price"], ["/resources/hourly-project-or-value-pricing-model", "the model underneath"], ["/resources/what-to-send-a-local-business-after-the-call", "when a single number is right"]],
},

/* ───────────────────────────── 3 · exclusive leads */
{
  slug: "exclusive-leads-vs-your-own-list",
  title: "Exclusive Leads vs Your Own List: What You Pay For",
  excerpt: "Exclusive leads cost three to five times shared ones and convert two to five times better. That arithmetic works beautifully — for industries where a customer is worth thousands.",
  meta: "Exclusive leads vs building your own list: the published conversion arithmetic, why it breaks at a ₹25,000 ticket, and when exclusivity is worth paying for.",
  category: "Comparisons", cluster: "tools", hero: "pricing", mins: 8,
  tags: ["Comparisons", "Pricing", "Tools"],
  body: [
    { type: "prose", text: [
      "The case for exclusive leads is arithmetically sound and imported from an industry that is not yours. **Exclusive leads cost three to five times shared ones and convert two to five times better** — published figures put shared conversion at 0.5–2% against exclusive at 2–5%, which makes the premium look obvious.",
      "Every one of those numbers comes from mortgages, insurance and home services, where a single customer is worth thousands of dollars. At a ₹25,000 website the same arithmetic produces a different answer.",
    ]},

    { type: "h2", id: "math", text: "Running the numbers at a web ticket" },
    { type: "prose", text: [
      "Published pricing puts shared leads around $5–20 and exclusive around $30–42. Translated and applied against a ₹25,000 project at the conversion rates above:",
    ]},
    { type: "table", head: ["", "Shared", "Exclusive"], rows: [
      ["Price per lead", "~₹800", "~₹3,000"],
      ["Conversion", "0.5–2%", "2–5%"],
      ["Leads per sale", "50–200", "20–50"],
      ["Cost per customer", "₹40,000–160,000", "₹60,000–150,000"],
      ["On a ₹25,000 project", "Loses money", "Loses money"],
    ], note: "Both columns lose money at this ticket. That is the finding, and it is not a comparison between them." },
    { type: "prose", text: [
      "**Neither option works.** The exclusive premium is not the problem — the entire pay-per-lead model is priced for industries where a customer is worth ten to a hundred times what a local website is worth.",
      "The mortgage broker paying ₹3,000 a lead is chasing a commission of several lakh. You are chasing ₹25,000, and the lead price has to be roughly two orders of magnitude lower before the arithmetic closes.",
    ]},

    { type: "h2", id: "own-list", text: "What your own list costs" },
    { type: "prose", text: [
      "The comparison that matters is not shared against exclusive. It is bought-lead against self-built.",
      "Building your own list from map listings costs either your time or a small data cost. Manually, about three minutes a lead. With tooling, the underlying data cost is roughly **₹1 to ₹10 per business**, because a billed Places call runs about ₹3.08 and returns several businesses.",
      "At ₹5 a lead and a one-in-twenty close rate, that is ₹100 per customer against a ₹25,000 project. The margin is not close.",
      "Your list is also not exclusive in the strict sense — anyone could generate it. But it is not being simultaneously worked by four agencies who bought the same record this morning, which is the property exclusivity was actually protecting.",
    ]},
    { type: "table", head: ["Source", "Cost per lead", "Cost per customer", "Verdict"], rows: [
      ["Shared leads", "~₹800", "₹40,000+", "No"],
      ["Exclusive leads", "~₹3,000", "₹60,000+", "No"],
      ["Your own list, tooled", "₹1–10", "₹20–200", "Yes"],
      ["Your own list, manual", "3 minutes", "1 hour of your time", "Yes, below volume"],
    ]},

    { type: "h2", id: "when-worth", text: "When exclusivity is genuinely worth paying for" },
    { type: "prose", text: [
      "The premium is real and it earns itself in three situations, none of which is buying first-website prospects.",
      "**When the ticket is large.** If you sell ₹2 lakh custom builds or ongoing retainers, a ₹3,000 exclusive lead is trivially worth it. The arithmetic that fails at ₹25,000 works at ₹2,00,000.",
      "**When the lead has intent.** An exclusive lead is usually somebody who asked for quotes, which is a completely different thing from a cold prospect. You are paying for the intent as much as the exclusivity, and intent is genuinely scarce.",
      "**When you cannot generate volume yourself.** If you are selling into a market you cannot walk into, bought leads may be the only channel available, and then the question is whether that market's tickets support the price.",
      "Outside those, the honest answer is that the pay-per-lead industry is not built for local web design, and the shared-versus-exclusive debate is a question from somebody else's business.",
    ]},

    { type: "h2", id: "intent", text: "What you are actually buying is intent" },
    { type: "prose", text: [
      "Strip away the exclusivity argument and there is a real thing underneath it that self-built lists do not have.",
      "A bought lead is usually somebody who **asked** — filled in a form, requested quotes, raised a hand. A list you build from map listings is entirely cold: those businesses have not asked for anything and do not know you exist. That difference is genuine and it is most of what the price is for.",
      "The reason it still does not close the arithmetic here is that intent in this market is vanishingly rare. Local businesses with no website are, almost by definition, not searching for one — that is why the gap exists at all. So the supply of genuinely intent-carrying leads for first websites is tiny, and what gets sold as intent is frequently a form fill from a business that will also be sold to four other people.",
      "The practical version: **be sceptical of intent claims specifically in this category.** Ask what the lead did to signal intent. \"Requested a quote\" is meaningful; \"matched our targeting criteria\" is a cold prospect with a markup.",
    ]},

    { type: "h2", id: "shared-real", text: "The real cost of a shared lead" },
    { type: "prose", text: [
      "One thing from that literature that does transfer, because it is about the conversation rather than the price.",
      "A shared lead has been sold to several people, all of whom call within hours. By the time you reach that business they have spoken to three others, they are comparing on price because that is the only axis three unfamiliar quotes expose, and the conversation starts in the worst possible place.",
      "That effect is stronger in local work than in the industries these figures come from, because a local business owner is not running a procurement process — they are irritated at having been called four times about the same thing, and the fourth caller pays for the first three.",
      "Which is the underrated argument for your own list: **nobody else called them this morning.**",
    ]},

    { type: "leads", city: "coimbatore", heading: "Nobody else called them" },

    { type: "cta", variant: "map", title: "Cheaper than any lead you can buy.",
      detail: "Build the list yourself — the underlying data costs a rupee or two per business.",
      action: "Build your own", href: "/login" },
  ],
  faqs: [
    { q: "Are exclusive leads worth it for a web design agency?", a: "Usually not, and neither are shared ones. Published pricing puts shared around ₹800 and exclusive around ₹3,000 with conversion rates of 0.5–2% and 2–5%, which produces a cost per customer above ₹40,000 either way — against a ₹25,000 project." },
    { q: "Why does the exclusive lead argument not work here?", a: "Because those figures come from mortgages, insurance and home services where a customer is worth thousands of dollars. The pay-per-lead model is priced for tickets ten to a hundred times larger than a local website." },
    { q: "What does building your own lead list cost?", a: "Roughly ₹1–10 per business in underlying data, since a billed Places API call costs about ₹3.08 and returns several businesses. At a one-in-twenty close rate that is around ₹100 per customer." },
    { q: "When should I pay for exclusive leads?", a: "When your ticket is large enough — ₹2 lakh builds or retainers — when you are paying for genuine intent rather than exclusivity, or when you are selling into a market you cannot reach yourself and bought leads are the only channel." },
    { q: "What is the hidden cost of a shared lead?", a: "The conversation. Several agencies call within hours, so by the time you reach the business they have three quotes and are comparing on price. In local work that is worse than in the industries these figures come from, because the owner is simply irritated." },
  ],
  links: [["/resources/should-you-buy-web-design-leads", "the wider buying decision"], ["/resources/bought-database-vs-live-search", "what a bought file is worth"], ["/resources/how-to-build-a-lead-list-for-a-web-design-agency", "building it yourself"], ["/resources/the-lifetime-value-of-one-local-client", "what a client is actually worth"]],
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
