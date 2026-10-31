/**
 * Batch 32 — the "growth" cluster hub (how to find clients) and ten spokes on getting leads,
 * customers and users for B2B sellers: generic lead generation, manufacturers, distributors,
 * exporters, wholesalers, first users, first customer, LinkedIn.
 *
 * Sibling posts in this cluster are written by other batches, so the hub refers to them with
 * `[[slug|anchor]]` tokens. At seed time a token becomes a real link only if that slug is
 * published (or seeded in this batch) in the database being written to; otherwise it renders
 * as plain text. The same rule filters the `links` array, so a missing sibling can never
 * produce a dead link — and re-running this seed after the siblings land links them up.
 *
 * Hero thumbnails reuse existing illustrations (max two posts per image).
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number; thumb: string; thumbAlt: string;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const CAT = "Client Acquisition";
const CL = "growth";

const posts: P[] = [
/* ───────────────────────────── 1 · the hub */
{
  slug: "how-to-find-clients",
  title: "How to Find Clients: A Practical Framework for 2026",
  excerpt: "Who buys, how to tell they need it now, where they are listed, what to say, and how many times to say it — the whole client-finding system, by business type.",
  meta: "How to find clients and get clients for any B2B business: define who buys, read buying signals, pick sources by business type, then outreach and follow-up.",
  category: CAT, cluster: CL, hero: "leads", mins: 13,
  thumb: "where-to-find-web-design-clients", thumbAlt: "Flat illustration of a magnifying glass over a map of local businesses feeding a funnel and a checked list",
  tags: ["Client Acquisition", "Lead Generation", "Prospecting"],
  body: [
    { type: "prose", text: [
      "**To find clients, decide exactly who buys what you sell, look for evidence that a business needs it now, go to the places those businesses are listed, contact them with a reason that is about them, and follow up more than once.** That is the whole method. Everything else in this guide is practical detail about doing each of those five steps well for your kind of business.",
      "Most advice on how to get clients skips the first two steps and starts at the third — here are twelve places to find leads — which is why so much of it produces long lists and short pipelines. A list of businesses is not a list of clients. The work that turns one into the other happens before the first message is sent.",
      "This page is the hub for our client acquisition guides. It sets out the framework once, then splits by business type — agencies, professional services, software, manufacturers, wholesalers, exporters — with a link to the detailed guide for each.",
    ]},

    { type: "h2", id: "framework", text: "The five-step framework for finding clients" },
    { type: "steps", items: [
      { icon: "score", title: "Define who buys", detail: "One sentence naming the type of business, its size, its location and the problem you solve. If it fits ten thousand companies it is too loose; if it fits ten it is too tight." },
      { icon: "signal", title: "Read buying signals", detail: "Something visible that says a business needs you now: hiring for a role you replace, no website, running ads with no tracking, a new branch, fresh funding." },
      { icon: "map", title: "Pick sources by business type", detail: "Local businesses live on maps and directories. Software and B2B companies live on the web, in funding news and on job boards. Importers live in trade data and fair catalogues." },
      { icon: "send", title: "Reach out with a reason", detail: "The first line names the signal you saw. The ask is small — a call, a sample, a quote — not a purchase." },
      { icon: "calendar", title: "Follow up on a schedule", detail: "Most replies come after the second or third touch, not the first. Decide the sequence before you start so you do not stop at one." },
    ]},
    { type: "prose", text: [
      "The order matters more than any single step. A sharp definition of the buyer makes the signals obvious; the signals tell you which sources to use; the signals also write the first line of the message; and a follow-up schedule is what converts the effort already spent into replies.",
    ]},

    { type: "h2", id: "who-buys", text: "Step 1: define who buys before you find clients" },
    { type: "prose", text: [
      "An ideal customer profile sounds like a marketing exercise, but in practice it is a filter you can apply to a search. \"Small businesses\" cannot be searched. \"Dental clinics in Pune with fewer than 30 Google reviews\" can. \"B2B SaaS companies in India that raised a seed round in the last year and are hiring their first sales rep\" can.",
      "Write the definition in four parts and test each one against a real search before you trust it.",
    ]},
    { type: "checklist", items: [
      { title: "What the business is", detail: "The category as it would appear on a listing or a website — 'commercial interior designer', not 'design-led firm'." },
      { title: "How big it is", detail: "Something you can see from outside: number of branches, review count, team size on LinkedIn, roles on its careers page." },
      { title: "Where it is", detail: "A city, an area, a country — or 'anywhere' if you sell remotely, which then makes the signal do all the filtering." },
      { title: "Why it buys now", detail: "The trigger. This is the bridge to step two, and the part most definitions leave out." },
      { title: "Who signs", detail: "The owner at a small business, a named function head at a bigger one. It decides your channel." },
    ]},
    { type: "prose", text: [
      "If you already have a few clients, start from them. Look at the three best — paid on time, easy to work with, would buy again — and write down what they had in common before they hired you. That is a better profile than anything invented from scratch.",
    ]},

    { type: "h2", id: "signals", text: "Step 2: look for signals, not just names" },
    { type: "prose", text: [
      "A signal is a fact you can observe from outside a business that makes it more likely to buy what you sell right now. It does two jobs: it ranks a list so you spend time on the likeliest buyers first, and it gives you something specific to say.",
      "Different sellers need different signals. The table below lists the ones that are publicly visible and what each tends to mean.",
    ]},
    { type: "table", head: ["Signal", "Where you see it", "Who it suits"], rows: [
      ["No website, or a social page used as one", "The business's map listing", "Web designers, local marketing"],
      ["Hiring now, with role titles", "Careers page, job boards", "Recruiters, HR and payroll software, office fit-out, IT hardware, training"],
      ["Raised funding recently", "Funding news", "Fundraising advisors, startup legal, virtual CFOs, B2B software"],
      ["Running ads with no tracking", "Ad libraries, the site's own code", "Performance marketers, CRO and landing page work"],
      ["Enquiry form that goes nowhere", "The site's contact form", "CRM, chatbots, WhatsApp automation"],
      ["Several branches or a new one", "Multiple listings, a locations page", "Refrigeration, signage, POS, furniture, uniforms"],
      ["Few reviews or a low rating", "The map listing", "Review management, local SEO"],
      ["Exporter (IEC or export text on the site)", "The website", "Freight, customs, export finance"],
      ["Old site, no HTTPS, not mobile-ready", "The website", "Redesign, maintenance, security"],
    ], note: "Every signal here is something a stranger can check in under a minute — that is what makes it usable at scale." },
    { type: "prose", text: [
      "One caution: an absent signal is weaker evidence than a present one. A map listing with no website field does not prove the business has no website, and a site with no booking link may still take bookings by phone. Treat absences as reasons to look closer, not as facts to quote back to the owner.",
    ]},

    { type: "cta", variant: "table", title: "Start from the signal, not the list.",
      detail: "Describe who you sell to in plain language. Mantis finds the businesses, reads each website for the signals above, and pulls the contacts it states.",
      action: "Find your first leads", href: "/login" },

    { type: "h2", id: "sources", text: "Step 3: where to find clients, by business type" },
    { type: "prose", text: [
      "Where your clients are listed depends on what kind of business they are, not on what kind you are. A business that serves walk-in customers has a map listing almost by definition. A software company with no office worth visiting may have no listing at all, but it has a website, a careers page and probably a funding announcement.",
    ]},
    { type: "table", head: ["Your buyer is…", "Where they are listed", "Best first channel"], rows: [
      ["A local business (clinic, salon, restaurant, shop)", "Map listings, local directories", "Phone, walk-in, WhatsApp"],
      ["A professional firm (CA, law, architects)", "Map listings, professional bodies, their websites", "Phone, email to the partner"],
      ["A B2B supplier or distributor", "Map listings, trade directories, B2B marketplaces", "Phone, then visit"],
      ["A manufacturer", "Websites, industrial cluster directories, trade fairs", "Email with a spec sheet, then call"],
      ["A software or tech company", "Websites, job boards, funding news, developer profiles", "Email, LinkedIn"],
      ["An importer abroad", "Trade data, fair exhibitor lists, export promotion councils", "Email in their time zone"],
    ]},
    { type: "prose", text: [
      "Two things follow from that table. First, a single tool or database rarely covers all of it — sales databases are built from the web and miss businesses that have no website, while map data misses companies that never needed a storefront. Second, the channel follows the listing: a business you found on a map has a phone number far more often than an email address, so plan for the phone. Our piece on [bought databases against live search](/resources/bought-database-vs-live-search) goes into why the two kinds of source disagree.",
    ]},

    { type: "h2", id: "outreach", text: "Step 4: outreach that gets clients to reply" },
    { type: "prose", text: [
      "The first message has one job: earn a reply. It does that by being obviously about the recipient. A line that names the signal — \"saw you are hiring two field sales reps in Indore\", \"your contact form on the services page posts to an address that bounces\" — proves you looked, and it frames what you sell as an answer to something already happening.",
      "Keep the ask small. A fifteen-minute call, a free sample, a quote for one item, a short audit. A request to buy in the first message gets ignored by people who would have bought after a conversation.",
      "Match the channel to the buyer. Owners of small local businesses answer phones and WhatsApp; they rarely read cold email. Founders and managers of software companies live in their inboxes and on LinkedIn. Manufacturers and distributors expect a call and, past a point, a visit. Our comparison of [calling, WhatsApp and walking in](/resources/call-whatsapp-or-walk-in-indian-smbs) covers the local side in detail.",
    ]},

    { type: "h2", id: "follow-up", text: "Step 5: follow-up, and the numbers to plan around" },
    { type: "prose", text: [
      "Most first messages go unanswered for reasons that have nothing to do with you: the owner was busy, the email went to a shared inbox, the call came during a delivery. A second and third touch, a few days apart and each adding something new, recover a large share of those. We wrote up [how many touches a local business usually needs](/resources/how-many-touches-before-a-local-business-buys) separately.",
      "Plan your effort backwards from the number of clients you want. Your own reply and close rates are the only figures that matter, and you will not know them until you have run about a hundred contacts — so run a hundred, measure, and then size the list. As an illustration only: if one in ten contacts replies and one in five replies becomes a client, ten clients need five hundred contacts. If that number looks unmanageable, the fix is usually a sharper signal rather than a bigger list.",
      "Put it on a calendar. The sellers who get clients consistently are rarely the ones with the best scripts; they are the ones who prospect at the same time every week. A [weekly prospecting routine](/resources/building-a-weekly-prospecting-routine) is worth more than any single campaign.",
    ]},

    { type: "h2", id: "by-business-type", text: "How to get clients, by business type" },
    { type: "prose", text: [
      "The framework does not change between industries. The definition, the signals, the sources and the channel do. These are the short versions, each with a full guide.",
    ]},
    { type: "h3", text: "Agencies, marketing and tech services" },
    { type: "prose", text: [
      "Agencies have the richest set of signals, because the gaps they fix are visible on the client's own website: no tracking, no ad pixel, stale blog, missing SEO basics, weak social. Read the site, quote what you found, offer to fix one thing. See [[digital-marketing-leads|digital marketing leads]], [[how-to-get-seo-clients|getting SEO clients]], [[ppc-leads-businesses-not-running-google-ads|PPC leads]], [[how-to-get-app-development-clients|app development clients]] and [[how-to-get-it-services-and-cloud-clients|managed IT and cloud clients]]; for web work, [where to find web design clients](/resources/where-to-find-web-design-clients).",
    ]},
    { type: "h3", text: "Accountants, consultants and professional services" },
    { type: "prose", text: [
      "These buyers choose on trust, so referrals dominate — but triggers still exist: a new business, a company that has started hiring, a second branch. See [[how-to-get-accounting-clients|accounting clients]], [[how-to-get-bookkeeping-clients|bookkeeping clients]], [[how-to-get-interior-design-clients|interior design clients]], [[how-to-get-coaching-clients|corporate training clients]] and [[recruitment-leads-find-companies-hiring|recruitment leads]].",
    ]},
    { type: "h3", text: "Software and SaaS" },
    { type: "prose", text: [
      "Software buyers are found on the web, not on maps: through what their sites show (a booking page, a login, an enquiry form), what they are hiring for and whether they have raised. See [[crm-leads-how-to-find-crm-customers|CRM leads]] and, for the earliest stage, [how to get your first 100 users](/resources/how-to-get-first-100-users).",
    ]},
    { type: "h3", text: "Manufacturers, distributors, wholesalers and exporters" },
    { type: "prose", text: [
      "Physical-goods businesses sell into chains — brand to distributor to retailer, factory to OEM, exporter to importer — and each link has its own directories and trade events. See [manufacturing customers](/resources/how-to-get-customers-for-manufacturing-business), [how to find distributors](/resources/how-to-find-distributors), [wholesale customers](/resources/how-to-get-customers-for-wholesale-business), [buyers for export](/resources/how-to-find-buyers-for-export) and [[logistics-leads-how-to-get-clients|logistics clients]].",
    ]},
    { type: "h3", text: "Commercial services and creative work" },
    { type: "prose", text: [
      "Services sold to offices and venues win on reliability and contracts; creative work wins on a portfolio shown to businesses with an event, a launch or a weak visual presence. See [[how-to-get-customers-for-cleaning-business|commercial cleaning]], [[pest-control-leads-commercial-accounts|pest control]], [[catering-leads-corporate-and-event-clients|catering]], [[how-to-get-clients-for-travel-agency|corporate travel]], [[how-to-get-photography-clients|photography]] and [[how-to-get-graphic-design-clients|graphic design]].",
    ]},

    { type: "h2", id: "first-clients", text: "How to get clients when you are starting from zero" },
    { type: "prose", text: [
      "With no clients, no case studies and no budget, the framework still holds — the sources just shift towards people who already know you. Your first customer almost always comes from your existing network or one introduction away from it; our guide to [getting your first customer](/resources/how-to-get-your-first-customer) lays out that sequence.",
      "After that, the question becomes volume without spending money. [Getting leads without buying lists](/resources/how-to-get-leads-without-buying-lists) covers the free sources and what each costs in hours, and [getting clients from LinkedIn](/resources/how-to-get-clients-from-linkedin) is honest about where that channel works and where it wastes time. For the general process, start with [how to generate leads](/resources/how-to-generate-leads) and [lead generation for small business](/resources/lead-generation-for-small-business).",
    ]},
    { type: "tip", title: "The fastest test of a client definition",
      text: "Search for twenty businesses that match it and read their websites. If you cannot say in one line why each of them would want what you sell, the definition is wrong — fix it before you write a single message." },

    { type: "h2", id: "mistakes", text: "Mistakes that cost the most time" },
    { type: "checklist", items: [
      { title: "Starting with the list", detail: "A list built before the definition is a list of names. You will spend the week deciding who to call instead of calling." },
      { title: "Buying a database as the first move", detail: "Bought lists are shared with every other buyer, often stale, and blind to businesses without websites. Build the first list yourself so you learn what a good lead looks like." },
      { title: "One message, then silence", detail: "Stopping after the first touch throws away most of the replies you would have had." },
      { title: "The same pitch to everyone", detail: "If the first line could be sent to any business, it will be read as if it was." },
      { title: "Email to businesses that live on the phone", detail: "Local owners answer calls. Match the channel to where the buyer actually is." },
      { title: "No record of what worked", detail: "Without a simple log of contacts, replies and outcomes, you cannot tell which signal or source to scale." },
    ]},

    { type: "h2", id: "tools", text: "Where Mantis fits in finding clients" },
    { type: "prose", text: [
      "Mantis does steps two to five for any seller. You describe who you sell to in a sentence; it finds the businesses — local ones from live map listings, and companies that are not on maps (software firms, B2B suppliers, importers, product companies) through web search, funding news and developer profiles. It reads each website for the signals in the table above, and pulls the contacts the site states: emails graded by how likely they are to reach a decision-maker, phones marked mobile or landline, the company LinkedIn and the founder's name where the site gives it.",
      "From there, the Campaign Planner builds an email and AI voice-call sequence that you edit, test on yourself and approve before anything goes out. Mail goes from your own mailbox and a reply stops the sequence for that lead.",
      "New accounts get 500 free credits, once. A new lead costs 5 credits, so that is enough for a real first batch to test a client definition against — which is the point. Our index has checked {{checked}} businesses across {{cities}} cities so far, but the number that matters is how many of your hundred reply.",
    ]},
    { type: "cta", variant: "map", title: "Test your client definition on real businesses.",
      detail: "500 free credits at signup. Describe who you sell to and see who matches, with the signal and contact for each.",
      action: "Start free", href: "/login" },
  ],
  faqs: [
    { q: "How do I find clients for my business?", a: "Write one sentence defining who buys (type, size, location, trigger), pick two or three visible signals that show a business needs you now, search the sources where that kind of business is listed, open with the signal you saw, and follow up at least twice." },
    { q: "What is the fastest way to get clients?", a: "Your existing network, then businesses showing a clear buying signal right now. A short list of fifty businesses that are hiring, expanding or visibly missing what you sell will produce clients faster than a list of thousands chosen by category alone." },
    { q: "How do I get clients with no experience?", a: "Start with people who already know you and ask for introductions rather than sales. Offer a small, fixed-scope first project at a fair price in exchange for a reference. One delivered result is worth more than any pitch." },
    { q: "Where can I find clients online for free?", a: "Map listings for local businesses, company websites and careers pages for B2B buyers, funding news for startups, trade directories and fair exhibitor lists for manufacturers and importers, and LinkedIn search. All are free; what they cost is time." },
    { q: "How many people should I contact to get one client?", a: "It depends on your offer and signal quality, so measure it: contact about a hundred businesses, record replies and outcomes, then size your list from your own rates. If the number needed looks too high, sharpen the signal before adding volume." },
    { q: "Is cold outreach still a good way to get clients?", a: "Yes, when it is specific. Messages that name an observable reason to talk get replies; generic pitches sent at volume do not. Pair it with follow-up and the right channel for the buyer — phone for local owners, email and LinkedIn for software companies." },
  ],
  links: [
    ["/resources/how-to-get-clients-for-insurance-business", "Getting clients for an insurance agency"],
    ["/resources/how-to-get-customers-for-printing-business", "Getting customers for a printing business"],
    ["/resources/how-to-get-customers-for-courier-business", "Getting customers for a courier business"],
    ["/resources/how-to-get-clients-for-construction-business", "Getting clients for a construction company"],
    ["/resources/how-to-get-clients-for-electrical-business", "Getting clients for an electrical contractor"],
    ["/resources/how-to-get-clients-for-consulting-business", "Getting clients for a consulting firm"],
    ["/resources/how-to-get-clients-for-security-agency", "Getting clients for a security agency"],
    ["/resources/how-to-find-buyers-for-packaging", "Finding buyers for packaging"],
    ["/resources/how-to-generate-leads", "how to generate leads"],
    ["/resources/lead-generation-for-small-business", "lead generation for small business"],
    ["/resources/how-to-get-leads-without-buying-lists", "getting leads without buying lists"],
    ["/resources/how-to-get-customers-for-manufacturing-business", "customers for a manufacturing business"],
    ["/resources/how-to-find-distributors", "how to find distributors"],
    ["/resources/how-to-find-buyers-for-export", "finding buyers for export"],
    ["/resources/how-to-get-customers-for-wholesale-business", "customers for a wholesale business"],
    ["/resources/how-to-get-first-100-users", "your first 100 users"],
    ["/resources/how-to-get-your-first-customer", "your first customer"],
    ["/resources/how-to-get-clients-from-linkedin", "clients from LinkedIn"],
    ["/resources/digital-marketing-leads", "digital marketing leads"],
    ["/resources/how-to-get-seo-clients", "SEO clients"],
    ["/resources/ppc-leads-businesses-not-running-google-ads", "PPC leads"],
    ["/resources/how-to-get-app-development-clients", "app development clients"],
    ["/resources/how-to-get-it-services-and-cloud-clients", "IT services clients"],
    ["/resources/crm-leads-how-to-find-crm-customers", "CRM customers"],
    ["/resources/how-to-get-accounting-clients", "accounting clients"],
    ["/resources/how-to-get-bookkeeping-clients", "bookkeeping clients"],
    ["/resources/how-to-get-interior-design-clients", "interior design clients"],
    ["/resources/how-to-get-coaching-clients", "corporate training clients"],
    ["/resources/recruitment-leads-find-companies-hiring", "recruitment leads"],
    ["/resources/logistics-leads-how-to-get-clients", "logistics clients"],
    ["/resources/how-to-get-customers-for-cleaning-business", "commercial cleaning customers"],
    ["/resources/pest-control-leads-commercial-accounts", "pest control accounts"],
    ["/resources/catering-leads-corporate-and-event-clients", "catering clients"],
    ["/resources/how-to-get-clients-for-travel-agency", "travel agency clients"],
    ["/resources/how-to-get-photography-clients", "photography clients"],
    ["/resources/how-to-get-graphic-design-clients", "graphic design clients"],
    ["/resources/where-to-find-web-design-clients", "web design clients"],
    ["/resources/building-a-weekly-prospecting-routine", "a weekly prospecting routine"],
  ],
},

