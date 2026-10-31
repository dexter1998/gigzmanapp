/**
 * Batch 33 — eight "how to get customers/clients for a <industry> business" spokes in the
 * growth cluster: insurance agency, printing, courier, construction, electrical contracting,
 * consulting, security agency and packaging. The reader owns that business and wants B2B
 * customers; every signal named in these posts is one Mantis actually reads (lib/v2/playbooks.ts).
 *
 * India search volume for each keyword is small (10–50 a month), so each post has to earn its
 * place with specifics: who buys, the visible trigger, the channel trade-offs, a script and the
 * contract shape that keeps a customer.
 *
 * Same seeding contract as batch 32: `[[slug|anchor]]` tokens become links only when the slug is
 * published (or seeded here), and the `links` array is filtered by the same rule. The eight posts
 * link to each other so none is an orphan before the hub is updated to list them.
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
/* ───────────────────────────── 1 · insurance agency */
{
  slug: "how-to-get-clients-for-insurance-business",
  title: "How to Get Clients for Insurance Business in India",
  excerpt: "For insurance agents and brokers selling to businesses: group health, employee benefits and commercial lines, which employers are ready to buy, and how to win the renewal date.",
  meta: "How to get clients for insurance business in India: sell group health, employee benefits and commercial cover to SMEs that are hiring or opening new outlets.",
  category: CAT, cluster: CL, hero: "leads", mins: 8,
  thumb: "how-to-take-advance-payment-from-indian-clients", thumbAlt: "Flat illustration of two people shaking hands beside a shield, a vault of coins and a web page",
  tags: ["Insurance", "B2B Sales", "Client Acquisition"],
  body: [
    { type: "prose", text: [
      "**To get clients for an insurance business beyond family and friends, sell to businesses: group health and employee benefits for companies that are hiring, and commercial cover — fire, property, liability, marine — for companies that are opening outlets, building stock or exporting.** One employer account brings many lives, renews every year, and often leads to the owner's personal policies as well.",
      "Retail insurance is crowded and mostly sold through relationships, so most agents run out of warm contacts within a few years. Commercial and group business works differently. The buyer is an owner, an HR head or a finance manager, the need is triggered by events you can see from outside, and the decision repeats at a fixed date each year. That makes it a business you can prospect for rather than wait for.",
    ]},

    { type: "h2", id: "who-buys", text: "Who buys business insurance, and what they buy" },
    { type: "table", head: ["Buyer", "Policies they need", "Who decides", "When they decide"], rows: [
      ["SMEs with 10 to 200 staff", "Group health, group personal accident, group term life", "Owner, HR or finance head", "At first hire wave, then every renewal"],
      ["Factories and warehouses", "Fire and allied perils, stock, machinery breakdown, employee's compensation", "Owner, plant head", "New unit, loan disbursal, renewal"],
      ["Shops, restaurants and clinics", "Shop and property package, public liability, professional indemnity for doctors", "Owner", "New outlet, lease signing, renewal"],
      ["Exporters and importers", "Marine cargo (open or specific policy), credit insurance", "Owner, logistics or finance head", "First export order, annual open cover"],
      ["Funded startups", "Group health as a hiring benefit, D&O, cyber", "Founder, then HR or finance", "After a round, before a hiring push"],
      ["Contractors and builders", "Contractor's all risk, employee's compensation", "Owner, project head", "Each new project"],
    ], note: "Product names vary by insurer. Check what your licence lets you place before you pitch a line." },
    { type: "prose", text: [
      "Two of these deserve attention first. Group health is the easiest door into a company, because employees ask for it and owners use it to hire and keep people. Fire and property cover for small units is the second, because many owners only buy it when a bank asks, and are under-insured the rest of the time. The IRDAI's standard products for small enterprises — Bharat Sookshma Udyam Suraksha and Bharat Laghu Udyam Suraksha — make the property conversation simpler, since the wording is the same across insurers.",
      "Know which side of the licence line you are on. An agent or corporate agent places business with the insurers it is tied to; a broker can approach the whole market. Larger group accounts often expect quotes from several insurers, which favours brokers, while a tied agent can still win well with service and a sharp comparison of the one or two quotes they can offer.",
    ]},

    { type: "h2", id: "signals", text: "Signals that a business is ready to buy insurance" },
    { type: "prose", text: [
      "The best time to approach a business is just after something changes: it hires, opens, borrows or starts exporting. These are the signals Mantis can actually check for you when it reads a business's listing and website.",
    ]},
    { type: "table", head: ["Signal Mantis reads", "What it suggests", "What to offer"], rows: [
      ["Hiring now (careers page or job board)", "Headcount is growing; staff will ask about health cover", "Group health, group personal accident"],
      ["Several branches, or a locations page", "More premises, more stock, more staff to cover", "Property package per location, group cover"],
      ["New Google listing or a 'now open' site", "A new outlet that may still be uninsured", "Shop package, public liability"],
      ["Exporter (IEC or export text on the site)", "Goods in transit, foreign buyers", "Marine cargo, credit insurance"],
      ["Has an online store", "Stock, warehousing, customer data", "Stock cover, cyber"],
      ["Raised funding (news search, run only when you ask)", "A hiring push is coming", "Group health before the first hires join"],
    ]},
    { type: "prose", text: [
      "Treat a missing signal with care. A careers page that does not mention insurance does not prove the company has none; it is a question to ask, not a fact to state. Funding news comes from a paid news search, so Mantis runs it only when you ask for funded companies.",
    ]},

    { type: "cta", variant: "table", title: "Find employers that are hiring right now.",
      detail: "Describe the businesses you insure. Mantis finds them, reads each site for hiring, new branches and export activity, and pulls the contacts the site states.",
      action: "Find insurance clients", href: "/login" },

    { type: "h2", id: "channels", text: "Channels for getting insurance clients, honestly compared" },
    { type: "table", head: ["Channel", "Works well for", "Weakness"], rows: [
      ["Chartered accountants and tax consultants", "SME owners who trust their CA with money matters", "Slow to start; you must give them a reason to refer"],
      ["Direct outreach to hiring companies", "Group health, the strongest single trigger", "Needs a good list and patience to reach the HR head"],
      ["Trade and industry associations", "Factory owners, traders in one cluster", "Membership and showing up regularly take time"],
      ["Bank and NBFC relationship managers", "Property cover for loan-funded units", "Often tied to the lender's own insurance partner"],
      ["Existing personal-lines clients who own businesses", "Your warmest commercial leads", "A small pool; runs out fast"],
      ["JustDial, IndiaMART and lead portals", "Inbound enquiries", "Enquiries often shared with several agents; price-led"],
      ["WhatsApp to owners", "Follow-up, renewal reminders, quick quotes", "Cold first messages are easy to ignore"],
    ]},
    { type: "prose", text: [
      "The CA channel is worth singling out. Accountants see a client's payroll, assets and loans every year, and they are often asked about insurance. Offer to review cover for two or three of their clients at no cost and send a written note back through the CA. That builds trust in both directions. For the wider system, see [how to find clients](/resources/how-to-find-clients), and for working the hiring signal in depth, [finding companies that are hiring](/resources/recruitment-leads-find-companies-hiring).",
    ]},

    { type: "h2", id: "steps", text: "How to get insurance clients, step by step" },
    { type: "steps", items: [
      { icon: "score", title: "Pick one line and one segment", detail: "'Group health for IT and services firms with 20 to 100 staff in Pune' beats 'businesses that need insurance'." },
      { icon: "search", title: "List the businesses", detail: "From maps, company websites and careers pages, or with Mantis in one search." },
      { icon: "signal", title: "Rank by trigger", detail: "Hiring, a new outlet, export activity. Businesses with a trigger go to the top." },
      { icon: "phone", title: "Reach the right person", detail: "Owner in a small firm, HR or finance head in a larger one." },
      { icon: "data", title: "Offer a cover review, not a policy", detail: "Ask for the current policy schedule and renewal date." },
      { icon: "calendar", title: "Put the renewal date in your calendar", detail: "Contact them 60 to 90 days before it, every year." },
    ]},

    { type: "h2", id: "script", text: "An outreach script for group health" },
    { type: "prose", text: [
      "Keep the first message about their situation, not your products. A short email or WhatsApp to the owner or HR head, after you have seen open roles on their careers page:",
      "\"Hi Ritu, I saw Brightline is hiring for six roles in Pune. When teams grow at this pace, the question of health cover for new joiners usually comes up within a few weeks. I help companies of 20 to 100 people set up or review group health — what it covers, what it costs per employee, and how to handle parents and maternity. If you share your current renewal date, or tell me you do not have a policy yet, I can send a one-page comparison. No meeting needed unless it is useful.\"",
      "The ask is a renewal date or a yes/no answer, both easy to give. If they have a policy, the date tells you when to come back. If they do not, you are already the person they asked first. Follow up twice, a week apart, each time adding something specific — a note on how maternity cover or room-rent limits change claims. Our guide to [how many touches a business usually needs](/resources/how-many-touches-before-a-local-business-buys) explains why the second and third messages matter.",
    ]},

    { type: "h2", id: "retain", text: "Renewals, service and how to keep insurance clients" },
    { type: "prose", text: [
      "In group and commercial insurance, the sale is only half the work. Accounts are lost at renewal, and they are usually lost because of service, not price — a slow claim, an unanswered call, a new joiner who was never added to the policy.",
      "Build the service into what you offer. A named contact for claims, a quick process for adding and deleting members, a mid-year check-in, and a renewal review that starts two to three months early. Write those down in a short service note and send it with your quote. It is the only part of your proposal a competitor cannot copy by matching the premium.",
      "Do not compete on discounts you cannot sustain. A premium that is low in year one and jumps after a claims-heavy year damages trust. Explain how claims experience affects renewal pricing before it happens.",
    ]},
    { type: "tip", title: "Collect renewal dates, not just leads",
      text: "Every business you speak to has a renewal date, even if it said no this year. Keep a simple sheet of company, line, insurer and renewal month. In a year, that sheet is worth more than any new lead list." },

    { type: "h2", id: "checklist", text: "Checklist before you approach a business" },
    { type: "checklist", items: [
      { title: "One line and one segment chosen", detail: "group health for a type and size of company, or property cover for a type of unit." },
      { title: "A sample quote or illustration ready", detail: "with typical sum insured options and what changes the premium." },
      { title: "A short service note", detail: "claims contact, member additions, renewal timeline." },
      { title: "Two or three references", detail: "existing business clients who will take a call." },
      { title: "A reason for each company", detail: "hiring, a new outlet, export activity — written in the first line." },
      { title: "A renewal-date log", detail: "so a 'no' this year becomes a scheduled conversation next year." },
    ]},

    { type: "h2", id: "mantis", text: "Where Mantis fits for insurance agents and brokers" },
    { type: "prose", text: [
      "Mantis finds businesses for any seller. Describe the employers you want — 'manufacturing units in Rajkot with a careers page', 'restaurants in Bengaluru with three or more branches', 'exporters in Tiruppur' — and it searches live map listings and the web, reads each website for hiring, branches, export text and online stores, and returns the published emails and phones, graded, with the company LinkedIn and owner's name where the site states it.",
      "For startups that have just raised and are about to hire, see the [funded startups in India](/funded-startups-india) list; for companies hiring in volume, the [leads for recruitment agencies](/leads-for/recruitment-agencies) page uses the same hiring signal. If you also advise on business risk, the companion guides on [consulting clients](/resources/how-to-get-clients-for-consulting-business) and [security agency clients](/resources/how-to-get-clients-for-security-agency) cover overlapping buyers. New accounts get 500 free credits, once.",
    ]},
    { type: "cta", variant: "map", title: "Build a list of employers with a reason to buy.",
      detail: "Hiring, new branches, export activity — read from each business's own site, with contacts. 500 free credits at signup.",
      action: "Start free", href: "/login" },
  ],
  faqs: [
    { q: "How can an insurance agent get clients beyond friends and family?", a: "Move into business lines: group health for companies that are hiring, and fire, property and liability cover for businesses that are opening outlets or expanding. Reach owners through CAs, associations and direct outreach that names the trigger you saw." },
    { q: "Which businesses buy group health insurance?", a: "Mostly companies with steady salaried staff — IT and services firms, clinics, schools, manufacturers and funded startups. The trigger is usually hiring: once a team grows, employees ask about cover and owners use it to retain people." },
    { q: "What is the best time to approach a business for insurance?", a: "Just after a change — new hires, a new outlet, a loan, a first export order — and 60 to 90 days before an existing policy renews. Ask for the renewal date even if they say no today." },
    { q: "Should an insurance agent buy leads?", a: "Portal leads bring real enquiries, but they are often shared with several agents and push price competition. A short list of businesses with a visible trigger, approached directly, usually converts better and builds renewals you keep." },
    { q: "How do I keep commercial insurance clients at renewal?", a: "Service: a named claims contact, fast member additions, a mid-year check-in and a renewal review started early. Accounts are lost far more often over a bad claim experience than over premium." },
  ],
  links: [
    ["/resources/how-to-find-clients", "how to find clients"],
    ["/resources/recruitment-leads-find-companies-hiring", "companies that are hiring"],
    ["/resources/how-many-touches-before-a-local-business-buys", "how many touches a business needs"],
    ["/funded-startups-india", "funded startups in India"],
    ["/leads-for/recruitment-agencies", "companies hiring in volume"],
    ["/resources/how-to-get-clients-for-consulting-business", "consulting clients"],
    ["/resources/how-to-get-clients-for-security-agency", "security agency clients"],
  ],
},

