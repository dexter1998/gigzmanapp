/**
 * Batch 30 — "how to get clients for <service>", for sellers of that service.
 *
 * Nine posts in the growth cluster, one per service line Mantis users actually sell: digital
 * marketing, SEO, CRM, bookkeeping, accounting/CA, commercial photography, commercial interiors,
 * app/software development and managed IT/cloud. Each one names the buyer, the buying signals the
 * product can really detect for that buyer (only ids from lib/v2/playbooks.ts SIGNALS), the
 * channels with honest trade-offs, an outreach example and packaging advice.
 *
 * Every post links up to the hub (/resources/how-to-find-clients) and sideways to two siblings in
 * this batch, so none of them is an orphan even before the hub is published.
 *
 * Hero images reuse existing thumbnails (no thumbnail is used by more than one post in this batch).
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  heroImage: string; heroAlt: string;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const HUB: [string, string] = ["/resources/how-to-find-clients", "the full guide to finding clients"];

export const posts: P[] = [
/* ───────────────────────────── 1 · digital marketing */
{
  slug: "digital-marketing-leads",
  title: "Digital Marketing Leads: How to Get Clients That Pay",
  excerpt: "The businesses most likely to buy digital marketing are not the ones with no presence at all. They are the ones spending money they cannot measure. How to find them and what to say.",
  meta: "Digital marketing leads that convert: which businesses buy, the tracking gaps that show they need help, where to find them and a cold email you can adapt.",
  category: "Client Acquisition", cluster: "growth", hero: "leads", mins: 9,
  heroImage: "/resources/thumbs/why-tech-stack-filtering-misses-your-best-prospects.webp",
  heroAlt: "Flat illustration of a funnel sorting local shops into a short list of qualified prospects",
  tags: ["Client Acquisition", "Digital Marketing", "Prospecting"],
  body: [
    { type: "prose", text: [
      "The best digital marketing leads are businesses that already spend on marketing and cannot tell what it returns. **A clinic boosting Instagram posts with no Meta pixel on its site, or a showroom whose website carries no analytics tag, is a far warmer prospect for digital marketing clients than a shop with no online presence at all**, because the budget exists and the problem is visible on their own homepage.",
      "That reframes the usual approach. Most agencies prospect by category — every dentist, every gym — and then try to discover need on the call. It works better the other way round: start from evidence of need, then filter by the categories you can serve well.",
    ]},

    { type: "h2", id: "who-buys", text: "Who actually buys digital marketing" },
    { type: "prose", text: [
      "Digital marketing is bought by businesses whose customers search or scroll before they choose, and whose average sale is large enough that a handful of extra customers a month pays your retainer. That rules out more businesses than people expect.",
      "**A tea stall does not buy digital marketing at any price**, because its customers walk past. A cosmetic clinic, a coaching institute, a furniture showroom, a real estate developer or a wedding venue does, because each customer is worth thousands and each one compared options online first.",
      "Size matters in a specific way. Owner-run businesses with one location buy a fixed monthly package and judge it on phone calls. Businesses with several branches or a marketing hire buy campaigns and judge them on cost per lead. The second group pays more, churns less and asks harder questions — so decide which one you are built for before you build a list.",
    ]},
    { type: "table", head: ["Buyer", "Typical size", "Why they buy", "What they judge you on"], rows: [
      ["Clinics, dental and cosmetic", "1–3 locations", "High value per patient, patients compare online", "Booked appointments"],
      ["Coaching institutes", "1–5 centres", "Admission season is a hard deadline", "Enquiries in season"],
      ["Furniture, interiors, home decor", "Showroom-led", "Large tickets, long consideration", "Showroom visits and calls"],
      ["Real estate developers and brokers", "Project-led", "One sale pays for months of marketing", "Qualified site visits"],
      ["Restaurants and cafes", "Single outlet to small chains", "Footfall and delivery orders", "Covers, orders, reviews"],
      ["D2C brands on Shopify", "Founder-led", "Revenue is entirely online", "Return on ad spend"],
    ], note: "Illustrative segments, not measured shares. The right column is what decides renewals." },

    { type: "h2", id: "signals", text: "Buying signals that mark good digital marketing clients" },
    { type: "prose", text: [
      "Each of these is something Mantis can check on a business's own website or Google listing, so you can search for it directly rather than guessing. Absence of a tag on the homepage is strong evidence, not proof — a business can track on a different page or through a partner — so treat each as a reason to look, then confirm before you pitch.",
    ]},
    { type: "checklist", items: [
      { title: "Running Meta or Google ads", detail: "Active ads in the public ad libraries mean a budget already exists. Your pitch is efficiency, not persuasion." },
      { title: "No analytics on the website", detail: "No Google Analytics or Tag Manager. They cannot see which channel sends customers, which is the easiest problem to demonstrate." },
      { title: "No Meta pixel or Google Ads tag", detail: "Ads without a conversion tag are optimised for clicks rather than customers. Pair this with the ads signal and you have a specific, checkable claim." },
      { title: "Weak or missing Instagram", detail: "Fewer than 1,000 followers or 30 posts, or no Instagram linked from the site at all — relevant if you sell social media management." },
      { title: "Google listing incomplete", detail: "Missing hours, under five photos, or no website on the listing. Local visibility work is a natural first project." },
      { title: "Several branches", detail: "Two or more listings under the same name. Multi-location businesses need consistent campaigns and usually have a larger budget." },
      { title: "Hiring for marketing roles", detail: "A careers page listing a marketing executive tells you the function is being built — and that an agency may be cheaper than the second hire." },
    ]},
    { type: "cta", variant: "table", title: "Find businesses running ads with no tracking.",
      detail: "Describe what you sell and the city — Mantis checks each business's site for analytics, Meta pixel and Google Ads tags and lists the ones missing them.",
      action: "Search for digital marketing leads", href: "/login" },

    { type: "h2", id: "where", text: "Where digital marketing leads come from" },
    { type: "prose", text: [
      "**Referrals from existing clients** close fastest and cost nothing, but they arrive in the categories you already serve and at the rate your clients happen to talk. They are a result of good work, not a plan.",
      "**Freelance marketplaces** bring volume and low prices. Buyers there compare you against offshore rates and often want a one-off campaign, not a retainer. Useful for a portfolio in your first year; a trap after that.",
      "**Bought lead lists** go stale quickly and rarely include the one thing you need — whether the business is spending on marketing. A list of every restaurant in a city tells you nothing about which ones have a budget.",
      "**Signal-based prospecting** starts from public evidence: the ad libraries, the website's own source, the Google listing. It is slower to set up and produces smaller lists, but every name on it has a reason to talk to you, which is what makes cold outreach work at all.",
      "**Partnerships** with web developers, photographers and printing firms who serve the same businesses but do not sell marketing. One good partner can be worth more than a month of cold outreach, and the referral arrives warm.",
    ]},

    { type: "h2", id: "outreach", text: "What to say: an outreach example" },
    { type: "prose", text: [
      "The message has one job: show you looked at their business specifically, name one problem they can verify in a minute, and ask for a short conversation. Do not attach a deck and do not list services.",
      "**Subject:** Your Instagram ads and the website",
      "“Hi Dr Mehra — I noticed your clinic is running ads on Instagram for the whitening offer, but your website has no Meta pixel, so Instagram cannot tell which ad brought a patient who later booked. That usually means the budget drifts towards whatever gets likes. I can show you in ten minutes what the fix looks like and what you would be able to see afterwards. Would Thursday work?”",
      "Every claim in that message is checkable, which is why it gets replies. If the business turns out to track in some other way, you have lost nothing and you have opened a conversation with someone who knows what a pixel is.",
      "On channel: email works for businesses that list one, which is mostly the larger ones. For owner-run businesses, a phone call or a WhatsApp message to the listed number usually reaches the decision-maker faster. Follow up two or three times over two weeks, each time with something new — a screenshot, a competitor's ad, one specific idea.",
    ]},

    { type: "h2", id: "pricing", text: "Pricing and packaging that keeps clients" },
    { type: "prose", text: [
      "Many digital marketing clients leave within the first few months, when the novelty has gone and the results are ambiguous. Packaging is mostly about preventing that.",
      "**Sell a fixed-scope first project before a retainer.** Setting up tracking, fixing the Google listing, or rebuilding one landing page has a visible finish. It earns the right to propose the monthly work, and the client sees you deliver before they commit.",
      "**Separate your fee from ad spend.** Quote a management fee and let the client pay the platforms directly. Percentage-of-spend pricing rewards you for spending more, which clients notice.",
      "**Report on the one number they care about** — calls, bookings, enquiries — and only then on reach and clicks. If you cannot measure their number, the first project is making it measurable.",
    ]},
    { type: "tip", title: "Lead with the tracking audit",
      text: "A free fifteen-minute review of what a business can and cannot measure is the lowest-friction offer in this market. It is specific to them, it costs you little, and it ends with a list of fixes that is your proposal." },

    { type: "h2", id: "qualify", text: "Qualifying a digital marketing lead before the call" },
    { type: "prose", text: [
      "A signal gets a business onto your list. Three questions decide whether it stays there, and most can be answered in five minutes before you make contact.",
      "**Is the average sale large enough?** If a new customer is worth less than a few hundred rupees, your fee needs dozens of extra customers a month to pay back, and that is a promise you should not make. A clinic, a coaching institute or a showroom passes this test easily; a single kirana store usually does not.",
      "**Does somebody own marketing?** In owner-run businesses it is the owner, which is fine. In larger ones, find the name before you write, because a message to a generic inbox at a fifty-person company rarely reaches anyone who can say yes.",
      "**Is there capacity to handle more customers?** A restaurant that is full every night or a clinic booked three weeks out does not need more demand; it needs better margins or a second location. More enquiries are a problem for them, not a gift.",
      "Writing the answers next to each name also improves the message. “You are running ads for a ₹40,000 course” is a stronger opening than “I noticed you run ads”, because it shows you understood the economics.",
    ]},

    { type: "h2", id: "process", text: "A weekly routine for finding digital marketing clients" },
    { type: "steps", items: [
      { icon: "search", title: "Pick one category and one city", detail: "For example, dental clinics in Gurgaon. Narrow lists make every message more specific." },
      { icon: "signal", title: "Filter by signal", detail: "Ask for businesses running ads with no analytics or pixel, or with an incomplete Google listing." },
      { icon: "verified", title: "Confirm by hand", detail: "Open the site and the ad library for each one. Drop any that already track properly." },
      { icon: "send", title: "Send ten specific messages a day", detail: "One verifiable observation each, plus a request for a short call." },
      { icon: "calendar", title: "Follow up twice", detail: "Day four and day ten, each with something new. Many replies arrive on a follow-up." },
      { icon: "score", title: "Review weekly", detail: "Which category and which signal produced replies? Keep that, drop the rest." },
    ]},

    { type: "leads", city: "gurgaon", heading: "Businesses with no website in Gurgaon" },
    { type: "prose", text: [
      "The list above is the other end of the market: businesses with no website at all. For a digital marketing agency they are usually a first-project sale — a site and a Google listing — rather than a retainer, and they are worth working if you also build websites or partner with someone who does.",
    ]},

    { type: "cta", variant: "map", title: "Build this week's list in one search.",
      detail: "Category, city and the gap you fix — Mantis returns the businesses with phone numbers and the signal that qualified each one.",
      action: "Find digital marketing clients", href: "/login" },
  ],
  faqs: [
    { q: "Where can I get digital marketing leads?", a: "From businesses that show public evidence of need: running ads without conversion tracking, no analytics on the website, an incomplete Google listing, or a weak Instagram. These can be found by checking the ad libraries and each business's own site, which is what Mantis automates." },
    { q: "How do I get my first digital marketing clients?", a: "Pick one category in one city, find ten businesses with a visible gap such as ads with no pixel, and offer a short tracking review. Sell a fixed-scope first project before proposing a retainer." },
    { q: "Are bought digital marketing lead lists worth it?", a: "Rarely. They list businesses by category but not by whether they spend on marketing, which is the thing that predicts a sale. A smaller list built from signals usually produces more conversations." },
    { q: "Which businesses pay most for digital marketing?", a: "Businesses with a high value per customer whose customers compare online: clinics, coaching institutes, real estate, furniture and interiors, wedding venues. Multi-location businesses usually have larger budgets than single outlets." },
    { q: "Should I charge a percentage of ad spend?", a: "Usually not. A fixed management fee with the client paying the platforms directly avoids the impression that you profit from spending more, which is a common reason clients leave." },
  ],
  links: [HUB, ["/resources/how-to-get-seo-clients", "getting SEO clients"], ["/resources/how-to-get-photography-clients", "the photography version"], ["/resources/why-tech-stack-filtering-misses-your-best-prospects", "what tech-stack filters miss"], ["/resources/how-many-touches-before-a-local-business-buys", "how many follow-ups it takes"], ["/leads/website-development/in/gurgaon", "businesses without websites in Gurgaon"]],
},