/* ───────────────────────────── 2 · how to generate leads */
{
  slug: "how-to-generate-leads",
  title: "How to Generate Leads for a Small B2B Business",
  excerpt: "A practical process for B2B lead generation when you are small: one buyer definition, two signals, a hundred-business list, a three-touch sequence, and a weekly review.",
  meta: "How to generate leads for a small B2B business: define the buyer, pick signals, build a 100-business list, find contacts, run a 3-touch sequence.",
  category: CAT, cluster: CL, hero: "leads", mins: 9,
  thumb: "how-to-build-a-lead-list-for-a-web-design-agency", thumbAlt: "Flat illustration of business listings passing through a funnel into a checked list of leads",
  tags: ["Lead Generation", "B2B Sales", "Client Acquisition"],
  body: [
    { type: "prose", text: [
      "**To generate leads for a small B2B business, define one type of buyer precisely, pick two signals that show a business needs you now, build a list of about a hundred businesses that show them, find a contact for each, and run a short multi-touch sequence — then review what replied every week.** That process works with no marketing budget and no team, and it is the same one larger companies run with more people.",
      "What changes when you are small is not the method but the constraint. You have a few hours a week, not a department. So the goal is not the most leads; it is the fewest leads that produce a client, which is a question of precision before volume.",
    ]},

    { type: "h2", id: "what-a-lead-is", text: "What counts as a lead (and what does not)" },
    { type: "prose", text: [
      "Three words get used interchangeably and should not be. A **contact** is a business you could reach. A **lead** is a contact that fits your buyer definition and shows a reason to buy. A **qualified lead** is one that has replied and confirmed the need, the budget and who decides.",
      "Most lead generation advice inflates the first into the second. A spreadsheet of five thousand companies in your industry is a contact list. It becomes leads only after a filter — and the filter is where small businesses can beat large ones, because you can afford to look at each business properly.",
    ]},
    { type: "checklist", items: [
      { title: "It fits the buyer definition", detail: "right type, right size, right place." },
      { title: "It shows a reason to buy now", detail: "a signal you can name in the first line of a message." },
      { title: "You can reach a person who decides", detail: "an owner's mobile, a named email, or a role inbox at a small company." },
      { title: "It can afford you", detail: "visible size markers such as branches, team size or ad spend line up with your price." },
    ]},

    { type: "h2", id: "process", text: "A seven-step process to generate leads" },
    { type: "steps", items: [
      { icon: "score", title: "Write the buyer in one sentence", detail: "Type, size, place and trigger. 'Logistics companies in Pune with 20–200 staff that are hiring dispatch coordinators.'" },
      { icon: "signal", title: "Choose two signals", detail: "One that shows need (hiring, no tracking, a new branch) and one that shows ability to pay (team size, reviews, funding)." },
      { icon: "search", title: "Build the first 100", detail: "From the source where that buyer is listed: maps for local firms, websites and job boards for B2B companies." },
      { icon: "enrich", title: "Find a contact for each", detail: "The website's contact page, team page and footer first; then the company LinkedIn for names." },
      { icon: "send", title: "Write a three-touch sequence", detail: "Touch one names the signal. Touch two adds proof. Touch three is a short close-the-loop." },
      { icon: "phone", title: "Book conversations, not sales", detail: "The ask is fifteen minutes or a sample. Qualify on the call." },
      { icon: "calendar", title: "Review weekly", detail: "Which signal and which source produced replies? Do more of that next week." },
    ]},
    { type: "prose", text: [
      "The hundred is deliberate. It is small enough to research properly in a week of part-time work and large enough to tell you something: if a hundred well-chosen businesses produce no replies, the problem is the offer or the signal, and a thousand would only produce the same answer more slowly.",
    ]},

    { type: "h2", id: "signals", text: "Picking signals that generate leads worth calling" },
    { type: "prose", text: [
      "A signal earns its place when it does two things: it raises the odds that a business buys, and it gives you a sentence to open with. \"I noticed you are hiring a second accountant\" is both. \"I noticed you are a manufacturing company\" is neither.",
      "Good B2B signals are the ones a stranger can verify from outside: open roles on a careers page, a new branch listing, funding in the news, ads running with no conversion tracking, an enquiry form that does not post anywhere, a website that has not changed its copyright year in years. Weak signals are inferred ones — 'probably growing', 'looks outdated' — because you cannot quote them back to the buyer.",
      "Match the signal to what you sell. A recruiter wants hiring. A CRM vendor wants lost enquiries. A fit-out firm wants expansion. Our hub on [how to find clients](/resources/how-to-find-clients) has a fuller table of signals and the sellers each one suits.",
    ]},

    { type: "h2", id: "channels", text: "Lead generation channels compared" },
    { type: "prose", text: [
      "There are only a handful of ways leads arrive, and each has a different time-to-first-result. A small business usually needs one fast channel to pay the bills and one slow channel that compounds.",
    ]},
    { type: "table", head: ["Channel", "Time to first lead", "Cost", "Works best for"], rows: [
      ["Your network and referrals", "Days", "Time only", "Everyone, especially at the start"],
      ["Signal-based outbound (email, phone)", "Days to weeks", "Time, or a tool", "B2B services and software"],
      ["Walk-ins and local visits", "Days", "Time and travel", "Selling to local businesses"],
      ["LinkedIn outreach", "Weeks", "Time; paid tiers optional", "Selling to founders and managers"],
      ["Content and search (SEO)", "Months", "Time", "Topics buyers search for"],
      ["Paid ads", "Days", "Budget", "Offers with proven conversion"],
      ["Marketplaces and directories", "Days", "Listing fees", "Commodity products and services"],
    ], note: "Time to first lead is the typical shape, not a measured figure; your own results will vary with the offer." },
    { type: "prose", text: [
      "If you are small and need clients this quarter, signal-based outbound plus referrals is the combination to start with: it is fast, it costs time rather than money, and every conversation teaches you something about the buyer. Content is worth starting at the same time precisely because it is slow.",
    ]},

    { type: "h2", id: "inbound-outbound", text: "Using inbound and outbound to generate leads together" },
    { type: "prose", text: [
      "The two are usually presented as alternatives. For a small business they work best as one loop. Outbound conversations tell you the exact questions buyers ask and the words they use; those questions become pages and posts; the pages bring in a slow stream of inbound leads who already trust you a little; and the inbound leads show you which segment finds you on its own, which sharpens the next outbound list.",
      "In practice that means one habit: after every sales call, write down the question that took longest to answer. Once a week, turn one of those into a short page on your site. After a few months you have a library of answers to real buyer questions, which is both your best inbound asset and your follow-up material — the second touch of a sequence is far stronger when it links to a page that answers an objection before the buyer raises it.",
      "Referrals sit in the same loop. Every client you won through outbound is a source of introductions to similar businesses, and introductions convert better than any cold channel. Ask at the point of delivery, when the result is fresh, and ask for a specific type of business rather than 'anyone'.",
    ]},

    { type: "cta", variant: "table", title: "Generate the first hundred leads in one sitting.",
      detail: "Describe the buyer and the signal. Mantis finds the businesses, reads each website and pulls the contacts it states.",
      action: "Try it free", href: "/login" },

    { type: "h2", id: "contacts", text: "Finding the right contact" },
    { type: "prose", text: [
      "For a small company, the owner or founder is the buyer, and their name is often on the About or Team page. For a larger one, find the function head — operations, HR, marketing — on the company LinkedIn page.",
      "Email addresses are not equal. A named address (priya@) reaches a person. A role address such as sales@ or hello@ at a small business usually reaches the owner too. info@ or support@ at a large company reaches a queue. Phone numbers have the same hierarchy: a mobile gets the owner; a landline gets the front desk.",
      "Do not guess email patterns and send to them at volume. Unverified guesses bounce, and bounces damage the reputation of the mailbox you depend on. Use what the business publishes, and use the phone when it publishes nothing else.",
    ]},

    { type: "h2", id: "sequence", text: "The sequence that turns leads into conversations" },
    { type: "prose", text: [
      "**Touch one** names the signal and makes a small offer: \"Saw the two dispatch roles on your careers page. We place dispatch coordinators for logistics firms in Pune, usually within two weeks. Worth a 15-minute call this week?\"",
      "**Touch two**, three or four days later, adds something useful — a short example, a number from your own work, a relevant observation. Not \"just bumping this\".",
      "**Touch three**, a week after that, closes the loop politely and leaves the door open. A surprising share of replies arrive here, because it removes pressure.",
      "Use a second channel inside the sequence where it fits: a call after the second email for a business that publishes a phone number, or a LinkedIn connection to the founder you emailed. Our post on [how many touches a business needs](/resources/how-many-touches-before-a-local-business-buys) goes deeper on spacing.",
    ]},
    { type: "tip", title: "Keep a three-column log",
      text: "Business, signal used, outcome. After a hundred contacts you will see which signal produced replies — that one line of insight is the most valuable output of your first month of lead generation." },

    { type: "h2", id: "mistakes", text: "Where small-business lead generation goes wrong" },
    { type: "checklist", items: [
      { title: "Volume before precision", detail: "a big, loose list feels productive and produces silence." },
      { title: "Buying a list first", detail: "you skip the step where you learn what a good lead looks like. See why bought databases and live search disagree." },
      { title: "Pitching in the first line", detail: "the opener should be about them; the offer comes second." },
      { title: "Stopping at one touch", detail: "most replies come later in the sequence." },
      { title: "Never reviewing", detail: "without a weekly look at what replied, you repeat what did not work." },
    ]},

    { type: "h2", id: "mantis", text: "How Mantis helps generate leads" },
    { type: "prose", text: [
      "Mantis is built around the process above. You describe the buyer in plain language; it plans a run, shows you the scope and the credit cost, and on approval finds the businesses — local ones from live map listings, and companies that are not on maps through web search, funding news and public developer profiles.",
      "Each lead comes with the signals read from its own website (hiring with role titles, missing tracking, an enquiry form that goes nowhere, branches, and more), emails graded by how likely they are to reach a decision-maker, phones marked mobile or landline, the company LinkedIn and the founder's name where the site states it. The Campaign Planner then drafts an email and AI voice-call sequence that you approve before it runs.",
      "New accounts get 500 free credits once, and each new lead costs 5 — enough to run the first-hundred test from this guide. Building the same list by hand is covered in [how to get leads without buying lists](/resources/how-to-get-leads-without-buying-lists).",
    ]},
    { type: "cta", variant: "map", title: "Run your first hundred on free credits.",
      detail: "500 credits at signup, no card. See the signal and the contact for every lead before you write a word.",
      action: "Start free", href: "/login" },
  ],
  faqs: [
    { q: "What is the best way to generate leads for a small business?", a: "Referrals plus signal-based outbound. Define one buyer precisely, find a hundred businesses showing a reason to buy now, contact each with a message that names that reason, and follow up twice. It costs time rather than budget and teaches you the buyer quickly." },
    { q: "How do I generate B2B leads without a budget?", a: "Use free sources: company websites and careers pages, map listings, funding news, trade directories and LinkedIn search. Research a hundred businesses yourself, find published contacts, and run a three-touch sequence from your own mailbox." },
    { q: "How many leads do I need to get one client?", a: "It depends on your offer and how precise your signal is, so measure it rather than guess. Contact around a hundred well-chosen businesses, count replies and clients, and use your own rates to plan the next list." },
    { q: "What is the difference between a lead and a prospect?", a: "Usage varies, but a useful split is: a contact is any business you could reach; a lead fits your buyer definition and shows a reason to buy; a qualified lead or prospect has replied and confirmed need, budget and who decides." },
    { q: "Is cold email still effective for lead generation?", a: "For B2B buyers who work from an inbox, yes, when the message is specific and the address is real. It works poorly for local owners who live on the phone, and guessed addresses that bounce will damage your mailbox's reputation." },
  ],
  links: [
    ["/resources/how-to-find-clients", "the client-finding framework"],
    ["/resources/lead-generation-for-small-business", "a weekly lead generation system"],
    ["/resources/how-to-get-leads-without-buying-lists", "free lead sources"],
    ["/resources/bought-database-vs-live-search", "bought databases against live search"],
    ["/resources/how-many-touches-before-a-local-business-buys", "how many touches it takes"],
    ["/resources/how-to-build-a-lead-list-for-a-web-design-agency", "building a lead list"],
  ],
},