/* ───────────────────────────── 2 · printing business */
{
  slug: "how-to-get-customers-for-printing-business",
  title: "How to Get Customers for Printing Business in India",
  excerpt: "For printing presses and print shops: the business buyers who reorder — offices, restaurants, schools, brands and event organisers — how to spot them, and how to turn one job into an annual account.",
  meta: "How to get customers for a printing business: win corporate stationery, packaging, menu, school and event print accounts that reorder, not one-off walk-ins.",
  category: CAT, cluster: CL, hero: "leads", mins: 8,
  thumb: "what-to-send-a-local-business-after-the-call", thumbAlt: "Flat illustration of printed documents, an envelope and a calendar with an approval check",
  tags: ["Printing", "B2B Sales", "Local Business"],
  body: [
    { type: "prose", text: [
      "**To get customers for a printing business that keep coming back, stop waiting for walk-ins and go after businesses that print on a cycle: offices that need stationery for every new hire, restaurants that reprint menus, schools that order diaries and ID cards every session, brands that need labels and boxes, and organisers who need event print to a deadline.** One such account can be worth more in a year than dozens of one-off jobs.",
      "The challenge is that print is easy to buy from anyone. Every market has several presses, and online print services have made standard items like visiting cards a price comparison. The way out is to sell what those cannot do easily: fast local turnaround, colour and stock consistency across reorders, help with design and files, and a single supplier for everything a business prints.",
    ]},

    { type: "h2", id: "who-buys", text: "Who buys print, and what they reorder" },
    { type: "table", head: ["Buyer", "What they print", "How often", "What wins the account"], rows: [
      ["Offices and corporate teams", "Visiting cards, letterheads, envelopes, ID cards, brochures", "Every new hire, every campaign", "Brand consistency, quick reprints, stored files"],
      ["Restaurants and cafes", "Menus, table tents, takeaway inserts, bills, stickers", "Each menu or price change", "Fast turnaround, durable stock, lamination"],
      ["Schools and coaching institutes", "Diaries, ID cards, report cards, prospectuses, certificates", "Once a year, before the session", "Reliability on a hard deadline, confidentiality"],
      ["Brands and D2C sellers", "Labels, boxes, inserts, thank-you cards", "Every production batch", "Consistent colour, short runs, packaging know-how"],
      ["Event organisers and venues", "Backdrops, standees, badges, passes, signage", "Each event", "Delivery to the venue on time"],
      ["New businesses", "A full starter kit: cards, letterheads, signage, flyers", "Once, then reorders", "One supplier for everything"],
    ]},
    { type: "prose", text: [
      "Choose two segments that match your machines. A press with a good offset setup is suited to schools and corporate stationery in volume; a shop with strong digital and large-format capability is suited to events and new outlets. If you also make cartons or labels, brands and food businesses are worth a separate push — see our guide on [finding buyers for packaging](/resources/how-to-find-buyers-for-packaging).",
    ]},

    { type: "h2", id: "signals", text: "Buying signals for printing customers" },
    { type: "prose", text: [
      "Print demand follows events: a business opens, hires, launches, changes its menu or starts a new academic year. Several of those show up on a business's listing or website, and Mantis can read them for you.",
    ]},
    { type: "table", head: ["Signal Mantis reads", "What it suggests", "What to offer"], rows: [
      ["New Google listing or a 'coming soon / now open' site", "A business that needs a full starter kit", "Cards, letterheads, signage, launch flyers"],
      ["Hiring now (careers page)", "Visiting cards and ID cards for new staff", "A stationery account with stored templates"],
      ["Several branches, or a locations page", "Consistent print across outlets", "Central ordering, same colours everywhere"],
      ["Online menu on the site", "A restaurant that changes its menu", "Printed menus that match, table tents"],
      ["Admissions page", "A school or institute with a session cycle", "Diaries, prospectuses, ID cards"],
      ["Has an online store", "A brand shipping products", "Labels, boxes, inserts"],
      ["No website, or a social page as one", "An owner who relies on offline material", "Flyers, signage, a printed catalogue"],
    ]},
    { type: "prose", text: [
      "Our [restaurant database](/lists/restaurant-database) and [school database](/lists/school-database) pages show what these segments look like in practice. Remember that signals rank a list; they do not replace a call to ask what the business prints and who orders it.",
    ]},

    { type: "cta", variant: "table", title: "Find businesses that are about to print.",
      detail: "New outlets, hiring companies, schools before the session. Mantis finds them and reads each site for the signal, with the contacts it states.",
      action: "Find printing customers", href: "/login" },

    { type: "h2", id: "channels", text: "Where to get printing customers: the channels compared" },
    { type: "table", head: ["Channel", "Works well for", "Weakness"], rows: [
      ["Direct visits and calls to offices nearby", "Stationery accounts within delivery range", "Slow; needs a list so visits are not random"],
      ["Designers and agencies", "Steady referred work; they need a reliable press", "They may mark up your price or switch for cheaper"],
      ["Event managers and venues", "Recurring event print", "Deadlines are tight and margins can be squeezed"],
      ["Schools in the months before a session", "Large annual orders", "Decisions are made early; arrive late and it is gone"],
      ["JustDial and IndiaMART", "Inbound enquiries", "Many shared, price-led enquiries; small jobs"],
      ["WhatsApp catalogue and broadcast lists", "Reorders and seasonal offers to existing customers", "Not a way to reach strangers at scale"],
      ["Local business and trade associations", "Introductions in a market or industrial area", "Takes regular attendance to pay off"],
    ]},
    { type: "prose", text: [
      "Designers deserve special mention. Freelance designers and small agencies send a steady flow of jobs to whichever press makes their life easy: accurate proofs, honest timelines, and no surprises in colour. If you want them, publish clear file guidelines and a trade price list. Our guide to [getting graphic design clients](/resources/how-to-get-graphic-design-clients) is written for the designers themselves and shows what they need from a printer.",
    ]},

    { type: "h2", id: "steps", text: "How to get printing customers, step by step" },
    { type: "steps", items: [
      { icon: "score", title: "Pick two segments", detail: "For example, offices within 5 km for stationery, and schools for the session order." },
      { icon: "search", title: "Build the list", detail: "Map listings and websites in your delivery area, filtered by type." },
      { icon: "signal", title: "Rank by trigger", detail: "New outlets, hiring companies and schools with an admissions page first." },
      { icon: "phone", title: "Find who orders print", detail: "Office manager or admin head at companies; principal or administrator at schools; owner at restaurants." },
      { icon: "send", title: "Send a sample pack", detail: "Paper stocks, finishes and two or three printed items. Print is judged by touch." },
      { icon: "calendar", title: "Set up the reorder", detail: "Store their files and remind them before they run out." },
    ]},

    { type: "h2", id: "script", text: "An outreach script for a new outlet" },
    { type: "prose", text: [
      "A call or WhatsApp to the owner of a business that has just opened works best, because they need several things printed at once and have not yet chosen a supplier:",
      "\"Hello, this is Arun from Sharma Print House in Rajouri Garden. I saw your new cafe on Google Maps — congratulations on the opening. Most new cafes end up ordering menus, table tents, takeaway stickers and visiting cards from three different places. We do all of it here, with a two-day turnaround, and we keep your files so a menu change is a phone call. Can I drop off a sample pack with paper options this week?\"",
      "A sample pack is the strongest follow-up in this business. The owner can hold the menu stock and see the lamination, which says more than any message. When the order comes, ask permission to keep the files and set a reminder to call before the next menu or price change.",
    ]},

    { type: "h2", id: "pricing", text: "Pricing, contracts and keeping the account" },
    { type: "prose", text: [
      "Separate price lists for one-off jobs and for accounts. An account rate card for a company's stationery, with fixed prices per item and an agreed turnaround, removes the need for a quote on every reorder. That convenience is often worth more to an office manager than the lowest price.",
      "For schools, quote early and confirm the delivery date in writing. School orders are large and land in a short window before the session, so capacity planning matters more than price once the order is placed. Ask for an advance on large school and event orders, and agree reprint terms for errors caused by approved proofs.",
      "For brands, short-run digital printing for labels and inserts can be a way in before the volume is large enough for offset. Agree how colour will be matched between runs and keep a signed approved sample for each item.",
    ]},
    { type: "tip", title: "Keep the files, keep the customer",
      text: "Store every customer's approved artwork with the paper, finish and quantity used. The easier a reorder is — 'same as last time, 500 more' — the less reason they have to shop around." },

    { type: "h2", id: "checklist", text: "Checklist for a printing business going after accounts" },
    { type: "checklist", items: [
      { title: "A sample pack", detail: "stocks, finishes and a few finished items for each segment." },
      { title: "Account rate cards", detail: "for stationery, menus and event print, with turnaround." },
      { title: "File guidelines for designers", detail: "bleed, colour mode, formats — and a trade price list." },
      { title: "A file archive per customer", detail: "approved artwork and specs for every reorder." },
      { title: "A season calendar", detail: "school sessions, festivals, financial year-end, event season in your city." },
      { title: "A delivery promise you can keep", detail: "in writing, especially for schools and events." },
    ]},

    { type: "h2", id: "mantis", text: "Where Mantis fits for a printing business" },
    { type: "prose", text: [
      "Mantis finds businesses for any seller. Describe who you print for — 'new restaurants and cafes in Indore', 'schools in Lucknow with an admissions page', 'companies hiring in Hinjewadi' — and it searches live map listings and the web, reads each website for the signals above, and returns the published phones and emails, graded, with the owner's name where the site gives it.",
      "Many of the businesses that need print most, especially new outlets, have no website at all; the [businesses without websites](/businesses-without-websites) page shows how common that is. For the wider method, see [how to find clients](/resources/how-to-find-clients). New accounts get 500 free credits, once.",
    ]},
    { type: "cta", variant: "map", title: "Find the next businesses that need print.",
      detail: "New outlets, schools, hiring companies and brands near you, with contacts. 500 free credits at signup.",
      action: "Start free", href: "/login" },
  ],
  faqs: [
    { q: "How can a printing press get regular customers?", a: "Go after businesses that print on a cycle — offices, restaurants, schools, brands and event organisers — and make reordering easy with account rate cards, stored files and reminders before they run out." },
    { q: "How do I compete with online printing websites?", a: "Sell what they cannot easily match: same-day or next-day local turnaround, help with files and design, colour consistency across reorders, delivery to the office or venue, and one supplier for everything a business prints." },
    { q: "Which businesses order the most printing?", a: "Schools and coaching institutes before each session, companies that are hiring, restaurants that change menus, brands that ship products, and event organisers. New businesses order a large starter kit at once." },
    { q: "Are JustDial and IndiaMART good for printing business leads?", a: "They bring enquiries, but many are small and shared with several printers, which pushes price. Use them alongside direct outreach to businesses you chose, where you are not one of many quotes." },
    { q: "Should a printing business take advance payment?", a: "For large school, event and custom packaging orders, yes — a part advance on order and the balance on delivery is common practice. For regular stationery accounts, monthly billing with agreed credit terms keeps reorders easy." },
  ],
  links: [
    ["/resources/how-to-find-clients", "how to find clients"],
    ["/resources/how-to-get-graphic-design-clients", "graphic design clients"],
    ["/resources/how-to-find-buyers-for-packaging", "finding buyers for packaging"],
    ["/lists/restaurant-database", "restaurant database"],
    ["/lists/school-database", "school database"],
    ["/businesses-without-websites", "businesses without websites"],
    ["/resources/catering-leads-corporate-and-event-clients", "corporate and event catering"],
  ],
},

