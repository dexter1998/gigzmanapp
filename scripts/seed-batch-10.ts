/**
 * Batch 10 — pricing model, getting paid, and the mockup question.
 *
 * SERP checks first:
 *  · Pricing models: every page-one result is written at US agency scale — $75–500 an hour,
 *    $5,000–150,000 projects (ManyPixels, Eleken, TheWhiteLabelAgency, Contra, Plutio). The useful
 *    imports are the risk asymmetry between hourly and fixed, the hybrid pattern of a flat core
 *    with out-of-scope billed hourly, and the reported income gap between value and hourly pricers.
 *    None of it survives contact with a ₹25,000 ticket, which is what this post is about.
 *  · Advance payment: generic freelance advice, 25–50% deposits and 50/50 splits, nothing India
 *    specific beyond one shaky legal claim this post deliberately does not repeat. The mechanics
 *    that actually matter here — UPI closing the gap between "yes" and "paid" — appear nowhere.
 *  · Free mockups: the SERP is mostly mockup asset libraries (Freepik, Canva, Mr.Mockup). The two
 *    substantive results both sell the play and neither costs it, which is the gap.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · pricing model */
{
  slug: "hourly-project-or-value-pricing-model",
  title: "Hourly, Project or Value: Which Pricing Model to Use",
  excerpt: "The published advice is written for agencies charging $150 an hour. At a ₹25,000 ticket two of the three models are actively harmful, and the third is not what it sounds like.",
  meta: "Hourly, project or value pricing for web design: why hourly caps you, why value pricing fails at small tickets, and what to use for local websites.",
  category: "Lead Generation", cluster: "playbooks", hero: "pricing", mins: 9,
  tags: ["Pricing", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "For local business websites the answer is fixed-price packages, with value used to set the number rather than to bill against it. Hourly actively works against you at this ticket size, and true value-based pricing needs a measurement you will never get from a bakery.",
      "That is not what the published guidance says, and the reason is that all of it is written for agencies charging $150 an hour on $30,000 projects. The models do not scale down cleanly, and the failure modes are different at the bottom of the market.",
    ]},

    { type: "h2", id: "hourly", text: "Why hourly is the worst fit here" },
    { type: "prose", text: [
      "The standard objection to hourly is that it penalises efficiency, and that is true. At this ticket size there are two worse problems.",
      "**The client can do the arithmetic, and the arithmetic looks bad.** Quote ₹1,500 an hour to a shop owner and they will multiply by what they imagine the job takes. They are picturing a few days of typing. You are describing twenty hours of work and they have already decided that ₹30,000 for that is too much — not because the number is wrong, but because they can now see a number they think they can judge.",
      "**It caps you at your speed.** The whole reason a first website is worth ₹30,000 to a hardware supplier is that it is the first time they are findable, not that it took twenty hours. Bill by the hour and you have priced against your own efficiency in a market where the buyer's value has nothing to do with your effort.",
      "Hourly has exactly one good use here, and it is the hybrid one: a flat fee for the defined build, with anything outside the scope billed hourly at a stated rate. That splits the risk sensibly and gives you something to point at when the requests start.",
    ]},

    { type: "h2", id: "value", text: "Value pricing, and why it does not quite work" },
    { type: "prose", text: [
      "Value-based pricing means charging against the business impact of the work. The reported income gap is real and large — freelancers pricing this way report roughly $96,000 against $58,000 for hourly billers — and it is genuinely the right model when impact can be measured.",
      "The condition is the problem. Value pricing needs a defined, measurable outcome: a conversion rate, a pipeline number, a revenue line the work moves. A bakery cannot tell you how many cake orders it lost last year, because the entire point is that those enquiries never arrived. Nobody is going to attribute anything to you afterwards either.",
      "So pure value pricing is unavailable. What you can take from it is the input rather than the mechanism: **ask what one customer is worth to them over a year, and use that to choose your number.** That is value-informed pricing, and it is the single most useful habit in this business — it is just not a billing model.",
    ]},
    { type: "table", head: ["Model", "Risk sits with", "Fails when", "Use here"], rows: [
      ["Hourly", "The client", "The client can estimate the hours", "Only for out-of-scope work"],
      ["Fixed project", "You", "Scope was never written down", "Yes — the default"],
      ["Value-based", "Shared", "Outcomes cannot be measured", "As an input, not a billing method"],
      ["Retainer", "Shared", "The work is genuinely one-off", "Yes — alongside the build"],
    ]},

    { type: "h2", id: "fixed", text: "Making fixed price safe" },
    { type: "prose", text: [
      "Fixed price moves the risk onto you, and that risk is entirely about scope. It is manageable with three things, none of which are complicated.",
      "**Write down what is included as a count.** Number of pages, number of photo rounds, number of revision rounds. Not \"a professional website\" — five pages, two revision rounds, photos supplied by you.",
      "**Name what happens outside it, in advance.** \"Anything beyond that is quoted separately\" is enough. The word \"separately\" said before the project starts is worth more than any argument after it.",
      "**Put the content deadline in writing.** The overwhelming reason these projects run long is that the business has not sent its photos and text. That is not your delay, and it needs to be on paper before it happens, or the project stays open for four months and your fixed price becomes an hourly rate you would never have accepted.",
    ]},
    { type: "checklist", items: [
      { title: "Pages, counted", detail: "Five pages, not \"a small website\"." },
      { title: "Revision rounds, counted", detail: "Two rounds. A third is quoted." },
      { title: "Content deadline", detail: "Photos and text by a date, or the timeline moves." },
      { title: "Out-of-scope rate", detail: "Stated up front so the first extra request is a quote, not an argument." },
    ]},

    { type: "h2", id: "packages", text: "Three packages beat one number" },
    { type: "prose", text: [
      "Once the model is fixed price, the remaining decision is how many prices to present, and the answer is three rather than one.",
      "A single quote is a yes-or-no question, and the easiest answer to a yes-or-no question is no. Three options change what is being decided — the prospect moves from whether to buy to which one to buy, and most of them land in the middle, which is where you wanted them.",
      "The options have to be genuinely different deliverables rather than the same site with features withheld. A one-page presence, a standard five-to-eight page site, and a full build with a catalogue or registration are three real answers to three different situations. **Padding a middle tier to make the top one look reasonable is obvious to buyers** and it costs you the trust the mockup and the walk-in earned.",
      "Name them for what they do, not Silver and Gold. \"Presence\", \"Standard\" and \"Catalogue\" tell a hardware supplier which one is theirs without you explaining anything.",
    ]},

    { type: "h2", id: "retainer", text: "The model that actually changes the business" },
    { type: "prose", text: [
      "None of the three is the important decision. The important one is whether there is a monthly attached to the build at all.",
      "Twenty fixed-price builds a year is a business that resets to zero every January and depends on you finding twenty more strangers. Twenty care plans at ₹2,000 a month is ₹4.8 lakh of revenue that arrives whether or not you sold anything in a given week, from clients who already trust you.",
      "So the pricing model question is mostly settled — fixed price, value-informed, scope written down — and the energy is better spent on making sure every fixed-price build has a monthly next to it from the first conversation.",
    ]},

    { type: "leads", city: "nagpur", heading: "Businesses to quote this way" },

    { type: "cta", variant: "map", title: "Price against their customer, not your hours.",
      detail: "Find businesses where one recovered customer covers the build — the review counts are the clue.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "Should I charge hourly or a fixed price for websites?", a: "Fixed price for the defined build, hourly only for work outside that scope. At small tickets hourly invites the client to estimate the hours themselves and caps you at your own speed, when the value to them has nothing to do with how long it took." },
    { q: "Does value-based pricing work for local business websites?", a: "Not as a billing model, because the outcome cannot be measured — a bakery cannot tell you how many cake orders it never received. Use it as an input instead: ask what one customer is worth over a year, and pick your number from that." },
    { q: "How do I stop a fixed-price project from running over?", a: "Count everything in writing — pages, photo rounds, revision rounds — name the out-of-scope rate before you start, and put a content deadline on paper. Missing photos and text are the main reason these projects run long, and that delay is not yours." },
    { q: "What pricing model do most small web agencies use?", a: "Fixed project fees for the build, with anything outside scope billed hourly. The hybrid is the standard answer and it splits the risk sensibly — you carry scope risk on a defined deliverable, the client carries it on their own additions." },
    { q: "Is a retainer better than project pricing?", a: "It is the more important decision. Twenty builds a year resets to zero every January; twenty care plans at ₹2,000 a month is recurring revenue from clients who already trust you. Attach a monthly to every build from the first conversation." },
  ],
  links: [["/resources/how-much-to-charge-for-a-website-india", "the actual numbers to quote"], ["/resources/website-maintenance-plans-what-to-charge", "pricing the monthly"], ["/resources/handling-its-too-expensive-without-discounting", "defending the number"], ["/resources/how-to-take-advance-payment-from-indian-clients", "collecting it"]],
},

