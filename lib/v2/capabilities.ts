/**
 * The capability registry (2026-10-26, Tarun: "hum bas facilitator banein — nayi API, naya scraper
 * yahan dein, agent khud chune").
 *
 * Everything Mantis can DO to find or enrich a business is one entry here: what it is, what it needs,
 * what it yields, what it costs, where it works and where it doesn't. The orchestrator
 * (lib/v2/orchestrator.ts) reads this text and decides which to use, in what order, for each ask —
 * it is not a switch in code. Adding a source = adding an entry (plus its runner op), never a new
 * branch in the planner.
 *
 * Costs are stated in the unit the user pays (credits) or we pay (USD), measured where we have data
 * (lib/credits/pricing.ts, v2_source_attempts). Coverage notes are facts, not marketing.
 */
import { CREDIT_COST } from "@/lib/credits/pricing";
import { SIGNALS, type SignalId } from "./playbooks";

export type CapabilityKind = "source" | "enricher" | "signal_family";

export type Capability = {
  id: string;
  kind: CapabilityKind;
  label: string;
  /** What it does, one or two sentences the model can reason from. */
  what: string;
  /** What it needs to run (inputs) and what it produces. */
  needs: string;
  produces: string;
  /** Cost per unit, in the terms that matter (credits to the user; USD to us). */
  cost: string;
  /** Where it works well / badly — measured where possible. */
  coverage: string;
  /** Rough latency per unit. */
  speed: string;
  /** The runner strategy / op this maps to (what the orchestrator may emit). */
  strategy?: string;
};

