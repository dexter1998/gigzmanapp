/**
 * Batch 16 — retention, lifetime value, and redesign pricing.
 *
 * SERP checks first:
 *  · Care plans are a WordPress-agency genre (GoDaddy, Crocoblock, GoWP, WP Umbrella, Josh Hall)
 *    and every one of them sells the plan on security patches, backups and uptime. That framing is
 *    correct for a WordPress shop serving businesses that understand what a plugin is, and it lands
 *    on nothing with a bakery owner. The transferable idea is bundling the first year so support is
 *    never framed as optional.
 *  · LTV content is generic formula material with no agency numbers in it. Worth doing properly,
 *    because for a local client the build is the smallest line in the calculation.
 *  · Redesign pricing is a US SERP with a genuinely useful three-level structure — refresh,
 *    redesign, rebuild — at $3–15k, $15–40k and above. The levels transfer; the numbers do not.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · selling care plans after launch */
{
  slug: "how-to-sell-maintenance-plans-after-the-build",
  title: "How to Sell Maintenance Plans After the Build",
  excerpt: "Every guide sells the plan on backups and security patches. That framing works on agencies and lands on nothing with a shop owner. Sell what they can see instead.",
  meta: "How to sell website maintenance plans after the build: why security framing fails with local clients, what to sell instead, and the moment to ask.",
  category: "Lead Generation", cluster: "playbooks", hero: "pricing", mins: 9,
  tags: ["Pricing", "Operations", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Selling a maintenance plan after the site is live is harder than selling it with the build, and the reason most people fail at it is the pitch rather than the timing.",
      "Every guide on selling maintenance plans is written by and for WordPress shops, and they all sell the same thing: **backups, security patches, plugin updates, uptime monitoring.** That is a genuine service and it is completely invisible to a hardware supplier. You are asking somebody to pay ₹2,000 a month so that nothing happens, and nothing happening is indistinguishable from not paying.",
    ]},

    { type: "h2", id: "what-to-sell", text: "Sell the thing they can see" },
    { type: "prose", text: [
      "The plan a local business will actually renew is one where they can point at something that changed this month.",
      "**Content, not maintenance.** New photographs of the work you did. Updated prices. This month's festival offer. The three products they started stocking. Every one of those is visible, and every one of them is a thing the owner already wishes were on the site.",
      "The patching and backups should absolutely be in the plan — you cannot responsibly run a site without them — but they belong in the second half of the list, not the headline. The headline is what changes.",
    ]},
    { type: "table", head: ["What you say", "What they hear", "Renews?"], rows: [
      ["\"Backups and security updates\"", "Insurance against something that has not happened", "Rarely"],
      ["\"Plugin and platform updates\"", "Technical work I cannot evaluate", "Rarely"],
      ["\"We add your new work every month\"", "The site stays current", "Usually"],
      ["\"Price and stock updates whenever they change\"", "One less thing to remember", "Usually"],
      ["\"Festival banners and seasonal offers\"", "Something happens at Diwali", "Usually"],
    ]},

    { type: "h2", id: "moment", text: "The moment to ask" },
    { type: "prose", text: [
      "There is a specific window and most people miss it in both directions.",
      "**Too early** is at the proposal, as a line item among other line items. It reads as padding and it invites a negotiation about whether it is necessary, in a conversation where the client is already deciding whether the build is necessary.",
      "**Too late** is three months after launch, when the site has visibly gone stale, the client has noticed, and the plan now sounds like a fix for a problem you created.",
      "The window is **the handover**, when the site goes live and the client is happier with you than they will ever be again. Something they are proud of exists, it is theirs, and the natural next question is how it stays like this. Ask then.",
    ]},
    { type: "steps", items: [
      { title: "Bundle the first three months into the build", icon: "calendar", detail: "Not free — included, and named. It sets the expectation that maintenance is part of having a website rather than an upsell, and it gives you three months to demonstrate what the plan actually does." },
      { title: "Show the work in month one", icon: "signal", detail: "Add something visible in the first few weeks, unprompted, and tell them. New photographs, an updated price. This is the entire sale, made before you ask for it." },
      { title: "Ask at the end of the included period", icon: "phone", detail: "\"The three months are up — do you want to carry on at ₹2,000?\" They have seen three months of it. The decision is informed rather than speculative." },
      { title: "Make renewal automatic and cancellation easy", icon: "verified", detail: "Same date each month, and no lock-in. In a local market where everybody talks, a plan people feel trapped in costs more than the revenue it holds." },
    ]},

    { type: "h2", id: "already-live", text: "Selling to clients who are already live" },
    { type: "prose", text: [
      "For the sites you have already launched without a plan, the direct approach — an email announcing your new packages — is the weakest available option and it is what the published advice recommends.",
      "What works better costs an hour: **do the work first, then send it.** Update one client's site with something obviously useful, unasked. New photographs from their Instagram, a corrected price, a broken link fixed. Then message them: here is what I changed, it took an hour, it needed doing. Do you want me to keep doing this every month for ₹2,000?",
      "You have replaced a proposal with a demonstration, and the ask is now about continuing something rather than starting something. In a market where trust does most of the work, that difference is the whole conversation.",
    ]},
    { type: "tip", title: "Start with the clients who ask",
      text: "Some clients already message you every few months with small changes and you do them for free. Those are not favours, they are an unpriced care plan — and they are the easiest conversion in your list. Say so plainly and put a number on it." },

    { type: "h2", id: "cancel", text: "Why plans get cancelled, and when" },
    { type: "prose", text: [
      "Almost all cancellations happen in the first three months, and almost all of them have the same cause: **nothing visible happened.**",
      "The client paid twice, looked at their site, saw the same site, and drew the obvious conclusion. That is not a pricing problem or a loyalty problem — it is a delivery problem, and it is entirely inside your control.",
      "So the fix is a rhythm rather than a retention offer. Change something visible every month whether or not the client asked, and tell them you did in one line. **The message matters as much as the change**, because a plan whose work is invisible is indistinguishable from a plan doing nothing, which is the exact failure that killed the security-patch framing in the first place.",
      "The second cancellation window is at about eighteen months, and it has a different cause: the site has genuinely stopped needing anything. That is the moment to propose something new — a second language, a booking flow, an extra service page — rather than to defend the existing plan.",
    ]},

    { type: "h2", id: "price", text: "What to charge and what to include" },
    { type: "table", head: ["Tier", "Includes", "Monthly"], rows: [
      ["Basic", "Hosting, backups, updates, up to 1 hour of changes", "₹1,200–2,000"],
      ["Standard", "The above plus monthly content and photo updates", "₹2,000–3,500"],
      ["Active", "The above plus seasonal campaigns and new pages", "₹3,500–6,000"],
    ], note: "Bound the changes by time, not by task type. An hour is arguable by nobody; \"small changes\" is arguable by everybody." },
    { type: "prose", text: [
      "Carry unused time forward for up to three months. It costs you nothing on average, and it removes the feeling of losing something by not asking — which is what makes people cancel in a quiet quarter.",
    ]},

    { type: "leads", city: "vadodara", heading: "Future care plan clients" },

    { type: "cta", variant: "map", title: "Build the base that renews.",
      detail: "Verticals where content genuinely changes — the ones where a monthly plan needs no defending.",
      action: "Find them", href: "/login" },
  ],
  faqs: [
    { q: "How do I sell a website maintenance plan to a local business?", a: "Sell what they can see. Backups and security patches are invisible — you are asking them to pay so that nothing happens. Lead on content instead: new photographs, updated prices, this month's offer, and put the patching second on the list." },
    { q: "When should I ask a client about a care plan?", a: "At handover, when the site goes live and the client is happier with you than they will ever be again. At the proposal it reads as padding; three months after launch it sounds like a fix for a problem you created." },
    { q: "How do I sell care plans to clients who are already live?", a: "Do the work first, then send it. Update one client's site with something obviously useful unasked, tell them what you changed, and ask whether they want it every month. That replaces a proposal with a demonstration." },
    { q: "What should a website care plan include?", a: "Hosting, backups and updates, plus a bounded amount of change time — an hour a month is arguable by nobody, while \"small changes\" is arguable by everybody. Carry unused time forward up to three months so a quiet quarter does not trigger a cancellation." },
    { q: "How much should I charge for a maintenance plan in India?", a: "₹1,200–2,000 for hosting, backups and an hour of changes; ₹2,000–3,500 with monthly content and photo updates; ₹3,500–6,000 with seasonal campaigns and new pages." },
  ],
  links: [["/resources/website-maintenance-plans-what-to-charge", "pricing the plan itself"], ["/resources/the-lifetime-value-of-one-local-client", "what the plan is worth over years"], ["/resources/hourly-project-or-value-pricing-model", "why the monthly matters more than the model"], ["/resources/how-to-take-advance-payment-from-indian-clients", "billing it"]],
},

