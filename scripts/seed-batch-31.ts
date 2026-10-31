/**
 * Batch 31 — "how to get clients/customers for <service business>", for B2B service sellers.
 *
 * Nine posts in the growth cluster, each one written for a seller whose buyers are other
 * businesses: commercial cleaning, graphic design, business coaching, corporate travel,
 * recruitment, commercial pest control, corporate catering, logistics, and ad/email agencies.
 *
 * Every signal named in these posts is one the product actually detects (lib/v2/playbooks.ts
 * SIGNALS). No market statistics are quoted; where a number appears it is either a live index
 * token or explicitly an example.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  heroImage: string; heroAlt: string;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const HUB: [string, string] = ["/resources/how-to-find-clients", "the full guide to finding clients"];

const posts: P[] = [
/* ───────────────────────────── 1 · commercial cleaning */
{
  slug: "how-to-get-customers-for-cleaning-business",
  title: "How to Get Customers for Your Commercial Cleaning Business",
  excerpt: "Offices, clinics, gyms and warehouses buy cleaning on contract. How to find the ones about to sign, what to say to them, and how to price so the contract survives renewal.",
  meta: "How to get customers for a cleaning business: which offices and commercial sites buy on contract, the signals that show who is ready, and what to say.",
  category: "Client Acquisition", cluster: "growth", hero: "nearby", mins: 8,
  heroImage: "/resources/thumbs/territory-planning-splitting-a-city-between-reps.webp",
  heroAlt: "Flat illustration of a city map split into service territories with business pins",
  tags: ["Client Acquisition", "Commercial Cleaning", "B2B Leads"],
  body: [
    { type: "prose", text: [
      "The fastest way to get customers for a cleaning business is to stop marketing to homeowners and start working a list of commercial sites — offices, clinics, gyms, showrooms and warehouses — that buy cleaning on a monthly contract. **One office contract is worth more over a year than dozens of one-off home cleans, and it renews without you selling it again.**",
      "The hard part is not the cleaning. It is knowing which of the thousands of businesses in your area is about to need a cleaner, and reaching the person who signs. This guide covers who actually buys commercial cleaning, the signals that show a site is ready, where to find those sites, what to say, and how to price a contract so it lasts.",
    ]},

    { type: "h2", id: "who-buys", text: "Who buys commercial cleaning, and who signs" },
    { type: "prose", text: [
      "Commercial cleaning customers fall into a handful of groups, and each one buys differently. Treating them as one market is the most common reason cleaning leads go nowhere — a pitch built for an office manager makes no sense to a restaurant owner.",
      "Small and mid-sized offices are the core of most commercial cleaning books. Below about ten people, the owner usually cleans or hires one part-time person. Above that, someone in admin is told to sort it out, and that person becomes your buyer. Large corporates mostly buy through facility management companies, which is a different sale entirely and worth approaching as a subcontractor rather than head-on.",
    ]},
    { type: "table", head: ["Buyer type", "Who signs", "What they care about", "Typical contract shape"], rows: [
      ["Offices, 10–200 staff", "Office or admin manager", "Reliability, no complaints from staff", "Daily or alternate-day, monthly invoice"],
      ["Coworking spaces", "Community or operations manager", "Member experience, washrooms, speed", "Daily, often with on-site staff"],
      ["Clinics, labs, dental practices", "Practice manager or doctor-owner", "Hygiene standards, disinfection records", "Daily plus periodic deep clean"],
      ["Gyms and studios", "Owner or branch manager", "Changing rooms, smell, equipment", "Daily, early-morning or late-night slots"],
      ["Restaurants and cloud kitchens", "Owner or operations head", "Kitchen deep cleans, exhaust, inspections", "Weekly or monthly deep clean"],
      ["Warehouses and light industrial", "Site or plant manager", "Floor area, safety, downtime", "Periodic, priced by area"],
      ["Residential societies (RWAs)", "Managing committee", "Common areas, price, visibility", "Annual contract with staff deployed"],
    ], note: "Which group to start with depends on your crew size: offices and clinics suit small teams; warehouses and societies need staff you can deploy daily." },
    { type: "prose", text: [
      "Two things follow from that table. First, your outreach target is a role, not a company — the admin manager at a 40-person office, the practice manager at a clinic. Second, every group has a moment when the decision gets made, and finding that moment is most of the work.",
    ]},

    { type: "h2", id: "signals", text: "The signals that show a site is ready for cleaning" },
    { type: "prose", text: [
      "A business does not switch cleaners at random. It happens when something changes — a move, a new branch, a staff complaint, a failed inspection, a cleaner who quit. You cannot see a complaint from outside, but you can see most of the changes that cause one.",
      "These are the signals Mantis reads off a business's Google listing and its own website, and why each one matters for a cleaning company:",
    ]},
    { type: "checklist", items: [
      { title: "Hiring now", detail: "The business has open roles on its careers page or a job board. Headcount growth means more people in the office and more mess. If the role is a housekeeping or facilities position, the business is deciding right now whether to hire or outsource — that is your opening." },
      { title: "Just opened or coming soon", detail: "A site that says coming soon, or a Google listing with only a handful of recent reviews, is a new office, clinic or gym. New sites need a post-fit-out clean and then a routine contract, and nobody has the job yet." },
      { title: "Several branches", detail: "Two or more listings under the same name. A multi-site business that is already expanding will add more sites, and one contract that covers all of them is easier for them than three vendors." },
      { title: "Established", detail: "100 or more Google reviews means steady footfall — a gym, clinic or showroom with that many customers has visible cleaning needs and the revenue to pay for it." },
      { title: "Raised funding recently", detail: "Funded startups move offices, add floors and hire quickly. Mantis can flag a funding round reported in the news when you ask for it." },
    ]},
    { type: "prose", text: [
      "Rating is worth a look too, but read it yourself rather than treating it as a signal. A low rating does not mean a place is dirty. If you open the reviews and see complaints about washrooms or smell, though, you have the most specific opening line you will ever get.",
    ]},

    { type: "cta", variant: "map", title: "Find offices and clinics that are hiring or just opened.",
      detail: "Tell Mantis the area and the type of site you clean. It searches live and flags who is hiring, who just opened, and who has several branches.",
      action: "Find cleaning leads", href: "/login" },

    { type: "h2", id: "where", text: "Where to find cleaning leads, honestly compared" },
    { type: "prose", text: [
      "There is no single best source of cleaning leads. Each one trades cost against how ready the buyer is, and the right mix depends on whether you need work this month or a pipeline for the year.",
    ]},
    { type: "table", head: ["Source", "What you get", "Strengths", "Weaknesses"], rows: [
      ["Bought or shared leads (directories, lead marketplaces)", "Inbound requests sent to several cleaners", "The buyer is actively looking", "You compete on price with every other cleaner who received it"],
      ["Google Maps by category and area", "Every office, clinic and gym near you", "Complete local coverage, free to browse", "No indication of who is ready; slow to work by hand"],
      ["Signal-based search (Mantis)", "Businesses filtered by hiring, new opening, branches", "Ranks the list by readiness", "Still needs your outreach; signals are evidence, not certainty"],
      ["Property and building managers", "Introductions to tenants in their buildings", "One relationship opens many sites", "Slow to build; they often have a preferred vendor"],
      ["Fit-out and interior contractors", "Referrals at the end of an office build", "Perfect timing — the site is brand new", "Low volume; you need to return the favour"],
      ["Facility management companies", "Subcontracted work at large sites", "Large, steady volume", "Thin margins and their terms, not yours"],
      ["Walking a business park", "Face-to-face with reception or admin", "Fast, cheap, memorable", "Covers only a few dozen sites a day"],
    ]},
    { type: "prose", text: [
      "The combination that works for most small commercial cleaners is a weekly list from a signal-based search, worked by phone and walk-in, plus two or three referral relationships with fit-out contractors and building managers. Bought leads are fine as a top-up but should not be the base of the business, because the buyer who sent the same request to five cleaners will pick the cheapest.",
    ]},

    { type: "h2", id: "outreach", text: "What to say: a call script and an email" },
    { type: "prose", text: [
      "The opening has one job: show that you know something specific about their site. \"We offer cleaning services\" is the message every admin manager deletes. \"I saw you are hiring for your new floor\" is the one they answer.",
      "**A walk-in or phone opening:** \"Hi, I'm calling from [company], we clean offices in [area] — a few in your building, actually. I noticed you have opened a second office on [road]. Who looks after cleaning for the new site? I'd like to drop off a quote for a trial week.\"",
      "**A short email to an admin or office manager:**",
      "Subject: Cleaning for your new office on [road]",
      "\"Hi [name] — I saw [company] has just opened on [road] and is hiring. We clean [three] offices nearby on daily contracts, with a fixed team so your staff see the same faces every day. If it is useful, we can do the first deep clean after your move at no charge and you can decide on a contract after that. Would Thursday work for a ten-minute walk-through?\"",
      "Notice what the email does not include: a list of services, a company history, or a price. The walk-through is the sale. Once you have walked a site you can quote accurately, and an accurate quote beats a cheap one.",
    ]},
    { type: "tip", title: "Follow up with a checklist, not a brochure",
      text: "After a walk-through, send the scope as a room-by-room checklist with frequencies. It shows exactly what they get, it makes comparison with a cheaper quote easy for them to do in your favour, and it becomes the service-level document once they sign." },

    { type: "h2", id: "pricing", text: "How to price a commercial cleaning contract" },
    { type: "prose", text: [
      "Price is where most cleaning businesses lose commercial customers — not by being too expensive at the start, but by pricing in a way that cannot survive the first renewal.",
      "**Price the scope, not the hour.** Offices understand a monthly fee for a defined scope: these rooms, this often, these consumables. Hourly billing invites them to count your hours and question them.",
      "**Separate labour from consumables.** Washroom supplies, liners and chemicals move in price. Listing them separately, or as a capped monthly allowance, stops a rising cost from eating your margin on a fixed contract.",
      "**Use a trial or a first deep clean as the entry, not a discount.** A discounted first month resets the buyer's idea of what you cost. A free first deep clean is a one-time cost to you that proves the work without touching the monthly number.",
      "**Build in a review clause.** A contract that reviews price annually, tied to wage changes, avoids the conversation where you have to ask for more money with no reason on paper.",
      "In India, many society and office contracts are priced by the number of housekeeping staff deployed per shift plus consumables, rather than by area. If you price that way, state the shift hours and the replacement policy for absent staff — that is what the committee will hold you to.",
    ]},

    { type: "h2", id: "steps", text: "A weekly routine for winning cleaning customers" },
    { type: "steps", items: [
      { icon: "map", title: "Pick one area and two site types", detail: "A business park and its surrounding roads, offices and clinics. Tight geography keeps travel time low once you win contracts." },
      { icon: "signal", title: "Pull a signal-ranked list", detail: "Search the area in Mantis for those site types and sort by hiring, just opened and several branches. Aim for 40–60 businesses a week." },
      { icon: "phone", title: "Call or walk in to find the buyer", detail: "Ask reception who handles cleaning. Get a name and a direct number or email before pitching anything." },
      { icon: "calendar", title: "Book walk-throughs, not meetings", detail: "A ten-minute walk of the site is easier to agree to than a sales meeting and gives you an accurate scope." },
      { icon: "send", title: "Send the checklist quote within a day", detail: "Room by room, with frequencies and consumables listed separately. Speed here wins against slower competitors." },
      { icon: "clock", title: "Follow up on day three and day ten", detail: "Most commercial buyers need a nudge. Ask a specific question: does the scope match what you need?" },
    ]},

    { type: "h2", id: "checklist", text: "Before you contact a commercial cleaning lead" },
    { type: "checklist", items: [
      { title: "You know the site type and rough size", detail: "An office with 15 staff and a clinic with four chairs need different pitches." },
      { title: "You have one specific reason to call", detail: "A new branch, a job ad, a recent opening, or a review about cleanliness." },
      { title: "You know who signs", detail: "Admin manager, practice manager, owner or committee — not just a reception number." },
      { title: "You can offer a walk-through this week", detail: "A slow first response is the easiest way to lose a ready buyer." },
      { title: "Your quote format is ready", detail: "A checklist template you can fill in after the walk-through, with consumables separate." },
    ]},

    { type: "cta", variant: "table", title: "Build this week's list of commercial cleaning leads.",
      detail: "Mantis searches your area for offices, clinics, gyms and warehouses, checks their listings and sites, and shows the phone number and signals for each.",
      action: "Start your search", href: "/login" },
  ],
  faqs: [
    { q: "How do I get commercial cleaning customers without buying leads?", a: "Build your own list of offices, clinics and gyms in a tight area, rank it by signals such as hiring, a recent opening or several branches, and work it by phone and walk-in. Add referral relationships with fit-out contractors and building managers, who know when a site is about to need a cleaner." },
    { q: "Who decides on cleaning at an office?", a: "Usually an office or admin manager at offices of roughly ten to two hundred people, a practice manager at clinics, the owner at gyms and restaurants, and the managing committee at residential societies. Large corporates mostly buy through facility management companies." },
    { q: "Are bought cleaning leads worth it?", a: "As a top-up, sometimes. The buyer is actively looking, but the same request usually goes to several cleaners, so you compete on price. They work poorly as the base of a commercial cleaning business, where long contracts matter more than single jobs." },
    { q: "How should I price an office cleaning contract?", a: "Charge a monthly fee for a defined scope — rooms, frequencies and consumables — rather than by the hour. List consumables separately or as a capped allowance, and include an annual price review tied to wage changes so renewal does not become a negotiation from scratch." },
    { q: "What is the best first offer for a new commercial client?", a: "A free first deep clean or a trial week, rather than a discounted month. It proves the work without lowering the monthly price the client expects to pay after the trial." },
  ],
  links: [
    HUB,
    ["/resources/territory-planning-splitting-a-city-between-reps", "splitting an area into territories"],
    ["/resources/qualifying-a-local-lead-before-you-call", "qualifying a lead before you call"],
    ["/resources/call-whatsapp-or-walk-in-indian-smbs", "call, WhatsApp or walk in"],
    ["/resources/pest-control-leads-commercial-accounts", "the same playbook for pest control"],
    ["/leads/website-development/in/gurgaon", "businesses listed in Gurgaon"],
  ],
},

