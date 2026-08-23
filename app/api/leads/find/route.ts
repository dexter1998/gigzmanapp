import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

const CATEGORIES = [
  "Barbershop",
  "Hair salon",
  "Nail salon",
  "Spa",
  "Plumbing",
  "Electrician",
  "Landscaping",
  "Roofing",
];

type PlacesTextSearchResult = {
  places?: Array<{
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    nationalPhoneNumber?: string;
    primaryType?: string;
  }>;
};

async function searchCategory(category: string, lat: number, lng: number, radius: number) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.primaryType",
    },
    body: JSON.stringify({
      textQuery: category,
      locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: Math.min(radius, 50000) } },
    }),
  });
  if (!res.ok) return { category, places: [] as PlacesTextSearchResult["places"], error: await res.text() };
  const data = (await res.json()) as PlacesTextSearchResult;
  return { category, places: data.places ?? [], error: null as string | null };
}

/**
 * Viewport-driven discovery: the frontend sends the CURRENT MAP VIEWPORT (center + radius
 * derived from the visible bounds), not a typed address — matching Pindrop's actual "search
 * this area" behavior. When category is "all", fans out across every known category in
 * parallel and merges results (deduped by place_id via ON CONFLICT), since a single Places
 * Text Search query has no clean "any business type" mode. Leads are inserted with
 * has_website = NULL — enrichment is gosom's job on the EC2 worker (still pending), not
 * something this route runs.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { lat?: number; lng?: number; radius?: number; category?: string };
  const { lat, lng, radius, category } = body;
  if (lat == null || lng == null || !radius) {
    return NextResponse.json({ error: "lat, lng, and radius are required" }, { status: 400 });
  }

  const categoriesToSearch = !category || category === "All categories" ? CATEGORIES : [category];
  const areaLabel = `${lat.toFixed(4)},${lng.toFixed(4)} (${Math.round(radius)}m radius)`;

  const [scan] = await sql`
    INSERT INTO area_scans (requested_by, area_label, category, status)
    VALUES (${session.user.email}, ${areaLabel}, ${category ?? "All categories"}, 'discovering')
    RETURNING id
  `;

  const results = await Promise.all(categoriesToSearch.map((c) => searchCategory(c, lat, lng, radius)));

  const seen = new Set<string>();
  const allLeads: Array<{ lat: number | null; lng: number | null }> = [];

  for (const result of results) {
    for (const place of result.places ?? []) {
      if (seen.has(place.id)) continue;
      seen.add(place.id);

      await sql`
        INSERT INTO leads (area_scan_id, place_id, business_name, category, address, lat, lng, phone, has_website)
        VALUES (
          ${scan.id}, ${place.id}, ${place.displayName?.text ?? "Unknown"}, ${place.primaryType ?? result.category},
          ${place.formattedAddress ?? null}, ${place.location?.latitude ?? null}, ${place.location?.longitude ?? null},
          ${place.nationalPhoneNumber ?? null}, NULL
        )
        ON CONFLICT (place_id) DO NOTHING
      `;
      allLeads.push({ lat: place.location?.latitude ?? null, lng: place.location?.longitude ?? null });
    }
  }

  await sql`UPDATE area_scans SET status = 'done', completed_at = now() WHERE id = ${scan.id}`;

  return NextResponse.json({ scanId: scan.id, found: allLeads.length, leads: allLeads });
}
