/**
 * Listing & ad-spend profiles — for anyone selling ads, local SEO/GBP work, food-delivery or hotel
 * distribution (2026-10-22). "Already pays for ads" = budget exists; "half-filled Google profile",
 * "not on Zomato", "only on OTAs, no booking engine" = a concrete gap to pitch. Feasibility was
 * checked live before any of this was written; what each source really gives:
 *
 *   Meta Ad Library   WORKS. The public library page is server-rendered for link-preview bots
 *                     (facebookexternalhit UA): the HTML carries the search's JSON — total count,
 *                     per ad page_id/page_name/page_profile_uri/start_date/is_active. A normal
 *                     browser UA gets a 403 JS challenge. The Graph API `ads_archive` is NOT used:
 *                     it needs a user token from an identity-verified account, and outside the
 *                     EU/UK it only returns political/issue ads — commercial Indian ads are absent.
 *                     A Facebook page's own id (fb://profile/…) is NOT the Ad Library page_id, so
 *                     a page is found by keyword search and matched on profile URL or exact name.
 *   Google Ads        WORKS. adstransparency.google.com is a JS app, but the RPC it calls
 *   Transparency      (SearchService/SearchCreatives) answers without auth: creatives for a
 *                     domain with advertiser name, first/last shown, and a count RANGE (lower and
 *                     upper bound — Google buckets big advertisers, e.g. 2000-3000).
 *   Google Business   WORKS via Places API (New) Place Details. Billed at the highest SKU in the
 *   Profile           field mask (per 1,000, list price; monthly free caps per SKU apply):
 *                       Essentials IDs-only  photos                          (free tier)
 *                       Pro       $17        businessStatus
 *                       Enterprise $20       websiteUri, nationalPhoneNumber, regularOpeningHours,
 *                                            rating, userRatingCount
 *                       Enterprise+Atmosphere $25  editorialSummary, reviews
 *                     So a full read is ~$0.025; without reviews/summary ~$0.020. Limits that
 *                     matter: photos come back capped at 10 (so "count" is min(real,10) — fine for
 *                     a <5 test); reviews are at most 5 "most relevant" (no sort option), so the
 *                     oldest of them is only a LOWER bound on listing age; and the Review object
 *                     has NO owner-reply field — "doesn't reply to reviews" is not readable here.
 *   Zomato / Swiggy   PARTIAL. Exa search, URLs filtered to the platform's restaurant-page shape.
 *                     Zomato's page carries a JSON-LD ratingValue (one free fetch); Swiggy pages
 *                     are a JS shell, no rating. "New listing" is set only if the text says so.
 *   OTAs              PARTIAL. One Exa search, URLs filtered to booking.com/makemytrip/goibibo/
 *                     agoda hotel pages. Absence in one search is NOT proof of absence.
 *
 * Unknown stays unknown: every reader returns null fields rather than a guess.
 */

import { safeFetch } from "../net";
import { exaSearch } from "../sources/exa";
import { googleFetch, hasGoogleKey } from "@/lib/google-key";

const BOT_UA = "facebookexternalhit/1.1";
const daysAgoIso = (sec: number) => new Date(sec * 1000).toISOString().slice(0, 10);
const norm = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();

async function text(url: string, init: RequestInit = {}, ms = 12_000): Promise<string | null> {
  try {
    const r = await safeFetch(url, { ...init, signal: AbortSignal.timeout(ms) });
    return r.ok ? await r.text() : null;
  } catch { return null; }
}

// ------------------------------------------------------------------ Meta Ad Library

export type AdsActive = { active: boolean | null; count: number | null; since: string | null; via: string };
type MetaAd = { id: string; pageId: string | null; pageName: string | null; profile: string | null; start: number | null; active: boolean | null };

function parseMetaAds(html: string): { total: number | null; ads: MetaAd[] } {
  const total = html.match(/"search_results_connection":\{"count":(\d+)/);
  const ads = html.split('"ad_archive_id":"').slice(1).map((c) => {
    const g = (re: RegExp) => c.match(re)?.[1] ?? null;
    const start = g(/"start_date":(\d+)/);
    const act = g(/"is_active":(true|false)/);
    return { id: c.slice(0, c.indexOf('"')), pageId: g(/"page_id":"(\d+)"/), pageName: g(/"page_name":"([^"]*)"/),
      profile: g(/"page_profile_uri":"([^"]*)"/)?.replace(/\\\//g, "/") ?? null, start: start ? Number(start) : null, active: act === null ? null : act === "true" };
  });
  return { total: total ? Number(total[1]) : null, ads };
}

