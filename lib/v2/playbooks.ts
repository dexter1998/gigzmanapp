/**
 * Signal catalog + playbooks (docs/v2-plan.md §5, §6.3). A playbook is data in git: which signals
 * fit a service, and where each signal comes from. The Planner chooses from this list only, so it
 * can never ask for a signal we cannot actually measure — production chats were full of the model
 * offering "outdated websites" when nothing measured them.
 *
 * Learning stays out of these files: yield comes from v2_run_steps grouped by playbook_id.
 */

export type SignalId =
  | "no_website" | "social_as_website" | "no_https" | "no_mobile" | "old_copyright"
  | "no_analytics" | "no_ad_pixel" | "no_meta_pixel" | "no_google_ads" | "no_booking" | "site_down"
  | "few_reviews" | "low_rating" | "established"
  // Positive evidence read off the site: something it visibly offers (absent = not visible, not "doesn't have").
  | "has_booking" | "has_menu" | "has_admissions" | "has_careers" | "has_portfolio" | "has_locations"
  | "has_online_store" | "has_login" | "has_contact_form"
  // Business-state signals (2026-10-22): what is happening to the company, not to its website.
  | "hiring" | "no_social" | "no_instagram" | "weak_instagram" | "quiet_youtube"
  | "funded" | "funded_recent" | "raise_due" | "multi_location"
  // Website extras + public profiles (signals/site-extra.ts, signals/profiles.ts).
  | "form_no_backend" | "has_enquiry_form" | "exposed_secret" | "ssl_expired" | "ssl_expiring" | "weak_security_headers" | "outdated_cms"
  | "no_dmarc" | "no_spf" | "no_blog" | "blog_stale" | "seo_basics_missing" | "coming_soon" | "exporter" | "shop_no_reviews_app" | "shop_no_email_app"
  | "offer_match" | "runs_meta_ads" | "runs_google_ads" | "runs_ads" | "gbp_incomplete" | "gbp_new_listing" | "new_restaurant"
  | "no_booking_engine" | "ota_dependent" | "swiggy_delivery_not_found";

/** `data` signals are read from `leads` in SQL; `site` signals need the business's own page (and the
 *  profiles it links); `news` signals come from funding news (Exa — billed, so only when asked). */
