/**
 * Batch 22 — three corrections.
 *
 * Two findings drive this batch and both invert the received wisdom:
 *  · US laundries run at 54.2% of 1,294 checked — higher than India's 41.9% — and the densest
 *    cities for this category are Toronto, Chicago, New York, San Francisco and London. It is a
 *    Western-market vertical, which nothing published about it would lead you to expect.
 *  · Professional services outside India are at or near zero. US lawyers 0.0% of 373 checked,
 *    German lawyers 0.0% of 282, US real estate 0.8%, Australian real estate 0.6%. In India the
 *    same categories run 32-35%. The most-recommended niche in the English-language agency
 *    literature is completely unavailable in the markets that literature is written for.
 *
 * On the statistics post: searching the provenance of the widely-quoted 27% figure returns it
 * attached to several unrelated claims, so the post says it circulates as US self-reported survey
 * data and does not assert a lineage we could not verify.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · outdated stats */
{
  slug: "why-every-no-website-statistic-is-outdated",
  title: "Why Every \"No Website\" Statistic You've Read Is Outdated",
  excerpt: "The same handful of figures get recycled across every article on this, most of them self-reported, US-only and years old. What happens when you check instead of cite.",
  meta: "Why the no-website statistics you have read are unreliable: what they measure, where they come from, and how measured figures differ from survey ones.",
  category: "Website Gaps", cluster: "data", hero: "methodology", mins: 9,
  tags: ["Original Data", "Market Research", "Website Gaps"],
  body: [
    { type: "prose", text: [
      "Search how many small businesses have no website and one page of results will give you four different answers, none of which agrees with the others and most of which trace back to the same small set of surveys.",
      "We measure this directly rather than asking. Across {{checked}} businesses in {{countries}} countries, **{{pct}} have no website** — and the more useful finding is how little a single global figure means once you look underneath it.",
    ]},

    { type: "h2", id: "problems", text: "Four reasons the statistic you read is outdated" },
    { type: "prose", text: [
      "**They are self-reported.** Most come from surveys asking business owners whether they have a website. Owners answer yes when they have a Facebook page, a directory listing, or a site that stopped working two years ago. Every one of those inflates the answer in the same direction.",
      "**They are American.** The most-quoted numbers describe US small businesses and get applied worldwide. Our measurements put the United States at {{usPct}} and India at {{inPct}} — same measurement, entirely different market.",
      "**They are old, and rarely dated.** Figures written in one year get quoted in the next without the original date attached, so a statistic can be five years old by the time it reaches you looking current.",
      "**They average across categories that have nothing in common.** A single national figure covers dentists at 7.6% and hardware stores at 50.2%. The average describes neither, and the average is what gets quoted.",
    ]},

    { type: "h2", id: "spread", text: "Why one number can never be right" },
    { type: "prose", text: [
      "This is the substantive point rather than a complaint about sourcing. The variation within any market dwarfs the difference between markets.",
    ]},
    { type: "table", head: ["Comparison", "Range", "Spread"], rows: [
      ["Between countries", "{{auPct}} to {{inPct}}", "About fourfold"],
      ["Between Indian cities", "26.2% to 79.8%", "About threefold"],
      ["Between categories", "7.6% to 79.8%", "Over tenfold"],
      ["Between areas in one city", "26.3% to 51.5%", "About twofold"],
    ], note: "All from businesses with a verified website check. Category variation is the largest of the four." },
    { type: "prose", text: [
      "Category is the widest axis, which means **a national statistic is the least useful number available to anyone actually prospecting.** Knowing your country's rate tells you nothing about whether to work barbers or dentists this month, and that is the only decision the number could have informed.",
    ]},

    { type: "h2", id: "measured", text: "What measuring instead of asking changes" },
    { type: "prose", text: [
      "The method is unglamorous: read the website field on a business's own listing, one business at a time, and record what is there. No survey, no sample weighting, no estimate.",
      "It produces figures that are **conservative rather than flattering**, and in a specific direction. A business whose listing points at a Facebook page, a Justdial profile or a domain that no longer loads counts as having a website. Those businesses have no site in any sense that matters to an agency, and every rate we publish counts them as served.",
      "It also produces figures that change. When a later check finds a business has built a site, the record is corrected — which makes our own headline number smaller over time. That is the correct behaviour for a measurement and the wrong behaviour for a marketing statistic, which is part of why the circulating numbers do not move.",
    ]},

    { type: "h2", id: "direction", text: "Which way the error runs" },
    { type: "prose", text: [
      "Worth knowing, because the two main sources of error do not cancel out — they point in opposite directions and neither is small.",
      "**Survey figures understate the gap.** An owner with a Facebook page or a site that died in 2023 answers yes when asked whether they have a website, because from their point of view they do. So a self-reported number reports fewer businesses without a site than actually lack a usable one.",
      "**Measured figures like ours also understate it**, for the mirror reason: we count anything in the listing's website field as a website, including that same Facebook page and that same dead domain.",
      "So both methods err in the same direction, and the true first-website opportunity — businesses with nothing an agency would recognise as a website — is larger than every published figure including ours. What differs is the size of the error, and a measured field is at least checkable one business at a time.",
      "The one error that runs the other way is age. A figure from several years ago overstates today's gap, because businesses have been building sites throughout. An undated survey combines both errors and there is no way to tell what is left.",
    ]},

    { type: "h2", id: "use", text: "Which number to actually use" },
    { type: "prose", text: [
      "None of the national ones, including ours.",
      "The number that should drive a decision is **the count of businesses in your category, in your city, with no website today.** Not a percentage and not a national figure — a count, because a count tells you whether there is a quarter of work there and a percentage does not.",
      "Thirty-three restaurants with no website in Jaipur is a decision. \"27% of small businesses lack a website\" is a sentence for a pitch deck. The second one has been quoted for years precisely because it is too vague to be checked.",
    ]},
    { type: "checklist", items: [
      { title: "Ignore national percentages", detail: "Including ours. Category variation is over tenfold and swamps them." },
      { title: "Ask what was measured", detail: "Self-reported or checked, and whether a Facebook page counted as a website." },
      { title: "Ask when, and where", detail: "An undated US survey applied to your market is three errors compounded." },
      { title: "Count, do not estimate", detail: "The businesses in your category and city with no website. That is the only figure that decides anything." },
    ]},

    { type: "leads", city: "kanpur", heading: "A count, not a percentage" },

    { type: "cta", variant: "map", title: "Check rather than cite.",
      detail: "The count for your category and your city, from listings read one at a time.",
      action: "Count your market", href: "/login" },
  ],
  faqs: [
    { q: "How many small businesses actually have no website?", a: "{{pct}} across the {{checked}} businesses we have checked in {{countries}} countries — but the national figure is the least useful number available, because variation between categories is over tenfold and swamps it." },
    { q: "Why do published no-website statistics disagree?", a: "Most are self-reported surveys, where owners answer yes if they have a Facebook page or a site that stopped working. They are also usually American, frequently undated, and averaged across categories ranging from 7.6% to over 50%." },
    { q: "Is the widely-quoted 27% figure reliable?", a: "It circulates as US self-reported survey data and is applied globally. We measure the United States at {{usPct}} and India at {{inPct}} on the same method, which is the problem with applying any single national figure anywhere else." },
    { q: "What makes a measured figure different from a survey figure?", a: "It reads the website field on the business's own listing rather than asking the owner. It is also conservative — a Facebook page or a dead domain in that field counts as having a website, so the real first-website opportunity is larger than every rate we publish." },
    { q: "Which statistic should I actually use?", a: "None of the national ones. Use the count of businesses in your category and your city with no website today. A count tells you whether there is a quarter of work available; a percentage does not." },
  ],
  links: [["/resources/how-many-local-businesses-have-no-website", "the measurement itself"], ["/resources/which-business-types-least-likely-to-have-a-website", "why category variation dominates"], ["/resources/how-to-find-small-businesses-without-a-website-in-india", "the Indian figures, corrected"], ["/resources/india-vs-uk-vs-australia-website-adoption", "the same measurement across countries"]],
},

