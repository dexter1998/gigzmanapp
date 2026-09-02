/**
 * Batch 8 — the invisible prospect, the channel decision, and the hardest objection.
 *
 * SERP checks first:
 *  · "Facebook page vs website" is a settled genre written entirely for the business owner —
 *    AIOSEO, SumyDesigns, GetResponse, LabDigital, PSWebsiteDesign all argue the same case to the
 *    same reader. The agency-facing version ("these are your best prospects, and here is why your
 *    filter cannot see them") is written by nobody except the lead-gen tools themselves.
 *    Deliberately carries no invented share figure: our enrichment table does not hold enough
 *    resolved website URLs to publish one, so the post argues the mechanism instead.
 *  · Channel comparison: page one is WhatsApp-automation vendors — Cognism, BotPenguin, SmartReach,
 *    SquadStack, Kraya. Two facts worth keeping: Indian teams report reply rates above 4%, and
 *    Meta has been tightening on cold outreach. Walk-in is not discussed on any page one result,
 *    which for Indian local business is the omission that matters.
 *  · "We don't need a website" is thin listicle territory (SiteSwan, autosyst, pixellab) leaning on
 *    a US restaurant-association statistic. None of it entertains the possibility that the owner is
 *    right, which for a real share of these businesses they are.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · facebook-only */
{
  slug: "why-facebook-only-businesses-are-your-best-prospects",
  title: "Why Facebook-Only Businesses Are Your Best Prospects",
  excerpt: "They are pre-qualified, they have already made the decision you are selling, and almost nobody is calling them — because the standard filter reports them as having a website.",
  meta: "Why Facebook-only businesses are the best web design prospects: pre-qualified, under-contacted, and invisible to every no-website filter you can run.",
  category: "Lead Generation", cluster: "playbooks", hero: "nearby", mins: 8,
  tags: ["Prospecting", "Objection Handling", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "The best prospects for a first website are usually not the businesses with nothing at all. They are the ones running entirely on a Facebook page — and the reason almost nobody is calling them is a quirk of how the data works rather than anything about the businesses themselves.",
      "Everything written about this is aimed at the owner: Facebook page versus website, which is better, seven reasons a page is not enough. Useful for them. What follows is the other side of it.",
    ]},

    { type: "h2", id: "invisible", text: "Why your filter cannot see these businesses" },
    { type: "prose", text: [
      "A Google business listing has one website field, and the owner puts whatever they consider their web presence into it. For a large number of small businesses that is a facebook.com URL.",
      "Which means, to every tool in this category including ours, **that business has a website.** It does not appear when you filter for businesses with no site. Neither does a business pointing at an Instagram profile, a Linktree, a Justdial page or a WhatsApp link.",
      "So there is a whole population sitting inside the \"already has a website\" bucket that has nothing of the sort, and it goes uncontacted precisely because everyone is working from the same filter. Our own headline gap figure of {{pct}} across {{checked}} businesses counts every one of them as served — which is why we describe that number as conservative rather than generous.",
    ]},
    { type: "tip", title: "The check that surfaces them",
      text: "Do not filter for an empty website field — read what is in it. A facebook.com or instagram.com URL on a business listing is a stronger lead than a blank, and it is sitting in the pile everyone else has already discarded." },

    { type: "h2", id: "pre-qualified", text: "They have already made the decision" },
    { type: "prose", text: [
      "This is the part that changes the sales conversation completely.",
      "A business with nothing at all has never decided it needs a web presence. Before you can sell anything you have to win that argument, and it is a slow one — the owner has run this shop for eleven years without a website and can point at the till as evidence.",
      "A business on a Facebook page has already had that argument with itself and concluded yes. Somebody set up the page, somebody posts to it, somebody replies to messages on it. **The question of whether they need somewhere to send people is settled.** What is left is a much smaller question: whether the place they send them should be one they own.",
      "That is a fifteen-minute conversation instead of a three-visit one.",
    ]},

    { type: "h2", id: "argument", text: "The argument that actually lands" },
    { type: "prose", text: [
      "Not reach, and not professionalism. Both are true and both sound like a sales pitch, because the owner has heard them.",
      "The one that works is **ownership**, told concretely rather than abstractly. Their page can be restricted, mistakenly flagged, or lost with the phone number of whoever created it — and every review, photo and customer message goes with it. Ask who set the page up. A surprising number of owners discover, in that moment, that it is a former employee or a relative they no longer speak to.",
      "The second one is search. A customer searching for their business by name will usually find the page; a customer searching for what they *do* will find whoever has a site. That is a specific, checkable loss, and you can check it in front of them.",
    ]},
    { type: "table", head: ["Argument", "How it lands"], rows: [
      ["\"You don't own it\"", "Strong — especially once they recall who set it up"],
      ["\"You won't rank for what you do\"", "Strong — demonstrable on their own phone"],
      ["\"It looks unprofessional\"", "Weak — it does not, and they know their customers"],
      ["\"Facebook is dying\"", "Weak — untrue in the markets they sell in"],
    ]},

    { type: "h2", id: "find", text: "How to find them" },
    { type: "prose", text: [
      "Two routes, and they surface different businesses.",
      "**Read the website field rather than filtering on it.** Pull the businesses in a category and look at what is actually in the URL. Anything on facebook.com, instagram.com, a link-in-bio service, a directory profile or a free builder subdomain belongs on this list rather than the discarded pile.",
      "**Search operators.** A `site:facebook.com` search alongside a category and a city surfaces pages that may not be on a Maps listing at all. You get a page rather than a business record — no phone number, no rating — so it is a slower route, but it reaches businesses the map does not.",
    ]},
    { type: "checklist", items: [
      { title: "facebook.com or instagram.com", detail: "The core group. Pre-qualified, under-contacted, and reachable through the page itself." },
      { title: "Link-in-bio services", detail: "Linktree and similar. The owner has already paid for a stopgap, which tells you the budget exists." },
      { title: "Directory profiles", detail: "Justdial, IndiaMART, Yelp. Harder — a paid listing often makes the owner feel the question is answered." },
      { title: "Free builder subdomains", detail: "A site that was started and abandoned. Check whether it still loads before you say anything." },
    ]},

    { type: "h2", id: "care", text: "Where the money actually is here" },
    { type: "prose", text: [
      "One thing worth planning for: this group buys the care plan more readily than any other.",
      "A business that already posts to a page has an established habit of publishing. It expects its web presence to change — new photos, new offers, new prices — because that is what a Facebook page has trained it to expect. Sell a static site to that owner and they will be disappointed within a month, for reasons neither of you named up front.",
      "So quote the build and the monthly together from the first conversation. It is easier to sell here than anywhere else, and the alternative is a client who feels the site went quiet.",
    ]},

    { type: "leads", city: "surat", heading: "Businesses to check the website field on" },

    { type: "cta", variant: "map", title: "Look in the discarded pile.",
      detail: "Search a category and read the website field — the social-only listings are the ones nobody else called.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "Why are Facebook-only businesses good web design prospects?", a: "Because they have already decided they need a web presence — somebody set the page up and posts to it. You are not arguing whether they need one, only whether it should be a page they own, which is a far shorter conversation." },
    { q: "Why don't Facebook-only businesses show up in no-website searches?", a: "Because the owner put the Facebook URL in their Google listing's website field, so every tool reads that business as having a website. They sit inside the served bucket and go uncontacted because everyone is working from the same filter." },
    { q: "How do I find businesses that only have a Facebook page?", a: "Read the website field instead of filtering for an empty one — anything on facebook.com, instagram.com, a link-in-bio service or a directory profile qualifies. A site:facebook.com search with a category and city also surfaces pages that are not on a Maps listing." },
    { q: "What is the best argument against using a Facebook page as a website?", a: "Ownership, told concretely. The page can be restricted or lost with the account of whoever created it, and the reviews and messages go with it. Ask who set it up — owners often realise in that moment it was a former employee or an estranged relative." },
    { q: "Should I sell these clients a care plan?", a: "Yes, and quote it from the first conversation. A business that posts to a page expects its web presence to change, so a static site disappoints them within a month. This group buys a monthly plan more readily than any other." },
  ],
  links: [["/resources/we-already-have-a-facebook-page-objection", "handling the objection version of this"], ["/resources/qualifying-a-local-lead-before-you-call", "reading the website field properly"], ["/resources/website-maintenance-plans-what-to-charge", "pricing the care plan"], ["/resources/free-ways-to-find-businesses-without-websites", "the search-operator route"]],
},