/* ───────────────────────────── 3 · lead generation for small business */
{
  slug: "lead-generation-for-small-business",
  title: "Lead Generation for Small Business: A Weekly System",
  excerpt: "A lead generation routine an owner can run in about four hours a week: one list day, three outreach days, one follow-up day, and the inbound basics that keep working while you sleep.",
  meta: "Lead generation for small business owners: a four-hour weekly system for finding, contacting and following up leads, plus the inbound basics that compound.",
  category: CAT, cluster: CL, hero: "leads", mins: 8,
  thumb: "free-ways-to-find-businesses-without-websites", thumbAlt: "Flat illustration of listings flowing through a funnel into rows of contacts with a few marked as qualified",
  tags: ["Lead Generation", "Small Business", "Prospecting"],
  body: [
    { type: "prose", text: [
      "**Lead generation for a small business works best as a fixed weekly routine rather than a campaign: one block to build a short list, short daily blocks to contact it, one block to follow up, and a few inbound basics that bring leads in without you.** An owner can run the whole thing in roughly four hours a week, and the consistency matters more than any individual tactic.",
      "Think of it as a system rather than a set of tactics. This guide is for the owner who sells to other businesses and does the selling personally — a services firm, a supplier, a small agency, a B2B manufacturer. If you want the step-by-step method for a single campaign, start with [how to generate leads](/resources/how-to-generate-leads); this is the operating rhythm around it.",
    ]},

    { type: "h2", id: "why-weekly", text: "Why small business lead generation fails" },
    { type: "prose", text: [
      "Small businesses rarely fail at lead generation for lack of ideas. They fail because selling happens in the gaps between delivery, so it happens in bursts: a slow month triggers a flurry of outreach, the flurry produces work, the work crowds out selling, and two months later the pipeline is empty again.",
      "The fix is structural. Selling time has to be booked like client time, in small enough blocks that a busy week does not wipe it out. Twenty focused minutes a day survives a busy week; a free Friday afternoon does not.",
    ]},

    { type: "h2", id: "the-week", text: "The four-hour lead generation week" },
    { type: "table", head: ["Day", "Block", "What you do"], rows: [
      ["Monday", "60 minutes", "Build or top up the list: 20–30 businesses matching your buyer and signal"],
      ["Tuesday", "30 minutes", "First touch to a third of the list"],
      ["Wednesday", "30 minutes", "First touch to the next third; calls to anyone who replied"],
      ["Thursday", "30 minutes", "First touch to the rest; second touch to last week's list"],
      ["Friday", "60 minutes", "Third touches, update the log, one referral ask, one piece of inbound work"],
    ], note: "A template, not a rule. The fixed part is that each block is on the calendar before the week starts." },
    { type: "prose", text: [
      "The numbers in the table are a starting point. If you have more time, widen the outreach blocks rather than the list block; if you have less, shrink the list rather than skipping the follow-ups, because follow-ups produce replies at the lowest cost.",
      "Twenty to thirty new businesses a week sounds small. Over a quarter it is three hundred or more researched, contacted and followed-up leads — which, for most small businesses selling a considered B2B product or service, is more than enough to fill the calendar.",
      "The Monday list is the step that decides everything else, and the one people skip. Without it, the outreach blocks turn into deciding who to contact instead of contacting them.",
    ]},

    { type: "h2", id: "list-day", text: "Monday: building a list of leads that fit" },
    { type: "prose", text: [
      "Keep one sentence at the top of your list describing who you sell to, and add only businesses that fit it and show a reason to buy. For a local buyer, map listings in one or two areas are the fastest source. For B2B companies, their websites, careers pages and LinkedIn pages are.",
      "For each business, note the signal in a column. That column becomes the first line of your message, which is why it has to be specific: 'opened a second branch in Wakad', not 'growing'.",
    ]},
    { type: "checklist", items: [
      { title: "Name and website", detail: "or the map listing if there is no website." },
      { title: "Signal", detail: "one observable fact, in your own words." },
      { title: "Best contact", detail: "owner's mobile, named email, or role inbox." },
      { title: "Channel", detail: "phone, email, WhatsApp or visit, chosen per business." },
      { title: "Status", detail: "touch 1, 2, 3, replied, meeting, won, not now." },
    ]},

    { type: "h2", id: "outreach-days", text: "Tuesday to Thursday: short outreach blocks" },
    { type: "prose", text: [
      "Each block does one thing: send first touches to a slice of the list, or call. Do not mix research into these blocks — that is what Monday was for.",
      "Write first touches from a short template with one custom line: the signal. That keeps each message to a couple of minutes while still reading as written for that business. Our pieces on [cold email that works for local businesses](/resources/cold-email-for-local-businesses-when-it-works) and [choosing between a call, WhatsApp and a visit](/resources/call-whatsapp-or-walk-in-indian-smbs) cover the copy and the channel.",
      "Calls are worth their own slot because they convert differently. A business that ignored an email will often pick up the phone, and a two-minute call does more qualifying than a week of emails.",
    ]},

    { type: "cta", variant: "table", title: "Let Monday's list build itself.",
      detail: "Describe who you sell to; Mantis returns businesses with the signal and the contact already filled in.",
      action: "Build a list", href: "/login" },

    { type: "h2", id: "follow-up", text: "Friday: follow-up, referrals and one inbound task" },
    { type: "prose", text: [
      "Follow-ups go first, because they are the cheapest replies you will get all week. Then update the log — even a spreadsheet with a status column will show, after a month, which signals and channels are pulling their weight.",
      "Then make one referral ask. The best time is right after a delivery that went well: \"Is there anyone else in your network dealing with the same thing?\" Specific asks get specific names; \"let me know if you hear of anyone\" gets nothing.",
      "Then do one piece of inbound work, so that over months some leads start arriving without outreach.",
    ]},

    { type: "h2", id: "inbound", text: "Inbound lead generation basics for small businesses" },
    { type: "prose", text: [
      "Inbound is slow, which is exactly why it belongs in the weekly routine in small doses rather than as a project you start when outbound is going badly.",
    ]},
    { type: "steps", items: [
      { icon: "map", title: "Complete your Google listing", detail: "Category, hours, photos, services and a website link. B2B buyers check it too, especially for suppliers." },
      { icon: "verified", title: "Ask every happy client for a review", detail: "A steady trickle matters more than a burst. Reviews are what a stranger reads before calling you." },
      { icon: "data", title: "Answer one buyer question a week", detail: "A short page or post answering a question you hear on calls. Over a year that is fifty pages buyers search for." },
      { icon: "enrich", title: "Make the website capture enquiries", detail: "A working form that reaches a phone, a WhatsApp link, and a clear next step on every page." },
    ]},
    { type: "prose", text: [
      "Check the form. A surprising number of small business websites have an enquiry form that posts nowhere or to an address nobody reads, which means inbound leads are being generated and then lost.",
    ]},
    { type: "tip", title: "Measure the routine, not the result",
      text: "For the first eight weeks, track whether each block happened, not how many clients it produced. Results lag the habit by a month or more, and judging too early kills the routine before it works." },

    { type: "h2", id: "local-vs-b2b", text: "Adapting the system: local buyers against B2B buyers" },
    { type: "prose", text: [
      "The weekly shape stays the same whoever you sell to. What changes is the source on Monday and the channel from Tuesday to Thursday.",
      "**If your buyers are local businesses** — shops, clinics, restaurants, workshops — build the list from map listings one or two neighbourhoods at a time, and make the phone and the visit your main channels. Owners answer calls and respond to someone standing at the counter; most do not read cold email. Group the list by area so a visit block covers several businesses in one trip.",
      "**If your buyers are companies** — software firms, manufacturers, agencies, offices — build the list from websites, careers pages and LinkedIn, and lead with email to a named person, followed by a call or a LinkedIn connection. Decision-makers here work from an inbox, and a short, specific email is the least intrusive way in.",
      "**If you sell to both**, run them as separate lists with separate templates. A message written for a clinic owner reads oddly to a procurement manager, and the reverse is worse.",
      "Whichever applies, keep the definition of who you sell to at the top of the list, and re-read it every Monday. Most lists drift — a few loosely matching businesses get added because they were easy to find, and a month later half the list is people who were never going to buy.",
    ]},

    { type: "h2", id: "tools", text: "Lead generation tools a small business actually needs" },
    { type: "prose", text: [
      "Less than the market suggests. A spreadsheet or simple CRM for the log, your own mailbox, a phone, and a way to build the Monday list faster. Everything else — enrichment add-ons, sequencers, intent data — is optional until the routine is running and you know what to scale.",
      "Mantis covers the list-building and outreach parts in one place: it finds businesses that match a plain-language description, reads each website for buying signals and contacts, and runs an approved email and AI voice-call sequence from your own mailbox. 500 free credits at signup cover a few weeks of Monday lists at 5 credits per new lead. For the broader framework this routine sits inside, see [how to find clients](/resources/how-to-find-clients).",
    ]},
    { type: "cta", variant: "map", title: "Four hours a week, with the list done for you.",
      detail: "500 free credits once at signup. Describe your buyer and get leads with signals and contacts attached.",
      action: "Start free", href: "/login" },
  ],
  faqs: [
    { q: "How can a small business generate leads?", a: "Run a fixed weekly routine: build a short list of businesses that fit your buyer and show a reason to buy, contact a slice each day, follow up on Friday, ask for one referral, and do one small inbound task such as a review request or a useful page." },
    { q: "How much time should a small business owner spend on lead generation?", a: "Around four hours a week is enough for most owner-led B2B businesses if it is spread across short daily blocks. Consistency matters more than the total: twenty minutes every day beats a free afternoon that gets cancelled." },
    { q: "What is the cheapest lead generation for small business?", a: "Referrals and your own outreach to a researched list. Both cost time rather than money. A complete Google listing and steady reviews are the cheapest inbound channel and keep working without you." },
    { q: "Should a small business use paid ads for leads?", a: "Only once you know which offer converts and what a client is worth. Ads amplify a working offer; they do not discover one. Most small businesses learn more per rupee from a hundred direct conversations first." },
    { q: "Which lead generation tools does a small business need?", a: "A log (spreadsheet or simple CRM), your own mailbox, a phone, and something to speed up list-building. Add sequencers or enrichment only after the routine is running and you know what is worth scaling." },
  ],
  links: [
    ["/resources/how-to-find-clients", "how to find clients"],
    ["/resources/how-to-generate-leads", "the seven-step lead process"],
    ["/resources/building-a-weekly-prospecting-routine", "a weekly prospecting routine"],
    ["/resources/call-whatsapp-or-walk-in-indian-smbs", "choosing the channel"],
    ["/resources/cold-email-for-local-businesses-when-it-works", "when cold email works"],
  ],
},

/* ───────────────────────────── 4 · how to get leads without buying lists */
{
  slug: "how-to-get-leads-without-buying-lists",
  title: "How to Get Leads Without Buying Lists or Spending Money",
  excerpt: "Every free source of B2B and local leads worth using, what each one actually gives you, what it costs in hours, and the point where paying for speed starts to make sense.",
  meta: "How to get leads with no budget and without buying lists: free sources for local and B2B leads, what each gives you, time cost, and when paying makes sense.",
  category: CAT, cluster: CL, hero: "leads", mins: 7,
  thumb: "bought-database-vs-live-search", thumbAlt: "Flat illustration of an old filing cabinet of records beside a live map search showing current businesses",
  tags: ["Lead Generation", "Free Methods", "Prospecting"],
  body: [
    { type: "prose", text: [
      "**You can get leads without buying lists by building them from public sources yourself: map listings for local businesses, company websites and careers pages for B2B buyers, funding news for startups, trade directories and fair exhibitor lists for manufacturers and importers, and LinkedIn for names.** None of it costs money. All of it costs time, and the skill is spending that time on the sources that match your buyer.",
      "A self-built list also tends to be better than a bought one, for a reason that has nothing to do with price: you know why every business is on it.",
    ]},

    { type: "h2", id: "why-not-buy", text: "Why bought lists underperform" },
    { type: "prose", text: [
      "A purchased list has three structural problems. It is shared — whoever sold it to you sold it to others, so the businesses on it hear the same pitch repeatedly. It is dated — companies move, close and change staff, and the list was compiled before you bought it. And it is selected by category, not by need, so it tells you who a business is but not why it would buy now.",
      "There is a fourth problem specific to local markets. Most sales databases are built by crawling the web, so a business without a website barely exists in them — and in many local categories that is a large share of the market. We covered that in detail in [why bought databases and live search disagree](/resources/bought-database-vs-live-search) and [exclusive leads against your own list](/resources/exclusive-leads-vs-your-own-list).",
    ]},

    { type: "h2", id: "free-sources", text: "Free sources to get leads, and what each gives you" },
    { type: "table", head: ["Source", "Best for", "What you get", "Time cost"], rows: [
      ["Google Maps and map listings", "Local businesses, suppliers, clinics, shops", "Name, phone, address, rating, website if any", "Low per lead, but manual"],
      ["Company websites", "Any B2B buyer", "What they sell, team names, emails, signals", "Medium — you have to read"],
      ["Careers pages and job boards", "Sellers to growing companies", "Open roles, which reveal budget and needs", "Low"],
      ["Funding news", "Selling to startups", "Round, amount, date, founders", "Low"],
      ["LinkedIn search (free)", "Finding decision-makers", "Names, titles, company size", "Medium; limits on free search"],
      ["Trade directories and B2B marketplaces", "Manufacturers, suppliers, distributors", "Product categories, contact numbers", "Low, but listings are shared"],
      ["Trade fair exhibitor lists", "Manufacturers, exporters, importers", "Companies active in a sector this year", "Low"],
      ["Industry associations and chambers", "Professional and industrial buyers", "Member lists, sometimes with contacts", "Varies"],
    ], note: "Time cost is relative. Reading websites is the slowest step and also the one that produces the signal you open with." },
    { type: "prose", text: [
      "The pattern to notice: the fast sources give you names, and the slow source — reading the business's own website — gives you the reason to call. Skip that step and you are back to a category list, just a free one.",
    ]},

    { type: "h2", id: "method", text: "A no-budget method to get leads in a week" },
    { type: "steps", items: [
      { icon: "score", title: "Write the buyer and two signals", detail: "Who buys, and what visible fact shows they need it now." },
      { icon: "map", title: "Pull 50 names from the fastest source", detail: "Map listings for local buyers; a job board or funding news for B2B." },
      { icon: "search", title: "Read each website for five minutes", detail: "Confirm the signal, find the decision-maker's name, note the best published contact." },
      { icon: "verified", title: "Cut to the best 30", detail: "Drop anything without a clear signal or a reachable contact." },
      { icon: "send", title: "Contact and follow up", detail: "First touch names the signal; two follow-ups over ten days; call where a phone is published." },
    ]},
    { type: "prose", text: [
      "Thirty well-chosen leads a week is a realistic pace for one person doing it part-time. That is enough to learn whether your offer lands, which is the real purpose of the first month.",
    ]},

    { type: "h2", id: "signals-free", text: "Free signals hiding in plain sight" },
    { type: "prose", text: [
      "The most useful buying signals are public and free to read. You only have to know where to look.",
    ]},
    { type: "checklist", items: [
      { title: "Open roles", detail: "a company hiring salespeople needs a CRM; hiring a second accountant suggests it is outgrowing its books." },
      { title: "A new branch or location", detail: "new premises need fit-out, signage, furniture, equipment and local marketing." },
      { title: "Ads running with no tracking", detail: "visible in the site's code — a performance marketer's best opener." },
      { title: "An enquiry form that goes nowhere", detail: "a form with no working handler means lost enquiries every week." },
      { title: "No website, or a social page used as one", detail: "visible on the map listing itself." },
      { title: "Export text or an IEC number on the site", detail: "relevant if you sell freight, customs or export finance." },
    ]},

    { type: "cta", variant: "table", title: "Same method, without the five minutes per website.",
      detail: "Mantis reads each business's site for these signals and the contacts it publishes. 500 free credits at signup.",
      action: "Try it free", href: "/login" },

    { type: "h2", id: "contacts-free", text: "Getting contacts without paying for data" },
    { type: "prose", text: [
      "Start with what the business publishes: the contact page, the footer, the team page, the Google listing. Small businesses usually publish the owner's mobile or a role inbox that reaches the owner. Larger ones publish a switchboard and sometimes named staff.",
      "For names, the About page and the company LinkedIn page are the best free sources. Pair a name with a role inbox or a phone call — \"Could I speak to Anil about the dispatch roles you posted?\" — rather than guessing an address.",
      "Avoid guessing email patterns at volume. Unverified guesses bounce, and a mailbox that bounces a lot gets filtered, which costs you far more than a data subscription would.",
    ]},

    { type: "h2", id: "example", text: "A worked example: getting leads for an HR consultancy" },
    { type: "prose", text: [
      "To make the method concrete, take a two-person HR and payroll consultancy in Pune with no marketing budget. Its buyer: companies with roughly 20 to 200 staff that are growing fast enough to outgrow spreadsheets and an informal HR function.",
      "**The signal** is hiring. A company advertising several roles at once is adding headcount, and headcount is what makes payroll, compliance and onboarding painful. A second signal for ranking is a careers page with no structured hiring process — roles posted as images, or a 'send your CV to' address.",
      "**The source** is job boards and company careers pages, searched for Pune and filtered to companies posting three or more roles. That produces a few dozen names in an hour.",
      "**The research** is five minutes per company: confirm the roles on the company's own site, find the founder or operations head on the About page or company LinkedIn, and note the best published contact. Companies without a reachable person get dropped.",
      "**The outreach** opens with the signal: \"Saw you have five open roles in Pune right now — at that pace, payroll and onboarding usually start taking a founder's evenings. We run both for companies your size. Worth a short call?\" Two follow-ups over ten days, one of them adding a short checklist on onboarding compliance.",
      "None of that cost money, and every lead on the list has a reason to talk. That is the difference a self-built list makes.",
    ]},

    { type: "h2", id: "when-to-pay", text: "When paying for leads starts to make sense" },
    { type: "prose", text: [
      "Free is free in money and expensive in hours. The point to pay is when your hour is worth more than the cost of doing the same work with a tool — and when you already know which signal works, so you are paying to scale something proven rather than to explore.",
      "Rough rule: if building and researching a lead by hand takes you five minutes and your time is worth more than a few hundred rupees an hour, a tool that does it for a few rupees per lead pays for itself on the first list. Before that point, doing it by hand is the education.",
      "What to pay for matters too. Paying for a live search that reads current websites is different from paying for a static list, for the reasons above. Our comparison of [credit-based and seat-based tools](/resources/credit-based-vs-seat-based-lead-tools) covers how pricing models change the maths.",
    ]},
    { type: "tip", title: "Keep the free habit even after you pay",
      text: "Reading five websites by hand each week keeps you close to what buyers actually look like. Sellers who outsource that entirely tend to drift into generic messaging." },

    { type: "h2", id: "mantis", text: "Getting leads with Mantis on free credits" },
    { type: "prose", text: [
      "Mantis does the method in this guide end to end: you describe the buyer, it searches live map listings and the web, reads each website for signals, and returns businesses with graded emails, phones marked mobile or landline, the company LinkedIn and the founder's name where the site states it.",
      "New accounts get 500 free credits once, with no card. A new lead costs 5 credits, and a business you already have is free, so a first list to test your signal costs nothing. For the full client-finding framework, see [how to find clients](/resources/how-to-find-clients); for the do-it-yourself version of map searching, [free ways to find businesses](/resources/free-ways-to-find-businesses-without-websites).",
    ]},
    { type: "cta", variant: "map", title: "Get your first leads without buying a list.",
      detail: "Live search, signals read from each website, contacts the business publishes. Free credits at signup.",
      action: "Start free", href: "/login" },
  ],
  faqs: [
    { q: "How can I get leads with no money?", a: "Build lists from public sources: map listings for local businesses, company websites and careers pages for B2B buyers, funding news for startups, and trade directories for manufacturers. Read each website for a buying signal and use the contacts it publishes." },
    { q: "Is it better to buy leads or build your own list?", a: "Build your own first. A self-built list is current, selected by need rather than category, and not shared with competitors. Paying makes sense once you know which signal works and your time is worth more than the tool's cost per lead." },
    { q: "Where can I get free B2B leads?", a: "Company websites, careers pages and job boards, funding news, LinkedIn search, trade fair exhibitor lists, industry associations and B2B marketplaces. The website itself is the most valuable because it shows the reason to buy." },
    { q: "How do I find someone's email without paying?", a: "Use what the business publishes: contact page, footer, team page and Google listing. At a small business, a role inbox like hello@ usually reaches the owner. Avoid guessing patterns at volume, since bounces damage your mailbox." },
    { q: "How many leads can one person build by hand in a week?", a: "Working part-time and reading each website properly, around thirty well-researched leads a week is a realistic pace. That is enough to test whether an offer and signal work before spending money on scale." },
  ],
  links: [
    ["/resources/how-to-find-clients", "how to find clients"],
    ["/resources/bought-database-vs-live-search", "bought databases against live search"],
    ["/resources/exclusive-leads-vs-your-own-list", "exclusive leads against your own list"],
    ["/resources/free-ways-to-find-businesses-without-websites", "free ways to find businesses"],
    ["/resources/credit-based-vs-seat-based-lead-tools", "how lead tools charge"],
    ["/resources/how-to-generate-leads", "how to generate leads"],
  ],
},

