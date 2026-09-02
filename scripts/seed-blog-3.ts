/**
 * Blog 3 — the cold call script.
 *
 * Chosen because it sits on the weakest SERP the research found: Google returned only seven
 * results, four of them near-duplicate URLs from one AI-calling vendor and one a 2015 forum
 * thread. The single good page (getmapleads.io) covers eight objections in ~3,300 words and
 * explicitly omits gatekeepers, pricing, and anything outside the UK/US — which is where this
 * one goes.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

const body: Block[] = [
  { type: "prose", text: [
    "The call that works on a business with no website is not the call that works on a business with a bad one. There is nothing to critique, no screenshot to send, and the owner has usually already decided they don't need one. You are not selling an upgrade — you are arguing with a decision they made years ago.",
    "This is the script we use, the eight things people say back, and what to do when the person answering isn't the owner. Everything below assumes you already have a filtered list; if you don't, [start there](/resources/how-to-find-businesses-that-need-a-website) first.",
  ]},

  { type: "h2", id: "before-you-dial", text: "Two minutes of prep beats a better script" },
  { type: "prose", text: [
    "Open the listing before you dial. You need three facts, and they take about twenty seconds each to find.",
  ]},
  { type: "checklist", items: [
    { title: "Review count and rating", detail: "this is your opener; 200 reviews means a real business and it flatters them to have noticed" },
    { title: "What they actually do", detail: "\"Sector 14, near the petrol pump\" lands differently than \"a business in Gurugram\"" },
    { title: "Whether they run a Facebook or Instagram page", detail: "if they do, the pitch changes completely — see the objections" },
  ]},
  { type: "tip", title: "Call the busy ones first",
    text: "Sort your list by review count, descending. A business with 8 reviews and no website is usually dormant or part-time. A business with 800 reviews and no website is turning away online enquiries every week and has the money to fix it. The second call is a different conversation entirely." },

  { type: "h2", id: "opening", text: "The opening line" },
  { type: "prose", text: [
    "You have about six seconds. Do not introduce your agency, do not say \"how are you today\", and do not ask if it's a good time — it never is.",
  ]},
  { type: "quote", text: "Hello, is this [business name]? I was looking at your Google listing — you've got [X] reviews at [rating] stars, which is genuinely good for [area]. I noticed there's no website linked. Is that deliberate?",
    attribution: "The opener. Note it ends in a question they have an opinion about." },
  { type: "prose", text: [
    "**\"Is that deliberate?\"** is the whole trick. It is not a pitch, so there is nothing to refuse. It assumes competence rather than ignorance, which stops the defensive reaction. And whichever way they answer, they have started talking.",
    "If they say yes, deliberate — you now know the objection and can go straight to it. If they say no, we keep meaning to — you have a warm prospect and you skip the entire persuasion step.",
  ]},

  { type: "h2", id: "gatekeeper", text: "When the person answering isn't the owner" },
  { type: "prose", text: [
    "Roughly half your calls to a shop or clinic are answered by staff. Most scripts skip this entirely, which is odd given how often it happens.",
    "Do not ask for \"the owner\" or \"whoever handles marketing\" — both signal a sales call and get you a voicemail. Ask for the person by what they do.",
  ]},
  { type: "table", head: ["They say", "You say", "Why"], rows: [
    ["\"He's not here\"", "\"No problem — when's he usually in? I'll call back then.\"", "Gets you a time, not a message"],
    ["\"Can I take a message?\"", "\"It's about your Google listing — easier if I explain it directly. What time works?\"", "Specific enough to be passed on, vague enough to need you"],
    ["\"What's it regarding?\"", "\"Your listing shows no website — I wanted to check if that's on purpose.\"", "Honest, and staff often know the answer"],
    ["\"Send an email\"", "\"Sure — is that the one on the listing, or is there a better one?\"", "Confirms an address you can actually use"],
  ]},
  { type: "prose", text: [
    "In India, add one line: ask if there's a WhatsApp number for the business. Staff give it out readily because it is not treated as a personal number, and it moves you to a channel where the owner will actually read you.",
  ]},

  { type: "h2", id: "pitch", text: "The two-minute pitch" },
  { type: "prose", text: [
    "Once you have the owner and they've engaged, you get about two minutes. Spend it on their business, not your services.",
    "**Name what they're losing, specifically.** Not \"you're missing out online\" — say what happens. \"When someone searches [their category] in [their area], the first three results all have websites. Yours is there on Maps, but people click through to a site to check prices and photos before they call.\"",
    "**Then make it small.** The reason most of these calls die is that the owner is imagining a six-month project. \"It's four or five pages — what you do, prices, photos, a contact form and your map. Not a big project. Most of these take about two weeks.\"",
    "**Then stop talking.** The instinct is to keep selling. Don't. Let the silence do the work — they will either object or ask the price, and both are progress.",
  ]},

  { type: "h2", id: "objections", text: "The eight things they say back" },
  { type: "prose", text: [
    "These come up in roughly this order of frequency. The rebuttals are short on purpose — a long answer sounds rehearsed.",
  ]},
  { type: "h3", text: "1. \"We don't need one — we get everything by word of mouth\"" },
  { type: "prose", text: [
    "Agree, then extend. \"That's the best way to get work, honestly. The only thing a site does is catch the ones who were told about you and then went to look you up before calling. Right now those people find your Maps listing and nothing else.\"",
    "Never argue that word of mouth is insufficient. It has worked for them for years and you will lose.",
  ]},
  { type: "h3", text: "2. \"We have a Facebook page\"" },
  { type: "prose", text: [
    "This is the most common one in India and the most commonly fumbled. Do not tell them Facebook isn't a website — they know, and they will hear it as condescension.",
    "\"That's actually most of the work done — you've got the photos and the posts. The gap is that Facebook doesn't show up when someone Googles you, and people can't see your prices without an account. A site is basically the same content in a place Google can read.\"",
  ]},
  { type: "h3", text: "3. \"How much?\"" },
  { type: "prose", text: [
    "Answer it. Deflecting to \"it depends\" reads as expensive and evasive.",
    "Give a band and anchor the low end: \"For what you'd need, ₹15,000 to ₹25,000, one time. Hosting is about ₹3,000 a year after that.\" Then immediately: \"Do you want me to send a couple of examples of what that gets you?\" — which converts a price question into a next step.",
    "If your number is a lot higher than theirs, you will find out now instead of after three meetings.",
  ]},
  { type: "h3", text: "4. \"Send me something on WhatsApp\"" },
  { type: "prose", text: [
    "This is a yes, not a brush-off — but only if you send within the hour, while the call is still in their head. Send three things and nothing else: one screenshot of a similar business's site, the price band you quoted, and a single question. Not a brochure.",
  ]},
  { type: "h3", text: "5. \"Someone's already making one\"" },
  { type: "prose", text: [
    "\"Oh good — how long has that been going?\" Ask it plainly. Half the time the answer is some version of six months and nothing to show, and the conversation reopens on its own. If it's genuinely in progress, thank them and note the listing to re-check in three months.",
  ]},
  { type: "h3", text: "6. \"We tried before and it did nothing\"" },
  { type: "prose", text: [
    "The most useful objection you will hear, because it means they have already spent money on this. \"What happened with it?\" — then actually listen. Usually it was built and never updated, or it never ranked because nobody linked it to the Maps listing. Both are fixable and both are your pitch.",
  ]},
  { type: "h3", text: "7. \"I'm busy — call later\"" },
  { type: "prose", text: [
    "Take the time, don't take the hint. \"Sure — tomorrow morning around eleven?\" A specific slot gets accepted or corrected; \"sometime next week\" gets you nothing.",
  ]},
  { type: "h3", text: "8. \"Not interested\"" },
  { type: "prose", text: [
    "Leave cleanly. \"Fair enough, thanks for your time.\" Then set the listing to re-check in six months. Businesses that refuse in March take the call in September, and an agency that didn't argue is the one they remember.",
  ]},

  { type: "h2", id: "india", text: "What changes in India" },
  { type: "prose", text: [
    "Almost every script published on this is written for the US or UK, and two things do not transfer.",
    "**WhatsApp is the channel, not the follow-up.** A cold call from an unknown number is often ignored outright, but a WhatsApp message on the number listed on the Maps profile gets read. Many of our best conversations start as a message and become a call afterwards, which is the reverse of the usual sequence.",
    "**Switch to Hindi the moment they do.** Not a full script — just don't keep answering in English when they've moved. The single most useful line is the price one: *\"pandrah se pachees hazaar ke beech, ek baar ka. Hosting alag se teen hazaar saal ka.\"* Numbers in Hindi land as normal business talk; the same numbers in English sound like a quote from an agency.",
    "**Timing is different too.** Shops and clinics are unreachable between roughly 1pm and 4pm. Mid-morning works, and so does around 7pm, which most calling guides would tell you never to use.",
  ]},

  { type: "leads", city: "gurgaon", heading: "The kind of list this script is written for" },

  { type: "h2", id: "numbers", text: "What to expect from a session" },
  { type: "prose", text: [
    "Rough figures from calling a filtered list — no-website businesses sorted by review count. Your mileage will differ by city and category, but the shape holds.",
  ]},
  { type: "table", head: ["Metric", "Range", "Note"], rows: [
    ["Calls per two-hour block", "35–50", "less if you're researching each listing properly"],
    ["Someone answers", "50–65%", "higher for shops, lower for trades who are on site"],
    ["Reach the owner", "~half of answered", "the rest is gatekeeper, see above"],
    ["Real interest", "5–10%", "of the calls that reach an owner"],
    ["Follow-up scheduled", "3–6 per session", "this is the number that actually matters"],
  ], note: "Calls that end in a scheduled callback are the only useful measure. Counting dials rewards speed, which is the wrong instinct here." },
  { type: "prose", text: [
    "Two hours, well filtered, should produce three to six real follow-ups. If you're getting none, the problem is almost always the list rather than the script — you are calling businesses too small to buy.",
  ]},

  { type: "cta", variant: "map", title: "The script only works on the right list.",
    detail: "Find businesses with no website in your area, sorted by review count, so the calls you make are the ones worth making.",
    action: "Build your call list", href: "/login" },
];

const faqs = [
  { q: "Does cold calling still work for selling websites?",
    a: "For local businesses, yes — better than email. Businesses with no website usually have no listed email either, so the phone number on their Maps listing is often the only contact that exists. In India, a WhatsApp message on that same number works even better." },
  { q: "What do you say first on a cold call to a business with no website?",
    a: "Reference their Google listing and review count, note that no website is linked, and ask whether that is deliberate. It is a question rather than a pitch, so there is nothing to refuse, and their answer tells you which objection you are dealing with." },
  { q: "How do I get past the person who answers the phone?",
    a: "Do not ask for \"the owner\". Ask when they are usually in and offer to call back then, or say plainly that you are calling about their Google listing showing no website. Staff often know the answer and will pass on something specific." },
  { q: "Should I give a price on the first call?",
    a: "Yes. Deflecting reads as expensive. Give a band, anchor the low end, and immediately offer to send examples — that converts the price question into a next step instead of an ending." },
  { q: "How many calls does it take to get a client?",
    a: "From a filtered list of no-website businesses sorted by reviews, expect three to six scheduled follow-ups from a two-hour session, and a handful of those to convert. If you are getting no follow-ups at all, the list is usually the problem, not the script." },
  { q: "Is it better to call or message on WhatsApp in India?",
    a: "Message first, then call. Cold calls from unknown numbers are frequently ignored, but a WhatsApp message on the number listed on the Maps profile gets read, and the call afterwards is answered because they know who you are." },
];

async function main() {
  const slug = "cold-call-script-selling-websites-local-businesses";
  await sql`
    INSERT INTO blog_posts (
      slug, title, excerpt, meta_description, category, cluster, tags, author_slug,
      hero_variant, read_minutes, body, faqs, status, featured, published_at, content_updated_at
    ) VALUES (
      ${slug},
      ${"Cold Call Script for Selling Websites to Local Businesses"},
      ${"The call that works on a business with no website is not the one that works on a business with a bad one. Here is the opener, the eight objections, the gatekeeper, and what changes in India."},
      ${"A cold call script for selling websites to businesses with no site: the opener, eight objections word for word, and what changes in India."},
      ${"Outreach"}, ${"operations"},
      ${["Outreach", "Sales Playbook", "Cold Calling", "India"]},
      ${"tarun"}, ${"nearby"}, ${11},
      ${sql.json(body as unknown as Parameters<typeof sql.json>[0])},
      ${sql.json(faqs as unknown as Parameters<typeof sql.json>[0])},
      ${"published"}, ${false}, ${new Date(Date.now() - 900_000)}, ${null}
    )
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, meta_description = EXCLUDED.meta_description,
      category = EXCLUDED.category, cluster = EXCLUDED.cluster, tags = EXCLUDED.tags,
      hero_variant = EXCLUDED.hero_variant, read_minutes = EXCLUDED.read_minutes,
      body = EXCLUDED.body, faqs = EXCLUDED.faqs, updated_at = now()
  `;
  await sql`DELETE FROM blog_links WHERE from_slug = ${slug}`;
  for (const [i, l] of [
    { href: "/resources/how-many-local-businesses-have-no-website", anchor: "how many businesses actually have no website", kind: "hub" },
    { href: "/resources/how-to-find-businesses-that-need-a-website", anchor: "building the list this script needs", kind: "sibling" },
    { href: "/leads/website-development/in/gurgaon", anchor: "no-website businesses in Gurugram", kind: "lead_page" },
  ].entries()) {
    await sql`INSERT INTO blog_links (from_slug, to_href, anchor, kind, position) VALUES (${slug}, ${l.href}, ${l.anchor}, ${l.kind}, ${i})`;
  }
  console.log("seeded:", slug);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