/* ───────────────────────────── 2 · SEO */
{
  slug: "how-to-get-seo-clients",
  title: "How to Get SEO Clients: Finding SEO Leads That Convert",
  excerpt: "SEO is the hardest marketing service to sell cold, because the result is months away. The fix is prospecting on problems a business can see today.",
  meta: "How to get SEO clients: which businesses buy SEO, the site and review gaps that signal need, where to find SEO leads and how to price the first project.",
  category: "Client Acquisition", cluster: "growth", hero: "network", mins: 9,
  heroImage: "/resources/thumbs/google-maps-prospecting-for-web-designers.webp",
  heroAlt: "Flat illustration of a magnifying glass over a map with pinned local businesses and a ranked list",
  tags: ["Client Acquisition", "SEO", "Prospecting"],
  body: [
    { type: "prose", text: [
      "The way to get SEO clients consistently is to prospect on problems a business can see today, not on rankings it might have in six months. **A homepage with no title tag, a blog that stopped a year ago, or a Google listing with eleven reviews against a competitor's three hundred are SEO leads you can show an owner in a minute** — and that visible proof is what makes SEO sellable to someone who has never bought it.",
      "SEO is harder to sell cold than ads or design, because the result is slow and invisible. Everything that works in finding SEO clients — and in finding leads that convert — is a way of making the problem visible first.",
    ]},

    { type: "h2", id: "who-buys", text: "Which businesses become SEO clients" },
    { type: "prose", text: [
      "SEO pays for businesses whose customers search for the service by name and location, and whose customers are worth enough that a few extra a month covers the fee. That splits cleanly into two markets with different buyers.",
      "**Local SEO** — the map pack, the Google Business Profile, reviews, location pages — is bought by clinics, lawyers, contractors, salons, restaurants, coaching centres and anyone whose customer types “near me”. The owner decides, the ticket is modest, and the result is phone calls.",
      "**Organic SEO** — content, technical fixes, links — is bought by businesses that sell over a wider area or online: B2B suppliers, software companies, D2C brands, education providers, travel operators. A marketing lead often decides, the ticket is larger, and the sale takes longer.",
      "Pick one to lead with. The prospecting signals, the pitch and the reporting are different enough that an agency trying to sell both cold usually sells neither well.",
    ]},
    { type: "table", head: ["Market", "Typical buyer", "Signal to look for", "First project"], rows: [
      ["Local SEO", "Clinic, lawyer, contractor, salon", "Few reviews, low rating, incomplete Google listing", "Listing clean-up and a review routine"],
      ["Local SEO", "Multi-branch retailer or chain", "Several branches, no location pages", "One page per location"],
      ["Organic SEO", "B2B supplier, manufacturer", "SEO basics missing on the homepage", "Technical fix and service pages"],
      ["Organic SEO", "Education, travel, software", "Blog gone quiet or no blog at all", "Content plan for one topic cluster"],
      ["Either", "Any business with an old site", "Old copyright, no HTTPS, not mobile-ready", "Fix or rebuild before SEO"],
    ]},

    { type: "h2", id: "signals", text: "Finding SEO leads from the outside" },
    { type: "prose", text: [
      "These are the signals Mantis reads off a business's own website and Google listing. None requires access to their Search Console, which is the point — you can find SEO clients before they have decided they need SEO.",
    ]},
    { type: "checklist", items: [
      { title: "SEO basics missing", detail: "Two or more of title, meta description, H1 and schema missing on the homepage. Concrete, fixable, and easy to show in a screenshot." },
      { title: "No blog, or a blog gone quiet", detail: "No articles section, or the newest post is six months old or more. For organic SEO this is the most direct evidence of an unworked channel." },
      { title: "Few reviews or a low rating", detail: "Under 30 Google reviews, or a rating below 4.0. For local SEO, reviews are the lever the owner understands best." },
      { title: "Google listing incomplete", detail: "Missing hours, under five photos, or no website linked. The cheapest local ranking work there is." },
      { title: "Old, insecure or not mobile-ready site", detail: "Copyright three or more years old, no HTTPS, or no mobile viewport. SEO on a broken site is wasted; the first sale may be the fix." },
      { title: "Outdated CMS", detail: "WordPress older than 6, or an old Joomla or Drupal. A technical SEO project often starts with an update." },
      { title: "No analytics", detail: "If they cannot see organic traffic today, they will not be able to see your results. Setting this up is part of the first month." },
    ]},
    { type: "cta", variant: "table", title: "Find businesses with SEO basics missing.",
      detail: "Tell Mantis the category and city — it reads each homepage for title, meta description, H1 and schema, and flags stale blogs and weak reviews.",
      action: "Search for SEO leads", href: "/login" },

    { type: "h2", id: "where", text: "Where to find SEO clients, honestly compared" },
    { type: "prose", text: [
      "**Your own rankings.** An agency that ranks for “SEO agency in [city]” gets inbound leads, and the ranking itself is the proof. It takes months and is worth starting on day one, but it will not pay this quarter's bills.",
      "**Web designers and developers.** They finish a site and the client asks “how do we get found?”. A referral arrangement with two or three of them can be the steadiest source of SEO clients you have, because the trigger — a new site — is exactly the moment SEO is easiest to sell.",
      "**Directories and marketplaces.** Clutch-style listings and freelance platforms bring buyers who are already shopping, but they compare on price and reviews, and new agencies start with neither.",
      "**Cold outreach on signals.** The only channel you fully control. It works when every message contains a specific, checkable observation about that business's site or listing, and fails completely when it is a generic “I can get you to page one”, which every owner has received many times.",
    ]},

    { type: "h2", id: "outreach", text: "An outreach script that can convert" },
    { type: "prose", text: [
      "Lead with one observation they can verify, attach one image, ask one question. Never promise a ranking position — no one can, and the owner knows it.",
      "**For local SEO, by phone or WhatsApp:** “Hi, this is Arjun from [agency]. I was looking at physiotherapy clinics in Sector 50 on Google Maps. You have 4.8 stars but 14 reviews; the two clinics above you have over 200 each. That gap is a large part of why they show up first. I help clinics fix this with a simple review routine — could I send you a one-page summary of what I would do?”",
      "**For organic SEO, by email:** “Your homepage has no meta description and no H1, so Google is writing its own summary of your business from whatever text it finds. I took a screenshot of how you currently appear in search, and how you could. Worth a 15-minute look?”",
      "Both work because the business can confirm the claim without trusting you. Follow up with something new each time — a competitor comparison, a keyword they are missing — rather than “just checking in”.",
    ]},

    { type: "h2", id: "pricing", text: "Pricing the first SEO project" },
    { type: "prose", text: [
      "Most small businesses will not sign a twelve-month SEO retainer from a cold conversation. They will pay for a defined project with a visible end.",
      "**Start with a fixed-price setup:** listing clean-up, on-page fixes, analytics and Search Console, a review request routine. It has a finish line, the client can see each item done, and the measurement you set up is what justifies the monthly work afterwards.",
      "**Then offer a monthly plan with a small, stated scope** — a number of pages or posts, a review target, a report. Vague retainers are what gives SEO its reputation; a written scope is what keeps clients past the first quarter.",
      "Report against the business's number — calls, direction requests, enquiries — not just positions. Rankings are your measure; customers are theirs.",
    ]},
    { type: "tip", title: "Fix before you optimise",
      text: "If the site is not mobile-ready, has no HTTPS or is years out of date, say so and either fix it or refer it out first. Selling SEO on top of a broken site produces a disappointed client a few months later." },

    { type: "h2", id: "qualify", text: "Qualifying an SEO lead" },
    { type: "prose", text: [
      "Not every business with a missing meta description is a good SEO client. Before you invest an hour in an audit, check three things.",
      "**Do people actually search for what they sell, where they sell it?** A specialist industrial supplier may have a handful of searches a month for its product in its city. Good SEO will not change the size of that demand, and a client paying for traffic that cannot exist will leave. A quick look at search suggestions and the current results page tells you a lot.",
      "**Who ranks today?** If the first page is all directories and marketplaces, a small business can still win the map pack but will struggle for the organic results. If it is other small businesses with weak sites, the opportunity is real and quick.",
      "**Can they handle a six-month horizon?** A business that needs customers this month should be sold ads or a listing clean-up first. Selling SEO to someone who needs results by next Friday guarantees a disappointed client, however good the work.",
      "The businesses that pass all three are a smaller list. They are also the ones that will still be clients a year later, which is where SEO economics actually work.",
    ]},

    { type: "h2", id: "process", text: "The process, step by step" },
    { type: "steps", items: [
      { icon: "search", title: "Choose local or organic", detail: "One market, one pitch. Local suits owner-run businesses; organic suits B2B and online sellers." },
      { icon: "signal", title: "Search by signal", detail: "Few reviews and incomplete listings for local; SEO basics missing and stale blogs for organic." },
      { icon: "verified", title: "Capture the evidence", detail: "A screenshot of their search result, their listing next to a competitor's, or their homepage source." },
      { icon: "send", title: "Send the observation", detail: "One claim, one image, one question. No ranking promises." },
      { icon: "calendar", title: "Follow up with something new", detail: "A competitor comparison, a missing keyword, a quick win they can do themselves." },
      { icon: "score", title: "Close a setup project", detail: "Fixed scope, visible finish, then propose the monthly plan." },
    ]},

    { type: "citytable", country: "in", min: 400, limit: 8, order: "size",
      note: "Indian cities by number of businesses checked, read live. Larger cities have more competition per category, which is where local SEO matters most." },
    { type: "prose", text: [
      "The share of businesses without a website in each city tells you which half of the SEO market you are in. Where many businesses have no site, the work is listings and reviews; where nearly all have one, the work is on-page and content.",
    ]},

    { type: "cta", variant: "map", title: "See which businesses in your city need SEO.",
      detail: "Stale blogs, missing meta tags, thin reviews — found by checking each business, not by guessing from a category.",
      action: "Find SEO clients", href: "/login" },
  ],
  faqs: [
    { q: "How do I get SEO clients with no experience?", a: "Start with local SEO for one category in one city, where the work is visible: Google listing clean-up and a review routine. Do two or three at a modest fixed price, measure the calls they get, and use those results as your proof." },
    { q: "Where do SEO leads come from?", a: "Referrals from web designers, your own rankings, directories, and cold outreach based on visible problems such as missing meta tags, a stale blog or few reviews. Signal-based outreach is the only one you fully control from the first week." },
    { q: "How do I find businesses that need SEO?", a: "Check their homepage for missing titles, meta descriptions, H1 and schema, look for a blog that has gone quiet, and compare their Google review count with competitors. Mantis runs these checks across a category and city for you." },
    { q: "How should I price SEO for small businesses?", a: "Sell a fixed-price setup project first, then a monthly plan with a written scope. Small businesses rarely sign long retainers from a cold conversation, and a defined first project lets them see you deliver." },
    { q: "Should I guarantee rankings?", a: "No. No one controls Google's rankings and owners have heard the promise before. Commit to the work you will do and report on the outcomes the business cares about, such as calls and enquiries." },
  ],
  links: [HUB, ["/resources/digital-marketing-leads", "digital marketing leads"], ["/resources/how-to-get-app-development-clients", "app development clients"], ["/resources/do-businesses-without-websites-get-fewer-reviews", "what the review gap looks like"], ["/resources/qualifying-a-local-lead-before-you-call", "qualifying a lead before you call"], ["/leads", "the lead market by city"]],
},

