/**
 * Batch 19 — the follow-up cluster.
 *
 * SERP checks first, and this one supplies unusually good numbers:
 *  · Follow-up content is B2B email-template material — send within two hours, restate pain points,
 *    attach the proposal. The channel assumption is email throughout, which is wrong here.
 *  · Touches: 80% of sales require five or more follow-ups, 5–12 is the usual range, cold prospects
 *    can take 20–50 — and the persistence gap is the real finding: the average rep stops at two,
 *    and 92% stop after four or fewer.
 *  · Cold calling: hard numbers worth carrying. Success rates fell from 4.82% in 2024 to 2.3% in
 *    2026, pickup rates collapsed from around 20% to 6–9%, driven by carrier spam filtering and
 *    STIR/SHAKEN labelling. Every one of those figures describes calling mobile numbers held by
 *    individuals, which is not what a local business number is — and that distinction is the post.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · what to send after */
{
  slug: "what-to-send-a-local-business-after-the-call",
  title: "What to Send a Local Business After the First Call",
  excerpt: "Not a proposal PDF, and not on email. One message, one number, one date — and the content of it was decided by something they said, not by a template.",
  meta: "What to send a local business after the first call: why a WhatsApp message beats a proposal PDF, what belongs in it, and when to send it.",
  category: "Outreach", cluster: "operations", hero: "network", mins: 8,
  tags: ["Outreach", "India", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Send a local business a short WhatsApp message the same evening, containing one number, one date, and one sentence that proves you listened. Not a proposal document, and not an email.",
      "Every published guide on this assumes email and a PDF, because it is written for a market where the buyer has an inbox they work from. A shop owner does not. Their email is checked weekly, if it exists, and a five-page proposal attached to it is a file that will not be opened on the phone it arrives on.",
    ]},

    { type: "h2", id: "shape", text: "The shape of the message" },
    { type: "prose", text: [
      "Four lines, and each one is doing a job.",
      "**The proof you listened.** One sentence referring to something specific they said — the cake orders, the contractors calling at night, the parents asking about batch sizes. This is the line that separates you from every other person who has pitched them, and it takes ten seconds to write if you took notes.",
      "**What you would build, in their words.** Not \"a five-page responsive website\". \"A page with your cake designs and a form that takes the date of the function.\"",
      "**The number.** One number, not a range, not three options on a first follow-up. A range invites them to anchor at the bottom and then negotiate below it.",
      "**The date.** \"If we start Monday it's live by the 20th.\" A date converts an idea into a decision with a shape, and it is the single most effective line in the message.",
    ]},
    { type: "tip", title: "Send it the same evening",
      text: "Not the next morning. The evening of the conversation is when they are still thinking about it and when their day has stopped — which is the same reason WhatsApp works better than a call here." },

    { type: "h2", id: "not", text: "What not to send" },
    { type: "table", head: ["", "Why it fails"], rows: [
      ["A PDF proposal", "Not opened on a phone; reads as effort demanded of them"],
      ["A price range", "They anchor at the bottom, then negotiate below it"],
      ["Three package options", "Fine at a second conversation; too much for a first follow-up"],
      ["A portfolio link", "Sends them away from the message and into a decision they were not ready for"],
      ["\"Just checking in\"", "Adds nothing, and trains them to ignore you"],
      ["Anything at 11pm", "Reads as pressure, and gets read in the wrong mood"],
    ]},
    { type: "prose", text: [
      "The packages point is worth being careful about. Presenting three options is genuinely good practice, and it belongs at the stage where somebody has said yes in principle and is deciding what to buy. In a first follow-up it converts a simple decision into a comparison exercise conducted alone, without you there to explain the difference.",
    ]},

    { type: "h2", id: "mockup", text: "When to send something visual" },
    { type: "prose", text: [
      "One exception to the four-line rule, and it is a strong one: **a screenshot beats a description**, if you can produce it cheaply.",
      "A single image of their business name and their own photographs laid out as a page does more than any paragraph. It has to be cheap to make — thirty to sixty minutes on a template you already own — and it has to come after a real conversation rather than as an opener.",
      "Send it as an image in the message, not as a link to a staging site. A link is a decision to click; an image is already in front of them, and it will be forwarded to whoever else decides.",
    ]},

    { type: "h2", id: "second", text: "The second and third messages" },
    { type: "prose", text: [
      "This is where most follow-up dies, because the second message is usually \"just checking in\", which is a message about your need rather than theirs.",
      "Every follow-up needs a reason to exist, and there are only really three good ones. **Something new** — a page you built for a business like theirs, a change you noticed on their listing. **A deadline** — the date you quoted moving, a festival approaching, an admission window closing. **A question** — a genuine one, about something you would need to know to start.",
      "If you have none of those, do not send anything. Silence is better than a message that teaches them your messages are ignorable.",
    ]},
    { type: "steps", items: [
      { title: "Same evening: the four-line message", icon: "send", detail: "Proof you listened, what you would build, one number, one date." },
      { title: "Day 3: the visual, if you have it", icon: "signal", detail: "A screenshot of their name and their photos on a page. Nothing else in the message." },
      { title: "Day 8: a reason, not a check-in", icon: "calendar", detail: "Something new, a deadline, or a real question. If none exists, skip this one." },
      { title: "Day 20: the close-or-park message", icon: "phone", detail: "\"Should I keep this on the list or leave it for now?\" Easy to answer, and either answer is useful." },
    ]},

    { type: "h2", id: "park", text: "The message that ends it cleanly" },
    { type: "prose", text: [
      "The last one deserves its own note, because most people never send it and their pipeline fills with corpses.",
      "\"Should I keep this on the list or leave it for now?\" is easy to answer, carries no pressure, and produces information either way. A no lets you remove them and stop wondering. A \"leave it for now\" often comes with a reason and a timeframe, which is genuinely useful. And a surprising share of them answer with a yes, because the message arrived at a moment when the reason for delay had passed and nobody had asked.",
      "It is also the message that keeps the relationship intact for later. A prospect who declined politely and was let go politely will take your call in eight months. One who was chased for six weeks will not.",
    ]},

    { type: "leads", city: "bhopal", heading: "Conversations to follow up on" },

    { type: "cta", variant: "map", title: "Have something worth following up on.",
      detail: "Qualified prospects, so the message you send the same evening is going to somebody who can buy.",
      action: "Build the list", href: "/login" },
  ],
  faqs: [
    { q: "What should I send after a first sales call with a local business?", a: "A short WhatsApp message the same evening with four lines: one sentence proving you listened, what you would build in their words, one number, and one date. Not a PDF proposal and not an email." },
    { q: "Why not send a proposal document?", a: "Because it will not be opened on the phone it arrives on. A shop owner's email is checked weekly if it exists, and a multi-page attachment reads as effort demanded of them at the moment you want the decision to feel small." },
    { q: "Should I send a price range or a single number?", a: "A single number on a first follow-up. A range invites them to anchor at the bottom and then negotiate below it. Three package options are good practice later, once somebody has said yes in principle." },
    { q: "How many follow-up messages should I send?", a: "Three after the first, and each needs a reason to exist — something new, a deadline, or a real question. \"Just checking in\" adds nothing and trains them to ignore you, so skip a message rather than send an empty one." },
    { q: "How do I end a follow-up sequence?", a: "\"Should I keep this on the list or leave it for now?\" It is easy to answer, carries no pressure, and produces useful information either way — and it keeps the relationship intact, so a polite no today takes your call in eight months." },
  ],
  links: [["/resources/the-first-call-10-questions-that-qualify-a-lead", "the call this follows"], ["/resources/whatsapp-outreach-local-business-india", "the channel and the register"], ["/resources/the-free-mockup-play-does-it-still-close", "the visual to send"], ["/resources/how-many-touches-before-a-local-business-buys", "how many messages is too many"]],
},