/* ───────────────────────────── 3 · courier business */
{
  slug: "how-to-get-customers-for-courier-business",
  title: "How to Get Customers for Courier Business in India",
  excerpt: "For courier franchises and local delivery firms: the business shippers worth chasing — online sellers, pharmacies, law firms, manufacturers and exporters — and the rate and pickup terms that keep them.",
  meta: "How to get customers for a courier business in India: win e-commerce sellers, pharmacies, law firms and manufacturers with fixed pickups and clear rates.",
  category: CAT, cluster: CL, hero: "leads", mins: 8,
  thumb: "do-you-need-an-email-finder-for-local-businesses", thumbAlt: "Flat illustration of a magnifying glass over a storefront linked to phone, location and contact icons",
  tags: ["Courier", "Logistics", "B2B Sales"],
  body: [
    { type: "prose", text: [
      "**To get customers for a courier business, look for businesses that ship every day or every week — online sellers, pharmacies, law and CA firms, manufacturers sending samples and spares, and exporters — and offer them a fixed daily pickup, a clear rate card and someone who answers the phone.** A walk-in counter waits for parcels; a regular pickup route with twenty business accounts is a business.",
      "Most courier franchise owners compete on price for walk-in parcels, which is where the large networks and online aggregators are strongest. Business shippers care about different things: a pickup that turns up on time, quick resolution when a parcel goes missing, cash-on-delivery money remitted promptly, and one person who knows their account. Those are things a local operator can do better than a national call centre.",
    ]},

    { type: "h2", id: "who-buys", text: "Who ships regularly, and what they need" },
    { type: "table", head: ["Buyer", "What they send", "What matters most", "Decision-maker"], rows: [
      ["E-commerce and D2C sellers", "Orders to customers, returns", "Rates by weight and zone, COD remittance, low RTO", "Owner or operations lead"],
      ["Pharmacies and medical distributors", "Medicines to customers and branches", "Speed, careful handling, reliable same-day", "Owner"],
      ["Law firms, CA firms, consultants", "Documents, notices, filings", "Proof of delivery, speed, confidentiality", "Office manager or partner"],
      ["Manufacturers and traders", "Samples, spares, small B2B consignments", "Pickup from the factory, part-load options", "Owner, dispatch or purchase head"],
      ["Exporters", "Samples and documents abroad", "International rates, paperwork help", "Owner, export executive"],
      ["Schools, hospitals and offices with branches", "Inter-branch mail and documents", "A fixed daily run", "Admin head"],
    ]},
    { type: "prose", text: [
      "Online sellers usually ship the most, but they are also the most price-sensitive and the most likely to already use an aggregator. Law firms, pharmacies and manufacturers ship less, but they value reliability and stay longer. A healthy courier business usually has some of both.",
    ]},

    { type: "h2", id: "signals", text: "Signals that a business ships regularly" },
    { type: "prose", text: [
      "You cannot see a business's dispatch volume from outside, but you can see the things that predict it. Mantis reads these from a business's listing and website.",
    ]},
    { type: "table", head: ["Signal Mantis reads", "What it suggests", "What to offer"], rows: [
      ["Has an online store (cart on the site)", "Orders shipping to customers", "E-commerce rate card, daily pickup, COD"],
      ["Shopify store with no reviews or email app", "A store still building its operations", "Returns handling, packing help"],
      ["Exporter (IEC or export text)", "Samples and documents abroad", "International courier rates"],
      ["Several branches, or a locations page", "Inter-branch documents and stock", "A scheduled branch run"],
      ["Running Meta or Google ads", "A seller spending to grow orders", "Capacity for volume spikes"],
      ["Hiring now", "A growing business", "An account before volumes rise"],
      ["WhatsApp number on the site", "An owner who takes orders on chat", "A quick way to reach them"],
    ]},
    { type: "prose", text: [
      "For manufacturers who send samples and spares, the [manufacturer database](/lists/manufacturer-database) is a useful place to see who is near your hub. Signals tell you who to call first; only a conversation tells you their volume and current courier.",
    ]},

    { type: "cta", variant: "table", title: "Find businesses that ship every week.",
      detail: "Online stores, exporters and multi-branch businesses near your hub, with the contacts their sites state.",
      action: "Find courier customers", href: "/login" },

    { type: "h2", id: "channels", text: "Channels for courier customers: pros and cons" },
    { type: "table", head: ["Channel", "Works well for", "Weakness"], rows: [
      ["Door-to-door in commercial areas", "Offices, law firms, pharmacies on your route", "Slow; only covers what you can walk"],
      ["Outreach to online sellers", "High-volume accounts", "Price-sensitive; many already use aggregators"],
      ["Industrial areas and trade associations", "Manufacturers, traders", "Needs regular presence"],
      ["Bar associations and CA networks", "Document courier", "Small volumes per firm"],
      ["JustDial and Google listing", "Walk-in and local enquiries", "Mostly one-off parcels"],
      ["WhatsApp", "Pickup requests, tracking updates, follow-up", "Not a cold acquisition channel by itself"],
    ]},
    { type: "prose", text: [
      "Aggregator platforms are worth understanding even if you do not use them. Many small online sellers book shipments through one, which means your real competitor for that seller is the aggregator's convenience, not another franchise. What you can offer instead is a person: pickup at a fixed time, help with packing, a phone call when a parcel is stuck. For freight and larger consignments, our guide to [logistics leads](/resources/logistics-leads-how-to-get-clients) covers transporters and 3PLs.",
    ]},

    { type: "h2", id: "steps", text: "How to get courier customers, step by step" },
    { type: "steps", items: [
      { icon: "map", title: "Draw your pickup area", detail: "A radius you can cover reliably every day. Promise nothing outside it." },
      { icon: "search", title: "List shippers inside it", detail: "Online sellers, pharmacies, law firms, manufacturers and exporters." },
      { icon: "signal", title: "Rank by shipping signals", detail: "Online store, export activity, branches." },
      { icon: "phone", title: "Call or visit the owner", detail: "Ask how many parcels a day or week and who they use now." },
      { icon: "data", title: "Offer a trial week", detail: "Daily pickup at a fixed time, same rates as the current courier for the trial." },
      { icon: "calendar", title: "Review after a month", detail: "Delivery times, issues, remittances. Then agree the account rate." },
    ]},

    { type: "h2", id: "script", text: "An outreach script for an online seller" },
    { type: "prose", text: [
      "A short call or WhatsApp to the owner of a store with an online cart:",
      "\"Hi, I am Meena from SwiftLine Couriers in Jayanagar. I saw your store sells online and ships across India. Many sellers your size book through a portal and drop parcels themselves. We pick up from your shop every day at 5 pm, give you one rate card for all zones, and remit COD weekly. If you send me last month's shipment count by zone, I will send a comparison with what you pay now. Happy to do a one-week trial.\"",
      "The ask — last month's count by zone — is something any seller can share in a minute, and it gives you the numbers for an honest comparison. If your rates are not lower, compete on pickup, remittance and support, and say so plainly.",
      "For law firms and offices, the pitch is different. Walk in with a printed rate card, ask who sends documents and how urgent they usually are, and offer a fixed daily collection time. Document clients rarely switch on price; they switch after a missed filing deadline or a lost notice, so reliability and proof of delivery are what you sell.",
    ]},

    { type: "h2", id: "pricing", text: "Rate cards, contracts and terms that keep customers" },
    { type: "prose", text: [
      "Business shippers compare rate cards, so make yours easy to read: weight slabs, zones, COD charges, fuel surcharge if any, and return-to-origin charges stated up front. Hidden charges discovered on the first invoice end accounts faster than any competitor.",
      "Offer volume tiers that reward growth rather than one-time discounts. Agree the pickup cut-off time in writing — it matters more to the seller than a few rupees per parcel, because it decides whether today's orders leave today.",
      "For document clients like law firms, a monthly bill with a proof-of-delivery report is the product. For online sellers, COD remittance on a fixed weekly day is often the deciding factor; their cash flow depends on it. Whatever you promise, track it, and send a short monthly summary of parcels, delivery times and issues. That summary is what stops a customer from re-tendering.",
    ]},
    { type: "tip", title: "Win on the pickup time",
      text: "Ask every seller what time their last order of the day is packed. A pickup slot just after that time can be worth more to them than any rate cut." },

    { type: "h2", id: "checklist", text: "Checklist for a courier business going after accounts" },
    { type: "checklist", items: [
      { title: "A pickup area you can serve daily", detail: "and a route plan to cover it." },
      { title: "A one-page rate card", detail: "weights, zones, COD, RTO and surcharges stated." },
      { title: "A written pickup cut-off and COD remittance day", detail: "the two promises sellers check most." },
      { title: "A named contact per account", detail: "who answers calls and chases stuck parcels." },
      { title: "A monthly performance summary", detail: "parcels, delivery times, issues resolved." },
      { title: "A trial offer", detail: "one week, no lock-in, to lower the risk of switching." },
    ]},

    { type: "h2", id: "mantis", text: "Where Mantis fits for a courier business" },
    { type: "prose", text: [
      "Mantis finds businesses for any seller. Describe the shippers you want — 'online stores in Surat', 'exporters in Moradabad', 'pharmacies with several branches in Hyderabad' — and it searches live map listings and the web, reads each website for an online store, export text and branches, and returns the published phones and emails, graded, with any WhatsApp number on the site.",
      "Brands that ship also buy packaging, so the guide on [finding buyers for packaging](/resources/how-to-find-buyers-for-packaging) covers the same sellers from another angle. For the general approach, see [how to find clients](/resources/how-to-find-clients). New accounts get 500 free credits, once.",
    ]},
    { type: "cta", variant: "map", title: "Fill your pickup route with regular shippers.",
      detail: "Online sellers, exporters and multi-branch businesses in your area, with contacts. 500 free credits at signup.",
      action: "Start free", href: "/login" },
  ],
  faqs: [
    { q: "How can a courier franchise get more customers?", a: "Move from walk-in parcels to business accounts: online sellers, pharmacies, law and CA firms, manufacturers and exporters within a pickup area you can cover daily. Offer a fixed pickup time, a clear rate card and a trial week." },
    { q: "How do I get e-commerce sellers as courier customers?", a: "Find stores with an online cart near your hub, ask for last month's shipment count by zone, and send an honest comparison. If you cannot beat the price, compete on daily pickup, weekly COD remittance and someone who answers the phone." },
    { q: "What do business customers look for in a courier service?", a: "A reliable pickup time, predictable delivery, transparent charges including returns, prompt COD remittance for sellers, proof of delivery for documents, and quick help when a parcel is stuck." },
    { q: "Can a small courier business compete with aggregators?", a: "Yes, on service rather than price: personal pickup, packing help, a named contact and quick problem-solving. Many sellers value those enough to switch, especially when volumes grow and problems become costly." },
  ],
  links: [
    ["/resources/how-to-find-clients", "how to find clients"],
    ["/resources/logistics-leads-how-to-get-clients", "logistics leads"],
    ["/resources/how-to-find-buyers-for-packaging", "finding buyers for packaging"],
    ["/lists/manufacturer-database", "manufacturer database"],
    ["/resources/how-to-find-buyers-for-export", "finding buyers for export"],
  ],
},