/* ───────────────────────────── 3 · CRM / SaaS */
{
  slug: "crm-leads-how-to-find-crm-customers",
  title: "CRM Leads: How to Find the Customers Who Buy a CRM",
  excerpt: "Businesses buy a CRM when enquiries start getting lost. That moment leaves traces on their website and in their hiring — here is how to find it.",
  meta: "CRM leads for software sellers and resellers: which businesses become CRM customers, the signals that show enquiries are being lost, and how to reach them.",
  category: "Client Acquisition", cluster: "growth", hero: "network", mins: 9,
  heroImage: "/resources/thumbs/how-many-businesses-should-be-in-your-pipeline.webp",
  heroAlt: "Flat illustration of a sales pipeline narrowing from many prospects to a few qualified deals",
  tags: ["Client Acquisition", "CRM", "SaaS Sales"],
  body: [
    { type: "prose", text: [
      "The best CRM leads are businesses whose enquiries have started to outgrow a spreadsheet and a WhatsApp group. **The moment a business becomes one of your CRM customers is when it starts losing enquiries it paid to get** — a contact form that goes nowhere, ad leads that nobody calls back, a second branch with its own list — and each of those leaves a trace you can find from outside.",
      "That matters because a CRM is not bought for its features. It is bought to stop a specific loss, and the seller who can name that loss in the first message is the one who gets the meeting.",
    ]},

    { type: "h2", id: "who-buys", text: "Who becomes a CRM customer" },
    { type: "prose", text: [
      "Three conditions together make a business a CRM buyer: **enquiries arrive from more than one channel, more than one person handles them, and each one is worth following up.** Remove any of the three and a notebook works fine.",
      "That points to a recognisable set of businesses. Real estate brokers and developers, coaching institutes and education consultants, clinics with several doctors, interior designers, travel agents, B2B distributors and manufacturers with field sales, insurance and loan agents, car dealerships, and service firms that quote before they sell.",
      "Size changes what they buy. A five-person business wants something it can set up in a day, priced per user and connected to WhatsApp. A fifty-person business wants pipelines, permissions, reports and integrations, and will run a proper evaluation. Decide which one your product or reseller practice serves, because the leads, the demo and the sales cycle are different.",
    ]},
    { type: "table", head: ["Buyer", "Where enquiries come from", "What they lose today", "CRM angle"], rows: [
      ["Real estate brokers and developers", "Portals, ads, walk-ins, calls", "Portal leads that are never called", "Lead assignment and follow-up reminders"],
      ["Coaching and education", "Ads, forms, counselling calls", "Enquiries in peak admission weeks", "Pipeline by course and intake"],
      ["Clinics and diagnostics", "Calls, booking requests, WhatsApp", "Follow-ups for repeat visits", "Patient reminders and recall"],
      ["B2B distributors and manufacturers", "Field sales, trade fairs, IndiaMART", "Quotes with no follow-up", "Quote tracking and sales visits"],
      ["Interior designers and contractors", "Referrals, Instagram, site visits", "Quotes that go cold", "Project pipeline from enquiry to handover"],
    ], note: "Illustrative. The third column is what your first message should name." },

    { type: "h2", id: "signals", text: "Signals that show a business needs a CRM" },
    { type: "prose", text: [
      "Mantis checks these on a business's own website, its Google listing and its public ad activity. A signal is a reason to look closer, not a verdict — confirm it before you build the pitch on it.",
    ]},
    { type: "checklist", items: [
      { title: "Enquiry form goes nowhere", detail: "A contact form that is mailto-only or has no working handler. Enquiries are being lost right now, which is the strongest CRM signal there is." },
      { title: "Running ads", detail: "Active Meta or Google ads mean they are paying for every enquiry. Losing one is losing money they can count." },
      { title: "Has an enquiry form or online booking", detail: "Proof that enquiries arrive through the site. Pair with ads to find the businesses with the most inbound volume." },
      { title: "Several branches or a locations page", detail: "Multiple locations means multiple lists, which is when a shared system starts to matter." },
      { title: "Hiring for sales or telecalling roles", detail: "A growing team that will need a shared pipeline. The roles also tell you how they sell." },
      { title: "No online booking", detail: "For appointment businesses, booking is often the wedge — a CRM with booking replaces two tools." },
      { title: "Customer login on the site", detail: "A portal suggests existing software. Useful for integration-led pitches, and a reason to qualify carefully." },
    ]},
    { type: "cta", variant: "table", title: "Find businesses whose enquiry forms go nowhere.",
      detail: "Mantis checks each site's contact form for a working handler and flags the ones losing enquiries — filter by category and city.",
      action: "Search for CRM leads", href: "/login" },

    { type: "h2", id: "where", text: "Where B2B leads for CRM come from" },
    { type: "prose", text: [
      "**Contact databases** such as Apollo work well when the buyer is a mid-sized company with a domain and named managers. They work poorly for owner-run businesses, which make up much of the CRM market in India, because those businesses lack the domain-and-employee footprint those databases are built on.",
      "**Review sites and comparison pages** bring buyers who are already evaluating. They are valuable and expensive, and they favour products with many reviews.",
      "**Partnerships** with accountants, IT vendors and web agencies who already serve the same businesses. A web agency that builds a site with an enquiry form is in the perfect position to recommend where those enquiries should go.",
      "**Signal-based prospecting** finds businesses at the moment of need — the broken form, the new branch, the ads with nowhere to send leads. Lists are smaller, but conversations start with a real problem rather than a feature tour.",
      "**Industry associations and trade fairs** in your strongest vertical. A CRM that has real estate configured out of the box sells far better in a room full of brokers than a general one.",
    ]},

    { type: "h2", id: "outreach", text: "What to send a CRM prospect" },
    { type: "prose", text: [
      "Name the loss, show the evidence, offer a small next step. Feature lists belong in the demo, not the first message.",
      "**Subject:** The contact form on your site",
      "“Hi Rahul — I was looking at your site and noticed the enquiry form posts to an email link rather than a system, so on most phones it opens the mail app and many people give up before sending. With your Google ads running, some of those clicks are paying for enquiries that never arrive. We help real estate brokers in Pune route every form, call and portal lead into one list with follow-up reminders. Can I show you what that looks like for a team your size, in 15 minutes?”",
      "Read the form's code to see where it posts — that is enough evidence. Never submit a fake customer enquiry to test it; a prospect who finds out will not buy from you.",
      "For owner-run businesses, a call or WhatsApp message usually works better than email. For companies with a sales manager, LinkedIn plus email reaches the person who will actually use the system.",
    ]},

    { type: "h2", id: "pricing", text: "Packaging a CRM sale" },
    { type: "prose", text: [
      "Small businesses rarely fail to buy a CRM because of the price. They fail to use it, and then they cancel. Packaging should be built around getting them using it.",
      "**Include setup in the first month**: importing their existing list, connecting the website form and WhatsApp, creating the pipeline stages they already use on paper. A CRM that arrives empty stays empty.",
      "**Start with the team that feels the loss** — the two telecallers, not the whole company. Expand once they depend on it.",
      "**If you resell or implement**, charge for setup and training separately from the subscription. It covers your real cost and makes the first month a project with a finish line, which is easier for a small business to approve than an open-ended contract.",
    ]},
    { type: "tip", title: "The demo is their data",
      text: "Ask for twenty of their real enquiries before the demo and load them in. A prospect watching their own leads move through stages can decide in the meeting; a prospect watching sample data asks for a trial and forgets it." },

    { type: "h2", id: "qualify", text: "Qualifying a CRM prospect" },
    { type: "prose", text: [
      "CRM deals stall more often than they are lost. A few questions early on tell you whether a prospect will buy this quarter or drift.",
      "**How many enquiries a month, and from where?** A business with twenty enquiries a month from one channel can manage in a spreadsheet. One with two hundred across portals, ads, calls and walk-ins cannot. The number also tells you which plan to propose.",
      "**Who will use it every day?** The owner signs, but the telecaller or front-desk person decides whether the system lives or dies. If they are not in the demo, the trial usually fails.",
      "**What do they use now, and what happens to it?** Many businesses already pay for a tool they barely use. Find out why it failed. If it was too complicated, a simpler product wins; if nobody was trained, the same thing will happen to yours unless setup is included.",
      "**What would make this worth it in three months?** Get a concrete answer — fewer missed callbacks, a weekly report for the owner, faster follow-up on portal leads. That answer is your success measure and your renewal argument.",
      "A prospect who cannot answer the first question is early. Keep them on a follow-up list rather than pushing a demo, and check their signals again in a quarter.",
    ]},

    { type: "h2", id: "process", text: "A repeatable way to find CRM customers" },
    { type: "steps", items: [
      { icon: "search", title: "Pick one vertical", detail: "Real estate, education, clinics or distribution. A configured pipeline sells better than a blank one." },
      { icon: "signal", title: "Search for the loss", detail: "Broken enquiry forms, ads with heavy inbound, new branches, sales hiring." },
      { icon: "verified", title: "Confirm the evidence", detail: "Read the form's code, check the ad library, open the careers page." },
      { icon: "send", title: "Name the loss in the first line", detail: "One specific observation, one offer of a short demo." },
      { icon: "data", title: "Demo with their own enquiries", detail: "Load real leads before the meeting." },
      { icon: "score", title: "Track which signal closes", detail: "Keep the signal-vertical pairs that convert and drop the rest." },
    ]},

    { type: "cta", variant: "map", title: "Find the businesses losing enquiries.",
      detail: "Describe your CRM and its best-fit vertical — Mantis finds the businesses with broken forms, heavy ad spend and new branches, with phone numbers.",
      action: "Find CRM customers", href: "/login" },
  ],
  faqs: [
    { q: "Where can I find CRM leads?", a: "From businesses showing signs that enquiries are being lost: a contact form with no working handler, active ads, several branches, or open sales and telecalling roles. Contact databases help for mid-sized companies, but miss most owner-run businesses." },
    { q: "Who are typical CRM customers?", a: "Businesses where enquiries come from several channels, more than one person handles them, and each one is worth following up: real estate, education, clinics, B2B distributors, interior designers, travel agents and dealerships." },
    { q: "How do I sell a CRM to small businesses?", a: "Name the specific loss in your first message, demo with their own enquiries, and include setup in the first month. Small businesses rarely refuse on price; they cancel when the CRM stays empty." },
    { q: "Are Apollo or similar databases good for B2B CRM leads?", a: "For companies with a domain and named managers, yes. For owner-run local businesses, which are a large part of the CRM market in India, they have little coverage, and map listings plus website signals work better." },
    { q: "How do I know a business is losing enquiries?", a: "Check whether its website form posts to a working system or only opens an email link, whether it is running ads, and whether it has several branches without a shared process. Mantis flags the form problem automatically." },
  ],
  links: [HUB, ["/resources/how-to-get-it-services-and-cloud-clients", "managed IT and cloud clients"], ["/resources/how-to-get-accounting-clients", "accounting and CA clients"], ["/resources/why-apollo-and-zoominfo-miss-businesses-without-websites", "why contact databases miss local businesses"], ["/resources/how-many-businesses-should-be-in-your-pipeline", "sizing your pipeline"], ["/leads", "the lead market"]],
},
/* ───────────────────────────── 4 · bookkeeping */
{
  slug: "how-to-get-bookkeeping-clients",
  title: "How to Get Bookkeeping Clients: Where the Leads Are",
  excerpt: "Bookkeeping is bought at a few predictable moments: opening, growing, hiring, selling online. Find the businesses at those moments and the pitch writes itself.",
  meta: "How to get bookkeeping clients: the small businesses that buy, the moments that trigger a purchase, where bookkeeping leads come from and how to package it.",
  category: "Client Acquisition", cluster: "growth", hero: "pricing", mins: 9,
  heroImage: "/resources/thumbs/hourly-project-or-value-pricing-model.webp",
  heroAlt: "Flat illustration of a clock, a document folder and stacked coins balanced on a scale",
  tags: ["Client Acquisition", "Bookkeeping", "Small Business"],
  body: [
    { type: "prose", text: [
      "The fastest way to get bookkeeping clients is to find small businesses at the few moments when keeping their own books stops working: **the month they open, the month they add a second outlet, the month they start selling online, and the month they hire their first accounts person.** Bookkeeping leads at those moments convert; the same business a year earlier or later usually does not.",
      "Bookkeeping is unglamorous and sticky. A client who hands you their books rarely moves, because moving means explaining everything again. That makes winning each one worth real effort, and makes timing the thing to get right.",
    ]},

    { type: "h2", id: "who-buys", text: "Which businesses become bookkeeping clients" },
    { type: "prose", text: [
      "Bookkeeping is bought by businesses with enough transactions to be a burden and not enough to justify a full-time accountant. In practice that means owner-run businesses with somewhere between a handful and a few dozen staff.",
      "**The best fits have many small transactions and more than one place money arrives**: restaurants and cafes reconciling card, cash, UPI and delivery-app payouts; retailers with a shop and an online store; clinics billing patients and insurers; contractors with materials, labour and staged payments; e-commerce sellers on several marketplaces.",
      "**The weak fits** are businesses with very few transactions — a consultant invoicing three clients a month can do it in an hour — and larger companies that already have an in-house team and want an audit or advisory firm instead.",
    ]},
    { type: "table", head: ["Buyer", "Why the books get hard", "Moment they buy", "What to offer first"], rows: [
      ["Restaurants and cafes", "Cash, card, UPI and delivery-app payouts to reconcile", "Opening, or adding an outlet", "Monthly reconciliation and GST-ready books"],
      ["Retailers with an online store", "Two sales channels, returns, marketplace fees", "Launching the store", "Channel-wise reconciliation"],
      ["Clinics and diagnostics", "Patient billing, insurer payments, consumables", "Adding a doctor or branch", "Monthly books plus receivables tracking"],
      ["Contractors and builders", "Staged payments, materials, labour", "Taking on a larger project", "Project-wise cost tracking"],
      ["Exporters and wholesalers", "Foreign currency, credit terms, duty", "First export orders", "Books plus export documentation support"],
    ], note: "Illustrative fits, not measured shares. Pick two rows to specialise in." },

    { type: "h2", id: "signals", text: "Bookkeeping leads: the signals to search for" },
    { type: "prose", text: [
      "Mantis detects each of these from public data — a business's Google listing, its website or delivery-app page. None tells you the state of their books, but each tells you the moment has probably arrived.",
    ]},
    { type: "checklist", items: [
      { title: "Just opened", detail: "A new Google listing with five or fewer reviews, a website that says opening soon or now open, or a restaurant marked new on Zomato or Swiggy. New businesses decide who keeps their books in the first months." },
      { title: "Several branches", detail: "Two or more listings under the same name. A second outlet is the most common point where owner-kept books break down." },
      { title: "Online store on the site", detail: "A cart or shop on their own website means a second sales channel to reconcile alongside the counter." },
      { title: "Hiring", detail: "Open roles on a careers page or job board — especially an accounts executive. Outsourced bookkeeping can be cheaper than the hire." },
      { title: "Exporter", detail: "An IEC number or export text on the site. Export books are harder and the owner knows it." },
      { title: "Established", detail: "A hundred or more Google reviews suggests real volume — enough transactions to need help and enough revenue to pay for it." },
    ]},
    { type: "cta", variant: "table", title: "Find businesses that just opened in your area.",
      detail: "Mantis flags new Google listings, opening-soon websites and new restaurant pages — the moment a business chooses who keeps its books.",
      action: "Search for bookkeeping leads", href: "/login" },

    { type: "h2", id: "where", text: "Where to find bookkeeping clients" },
    { type: "prose", text: [
      "**Referrals from accountants and CA firms.** Many accounting firms prefer not to do monthly bookkeeping for small clients and will pass it to someone reliable who sends tidy books back at year end. Two such relationships can fill a small practice.",
      "**Software partner directories.** Accounting software vendors list certified bookkeepers. Buyers there are already on the software, which shortens onboarding, but you are listed next to many others.",
      "**Local business associations and market committees.** Slow and personal, and effective in smaller cities where trust travels by word of mouth.",
      "**Direct outreach at the trigger moment.** A new outlet, a new online store, a new listing. It is the channel you control, and timing is what makes it work — a message to a business that opened last month lands very differently from the same message to one that has used the same bookkeeper for six years.",
      "**Freelance marketplaces** bring international clients and price pressure. They suit bookkeepers selling to US, UK or Australian small businesses on specific software, and are a poor fit for local clients.",
    ]},

    { type: "h2", id: "outreach", text: "An outreach message for a new business" },
    { type: "prose", text: [
      "Congratulate, name the specific problem their situation creates, and offer something small and concrete.",
      "“Hi Neha — congratulations on opening the second Brew Lab in Indiranagar. Running two outlets usually means card, cash, UPI and Swiggy payouts arriving in four different places for each one, and the reconciliation is what takes the evenings. I keep monthly books for four cafes in Bengaluru, outlet-wise, ready for your accountant at GST time. Would a 15-minute call this week be useful? I can show you what the monthly report looks like.”",
      "It works because it shows you understand their specific pain, it is short, and it ends with a small ask. Calls and WhatsApp to the listed number reach owner-run businesses faster than email; walk in if the business is near you and it is a quiet hour.",
    ]},

    { type: "h2", id: "pricing", text: "Pricing and packaging bookkeeping" },
    { type: "prose", text: [
      "Price by volume and complexity, not by hours. Owners cannot judge hours, but they understand “up to 300 transactions a month, two bank accounts, one GST registration”.",
      "**Offer three tiers based on transaction volume and channels**, with a clean-up fee for businesses whose existing books are behind. The clean-up is often the first sale and reveals how messy the ongoing work will be, so price it separately rather than absorbing it.",
      "**Fix a monthly deliverable and a date**: reconciled books, a one-page profit and loss, and a list of open questions, by the tenth. A fixed date is what makes a bookkeeper feel reliable, and reliability is most of what the client is buying.",
      "**Take the first month in advance.** It filters out businesses that are not serious and protects you against the clients who disappear when the clean-up is done.",
    ]},
    { type: "tip", title: "Specialise early",
      text: "A bookkeeper who only does restaurants knows every delivery-app payout format and every common mistake. That makes onboarding faster, makes referrals inside the trade more likely, and justifies a higher price than a generalist." },

    { type: "h2", id: "mistakes", text: "Mistakes that cost bookkeeping clients" },
    { type: "prose", text: [
      "Most bookkeepers lose clients for the same few reasons, and none of them is the quality of the books.",
      "**Taking on books that are years behind at the monthly price.** The catch-up eats the first months, the client sees nothing new, and both sides feel cheated. Price the clean-up separately and say how long it will take.",
      "**Letting the deadline slide.** A bookkeeper who delivers on the tenth one month and the twenty-second the next is, from the owner's side, unreliable. A fixed date is the product; the books are how you meet it.",
      "**Silence about problems.** If a payment is missing or an expense looks wrong, say so the same week. Owners forgive mistakes; they do not forgive finding out at tax time.",
      "**Taking every client.** A business that pays late, sends receipts in carrier bags and disputes every invoice costs more than it earns. Your first client of a type sets your reputation in that trade, so choose the first few carefully.",
      "**Not working with the accountant.** The client's CA or tax adviser is either your best referral source or your fastest way out. Send them tidy books in the format they want, and they will recommend you to their other clients.",
    ]},

    { type: "h2", id: "process", text: "Steps to a full bookkeeping practice" },
    { type: "steps", items: [
      { icon: "search", title: "Choose two trades", detail: "For example restaurants and clinics. Learn their payment flows properly." },
      { icon: "signal", title: "Watch for the moment", detail: "New listings, new outlets, new online stores, hiring for accounts roles." },
      { icon: "phone", title: "Reach out within weeks", detail: "Timing matters more than the message. Call or WhatsApp the listed number." },
      { icon: "verified", title: "Sell the clean-up first", detail: "A fixed-price catch-up project shows the state of the books before you quote monthly." },
      { icon: "calendar", title: "Deliver on a fixed date", detail: "Same day every month. Reliability is the product." },
      { icon: "send", title: "Ask for the referral", detail: "Owners in one trade know each other. Ask after the third on-time month." },
    ]},

    { type: "leads", city: "jaipur", heading: "Small businesses in Jaipur with no website" },
    { type: "prose", text: [
      "Businesses without a website are often the ones still keeping books in a register. They are slower to buy, but when they do, they tend to stay — and a bookkeeper who also refers them to a web designer becomes the adviser they call first.",
    ]},

    { type: "cta", variant: "map", title: "Find the businesses at the right moment.",
      detail: "New outlets, new online stores, accounts hiring — Mantis finds them by category and city, with phone numbers.",
      action: "Find bookkeeping clients", href: "/login" },
  ],
  faqs: [
    { q: "How do I get my first bookkeeping clients?", a: "Pick one or two trades, such as restaurants or clinics, and contact businesses that have just opened or added an outlet. Offer a fixed-price clean-up first, then a monthly service with a fixed delivery date." },
    { q: "Where can I find bookkeeping leads?", a: "From accountants who do not want small monthly work, accounting software partner directories, local business associations, and direct outreach to businesses showing a trigger: a new listing, a second branch, a new online store or hiring for accounts." },
    { q: "How should I price bookkeeping services?", a: "By transaction volume and number of channels rather than hours, in three tiers, with a separate clean-up fee for books that are behind. Take the first month in advance." },
    { q: "Which small businesses need bookkeeping most?", a: "Those with many small transactions arriving through several channels: restaurants and cafes, retailers with an online store, clinics, contractors and exporters." },
    { q: "Can Mantis tell me which businesses have messy books?", a: "No — nothing public shows that. It finds the moments that usually cause the problem, such as a new listing, a second branch, an online store or open hiring, so you contact businesses when the need is most likely." },
  ],
  links: [HUB, ["/resources/how-to-get-accounting-clients", "accounting and CA clients"], ["/resources/crm-leads-how-to-find-crm-customers", "CRM leads"], ["/resources/hourly-project-or-value-pricing-model", "hourly, project or value pricing"], ["/resources/whatsapp-outreach-local-business-india", "reaching owners on WhatsApp"], ["/leads/website-development/in/jaipur", "small businesses in Jaipur"]],
},

