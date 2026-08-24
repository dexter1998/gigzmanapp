import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

// Real Google Place Types (Table A), confirmed live — one per category label shown in the UI.
const CATEGORY_TYPE_MAP: Record<string, string> = {
  Barbershop: "barber_shop",
  "Hair salon": "hair_salon",
  "Nail salon": "nail_salon",
  Spa: "spa",
  Plumbing: "plumber",
  Electrician: "electrician",
  Landscaping: "landscaping",
  Roofing: "roofing_contractor",
};

type PlacesNearbyResult = {
  places?: Array<{
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    nationalPhoneNumber?: string;
    primaryType?: string;
  }>;
};

async function searchCategory(categoryLabel: string, lat: number, lng: number, radius: number) {
  const placeType = CATEGORY_TYPE_MAP[categoryLabel];
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.primaryType",
    },
    body: JSON.stringify({
      includedTypes: placeType ? [placeType] : undefined,
      maxResultCount: 20,
      // locationRestriction (not locationBias) — a HARD limit to this circle. locationBias only
      // nudges ranking and still returns distant matches, which is exactly why far-away results
      // were showing up ahead of genuinely nearby ones.
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: Math.min(radius, 50000) } },
    }),
  });
  if (!res.ok) return { category: categoryLabel, places: [] as PlacesNearbyResult["places"], error: await res.text() };
  const data = (await res.json()) as PlacesNearbyResult;
  return { category: categoryLabel, places: data.places ?? [], error: null as string | null };
}

/**
 * Viewport-driven discovery: the frontend sends the CURRENT MAP VIEWPORT (center + radius
 * derived from the visible bounds). When category is "all", fans out across every known
 * category in parallel via Nearby Search's `includedTypes` (a real, structured Google Place
 * type per category — Text Search's free-text query was previously the reason results skewed
 * toward whichever category's text happened to match best, e.g. "Barbershop"). Leads are
 * inserted with has_website = NULL — resolved separately via /api/leads/[id]/enrich.
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
  const areaLabel = `${lat.toFixed(4)},${lng.toFixed(4)} (${Math.round(radius)}m radius)`;

  const [scan] = await sql`
    INSERT INTO area_scans (requested_by, area_label, category, status)
    VALUES (${session.user.email}, ${areaLabel}, ${category ?? "All categories"}, 'discovering')
    RETURNING id
  `;

  const results = await Promise.all(categoriesToSearch.map((c) => searchCategory(c, lat, lng, radius)));

  const seen = new Set<string>();
  const allLeads: Array<{ id: string; lat: number | null; lng: number | null }> = [];

  for (const result of results) {
    for (const place of result.places ?? []) {
      if (seen.has(place.id)) continue;
      seen.add(place.id);

      const [row] = await sql`
        INSERT INTO leads (area_scan_id, place_id, business_name, category, address, lat, lng, phone, has_website)
        VALUES (
          ${scan.id}, ${place.id}, ${place.displayName?.text ?? "Unknown"}, ${place.primaryType ?? result.category},
          ${place.formattedAddress ?? null}, ${place.location?.latitude ?? null}, ${place.location?.longitude ?? null},
          ${place.nationalPhoneNumber ?? null}, NULL
        )
        ON CONFLICT (place_id) DO UPDATE SET place_id = EXCLUDED.place_id
        RETURNING id
      `;
      allLeads.push({
        id: row.id,
        lat: place.location?.latitude ?? null,
        lng: place.location?.longitude ?? null,
      });
    }
  }

  await sql`UPDATE area_scans SET status = 'done', completed_at = now() WHERE id = ${scan.id}`;

  return NextResponse.json({ scanId: scan.id, found: allLeads.length, leads: allLeads });
}
