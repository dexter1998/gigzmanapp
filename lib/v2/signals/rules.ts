/**
 * Derived signals: one observed fact implies needs the company never stated. A careers page with
 * three sales roles says "hiring sales" — and therefore "will buy a CRM, lead data, sales training".
 * Rules are data (like playbooks): each names the facts it reads, what it implies, and how sure it
 * is. Nothing here fetches; it runs over the facts store, so a need derived once is free forever.
 *
 * NEEDS is the opportunity layer: which sellers each need is for, matched against what the Mantis
 * user sells, so a refrigeration seller's run ranks `new_outlet` companies first.
 */

import type { Derived, Facts } from "./store";

export const NEEDS: Record<string, { label: string; sellers: string[] }> = {
  needs_crm:               { label: "Needs a CRM",                 sellers: ["crm", "sales software", "lead management", "zoho", "hubspot"] },
  needs_lead_data:         { label: "Needs leads / prospect data",  sellers: ["lead generation", "lead gen", "data", "prospecting", "outbound", "appointment setting"] },
  needs_sales_training:    { label: "Building a sales team",        sellers: ["sales training", "sales consulting", "dialer", "calling"] },
  needs_ca:                { label: "Needs accounting / CA",        sellers: ["ca", "chartered accountant", "accounting", "bookkeeping", "tax", "gst", "audit", "compliance", "virtual cfo"] },
  needs_payroll:           { label: "Needs payroll / HRMS",         sellers: ["payroll", "hrms", "hr software", "attendance"] },
  needs_staffing:          { label: "Needs hiring help",            sellers: ["staffing", "recruitment", "recruiting", "placement", "hr", "headhunting", "background verification"] },
  needs_dev_agency:        { label: "Building tech",                sellers: ["software development", "app development", "web development", "it services", "cloud", "devops", "dev agency"] },
  needs_it_hardware:       { label: "Adding staff (devices, desks)", sellers: ["laptops", "it hardware", "office supplies", "furniture", "coworking", "office space", "interior"] },
  needs_marketing_agency:  { label: "Investing in marketing",       sellers: ["marketing", "digital marketing", "seo", "performance marketing", "ads", "branding", "content"] },
  needs_social_media:      { label: "Weak social media",            sellers: ["social media", "instagram", "content", "influencer", "video", "branding"] },
  needs_seo:               { label: "Weak SEO / content",           sellers: ["seo", "content", "blog", "digital marketing"] },
  needs_local_seo:         { label: "Weak Google listing",          sellers: ["local seo", "google business", "reputation", "reviews", "seo"] },
  needs_website:           { label: "Needs a better website",       sellers: ["website", "web design", "web development", "wordpress", "shopify"] },
  needs_lead_capture:      { label: "Losing website enquiries",     sellers: ["crm", "chatbot", "whatsapp", "forms", "website", "lead management", "automation"] },
  needs_security:          { label: "Security gaps on its site",    sellers: ["cybersecurity", "security", "vapt", "it services", "managed it", "website maintenance"] },
  needs_email_deliverability: { label: "Email domain not secured",  sellers: ["email", "deliverability", "it services", "google workspace", "microsoft 365", "cybersecurity"] },
  needs_email_marketing:   { label: "Store without email marketing", sellers: ["email marketing", "klaviyo", "retention", "d2c", "crm"] },
  needs_reviews_app:       { label: "Store without reviews app",    sellers: ["reviews", "ugc", "shopify apps", "d2c", "cro"] },
  new_outlet:              { label: "Opening / expanding outlets",  sellers: ["refrigeration", "kitchen equipment", "pos", "interior", "signage", "furniture", "uniforms", "packaging", "cctv", "hvac", "staffing"] },
  new_business:            { label: "New business setting up",      sellers: ["ca", "website", "marketing", "interior", "insurance", "bank", "loan", "branding", "furniture"] },
  needs_logistics:         { label: "Moving goods (drivers / warehouse hiring)", sellers: ["logistics", "3pl", "fleet", "courier", "warehouse", "insurance", "gps"] },
  needs_export_services:   { label: "Exporter",                     sellers: ["freight", "export", "logistics", "export finance", "customs", "trade data"] },
  has_budget:              { label: "Fresh funding — budget now",   sellers: ["saas", "marketing", "staffing", "recruitment", "office space", "interior", "legal", "branding", "software"] },
  needs_fundraising:       { label: "Next funding round due",       sellers: ["fundraising", "investment banking", "m&a", "pitch deck", "virtual cfo", "venture"] },
  scaling_gtm:             { label: "Scaling sales after raising",  sellers: ["crm", "lead generation", "sales", "marketing", "staffing", "outbound"] },
};