/** Discovery sources — the ways a candidate business enters a run. */
export const SOURCES: Capability[] = [
  { id: "maps_saved", kind: "source", label: "Saved map businesses (primary)", strategy: "primary",
    what: "Businesses already in the Mantis index for the asked Google Maps place types, around the asked area (12 km pool). Includes a live Maps search of the exact area for the first type when the day's free allowance allows.",
    needs: "One or more real Google place types and a geocoded area.", produces: "Name, category, phone (most), rating/reviews, website URL (about 40% of those that have one), coordinates.",
    cost: `Saved rows are free; a live map search is ${CREDIT_COST.billed_places_call} credits per tile after the daily allowance.`,
    coverage: "Strong for local trades in Indian metros and tier-2 cities, UK/US/AU/AE cities; weak for anything not on Maps (SaaS, importers, B2B firms). India: ~2.5 lakh checked listings.",
    speed: "Instant (DB); live search a few seconds." },
  { id: "maps_wide", kind: "source", label: "Same type, wider area", strategy: "wide",
    what: "The same place types across a 25 km radius of saved businesses.", needs: "Place types + area.", produces: "Same fields as maps_saved.",
    cost: "Free (saved rows only).", coverage: "Good second step when the exact area runs short; quality drops at the edges (neighbouring cities).", speed: "Instant." },
  { id: "maps_adjacent", kind: "source", label: "Related business types", strategy: "adjacent",
    what: "Neighbouring place types the planner named as related (e.g. dental_clinic for dentist).", needs: "adjacentTypes on the plan.", produces: "Same fields as maps_saved.",
    cost: "Free.", coverage: "Useful when the asked type is narrow; risky when the related type is a different buyer.", speed: "Instant." },
  { id: "name_match", kind: "source", label: "Businesses whose name matches", strategy: "names",
    what: "Saved businesses whose NAME contains the trade words ('jewellers', 'exports') regardless of place type.", needs: "Trade words.", produces: "Same fields as maps_saved.",
    cost: "Free.", coverage: "Only way to reach trades Maps has no type for (exporters, manufacturers of X); noisy on generic words (cafe, hotel) — measured as the top-yield strategy by raw count but weaker on fit.", speed: "Instant." },
  { id: "registry", kind: "source", label: "Mantis registry (crawled companies)", strategy: "registry",
    what: "Companies Mantis has already crawled (scrape_domains): website read, emails on file. Mostly agencies, SaaS, exporters, B2B firms — not local shops.", needs: "Trade words.", produces: "Company, website, emails (already found), category.",
    cost: "Free.", coverage: "~8 lakh domains; biased to web/IT/marketing agencies and B2B; emails already attached for most. Low yield per query (~15 kept on average) but every row is reachable.", speed: "Instant." },
  { id: "web_search", kind: "source", label: "Web search for companies (Exa)", strategy: "web_search",
    what: "A web search per trade for companies and products that are not on Maps (SaaS, importers, B2B services, brands); directory and listicle pages are dropped and a model keeps only real businesses.", needs: "Trade words (and a place to bias toward).", produces: "Company name, website, sometimes LinkedIn.",
    cost: "About $0.015 per search to us (cached 30 days); no user credits beyond the lead price.", coverage: "The right first step for products/SaaS/B2B; ~29 companies kept per search on average; results need their website read before anything is known about them.", speed: "2–4 s per search." },
  { id: "funding_news", kind: "source", label: "Funding news — startups that raised money", strategy: "funding_news",
    what: "Reads funding-round news (Exa, last 4 years) and extracts the companies that raised, with round, amount, date, investors and city.", needs: "A place (India / a city) and optionally what kind of startup.", produces: "Startup, website (resolved), round, amount, date, investors, city; signals funded / funded_recent / raise_due.",
    cost: "Several Exa searches (~$0.1 per run) plus a cheap model extract.", coverage: "India well covered; best for anyone selling to funded startups (recruiters, SaaS, agencies, CA/CFO firms, M&A advisors). ~40 startups per run.", speed: "20–40 s." },
  { id: "gosom_bulk", kind: "source", label: "Bulk map sweep (gosom box) — batch, not per run",
    what: "A self-hosted Google Maps sweep that can load thousands of businesses of given categories for a whole city into the saved index overnight (fast mode: name, category, address, phone 83%, website 47%, rating). It is how the saved map pool for a city is built in the first place.",
    needs: "City + categories; runs on the scraper box, minutes to hours.", produces: "Saved map businesses (then usable by maps_saved).",
    cost: "Free (own box); not callable inside a chat run.", coverage: "Any city; use it when the saved pool for a city is empty (counts say 0) — the orchestrator should say so rather than pretend a live search will cover a whole city.", speed: "Offline / batch." },
  { id: "careers_scraper", kind: "source", label: "Careers-page scraper (companies that are hiring)",
    what: "Crawls company careers pages by category to find open roles — the source behind the jobs index; for leads it yields companies that are hiring right now with the roles named.", needs: "Category allowlist + city.", produces: "Companies hiring, roles, apply links.",
    cost: "Free (own crawler, batch).", coverage: "24 business types with usable careers pages; weak for small local shops.", speed: "Batch." },
  { id: "github", kind: "source", label: "Developer profiles (GitHub)", strategy: "github",
    what: "Developers and dev shops in a city from GitHub profiles that link their own website.", needs: "City.", produces: "Person/company, website, GitHub handle.",
    cost: "Free API (rate-limited).", coverage: "Only for asks about developers / dev agencies; ~50 per city.", speed: "A few seconds." },
];