/* ───────────────────────────── 2 · channel choice */
{
  slug: "call-whatsapp-or-walk-in-indian-smbs",
  title: "Call, WhatsApp or Walk In: What Works for Indian SMBs",
  excerpt: "Three channels, three completely different response rates, and one of them is missing from every guide on the subject — because it does not scale and it works anyway.",
  meta: "Call, WhatsApp or walk in: which outreach channel works for Indian small businesses, how to pick by vertical and time of day, and the risk in cold WhatsApp.",
  category: "Outreach", cluster: "operations", hero: "network", mins: 9,
  tags: ["Outreach", "India", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "For Indian small businesses the honest ranking is walk in, then WhatsApp, then call — and it inverts completely depending on the vertical and the hour, which is the part that decides whether any of it works.",
      "Every guide written for Indian SMBs compares calling to messaging and stops there, because those are the two channels software can sell you. Walking in appears on none of them. It also has the highest hit rate of the three for most of the categories worth prospecting, so it is worth being clear-eyed about why the published advice omits it.",
    ]},

    { type: "h2", id: "phone", text: "The problem with the phone number" },
    { type: "prose", text: [
      "The number on a local business listing is rarely the owner's. It rings at a counter, a reception desk or a workshop, and it is answered by whoever is nearest and least busy — which is precisely the person with no authority and no interest.",
      "That is the real reason cold calling underperforms here, and it is not a script problem. You can have the best opening in the world and still spend three minutes being handed to nobody.",
      "Calls do work in two situations: when the business is small enough that the owner *is* the person answering, and when you are calling back somebody who already messaged you. A first touch on a listed number in a busy trade is usually the weakest of the three options.",
    ]},

    { type: "h2", id: "whatsapp", text: "WhatsApp: high reply rate, real risk" },
    { type: "prose", text: [
      "The reply rates are genuinely good — Indian teams doing this report figures above 4%, which beats cold email in this market by a wide margin. The message sits there until the evening, when the owner reads it properly rather than while serving somebody.",
      "The risk needs stating plainly, because the vendor content skips it. **Cold WhatsApp outreach is against Meta's policies and they have been tightening on it.** Sending unsolicited messages at volume from a business number gets the number restricted or banned, and if that number is also how your existing clients reach you, that is a genuinely bad day.",
      "So the workable version is: low volume, personal, from a number you can afford to lose, and never templated at scale. Two or three touchpoints a week is the pacing that does not read as bulk.",
    ]},
    { type: "table", head: ["", "Walk in", "WhatsApp", "Call"], rows: [
      ["Reaches the owner", "Usually", "Often", "Rarely"],
      ["Cost per attempt", "High (time)", "Low", "Low"],
      ["Scales", "No", "Somewhat", "Yes"],
      ["Platform risk", "None", "Real — account bans", "None"],
      ["Can show evidence", "Yes — on their screen", "Yes — screenshot", "No"],
    ]},
    { type: "prose", text: [
      "That last row decides more than it looks. The pitch in this business is evidential — you are showing someone that a competitor is findable and they are not. On a call you can only assert it. In person, you hand them your phone.",
    ]},

    { type: "h2", id: "vertical", text: "It changes completely by vertical" },
    { type: "prose", text: [
      "Which channel wins is a property of the business type, not of the channel. This is the table worth keeping:",
    ]},
    { type: "table", head: ["Vertical", "Best channel", "When"], rows: [
      ["Hardware and trade", "Walk in", "2pm–4pm, between the morning and closing rush"],
      ["Restaurants and cafes", "Walk in", "3pm–5pm, never during a meal service"],
      ["Boutiques and tailors", "Walk in", "Weekday mornings, before fittings start"],
      ["Coaching and academies", "Call", "6–8 weeks before an admission window"],
      ["Clinics and services", "WhatsApp", "Evening, after the last appointment"],
      ["Wholesalers", "Call", "Morning, before dispatch"],
    ], note: "Timing matters as much as the channel. The right message in the wrong hour reads as an interruption." },
    { type: "prose", text: [
      "The pattern underneath it: **counter businesses reward walking in, appointment businesses reward messaging.** If the owner is standing behind something all day, go and stand in front of it. If the owner's day is a schedule, leave something they read between items on it.",
    ]},

    { type: "h2", id: "walkin", text: "Why walking in works, and what it costs" },
    { type: "prose", text: [
      "It works for three reasons that no channel can copy. You reach the owner rather than whoever answers. You can show them something on a screen. And you are visibly a person from the same city rather than a number they do not recognise, which in this market is most of the trust problem solved before you speak.",
      "The cost is that it does not scale, and pretending otherwise wastes a week. Six to ten businesses in an afternoon is realistic if they are clustered on one street; four if you are driving between them. That is the whole reason to keep a territory tight and to keep any market street assigned to one person.",
    ]},
    { type: "steps", items: [
      { title: "Cluster before you leave", icon: "map", detail: "Pick one street or market with eight or more prospects on it. Walking between two businesses on opposite sides of a city is the single biggest waste of a prospecting afternoon." },
      { title: "Bring one printed thing", icon: "signal", detail: "A screenshot of a competitor of theirs who is findable. Paper survives a conversation at a counter better than a phone you have to keep unlocking." },
      { title: "Ask for two minutes, and take two", icon: "clock", detail: "Leaving on time when they are busy is what gets you the second conversation. Overstaying is what makes the second visit awkward." },
      { title: "Follow up on WhatsApp the same evening", icon: "send", detail: "Now it is a warm message to someone who has met you, which is a different channel entirely from a cold one — and carries none of the same risk." },
    ]},

    { type: "h2", id: "sequence", text: "The sequence that uses all three" },
    { type: "prose", text: [
      "None of these is a strategy on its own. The version that works is ordered:",
      "**Walk in first**, for anything clustered and counter-based. **Message the same evening**, referencing the visit, which converts the strongest channel's reach into the most convenient one's follow-up. **Call only to close**, or to reach the verticals where the owner sits at a desk with a diary.",
      "The mistake is running them in the opposite order — a cold call, then a cold message, then a visit to a business that has already declined you twice.",
    ]},

    { type: "leads", city: "surat", heading: "Businesses clustered close enough to walk" },

    { type: "cta", variant: "map", title: "Plan the afternoon, not the list.",
      detail: "Find prospects clustered in one area so a walk-in round is eight businesses instead of three.",
      action: "Search by area", href: "/login" },
  ],
  faqs: [
    { q: "What is the best way to contact Indian small businesses for web design?", a: "Walking in, for anything counter-based — hardware, restaurants, boutiques — because the listed phone number rarely reaches the owner. WhatsApp works well for appointment businesses, and calls work best for coaching institutes and wholesalers where the owner sits at a desk." },
    { q: "Is cold WhatsApp outreach safe?", a: "Not at volume. It is against Meta's policies and they have been tightening — bulk unsolicited messaging gets numbers restricted or banned. Keep it low volume and personal, from a number you can afford to lose, and never from the number your existing clients use." },
    { q: "Why does cold calling work badly for local businesses?", a: "Because the number on the listing rings at a counter or reception and is answered by whoever is nearest, who has no authority to buy. It is not a script problem. Calls work when the business is small enough that the owner answers, or when you are calling someone back." },
    { q: "How many businesses can I visit in an afternoon?", a: "Six to ten if they are clustered on one street or market, four if you are driving between them. That difference is the entire argument for keeping territories tight and assigning any market street to one person." },
    { q: "What should I do after a walk-in visit?", a: "Message them on WhatsApp the same evening, referencing the visit. That is a warm message to somebody who has met you, which converts the highest-reach channel into the most convenient follow-up and carries none of the risk of cold messaging." },
  ],
  links: [["/resources/whatsapp-outreach-local-business-india", "the WhatsApp scripts themselves"], ["/resources/cold-call-script-selling-websites-local-businesses", "the call script"], ["/resources/territory-planning-splitting-a-city-between-reps", "clustering a territory to walk it"], ["/resources/how-to-sell-websites-to-hardware-stores", "a vertical where walking in wins"]],
},