/* ───────────────────────────── 5 · accounting / CA */
{
  slug: "how-to-get-accounting-clients",
  title: "How to Get Accounting Clients: A Guide for CA Firms",
  excerpt: "Accounting clients choose on trust and timing, and Chartered Accountants work under real limits on solicitation. What works inside those limits.",
  meta: "How to get accounting clients: who buys, the moments that trigger a change of accountant, how CA firms find leads within ICAI rules, and what to offer first.",
  category: "Client Acquisition", cluster: "growth", hero: "methodology", mins: 9,
  heroImage: "/resources/thumbs/are-lawyers-and-accountants-a-good-web-design-niche.webp",
  heroAlt: "Flat illustration of a professional office building beside a document and a rising chart",
  tags: ["Client Acquisition", "Accounting", "CA Firms"],
  body: [
    { type: "prose", text: [
      "Accounting clients are won on trust and timing: **a business changes accountant when it registers, grows past what its current adviser handles, starts exporting, raises money or gets a notice it does not understand.** A firm that is visible and credible at those moments gets the work; a firm that is merely good does not get the chance.",
      "This guide covers accounting firms generally and CA firms in India specifically, because Chartered Accountants work under rules on advertising and solicitation that change which channels are open. Read the current ICAI Code of Ethics and its guidelines before any outreach — nothing here is a substitute for that.",
    ]},

    { type: "h2", id: "who-buys", text: "Who buys from accounting firms" },
    { type: "prose", text: [
      "The accounting customers worth building a practice around fall into a few groups, and each buys a different first service.",
      "**New businesses** need registration, GST, a chart of accounts and someone to call. They are price-sensitive at first and loyal afterwards.",
      "**Growing owner-run businesses** — a second outlet, a first large contract, a doubling of staff — have outgrown the accountant who filed their returns when they were small and need advice, not just compliance.",
      "**Startups that have raised money** need audit-ready books, payroll, statutory compliance and often a part-time finance function, and investors expect it done properly.",
      "**Exporters and importers** need foreign currency accounting, export documentation, refunds and transfer-pricing awareness — specialist work that commands better fees.",
    ]},
    { type: "table", head: ["Buyer", "Trigger", "First service", "What keeps them"], rows: [
      ["New business", "Registration, first GST return", "Incorporation and compliance setup", "Responsiveness in year one"],
      ["Growing SME", "Second branch, larger contracts", "Monthly MIS and tax planning", "Advice that saves them money"],
      ["Funded startup", "First or next funding round", "Audit-ready books, payroll, compliance", "Investor-grade reporting"],
      ["Exporter", "First export orders", "Export compliance and refunds", "Specialist knowledge"],
      ["Business with a notice", "Tax or GST notice", "Notice response", "Calm, fast handling"],
    ], note: "Illustrative. The trigger column is when to be visible." },

    { type: "h2", id: "signals", text: "Signals that point to new accounting clients" },
    { type: "prose", text: [
      "Mantis reads these from public sources. Use them to decide where to be visible, which events and associations to join, and — where your professional rules permit — whom to approach.",
    ]},
    { type: "checklist", items: [
      { title: "Just opened", detail: "A new Google listing with few reviews, a website saying opening soon or now open, or a new restaurant page. New businesses pick an accountant early." },
      { title: "Hiring", detail: "Open roles on a careers page or job board. Growing headcount means payroll, compliance and often a finance hire you can partly replace." },
      { title: "Several branches", detail: "Two or more listings under one name. Multi-location businesses outgrow single-person accountants." },
      { title: "Exporter", detail: "An IEC number or export or worldwide-shipping text on the site. Specialist work, higher fees." },
      { title: "Raised funding recently", detail: "A round reported in the news in the last year. Funded companies need investor-grade books. This signal uses a paid news search, so it runs only when asked." },
      { title: "Established", detail: "A hundred or more reviews suggests turnover that justifies advisory work, not just filing." },
    ]},
    { type: "cta", variant: "table", title: "See which businesses are opening and hiring near you.",
      detail: "Mantis lists new listings, exporters and businesses with open roles by city and category — useful for choosing where to focus.",
      action: "Explore accounting leads", href: "/login" },

    { type: "h2", id: "ca-rules", text: "CA leads in India: what the rules change" },
    { type: "prose", text: [
      "ICAI's Code of Ethics places limits on how members advertise and solicit professional work, and the details have been revised over time. The practical consequence is that cold pitching for attest and core professional services is not an option for a practising CA, and anyone selling “CA leads” as a list to call should be treated with caution.",
      "What remains open, subject to the current guidelines, is substantial: **being findable** through a website and listings that meet ICAI's norms, **referrals** from clients, lawyers, bankers and other professionals, **speaking and writing** on topics your target clients care about, and **relationships** with the people who meet businesses at their trigger moments — company formation services, bookkeepers, web agencies, co-working spaces, industry associations.",
      "Signal data is still useful within those limits. Knowing that a particular business park has a cluster of new exporters tells you which association to join, which seminar topic to offer, and which partner to build a relationship with. That is market research, not solicitation — but check your specific use against the current rules.",
      "Accountants outside ICAI membership, bookkeepers, and firms abroad work under different rules and have more direct channels available.",
      "For a CA firm, the honest summary is that growth comes from being the obvious choice when someone asks “who should I use?” — and that is built through specialisation, visibility in the right places, and the experience existing clients have. The channels in the next section are all ways of being in the room when that question is asked.",
    ]},

    { type: "h2", id: "where", text: "Channels for accounting firms, compared" },
    { type: "prose", text: [
      "**Client referrals** remain the main source for most firms and the highest-converting. Ask for them explicitly after a visible win — a refund received, a notice closed, a clean audit.",
      "**Professional referrals** from lawyers, bankers, valuers and company secretaries. Reciprocal and slow to build, and very durable once established.",
      "**Your own search visibility** for specific needs — “GST notice reply in [city]”, “export refund accountant” — rather than the generic firm name. Specific pages win specific searches.",
      "**Partnerships** with bookkeepers who want someone to file and advise, and with web and software firms whose clients ask who does their accounts.",
      "**Seminars and associations** in one industry, where a single talk can introduce you to the twenty businesses most likely to need you.",
    ]},

    { type: "h2", id: "outreach", text: "Where outreach is allowed: an example" },
    { type: "prose", text: [
      "For a partnership approach — which is between professionals, not to prospective clients — the message is about mutual referrals:",
      "“Hi Karan — you build websites for a lot of new businesses in Noida, and most of them ask someone about GST and accounts in their first months. We handle exactly that for small businesses, and we are often asked who builds good websites. Would it make sense to meet for coffee and see whether our clients overlap?”",
      "For accountants and bookkeepers permitted to approach businesses directly, the same principle as in any service applies: name their specific situation, offer something small, and ask for a short call.",
    ]},

    { type: "h2", id: "pricing", text: "What to offer first" },
    { type: "prose", text: [
      "A clearly scoped first engagement makes it easy to say yes: a compliance setup for a new business, a notice response, a one-time review of last year's books. Each has a defined end and shows the client how you work.",
      "Then propose an annual engagement with monthly or quarterly deliverables in writing. Clients leave accountants mostly over responsiveness, not fees, so a stated response time is worth putting in the engagement letter.",
    ]},
    { type: "tip", title: "Pick an industry",
      text: "A firm known for restaurants, exporters or startups gets referred inside that industry, speaks at its associations, and can price on specialist knowledge. Generalist firms compete on fees." },

    { type: "h2", id: "judge", text: "What accounting clients judge a firm on" },
    { type: "prose", text: [
      "Clients cannot easily judge the technical quality of accounting work. They judge what they can see, and firms that understand this keep clients longer.",
      "**Response time.** An owner with a notice in hand wants to hear back the same day. Firms that reply in a week lose clients to firms that reply in an hour, whatever their fees.",
      "**Plain explanations.** A one-paragraph summary of what a notice means and what happens next is worth more to an owner than a perfect reply they do not understand.",
      "**Reminders before deadlines.** A message a week before a filing date, listing what you need from them, prevents most late-filing penalties and most arguments about whose fault they were.",
      "**Advice they did not ask for.** Pointing out a credit they are missing or a structure that would save tax is the moment a client starts thinking of you as an adviser rather than a filer.",
      "**Consistency of contact.** Clients dislike being passed between juniors. Even in a larger firm, one named person they can reach makes the relationship feel personal.",
      "None of this needs marketing. It is the reason referrals happen, and referrals remain the main way accounting firms grow. A firm that is visible at trigger moments and excellent at these five things rarely runs short of clients.",
    ]},

    { type: "h2", id: "process", text: "Building the pipeline, step by step" },
    { type: "steps", items: [
      { icon: "search", title: "Choose one industry", detail: "Where you already have two or three good clients." },
      { icon: "map", title: "Map the market", detail: "Use public signals to see where new, growing and exporting businesses cluster." },
      { icon: "verified", title: "Check your rules", detail: "Confirm which channels your membership permits before using any of them." },
      { icon: "send", title: "Build partner relationships", detail: "Bookkeepers, web agencies, company formation services, co-working spaces." },
      { icon: "calendar", title: "Speak where they gather", detail: "One industry association, one useful talk a quarter." },
      { icon: "score", title: "Ask for referrals after wins", detail: "A refund received or a notice closed is the moment to ask." },
    ]},

    { type: "cta", variant: "map", title: "Map new and growing businesses in your city.",
      detail: "Mantis shows where new listings, exporters and hiring businesses cluster, by category — a starting point for partnerships and events.",
      action: "Map your market", href: "/login" },
  ],
  faqs: [
    { q: "How do I get accounting clients?", a: "Be visible at the moments businesses choose or change accountant: registration, growth, export, funding or a notice. Referrals from clients and other professionals, specific search pages and industry associations are the main channels." },
    { q: "Can CA firms in India do cold outreach for clients?", a: "ICAI's Code of Ethics restricts advertising and solicitation by members, so cold pitching for professional services is generally not open to practising CAs. Read the current ICAI guidelines; referrals, partnerships, compliant websites and speaking remain available." },
    { q: "Are bought CA leads worth it?", a: "Treat them with caution. Calling a list of businesses to offer CA services may conflict with ICAI's rules, and such lists rarely show which businesses are at a trigger moment." },
    { q: "Which accounting customers are most valuable?", a: "Growing owner-run businesses, funded startups and exporters, because they need advice and specialist work rather than only filing. New businesses are lower value at first and loyal afterwards." },
    { q: "How can Mantis help an accounting firm?", a: "By showing where new listings, exporters and hiring businesses cluster in a city and category, which helps choose partners, associations and seminar topics. Firms permitted to approach businesses directly can also use it to build lists." },
  ],
  links: [HUB, ["/resources/how-to-get-bookkeeping-clients", "getting bookkeeping clients"], ["/resources/how-to-get-interior-design-clients", "commercial interior design clients"], ["/resources/are-lawyers-and-accountants-a-good-web-design-niche", "accountants as a web design niche"], ["/resources/the-lifetime-value-of-one-local-client", "the lifetime value of one client"], ["/leads", "the lead market"]],
},