/** Enrichers — what can be learned about a candidate after it is found. */
export const ENRICHERS: Capability[] = [
  { id: "site_read", kind: "enricher", label: "Website read (self-hosted reader)",
    what: "Fetches the business's website and reads it: tech signals (analytics, pixels, booking, HTTPS, mobile, CMS, copyright year), pages (careers, menu, admissions, store), emails on the pages, named people, social links, hiring, security and DNS checks.",
    needs: "A website URL that is the business's own (not Facebook/JustDial).", produces: "All 'site' signals, emails graded tier 1 (named person) / role / generic, decision-maker name+role when the site names one, socials, WhatsApp number from wa.me links.",
    cost: "Free (own infrastructure); ~1–3 s per site. Results are stored and reused for 60 days by every run.",
    coverage: "~25% of sites are down or block reading; ~50% of readable sites yield an email. Without a URL nothing here is possible.", speed: "1–3 s per site, 32 in parallel." },
  { id: "place_details", kind: "enricher", label: "Website address lookup (Google Place Details)",
    what: "For a saved Maps business that is known to have a website but whose URL isn't stored, fetches the URL from Google.", needs: "Place id.", produces: "Website URL (then site_read can run).",
    cost: "About $0.017 per lookup to us; capped at 80 lookups per run.", coverage: "87% success measured (370/426). The only way to turn 'has a website' into a readable site for bulk-loaded leads.", speed: "~0.3 s." },
  { id: "registry_emails", kind: "enricher", label: "Registry emails",
    what: "Emails already on file for the business's domain from earlier crawls.", needs: "Domain.", produces: "Up to 3 emails per domain, with tier.", cost: "Free.", coverage: "Mostly agencies/B2B domains.", speed: "Instant." },
  { id: "decision_maker", kind: "enricher", label: "Decision-maker + LinkedIn (site, then Exa)",
    what: "Finds the founder / concerned person and their LinkedIn: from the website first, else a web search.", needs: "Company name, domain, city.", produces: "Name, role, LinkedIn URL.",
    cost: "Exa ~$0.006 per lookup when the site didn't name anyone.", coverage: "83% success measured (130/157).", speed: "~1.6 s." },
  { id: "apollo_person", kind: "enricher", label: "Personal email via Apollo",
    what: "For a named decision-maker, their verified work email (and sometimes phone) from Apollo People Match.", needs: "Person name + company domain.", produces: "Email with verification status, phone.",
    cost: "Apollo credits per match (paid); used only when the site gave no personal email.", coverage: "Best for companies with LinkedIn presence; weak for tiny local shops.", speed: "~1 s." },
  { id: "hiring_read", kind: "enricher", label: "Hiring reader (careers page → open roles → needs)",
    what: "Reads the business's careers/jobs page: open roles, how many, which functions. Rules turn roles into needs (sales hires → needs CRM / lead data; tech hires → needs dev agency / IT; chef or outlet-manager hires → opening a new outlet; marketing hires → needs an agency).",
    needs: "Website with a careers page (found by site_read).", produces: "hiring, roles, derived needs (needs_crm, needs_staffing, needs_dev_agency, needs_marketing_agency, new_outlet, needs_logistics…).",
    cost: "Free (own reader).", coverage: "~27% of readable sites have a careers page; small local shops rarely do. Runs automatically in any run whose plan reads websites.", speed: "With the site read." },
  { id: "site_extra", kind: "enricher", label: "Site extras: security, forms, SSL, DNS",
    what: "Deeper read of the site: enquiry/contact forms and whether they actually submit anywhere (mailto-only / dead handler), exposed API keys in front-end code (type only, never the value), security headers, CMS version, SSL expiry, SPF/DMARC on the email domain, booking engine present.",
    needs: "Website.", produces: "form_no_backend, has_enquiry_form, exposed_secret, weak_security_headers, outdated_cms, ssl_expired/expiring, no_spf, no_dmarc, booking engine name.",
    cost: "Free.", coverage: "Any readable site; runs automatically with the site read.", speed: "With the site read (+1 DNS lookup)." },
  { id: "social_stats", kind: "enricher", label: "Social profile stats (Instagram, YouTube, LinkedIn)",
    what: "Follower / post / last-upload counts for the profiles the site links to.", needs: "Social links from the site read.", produces: "weak_instagram, quiet_youtube, follower counts.",
    cost: "Free (public pages; may be rate-limited).", coverage: "Only businesses whose site links a profile. Runs when the plan's playbook is social-weak.", speed: "1–2 s per profile." },
  { id: "ads_activity", kind: "enricher", label: "Ad activity (Meta Ad Library, Google Ads Transparency)",
    what: "Whether the business is currently running Meta ads or Google ads, from the public ad libraries.", needs: "Business name / Facebook page; domain for Google.", produces: "meta_ads_active, google_ads_active (true / false / unknown).",
    cost: "Free, but both readers depend on undocumented pages and return unknown when they break.", coverage: "Runs for marketing/ads sellers (no-tracking or social-weak playbooks, or the seller needs marketing).", speed: "2–4 s." },
  { id: "gbp_profile", kind: "enricher", label: "Google listing details (hours, reviews, attributes)",
    what: "The business's Google listing in full: opening hours, review texts, attributes — for reputation and local-SEO sellers.", needs: "Place id.", produces: "Review themes, missing hours, listing completeness.",
    cost: "About $0.02 per listing to us.", coverage: "Any Maps business. Runs for weak-reviews / local-SEO sellers only.", speed: "~0.5 s." },
  { id: "food_delivery", kind: "enricher", label: "Delivery-app presence (Zomato / Swiggy)",
    what: "Whether a restaurant is listed on delivery apps and how it rates there.", needs: "Restaurant name + city.", produces: "on_zomato / on_swiggy, app rating.",
    cost: "One Exa search (~$0.006).", coverage: "Food businesses in India; runs for food / kitchen / new-outlet sellers.", speed: "~2 s." },
  { id: "ota_listings", kind: "enricher", label: "OTA presence (MakeMyTrip, Booking.com…)",
    what: "Whether a hotel sells through online travel agencies and at what rating.", needs: "Hotel name + city.", produces: "ota_listed, which OTAs, rating.",
    cost: "One Exa search.", coverage: "Hotels / guest houses; runs for hotel-tech sellers (booking engine, channel manager).", speed: "~2 s." },
  { id: "derived_needs", kind: "enricher", label: "Derived needs (rules over facts)",
    what: "Turns facts into what the business probably needs to buy: e.g. hiring sales → CRM and lead data; new outlet → refrigeration, POS, signage; no analytics → SEO/marketing; dead enquiry form → website work. Leads are then matched to what the SELLER sells (seller needs).",
    needs: "Facts from the reads above.", produces: "needs_* signals with a confidence, used for ranking and the 'why this lead' line.",
    cost: "Free.", coverage: "Every lead with facts; the rules are code (lib/v2/signals/rules.ts) and grow with outcomes.", speed: "Instant." },
  { id: "size_fit", kind: "enricher", label: "Size and area judge (model)",
    what: "Judges each candidate's company size tier and whether it is really in the asked area, so a small seller is not shown national chains.", needs: "Candidate facts.", produces: "Size tier, in-area flag, fit score.", cost: "A cheap model call per batch.", coverage: "Always available.", speed: "Fast." },
];