/* ───────────────────────────── 3 · the hardest objection */
{
  slug: "handling-we-dont-need-a-website",
  title: "How to Handle \"We Don't Need a Website\" on a Cold Call",
  excerpt: "Sometimes they are right, and the guides that pretend otherwise are why this objection is so hard to answer. Three reasons it gets said, and what each one needs.",
  meta: "How to handle \"we don't need a website\": the three reasons owners say it, which one you can answer, and how to tell when the objection is simply correct.",
  category: "Outreach", cluster: "operations", hero: "network", mins: 8,
  tags: ["Objection Handling", "Outreach", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "\"We don't need a website\" is the hardest objection in this business, and the reason is uncomfortable: for a meaningful share of the businesses saying it, it is true.",
      "Every guide on this treats it as a misunderstanding to be corrected, usually with a statistic about how many people research on their phones. On a cold call that approach fails immediately, because the owner is not confused about their own business. Three different things get said in those five words, and only one of them is worth answering.",
    ]},

    { type: "h2", id: "three", text: "Three objections, one sentence" },
    { type: "table", head: ["What it means", "How you can tell", "Worth pursuing"], rows: [
      ["\"I don't see where it pays\"", "They ask a follow-up question", "Yes — this is the real one"],
      ["\"I am busy and you are a salesperson\"", "Said in the first ten seconds, flat", "Sometimes — wrong moment, not wrong business"],
      ["\"My customers genuinely do not look\"", "They explain how they get customers", "No — and they are often correct"],
    ]},
    { type: "prose", text: [
      "The third row is the one nobody writes about. A supplier whose entire trade comes from three contractor accounts and a wholesale relationship does not have a discoverability problem. Neither does a shop whose customers are the four hundred people living on that street. Arguing with them is how you become the person who does not listen.",
    ]},

    { type: "h2", id: "diagnose", text: "The question that separates them" },
    { type: "prose", text: [
      "Do not counter. Ask: **\"That's fair — how do most of your customers find you at the moment?\"**",
      "It is a genuine question, it is not adversarial, and almost everybody answers it because owners like explaining their business. The answer sorts the call for you.",
      "\"Word of mouth, mostly regulars\" — likely genuine, and you are probably not going to sell here. \"People just walk past\" — footfall business, weak case, unless the ticket is high. \"They call, or they find us on Google\" — **they have just told you they are already being searched for**, and that is the whole conversation.",
      "That last answer is more common than the objection suggests, because owners think of their Maps listing as \"being on Google\" without distinguishing it from anything else.",
    ]},

    { type: "h2", id: "answer", text: "How to handle the one that is answerable" },
    { type: "prose", text: [
      "When the objection is really \"I don't see where it pays\", stop selling a website and name a single transaction they are currently losing. Specific beats general every time here, and it has to be a transaction they recognise.",
      "For a bakery: the custom cake order that goes to whoever replied first. For a hardware supplier: the contractor checking stock at 10pm who calls someone else. For a coaching institute: the parent comparing three places and finding two. For a boutique: the bride who wanted to see twenty previous pieces before choosing.",
      "Then let them do the arithmetic. Ask what one of those is worth, and ask how many they think they miss in a month. Whatever they say is now their own number rather than your claim, and it is the number you are quoting against.",
    ]},
    { type: "quote", text: "You are not selling a website. You are naming one sale a month they can already feel themselves losing.", attribution: "The whole method" },

    { type: "h2", id: "wrong-moment", text: "When it is the moment, not the business" },
    { type: "prose", text: [
      "A flat refusal in the first ten seconds is usually about the interruption. The business may be a perfectly good prospect and you have arrived during a rush, mid-dispatch, or thirty seconds after a supplier called them about a payment.",
      "The only useful response is to leave properly. Name a time and go: \"Understood — I'll come back Thursday afternoon.\" Then actually come back on Thursday afternoon. In a local market that single behaviour separates you from everybody else who has ever pitched them, and the second conversation frequently opens with them apologising for the first.",
      "What does not work is pushing for thirty more seconds. It converts a timing problem into a permanent no.",
    ]},

    { type: "h2", id: "walk", text: "Agreeing with them, and what it earns" },
    { type: "prose", text: [
      "When the objection is genuine, say so and leave cleanly. Not as a technique — actually mean it.",
      "Some businesses in our own index make this obvious. Convenience stores average eleven reviews and a {{pct}}-adjacent gap; the reason half of them have no website is not neglect, it is that nobody researches a convenience store. The same is true of an alterations counter doing ₹300 hems. Selling either one a website is a refund waiting to happen and a bad review in a market where everybody talks.",
      "\"Honestly, I don't think it's worth it for you — if you ever start doing custom orders, that changes.\" That sentence costs nothing and does two things: it ends the call without damage, and it plants the one condition under which they should call you. Owners remember the person who told them not to buy something.",
      "And if you are hearing the genuine version often, the problem is upstream. Businesses that truly do not need a website are usually identifiable before the call — thin review counts, low ratings, categories that live on proximity alone.",
    ]},

    { type: "leads", city: "kota", heading: "Businesses where the objection is weakest" },

    { type: "cta", variant: "map", title: "Fewer conversations you cannot win.",
      detail: "Filter by category, review count and rating so the businesses you call are the ones with something to gain.",
      action: "Build a better list", href: "/login" },
  ],
  faqs: [
    { q: "How do I respond to \"we don't need a website\"?", a: "Do not counter it. Ask how their customers currently find them — it is a genuine question owners like answering, and the reply tells you whether the objection is about payoff, about timing, or simply correct." },
    { q: "What if the business genuinely does not need a website?", a: "Say so and leave. A supplier trading on three contractor accounts, or a shop serving the street it sits on, has no discoverability problem. Naming the condition under which it would change — \"if you start taking custom orders\" — is worth more than the argument you would have lost." },
    { q: "Why do owners say they don't need a website when they clearly do?", a: "Usually because they cannot see where it pays, and sometimes because you have arrived during a rush. A flat refusal in the first ten seconds is about the interruption, not the business — name a time to return and actually return." },
    { q: "What is the strongest counter-argument?", a: "One specific transaction they are already losing: the cake order that goes to whoever replied first, the contractor checking stock at 10pm, the parent comparing three coaching centres. Then ask what one of those is worth, so the number is theirs rather than yours." },
    { q: "Should I push back when someone refuses immediately?", a: "No. Pushing for thirty more seconds converts a timing problem into a permanent no. Leaving properly and returning when you said you would is the single behaviour that separates you from everyone else who has pitched them." },
  ],
  links: [["/resources/handling-its-too-expensive-without-discounting", "the price objection"], ["/resources/we-already-have-a-facebook-page-objection", "the Facebook objection"], ["/resources/cold-call-script-selling-websites-local-businesses", "the call this comes up in"], ["/resources/qualifying-a-local-lead-before-you-call", "spotting these businesses before you dial"]],
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