/* ───────────────────────────── 4 · construction company */
{
  slug: "how-to-get-clients-for-construction-business",
  title: "How to Get Clients for Construction Business in India",
  excerpt: "For contractors and builders doing commercial work: fit-outs, factories, warehouses and institutions, the expansion signals that come before a project, and how to get on the bid list.",
  meta: "How to get clients for a construction business: win commercial fit-outs, factories, warehouses and institutional projects by spotting expansion early.",
  category: CAT, cluster: CL, hero: "leads", mins: 9,
  thumb: "which-retail-shops-actually-need-a-website", thumbAlt: "Flat illustration of commercial buildings including a hotel, a clinic and shops on raised platforms",
  tags: ["Construction", "Contractors", "B2B Sales"],
  body: [
    { type: "prose", text: [
      "**To get clients for a construction business in commercial work, find companies before they build: businesses opening new branches, factories adding capacity, warehouses being set up for growing sellers, and institutions — schools, hospitals, hotels — expanding or renovating.** Then get onto the shortlist of the people who decide: the owner, the architect or the project management consultant.",
      "Residential construction runs largely on word of mouth and local reputation. Commercial work is different. Projects are larger, payments follow defined milestones, and the client is a business that will build again — another outlet, another shed, another floor. One good commercial client can become several projects over a few years, which is why this is worth prospecting for deliberately.",
    ]},

    { type: "h2", id: "who-buys", text: "Who commissions commercial construction" },
    { type: "table", head: ["Client", "Typical project", "Who decides", "How they buy"], rows: [
      ["Retail chains, restaurants, clinics", "Fit-out of a new outlet", "Owner, projects head", "Direct award or a few quotes, often a repeat contractor"],
      ["Companies leasing offices", "Office interiors and fit-out", "Founder, admin head, often through a consultant", "Design-and-build or bid against drawings"],
      ["Manufacturers", "Factory shed, extension, civil works", "Owner, plant head", "Quotes against drawings; PEB for speed"],
      ["Warehousing and logistics", "Warehouse, loading docks, flooring", "Owner, developer", "Tender or negotiated"],
      ["Schools, colleges, hospitals, hotels", "New blocks, renovation, upgrades", "Trustees, management, consultants", "Tender, consultant-led evaluation"],
      ["Government and PSUs", "Civil and building works", "Engineering departments", "Public e-procurement tenders"],
    ]},
    { type: "prose", text: [
      "Specialise rather than chase everything. A contractor known for restaurant fit-outs gets referrals from restaurant owners and the architects who design them. One known for industrial sheds gets calls from factory owners in the same cluster. The [hospital](/lists/hospital-database), [hotel](/lists/hotel-database) and [school](/lists/school-database) databases show what the institutional segments look like if you want to build in that direction.",
    ]},

    { type: "h2", id: "signals", text: "Signals that a business is about to build" },
    { type: "prose", text: [
      "Construction projects are planned months ahead, and expansion leaves traces. These are the signals Mantis reads that point to a coming project.",
    ]},
    { type: "table", head: ["Signal Mantis reads", "What it suggests", "Your angle"], rows: [
      ["Several branches under one name", "A chain that keeps opening outlets", "A repeat fit-out contractor"],
      ["Locations or branches page on the site", "Expansion is part of the plan", "Fit-out for the next location"],
      ["'Coming soon' or 'now open' on the site, or a new listing", "An outlet in progress or just opened", "Snag work, the next outlet"],
      ["Hiring now, especially in operations or production", "Headcount and capacity growing", "Office expansion or factory extension"],
      ["Exporter", "A manufacturer scaling for foreign orders", "Capacity additions, compliant facilities"],
      ["Raised funding (news search, run only when you ask)", "Money for new offices and facilities", "Office fit-out, design-and-build"],
    ]},
    { type: "prose", text: [
      "Funded startups are a particularly clear case: a company that has just raised usually plans to hire, and more people need more space. See the [funded startups in India](/funded-startups-india) list. Funding news comes from a paid news search, so Mantis runs it only when you ask for it.",
    ]},

    { type: "cta", variant: "table", title: "Spot expansion before the tender.",
      detail: "Chains adding outlets, factories hiring, companies that just raised. Mantis finds them and reads each site for the signal, with contacts.",
      action: "Find construction clients", href: "/login" },

    { type: "h2", id: "channels", text: "Channels for construction clients, with trade-offs" },
    { type: "table", head: ["Channel", "Works well for", "Weakness"], rows: [
      ["Architects and interior designers", "Fit-outs and design-led projects", "They choose who to recommend; you must earn their trust on site"],
      ["Project management consultants", "Larger commercial and institutional work", "Formal prequalification; competitive bids"],
      ["Commercial property brokers", "Learning who is leasing space before fit-out", "Relationship-driven; slow to build"],
      ["Direct outreach to expanding businesses", "Chains, factories, startups", "Needs a portfolio that matches their type"],
      ["Government e-procurement portals", "Public works", "Registration, documentation and price competition"],
      ["Builders' and contractors' associations", "Subcontracting, partnerships, market news", "Benefits come from showing up over time"],
      ["IndiaMART and JustDial", "Small enquiries", "Mostly residential and small jobs"],
    ]},
    { type: "prose", text: [
      "Architects are the most important channel for fit-outs. They influence or decide which contractor gets a project, and they remember who finished on time and did not cut corners. Ask to visit their current projects, offer to price their next one, and treat the first job as an audition. Our guide for [interior designers getting clients](/resources/how-to-get-interior-design-clients) shows the same relationship from the designer's side. Electrical work is often subcontracted within these projects; the [electrical contractor guide](/resources/how-to-get-clients-for-electrical-business) covers that trade.",
    ]},

    { type: "h2", id: "steps", text: "How to get construction clients, step by step" },
    { type: "steps", items: [
      { icon: "score", title: "Choose a project type", detail: "Restaurant fit-outs, office interiors, industrial sheds, school blocks — one or two." },
      { icon: "verified", title: "Build a portfolio for it", detail: "Photos, scope, size, duration and a client reference for each completed job." },
      { icon: "search", title: "List clients who build that type", detail: "Chains, manufacturers, institutions in your region." },
      { icon: "signal", title: "Rank by expansion signals", detail: "Branches, new listings, hiring, funding." },
      { icon: "phone", title: "Reach the owner and the architect", detail: "Both influence the award." },
      { icon: "calendar", title: "Ask to be on the next bid list", detail: "Then follow up as their plans move." },
    ]},

    { type: "h2", id: "script", text: "An outreach script for a growing chain" },
    { type: "prose", text: [
      "An email or WhatsApp to the owner or projects head of a business with several outlets:",
      "\"Hello Mr Kapoor, I noticed Spice Route now has four outlets in Ahmedabad and a new one listed in Vadodara. We are a fit-out contractor that has completed [number] restaurant kitchens and dining areas in Gujarat, including work for multi-outlet brands. I have attached a one-page summary with photos, timelines and references. If you are planning more outlets this year, could we be considered for the next one? I am happy to walk the site and give an itemised estimate.\"",
      "Notice what it includes: evidence you looked, relevant work only, a short attachment and a small ask. Large firms rarely award a project from one message, but being on the list when the next outlet is approved is the realistic goal.",
      "If you are moving from residential work into commercial projects, start with smaller fit-outs for single-outlet businesses. They are closer to what you already do, they build the photographs and references that chains and consultants ask for, and they teach you the documentation commercial clients expect before you bid for anything larger.",
    ]},

    { type: "h2", id: "contracts", text: "Pricing, contracts and getting paid" },
    { type: "prose", text: [
      "Commercial clients compare itemised estimates, so give them one. A bill of quantities with rates per item makes your quote comparable and makes variations easier to price later. Lump-sum quotes can win small jobs, but they lead to disputes when the scope changes.",
      "Agree payment milestones before you start: a mobilisation advance, running bills against measured work, and a clear retention amount and defect liability period. Put variation approval in writing — a signed instruction before extra work starts is the single best protection against unpaid bills.",
      "For repeat clients such as chains and manufacturers, a rate contract for standard items can speed up every future project. It also makes you the default choice: the client does not need to tender each outlet if the rates are already agreed.",
    ]},
    { type: "tip", title: "Finish one project perfectly",
      text: "The second project from a client almost always comes from how you handled the first: time, cleanliness, communication and snag closure. Send a short handover file with drawings, warranties and contacts. Owners keep it, and they call the name on it." },

    { type: "h2", id: "checklist", text: "Checklist before you pitch a commercial client" },
    { type: "checklist", items: [
      { title: "A portfolio by project type", detail: "photos, scope, size, duration and references." },
      { title: "Registration and compliance documents ready", detail: "GST, labour compliance, insurance — prequalification asks for them." },
      { title: "An itemised estimate template", detail: "so quotes are fast and comparable." },
      { title: "Standard payment terms", detail: "advance, running bills, retention, variations." },
      { title: "A list of architects and consultants", detail: "in your segment, with a plan to meet them." },
      { title: "A reason for each target client", detail: "expansion, hiring, funding — in the first line." },
    ]},

    { type: "h2", id: "mantis", text: "Where Mantis fits for construction companies" },
    { type: "prose", text: [
      "Mantis finds businesses for any seller. Describe the clients you build for — 'restaurant chains in Pune with three or more outlets', 'manufacturers in Chakan that are hiring', 'hospitals in Jaipur' — and it searches live map listings and the web, reads each site for branches, hiring and new openings, and returns the published phones and emails, graded, plus the company LinkedIn and owner's name where stated.",
      "For factories specifically, the [manufacturer database](/lists/manufacturer-database) is a starting point; for the broader method, see [how to find clients](/resources/how-to-find-clients). New accounts get 500 free credits, once.",
    ]},
    { type: "cta", variant: "map", title: "Find the next businesses that will build.",
      detail: "Expanding chains, growing factories and institutions in your region, with contacts. 500 free credits at signup.",
      action: "Start free", href: "/login" },
  ],
  faqs: [
    { q: "How do construction companies find commercial clients?", a: "By specialising in a project type, building a portfolio for it, and approaching businesses that show expansion — new branches, hiring, funding — along with the architects and project consultants who influence awards." },
    { q: "How can a small contractor get bigger projects?", a: "Start with fit-outs and extensions for expanding businesses, deliver them well, and use the references to prequalify for larger work. Partnering with consultants and established contractors as a subcontractor also builds the track record larger clients ask for." },
    { q: "Are government tenders good for a construction business?", a: "They provide steady volume, but they require registration, careful documentation and sharp pricing, and payment cycles can be long. Most contractors balance tenders with private commercial clients." },
    { q: "How do I get onto an architect's list of contractors?", a: "Show relevant completed work, offer to price their current project, and deliver the first job on time with clean execution and good communication. Architects recommend contractors who make them look good to their clients." },
    { q: "What payment terms should a construction contractor ask for?", a: "A mobilisation advance, running bills against measured work, a defined retention and defect liability period, and written approval before any variation. Agree them before starting." },
  ],
  links: [
    ["/resources/how-to-find-clients", "how to find clients"],
    ["/resources/how-to-get-interior-design-clients", "interior design clients"],
    ["/resources/how-to-get-clients-for-electrical-business", "electrical contractor clients"],
    ["/lists/hospital-database", "hospital database"],
    ["/lists/hotel-database", "hotel database"],
    ["/lists/school-database", "school database"],
    ["/lists/manufacturer-database", "manufacturer database"],
    ["/funded-startups-india", "funded startups in India"],
  ],
},
/* ───────────────────────────── 5 · electrical contractor */
{
  slug: "how-to-get-clients-for-electrical-business",
  title: "How to Get Clients for Electrical Business in India",
  excerpt: "For electrical contractors: how to move from one-off jobs to commercial maintenance contracts with factories, hotels, hospitals and offices, and how to spot the buildings that need you.",
  meta: "How to get clients for an electrical business: win AMCs and commercial work from factories, hotels, hospitals and offices, and stop living job to job.",
  category: CAT, cluster: CL, hero: "leads", mins: 8,
  thumb: "how-to-sell-maintenance-plans-after-the-build", thumbAlt: "Flat illustration of a maintenance cycle with a calendar, wrench, shield and refresh arrows linking two premises",
  tags: ["Electrical Contractors", "AMC", "B2B Sales"],
  body: [
    { type: "prose", text: [
      "**To get clients for an electrical business that pay every month, sell annual maintenance contracts (AMCs) and commercial work to buildings that cannot afford a power problem: factories, hotels, hospitals, offices, malls and large housing societies.** A residential call-out pays once. A commercial AMC pays every month, brings the repair and upgrade work that comes up during the year, and renews.",
      "Most electrical contractors in India grow by referral and builder relationships, and get paid job by job. That works until a builder slows down or a slow month arrives. Commercial maintenance smooths the income, and it is a market where a reliable local contractor competes well: the client needs someone who comes within hours, knows the building and keeps the records an inspector or auditor will ask for.",
    ]},

    { type: "h2", id: "who-buys", text: "Who buys commercial electrical services" },
    { type: "table", head: ["Client", "What they need", "Who decides", "Why they switch contractors"], rows: [
      ["Factories and industrial units", "HT/LT panel maintenance, motor and cable work, earthing, power factor correction", "Owner, plant or maintenance head", "Breakdowns, slow response"],
      ["Hotels", "Round-the-clock maintenance, DG and changeover systems, lighting", "General manager, chief engineer", "Guest complaints, outages"],
      ["Hospitals and clinics", "Reliable backup power, panel and earthing maintenance, safety audits", "Administrator, facility head", "Any failure in a critical area"],
      ["Offices and IT parks", "Maintenance, fit-out wiring, UPS and lighting upgrades", "Admin or facility manager", "Poor response, no records"],
      ["Malls, showrooms, chains", "Multi-site maintenance and new outlet wiring", "Projects or maintenance head", "Inconsistent service across sites"],
      ["Housing societies", "Common-area electrical, pumps, lifts' power supply, lighting", "Managing committee", "Annual review, cost"],
    ]},
    { type: "prose", text: [
      "The [hotel](/lists/hotel-database), [hospital](/lists/hospital-database) and [manufacturer](/lists/manufacturer-database) databases are the obvious places to start, because these buildings run around the clock and a power failure costs them more than your annual fee.",
    ]},

    { type: "h2", id: "signals", text: "Signals that a building needs an electrical contractor" },
    { type: "prose", text: [
      "You cannot see a building's wiring from its website, but you can see whether it is growing, opening new space or running many sites. These are the signals Mantis reads.",
    ]},
    { type: "table", head: ["Signal Mantis reads", "What it suggests", "What to offer"], rows: [
      ["Several branches under one name", "Multi-site maintenance needs", "One AMC across all outlets"],
      ["Locations page on the website", "A chain that keeps opening", "Wiring for new outlets plus maintenance"],
      ["'Coming soon' or new Google listing", "A site being fitted out", "Fit-out wiring, then an AMC from day one"],
      ["Hiring now, especially maintenance or production roles", "A plant or building expanding", "Capacity upgrades, panel work"],
      ["Established listing (100+ reviews)", "A busy business that can pay", "Preventive maintenance to avoid downtime"],
      ["Raised funding (news search, run only when you ask)", "New offices coming", "Office fit-out electrical"],
    ]},
    { type: "prose", text: [
      "These signals rank a list. They do not tell you whether a building already has a contractor, which is the first thing to ask. A business with an existing AMC is still a prospect: contracts renew every year, and you want to be the name they think of when service slips.",
    ]},

    { type: "cta", variant: "table", title: "Find buildings that run around the clock.",
      detail: "Hotels, hospitals, factories and multi-outlet chains near you, read for branches and expansion, with the contacts their sites state.",
      action: "Find electrical clients", href: "/login" },

    { type: "h2", id: "channels", text: "Channels for electrical clients, with pros and cons" },
    { type: "table", head: ["Channel", "Works well for", "Weakness"], rows: [
      ["Facility management companies", "Steady subcontracted maintenance", "Thin margins; you are their supplier, not the client's"],
      ["Builders and fit-out contractors", "Wiring for new projects", "Payment cycles depend on theirs; work is lumpy"],
      ["Architects and MEP consultants", "Design-led commercial projects", "Need a track record before they specify you"],
      ["Direct outreach to facility heads", "AMCs with hotels, hospitals, factories", "Takes a list and follow-up"],
      ["Government and PSU tenders", "Steady public work", "Registration, documentation, price competition"],
      ["JustDial and Google listing", "Residential and small shops", "Small tickets; price-led"],
      ["Industrial and contractors' associations", "Factory owners in one area", "Pays off only with regular attendance"],
    ]},
    { type: "prose", text: [
      "Working through a facility management company can be a fast way to fill capacity, and many contractors do both. Just know what you are giving up: the client relationship belongs to them. Direct AMCs take longer to win but are worth more and are yours. Fit-out wiring often comes through the main contractor; our guide on [construction clients](/resources/how-to-get-clients-for-construction-business) explains how those projects are awarded.",
    ]},

    { type: "h2", id: "steps", text: "How to win electrical maintenance contracts, step by step" },
    { type: "steps", items: [
      { icon: "score", title: "Pick building types", detail: "Hotels and hospitals, or factories in one industrial area — where you can respond fast." },
      { icon: "search", title: "List the buildings", detail: "Map listings and websites, filtered by type and area." },
      { icon: "signal", title: "Rank by size and growth", detail: "Branches, hiring, established listings first." },
      { icon: "phone", title: "Reach the facility or maintenance head", detail: "The owner at smaller units." },
      { icon: "verified", title: "Offer a free electrical health check", detail: "A walkthrough with a short written report on panels, earthing and backup." },
      { icon: "send", title: "Quote an AMC against the findings", detail: "Scope, visits, response time and price, tied to what you found." },
    ]},

    { type: "h2", id: "script", text: "An outreach script for a hotel" },
    { type: "prose", text: [
      "A call or email to the general manager or chief engineer:",
      "\"Good morning, I am Ravi from Volt Care Engineering in Kochi. We maintain electrical systems for hotels and hospitals in the city — panels, earthing, DG changeover and lighting. I would like to offer your engineering team a free two-hour electrical walkthrough, with a written report on anything that needs attention before the peak season. There is no obligation; if your current contractor is handling everything well, the report will say so. Would next Tuesday or Thursday morning suit?\"",
      "The health check works because it gives the facility head something useful for free, puts you inside the building, and produces a document that makes the case for you. Keep the report honest. Inflated findings are recognised quickly and close the door permanently.",
    ]},

    { type: "h2", id: "amc", text: "How to price and structure an electrical AMC" },
    { type: "prose", text: [
      "Write the scope clearly. An AMC should list the equipment covered, the preventive maintenance schedule (monthly, quarterly), what is checked on each visit, the breakdown response time, and whether spare parts are included. Comprehensive AMCs include parts and cost more; non-comprehensive ones cover labour and bill parts separately. Offer both and explain the difference.",
      "Price on the work, not on a guess. Count the panels, DG sets, distribution boards and floors, estimate visit hours, add a margin for breakdown calls and travel, and state the response time you can actually meet. Promise a four-hour response only if you can deliver it at night.",
      "Keep records. A visit log, test readings and a list of issues raised and closed are what a client's management, auditor or insurer will ask to see. Sharing them in a monthly summary is also the easiest way to show value in a month when nothing broke.",
    ]},
    { type: "tip", title: "Make the boring months visible",
      text: "In a good AMC, most months nothing happens — which is when clients start wondering what they pay for. Send a one-page monthly report: visits done, readings taken, issues fixed. It turns invisible prevention into something they can see." },

    { type: "h2", id: "checklist", text: "Checklist for an electrical business going after AMCs" },
    { type: "checklist", items: [
      { title: "Licences and certificates in order", detail: "contractor licence and supervisor certification as your state requires." },
      { title: "A health-check format", detail: "a standard walkthrough and a short written report." },
      { title: "Two AMC templates", detail: "comprehensive and non-comprehensive, with scope and response time." },
      { title: "A response time you can keep", detail: "including nights and holidays." },
      { title: "Visit logs and monthly reports", detail: "the records auditors and insurers ask for." },
      { title: "References from commercial clients", detail: "even one hotel or factory helps." },
    ]},

    { type: "h2", id: "mantis", text: "Where Mantis fits for electrical contractors" },
    { type: "prose", text: [
      "Mantis finds businesses for any seller. Describe the buildings you service — 'hotels in Kochi', 'factories in Peenya that are hiring', 'restaurant chains in Chennai with several branches' — and it searches live map listings and the web, reads each site for branches, new openings and hiring, and returns the published phones and emails, graded, with the owner's or manager's name where stated.",
      "Security agencies sell to the same facility heads; the guide on [security agency clients](/resources/how-to-get-clients-for-security-agency) is worth reading for shared lessons on contracts. For the general approach, see [how to find clients](/resources/how-to-find-clients). New accounts get 500 free credits, once.",
    ]},
    { type: "cta", variant: "map", title: "Turn one-off jobs into monthly contracts.",
      detail: "Hotels, hospitals, factories and chains near you, with contacts. 500 free credits at signup.",
      action: "Start free", href: "/login" },
  ],
  faqs: [
    { q: "How can an electrical contractor get commercial clients?", a: "Target buildings that cannot afford outages — factories, hotels, hospitals, offices, malls — and offer a free electrical health check with a written report. Use the findings to propose an annual maintenance contract." },
    { q: "What should an electrical AMC include?", a: "The equipment covered, the preventive maintenance schedule, what is checked on each visit, breakdown response time, whether parts are included, and how records and reports are shared." },
    { q: "How do I price an electrical maintenance contract?", a: "Count the equipment and floors, estimate visit hours and breakdown calls, add travel and a margin, and price the response time you can actually meet. Offer comprehensive and non-comprehensive versions." },
    { q: "Is it worth working with facility management companies?", a: "It can fill capacity quickly, but margins are thinner and the client relationship belongs to them. Many contractors use it alongside direct AMCs that they own." },
    { q: "Where can electrical contractors find leads in India?", a: "Builders, architects and MEP consultants for projects; facility management firms for subcontracts; tenders for public work; and direct outreach to hotels, hospitals, factories and chains for maintenance contracts." },
  ],
  links: [
    ["/resources/how-to-find-clients", "how to find clients"],
    ["/resources/how-to-get-clients-for-construction-business", "construction clients"],
    ["/resources/how-to-get-clients-for-security-agency", "security agency clients"],
    ["/lists/hotel-database", "hotel database"],
    ["/lists/hospital-database", "hospital database"],
    ["/lists/manufacturer-database", "manufacturer database"],
  ],
},