/* ───────────────────────────── 2 · graphic design / branding */
{
  slug: "how-to-get-graphic-design-clients",
  title: "How to Get Graphic Design Clients Who Pay for Branding",
  excerpt: "Freelance marketplaces sell your time at the lowest bid. Local businesses that are new, social-only or visibly dated buy branding at a real price — here is how to find them.",
  meta: "How to get graphic design clients who pay for branding: find new, social-only and dated businesses, what to send them, and how to package design work.",
  category: "Client Acquisition", cluster: "growth", hero: "leads", mins: 7,
  heroImage: "/resources/thumbs/good-better-best-packaging-website-offers.webp",
  heroAlt: "Flat illustration of three brand and website packages laid out side by side",
  tags: ["Client Acquisition", "Graphic Design", "Branding"],
  body: [
    { type: "prose", text: [
      "The way to get graphic design clients who pay for branding is to find businesses at the moment their identity stops working — a new opening, a second branch, a Facebook page standing in for a website, or a look that is a decade old — and show them what changes. **Branding is bought by businesses in transition, not by businesses that are fine.**",
      "Most designers do the opposite. They post on marketplaces, wait for briefs, and compete with hundreds of others on price for a logo. This guide is about the other route: picking out local and small businesses that visibly need design work, approaching them with something specific, and packaging the work so the first job leads to the next.",
    ]},

    { type: "h2", id: "who-buys", text: "Which graphic design clients actually pay" },
    { type: "prose", text: [
      "Not every business that needs design will pay for it. The ones that do share a reason: something about their business is changing, and their current look is now visibly in the way.",
    ]},
    { type: "table", head: ["Client type", "Why they buy now", "What they buy first", "What they buy next"], rows: [
      ["New businesses about to open", "Need signage, menus, cards and a logo before day one", "Logo and identity kit", "Social templates, packaging, website"],
      ["Businesses opening a second branch", "One-off look does not scale to signage and uniforms", "Identity refresh and brand guide", "Signage set, print collateral"],
      ["Social-only businesses", "Instagram or WhatsApp is their only presence; it looks improvised", "Consistent social templates and logo cleanup", "Website and print"],
      ["Visibly dated businesses", "Old logo and site lose to newer competitors", "Rebrand", "Website redesign, launch campaign"],
      ["D2C and product brands", "Packaging and listings decide sales", "Packaging and product imagery", "Ongoing campaign design"],
      ["Restaurants, cafes, salons, clinics", "Menus, price lists, signage and reviews culture", "Menu or service card design", "Seasonal campaigns and social"],
    ]},
    { type: "prose", text: [
      "The pattern to notice: the first purchase is small and concrete, and the second is where the money is. A designer who wins the menu and does it well is the obvious choice for the signage, the social templates and eventually the website.",
    ]},

    { type: "h2", id: "signals", text: "Signals that a business needs a designer" },
    { type: "prose", text: [
      "You can see most of these from outside the business without a single conversation. Mantis checks each business's Google listing and its website and flags them:",
    ]},
    { type: "checklist", items: [
      { title: "Just opened or coming soon", detail: "A site that says coming soon or opening soon, a Google listing with five or fewer reviews and a recent first one, or a restaurant marked newly opened on a delivery app. These businesses need almost every piece of design at once." },
      { title: "No website, or a social page as the website", detail: "The listing has no website, or its website link points to Instagram, Facebook or WhatsApp. Usually the brand has never been formalised — the logo is whatever was made for the first post." },
      { title: "Weak or missing social presence", detail: "No Instagram linked from the site, or an Instagram with under 1,000 followers or under 30 posts. A business that has tried and stalled often stalled on content, which is design work." },
      { title: "Old website", detail: "A copyright year three or more years old, no mobile layout, or no HTTPS. The site is a proxy for the rest of the identity: if one has not been touched, the other usually has not either." },
      { title: "Several branches", detail: "Two or more listings under the same name. Expansion is the classic trigger for a brand guide." },
    ]},
    { type: "prose", text: [
      "Combine two signals and the case gets much stronger. A business with 200 reviews and a social page as its website is established, has customers and money, and has never paid for its identity. That is a better prospect than a brand-new business with no revenue yet.",
    ]},

    { type: "cta", variant: "leadcard", title: "Find businesses that just opened or have no real brand presence.",
      detail: "Search any city and category in Mantis. Each result shows its listing, its website status and whether it is new, social-only or dated.",
      action: "Find design clients", href: "/login" },

    { type: "h2", id: "where", text: "Where graphic design clients come from" },
    { type: "table", head: ["Channel", "Good for", "The catch"], rows: [
      ["Freelance marketplaces", "First portfolio pieces, overseas clients", "Price competition with a global pool; the platform owns the relationship"],
      ["Design communities and portfolio sites", "Visibility with other designers and agencies", "Few direct buyers; more useful for subcontract work"],
      ["Agencies needing overflow", "Steady volume without selling", "Lower rates; your work carries their name"],
      ["Local businesses found by signal", "Direct clients at a fair price, repeat work", "You have to do the outreach yourself"],
      ["Referrals from printers, sign makers, web developers", "Warm introductions at the moment of need", "Takes time to build; you should refer back"],
      ["Your own social content", "Long-term inbound", "Slow; works best once you have a niche"],
    ]},
    { type: "prose", text: [
      "Printers and sign makers deserve a special mention. Their customers arrive every day with a blurry logo on a phone and ask for a banner. Many printers would rather hand that customer to a designer they trust than redraw it themselves, and an arrangement where you clean up the file and they print it works well for both sides.",
    ]},

    { type: "h2", id: "outreach", text: "What to send a business that needs design" },
    { type: "prose", text: [
      "With design, the outreach can carry part of the work. A short message with one concrete improvement — not a full free mockup — shows your eye without giving the job away.",
      "**A WhatsApp or email message to a new cafe:**",
      "\"Hi [name], congratulations on opening on [road]. I design menus and identities for cafes in [city] — [cafe A] and [cafe B] are mine. I noticed your menu is shared as a phone photo on Instagram; I sketched how the first section could look as a proper printed and digital menu (attached, one page). If you want the full menu and matching table cards before the weekend rush, I can turn it around in five days.\"",
      "**A message to an established business with a social-only presence:**",
      "\"Hi [name] — [business] has more Google reviews than anyone else on [road], but your Instagram is the only place customers can see you, and the logo is different in every post. I help businesses like yours set up one consistent look: logo cleanup, colours, and ten post templates your staff can reuse. Happy to show you two examples from [similar business].\"",
      "Both messages name the business, point at something visible, name a comparable client, and propose a small concrete first job.",
    ]},
    { type: "tip", title: "Show one fix, not a full concept",
      text: "A single redesigned section is enough to prove taste. A full free logo concept trains the client to expect spec work and gives them something to take to a cheaper designer." },

    { type: "h2", id: "pricing", text: "Packaging and pricing design work" },
    { type: "prose", text: [
      "**Sell outcomes in packages, not hours.** A new cafe does not want ten hours of design; it wants to open with a menu, signage and an Instagram that looks like one business. Package that as an opening kit.",
      "**Use three tiers.** A starter (logo cleanup and core files), a standard identity (logo, colours, type, cards, social templates) and a full brand (all of that plus a guide, signage and packaging). Most clients choose the middle, which is the point of having three.",
      "**Count the revision rounds.** Two rounds per deliverable, written into the quote, protects you from the endless-tweaks client without seeming rigid.",
      "**Turn the identity into a retainer.** Once a business has a brand, it needs a steady flow of posts, offers, seasonal menus and banners. A monthly design retainer with a fixed number of pieces is the most reliable income a designer can have, and it comes naturally after an identity project.",
    ]},

    { type: "h2", id: "steps", text: "A repeatable process for finding graphic design clients" },
    { type: "steps", items: [
      { icon: "search", title: "Choose one category and one city", detail: "Cafes in one city, clinics in another. A niche gives you comparable portfolio pieces to show." },
      { icon: "signal", title: "Filter by transition signals", detail: "Just opened, social page as website, several branches, old website. Start with businesses that have reviews and no real brand." },
      { icon: "score", title: "Look at each one for two minutes", detail: "Open their Instagram and listing photos. Note one specific, visible problem you could fix." },
      { icon: "send", title: "Send the one-fix message", detail: "Name the business, the problem, a similar client and a small first job with a deadline." },
      { icon: "verified", title: "Deliver the first job fast", detail: "Speed on a small job is what earns the identity project." },
      { icon: "calendar", title: "Offer the retainer at handover", detail: "When you hand over the files, propose the monthly plan for posts and campaigns." },
    ]},

    { type: "h2", id: "checklist", text: "Your graphic design client checklist" },
    { type: "checklist", items: [
      { title: "A niche portfolio of three to five pieces", detail: "Clients want to see work for businesses like theirs." },
      { title: "Three written packages with prices", detail: "Starter, standard and full, with deliverables and revision rounds listed." },
      { title: "A list of 30 businesses with a visible need", detail: "Each with one note on what you would fix." },
      { title: "A referral arrangement with one printer or sign maker", detail: "The cheapest steady source of warm leads in design." },
      { title: "A retainer offer ready at handover", detail: "The identity project is the start, not the whole relationship." },
    ]},

    { type: "leads", city: "jaipur", heading: "Businesses with no website, live from the index" },

    { type: "cta", variant: "table", title: "Your next ten graphic design clients are already listed.",
      detail: "Mantis finds businesses in your city that just opened, run on a social page, or have a dated site — with the phone number and the reason to call.",
      action: "Start searching", href: "/login" },
  ],
  faqs: [
    { q: "How do I get graphic design clients with no experience?", a: "Pick one business type, do three or four pieces for real local businesses — a menu, a price list, social templates — even at a low rate, and use those as a niche portfolio. Then approach similar businesses that visibly need the same work." },
    { q: "Where do graphic designers find clients besides marketplaces?", a: "Local businesses in transition — new openings, second branches, social-only businesses and dated brands — found by search and approached directly. Referrals from printers, sign makers and web developers are the other strong source." },
    { q: "Should I offer free mockups to win clients?", a: "Offer one small fix, not a full concept. A redesigned menu section or post shows your taste; a full free logo concept trains the client to expect spec work and can be taken to a cheaper designer." },
    { q: "How should graphic designers price branding work?", a: "In three packages — starter, standard identity and full brand — with deliverables and revision rounds written in. Follow the identity project with a monthly retainer for ongoing posts, offers and campaigns." },
    { q: "Which businesses need graphic design the most?", a: "Businesses that are changing: about to open, expanding to a second branch, running only on Instagram or WhatsApp, or carrying a visibly old logo and website. Established businesses with many reviews and no real brand presence are the strongest prospects." },
  ],
  links: [
    HUB,
    ["/resources/good-better-best-packaging-website-offers", "three-tier packaging"],
    ["/resources/why-facebook-only-businesses-are-your-best-prospects", "why social-only businesses buy"],
    ["/resources/the-free-mockup-play-does-it-still-close", "whether the free mockup closes"],
    ["/resources/ppc-leads-businesses-not-running-google-ads", "finding PPC and Google Ads clients"],
    ["/leads/website-development/in/jaipur", "businesses without a website in Jaipur"],
  ],
},