/* ───────────────────────────── 2 · touches */
{
  slug: "how-many-touches-before-a-local-business-buys",
  title: "How Many Touches Before a Local Business Buys?",
  excerpt: "The published answer is five to twelve, and 92% of salespeople stop at four or fewer. For local businesses the number is lower — because one of the touches is worth five of the others.",
  meta: "How many touches before a local business buys: why the published five-to-twelve range is too high here, and which single touch is worth five of the others.",
  category: "Outreach", cluster: "operations", hero: "network", mins: 8,
  tags: ["Outreach", "Prospecting", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Three to five, if one of them is in person. How many it takes before a local business buys is a shorter number than the literature suggests — the published B2B answer is five to twelve touches, rising to twenty or more for genuinely cold prospects — and those numbers describe a world where every touch is an email or a call to somebody who has never met you.",
      "The local version is shorter for one reason: **a visit is not one touch.** Standing in front of somebody does what four emails cannot, and the sequences that work here are built around that rather than around volume.",
    ]},

    { type: "h2", id: "gap", text: "The finding that matters most" },
    { type: "prose", text: [
      "Before the local adjustment, the single most useful statistic in this literature: **80% of sales require at least five follow-ups, and 92% of salespeople stop after four or fewer.** The average rep stops at two.",
      "That is not a subtle effect. It says most people give up immediately before the point at which most deals close, and it is consistent across every study that measures it.",
      "The reason is worth naming, because knowing it helps. Follow-up feels like pestering, and the feeling gets stronger with each unanswered message even though the actual annoyance to the recipient does not. **The discomfort is yours, and it grows faster than theirs does.**",
    ]},
    { type: "table", head: ["Touches attempted", "Share of salespeople who get there", "Share of sales that need it"], rows: [
      ["1–2", "Most", "A small minority"],
      ["3–4", "Some", "Some"],
      ["5+", "8%", "80%"],
    ], note: "Published B2B follow-up research. The mismatch between the last two columns is the whole point." },

    { type: "h2", id: "weights", text: "Not all touches are equal" },
    { type: "prose", text: [
      "The published counts treat a touch as a unit, which is fine when every touch is an email. Here they differ by an order of magnitude.",
    ]},
    { type: "features", items: [
      { title: "A visit", icon: "map", detail: "Worth roughly five of anything else. You reach the owner, you can show something, and you become a person from the same city." },
      { title: "A WhatsApp message", icon: "send", detail: "Cheap, read almost always, and worth roughly one — but only if it contains something." },
      { title: "A call", icon: "phone", detail: "Worth less than it looks, because it usually reaches whoever is nearest the counter rather than the owner." },
      { title: "\"Just checking in\"", icon: "clock", detail: "Worth zero or less. It consumes patience and returns nothing." },
    ]},
    { type: "prose", text: [
      "Which produces the practical rule: **a sequence with a visit in it converges in three to five touches. A sequence without one needs eight to twelve**, and is competing with local agencies who did visit.",
    ]},

    { type: "h2", id: "sequence", text: "A sequence that works" },
    { type: "steps", items: [
      { title: "Touch 1 — the visit", icon: "map", detail: "Mid-afternoon, clustered with seven others in the same street. Two minutes, one question, and a specific reason to come back." },
      { title: "Touch 2 — the same evening", icon: "send", detail: "The four-line message. One number, one date, one sentence proving you listened." },
      { title: "Touch 3 — day three, visual", icon: "signal", detail: "A screenshot of their name and their photographs on a page. No text beyond a line." },
      { title: "Touch 4 — day eight, a reason", icon: "calendar", detail: "Something new, a deadline, or a genuine question. Skip it if you have none." },
      { title: "Touch 5 — day twenty, close or park", icon: "phone", detail: "\"Keep this on the list, or leave it for now?\" Either answer is useful, and both preserve the relationship." },
    ]},
    { type: "prose", text: [
      "Five touches across three weeks, of which two require real effort. That is well past where 92% of people stop and well inside the point where following up becomes irritating.",
    ]},

    { type: "h2", id: "restart", text: "The touch that comes months later" },
    { type: "prose", text: [
      "The sequence above ends at day twenty, and a meaningful share of local business sales happen well outside it — often six months later, triggered by something that had nothing to do with you.",
      "A competitor two streets away launches a site. A customer asks why they cannot find them online. A slow season leaves the owner with time to think about it. **None of those are things you can cause, and all of them produce a buyer who already knows exactly who to call — if you left cleanly.**",
      "Which makes the dormant list worth something rather than nothing. A single message every four to six months, carrying an actual reason — a page you built for a business like theirs, a change you noticed on their listing — costs almost nothing and lands on a decision that has already shifted.",
      "This is the argument for the close-or-park message rather than a slow fade. A prospect who was let go politely stays reachable; one who was chased until they stopped replying has been spent.",
    ]},

    { type: "h2", id: "too-many", text: "Where the line actually is" },
    { type: "prose", text: [
      "It is not a count, which is the mistake in most advice on this. **The line is crossed when a message contains nothing.**",
      "Ten messages that each carry something — a new example, an approaching date, a real question — are not pestering. Three consecutive \"just following up\" messages are, and the third one has done permanent damage in a market where the same owner will see you again at the same market association meeting.",
      "The local dimension matters here in a way it does not in B2B. You are going to run into these people. A prospect who felt harassed becomes a story told to other business owners on the same street, and that is a slower and more expensive problem than a lost sale.",
      "So the practical test before sending anything: **if they replied \"why are you messaging me?\", would you have an answer?** If yes, send it. If no, wait until you do.",
    ]},

    { type: "leads", city: "kanpur", heading: "Prospects worth five touches" },

    { type: "cta", variant: "map", title: "Cluster them so a visit is cheap.",
      detail: "Prospects grouped by area, so the touch that counts for five is an afternoon rather than a day.",
      action: "Plan a round", href: "/login" },
  ],
  faqs: [
    { q: "How many touches does it take to close a local business?", a: "Three to five, if one of them is a visit. The published B2B answer is five to twelve because it assumes every touch is an email or a call — standing in front of somebody does what four messages cannot." },
    { q: "How many follow-ups do most salespeople actually do?", a: "92% stop after four or fewer and the average rep stops at two, while 80% of sales require at least five follow-ups. Most people give up immediately before the point at which most deals close." },
    { q: "Why does following up feel like pestering?", a: "Because the discomfort is yours and it grows faster than theirs does. Each unanswered message increases your reluctance far more than it increases their annoyance, which is why the persistence gap exists at all." },
    { q: "When have I followed up too many times?", a: "It is not a count. The line is crossed when a message contains nothing — ten messages that each carry something are fine, and three consecutive \"just following up\" messages are not. Ask whether you could answer \"why are you messaging me?\"" },
    { q: "Is a phone call worth as much as a visit?", a: "No. A call usually reaches whoever is nearest the counter rather than the owner, while a visit reaches the decision-maker, lets you show something and makes you a person from the same city. A sequence with a visit converges in three to five touches; one without needs eight to twelve." },
  ],
  links: [["/resources/what-to-send-a-local-business-after-the-call", "what each message should contain"], ["/resources/call-whatsapp-or-walk-in-indian-smbs", "why the visit is worth five"], ["/resources/building-a-weekly-prospecting-routine", "fitting the visits into a week"], ["/resources/how-many-businesses-should-be-in-your-pipeline", "how many of these to run at once"]],
},