/** Signal families — what a website/listing can tell us, grouped by what they are evidence of. */
export const SIGNAL_FAMILIES: Capability[] = [
  { id: "sig_no_website", kind: "signal_family", label: "No / fake website", what: "No website on the listing, a social page or directory as 'website', or a dead site.", needs: "Listing only (no read needed).", produces: SIGNALS.no_website.label + ", " + SIGNALS.social_as_website.label + ", " + SIGNALS.site_down.label, cost: "Free.", coverage: "India ~40% of local businesses; US/UK a few %.", speed: "Instant." },
  { id: "sig_dated_site", kind: "signal_family", label: "Dated / weak website", what: "Old copyright, no HTTPS, not mobile-ready, outdated CMS, weak security headers.", needs: "site_read.", produces: "old_copyright, no_https, no_mobile, outdated_cms, weak_security_headers, ssl_*", cost: "Free.", coverage: "~10% old_copyright, ~7% no_https among readable sites.", speed: "With the read." },
  { id: "sig_no_tracking", kind: "signal_family", label: "No tracking / not advertising", what: "No analytics, no Meta pixel, no Google Ads tag.", needs: "site_read.", produces: "no_analytics, no_meta_pixel, no_google_ads, no_ad_pixel", cost: "Free.", coverage: "~45% no analytics, ~80% no pixel among readable sites.", speed: "With the read." },
  { id: "sig_site_features", kind: "signal_family", label: "Site features present / missing", what: "Booking, menu, admissions, careers, store, login, enquiry form (and forms that go nowhere).", needs: "site_read.", produces: "has_booking, no_booking, has_menu, has_admissions, has_careers, has_online_store, has_login, has_enquiry_form, form_no_backend", cost: "Free.", coverage: "Readable sites.", speed: "With the read." },
  { id: "sig_growth", kind: "signal_family", label: "Growth signals", what: "Hiring now (open roles), several branches, established (100+ reviews), raised funding / next round due.", needs: "site_read for hiring; listing for branches/reviews; funding_news for rounds.", produces: "hiring, multi_location, established, funded, funded_recent, raise_due", cost: "Free except funding (Exa).", coverage: "Hiring ~27% of readable sites have a careers page.", speed: "With the read / source." },
  { id: "sig_social", kind: "signal_family", label: "Social presence", what: "No or weak Instagram, no social links, YouTube gone quiet, WhatsApp on site.", needs: "site_read (+ social stats fetch).", produces: "no_social, no_instagram, weak_instagram, quiet_youtube, has_whatsapp", cost: "Free.", coverage: "Readable sites.", speed: "With the read." },
  { id: "sig_reputation", kind: "signal_family", label: "Reviews / reputation", what: "Few reviews, low rating.", needs: "Listing only.", produces: "few_reviews, low_rating", cost: "Free.", coverage: "Every Maps business.", speed: "Instant." },
  { id: "sig_needs", kind: "signal_family", label: "Derived needs (what they'd buy)", what: "Needs inferred from facts: needs_crm, needs_lead_data, needs_staffing, needs_payroll, needs_dev_agency, needs_it_hardware, needs_marketing_agency, needs_social_media, needs_local_seo, needs_logistics, new_outlet.", needs: "hiring_read / site_read / listing facts.", produces: "needs_* with confidence", cost: "Free.", coverage: "Any lead with facts.", speed: "Instant." },
  { id: "sig_ads", kind: "signal_family", label: "Advertising activity", what: "Running Meta or Google ads right now (or not) from the public ad libraries.", needs: "ads_activity.", produces: "meta_ads_active, google_ads_active", cost: "Free.", coverage: "Marketing-seller runs.", speed: "2–4 s." },
  { id: "sig_marketplace", kind: "signal_family", label: "Marketplace presence", what: "Listed on Zomato/Swiggy (restaurants) or OTAs (hotels), with ratings there.", needs: "food_delivery / ota_listings.", produces: "on_zomato, on_swiggy, ota_listed", cost: "Exa search each.", coverage: "Food / hotel runs.", speed: "~2 s." },
  { id: "sig_security", kind: "signal_family", label: "Security and hygiene", what: "Exposed secrets in front-end code, expired/expiring SSL, weak headers, outdated CMS, dead enquiry forms.", needs: "site_extra.", produces: "exposed_secret, ssl_expired, ssl_expiring, weak_security_headers, outdated_cms, form_no_backend", cost: "Free.", coverage: "Readable sites.", speed: "With the read." },
  { id: "sig_email_hygiene", kind: "signal_family", label: "Email domain hygiene", what: "Missing SPF/DMARC on the business's email domain.", needs: "Domain.", produces: "no_spf, no_dmarc", cost: "Free (DNS).", coverage: "Any domain.", speed: "Instant." },
];