/* ───────────────────────────── 6 · photography */
{
  slug: "how-to-get-photography-clients",
  title: "How to Get Photography Clients From Local Businesses",
  excerpt: "Weddings are crowded. Businesses need photographs every time they open, launch a menu, list on a booking site or run an ad — and those moments are visible.",
  meta: "How to get photography clients from local businesses: who buys commercial photography, the signals that show they need photos, and how to price a shoot.",
  category: "Client Acquisition", cluster: "growth", hero: "nearby", mins: 9,
  heroImage: "/resources/thumbs/how-to-price-a-website-redesign.webp",
  heroAlt: "Flat illustration of image frames and page layouts being refreshed with new pictures",
  tags: ["Client Acquisition", "Photography", "Local Business"],
  body: [
    { type: "prose", text: [
      "The steadiest photography clients are local businesses, not couples. **Restaurants need menu photos, hotels need room photos for booking sites, clinics need team portraits, retailers need product shots, and every one of them needs new images when they open, renovate, launch or start advertising** — repeat work at predictable moments, which weddings never offer.",
      "Commercial photography also has a visible gap you can find from outside: a Google listing with three blurry photos, an Instagram with a handful of posts, a delivery-app page with no dish images. That is where to start.",
    ]},

    { type: "h2", id: "who-buys", text: "Which businesses become photography clients" },
    { type: "prose", text: [
      "A business buys photography when its customers choose by looking. That is a long list, and it is worth sorting by how often they need new images.",
      "**Hospitality** — restaurants, cafes, hotels, guest houses, banquet halls — buys most often, because menus change, rooms are renovated and booking sites rank listings partly on photo quality.",
      "**Retail and D2C** need product photography continuously, priced per item, and often pay reliably because the photos directly sell stock.",
      "**Professional services** — clinics, law firms, architects, coaching centres — buy headshots and office photos less often but at decent rates, usually alongside a new website.",
      "**Real estate and interiors** need project and property photography, sometimes video, and repeat with every project.",
    ]},
    { type: "table", head: ["Buyer", "What they need", "How often", "Visible signal"], rows: [
      ["Restaurants and cafes", "Dishes, interiors, menu shots", "Each menu change, each new outlet", "New on Zomato or Swiggy, few listing photos"],
      ["Hotels and guest houses", "Rooms, facilities, exteriors", "After renovation, each season", "Relies on booking sites, no booking engine"],
      ["Retail and D2C brands", "Product photos, lifestyle shots", "Every new range", "Online store on the site"],
      ["Clinics and professional firms", "Team portraits, office", "New website, new partners", "Google listing under five photos"],
      ["Architects and interior designers", "Completed projects", "Each project handover", "Portfolio page on the site"],
    ]},

    { type: "h2", id: "signals", text: "Signals that a local business needs photographs" },
    { type: "prose", text: [
      "Mantis checks these on Google listings, websites and delivery-app pages. Each is a gap the owner can see for themselves, which makes the first message easy to write.",
    ]},
    { type: "checklist", items: [
      { title: "Google listing incomplete", detail: "Under five photos, missing hours or no website. Few photos on a listing is the most direct photography signal there is." },
      { title: "Just opened", detail: "A new Google listing, an opening-soon website, or a restaurant marked new on a delivery app. New businesses need every image at once." },
      { title: "Weak Instagram", detail: "Under 1,000 followers or under 30 posts. Often a sign the business has nothing good to post, not nothing to say." },
      { title: "Running Meta ads", detail: "Active ads need fresh creative regularly. Businesses paying for ads with phone snaps are an easy conversation." },
      { title: "Online store or online menu", detail: "Each product or dish needs a photograph, and the count tells you the size of the job." },
      { title: "Hotel relying on booking sites", detail: "Listed on booking platforms with no booking engine of its own — photo quality decides how it ranks there." },
      { title: "Portfolio page", detail: "Architects, interior designers and builders with a projects page need each new project shot properly." },
    ]},
    { type: "cta", variant: "table", title: "Find businesses with fewer than five photos on Google.",
      detail: "Mantis checks Google listings for missing photos and hours, and flags new restaurants and new listings — by category and city.",
      action: "Search for photography leads", href: "/login" },

    { type: "h2", id: "where", text: "Where photography clients come from" },
    { type: "prose", text: [
      "**Web designers and marketing agencies.** They constantly need photographs for clients and rarely have a photographer they trust. Two agency relationships can provide steady commercial work.",
      "**Interior designers and architects.** Every completed project needs shooting, and they often share the cost with the furniture or materials supplier — two clients per shoot.",
      "**Direct outreach to businesses with visible gaps.** You control the volume, and your best sales tool is the comparison: their current photo next to one you took of a similar business.",
      "**Instagram and portfolio sites.** Useful as proof, slow as a source. Businesses rarely search for a commercial photographer; they ask someone they know.",
      "**Delivery apps and booking platforms** sometimes run photographer programmes for their partners. Volume is high and rates are low; treat it as a way to meet owners rather than as the business.",
      "Whichever channel you use, keep a short portfolio for each trade you sell to — ten restaurant images, ten room images, ten product shots. A hotel owner flicking through dish photography is not seeing their own business; a set built for their trade does the selling for you.",
    ]},

    { type: "h2", id: "outreach", text: "An outreach example for a restaurant" },
    { type: "prose", text: [
      "Show, do not describe. A single before-and-after image does more than any message.",
      "“Hi — I saw Spice Route just opened on Swiggy in Malviya Nagar, congratulations. Right now most of your dishes show without a photo, and on delivery apps people scroll past those. I shoot menus for restaurants in Jaipur — here is one I did last month for a similar kitchen [image]. I can shoot your top 15 dishes in a morning, before the lunch rush. Would that be useful?”",
      "Walk in if the business is nearby — photographers have an advantage most service sellers do not, because you can show the work on your phone at the counter. Go at a quiet hour, and ask for the owner by name.",
    ]},

    { type: "h2", id: "pricing", text: "Pricing commercial photography" },
    { type: "prose", text: [
      "Price by output, not by hour. Owners understand “15 dishes, edited, delivered in three days” far better than a day rate.",
      "**Build packages around their need**: a menu package by number of dishes, a listing package with a set number of interior and exterior images for Google and booking sites, a product package priced per item with volume breaks.",
      "**Be explicit about usage.** Images for their own website, listings and social media are one thing; images used in paid ads or printed hoardings may be priced higher. State it in the quote so there is no argument later.",
      "**Offer a refresh plan** to businesses that need new images regularly — a quarterly shoot for restaurants changing menus, or seasonal shoots for hotels. It turns one-off jobs into recurring income.",
    ]},
    { type: "tip", title: "Shoot one dish for free, carefully",
      text: "For a business you really want, photographing one signature item and sending it is often the strongest pitch available. Do it for few businesses, chosen well, and never for one that has not shown any interest." },

    { type: "h2", id: "mistakes", text: "Mistakes that lose commercial photography clients" },
    { type: "prose", text: [
      "Commercial clients are less forgiving than wedding clients in specific ways, and the mistakes are predictable.",
      "**Shooting at the wrong time.** A restaurant cannot stop service for a photographer, and a clinic cannot clear its waiting room. Book around their business — early mornings, the gap between lunch and dinner, a closed day — and say so in your first message.",
      "**Late delivery.** A business that has a menu going to print or a listing going live needs images by a date. Agree the date in writing and keep it; a slightly less polished set on time beats a perfect set late.",
      "**Unclear rights.** Owners assume they own the photos outright and can give them to anyone, including the delivery app and their franchise partner. If your terms are different, say so in the quote, not after the invoice.",
      "**Styling nobody planned.** Food without styling and rooms without preparation photograph badly however good the camera. Send a one-page checklist before the shoot — what to prepare, what to clean, which dishes to have ready — and bring the small props yourself.",
      "**No follow-up.** A business that liked the first shoot will need more photographs in a few months. Put a reminder in your calendar for the next menu change or season and get in touch before they look for someone else.",
      "Getting these right is what turns one job into a client who books you every season and recommends you to the next business on the street.",
    ]},

    { type: "h2", id: "process", text: "A weekly plan for finding photography clients" },
    { type: "steps", items: [
      { icon: "search", title: "Pick one trade and one area", detail: "For example, new cafes in one neighbourhood." },
      { icon: "signal", title: "Find the visible gaps", detail: "Listings with few photos, new delivery-app pages, weak Instagram, active ads." },
      { icon: "verified", title: "Screenshot their current photos", detail: "Put them next to your work for a similar business." },
      { icon: "map", title: "Visit or message", detail: "Walk in at a quiet hour, or send the comparison on WhatsApp." },
      { icon: "calendar", title: "Offer a short shoot", detail: "A fixed package that fits before opening or between meal services." },
      { icon: "send", title: "Ask for introductions", detail: "Owners and agencies know other businesses that need the same." },
    ]},

    { type: "leads", city: "jaipur", heading: "Businesses in Jaipur with no website yet" },
    { type: "prose", text: [
      "Businesses without a website will need images when they build one. Partnering with a web designer who works this list means you are introduced at exactly the moment photographs are needed.",
    ]},

    { type: "cta", variant: "map", title: "Find the businesses that need photos now.",
      detail: "New openings, thin Google listings, delivery-app pages without images — found by city and category in Mantis.",
      action: "Find photography clients", href: "/login" },
  ],
  faqs: [
    { q: "How do I get photography clients from businesses?", a: "Look for visible gaps: Google listings with under five photos, new restaurants on delivery apps, weak Instagram accounts and businesses running ads. Contact them with a comparison of their current photos and your work for a similar business." },
    { q: "Which businesses need commercial photography most?", a: "Restaurants, cafes, hotels and guest houses, retailers and D2C brands, clinics and professional firms, architects and interior designers. Hospitality needs new images most often." },
    { q: "How should I price commercial photography?", a: "By output rather than hours — a number of dishes, rooms or products, edited and delivered by a date — with usage rights stated in the quote. Offer a refresh plan to businesses that need new images regularly." },
    { q: "Is commercial photography better than wedding photography?", a: "It is steadier. Businesses need new images every time they open, renovate, launch a menu or run ads, which creates repeat work; weddings are one-off and the market is crowded." },
    { q: "Where can photographers find business clients besides Instagram?", a: "Web designers and marketing agencies, interior designers and architects, and direct outreach to businesses with thin Google listings or new delivery-app pages. Instagram is better as proof than as a source." },
  ],
  links: [HUB, ["/resources/digital-marketing-leads", "digital marketing leads"], ["/resources/how-to-get-interior-design-clients", "interior design clients"], ["/resources/how-to-sell-websites-to-restaurants", "selling to restaurants"], ["/resources/how-to-sell-websites-to-guest-houses", "selling to guest houses"], ["/leads/website-development/in/jaipur", "businesses in Jaipur with no website"]],
},
/* ───────────────────────────── 7 · interior design (commercial) */
{
  slug: "how-to-get-interior-design-clients",
  title: "How to Get Interior Design Clients for Office Projects",
  excerpt: "Homeowners are a referral business. Offices, clinics, restaurants and showrooms buy fit-outs at moments you can see coming: hiring, expansion, opening.",
  meta: "How to get interior design clients for office and commercial projects: who buys fit-outs, the growth signals to watch, where leads come from and how to pitch.",
  category: "Client Acquisition", cluster: "growth", hero: "nearby", mins: 9,
  heroImage: "/resources/thumbs/web-design-for-contractors-where-the-leads-are.webp",
  heroAlt: "Flat illustration of a building under fit-out with tools, plans and a client card",
  tags: ["Client Acquisition", "Interior Design", "Commercial"],
  body: [
    { type: "prose", text: [
      "Commercial interior design clients buy at moments you can see coming. **A company hiring fast will outgrow its office; a clinic adding a branch needs a second fit-out; a restaurant group opening its third outlet wants the same look again** — and all three are visible in public data months before the tender goes out. Office projects and other commercial work are where an interior designer can build a pipeline instead of waiting for referrals.",
      "Residential interior design leads come almost entirely through referrals and Instagram, and every designer in the city is competing for them. Commercial work is less crowded, larger per project and more likely to repeat.",
    ]},

    { type: "h2", id: "who-buys", text: "Who buys commercial interior design" },
    { type: "prose", text: [
      "Four groups commission most commercial interiors, and they buy differently.",
      "**Growing companies** — startups after a funding round, IT and services firms adding teams, back offices moving to bigger floors. The decision often sits with a founder, an admin head or an HR lead, and the deadline is the lease date.",
      "**Multi-outlet businesses** — clinic chains, restaurant groups, salon chains, coaching institutes, retail brands. They want a repeatable design they can roll out, and a designer who delivers the second outlet like the first wins the third.",
      "**New single-location businesses** — a first restaurant, a boutique, a specialist clinic. Smaller budgets, high emotional stakes, and a hard opening date.",
      "**Property owners and co-working operators** fitting out floors to lease. Price-focused, but steady.",
    ]},
    { type: "table", head: ["Buyer", "Trigger", "Decision-maker", "What they value"], rows: [
      ["Growing company", "Hiring, funding, lease ending", "Founder, admin or HR head", "Speed, minimal disruption"],
      ["Clinic or restaurant chain", "New branch", "Owner or operations head", "Consistency across outlets"],
      ["New single outlet", "Opening date", "Owner", "Look, budget control"],
      ["Retail brand", "New store or refresh", "Brand or retail head", "Brand standards, footfall"],
      ["Co-working or landlord", "Floor to lease", "Property manager", "Cost per seat, durability"],
    ], note: "Illustrative. Commercial work is won on delivery to a date more than on style." },

    { type: "h2", id: "signals", text: "Interior design leads you can see coming" },
    { type: "prose", text: [
      "These are the signals Mantis detects that predict a fit-out. None says “we need an interior designer” — they say the space is about to stop fitting the business, which is earlier and better.",
    ]},
    { type: "checklist", items: [
      { title: "Hiring", detail: "Open roles on the careers page or job boards. A company adding people quickly will need more space, often within a year." },
      { title: "Several branches or a locations page", detail: "Two or more Google listings under one name, or a branches page. Expansion is already a habit." },
      { title: "Just opened or opening soon", detail: "A new Google listing, a website saying opening soon, or a new restaurant on a delivery app. Sometimes too late for the first fit-out, never too late for the second." },
      { title: "Raised funding recently", detail: "A round in the news in the last twelve months. Funded companies move offices. This check uses a paid news search, so it runs only when you ask for it." },
      { title: "Established", detail: "A hundred or more reviews suggests a business busy enough to refurbish and able to pay for it." },
    ]},
    { type: "cta", variant: "table", title: "Find companies that are hiring fast in your city.",
      detail: "Mantis reads careers pages and job boards, and flags new branches and new openings — the businesses most likely to need a fit-out soon.",
      action: "Search for interior design leads", href: "/login" },

    { type: "h2", id: "where", text: "Where commercial interior projects come from" },
    { type: "prose", text: [
      "**Commercial real estate brokers.** They know who is moving before anyone else does, and tenants often ask them for a designer. A broker relationship is the most valuable one in this business.",
      "**Architects and project management firms** who take on larger projects and subcontract interiors.",
      "**Suppliers** — furniture, flooring, lighting and modular workstation companies — who are asked for designer recommendations and benefit when you specify their products.",
      "**Direct outreach to growing businesses.** The channel you control. It works when the timing is right and the message is about their situation, not your portfolio.",
      "**Tenders and procurement portals** for larger corporate and institutional work. Time-consuming and price-driven, but they bring projects you cannot get any other way.",
      "Most designers find that one or two of these channels produce nearly all their commercial work. The useful habit is recording where every enquiry came from, so that after a year you know which relationships to invest in and which ones only produce site visits that never turn into projects.",
    ]},

    { type: "h2", id: "outreach", text: "What to say to a growing company" },
    { type: "prose", text: [
      "Name the growth, connect it to space, and offer something useful before a pitch.",
      "“Hi Priya — I noticed Fintrail has twelve open roles on your careers page. At that pace most teams in a 40-seat office start running out of meeting rooms and desks within a few months. We design offices for growing teams in Gurgaon and can do a free one-hour space review — how many people your current floor can really hold and what a move or re-plan would involve. Would that be useful before your next lease conversation?”",
      "For multi-outlet businesses, lead with consistency: “I saw you have opened your third clinic. We help chains roll out one design across outlets, on a fixed timeline — the second and third fit-outs cost less and open faster.”",
      "LinkedIn and email reach the admin or HR head at companies; a call to the listed number reaches owners of restaurants and clinics.",
    ]},

    { type: "h2", id: "pricing", text: "Pricing and packaging fit-out work" },
    { type: "prose", text: [
      "Commercial clients want certainty about cost and date more than anything else.",
      "**Separate design fees from execution.** A fixed design fee for layout, drawings and specifications, then execution quoted separately or as a turnkey option. Clients who want to tender the build can; those who want one point of contact pay for it.",
      "**Offer a paid space-planning study first** for companies that are unsure whether to re-plan or move. It is small enough to approve quickly, useful regardless of the outcome, and puts you first in line for the fit-out.",
      "**For chains, price the roll-out**: a design package for the first outlet and a lower adaptation fee for each one after. It rewards them for staying with you.",
      "**Put the programme in the contract.** A dated schedule with milestones — design approval, site start, services complete, handover — matters more to a commercial client than a lower fee, because every week of delay is a week of rent on a space they cannot use.",
    ]},
    { type: "tip", title: "Photograph every handover",
      text: "Commercial buyers choose on finished work they can visit or see. Have every project photographed professionally on handover — it is the portfolio that wins the next one." },

    { type: "h2", id: "qualify", text: "Qualifying commercial interior projects" },
    { type: "prose", text: [
      "Commercial enquiries vary enormously in seriousness, and an unqualified site visit can cost a day. Ask four questions early.",
      "**Is there a date?** A lease start, an opening date or an investor visit. Projects with a date happen; projects without one drift for months.",
      "**Who signs off?** In a company it may be the founder, the finance head and a landlord. Meet the person who approves the budget before you produce drawings, not after.",
      "**Is the space secured?** Designing for a space that has not been leased yet is speculative work. Offer a paid feasibility study instead of full drawings until the lease is signed.",
      "**What has the budget been based on?** Many first-time commercial clients base it on a residential fit-out or a figure a friend mentioned. Ask early, and explain the cost drivers — services, compliance, fire safety, furniture — before the number becomes an argument.",
      "Clients who answer clearly are worth a site visit. Those who cannot are worth a call back when they can. Keeping a short list of “not yet” projects and checking their signals — hiring, funding, new branches — every quarter turns many of them into real work later.",
      "It also helps to agree the deliverables of the first meeting in advance. A walk-through, a short note on options and an indicative range is a reasonable free first step; full layouts, 3D views and a priced bill of quantities are paid work, and saying so up front filters out the enquiries that were only ever collecting free designs.",
      "Finally, check the fit with your practice. A designer whose strength is restaurants will struggle with a regulated healthcare space, and a project that goes wrong costs more in reputation than it ever earns.",
    ]},

    { type: "h2", id: "process", text: "A pipeline for commercial interior design clients" },
    { type: "steps", items: [
      { icon: "search", title: "Pick a segment", detail: "Offices, clinics, restaurants or retail. Each has its own regulations and expectations." },
      { icon: "signal", title: "Watch for growth", detail: "Hiring, new branches, openings and funding in your city." },
      { icon: "phone", title: "Build two broker relationships", detail: "Commercial brokers hear about moves first." },
      { icon: "send", title: "Offer a space review", detail: "Useful to the client, and it puts you first in line." },
      { icon: "calendar", title: "Quote design and build separately", detail: "Fixed design fee, clear execution options, a dated programme." },
      { icon: "score", title: "Win the second outlet", detail: "For chains, the second fit-out is where loyalty is decided." },
    ]},

    { type: "cta", variant: "map", title: "See which businesses are growing near you.",
      detail: "Hiring companies, new branches and new openings by city and category, with phone numbers — in Mantis.",
      action: "Find interior design clients", href: "/login" },
  ],
  faqs: [
    { q: "How do I get interior design clients for office projects?", a: "Watch for growing companies — hiring fast, recently funded, or with a lease ending — and offer a space review before a pitch. Build relationships with commercial real estate brokers, who hear about office moves first." },
    { q: "Where do interior design leads come from?", a: "For commercial work: real estate brokers, architects and project managers, furniture and fit-out suppliers, direct outreach to growing businesses and tenders. Residential leads come mostly from referrals and Instagram." },
    { q: "Which businesses need commercial interior design?", a: "Growing companies, multi-outlet businesses such as clinic and restaurant chains, new single outlets, retail brands and co-working operators or landlords fitting out floors." },
    { q: "How should I price commercial interior design?", a: "Separate a fixed design fee from execution, offer a paid space-planning study as a first step, and for chains, price a roll-out with a lower fee for each outlet after the first." },
    { q: "Can Mantis tell me when a company is moving office?", a: "Not directly. It finds the signals that usually come before a move — open roles, new branches, recent funding — so you can approach companies early." },
  ],
  links: [HUB, ["/resources/how-to-get-photography-clients", "the photography version"], ["/resources/how-to-get-accounting-clients", "accounting and CA clients"], ["/resources/web-design-for-contractors-where-the-leads-are", "where contractor leads are"], ["/resources/building-a-weekly-prospecting-routine", "a weekly prospecting routine"], ["/leads", "the lead market"]],
},