/* ───────────────────────────── 2 · lifetime value */
{
  slug: "the-lifetime-value-of-one-local-client",
  title: "The Lifetime Value of One Local Web Design Client",
  excerpt: "The build is the smallest number in the calculation. Worked through properly, one ₹25,000 client is worth six times that — and the multiplier is almost entirely two things.",
  meta: "The lifetime value of a local web design client: the build, the care plan, referrals and the eventual redesign, worked through with realistic churn.",
  category: "Comparisons", cluster: "data", hero: "pricing", mins: 9,
  tags: ["Pricing", "Agency Playbook", "Market Research"],
  body: [
    { type: "prose", text: [
      "One local web design client is worth several times the build, and understanding by how much changes what you are willing to spend to get one — which is the only reason the number matters.",
      "Worked through with realistic assumptions, a ₹25,000 first website is worth roughly **₹1.5 lakh** over the relationship. The build is the smallest line in it.",
    ]},

    { type: "h2", id: "components", text: "The four components of a local client's lifetime value" },
    { type: "table", head: ["Component", "Assumption", "Value"], rows: [
      ["The build", "₹25,000 once", "₹25,000"],
      ["Care plan", "₹2,000/month, 30 months average", "₹60,000"],
      ["Additional work", "One extra page or feature a year, 3 years", "₹18,000"],
      ["Redesign", "40% chance at year 4, at ₹30,000", "₹12,000"],
      ["Referrals", "0.6 referred clients at the same value", "₹36,000"],
    ], note: "Illustrative and deliberately conservative. Your own churn and referral rates are the only ones that matter." },
    { type: "prose", text: [
      "That totals roughly ₹1.51 lakh, of which the build is 17%. **The care plan and referrals together are two-thirds of it**, and both are things most people selling first websites do not systematically pursue.",
      "The thirty-month care plan figure is the one to argue with. It implies about 3% monthly churn, which is achievable for a plan that visibly does something and optimistic for one that only does backups. Halve it and the total drops to about ₹1.2 lakh — still five times the build.",
    ]},

    { type: "h2", id: "referrals", text: "The referral number is the one to work on" },
    { type: "prose", text: [
      "0.6 referrals per client is a modest assumption and most people achieve far less, because they never ask.",
      "Local businesses are unusually good referrers. They know each other — the same market street, the same trade association, the same supplier. A hardware store owner personally knows six other hardware store owners, and his recommendation carries more weight than anything you could say to those six yourself.",
      "The mechanics matter more than the sentiment. **Ask once, specifically, at a good moment.** The good moment is when something visible has just happened — the site went live, or the care plan produced something they liked. The specific version is naming a person or a type: \"do you know anyone else on this street who'd want this?\" rather than \"let me know if you hear of anyone\".",
      "Raise 0.6 to 1.0 and the lifetime value goes from ₹1.5 lakh to ₹1.9 lakh, on an activity that costs nothing.",
    ]},

    { type: "h2", id: "so-what", text: "What the number is actually for" },
    { type: "prose", text: [
      "Not for a slide. For three specific decisions.",
      "**What you can spend to acquire a client.** At ₹1.5 lakh lifetime value, spending ₹5,000 to win one is trivially worth it — and that reframes the free-mockup arithmetic, paid tooling, and travel entirely. It is also why the lead-price table in the buying-leads post looks different once you stop measuring against the build alone.",
      "**Whether to discount the build.** Cutting ₹5,000 off a ₹25,000 build to win a client who is worth ₹1.5 lakh is obviously correct arithmetic and almost always the wrong move anyway, because the client who negotiated the build negotiates the care plan too. The lifetime figure is a reason to be generous with scope and firm on price.",
      "**Which clients to keep.** A client who consumes four hours a month on a ₹2,000 plan and never refers anybody has a negative lifetime value, and knowing the number is how you notice.",
    ]},

    { type: "h2", id: "vertical", text: "It varies enormously by vertical" },
    { type: "prose", text: [
      "The single figure hides the thing that should drive your targeting. Lifetime value depends mostly on whether the vertical sustains a care plan, and that is a property of whether their content changes.",
    ]},
    { type: "table", head: ["Vertical", "Care plan sticks", "Why"], rows: [
      ["Electronics retail", "Strongly", "Stock and prices change monthly"],
      ["Salons and barbers", "Strongly", "New work photographed daily"],
      ["Bakeries", "Strongly", "Festivals and seasonal items"],
      ["Hardware and trade", "Well", "Rate lists move"],
      ["Coaching and academies", "Well", "Batches, fees, results"],
      ["Car washes", "Well", "Before-and-after work weekly"],
      ["Tailors and boutiques", "Well", "New pieces weekly"],
      ["Convenience and general stores", "Poorly", "Nothing changes, and the ticket is small"],
    ]},
    { type: "prose", text: [
      "Two clients at the same build price can differ threefold in lifetime value on this axis alone, which is a stronger argument for choosing a vertical than any gap rate.",
    ]},

    { type: "h2", id: "caveats", text: "Where this calculation misleads" },
    { type: "prose", text: [
      "**It is not cash today.** A ₹1.5 lakh lifetime value arriving over four years does not pay this month's costs, and agencies have gone under while their spreadsheet said they were fine.",
      "**Churn is not evenly distributed.** Most care plan cancellations happen in the first three months, before the client has seen the plan do anything. An average of thirty months is made of clients who leave at two and clients who stay for five years.",
      "**Referrals are not guaranteed and cannot be forecast per client.** They are a portfolio property. Do not build a plan that requires a specific client to refer somebody.",
      "The honest use of this number is directional: it tells you the care plan and the referral ask are where the money is, and that the build price is the least important number in your business. Both of those are true regardless of whether the total is ₹1.2 lakh or ₹1.9 lakh.",
    ]},

    { type: "leads", city: "indore", heading: "Where the next one comes from" },

    { type: "cta", variant: "map", title: "One client, several times over.",
      detail: "Target the verticals where a care plan sticks — the review counts and categories are the clue.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "What is a local web design client actually worth?", a: "Around ₹1.5 lakh over the relationship on conservative assumptions — a ₹25,000 build, roughly ₹60,000 of care plan across 30 months, some additional work, a chance of a redesign, and referrals. The build is about 17% of it." },
    { q: "What drives the lifetime value of an agency client?", a: "The care plan and referrals, which together are about two-thirds of the total. Both are things most people selling first websites never systematically pursue, and both cost almost nothing to improve." },
    { q: "How many referrals should I expect per client?", a: "0.6 is a modest working assumption and most people get less because they never ask. Local businesses are unusually good referrers — they know the same street and the same trade — and raising it to 1.0 moves lifetime value from ₹1.5 to ₹1.9 lakh." },
    { q: "Should I discount the build if lifetime value is high?", a: "The arithmetic says yes and experience says no. A client who negotiated the build negotiates the care plan too. Use the lifetime figure as a reason to be generous with scope and firm on price." },
    { q: "Does lifetime value differ by vertical?", a: "Threefold, and it turns on whether the care plan sticks. Electronics retail, salons and bakeries have content that genuinely changes monthly; convenience stores have nothing that changes and a small ticket besides." },
  ],
  links: [["/resources/how-to-sell-maintenance-plans-after-the-build", "capturing the largest component"], ["/resources/should-you-buy-web-design-leads", "what this means for lead prices"], ["/resources/which-local-verticals-actually-pay-for-a-website", "picking for lifetime value"], ["/resources/website-maintenance-plans-what-to-charge", "pricing the plan"]],
},

/* ───────────────────────────── 3 · redesign pricing */
{
  slug: "how-to-price-a-website-redesign",
  title: "How to Price a Website Redesign (Not a New Build)",
  excerpt: "There is an incumbent, a known previous invoice, and a client who thinks they know what this costs. Three different jobs get called a redesign, and quoting the wrong one loses it.",
  meta: "How to price a website redesign: the difference between a refresh, a redesign and a rebuild, and why the state of the existing site sets the cost.",
  category: "Lead Generation", cluster: "playbooks", hero: "pricing", mins: 9,
  tags: ["Pricing", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Pricing a redesign is a different problem from pricing a first website, and the difference is not technical. **There is an incumbent, there is a previous invoice the client remembers, and there is a comparison.** A first website is a decision; a redesign is a comparison, and you are being compared whether or not anybody says so.",
      "The first job is therefore to find out which of three quite different pieces of work is being asked for, because they differ by a factor of five and the client usually has not distinguished them.",
    ]},

    { type: "h2", id: "three", text: "Three jobs, one word" },
    { type: "table", head: ["", "What changes", "What stays", "Quote (India)"], rows: [
      ["Refresh", "Colours, fonts, images, speed", "Structure, platform, content", "₹8,000–20,000"],
      ["Redesign", "Visual identity, templates, navigation", "Platform, most content", "₹25,000–60,000"],
      ["Rebuild", "Everything, often the platform too", "The domain", "₹50,000–1,50,000"],
    ], note: "The same three-level structure the US market uses, at Indian numbers." },
    { type: "prose", text: [
      "Quoting a rebuild when they wanted a refresh loses the job and makes you look expensive. Quoting a refresh when they need a rebuild loses money and produces a client who is unhappy in month two, because the underlying problem — a site that is slow, unmaintainable or on a platform nobody supports — is still there under the new colours.",
      "The diagnostic question is simple: **\"What is it about the current site that made you start looking?\"** Answers about how it looks are a refresh. Answers about not being able to find things, or the site being wrong about what the business now does, are a redesign. Answers about it being broken, slow, or impossible to update are a rebuild.",
    ]},

    { type: "h2", id: "anchor", text: "The previous invoice is your anchor problem" },
    { type: "prose", text: [
      "Unlike a first website, the client has a number in their head, and it is what they paid last time — usually years ago, often to somebody cheaper, and it is the number you are being measured against.",
      "You cannot ignore it and you should not attack the previous supplier, which reads as sales talk and frequently insults a decision the client made. What works is separating the two purchases explicitly: **\"What you bought last time was a website. What you need now is one that does X\"** — where X is the thing they just told you is missing.",
      "It is also worth asking directly what they spent before. Most people answer, and it tells you immediately whether you are in a ₹15,000 conversation or a ₹60,000 one, before you have committed to a number.",
    ]},

    { type: "h2", id: "existing", text: "Price the mess, not the pages" },
    { type: "prose", text: [
      "The thing that actually determines a redesign's cost is the state of what exists, and it is invisible from the outside. Two identical-looking five-page sites can be a two-day job and a two-week one.",
      "**Look before you quote.** Who has the hosting login, and does anybody still have it. What platform is it on and is that platform still maintained. Is the content usable or does all of it need rewriting. Are there working forms, integrations or a payment flow that has to survive. Is anybody currently getting email at that domain.",
      "That last one has cost more people more money than any other item on this list. Migrating a site while the business's email lives on the same hosting is how a redesign turns into an outage.",
    ]},
    { type: "checklist", items: [
      { title: "Access", detail: "Hosting, domain registrar, platform admin. Missing logins can add days, or make a rebuild the only option." },
      { title: "Platform", detail: "Current and maintained, or abandoned. An unsupported CMS turns a redesign into a rebuild." },
      { title: "Content", detail: "Reusable, or a full rewrite. This is the most commonly underestimated line." },
      { title: "Email", detail: "Where it lives, and whether the migration touches it. Check before quoting, not during." },
      { title: "Anything transactional", detail: "Forms, bookings, payments. Each one is a thing that can break on launch day." },
    ]},

    { type: "h2", id: "quote", text: "How to present the number" },
    { type: "prose", text: [
      "Two things make a redesign quote land, and both are about the comparison you are already in.",
      "**Quote the three levels, not one.** The client asked for \"a redesign\" without knowing which one they meant, so showing the refresh, the redesign and the rebuild with what each does is genuinely helpful rather than a sales tactic. It also moves the conversation from whether your price is right to which option to take.",
      "**Price the discovery separately if the site is a mess.** For anything where you cannot see the state of the existing site, a small paid audit — a few thousand rupees, credited against the project — protects you from quoting blind and filters out clients who are collecting quotes. Anyone unwilling to pay for an hour of assessment was never going to buy a redesign.",
    ]},

    { type: "h2", id: "market", text: "Who the redesign market is" },
    { type: "prose", text: [
      "Worth being clear about, because it determines where this work comes from.",
      "In metros and developed markets, redesign is most of the available work. Bengaluru sits around 26% without a website, Mumbai around 28%, and the {{gbPct}} UK national rate means the overwhelming majority of British businesses already have something. That is a redesign market whether you like it or not.",
      "In tier-2 India the reverse holds, and chasing redesigns there is choosing the harder sale in a market full of easier ones.",
      "The useful pattern for most agencies is to take redesigns as they arrive — they come from referrals and from businesses who found you — while prospecting for first websites, which are the sale you can actually go out and generate.",
    ]},

    { type: "leads", city: "bangalore", heading: "A market that mostly needs redesigns" },

    { type: "cta", variant: "map", title: "Know which market you are in.",
      detail: "Check what share of businesses in your city already have a website before deciding what you sell.",
      action: "Check your city", href: "/login" },
  ],
  faqs: [
    { q: "How much should I charge for a website redesign?", a: "It depends which of three jobs it is: ₹8,000–20,000 for a refresh of colours, fonts and images; ₹25,000–60,000 for a genuine redesign of identity, templates and navigation; ₹50,000–1,50,000 for a rebuild, often including a platform change." },
    { q: "How do I know if a client needs a refresh or a rebuild?", a: "Ask what made them start looking. Complaints about how it looks are a refresh; not being able to find things, or the site being wrong about the business, is a redesign; broken, slow or impossible to update is a rebuild." },
    { q: "Is a redesign cheaper than a new website?", a: "Not reliably. It can be cheaper when hosting, domain and content survive, and more expensive when the platform changes or the content needs rewriting. The state of what exists determines the cost far more than the page count does." },
    { q: "What should I check before quoting a redesign?", a: "Access to hosting, domain and platform admin; whether the platform is still maintained; whether the content is reusable; anything transactional that must survive; and above all where the business's email lives, because migrating a site that shares hosting with email is how a redesign becomes an outage." },
    { q: "Should I focus on redesigns or first websites?", a: "It depends on your market. Metros and developed markets are mostly redesign markets — Bengaluru is around 26% without a website and the UK national rate is {{gbPct}}. In tier-2 India, chasing redesigns is choosing the harder sale in a market full of easier ones." },
  ],
  links: [["/resources/how-much-to-charge-for-a-website-india", "pricing a first website"], ["/resources/which-indian-cities-have-the-biggest-website-gap", "which market you are in"], ["/resources/handling-its-too-expensive-without-discounting", "defending the number"], ["/resources/hourly-project-or-value-pricing-model", "the model underneath"]],
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