/* ───────────────────────────── 3 · business coaching / corporate training */
{
  slug: "how-to-get-coaching-clients",
  title: "How to Get Coaching Clients for Corporate Training",
  excerpt: "Business coaching and corporate training are bought when a company is growing faster than its managers. How to spot those companies, reach the right person and price a programme.",
  meta: "How to get coaching clients for business coaching and corporate training: spot growing companies, reach the owner or HR head, and price programmes.",
  category: "Client Acquisition", cluster: "growth", hero: "network", mins: 7,
  heroImage: "/resources/thumbs/how-to-sell-websites-to-coaching-centres.webp",
  heroAlt: "Flat illustration of a training institute building beside a course page and a profile card",
  tags: ["Client Acquisition", "Business Coaching", "Corporate Training"],
  body: [
    { type: "prose", text: [
      "The most reliable way to get coaching clients for business coaching and corporate training is to find companies that are growing faster than their people — hiring sales staff, promoting first-time managers, opening new branches — and offer a programme aimed at that specific strain. **Companies rarely buy training because it is a good idea. They buy it because something is breaking.**",
      "Content and personal brand matter, but they are slow. This guide covers the faster route: who buys business coaching and corporate training, how to see from outside that a company has the problem you solve, where to find those companies, what to say, and how to package a programme that turns into a repeat engagement.",
    ]},

    { type: "h2", id: "who-buys", text: "Who buys business coaching and training" },
    { type: "prose", text: [
      "Two quite different buyers sit under the word coaching. The owner of a small or mid-sized business buys coaching for themselves or their leadership team, usually because growth has stalled or become chaotic. The HR or learning head of a larger company buys training for groups of staff, usually because of a specific gap — sales performance, new managers, customer service.",
    ]},
    { type: "table", head: ["Buyer", "Company size", "Usual trigger", "What they buy"], rows: [
      ["Founder or owner", "10–100 staff", "Growth stalled, owner doing everything", "One-to-one business coaching, leadership team sessions"],
      ["Sales head", "Any size with a sales team", "New hires missing targets", "Sales training, call coaching"],
      ["HR or L&D head", "100+ staff", "First-time managers, attrition", "Management programmes, workshops"],
      ["Branch or operations head", "Multi-location retail, clinics, dealerships", "Inconsistent service across branches", "Standardised service and floor training"],
      ["Hotel and hospitality GMs", "Single hotels to small groups", "Guest reviews, new staff every season", "Service and front-office training"],
    ], note: "The first row buys coaching; the rest mostly buy training. Decide which you sell before writing a single message." },
    { type: "prose", text: [
      "Business coaching for owners is a trust sale: the owner is buying a person, often for months, and will want to talk to you before anything is agreed. Corporate training is closer to a procurement decision: the HR head needs a proposal, a price per cohort and something to show their own manager. Both are B2B, but the first is won in a conversation and the second is won in a document.",
      "Professional firms — CA practices, law firms, architecture studios — are a quieter but steady segment. Their partners are promoted for technical skill and often have never managed people, and they tend to pay for coaching that is framed as practice management rather than soft skills.",
    ]},

    { type: "h2", id: "signals", text: "Signals that a company needs coaching now" },
    { type: "prose", text: [
      "Mantis checks a company's website and listings for signs of the strain coaching addresses. None of these proves a company will buy, but each one gives you a specific, credible reason to get in touch:",
    ]},
    { type: "checklist", items: [
      { title: "Hiring now", detail: "Open roles on its careers page or job board. The roles tell you what to sell: several sales openings means sales training; team-lead or manager openings mean a management programme; customer-service roles mean service training." },
      { title: "Raised funding in the last 12 months", detail: "Fresh money is spent on hiring, and a team that doubles in a year has managers who have never managed. Mantis flags reported funding rounds when you ask." },
      { title: "Several branches", detail: "Two or more listings under the same name, or a locations page on the site. Consistency across branches is a training problem with a budget attached." },
      { title: "Established, with a low rating", detail: "100+ reviews but rated below 4.0 is a busy business whose customers are telling it something. Read the reviews: if the complaints are about staff behaviour or wait times, that is a training brief written for you." },
      { title: "Careers page present", detail: "A company with a proper careers page treats hiring as ongoing, which usually means there is someone who owns people development." },
    ]},

    { type: "cta", variant: "map", title: "Find companies hiring sales staff and new managers.",
      detail: "Describe the companies you coach in Mantis — size, industry, city — and it flags who is hiring, expanding or recently funded.",
      action: "Find coaching clients", href: "/login" },

    { type: "h2", id: "where", text: "Where coaching clients come from" },
    { type: "table", head: ["Channel", "Strength", "Weakness"], rows: [
      ["LinkedIn content", "Builds trust with owners and HR heads over time", "Slow; months before it produces enquiries"],
      ["Speaking at industry associations and chambers", "A room full of owners at once", "Infrequent; depends on getting invited"],
      ["Referrals from past clients", "Highest conversion of any source", "Limited by how many past clients you have"],
      ["Partnerships with CAs, HR consultants, recruiters", "They see growth problems first", "You need to send work back"],
      ["Signal-based outbound", "Reaches companies at the moment of need", "Requires disciplined, specific outreach"],
      ["Coaching directories and marketplaces", "Some inbound for individual coaching", "Mostly consumers, rarely corporate budgets"],
    ]},
    { type: "prose", text: [
      "Recruiters are the most underused partner here. A recruiter who has just placed five salespeople at a company knows that company now has a sales onboarding problem. An arrangement where the recruiter introduces you after a placement is useful to them, because better-trained hires stay longer and make the recruiter look good.",
    ]},

    { type: "h2", id: "outreach", text: "What to say to a business owner or HR head" },
    { type: "prose", text: [
      "A coaching pitch fails when it talks about coaching. It works when it talks about the company's visible situation and one outcome.",
      "**An email to a founder who is hiring a sales team:**",
      "Subject: Your four sales openings",
      "\"Hi [name] — I noticed [company] is hiring four sales executives at once. When teams grow that fast the first ninety days usually decide whether the new hires hit target or leave. I run a six-week onboarding programme for sales teams in [industry] — most recently for [similar company], where new hires were taking calls on their own by week three. Would a twenty-minute conversation about your onboarding plan be useful?\"",
      "**A call opening to an HR head at a multi-branch business:**",
      "\"Hi, I work with multi-branch [clinics/retailers] on making service consistent between branches. I saw you now have [five] locations in [city]. When a group reaches that size, how are you training front-desk staff at the new branches?\"",
      "The question at the end matters. It invites them to describe the problem in their words, which is what you need to scope a programme.",
      "**Three mistakes that sink coaching outreach.** The first is leading with credentials — certifications and years of experience matter after the buyer is interested, not before. The second is describing a method rather than a result; nobody buys a framework, they buy new hires who close. The third is writing to the wrong person: an HR executive can forward your message but rarely owns the budget, while the sales head who is missing target feels the problem every week.",
      "**Follow up with something useful.** If the first message gets no reply, the second should not say \"just checking in\". Send a short note on how other companies of their size structure the first month for new hires, or a one-page onboarding checklist. It keeps you relevant without pressure, and it is often the message that gets the reply.",
    ]},
    { type: "tip", title: "Offer a diagnostic, not a free session",
      text: "A free coaching session gives away the product. A short paid or free diagnostic — a call with three managers and a one-page summary of what you heard — gives the buyer something useful and gives you the evidence to propose the right programme." },

    { type: "h2", id: "pricing", text: "Packaging coaching and training so it renews" },
    { type: "prose", text: [
      "**Sell programmes, not sessions.** A per-session price makes every session a decision for the client. A twelve-week programme with a defined outcome is one decision, and it is easier for an owner or HR head to justify.",
      "**Define the before and after.** Write down what will be measurably different at the end: new hires taking calls alone, managers running weekly one-to-ones, a service checklist in every branch. A measurable outcome is what earns the second programme.",
      "**Build in a follow-on.** End each programme with a lighter monthly retainer — a group call, review of results, coaching for the next cohort. Companies that are hiring keep hiring, and every new cohort needs the same onboarding.",
      "**Price the group, not the head.** For corporate training, a fixed price per cohort up to a set number of people is simpler to approve than a per-person fee that changes with attendance.",
    ]},

    { type: "h2", id: "steps", text: "Steps to your next ten coaching clients" },
    { type: "steps", items: [
      { icon: "search", title: "Choose one buyer and one problem", detail: "For example, founders of 20–80 person companies with new sales teams. A narrow focus makes every message specific." },
      { icon: "signal", title: "Build a list of companies showing that problem", detail: "Search in Mantis for companies in your industry and city that are hiring for the relevant roles, expanding or recently funded." },
      { icon: "enrich", title: "Find the decision-maker", detail: "Owner for small companies, sales or HR head for larger ones. Note their name and the specific signal you saw." },
      { icon: "send", title: "Send a short, specific message", detail: "One observation, one outcome you deliver, one similar client, one question." },
      { icon: "phone", title: "Run a diagnostic", detail: "Talk to two or three of their people and send back a one-page summary with a recommended programme." },
      { icon: "calendar", title: "Propose a programme with a follow-on", detail: "Fixed scope, fixed price, measurable outcome, and a monthly retainer for the next cohort." },
    ]},

    { type: "h2", id: "checklist", text: "Coaching client acquisition checklist" },
    { type: "checklist", items: [
      { title: "One buyer and one problem written down", detail: "If you cannot say it in a sentence, your outreach will not either." },
      { title: "Two case studies with outcomes", detail: "Even small ones, as long as the result is specific." },
      { title: "A list of companies showing the trigger", detail: "Hiring, expanding or recently funded, in your industry." },
      { title: "A diagnostic offer ready", detail: "A clear next step that is smaller than a programme." },
      { title: "One referral partner", detail: "A recruiter, CA or HR consultant who sees growing companies before you do." },
    ]},

    { type: "cta", variant: "table", title: "See which companies near you are growing right now.",
      detail: "Mantis searches by industry and city and shows hiring, branches and funding signals for each company, with contact details.",
      action: "Build your list", href: "/login" },
  ],
  faqs: [
    { q: "How do business coaches get clients?", a: "Mostly through referrals and content, which are slow, plus direct outreach to companies showing a clear trigger — hiring several salespeople, promoting new managers, opening branches or raising funding. Outreach that names the trigger and one outcome converts far better than a general coaching pitch." },
    { q: "Who buys corporate training in a company?", a: "The owner in companies under about a hundred people, and the HR or learning head above that. Sales heads often buy sales training directly, and branch or operations heads buy service training for multi-location businesses." },
    { q: "What signals show a company needs coaching?", a: "Hiring for several roles at once, a recent funding round, expansion to new branches, and a busy business with a low rating whose reviews complain about staff. Each points to a specific programme: onboarding, management, consistency or service." },
    { q: "Should coaches offer a free session?", a: "A diagnostic works better than a free session. A short conversation with a few managers and a one-page summary gives the buyer something useful and gives you what you need to propose the right programme, without giving the coaching itself away." },
    { q: "How should I price corporate training?", a: "As a fixed-price programme per cohort with a defined outcome, followed by a lighter monthly retainer. Per-session or per-head pricing makes every session or attendee a fresh decision for the client." },
  ],
  links: [
    HUB,
    ["/resources/how-to-sell-websites-to-coaching-centres", "selling to coaching centres"],
    ["/resources/the-first-call-10-questions-that-qualify-a-lead", "ten questions for the first call"],
    ["/resources/hourly-project-or-value-pricing-model", "hourly, project or value pricing"],
    ["/resources/recruitment-leads-find-companies-hiring", "finding companies that are hiring"],
    ["/leads/website-development/in/pune", "businesses listed in Pune"],
  ],
},
/* ───────────────────────────── 4 · travel agency (corporate travel) */
{
  slug: "how-to-get-clients-for-travel-agency",
  title: "How to Get Clients for a Travel Agency: Corporate Travel",
  excerpt: "Leisure travellers book online. Companies with people on the road every month still want an agency — here is how to find them, what to offer, and how to keep the account.",
  meta: "How to get clients for a travel agency through corporate travel: which companies travel, the signals that show it, where to find them and how to pitch.",
  category: "Client Acquisition", cluster: "growth", hero: "network", mins: 7,
  heroImage: "/resources/thumbs/how-to-sell-websites-to-guest-houses.webp",
  heroAlt: "Flat illustration of a hotel building beside a booking page and a checklist card",
  tags: ["Client Acquisition", "Travel Agency", "Corporate Travel"],
  body: [
    { type: "prose", text: [
      "The most dependable way to get clients for a travel agency today is corporate travel: companies whose people travel for work every month, who would rather hand bookings, changes and invoices to one agency than manage them across a dozen employees. **A leisure customer books one trip and compares prices online. A corporate client books every week and values the person who fixes a cancelled flight at midnight.**",
      "Online booking has taken most simple leisure trips away from agencies, but it has not solved the problems a business has when people travel — policy, approvals, consolidated invoices, tax documentation, last-minute changes and group movements. This guide covers which companies buy corporate travel services, the signals that show a company travels, where to find them, how to approach them, and how to structure the account.",
    ]},

    { type: "h2", id: "who-buys", text: "Which companies need a travel agency" },
    { type: "prose", text: [
      "Any company where travel is part of how the work gets done is a candidate. The best clients are not the largest companies — those usually run a formal tender or a travel management platform — but the mid-sized ones that travel often and have nobody whose job it is to manage it.",
    ]},
    { type: "table", head: ["Company type", "Why they travel", "What they need most"], rows: [
      ["Manufacturers and exporters", "Buyer visits, trade fairs, plant visits", "International tickets, visas, fair-week hotels"],
      ["Multi-branch businesses", "Managers visiting branches, audits, training", "Frequent domestic trips, hotel rates in branch cities"],
      ["Consulting, CA and law firms", "Client sites, audits, hearings", "Fast changes, invoices per client for rebilling"],
      ["IT services and software companies", "Client onsite visits, offsites", "Group bookings, visas, flexible fares"],
      ["Pharma, FMCG and distribution", "Field force and regional meetings", "Volume domestic travel, regional conferences"],
      ["Schools, colleges and coaching institutes", "Educational trips, sports events", "Group movements with safety and consent paperwork"],
      ["Event and MICE buyers", "Dealer meets, incentive trips, offsites", "Venue, travel and stay as one package"],
    ]},
    { type: "prose", text: [
      "Moving from leisure to corporate changes how the agency runs, and it is worth knowing before you pitch. Leisure work is seasonal and comes in bursts around holidays; corporate work is steady through the year but expects answers within the hour on a working day. Leisure customers judge you on the trip; corporate clients judge you on the paperwork — correct invoices, the right GST details, and trips tagged to the right cost centre. Agencies that win corporate accounts usually assign one named person to each client so the company never has to explain itself twice.",
      "The person who signs varies with size. In a company of thirty people, the founder or the founder's assistant books everything and is often relieved to hand it over. In a company of two hundred, it is an admin, HR or finance person who is tired of reconciling card statements. Either way, your pitch is time and control, not cheaper fares.",
    ]},

    { type: "h2", id: "signals", text: "Signals that a company travels" },
    { type: "prose", text: [
      "Travel itself is invisible from outside, but the things that cause it are not. These are the signals Mantis can detect that point to a company with regular travel:",
    ]},
    { type: "checklist", items: [
      { title: "Exporter", detail: "An IEC number, export text or worldwide shipping on its website. Exporters travel to buyers and trade fairs, and international trips are where an agency adds the most value — visas, routing, changes." },
      { title: "Several branches", detail: "Two or more Google listings under the same name, or a locations page. Branch managers, auditors and trainers travel between them all year." },
      { title: "Hiring now", detail: "Open roles, especially field sales, regional managers or roles with travel in the description. A growing team travels more, and new joiners need onboarding trips." },
      { title: "Raised funding recently", detail: "Funded companies hold offsites, attend conferences and open offices in new cities. Mantis flags reported rounds when you ask for them." },
      { title: "Established", detail: "100+ reviews or a sizable presence suggests a business big enough to have regular travel and the budget to outsource it." },
    ]},

    { type: "cta", variant: "map", title: "Find exporters and multi-branch companies near you.",
      detail: "Ask Mantis for manufacturers, exporters or multi-location businesses in your city. It flags each one's signals and gives you the number to call.",
      action: "Find travel clients", href: "/login" },

    { type: "h2", id: "where", text: "Where to find corporate travel clients" },
    { type: "table", head: ["Source", "Why it works", "Watch out for"], rows: [
      ["Industrial areas and export clusters", "Dense concentration of companies that travel internationally", "Owners are busy; reach them through accounts or admin"],
      ["Industry associations and chambers", "Members travel together to fairs and delegations", "Often have an existing agency; offer to handle one delegation first"],
      ["Trade fair calendars", "You know exactly when and where exhibitors must travel", "Fair-week hotels sell out; book allocations early"],
      ["Signal-based search", "Finds exporters, branch networks and hiring companies directly", "Needs a specific pitch per segment"],
      ["Referrals from CAs and freight forwarders", "They work with the same exporters", "Offer referrals back"],
      ["Existing leisure customers", "Many run or work at businesses", "Ask directly; most never think of their agent for work travel"],
    ]},
    { type: "prose", text: [
      "Your existing leisure customers are the cheapest source of all. A family who has booked holidays with you for years may own a manufacturing unit or run a clinic chain, and it has rarely occurred to them that the agent who plans their holidays could also handle the company's trips. Ask.",
    ]},

    { type: "h2", id: "outreach", text: "How to pitch corporate travel to a company" },
    { type: "prose", text: [
      "Start with the problem they already feel, and make the first step small.",
      "**A call to an exporter:**",
      "\"Hi, I'm with [agency]. We handle business travel for a few exporters in [industrial area]. I noticed you export to [region] — is anyone going to [upcoming trade fair] this year? Fair-week hotels near the venue fill up early and we hold some rooms. Who usually arranges travel for your team?\"",
      "**An email to a multi-branch business:**",
      "Subject: Travel between your branches",
      "\"Hi [name] — [company] now has [six] locations across [cities], which usually means managers on the road every week and a stack of tickets and hotel bills to reconcile at month end. We run travel for multi-branch businesses: one contact for all bookings and changes, agreed hotel rates in your branch cities, and a single monthly invoice with every trip tagged to a branch. Could we handle your next month of trips as a trial?\"",
      "The trial matters. Corporate buyers are reluctant to change something that half works. Handling one trade fair, one offsite or one month of trips lets them see the service without a commitment.",
    ]},
    { type: "tip", title: "Lead with the invoice, not the fare",
      text: "Finance teams care about a single, clean monthly statement with GST invoices and cost-centre tags far more than about saving a little on a ticket. Bring a sample statement to the first meeting." },

    { type: "h2", id: "pricing", text: "How travel agencies price a corporate account" },
    { type: "prose", text: [
      "**Transaction fees beat hidden mark-ups.** A clear service fee per booking or per change is easier for a finance team to accept than an unexplained difference between your fare and the airline website. Transparency is also what lets you keep the account when someone checks.",
      "**Offer a monthly management fee for larger accounts.** Companies with steady volume often prefer a fixed monthly fee covering a set number of bookings and changes, with transaction fees above that.",
      "**Price events as packages.** Offsites, dealer meets and incentive trips should be quoted as one package — travel, stay, venue, transfers — with a per-head price. That is where margin lives in corporate travel.",
      "**Write the service level down.** Response times for changes, after-hours support and how invoices are delivered. In corporate travel the service promise is the product.",
    ]},

    { type: "h2", id: "steps", text: "Steps to land your first corporate travel clients" },
    { type: "steps", items: [
      { icon: "search", title: "Pick one segment", detail: "Exporters in one industrial cluster, or multi-branch businesses in your city. One segment means one pitch you can refine." },
      { icon: "signal", title: "Build a list from signals", detail: "Use Mantis to find businesses flagged as exporters, with several branches, or hiring for roles that travel." },
      { icon: "phone", title: "Find who books travel today", detail: "Call and ask who arranges travel. Often it is an assistant or accounts person, not the owner." },
      { icon: "calendar", title: "Offer one trip or one month as a trial", detail: "A trade fair, an offsite or a month of trips — small enough to say yes to." },
      { icon: "verified", title: "Deliver and send a clean statement", detail: "The first invoice is your best sales document." },
      { icon: "send", title: "Propose the account", detail: "Service fee structure, service level and agreed hotel rates in their regular cities." },
    ]},

    { type: "h2", id: "checklist", text: "Travel agency client checklist" },
    { type: "checklist", items: [
      { title: "A segment and its calendar", detail: "Trade fairs, financial year-end, conference season — when your segment travels." },
      { title: "A sample monthly statement", detail: "With invoices, cost centres and trip details, to show finance teams." },
      { title: "A clear fee schedule", detail: "Per booking, per change, and an event package format." },
      { title: "After-hours support you can actually provide", detail: "If you promise it, someone must answer at midnight." },
      { title: "Twenty companies with a travel signal", detail: "Exporters, multi-branch businesses or companies hiring travelling roles." },
    ]},

    { type: "cta", variant: "table", title: "Build a list of companies that travel for work.",
      detail: "Mantis finds exporters, multi-branch businesses and growing companies in your city, with phone numbers and the signal behind each one.",
      action: "Start your list", href: "/login" },
  ],
  faqs: [
    { q: "How can a travel agency get corporate clients?", a: "Pick a segment that travels regularly — exporters, multi-branch businesses, consulting firms — find companies in it showing signals such as export activity, several branches or hiring, and offer to handle one trip or one month as a trial before proposing an account." },
    { q: "Do companies still use travel agencies?", a: "Many mid-sized companies do, because their problem is not finding fares but managing changes, approvals, invoices and group movements across many employees. Large companies often use formal travel management platforms; smaller and mid-sized ones are the natural market for an agency." },
    { q: "Who books travel in a small company?", a: "Usually the founder or an assistant in companies of a few dozen people, and an admin, HR or finance person in larger ones. Calling and asking who arranges travel is the quickest way to find out." },
    { q: "How should a travel agency charge corporate clients?", a: "With a transparent service fee per booking and per change, a monthly management fee for steady accounts, and per-head packages for offsites and events. Hidden mark-ups tend to lose accounts when finance teams compare prices." },
    { q: "What is the best first offer for a corporate travel client?", a: "A trial: one trade fair, one offsite or one month of trips. It lets the company see the service and the monthly statement without committing, which is what most corporate buyers need before switching." },
  ],
  links: [
    HUB,
    ["/resources/how-to-sell-websites-to-guest-houses", "how guest houses and hotels buy"],
    ["/resources/how-to-sell-websites-to-wholesalers", "selling to wholesalers and exporters"],
    ["/resources/how-many-touches-before-a-local-business-buys", "how many touches before a business buys"],
    ["/resources/logistics-leads-how-to-get-clients", "the logistics version of this playbook"],
    ["/leads/website-development/in/surat", "businesses listed in Surat"],
  ],
},

