/**
 * Batch 14 — the sales-craft cluster.
 *
 * SERP checks first:
 *  · Discovery-call questions is a mature B2B SaaS genre (Pipedrive, Close, HubSpot, Proposify,
 *    Highspot) and every page assumes a booked call with an inbound qualified lead, structured on
 *    BANT. None of it survives a cold walk-in to a shop counter, and none of it contains
 *    disqualifying questions, because those reps are not allowed to disqualify.
 *  · "Selling in Hindi" returns AI voice-agent vendors and Udemy courses. The craft itself is
 *    unwritten. One useful confirmation from the vendor material: these calls genuinely run in
 *    Hinglish, with English holding the technical vocabulary.
 *  · Prospecting routines: good, disciplined B2B material — two hours daily, same time, pipeline
 *    holes appearing 30–90 days later, and one directly transferable idea, zones assigned to
 *    weekdays. What is missing is everything specific to a business where the prospecting is done
 *    on foot and delivery weeks eat the calendar.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · the first call */
{
  slug: "the-first-call-10-questions-that-qualify-a-lead",
  title: "The First Call: 10 Questions That Qualify or Kill a Lead",
  excerpt: "Every discovery-call guide is written for someone who agreed to the call. These are for someone who did not — including the four answers that should end it.",
  meta: "Ten questions for a first cold call to a local business: what to ask, the order that keeps them talking, and the answers that should end it.",
  category: "Outreach", cluster: "operations", hero: "network", mins: 9,
  tags: ["Outreach", "Prospecting", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "The first call to a local business is not a discovery call, and treating it like one is why most scripts fail. A discovery call happens because somebody booked it. This happens because you interrupted a shop owner who was doing something else.",
      "So the questions have to earn their place. These ten are ordered by how willing somebody is to answer them in the first two minutes, and four of them exist to kill a lead rather than to continue with it.",
    ]},

    { type: "h2", id: "open", text: "The three that get them talking" },
    { type: "prose", text: [
      "Owners like talking about their business and dislike being sold to, and these three are firmly on the first side of that line.",
      "**1. \"How long have you been here?\"** Nearly everybody answers this warmly, and the answer tells you a great deal — a business at eleven years has survived things, has regulars, and has never needed a website, which is a different conversation from a business at eighteen months.",
      "**2. \"How do most of your customers find you?\"** The most valuable question in the entire call. \"Word of mouth\" means a weak case. \"They walk past\" means footfall, so it depends on the ticket. \"They call, or they find us on Google\" means they have just told you they are already being searched for.",
      "**3. \"What do people ask you most on the phone?\"** This is where the pitch comes from. Timings, price, stock, whether you do a particular thing — every one of those is a page, and now it is their answer rather than your claim.",
    ]},

    { type: "h2", id: "middle", text: "The four that qualify" },
    { type: "prose", text: [
      "Now you are establishing whether this is a business worth your afternoon.",
      "**4. \"Do you get enquiries from outside the neighbourhood?\"** Yes means reach is worth something to them. No, and they do not want any, means the whole discoverability argument is dead and you should know that now.",
      "**5. \"What's the busiest thing you do — the thing you'd want more of?\"** Not \"what do you sell\". The answer names the transaction the website should be built around: the custom cake, the contractor order, the bridal commission, the annual admission.",
      "**6. \"Roughly what's that worth to you, one customer over a year?\"** Blunt, and almost everybody answers it, because owners know this number. It sets your quote before you have quoted anything.",
      "**7. \"Who else would need to be happy with this — a partner, family?\"** The local version of asking about decision authority, and it never sounds like a qualification question. If there is a brother who handles \"computer things\", you need to know before, not after.",
    ]},

    { type: "h2", id: "kill", text: "The three that kill it, cleanly" },
    { type: "prose", text: [
      "These exist so you can leave early. Nothing in the published discovery material contains questions like this, because those reps are not permitted to disqualify. You are, and it is the most valuable thing you can do with a bad prospect.",
      "**8. \"Has anyone built you one before?\"** A bad previous experience is the single hardest objection in this business, and it is much better encountered in minute three than in week three. If the answer is yes and it went badly, the conversation you are now having is about trust, not websites, and it is a longer one.",
      "**9. \"If we did this, when would you actually want it live?\"** Vagueness here is the most reliable predictor of a project that never starts. \"Sometime, we'll see\" is not a timeline, it is a polite no with better manners.",
      "**10. \"Is this something you'd decide, or would you want to think it over with someone?\"** Perfectly friendly, and it separates the conversation that can close from the one that needs a second visit — which is fine, as long as you know which you are in.",
    ]},
    { type: "table", head: ["Answer", "What it means", "Do"], rows: [
      ["\"Word of mouth, only regulars\"", "No discoverability problem", "Leave politely"],
      ["\"We had one, it was useless\"", "Trust problem, not a website problem", "Slow down or leave"],
      ["\"Sometime, no rush\"", "Not a timeline", "Stop selling, stay in touch"],
      ["\"My nephew handles that\"", "There is a gatekeeper", "Ask to meet them"],
      ["\"People ask us X all day\"", "The pitch is written", "Continue"],
      ["\"About ₹25,000 a year\"", "The price is set", "Continue"],
    ]},

    { type: "h2", id: "order", text: "Why the order matters more than the questions" },
    { type: "prose", text: [
      "You will not get through ten questions on a first call and should not try. You will get four or five, and which four decides everything.",
      "The sequence is deliberate: **warm, then useful, then disqualifying.** Ask about the money in the first thirty seconds and the shutter comes down. Ask how long they have been there, then how customers find them, and by question five you are having a conversation rather than conducting an interview.",
      "The disqualifying ones go last for the same reason. If you never reach them, you have lost nothing — the business was not going to buy today anyway.",
    ]},

    { type: "h2", id: "notes", text: "What to write down" },
    { type: "checklist", items: [
      { title: "The transaction they named", detail: "Question five's answer, in their words. This is the whole proposal." },
      { title: "The customer value figure", detail: "Question six. It is your price anchor and they gave it to you." },
      { title: "Who else decides", detail: "A name if you got one. Follow-ups fail on this more than on price." },
      { title: "What they get asked on the phone", detail: "Question three's answer is your sitemap." },
      { title: "When to come back", detail: "An actual day. \"Next week\" is not a day." },
    ]},
    { type: "prose", text: [
      "Write it immediately after leaving, not in the evening. By evening you will have four conversations blurred into one, and the specific phrase the owner used — which is the thing that makes the follow-up feel personal — will be gone.",
    ]},

    { type: "leads", city: "lucknow", heading: "Businesses to have this call with" },

    { type: "cta", variant: "map", title: "Have better first calls.",
      detail: "Qualify on review count and rating first, so the ten questions are being asked of businesses that can answer them.",
      action: "Build a list", href: "/login" },
  ],
  faqs: [
    { q: "What should I ask on a first call to a local business?", a: "Start with how long they have been there and how customers currently find them — both are questions owners enjoy answering. Then what people ask them most on the phone, which is where the pitch comes from." },
    { q: "How do I know when to end a sales call early?", a: "Four answers should end it: customers are all word-of-mouth regulars, a previous website went badly, there is no real timeline, or the decision belongs to someone not in the room. Leaving early on those is the most valuable thing you can do." },
    { q: "How do I find out a prospect's budget without asking directly?", a: "Ask what one customer is worth to them over a year. Owners know this number and answer it readily, and it sets your quote before you have quoted anything — which is a far better position than naming a price first." },
    { q: "Why don't standard discovery call questions work here?", a: "Because they assume the prospect booked the call. A discovery framework built for an inbound qualified lead does not survive interrupting a shop owner mid-shift, where the first job is earning two more minutes rather than gathering requirements." },
    { q: "How many questions can I actually get through?", a: "Four or five on a first call. Which is why the order matters more than the list — warm questions first, useful ones next, disqualifying ones last, so that not reaching the end costs you nothing." },
  ],
  links: [["/resources/cold-call-script-selling-websites-local-businesses", "the script around these questions"], ["/resources/qualifying-a-local-lead-before-you-call", "qualifying before you dial"], ["/resources/handling-we-dont-need-a-website", "the objection question two produces"], ["/resources/how-much-to-charge-for-a-website-india", "turning question six into a quote"]],
},