/* ───────────────────────────── 6 · consulting firm */
{
  slug: "how-to-get-clients-for-consulting-business",
  title: "How to Get Clients for Consulting Business in India",
  excerpt: "For independent consultants and small firms selling to SMEs: find businesses by trigger — hiring, expansion, funding, outdated systems — and sell a paid diagnostic before the project.",
  meta: "How to get clients for a consulting business: find SMEs by trigger — hiring, expansion, funding, outdated systems — and open with a paid diagnostic.",
  category: CAT, cluster: CL, hero: "leads", mins: 8,
  thumb: "the-first-call-10-questions-that-qualify-a-lead", thumbAlt: "Flat illustration of a phone and a checklist sorting businesses into qualified and not qualified",
  tags: ["Consulting", "SME", "Client Acquisition"],
  body: [
    { type: "prose", text: [
      "**To get clients for a consulting business, stop describing what you do and start finding businesses at the moment they need it: when they are hiring fast, opening branches, raising money, exporting for the first time, or running on systems they have outgrown.** A trigger turns a generic offer into a timely one, and it gives you the first line of every message.",
      "Consulting is sold on trust, so referrals will always be a large part of it. The problem is that referrals arrive when they want to, not when you need them. Outbound built around triggers is how independent consultants and small firms make their pipeline less dependent on luck, without sounding like a sales team.",
    ]},

    { type: "h2", id: "triggers", text: "Who buys consulting, and the trigger behind each" },
    { type: "table", head: ["Consulting type", "Trigger that creates the need", "Typical buyer"], rows: [
      ["HR, hiring and people processes", "Rapid hiring, a first HR hire, a new location", "Founder or owner"],
      ["Finance, virtual CFO, fundraising readiness", "A fresh funding round or a raise coming up", "Founder, finance head"],
      ["Operations and process improvement", "New branches, a new plant, growing headcount", "Owner, operations head"],
      ["Digital, IT and systems", "An old website, no HTTPS, an outdated CMS, enquiry forms that go nowhere", "Owner, IT or marketing head"],
      ["Marketing and growth", "Running ads without tracking, no analytics, few reviews", "Owner, marketing head"],
      ["Export and compliance", "A business that has started exporting", "Owner, export head"],
    ]},
    { type: "prose", text: [
      "Choose one or two of these, not all six. 'Business consultant' is not a category anyone searches for or refers by; 'the person who sets up finance for startups after their first round' is. A narrow positioning also makes your triggers sharper and your list smaller, which is what you want.",
    ]},

    { type: "h2", id: "signals", text: "Signals that an SME needs a consultant now" },
    { type: "prose", text: [
      "Each of these is something Mantis can read from a business's listing, website or, when asked, funding news.",
    ]},
    { type: "table", head: ["Signal Mantis reads", "What it suggests", "Consulting angle"], rows: [
      ["Hiring now (careers page or job board)", "Growth straining people and processes", "HR, hiring process, operations"],
      ["Several branches, or a locations page", "Multi-site complexity", "Standard processes, reporting, controls"],
      ["Raised funding (news search, run only when you ask)", "New money, new expectations from investors", "Finance, reporting, hiring plans"],
      ["Old website, no HTTPS, not mobile-ready, outdated CMS", "Systems that have not kept up", "Digital and IT modernisation"],
      ["No analytics, no Meta pixel, no Google Ads tag", "Marketing spend without measurement", "Marketing and growth"],
      ["Enquiry form that goes nowhere", "Leads lost before anyone sees them", "Sales process, CRM"],
      ["Exporter", "New regulatory and logistics demands", "Export processes and compliance"],
    ]},
    { type: "prose", text: [
      "The hiring signal is one of the strongest, because the roles say what the company is about to struggle with. A firm hiring its first finance manager is building a function; one hiring ten sales reps will soon need a sales process. The [recruitment agency leads](/leads-for/recruitment-agencies) page shows companies hiring in volume, and the [funded startups in India](/funded-startups-india) list covers companies that have just raised. Funding news comes from a paid news search, so Mantis runs it only when you ask.",
    ]},

    { type: "cta", variant: "table", title: "Find SMEs with a reason to call you.",
      detail: "Hiring, expansion, outdated systems, untracked ad spend. Mantis finds the businesses and reads each site for the trigger, with contacts.",
      action: "Find consulting clients", href: "/login" },

    { type: "h2", id: "channels", text: "Channels for consulting clients, honestly compared" },
    { type: "table", head: ["Channel", "Works well for", "Weakness"], rows: [
      ["Referrals from past clients", "The highest-trust introductions", "Unpredictable timing; you cannot scale them on demand"],
      ["Chartered accountants and lawyers", "SME owners who ask their CA for advice", "They refer only when confident you will not embarrass them"],
      ["Trigger-based outreach", "A steady flow of first conversations", "Needs a sharp offer and good research"],
      ["LinkedIn and writing", "Credibility with founders and managers", "Slow to compound; easy to mistake posting for selling"],
      ["Industry associations and chambers", "Owners in one sector or city", "Benefits come from regular, visible participation"],
      ["Workshops and webinars", "Showing expertise to many at once", "Attendance does not equal intent"],
      ["Freelance and consulting marketplaces", "Short, scoped projects", "Price competition; low-value work"],
    ]},
    { type: "prose", text: [
      "Partnerships with accountants are worth extra effort for SME-focused consultants. CAs see their clients' numbers and problems every year, and many are asked for advice outside their scope. Offer to take on a small piece for one of their clients and report back through them. Our guide on [getting accounting clients](/resources/how-to-get-accounting-clients) shows how accountants think about referrals. For LinkedIn specifically, see [getting clients from LinkedIn](/resources/how-to-get-clients-from-linkedin).",
    ]},

    { type: "h2", id: "steps", text: "How to get consulting clients, step by step" },
    { type: "steps", items: [
      { icon: "score", title: "Narrow the offer", detail: "One problem, one kind of company, one trigger." },
      { icon: "search", title: "List companies with the trigger", detail: "Hiring, expanding, funded, or running outdated systems." },
      { icon: "signal", title: "Read each one", detail: "Website, careers page, recent news. Note the specific thing you would fix." },
      { icon: "send", title: "Open with the observation", detail: "Name the trigger and what usually goes wrong next." },
      { icon: "data", title: "Offer a paid diagnostic", detail: "A short, fixed-fee assessment with a written output." },
      { icon: "calendar", title: "Convert to a project or retainer", detail: "Built on what the diagnostic found." },
    ]},

    { type: "h2", id: "script", text: "An outreach script for a hiring company" },
    { type: "prose", text: [
      "An email to the founder of a company with many open roles:",
      "\"Hi Vikram, I noticed Kitebird has fourteen open roles across sales and support. Growth at that pace usually exposes the same gaps: no standard onboarding, managers hiring without a scorecard, and the first resignations arriving around month three. I help companies of 30 to 150 people put a simple hiring and onboarding process in place in about six weeks. If useful, I can do a two-hour diagnostic of your current process and send a written list of the three changes I would make first. Would that be worth a short call?\"",
      "It names the trigger, shows you understand what follows from it, defines who you help, and offers something small and concrete. Replace the details with what you actually saw; a script reused without the specific observation reads as a template.",
    ]},

    { type: "h2", id: "pricing", text: "Pricing: diagnostics, projects and retainers" },
    { type: "prose", text: [
      "A paid diagnostic is the most useful first offer in consulting. It is small enough for an owner to approve quickly, it lets both sides see whether the fit is real, and the written output becomes the scope of the larger project. Credit the fee against the project if they go ahead.",
      "Projects should be priced by outcome and scope, not by days alone. Daily rates invite clients to count your hours. A fixed fee for a defined result — a hiring process in place, a monthly reporting pack built — is easier to approve and easier to deliver well.",
      "Retainers suit ongoing roles: a virtual CFO, a fractional HR head, a monthly growth review. Define what is included each month and what is extra, and review the scope every quarter. Retainers that drift without a clear scope tend to end badly on both sides.",
    ]},
    { type: "tip", title: "Sell the diagnosis, not the cure",
      text: "Owners rarely buy a large project from someone they have just met. They will often pay for a short, clearly scoped diagnosis — and once you have found the problem, you are the natural person to fix it." },

    { type: "h2", id: "checklist", text: "Checklist before you start outreach" },
    { type: "checklist", items: [
      { title: "A one-line positioning", detail: "the problem, the type of company, the trigger." },
      { title: "A fixed-fee diagnostic", detail: "scope, duration, price and what the written output covers." },
      { title: "Two or three short case notes", detail: "problem, what you did, the result — anonymised if needed." },
      { title: "A list of 50 companies with the trigger", detail: "each with the specific observation noted." },
      { title: "Two referral partners", detail: "accountants or lawyers who serve the same companies." },
      { title: "A follow-up schedule", detail: "at least two more touches, each adding something new." },
    ]},

    { type: "h2", id: "mantis", text: "Where Mantis fits for consultants" },
    { type: "prose", text: [
      "Mantis finds businesses for any seller. Describe the companies you help — 'manufacturers in Coimbatore that are hiring', 'D2C brands running ads without analytics', 'clinics with several branches in Delhi' — and it searches live map listings and the web, reads each site for the signals above, and returns the published emails and phones, graded, with the company LinkedIn and founder's name where stated.",
      "If your work includes benefits or risk advice, the guide on [insurance business clients](/resources/how-to-get-clients-for-insurance-business) covers the same employers from that side. For the full method, see [how to find clients](/resources/how-to-find-clients). New accounts get 500 free credits, once.",
    ]},
    { type: "cta", variant: "map", title: "Start every conversation with a trigger.",
      detail: "SMEs that are hiring, expanding, funded or running outdated systems, with contacts. 500 free credits at signup.",
      action: "Start free", href: "/login" },
  ],
  faqs: [
    { q: "How do new consultants get their first clients?", a: "Through their existing network first, then by narrowing their offer to one problem and one type of company, finding businesses showing the trigger for that problem, and offering a small paid diagnostic." },
    { q: "What is the best way to find consulting clients in India?", a: "Combine referral partners such as CAs and lawyers with trigger-based outreach to SMEs that are hiring, expanding, raising funds, exporting or running outdated systems. Both work better with a narrow positioning." },
    { q: "Should consultants charge for a first assessment?", a: "A short paid diagnostic usually works better than a free one. It filters for serious buyers, produces a written output, and becomes the scope of the larger project. Credit the fee if they continue." },
    { q: "Retainer or project pricing for consulting?", a: "Projects suit defined outcomes; retainers suit ongoing roles like a virtual CFO or fractional HR head. Whichever you use, define the scope clearly and review it regularly." },
    { q: "How do I find SMEs that need consulting?", a: "Look for visible triggers: open roles on careers pages, new branches, funding news, export activity, outdated websites and ad spend without tracking. Each points to a specific problem you can name in your first message." },
  ],
  links: [
    ["/resources/how-to-find-clients", "how to find clients"],
    ["/resources/how-to-get-accounting-clients", "accounting clients"],
    ["/resources/how-to-get-clients-from-linkedin", "clients from LinkedIn"],
    ["/resources/how-to-get-clients-for-insurance-business", "insurance business clients"],
    ["/leads-for/recruitment-agencies", "companies hiring in volume"],
    ["/funded-startups-india", "funded startups in India"],
  ],
},