export const SIGNALS: Record<SignalId, { label: string; source: "data" | "site" | "news"; why: string }> = {
  // "listed": Maps having no website field is not proof the business has none.
  no_website:        { label: "No website listed",       source: "data", why: "No website on its Google listing (it may still have one)" },
  social_as_website: { label: "Social page as website",  source: "data", why: "Website is a Facebook/Instagram page or a directory listing (Practo, JustDial…)" },
  no_https:          { label: "No HTTPS",                source: "site", why: "Site loads without a secure connection" },
  no_mobile:         { label: "Not mobile-ready",        source: "site", why: "No mobile viewport tag" },
  old_copyright:     { label: "Old website",             source: "site", why: "Copyright year is 3+ years old" },
  no_analytics:      { label: "No analytics",            source: "site", why: "No Google Analytics/Tag Manager" },
  no_ad_pixel:       { label: "No ad pixel",             source: "site", why: "Neither a Meta pixel nor a Google Ads tag" },
  no_meta_pixel:     { label: "No Meta pixel",           source: "site", why: "No Meta (Facebook/Instagram) pixel — not running tracked Meta ads" },
  no_google_ads:     { label: "No Google Ads tag",       source: "site", why: "No Google Ads conversion tag" },
  no_booking:        { label: "No online booking",       source: "site", why: "No booking widget or appointment link" },
  site_down:         { label: "Website down",            source: "site", why: "Listed site does not load" },
  few_reviews:       { label: "Few reviews",             source: "data", why: "Under 30 Google reviews" },
  low_rating:        { label: "Low rating",              source: "data", why: "Rated below 4.0" },
  established:       { label: "Established",             source: "data", why: "100+ reviews — busy, can pay" },
  has_booking:       { label: "Online booking",          source: "site", why: "Booking / appointment link on the site" },
  has_menu:          { label: "Online menu",             source: "site", why: "Menu or online ordering on the site" },
  has_admissions:    { label: "Admissions page",         source: "site", why: "Admissions / apply link on the site" },
  has_careers:       { label: "Careers page",            source: "site", why: "Careers / jobs page — hiring" },
  has_portfolio:     { label: "Portfolio",               source: "site", why: "Portfolio, projects or gallery page" },
  has_locations:     { label: "Multiple locations",      source: "site", why: "Locations / branches page" },
  has_online_store:  { label: "Online store",            source: "site", why: "Cart / online shop on the site" },
  has_login:         { label: "Customer login",          source: "site", why: "Login or customer/patient portal" },
  has_contact_form:  { label: "Contact form",            source: "site", why: "Enquiry form on the homepage" },
  hiring:            { label: "Hiring now",              source: "site", why: "Open roles on its careers page or job board — growing, has budget; the roles say what it will buy" },
  no_social:         { label: "No social profiles",      source: "site", why: "Website links no Instagram/Facebook/LinkedIn/YouTube" },
  no_instagram:      { label: "No Instagram",            source: "site", why: "Website links no Instagram profile" },
  weak_instagram:    { label: "Weak Instagram",          source: "site", why: "Instagram under 1,000 followers or under 30 posts" },
  quiet_youtube:     { label: "YouTube gone quiet",      source: "site", why: "No new YouTube video in 90+ days" },
  funded:            { label: "Raised funding",          source: "news", why: "A funding round reported in the news (last 4 years)" },
  funded_recent:     { label: "Raised in last 12 months", source: "news", why: "Fresh money — spending on hiring, tools and marketing" },
  raise_due:         { label: "Next round due",          source: "news", why: "Last round 12–30 months ago — usually preparing the next raise" },
  multi_location:    { label: "Several branches",        source: "data", why: "Two or more Google listings under the same name — expanding" },
  form_no_backend:   { label: "Enquiry form goes nowhere", source: "site", why: "Its enquiry form is mailto-only or has no working handler — enquiries are being lost" },
  has_enquiry_form:  { label: "Enquiry form",            source: "site", why: "Has an enquiry / contact form" },
  exposed_secret:    { label: "Credential exposed",      source: "site", why: "A secret key or password is visible in the site's public code (type only — the value is never stored)" },
  ssl_expired:       { label: "SSL expired",             source: "site", why: "The HTTPS certificate has expired" },
  ssl_expiring:      { label: "SSL expiring soon",       source: "site", why: "The HTTPS certificate expires within 3 weeks" },
  weak_security_headers: { label: "Weak security headers", source: "site", why: "3+ of HSTS, CSP, X-Frame-Options, X-Content-Type-Options missing" },
  outdated_cms:      { label: "Outdated CMS",            source: "site", why: "WordPress < 6, Joomla < 4 or Drupal < 9 (from its generator tag)" },
  no_dmarc:          { label: "No DMARC",                source: "site", why: "Its email domain has no DMARC record — spoofable, poorer deliverability" },
  no_spf:            { label: "No SPF",                  source: "site", why: "Its email domain has no SPF record" },
  no_blog:           { label: "No blog",                 source: "site", why: "No blog / articles section" },
  blog_stale:        { label: "Blog gone quiet",         source: "site", why: "Newest blog post is 6+ months old" },
  seo_basics_missing:{ label: "SEO basics missing",      source: "site", why: "2+ of title, meta description, H1, schema missing on the homepage" },
  coming_soon:       { label: "Coming soon / just opened", source: "site", why: "Site says coming soon, opening soon or now open" },
  exporter:          { label: "Exporter",                source: "site", why: "IEC number or export / worldwide-shipping text on the site" },
  shop_no_reviews_app: { label: "Store: no reviews app", source: "site", why: "Shopify store with no product-reviews app" },
  shop_no_email_app: { label: "Store: no email marketing", source: "site", why: "Shopify store with no email / SMS marketing app" },
  offer_match:       { label: "Sells what you asked",    source: "site", why: "Its own products / services page names the asked-for products" },
  runs_meta_ads:     { label: "Running Meta ads",        source: "site", why: "Active ads in Meta's Ad Library" },
  runs_google_ads:   { label: "Running Google ads",      source: "site", why: "Ads shown in the last 30 days (Google Ads Transparency)" },
  runs_ads:          { label: "Running ads",             source: "site", why: "Active Meta or Google ads — has a marketing budget" },
  gbp_incomplete:    { label: "Google listing incomplete", source: "site", why: "Google listing missing hours, under 5 photos or no website" },
  gbp_new_listing:   { label: "New Google listing",      source: "site", why: "5 or fewer reviews, the first one recent — newly opened" },
  new_restaurant:    { label: "New on delivery apps",    source: "site", why: "Zomato / Swiggy page says newly opened" },
  no_booking_engine: { label: "No booking engine",       source: "site", why: "Hotel website has no direct booking engine" },
  ota_dependent:     { label: "OTA-dependent",           source: "site", why: "Listed on OTAs but no booking engine of its own — paying commission on every booking" },
  swiggy_delivery_not_found: { label: "Not on Swiggy delivery", source: "site", why: "No Swiggy delivery page found (absence is not proof)" },
};