type Hiring = { hiring: boolean | null; count: number; roles: string[] } | null;
type Funding = { monthsAgo: number | null } | null;
type SigBag = { sig?: Record<string, boolean>; signals?: Record<string, boolean> } | null;

const ROLE_RULES: Array<{ id: string; re: RegExp; needs: string[]; what: string }> = [
  { id: "hire_sales", re: /\b(sales|bde|bdm|business development|telecaller|inside sales|account executive|key account|pre-?sales)\b/i, needs: ["needs_crm", "needs_lead_data", "needs_sales_training"], what: "sales" },
  { id: "hire_finance", re: /\b(accountant|accounts|finance|tally|bookkeep|ca\b|chartered|audit|taxation|gst)\b/i, needs: ["needs_ca", "needs_payroll"], what: "accounts / finance" },
  { id: "hire_hr", re: /\b(hr|human resource|recruiter|talent acquisition|people ops)\b/i, needs: ["needs_staffing", "needs_payroll"], what: "HR / recruiting" },
  { id: "hire_tech", re: /\b(developer|engineer|sde|devops|full stack|frontend|backend|android|ios|data scientist|qa|tester)\b/i, needs: ["needs_dev_agency", "needs_it_hardware", "needs_staffing"], what: "tech" },
  { id: "hire_marketing", re: /\b(marketing|social media|content|seo|performance|digital|graphic designer|brand)\b/i, needs: ["needs_marketing_agency", "needs_social_media"], what: "marketing" },
  { id: "hire_food", re: /\b(chef|cook|commis|kitchen|f&b|restaurant|steward|barista|outlet manager|store manager|cashier)\b/i, needs: ["new_outlet"], what: "outlet / kitchen" },
  { id: "hire_logistics", re: /\b(driver|delivery|warehouse|logistics|dispatch|fleet|picker|packer)\b/i, needs: ["needs_logistics"], what: "logistics" },
];

const bag = (facts: Facts, key: string): Record<string, boolean> => {
  const v = facts[key]?.value as SigBag;
  return { ...(v?.sig ?? {}), ...(v?.signals ?? {}) };
};