/* ───────────────────────────── 8 · app / software development */
{
  slug: "how-to-get-app-development-clients",
  title: "How to Get App Development Clients and Software Leads",
  excerpt: "App and software development clients are funded, growing or stuck with a system they have outgrown. Here is how to find each one and what to propose first.",
  meta: "How to get app development clients: who commissions apps and custom software, the funding and site signals that predict a project, and how to win the first.",
  category: "Client Acquisition", cluster: "growth", hero: "network", mins: 9,
  heroImage: "/resources/thumbs/best-lead-generation-tools-for-web-design-agencies.webp",
  heroAlt: "Flat illustration of an app dashboard with search, a storefront and lists of qualified accounts",
  tags: ["Client Acquisition", "App Development", "Software"],
  body: [
    { type: "prose", text: [
      "App development clients come from three places: **companies that have just raised money and need product built, businesses whose customers now expect an app or portal, and companies stuck with software they have outgrown.** Good software development leads show at least one of those conditions in public — a funding announcement, developer job posts, a customer login that runs on an old system.",
      "This is different from finding web development work for local businesses, which starts from a small business's own website. App and custom software projects are bigger, slower and bought by founders and product leaders, so the prospecting is closer to B2B sales than to local outreach.",
    ]},

    { type: "h2", id: "who-buys", text: "Who commissions app and software development" },
    { type: "prose", text: [
      "**Funded startups** building or rebuilding their product. They have money, a deadline set by investors and often too few engineers. The founder or CTO decides, and they care about speed and the quality of the team.",
      "**Established businesses going digital** — a pharmacy chain wanting an ordering app, a coaching institute wanting a student app, a manufacturer wanting a dealer portal, a hotel group wanting its own booking engine. The owner or a digital head decides, and they care most about whether it will work and who will maintain it.",
      "**Companies with a struggling product** — a slow app, a vendor who disappeared, an internal tool held together with spreadsheets. They are actively looking, cautious after one bad experience, and willing to pay for reliability.",
      "**Agencies and software firms** that need extra capacity. White-label work is lower margin but steady.",
    ]},
    { type: "table", head: ["Buyer", "Typical project", "Decision-maker", "Public signal"], rows: [
      ["Funded startup", "MVP, version two, mobile app", "Founder or CTO", "Raised recently, next round due, hiring developers"],
      ["Multi-branch business", "Ordering or booking app, staff app", "Owner or operations head", "Several branches, online store, booking"],
      ["Hotel or hospitality group", "Direct booking engine", "Owner or revenue manager", "Relies on booking sites, no booking engine"],
      ["Business with a portal", "Rebuild or new features", "IT or digital head", "Customer login on the site, outdated CMS"],
      ["Agency or software firm", "White-label capacity", "Delivery head", "Hiring developers"],
    ]},

    { type: "h2", id: "signals", text: "Software development leads: signals that predict a project" },
    { type: "prose", text: [
      "Mantis detects each of these. The funding signals come from a paid news search, so they run only when you ask; the rest are read from the company's own site and listings.",
    ]},
    { type: "checklist", items: [
      { title: "Raised in the last twelve months", detail: "Fresh money is usually spent on product and hiring. The strongest single signal for startup development work." },
      { title: "Next round due", detail: "Last round twelve to thirty months ago. Companies preparing to raise want product progress to show investors." },
      { title: "Hiring developers", detail: "Open engineering roles on the careers page or job boards. They need capacity now, and roles that stay open signal a gap you can fill." },
      { title: "Customer login or portal", detail: "Existing software that will need maintenance, features or a rebuild." },
      { title: "Online store, booking or ordering on the site", detail: "A business that already transacts online is a natural candidate for an app." },
      { title: "Hotel with no booking engine", detail: "Listed on booking sites but no direct booking of its own — commission on every room is a clear business case." },
      { title: "Outdated CMS or broken enquiry form", detail: "Signs of neglected technology and a business that may want a better partner." },
    ]},
    { type: "cta", variant: "table", title: "Find startups that raised in the last year.",
      detail: "Ask Mantis for funded companies in your target sector and city — with their open engineering roles and what their site already runs.",
      action: "Search for app development leads", href: "/login" },

    { type: "h2", id: "where", text: "Where app development clients come from" },
    { type: "prose", text: [
      "**Referrals from founders and investors.** The best source by far. One successful project for a funded startup often leads to introductions across the investor's portfolio.",
      "**Outsourcing directories and marketplaces.** Clutch-style listings, Upwork, Toptal. They work, but buyers compare many vendors and the reviews you start without matter a great deal.",
      "**Startup communities and accelerators.** Demo days, founder groups and accelerator partner programmes put you in front of companies at the moment they need to build.",
      "**Signal-based outbound.** Funding news, developer hiring and visible product gaps let you contact companies at the right time with a relevant point of view. It is slower to start than marketplaces and builds a pipeline you own.",
      "**Partnerships with design and marketing agencies** whose clients need an app built after the brand or website work.",
      "Whatever the channel, track the source of every signed project. Most development firms find that a large share of their revenue comes from a few referral relationships, and knowing which ones lets you look after them deliberately rather than by accident.",
    ]},

    { type: "h2", id: "outreach", text: "An outreach example for a funded startup" },
    { type: "prose", text: [
      "Connect their news to a specific need, show relevant work, and propose a small first step.",
      "“Hi Aman — congratulations on the seed round. I noticed you have had three backend roles open on your careers page for some weeks. We are a twelve-person team that has built two logistics apps in the last year [link], and we often help startups ship the next milestone while they hire. Would a 20-minute call to look at your roadmap be useful? Happy to tell you honestly if we are not the right fit.”",
      "Email and LinkedIn reach founders and CTOs. Keep it short, name the trigger, and attach one relevant case study rather than a capabilities deck.",
    ]},

    { type: "h2", id: "pricing", text: "Pricing the first software project" },
    { type: "prose", text: [
      "The biggest risk in a first software project is unclear scope. Packaging should reduce that risk for both sides.",
      "**Start with a paid discovery phase** — two to three weeks of workshops, user flows and a scoped estimate. It is easy to approve, it is useful on its own, and it lets both sides decide whether to continue.",
      "**Then build in fixed-price milestones or a dedicated team.** Fixed price suits a well-defined MVP; a monthly dedicated team suits startups whose roadmap will change.",
      "**Price maintenance separately and up front.** Software needs updates after launch, and a client who did not budget for it will remember you as the reason it broke.",
      "**Show progress every week.** A short demo of working software every week does more for the relationship than any status report, and it surfaces misunderstandings while they are still cheap to fix. Clients who see steady progress rarely argue about invoices.",
    ]},
    { type: "tip", title: "Specialise by domain, not by technology",
      text: "“We build apps for clinics” or “we build logistics software” wins more work than a list of frameworks. Buyers trust a team that already understands their business." },

    { type: "h2", id: "qualify", text: "Qualifying a software development lead" },
    { type: "prose", text: [
      "Software projects fail most often because the client and the developer had different ideas about what was being built. Qualifying well protects both.",
      "**Is there a problem with a cost attached?** “We want an app” is a wish. “We pay booking sites a commission on every room and want direct bookings” or “our field staff fill paper forms that get lost” is a project, because the cost of not building it is clear.",
      "**Who owns the product on their side?** A project with no product owner on the client side will drift, because nobody can make decisions quickly. Ask who will attend the weekly review.",
      "**Is the budget real and approved?** Funded startups usually have one; established businesses sometimes have an idea, not a budget. Ask directly and early.",
      "**What happens after launch?** Hosting, updates, app store changes and support all need an owner and a budget. A client who has not thought about this needs that conversation before the contract.",
      "**Have they worked with an outside team before?** If a previous vendor disappeared, find out why. You will be judged against that experience, and it tells you what they will watch most closely — usually communication and transparency about progress.",
      "Leads that pass are worth a proper proposal. Those that do not are worth a short, honest reply and a note to check back when their signals change — a funding round, new hires or a new branch often turns a wish into a project.",
    ]},

    { type: "h2", id: "process", text: "From signal to signed project" },
    { type: "steps", items: [
      { icon: "search", title: "Choose a domain", detail: "Health, logistics, education, hospitality — wherever you have shipped work." },
      { icon: "signal", title: "Track the triggers", detail: "Recent funding, developer hiring, booking-site dependence, outdated portals." },
      { icon: "verified", title: "Research the product", detail: "Use their app or site before you write. One specific observation beats a deck." },
      { icon: "send", title: "Send a short, relevant note", detail: "The trigger, one case study, a small ask." },
      { icon: "calendar", title: "Sell discovery first", detail: "A paid, time-boxed scoping phase." },
      { icon: "score", title: "Ask for introductions", detail: "After a milestone ships, ask founders and investors who else needs the same." },
    ]},

    { type: "cta", variant: "map", title: "Find companies about to build.",
      detail: "Funding, developer hiring and product gaps, by sector and city — Mantis brings them together with each company's site and contacts.",
      action: "Find app development clients", href: "/login" },
  ],
  faqs: [
    { q: "How do I get app development clients?", a: "Target companies with a reason to build: recent funding, open developer roles, a booking or ordering business with no app, or an outdated portal. Referrals from founders and investors and startup communities are also strong sources." },
    { q: "Where can I find software development leads?", a: "Funding news, careers pages showing engineering roles, outsourcing directories, accelerators and partnerships with design agencies. Mantis combines funding and hiring signals with each company's website." },
    { q: "How is this different from finding web development clients?", a: "Web development for local businesses starts from a small business's own website. App and custom software projects are larger, bought by founders and product leaders, and found through funding, hiring and product signals." },
    { q: "How should I price a first app project?", a: "Start with a paid discovery phase to fix scope, then move to fixed-price milestones or a monthly dedicated team. Agree maintenance pricing before launch." },
    { q: "Do funding signals cost extra in Mantis?", a: "Funding signals come from a paid news search, so they run only when you ask for them. Hiring, site and listing signals are read from the company's own pages." },
  ],
  links: [HUB, ["/resources/how-to-get-it-services-and-cloud-clients", "managed IT and cloud clients"], ["/resources/how-to-get-seo-clients", "getting SEO clients"], ["/resources/how-to-find-clients-for-web-development", "web development clients for local businesses"], ["/resources/how-to-grow-a-web-agency-past-5-lakh-a-month", "growing an agency past 5 lakh a month"], ["/leads", "the lead market"]],
},