const libUrl = (p: Record<string, string>) =>
  `https://www.facebook.com/ads/library/?${new URLSearchParams({ active_status: "active", ad_type: "all", country: "IN", ...p })}`;

/** Facebook handle from a page URL: facebook.com/Tanishq/ → "tanishq". */
function fbHandle(url: string | undefined): string | null {
  const m = url?.match(/facebook\.com\/(?!profile\.php|pages\/)([A-Za-z0-9.\-_]+)/i);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Is this business running Meta (Facebook/Instagram) ads in India right now? Keyword search on the
 * name, then the advertiser is picked by its profile URL (when the site links one) or an exact
 * name match — a different page that merely mentions the name never counts. `since` is the
 * earliest start date among the ads the page shows (exact when count ≤ ~30, else "at least").
 */
export async function metaAdsActive(name: string, facebookUrl?: string, country = "IN"): Promise<AdsActive> {
  const html = await text(libUrl({ q: name, search_type: "keyword_unordered", country }), { headers: { "User-Agent": BOT_UA } });
  if (!html) return { active: null, count: null, since: null, via: "meta_ad_library:unreachable" };
  const { total, ads } = parseMetaAds(html);
  if (total === null) return { active: null, count: null, since: null, via: "meta_ad_library:unparsed" };
  if (total === 0) return { active: false, count: 0, since: null, via: "meta_ad_library:no_active_ads_for_name" };
  const handle = fbHandle(facebookUrl);
  const hit = ads.find((a) => handle && fbHandle(a.profile ?? undefined) === handle) ?? ads.find((a) => a.pageName && norm(a.pageName) === norm(name));
  // Ads mention the name but none belong to a page we can tie to this business — say nothing.
  if (!hit?.pageId) return { active: null, count: null, since: null, via: "meta_ad_library:no_matching_page" };
  const page = await text(libUrl({ view_all_page_id: hit.pageId, search_type: "page", country }), { headers: { "User-Agent": BOT_UA } });
  const pg = page ? parseMetaAds(page) : null;
  const own = (pg?.ads.length ? pg.ads : ads).filter((a) => a.pageId === hit.pageId && a.start);
  const count = pg?.total ?? own.length;
  const first = own.length ? Math.min(...own.map((a) => a.start as number)) : null;
  return { active: count > 0, count, since: first ? daysAgoIso(first) : null, via: `meta_ad_library:page:${hit.pageId}:${hit.pageName ?? ""}` };
}

// ------------------------------------------------------------------ Google Ads Transparency

const REGION: Record<string, number> = { IN: 2356, US: 2840, GB: 2826, AE: 2784 };
const ymd = (d: Date) => Number(d.toISOString().slice(0, 10).replace(/-/g, ""));

async function gatSearch(domain: string, region: number, days: number | null) {
  const filter: Record<string, unknown> = { 8: [region], 12: { 1: domain, 2: true } };
  if (days) { filter[6] = ymd(new Date(Date.now() - days * 864e5)); filter[7] = ymd(new Date()); }
  const body = new URLSearchParams({ "f.req": JSON.stringify({ 2: 40, 3: filter, 7: { 1: 1, 2: 30, 3: region } }) });
  const raw = await text("https://adstransparency.google.com/anji/_/rpc/SearchService/SearchCreatives?authuser=0",
    { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (raw === null) return null;
  try {
    const d = JSON.parse(raw) as { 1?: Array<Record<string, unknown>>; 4?: string; 5?: string };
    const ads = (d[1] ?? []).filter((c) => String(c[14] ?? "").replace(/^www\./, "") === domain);
    return { lo: d[4] ? Number(d[4]) : ads.length, hi: d[5] ? Number(d[5]) : null, ads, advertisers: [...new Set(ads.map((c) => String(c[12] ?? "")))].filter(Boolean) };
  } catch { return null; }
}

/**
 * Google Ads seen for a domain in the last `windowDays` (default 30) in a region. `count` is the
 * LOWER bound of Google's range; `since` is the earliest first-shown date among the (up to 40)
 * creatives returned — the current run's start, "at least since" when the count exceeds 40.
 */
export async function googleAdsActive(domain: string, opts: { region?: keyof typeof REGION; windowDays?: number } = {}): Promise<AdsActive & { countMax?: number | null; advertiser?: string | null }> {
  const d = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  const r = await gatSearch(d, REGION[opts.region ?? "IN"], opts.windowDays ?? 30);
  if (!r) return { active: null, count: null, since: null, via: "google_ads_transparency:unreachable" };
  if (!r.ads.length) return { active: false, count: 0, since: null, via: "google_ads_transparency:none_in_window" };
  const first = Math.min(...r.ads.map((c) => Number((c[6] as { 1?: string } | undefined)?.[1] ?? Infinity)));
  return { active: true, count: r.lo, countMax: r.hi, since: Number.isFinite(first) ? daysAgoIso(first) : null,
    advertiser: r.advertisers.join(", ") || null, via: "google_ads_transparency" };
}

// ------------------------------------------------------------------ Google Business Profile

export type GbpProfile = {
  photos: number | null;          // capped at 10 by the API
  hasHours: boolean;
  website: string | null;
  phone: string | null;
  summary: string | null;
  status: string | null;
  reviews: number | null;
  rating: number | null;
  latestReview: string | null;    // newest of the ≤5 returned
  oldestReviewMonthsAgo: number | null; // LOWER bound on listing age
  repliesReadable: false;         // Places API (New) never exposes owner replies
  costUsd: number;
};

const GBP_BASE = "photos,businessStatus,websiteUri,nationalPhoneNumber,regularOpeningHours.weekdayDescriptions,rating,userRatingCount";
const GBP_ATMOS = ",editorialSummary,reviews.publishTime";

/** Place Details for one place_id. `atmosphere: false` skips summary+reviews ($0.020 instead of $0.025). */
export async function gbpProfile(placeId: string, opts: { atmosphere?: boolean } = {}): Promise<GbpProfile | null> {
  if (!hasGoogleKey()) throw new Error("GOOGLE_PLACES_API_KEY is not set");
  const atmos = opts.atmosphere !== false;
  const res = await googleFetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { "X-Goog-FieldMask": GBP_BASE + (atmos ? GBP_ATMOS : "") },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!res?.ok) { if (res) console.warn("[profiles] places", res.status, (await res.text()).slice(0, 200)); return null; }
  const d = (await res.json()) as {
    photos?: unknown[]; businessStatus?: string; websiteUri?: string; nationalPhoneNumber?: string;
    regularOpeningHours?: { weekdayDescriptions?: string[] }; rating?: number; userRatingCount?: number;
    editorialSummary?: { text?: string }; reviews?: Array<{ publishTime?: string }>;
  };
  const times = (d.reviews ?? []).map((r) => Date.parse(r.publishTime ?? "")).filter(Number.isFinite);
  return {
    photos: d.photos?.length ?? 0,
    hasHours: !!d.regularOpeningHours?.weekdayDescriptions?.length,
    website: d.websiteUri ?? null,
    phone: d.nationalPhoneNumber ?? null,
    summary: atmos ? d.editorialSummary?.text ?? null : null,
    status: d.businessStatus ?? null,
    reviews: d.userRatingCount ?? 0,
    rating: d.rating ?? null,
    latestReview: times.length ? new Date(Math.max(...times)).toISOString().slice(0, 10) : null,
    oldestReviewMonthsAgo: times.length ? Math.floor((Date.now() - Math.min(...times)) / (30.4 * 864e5)) : null,
    repliesReadable: false,
    costUsd: atmos ? 0.025 : 0.02,
  };
}

// ------------------------------------------------------------------ Zomato / Swiggy

/** swiggyKind: Swiggy hosts delivery pages and Dineout (table-booking) pages; a Dineout-only hit is not delivery. */
export type FoodListing = { zomato: string | null; swiggy: string | null; swiggyKind?: "delivery" | "dineout"; rating?: number; newListing?: boolean };

const ZOMATO_PAGE = /^https?:\/\/(www\.)?zomato\.com\/[a-z-]+\/[a-z0-9-]+(\/(info|order|menu|reviews))?\/?$/i;
// Delivery: /restaurants/<slug>-<id> or /city/<city>/<slug>-rest<id>. Dineout: /restaurants/[<city>/<area>/]<slug>-<id>/dineout[/menu].
const SWIGGY_PAGE = /^https?:\/\/(www\.)?swiggy\.com\/(city\/[a-z-]+\/[a-z0-9-]+-rest\d+|restaurants\/([a-z0-9-]+\/){0,2}[a-z0-9-]+-\d+(\/dineout(\/menu)?)?)\/?$/i;
const ZOMATO_NOT_REST = /zomato\.com\/[a-z-]+\/(restaurants|delivery|dine-out|best|top|collections|events)\b/i;
const NEW_TEXT = /\b(newly opened|new on (zomato|swiggy)|just opened)\b/i;

/** Slug must carry the name's first word — a search hit for a neighbouring restaurant is dropped. */
function slugHas(url: string, name: string): boolean {
  const first = norm(name).split(" ").find((w) => w.length > 2) ?? norm(name).split(" ")[0];
  return !!first && url.toLowerCase().includes(first);
}

export async function foodDeliveryListing(name: string, city: string): Promise<FoodListing & { costUsd: number }> {
  const s = await exaSearch(`${name} ${city} restaurant on Zomato and Swiggy`, { highlights: true, numResults: 10 });
  const pick = (re: RegExp, bad?: RegExp) => s.results.find((r) => re.test(r.url.split("?")[0]) && !bad?.test(r.url) && slugHas(r.url, name));
  const z = pick(ZOMATO_PAGE, ZOMATO_NOT_REST);
  const swHits = s.results.filter((r) => SWIGGY_PAGE.test(r.url.split("?")[0]) && slugHas(r.url, name));
  const sw = swHits.find((r) => !/\/dineout/.test(r.url)) ?? swHits[0];
  const out: FoodListing & { costUsd: number } = { zomato: z ? z.url.split("?")[0] : null, swiggy: sw ? sw.url.split("?")[0] : null, ...(sw ? { swiggyKind: /\/dineout/.test(sw.url) ? "dineout" as const : "delivery" as const } : {}), costUsd: s.costUsd };
  if (out.zomato) {
    const html = await text(out.zomato.replace(/\/(info|order|menu|reviews)\/?$/, ""));
    const r = html?.match(/"ratingValue":"?([\d.]+)/);
    if (r) out.rating = Number(r[1]);
    if (html && NEW_TEXT.test(html.replace(/<[^>]+>/g, " "))) out.newListing = true;
  }
  if (out.newListing === undefined && [z, sw].some((r) => r && NEW_TEXT.test(`${r.title ?? ""} ${(r.highlights ?? []).join(" ")}`))) out.newListing = true;
  return out;
}

// ------------------------------------------------------------------ OTAs + booking engine

export type OtaListings = { booking: string | null; makemytrip: string | null; goibibo: string | null; agoda: string | null };

const OTA: Record<keyof OtaListings, RegExp> = {
  booking: /^https?:\/\/(www\.)?booking\.com\/hotel\/[a-z]{2}\/[a-z0-9-]+(\.[a-z-]+)*\.html/i,
  makemytrip: /^https?:\/\/(www\.)?makemytrip\.com\/hotels\/[a-z0-9-]+-details-[a-z-]+\.html/i,
  goibibo: /^https?:\/\/(www\.)?goibibo\.com\/hotels\/[a-z0-9-]+-hotel-in-[a-z-]+-\d+\/?/i,
  agoda: /^https?:\/\/(www\.)?agoda\.com\/([a-z-]+\/)?[a-z0-9-]+\/hotel\/[a-z-]+\.html/i,
};

/** One Exa search; each OTA's hotel-detail URL whose slug carries the hotel's name. */
export async function otaListings(name: string, city: string): Promise<OtaListings & { costUsd: number }> {
  const s = await exaSearch(`${name} ${city} hotel booking.com makemytrip goibibo agoda`, { numResults: 10 });
  const out = { booking: null, makemytrip: null, goibibo: null, agoda: null, costUsd: s.costUsd } as OtaListings & { costUsd: number };
  for (const k of Object.keys(OTA) as Array<keyof OtaListings>) {
    const hit = s.results.find((r) => OTA[k].test(r.url) && slugHas(r.url, name));
    out[k] = hit ? hit.url.split("?")[0] : null;
  }
  return out;
}

// Booking-engine fingerprints live in their own pure module so the site reader on the AWS box can
// use them without pulling in Exa.
export { hasBookingEngine } from "./booking-engine";

// ------------------------------------------------------------------ signals

export type ProfileInputs = {
  meta?: AdsActive | null;
  google?: AdsActive | null;
  gbp?: GbpProfile | null;
  food?: FoodListing | null;
  ota?: OtaListings | null;
  engine?: { found: boolean; engines: string[] } | null;
};

export const GBP_MIN_PHOTOS = 5;

/** Results → signal booleans. A signal is set only when its source actually answered. */
export function profileSignals(p: ProfileInputs) {
  const sig: Record<string, boolean> = {};
  const notes: string[] = [];
  if (p.meta && p.meta.active !== null) {
    sig.runs_meta_ads = p.meta.active;
    notes.push(p.meta.active ? `Meta ads: ${p.meta.count} active${p.meta.since ? ` since ${p.meta.since}` : ""}` : "No active Meta ads");
  }
  if (p.google && p.google.active !== null) {
    sig.runs_google_ads = p.google.active;
    notes.push(p.google.active ? `Google ads: ${p.google.count}+ in last 30 days${p.google.since ? ` (since ${p.google.since})` : ""}` : "No Google ads in last 30 days");
  }
  if (sig.runs_meta_ads !== undefined || sig.runs_google_ads !== undefined) sig.runs_ads = !!(sig.runs_meta_ads || sig.runs_google_ads);
  const g = p.gbp;
  if (g) {
    const gaps = [!g.hasHours && "no hours", g.photos !== null && g.photos < GBP_MIN_PHOTOS && `${g.photos} photos`, !g.website && "no website"].filter(Boolean);
    sig.gbp_incomplete = gaps.length > 0;
    sig.gbp_no_website = !g.website;
    if (g.status && g.status !== "OPERATIONAL") sig.gbp_not_operational = true;
    // gbp_no_review_replies: deliberately absent — Places API (New) does not expose owner replies.
    notes.push(`Google profile: ${g.rating ?? "?"}★ from ${g.reviews ?? "?"} reviews${gaps.length ? `, missing ${gaps.join("/")}` : ", complete"}`);
    if (g.oldestReviewMonthsAgo !== null) {
      // With ≤5 reviews the API returns all of them, so the oldest IS the first review; above 5
      // it is only a lower bound and says nothing about "new".
      if ((g.reviews ?? 0) <= 5) sig.gbp_new_listing = g.oldestReviewMonthsAgo < 12;
      notes.push(`listed at least ${g.oldestReviewMonthsAgo} months (oldest of ${Math.min(g.reviews ?? 0, 5)} returned reviews)`);
    }
  }
  if (p.food) {
    // "not found" in one search, not "absent" — named so nobody reads it as proof.
    sig.zomato_not_found = !p.food.zomato;
    sig.swiggy_not_found = !p.food.swiggy;
    if (p.food.swiggyKind === "dineout") sig.swiggy_delivery_not_found = true; // only a Dineout (table-booking) page turned up
    if (p.food.newListing) sig.new_restaurant = true;
    notes.push(`Zomato ${p.food.zomato ? `yes${p.food.rating ? ` (${p.food.rating}★)` : ""}` : "not found"}, Swiggy ${p.food.swiggy ? (p.food.swiggyKind === "dineout" ? "Dineout only" : "yes") : "not found"}`);
  }
  if (p.ota) {
    const on = (Object.keys(OTA) as Array<keyof OtaListings>).filter((k) => p.ota?.[k]);
    sig.on_ota = on.length > 0; // false = none found in one search, not proven absent
    notes.push(on.length ? `On ${on.join(", ")}` : "Not found on OTAs");
  }
  if (p.engine) {
    sig.no_booking_engine = !p.engine.found;
    notes.push(p.engine.found ? `Booking engine: ${p.engine.engines.join(", ")}` : "No booking engine on website");
    if (sig.on_ota && !p.engine.found) sig.ota_dependent = true;
  }
  return { sig, note: notes.join(" · ") || null };
}
