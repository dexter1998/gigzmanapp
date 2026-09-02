/**
 * Batch 17 — the agency-growth cluster.
 *
 * SERP checks first:
 *  · Price competition: the principle is well covered and one line from it is worth keeping —
 *    competitive pricing only works when you have a genuine cost advantage through automation or
 *    standardised delivery; without one you are selling at a loss. What is missing is why this trap
 *    is specifically worse for first websites: the buyer has never owned one and cannot evaluate
 *    quality, so price is the only axis visible to them unless you make another one visible.
 *  · Scaling: good material at US agency scale ($500K–1.5M), with two transferable ideas — the
 *    capacity ceiling is arithmetic rather than motivation, and first hires must bill. The ₹5 lakh
 *    decomposition is ours.
 *  · Pipeline coverage is an enterprise metric expressed in deal value at 3x or 4x. For local work
 *    where every ticket is roughly the same size, value-based coverage is the wrong unit entirely.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · price competition */
{
  slug: "why-well-do-it-cheaper-is-a-losing-position",
  title: "Why \"We'll Do It Cheaper\" Is a Losing Position",
  excerpt: "Someone will always be cheaper, and for a first website the buyer genuinely cannot tell the difference. Which is exactly why price has to stop being the only visible axis.",
  meta: "Why competing on price loses for web design: the buyer cannot evaluate a first website, so price is the only visible axis until you make another one.",
  category: "Outreach", cluster: "operations", hero: "pricing", mins: 8,
  tags: ["Pricing", "Objection Handling", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "There is always somebody cheaper, and in this market there is always somebody dramatically cheaper — a student, a cousin, a template reseller, an offshore team quoting a fifth of your number. Competing there is not a strategy, and the reason is arithmetic rather than pride.",
      "**Price competition only works when you have a real cost advantage** — automation, a standardised delivery process, genuine operational efficiency. Without one you are not competing on price, you are selling at a loss and calling it competing.",
    ]},

    { type: "h2", id: "worse-here", text: "Why this is worse for first websites" },
    { type: "prose", text: [
      "The general advice about competing on value assumes the buyer can perceive value, and for a first website they mostly cannot.",
      "A business that has never had a website has no basis for judging one. They cannot evaluate whether your work loads in two seconds or nine, whether it works properly on a phone, whether the enquiry form actually delivers mail, or whether it will still be maintainable in two years. Every one of those is invisible to them, and every one is where your price difference actually lives.",
      "**So price becomes the only axis they can see** — not because they are unsophisticated, but because it is genuinely the only number in front of them.",
      "That reframes the whole problem. You are not trying to justify a higher price against a visible quality difference. You are trying to make a second axis visible.",
    ]},

    { type: "h2", id: "axes", text: "Making a second axis visible" },
    { type: "prose", text: [
      "Four things a local buyer can actually perceive, none of which is design quality.",
    ]},
    { type: "features", items: [
      { title: "Same-trade evidence", icon: "verified", detail: "Three sites for businesses exactly like theirs, ideally nearby. This is the one that works, and it is why sequencing verticals matters more than portfolio size." },
      { title: "Being findable yourself", icon: "search", detail: "You are a local business too. If they cannot check who you are, you are indistinguishable from the cheaper option in the way that matters most." },
      { title: "Answering", icon: "phone", detail: "The cheap option's defining property, in every story a client will tell you, is that they stopped replying. Being reachable is a differentiator you can demonstrate before the sale." },
      { title: "The monthly", icon: "calendar", detail: "A care plan is a promise about the future that the cheap quote is not making. It also reframes the comparison from one number to a relationship." },
    ]},

    { type: "table", head: ["What differs between quotes", "Can the buyer see it?"], rows: [
      ["Load time", "No"],
      ["Behaviour on a phone", "Partly, if they check"],
      ["Whether the enquiry form delivers mail", "No — until it fails"],
      ["Whether it is maintainable in two years", "No"],
      ["Who answers when something breaks", "No — unless asked"],
      ["Work for businesses like theirs", "Yes"],
      ["The price", "Yes"],
    ], note: "Two visible rows out of seven. That imbalance is the whole problem, and only the last two are being compared." },

    { type: "h2", id: "respond", text: "What to say when they name a cheaper quote" },
    { type: "prose", text: [
      "It will happen, and the instinct — to explain why the other quote is bad — is the losing move. It sounds defensive, it insults a decision they are considering, and it invites them to defend it.",
      "**Agree that it is cheaper, then ask one question:** \"That's a good price. Did they say what happens after it's live — who updates it, who fixes it if something breaks?\"",
      "You have not criticised anybody. You have introduced the axis that the cheap quote is silent on, and you have done it as a question rather than a claim, so the client discovers the gap rather than being told about it.",
      "If the cheaper quote *does* include ongoing support at that price, they may genuinely be the better option and it is worth saying so. That happens rarely, and being the person who said it is worth more than the job.",
    ]},
    { type: "quote", text: "You are not arguing that your work is better. You are pointing at the part of the question nobody has answered.", attribution: "The move, in one line" },

    { type: "h2", id: "when-cheap", text: "When cheaper is the right answer" },
    { type: "prose", text: [
      "Sometimes the cheap option is correct, and the honest position is worth holding.",
      "A business with eleven reviews that needs a single page with its timings and phone number does not need a ₹30,000 build, and a template at ₹4,000 will serve it. Telling that owner so — and pointing them at the cheaper route — costs you a job you would have regretted and buys you something more useful in a market where everybody talks.",
      "The version to avoid is doing the ₹30,000 work for ₹8,000 because you wanted the job. That client gets a rushed site, no monthly, and no reason to refer you, and you have spent a week proving your own price is negotiable.",
    ]},

    { type: "h2", id: "structural", text: "The structural fix" },
    { type: "prose", text: [
      "Everything above is tactics for a conversation you should mostly not be having, and if you are having it constantly the problem is upstream.",
      "**Qualification.** A business with a real review count and a transaction worth thousands is not comparing you against a student. If most of your conversations turn into price comparisons, look at who you are prospecting rather than what you are saying.",
      "**Specialisation.** Three sites for hardware suppliers changes the fourth conversation from a price comparison to a shortlist of one. This is the compounding benefit of working a vertical in sequence, and it is the only durable answer.",
      "**The care plan.** A relationship priced monthly is not comparable to a one-off quote, which removes the axis rather than arguing on it.",
      "And the arithmetic underneath all of it: a local client is worth several times the build across their lifetime, which means winning on price and losing the care plan is a worse outcome than losing the job.",
    ]},

    { type: "leads", city: "faridabad", heading: "Prospects who are not comparing quotes" },

    { type: "cta", variant: "map", title: "Fewer price comparisons.",
      detail: "Businesses with review counts that indicate a real budget, filtered before the first conversation.",
      action: "Build a better list", href: "/login" },
  ],
  faqs: [
    { q: "How do I compete with cheaper web designers?", a: "Not on price. Competing there only works with a genuine cost advantage from automation or standardised delivery; without one you are selling at a loss. Make a second axis visible instead — same-trade evidence, being reachable, and the monthly." },
    { q: "Why can't I just explain that my work is better quality?", a: "Because a business that has never had a website cannot perceive the difference. Load time, mobile behaviour, whether the form delivers mail, whether it stays maintainable — all invisible to them, and all where your price difference lives." },
    { q: "What should I say when a client mentions a cheaper quote?", a: "Agree it is a good price, then ask one question: did they say who updates it and who fixes it if it breaks? You have introduced the axis the cheap quote is silent on without criticising anyone, and the client discovers the gap themselves." },
    { q: "Should I ever lose a job on purpose?", a: "Yes. A business with eleven reviews needing one page with its timings does not need a ₹30,000 build, and saying so costs you a job you would have regretted. Doing the ₹30,000 work for ₹8,000 is the version to avoid." },
    { q: "How do I stop getting into price comparisons at all?", a: "Qualify harder and specialise. A business with a real review count and a transaction worth thousands is not comparing you against a student, and three sites in the same trade turns the fourth conversation into a shortlist of one." },
  ],
  links: [["/resources/handling-its-too-expensive-without-discounting", "the price objection itself"], ["/resources/should-you-niche-down-what-the-data-says", "the specialisation argument"], ["/resources/the-lifetime-value-of-one-local-client", "why winning on price loses money"], ["/resources/qualifying-a-local-lead-before-you-call", "qualifying out of the comparison"]],
},

