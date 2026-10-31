/**
 * V2 search tool. Live discovery goes through the map's own /api/leads/find (same cache,
 * throttles and billing); results are then read from `leads` by bounding box — v1's approach,
 * plus what production chats asked for and v1 could not express: paging, upper bounds,
 * exclusions, and "any business" in an area.
 */

// "Without a website" = nothing on the listing, or only a social/directory page — never a row whose
// website_url is a real site (prod, Jaipur: has_website stayed false after a re-scan found the site).
import { NOT_OWN_SITE_SQL } from "./playbooks";
import { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { maskName } from "@/lib/mask";
import { heatScore, ALLOWED_LEAD_TYPES_SQL } from "@/lib/lead-quality";
import { TYPE_TO_SECTION, formatCategory } from "@/lib/categories";
import { POST as findLeadsPost } from "@/app/api/leads/find/route";
import type { ChatLead } from "@/components/chat/ChatLeadsTable";
import type { ChatState } from "./state";

/** /api/leads/find caps a live scan at 3 km; wider radii read what is already mapped. */
const LIVE_RADIUS_CAP_M = 3000;

export type SearchOutcome = {
  leads: ChatLead[];
  hasMore: boolean;
  /** Businesses of any kind we hold inside the box — tells "not mapped" apart from "none here". */
  mappedHere: number | null;
  /** For explore_area: the trades present, most first, to offer as typed chips. */
  topTypes: Array<{ type: string; n: number }>;
  apiDown: boolean;
  liveRan: boolean;
};

function bbox(center: { lat: number; lng: number }, radiusM: number) {
  const latD = radiusM / 111320;
  const lngD = radiusM / (111320 * Math.cos((center.lat * Math.PI) / 180));
  return { latMin: center.lat - latD, latMax: center.lat + latD, lngMin: center.lng - lngD, lngMax: center.lng + lngD };
}

function areaLabel(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export type LiveOutcome = {
  apiDown: boolean;
  /** What actually happened — shown on the step line, so it never claims a search that didn't run. */
  status: "searched" | "cached" | "throttled" | "credits_required" | "limit" | "skipped";
  found: number;
};

/** Live discovery for one trade. Only on the first page: "more" pages read what that call stored. */
export async function liveDiscover(s: ChatState): Promise<LiveOutcome> {
  if (!s.center || !s.placeType) return { apiDown: false, status: "skipped", found: 0 };
  const req = new NextRequest("http://internal/api/leads/find", {
    method: "POST",
    body: JSON.stringify({
      lat: s.center.lat,
      lng: s.center.lng,
      radius: Math.min(s.radiusM, LIVE_RADIUS_CAP_M),
      types: [s.placeType],
    }),
    headers: { "content-type": "application/json" },
  });
  const res = await findLeadsPost(req);
  const data = (await res.json().catch(() => null)) as
    | { apiDown?: boolean; cached?: boolean; throttled?: string; found?: number }
    | null;
  const status: LiveOutcome["status"] =
    data?.throttled === "allowance" ? "limit"
    : data?.throttled === "credits_required" ? "credits_required"
    : data?.throttled ? "throttled"
    : data?.cached ? "cached"
    : "searched";
  return { apiDown: data?.apiDown === true, status, found: data?.found ?? 0 };
}

export async function readResults(s: ChatState, userEmail: string): Promise<Omit<SearchOutcome, "apiDown" | "liveRan">> {
  if (!s.center) return { leads: [], hasMore: false, mappedHere: null, topTypes: [] };
  const b = bbox(s.center, s.radiusM);
  const types = s.placeType ? [s.placeType] : ALLOWED_LEAD_TYPES_SQL.filter((t) => !s.excludeTypes.includes(t));

  const rows = await sql`
    SELECT l.id, l.business_name, l.category, l.has_website, l.rating, l.review_count,
           l.address, l.area_slug, l.website_checked_at, (u.id IS NOT NULL) AS is_unlocked
    FROM leads l
    LEFT JOIN unlocks u ON u.lead_id = l.id AND u.unlocked_by = ${userEmail}
    WHERE l.category = ANY(${types})
      AND l.lat BETWEEN ${b.latMin} AND ${b.latMax}
      AND l.lng BETWEEN ${b.lngMin} AND ${b.lngMax}
      AND l.is_competitor = false
      ${s.noWebsiteOnly ? sql`AND ((l.has_website = false AND coalesce(l.website_url, '') = '') OR l.website_url ~* ${NOT_OWN_SITE_SQL})` : sql``}
      ${s.minReviews !== null ? sql`AND l.review_count >= ${s.minReviews}` : sql``}
      ${s.maxReviews !== null ? sql`AND l.review_count <= ${s.maxReviews}` : sql``}
      ${s.minRating !== null ? sql`AND l.rating >= ${s.minRating}` : sql``}
      ${s.maxRating !== null ? sql`AND l.rating <= ${s.maxRating}` : sql``}
    ORDER BY (l.has_website = false) DESC, l.review_count DESC NULLS LAST, l.id
    LIMIT ${(s.page + 1) * s.pageSize + 1}
  `;

  // "More" grows the list (1–40), it doesn't swap it for the next page — the panel kept only the
  // latest 20 and the first ones vanished.
  const shown = (s.page + 1) * s.pageSize;
  const hasMore = rows.length > shown;
  const leads: ChatLead[] = rows.slice(0, shown).map((r) => {
    // V2: every name stays masked until unlocked. v1 revealed businesses with a website, which
    // read as a random half of the list being hidden.
    const reveal = r.is_unlocked === true;
    return {
      id: r.id as string,
      business_name: reveal ? (r.business_name as string) : maskName(r.business_name as string),
      category: r.category ? (formatCategory(r.category as string) ?? (r.category as string)) : null,
      has_website: r.has_website as boolean | null,
      is_unlocked: r.is_unlocked as boolean,
      rating: r.rating as number | null,
      review_count: r.review_count as number | null,
      area: r.area_slug ? areaLabel(r.area_slug as string) : null,
      verified_at: r.website_checked_at ? new Date(r.website_checked_at as string).toISOString() : null,
      heat_score: heatScore({
        rating: r.rating,
        review_count: r.review_count,
        has_website: r.has_website,
        primary_type: r.category,
        section: r.category ? (TYPE_TO_SECTION[r.category] ?? null) : null,
        address: r.address,
      }),
    };
  });

  let mappedHere: number | null = null;
  if (leads.length === 0) {
    const [m] = await sql`
      SELECT count(*)::int AS n FROM leads
      WHERE lat BETWEEN ${b.latMin} AND ${b.latMax} AND lng BETWEEN ${b.lngMin} AND ${b.lngMax}
    `;
    mappedHere = Number(m?.n ?? 0);
  }

  let topTypes: Array<{ type: string; n: number }> = [];
  if (!s.placeType) {
    // Catch-all Google types say nothing about the trade, so they make useless chips.
    const generic = ["service", "store", "establishment", "point_of_interest", "corporate_office"];
    const t = await sql`
      SELECT category AS type, count(*)::int AS n FROM leads
      WHERE category = ANY(${types}) AND NOT (category = ANY(${generic}))
        AND lat BETWEEN ${b.latMin} AND ${b.latMax} AND lng BETWEEN ${b.lngMin} AND ${b.lngMax}
        AND is_competitor = false
        ${s.noWebsiteOnly ? sql`AND ((has_website = false AND coalesce(website_url, '') = '') OR website_url ~* ${NOT_OWN_SITE_SQL})` : sql``}
      GROUP BY 1 ORDER BY 2 DESC LIMIT 4
    `;
    topTypes = t.map((r) => ({ type: r.type as string, n: Number(r.n) }));
  }

  return { leads, hasMore, mappedHere, topTypes };
}

/** The cities we hold most leads for — the honest alternative when an area is not mapped. */
export async function coveredCities(limit = 3): Promise<Array<{ city: string; n: number }>> {
  const rows = await sql`
    SELECT city_slug, count(*)::int AS n FROM leads
    WHERE city_slug IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT ${limit}
  `;
  return rows.map((r) => ({ city: areaLabel(r.city_slug as string), n: Number(r.n) }));
}

/** Last place the user searched on the map — the default for "near me" instead of a question. */
export async function lastMapCenter(userEmail: string): Promise<{ lat: number; lng: number; label: string } | null> {
  const [row] = await sql`
    SELECT center_lat, center_lng, area_label FROM area_scans
    WHERE requested_by = ${userEmail} AND center_lat IS NOT NULL
    ORDER BY created_at DESC LIMIT 1
  `;
  if (!row) return null;
  const center = { lat: row.center_lat as number, lng: row.center_lng as number };
  // area_label is often raw ("28.4595,77.0266 (prescanned: delhi)") — never show coordinates.
  const raw = row.area_label as string;
  const label = /\d+\.\d+\s*,\s*\d+\.\d+/.test(raw) ? await placeName(center) : raw;
  return { ...center, label: label ?? "your last map area" };
}

const CITY_ALIASES: Record<string, string> = {
  gurugram: "gurgaon", ggn: "gurgaon", bengaluru: "bangalore", blr: "bangalore", bombay: "mumbai",
  calcutta: "kolkata", madras: "chennai", "new-delhi": "delhi", "delhi-ncr": "delhi",
};
const slug = (x: string) => x.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const citySlug = (x: string) => CITY_ALIASES[slug(x)] ?? slug(x);

/**
 * Resolve a place against the areas we already hold, before (and instead of) a Google geocode:
 * free, and still works when the Geocoding API refuses us. "Sector 56, Gurugram" matches
 * area_slug + city_slug; a single word matches a city first, then the busiest area of that name.
 */
/**
 * An area as the user wrote it: whole first, then — for lists like "Perambur and North Chennai" or
 * "Hauz Khas, GK, Vasant Kunj" (prod: both were asked back as "Which area?") — each part on its own,
 * with the list's last part (usually the city) added for context. The first part that resolves wins.
 */
const AREA_SPELLINGS: Array<[RegExp, string]> = [[/\brajeev\s+chowk\b/i, "Rajiv Chowk, New Delhi"], [/^\s*cp\s*$/i, "Connaught Place, New Delhi"], [/\bnorth\s+chennai\b/i, "Tondiarpet, Chennai"]];

export async function resolveArea(text: string): Promise<{ lat: number; lng: number; used: string } | null> {
  const { geocodeText } = await import("@/lib/geocode");
  for (const [re, to] of AREA_SPELLINGS) text = text.replace(re, to);
  const whole = (await localPlace(text)) ?? (await geocodeText(text)).value;
  if (whole) return { ...whole, used: text };
  const parts = text.split(/\s*(?:,|\band\b|&|\/|\baur\b)\s*/i).map((p) => p.trim()).filter((p) => p.length > 1);
  if (parts.length < 2) return null;
  const city = parts[parts.length - 1];
  for (const p of parts) {
    const q = p === city ? p : `${p}, ${city}`;
    const hit = (await localPlace(q)) ?? (await localPlace(p)) ?? (await geocodeText(q)).value ?? (await geocodeText(p)).value;
    if (hit) return { ...hit, used: p };
  }
  return null;
}

export async function localPlace(areaText: string): Promise<{ lat: number; lng: number } | null> {
  const parts = areaText.split(",").map((p) => p.trim()).filter(Boolean);
  let row;
  if (parts.length >= 2) {
    [row] = await sql`
      SELECT avg(lat) AS lat, avg(lng) AS lng, count(*)::int AS n FROM leads
      WHERE area_slug = ${slug(parts[0])} AND city_slug = ${citySlug(parts[parts.length - 1])}
    `;
  }
  if (!row?.n) {
    [row] = await sql`SELECT avg(lat) AS lat, avg(lng) AS lng, count(*)::int AS n FROM leads WHERE city_slug = ${citySlug(parts[0] ?? areaText)}`;
  }
  if (!row?.n) {
    [row] = await sql`
      SELECT avg(lat) AS lat, avg(lng) AS lng, count(*)::int AS n FROM leads
      WHERE area_slug = ${slug(parts[0] ?? areaText)}
      GROUP BY city_slug ORDER BY count(*) DESC LIMIT 1
    `;
  }
  return row?.n ? { lat: Number(row.lat), lng: Number(row.lng) } : null;
}

/** A readable name for a point — "Sector 56, Gurgaon" — from the leads around it. */
export async function placeName(center: { lat: number; lng: number }): Promise<string | null> {
  const b = bbox(center, 1000);
  const [row] = await sql`
    SELECT area_slug, city_slug FROM leads
    WHERE lat BETWEEN ${b.latMin} AND ${b.latMax} AND lng BETWEEN ${b.lngMin} AND ${b.lngMax} AND city_slug IS NOT NULL
    GROUP BY 1, 2 ORDER BY count(*) DESC LIMIT 1
  `;
  if (!row) return null;
  return [row.area_slug, row.city_slug].filter(Boolean).map((x) => areaLabel(x as string)).join(", ");
}