/* ───────────────────────────── 5 · manufacturing */
{
  slug: "how-to-get-customers-for-manufacturing-business",
  title: "How to Get Customers for a Manufacturing Business",
  excerpt: "For Indian manufacturers and MSMEs: the five kinds of B2B buyer, where each one is found, what each needs to see before ordering, and how to approach them without relying on portal leads.",
  meta: "How to get customers for a manufacturing business in India: find OEM buyers, distributors, institutional and export clients, and win orders past portals.",
  category: CAT, cluster: CL, hero: "leads", mins: 8,
  thumb: "justdial-indiamart-as-lead-sources", thumbAlt: "Flat illustration of business directory listings converging on a magnifier and a map of suppliers",
  tags: ["Manufacturing", "B2B Sales", "MSME"],
  body: [
    { type: "prose", text: [
      "**To get customers for a manufacturing business, first decide which kind of buyer you are selling to — OEMs, distributors, institutions, private-label brands or importers — because each is found in a different place and needs different proof before it orders.** Then build a short list of buyers showing a reason to need a supplier now, approach them with a spec sheet and a sample offer, and follow up until you are on their approved vendor list.",
      "Most Indian manufacturers and MSMEs get their first customers through relationships and their next ones through B2B portals. Both work up to a point. The ceiling of the portal model is that the same enquiry goes to many suppliers at once, which turns every deal into a price fight. Getting manufacturing leads you found yourself is how you escape that.",
    ]},

    { type: "h2", id: "buyer-types", text: "The five kinds of manufacturing customer" },
    { type: "table", head: ["Buyer", "What they buy", "Where they are found", "What they need to see"], rows: [
      ["OEMs and assemblers", "Components, parts, sub-assemblies", "Industrial clusters, company websites, trade fairs", "Drawings met, tolerances, capacity, PPAP or test reports"],
      ["Distributors and dealers", "Finished goods to resell", "Map listings, trade directories, existing brands' dealer lists", "Margin, schemes, territory, brand support"],
      ["Institutions and government", "Standard goods in volume", "Government e-Marketplace (GeM), tenders, procurement teams", "Registration, certifications, price, compliance"],
      ["Private-label and D2C brands", "Contract manufacturing", "Brand websites, marketplaces, funding news", "MOQ, samples, turnaround, confidentiality"],
      ["Importers abroad", "Finished goods or inputs", "Trade data, fair catalogues, export promotion councils", "Certifications, export paperwork, Incoterms, samples"],
    ]},
    { type: "prose", text: [
      "Pick one or two to start with. A manufacturer that tries to sell to all five at once ends up with a website and a pitch that speak to nobody in particular. The right first segment is usually the one closest to who already buys from you.",
      "For exporters specifically, see [how to find buyers for export](/resources/how-to-find-buyers-for-export); for building a dealer network, [how to find distributors](/resources/how-to-find-distributors).",
    ]},

    { type: "h2", id: "signals", text: "Signals that a buyer needs a new supplier" },
    { type: "prose", text: [
      "Buyers rarely switch suppliers out of curiosity. They switch when something changes, and many of those changes are visible from outside.",
    ]},
    { type: "checklist", items: [
      { title: "Hiring in production, purchase or quality", detail: "a plant adding shifts or a buyer hiring a purchase manager is reviewing vendors." },
      { title: "A new plant, unit or branch", detail: "new capacity needs new inputs, and a new site often means a new local supplier base." },
      { title: "A new product line on their website", detail: "new products need new components and packaging." },
      { title: "Funding for a product company", detail: "a brand that has raised is about to scale volumes and often outgrows its first manufacturer." },
      { title: "Export activity", detail: "a buyer that has started exporting needs suppliers who can meet export documentation and quality." },
      { title: "Frequent stock-outs or long lead times", detail: "visible on a brand's own store or marketplace pages; a supply problem you can solve." },
    ]},

    { type: "h2", id: "finding", text: "How to find manufacturing customers, step by step" },
    { type: "steps", items: [
      { icon: "score", title: "Name the segment and the product fit", detail: "'Furniture makers in the NCR who buy powder-coated steel frames', not 'furniture industry'." },
      { icon: "search", title: "List the buyers", detail: "Map listings for local makers and dealers; websites and fair catalogues for larger OEMs; GeM for institutional demand." },
      { icon: "signal", title: "Read each website", detail: "Look for the products they make, the industries they serve, hiring, new units and certifications." },
      { icon: "enrich", title: "Find the buyer, not the receptionist", detail: "Owner at a small firm; purchase or sourcing head at a larger one, often on the company LinkedIn page." },
      { icon: "send", title: "Lead with a spec sheet and a sample", detail: "Short message, product photos, key specs, MOQ, and an offer to send samples or visit." },
      { icon: "calendar", title: "Follow up until you get a trial order", detail: "Vendor approval takes time; a trial order is the realistic first win." },
    ]},
    { type: "prose", text: [
      "Industrial buyers also cluster physically. Many product categories in India are concentrated in specific towns and industrial areas, and a single visit to a cluster can put you in front of more buyers in a day than a month of email. Use the list to plan the visit, not to replace it.",
    ]},

    { type: "cta", variant: "table", title: "Find buyers by what they make, not just by category.",
      detail: "Mantis searches maps and the web for businesses that match a plain-language description and reads each site for products, hiring and branches.",
      action: "Find manufacturing leads", href: "/login" },

    { type: "h2", id: "portals", text: "B2B portals: useful, but not a strategy" },
    { type: "prose", text: [
      "IndiaMART, TradeIndia and similar marketplaces bring real buyers, and for many MSMEs they are the main source of new enquiries. Keep your listing complete, respond fast, and treat it as one channel.",
      "The limits are worth stating plainly. Portal enquiries are usually sent to several suppliers at once, so you compete on price and response time from the first minute. Many enquiries are small or exploratory. And your position depends on the portal's ranking and your paid tier, which you do not control. Our review of [JustDial and IndiaMART as lead sources](/resources/justdial-indiamart-as-lead-sources) goes through the trade-offs.",
      "Outbound to buyers you chose yourself balances that. A buyer you approached with a reason, who has not posted a public requirement, is not comparing your quote against fifteen others.",
    ]},

    { type: "h2", id: "institutional", text: "Institutional and government customers" },
    { type: "prose", text: [
      "Government departments and public sector units buy a wide range of standard manufactured goods, and for many categories the main route in is the Government e-Marketplace (GeM). Registration is free, and MSMEs have specific provisions in public procurement, including preferences that can help a small manufacturer compete.",
      "GeM rewards preparation. Product listings need accurate specifications, the right category, and pricing you can sustain, because buyers compare listings directly. Watch the bids in your category for a few weeks before pricing aggressively, so you understand where winning prices actually land.",
      "Outside GeM, large private institutions — hospitals, universities, hotel chains, facility management companies — buy through procurement teams with approved vendor lists. The route in is the same as for OEMs: a short introduction to the procurement head, a spec sheet, certifications, and a request to be considered at the next vendor review. These accounts move slowly, but once you are on the list, orders tend to repeat.",
      "Treat institutional sales as a steady base rather than the whole business. Payment cycles can be long, and a manufacturer dependent on one large institutional buyer is exposed in a way that a spread of private buyers is not.",
    ]},

    { type: "h2", id: "proof", text: "What to have ready before you approach a buyer" },
    { type: "table", head: ["Asset", "Why it matters"], rows: [
      ["One-page spec sheet per product", "Buyers forward it internally; it has to stand on its own"],
      ["Photos of the plant and process", "Proves capacity and seriousness before a visit"],
      ["Certifications and test reports", "ISO, BIS, product-specific tests — often a gate, not a bonus"],
      ["MOQ, lead time and capacity", "The three numbers every purchase team asks first"],
      ["A sample policy", "Free, paid or adjusted against the first order — decide before you are asked"],
      ["Two or three reference customers", "Even small ones; a named buyer who will take a call is strong proof"],
      ["A website that matches the pitch", "Buyers check it; a dated or empty site undercuts everything else"],
    ]},
    { type: "prose", text: [
      "The website point deserves emphasis. Procurement teams increasingly shortlist from a search before they make a call, and a manufacturer with no site, or one that has not been updated in years, gets dropped at that stage without ever knowing it was considered.",
    ]},
    { type: "tip", title: "Sell the trial order, not the contract",
      text: "Purchase teams rarely move a whole requirement to a new vendor. Ask for a small trial order on one part or SKU. Delivering it on time and on spec is what gets you onto the approved list." },

    { type: "h2", id: "outreach", text: "Outreach that works for industrial buyers" },
    { type: "prose", text: [
      "**Phone first for small and mid-sized buyers.** Owners of small factories and dealers answer calls; a short call asking who handles purchasing for a product line gets you to the right person faster than any email.",
      "**Email with attachments for larger buyers.** Keep the body short — who you are, what you make, the one reason it fits them, and the ask — and attach the spec sheet. A purchase manager will forward a clean PDF; they will not forward a long email.",
      "**Visit once there is interest.** A plant visit, or bringing samples to theirs, is where most manufacturing deals are actually decided. Plan routes so one trip covers several buyers in the same cluster.",
      "**Follow up on a schedule.** Vendor decisions move slowly and depend on the buyer's own production calendar. A polite check-in every few weeks keeps you in the frame for when a requirement opens.",
    ]},

    { type: "h2", id: "mantis", text: "Where Mantis fits for manufacturers" },
    { type: "prose", text: [
      "Mantis finds businesses for any seller, including manufacturers looking for B2B buyers. Describe the buyer — 'commercial kitchen equipment dealers in Gujarat', 'D2C skincare brands that recently raised funding', 'furniture makers in Delhi NCR' — and it searches live map listings and the web, then reads each site for what it sells, whether it is hiring, whether it has several branches and whether it exports.",
      "Each lead comes with the contacts the site publishes, graded, plus the company LinkedIn and the owner's name where stated. You can browse public examples on our [manufacturer listings for Surat](/leads/website-development/in/surat/categories/manufacturer), and the broader approach is in [how to find clients](/resources/how-to-find-clients). New accounts get 500 free credits once.",
    ]},
    { type: "cta", variant: "map", title: "Build a buyer list for your factory.",
      detail: "Describe the customer you want. Get businesses with products, signals and contacts read from their own sites. 500 free credits at signup.",
      action: "Start free", href: "/login" },
  ],
  faqs: [
    { q: "How do manufacturers find new customers?", a: "By choosing a buyer segment (OEMs, distributors, institutions, private-label brands or importers), listing buyers from the sources where that segment is found, reading their websites for a reason to need a supplier now, and approaching with a spec sheet, sample offer and a request for a trial order." },
    { q: "How can a small manufacturer get B2B clients in India?", a: "Combine a complete B2B portal listing with direct outreach to buyers you chose: local dealers and makers from map listings, larger firms from their websites and trade fair catalogues, and institutional demand on GeM. Visit industrial clusters once there is interest." },
    { q: "Are IndiaMART leads good for manufacturers?", a: "They bring real buyers, but enquiries are often shared with several suppliers, which pushes price competition. Use the portal as one channel and balance it with outbound to buyers who have not posted a public requirement." },
    { q: "What should a manufacturer send to a potential buyer?", a: "A short message plus a one-page spec sheet, photos of the plant, certifications, MOQ, lead time and capacity, and a clear sample offer. Ask for a small trial order rather than a full contract." },
    { q: "How do I find OEM customers for my parts?", a: "Identify the products your parts go into, list companies that make them from websites, industrial clusters and trade fair exhibitor lists, find the sourcing or purchase head, and lead with drawings you can meet, tolerances, capacity and test reports." },
  ],
  links: [
    ["/resources/how-to-find-clients", "how to find clients"],
    ["/resources/how-to-find-distributors", "how to find distributors"],
    ["/resources/how-to-find-buyers-for-export", "finding export buyers"],
    ["/resources/justdial-indiamart-as-lead-sources", "IndiaMART as a lead source"],
    ["/leads/website-development/in/surat/categories/manufacturer", "manufacturers in Surat"],
  ],
},