/* ───────────────────────────── 5 · recruitment / staffing */
{
  slug: "recruitment-leads-find-companies-hiring",
  title: "Recruitment Leads: How to Find Companies That Are Hiring",
  excerpt: "The best recruitment and staffing leads are companies with open roles right now. How to find them, read what their job posts say, and approach the hiring manager before another agency does.",
  meta: "Recruitment leads and staffing leads: find companies that are hiring right now, read what their roles reveal, and reach the hiring manager first.",
  category: "Client Acquisition", cluster: "growth", hero: "network", mins: 7,
  heroImage: "/resources/thumbs/how-indian-agencies-win-uk-and-australian-clients.webp",
  heroAlt: "Flat illustration of an office connected to candidate profile cards and handshakes",
  tags: ["Client Acquisition", "Recruitment", "Staffing Leads"],
  body: [
    { type: "prose", text: [
      "Good recruitment leads are companies that are hiring right now, for roles you can fill, and that are struggling to fill them on their own. **Every other kind of lead — a company that might hire someday — is a nurturing project, not a sale.** For a recruitment or staffing agency, the whole job of lead generation is finding open roles early and reaching the person who owns them.",
      "This guide covers how to find companies that are hiring, how to read a job post as a sales brief, which companies are worth an agency's time, how to approach the hiring manager, and how to structure fees so a first placement becomes an account.",
    ]},

    { type: "h2", id: "who-buys", text: "Which companies buy from recruitment agencies" },
    { type: "prose", text: [
      "Not every hiring company uses agencies. Large companies with in-house talent teams use agencies for hard roles only. Very small companies often hire through their own network. The sweet spot is in between: growing companies with real hiring volume and no dedicated recruiter.",
    ]},
    { type: "table", head: ["Company", "What they hire", "Why they use an agency", "Agency type that fits"], rows: [
      ["Growing SMEs, 20–200 staff", "Sales, operations, accounts, first managers", "No in-house recruiter; founder screening CVs", "Permanent recruitment"],
      ["Funded startups", "Engineers, product, growth, leadership", "Speed; hiring plan tied to the funding round", "Permanent and executive search"],
      ["Multi-branch retail, clinics, restaurants", "Store, front-desk, kitchen and branch staff", "Volume and churn; new branches open with full teams", "Staffing and volume hiring"],
      ["Manufacturing and warehousing", "Operators, supervisors, seasonal labour", "Shift cover, peaks, compliance paperwork", "Contract staffing"],
      ["Hospitals and clinic groups", "Nurses, technicians, front office", "Constant shortage; credential checks", "Specialist healthcare recruitment"],
      ["Professional firms", "Qualified accountants, lawyers, analysts", "Small candidate pools, confidential searches", "Specialist permanent recruitment"],
    ]},
    { type: "prose", text: [
      "Decide which rows you serve. A staffing firm placing warehouse operators and a search firm placing finance heads both want companies that are hiring, but they want different companies, different roles and a different person on the other end of the phone.",
    ]},

    { type: "h2", id: "signals", text: "Hiring signals: how to read recruitment leads" },
    { type: "prose", text: [
      "Mantis reads a company's careers page and job board presence and flags it as hiring. That flag is the core signal, but what makes it useful is what the roles say:",
    ]},
    { type: "checklist", items: [
      { title: "Hiring now", detail: "Open roles on the company's careers page or on a job board. The roles say what the company will buy: five sales openings is a volume brief; one head of finance is a search brief." },
      { title: "Careers page present", detail: "A company with a proper careers page hires continuously. It is worth a relationship even when the current roles are not yours." },
      { title: "Raised funding in the last 12 months", detail: "Fresh rounds are spent on headcount. A company that raised recently will usually hire across several functions over the following year." },
      { title: "Next round due", detail: "A company 12–30 months past its last round is often building out leadership before raising again — senior search territory." },
      { title: "Several branches, just opened or coming soon", detail: "New locations open with full teams. A coming-soon page or a brand-new listing for a chain is a staffing brief weeks before the first job ad appears." },
    ]},
    { type: "prose", text: [
      "Read the role list as a picture of the company's next six months. A company hiring its first HR manager is about to formalise hiring and may want a recruitment partner. A company hiring several branch managers is opening locations and will need full teams under each of them. A company hiring only senior roles after a funding round is building the leadership layer and is a search client, not a volume one. The same hiring flag means a different sale in each case, and the agencies that read the roles before calling are the ones that sound like they understand the business.",
      "A job post that has been open for weeks is a better lead than a fresh one. A role reposted or still open after a month tells you the company's own channels have not worked, which is exactly the moment an agency is welcome. Check the posting date on the job board when you see one.",
    ]},

    { type: "cta", variant: "map", title: "Find companies hiring for the roles you fill.",
      detail: "Tell Mantis the roles, industries and cities you recruit for. It finds companies with open roles, new branches or recent funding and shows the contact details.",
      action: "Find recruitment leads", href: "/login" },

    { type: "h2", id: "where", text: "Where staffing leads come from" },
    { type: "table", head: ["Source", "Strength", "Weakness"], rows: [
      ["Job boards", "Shows open roles directly", "Every agency reads the same boards; you are rarely first"],
      ["Company careers pages", "Roles often appear here before job boards, and some never reach them", "Scattered across thousands of sites; impractical by hand"],
      ["Signal-based search (Mantis)", "Reads careers pages at scale, adds funding and branch signals", "Shows that a company hires, not who the hiring manager is"],
      ["Funding news", "Predicts hiring before roles are posted", "Startups are heavily prospected by other agencies"],
      ["Past candidates now in management", "Warm, trusting relationships", "Takes years to build"],
      ["LinkedIn", "Finding the hiring manager by name", "Crowded inboxes; generic messages ignored"],
    ]},
    { type: "prose", text: [
      "The practical combination: find hiring companies by signal, then use LinkedIn or the company website to identify the hiring manager or founder, and reach them by phone or a short direct email. Applying the agency approach only to roles that match your specialism keeps your fill rate high, and fill rate is what earns repeat business.",
    ]},

    { type: "h2", id: "outreach", text: "What to say to a hiring manager" },
    { type: "prose", text: [
      "Hiring managers receive agency messages constantly, and almost all of them are the same: we have great candidates, can we work together. The message that gets answered shows you have read their role and already have someone relevant.",
      "**An email about a specific open role:**",
      "Subject: Your area sales manager opening in [city]",
      "\"Hi [name] — I saw the area sales manager role for [city] has been open on your careers page for a few weeks. We place sales managers in [industry] across [region], and I have two people currently interviewing elsewhere who have run teams of eight to ten in this market. If it helps, I can send two anonymised profiles today and you can tell me whether they are close to what you need.\"",
      "**A call opening for a staffing firm:**",
      "\"Hi, I'm with [agency]. We supply front-desk and branch staff to clinic groups in [city]. I noticed you have a new branch opening in [area] — how are you staffing it? We can usually have shortlisted candidates ready within a week.\"",
      "Offer something concrete — profiles, a timeline, a shortlist — rather than a meeting. A meeting is a cost to them; two relevant profiles are a gift.",
    ]},
    { type: "tip", title: "Specialise your outreach list, not just your pitch",
      text: "Contacting every hiring company dilutes your fill rate. Approach only companies hiring roles you have filled before, in markets where you have candidates. A high fill rate on fewer clients beats a low one on many." },

    { type: "h2", id: "pricing", text: "Fees and terms that turn one role into an account" },
    { type: "prose", text: [
      "**Contingency for the first role.** New clients rarely pay a retainer to an agency they have not tried. A contingency fee on the first placement lowers the barrier.",
      "**Retained or exclusive for the second.** Once you have placed well, propose a retained or exclusive arrangement for senior or hard-to-fill roles. You work the role properly; they get priority attention.",
      "**Volume pricing for staffing.** For volume hiring and contract staffing, a per-head rate or a margin on contract staff, with agreed replacement terms, is the standard structure. Be explicit about the replacement period and what happens if a hire leaves early.",
      "**Write the replacement guarantee clearly.** A replacement period for permanent placements is expected. A clear one avoids the argument; a vague one costs you the relationship.",
    ]},

    { type: "h2", id: "steps", text: "A weekly routine for recruitment leads" },
    { type: "steps", items: [
      { icon: "search", title: "Define your roles and markets", detail: "The roles you fill well, the industries and the cities where you have candidates." },
      { icon: "signal", title: "Pull hiring companies by signal", detail: "Search Mantis for companies in those industries and cities that are hiring, expanding or recently funded." },
      { icon: "score", title: "Read the roles", detail: "Keep only companies with roles you can fill. Note how long each role has been open." },
      { icon: "enrich", title: "Find the hiring manager", detail: "Use the company site or LinkedIn to name the person who owns the role." },
      { icon: "send", title: "Send role-specific outreach with profiles", detail: "Name the role, show you understand it, offer anonymised profiles." },
      { icon: "clock", title: "Follow up when the role is still open", detail: "A role still listed two weeks later is a stronger reason to call again." },
    ]},

    { type: "h2", id: "checklist", text: "Recruitment lead checklist" },
    { type: "checklist", items: [
      { title: "A written specialism", detail: "Roles, industries and locations you place in." },
      { title: "A list of hiring companies each week", detail: "Filtered to roles you can fill." },
      { title: "Two or three ready candidate profiles per target role", detail: "Anonymised, sendable the same day." },
      { title: "Clear terms", detail: "Fee, payment timing and replacement period in one page." },
      { title: "A follow-up rule", detail: "Recheck open roles weekly and contact again when one stays open." },
    ]},

    { type: "cta", variant: "table", title: "See who is hiring in your market this week.",
      detail: "Mantis reads careers pages and listings across your cities and flags companies that are hiring, expanding or recently funded.",
      action: "Start your search", href: "/login" },
  ],
  faqs: [
    { q: "What are recruitment leads?", a: "Companies that are hiring now, for roles an agency can fill, and that are likely to need outside help. The strongest are companies whose roles have stayed open for weeks, which shows their own channels have not worked." },
    { q: "How do staffing agencies find new clients?", a: "By tracking companies with open roles, new branches or recent funding, then reaching the hiring manager with role-specific outreach and candidate profiles. Job boards help, but careers pages and expansion signals often show demand earlier." },
    { q: "Where can I find companies that are hiring?", a: "Job boards, company careers pages, funding news and new-branch openings. Mantis reads careers pages and job board presence and flags companies as hiring, alongside funding and branch signals." },
    { q: "How do I approach a hiring manager as a recruiter?", a: "Reference the specific role, show you understand the market for it, and offer two anonymised candidate profiles rather than a meeting. Generic messages offering to work together are ignored." },
    { q: "Should a recruitment agency work on contingency or retainer?", a: "Contingency usually wins the first role with a new client. Once you have placed well, propose a retained or exclusive arrangement for senior and hard-to-fill roles." },
  ],
  links: [
    HUB,
    ["/resources/how-many-businesses-should-be-in-your-pipeline", "how big your pipeline should be"],
    ["/resources/building-a-weekly-prospecting-routine", "a weekly prospecting routine"],
    ["/resources/bought-database-vs-live-search", "bought databases versus live search"],
    ["/resources/how-to-get-coaching-clients", "the coaching and training version"],
    ["/leads/website-development/in/gurgaon", "businesses listed in Gurgaon"],
  ],
},

