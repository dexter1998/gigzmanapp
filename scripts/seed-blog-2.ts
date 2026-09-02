/**
 * Blog 2 — the flagship data report.
 *
 * Positioning comes straight from the SERP research: every "how many businesses have no website"
 * page in the results traces back to one 2019 Clutch survey of 529 people, or to Zippia's 2023
 * self-report. Wix's 50-stat roundup — the page that owns this query — conducts no research of
 * its own. Ours is measured rather than asked, which is the whole argument.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

const body: Block[] = [
  { type: "prose", text: [
    "**32.8%.** Out of 152,311 local businesses we checked across 37 cities and five countries, 49,909 have an active Google listing and no website at all.",
    "That number is measured, not surveyed. We did not ask business owners whether they have a website — we looked. Every other figure in circulation comes from asking, and most of them come from asking in 2019.",
  ]},

  { type: "h2", id: "the-2019-problem", text: "Every stat you have read on this traces back to 2019" },
  { type: "prose", text: [
    "Search for how many small businesses lack a website and you will get four different answers on one page of results: 17%, 27%, 28%, 40%. They disagree because they are not measurements. They are surveys, and mostly the same survey.",
    "The origin is a [Clutch survey from 2019](https://clutch.co/visualobjects/web-design/blog/small-businesses-without-websites) of **529 US small business owners**. It is honest, well-documented research — and it is seven years old, US-only, and self-reported. Nearly every \"2026 statistics\" page you will find is quoting it, or quoting something that quotes it.",
    "The page that ranks first for this question is [Wix's roundup of 50+ statistics](https://www.wix.com/blog/small-business-website-statistics). Its headline figure — 27% — is attributed to Zippia, a careers website, reporting 2023 self-reported data. Wix ran no study of its own.",
    "Meanwhile the tools selling these leads publish estimates and label them as such. One competitor's industry table has a column header that reads, literally, **\"Est. % Without Website\"**. Another states that 60% of specialty contractors have no website, with no citation attached.",
  ]},
  { type: "quote", text: "There is no fresh primary research on this question. There is one 2019 survey, one 2023 self-report, and a long chain of pages citing each other.",
    attribution: "What the search results actually contain, September 2026" },

  { type: "h2", id: "how-we-counted", text: "How we counted" },
  { type: "prose", text: [
    "Mantis maintains a live index of local businesses built from Google Maps and related public sources. For each business we record whether a website is present on its listing, and we re-check as the index refreshes.",
    "So this is a census of what we have indexed, not a random sample of all businesses on earth. That distinction matters and we will come back to it in the limitations.",
  ]},
  { type: "checklist", items: [
    { title: "152,311 businesses", detail: "every one with a website field we could resolve either way" },
    { title: "37 cities, 5 countries", detail: "India, United Kingdom, Australia, Canada, United States" },
    { title: "Measured, not asked", detail: "presence of a website on the live listing, not the owner's recollection" },
    { title: "September 2026", detail: "the index refreshes continuously; this is the snapshot behind every figure below" },
  ]},

  { type: "h2", id: "by-country", text: "The gap is not one number — it is five" },
  { type: "prose", text: [
    "The single global figure hides the only thing that actually matters to an agency: where you are.",
  ]},
  { type: "table", head: ["Country", "Businesses checked", "No website", "Rate"], rows: [
    ["India", "84,219", "32,662", "38.8%"],
    ["United Kingdom", "32,793", "5,585", "17.0%"],
    ["Canada", "3,558", "565", "15.9%"],
    ["Australia", "8,857", "497", "5.6%"],
    ["United States", "3,062", "138", "4.5%"],
  ], note: "Australia, Canada and the US samples are small and concentrated in a handful of cities — read those three as directional, not definitive." },
  { type: "prose", text: [
    "India sits at nearly **39%** — more than twice the UK and close to nine times our US sample. If you are an agency in Gurugram or Surat, roughly two in five businesses on the map are a valid prospect for a first website. If you are in Austin, that pitch barely exists and you should be selling redesigns instead.",
    "This is the practical reason the widely-quoted 27% is unhelpful: it is a US figure being applied globally, and our US sample suggests even that is now high.",
  ]},

  { type: "h2", id: "by-vertical", text: "Which businesses actually lack websites" },
  { type: "prose", text: [
    "Rate matters more than volume here. A category with 50,000 businesses and a 12% gap is a worse hunting ground than one with 2,000 businesses and a 67% gap, because you spend the same effort per lead either way.",
  ]},
  { type: "table", head: ["Category", "Checked", "No website", "Rate"], rows: [
    ["Guest houses", "740", "543", "73.4%"],
    ["Fast food outlets", "972", "700", "72.0%"],
    ["Hardware stores", "2,098", "1,405", "67.0%"],
    ["Farms", "728", "483", "66.3%"],
    ["Tailors", "1,546", "1,015", "65.7%"],
    ["Convenience stores", "1,385", "820", "59.2%"],
    ["Plumbers", "1,164", "653", "56.1%"],
    ["Electricians", "1,244", "677", "54.4%"],
    ["Car washes", "1,666", "900", "54.0%"],
  ], note: "Minimum 600 businesses checked per category. Generic catch-all categories excluded." },

  { type: "h2", id: "the-dentist-problem", text: "The niche advice everyone gives you is wrong" },
  { type: "prose", text: [
    "Open any \"best web design niches\" listicle and dental practices will be near the top. It is on every one of them. It is the second item on the list published by the closest competitor to this product.",
    "In our index, **dentists have the second-lowest no-website rate of any category we track — 10.8%.** Nine out of ten already have a site.",
  ]},
  { type: "table", head: ["Category", "Checked", "No website", "Rate"], rows: [
    ["Moving companies", "898", "94", "10.5%"],
    ["Dentists", "1,465", "158", "10.8%"],
    ["Skin care clinics", "1,208", "145", "12.0%"],
    ["Jewellery stores", "1,744", "234", "13.4%"],
    ["Preschools", "1,644", "230", "14.0%"],
    ["Car dealers", "1,873", "265", "14.1%"],
  ]},
  { type: "prose", text: [
    "That does not make dentists a bad niche. It makes them a bad *first-website* niche. Dentists have money and they buy marketing — but you will be selling a redesign into an existing relationship, competing with whoever built the current site. That is a different, slower sale than walking into a hardware store that has never had a website.",
    "The listicles are recommending verticals by ability to pay, and never checking whether the gap exists. Both halves matter.",
  ]},
  { type: "tip", title: "How to read these two tables together",
    text: "High rate plus decent ticket size is where a first-website pitch lands: hardware stores, plumbers, electricians, guest houses. Low rate plus high ticket — dentists, car dealers — is redesign and retainer territory. Pick your pitch to match the column." },

  { type: "h2", id: "limits", text: "What this data cannot tell you" },
  { type: "prose", text: [
    "Stating the limits is the difference between a number people cite and a number people distrust, so here they are.",
  ]},
  { type: "checklist", items: [
    { title: "It is our index, not the census", detail: "we cover 37 cities; a business we have never indexed is not in these figures" },
    { title: "Coverage is uneven", detail: "84,219 Indian businesses versus 3,062 American ones — the US and Australia rates rest on thin, city-specific samples" },
    { title: "\"Has a website\" is binary here", detail: "a dead one-page site from 2011 counts as having a website; this measures presence, not quality" },
    { title: "A Facebook page is not counted as a website", detail: "which is defensible, but it means some businesses here do have an online presence" },
    { title: "It moves", detail: "businesses open, close and build sites continuously — every figure carries its date for that reason" },
  ]},

  { type: "leads", city: "gurgaon", heading: "What 38.8% looks like on the ground" },

  { type: "h2", id: "use", text: "What an agency should do with this" },
  { type: "prose", text: [
    "Three things follow from the numbers above, and none of them is \"buy a list\".",
    "**Pick the geography before the vertical.** A 4.5% gap and a 38.8% gap are different businesses, not different territories. Your entire pitch changes.",
    "**Check the gap before you commit to a niche.** The published niche lists are ranked by ticket size. Rank yours by ticket size and gap rate together, or you will spend a quarter pitching people who already bought.",
    "**Quote a number you can defend.** If you are opening a call with \"most businesses like yours don't have a website\", the owner knows their street better than you do. \"Two in five businesses in this area have no site\" survives the follow-up question.",
  ]},
  { type: "cta", variant: "map", title: "See the gap in your own city.",
    detail: "Search any area and category. The count you get is the same index these figures come from — live, not an estimate.",
    action: "Find leads near you", href: "/login" },

  { type: "h2", id: "cite", text: "Citing this" },
  { type: "prose", text: [
    "These figures are free to quote with attribution to Mantis, linking to this page. We will refresh them on this URL rather than publishing a new one each year, so a link here does not rot.",
    "If you want a cut we have not published — a specific city, a specific category — ask and we will run it.",
  ]},
];

const faqs = [
  { q: "What percentage of small businesses have no website?",
    a: "In our index of 152,311 local businesses across 37 cities, 32.8% have no website. The rate varies sharply by country: 38.8% in India, 17.0% in the UK, and 4.5% in our (small) US sample. The widely-quoted 27% figure comes from US self-reported survey data." },
  { q: "How is this different from the statistics I've seen elsewhere?",
    a: "Almost every published figure comes from surveying business owners — most from a 2019 Clutch survey of 529 people. Ours comes from checking live business listings, so it measures what is there rather than what owners recall." },
  { q: "Which business types are most likely to have no website?",
    a: "Guest houses (73.4%), fast food outlets (72.0%), hardware stores (67.0%), farms (66.3%) and tailors (65.7%) top our list. Dentists, car dealers and moving companies are at the other end, around 10–14%." },
  { q: "Are dental practices a good web design niche?",
    a: "Not for selling a first website. Only 10.8% of dentists in our index have no site, so you would be selling a redesign against an incumbent. They remain a good niche for redesigns and retainers, which is a slower sale." },
  { q: "How often is this updated?",
    a: "The index refreshes continuously and we restate these figures on this same URL rather than publishing a new page each year. Every table carries the date of its snapshot." },
  { q: "Can I quote these numbers?",
    a: "Yes, with attribution to Mantis and a link to this page. If you need a breakdown we have not published, ask." },
];

async function main() {
  const slug = "how-many-local-businesses-have-no-website";
  await sql`
    INSERT INTO blog_posts (
      slug, title, excerpt, meta_description, category, cluster, tags, author_slug,
      hero_variant, read_minutes, body, faqs, status, featured, published_at, content_updated_at
    ) VALUES (
      ${slug},
      ${"How Many Local Businesses Have No Website? 152,311 Checked"},
      ${"We checked 152,311 local businesses across 37 cities instead of surveying them. 32.8% have no website — and the rate ranges from 4.5% to 38.8% depending on where you are."},
      ${"32.8% of 152,311 local businesses we checked have no website. See the rate by country and by category — measured from live listings, not surveyed."},
      ${"Website Gaps"}, ${"data"},
      ${["Original Data", "Website Gaps", "Market Research"]},
      ${"tarun"}, ${"methodology"}, ${9},
      ${sql.json(body as unknown as Parameters<typeof sql.json>[0])},
      ${sql.json(faqs as unknown as Parameters<typeof sql.json>[0])},
      ${"published"}, ${true}, ${new Date(Date.now() - 1800_000)}, ${null}
    )
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, meta_description = EXCLUDED.meta_description,
      category = EXCLUDED.category, cluster = EXCLUDED.cluster, tags = EXCLUDED.tags,
      hero_variant = EXCLUDED.hero_variant, read_minutes = EXCLUDED.read_minutes,
      body = EXCLUDED.body, faqs = EXCLUDED.faqs, featured = EXCLUDED.featured, updated_at = now()
  `;

  // This is the cluster hub, so it demotes the previous featured post rather than sharing the slot.
  await sql`UPDATE blog_posts SET featured = false WHERE slug != ${slug}`;

  await sql`DELETE FROM blog_links WHERE from_slug = ${slug}`;
  for (const [i, l] of [
    { href: "/resources/how-to-find-businesses-that-need-a-website", anchor: "how to find these businesses at scale", kind: "sibling" },
    { href: "/leads/website-development/in/gurgaon", anchor: "businesses with no website in Gurugram", kind: "lead_page" },
  ].entries()) {
    await sql`INSERT INTO blog_links (from_slug, to_href, anchor, kind, position) VALUES (${slug}, ${l.href}, ${l.anchor}, ${l.kind}, ${i})`;
  }
  console.log("seeded:", slug);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
