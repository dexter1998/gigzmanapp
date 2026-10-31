/**
 * "What to sell, what to offer" for one lead — derived from its measured signals (the elements the
 * enricher/Qualifier recorded), matched against what the seller sells (their Scout profile). Rule-
 * based on purpose: every line points at a signal that was actually observed on this business.
 */

import type { SellerProfile } from "./scout";

export type Suggestion = { service: string; offer: string; because: string; matchesYou: boolean };

const RULES: Array<{ signal: string; service: string; offer: string; because: string; words: RegExp }> = [
  { signal: "no_website", service: "Website development", offer: "A mobile-ready website with an enquiry form, live in 7 days.", because: "No website on their Google listing.", words: /web|site|development|design/i },
  { signal: "social_as_website", service: "Website development", offer: "Move them from a social page to their own site and domain.", because: "Their 'website' is a social or directory page.", words: /web|site|development|design/i },
  { signal: "site_down", service: "Website rebuild / hosting", offer: "Fix or rebuild the site that isn't loading, with managed hosting.", because: "Their listed website did not load.", words: /web|site|hosting|maint/i },
  { signal: "old_copyright", service: "Website redesign", offer: "A redesign with current content and a faster, mobile layout.", because: "The site's copyright year is 3+ years old.", words: /redesign|web|site|design/i },
  { signal: "no_mobile", service: "Website redesign (mobile)", offer: "Make the site mobile-friendly — most of their visitors are on phones.", because: "No mobile viewport on the homepage.", words: /web|site|design|mobile/i },
  { signal: "no_https", service: "Security & hosting", offer: "Move the site to HTTPS so browsers stop flagging it 'Not secure'.", because: "The site loads without HTTPS.", words: /web|site|hosting|security|maint/i },
  { signal: "no_analytics", service: "Analytics & tracking setup", offer: "Set up Google Analytics/GTM so they can see where enquiries come from.", because: "No Google Analytics or Tag Manager on the site.", words: /seo|analytic|marketing|digital|track/i },
  { signal: "no_meta_pixel", service: "Meta (Facebook/Instagram) ads", offer: "Install the Meta pixel and run a first lead-gen campaign.", because: "No Meta pixel — not running tracked Meta ads.", words: /ads|meta|facebook|social|marketing|performance/i },
  { signal: "no_google_ads", service: "Google Ads", offer: "A local Google Ads campaign with conversion tracking.", because: "No Google Ads conversion tag on the site.", words: /ads|google|ppc|sem|marketing|performance/i },
  { signal: "no_booking", service: "Online booking", offer: "Add an appointment/booking flow to the site.", because: "No booking or appointment link on the site.", words: /booking|crm|software|automation|chatbot|web/i },
  { signal: "few_reviews", service: "Review & reputation management", offer: "A review-request system to grow their Google reviews.", because: "Fewer than 30 Google reviews.", words: /review|reputation|seo|local|marketing/i },
  { signal: "low_rating", service: "Reputation management", offer: "Respond to and recover low ratings; ask happy customers to review.", because: "Rated below 4.0 on Google.", words: /review|reputation|seo|local|marketing/i },
  { signal: "has_careers", service: "Recruitment / HR services", offer: "Help fill the roles on their careers page.", because: "They have a careers page — they are hiring.", words: /hr|recruit|staff|hiring|talent/i },
];

export function suggestFor(signals: Record<string, unknown>, seller: SellerProfile | null): Suggestion[] {
  const sells = [seller?.primaryService, ...(seller?.services ?? [])].filter(Boolean).join(" ");
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const r of RULES) {
    if (signals[r.signal] !== true || seen.has(r.service)) continue;
    seen.add(r.service);
    out.push({ service: r.service, offer: r.offer, because: r.because, matchesYou: !!sells && r.words.test(sells) });
  }
  // What the seller sells first: those are the pitches they can actually deliver.
  return out.sort((a, b) => Number(b.matchesYou) - Number(a.matchesYou)).slice(0, 4);
}