/* ───────────────────────────── 6 · pest control (commercial accounts) */
{
  slug: "pest-control-leads-commercial-accounts",
  title: "Pest Control Leads: How to Win Commercial Accounts",
  excerpt: "Restaurants, hotels, warehouses and clinics need pest control on a schedule, with records. How to find commercial pest control leads, time the approach and price an annual contract.",
  meta: "Pest control leads for commercial accounts: find restaurants, hotels, warehouses and clinics that need scheduled service, time your approach, and price AMCs.",
  category: "Client Acquisition", cluster: "growth", hero: "nearby", mins: 7,
  heroImage: "/resources/thumbs/how-to-sell-websites-to-restaurants.webp",
  heroAlt: "Flat illustration of a restaurant storefront beside its menu page and a map pin",
  tags: ["Client Acquisition", "Pest Control", "B2B Leads"],
  body: [
    { type: "prose", text: [
      "The best pest control leads are commercial accounts — restaurants, hotels, food producers, warehouses, clinics and schools — that need treatment on a schedule and need records to show it. **A household calls you once when there is a problem. A restaurant needs you every month whether there is a problem or not.**",
      "Residential pest control is a volume, price-shopping business driven by ads. Commercial pest control is an annual contract business driven by compliance and reputation. This guide covers who buys commercial pest control, the signals that show an account is up for grabs, where to find those businesses, what to say, and how to price an annual maintenance contract.",
    ]},

    { type: "h2", id: "who-buys", text: "Commercial pest control buyers and why they buy" },
    { type: "prose", text: [
      "Commercial buyers share one motivation that homeowners do not: someone else is checking. A food-safety inspector, a hotel guest who posts a photo, a client auditing a warehouse, a parent at a school. That outside pressure is why commercial accounts pay for scheduled service and documentation.",
    ]},
    { type: "table", head: ["Account type", "Pressure they face", "Service they need", "Who decides"], rows: [
      ["Restaurants, cafes, cloud kitchens", "Food-safety inspections, reviews, delivery platform ratings", "Monthly or fortnightly service, records, kitchen-safe treatment", "Owner or operations manager"],
      ["Hotels and guest houses", "Guest reviews, booking platform ratings", "Scheduled rooms and kitchen service, bed-bug response", "General manager or owner"],
      ["Food processing, bakeries, cold storage", "Customer and certification audits", "Documented programme with trap mapping and logs", "Plant or quality manager"],
      ["Warehouses and distribution", "Stored goods damage, client audits", "Rodent and stored-product pest control", "Site or warehouse manager"],
      ["Hospitals, clinics and labs", "Infection control, accreditation", "Low-odour treatments, scheduled service", "Administrator or facilities head"],
      ["Schools, hostels and offices", "Parents, staff complaints", "Termite and general pest control around holidays", "Admin head, principal or office manager"],
    ]},
    { type: "prose", text: [
      "Food businesses are the core of most commercial pest control books because their pressure is constant. Warehouses and food producers are fewer but larger, and they value documentation and audit readiness above price.",
    ]},

    { type: "h2", id: "signals", text: "Signals that a commercial account is ready" },
    { type: "prose", text: [
      "Mantis reads businesses' Google listings, websites and delivery app pages. These are the signals that matter for pest control:",
    ]},
    { type: "checklist", items: [
      { title: "New on delivery apps", detail: "A Zomato or Swiggy page that says newly opened. A new kitchen needs a pest control contract from the start, and nobody has the account yet." },
      { title: "New Google listing or coming soon", detail: "Five or fewer reviews with the first one recent, or a site that says opening soon. New hotels, clinics and cafes are setting up every vendor at once." },
      { title: "Several branches", detail: "A restaurant group or clinic chain with multiple listings. One contract across all sites is simpler for them and larger for you." },
      { title: "Established", detail: "100+ reviews means a busy kitchen or hotel — high footfall, high exposure, and the revenue for a proper contract." },
      { title: "Low rating", detail: "Rated below 4.0. Not proof of a pest problem, but read the reviews: a complaint mentioning cockroaches or rats is an account that needs help this week." },
    ]},
    { type: "prose", text: [
      "Seasonality is a signal you supply yourself. Termite treatment before the monsoon, mosquito control after it, and rodent work before winter all give you a timely reason to call commercial accounts you have already listed.",
    ]},

    { type: "cta", variant: "map", title: "Find new restaurants, hotels and clinics in your area.",
      detail: "Mantis flags businesses newly opened on delivery apps, new Google listings and multi-branch groups, with the phone number for each.",
      action: "Find pest control leads", href: "/login" },

    { type: "h2", id: "where", text: "Where commercial pest control leads come from" },
    { type: "table", head: ["Source", "Strength", "Weakness"], rows: [
      ["Pay-per-lead and directory leads", "Active buyers", "Mostly residential, shared with competitors, price-driven"],
      ["Google Maps by category and area", "Every restaurant and hotel in your service area", "No indication of readiness; slow by hand"],
      ["Signal-based search (Mantis)", "Finds new openings and multi-branch groups first", "You still need to reach the decision-maker"],
      ["Food-safety and hygiene consultants", "Refer clients preparing for audits", "Few in number; need a relationship"],
      ["Restaurant equipment and kitchen fit-out suppliers", "Know about new kitchens weeks before opening", "Informal; reciprocal referrals help"],
      ["Walk-ins on food streets", "Fast, face-to-face, many accounts per hour", "Owners are busy during service; go between 3 and 6 pm"],
    ]},
    { type: "prose", text: [
      "Restaurant fit-out contractors and kitchen equipment suppliers are worth cultivating because they know about new kitchens weeks before the doors open. A new kitchen that is treated before it starts cooking is much easier to keep clean than one that is treated after a problem appears.",
    ]},

    { type: "h2", id: "outreach", text: "What to say to a restaurant or hotel owner" },
    { type: "prose", text: [
      "Owners of food businesses are wary of pest control salespeople, partly because the industry has a reputation for scare tactics. A calm, record-focused pitch stands out.",
      "**A walk-in or call to a newly opened restaurant:**",
      "\"Hi, I'm with [company] — we look after pest control for [two] restaurants on this road. Congratulations on opening. Most new kitchens set up a monthly service in the first weeks so the records are in place before any inspection. I can do a free inspection this week and show you exactly where we would put stations and what the monthly visit covers.\"",
      "**An email to a hotel or restaurant group:**",
      "Subject: One pest control contract for all [four] branches",
      "\"Hi [name] — [group] now runs [four] branches across [city]. We handle scheduled pest control for multi-branch food businesses, with one service calendar, one monthly invoice, and a digital log per branch you can show at any inspection. Would a free inspection at your newest branch be useful?\"",
      "**Avoid three things that put commercial owners off.** Do not open with alarming claims about what you suspect is in their kitchen; it reads as a scare tactic and the owner will defend the kitchen rather than listen. Do not quote over the phone before seeing the site; a low guess that rises after the inspection looks dishonest, and a high one loses the account. And do not mention a competitor's failures, even if you have heard about them — owners on the same street talk to each other, and discretion is part of what they are buying.",
      "**Speak to the right person at the right time.** In a restaurant the person at the counter is rarely the decision-maker. Ask for the owner or operations manager by name, and if they are not in, ask when they usually are. A short note left with a business card and a sample service log does more than a long conversation with someone who cannot sign.",
      "The free inspection is the standard entry offer in commercial pest control for good reason: it lets you assess the site, quote accurately and show professionalism, and it rarely commits the owner to anything.",
    ]},
    { type: "tip", title: "Sell the logbook",
      text: "Show a sample service record — dates, areas treated, chemicals used, trap counts, technician signature. For a food business preparing for an inspection or an audit, a clean logbook is often the real product." },

    { type: "h2", id: "pricing", text: "Pricing a pest control annual maintenance contract" },
    { type: "prose", text: [
      "**Sell the annual contract, not the treatment.** An annual maintenance contract with a fixed visit schedule gives the account predictable cost and gives you recurring revenue. Single treatments are where price shopping happens.",
      "**Price by site size and risk, not by visit alone.** A cloud kitchen and a 200-cover restaurant need different station counts and visit frequencies. Price by area and risk category and explain the difference.",
      "**Include call-outs.** A set number of emergency call-outs within the contract removes the fear of surprise bills and makes the contract feel like insurance.",
      "**Discount for multiple sites, not for signing.** A per-site rate that drops as branches are added rewards growth and makes you the default vendor for every new branch.",
    ]},

    { type: "h2", id: "steps", text: "Steps to build a commercial pest control book" },
    { type: "steps", items: [
      { icon: "map", title: "Define your service area", detail: "Commercial accounts need regular visits; keep routes tight." },
      { icon: "signal", title: "Pull new and growing food businesses", detail: "In Mantis, search restaurants, cafes, hotels and food producers in your area; prioritise newly opened, new listings and multi-branch groups." },
      { icon: "phone", title: "Call or walk in between services", detail: "Mid-afternoon is when restaurant owners have time." },
      { icon: "verified", title: "Offer a free inspection", detail: "Assess the site, map station positions and note risk areas." },
      { icon: "send", title: "Send an AMC proposal with a sample log", detail: "Visit schedule, coverage, call-outs and the record format." },
      { icon: "calendar", title: "Use the season as a follow-up", detail: "Pre-monsoon and pre-winter are natural reasons to contact accounts that said not yet." },
    ]},

    { type: "h2", id: "checklist", text: "Commercial pest control lead checklist" },
    { type: "checklist", items: [
      { title: "A list of new and multi-branch food businesses", detail: "Refreshed weekly, filtered to your service area." },
      { title: "A sample service log", detail: "The document an owner shows an inspector." },
      { title: "An AMC template by site size", detail: "Visits, stations, call-outs and price per site." },
      { title: "Two referral partners", detail: "A hygiene consultant and a kitchen fit-out supplier." },
      { title: "A seasonal calendar", detail: "When to call which accounts about which pests." },
    ]},

    { type: "cta", variant: "table", title: "Your next commercial pest control accounts, listed.",
      detail: "Search restaurants, hotels, clinics and warehouses in Mantis and see which are new, growing or multi-branch — with phone numbers.",
      action: "Start searching", href: "/login" },
  ],
  faqs: [
    { q: "How do I get commercial pest control clients?", a: "Focus on businesses with outside pressure — restaurants, hotels, food producers, warehouses, clinics — and approach them when they are new, expanding or growing busy. Offer a free inspection and an annual contract with a clear service log." },
    { q: "Are pest control leads from directories worth buying?", a: "They bring active buyers, but most are residential and shared with several companies, so they compete on price. Commercial accounts are better found directly, by searching your area for new and multi-branch food and hospitality businesses." },
    { q: "When is the best time to approach a restaurant about pest control?", a: "Right after it opens, before a problem or an inspection, and mid-afternoon between lunch and dinner service. Newly opened restaurants on delivery apps are among the strongest pest control leads." },
    { q: "How should I price a commercial pest control contract?", a: "As an annual maintenance contract priced by site size and risk, with a fixed visit schedule and a set number of call-outs included. Offer per-site discounts for multi-branch groups rather than discounts for signing." },
    { q: "What do commercial clients care about most in pest control?", a: "Documented, scheduled service they can show an inspector, an auditor or a guest. A clean service log with dates, areas, chemicals and technician sign-off often matters more than the price of a single visit." },
  ],
  links: [
    HUB,
    ["/resources/how-to-sell-websites-to-restaurants", "how restaurant owners buy"],
    ["/resources/how-to-sell-websites-to-caterers", "selling to caterers and kitchens"],
    ["/resources/call-whatsapp-or-walk-in-indian-smbs", "call, WhatsApp or walk in"],
    ["/resources/catering-leads-corporate-and-event-clients", "the corporate catering playbook"],
    ["/leads/website-development/in/gurgaon/categories/restaurant", "restaurants listed in Gurgaon"],
  ],
},
/* ───────────────────────────── 7 · corporate catering */
{
  slug: "catering-leads-corporate-and-event-clients",
  title: "Catering Leads: How to Win Corporate and Event Clients",
  excerpt: "Weddings are seasonal and shopped on price. Offices, coworking spaces, schools and corporate events order every week — how to find those catering leads and keep the account.",
  meta: "Catering leads for corporate and event clients: which offices, coworking spaces and event buyers order regularly, how to find them and how to price contracts.",
  category: "Client Acquisition", cluster: "growth", hero: "nearby", mins: 7,
  heroImage: "/resources/thumbs/how-to-sell-websites-to-caterers.webp",
  heroAlt: "Flat illustration of a banquet venue with set tables beside a catering menu page",
  tags: ["Client Acquisition", "Catering", "Corporate Clients"],
  body: [
    { type: "prose", text: [
      "The most valuable catering leads are corporate and event clients that order again and again: offices that feed their teams, coworking spaces that host events, schools and factories with canteens, and companies that run launches, offsites and dealer meets. **A wedding is one large order shopped on price; an office lunch contract is a smaller order that arrives every week for years.**",
      "Many caterers depend on wedding and party seasons and spend the rest of the year waiting. Corporate catering smooths that out. This guide covers who buys corporate and event catering, the signals that show a company is about to order, where to find these clients, what to say, and how to price a contract that survives the first renewal.",
    ]},

    { type: "h2", id: "who-buys", text: "Who buys corporate and event catering" },
    { type: "prose", text: [
      "Corporate catering buyers fall into two groups. Recurring buyers need food on a schedule — daily lunches, weekly team meals, canteen operation. Event buyers need food for specific occasions — launches, offsites, conferences, festivals. The best accounts are companies that are both.",
    ]},
    { type: "table", head: ["Client", "What they order", "Frequency", "Who decides"], rows: [
      ["Offices of 20–200 people without a cafeteria", "Team lunches, meeting snacks, Friday meals", "Weekly or daily", "Office or admin manager, HR"],
      ["Coworking spaces", "Member events, community lunches, client events", "Several times a month", "Community or operations manager"],
      ["Factories and warehouses", "Staff canteen or shift meals", "Daily", "Plant manager, HR or admin"],
      ["Schools, colleges and coaching institutes", "Canteen, events, hostel meals", "Daily or termly", "Administrator or management"],
      ["Hospitals and clinics", "Staff meals, patient meals, events", "Daily", "Administrator or facilities"],
      ["Companies running events", "Launches, offsites, dealer meets, festivals", "A few times a year, large orders", "Marketing, HR or founder's office"],
      ["Event planners and venues without kitchens", "Catering for their clients' events", "Ongoing referrals", "Planner or venue manager"],
    ]},
    { type: "prose", text: [
      "Event planners and kitchen-less venues deserve special attention because one relationship sends many events. A planner who trusts your food and your timing will recommend you to every client who asks, and a venue without a kitchen needs an approved caterer list you can be on.",
      "The decision-maker in most offices is not the founder but the person who gets blamed when lunch is late. Admin and HR managers value reliability above almost everything else: food that arrives on time, in the right quantity, with the vegetarian and allergy labels right. Your pitch should sound like it was written for them.",
    ]},

    { type: "h2", id: "signals", text: "Catering leads: signals that a company will order" },
    { type: "prose", text: [
      "Mantis reads companies' websites and listings for signals of growth and events. These are the ones that matter for catering:",
    ]},
    { type: "checklist", items: [
      { title: "Hiring now", detail: "Open roles on the careers page or job boards. A growing headcount means more people to feed, more onboarding days and more team events." },
      { title: "Raised funding recently", detail: "Funded companies hold launches, offsites and team celebrations, and often start providing meals as a hiring perk. Mantis flags reported funding rounds when you ask." },
      { title: "Several branches or a new office", detail: "Multiple listings under one name, a locations page, or a coming-soon office. A new office opening is an event and the start of a recurring need." },
      { title: "Coworking spaces and event venues", detail: "Search for them directly by category. Coworking spaces host member events constantly, and venues without kitchens need caterers." },
      { title: "Established", detail: "100+ reviews or a sizable presence signals a business with the budget to cater regularly." },
    ]},

    { type: "cta", variant: "map", title: "Find growing offices and coworking spaces near your kitchen.",
      detail: "Ask Mantis for offices, coworking spaces and venues within your delivery radius. It flags who is hiring, expanding or newly opened.",
      action: "Find catering leads", href: "/login" },

    { type: "h2", id: "where", text: "Where to find corporate catering clients" },
    { type: "table", head: ["Source", "Strength", "Weakness"], rows: [
      ["Wedding and party marketplaces", "Large orders, active buyers", "Seasonal and heavily price-shopped"],
      ["Corporate meal platforms", "Steady volume without selling", "Platform takes margin and owns the client"],
      ["Signal-based search (Mantis)", "Finds growing offices, coworking spaces and venues in your radius", "Needs a tasting offer and a follow-up"],
      ["Event planners and kitchen-less venues", "Referrals for many events from one relationship", "Takes time; you must perform at their events"],
      ["Business parks and tech parks", "Dense concentration of offices", "Gatekeepers at reception; bring samples"],
      ["Existing private clients", "Many work at or run companies", "You have to ask"],
    ]},
    { type: "prose", text: [
      "Corporate meal platforms deserve a fair word. They can fill a kitchen's quiet hours and bring in offices you would never have reached, but the office's loyalty is to the platform, not to you. Treat platform orders as capacity filler and put your selling effort into accounts you own directly.",
      "Your delivery radius should shape the list before anything else. Corporate catering depends on food arriving hot and on time, so an office forty minutes away is a worse prospect than a smaller one ten minutes away, however good it looks on paper.",
    ]},

    { type: "h2", id: "outreach", text: "What to say to an office or event planner" },
    { type: "prose", text: [
      "Food sells itself once tasted. The goal of outreach is to get a tasting on the calendar.",
      "**An email to an admin or HR manager:**",
      "Subject: Team lunches for [company]",
      "\"Hi [name] — I saw [company] is growing and hiring across several teams. We cater for offices in [area], including [office A], with weekly team lunches and meeting food delivered within a fifteen-minute window and every dish labelled vegetarian, vegan or with allergens. Could I bring a tasting for your team one afternoon next week? There is no charge and no commitment.\"",
      "**A call to an event planner:**",
      "\"Hi, I run [kitchen] in [area]. We do corporate events — launches, offsites, conferences — for up to [300] people. I know you plan events at [venue]; I'd like to cook a tasting for you and your team, so you have a caterer to recommend when a client asks.\"",
      "**Follow up with a menu, not a brochure.** After a tasting, send a short rotating weekly menu with per-head prices for two or three tiers. It makes the decision concrete and easy to forward to whoever approves the budget.",
      "**Expect to be checked.** Offices and schools increasingly ask a caterer for its food-safety registration, how food is packed and transported, and what happens if an order is late or wrong. Have the answers on one page — licence details, kitchen photos, packaging, delivery window and the replacement policy — and send it with the menu. It removes the admin manager's biggest worry, which is being blamed for a bad lunch.",
      "Timing matters too. Offices plan budgets around their financial year, and many company events cluster around festivals, year-end and annual days. A message that arrives a month before the event season is read; one that arrives the week of it is too late.",
    ]},
    { type: "tip", title: "Bring the tasting to them",
      text: "A tasting delivered to the office at lunchtime reaches everyone who will eat the food, not just the person who signs. Staff who enjoyed it become the internal argument for choosing you." },

    { type: "h2", id: "pricing", text: "Pricing corporate catering contracts" },
    { type: "prose", text: [
      "**Per-head pricing in tiers.** Offer two or three per-head price points with clearly different menus. It lets the office choose without negotiating, and it makes upgrades for special days simple.",
      "**Minimum orders and lead times.** State a minimum headcount per order and how much notice you need. Small, last-minute orders are where corporate catering loses money.",
      "**Monthly billing for recurring clients.** Offices prefer one consolidated monthly invoice to paying per order. Agree the payment terms in writing before the first month.",
      "**Price events separately.** Events need staff, equipment, setup and cleanup. Quote them as packages, not as scaled-up lunch orders.",
      "**Review menus, not just prices.** A recurring client gets bored before they get unhappy. Rotating the menu every few weeks is the cheapest way to keep a contract.",
    ]},

    { type: "h2", id: "steps", text: "Steps to win corporate catering clients" },
    { type: "steps", items: [
      { icon: "map", title: "Draw your delivery radius", detail: "Only target offices and venues you can serve on time, every time." },
      { icon: "signal", title: "List growing offices and venues", detail: "Use Mantis to find offices hiring or expanding, coworking spaces and kitchen-less venues inside the radius." },
      { icon: "phone", title: "Find the admin or HR manager", detail: "Call reception and ask who organises team lunches and events." },
      { icon: "calendar", title: "Book a tasting", detail: "Free, at their office, at lunchtime." },
      { icon: "send", title: "Send a tiered weekly menu", detail: "Per-head prices, minimum order, lead time and monthly billing." },
      { icon: "verified", title: "Ask for the event work", detail: "Once lunches run smoothly, offer to cater their next launch or offsite." },
    ]},

    { type: "h2", id: "checklist", text: "Catering client checklist" },
    { type: "checklist", items: [
      { title: "A defined delivery radius", detail: "Reliability depends on distance." },
      { title: "A tasting kit", detail: "Portable, presentable and representative of the weekly menu." },
      { title: "Tiered per-head menus", detail: "Two or three tiers, clearly labelled for dietary needs." },
      { title: "Clear terms", detail: "Minimum order, notice period, billing cycle and cancellation." },
      { title: "Two referral partners", detail: "An event planner and a venue without a kitchen." },
    ]},

    { type: "cta", variant: "table", title: "Find offices that will order lunch every week.",
      detail: "Mantis searches your area for growing companies, coworking spaces and venues, with the signals and contact details for each.",
      action: "Start your list", href: "/login" },
  ],
  faqs: [
    { q: "How do caterers get corporate clients?", a: "By finding offices, coworking spaces, schools and factories within their delivery radius — especially companies that are hiring or expanding — and offering a free tasting at the office, followed by a tiered weekly menu with per-head prices." },
    { q: "What are the best catering leads?", a: "Recurring buyers: offices without a cafeteria, coworking spaces, factories and schools. Event planners and venues without a kitchen are also valuable because one relationship sends many events." },
    { q: "Should caterers use corporate meal platforms?", a: "They can provide steady volume, but the platform takes a margin and owns the client relationship. They work best as a supplement to direct corporate accounts rather than the whole business." },
    { q: "How should I price corporate catering?", a: "With two or three per-head tiers, a stated minimum order and notice period, and monthly billing for recurring clients. Quote events separately as packages that include staff, setup and cleanup." },
    { q: "How do I keep a corporate catering client?", a: "Be reliable on timing and labelling, rotate the menu every few weeks so the team does not tire of it, and offer to cater the company's events once the daily or weekly service runs smoothly." },
  ],
  links: [
    HUB,
    ["/resources/how-to-sell-websites-to-caterers", "how caterers themselves buy"],
    ["/resources/what-to-send-a-local-business-after-the-call", "what to send after the call"],
    ["/resources/the-lifetime-value-of-one-local-client", "the lifetime value of one client"],
    ["/resources/how-to-get-customers-for-cleaning-business", "the commercial cleaning playbook"],
    ["/leads/website-development/in/pune/categories/restaurant", "restaurants listed in Pune"],
  ],
},