/* ───────────────────────────── 9 · IT services / managed IT / cloud */
{
  slug: "how-to-get-it-services-and-cloud-clients",
  title: "IT Services Leads: How to Find Managed IT and Cloud Clients",
  excerpt: "Security and email gaps are visible from outside: expired certificates, missing DMARC, outdated WordPress. They are the best opening an IT provider gets.",
  meta: "IT services leads: which businesses buy managed IT and cloud, the security and email gaps you can detect from outside, and how to turn one into a contract.",
  category: "Client Acquisition", cluster: "growth", hero: "methodology", mins: 9,
  heroImage: "/resources/thumbs/scraping-google-maps-for-leads-what-breaks.webp",
  heroAlt: "Flat illustration of servers and data records passing through a machine with a warning sign",
  tags: ["Client Acquisition", "Managed IT", "Cloud"],
  body: [
    { type: "prose", text: [
      "The best IT services leads are businesses with a technical problem you can see from outside. **An expired SSL certificate, an email domain with no DMARC record, a WordPress install several versions behind, or a credential visible in the site's public code** — each is a concrete, checkable reason for managed IT and cloud clients to talk to you, and most business owners have no idea it is there.",
      "Managed IT is hard to sell cold because when things work, nobody thinks about IT. A visible gap changes that: it turns an abstract “we keep you secure” into “here is something wrong today”.",
    ]},

    { type: "h2", id: "who-buys", text: "Who buys managed IT and cloud services" },
    { type: "prose", text: [
      "The core market for managed IT services is businesses big enough to depend on technology and too small to employ a proper IT team — roughly ten to a few hundred staff.",
      "**Professional firms** — CA firms, law firms, architects, consultancies — handle sensitive client data, depend on email and file sharing, and are increasingly asked about security by their own clients.",
      "**Healthcare** — clinics, diagnostic centres, hospitals — run practice software and patient records that cannot go down.",
      "**Multi-branch businesses** — retail chains, coaching institutes, restaurant groups — need networks, point-of-sale systems and devices managed across locations.",
      "**Growing companies** moving to cloud — from a server in a cupboard to Microsoft 365 or Google Workspace, from on-premise software to cloud hosting — need migration help and someone to run it afterwards.",
    ]},
    { type: "table", head: ["Buyer", "What they need", "Visible signal", "First project"], rows: [
      ["Professional firms", "Secure email, backups, devices", "No DMARC or SPF, outdated CMS", "Email security and backup setup"],
      ["Clinics and diagnostics", "Uptime, data protection", "Weak security headers, SSL expiring", "Security review and hardening"],
      ["Multi-branch businesses", "Networks, POS, devices across sites", "Several branches, locations page", "Network audit across outlets"],
      ["Growing companies", "Cloud migration, user management", "Hiring, customer login on the site", "Workspace or 365 migration"],
      ["Any business with a public site", "Fixes and monitoring", "Site down, SSL expired, exposed secret", "Immediate fix, then a plan"],
    ]},

    { type: "h2", id: "signals", text: "Cloud and IT gaps you can find from outside" },
    { type: "prose", text: [
      "Mantis checks these from public data only — the website, its certificate, its DNS records and its public code. Nothing here requires access to the business's systems, and nothing should: if you find something serious, report it responsibly.",
    ]},
    { type: "checklist", items: [
      { title: "Credential exposed", detail: "A secret key or password visible in the site's public code. Mantis records only the type, never the value. The most urgent signal — tell them privately and quickly." },
      { title: "SSL expired or expiring", detail: "The HTTPS certificate has expired, or expires within three weeks. Visitors see a warning; customers leave." },
      { title: "No DMARC or SPF", detail: "The email domain can be spoofed and mail is more likely to land in spam. A clear, explainable first project." },
      { title: "Outdated CMS", detail: "WordPress older than 6, Joomla older than 4 or Drupal older than 9, read from the site's generator tag. Old versions carry known vulnerabilities." },
      { title: "Weak security headers", detail: "Three or more of HSTS, CSP, X-Frame-Options and X-Content-Type-Options missing." },
      { title: "Website down or no HTTPS", detail: "The listed site does not load, or loads without a secure connection." },
      { title: "Hiring or several branches", detail: "Growth that will need more devices, accounts and network — and often a first IT hire you can replace." },
    ]},
    { type: "cta", variant: "table", title: "Find businesses with no DMARC or an expiring certificate.",
      detail: "Mantis checks each business's certificate, DNS records, CMS version and security headers — by category and city.",
      action: "Search for IT services leads", href: "/login" },

    { type: "h2", id: "where", text: "Where IT services clients come from" },
    { type: "prose", text: [
      "**Referrals from accountants, lawyers and office landlords.** They are the people business owners ask “who does your IT?”. Accountants are especially good partners, because they see the business's finances and its frustrations.",
      "**Vendor partner programmes.** Microsoft, Google and security vendors list partners and sometimes pass on leads. Useful for credibility; the leads are shared.",
      "**Signal-based outreach.** A business with an expired certificate or a spoofable domain has a problem today. Telling them about it, clearly and without alarm, is the most direct opening an IT provider has.",
      "**Break-fix customers.** Businesses that call for one-off repairs are the natural base for managed contracts. Track how often each one calls; the frequent callers are your proposals.",
      "**Industry associations** in one vertical — medical, legal, education — where a reputation for understanding their software spreads quickly.",
      "The common thread is trust. Business owners hand an IT provider the keys to everything — email, files, accounts, devices — and they choose someone a person they trust has vouched for, or someone who has already shown competence by spotting a real problem. Every channel above is a way of earning that trust before the first invoice.",
    ]},

    { type: "h2", id: "outreach", text: "An outreach example built on a real gap" },
    { type: "prose", text: [
      "Be specific, calm and useful. Never frighten, never exaggerate, and never test anything you do not have permission to test.",
      "**Subject:** Your email domain can be spoofed",
      "“Hi Mr Verma — while looking at law firms in Noida I checked a few public email settings, and vermalegal.in has no DMARC record. That means someone could send email that appears to come from your firm, and some of your genuine emails may be landing in clients' spam folders. It is a standard fix and takes about an hour. Happy to walk your team through it on a short call, whether or not you work with us afterwards.”",
      "For an exposed credential, skip the sales pitch entirely: tell them privately what type of secret is exposed and where, and recommend they rotate it. The trust you earn is worth more than any pitch.",
      "If there is no reply, follow up once a week later with something useful — a short guide to the fix their own web person could follow. A provider who helps without being paid is remembered when the next problem arrives.",
    ]},

    { type: "h2", id: "pricing", text: "Pricing managed IT and cloud services" },
    { type: "prose", text: [
      "**Start with a fixed-price fix or audit.** Email security setup, a certificate renewal with monitoring, a CMS update, or a security review across their systems. It solves the problem that opened the conversation and shows how you work.",
      "**Then offer a monthly plan per user or per device**, with a stated response time and a clear list of what is included. Small businesses understand per-user pricing because their software is priced the same way.",
      "**Price projects separately from the plan** — cloud migrations, office moves, new branches. Folding them into the monthly fee makes the plan look expensive and the project look free.",
    ]},
    { type: "tip", title: "Report what you prevented",
      text: "Managed IT clients cancel when they forget why they pay. A short monthly note — patches applied, backups verified, certificates renewed, threats blocked — keeps the value visible." },

    { type: "h2", id: "qualify", text: "Qualifying a managed IT prospect" },
    { type: "prose", text: [
      "A visible gap gets you a conversation. Whether it becomes a monthly contract depends on a few things you should learn on the first call.",
      "**How many people and devices?** Below a handful of users, a monthly plan is hard to justify for either side; offer one-off fixes and a check-up instead. Above that, per-user pricing starts to work.",
      "**Who handles IT today?** Often it is the owner's nephew, an office manager who is good with computers, or a vendor who comes when called. Find out what they do well, so your proposal adds to it rather than insulting it.",
      "**What has gone wrong recently?** A lost laptop, a ransomware scare, an email account taken over, a day without internet. A recent incident is the strongest predictor of a signed contract, and it tells you which service to lead with.",
      "**Are there compliance requirements?** Clients in healthcare, finance and law, or those selling to large companies, increasingly face security questionnaires from their own customers. If they have been asked for one, the conversation is no longer optional for them.",
      "A business with several users, no real IT owner and a recent incident is ready. A business with three users and no problems is a check-up client — worth keeping in touch with as it grows.",
    ]},

    { type: "h2", id: "process", text: "Turning signals into managed IT clients" },
    { type: "steps", items: [
      { icon: "search", title: "Choose a vertical", detail: "Professional firms, healthcare or multi-branch retail." },
      { icon: "signal", title: "Scan for gaps", detail: "Expired or expiring certificates, no DMARC, outdated CMS, weak headers." },
      { icon: "verified", title: "Verify each finding", detail: "Check it yourself before you mention it. A wrong claim ends the conversation." },
      { icon: "send", title: "Explain one gap plainly", detail: "What it means, why it matters, how long the fix takes." },
      { icon: "calendar", title: "Fix first, then propose", detail: "A fixed-price fix, followed by a per-user monthly plan." },
      { icon: "score", title: "Report monthly", detail: "Show what you did and what you prevented." },
    ]},

    { type: "citytable", country: "in", min: 400, limit: 8, order: "size",
      note: "Indian cities by number of businesses Mantis has checked, read live. Larger cities have more professional firms and multi-branch businesses — the core managed IT market." },
    { type: "prose", text: [
      "Cities with the most businesses checked are where the security and email scans have the most sites to read. Where many businesses have no website at all, the IT conversation starts with getting them online properly rather than with security.",
    ]},

    { type: "cta", variant: "map", title: "Find businesses with visible IT gaps.",
      detail: "Certificates, email security, CMS versions and exposed secrets — checked across a category and city in Mantis.",
      action: "Find managed IT and cloud clients", href: "/login" },
  ],
  faqs: [
    { q: "Where can I find IT services leads?", a: "From businesses with visible technical gaps — expired or expiring SSL certificates, no DMARC or SPF, outdated CMS versions, weak security headers — plus referrals from accountants and lawyers, vendor partner programmes and your break-fix customers." },
    { q: "How do I get managed IT clients?", a: "Open with a specific, verified problem and a fixed-price fix, then propose a monthly plan per user or device with a stated response time. Report what you prevented each month to keep clients." },
    { q: "Which businesses buy cloud services?", a: "Growing companies moving from local servers or old software to Microsoft 365, Google Workspace or cloud hosting, and multi-branch businesses that need systems shared across locations." },
    { q: "Is it legal to check a business's security from outside?", a: "Reading public information — a certificate, DNS records, page source — is what any browser does. Testing systems without permission is not acceptable. Mantis only reads public data and stores the type of an exposed secret, never its value." },
    { q: "What should I do if I find an exposed password on a prospect's site?", a: "Tell them privately what type of secret is exposed and where, and recommend they rotate it. Do not use it, do not share it, and do not make the disclosure conditional on a sale." },
  ],
  links: [HUB, ["/resources/how-to-get-app-development-clients", "app development clients"], ["/resources/crm-leads-how-to-find-crm-customers", "CRM leads"], ["/resources/qualifying-a-local-lead-before-you-call", "qualifying a lead before you call"], ["/resources/cold-email-for-local-businesses-when-it-works", "when cold email works"], ["/leads", "the lead market"]],
},
];

