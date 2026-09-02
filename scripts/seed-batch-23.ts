/**
 * Batch 23 — client acquisition.
 *
 * SERP checks first:
 *  · "Where to find web design clients" is dominated by marketplaces and directories — Upwork,
 *    Fiverr, Toptal, Clutch, DesignRush, GoodFirms, LinkedIn. Every one is a channel where you wait
 *    to be found or bid against global supply, and none of the guides distinguishes channels you
 *    control from channels that control you.
 *  · "Web development vs web design" returns career content exclusively — what each role does, what
 *    each earns. The client-acquisition version of that question is written by nobody, which is odd
 *    given the buyers are genuinely different people with different budgets.
 *  · Cold-call openers are well covered and two principles from that literature are worth carrying:
 *    never apologise for the interruption, and permission-based openers ("am I bothering you?")
 *    damage credibility before you have said anything. Both change shape when you are standing in
 *    the shop rather than on the phone.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · channels */
{
  slug: "where-to-find-web-design-clients",
  title: "Where to Find Web Design Clients in 2026: 7 Channels",
  excerpt: "Ranked by the thing that matters and nobody measures: whether you control the volume. Six of the seven do not, which is why most agencies feel busy and unpredictable.",
  meta: "Where to find web design clients in 2026: seven channels ranked by how much you control the volume, what each costs, and how fast each one produces work.",
  category: "Lead Generation", cluster: "operations", hero: "network", mins: 9,
  tags: ["Prospecting", "Agency Playbook", "Comparisons"],
  body: [
    { type: "prose", text: [
      "Every list of places to find web design clients gives you the same seven or eight channels and ranks them by nothing in particular. The useful ranking is by **control** — whether you can decide to have more conversations next week, or whether you can only wait and hope.",
      "By that measure most of the standard advice points at channels you do not control, which is why so many agencies oscillate between too busy and nothing at all.",
    ]},

    { type: "h2", id: "table", text: "Where to find web design clients: seven channels, ranked" },
    { type: "table", head: ["Channel", "Control", "Speed", "Real cost"], rows: [
      ["Outbound to no-website businesses", "Full", "Weeks", "Your time"],
      ["Referrals from existing clients", "Partial", "Months", "Asking, consistently"],
      ["Local networking and associations", "Partial", "Months", "Time, repeatedly"],
      ["Your own site and local SEO", "Partial", "6–18 months", "Time, then compounding"],
      ["Marketplaces (Upwork, Fiverr)", "None", "Days", "Price"],
      ["Directories (Clutch, GoodFirms)", "None", "Months", "Money, sometimes"],
      ["Social content", "None", "Very slow", "Time, unpredictably"],
    ], note: "Control means: can you decide to have twenty more conversations this week? Only the first row answers yes." },
    { type: "prose", text: [
      "That first row is the only channel where the answer is unambiguously yes, and it is also the one every published guide mentions last, in a sentence, after five paragraphs about optimising a Fiverr profile.",
    ]},

    { type: "h2", id: "marketplaces", text: "Why marketplaces are a different business" },
    { type: "prose", text: [
      "Not bad — different, and worth being clear-eyed about before treating them as a starting point.",
      "On a marketplace you are competing against global supply for a buyer who is comparing on price, because price is the only axis a listing exposes. That is a real business and some people do well at it, but it has almost nothing in common with selling a ₹30,000 first website to a hardware supplier two streets away.",
      "The specific trap is using marketplaces to start and expecting them to lead somewhere else. They teach you to compete on price and speed, they produce clients with no local connection to you, and they generate no referrals in the market you actually live in. Two years of it leaves you with revenue and no local business.",
      "If you use them, use them deliberately as a separate line rather than as the beginning of the local one.",
    ]},

    { type: "h2", id: "referrals", text: "Referrals, and why they underperform expectations" },
    { type: "prose", text: [
      "The most recommended channel in the industry and the most passively handled. Almost everybody says referrals are their best source and almost nobody asks for one.",
      "Local businesses are unusually good referrers — same market street, same trade association, same suppliers — and a recommendation from one hardware supplier to another carries more weight than anything you could say. But it needs a specific ask at a specific moment: **when something visible has just happened**, naming a type of person rather than asking generally.",
      "\"Do you know anyone else on this street who'd want this?\" outperforms \"let me know if you hear of anyone\" by a wide margin, and the difference is that the first one is answerable.",
      "The limitation is that referrals cannot be turned up. If you need more work in six weeks, referrals are not the lever, which is exactly why the first row of that table matters.",
    ]},

    { type: "h2", id: "own-site", text: "Your own site, honestly assessed" },
    { type: "prose", text: [
      "Worth doing and worth being realistic about the timeline. Local SEO for an agency takes six to eighteen months to produce anything, and the enquiries it produces are better than any other channel — they arrive pre-sold, having read about you and decided.",
      "Two things that actually matter and get skipped. **Be findable for your own city**, since a business checking whether you are real is the most common use of your site. And **publish the work**, because three case studies for businesses in one trade is the credential that closes the fourth one in that trade.",
      "The thing not to do is rebuild it repeatedly. It is the most satisfying available form of not prospecting.",
    ]},

    { type: "h2", id: "mix", text: "The mix that works" },
    { type: "prose", text: [
      "Not one channel. A working local agency runs roughly this shape:",
    ]},
    { type: "checklist", items: [
      { title: "Outbound as the base", detail: "Two prospecting afternoons a week, regardless of workload. This is the only volume you control and it is what removes the panic months." },
      { title: "Referrals as the multiplier", detail: "One specific ask per completed project, at handover. Costs nothing and compounds." },
      { title: "Your own site as the closer", detail: "Not a lead source for the first year. It is what a prospect checks after meeting you." },
      { title: "Everything else as opportunistic", detail: "Take marketplace and directory work when it arrives; do not build the business on it." },
    ]},

    { type: "leads", city: "gurgaon", heading: "The channel you control" },

    { type: "cta", variant: "map", title: "The one channel you can turn up.",
      detail: "Businesses with no website in your city — the only source where more effort reliably means more conversations.",
      action: "Start there", href: "/login" },
  ],
  faqs: [
    { q: "Where do web design agencies actually find clients?", a: "Outbound to local businesses with no website is the only channel where you control volume — where deciding to have twenty more conversations this week actually produces them. Referrals, your own site, marketplaces and directories all work, and none of them can be turned up on demand." },
    { q: "Are Upwork and Fiverr worth using?", a: "As a separate business line, not as a starting point for a local one. You compete against global supply for buyers comparing on price, produce clients with no local connection, and generate no referrals in the market you live in." },
    { q: "How do I get more referrals?", a: "Ask specifically, at handover, naming a type of person. \"Do you know anyone else on this street who'd want this?\" outperforms \"let me know if you hear of anyone\" because the first one is answerable — and local businesses are unusually good referrers." },
    { q: "How long does local SEO take to bring in clients?", a: "Six to eighteen months. The enquiries are the best of any channel because they arrive pre-sold, but it is not a lever for needing work in six weeks, and rebuilding your own site repeatedly is the most satisfying form of not prospecting." },
    { q: "What channel mix should a small agency run?", a: "Outbound as the base with two fixed prospecting afternoons a week, one specific referral ask per completed project, your own site as the thing prospects check after meeting you, and marketplace or directory work taken opportunistically rather than built on." },
  ],
  links: [["/resources/how-to-find-businesses-that-need-a-website", "the channel you control"], ["/resources/building-a-weekly-prospecting-routine", "making the base consistent"], ["/resources/your-first-10-web-design-clients", "the sequence from zero"], ["/resources/how-to-start-a-web-design-agency-in-india", "starting out"]],
},