/* ───────────────────────────── 7 · security agency */
{
  slug: "how-to-get-clients-for-security-agency",
  title: "How to Get Clients for a Security Agency in India",
  excerpt: "For private security agencies: winning guarding contracts with housing societies, offices, factories, warehouses, banks and events, and quoting a rate that is both compliant and competitive.",
  meta: "How to get clients for a security agency in India: win guard contracts with societies, offices, factories and events with a compliant, transparent rate.",
  category: CAT, cluster: CL, hero: "leads", mins: 8,
  thumb: "website-maintenance-plans-what-to-charge", thumbAlt: "Flat illustration of a calendar, a shield, a wrench and coins around a renewal arrow",
  tags: ["Security Agency", "Facility Services", "B2B Sales"],
  body: [
    { type: "prose", text: [
      "**To get clients for a security agency, sell guarding contracts to the places that need people on duty every day — housing societies, offices, factories, warehouses, hospitals, schools, retail chains and banks — plus event security for organisers and venues, and quote a rate that shows every statutory cost.** Contracts are monthly and renew, so each site you win is recurring revenue, and the agencies that keep sites are the ones that show up, supervise and pay their guards properly.",
      "The market is crowded and price-driven, and many buyers choose on the lowest per-guard rate. That is exactly why transparency wins with the better clients: a society committee or facility manager who has been burned by an agency that cut corners on wages or attendance will pay a fair rate for one that does not.",
    ]},

    { type: "h2", id: "who-buys", text: "Who hires a security agency" },
    { type: "table", head: ["Client", "What they need", "Who decides", "What they check"], rows: [
      ["Housing societies and RWAs", "Gate guards, visitor management, night patrol", "Managing committee", "Rate, guard behaviour, attendance"],
      ["Offices and IT parks", "Reception security, access control, patrol", "Admin or facility manager", "Grooming, reporting, compliance papers"],
      ["Factories and warehouses", "Gate control, material movement checks, night patrol", "Owner, plant or admin head", "Reliability, theft prevention, records"],
      ["Hospitals and schools", "Access control, crowd management, safety", "Administrator, principal", "Trained, verified staff"],
      ["Retail chains and showrooms", "Store guards across outlets", "Operations or loss-prevention head", "Multi-site supervision"],
      ["Banks and ATMs", "Branch and ATM guarding", "Usually central or regional procurement", "Licensing, scale, compliance"],
      ["Event organisers and venues", "Crowd and access control for a date", "Organiser, venue manager", "Numbers at short notice"],
    ]},
    { type: "prose", text: [
      "Banks typically contract centrally and favour larger, established agencies, so for a growing agency they are often a later target or a subcontracting route. Societies, offices, factories and warehouses are where most local agencies build their base.",
    ]},

    { type: "h2", id: "compliance", text: "Licensing and compliance clients will ask for" },
    { type: "prose", text: [
      "Private security agencies in India are regulated under the Private Security Agencies (Regulation) Act, 2005, and need a licence from each state they operate in. Serious buyers will ask for it, along with proof of guard verification, training, and statutory registrations such as PF and ESI.",
      "Keep these in a ready file: the PSARA licence, registrations, a sample attendance and wage register format, the training and verification process, and insurance cover. Facility managers often shortlist on paperwork before they compare prices.",
    ]},

    { type: "h2", id: "signals", text: "Signals that a business needs security services" },
    { type: "prose", text: [
      "New premises need guards from day one, and every new branch of a chain is another site. These are the signals Mantis reads that point to a need.",
    ]},
    { type: "table", head: ["Signal Mantis reads", "What it suggests", "What to offer"], rows: [
      ["New Google listing or a 'coming soon / now open' site", "New premises without a security contract yet", "Guarding from opening day"],
      ["Several branches under one name", "Multi-site guarding needs", "One agency, one supervisor structure"],
      ["Locations page on the website", "A chain that keeps adding sites", "Rates for future sites agreed up front"],
      ["Hiring now, especially warehouse or production staff", "A site getting busier", "Gate control, material checks"],
      ["Established listing (100+ reviews)", "High footfall", "Crowd and access management"],
      ["WhatsApp number on the site", "An owner reachable directly", "A quick first message"],
    ]},
    { type: "prose", text: [
      "Use the [hospital](/lists/hospital-database), [hotel](/lists/hotel-database), [school](/lists/school-database) and [manufacturer](/lists/manufacturer-database) databases to see what each segment looks like in your city.",
    ]},

    { type: "cta", variant: "table", title: "Find new sites before another agency does.",
      detail: "New outlets, multi-branch chains, factories and hospitals near you, with the contacts their sites state.",
      action: "Find security clients", href: "/login" },

    { type: "h2", id: "channels", text: "Channels for security agency clients" },
    { type: "table", head: ["Channel", "Works well for", "Weakness"], rows: [
      ["Direct visits to societies and offices", "Local contracts near your existing sites", "Committees meet rarely; decisions are slow"],
      ["Facility management companies", "Volume through subcontracting", "Lower margins; client relationship stays with them"],
      ["Property managers and builders", "New buildings at handover", "Competitive; builders may have tie-ups"],
      ["Event organisers and venues", "Recurring short contracts", "Short notice; price pressure"],
      ["Tenders (government, PSUs)", "Large, steady contracts", "Documentation, price competition, payment delays"],
      ["JustDial and IndiaMART", "Inbound enquiries", "Shared, price-led enquiries"],
      ["WhatsApp groups of RWAs and local associations", "Referrals within a neighbourhood", "Reputation travels both ways"],
    ]},
    { type: "prose", text: [
      "Your existing sites are your best sales tool. A society that is happy with its guards is the strongest reference for the society next door, and a factory owner will ask other owners in the industrial area who they use. Ask satisfied clients for a short letter of reference and permission to bring prospects to see a site. Commercial cleaning buyers overlap heavily with yours; see [commercial cleaning customers](/resources/how-to-get-customers-for-cleaning-business).",
    ]},

    { type: "h2", id: "steps", text: "How to get security agency clients, step by step" },
    { type: "steps", items: [
      { icon: "map", title: "Pick an area you can supervise", detail: "Clients judge you on supervision; sites spread too far apart suffer." },
      { icon: "search", title: "List sites in it", detail: "Societies, offices, factories, warehouses, hospitals, schools." },
      { icon: "signal", title: "Rank by signal", detail: "New premises, multi-branch businesses and busy sites first." },
      { icon: "phone", title: "Reach the decision-maker", detail: "Committee secretary, admin head, plant head." },
      { icon: "verified", title: "Offer a free security survey", detail: "Walk the site, recommend posts and shifts in writing." },
      { icon: "send", title: "Quote with a full cost breakup", detail: "Wages, statutory contributions, supervision, service charge." },
    ]},

    { type: "h2", id: "script", text: "An outreach script for a new warehouse" },
    { type: "prose", text: [
      "A call or WhatsApp to the owner or site head of a warehouse that has just opened:",
      "\"Hello, this is Suresh from Shield Point Security in Bhiwandi. I saw your new warehouse is listed on Google. We guard warehouses and factories in this area, with a supervisor on night rounds and a daily attendance report on WhatsApp. I would like to do a free walk of the site and give you a written recommendation on gates, posts and shifts, with a rate that shows every cost. Could I come by this week?\"",
      "A written survey is valuable to the client even if they choose someone else, and it frames you as the expert rather than a vendor quoting a number.",
    ]},

    { type: "h2", id: "pricing", text: "Pricing guard contracts without racing to the bottom" },
    { type: "prose", text: [
      "Quote per guard per month, with a breakup: the applicable minimum wage for the category and state, PF and ESI contributions, bonus, leave and relief reserve, uniform, supervision, your service charge, and GST. Many buyers have never seen this breakup, and it explains why a very low rate usually means something is being skipped.",
      "Do not go below the statutory cost to win a site. Under-paid guards leave or stop caring, attendance slips, and the client blames the agency — then the site is lost anyway. A clear breakup lets you hold your rate and makes the cheapest competitor explain theirs.",
      "Add value in service, not in discounts: a supervisor visiting every shift, a daily attendance report, relief guards on short notice, a monthly review with the client. Write these into the contract with a notice period and annual rate revision linked to wage changes.",
    ]},
    { type: "tip", title: "Send the attendance report daily",
      text: "A one-line daily WhatsApp to the client — posts covered, any absence and its replacement — costs almost nothing and is the single most visible proof that your agency is in control." },

    { type: "h2", id: "checklist", text: "Checklist before you pitch a site" },
    { type: "checklist", items: [
      { title: "PSARA licence and registrations", detail: "in a ready file with sample registers." },
      { title: "A guard verification and training process", detail: "written, so you can show it." },
      { title: "A rate breakup template", detail: "wages, statutory costs, supervision, service charge, GST." },
      { title: "A site survey format", detail: "posts, shifts, risks and recommendations." },
      { title: "Supervision and reporting plan", detail: "visits per shift, daily attendance report." },
      { title: "References from current sites", detail: "and permission for prospects to visit." },
    ]},

    { type: "h2", id: "mantis", text: "Where Mantis fits for a security agency" },
    { type: "prose", text: [
      "Mantis finds businesses for any seller. Describe the sites you guard — 'warehouses in Bhiwandi', 'hospitals in Nagpur', 'retail chains with several outlets in Hyderabad' — and it searches live map listings and the web, reads each site for new openings, branches and hiring, and returns the published phones and emails, graded, with any WhatsApp number on the site.",
      "Facility heads who hire guards also buy electrical maintenance; see [electrical contractor clients](/resources/how-to-get-clients-for-electrical-business). For the general method, see [how to find clients](/resources/how-to-find-clients). New accounts get 500 free credits, once.",
    ]},
    { type: "cta", variant: "map", title: "Find the sites that need guards next month.",
      detail: "New premises, multi-branch businesses and busy sites in your area, with contacts. 500 free credits at signup.",
      action: "Start free", href: "/login" },
  ],
  faqs: [
    { q: "How can a security agency get new clients?", a: "Target sites in an area you can supervise — societies, offices, factories, warehouses, hospitals, schools — prioritising new premises and multi-branch businesses. Offer a free written security survey and quote with a full cost breakup." },
    { q: "How do I get security contracts from housing societies?", a: "Approach the managing committee before its annual contract review, offer a site survey, show references from nearby societies, and quote transparently. Committees value attendance reporting and supervision as much as price." },
    { q: "What licence does a security agency need in India?", a: "A licence under the Private Security Agencies (Regulation) Act, 2005, from each state where you operate, along with statutory registrations such as PF and ESI. Clients increasingly ask for these before comparing prices." },
    { q: "How should a security agency price its services?", a: "Per guard per month, with a breakup of minimum wages, PF, ESI, bonus, leave reserve, uniform, supervision, service charge and GST. Never price below statutory cost; it leads to poor service and lost sites." },
    { q: "Are tenders worth it for a small security agency?", a: "They offer large, steady contracts but require documentation and sharp pricing, and payments can be slow. Many agencies build a private client base first, then add tenders." },
  ],
  links: [
    ["/resources/how-to-find-clients", "how to find clients"],
    ["/resources/how-to-get-customers-for-cleaning-business", "commercial cleaning customers"],
    ["/resources/how-to-get-clients-for-electrical-business", "electrical contractor clients"],
    ["/lists/hospital-database", "hospital database"],
    ["/lists/hotel-database", "hotel database"],
    ["/lists/school-database", "school database"],
    ["/lists/manufacturer-database", "manufacturer database"],
  ],
},