export type Playbook = {
  id: string;
  /** What the USER sells — matched against the Planner's `service`. */
  sells: string[];
  label: string;
  /** Any of these makes a row a match; more matches rank higher. */
  signals: SignalId[];
  /** Rows without a website are only useful when the playbook says so. */
  needsWebsite: boolean;
  tier: "A" | "B";
  /** false = the signals rank results but don't filter them: a restaurant that isn't visibly
   *  expanding still buys refrigeration. Absent = the signals are the point (no website, funding). */
  gate?: boolean;
};

export const PLAYBOOKS: Playbook[] = [
  { id: "no-website-local", sells: ["website", "web development", "web design"], label: "No website", signals: ["no_website", "social_as_website", "site_down"], needsWebsite: false, tier: "A" },
  { id: "dated-website", sells: ["website redesign", "web development", "web design", "website"], label: "Dated website", signals: ["no_https", "no_mobile", "old_copyright", "site_down"], needsWebsite: true, tier: "B" },
  { id: "weak-reviews", sells: ["local seo", "seo", "reputation management", "review management", "google business profile"], label: "Weak reviews", signals: ["few_reviews", "low_rating"], needsWebsite: false, tier: "A" },
  { id: "no-tracking", sells: ["seo", "digital marketing", "analytics", "google ads", "meta ads", "performance marketing", "social media marketing"], label: "No tracking or ads", signals: ["no_analytics", "no_meta_pixel", "no_google_ads"], needsWebsite: true, tier: "B" },
  // What a site visibly offers — required signals like "with online booking" resolve here.
  { id: "site-features", sells: ["saas", "software", "crm", "marketing", "integration"], label: "What the site offers",
    signals: ["has_booking", "has_menu", "has_admissions", "has_careers", "has_portfolio", "has_locations", "has_online_store", "has_login", "has_contact_form"], needsWebsite: true, tier: "B" },
  // Business-state playbooks: who is growing, raising or under-served on social — any seller can use these.
  { id: "hiring-growth", sells: ["hr", "recruitment", "staffing", "payroll", "hrms", "office space", "coworking", "interior", "it hardware", "laptops", "training", "corporate gifting", "insurance", "background verification", "saas", "accounting", "ca"],
    label: "Hiring / growing", signals: ["hiring"], needsWebsite: true, tier: "A", gate: false },
  { id: "social-weak", sells: ["social media marketing", "social media management", "content", "instagram marketing", "influencer marketing", "video production", "branding", "youtube"],
    label: "Weak social presence", signals: ["no_social", "no_instagram", "weak_instagram", "quiet_youtube"], needsWebsite: true, tier: "A" },
  { id: "funded-startups", sells: ["fundraising", "fundraising advisory", "investment banking", "m&a", "venture capital", "startup legal", "virtual cfo", "pitch deck", "startup recruitment", "saas for startups"],
    label: "Funded startups", signals: ["funded_recent", "raise_due", "funded"], needsWebsite: false, tier: "A" },
  { id: "expanding", sells: ["commercial refrigeration", "kitchen equipment", "pos", "interiors", "signage", "furniture", "security systems", "cctv", "hvac", "uniforms", "packaging"],
    label: "Expanding (branches / hiring)", signals: ["multi_location", "has_locations", "hiring"], needsWebsite: false, tier: "B", gate: false },
  { id: "security-gaps", sells: ["cybersecurity", "vapt", "security audit", "it services", "managed it", "website maintenance", "ssl"],
    label: "Security gaps", signals: ["exposed_secret", "ssl_expired", "ssl_expiring", "outdated_cms", "weak_security_headers"], needsWebsite: true, tier: "A" },
  { id: "email-domain-gaps", sells: ["email deliverability", "google workspace", "microsoft 365", "email setup", "it services"],
    label: "Email domain gaps", signals: ["no_dmarc", "no_spf"], needsWebsite: true, tier: "B" },
  { id: "seo-gaps", sells: ["seo", "content marketing", "blog writing", "content"], label: "SEO / content gaps", signals: ["seo_basics_missing", "blog_stale", "no_blog"], needsWebsite: true, tier: "B" },
  { id: "lead-capture", sells: ["crm", "chatbot", "whatsapp automation", "lead management", "forms", "marketing automation"],
    label: "Losing enquiries", signals: ["form_no_backend"], needsWebsite: true, tier: "A" },
  { id: "ads-active", sells: ["performance marketing", "cro", "landing pages", "ad creative", "meta ads", "google ads", "ppc"],
    label: "Running ads", signals: ["runs_ads", "runs_meta_ads", "runs_google_ads"], needsWebsite: true, tier: "A" },
  { id: "d2c-gaps", sells: ["shopify apps", "email marketing", "klaviyo", "reviews", "d2c", "retention"],
    label: "Store gaps", signals: ["shop_no_email_app", "shop_no_reviews_app"], needsWebsite: true, tier: "B" },
  { id: "new-business", sells: ["ca", "insurance", "website", "branding", "interior", "furniture", "pos", "kitchen equipment", "refrigeration"],
    label: "Just opened", signals: ["coming_soon", "gbp_new_listing", "new_restaurant"], needsWebsite: false, tier: "A", gate: false },
  { id: "hotel-direct", sells: ["hotel booking engine", "channel manager", "hotel website", "revenue management", "hospitality software"],
    label: "OTA-dependent hotels", signals: ["ota_dependent", "no_booking_engine"], needsWebsite: true, tier: "A" },
  { id: "exporters", sells: ["freight", "export", "customs", "export finance", "logistics", "trade data"], label: "Exporters", signals: ["exporter"], needsWebsite: true, tier: "B" },
  { id: "no-booking", sells: ["booking software", "appointment software", "crm", "clinic software", "salon software", "chatbot", "whatsapp automation"], label: "No online booking", signals: ["no_booking"], needsWebsite: true, tier: "B" },
];