export const CAPABILITIES: Capability[] = [...SOURCES, ...ENRICHERS, ...SIGNAL_FAMILIES];
export const CAPABILITY_BY_ID = new Map(CAPABILITIES.map((c) => [c.id, c]));
export const STRATEGY_CAPABILITY = new Map(SOURCES.filter((s) => s.strategy).map((s) => [s.strategy!, s]));
export const ALL_STRATEGIES = SOURCES.map((s) => s.strategy!).filter(Boolean);

/** The registry as the orchestrator reads it — compact, one line per capability. */
export function capabilitiesForPrompt(kinds: CapabilityKind[] = ["source", "enricher", "signal_family"]): string {
  const block = (title: string, rows: Capability[]) =>
    `${title}:\n` + rows.map((c) => `- ${c.strategy ? `[${c.strategy}] ` : ""}${c.label}: ${c.what} Needs: ${c.needs} Gives: ${c.produces} Cost: ${c.cost} Coverage: ${c.coverage}`).join("\n");
  const parts: string[] = [];
  if (kinds.includes("source")) parts.push(block("SOURCES (how candidates are found; [strategy] is what you emit)", SOURCES));
  if (kinds.includes("enricher")) parts.push(block("ENRICHERS (what can be learned about a candidate)", ENRICHERS));
  if (kinds.includes("signal_family")) parts.push(block("SIGNALS (evidence a business needs something)", SIGNAL_FAMILIES));
  return parts.join("\n\n");
}

/** A signal id → the family it belongs to (for memory and reasoning text). */
export function familyOf(signal: SignalId): string | null {
  return SIGNAL_FAMILIES.find((f) => f.produces.split(/,\s*/).includes(signal))?.id ?? null;
}