/* ───────────────────────────── 3 · cold calling */
{
  slug: "does-cold-calling-still-work-for-web-design",
  title: "Does Cold Calling Still Work for Web Design in 2026?",
  excerpt: "Pickup rates collapsed from 20% to under 10% and success rates halved in two years. Almost none of that applies to a shop's landline — but a different problem does.",
  meta: "Does cold calling still work for web design in 2026? What the collapse in pickup rates does and does not apply to, and the real constraint on calling a shop.",
  category: "Outreach", cluster: "operations", hero: "network", mins: 8,
  tags: ["Outreach", "Prospecting", "Market Research"],
  body: [
    { type: "prose", text: [
      "Cold calling still works for web design in 2026 if you are calling local businesses, and much less than it did for everybody else — but for reasons that have nothing to do with the statistics people quote.",
      "The published collapse is real and steep. **Average cold call success rates fell from 4.82% in 2024 to 2.3% in 2026**, and pickup rates went from around 20% to roughly 6–9%. Carrier spam filtering and caller-ID labelling did most of that.",
      "Almost none of it describes what happens when you call a hardware store.",
    ]},

    { type: "h2", id: "different", text: "Why cold calling a shop is a different instrument" },
    { type: "prose", text: [
      "Every one of those figures comes from calling **mobile numbers belonging to individuals**, in a context where the recipient has no obligation to answer and increasingly good tooling to avoid it. Screening, spam labels, and the simple fact that an unknown number to a personal phone is now assumed to be a nuisance.",
      "A local business number is the opposite instrument. It is published on purpose, it is how customers reach them, and **it has to be answered** — a shop that stops answering its own listed number has a bigger problem than you. Spam filtering barely touches it, because filtering an inbound business line would cost the business money.",
      "So the pickup rate for a local business number is far above the published figures. The call gets answered.",
      "That is where the good news ends.",
    ]},

    { type: "h2", id: "real-problem", text: "The real constraint: who answers" },
    { type: "prose", text: [
      "The number is answered by whoever is nearest and least busy, which is systematically the person with no authority to buy anything. An employee, a family member, somebody covering the counter for ten minutes.",
      "That person's job in the conversation is to make it end. They will take a message that does not get passed on, or say the owner is out, or hand the phone to somebody equally uninvolved. None of this is obstruction — it is the correct behaviour for somebody serving a customer while a stranger talks.",
      "**So cold calling local businesses does not fail at the pickup, it fails at the handoff**, which is a completely different problem and needs a completely different fix. Everything written about improving cold call performance in 2026 — number reputation, local presence dialling, carrier registration — addresses the pickup, which was never your problem.",
    ]},
    { type: "table", head: ["", "B2B mobile calling", "Local business calling"], rows: [
      ["Pickup rate", "6–9%", "High"],
      ["Spam filtering", "Severe", "Minimal"],
      ["Reaches decision-maker", "If they pick up, yes", "Rarely"],
      ["Main failure", "Nobody answers", "The wrong person answers"],
      ["What fixes it", "Number reputation, targeting", "Timing, and asking for a name"],
    ]},

    { type: "h2", id: "fix", text: "What actually improves it" },
    { type: "prose", text: [
      "Three things, none of which are about the phone system.",
      "**Timing.** The owner is at the counter at predictable hours and absent at others, and it differs by trade. Mid-afternoon for hardware and retail, after service for restaurants, morning before dispatch for wholesalers. Calling at the wrong hour guarantees the wrong person regardless of anything else.",
      "**Ask for a person, not a role.** \"Is the owner there?\" invites a no. If you know a name from the listing or from a previous visit, using it changes the conversation entirely — you are somebody who knows them rather than somebody selling.",
      "**Give the message a reason to travel.** If you are going to be handled by an intermediary, the thing they carry has to be short and specific enough to survive: not \"a web design company called\", but \"someone called about the price list page for contractors\". One is noise, the other is a thing the owner will ask about.",
    ]},

    { type: "h2", id: "india", text: "What is different in India" },
    { type: "prose", text: [
      "Two local factors, and they cut against each other.",
      "**The number is more likely to be a mobile.** A great many Indian small businesses list a personal mobile rather than a landline, which reintroduces some of the screening problem the section above dismissed — though far less than for a stranger's private number, because that mobile is the number customers use.",
      "**But it is also more likely to be the owner's.** A single-proprietor shop listing the owner's mobile means the call reaches the decision-maker directly, which is the outcome the entire handoff problem exists to prevent. In smaller businesses, calling can work better here than the counter-line analysis suggests.",
      "The practical read: check what kind of number it is before deciding how to approach. A landline at a busy trade counter is a walk-in. A mobile on a small owner-run business is a genuine call opportunity, and one of the few places where a first-touch call still outperforms.",
    ]},

    { type: "h2", id: "verdict", text: "So is it worth doing" },
    { type: "prose", text: [
      "As a first touch, rarely, and this is where the honest answer diverges from the reassuring one.",
      "For a business you can reach on foot, walking in dominates calling on every axis that matters — you reach the owner, you can show something on a screen, and you are visibly local. The call is competing with a better available option and losing.",
      "Calling earns its place in three specific situations. **Where the business is too far to visit**, which is most of a second city and all overseas work. **As a second touch**, calling somebody who has already met you, which is not a cold call at all and works far better than the statistics suggest. **For the verticals where the owner sits at a desk** — coaching institutes, wholesalers, clinics — where the call reaches an office rather than a counter.",
      "The version that genuinely is dead is the one those statistics describe: high-volume dialling of a purchased list with a script and no research behind it. That died for local business the same way it died for everyone else, and nothing in the pickup-rate advantage brings it back.",
    ]},

    { type: "leads", city: "lucknow", heading: "Businesses worth calling" },

    { type: "cta", variant: "map", title: "Call the ones you cannot walk to.",
      detail: "Filter by area so the businesses you visit and the businesses you call are two different lists.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "Does cold calling still work for web design in 2026?", a: "For local businesses, yes — but not for the reasons usually cited. Published pickup rates collapsed to 6–9% and success rates halved to 2.3%, and almost all of that describes calling personal mobiles rather than a shop's published business line." },
    { q: "Why don't the cold calling statistics apply to local businesses?", a: "Because a business number is published on purpose, is how customers reach them, and has to be answered. Spam filtering barely touches it, since filtering an inbound business line would cost the business money. The call gets answered." },
    { q: "Why does cold calling local businesses fail then?", a: "At the handoff, not the pickup. The number is answered by whoever is nearest and least busy — someone with no authority whose role in the conversation is to end it. Everything written about improving cold calls in 2026 fixes the pickup, which was never the problem." },
    { q: "How do I improve cold calls to local businesses?", a: "Timing, a name, and a message worth carrying. Call when the owner is actually at the counter for that trade, ask for a person rather than a role, and make the message specific enough to survive being relayed — \"someone called about the price list page for contractors\", not \"a web design company called\"." },
    { q: "Should cold calling be my first touch?", a: "Rarely, if you can walk in instead. Calling earns its place for businesses too far to visit, as a second touch to somebody who has already met you, and for verticals where the owner sits at a desk rather than behind a counter." },
  ],
  links: [["/resources/call-whatsapp-or-walk-in-indian-smbs", "the full channel comparison"], ["/resources/cold-call-script-selling-websites-local-businesses", "the script itself"], ["/resources/the-first-call-10-questions-that-qualify-a-lead", "what to ask when you get through"], ["/resources/how-many-touches-before-a-local-business-buys", "where the call sits in a sequence"]],
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
