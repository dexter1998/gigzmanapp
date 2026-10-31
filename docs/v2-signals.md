# Mantis V2 — signals, facts and derived needs (2026-10-22)

## Layers
1. **Observed facts** (`company_facts`, lib/v2/signals/store.ts) — what a reader saw, with source,
   evidence URL and a shelf life (hiring 14d, social 30d, funding 90d, offerings/site 30–60d,
   profiles 14d, person 120d). Every run reads the store first and fetches only missing/expired facts.
2. **Derived signals** (`company_signals`, lib/v2/signals/rules.ts) — rules over facts: hiring
   sales roles → needs_crm / needs_lead_data; accountant → needs_ca; chef/outlet staff → new_outlet;
   funded ≤12 mo → has_budget; 12–30 mo → needs_fundraising; funded + hiring sales → scaling_gtm;
   form with no backend → needs_lead_capture; exposed secret / SSL → needs_security; … Each keeps
   `derived_from` + a readable reason.
3. **Opportunity** — `NEEDS[x].sellers` matched to what the Mantis user sells; matching needs rank
   (confidence × 8 × learned weight) and the best one becomes the lead's "why now".
4. **Outcomes** (`signal_outcomes`, lib/v2/signals/outcomes.ts) — replies / bounces / interest are
   recorded against each lead's derived needs; `needWeights()` re-weights needs by reply rate once
   50+ real sends exist (smoothed, 0.5–1.5).

## Readers
| Module | Default? | Cost | Reads |
|---|---|---|---|
| signals/hiring.ts | every lead | free | careers page, Greenhouse/Lever JSON, other ATS embeds |
| signals/site-extra.ts | every lead | free (≤4 reads + TLS + DNS) | forms & backend, booking forms, exposed secrets (type only), SSL/headers/CMS, SPF/DMARC/MX, blog, SEO basics, coming soon, press, certifications, exporter, Shopify apps, **offerings** |
| signals/social.ts | links every lead; stats for social sellers | free | IG followers/posts, YouTube last video, LinkedIn followers |
| signals/funding.ts | funding plans | Exa | news rounds; `funding_news` discovery strategy |
| signals/profiles.ts | per seller need | Meta/Google ads free; GBP ~$0.02; Exa for food/OTA | Meta Ad Library, Google Ads Transparency, GBP completeness, Zomato/Swiggy, OTAs, booking engine |
| signals/decision-maker.ts | contacts step | Exa | founder / concerned person + LinkedIn |

Rules: booking = a widget OR the site's own booking form (an own form never counts as "no booking");
`form_no_backend` = mailto / provably dead forms only. Exposed secrets: detection on what the site
already serves publicly; only {type, where, masked} is kept; values are never stored or used.

**Default with no signal asked:** the lead's offerings page is read and matched to the ask
(`offer_match`, "Sells …"); it ranks the lead and is shown as its reason.

## Founder / concerned person → LinkedIn
1. Site team/about/founders page (enricher) → named person + role (free, best).
2. That name → Exa "<name> <company> linkedin" → a linkedin.com/in hit whose title carries the company.
3. No name on the site → Exa "<company> <city> founder director linkedin" (company LinkedIn slug
   added when known); title "Name - Role - Company | LinkedIn" must name the company.
Not done: logging into LinkedIn / reading a company's People tab (needs an account, against ToS).
Paid alternatives when needed: Apollo people/match (paid plan), Proxycurl-style company→employees APIs.

## Public registers — once a day
`lib/v2/registry.ts` `oncePerDay(source, query, fetch)` caches each query per IST day in
`registry_cache`. **MCA (not wired):** data.gov.in Company Master Data (free bulk CSVs, monthly);
MCA21 V3 portal (per company, captcha, no bulk API — don't scrape); paid APIs: Probe42, Tofler,
Zauba Corp, Signzy/Surepass MCA, Sandbox.co.in; daily new-incorporation vendors (e.g. Verizol).
