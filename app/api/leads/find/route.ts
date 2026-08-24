import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { CATEGORY_SECTIONS, chunkTypes } from "@/lib/categories";

// Bounds every scan to roughly a "default zoom" neighborhood regardless of what radius the client
// computes from its viewport — user report: zooming out toward city/state/country scale must not
// balloon into scanning that whole area. Enforced server-side so a client bug can't bypass it.
const MAX_SEARCH_RADIUS_METERS = 3000;
// Recursion floor for quadrant subdivision — below this, a capped cell is treated as exhausted
// anyway rather than subdividing into circles too small to mean anything.
const MIN_CELL_RADIUS_METERS = 150;
// Per-request budget of grid cells actually queried for one batch — bounds a single HTTP call's
// latency/cost; any cells left over roll into pending_cells for the next visit to that area.
const CELLS_PER_REQUEST_BUDGET = 8;

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
};

type Cell = { lat: number; lng: number; radius: number };

async function fetchNearbyBatch(types: string[], cell: Cell) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
      // Nearby Search (New) has no pagination — its response only ever has a `places` array, no
      // nextPageToken. Requesting that field (a leftover Text-Search-only assumption) made every
      // single call here fail with INVALID_ARGUMENT, silently returning zero results — confirmed
      // live via curl. Going past its flat 20-result cap now happens via quadrant subdivision
      // (see splitIntoQuadrants) instead of pagination, since the API genuinely has none.
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.primaryType",
    },
    body: JSON.stringify({
      includedTypes: types,
      maxResultCount: 20,
      // Nearby Search (New) defaults to POPULARITY ranking, not distance — confirmed live: a
      // business 400m away was getting pushed out of the 20-result cap by more "prominent"
      // places 2-4km out. DISTANCE ranking fixes that, matching what "nearby" actually means.
      rankPreference: "DISTANCE",
      locationRestriction: { circle: { center: { latitude: cell.lat, longitude: cell.lng }, radius: cell.radius } },
    }),
  });
  if (!res.ok) return [] as NonNullable<PlacesResult["places"]>;
  const data = (await res.json()) as PlacesResult;
  return data.places ?? [];
}

/** Splits a capped circle into 4 overlapping quadrant sub-circles at half the radius — the
 * standard way to get past Nearby Search's flat 20-result cap without real pagination. Offsets
 * are converted from meters to degrees (111,320 m/deg latitude; longitude scaled by cos(lat)). */
function splitIntoQuadrants(cell: Cell): Cell[] {
  const subRadius = cell.radius / 2;
  const offsetMeters = cell.radius / 2;
  const dLat = offsetMeters / 111320;
  const dLng = offsetMeters / (111320 * Math.cos((cell.lat * Math.PI) / 180));
  return [
    { lat: cell.lat + dLat, lng: cell.lng + dLng, radius: subRadius },
    { lat: cell.lat + dLat, lng: cell.lng - dLng, radius: subRadius },
    { lat: cell.lat - dLat, lng: cell.lng + dLng, radius: subRadius },
    { lat: cell.lat - dLat, lng: cell.lng - dLng, radius: subRadius },
  ];
}

function cacheKeyFor(lat: number, lng: number, section: string, batchIndex: number) {
  return `${lat.toFixed(2)}_${lng.toFixed(2)}_${section}_${batchIndex}`;
}

/**
 * Grid-search discovery for one type-batch, resumable across requests via area_type_scans.
 * Permanently skips a batch once exhausted (every sub-cell returned under 20 — nothing left to
 * find, no freshness expiry). Otherwise picks up exactly where the last visit left off
 * (pending_cells), so a repeat visit fetches the NEXT slice of businesses instead of re-billing
 * the API for ones already stored — the actual cost waste the old design had.
 */
async function discoverBatch(
  types: string[],
  section: string,
  batchIndex: number,
  lat: number,
  lng: number,
  radius: number
) {
  const cacheKey = cacheKeyFor(lat, lng, section, batchIndex);
  const [existing] = await sql`
    SELECT is_exhausted, pending_cells FROM area_type_scans WHERE cache_key = ${cacheKey}
  `;

  if (existing?.is_exhausted) return [];

  const cellsToQuery: Cell[] =
    existing?.pending_cells?.length ? existing.pending_cells : [{ lat, lng, radius }];

  const thisRun = cellsToQuery.slice(0, CELLS_PER_REQUEST_BUDGET);
  const leftover = cellsToQuery.slice(CELLS_PER_REQUEST_BUDGET);
  const nextPending: Cell[] = [...leftover];
  const places: NonNullable<PlacesResult["places"]> = [];

  for (const cell of thisRun) {
    const result = await fetchNearbyBatch(types, cell);
    places.push(...result);
    if (result.length >= 20 && cell.radius > MIN_CELL_RADIUS_METERS) {
      nextPending.push(...splitIntoQuadrants(cell));
    }
    // else: this cell is exhausted (returned under 20, or too small to subdivide further) — drop it
  }

  const isExhausted = nextPending.length === 0;
  await sql`
    INSERT INTO area_type_scans (cache_key, section, batch_index, center_lat, center_lng, is_exhausted, pending_cells, result_count)
    VALUES (${cacheKey}, ${section}, ${batchIndex}, ${lat}, ${lng}, ${isExhausted}, ${sql.json(nextPending)}, ${places.length})
    ON CONFLICT (cache_key) DO UPDATE SET
      is_exhausted = EXCLUDED.is_exhausted,
      pending_cells = EXCLUDED.pending_cells,
      result_count = area_type_scans.result_count + EXCLUDED.result_count,
      updated_at = now()
  `;

  return places;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { lat?: number; lng?: number; radius?: number; category?: string };
  if (body.lat == null || body.lng == null || !body.radius || !body.category) {
    return NextResponse.json({ error: "lat, lng, radius, and category are required" }, { status: 400 });
  }
  const lat: number = body.lat;
  const lng: number = body.lng;
  const radius = Math.min(body.radius, MAX_SEARCH_RADIUS_METERS);
  const section: string = body.category;
  const userEmail = session.user.email;

  const [scan] = await sql`
    INSERT INTO area_scans (requested_by, area_label, center_lat, center_lng, category, status)
    VALUES (${userEmail}, ${`${lat.toFixed(4)},${lng.toFixed(4)}`}, ${lat}, ${lng}, ${section}, 'discovering')
    RETURNING id
  `;

  const types = CATEGORY_SECTIONS[section] ?? [];
  const batches = chunkTypes(types, 50);
  const rows: Array<{ id: string; lat: number | null; lng: number | null; is_competitor: boolean }> = [];

  for (let i = 0; i < batches.length; i++) {
    const places = await discoverBatch(batches[i], section, i, lat, lng, radius);
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
  }

  await sql`UPDATE area_scans SET status = 'done', completed_at = now() WHERE id = ${scan.id}`;

  return NextResponse.json({ found: rows.length, leads: rows });
}