/* ───────────────────────────── 2 · dev vs design */
{
  slug: "how-to-find-clients-for-web-development",
  title: "How to Find Clients for Web Development (Not Web Design)",
  excerpt: "The buyer is different, the trigger is different, and almost none of the local no-website market is development work. Where the functionality projects actually come from.",
  meta: "How to find clients for web development rather than web design: why the buyer differs, what triggers the project, and where functionality work comes from.",
  category: "Lead Generation", cluster: "playbooks", hero: "network", mins: 9,
  tags: ["Prospecting", "Agency Playbook", "Comparisons"],
  body: [
    { type: "prose", text: [
      "Web development clients come from a different place than web design clients, and the distinction matters more for prospecting than it does for the work.",
      "Everything written about the difference is career content — what a designer does versus what a developer does, and what each earns. The commercial version is more useful: **a design client is buying a presence, and a development client is buying a function.** Those are different people, reached differently.",
    ]},

    { type: "h2", id: "buyer", text: "The two buyers" },
    { type: "table", head: ["", "Design client", "Development client"], rows: [
      ["What they buy", "A presence", "A function that works"],
      ["Trigger", "Not being findable", "A process that is breaking"],
      ["Typical prospect", "Business with no website", "Business with a website and a problem"],
      ["How they choose", "Evidence of similar work", "Evidence you can be trusted with something that runs"],
      ["Where they are found", "Map listings", "Referrals, and their existing site"],
      ["Ticket", "Smaller, faster", "Larger, slower"],
    ]},
    { type: "prose", text: [
      "The row that reorganises everything: **a development client almost always already has a website.** Which means the entire no-website prospecting method — the core of this corpus — is a design-work method, and applying it to development work produces the wrong prospects.",
    ]},

    { type: "h2", id: "trigger", text: "Development work has a trigger" },
    { type: "prose", text: [
      "Design work is bought when somebody decides they should be findable, which can happen at any time and often does not. Development work is bought when **a process breaks**, and the break is usually visible from outside if you know what to look for.",
      "A restaurant taking bookings through a WhatsApp number that now gets ninety messages a day. A coaching institute collecting admission forms on paper because the enquiry volume outgrew a spreadsheet. A wholesaler whose rate list is a PDF being emailed by hand. A retailer taking orders on Instagram DMs and losing track.",
      "Every one of those is a business that outgrew a manual process. **They are not looking for a website — they are looking for the pain to stop**, and they frequently do not know that what they need is software.",
      "So the prospecting question is different. Not \"who has no website\" but \"who is doing something by hand that has clearly got too big\", and that is visible in review counts, in queue photographs, in what people complain about in reviews, and in what the business posts about.",
    ]},

    { type: "h2", id: "where", text: "Where development clients come from" },
    { type: "prose", text: [
      "In rough order of how much work each produces for a small agency.",
      "**Existing design clients, later.** The most reliable source by a distance. A business you built a site for in year one comes back in year two wanting bookings, a catalogue, a login. You already have the trust, you already know the business, and there is no competition. This is the strongest argument for care plans that has nothing to do with the monthly fee.",
      "**Referrals from other developers.** Agencies turn down work constantly — the wrong stack, too small, badly timed. A relationship with two or three other shops produces steadier development work than any outbound campaign, and it costs nothing but being reachable and not stealing their clients.",
      "**Businesses whose current site visibly cannot do something.** A restaurant with a menu PDF and no ordering, a clinic with no appointment booking, a supplier with no enquiry routing. These are findable and the gap is demonstrable, which makes for a much stronger approach than a general offer.",
      "**Failed projects.** Uncomfortable and real. A meaningful share of development work is finishing or rescuing something somebody else started, and those businesses are actively looking. They are also cautious, slow to commit and worth being careful with — ask what happened before quoting anything.",
    ]},

    { type: "h2", id: "qualify", text: "Qualifying a development prospect" },
    { type: "prose", text: [
      "Harder than for design, because the scope is genuinely unknown at the start and the failure mode is expensive rather than merely disappointing.",
      "**Is the process actually breaking, or is somebody bored?** \"It would be nice to have an app\" is not a project. \"We lose two orders a week in WhatsApp\" is one, and the difference is whether there is a countable cost.",
      "**Who maintains it afterwards?** Development work does not finish at launch. A business with nobody technical and no maintenance budget will have a broken system in eight months and will remember whose fault it is.",
      "**What does it integrate with?** The answer determines whether this is a two-week project or a three-month one, and the client usually does not know that their existing billing software is the deciding factor.",
      "**Have they done this before?** A business commissioning software for the first time needs a much smaller first project than they will ask for. Building the smallest useful thing first is not upselling in reverse — it is the only way a first software project ends well.",
    ]},

    { type: "h2", id: "both", text: "If you do both" },
    { type: "prose", text: [
      "Most small agencies do, and the sensible arrangement is a sequence rather than a split.",
      "**Prospect for design work**, because it is the only side where you can generate volume on demand, and because the no-website market is large and reachable. Then **let development work arrive from that base** — from the clients you built for, as their businesses grow into needing more.",
      "The reverse — prospecting for development work cold — is slow, because the trigger is an event you cannot cause and cannot predict. Waiting for a process to break at a business you have never met is not a pipeline.",
    ]},

    { type: "leads", city: "pune", heading: "Where the design base comes from" },

    { type: "cta", variant: "map", title: "Build the base first.",
      detail: "Design work is the side you can generate on demand — and it is where development clients come from later.",
      action: "Find design work", href: "/login" },
  ],
  faqs: [
    { q: "How do I find web development clients rather than design clients?", a: "Mostly from existing design clients a year or two later, from other developers passing on work they turned down, and from businesses whose current site visibly cannot do something. A development client almost always already has a website." },
    { q: "Why doesn't no-website prospecting work for development?", a: "Because a development client already has a site. The no-website method finds businesses buying a presence; development work is bought when a manual process breaks, which is a different trigger at a different kind of business." },
    { q: "What triggers a web development project?", a: "A process that outgrew being done by hand — bookings through a WhatsApp number getting ninety messages a day, admission forms on paper, a rate list emailed manually. The business is not looking for a website, it is looking for the pain to stop." },
    { q: "How do I qualify a development prospect?", a: "Ask whether the process is genuinely breaking with a countable cost, who maintains it after launch, what it has to integrate with, and whether they have commissioned software before. First-time buyers need a much smaller first project than they will ask for." },
    { q: "Should I prospect for design or development work?", a: "Prospect for design, because it is the only side where you can generate volume on demand, and let development arrive from that base as those clients grow. Prospecting cold for development means waiting for an event you cannot cause." },
  ],
  links: [["/resources/where-to-find-web-design-clients", "the channels, ranked"], ["/resources/how-to-sell-maintenance-plans-after-the-build", "how the base stays warm"], ["/resources/the-lifetime-value-of-one-local-client", "what a client is worth over years"], ["/resources/how-to-price-a-website-redesign", "pricing work on an existing site"]],
},