/* ───────────────────────────── 8 · logistics / courier / freight */
{
  slug: "logistics-leads-how-to-get-clients",
  title: "Logistics Leads: How to Get Clients for a Logistics Company",
  excerpt: "Exporters, online sellers, distributors and manufacturers ship every week. How to find logistics leads that match your lanes and service, and win the first shipment.",
  meta: "Logistics leads: how to get clients for a logistics company by finding exporters, online stores and distributors that ship often, then pitching a trial lane.",
  category: "Client Acquisition", cluster: "growth", hero: "network", mins: 7,
  heroImage: "/resources/thumbs/how-to-sell-websites-to-wholesalers.webp",
  heroAlt: "Flat illustration of a warehouse with stacked boxes beside a conveyor and a checklist",
  tags: ["Client Acquisition", "Logistics", "Freight and Courier"],
  body: [
    { type: "prose", text: [
      "Good logistics leads are businesses that ship regularly on lanes you already run — exporters sending containers, online stores sending parcels, distributors moving stock between cities, manufacturers bringing in raw material. **To get clients for a logistics company, match your service to a shipper's pattern before you call, not after.** A courier company and a freight forwarder want different clients, and a generic \"we do logistics\" pitch fits neither.",
      "This guide covers who buys logistics services, the signals that show a business ships, where to find those businesses, what to say to a shipper who already has a provider, and how to price a trial that turns into a contract.",
    ]},

    { type: "h2", id: "who-buys", text: "Which businesses buy logistics services" },
    { type: "table", head: ["Shipper", "What they ship", "Service they need", "Who decides"], rows: [
      ["Exporters and importers", "Containers, air cargo, samples", "Freight forwarding, customs clearance, documentation", "Owner, export manager"],
      ["Online stores and D2C brands", "Parcels to consumers, returns", "Courier aggregation, cash on delivery, returns handling", "Founder or operations head"],
      ["Wholesalers and distributors", "Cartons and pallets between cities", "Part-load and full-truck transport, warehousing", "Owner or logistics manager"],
      ["Manufacturers", "Raw materials in, finished goods out", "Inbound transport, outbound distribution, warehousing", "Plant or supply chain manager"],
      ["Furniture, appliance and building material sellers", "Bulky items to homes and sites", "Last-mile delivery with installation or unloading", "Owner or store manager"],
      ["Clinics, labs and professional firms", "Samples, documents", "Time-sensitive local courier", "Administrator or office manager"],
    ]},
    { type: "prose", text: [
      "Choose the rows that match the service you actually run. A freight forwarder that chases online stores wastes time on parcel volumes it cannot price well; a courier aggregator that chases exporters cannot handle the customs work. Fit is the first filter, and it is the one most logistics sales teams skip.",
      "The decision-maker also changes with company size. In a small exporter the owner still chooses the forwarder personally, usually on trust built over years. In a mid-sized D2C brand an operations head owns delivery performance and will switch providers over a bad month of delivery failures. In a larger manufacturer there may be a formal vendor approval process, and your first goal is to get onto the approved list rather than to win a shipment.",
    ]},

    { type: "h2", id: "signals", text: "Signals that a business ships regularly" },
    { type: "prose", text: [
      "Mantis reads businesses' websites and listings for signs of regular shipping:",
    ]},
    { type: "checklist", items: [
      { title: "Exporter", detail: "An IEC number, export text or worldwide shipping on the site. The most direct signal for freight forwarders and customs brokers." },
      { title: "Online store", detail: "A cart or shop on the website. Every order is a parcel, and a growing store outgrows its first courier arrangement quickly." },
      { title: "Shopify store gaps", detail: "A Shopify store with no reviews or email app installed is often still setting up its operations — a good moment to offer shipping before habits and contracts form." },
      { title: "Several branches or a locations page", detail: "Multiple outlets or warehouses mean stock moving between them." },
      { title: "Hiring now", detail: "Open roles for warehouse staff, dispatch or logistics coordinators show volume growing faster than the in-house setup." },
    ]},
    { type: "prose", text: [
      "Category matters as much as signals. A search for wholesalers, distributors, manufacturers or building material suppliers in an industrial area returns businesses whose entire model depends on moving goods, even when their websites say little.",
    ]},

    { type: "cta", variant: "map", title: "Find exporters and online stores that ship every week.",
      detail: "Ask Mantis for exporters, manufacturers, distributors or online stores in your region. It flags export activity, online stores and hiring for each.",
      action: "Find logistics leads", href: "/login" },

    { type: "h2", id: "where", text: "Where logistics leads come from" },
    { type: "table", head: ["Source", "Strength", "Weakness"], rows: [
      ["Freight and load marketplaces", "Immediate loads", "Spot pricing, thin margins, no relationship"],
      ["B2B directories", "Lists of manufacturers and exporters by product", "Shared with every competitor; many stale listings"],
      ["Signal-based search (Mantis)", "Finds exporters, online stores and distributors with live signals", "You still need to qualify volume and lanes on the call"],
      ["Industrial estates and export clusters", "Dense, walkable, many shippers per visit", "Gatekeepers; owners rarely at the gate"],
      ["CAs, customs brokers and trade associations", "Trusted referrals to exporters", "Reciprocity expected"],
      ["Existing clients' suppliers and customers", "Same lanes, warm introductions", "Needs a client willing to introduce you"],
    ]},
    { type: "prose", text: [
      "B2B directories are worth using for discovery but not for trust. Many listings are years old, and the same manufacturer appears under several names. Treat any directory list as a starting point to verify — check that the business still trades, that its website or listing is current, and that it actually ships the kind of goods you move — before it goes into your outreach.",
      "The second-to-last row is underrated. Every client you already serve has suppliers and customers on the same lanes, and an introduction from a shared business partner is the warmest lead in logistics.",
    ]},

    { type: "h2", id: "outreach", text: "How to pitch a shipper who already has a provider" },
    { type: "prose", text: [
      "Almost every business you contact already ships with someone. You are not replacing them on the first call; you are asking for one lane or one shipment.",
      "**A call to an exporter:**",
      "\"Hi, I'm with [company]. We handle sea freight and customs for exporters in [cluster], mostly to [region]. I saw you export [product]. Most of our clients started by giving us one shipment to compare documentation and transit time with their current forwarder. Who handles your shipping decisions?\"",
      "**An email to an online store:**",
      "Subject: Delivery to [region] for [store]",
      "\"Hi [name] — I came across [store] and noticed you ship across India with cash on delivery. We work with online stores of your size on courier allocation by pin code and returns handling. If you share last month's delivery failures by region, I can show you where a different courier mix would have performed better. No change needed to try it on one region.\"",
      "Both messages ask for a small, low-risk comparison — one shipment, one region. That is how logistics relationships start.",
      "**What not to lead with.** A rate card attached to the first email invites a line-by-line price comparison before the shipper knows anything about your service, and you will usually lose it to someone cheaper on paper. A list of every service you offer tells the shipper you have not looked at what they ship. And criticism of their current provider rarely lands — they chose that provider, and admitting it was a mistake is not something most owners want to do on a cold call.",
      "**Time the approach to their calendar.** Online stores plan capacity before festive and sale seasons, exporters before their peak shipping months, and distributors before the financial year closes. A trial proposed a few weeks before a peak, when the shipper is worried about capacity, is far more welcome than one proposed in the middle of it.",
    ]},
    { type: "tip", title: "Ask for the lane, not the account",
      text: "A shipper will not move all its volume to a new provider. It will often trial one lane, one region or one product line. Win that, perform, and the rest follows." },

    { type: "h2", id: "pricing", text: "Pricing and packaging logistics services" },
    { type: "prose", text: [
      "**Quote lanes, not catalogues.** Shippers compare lane by lane. A clear rate per lane, with fuel and accessorial charges explained, beats a rate card full of exceptions.",
      "**Make the trial easy.** Price the first shipment or the first month competitively, with no long-term commitment, and agree in advance which measures — transit time, damage, documentation errors, delivery success — decide whether it continues.",
      "**Offer volume tiers.** As a shipper's volume grows, rates step down. It rewards the client for consolidating more volume with you.",
      "**Report proactively.** A weekly summary of shipments, delays and exceptions is something many smaller providers never send. It is cheap to produce and makes you look like the safest choice.",
    ]},

    { type: "h2", id: "steps", text: "Steps to win logistics clients" },
    { type: "steps", items: [
      { icon: "map", title: "Define your lanes and service", detail: "Where you run well and what you handle: parcels, part-load, full-truck, sea or air freight." },
      { icon: "signal", title: "Find shippers that match", detail: "Search Mantis for exporters, online stores, distributors or manufacturers in your origin regions." },
      { icon: "phone", title: "Qualify volume and lanes", detail: "On the first call, learn how much they ship, where to, and who decides." },
      { icon: "send", title: "Propose a one-lane trial", detail: "One shipment, one region or one month, with agreed success measures." },
      { icon: "verified", title: "Perform and report", detail: "Send a clear summary of the trial results." },
      { icon: "data", title: "Expand lane by lane", detail: "Offer volume tiers and take on the next lane." },
    ]},

    { type: "h2", id: "checklist", text: "Logistics lead checklist" },
    { type: "checklist", items: [
      { title: "Your lanes and services written down", detail: "So you only chase shippers you can serve well." },
      { title: "A list of shippers with signals", detail: "Exporters, online stores, distributors and manufacturers in your regions." },
      { title: "A one-lane trial offer", detail: "Price, duration and success measures." },
      { title: "A weekly report template", detail: "Shipments, transit times, exceptions." },
      { title: "A referral loop", detail: "Ask every satisfied client for introductions to suppliers and customers on the same lanes." },
    ]},

    { type: "cta", variant: "table", title: "Build your list of shippers this week.",
      detail: "Mantis finds exporters, online stores and distributors in your region and shows the signals and contacts for each one.",
      action: "Start searching", href: "/login" },
  ],
  faqs: [
    { q: "How do I get clients for my logistics company?", a: "Define the lanes and services you run well, find businesses that ship on those lanes — exporters, online stores, distributors, manufacturers — and ask for a one-lane or one-shipment trial rather than the whole account." },
    { q: "What are the best logistics leads?", a: "Businesses that ship regularly on lanes you already serve. Exporters, online stores, wholesalers and manufacturers are the core, and signals such as export activity, an online store, several branches or warehouse hiring point to regular volume." },
    { q: "How do I win a shipper who already has a provider?", a: "Do not ask them to switch. Ask for one lane, one region or one shipment to compare, agree in advance how the trial will be judged, and report the results clearly." },
    { q: "Are freight marketplaces good for finding clients?", a: "They are good for filling trucks but rarely produce lasting clients, because loads are priced on the spot and there is no relationship. Direct accounts with regular shippers are where margin and stability come from." },
    { q: "How should a logistics company price for new clients?", a: "Quote by lane with surcharges explained, make the first trial competitive and commitment-free, and offer volume tiers so rates fall as the client consolidates more volume with you." },
  ],
  links: [
    HUB,
    ["/resources/how-to-sell-websites-to-wholesalers", "how wholesalers buy"],
    ["/resources/why-apollo-and-zoominfo-miss-businesses-without-websites", "why contact databases miss local shippers"],
    ["/resources/exclusive-leads-vs-your-own-list", "bought leads versus your own list"],
    ["/resources/how-to-get-clients-for-travel-agency", "the corporate travel playbook"],
    ["/leads/website-development/in/surat", "businesses listed in Surat"],
  ],
},

