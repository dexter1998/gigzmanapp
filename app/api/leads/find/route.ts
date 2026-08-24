import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

// Curated for "would realistically buy a website" — real, confirmed Google Place Types (Table A).
// Deliberately excludes big utility/franchise/government types (petrol pumps, banks, schools)
// that show up nearby but aren't addressable customers.
const CATEGORY_TYPE_MAP: Record<string, string> = {
  Barbershop: "barber_shop",
  "Hair salon": "hair_salon",
  "Nail salon": "nail_salon",
  Spa: "spa",
  Plumbing: "plumber",
  Electrician: "electrician",
  Landscaping: "landscaping",
  Roofing: "roofing_contractor",
  Lawyer: "lawyer",
  "CA / Accounting": "accounting",
  "Real Estate": "real_estate_agency",
  Dentist: "dentist",
  Gym: "gym",
  Insurance: "insurance_agency",
  "Travel Agency": "travel_agency",
  Photographer: "photographer",
};

const CACHE_FRESHNESS_DAYS = 7;

type PlacesNearbyResult = {
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

function cacheKeyFor(lat: number, lng: number, categoryLabel: string) {
  // ~1.1km grid cells (2 decimal places) — coarse enough that panning slightly still hits cache,
  // fine enough that "cached" still means "actually nearby".
  return `${lat.toFixed(2)}_${lng.toFixed(2)}_${categoryLabel}`;
}

async function fetchPlacesPage(placeType: string | undefined, lat: number, lng: number, radius: number, pageToken?: string) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.primaryType,nextPageToken",
    },
    body: JSON.stringify({
      includedTypes: placeType ? [placeType] : undefined,
      maxResultCount: 20,
      pageToken,
      // locationRestriction (hard limit) — not locationBias (soft nudge, still returns distant
      // matches, which was the earlier bug).
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: Math.min(radius, 50000) } },
    }),
  });
  if (!res.ok) return { places: [] as PlacesNearbyResult["places"], nextPageToken: undefined, error: await res.text() };
  const data = (await res.json()) as PlacesNearbyResult;
  return { places: data.places ?? [], nextPageToken: data.nextPageToken, error: null as string | null };
}

/** Fetches up to 3 pages (60 results) — Nearby Search (New)'s real per-category cap. */
async function searchCategoryPaginated(categoryLabel: string, lat: number, lng: number, radius: number) {
  const placeType = CATEGORY_TYPE_MAP[categoryLabel];
  const allPlaces: NonNullable<PlacesNearbyResult["places"]> = [];
  let pageToken: string | undefined;

  for (let page = 0; page < 3; page++) {
    const result = await fetchPlacesPage(placeType, lat, lng, radius, pageToken);
    allPlaces.push(...(result.places ?? []));
    if (!result.nextPageToken) break;
    pageToken = result.nextPageToken;
    // Google requires a short delay before a fresh pageToken becomes valid.
    await new Promise((r) => setTimeout(r, 2000));
  }

  return { category: categoryLabel, places: allPlaces };
}

/**
 * Viewport-driven discovery with caching: before hitting Places API for a given category, checks
 * for a recent (within CACHE_FRESHNESS_DAYS) completed scan of roughly the same grid cell — if
 * found, reuses those existing leads instead of re-paying for the same area again. Only
 * uncached categories actually call Places API. When category is "all", fans out across every
 * curated category, each independently cached.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { lat?: number; lng?: number; radius?: number; category?: string };
  const { lat, lng, radius, category } = body;
  if (lat == null || lng == null || !radius) {
    return NextResponse.json({ error: "lat, lng, and radius are required" }, { status: 400 });
  }

  const categoriesToSearch =
    !category || category === "All categories" ? Object.keys(CATEGORY_TYPE_MAP) : [category];

  const allLeads: Array<{ id: string; lat: number | null; lng: number | null }> = [];
  const seen = new Set<string>();

  for (const categoryLabel of categoriesToSearch) {
    const cacheKey = cacheKeyFor(lat, lng, categoryLabel);

    const [cached] = await sql`
      SELECT id FROM area_scans
      WHERE cache_key = ${cacheKey} AND status = 'done'
        AND completed_at > now() - (${CACHE_FRESHNESS_DAYS} || ' days')::interval
      ORDER BY completed_at DESC LIMIT 1
    `;

    if (cached) {
      const cachedLeads = await sql`SELECT id, lat, lng FROM leads WHERE area_scan_id = ${cached.id}`;
      for (const l of cachedLeads) {
        if (seen.has(l.id)) continue;
        seen.add(l.id);
        allLeads.push({ id: l.id as string, lat: l.lat as number | null, lng: l.lng as number | null });
      }
      continue;
    }

    const [scan] = await sql`
      INSERT INTO area_scans (requested_by, area_label, center_lat, center_lng, category, cache_key, status)
      VALUES (${session.user.email}, ${`${lat.toFixed(4)},${lng.toFixed(4)}`}, ${lat}, ${lng}, ${categoryLabel}, ${cacheKey}, 'discovering')
      RETURNING id
    `;

    const result = await searchCategoryPaginated(categoryLabel, lat, lng, radius);

    for (const place of result.places ?? []) {
      const [row] = await sql`
        INSERT INTO leads (area_scan_id, place_id, business_name, category, address, lat, lng, phone, has_website)
        VALUES (
          ${scan.id}, ${place.id}, ${place.displayName?.text ?? "Unknown"}, ${place.primaryType ?? categoryLabel},
          ${place.formattedAddress ?? null}, ${place.location?.latitude ?? null}, ${place.location?.longitude ?? null},
          ${place.nationalPhoneNumber ?? null}, NULL
        )
        ON CONFLICT (place_id) DO UPDATE SET place_id = EXCLUDED.place_id
        RETURNING id
      `;
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      allLeads.push({ id: row.id, lat: place.location?.latitude ?? null, lng: place.location?.longitude ?? null });
    }

    await sql`UPDATE area_scans SET status = 'done', completed_at = now() WHERE id = ${scan.id}`;
  }

  return NextResponse.json({ found: allLeads.length, leads: allLeads });
}