/* ───────────────────────────── 8 · packaging */
{
  slug: "how-to-find-buyers-for-packaging",
  title: "How to Find Buyers for Packaging Products in India",
  excerpt: "For packaging manufacturers and suppliers: D2C brands, food manufacturers, bakeries, restaurants and exporters — how to spot each one, what they need to see, and how to lock in repeat orders.",
  meta: "How to find buyers for packaging in India: reach D2C brands, food makers, bakeries and exporters with samples, clear MOQs and repeat-order terms.",
  category: CAT, cluster: CL, hero: "leads", mins: 8,
  thumb: "high-ticket-web-design-niches-in-india", thumbAlt: "Flat illustration of a map of India surrounded by factories, shops and growth charts",
  tags: ["Packaging", "Manufacturing", "B2B Sales"],
  body: [
    { type: "prose", text: [
      "**To find buyers for packaging, go after businesses that ship or sell a physical product in volume and reorder on a cycle: D2C brands with an online store, food manufacturers, bakeries and sweet shops, restaurants and cloud kitchens, and exporters.** Then win them with samples, a clear MOQ and lead time, and terms that make the reorder automatic.",
      "Packaging is a repeat purchase. A brand that approves your box will order it again with every production run, often for years, unless something goes wrong. That makes the first approval valuable and worth the effort of sampling, and it makes the right buyers — those with steady, growing volumes — worth finding deliberately rather than waiting for portal enquiries.",
    ]},

    { type: "h2", id: "who-buys", text: "Who buys packaging, and what they need" },
    { type: "table", head: ["Buyer", "Typical packaging", "What decides the order", "Order pattern"], rows: [
      ["D2C and e-commerce brands", "Mailer boxes, printed cartons, pouches, inserts, tapes", "Look and feel, short runs, unboxing quality", "Small to start, growing with sales"],
      ["Food manufacturers and FMCG", "Laminates, pouches, cartons, labels, corrugated shippers", "Food-grade compliance, consistency, price", "Large, scheduled"],
      ["Bakeries and sweet shops", "Cake and sweet boxes, bags, liners", "Price, print, availability before festivals", "Steady with festive spikes"],
      ["Restaurants and cloud kitchens", "Delivery containers, bags, sealing, branded sleeves", "Leak-proofing, cost per order, branding", "Weekly or monthly"],
      ["Exporters", "Export cartons, palletisation, protective packaging", "Strength, compliance with destination rules, documentation", "Per shipment"],
      ["Pharma and cosmetics", "Mono cartons, labels, leaflets", "Regulatory text, print accuracy, audits", "Scheduled, audited"],
    ]},
    { type: "prose", text: [
      "Match the segment to your capability. Corrugated box makers are naturally suited to e-commerce and export shippers; flexible packaging converters to food and FMCG; printed mono-carton makers to cosmetics, pharma and premium food. Trying to serve every segment with one sales pitch makes you look like a trader, not a manufacturer.",
    ]},

    { type: "h2", id: "signals", text: "Signals for finding packaging buyers" },
    { type: "prose", text: [
      "Several of the best predictors of packaging demand are visible on a business's website or listing. These are the ones Mantis reads.",
    ]},
    { type: "table", head: ["Signal Mantis reads", "What it suggests", "What to offer"], rows: [
      ["Has an online store (cart on the site)", "Products shipping to customers", "Mailer boxes, shippers, inserts"],
      ["Shopify store with no reviews or email app", "A younger D2C store still setting up", "Branded unboxing, short runs"],
      ["Running Meta or Google ads", "A brand spending to grow orders", "Capacity for growing volumes"],
      ["Exporter (IEC or export text)", "Shipments abroad", "Export cartons and protective packaging"],
      ["Online menu, or new on delivery apps", "A restaurant doing delivery", "Containers, bags, branded sleeves"],
      ["New Google listing or 'now open'", "A new bakery, cafe or brand", "A starter packaging set"],
      ["Several branches", "A chain with standard packaging", "Central supply across outlets"],
      ["Raised funding (news search, run only when you ask)", "A brand about to scale", "Capacity and price breaks at volume"],
    ]},
    { type: "prose", text: [
      "Use these to rank buyers, then confirm on a call what they use now and how much. The [restaurant database](/lists/restaurant-database) and [manufacturer database](/lists/manufacturer-database) are good places to see the segments, and [funded startups in India](/funded-startups-india) covers brands that have just raised. Funding news comes from a paid news search, so Mantis runs it only when asked.",
    ]},

    { type: "cta", variant: "table", title: "Find brands that ship every day.",
      detail: "Online stores, food makers, restaurants and exporters, read for the signals above, with the contacts their sites state.",
      action: "Find packaging buyers", href: "/login" },

    { type: "h2", id: "channels", text: "Channels for packaging buyers, with honest trade-offs" },
    { type: "table", head: ["Channel", "Works well for", "Weakness"], rows: [
      ["IndiaMART and TradeIndia", "Inbound enquiries, visibility", "Many shared, price-led enquiries; ranking depends on paid tier"],
      ["Direct outreach to brands with samples", "D2C and food brands", "Sampling costs money and time"],
      ["Packaging and food trade fairs", "Meeting many buyers in a few days", "Stall costs; follow-up decides the value"],
      ["Packaging distributors and traders", "Reaching small buyers you cannot serve directly", "Margins shared; less control"],
      ["Industry associations and clusters", "Food and manufacturing owners in one area", "Needs regular presence"],
      ["WhatsApp catalogue", "Reorders and seasonal offers to existing customers", "Not a cold acquisition channel by itself"],
      ["Brand and contract manufacturer referrals", "New brands launching with a co-packer", "Relationship-built, slow to start"],
    ]},
    { type: "prose", text: [
      "Contract manufacturers are an under-used channel. Many new D2C brands use a third-party manufacturer, and that manufacturer is often asked which packaging supplier to use. Being the name they recommend can bring a stream of new brands. For working with resellers, see [how to find distributors](/resources/how-to-find-distributors); for export markets, [how to find buyers for export](/resources/how-to-find-buyers-for-export). Our review of [IndiaMART and JustDial as lead sources](/resources/justdial-indiamart-as-lead-sources) covers the portal trade-offs in detail.",
    ]},

    { type: "h2", id: "steps", text: "How to find packaging buyers, step by step" },
    { type: "steps", items: [
      { icon: "score", title: "Pick the segment that fits your machines", detail: "E-commerce shippers, food pouches, premium cartons." },
      { icon: "search", title: "List the buyers", detail: "Brand websites, map listings, fair exhibitor lists." },
      { icon: "signal", title: "Rank by volume signals", detail: "Online store, ads, export activity, branches." },
      { icon: "phone", title: "Find the buyer", detail: "Founder at a small brand; purchase or packaging head at a larger one." },
      { icon: "send", title: "Send samples with a spec sheet", detail: "Material, size, print options, MOQ, lead time, price bands." },
      { icon: "calendar", title: "Agree a reorder schedule", detail: "Turn the first order into a blanket order with releases." },
    ]},

    { type: "h2", id: "script", text: "An outreach script for a D2C brand" },
    { type: "prose", text: [
      "A short email or WhatsApp to the founder of a brand with an online store:",
      "\"Hi Priya, I came across Bloom & Basil's store — the products look great. We make printed mailer boxes for D2C brands in Pune, with runs from [your MOQ] boxes and delivery in [your lead time]. Many brands at your stage switch from plain cartons to a printed box once orders pick up, because it changes how the product arrives. I would like to send you three sample boxes in your current size with a price sheet at three volumes. Could you share the box size you use now?\"",
      "The ask — a box size — is easy to answer and leads directly to a relevant sample. Fill in your real MOQ and lead time; these are the first two things any buyer checks.",
    ]},

    { type: "h2", id: "terms", text: "Pricing, MOQs and contract terms" },
    { type: "prose", text: [
      "State one-time costs separately. Plates, dies and cylinders are a real cost for printed packaging, and buyers accept them when they are explained up front. Hidden in the unit price, they make your quote look expensive against a competitor who will add them later.",
      "Offer price breaks by volume and make the MOQ clear. A brand that is small now will grow, and a low entry MOQ — even at a higher unit price — can win the account before volumes justify a better price.",
      "For regular buyers, propose a blanket purchase order with scheduled releases. It gives them assured supply and gives you planning certainty. Include a price revision clause linked to raw material costs such as paper, board or film, since these move and absorbing every rise is not sustainable.",
      "For food packaging, be ready to confirm food-grade materials and support the buyer's own labelling and compliance needs. For exporters, ask about destination requirements early — for example, wooden pallets and crates usually need ISPM-15 treatment and marking.",
    ]},
    { type: "tip", title: "Win the festive season early",
      text: "Bakeries, sweet shops and gifting brands order heavily before festivals. Approach them well ahead with samples and a reserved-capacity offer; by the time demand peaks, suppliers are already chosen." },

    { type: "h2", id: "checklist", text: "Checklist before you approach packaging buyers" },
    { type: "checklist", items: [
      { title: "Sample kits by segment", detail: "boxes, pouches or cartons that match each buyer type." },
      { title: "A spec sheet", detail: "materials, sizes, print options, MOQ, lead time." },
      { title: "A price sheet at three volumes", detail: "with one-time costs listed separately." },
      { title: "Compliance documents", detail: "food-grade certificates, test reports, export treatment where relevant." },
      { title: "Photos of your plant and machines", detail: "buyers check capacity before they trust a new supplier." },
      { title: "A reorder process", detail: "stored specs, approved samples, scheduled releases." },
    ]},

    { type: "h2", id: "mantis", text: "Where Mantis fits for packaging suppliers" },
    { type: "prose", text: [
      "Mantis finds businesses for any seller. Describe the buyers you want — 'D2C skincare brands with an online store', 'food manufacturers in Indore', 'exporters in Ludhiana', 'bakeries in Kolkata' — and it searches live map listings and the web, reads each site for an online store, ads, export activity and branches, and returns the published emails and phones, graded, with the company LinkedIn and founder's name where stated.",
      "If you also print labels and inserts, [getting customers for a printing business](/resources/how-to-get-customers-for-printing-business) covers related buyers, and the [courier customers guide](/resources/how-to-get-customers-for-courier-business) targets the same online sellers. For the full method, see [how to find clients](/resources/how-to-find-clients). New accounts get 500 free credits, once.",
    ]},
    { type: "cta", variant: "map", title: "Find buyers who reorder packaging.",
      detail: "D2C brands, food makers, restaurants and exporters with signals and contacts. 500 free credits at signup.",
      action: "Start free", href: "/login" },
  ],
  faqs: [
    { q: "How do I find buyers for my packaging business?", a: "Choose the segment your machines suit — e-commerce shippers, food packaging, premium cartons — list businesses in it with volume signals such as an online store, ads or export activity, and approach them with samples, a spec sheet and clear MOQ and lead time." },
    { q: "Who are the biggest buyers of packaging in India?", a: "Food and FMCG manufacturers, e-commerce and D2C brands, pharma and cosmetics companies, restaurants and cloud kitchens, bakeries and sweet shops, and exporters. Each needs different materials and proof." },
    { q: "How do I get D2C brands as packaging customers?", a: "Find brands with an online store, send samples in their current box size with a price sheet at several volumes, offer a low entry MOQ, and agree a reorder schedule as they grow. Contract manufacturers can also refer new brands." },
    { q: "Is IndiaMART good for packaging leads?", a: "It brings enquiries and visibility, but many are shared with several suppliers and are price-led. Balance it with direct outreach to buyers you chose and referrals from contract manufacturers." },
    { q: "How should packaging suppliers price their products?", a: "Show one-time plate, die or cylinder costs separately, offer price breaks by volume, and include a raw-material price revision clause for regular buyers. A blanket order with scheduled releases suits both sides." },
  ],
  links: [
    ["/resources/how-to-find-clients", "how to find clients"],
    ["/resources/how-to-find-distributors", "how to find distributors"],
    ["/resources/how-to-find-buyers-for-export", "finding buyers for export"],
    ["/resources/justdial-indiamart-as-lead-sources", "IndiaMART and JustDial as lead sources"],
    ["/resources/how-to-get-customers-for-printing-business", "printing business customers"],
    ["/resources/how-to-get-customers-for-courier-business", "courier customers"],
    ["/lists/restaurant-database", "restaurant database"],
    ["/lists/manufacturer-database", "manufacturer database"],
    ["/funded-startups-india", "funded startups in India"],
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