/* ───────────────────────────── 9 · PPC / Google Ads / email / WhatsApp marketing agencies */
{
  slug: "ppc-leads-businesses-not-running-google-ads",
  title: "PPC Leads: How to Find Businesses Not Running Google Ads",
  excerpt: "For PPC, Google Ads, email and WhatsApp marketing agencies, the best leads are visible from the website itself: no ads tag, no pixel, no analytics, or ads with no tracking.",
  meta: "PPC leads for Google Ads, email and WhatsApp marketing agencies: find businesses not running ads, with no pixel or tracking, and pitch them with evidence.",
  category: "Client Acquisition", cluster: "growth", hero: "methodology", mins: 7,
  heroImage: "/resources/thumbs/why-tech-stack-filtering-misses-your-best-prospects.webp",
  heroAlt: "Flat illustration of a sieve filtering website cards and a net catching local businesses",
  tags: ["Client Acquisition", "PPC", "Google Ads"],
  body: [
    { type: "prose", text: [
      "The best PPC leads are businesses whose own website shows the gap: no Google Ads conversion tag, no Meta pixel, no analytics, or ads running with nothing measuring them. **For a Google Ads, PPC, email or WhatsApp marketing agency, the website is the audit — you can see the problem before you make the call.**",
      "That makes paid-media agencies unusually well placed among B2B sellers. You do not need to guess who needs you; the tags are either on the page or they are not. This guide covers which businesses are worth pitching, the tracking signals Mantis detects, how to separate a business that should run ads from one that should not, what to send, and how to package the work.",
    ]},

    { type: "h2", id: "who-buys", text: "Which businesses actually buy PPC and Google Ads management" },
    { type: "prose", text: [
      "Paid search only works for businesses whose customers search with intent and whose sale is worth enough to pay for the click. Many businesses without ads are not missing out — their customers do not search, or their margin cannot carry the cost per lead. Pitching them wastes your time and theirs.",
    ]},
    { type: "table", head: ["Business type", "Why ads can work", "What to sell first"], rows: [
      ["Clinics, dentists and diagnostic labs", "Urgent, local, high-value searches", "Search campaigns with call and booking tracking"],
      ["Home services: repairs, pest control, interiors", "Searches made at the moment of need", "Local search ads, call tracking"],
      ["Coaching institutes and training providers", "Seasonal admission searches", "Lead form campaigns around admission season"],
      ["Real estate developers and brokers", "High ticket, long research", "Search plus remarketing, lead qualification"],
      ["Online stores and D2C brands", "Product searches and shopping", "Shopping campaigns, Meta ads, email flows"],
      ["B2B manufacturers and service firms", "Specific, low-volume, high-value searches", "Tight search campaigns, enquiry tracking"],
    ], note: "A tea stall with no ads is not a PPC lead. A dental clinic with 300 reviews and no Google Ads tag is." },
    { type: "prose", text: [
      "Email and WhatsApp marketing fit a different subset: businesses with repeat customers and a list they are not using. Online stores, clinics with recall visits, gyms, salons and coaching institutes all have customers who would buy again if reminded.",
    ]},

    { type: "h2", id: "signals", text: "Tracking signals that make PPC leads" },
    { type: "prose", text: [
      "Mantis loads each business's website and reads what is installed. These are the signals a paid-media or retention agency can use:",
    ]},
    { type: "checklist", items: [
      { title: "No Google Ads tag", detail: "No Google Ads conversion tag on the site. Either the business does not advertise on Google, or it does and cannot measure what it gets." },
      { title: "No Meta pixel", detail: "No Meta (Facebook and Instagram) pixel. The business is not running tracked Meta ads and cannot retarget visitors." },
      { title: "No analytics", detail: "No Google Analytics or Tag Manager. The business has no idea where its website visitors come from." },
      { title: "Running ads — with gaps", detail: "Active ads in Meta's Ad Library or Google's Ads Transparency Center. Combined with a missing tag or no analytics, this is a business spending money it cannot measure — the strongest PPC lead there is." },
      { title: "Store with no email marketing", detail: "A Shopify store with no email or SMS marketing app installed. The natural lead for email and retention agencies." },
      { title: "Enquiry form goes nowhere", detail: "A contact form that is mailto-only or has no working handler. Leads from any campaign are being lost, which is the opening for WhatsApp automation and lead capture work." },
    ]},
    { type: "prose", text: [
      "Pair the tracking signals with an established business — 100 or more Google reviews — and you have a business with customers, revenue and a measurable gap. That combination converts far better than a new business with nothing installed, which may simply not be ready to spend.",
    ]},

    { type: "cta", variant: "map", title: "Find businesses with no Google Ads tag or Meta pixel.",
      detail: "Tell Mantis the business type and city. It checks each website for ads tags, pixels and analytics, and flags who is already running ads.",
      action: "Find PPC leads", href: "/login" },

    { type: "h2", id: "where", text: "Where Google Ads and email marketing leads come from" },
    { type: "table", head: ["Source", "Strength", "Weakness"], rows: [
      ["Tech-stack databases", "Filter by installed tools at scale", "Weak on small local businesses; detect what is present more reliably than what is missing"],
      ["Ad libraries and transparency centres", "See exactly who is running ads", "Manual, one business at a time"],
      ["Signal-based search (Mantis)", "Checks tags, pixels and analytics on local business sites, plus active ads", "Signals are evidence, not certainty — verify before you pitch"],
      ["Partner referrals from web developers", "Sites just launched with no tracking", "Developers may want a cut or reciprocal work"],
      ["Freelance marketplaces", "Active buyers", "Price competition; short engagements"],
      ["Your own content and case studies", "Inbound from businesses already convinced", "Slow to build"],
    ]},
    { type: "prose", text: [
      "Web developers are the most useful partner for a PPC or email agency. A developer who has just launched a site for a clinic or a store knows the business now has a site and no traffic, and many developers would rather refer the marketing than do it badly themselves.",
    ]},

    { type: "h2", id: "outreach", text: "What to send a business with no tracking" },
    { type: "prose", text: [
      "The evidence is your opening. Lead with what you saw on their site, explain what it costs them in one sentence, and offer something small.",
      "**An email to a clinic running ads without conversion tracking:**",
      "Subject: Your Google ads and your booking form",
      "\"Hi [name] — I noticed [clinic] is running Google ads, but your website has no conversion tag, so Google cannot tell which ads produce bookings and is likely optimising for clicks instead. Setting up call and form tracking usually takes a day. If you like, I can send a short screen recording showing exactly what is missing and what it would measure.\"",
      "**A message to an online store with no email marketing:**",
      "\"Hi [name] — I came across [store]. Your store does not seem to have an email or SMS tool installed, which means abandoned carts and past customers get no follow-up. We set up basic flows — abandoned cart, welcome, repeat purchase — for stores of your size. Happy to show you what those three flows would look like for your products.\"",
      "**A WhatsApp-marketing pitch to a busy salon or gym:**",
      "\"Hi [name] — [business] has a lot of reviews but your website form does not seem to send enquiries anywhere. We set up WhatsApp booking replies and reminders so enquiries are answered within minutes. Can I show you how it works on your current enquiries?\"",
      "**Do not overclaim in the first message.** A missing tag tells you something is not measured; it does not tell you how much money is being wasted. Say what you saw, not what you assume.",
    ]},
    { type: "tip", title: "Check before you send",
      text: "A tag can be installed in ways a scan does not see, and a business may track calls through another system. Open the site yourself and check with your browser's tag assistant before claiming something is missing — an accurate observation earns the reply, a wrong one ends the conversation." },

    { type: "h2", id: "pricing", text: "Packaging PPC, email and WhatsApp marketing work" },
    { type: "prose", text: [
      "**Start with a fixed-price setup.** Tracking setup, account structure and the first campaigns as one fixed-price project. It is easy to approve and fixes the problem you pointed at.",
      "**Then a monthly management fee.** A flat fee for small accounts, or a fee tied to spend bands for larger ones. State clearly whether ad spend is included or paid directly by the client — mixing them causes disputes.",
      "**Report what the client cares about.** Calls, bookings, enquiries and sales, not impressions. Tracking is the reason they hired you; the report should prove it works.",
      "**Bundle retention for stores.** Email and WhatsApp flows pair naturally with paid campaigns: paid brings new customers, retention brings them back. One agency doing both is easier for a small business to manage.",
    ]},

    { type: "h2", id: "steps", text: "Steps to find and win PPC clients" },
    { type: "steps", items: [
      { icon: "search", title: "Pick business types where ads pay", detail: "Clinics, home services, coaching, real estate, online stores, B2B firms." },
      { icon: "signal", title: "Search for tracking gaps", detail: "In Mantis, find those businesses in your city with no Google Ads tag, no Meta pixel, no analytics, or ads running without tracking." },
      { icon: "score", title: "Prioritise established businesses", detail: "100+ reviews means customers and revenue to invest." },
      { icon: "verified", title: "Verify the gap yourself", detail: "Check the site with a tag assistant before writing." },
      { icon: "send", title: "Send the evidence-led message", detail: "What you saw, what it costs, a small offer like a screen recording." },
      { icon: "calendar", title: "Propose setup, then management", detail: "Fixed-price tracking and campaign setup, followed by a monthly fee." },
    ]},

    { type: "h2", id: "checklist", text: "PPC lead checklist" },
    { type: "checklist", items: [
      { title: "A target list of business types where ads pay", detail: "Not every business without ads should run them." },
      { title: "A signal-filtered list", detail: "No ads tag, no pixel, no analytics, or ads with no tracking." },
      { title: "A verification habit", detail: "Every gap checked by hand before it is mentioned." },
      { title: "A setup offer with a fixed price", detail: "Tracking, account structure and first campaigns." },
      { title: "A reporting template built on outcomes", detail: "Calls, bookings, enquiries and sales." },
    ]},

    { type: "cta", variant: "table", title: "See which businesses near you are not measuring their marketing.",
      detail: "Mantis checks local business websites for Google Ads tags, Meta pixels, analytics and active ads, and shows the phone number for each.",
      action: "Start your search", href: "/login" },
  ],
  faqs: [
    { q: "What are PPC leads?", a: "Businesses likely to need pay-per-click management: those whose customers search with intent and whose sales can carry the cost of a click, and whose websites show a gap such as no Google Ads tag, no Meta pixel, no analytics, or ads running without tracking." },
    { q: "How do I find businesses that are not running Google Ads?", a: "Check their websites for a Google Ads conversion tag and analytics, and check Google's Ads Transparency Center for active ads. Mantis does both for businesses in a city and flags each one, so you can filter to established businesses with the gap." },
    { q: "Is a business without ads always a good lead?", a: "No. Many businesses without ads should not run them because their customers do not search or their margins are too thin. Clinics, home services, coaching, real estate, online stores and B2B firms are where ads usually pay." },
    { q: "How do email marketing agencies find leads?", a: "Look for businesses with repeat customers and no email tool — for example Shopify stores with no email or SMS marketing app installed — and offer to set up basic flows such as abandoned cart, welcome and repeat purchase." },
    { q: "How should a PPC agency price new clients?", a: "A fixed-price setup for tracking and the first campaigns, followed by a monthly management fee that is flat for small accounts or tied to spend bands for larger ones. Keep ad spend clearly separate from your fee." },
  ],
  links: [
    HUB,
    ["/resources/why-tech-stack-filtering-misses-your-best-prospects", "why tech-stack filtering misses prospects"],
    ["/resources/cold-email-for-local-businesses-when-it-works", "when cold email works for local businesses"],
    ["/resources/whatsapp-outreach-local-business-india", "WhatsApp outreach to local businesses"],
    ["/resources/how-to-get-graphic-design-clients", "finding graphic design and branding clients"],
    ["/leads/website-development/in/indore", "businesses listed in Indore"],
  ],
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
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
