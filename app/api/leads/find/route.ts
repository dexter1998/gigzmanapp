import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { CATEGORY_SECTIONS, chunkTypes } from "@/lib/categories";

const CACHE_FRESHNESS_DAYS = 7;
const MAX_RESULTS_PER_SECTION = 50;

// Not a real Google Place Type (there's no "software company" type) — checked opportunistically
// against whatever the normal section search already returned, not via a separate dedicated
// search. A software/web/app dev shop showing up under "Business & B2B" (as corporate_office or
// consultant, say) gets flagged here instead of treated as a lead.
const COMPETITOR_NAME_KEYWORDS = [
  "web design", "web development", "website design", "website development",
  "software development", "software company", "software solutions", "app development",
  "mobile app development", "digital agency", "it solutions", "it services", "web solutions",
  "software technologies", "web technologies",
];

function looksLikeCompetitor(name: string): boolean {
  const text = name.toLowerCase();
  return COMPETITOR_NAME_KEYWORDS.some((k) => text.includes(k));
}

type PlacesResult = {
  places?: Array<{
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    nationalPhoneNumber?: string;
    primaryType?: string;
  }>;
  nextPageToken?: string;
};

function cacheKeyFor(lat: number, lng: number, section: string) {
  return `${lat.toFixed(2)}_${lng.toFixed(2)}_${section}`;
}

async function fetchNearbyPage(types: string[], lat: number, lng: number, radius: number, pageToken?: string) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.primaryType,nextPageToken",
    },
    body: JSON.stringify({
      includedTypes: types,
      maxResultCount: 20,
      pageToken,
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: Math.min(radius, 50000) } },
    }),
  });
  if (!res.ok) return { places: [] as PlacesResult["places"], nextPageToken: undefined };
  const data = (await res.json()) as PlacesResult;
  return { places: data.places ?? [], nextPageToken: data.nextPageToken };
}

/** Stops as soon as MAX_RESULTS_PER_SECTION is reached — no reason to keep paginating/batching
 * once there's enough to show. */
async function searchSection(section: string, lat: number, lng: number, radius: number, fullDepth: boolean) {
  const types = CATEGORY_SECTIONS[section] ?? [];
  const batches = chunkTypes(types, 50);
  const maxPages = fullDepth ? 3 : 1;
  const places: NonNullable<PlacesResult["places"]> = [];

  for (const batch of batches) {
    if (places.length >= MAX_RESULTS_PER_SECTION) break;
    let pageToken: string | undefined;
    for (let page = 0; page < maxPages; page++) {
      const result = await fetchNearbyPage(batch, lat, lng, radius, pageToken);
      places.push(...(result.places ?? []));
      if (places.length >= MAX_RESULTS_PER_SECTION || !result.nextPageToken) break;
      pageToken = result.nextPageToken;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return places.slice(0, MAX_RESULTS_PER_SECTION);
}

/**
 * Viewport-driven discovery for ONE section per call — "All categories" is now a frontend-driven
 * loop across sections (one request per section, refreshing the map after each) instead of a
 * single request fanning out server-side. This gives the progressive "still finding leads" feel
 * the map-pin reveal was designed for, and lets the frontend stop early once it has enough
 * results instead of always exhausting every section.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { lat?: number; lng?: number; radius?: number; category?: string; fullDepth?: boolean };
  if (body.lat == null || body.lng == null || !body.radius || !body.category) {
    return NextResponse.json({ error: "lat, lng, radius, and category are required" }, { status: 400 });
  }
  const lat: number = body.lat;
  const lng: number = body.lng;
  const radius: number = body.radius;
  const section: string = body.category;
  const fullDepth = body.fullDepth ?? true;
  const userEmail = session.user.email;

  const cacheKey = cacheKeyFor(lat, lng, section);

  // A shallow (1-page, pan-triggered) cache entry can answer a future shallow request, but must
  // never answer a full-depth one — otherwise a business beyond page 1 stays invisible for the
  // whole cache freshness window just because someone panned past that spot before ever
  // clicking a full search there.
  const [cached] = await sql`
    SELECT id FROM area_scans
    WHERE cache_key = ${cacheKey} AND status = 'done'
      AND completed_at > now() - (${CACHE_FRESHNESS_DAYS} || ' days')::interval
      AND full_depth >= ${fullDepth}
    ORDER BY full_depth DESC, completed_at DESC LIMIT 1
  `;

  let rows: Array<{ id: string; lat: number | null; lng: number | null; is_competitor: boolean }>;

  if (cached) {
    rows = (await sql`SELECT id, lat, lng, is_competitor FROM leads WHERE area_scan_id = ${cached.id}`) as typeof rows;
  } else {
    const [scan] = await sql`
      INSERT INTO area_scans (requested_by, area_label, center_lat, center_lng, category, cache_key, full_depth, status)
      VALUES (${userEmail}, ${`${lat.toFixed(4)},${lng.toFixed(4)}`}, ${lat}, ${lng}, ${section}, ${cacheKey}, ${fullDepth}, 'discovering')
      RETURNING id
    `;

    const places = await searchSection(section, lat, lng, radius, fullDepth);
    rows = [];

    for (const place of places) {
      const name = place.displayName?.text ?? "Unknown";
      const isCompetitor = looksLikeCompetitor(name);
      const [row] = await sql`
        INSERT INTO leads (area_scan_id, place_id, business_name, category, address, lat, lng, phone, has_website, is_competitor)
        VALUES (
          ${scan.id}, ${place.id}, ${name}, ${place.primaryType ?? section},
          ${place.formattedAddress ?? null}, ${place.location?.latitude ?? null}, ${place.location?.longitude ?? null},
          ${place.nationalPhoneNumber ?? null}, NULL, ${isCompetitor}
        )
        ON CONFLICT (place_id) DO UPDATE SET place_id = EXCLUDED.place_id
        RETURNING id, lat, lng, is_competitor
      `;
      rows.push(row as { id: string; lat: number | null; lng: number | null; is_competitor: boolean });
    }

    await sql`UPDATE area_scans SET status = 'done', completed_at = now() WHERE id = ${scan.id}`;
  }

  return NextResponse.json({ found: rows.length, leads: rows });
}