/* ───────────────────────────── 2 · advance payment */
{
  slug: "how-to-take-advance-payment-from-indian-clients",
  title: "How to Take Advance Payment From Indian Clients",
  excerpt: "Advance is normal in Indian trade — your client takes it themselves. The problem is almost never the asking, it is the gap between the yes and the transfer.",
  meta: "How to take advance payment from Indian clients: why advance is normal in local trade, milestone splits that work, and closing the gap between yes and paid.",
  category: "Outreach", cluster: "operations", hero: "pricing", mins: 8,
  tags: ["Operations", "India", "Pricing"],
  body: [
    { type: "prose", text: [
      "Asking for advance payment is not the hard part, and worrying about it is where most people lose the money. **Advance is completely normal in Indian trade** — the shop you are pitching takes advance on custom orders, the tailor takes advance on a lehenga, the hardware supplier takes advance on a bulk order. You are not introducing an unfamiliar idea.",
      "The money gets lost in the gap between the verbal yes and the transfer actually happening. Close that gap and this stops being a problem.",
    ]},

    { type: "h2", id: "frame", text: "Ask in their own language" },
    { type: "prose", text: [
      "The framing that works is the one they already use with their own customers.",
      "\"Fifty percent advance, balance before it goes live — same as you'd take on a custom order.\" That sentence does the whole job. It is a business practice they already run, applied to them, and it is very difficult to object to something you do yourself every week.",
      "What does not work is anything that sounds like protection against them. \"I've been burned before\" tells a new client that you expect them to behave like the person who burned you, and it is the fastest way to make a straightforward request feel adversarial.",
    ]},

    { type: "h2", id: "split", text: "The split that works" },
    { type: "prose", text: [
      "Fifty-fifty is the market norm and it is fine. For anything above roughly ₹40,000, three milestones work better — the smaller first number is easier to agree in the room, and the middle payment lands while enthusiasm is still high.",
    ]},
    { type: "table", head: ["Ticket", "Split", "Trigger"], rows: [
      ["Under ₹20,000", "100% advance", "Before work starts — the amount is small enough"],
      ["₹20,000–40,000", "50 / 50", "On order, and before going live"],
      ["Above ₹40,000", "40 / 30 / 30", "On order, on design approval, before going live"],
      ["Care plan", "Monthly in advance", "Same date each month"],
    ], note: "Every trigger is something the client can see happening. Internal milestones are unbillable in practice." },
    { type: "prose", text: [
      "That last point matters more than the percentages. A milestone the client cannot observe — \"backend complete\" — produces a payment conversation where you are asserting that something happened. **Tie every payment to something visible**: they approved the design, the site is ready to go live. Then the trigger is not in dispute.",
      "And keep the final payment before launch, never after. The single most common way this goes wrong is a live site, a busy client, and a balance that quietly becomes a three-month follow-up problem. Once it is live, your leverage is gone and chasing it costs the relationship you were building the care plan on.",
    ]},

    { type: "h2", id: "upi", text: "Close the gap with UPI" },
    { type: "prose", text: [
      "This is the practical advantage of selling in India and it is underused.",
      "The dangerous interval is between \"yes, let's do it\" and the money arriving. That interval is where a spouse asks what it cost, another quote arrives, or the week simply gets busy. Every hour it stays open costs you conversions, and it is the only part of this you fully control.",
      "So collect while you are still standing there. Have the QR code on your phone. \"Great — I'll send the invoice tonight, and if you want to start Monday, the advance is ₹12,000 whenever you're ready.\" A meaningful share of clients will simply pay on the spot, because paying takes eight seconds and postponing takes a decision.",
      "Do it in that order, though. The QR code before the agreement reads as pressure; after a yes, it reads as convenience.",
    ]},
    { type: "steps", items: [
      { title: "Get the yes explicitly", icon: "verified", detail: "\"So we're going ahead?\" — an actual answer, not an assumption drawn from a friendly conversation." },
      { title: "State the number and the trigger", icon: "score", detail: "\"₹12,000 to start, ₹12,000 before it goes live.\" No new information, just confirmation." },
      { title: "Offer the easiest possible path", icon: "send", detail: "UPI QR now, or a transfer tonight. Both fine — what matters is that no step requires them to find something." },
      { title: "Send written confirmation the same day", icon: "calendar", detail: "Scope, both amounts, both triggers, the content deadline. WhatsApp is fine; what matters is that it exists in writing." },
    ]},

    { type: "h2", id: "paperwork", text: "What to put in writing" },
    { type: "prose", text: [
      "For a ₹25,000 local project a full contract is usually theatre, and pushing one across the counter can cool a warm conversation. What is not optional is a written record of the terms, and a WhatsApp message both parties have is a written record.",
      "Five things need to be in it: what is included as counts, the two payment amounts, the two triggers, the content deadline, and what falls outside scope. That is a short message, not a document, and it prevents nearly every dispute that actually occurs in this market.",
      "Larger engagements and anything with a recurring monthly deserve something more formal, and how you invoice — including tax treatment — depends on how your own practice is registered, which is worth settling with an accountant once rather than improvising per client.",
    ]},

    { type: "h2", id: "refuses", text: "When they will not pay advance" },
    { type: "prose", text: [
      "Occasionally somebody refuses outright. Treat it as information rather than an obstacle.",
      "A business that will not put down 40% on a ₹30,000 project is telling you something about either their cash position or their commitment, and both are things you want to know before you spend three weeks on it. The polite response is to shrink the job rather than to drop the terms: **offer the one-page presence build at a smaller number, fully paid up front.** They get something real, you get paid, and if it goes well the larger project happens later with the trust already established.",
      "What you should not do is start without an advance to prove goodwill. In a market where you are also trying to sell care plans, the client who never paid an advance is the client who is hardest to bill monthly afterwards.",
    ]},

    { type: "leads", city: "vadodara", heading: "Businesses worth quoting this week" },

    { type: "cta", variant: "map", title: "Get to the yes faster.",
      detail: "Prospects with real review counts and no website — the conversations that reach a number quickest.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "How much advance should I take for a website in India?", a: "50% is the norm. Under ₹20,000 take the full amount up front; above ₹40,000 a 40/30/30 split across order, design approval and pre-launch is easier to agree and keeps payments landing while enthusiasm is high." },
    { q: "How do I ask an Indian client for advance payment?", a: "In their own language: \"50% advance, balance before it goes live — same as you'd take on a custom order.\" Advance is normal in Indian trade and your client takes it themselves, so it is hard to object to. Never frame it as protection against them." },
    { q: "Should I take the final payment before or after launch?", a: "Before, always. Once the site is live your leverage is gone, and a balance owed by a busy client becomes a three-month follow-up problem that damages the relationship you were going to sell a care plan into." },
    { q: "Do I need a contract for a small website project?", a: "A written record, not necessarily a contract. For a ₹25,000 local project, a WhatsApp message covering the page count, both payment amounts, both triggers, the content deadline and what falls outside scope prevents nearly every dispute that actually happens." },
    { q: "What if a client refuses to pay any advance?", a: "Treat it as information about their cash position or commitment. Shrink the job rather than dropping the terms — offer a smaller one-page build paid fully up front. Starting work without an advance to prove goodwill produces the client who is hardest to bill monthly later." },
  ],
  links: [["/resources/hourly-project-or-value-pricing-model", "choosing the model before the split"], ["/resources/how-much-to-charge-for-a-website-india", "setting the number"], ["/resources/website-maintenance-plans-what-to-charge", "billing the monthly"], ["/resources/handling-its-too-expensive-without-discounting", "if the number is the problem"]],
},

/* ───────────────────────────── 3 · free mockup */
{
  slug: "the-free-mockup-play-does-it-still-close",
  title: "The Free Mockup Play: Does It Still Close Deals?",
  excerpt: "It works, and everyone who tells you so is selling the tooling. Here is what it actually costs per sale, and the two rules that decide whether it makes or loses you money.",
  meta: "Does the free mockup still close web design deals? What it costs per sale, when to build one, and the two rules that keep the play profitable.",
  category: "Outreach", cluster: "operations", hero: "leads", mins: 8,
  tags: ["Outreach", "Agency Playbook", "Pricing"],
  body: [
    { type: "prose", text: [
      "The free mockup still closes deals, and it can still ruin a month. Both are true, and which one you get depends almost entirely on how long the mockup takes you and when in the conversation you build it.",
      "Everything published on this recommends it without qualification, which makes sense once you notice that the people publishing sell website-builder platforms to resellers. The play is real. The cost of it is never on the page.",
    ]},

    { type: "h2", id: "why-works", text: "Why it works" },
    { type: "prose", text: [
      "It changes the question being asked, and that is the entire mechanism.",
      "Without a mockup the prospect is deciding **whether** to spend ₹30,000 on a website — an abstract decision against a vague benefit, competing with every other thing they could do with ₹30,000. With a mockup on the table they are deciding **whether this one is right**, which is a much smaller question and one they feel qualified to answer.",
      "It also does something no argument can: it proves you can do the work. For a local business that has never commissioned anything digital, and cannot evaluate a portfolio of other people's sites, seeing their own shop name and their own photos laid out properly is the only credential that means anything.",
    ]},

    { type: "h2", id: "cost", text: "What it actually costs" },
    { type: "prose", text: [
      "Here is the arithmetic the guides skip. Suppose a mockup takes three hours, and one in five prospects who see one buys.",
      "That is **fifteen hours of unpaid work per sale.** On a ₹30,000 project, you have spent fifteen hours to earn it before you have started the actual build — and the build is maybe twenty hours. You have roughly halved your effective rate.",
      "Now suppose the mockup takes forty minutes, because you are working from a template you have built forty times and swapping in their photos and their name. Same close rate, and it is three and a half hours per sale. That is cheap, and it is obviously worth doing.",
    ]},
    { type: "table", head: ["Mockup effort", "Close rate", "Unpaid hours per sale", "Verdict"], rows: [
      ["40 minutes", "1 in 5", "3.3", "Do it every time"],
      ["3 hours", "1 in 5", "15", "Only for qualified prospects"],
      ["3 hours", "1 in 3", "9", "Viable if you qualify hard"],
      ["8 hours (custom design)", "1 in 5", "40", "This is unpaid client work"],
    ], note: "The close rate is doing as much work in this table as the effort is. Both are worth measuring rather than assuming." },
    { type: "prose", text: [
      "The row that ends careers is the last one. A genuinely custom design produced on spec for a prospect who has committed to nothing is not a sales tactic, it is the project done for free with a chance of being paid.",
    ]},

    { type: "h2", id: "rules", text: "The two rules" },
    { type: "prose", text: [
      "**Never lead with it.** A mockup offered in the first message is worth nothing, because you have not established that they want a website at all and you are competing with everyone else who offers free things. Worse, it teaches the prospect that your work is free until they say otherwise. Build one after a real conversation in which they have said something like \"what would it even look like\" — at that point it answers a question they asked.",
      "**Time-box it and template it.** Decide the maximum before you start, and hold to it. The mockup's job is to make the abstract concrete, not to be the finished site. Their name, their photos, their category laid out well — thirty to sixty minutes on a base you already own.",
    ]},
    { type: "tip", title: "Use their own photos",
      text: "Pull the photos off their Google listing. A mockup built with stock imagery looks like a template with their name on it, which is exactly what a prospect suspects it is. Their own shopfront on the page removes that objection before it is raised." },

    { type: "h2", id: "present", text: "How to present it" },
    { type: "prose", text: [
      "In person or on a call, never as an unexplained attachment. A mockup emailed cold gets glanced at and filed, and you have spent the hours for nothing.",
      "Show it, then stop talking. The silence while somebody looks at their own business laid out properly is doing more work than anything you could say over it.",
      "Then move directly to the practical question rather than asking for a verdict on the design — **\"if we start this week it's live by the fifteenth\"** beats \"what do you think?\", which invites critique of colours and postpones the decision you were building toward.",
    ]},
    { type: "steps", items: [
      { title: "Qualify first", icon: "verified", detail: "Review count, rating, and a conversation where they engaged. No mockup for a business you have not spoken to." },
      { title: "Build from a template, time-boxed", icon: "clock", detail: "Their name, their photos, their category. Thirty to sixty minutes on a base you already own." },
      { title: "Present it live", icon: "phone", detail: "In person or on a call. Show it, then say nothing while they look." },
      { title: "Move to dates, not opinions", icon: "calendar", detail: "A start date and a launch date, rather than a request for feedback on the design." },
    ]},

    { type: "h2", id: "verdict", text: "So does it still work" },
    { type: "prose", text: [
      "Yes, in the cheap form, for qualified prospects, presented in person. In that shape it is one of the strongest closing tools available in this market, precisely because the buyer cannot evaluate anything else you might show them.",
      "In the expensive form it is unpaid client work with a lottery ticket attached, and the fact that everyone recommending it has something else to sell you is worth remembering when you are three hours into one for a business you have never spoken to.",
    ]},

    { type: "leads", city: "bhopal", heading: "Businesses with photos worth using" },

    { type: "cta", variant: "map", title: "Qualify before you build anything.",
      detail: "Filter by review count and rating so the mockups you make are for businesses that can pay for one.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "Does offering a free website mockup still close deals?", a: "Yes, when it is cheap to produce and shown to a qualified prospect in person. It changes the question from whether to buy a website to whether this one is right, which is a much smaller decision for the buyer." },
    { q: "How much does a free mockup cost me per sale?", a: "At a one-in-five close rate, a three-hour mockup is fifteen unpaid hours per sale — roughly half your effective rate on a ₹30,000 project. A forty-minute templated one is 3.3 hours, which is cheap enough to do every time." },
    { q: "Should I offer a mockup in my first message?", a: "No. Leading with it wastes the effort on people who have not decided they want a website, and it teaches prospects that your work is free until they say otherwise. Build one after they have asked what it would look like." },
    { q: "Is a free mockup the same as spec work?", a: "It becomes spec work at the point where it is genuinely custom. A templated layout with their name and photos is a sales asset; an eight-hour bespoke design for someone who has committed to nothing is the project done for free with a chance of payment." },
    { q: "How should I present a mockup?", a: "In person or on a call, never as a cold attachment. Show it and stay quiet while they look, then move to dates — \"if we start this week it's live by the fifteenth\" — rather than asking what they think, which invites critique and delays the decision." },
  ],
  links: [["/resources/hourly-project-or-value-pricing-model", "what to charge once they say yes"], ["/resources/how-to-take-advance-payment-from-indian-clients", "collecting the advance"], ["/resources/qualifying-a-local-lead-before-you-call", "who deserves a mockup"], ["/resources/call-whatsapp-or-walk-in-indian-smbs", "presenting it in person"]],
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