/* ───────────────────────────── 6 · how to find distributors */
{
  slug: "how-to-find-distributors",
  title: "How to Find Distributors for Your Product in India",
  excerpt: "For brands and manufacturers: choose the distribution model, find distributors already carrying adjacent brands, qualify them on reach and credit, and make an offer they can say yes to.",
  meta: "How to find distributors for your product in India: pick the model, find distributors carrying adjacent brands, qualify reach and credit, and pitch terms.",
  category: CAT, cluster: CL, hero: "nearby", mins: 7,
  thumb: "how-to-sell-websites-to-hardware-stores", thumbAlt: "Flat illustration of a trade supply store and warehouse beside a product listing and a handshake",
  tags: ["Distribution", "Manufacturing", "B2B Sales"],
  body: [
    { type: "prose", text: [
      "**The most reliable way to find distributors is to find the ones already selling non-competing products to the same retailers you want to reach — then qualify them on reach, warehousing, credit and current brands, and offer terms that make adding your product an easy decision.** Ads saying 'distributors wanted' attract people looking for an opportunity; the distributors you want are already busy and have to be approached.",
      "This guide is for brands and manufacturers building distribution in India, whether that is FMCG through super stockists, durables through dealers, or industrial products through channel partners. The mechanics differ by category; the way to find distributors does not.",
    ]},

    { type: "h2", id: "model", text: "Choose the distribution model first" },
    { type: "prose", text: [
      "Before searching, decide what you are searching for. 'Distributor' means different things in different categories, and approaching the wrong layer wastes both sides' time.",
    ]},
    { type: "table", head: ["Model", "Typical categories", "Who you are looking for"], rows: [
      ["Super stockist → distributor → retailer", "FMCG, food, personal care", "Super stockists per state or region, then town-level distributors"],
      ["Distributor → dealer → end user", "Electricals, building materials, hardware", "Area distributors who already supply dealers in your category"],
      ["Authorised dealer", "Durables, machinery, equipment", "Dealers with a showroom, service ability and local reach"],
      ["Channel partner / reseller", "Industrial products, software, B2B services", "Firms already selling adjacent products to your target buyers"],
      ["Direct to retailer", "Small brands in one city", "No distributor yet; you sell to shops and appoint one later"],
    ]},
    { type: "prose", text: [
      "Many young brands should start with the last row in one city. Selling directly to a few dozen retailers proves the product moves, and a distributor is far easier to sign when you can show sell-through numbers from their own territory.",
    ]},

    { type: "h2", id: "where", text: "Where to find distributors" },
    { type: "steps", items: [
      { icon: "map", title: "Ask the retailers", detail: "Visit shops that should stock you and ask who supplies them with similar products. The same few names come up — those are your distributors." },
      { icon: "search", title: "Search map listings by category and town", detail: "'FMCG distributor', 'electrical wholesaler', 'pharma distributor' plus the town. Listings show the address, phone and often the brands on the board." },
      { icon: "data", title: "Read their websites and listings", detail: "Many list the brands they carry. That tells you category fit and which brands you would sit beside." },
      { icon: "verified", title: "Check adjacent brands' dealer lists", detail: "Non-competing brands often publish distributor or dealer locators. Those distributors already serve your retailers." },
      { icon: "calendar", title: "Use trade fairs and associations", detail: "Category trade fairs and distributor associations put many qualified names in one room." },
    ]},
    { type: "prose", text: [
      "B2B marketplaces and 'distributorship wanted' listings have a place, but treat them carefully. Many responders are investors looking for a new line rather than established distributors with retailer relationships, and the difference only shows once stock has been shipped.",
    ]},

    { type: "h2", id: "qualify", text: "How to qualify a distributor" },
    { type: "checklist", items: [
      { title: "Retailer reach", detail: "how many outlets they service, in which towns, and how often their salesmen visit." },
      { title: "Brands carried", detail: "complementary is good; a direct competitor is a conflict; too many brands means yours gets no attention." },
      { title: "Warehouse and fleet", detail: "storage suited to your product and delivery capacity for your volumes." },
      { title: "Financial strength", detail: "ability to buy stock and extend credit to retailers — the root of most distributor failures." },
      { title: "Sales team", detail: "salesmen who actually pitch new products versus order-takers." },
      { title: "References", detail: "ask two brands they carry how payments and secondary sales have been." },
    ]},
    { type: "prose", text: [
      "Visit the warehouse before signing. A distributor's office tells you little; the godown, the vehicles and the salesmen's beat plans tell you whether your product will actually reach shelves.",
    ]},

    { type: "cta", variant: "table", title: "Find distributors already carrying adjacent brands.",
      detail: "Describe the category and the towns. Mantis searches live listings and reads each distributor's site for the products it already sells.",
      action: "Find distributors", href: "/login" },

    { type: "h2", id: "pitch", text: "What to offer a distributor" },
    { type: "prose", text: [
      "Distributors take on a brand when it is easy to sell and pays for the effort. Your offer should answer four questions before they ask.",
    ]},
    { type: "table", head: ["Question", "What to have ready"], rows: [
      ["What margin do I make?", "A clear price list showing distributor margin and retailer margin at MRP"],
      ["Will it sell?", "Sell-through from existing retailers, consumer demand you are creating, reviews"],
      ["What do I get exclusively?", "Territory definition and the conditions for keeping it"],
      ["What support will you give?", "Launch schemes, retailer incentives, samples, display material, a sales visit"],
      ["What is the commitment?", "Opening order, credit terms, returns and damage policy"],
    ]},
    { type: "prose", text: [
      "Be careful with exclusivity. Giving a large territory to an untested distributor can lock you out of a market for a year. A common compromise is exclusivity for a smaller area with targets attached, widened as volumes are met.",
    ]},
    { type: "tip", title: "Bring a small list of retailers",
      text: "The strongest opening with a distributor is a short list of retailers in their territory who have already agreed to stock you. It turns your pitch from 'please take a risk' into 'here is demand you can fulfil'." },

    { type: "h2", id: "outreach", text: "Approaching distributors" },
    { type: "prose", text: [
      "Call first, then visit. Distribution is a relationship business and most distributors decide in person. A short call to ask whether they handle your category and are open to new brands filters the list quickly; a visit with samples and the price list does the rest.",
      "For distributors in other cities, follow the call with a short email or WhatsApp message containing the catalogue, the margin structure and photos of the product on shelves. Then plan a trip that covers several candidates in one region.",
      "Expect to sign fewer than you meet. A distributor who says no often tells you who might say yes, so ask.",
    ]},

    { type: "h2", id: "other-regions", text: "Finding distributors in a region you do not know" },
    { type: "prose", text: [
      "Expanding into a new state is where most brands struggle, because the shortcut of asking retailers you already know does not exist there. Three things help.",
      "First, do one research trip before any outreach. Spend two days in the region's main trading area visiting a dozen retailers in your category, asking who supplies them and which distributors are reliable. The same handful of names will recur, and you will hear which ones pay late.",
      "Second, use your existing distributors. Distributors in neighbouring regions often know their counterparts across the border, and an introduction from one carries weight with another.",
      "Third, build the candidate list before the trip, not during it. A list of distributors in the category and towns you are targeting, with phone numbers and the brands each carries, lets you book meetings in advance and spend the trip in conversations rather than searching.",
    ]},

    { type: "h2", id: "after-signing", text: "After you find distributors: making them sell" },
    { type: "prose", text: [
      "Signing a distributor is the start of the work, not the end. A new brand competes for attention with every other brand in the godown, and the distributor's salesmen will push whatever is easiest to sell and pays best.",
      "Make your product the easy one. Ride along on the salesmen's beats in the first weeks, help open the first retailers yourself, and give the sales team a simple pitch and a reason to use it — a launch incentive tied to new outlets, not just volume. Track secondary sales (distributor to retailer), not only your primary sales into the distributor, because stock sitting in a godown is not demand.",
      "Review each distributor monthly against a few agreed numbers: active outlets, secondary sales, outstanding payments and stock age. Problems show up there months before they show up as a lost territory.",
    ]},
    { type: "h3", text: "Mistakes when appointing distributors" },
    { type: "checklist", items: [
      { title: "Appointing the first distributor who says yes", detail: "eagerness is not reach; qualify before you sign." },
      { title: "No written agreement", detail: "territory, targets, credit, returns and exit terms belong on paper from day one." },
      { title: "Loading stock to hit your own numbers", detail: "pushing inventory into a distributor creates returns and resentment later." },
      { title: "Ignoring secondary sales", detail: "primary sales tell you what you shipped, not what sold." },
      { title: "Too much territory too soon", detail: "start small, prove it, then widen." },
    ]},

    { type: "h2", id: "mantis", text: "Using Mantis to find distributors" },
    { type: "prose", text: [
      "Mantis can build the candidate list: describe the category and the region — 'electrical distributors in Indore and Bhopal', 'food distributors in Pune that carry snack brands' — and it searches live listings, reads each distributor's website for the products it says it sells, and returns the phone, graded emails, company LinkedIn and owner's name where published.",
      "It does not judge a distributor's financial strength or retailer reach; that still takes a call and a visit. What it removes is the hours of searching town by town. For the manufacturer's wider sales picture, see [how to get customers for a manufacturing business](/resources/how-to-get-customers-for-manufacturing-business) and [how to get customers for a wholesale business](/resources/how-to-get-customers-for-wholesale-business). 500 free credits at signup.",
    ]},
    { type: "cta", variant: "map", title: "Map the distributors in your next region.",
      detail: "Category and towns in, candidates with products carried and contacts out. Free credits at signup.",
      action: "Start free", href: "/login" },
  ],
  faqs: [
    { q: "How do I find distributors for my product in India?", a: "Ask retailers who supplies them with similar products, search map listings for distributors by category and town, read their websites for brands carried, check adjacent brands' dealer locators, and attend category trade fairs. Then qualify on reach, warehouse, credit and current brands." },
    { q: "How do I approach a distributor for the first time?", a: "Call to confirm they handle your category and are open to new brands, then visit with samples, a price list showing their margin, the support you will give and a proposed territory. A short list of retailers already willing to stock you makes the strongest opening." },
    { q: "What margin do distributors expect?", a: "It varies widely by category and channel, so check what adjacent brands offer in the same territory and build your price list from MRP backwards so both distributor and retailer margins are explicit and competitive." },
    { q: "Should I give a distributor exclusive rights?", a: "Only with conditions. Grant exclusivity for a defined area with sales targets, and widen it as targets are met. Large exclusive territories given to an untested distributor can stall a market for a year." },
    { q: "Are 'distributorship wanted' ads a good way to find distributors?", a: "They bring responses, but many come from investors looking for a new business rather than established distributors with retailer relationships. Prioritise distributors already supplying your target retailers." },
  ],
  links: [
    ["/resources/how-to-find-clients", "how to find clients"],
    ["/resources/how-to-get-customers-for-manufacturing-business", "customers for a manufacturing business"],
    ["/resources/how-to-get-customers-for-wholesale-business", "customers for a wholesale business"],
    ["/resources/how-to-sell-websites-to-wholesalers", "how wholesalers and distributors buy"],
    ["/resources/territory-planning-splitting-a-city-between-reps", "planning territories"],
  ],
},

/* ───────────────────────────── 7 · export buyers */
{
  slug: "how-to-find-buyers-for-export",
  title: "How to Find Buyers for Export: A Practical Guide",
  excerpt: "For Indian exporters: pick markets from trade data, find importers through free official sources and fair catalogues, qualify them, and approach with the paperwork and samples buyers expect.",
  meta: "How to find buyers for export from India: choose markets with trade data, find importers via EPCs, fairs and the web, qualify them, and win export customers.",
  category: CAT, cluster: CL, hero: "network", mins: 7,
  thumb: "lead-generation-tools-that-work-outside-the-us", thumbAlt: "Flat illustration of a globe with business listings and map pins in several countries",
  tags: ["Export", "Manufacturing", "B2B Sales"],
  body: [
    { type: "prose", text: [
      "**To find buyers for export, choose one or two target markets using trade data, then find importers and distributors in those markets through export promotion councils, Indian missions abroad, trade fair exhibitor lists and their own websites — and approach each with certifications, export pricing and a sample offer ready.** Export customers are found the same way domestic ones are, with more homework on the market and more paperwork before the first order.",
      "This is a practical guide for Indian manufacturers and merchant exporters looking for their first or next export clients. It assumes you have, or are getting, an Importer Exporter Code (IEC); without it you cannot export at all.",
    ]},

    { type: "h2", id: "markets", text: "Step 1: pick markets before you look for buyers" },
    { type: "prose", text: [
      "The commonest mistake is emailing importers in twenty countries at once. Each market has its own standards, duties, buyer habits and seasons, and you can only do the homework properly for one or two at a time.",
      "Use free trade data to choose. India's Department of Commerce publishes export and import statistics by product code and country, and the ITC Trade Map (free with registration) shows which countries import your product, from whom, and how that has changed. Look for markets that import a lot of your product, where India's share is growing or small enough to grow, and where your price point fits.",
    ]},
    { type: "checklist", items: [
      { title: "Your HS code", detail: "find the exact product code first; every data source and duty schedule uses it." },
      { title: "Import volume and trend", detail: "large and stable or growing beats large and shrinking." },
      { title: "India's share", detail: "some presence proves Indian supply is accepted; dominance means stiff competition from other Indian exporters." },
      { title: "Duties and agreements", detail: "a trade agreement can make your price competitive where it otherwise would not be." },
      { title: "Standards and certifications", detail: "food, textiles, toys, electricals and others have market-specific requirements that decide feasibility." },
    ]},

    { type: "h2", id: "sources", text: "Step 2: where to find export buyers" },
    { type: "table", head: ["Source", "What it gives you", "Cost"], rows: [
      ["Export Promotion Council for your product", "Buyer enquiries, delegations, fair participation, member services", "Membership fee (RCMC)"],
      ["Indian missions and embassies abroad", "Trade enquiries and introductions in that country", "Free"],
      ["International trade fair exhibitor and visitor lists", "Importers and distributors active in your sector this year", "Free to browse; costly to exhibit"],
      ["Importers' own websites", "Product range, brands carried, contact details", "Free; time to read"],
      ["Trade data with company names (paid)", "Who imported what, from whom, how much", "Subscription"],
      ["B2B export marketplaces", "Inbound enquiries", "Listing fees; enquiries often shared"],
      ["LinkedIn", "Names of buyers, sourcing and category managers", "Free; paid tiers optional"],
    ]},
    { type: "prose", text: [
      "The single most useful habit is reading importers' websites. An importer that already carries products like yours, from countries like yours, at a price tier like yours, is a far better lead than one that imports 'consumer goods'. Their site tells you which.",
      "Searching works better than most exporters expect. Queries such as 'importer of brass hardware Germany' or 'wholesale distributor of organic spices Netherlands' return importers' own sites, and their 'brands' or 'suppliers' pages often reveal exactly what they source.",
    ]},

    { type: "cta", variant: "table", title: "Search importers in a foreign city or country.",
      detail: "Mantis finds companies that are not on maps through web search, including importers and distributors abroad, and reads each site for what it carries.",
      action: "Find export buyers", href: "/login" },

    { type: "h3", text: "Getting value from trade fairs without exhibiting" },
    { type: "prose", text: [
      "Exhibiting at an international fair is expensive, and for a first-time exporter it is often too early. Visiting is cheaper and still valuable: you see who your competitors are, how they price and present, and you can meet importers walking the same halls. Export promotion councils often organise subsidised participation in India pavilions, which is the most affordable way to exhibit when you are ready.",
      "The exhibitor and visitor lists are useful even if you never attend. Exhibitors in your category abroad are frequently also importers or distributors of related products, and a fair's exhibitor directory is a current, sector-specific list of active companies — more current than most paid databases.",
      "Before a fair, email the importers you want to meet and ask for fifteen minutes at their stand or in the hall. A pre-booked meeting is worth more than a day of walking past stands.",
    ]},

    { type: "h2", id: "qualify", text: "Step 3: qualify export leads before you spend on samples" },
    { type: "prose", text: [
      "Samples and couriers cost money, and some 'buyers' collect free samples from many suppliers without ordering. A few checks protect you.",
    ]},
    { type: "checklist", items: [
      { title: "A real company", detail: "registered address, a working website, a business email domain rather than a free mailbox." },
      { title: "Category fit", detail: "they already import or distribute products like yours." },
      { title: "Volume fit", detail: "their scale matches your capacity — neither a single-shop retailer nor a chain you cannot supply." },
      { title: "A named contact", detail: "a buyer or category manager, not only a general inbox." },
      { title: "Payment terms that protect you", detail: "advance, letter of credit or credit insurance for first orders; be wary of anyone pushing for open credit immediately." },
    ]},
    { type: "prose", text: [
      "Export credit insurance from ECGC and checks through your bank are worth using on any new overseas buyer. Most export frauds target new exporters through urgent, large first orders with unusual payment arrangements.",
    ]},

    { type: "h2", id: "approach", text: "Step 4: approaching export customers" },
    { type: "steps", items: [
      { icon: "send", title: "Short first email", detail: "Who you are, what you make, why it fits their range, and one line of proof — certifications or a current export market." },
      { icon: "data", title: "Attach a catalogue and price basis", detail: "Prices quoted on a clear Incoterm (FOB or CIF), MOQ, lead time and payment terms." },
      { icon: "verified", title: "Offer samples on clear terms", detail: "Free for qualified buyers, or paid and adjusted against the first order." },
      { icon: "clock", title: "Follow up in their time zone", detail: "Send when their working day starts. Follow up twice over two weeks." },
      { icon: "calendar", title: "Meet at a fair or by video", detail: "A video call or a meeting at a trade fair turns an enquiry into a relationship." },
    ]},
    { type: "prose", text: [
      "Write for a busy buyer who reads in a second language. Short sentences, specific numbers, no flattery. A clean PDF catalogue gets forwarded inside the buyer's company; a long email does not.",
    ]},
    { type: "tip", title: "Prepare the paperwork before the first reply",
      text: "Buyers lose interest when a supplier needs weeks to produce a certificate of origin, test reports or a proforma invoice. Have templates and documents ready so your response to interest is same-day." },

    { type: "h2", id: "mistakes", text: "Mistakes when looking for export buyers" },
    { type: "checklist", items: [
      { title: "Mass emails to every importer in a directory", detail: "generic messages to unqualified lists get ignored and can land your domain in spam folders." },
      { title: "Quoting without a clear Incoterm", detail: "a price with no FOB or CIF basis looks inexperienced and causes disputes later." },
      { title: "Free samples to anyone who asks", detail: "qualify first; set a sample policy before the first request." },
      { title: "Slow replies", detail: "an overseas buyer comparing suppliers will move on if you take days to answer." },
      { title: "Ignoring the target market's standards", detail: "a product that cannot meet local certification will not sell however good the price." },
      { title: "Open credit on the first order", detail: "secure payment until the relationship has a track record." },
    ]},

    { type: "h2", id: "what-buyers-want", text: "What export buyers check first" },
    { type: "table", head: ["They check", "What you should have"], rows: [
      ["Can you meet our standards?", "Product certifications for that market, test reports, factory audit reports if available"],
      ["Can you deliver reliably?", "Capacity, lead times, current export markets"],
      ["Is the price workable?", "Clear Incoterm pricing, landed-cost awareness, volume tiers"],
      ["Are you a real, stable business?", "A professional website, IEC, export council membership, references"],
      ["Will communication be easy?", "A named contact who replies within a working day"],
    ]},
    { type: "prose", text: [
      "Your website does more work in export than at home, because an overseas buyer cannot drop by. A site with clear product pages, certifications and photos of the facility is often what gets you shortlisted.",
    ]},

    { type: "h2", id: "mantis", text: "Where Mantis helps exporters" },
    { type: "prose", text: [
      "Mantis can search for companies in a foreign city or country through web search — importers, wholesalers and distributors in your category — and read each site for what it sells and the contacts it publishes, graded by how likely they are to reach a decision-maker. It also returns the company LinkedIn and named people where the site states them.",
      "It does not replace trade data, export councils or fairs; it shortens the step of turning a market choice into a list of importers to contact. For the domestic side, see [how to get customers for a manufacturing business](/resources/how-to-get-customers-for-manufacturing-business), and for the general framework, [how to find clients](/resources/how-to-find-clients). New accounts get 500 free credits once.",
    ]},
    { type: "cta", variant: "map", title: "Turn a target market into a buyer list.",
      detail: "Describe the importer you want and the country. Get companies with products and contacts read from their sites.",
      action: "Start free", href: "/login" },
  ],
  faqs: [
    { q: "How can I find buyers for export from India?", a: "Choose one or two markets using trade data, then find importers through your export promotion council, Indian missions abroad, trade fair exhibitor lists and importers' own websites. Qualify each one and approach with certifications, Incoterm pricing and a sample offer." },
    { q: "How do I get my first export order?", a: "Focus on one market, contact importers who already carry similar products, respond to interest the same day with complete documents, offer samples on clear terms, and accept a smaller first order with secure payment such as advance or a letter of credit." },
    { q: "Which websites help find international buyers for free?", a: "The ITC Trade Map (free registration) and India's Department of Commerce trade statistics show which markets import your product. Importers' own websites, trade fair exhibitor lists and Indian mission trade sections help find specific buyers." },
    { q: "How do I avoid fraud from export buyers?", a: "Verify the company's registration, website and business email, use advance payment or a letter of credit on first orders, consider ECGC credit insurance, and be cautious of urgent, large first orders with unusual payment arrangements." },
    { q: "Do I need an IEC to find export buyers?", a: "You can research and contact buyers without one, but you need an Importer Exporter Code to actually export. Getting it early also makes you look ready when a buyer asks." },
  ],
  links: [
    ["/resources/how-to-find-clients", "how to find clients"],
    ["/resources/how-to-get-customers-for-manufacturing-business", "domestic manufacturing customers"],
    ["/resources/how-to-find-distributors", "finding distributors"],
    ["/resources/how-indian-agencies-win-uk-and-australian-clients", "selling to overseas buyers"],
    ["/resources/lead-generation-tools-that-work-outside-the-us", "lead tools outside the US"],
  ],
},