/* ───────────────────────────── 2 · growth */
{
  slug: "how-to-grow-a-web-agency-past-5-lakh-a-month",
  title: "How to Grow a Web Design Agency Past ₹5 Lakh a Month",
  excerpt: "Twenty builds a month is not a plan, it is a treadmill. The arithmetic of ₹5 lakh, and why only one of the three routes there survives contact with a calendar.",
  meta: "How to grow a web design agency past ₹5 lakh a month: the arithmetic of three routes there, why builds alone cannot work, and what to fix in which order.",
  category: "Lead Generation", cluster: "playbooks", hero: "pricing", mins: 9,
  tags: ["Agency Playbook", "Operations", "Pricing"],
  body: [
    { type: "prose", text: [
      "₹5 lakh a month is where a local web design agency stops being a job, and growing past it is an arithmetic problem rather than an ambition problem. There are exactly three routes and two of them do not survive contact with a calendar.",
      "Start by decomposing the number honestly.",
    ]},

    { type: "h2", id: "three-routes", text: "Three routes past ₹5 lakh, costed" },
    { type: "table", head: ["Route", "What it requires monthly", "Viable?"], rows: [
      ["Volume of builds", "20 builds at ₹25,000", "No"],
      ["Higher tickets", "7 builds at ₹70,000", "Sometimes"],
      ["Recurring base", "150 care plans at ₹2,000, plus 4 builds", "Yes"],
    ], note: "The same ₹5 lakh, arrived at three different ways." },
    { type: "prose", text: [
      "**Twenty builds a month is not a business, it is a treadmill.** It requires roughly four hundred conversations a month at a one-in-twenty close rate, and twenty projects delivered, every month, forever, with the pipeline starting empty each time. Nobody does this alone and few teams do it well.",
      "**Seven builds at ₹70,000** is genuinely achievable but it is a different market. Those tickets exist in metros, in specialised verticals, and in overseas work — not in the tier-2 first-website market most of this corpus is about. It is a real strategy and it is a change of business, not a scaling of the current one.",
      "**One hundred and fifty care plans at ₹2,000 plus four builds** is the route that actually works, and the reason is that the first number does not reset. Four builds a month is eighty conversations — a normal prospecting week — and the base beneath it arrived over three years and stays.",
    ]},

    { type: "h2", id: "base", text: "Building the recurring base" },
    { type: "prose", text: [
      "One hundred and fifty care plans sounds enormous and it is roughly four years of ordinary work, which is the part people do not want to hear.",
      "At four builds a month with, say, 70% attaching a plan, that is about 34 plans a year net of churn — call it four years to 150. There is no shortcut, and the businesses that reach this point are simply the ones that attached a monthly to every build from early on rather than starting at year three.",
      "Which makes the single highest-leverage decision in a young agency the attach rate, not the build price. **Going from a 30% attach rate to 80% roughly doubles where you land in four years**, and it costs nothing except asking every time.",
    ]},
    { type: "table", head: ["Attach rate", "Plans after 4 years", "Monthly recurring"], rows: [
      ["30%", "~55", "₹1.1 lakh"],
      ["50%", "~92", "₹1.84 lakh"],
      ["70%", "~128", "₹2.56 lakh"],
      ["90%", "~165", "₹3.3 lakh"],
    ], note: "Four builds a month, ₹2,000 plans, with churn. Illustrative — your churn is the variable that matters." },

    { type: "h2", id: "ceiling", text: "The ceiling you hit first" },
    { type: "prose", text: [
      "Long before ₹5 lakh there is a wall at around ₹1.5 to ₹2 lakh a month, and it is always the same wall: **you are the only person who sells, and you are also the only person who delivers.**",
      "The month you deliver well is the month you do not prospect, which produces the empty month two months later, which produces a panic month of prospecting during which nothing is delivered. Most agencies oscillate here for years and interpret it as market conditions.",
      "The fix is a hire, and the sequencing is unintuitive. **Hire delivery, not sales.** A junior who can build the standard site under supervision frees the founder to keep prospecting, and the founder is the only person who can sell in a business with no brand yet. Hiring a salesperson first fails because they have nothing to point at and no relationship to inherit.",
      "The second unintuitive part: hire before it is comfortable. Waiting until you are certain means hiring during a month when you are drowning, which is the worst possible time to train somebody.",
    ]},

    { type: "h2", id: "raise", text: "Raising the floor beats adding clients" },
    { type: "prose", text: [
      "The cheapest lever at this stage is a minimum, and almost nobody uses it.",
      "Replacing two ₹12,000 projects with one ₹25,000 project is the same revenue and roughly half the work — one client to manage, one set of content to chase, one launch. Raising the project minimum does more for a squeezed month than any amount of extra prospecting, and it costs nothing to implement.",
      "The same applies to the plans. A ₹2,000 care plan raised to ₹2,500 across 100 clients is ₹50,000 a month for one round of conversations, and existing clients who are getting visible monthly value largely accept it. Most people have never raised a care plan price in their life.",
    ]},
    { type: "checklist", items: [
      { title: "Attach rate first", detail: "The highest-leverage number in a young agency, and it costs nothing to improve." },
      { title: "Minimum second", detail: "Two small projects replaced by one larger one is the same money for half the work." },
      { title: "Delivery hire third", detail: "Before it is comfortable, and delivery rather than sales." },
      { title: "Price rises fourth", detail: "On the base you already have, once the plan visibly does something." },
    ]},

    { type: "h2", id: "not", text: "What not to do at this stage" },
    { type: "prose", text: [
      "**Do not add service lines.** SEO, ads, social — each one is a new delivery capability, a new sales conversation and a new way to be mediocre. They are the most common way an agency at ₹2 lakh stays at ₹2 lakh while feeling busier.",
      "**Do not take the large project that changes everything.** A single ₹3 lakh client at this stage consumes the founder, stops prospecting for two months, and leaves. The concentration risk is the visible problem; the pipeline hole is the expensive one.",
      "**Do not rebuild your own website.** It is the most satisfying available form of not prospecting.",
    ]},

    { type: "leads", city: "ahmedabad", heading: "The next four builds" },

    { type: "cta", variant: "map", title: "Four builds a month, consistently.",
      detail: "Eighty conversations a month is a normal prospecting week when the list is already filtered.",
      action: "Build the list", href: "/login" },
  ],
  faqs: [
    { q: "How do I grow a web design agency to ₹5 lakh a month?", a: "Through a recurring base, not volume. Twenty builds a month at ₹25,000 is a treadmill requiring 400 conversations monthly; 150 care plans at ₹2,000 plus four builds is the same revenue and the first number does not reset each month." },
    { q: "How long does it take to build 150 care plans?", a: "About four years at four builds a month with a high attach rate, net of churn. There is no shortcut — the agencies that get there are the ones that attached a monthly from early on rather than starting at year three." },
    { q: "What is the biggest lever for a young agency?", a: "The care plan attach rate. Going from 30% to 80% roughly doubles where you land in four years, and it costs nothing except asking every time — which makes it more valuable than raising the build price." },
    { q: "Should I hire a salesperson or a developer first?", a: "Delivery, and before it is comfortable. A junior who can build the standard site frees the founder to keep prospecting, and in a business with no brand yet the founder is the only person who can sell — a salesperson has nothing to point at." },
    { q: "Should I add SEO or ads to grow faster?", a: "Not at this stage. Each new service line is a new delivery capability, a new sales conversation and a new way to be mediocre, and adding them is the most common way an agency at ₹2 lakh stays at ₹2 lakh while feeling busier." },
  ],
  links: [["/resources/how-to-sell-maintenance-plans-after-the-build", "raising the attach rate"], ["/resources/the-lifetime-value-of-one-local-client", "the arithmetic behind the base"], ["/resources/building-a-weekly-prospecting-routine", "keeping four builds a month coming"], ["/resources/how-much-to-charge-for-a-website-india", "raising the minimum"]],
},