/**
 * Signals that can't both be shown: positive evidence (booking seen) beats the absence check, and
 * the combined "no ad pixel" is redundant next to the per-network ones.
 */
export function consistentSignals(keys: string[]): string[] {
  const has = new Set(keys);
  return keys.filter((k) => !(k === "no_booking" && has.has("has_booking")) && !(k === "no_ad_pixel" && (has.has("no_meta_pixel") || has.has("no_google_ads"))));
}

/** Which playbook carries a signal — so a required signal always has a playbook that reads it. */
export function playbookForSignal(sig: SignalId): Playbook | undefined {
  return PLAYBOOKS.find((p) => p.signals.includes(sig));
}

export function playbookById(id: string): Playbook | undefined {
  return PLAYBOOKS.find((p) => p.id === id);
}

/** Catalog text for the Planner prompt — the only signals and playbooks it may choose. */
export function catalogForPrompt(): string {
  return [
    "PLAYBOOKS (id: sells → signals):",
    ...PLAYBOOKS.map((p) => `- ${p.id}: ${p.sells.join(", ")} → ${p.signals.map((s) => SIGNALS[s].label).join(", ")}`),
    "SIGNALS: " + (Object.keys(SIGNALS) as SignalId[]).map((s) => `${s} (${SIGNALS[s].why})`).join("; "),
  ].join("\n");
}