async function main() {
  for (const p of posts) {
    await sql`
      INSERT INTO blog_posts (slug, title, excerpt, meta_description, category, cluster, tags,
        author_slug, hero_variant, hero_image, hero_alt, read_minutes, body, faqs, status, featured, published_at)
      VALUES (${p.slug}, ${p.title}, ${p.excerpt}, ${p.meta}, ${p.category}, ${p.cluster},
        ${p.tags}, ${"tarun"}, ${p.hero}, ${p.heroImage}, ${p.heroAlt}, ${p.mins},
        ${sql.json(p.body as unknown as Parameters<typeof sql.json>[0])},
        ${sql.json(p.faqs as unknown as Parameters<typeof sql.json>[0])},
        ${"published"}, ${false}, ${new Date(Date.now() - 120_000)})
      ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, excerpt=EXCLUDED.excerpt,
        meta_description=EXCLUDED.meta_description, category=EXCLUDED.category, cluster=EXCLUDED.cluster,
        tags=EXCLUDED.tags, hero_variant=EXCLUDED.hero_variant, hero_image=EXCLUDED.hero_image,
        hero_alt=EXCLUDED.hero_alt, read_minutes=EXCLUDED.read_minutes,
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
// BLOG_DRY=1 lets a checker import `posts` without writing to the database.
if (process.env.BLOG_DRY !== "1") main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