/* ───────────────────────────── 8 · wholesale */
{
  slug: "how-to-get-customers-for-wholesale-business",
  title: "How to Get Customers for a Wholesale Business",
  excerpt: "For wholesalers: who your customers are, how to find retailers and institutional buyers street by street, why credit terms decide more deals than price, and how to keep them ordering.",
  meta: "How to get customers for a wholesale business: find retailers, HoReCa and institutional buyers by area, win on credit and service, and keep them reordering.",
  category: CAT, cluster: CL, hero: "nearby", mins: 7,
  thumb: "best-lead-generation-tools-for-indian-agencies", thumbAlt: "Flat illustration of a map of India with routes to rows of shops and a search panel",
  tags: ["Wholesale", "B2B Sales", "Distribution"],
  body: [
    { type: "prose", text: [
      "**To get customers for a wholesale business, list every retailer and institutional buyer in your delivery area that stocks or uses your category, visit or call them in route-sized clusters, and win the first order on reliability and credit terms rather than only on price — then keep them on a regular visit and reorder cycle.** Wholesale customers are local, repeat and relationship-driven, so the work is closer to running a beat than running a campaign.",
      "This guide covers wholesalers and stockists in India selling to shops, restaurants, offices and smaller traders. If you are a brand looking for wholesalers to carry your product, see [how to find distributors](/resources/how-to-find-distributors) instead.",
    ]},

    { type: "h2", id: "who", text: "Who wholesale customers are" },
    { type: "table", head: ["Customer type", "What they care about", "How to reach them"], rows: [
      ["Retail shops (kirana, hardware, pharmacy, stationery)", "Credit days, delivery frequency, availability", "Walk-in visits on a route, phone, WhatsApp orders"],
      ["Hotels, restaurants and caterers", "Consistent quality, early delivery, price stability", "Visit the owner or purchase manager, trial supply"],
      ["Offices, schools, hospitals", "Invoicing, GST compliance, contracts", "Call the admin or purchase head, quote formally"],
      ["Smaller wholesalers in nearby towns", "Margin, credit, minimum quantities", "Phone, visits on market days"],
      ["Online sellers and resellers", "Price, catalogue, dispatch speed", "WhatsApp catalogue, marketplace presence"],
    ]},
    { type: "prose", text: [
      "Most wholesalers have one dominant customer type and a few secondary ones. Know which one pays your bills, and build the prospecting around it.",
    ]},

    { type: "h2", id: "find", text: "How to find wholesale customers in your area" },
    { type: "steps", items: [
      { icon: "map", title: "Draw your delivery area", detail: "Where your vehicles can reach profitably. Customers outside it cost you money however much they buy." },
      { icon: "search", title: "List every outlet in the category", detail: "Search map listings by shop type and area: 'hardware store', 'medical store', 'restaurant', street by street." },
      { icon: "signal", title: "Mark the likely switchers", detail: "New shops, shops that recently expanded, and those near a competitor's weak spot." },
      { icon: "calendar", title: "Group into routes", detail: "Clusters a salesman or you can cover in a morning, visited on fixed days." },
      { icon: "phone", title: "Visit, then follow up by phone and WhatsApp", detail: "First visit with a rate list and samples; take a small trial order; confirm the next visit date." },
    ]},
    { type: "prose", text: [
      "Map listings are the single best free source because almost every shop and restaurant has one, with an address and usually a phone. A complete list of a few areas, grouped into routes, is the foundation of a wholesale beat. Our guide to [territory planning](/resources/territory-planning-splitting-a-city-between-reps) covers splitting an area between salesmen.",
      "Newly opened shops deserve special attention. A shop that has just opened has not settled its suppliers, and a listing with very few reviews, the first one recent, is often a sign of exactly that.",
      "Institutional buyers need a different approach from shops. Schools, hospitals, hotels and offices rarely buy from a salesman on a route; they buy through an admin or purchase head who asks for a formal quotation, a GST invoice and sometimes a vendor registration form. Find them the same way — map listings by category and area — but call to ask who handles purchasing, then send a proper quotation on letterhead. These accounts order larger quantities on a schedule, which makes them valuable even if there are fewer of them.",
    ]},

    { type: "cta", variant: "table", title: "Every outlet in your area, in one list.",
      detail: "Describe the shop types and areas. Mantis pulls live listings with phones and flags newly opened ones.",
      action: "Find wholesale customers", href: "/login" },

    { type: "h2", id: "win", text: "What wins a wholesale customer" },
    { type: "prose", text: [
      "Retailers rarely switch wholesalers for a small price difference, because switching has costs: a new relationship, new credit terms, and the risk that the new supplier is unreliable. What moves them is a problem with their current supplier, or an offer that removes the risk of trying you.",
    ]},
    { type: "checklist", items: [
      { title: "Reliable availability", detail: "having the fast-moving items when the competitor runs out is the most common reason a shop adds a second supplier." },
      { title: "Credit terms", detail: "credit days often matter more than a rupee off the rate; offer them carefully and track them closely." },
      { title: "Delivery frequency", detail: "small, frequent deliveries let a shop hold less stock — valuable for small retailers." },
      { title: "Easy ordering", detail: "WhatsApp orders, a catalogue with current rates, a salesman who visits on a known day." },
      { title: "Schemes", detail: "brand schemes and slab discounts passed on transparently." },
    ]},
    { type: "tip", title: "Ask for the second-supplier slot",
      text: "Do not ask a shop to drop its current wholesaler. Ask to be the backup for the items they run short on. Most long-term accounts start as the second supplier." },

    { type: "h2", id: "example", text: "A worked example: building a new beat" },
    { type: "prose", text: [
      "Take a stationery and office-supplies wholesaler in Jaipur that wants to add two new areas. The customers it wants are stationery shops, photocopy and print shops, schools and small offices.",
      "**The list.** A search of map listings for each shop type in both areas gives every outlet with an address and, for most, a phone number. Schools and offices go on a separate list because they buy differently — through an admin head, with formal quotes and GST invoices.",
      "**The routes.** The shops are grouped into clusters that one salesman can cover in a morning, with each cluster assigned a fixed weekday. Newly opened shops and those with high review counts go first in each route: the first are choosing suppliers, the second sell enough to matter.",
      "**The first visit.** The salesman carries a current rate list, a few samples of fast-moving items, and one offer: be the backup supplier for the items the shop runs short on, with delivery the next morning. Shops that agree get a small first order on cash, and a visit date for the following week.",
      "**The follow-up.** A WhatsApp message the evening before each visit — 'visiting tomorrow, anything you need?' — turns the route into an ordering habit. Within a couple of months, the shops that ordered repeatedly are offered short credit; the rest stay on cash.",
      "Nothing in that example requires a marketing budget. It requires a complete list, a disciplined route and a reason for the shop to say yes the first time.",
    ]},

    { type: "h2", id: "credit", text: "Credit: the decision that makes or breaks wholesale growth" },
    { type: "prose", text: [
      "Credit wins customers and credit sinks wholesalers. The balance is to give it deliberately: start new customers on short terms and small limits, extend them as payments come in on time, and stop supply quickly when they do not.",
      "Keep a simple ledger per customer with limit, days and current outstanding, reviewed weekly. Growth that comes with an unmanaged outstanding book is not growth.",
    ]},
    { type: "table", head: ["Customer stage", "Suggested approach"], rows: [
      ["New, first orders", "Cash or very short credit, small limit"],
      ["Three months of on-time payment", "Standard credit days, modest limit"],
      ["Established, growing", "Higher limit tied to order volume"],
      ["Late payments", "Pause new supply until cleared; do not extend further"],
    ], note: "An illustration of the principle, not a policy — set days and limits to your category and margins." },

    { type: "h2", id: "retain", text: "Keeping wholesale customers ordering" },
    { type: "prose", text: [
      "Wholesale is a reorder business, so retention is where the money is. A fixed visit day, a reminder message before it, and a quick call to any customer whose orders drop off catch most churn before it happens.",
      "Track order frequency per customer. A shop that ordered weekly and has not ordered in three weeks is either struggling or buying elsewhere — both worth a visit.",
      "Your delivery staff are part of the sales team whether you plan it or not. They see every customer more often than anyone else, and they hear first when a shop is unhappy or a new shop has opened on the street. Ask them, every week, what they saw — and reward them for new-outlet tips that turn into orders.",
      "Selling online widens the net. A WhatsApp catalogue with current rates, and a presence on B2B ordering apps or marketplaces where your customers already buy, lets shops outside your beat find you and order between visits.",
    ]},

    { type: "h2", id: "mantis", text: "Where Mantis fits for wholesalers" },
    { type: "prose", text: [
      "Mantis builds the outlet list. Describe the shop types and areas — 'medical stores in Jaipur's Malviya Nagar and Mansarovar', 'restaurants in Gurgaon Sector 29' — and it returns live map listings with phones, ratings and review counts, flags newly opened businesses and several-branch chains, and reads websites where they exist.",
      "It does not replace the beat: the visits, the credit decisions and the relationship are still yours. You can see public examples of what a city holds on our [wholesaler listings for Delhi](/leads/website-development/in/delhi/categories/wholesaler). For the full framework, see [how to find clients](/resources/how-to-find-clients). New accounts get 500 free credits once.",
    ]},
    { type: "cta", variant: "map", title: "Build your next beat in minutes.",
      detail: "Shop types and areas in; outlets with phones, ratings and new-business flags out. 500 free credits at signup.",
      action: "Start free", href: "/login" },
  ],
  faqs: [
    { q: "How do I find customers for my wholesale business?", a: "List every retailer and institutional buyer in your delivery area from map listings, group them into routes, visit with a rate list and samples, and ask for a trial order or the second-supplier slot. Follow up on fixed days by phone and WhatsApp." },
    { q: "How can a wholesaler get more retailers?", a: "Cover your delivery area completely rather than randomly, prioritise newly opened shops and those your competitors serve poorly, offer reliable availability and sensible credit, and make ordering easy with a WhatsApp catalogue and regular visits." },
    { q: "Should a wholesaler give credit to new customers?", a: "Carefully. Start new customers on cash or short terms with small limits, extend as they pay on time, and pause supply when payments slip. Credit wins accounts but unmanaged outstanding balances sink wholesalers." },
    { q: "Can a wholesale business get customers online?", a: "Yes. A WhatsApp catalogue with current rates, a complete Google listing, and presence on B2B ordering apps or marketplaces your customers already use bring orders from outside your regular beat." },
    { q: "What makes retailers switch wholesalers?", a: "Usually a problem with the current supplier — stock-outs, late deliveries, tight credit — rather than a small price difference. Offering to be the backup supplier for fast-moving items is the easiest way in." },
  ],
  links: [
    ["/resources/how-to-find-clients", "how to find clients"],
    ["/resources/how-to-find-distributors", "how to find distributors"],
    ["/resources/territory-planning-splitting-a-city-between-reps", "territory planning"],
    ["/resources/call-whatsapp-or-walk-in-indian-smbs", "call, WhatsApp or walk in"],
    ["/leads/website-development/in/delhi/categories/wholesaler", "wholesalers in Delhi"],
  ],
},