/* ───────────────────────────── 2 · selling in hindi */
{
  slug: "selling-in-hindi-what-changes-in-a-sales-call",
  title: "Selling in Hindi: What Changes in a Local Sales Call",
  excerpt: "Not a translation problem. Which words stay in English, what switching languages mid-pitch actually signals, and the two habits that make a pitch sound imported.",
  meta: "Selling in Hindi to local business owners: which terms stay English, what code-switching signals, and how to say a price without sounding like a script.",
  category: "Outreach", cluster: "operations", hero: "network", mins: 8,
  tags: ["Outreach", "India", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Selling in Hindi is not a matter of translating an English pitch, and the pitches that fail hardest are the ones that were translated well. A local sales call in most of India runs in Hinglish — Hindi carrying the persuasion and the rapport, English holding the technical vocabulary — and the switching between them is doing work that neither language does alone.",
      "Nothing is written about what actually changes. The searches return AI voice-agent vendors and course listings, which tells you the craft is assumed rather than taught.",
    ]},

    { type: "h2", id: "vocabulary", text: "Which words stay in English" },
    { type: "prose", text: [
      "This is the most practical part, and getting it wrong is the fastest way to sound like a script.",
      "**Website, Google, online, domain, hosting, WhatsApp, form, page** — these stay English. Every owner knows them, and the Hindi equivalents either do not exist in common speech or sound like a government form. Saying *jaal-sthal* for website will end the conversation, warmly, but end it.",
      "**Everything about money, trust, time and benefit goes to Hindi.** *Kitne ka padega, kitna time lagega, iska fayda kya hai, bharosa* — this is where Hindi does the work. An owner deciding whether to spend ₹25,000 is thinking in Hindi, and the sentence that lands has to arrive in the language the decision is being made in.",
      "The natural sentence is the mixed one: *\"aapki website pe cake orders ka poora catalogue hoga, customer date daalke enquiry bhej dega.\"* Nobody in that shop finds it odd, because that is how they already talk.",
    ]},
    { type: "table", head: ["Concept", "Stays English", "Goes to Hindi"], rows: [
      ["The product", "Website, page, form", ""],
      ["The platform", "Google, WhatsApp, online", ""],
      ["Price", "", "Kitne ka, kitna kharcha"],
      ["Time", "", "Kitne din, kab tak"],
      ["Benefit", "", "Fayda, faayda kya hoga"],
      ["Trust and risk", "", "Bharosa, tension mat lo"],
      ["Technical detail", "Domain, hosting", ""],
    ]},

    { type: "h2", id: "switching", text: "What switching languages signals" },
    { type: "prose", text: [
      "Code-switching is not neutral, and both directions carry meaning that has nothing to do with vocabulary.",
      "**Moving into English mid-pitch reads as distance.** It happens most when somebody is nervous and retreats to the version of the pitch they rehearsed. To an owner it can sound like being talked down to, or like the salesperson has stopped talking to them and started reciting. If you notice yourself doing it while explaining the price, that is the exact moment to stop and switch back.",
      "**Moving into Hindi at the price is the right instinct**, and most people who sell well in this market do it without noticing. The number is the moment of most doubt, and it should arrive in the warmer language.",
      "**The owner's own mix is the instruction.** If they answer you in mostly-English, match it. If they answer in Hindi with English nouns, do that. This is not about your fluency — it is about not making them adjust to you when they are the one being asked to spend money.",
    ]},

    { type: "h2", id: "aap", text: "Aap, tum, and age" },
    { type: "prose", text: [
      "*Aap* always, regardless of the owner's age or how the conversation is going. There is no upside to *tum* with someone you are asking for money, and a great deal of downside if you misjudge it.",
      "Age runs the other way and is worth noticing. A younger salesperson with an older shop owner is a familiar and comfortable dynamic in Indian trade — *beta*, or a first name, coming back at you is not disrespect, it is the relationship being placed. Accepting that framing rather than resisting it makes the rest of the conversation easier, and it is why walking in works so well here in the first place.",
    ]},

    { type: "h2", id: "regional", text: "Beyond Hindi" },
    { type: "prose", text: [
      "Much of the market is not a Hindi market, and the same rules apply with the languages swapped.",
      "In Coimbatore, Surat, Kolkata or Hyderabad the pattern holds — a regional language for rapport and persuasion, English for the technical nouns, and often Hindi nowhere at all. Leading in Hindi in a city that does not run on it is worse than leading in English, because English is at least neutral.",
      "The general rule: **the technical vocabulary is English everywhere in India; the persuasion belongs to whatever language the shop actually runs on.** If you do not speak it, English is a clean second choice and pretending is a bad one — a badly-attempted greeting in someone's language starts you further behind than not attempting it.",
    ]},

    { type: "h2", id: "habits", text: "Two habits that sound imported" },
    { type: "prose", text: [
      "**Translated sales phrases.** \"Main aapka kuch minute le sakta hoon?\" is a translated \"can I take a minute of your time\" and it sounds exactly like one. The natural version is shorter and more direct — *do minute baat kar lein?* — and directness is not rudeness here.",
      "**Over-formality.** The Hindi people reach for when nervous is the Hindi of announcements and forms, and it puts a counter between you and the owner that was not there before you opened your mouth. The register you want is how you would talk to a shopkeeper you buy from regularly.",
      "Both come from the same source: rehearsing in one language and delivering in another. The fix is to practise out loud in the language you will actually use, which is a mixed one.",
    ]},

    { type: "leads", city: "kanpur", heading: "Businesses this call is for" },

    { type: "cta", variant: "map", title: "The conversation is local. The list can be too.",
      detail: "Find businesses with no website in your own city, where you already speak the language the shop runs on.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "Should I sell in Hindi or English to Indian business owners?", a: "Both, mixed. Hinglish is how these conversations actually run — Hindi carries rapport, persuasion, price and trust; English holds the technical nouns like website, Google, domain and hosting. Match whatever mix the owner answers you in." },
    { q: "Which words should stay in English?", a: "Website, Google, online, domain, hosting, page, form, WhatsApp. Every owner knows them, and the formal Hindi equivalents sound like a government form rather than a conversation." },
    { q: "Is it bad to switch to English mid-pitch?", a: "Usually yes. It happens when people get nervous and retreat to the rehearsed version, and to an owner it can read as distance or as recitation. Switching into Hindi at the price is the opposite — that is the right instinct, because the number is the moment of most doubt." },
    { q: "Should I use aap or tum?", a: "Aap, always, whatever the owner's age. There is no upside to tum with somebody you are asking for money. If an older owner calls you beta or uses your first name, accept the framing — it makes the rest of the conversation easier." },
    { q: "What about cities where Hindi is not spoken?", a: "The same structure with the languages swapped: the regional language for persuasion, English for the technical nouns. Leading in Hindi where the market does not run on it is worse than leading in English, and a badly-attempted greeting starts you further behind than none." },
  ],
  links: [["/resources/cold-call-script-selling-websites-local-businesses", "the script itself"], ["/resources/call-whatsapp-or-walk-in-indian-smbs", "choosing the channel"], ["/resources/whatsapp-outreach-local-business-india", "the same register in writing"], ["/resources/the-first-call-10-questions-that-qualify-a-lead", "the questions to ask"]],
},