// Social pages and directory listings (a Practo profile, a JustDial page) are someone else's site:
// the business has no site of its own, which is the signal, and there is nothing of theirs to read.
// Shorteners and content sites too: a listing whose "website" was bit.ly or buzzfeed.com had Bitly's
// careers page read as the business hiring (production test I-08).
// Matched on the HOST only (2026-10-31): the old pattern ran over the whole URL, so `x\.com\/` flagged
// apex.com and dropbox.com, `booking\.com` flagged tablebooking.com, `housing\.com` flagged sunhousing.com,
// and any real site with "facebook.com" in its path counted as a social page. It also missed fb.me,
// instagr.am, wa.link, t.me and link-in-bio pages. One list now feeds the JS check and the SQL filters.
export const NOT_OWN_SITE_HOSTS = [
  "bit.ly", "tinyurl.com", "goo.gl", "g.page", "rebrand.ly", "cutt.ly", "shorturl.at", "buzzfeed.com", "wikipedia.org", "google.com",
  "facebook.com", "fb.com", "fb.me", "instagram.com", "instagr.am", "linktr.ee", "linkin.bio", "bio.link", "beacons.ai", "taplink.cc",
  "wa.me", "wa.link", "whatsapp.com", "t.me", "business.site", "justdial.com", "jsdl.in", "indiamart.com", "practo.com", "zomato.com",
  "swiggy.com", "sulekha.com", "tripadvisor.com", "tripadvisor.in", "booking.com", "makemytrip.com", "lybrate.com", "magicbricks.com",
  "99acres.com", "housing.com", "urbanclap.com", "urbancompany.com", "youtube.com", "youtu.be", "linkedin.com", "twitter.com", "x.com",
];
const HOSTS_RE = NOT_OWN_SITE_HOSTS.map((h) => h.replace(/\./g, "\\.")).join("|");
/** Host = one of the list, or a subdomain of it (m.facebook.com, sites.google.com). */
export const NOT_OWN_SITE = new RegExp(`^(?:[a-z][a-z0-9+.-]*:\\/\\/)?(?:[^/?#@]*@)?(?:[a-z0-9-]+\\.)*(?:${HOSTS_RE})(?::\\d+)?(?:[/?#]|$)`, "i");
/** The same test for Postgres `~*` (website_url). */
export const NOT_OWN_SITE_SQL = `^([a-z][a-z0-9+.-]*://)?([a-z0-9-]+\\.)*(${HOSTS_RE})(:[0-9]+)?([/?#]|$)`;
const SOCIAL = NOT_OWN_SITE;

/** Signals computable from the lead row alone (`branches`: listings sharing its name, when counted). */
export function dataSignals(r: { website: string | null; has_website: boolean | null; rating: number | null; review_count: number | null; branches?: number | null }) {
  const out: Partial<Record<SignalId, boolean>> = {};
  if (r.branches != null) out.multi_location = r.branches >= 2;
  out.social_as_website = !!r.website && SOCIAL.test(r.website);
  // A listing whose "website" is its Instagram / WhatsApp / Facebook page has no website of its own:
  // a "no website" ask must include it (audit 2026-10-23: 13 such candidates, 0 delivered).
  out.no_website = r.has_website === false || out.social_as_website === true;
  if (r.review_count !== null) {
    out.few_reviews = r.review_count < 30;
    out.established = r.review_count >= 100;
  }
  if (r.rating !== null) out.low_rating = r.rating < 4;
  return out;
}

/**
 * What a social "website" link itself tells us (Maps listings often carry only that): the WhatsApp
 * number in a wa.me / api.whatsapp link, and the Instagram / Facebook handle. Kept as contacts and
 * socials instead of being thrown away with the link.
 */
export function socialLinkFacts(url: string | null | undefined): { whatsapp: string | null; socials: Record<string, string> } {
  const out = { whatsapp: null as string | null, socials: {} as Record<string, string> };
  if (!url) return out;
  const wa = /(?:wa\.me\/|api\.whatsapp\.com\/send\/?\?phone=|whatsapp\.com\/send\?phone=)\+?(\d{10,15})/i.exec(url);
  if (wa) { out.whatsapp = `+${wa[1].length === 10 ? `91${wa[1]}` : wa[1]}`; out.socials.whatsapp = `https://wa.me/${wa[1]}`; }
  const ig = /instagram\.com\/([A-Za-z0-9_.]{2,30})/i.exec(url);
  if (ig && !/^(p|reel|explore|stories)$/i.test(ig[1])) out.socials.instagram = `https://instagram.com/${ig[1]}`;
  const fb = /(?:facebook\.com|fb\.com|fb\.me)\/([A-Za-z0-9_.-]{2,60})/i.exec(url);
  if (fb && !/^(profile\.php|pages|groups|sharer)$/i.test(fb[1])) out.socials.facebook = `https://facebook.com/${fb[1]}`;
  return out;
}
