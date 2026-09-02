/**
 * Batch 2 — six posts.
 *
 * Order follows the SERP research: the weakest results first. WhatsApp outreach and the
 * Facebook-page objection have essentially no competition; the two vertical playbooks go into a
 * space held by five thin SiteSwan pages; the Apollo comparison targets the highest-conviction
 * buyer we found; the category-rate post carries the finding that contradicts every niche list.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type Post = {
  slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][];
};

const posts: Post[] = [
/* ────────────────────────────────────────────────────────── 1 */
{
  slug: "whatsapp-outreach-local-business-india",
  title: "WhatsApp Outreach Scripts for Local Businesses in India",
  excerpt: "Cold email does not reach a business with no website — they usually have no listed email either. WhatsApp does. Here are the messages, the timing, and the mistakes that get you blocked.",
  meta: "WhatsApp scripts for pitching web design to Indian local businesses: the first message, follow-ups, timing, and what gets you blocked.",
  category: "Outreach", cluster: "operations", hero: "nearby", mins: 9,
  tags: ["Outreach", "India", "WhatsApp", "Sales Playbook"],
  body: [
    { type: "prose", text: [
      "Every outreach script you will read was written for a market where email works. In India, for the local businesses worth pitching, it mostly does not — and for the specific segment that has no website, there is often no email address to send to in the first place.",
      "The number on their Google listing is the contact that exists. On that number, a WhatsApp message gets read where a call gets ignored and an email was never delivered.",
    ]},
    { type: "h2", id: "why", text: "Why WhatsApp is not a preference here, it is the only channel" },
    { type: "prose", text: [
      "A business with no website has no domain, so it has no professional email address. What it has is a mobile number on its Maps listing, and that number is almost always the owner's.",
      "That single fact reorders everything. Cold email tooling — sequences, warm-up, deliverability — is built for a contact record you do not have. Meanwhile the channel you do have reaches the decision-maker directly, with read receipts, on a device they check constantly.",
    ]},
    { type: "checklist", items: [
      { title: "No website means no email", detail: "the two absences travel together far more often than agencies expect" },
      { title: "The Maps number is the owner", detail: "in a business of two to ten people it is rarely a switchboard" },
      { title: "Read, not delivered", detail: "you find out within minutes whether the message landed" },
      { title: "It survives the follow-up", detail: "the thread persists; an unanswered call leaves nothing behind" },
    ]},
    { type: "h2", id: "first-message", text: "The first WhatsApp message, word for word" },
    { type: "prose", text: [
      "Short, specific, and ending in a question they can answer in three words. Long messages read as a broadcast and get ignored — which is why the scripts below are two sentences, not two paragraphs.",
    ]},
    { type: "quote", text: "Hello — I saw your Google listing for [business]. 240 reviews at 4.4 is genuinely good. I noticed there's no website linked to it. Is that deliberate, or just something that never got done?",
      attribution: "The opener. Same logic as the phone script: it is a question, not a pitch." },
    { type: "prose", text: [
      "Three things are doing work here. Naming their review count proves you looked rather than blasted. **\"Is that deliberate?\"** gives them something easy to reply to. And offering the second option — *just something that never got done* — lets them agree without admitting oversight, which is most of the reason people reply at all.",
    ]},
    { type: "h2", id: "after", text: "What to send after they reply" },
    { type: "prose", text: [
      "Almost every reply is one of three things, and each has a next message.",
    ]},
    { type: "table", head: ["They reply", "You send", "Why"], rows: [
      ["\"Never got done\"", "One screenshot of a similar business's site + a price band", "They have already agreed; skip the persuasion"],
      ["\"We have Instagram\"", "\"That covers the photos. The gap is Google — people search, find your listing, and there's nowhere to go.\"", "Adds to what they built rather than dismissing it"],
      ["\"How much?\"", "A band, then \"want me to send two examples?\"", "Turns a price question into a next step"],
      ["\"Not interested\"", "\"No problem — I'll leave it. Best of luck.\"", "The clean exit is what makes a re-approach possible in six months"],
    ]},
    { type: "h2", id: "timing", text: "Timing, which matters more than the copy" },
    { type: "prose", text: [
      "Shops and clinics are unreachable between roughly 1pm and 4pm. Messages sent then get buried under whatever arrives while they are busy, and a buried message is a dead one.",
      "**Mid-morning, around 11am**, is the best window. **Evening, around 7pm**, is the second — most Western calling guides would tell you never to use it, and in India it works because the owner is finally sitting down.",
      "Never send on a Sunday. It reads as automated, because no person messages a stranger about business on a Sunday.",
    ]},
    { type: "tip", title: "One message, then stop",
      text: "Send the opener and wait. If there is no reply in two days, send exactly one follow-up and then leave it. A third message is what gets your number reported, and a reported number costs you the channel for every future prospect, not just this one." },
    { type: "h2", id: "mistakes", text: "What gets you blocked" },
    { type: "checklist", items: [
      { title: "Identical text to many numbers", detail: "WhatsApp's spam detection reads volume and similarity together" },
      { title: "Opening with a file", detail: "a brochure from an unknown number is deleted unread" },
      { title: "Links in the first message", detail: "send them after they reply, never before" },
      { title: "Messaging outside 10am–8pm", detail: "the fastest way to be reported" },
      { title: "Using a personal number", detail: "use a WhatsApp Business profile — the name and category alone raise reply rates" },
    ]},
    { type: "h2", id: "who", text: "Which local businesses to message first" },
    { type: "prose", text: [
      "The list decides the reply rate more than the copy does. Three filters, applied before you write anything.",
      "**Review count above fifty.** A business with eight reviews and no website is usually part-time or dormant; the message goes unread because the number belongs to someone who is not really running a business. Above fifty reviews you are messaging an operator with customers.",
      "**Rating above four.** A badly-rated business has a problem that a website will not fix, and they know it. The conversation goes somewhere you cannot help with.",
      "**Category with a real gap.** Messaging dentists about a first website wastes your time — nine in ten already have one. Hardware stores, guest houses and tailors are where the gap actually is, and [the category breakdown](/resources/which-business-types-least-likely-to-have-a-website) has the rates.",
    ]},
    { type: "h2", id: "hindi", text: "Writing the message in Hindi" },
    { type: "prose", text: [
      "If their listing name, reviews or posts are in Hindi, write in Hindi. Not translated-English Hindi — the way you would actually message someone.",
      "The price line is where this matters most. *\"Pandrah se pachees hazaar, ek baar ka. Hosting alag se teen hazaar saal ka\"* reads as normal business talk. The same numbers in English read as a quote from an agency, and invite a negotiation rather than an answer.",
      "The opener translates cleanly: *\"Aapki Google listing dekhi — 240 reviews, 4.4 rating, achha hai. Website link nahi dikhi. Jaan-boojhkar nahi banayi, ya bas reh gaya?\"* Same structure, same question at the end.",
    ]},
    { type: "leads", city: "gurgaon", heading: "The kind of number worth messaging" },
    { type: "h2", id: "scale", text: "Running WhatsApp outreach at any real volume" },
    { type: "prose", text: [
      "Thirty to forty messages a day is the ceiling for one person doing this properly — which means reading each listing before writing. Beyond that the personalisation goes, and without it the reply rate collapses to the point where the extra volume gains you nothing.",
      "Expect somewhere between one in six and one in ten to reply. That is far above cold email in this market, and it is the entire argument for the channel.",
    ]},
    { type: "cta", variant: "map", title: "Start from numbers that are worth messaging.",
      detail: "Businesses with no website, sorted by review count — so the first message goes to someone who already has customers.",
      action: "Find leads near you", href: "/login" },
  ],
  faqs: [
    { q: "Is WhatsApp outreach legal for B2B in India?", a: "Messaging a business number that a business has published publicly on its own Google listing is ordinary business contact. What matters in practice is behaviour: personalise, respect hours, stop after one follow-up. Bulk-identical messaging is what triggers reports and bans." },
    { q: "Should I use WhatsApp Business or a personal number?", a: "Business. The profile shows your name, category and description before they read a word, which raises reply rates, and it keeps your personal number out of it if a prospect reports you." },
    { q: "What time should I send messages?", a: "Mid-morning around 11am works best; early evening around 7pm is second. Avoid 1–4pm entirely — shops and clinics are busy and your message gets buried. Never Sunday." },
    { q: "How many follow-ups should I send?", a: "One. Send the opener, wait two days, send a single follow-up, then leave it. A third message is what gets your number reported, and that costs you the channel for every future prospect." },
    { q: "Does this work better than cold email?", a: "For local businesses with no website, substantially — mostly because those businesses usually have no listed email at all. The comparison is not between two channels; it is between one that reaches them and one that does not." },
  ],
  links: [["/resources/cold-call-script-selling-websites-local-businesses", "the phone version of this script"], ["/resources/we-already-have-a-facebook-page-objection", "handling the Facebook page objection"], ["/leads/website-development/in/gurgaon", "no-website businesses in Gurugram"]],
},
/* ────────────────────────────────────────────────────────── 2 */
{
  slug: "we-already-have-a-facebook-page-objection",
  title: "Handling the \"We Already Have a Facebook Page\" Objection",
  excerpt: "The most common objection in India, and the one agencies fumble worst. Telling them Facebook is not a website loses the sale. Here is what to say instead.",
  meta: "How to handle the \"we have a Facebook page\" objection when selling websites to local businesses — what not to say, and the reframe that works.",
  category: "Outreach", cluster: "operations", hero: "network", mins: 7,
  tags: ["Outreach", "Objection Handling", "Sales Playbook"],
  body: [
    { type: "prose", text: [
      "\"We already have a Facebook page.\" In India this is the objection you will hear most, and it is the one most agencies answer badly — usually by explaining that a Facebook page is not a website.",
      "They know. They are not confused about the difference. What they are telling you is that they already solved this problem, and your job is to show them which part is still unsolved without implying they were foolish.",
    ]},
    { type: "h2", id: "wrong", text: "Why handling it the obvious way loses the sale" },
    { type: "prose", text: [
      "\"A Facebook page isn't really a website\" is true and useless. It contradicts a decision they made, offers nothing in return, and lands as condescension — which ends the conversation whether or not they say so.",
      "Worse, it is strategically wrong. A business with an active Facebook page is a **better** prospect than one with nothing, not a worse one. They have already accepted they should be findable online. They have already produced photos and posts. Someone has already done the hard part of persuading them that this matters.",
    ]},
    { type: "quote", text: "The business with a Facebook page has already bought the argument. You are not selling them on being online — you are selling them the half that Facebook cannot do.",
      attribution: "The reframe this whole objection turns on" },
    { type: "h2", id: "right", text: "What to say instead" },
    { type: "prose", text: [
      "Agree first, and mean it. Then name one specific thing the page cannot do — not three, one.",
    ]},
    { type: "table", head: ["Their situation", "The specific gap to name"], rows: [
      ["Active page, good photos", "\"When someone Googles you, the page barely shows. That search traffic goes to whoever ranks.\""],
      ["They post offers regularly", "\"Anyone who isn't already following you never sees those.\""],
      ["They take enquiries in DMs", "\"That works until you're busy. A page with prices answers the same question without you.\""],
      ["Page has few followers", "\"The page only reaches people who found you already. Search reaches people who haven't.\""],
    ]},
    { type: "prose", text: [
      "Then stop. The instinct is to list every advantage a website has; resist it. One concrete gap is arguable and specific. Five is a pitch, and a pitch invites a defence.",
    ]},
    { type: "h2", id: "position", text: "Position it as addition, not replacement" },
    { type: "prose", text: [
      "Never propose that they leave Facebook. It is where their customers are and where their content already lives, and suggesting otherwise makes you sound like you do not understand their business.",
      "The line that works: **\"Keep the page exactly as it is. The site is just so Google has something to send people to.\"** It costs them nothing they already have, and it reframes the website as plumbing rather than a competing project.",
    ]},
    { type: "h2", id: "instagram", text: "The Instagram variant" },
    { type: "prose", text: [
      "\"We have Instagram\" is the same objection with one extra wrinkle: Instagram allows a single link, and they usually already know that link is doing work. Say so — \"you've got one link in your bio, and right now it goes nowhere\" — and you are describing a gap they have already noticed themselves.",
      "For restaurants and salons specifically, add the menu or price list. It is the single most-asked question in their DMs, and the fastest thing a site removes from their day.",
    ]},
    { type: "h2", id: "why-it-comes", text: "Why this objection is so common in India specifically" },
    { type: "prose", text: [
      "Facebook and Instagram reached Indian small businesses before websites did, and they arrived free. A shop owner who set up a page in 2018 has had seven years of it working well enough — customers message, photos get seen, offers reach followers.",
      "So the objection is not resistance to being online. It is a report that the problem was already solved once, cheaply. Any response that ignores that history sounds like it came from someone who has not looked at their business.",
      "There is a second reason worth knowing. Many were sold a website years ago by someone who built it, took payment, and never touched it again. \"We already have Facebook\" is sometimes a polite version of \"the last person who sold me this disappeared.\" If you hear any hint of that, stop pitching and ask what happened — it is the most useful thing they can tell you.",
    ]},
    { type: "h2", id: "proof", text: "Show it rather than argue it" },
    { type: "prose", text: [
      "The fastest way to end this objection is to stop talking and search. Google their category and area on your own phone while you are with them, and show the results.",
      "Their Facebook page will not be there. Three competitors with websites will be. That is one search, ten seconds, and no counter-argument — which is why it beats every sentence you could construct.",
      "If they are not in front of you, describe it instead of claiming it: \"Search [category] in [their area] — the first three all have sites. Your Maps listing is there, but there's nowhere for people to go from it.\"",
    ]},
    { type: "leads", city: "gurgaon", heading: "Businesses this objection comes from" },
    { type: "h2", id: "walk", text: "When to let it go" },
    { type: "prose", text: [
      "If they push back twice, stop. A business genuinely happy with a Facebook-only presence is not going to be argued out of it on a first call, and pushing converts a possible future customer into someone who remembers you as pushy.",
      "\"Fair enough — if it ever comes up, you know where I am.\" Then re-check the listing in six months. Businesses that refuse in March take the call in September more often than you would expect.",
    ]},
    { type: "cta", variant: "map", title: "Find the ones already online, just not on a site.",
      detail: "Businesses with a live listing, real reviews, and no website — the ones who already believe being findable matters.",
      action: "Find leads near you", href: "/login" },
  ],
  faqs: [
    { q: "Is a Facebook page enough for a small business?", a: "For reaching existing customers, often yes. What it cannot do is appear in Google search results, be read without an account, or answer price and hours questions without someone replying in DMs. That gap is what a site fills." },
    { q: "How do I respond when a business says they only use Facebook?", a: "Agree that it works, then name one specific thing it cannot do — usually that they are invisible in search. One concrete gap, not a list. And propose the site as an addition, never a replacement." },
    { q: "Are Facebook-only businesses good prospects?", a: "Better than businesses with no presence at all. They have already accepted that being findable matters and have already produced content, so the persuasion step is done." },
    { q: "What if they say Instagram instead?", a: "Same objection, and the bio link makes it easier — they usually already know that single link matters. For restaurants and salons, the menu or price list is the strongest specific hook." },
  ],
  links: [["/resources/cold-call-script-selling-websites-local-businesses", "the full cold call script"], ["/resources/whatsapp-outreach-local-business-india", "the WhatsApp version of this conversation"], ["/resources/which-business-types-least-likely-to-have-a-website", "which categories have the biggest gap"]],
},
/* ────────────────────────────────────────────────────────── 3 */
{
  slug: "which-business-types-least-likely-to-have-a-website",
  title: "Which Business Types Are Least Likely to Have a Website",
  excerpt: "Every niche listicle ranks verticals by what they can pay and never checks whether the gap exists. We measured 152,311 businesses. Dentists — on every list — have almost no gap at all.",
  meta: "Which business types actually lack websites, measured across 152,311. Guest houses 73%, dentists 11% — and why every niche list gets this wrong.",
  category: "Website Gaps", cluster: "data", hero: "methodology", mins: 8,
  tags: ["Original Data", "Website Gaps", "Niche Selection"],
  body: [
    { type: "prose", text: [
      "The business types least likely to have a website are not the ones on any published niche list. Open one and dental practices will be near the top; law firms, medical clinics and car dealers will be there too.",
      "Those lists rank verticals by **ability to pay**, and none of them checks how likely that business type is to actually lack a website. We measured exactly that across 152,311 local businesses, and the two rankings barely overlap.",
    ]},
    { type: "h2", id: "highest", text: "The business types least likely to have a website" },
    { type: "table", head: ["Category", "Checked", "No website", "Rate"], rows: [
      ["Guest houses", "740", "543", "73.4%"],
      ["Fast food outlets", "972", "700", "72.0%"],
      ["Hardware stores", "2,098", "1,405", "67.0%"],
      ["Farms", "728", "483", "66.3%"],
      ["Tailors", "1,546", "1,015", "65.7%"],
      ["Convenience stores", "1,385", "820", "59.2%"],
      ["Plumbers", "1,164", "653", "56.1%"],
      ["Swimming pool services", "722", "399", "55.3%"],
      ["Electricians", "1,244", "677", "54.4%"],
      ["Car washes", "1,666", "900", "54.0%"],
    ], note: "Minimum 600 businesses checked per category. Generic catch-all categories excluded." },
    { type: "prose", text: [
      "Not one of these appears on a typical best-niches list. Tailors and hardware stores in particular are invisible in that literature, and both sit around two-thirds with no site at all.",
    ]},
    { type: "h2", id: "lowest", text: "The business types most likely to already have one" },
    { type: "table", head: ["Category", "Checked", "No website", "Rate"], rows: [
      ["Moving companies", "898", "94", "10.5%"],
      ["Dentists", "1,465", "158", "10.8%"],
      ["Skin care clinics", "1,208", "145", "12.0%"],
      ["Jewellery stores", "1,744", "234", "13.4%"],
      ["Preschools", "1,644", "230", "14.0%"],
      ["Car dealers", "1,873", "265", "14.1%"],
    ]},
    { type: "prose", text: [
      "**Dentists have the second-lowest gap of any category we track.** Nine in ten already have a site. So does the car dealer, and so does the jewellery store — three verticals that appear on nearly every niche recommendation.",
    ]},
    { type: "h2", id: "not-wrong", text: "This does not make them bad niches" },
    { type: "prose", text: [
      "It makes them bad *first-website* niches, which is a different claim.",
      "A dentist with an existing site is still a good customer — for a redesign, for SEO, for a maintenance retainer. But that is a slower sale into an existing relationship, competing against whoever built the current site and whoever maintains it. The pitch, the objections and the sales cycle are all different from walking into a hardware store that has never had one.",
      "The mistake is not picking dentists. The mistake is picking dentists after reading a list that promised an easy first-website market, and then discovering the market is nine-tenths taken.",
    ]},
    { type: "tip", title: "Rank on two axes, not one",
      text: "Ticket size tells you what a client is worth. Gap rate tells you how many are available. A vertical needs a decent score on both — high rate and low ticket is volume work, low rate and high ticket is redesign work, and only you know which business you want to run." },
    { type: "h2", id: "read", text: "How to read the two tables together" },
    { type: "table", head: ["Gap rate", "Ticket size", "What you are selling", "Example"], rows: [
      ["High", "Medium–high", "First website — fastest close", "Hardware stores, plumbers, guest houses"],
      ["High", "Low", "Volume, productised packages", "Tailors, convenience stores"],
      ["Low", "High", "Redesign and retainers — slower", "Dentists, car dealers, jewellers"],
      ["Low", "Low", "Avoid", "—"],
    ]},
    { type: "h2", id: "why-gap", text: "Why some business types have no website and others all do" },
    { type: "prose", text: [
      "The pattern is not about money or sophistication. Hardware stores and jewellers sit at opposite ends of this table and both are ordinary retail businesses with similar revenue.",
      "What separates them is **whether the customer researches before arriving**. Nobody compares three jewellers' websites before buying a chain, but they do look — jewellery is a considered purchase and the shop knows it. Nobody researches a hardware store at all; you go to the nearest one. So the hardware store never felt the absence.",
      "The same logic explains the clinical categories. Dentists and skin care clinics are chosen after looking, so they built sites. Plumbers and electricians are called when something breaks, and the customer takes the first number that answers.",
      "This matters for the pitch, not just the targeting. Selling a website to a hardware store means arguing that the customer behaviour is changing — that people now search before they drive. That is a harder conversation than selling to a category that already believes it, and you should price the effort accordingly.",
    ]},
    { type: "leads", city: "gurgaon", heading: "What the high-gap categories look like" },
    { type: "h2", id: "method", text: "How this was measured" },
    { type: "prose", text: [
      "152,311 local businesses across 37 cities and five countries, checked for the presence of a website on their live listing rather than surveyed. Categories with fewer than 600 businesses checked are excluded, because below that the rate moves too much to quote.",
      "Full method and the country-level breakdown are in [the main report](/resources/how-many-local-businesses-have-no-website), including what this data cannot tell you.",
    ]},
    { type: "cta", variant: "map", title: "Check the gap in your own market.",
      detail: "These are national rates. Your city will differ, and the difference is the only number that matters to your pipeline.",
      action: "Search your area", href: "/login" },
  ],
  faqs: [
    { q: "Which business type is least likely to have a website?", a: "In our index, guest houses (73.4%), fast food outlets (72.0%) and hardware stores (67.0%) have the highest share with no website. Moving companies (10.5%) and dentists (10.8%) have the lowest." },
    { q: "Are dentists a good web design niche?", a: "Not for first websites — only about one in nine has no site. They remain a good niche for redesigns, SEO and retainers, which is a slower sale into an existing relationship." },
    { q: "Why do the published niche lists disagree with this?", a: "They rank verticals by ability to pay and do not measure whether the gap exists. Both matter: ticket size tells you what a client is worth, gap rate tells you how many are available." },
    { q: "How was this measured?", a: "By checking whether a website is present on the live listing for 152,311 businesses across 37 cities, rather than asking owners. Categories below 600 businesses checked are excluded." },
  ],
  links: [["/resources/how-many-local-businesses-have-no-website", "the full website gap report"], ["/leads/website-development/in/gurgaon", "high-gap businesses in Gurugram"]],
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
        ${"published"}, ${false}, ${new Date(Date.now() - 600_000)})
      ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, excerpt=EXCLUDED.excerpt,
        meta_description=EXCLUDED.meta_description, category=EXCLUDED.category,
        cluster=EXCLUDED.cluster, tags=EXCLUDED.tags, hero_variant=EXCLUDED.hero_variant,
        read_minutes=EXCLUDED.read_minutes, body=EXCLUDED.body, faqs=EXCLUDED.faqs, updated_at=now()
    `;
    await sql`DELETE FROM blog_links WHERE from_slug = ${p.slug}`;
    for (const [i, [href, anchor]] of p.links.entries()) {
      await sql`INSERT INTO blog_links (from_slug, to_href, anchor, kind, position)
                VALUES (${p.slug}, ${href}, ${anchor}, ${href.startsWith("/leads") ? "lead_page" : "sibling"}, ${i})`;
    }
    console.log("  ✓", p.slug, `(title ${p.title.length}, meta ${p.meta.length})`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