/* ───────────────────────────── 3 · prospecting routine */
{
  slug: "building-a-weekly-prospecting-routine",
  title: "Building a Weekly Prospecting Routine That Sticks",
  excerpt: "The pipeline hole you get in November was dug in September, during the week you were too busy delivering. A weekly structure built for a business where prospecting happens on foot.",
  meta: "Building a weekly prospecting routine: why delivery weeks cause pipeline holes two months later, and a schedule built around walk-in rounds.",
  category: "Lead Generation", cluster: "operations", hero: "leads", mins: 8,
  tags: ["Operations", "Prospecting", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "The reason prospecting routines matter is a delay, not a discipline problem. **A week you do not prospect shows up as an empty month sixty to ninety days later**, by which point you have forgotten which week caused it and concluded the market got harder.",
      "That lag is why this needs to be a schedule rather than an intention, and why the only routine worth building is one that survives the weeks when you are busy — because those are precisely the weeks it gets skipped.",
    ]},

    { type: "h2", id: "why-fails", text: "Why the standard advice does not fit" },
    { type: "prose", text: [
      "The disciplined B2B version is two hours of calling every morning at the same time. It is good advice for someone whose prospecting is a phone and a list, and it does not fit this business for three reasons.",
      "**Walking in is time-of-day dependent.** You cannot visit a restaurant at 1pm or a hardware store at 10am. The best hours differ by vertical, so a fixed 9-to-11 block is prospecting at the wrong time for most of your list.",
      "**Delivery arrives in lumps.** A local web project is a week of concentrated work, not a steady trickle, and that week eats every block you had scheduled.",
      "**Travel is real.** Six businesses in one market street is an afternoon. Six businesses scattered across a city is a day and a half. The unit of prospecting here is a cluster, not an hour.",
    ]},

    { type: "h2", id: "week", text: "A weekly prospecting routine that sticks" },
    { type: "prose", text: [
      "The structure that survives is **fixed afternoons, variable everything else** — with the day of the week attached to an area rather than a task, so the round is planned before the week starts.",
    ]},
    { type: "table", head: ["Day", "Morning", "Afternoon"], rows: [
      ["Monday", "Delivery", "List building — next two areas"],
      ["Tuesday", "Delivery", "Round: area A"],
      ["Wednesday", "Delivery", "Follow-ups, WhatsApp, callbacks"],
      ["Thursday", "Delivery", "Round: area B"],
      ["Friday", "Delivery", "Quotes, proposals, mockups"],
    ], note: "Two rounds a week at eight to ten businesses each is roughly 80 conversations a month — the pace that produces the first ten clients in a quarter." },
    { type: "prose", text: [
      "Two afternoons, not five. The number people fail at is not two — it is the ambitious plan they abandon in week three, after which they do none.",
      "Wednesday matters more than it looks. Follow-up is where local sales are actually won, and it is the activity most likely to be squeezed out because it feels less productive than either delivering or prospecting.",
    ]},

    { type: "h2", id: "delivery-weeks", text: "The delivery week problem" },
    { type: "prose", text: [
      "This is the failure mode that actually kills pipelines, and it needs a rule rather than willpower.",
      "**The rule: the rounds do not move for delivery.** A project takes a week longer, or you work a Saturday morning, or the client waits two extra days. All of those are survivable. What is not survivable is the sixty-day hole that appears after two consecutive weeks of skipped rounds, because by then there is nothing to deliver and no conversations underway either.",
      "It feels wrong in the moment. A paying client's work is obviously more urgent than talking to strangers. The lag is what makes that intuition wrong — the client is paid for already, and the afternoon you skip is the November invoice you do not send.",
    ]},
    { type: "quote", text: "The client work is already paid for. The round is next month's invoice.", attribution: "The rule, in one line" },

    { type: "h2", id: "measure", text: "What to count" },
    { type: "prose", text: [
      "Two numbers, weekly, and neither of them is revenue — revenue lags too far to steer with.",
      "**Conversations had.** Not businesses visited. A conversation means you spoke to a decision-maker for more than a minute. Eight to ten a week is a working pace.",
      "**Follow-ups due.** Every conversation ends with a date or it does not exist. This number tells you whether Wednesday is doing its job.",
      "If conversations are healthy and nothing is closing, the problem is the pitch or the qualification. If conversations are low, nothing else in the business is worth diagnosing yet.",
    ]},
    { type: "checklist", items: [
      { title: "Conversations this week", detail: "Target eight to ten. Below four, the routine has quietly stopped." },
      { title: "Follow-ups with a date", detail: "Every conversation produces one or it did not count." },
      { title: "Areas remaining", detail: "When a category in an area is 80% contacted, plan the next one before you need it." },
      { title: "Weeks since a skipped round", detail: "The only leading indicator of a pipeline hole you will actually notice in time." },
    ]},

    { type: "h2", id: "restart", text: "Restarting after a gap" },
    { type: "prose", text: [
      "Everybody stops at some point. The recovery matters more than the lapse.",
      "The mistake is trying to make up the deficit — four rounds next week to compensate for the three you missed. That fails by Wednesday and turns a two-week gap into a two-month one.",
      "Restart at the original pace, in the easiest area on your list, with the follow-ups you already owe people. **The first week back is about the routine existing again, not about the numbers.** The numbers come back on their own by the third week, and the lag means they were always going to.",
    ]},

    { type: "leads", city: "nagpur", heading: "Next week's round" },

    { type: "cta", variant: "map", title: "Plan two afternoons, not five.",
      detail: "Find businesses clustered in one area so a round is eight conversations rather than three.",
      action: "Plan a round", href: "/login" },
  ],
  faqs: [
    { q: "How often should I prospect for web design clients?", a: "Two fixed afternoons a week, each covering eight to ten businesses clustered in one area. That is roughly 80 conversations a month, which is the pace that produces the first ten clients in a quarter." },
    { q: "Why does skipping a week of prospecting matter so much?", a: "Because of the lag. A week you do not prospect shows up as an empty month sixty to ninety days later, by which point you have forgotten the cause and concluded the market got harder." },
    { q: "How do I keep prospecting during a busy delivery week?", a: "Make the rounds the fixed thing and let delivery flex — a project running a week longer is survivable, a sixty-day pipeline hole is not. The client work is already paid for; the round is next month's invoice." },
    { q: "What should I measure weekly?", a: "Conversations had with a decision-maker, and follow-ups with an actual date attached. Revenue lags too far to steer with. If conversations are healthy and nothing closes, the pitch is the problem; if conversations are low, nothing else is worth diagnosing." },
    { q: "How do I restart after stopping for a while?", a: "At the original pace, not a catch-up pace. Trying to run four rounds to make up for three missed ones fails by Wednesday. Start with the easiest area and the follow-ups you already owe — the first week back is about the routine existing again." },
  ],
  links: [["/resources/territory-planning-splitting-a-city-between-reps", "planning the areas"], ["/resources/your-first-10-web-design-clients", "the numbers this pace produces"], ["/resources/call-whatsapp-or-walk-in-indian-smbs", "timing the rounds by vertical"], ["/resources/qualifying-a-local-lead-before-you-call", "building the list for a round"]],
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