/** All needs these facts imply, each with the rule, the facts it came from and a readable reason. */
export function deriveSignals(facts: Facts, base: Record<string, unknown> = {}): Derived[] {
  const out = new Map<string, Derived>();
  const add = (signal: string, confidence: number, ruleId: string, derivedFrom: string[], reason: string) => {
    const prev = out.get(signal);
    if (!prev || prev.confidence < confidence) out.set(signal, { signal, confidence, ruleId, derivedFrom, reason });
  };

  const h = facts.hiring?.value as Hiring;
  if (h?.hiring) {
    for (const r of ROLE_RULES) {
      const roles = h.roles.filter((x) => r.re.test(x));
      if (!roles.length) continue;
      const conf = Math.min(0.9, 0.55 + 0.1 * roles.length);
      for (const n of r.needs) add(n, conf, r.id, ["hiring"], `Hiring ${r.what}: ${roles.slice(0, 3).join(", ")}`);
    }
    if (h.count >= 10) for (const n of ["needs_it_hardware", "needs_staffing", "needs_payroll"]) add(n, 0.75, "hire_10plus", ["hiring"], `${h.count} open roles at once`);
  }

  const f = facts.funding?.value as Funding;
  if (f && f.monthsAgo !== null) {
    if (f.monthsAgo <= 12) add("has_budget", 0.85, "funded_recent", ["funding"], `Raised ${f.monthsAgo} months ago`);
    if (f.monthsAgo > 12 && f.monthsAgo <= 30) add("needs_fundraising", 0.75, "raise_due", ["funding"], `Last raise ${f.monthsAgo} months ago`);
    // Two facts together: money in the bank AND building a sales team.
    if (f.monthsAgo <= 18 && h?.roles.some((x) => ROLE_RULES[0].re.test(x))) add("scaling_gtm", 0.9, "funded_and_hiring_sales", ["funding", "hiring"], "Raised recently and hiring sales");
  }

  const so = bag(facts, "social_stats");
  const sx = bag(facts, "site_extra");
  const pf = bag(facts, "profiles");  // profileSignals() → { sig, note }
  const b = { ...(base as Record<string, boolean>), ...so, ...sx, ...pf };
  const when = (cond: boolean, signal: string, conf: number, id: string, from: string[], reason: string) => { if (cond) add(signal, conf, id, from, reason); };

  when(b.no_social === true || b.weak_instagram === true || b.quiet_youtube === true, "needs_social_media", b.no_social ? 0.7 : 0.65, "social_weak", ["social_stats"], b.no_social ? "No social profiles linked from the site" : "Social presence is weak or quiet");
  when(b.form_no_backend === true, "needs_lead_capture", 0.75, "form_no_backend", ["site_extra"], "Enquiry form has no working backend (mailto / nowhere)");
  // Only when the forms were actually read (a contact page) and none exists — unknown is not "none".
  when(b.no_booking === true && b.booking_capable === false && b.has_enquiry_form === false, "needs_lead_capture", 0.5, "no_capture", ["site"], "No booking or enquiry form on the site");
  when(b.exposed_secret === true, "needs_security", 0.9, "exposed_secret", ["site_extra"], "A credential is visible in the site's public code");
  when(b.ssl_expired === true || b.ssl_expiring === true, "needs_security", 0.7, "ssl", ["site_extra"], b.ssl_expired ? "SSL certificate expired" : "SSL certificate expiring soon");
  when(b.outdated_cms === true || b.weak_security_headers === true, "needs_security", 0.55, "cms_headers", ["site_extra"], b.outdated_cms ? "Outdated CMS version" : "Security headers missing");
  when(b.outdated_cms === true || b.old_copyright === true || b.no_mobile === true, "needs_website", 0.6, "dated_site", ["site", "site_extra"], "Website looks dated");
  when(b.blog_stale === true || b.no_blog === true || b.seo_basics_missing === true, "needs_seo", 0.55, "seo_gaps", ["site_extra"], b.seo_basics_missing ? "SEO basics missing" : "Blog missing or stale");
  when(b.gbp_incomplete === true || b.few_reviews === true, "needs_local_seo", 0.55, "gbp_gaps", ["profiles", "data"], "Google listing incomplete or few reviews");
  when(b.no_dmarc === true, "needs_email_deliverability", 0.6, "no_dmarc", ["site_extra"], "No DMARC record on its email domain");
  when(b.shop_no_email_app === true, "needs_email_marketing", 0.65, "shop_no_email", ["site_extra"], "Online store with no email-marketing app");
  when(b.shop_no_reviews_app === true, "needs_reviews_app", 0.6, "shop_no_reviews", ["site_extra"], "Online store with no reviews app");
  when(b.coming_soon === true, "new_business", 0.8, "coming_soon", ["site_extra"], "Site says coming soon / now open");
  when(b.exporter === true, "needs_export_services", 0.7, "exporter", ["site_extra"], "Exports (IEC / ships worldwide)");
  when(b.multi_location === true || b.has_locations === true, "new_outlet", 0.45, "branches", ["data", "site"], "Has several branches");
  when(b.runs_meta_ads === true && (b.no_meta_pixel === true || b.no_analytics === true), "needs_marketing_agency", 0.8, "ads_untracked", ["profiles", "site"], "Runs Meta ads without a pixel / analytics");
  when(b.runs_ads === true, "has_budget", 0.6, "runs_ads", ["profiles"], "Spends on ads now");
  when(b.runs_ads === false && b.few_reviews !== true, "needs_marketing_agency", 0.45, "no_ads", ["profiles"], "Not running any ads");
  when(b.gbp_new_listing === true || b.new_restaurant === true, "new_business", 0.7, "new_listing", ["profiles"], "Listing / restaurant is new");
  when(b.swiggy_delivery_not_found === true || b.zomato_not_found === true, "needs_marketing_agency", 0.4, "no_delivery_listing", ["profiles"], "Not found on delivery apps");
  when(b.ota_dependent === true || b.no_booking_engine === true, "needs_website", 0.6, "ota_dependent", ["profiles"], "Hotel sells through OTAs without its own booking engine");
  return [...out.values()];
}

/** Needs whose sellers match what the Mantis user sells (service, services, playbooks). */
export function needsForSeller(text: string): string[] {
  const t = ` ${text.toLowerCase()} `;
  return Object.entries(NEEDS).filter(([, n]) => n.sellers.some((s) => t.includes(` ${s}`) || t.includes(`${s} `))).map(([id]) => id);
}