/* ───────────────────────────── 3 · the opening line */
{
  slug: "what-to-say-to-a-business-with-no-website",
  title: "What to Say to a Business That Has No Website at All",
  excerpt: "The first sentence decides the next two minutes. Why the standard opener fails here, the one that works, and the phrasing that sounds like an accusation without meaning to.",
  meta: "What to say to a business with no website: the opening line that works, why the standard cold-call opener fails, and the phrasing to avoid.",
  category: "Outreach", cluster: "operations", hero: "network", mins: 8,
  tags: ["Outreach", "Objection Handling", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Open with something you noticed about their business, not with what they are missing. **\"You've got four hundred reviews and no website — is that on purpose?\"** works far better than any version of \"I noticed you don't have a website\", and the difference is not politeness.",
      "The standard structure taught for cold openers — name, company, relevance, permission — is built for a phone call to somebody with a job title. Standing in a shop it sounds like a script, and the shop owner has heard four of them this month.",
    ]},

    { type: "h2", id: "why-fails", text: "Why \"you have no website\" fails as an opener" },
    { type: "prose", text: [
      "\"I noticed you don't have a website\" is the natural thing to say and it does three unhelpful things in six words.",
      "**It opens with a deficiency.** The first thing you have said about somebody's business is what is wrong with it, to a person who has usually built it over a decade.",
      "**It is a claim they may be able to refute.** If there is a Facebook page, a directory listing, or a site you did not find, you have opened by being wrong. That ends conversations faster than anything else.",
      "**It identifies you instantly.** By the second half of that sentence they know exactly what you are selling and have prepared a no.",
      "The alternative works because it opens with something true and flattering — the reviews — and puts the gap in the same breath as evidence that the business is succeeding. And it ends in a genuine question rather than a pitch.",
    ]},

    { type: "h2", id: "openers", text: "What to say instead: openers that work" },
    { type: "table", head: ["Situation", "Opening"], rows: [
      ["High review count, no site", "\"You've got 400 reviews and no website — is that on purpose?\""],
      ["Dead domain in the listing", "\"Your site's been down since last year — did you know?\""],
      ["Facebook page only", "\"Is the Facebook page the main thing, or do you have somewhere else?\""],
      ["Busy shop, owner distracted", "\"I'll be two minutes — can I ask you one thing about how customers find you?\""],
      ["Referred by another business", "\"[Name] at [shop] said I should talk to you.\""],
    ]},
    { type: "prose", text: [
      "The last one is worth more than the other four combined and is the whole reason to ask every client for one specific introduction.",
      "Notice that three of the five end in a question. The job of an opening line is to earn the next question, not to deliver a pitch — and a question is much harder to say no to than a statement.",
    ]},

    { type: "h2", id: "phrasing", text: "The phrasing that sounds like an accusation" },
    { type: "prose", text: [
      "Several natural-sounding phrases carry a judgement the speaker did not intend, and they are worth removing deliberately because you will not hear it in your own voice.",
      "**\"You're losing customers.\"** Told to someone whose shop is full, it is both unwelcome and unproven. They will ask how you know, and you cannot answer.",
      "**\"Every business needs a website these days.\"** This says they are behind. For an owner who has traded successfully for fifteen years, it invites a correct and irritated response.",
      "**\"Don't you want to grow?\"** Pushes them into defending their ambition, which is not a conversation you can win.",
      "**\"It's cheaper than you think.\"** Introduces price before value and implies they were worried about affording it, which some will hear as a comment about their business.",
      "The general rule: **describe what you observed, ask what they think, and let them name the problem.** Anything that tells an owner something is wrong with their business puts you on the losing side of a conversation about their own trade.",
    ]},

    { type: "h2", id: "walking", text: "Opening in person versus on the phone" },
    { type: "prose", text: [
      "Two pieces of standard cold-call advice reverse when you are physically in the shop, and getting them the wrong way round is common.",
      "**Never apologise for calling** is correct on the phone and wrong at a counter. \"Sorry, I know you're busy\" on a call sounds weak; said to somebody actually serving a customer it is simply true, and acknowledging it buys you the two minutes. The distinction is that on the phone you are apologising for existing, and in person you are acknowledging something visible to both of you.",
      "**Permission-based openers damage credibility** — \"is now a bad time?\" — again holds on the phone and not in person. In a shop, asking whether now is a good moment is what a person from the same city would do, and refusing to ask marks you as somebody running a script.",
      "The underlying reason both flip: on a call you are an unknown voice with no context, so hesitancy reads as weakness. Standing in front of somebody, you are visibly a person in their shop, and the social rules of being in somebody's shop apply instead of the rules of a sales call.",
    ]},

    { type: "h2", id: "second", text: "The second sentence matters more" },
    { type: "prose", text: [
      "Openers get all the attention and the second line does more work, because that is where you either become specific or become a salesperson.",
      "The strongest second line is a question about their business rather than a statement about yours: **\"How do most of your customers find you at the moment?\"** It is genuine, owners enjoy answering it, and every possible answer tells you which conversation you are in.",
      "The weakest second line is any version of what you do. \"We build websites for local businesses starting at ₹15,000\" answers a question nobody asked and moves the conversation to price before there is any reason to want the thing being priced.",
    ]},
    { type: "steps", items: [
      { title: "Open with what you noticed", icon: "search", detail: "Their reviews, their dead domain, their Facebook page. True, specific, and not a deficiency." },
      { title: "Ask how customers find them", icon: "phone", detail: "The most useful question available. Owners answer it warmly and it sorts the call." },
      { title: "Name one transaction they lose", icon: "signal", detail: "The cake order, the contractor at 10pm, the parent comparing three academies. Theirs, not a general benefit." },
      { title: "Ask what it is worth", icon: "score", detail: "They will tell you, and that number sets the price before you quote." },
    ]},

    { type: "leads", city: "faridabad", heading: "Businesses to open with" },

    { type: "cta", variant: "map", title: "Know something before you speak.",
      detail: "Review counts and ratings on businesses with no website — the openers write themselves from the listing.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "What should I say to a business with no website?", a: "Open with something you noticed rather than what they lack. \"You've got four hundred reviews and no website — is that on purpose?\" opens with evidence they are succeeding, puts the gap in the same breath, and ends in a real question." },
    { q: "Why is \"I noticed you don't have a website\" a bad opener?", a: "It opens with a deficiency, it is a claim they may refute if there is a Facebook page or a site you missed, and it identifies what you are selling by the second half of the sentence, so they have a no ready before you finish." },
    { q: "What phrases should I avoid?", a: "\"You're losing customers\" is unproven and unwelcome. \"Every business needs a website these days\" says they are behind. \"Don't you want to grow?\" pushes them to defend their ambition. \"It's cheaper than you think\" introduces price before value." },
    { q: "What is the best second line?", a: "\"How do most of your customers find you at the moment?\" It is a genuine question owners enjoy answering, and every possible answer tells you which conversation you are in. The weakest second line is any description of what you do." },
    { q: "Does the standard cold-call opener structure work here?", a: "Not well. Name, company, relevance, permission is built for a phone call to somebody with a job title. Standing in a shop it sounds like a script, and the owner has heard four of them this month." },
  ],
  links: [["/resources/cold-call-script-selling-websites-local-businesses", "the full script"], ["/resources/the-first-call-10-questions-that-qualify-a-lead", "the questions that follow"], ["/resources/handling-we-dont-need-a-website", "the objection this produces"], ["/resources/selling-in-hindi-what-changes-in-a-sales-call", "the same opener in Hindi"]],
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