/* ───────────────────────────── 3 · pipeline size */
{
  slug: "how-many-businesses-should-be-in-your-pipeline",
  title: "How Many Businesses Should Be in Your Pipeline?",
  excerpt: "The enterprise answer is 3x your target in deal value. For local work where every ticket is roughly the same, that measures the wrong thing entirely.",
  meta: "How many businesses should be in your pipeline: why value-based coverage fails for local work, and the conversation counts that actually predict next month.",
  category: "Lead Generation", cluster: "operations", hero: "leads", mins: 8,
  tags: ["Operations", "Prospecting", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Count conversations, not value. The standard answer — keep three to four times your revenue target in pipeline value — comes from enterprise sales where deal sizes vary by a factor of fifty, and it is the wrong instrument for a business where nearly every project is between ₹15,000 and ₹40,000.",
      "When the tickets are similar, **pipeline value is just a restatement of the count**, and how many businesses are in there is the thing you can actually act on.",
    ]},

    { type: "h2", id: "numbers", text: "Working backwards from one client" },
    { type: "prose", text: [
      "Take the realistic figures: roughly one in twenty qualified conversations closes, about half of contact attempts reach a decision-maker, and some prospects need a second visit.",
    ]},
    { type: "table", head: ["To close", "Conversations", "Contact attempts", "Qualified prospects on the list"], rows: [
      ["1 client", "20", "40", "25"],
      ["2 clients/month", "40", "80", "50"],
      ["4 clients/month", "80", "160", "100"],
      ["10 clients (a quarter)", "200", "400", "250"],
    ], note: "At a 1-in-20 close rate. Your own rate is the only one worth planning on once you know it." },
    { type: "prose", text: [
      "So the answer for a solo agency wanting four builds a month is roughly **a hundred qualified prospects live at any time**, with eighty conversations happening across the month. That is two prospecting afternoons a week.",
      "Worth noting what \"qualified\" is doing there. A hundred businesses in a spreadsheet is not a pipeline; a hundred businesses that have a real review count, a rating above 4.0, and a transaction worth having is. The unfiltered version needs to be three or four times larger to produce the same result.",
    ]},

    { type: "h2", id: "stages", text: "Three stages, not seven" },
    { type: "prose", text: [
      "CRM-shaped pipelines with seven stages are for businesses where a deal takes six months. For local work, three stages hold everything worth tracking.",
    ]},
    { type: "features", items: [
      { title: "On the list", icon: "search", detail: "Qualified, not yet contacted. Should always be at least 100 for a four-a-month target." },
      { title: "In conversation", icon: "phone", detail: "Spoken to, has a next step with a date. This is the number that predicts next month." },
      { title: "Quoted", icon: "score", detail: "A number has been named. Should close or die within three weeks — anything older is not really here." },
    ]},
    { type: "prose", text: [
      "The third stage is the one that lies. Quotes accumulate in a spreadsheet and make the pipeline look healthy when they are actually dead. **A quote that has not moved in three weeks is not a prospect, it is a memory** — either revive it deliberately with a reason to talk, or take it off the list so the number tells you the truth.",
    ]},

    { type: "h2", id: "leading", text: "The number that predicts next month" },
    { type: "prose", text: [
      "Not the total. **Conversations started this week** is the only leading indicator in this business, and it is the one people stop watching precisely when it matters.",
      "The reason is the lag. A conversation started today closes in two to six weeks, so this week's conversation count is next month's revenue with high reliability — and a week with two conversations produces a month you will feel eight weeks later and attribute to something else.",
      "The useful weekly review is three numbers and takes two minutes: conversations started, follow-ups with a date attached, and prospects remaining on the current list. If the first is healthy and nothing closes, the pitch or the qualification is wrong. If the first is low, nothing else in the business is worth diagnosing yet.",
    ]},

    { type: "h2", id: "refill", text: "When to refill, and with what" },
    { type: "prose", text: [
      "The refill decision is where most pipelines quietly degrade, because it gets made under pressure rather than in advance.",
      "**Refill at 40%, not at empty.** When a list of a hundred is down to forty uncontacted businesses, that is roughly two weeks of rounds left — which is exactly enough time to build the next list without a gap. Waiting until it is empty produces a week with nothing to do, and a week with nothing to do is where the routine breaks.",
      "**Refill with an adjacent category, not a new city.** The category you have just worked taught you the objections, the price band and what the businesses lose by being invisible, and an adjacent trade reuses nearly all of it. A new city resets your travel, your local knowledge and your referral base at once.",
      "**Do not refill by loosening the filter.** The tempting move when a list runs thin is to drop the review-count floor and add another two hundred businesses. That produces a larger pipeline and a worse one, and the effect shows up as a falling close rate that looks like the market getting harder rather than the list getting weaker.",
    ]},

    { type: "h2", id: "too-big", text: "When the pipeline is too large" },
    { type: "prose", text: [
      "An uncommon problem and a real one. A list of eight hundred prospects is not four times better than two hundred — it is usually a sign that prospecting has become list building, which is the most comfortable available substitute for talking to people.",
      "Two hundred qualified businesses is a quarter of work at a realistic pace. Building a list of a thousand is an afternoon that feels productive and produces nothing, and the tell is a growing list alongside a flat conversation count.",
      "The related failure is never removing anybody. A business that said no, or that you have decided is not a fit, should come off — otherwise the number stops meaning anything and you stop trusting it, at which point you have a spreadsheet rather than a pipeline.",
    ]},

    { type: "leads", city: "coimbatore", heading: "A hundred qualified prospects" },

    { type: "cta", variant: "map", title: "A hundred, filtered.",
      detail: "Enough qualified prospects for four builds a month — by category, review count and rating.",
      action: "Build your pipeline", href: "/login" },
  ],
  faqs: [
    { q: "How many prospects should a web design agency have in its pipeline?", a: "About 100 qualified prospects live at any time to support four builds a month, producing roughly 80 conversations across the month. For ten clients in a quarter, around 250." },
    { q: "Should I measure pipeline in value or in number of prospects?", a: "Number, for local work. The enterprise 3x coverage rule exists because deal sizes vary enormously; when every project is ₹15,000–40,000, pipeline value is just a restatement of the count and the count is what you can act on." },
    { q: "What is the best leading indicator for an agency pipeline?", a: "Conversations started this week. A conversation started today closes in two to six weeks, so this week's count is next month's revenue — and a quiet week produces a month you feel eight weeks later and blame on something else." },
    { q: "How long should a quote stay in the pipeline?", a: "Three weeks. After that it is a memory rather than a prospect — either revive it deliberately with a reason to talk, or remove it, because accumulated dead quotes make a pipeline look healthy when it is not." },
    { q: "Can a pipeline be too big?", a: "Yes, and it usually means prospecting has become list building. Eight hundred prospects is not four times better than two hundred; the tell is a growing list alongside a flat conversation count." },
  ],
  links: [["/resources/building-a-weekly-prospecting-routine", "the weekly rhythm behind these numbers"], ["/resources/your-first-10-web-design-clients", "the same arithmetic for the first ten"], ["/resources/qualifying-a-local-lead-before-you-call", "what qualified means here"], ["/resources/territory-planning-splitting-a-city-between-reps", "where the hundred come from"]],
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