/* ───────────────────────────── 2 · laundries */
{
  slug: "how-to-sell-websites-to-laundries",
  title: "How to Sell Websites to Laundries and Dry Cleaners",
  excerpt: "American laundries run at 54.2% without a website — higher than India's. The densest cities are New York, Chicago and Toronto, and the pitch writes itself from one growth product.",
  meta: "How to sell websites to laundries and dry cleaners: a 54.2% US gap, why pickup and delivery is the pitch, and what to charge a low-ticket vertical.",
  category: "Lead Generation", cluster: "playbooks", hero: "leads", mins: 9,
  tags: ["Vertical Playbook", "Agency Playbook", "Market Research"],
  body: [
    { type: "prose", text: [
      "Laundries are the most counterintuitive vertical in our index. **43.6% of the 5,136 we have checked have no website** — and the American figure is **54.2% of 1,294**, higher than India's 41.9%.",
      "So selling websites to laundries is a Western-market job as much as an Indian one. The densest cities for this category are Toronto, Chicago, New York, San Francisco and London. This is a Western-market opportunity sitting inside a category most agencies would assume is either saturated or worthless.",
    ]},

    { type: "h2", id: "numbers", text: "The gap by country" },
    { type: "table", head: ["Country", "Checked", "No website", "Avg reviews"], rows: [
      ["United States", "1,294", "54.2%", "10"],
      ["India", "1,677", "41.9%", "86"],
      ["United Kingdom", "396", "38.6%", "11"],
      ["Germany", "397", "36.5%", "4"],
      ["Australia", "272", "23.5%", "49"],
    ], note: "Laundries and dry cleaners with a verified website check." },
    { type: "prose", text: [
      "The review counts are the warning. Ten reviews in the US, eleven in the UK, four in Germany — these are businesses almost nobody thinks about long enough to rate. **That is a low-ticket vertical**, and treating it like a hardware supplier will not work.",
      "India is the exception on that axis at 86 average reviews, which reflects a different business — a laundry in India often does pickup, delivery and pressing as a service relationship rather than as a coin-operated room.",
    ]},

    { type: "h2", id: "pitch", text: "Selling websites to laundries means selling one product" },
    { type: "prose", text: [
      "There is a single growth product in this industry and it requires a website by construction: **wash, dry, fold with pickup and delivery.**",
      "It is the highest-margin thing a laundry can sell, it turns a walk-in transaction into a recurring subscription, and it cannot be run from a phone number alone because it needs addresses, collection windows and repeat scheduling. Every operator in the trade knows this product exists; most have no way to sell it.",
      "So you are not selling a website to a laundry. You are selling the thing that makes pickup and delivery possible, and the website is how it gets delivered. That is a completely different conversation from \"you should be online\", and it is the only one that justifies the price.",
      "The secondary angle, for anyone not ready for that: **hours and services on a page.** \"Open now\" and \"do you do suede\" are the two questions this trade fields all day, and both are searches happening on a phone at the moment of need.",
    ]},
    { type: "table", head: ["Service", "Ticket", "Needs a website"], rows: [
      ["Coin-operated wash", "Lowest", "No"],
      ["Drop-off wash and fold", "Low", "Barely"],
      ["Dry cleaning", "Medium", "For hours and pricing"],
      ["Specialty cleaning", "Higher", "Yes — people search for it"],
      ["Pickup and delivery subscription", "Highest, recurring", "Yes — it cannot exist without one"],
    ]},

    { type: "h2", id: "economics", text: "Making a low-ticket vertical pay" },
    { type: "prose", text: [
      "Ten average reviews means these businesses will not pay ₹40,000, and the honest version of this playbook has to start there.",
      "**Template it, hard.** Every laundry site is the same site: services, prices, hours, area covered, pickup request. Build it properly once and each subsequent one is a day. At the ticket this vertical supports, three days per build is not a business.",
      "**Sell the pickup form as the product.** A one-page site with a working collection request is worth more to the operator than five pages of description, and it is faster to build.",
      "**The care plan is the business.** Prices change, service areas expand, seasonal demand shifts. Forty laundries at a small monthly is a better outcome than fifteen one-off builds, and this trade needs updating more than it needs designing.",
      "**Chains and franchises are different.** Multi-site operators have real budgets and a genuine need — locations, area coverage, a single booking flow across branches. If you work this vertical, the operator with four branches is worth more than twenty single sites.",
    ]},

    { type: "h2", id: "objection", text: "The two objections" },
    { type: "prose", text: [
      "**\"People just walk in.\"** True for the coin-operated half of the business and irrelevant to the half worth selling. Walk-ins are the low-margin transaction; the pickup subscription is the one that needs an address and a schedule, and it cannot be sold to somebody standing at a counter because it is bought at home.",
      "**\"We tried delivery, it did not work.\"** Common, and usually accurate — most operators who tried it ran it through phone calls and a notebook, lost track of collections, and stopped. That is a scheduling failure rather than a demand failure, and saying so plainly is a better response than insisting the demand is there.",
      "The second one is worth listening to properly rather than overcoming. If an operator genuinely tried and it collapsed, they know something about their own market that you do not, and the useful question is what broke — routing, staffing, or bookings. If the answer is bookings, you have a project. If it is routing or staffing, you do not, and a website will not fix it.",
    ]},

    { type: "h2", id: "where", text: "Where to work it" },
    { type: "table", head: ["City", "No website", "Checked"], rows: [
      ["Vadodara", "89", "106"],
      ["Toronto", "87", "152"],
      ["Chicago", "82", "105"],
      ["New York", "80", "146"],
      ["San Francisco", "71", "98"],
      ["London", "69", "161"],
    ], note: "Laundries with a verified website check. Five of six are outside India, which is unusual in this index." },
    { type: "prose", text: [
      "For an agency in North America or Britain this is one of the few categories in our entire dataset where the local market has a genuine first-website gap. Chicago at 82 of 105 checked is a rate most people assume does not exist in an American city any more.",
    ]},

    { type: "leads", city: "chicago", country: "us", heading: "Laundries with no website" },

    { type: "cta", variant: "map", title: "A Western gap, for once.",
      detail: "Laundries and dry cleaners with no website — including in cities everyone assumes are served.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "What percentage of laundries have no website?", a: "43.6% of the 5,136 in our index, and the American figure is higher than India's — 54.2% of 1,294 US laundries against 41.9% of 1,677 Indian ones. The densest cities are Toronto, Chicago, New York, San Francisco and London." },
    { q: "What should I pitch a laundry or dry cleaner?", a: "Pickup and delivery. It is the highest-margin product in the trade, it turns a walk-in transaction into a recurring subscription, and it cannot run from a phone number alone because it needs addresses and collection windows." },
    { q: "Are laundries worth approaching given the small tickets?", a: "Only on a template with a care plan attached. US and UK laundries average around ten Google reviews, so they will not pay ₹40,000. Build the standard site once and each one is a day, then sell the monthly — prices and service areas genuinely change." },
    { q: "Which laundry clients are worth the most?", a: "Multi-site operators. A chain with four branches needs locations, area coverage and a single booking flow, has a real budget, and is worth more than twenty single-shop sites in the same vertical." },
    { q: "Is this a good vertical for a US or UK agency?", a: "One of the few in our whole dataset with a genuine first-website gap in Western markets. Chicago runs at 82 of 105 checked, which is a rate most people assume no longer exists in an American city." },
  ],
  links: [["/resources/which-local-verticals-actually-pay-for-a-website", "how this ranks"], ["/resources/india-vs-uk-vs-australia-website-adoption", "why some categories travel"], ["/resources/how-to-sell-websites-to-salons-and-barbershops", "the other template-and-care-plan vertical"], ["/resources/website-maintenance-plans-what-to-charge", "the monthly this runs on"]],
},

/* ───────────────────────────── 3 · professional services */
{
  slug: "are-lawyers-and-accountants-a-good-web-design-niche",
  title: "Are Lawyers and Accountants a Good Web Design Niche?",
  excerpt: "In the United States, zero of the 373 law firms we checked lack a website. In India, 35.3% do. The most-recommended niche in the literature is unavailable where that literature is written.",
  meta: "Are lawyers and accountants a good web design niche? Zero percent of US law firms lack a website against 35.3% in India — and what that means for the advice.",
  category: "Comparisons", cluster: "data", hero: "methodology", mins: 9,
  tags: ["Original Data", "Market Research", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Whether lawyers and accountants are a good web design niche depends entirely on which country you are in, and the difference is the largest we have measured for any vertical.",
      "**Of the 373 American law firms in our index, zero have no website.** Not a rounded number — the rate is 0.0%. German law firms are also at 0.0% across 282 checked. In India, **35.3% of 872 law firms have none.**",
      "Which produces an awkward situation: legal and professional services are the most-recommended niche in the English-language agency literature, and in the markets where that literature is written, the niche does not exist.",
    ]},

    { type: "h2", id: "numbers", text: "The numbers" },
    { type: "table", head: ["Category", "Country", "Checked", "No website"], rows: [
      ["Lawyer", "United States", "373", "0.0%"],
      ["Lawyer", "Germany", "282", "0.0%"],
      ["Lawyer", "India", "872", "35.3%"],
      ["Accounting", "United States", "334", "4.5%"],
      ["Accounting", "Germany", "294", "7.1%"],
      ["Accounting", "India", "397", "32.2%"],
      ["Real estate", "Australia", "314", "0.6%"],
      ["Real estate", "United States", "644", "0.8%"],
      ["Real estate", "United Kingdom", "301", "3.7%"],
      ["Real estate", "India", "745", "32.9%"],
    ], note: "Professional services businesses with a verified website check." },
    { type: "prose", text: [
      "Australian estate agents at 0.6% and American ones at 0.8% are among the most completely served categories in the entire index. There is no first-website market there at any size worth planning around.",
    ]},

    { type: "h2", id: "why-recommended", text: "Why the advice says otherwise" },
    { type: "prose", text: [
      "The niche guides are not wrong about what they are measuring — they are measuring the wrong thing.",
      "Every published list ranks verticals by **what a client is worth**: a law firm's case value, a dental implant, a roofing job. On that axis legal and professional services genuinely are excellent, which is why they appear at the top of every list.",
      "None of them checks **availability**, and availability is the other half of the question. A vertical where every business already has a website is a redesign market, not a niche — and a redesign market for lawyers is one of the most competitively serviced segments in Western agency work.",
      "So the advice is correct and incomplete, and the incompleteness is the whole problem. It tells you which clients pay well and never mentions that they are all taken.",
    ]},

    { type: "h2", id: "india", text: "Where the niche is real" },
    { type: "prose", text: [
      "In India these are genuine verticals, and the numbers are strong: lawyers at 35.3%, accountants at 32.2%, real estate at 32.9%. Nobody writes agency content for that market.",
      "Two caveats worth carrying in before treating this as free money.",
      "**Accountants collect almost no reviews.** They average around 29 in our index, the lowest of any professional category, because nobody publicly reviews their CA. So the review-count qualification used everywhere else in this corpus does not work here, and you will need a different signal — practice size, office, staff, or the categories of client named on the listing.",
      "**Lawyers have a marketing-conduct dimension.** Advocates in India operate under professional conduct rules on advertising and solicitation that are stricter than in most markets, and how far a practice will go is a decision for them and their own advisers rather than for you. Sell an informational presence, expect caution, and do not push a practice toward promotional claims it has already decided against.",
    ]},

    { type: "h2", id: "redesign", text: "If you are in a served market anyway" },
    { type: "prose", text: [
      "A 0% first-website rate does not mean there is no work — it means the work is a different product, and legal and accounting are among the better redesign markets available.",
      "**The sites are old and everyone knows it.** Professional practices build a website once and leave it, so a large share of that fully-served market is running something built years ago that nobody has touched. The complaint is rarely design; it is that the site does not say what the practice now does.",
      "**The buyer can evaluate quality**, unlike a first-website buyer. A partner who has commissioned two sites understands load time, mobile behaviour and why a form must actually deliver mail, which means the price competition that makes first-website work brutal is much weaker here.",
      "**Compliance is a real constraint and a real moat.** Professional bodies in most markets restrict what a practice can claim, and an agency that understands those rules for one profession has something a cheaper competitor cannot easily copy.",
      "So the honest reframing for a Western agency: legal and accounting remain a good niche, as a redesign niche, sold at redesign prices — which are higher, not lower.",
    ]},

    { type: "h2", id: "pitch", text: "What actually sells here" },
    { type: "prose", text: [
      "Credibility and qualification, not discovery. These are considered purchases where the client is choosing whom to trust with something serious.",
      "**For accountants**, the sale is filtering. A practice that wants GST and company work does not want individual return queries in January, and a page that states what they do and who they work with removes most of that traffic before it becomes a phone call. Owners recognise this immediately.",
      "**For lawyers**, it is areas of practice and a way to be verified. Somebody choosing an advocate wants to establish specialisation and standing before they call, and a listing carries none of that.",
      "**For estate agents in India**, it is listings and locality — the one professional category here where the site does the discovery work directly.",
      "Tickets sit at the upper end: ₹30,000–70,000 for a standard practice site, and these clients renew care plans well because their content genuinely changes with regulation.",
    ]},

    { type: "leads", city: "hyderabad", heading: "Indian practices with no website" },

    { type: "cta", variant: "map", title: "Check the niche before you commit.",
      detail: "The same category, measured in your own market — which is where the answer lives.",
      action: "Check your market", href: "/login" },
  ],
  faqs: [
    { q: "Are lawyers a good web design niche?", a: "Not in Western markets. Zero of the 373 US law firms and zero of the 282 German ones in our index lack a website. In India 35.3% of 872 do, which makes it a real vertical there and a redesign-only market elsewhere." },
    { q: "Why do niche guides recommend legal and professional services?", a: "Because they rank verticals by what a client is worth, where legal genuinely excels. None of them checks availability, which is the other half of the question — a vertical where everyone already has a site is a redesign market, not a niche." },
    { q: "What about accountants and estate agents?", a: "The same pattern. US accounting is 4.5% and German 7.1%, against 32.2% in India. Australian estate agents are 0.6% and American 0.8% — among the most completely served categories in the whole index — against 32.9% in India." },
    { q: "How do I qualify accountants if review counts do not work?", a: "They average around 29 reviews, the lowest of any professional category, because nobody publicly reviews their CA. Use practice size, whether there is a proper office, staff count, or the client categories named on the listing instead." },
    { q: "What should I sell an Indian law practice?", a: "An informational presence — areas of practice and a way for someone to establish specialisation and standing before calling. Advocates operate under professional conduct rules on advertising that are stricter than most markets, so expect caution and do not push past it." },
  ],
  links: [["/resources/which-local-verticals-actually-pay-for-a-website", "the availability-aware ranking"], ["/resources/india-vs-uk-vs-australia-website-adoption", "why country decides this"], ["/resources/should-you-niche-down-what-the-data-says", "how large a niche needs to be"], ["/resources/how-to-price-a-website-redesign", "what to sell in a served market"]],
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