/* ───────────────────────────── 9 · first 100 users */
{
  slug: "how-to-get-first-100-users",
  title: "How to Get Your First 100 Users for a B2B Startup",
  excerpt: "Launch posts do not produce your first 100 users. Founder-led outreach to a narrow, signal-based list does. A concrete playbook, week by week, with what to measure.",
  meta: "How to get your first 100 users for a B2B SaaS or startup: narrow the segment, build signal-based lists, run founder-led outreach, onboard every user by hand.",
  category: CAT, cluster: CL, hero: "leads", mins: 7,
  thumb: "how-to-grow-a-web-agency-past-5-lakh-a-month", thumbAlt: "Flat illustration of rising steps of stacked coins with checkpoints leading to a growing team",
  tags: ["Startups", "SaaS", "Founder-Led Sales"],
  body: [
    { type: "prose", text: [
      "**The first 100 users of a B2B startup almost always come from the founders contacting the right people one at a time: a narrow segment, a list built from visible signals that those businesses have the problem, personal outreach, and hands-on onboarding for every user who says yes.** Launches, ads and content help later. At this stage they mostly produce sign-ups who never come back.",
      "A hundred users is a useful milestone because it is small enough to reach by hand and large enough to tell you whether people keep using the product. The goal is not a hundred accounts; it is a hundred users who use it, from which you learn who your real customer is.",
    ]},

    { type: "h2", id: "segment", text: "Narrow the segment until you can name the users" },
    { type: "prose", text: [
      "\"SMBs\" is not a segment. \"Physiotherapy clinics in Bengaluru with two or more locations that take bookings by phone\" is. A narrow segment lets you find every business in it, write a message that sounds like you understand their day, and get word of mouth going inside a community that talks to itself.",
      "Choose the segment where the problem is sharpest and visible from outside. If your product fixes lost enquiries, look for businesses whose enquiry form does not work. If it is a hiring tool, look for companies hiring for the role it helps with. The signal is what makes outreach feel relevant instead of random.",
    ]},
    { type: "table", head: ["If your product…", "Look for users who…", "Visible signal"], rows: [
      ["Captures or routes leads", "Are losing enquiries", "An enquiry form with no working handler"],
      ["Handles bookings", "Take bookings manually", "No booking link on the site"],
      ["Helps hiring or HR", "Are growing headcount", "Open roles on the careers page"],
      ["Serves funded startups", "Have money to spend now", "A funding round in the last year"],
      ["Improves ad performance", "Already spend on ads", "Running ads, or ad pixels on the site"],
      ["Helps online stores", "Sell online without key tools", "Store with no reviews or email marketing app"],
      ["Secures websites", "Have visible gaps", "Expired SSL, outdated CMS, missing security headers"],
    ]},

    { type: "h2", id: "list", text: "Build a signal-based list of 300 to 500 businesses" },
    { type: "prose", text: [
      "To get 100 active users you need many more conversations, and to get those you need a list several times larger again. A list of a few hundred businesses that show the signal is a reasonable first build; your own reply and activation rates will tell you whether you need more.",
      "Where the list comes from depends on who your users are. Local businesses are on map listings. Software companies, agencies and B2B firms are found through their websites, job boards and funding news. Developer-focused products find users through public developer profiles and communities.",
      "For each business, record the signal you saw and a real contact: the founder's name and a published email, or a role inbox at a small company. That record is your CRM for the first hundred.",
    ]},

    { type: "cta", variant: "table", title: "Your first 500, filtered by the signal that matters.",
      detail: "Mantis finds businesses on maps and companies on the web — including funded startups — and reads each site for signals like hiring, broken forms and missing booking.",
      action: "Build the list", href: "/login" },

    { type: "h2", id: "outreach", text: "Founder-led outreach that gets users" },
    { type: "prose", text: [
      "Outreach from a founder works better than outreach from a sales hire at this stage, for a simple reason: a founder can change the product in response to the conversation, and the recipient can tell.",
      "Write short, specific messages. Name the signal, describe the problem in their words, and ask for something small — fifteen minutes of feedback, or trying it free while you set it up for them. \"I saw your enquiry form on the contact page posts to an address that does not exist — we built a tool that fixes exactly this for clinics. Can I set it up for you this week, free, in exchange for feedback?\"",
      "Do things that do not scale. Set the product up for them. Import their data. Join their onboarding call. Every one of these is also research, and it is the fastest way to find out where the product confuses people.",
    ]},
    { type: "steps", items: [
      { icon: "send", title: "Weeks 1–2: 20 personal messages a day", detail: "Founder's own mailbox and LinkedIn. Track replies by signal." },
      { icon: "phone", title: "Weeks 2–4: calls with everyone who replies", detail: "Learn the problem, not just pitch. Offer hands-on setup." },
      { icon: "verified", title: "Weeks 3–6: onboard by hand", detail: "Get each new user to the first useful result yourself. Watch where they get stuck." },
      { icon: "enrich", title: "Weeks 4–8: ask every active user for two introductions", detail: "Same segment, same problem. Introductions convert far better than cold messages." },
      { icon: "score", title: "Every week: review activation, not sign-ups", detail: "How many used it again after the first week? That number decides what to fix." },
    ]},

    { type: "h2", id: "channels", text: "Channels for the first 100 users, compared" },
    { type: "table", head: ["Channel", "What it tends to bring", "Effort", "Verdict at this stage"], rows: [
      ["Founder outreach to a signal list", "Users with the problem, plus learning", "High", "Core channel"],
      ["Introductions from active users", "Highly qualified users", "Low", "Best converter once running"],
      ["Communities your users are in", "Some users, lots of feedback", "Medium", "Good if you contribute, not promote"],
      ["Launch platforms", "A burst of sign-ups, mostly curious", "Medium", "Useful bump, rarely retention"],
      ["Content and SEO", "Users later", "High", "Start now, expect results in months"],
      ["Paid ads", "Sign-ups at a cost", "Budget", "Too early: you do not know who converts"],
    ]},
    { type: "prose", text: [
      "A launch on a platform full of other founders produces sign-ups from people curious about startups, not people with your problem. Do it for the backlinks and the morale, and do not mistake the sign-up graph for traction.",
    ]},

    { type: "h2", id: "pricing", text: "Pricing while you get the first 100 users" },
    { type: "prose", text: [
      "Charge earlier than feels comfortable. A free product attracts people who are curious; a paid one, even at a low price, attracts people with the problem — and their behaviour tells you far more about whether the product works.",
      "A common structure is a free period or free setup for early users, with a clear point at which the paid plan starts, and a founding-customer price for those who commit early. Whatever you choose, ask for something in return for any discount: a weekly feedback call, an introduction, permission to use their name.",
      "Watch what people do when the free period ends. Users who convert without being chased are the clearest signal you will get at this stage of who your real customer is, and their profile should become the definition for the next list.",
    ]},

    { type: "h2", id: "mistakes", text: "Mistakes that stall the first 100 users" },
    { type: "checklist", items: [
      { title: "Too broad a segment", detail: "messages that fit everyone resonate with no one, and word of mouth never starts." },
      { title: "Building features instead of talking to users", detail: "the bottleneck at this stage is almost never a missing feature." },
      { title: "Delegating outreach too early", detail: "a hire cannot change the product in response to what they hear." },
      { title: "Measuring sign-ups", detail: "sign-ups without return visits are noise." },
      { title: "Chasing a launch spike", detail: "one big day does not replace a hundred conversations." },
    ]},

    { type: "h2", id: "measure", text: "What to measure on the way to 100" },
    { type: "checklist", items: [
      { title: "Reply rate by signal", detail: "tells you which problem is real and urgent." },
      { title: "Activation", detail: "the share of new users who reach the first useful result." },
      { title: "Week-two return", detail: "whether people come back without being chased." },
      { title: "Introductions per active user", detail: "the earliest sign of word of mouth." },
      { title: "Why people say no", detail: "write it down every time; patterns show within a few dozen conversations." },
    ]},
    { type: "tip", title: "Count users who came back, not accounts",
      text: "A hundred sign-ups and eight returning users is a product problem. Forty users who return every week is the beginning of a business. Report the second number to yourself, every week." },

    { type: "h2", id: "mantis", text: "Where Mantis fits for a startup's first users" },
    { type: "prose", text: [
      "Mantis is built for the list-and-outreach part of this playbook. Describe your user in plain language and it finds the businesses — on maps, on the web, in funding news or among public developer profiles — and reads each site for the signals in the table above: hiring with role titles, enquiry forms that go nowhere, missing booking, ads running, store apps missing, security gaps.",
      "Leads come with graded emails, phones, the company LinkedIn and the founder's name where the site states it. The Campaign Planner can then run an approved email sequence from your own mailbox, with replies stopping that lead's sequence. New accounts get 500 free credits once, at 5 credits per new lead. For the very first sale before any of this, see [how to get your first customer](/resources/how-to-get-your-first-customer); for the full framework, [how to find clients](/resources/how-to-find-clients).",
    ]},
    { type: "cta", variant: "map", title: "Find the hundred businesses with your problem.",
      detail: "Describe the user and the signal. 500 free credits at signup, no card.",
      action: "Start free", href: "/login" },
  ],
  faqs: [
    { q: "How do I get my first 100 users for a B2B SaaS?", a: "Narrow to one segment where the problem is visible from outside, build a list of a few hundred businesses that show that signal, contact them personally as a founder, onboard every yes by hand, and ask active users for introductions." },
    { q: "Does launching on Product Hunt get you first users?", a: "It produces a burst of sign-ups, mostly from people curious about new products rather than people with your problem. Useful for visibility and backlinks, but rarely the source of retained early users for B2B products." },
    { q: "How many people do I need to contact to get 100 users?", a: "Several times more than 100, and the multiple depends on your segment and signal. Start with a few hundred well-chosen businesses, measure reply and activation rates, then size the next list from your own numbers." },
    { q: "Should I offer my product free to the first users?", a: "A free period or free setup in exchange for feedback is reasonable and lowers the barrier. Ask for something back — feedback calls, introductions, a case study — and move to paid once the product is delivering value." },
    { q: "Should the founder do sales for the first 100 users?", a: "Yes. Founders can change the product in response to conversations, and early users respond to talking to the person who built it. Hire sales once you can write down a repeatable process that works." },
  ],
  links: [
    ["/resources/how-to-find-clients", "how to find clients"],
    ["/resources/how-to-get-your-first-customer", "your first customer"],
    ["/resources/how-to-get-clients-from-linkedin", "clients from LinkedIn"],
    ["/resources/why-tech-stack-filtering-misses-your-best-prospects", "why tech-stack filters miss prospects"],
    ["/resources/how-to-generate-leads", "how to generate leads"],
  ],
},

/* ───────────────────────────── 10 · first customer */
{
  slug: "how-to-get-your-first-customer",
  title: "How to Get Your First Customer for a New B2B Business",
  excerpt: "Your first customer comes from people who already know you or are one introduction away. A step-by-step path from network list to signed first deal, then to the first ten.",
  meta: "How to get your first customer for a new B2B business: work your network, make a specific offer, ask for introductions, price the deal, then reach ten.",
  category: CAT, cluster: CL, hero: "leads", mins: 7,
  thumb: "your-first-10-web-design-clients", thumbAlt: "Flat illustration of a grid of storefronts connected in sequence, each marked with a completed check",
  tags: ["Client Acquisition", "Startups", "First Customers"],
  body: [
    { type: "prose", text: [
      "**Your first customer for a new B2B business will almost certainly come from your existing network or one introduction away from it — so list everyone you know who could buy or could introduce you to a buyer, make them a specific offer with a clear first-deal price, and ask directly.** Cold outreach matters later. For customer number one, trust does the heavy lifting, and you have more of it with people who already know you.",
      "This is the hardest sale you will make: no case studies, no testimonials, no track record. The way through is to reduce the buyer's risk until saying yes is easy.",
    ]},

    { type: "h2", id: "network", text: "Step 1: list your network, properly" },
    { type: "prose", text: [
      "Most people underestimate their network because they only think of people who could buy. The useful list is wider: anyone who could buy, anyone who works at a company that could, and anyone who knows people in your target industry.",
      "Write down at least fifty names. Former colleagues and managers, past clients from a previous job, college batchmates, suppliers and vendors you have dealt with, people from industry events, family friends who run businesses. Then mark each one: could buy, could introduce, or neither.",
    ]},
    { type: "checklist", items: [
      { title: "Former employers and colleagues", detail: "they know your work, which is the proof a first customer needs." },
      { title: "Clients and vendors from past roles", detail: "relationships that already include trust in your competence." },
      { title: "People in your target industry", detail: "even one friend in the industry can explain how buying decisions are made there." },
      { title: "Local business owners you know", detail: "for services sold to small businesses, the nearest owners are the easiest first conversations." },
      { title: "Alumni and community groups", detail: "a direct message from someone with a shared background gets read." },
    ]},

    { type: "h2", id: "offer", text: "Step 2: make an offer specific enough to say yes to" },
    { type: "prose", text: [
      "\"I've started a consultancy, let me know if you need anything\" produces goodwill and nothing else. A specific offer — what you will do, for whom, by when, for how much — produces decisions.",
      "Shape the first offer to remove risk. A fixed scope with a fixed price. A short timeline. A clear deliverable. Sometimes a pilot: a smaller piece of the full service, at a lower price, with the option to continue.",
    ]},
    { type: "table", head: ["First-deal structure", "When it fits", "Watch out for"], rows: [
      ["Fixed-scope pilot at a reduced price", "Services and consulting", "Define the scope tightly so it does not grow"],
      ["Full price with a guarantee", "When you are confident in the outcome", "A guarantee you can actually honour"],
      ["Free in exchange for a case study", "Very early products, unproven offers", "Free work is undervalued; set an end date"],
      ["Paid trial order", "Manufacturing, supply", "Deliver it perfectly — it is the audition"],
      ["Design partner terms", "Software", "Agree what they get and what you need back"],
    ]},
    { type: "prose", text: [
      "Avoid giving the first project away entirely unless you need the case study badly. Paid customers, even at a discount, take the work seriously and give better feedback, and a price sets a reference point for the next customer.",
    ]},

    { type: "h2", id: "ask", text: "Step 3: ask directly, and ask for introductions" },
    { type: "prose", text: [
      "Message the people marked 'could buy' individually. Say what you have started, who it is for, the specific offer, and ask whether it is relevant to them. Keep it short and easy to say no to.",
      "To the people marked 'could introduce', ask for a specific introduction: \"Do you know anyone running a logistics company in Pune who is struggling with dispatch hiring?\" A specific ask gets names. A general \"let me know if you hear of anyone\" gets forgotten.",
      "Make introductions easy. Write a two-line forwardable description of what you do so your contact can paste it into a message.",
    ]},

    { type: "cta", variant: "table", title: "When the network runs out, start from a signal.",
      detail: "Mantis finds businesses showing a reason to buy what you sell, with the contacts their own websites publish.",
      action: "Find your next customers", href: "/login" },

    { type: "h2", id: "cold", text: "Step 4: if the network is thin, go narrow and cold" },
    { type: "prose", text: [
      "Some founders do not have a relevant network — new to the industry, new to the city. Then cold outreach is the path, and it works if it is narrow and specific.",
      "Pick one small segment, find twenty or thirty businesses in it that show a visible reason to need you, and contact each personally with a message that names that reason. A short list you researched beats a long one you did not. The method is set out in [how to generate leads](/resources/how-to-generate-leads), and the free sources in [how to get leads without buying lists](/resources/how-to-get-leads-without-buying-lists).",
      "For businesses that serve local customers, visiting in person is often the fastest route to a first customer, because it builds in an afternoon the trust a network would have provided.",
    ]},

    { type: "h3", text: "A first message that gets a reply" },
    { type: "prose", text: [
      "To someone in your network who could buy: \"Hi Meera — I've left my operations job and started a small practice helping mid-sized logistics companies automate their dispatch reporting. I'm taking on two first clients this quarter at a fixed pilot price, a four-week project with a clear deliverable. Given what you described about month-end reporting last year, would it be worth a 20-minute call?\"",
      "It works because it is specific about who it is for, what it is, how long it takes and why you are asking this person. It is also easy to decline, which makes it easier to accept.",
      "To someone who could introduce: \"Do you know anyone running operations at a logistics company with 50 or more vehicles? I'm looking for two pilot clients for dispatch-reporting automation. Happy to send a two-line description you can forward.\"",
    ]},

    { type: "h2", id: "deliver", text: "Step 5: over-deliver, then ask for three things" },
    { type: "steps", items: [
      { icon: "verified", title: "Deliver early and visibly", detail: "Share progress before they ask. The first customer is watching for reasons to trust you." },
      { icon: "score", title: "Measure the result", detail: "Agree up front what success looks like and report against it." },
      { icon: "data", title: "Ask for a testimonial or case study", detail: "Write the draft for them; ask permission to name them." },
      { icon: "enrich", title: "Ask for two introductions", detail: "To people with the same problem. Satisfied first customers usually know a few." },
      { icon: "calendar", title: "Ask about the next piece of work", detail: "The second deal with the first customer is often easier than a second customer." },
    ]},
    { type: "tip", title: "Write down why they said yes",
      text: "Ask your first customer directly what made them decide. Their words are the opening line for every message to customer two through ten." },

    { type: "h2", id: "mistakes", text: "Mistakes that delay your first customer" },
    { type: "checklist", items: [
      { title: "Waiting until everything is ready", detail: "the website, logo and deck can follow the first sale; the conversations cannot be skipped." },
      { title: "A vague offer", detail: "'I do consulting' gives nobody a reason to say yes this week." },
      { title: "Asking for favours instead of making offers", detail: "people help more readily when there is something concrete to help with." },
      { title: "Underpricing to zero", detail: "free work is undervalued by the buyer and by you." },
      { title: "Too many segments at once", detail: "split attention means no market hears about you twice." },
    ]},

    { type: "h2", id: "first-ten", text: "From the first customer to the first ten" },
    { type: "prose", text: [
      "Customer one proves someone will pay. Customers two to ten prove it was not a favour. The playbook shifts: the first customer's result becomes your proof, introductions become your best channel, and a researched outbound list fills the gaps.",
      "Raise the price as you go. The first customer's discount was the cost of having no proof; by customer three or four you have proof, and the price should reflect it. Each new customer should pay at least what the last one did.",
      "Keep the offer narrow while you do it. Ten customers in one segment give you a reputation in that segment; ten customers in ten segments give you ten one-off projects. Our [first 10 web design clients](/resources/your-first-10-web-design-clients) playbook shows the same progression for an agency, and [how to get your first 100 users](/resources/how-to-get-first-100-users) covers it for software.",
    ]},

    { type: "h2", id: "mantis", text: "Where Mantis helps after the first customer" },
    { type: "prose", text: [
      "Your first customer will probably not come from a tool, and that is fine. Mantis is for the step after: when you know who bought and why, describe that business in plain language and it finds more like it — from live map listings or the web — with the signals and published contacts for each.",
      "Each new lead costs 5 credits and new accounts get 500 free credits once, which covers a first proper list. For the broader framework, see [how to find clients](/resources/how-to-find-clients).",
    ]},
    { type: "cta", variant: "map", title: "Find ten more businesses like your first customer.",
      detail: "Describe who bought and why. Get matching businesses with signals and contacts. Free credits at signup.",
      action: "Start free", href: "/login" },
  ],
  faqs: [
    { q: "How do I get my first customer for a new business?", a: "List at least fifty people you know who could buy or introduce you to buyers, make a specific fixed-scope offer that reduces the buyer's risk, message each personally, and ask for specific introductions. If your network is thin, contact a short, researched list of businesses showing a clear need." },
    { q: "Should I work for free to get my first client?", a: "Usually not. A discounted, fixed-scope paid pilot gets taken more seriously and sets a price reference. Free work in exchange for a case study can make sense for very early, unproven offers, with a clear end date." },
    { q: "How long does it take to get the first customer?", a: "It varies by offer and sales cycle. Working a network actively, many B2B service businesses get a first deal within weeks; products with long buying cycles take longer. Activity is the controllable part: aim for several conversations a week." },
    { q: "What do I say when I have no case studies?", a: "Use your past experience and the specific result you will deliver, offer a fixed scope and price, and reduce risk with a pilot or a guarantee you can honour. Being transparent that they are an early customer, with terms to match, builds trust." },
    { q: "How do I get from one customer to ten?", a: "Deliver well, turn the result into a case study, ask the first customer for introductions, and add a researched outbound list in the same segment. Keep the offer narrow so each customer strengthens your reputation in one market." },
  ],
  links: [
    ["/resources/how-to-find-clients", "how to find clients"],
    ["/resources/your-first-10-web-design-clients", "the first 10 clients playbook"],
    ["/resources/how-to-get-first-100-users", "your first 100 users"],
    ["/resources/how-to-get-leads-without-buying-lists", "free lead sources"],
    ["/resources/the-first-call-10-questions-that-qualify-a-lead", "qualifying on the first call"],
  ],
},

