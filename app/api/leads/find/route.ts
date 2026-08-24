import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { CATEGORY_SECTIONS, SECTION_NAMES, chunkTypes } from "@/lib/categories";

const CACHE_FRESHNESS_DAYS = 7;

// Not a real Google Place Type (there isn't one for "software company") — these are web/app/
// software development shops, which are competitors, not leads. Detected via free-text Text
// Search instead of the structured Nearby Search allowlist, and flagged with is_competitor
// instead of going through the normal has_website enrichment.
const COMPETITOR_QUERIES = ["web design agency", "software development company", "app development company"];

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
  // ~1.1km grid cells (2 decimal places) — coarse enough that panning slightly still hits cache,
  // fine enough that "cached" still means "actually nearby".
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

/** One section can have well over 50 real place types (Food & Drink alone has 150+), but Nearby
 * Search (New) only accepts up to 50 combined included types per request — so a section search
 * is actually several batched requests. Only fetches a SECOND page when auto-triggered by a map
 * pan (fullDepth=false) — full 3-page depth is reserved for an explicit search click, since an
 * "All categories" pan-triggered search across every section needs to stay fast enough to run on
 * every `idle` event without timing out. */
async function searchSection(section: string, lat: number, lng: number, radius: number, fullDepth: boolean) {
  const types = CATEGORY_SECTIONS[section] ?? [];
  const batches = chunkTypes(types, 50);
  const maxPages = fullDepth ? 3 : 1;

  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      const places: NonNullable<PlacesResult["places"]> = [];
      let pageToken: string | undefined;
      for (let page = 0; page < maxPages; page++) {
        const result = await fetchNearbyPage(batch, lat, lng, radius, pageToken);
        places.push(...(result.places ?? []));
        if (!result.nextPageToken) break;
        pageToken = result.nextPageToken;
        await new Promise((r) => setTimeout(r, 2000)); // required before a fresh pageToken is valid
      }
      return places;
    })
  );

  return batchResults.flat();
}

async function searchCompetitors(lat: number, lng: number, radius: number) {
  const results = await Promise.all(
    COMPETITOR_QUERIES.map(async (q) => {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.primaryType",
        },
        body: JSON.stringify({
          textQuery: q,
          locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: Math.min(radius, 50000) } },
        }),
      });
      if (!res.ok) return [] as NonNullable<PlacesResult["places"]>;
      const data = (await res.json()) as PlacesResult;
      return data.places ?? [];
    })
  );
  return results.flat();
}

/**
 * Viewport-driven discovery with caching, organized by SECTION (Automotive, Food & Drink, etc.)
 * rather than individual place type. Sections run in PARALLEL (not sequentially) — with 13
 * sections and Food & Drink alone needing several paginated batches, a sequential "All
 * categories" scan was slow enough to time out when auto-triggered on every map pan/zoom. Also
 * runs a separate competitor pass (web/app/software dev shops) via free-text search, flagged
 * with is_competitor instead of the normal lead pipeline.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { lat?: number; lng?: number; radius?: number; category?: string; fullDepth?: boolean };
  if (body.lat == null || body.lng == null || !body.radius) {
    return NextResponse.json({ error: "lat, lng, and radius are required" }, { status: 400 });
  }
  // Reassigned to new consts so TS keeps the non-null narrowing inside the nested closure below
  // (processSection) — narrowing on destructured values from `body` doesn't reliably persist
  // into a function declared later in the same scope.
  const lat: number = body.lat;
  const lng: number = body.lng;
  const radius: number = body.radius;
  const { category, fullDepth = true } = body;
  const userEmail = session.user.email;

  const sectionsToSearch = !category || category === "All categories" ? SECTION_NAMES : [category];

  const allLeads: Array<{ id: string; lat: number | null; lng: number | null; is_competitor: boolean }> = [];
  const seen = new Set<string>();

  async function processSection(section: string) {
    const cacheKey = cacheKeyFor(lat, lng, section);

    // A shallow (1-page, pan-triggered) cache entry can answer a future shallow request, but
    // must NEVER answer a full-depth one — otherwise a business sitting on page 2/3 stays
    // invisible for the whole cache freshness window just because someone panned past that spot
    // before ever clicking a full search there.
    const [cached] = await sql`
      SELECT id FROM area_scans
      WHERE cache_key = ${cacheKey} AND status = 'done'
        AND completed_at > now() - (${CACHE_FRESHNESS_DAYS} || ' days')::interval
        AND full_depth >= ${fullDepth}
      ORDER BY full_depth DESC, completed_at DESC LIMIT 1
    `;

    if (cached) {
      return sql`SELECT id, lat, lng, is_competitor FROM leads WHERE area_scan_id = ${cached.id}`;
    }

    const [scan] = await sql`
      INSERT INTO area_scans (requested_by, area_label, center_lat, center_lng, category, cache_key, full_depth, status)
      VALUES (${userEmail}, ${`${lat.toFixed(4)},${lng.toFixed(4)}`}, ${lat}, ${lng}, ${section}, ${cacheKey}, ${fullDepth}, 'discovering')
      RETURNING id
    `;

    const places = await searchSection(section, lat, lng, radius, fullDepth);
    const rows = [];

    for (const place of places) {
      const [row] = await sql`
        INSERT INTO leads (area_scan_id, place_id, business_name, category, address, lat, lng, phone, has_website)
        VALUES (
          ${scan.id}, ${place.id}, ${place.displayName?.text ?? "Unknown"}, ${place.primaryType ?? section},
          ${place.formattedAddress ?? null}, ${place.location?.latitude ?? null}, ${place.location?.longitude ?? null},
          ${place.nationalPhoneNumber ?? null}, NULL
        )
        ON CONFLICT (place_id) DO UPDATE SET place_id = EXCLUDED.place_id
        RETURNING id, lat, lng, is_competitor
      `;
      rows.push(row);
    }

    await sql`UPDATE area_scans SET status = 'done', completed_at = now() WHERE id = ${scan.id}`;
    return rows;
  }

  const sectionRowSets = await Promise.all(sectionsToSearch.map(processSection));
  for (const rows of sectionRowSets) {
    for (const r of rows) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      allLeads.push({ id: r.id as string, lat: r.lat as number | null, lng: r.lng as number | null, is_competitor: r.is_competitor as boolean });
    }
  }

  // Competitor pass — separate from the cache/section machinery above since it's a small, fixed
  // set of text queries rather than a type-based allowlist scan.
  const competitorPlaces = await searchCompetitors(lat, lng, radius);
  for (const place of competitorPlaces) {
    const [row] = await sql`
      INSERT INTO leads (place_id, business_name, category, address, lat, lng, phone, has_website, is_competitor)
      VALUES (
        ${place.id}, ${place.displayName?.text ?? "Unknown"}, ${place.primaryType ?? "Competitor"},
        ${place.formattedAddress ?? null}, ${place.location?.latitude ?? null}, ${place.location?.longitude ?? null},
        ${place.nationalPhoneNumber ?? null}, NULL, true
      )
      ON CONFLICT (place_id) DO UPDATE SET is_competitor = true
      RETURNING id, lat, lng, is_competitor
    `;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    allLeads.push({ id: row.id, lat: row.lat as number | null, lng: row.lng as number | null, is_competitor: true });
  }

  return NextResponse.json({ found: allLeads.length, leads: allLeads });
}