/* ───────────────────────────── 11 · linkedin */
{
  slug: "how-to-get-clients-from-linkedin",
  title: "How to Get Clients From LinkedIn: What Actually Works",
  excerpt: "LinkedIn works for reaching founders and managers when you arrive with a reason. An honest look at profiles, connection requests, content, paid tiers and automation — and the company-to-founder route.",
  meta: "How to get clients from LinkedIn: what actually works (specific outreach, a buyer-facing profile, steady posts), what wastes time, and the founder route.",
  category: CAT, cluster: CL, hero: "network", mins: 7,
  thumb: "cold-email-for-local-businesses-when-it-works", thumbAlt: "Flat illustration of a personal message being sent to a contact card, marked as delivered",
  tags: ["LinkedIn", "Outreach", "Client Acquisition"],
  body: [
    { type: "prose", text: [
      "**You get clients from LinkedIn by finding the specific decision-maker at a business that has a visible reason to need you, connecting with a short note that names that reason, and continuing the conversation off the platform — supported by a profile that reads like a sales page and a steady trickle of useful posts.** What does not work is mass connection requests followed by a pitch, which is what most LinkedIn outreach is.",
      "LinkedIn is the right channel when your buyers are founders, managers and professionals who use it: software companies, agencies, consultancies, larger B2B firms. It is the wrong channel for most owners of small local businesses, who are reachable by phone and rarely check LinkedIn messages.",
    ]},
    { type: "h3", text: "Who gets clients from LinkedIn, and who should not bother" },
    { type: "prose", text: [
      "It suits sellers whose buyers have job titles: B2B software, consulting, recruitment, agencies selling to companies, freelancers selling to marketing or product teams. In these markets, the decision-maker has a profile, checks messages, and will look at yours before replying.",
      "It suits sellers to local businesses poorly. A restaurant owner or a hardware store owner may have a profile, but it is rarely where they make decisions. For those buyers, the phone, WhatsApp and a visit outperform LinkedIn by a wide margin — see [how to find clients](/resources/how-to-find-clients) for the channel by buyer type.",
      "A quick test: search LinkedIn for ten of your ideal buyers by name. If most have active profiles with recent activity, it is a channel. If most have no profile or nothing posted in years, spend the time elsewhere.",
    ]},

    { type: "h2", id: "what-works", text: "What actually works on LinkedIn, and what does not" },
    { type: "table", head: ["Tactic", "Works?", "Why"], rows: [
      ["Connection note naming a specific reason", "Yes", "Reads as personal; easy to accept"],
      ["Profile written for your buyer", "Yes", "It is the page every prospect checks after your message"],
      ["Regular posts on problems your buyers have", "Slowly", "Builds familiarity; results take months"],
      ["Commenting thoughtfully on prospects' posts", "Yes", "Warms a cold connection before you message"],
      ["Mass connection requests with no note", "Rarely", "Low acceptance; looks like spam"],
      ["Pitch in the first message after connecting", "No", "Recognised instantly and ignored"],
      ["Automation tools for invites and messages", "Risky", "LinkedIn's user agreement prohibits them; accounts get restricted"],
      ["Paid tiers for search and InMail", "Sometimes", "Worth it once free search limits block a proven process"],
    ]},
    { type: "prose", text: [
      "The pattern is the same as every other channel: specific beats volume. LinkedIn just makes generic outreach more visible, because the recipient can see your profile, your mutual connections and your other activity in one click.",
    ]},

    { type: "h2", id: "profile", text: "Make your profile a page that gets clients" },
    { type: "checklist", items: [
      { title: "Headline says who you help and with what", detail: "'Helping logistics firms in Pune hire dispatch teams' beats 'Founder | Visionary | Speaker'." },
      { title: "About section answers the buyer's questions", detail: "what you do, for whom, the result, and how to start a conversation." },
      { title: "Featured section with proof", detail: "a case study, a short result, a link to your site." },
      { title: "Recent activity that matches the headline", detail: "posts and comments about your buyers' problems." },
      { title: "A clear photo and banner", detail: "small things that make the profile look maintained." },
    ]},

    { type: "h2", id: "chain", text: "The company-to-founder route" },
    { type: "prose", text: [
      "Searching LinkedIn for people by title produces long lists with no reason to contact any of them. A better route starts with the company, not the person.",
      "First, find companies that show a reason to buy — hiring for a role you replace, running ads without tracking, a broken enquiry form, recent funding. Then open each company's LinkedIn page, usually linked from its website, and find the founder or the function head. The website's About or Team page often names the founder directly.",
      "Now your connection note writes itself: \"Saw that Acme is hiring two SDRs — we help B2B teams in Bengaluru ramp new reps faster. Would be good to connect.\" It is specific, it is about them, and it explains why you, a stranger, are getting in touch.",
    ]},
    { type: "steps", items: [
      { icon: "signal", title: "Find companies with a signal", detail: "From their websites, careers pages, ad libraries or funding news." },
      { icon: "search", title: "Open the company LinkedIn page", detail: "Linked from the website footer in most cases." },
      { icon: "enrich", title: "Identify the decision-maker", detail: "Founder at a small company; function head at a larger one. Cross-check with the site's About page." },
      { icon: "send", title: "Connect with a one-line reason", detail: "Name the signal. No pitch, no link." },
      { icon: "phone", title: "Move the conversation off LinkedIn", detail: "After a reply, suggest a short call or continue by email." },
    ]},

    { type: "cta", variant: "table", title: "Start from the company, not the job title.",
      detail: "Mantis finds companies showing a buying signal and returns their company LinkedIn and the founder's name where the website states it.",
      action: "Find companies to approach", href: "/login" },

    { type: "h2", id: "messages", text: "LinkedIn messages that get replies from clients" },
    { type: "prose", text: [
      "**Connection note:** one line, the reason, no pitch. Many people accept requests from strangers who give a credible reason, and very few accept ones that open with a sales pitch.",
      "**First message after accepting:** thank them briefly, then ask a question about the signal rather than pitching. \"How are you finding hiring for those SDR roles — is ramp time the bottleneck or finding people at all?\" A question invites a reply; a pitch invites silence.",
      "**Follow-up:** if they reply, offer something useful — a short resource, an observation — and then suggest a call. If they do not, one gentle follow-up a week later is enough. LinkedIn is a small room; persistence beyond that reads as pressure.",
    ]},
    { type: "tip", title: "Pair LinkedIn with email",
      text: "A connection request the same week as a short email to the same person lifts both, because your name is familiar the second time. Mention neither in the other — the familiarity does the work." },

    { type: "h2", id: "routine", text: "A weekly LinkedIn routine for getting clients" },
    { type: "prose", text: [
      "LinkedIn rewards small, regular effort far more than occasional bursts. A routine of about two hours a week, spread across the days, is enough for most service businesses.",
    ]},
    { type: "table", head: ["When", "Time", "What you do"], rows: [
      ["Monday", "30 minutes", "Pick 15 to 20 companies with a signal; find the decision-maker at each"],
      ["Tuesday to Thursday", "15 minutes a day", "Send 5 to 7 connection notes; reply to every message"],
      ["Tuesday and Thursday", "15 minutes", "Comment usefully on posts by people you want to reach"],
      ["Wednesday", "20 minutes", "Publish one post about a problem your buyers have"],
      ["Friday", "15 minutes", "Follow up once with anyone who accepted but has not replied; log outcomes"],
    ], note: "A template. Keep invitation volume well inside LinkedIn's limits; quality is what moves acceptance." },
    { type: "prose", text: [
      "Keep a log, even a simple one: company, person, signal, accepted, replied, call booked. After a month it shows which signals open conversations, which is worth more than any LinkedIn tip.",
    ]},

    { type: "h2", id: "content", text: "Does posting on LinkedIn get clients?" },
    { type: "prose", text: [
      "Eventually, for some people. Posting regularly about your buyers' problems builds familiarity, so that when you do reach out, or when they need what you sell, your name is already known. It also makes your profile more convincing to anyone who checks it after a message.",
      "It is slow, and it is not a substitute for outreach. Treat posting as a supporting habit — a couple of useful posts a week, written for buyers rather than peers — and keep outreach as the part that produces conversations this month.",
    ]},

    { type: "h2", id: "limits", text: "Limits, paid tiers and automation" },
    { type: "prose", text: [
      "Free accounts hit search and invitation limits. If you reach them while running a process that already produces clients, a paid tier with more search filters and InMail can be worth it. If you reach them while spraying generic requests, a paid tier only lets you do the wrong thing faster.",
      "Automation tools that send invitations and messages for you are against LinkedIn's user agreement, and LinkedIn restricts accounts it detects using them. For most people selling services, their LinkedIn account is a long-term asset; risking it to send more generic messages is a poor trade.",
    ]},

    { type: "h2", id: "mantis", text: "Where Mantis fits with LinkedIn" },
    { type: "prose", text: [
      "Mantis does the company half of the company-to-founder route. Describe your buyer and the signal; it finds the companies, reads each website, and returns the company LinkedIn, the founder or owner's name where the site states it, and published emails graded by how likely they are to reach a decision-maker. You then connect personally on LinkedIn — Mantis does not send LinkedIn messages or automate your account.",
      "Pair it with email from your own mailbox through the Campaign Planner if you want both channels. New accounts get 500 free credits once. For the wider framework, see [how to find clients](/resources/how-to-find-clients) and [how to get your first 100 users](/resources/how-to-get-first-100-users).",
    ]},
    { type: "cta", variant: "map", title: "Know why you are messaging before you connect.",
      detail: "Companies with a buying signal, their LinkedIn page and founder name where published. 500 free credits at signup.",
      action: "Start free", href: "/login" },
  ],
  faqs: [
    { q: "Can you really get clients from LinkedIn?", a: "Yes, when your buyers are founders, managers or professionals who use it, and when you approach people with a specific reason rather than a generic pitch. It works poorly for small local business owners, who are easier to reach by phone." },
    { q: "How do I find clients on LinkedIn?", a: "Start from companies showing a reason to buy — hiring, funding, visible gaps on their website — then open each company page to find the founder or function head. Connect with a one-line note naming that reason, and move to a call after a reply." },
    { q: "What should I write in a LinkedIn connection request to a potential client?", a: "One line naming why you are reaching out, specific to them, with no pitch and no link. For example, mention the role they are hiring for or the launch they announced, and say you work with companies in that situation." },
    { q: "Is LinkedIn Sales Navigator worth it for finding clients?", a: "Once you have a process that already produces clients and free search limits are blocking it, often yes. Before that, it mainly lets you send more untargeted messages, which does not help." },
    { q: "Is it safe to use LinkedIn automation tools?", a: "LinkedIn's user agreement prohibits automated tools for invitations and messages, and accounts detected using them get restricted. For most sellers, the account is too valuable to risk." },
  ],
  links: [
    ["/resources/how-to-find-clients", "how to find clients"],
    ["/resources/how-to-get-first-100-users", "your first 100 users"],
    ["/resources/how-to-generate-leads", "how to generate leads"],
    ["/resources/cold-email-for-local-businesses-when-it-works", "when cold email works"],
    ["/resources/how-indian-agencies-win-uk-and-australian-clients", "winning overseas clients"],
  ],
},
];

/** `[[slug|anchor]]` → a link when the slug exists, plain anchor text when it does not. */
function resolveTokens<T>(v: T, exists: Set<string>): T {
  const s = JSON.stringify(v).replace(/\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g, (_m, slug: string, anchor: string) =>
    exists.has(slug) ? `[${anchor}](/resources/${slug})` : anchor);
  return JSON.parse(s) as T;
}

async function main() {
  const published = (await sql`SELECT slug FROM blog_posts WHERE status = 'published'`) as unknown as { slug: string }[];
  const exists = new Set([...published.map((r) => r.slug), ...posts.map((p) => p.slug)]);
  const missing = new Set<string>();

  for (const raw of posts) {
    const body = resolveTokens(raw.body, exists);
    const links = raw.links.filter(([href]) => {
      const m = /^\/resources\/([a-z0-9-]+)$/.exec(href);
      if (m && !exists.has(m[1]!)) { missing.add(m[1]!); return false; }
      return true;
    });
    const p = { ...raw, body, links };
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
    await sql`UPDATE blog_posts SET hero_image = ${`/resources/thumbs/${p.thumb}.webp`}, hero_alt = ${p.thumbAlt}
              WHERE slug = ${p.slug}`;
    await sql`DELETE FROM blog_links WHERE from_slug = ${p.slug}`;
    for (const [i, [href, anchor]] of p.links.entries()) {
      await sql`INSERT INTO blog_links (from_slug, to_href, anchor, kind, position)
                VALUES (${p.slug}, ${href}, ${anchor}, ${href.startsWith("/leads") ? "lead_page" : "sibling"}, ${i})`;
    }
    console.log("  ✓", p.slug);
  }
  if (missing.size) console.log(`  · sibling links held back (slug not published yet): ${[...missing].join(", ")}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
