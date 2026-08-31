import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { looksLikeCompetitor } from "@/lib/competitors";
import { CATEGORY_SECTIONS, chunkTypes } from "@/lib/categories";
import { isAllowedLeadType } from "@/lib/lead-quality";
import { recordApiFailure } from "@/lib/api-alerts";

// Anti-abuse: a real discovery request (one that would actually call Places API) for the same
// rounded area+category from the same user is throttled to once per this window — a user idling
// on the map fires the `idle` listener on every tiny jiggle, and the per-cell cache alone only
// stops re-billing for cells already confirmed exhausted, not the request-rate itself.
const PER_AREA_COOLDOWN_SECONDS = 45;
// A broader backstop above the per-area cooldown — catches erratic map interaction generally
// (rapid pan-zoom-pan cycling across many different areas) rather than just the one-spot case.
// 40 was calibrated back when a search was ~1 request per category; the tile-based grid search
// (up to 4 tiles x 9 categories, each tile+category needing its own request until exhausted) can
// legitimately need 30-50+ requests for ONE "All categories" search of a genuinely new area —
// confirmed live: normal use (3-4 location changes) was hitting this and going fully silent for
// the rest of the window with no explanation. This counts total requests, not just ones that
// actually bill Places API (area_scans gets a row per request regardless of whether the
// underlying tile+category was a cache hit), so raising it doesn't scale real cost 1:1 the way
// it looks like it would.
const SESSION_REQUEST_BUDGET = 120;
const SESSION_WINDOW_MINUTES = 5;
// Counts every request in the window, cache hits included -- purely a runaway-client backstop, not
// a spend control, so it sits far above what map use can reach. One "All categories" search is up
// to 9 sections x 4 tiles plus however many cells each needs, so a person exploring hard can
// legitimately produce a few hundred requests in five minutes.
const SESSION_RAW_REQUEST_CEILING = 1500;

// Bounds every scan to roughly a "default zoom" neighborhood regardless of what radius the client
// computes from its viewport — user report: zooming out toward city/state/country scale must not
// balloon into scanning that whole area. Enforced server-side so a client bug can't bypass it.
const MAX_SEARCH_RADIUS_METERS = 3000;
// Recursion floor for quadrant subdivision — below this, a capped cell is treated as exhausted
// anyway rather than subdividing into circles too small to mean anything.
const MIN_CELL_RADIUS_METERS = 150;
// Exactly one grid cell processed per batch per request — keeps each POST fast (one Places API
// call per type-batch) so the frontend can refresh pins after every request instead of a whole
// section's grid finishing silently in one long call. How many requests a section needs to fully
// resolve naturally scales with how many cells the current zoom/area produced (denser or
// wider-zoomed areas subdivide into more cells, so they take more, smaller round-trips).
const CELLS_PER_REQUEST_BUDGET = 1;

// Not a real Google Place Type (there's no "software company" type) — checked opportunistically
// against whatever the normal section search already returned, not via a separate dedicated
// search. A software/web/app dev shop showing up under "Business & B2B" (as corporate_office or
// consultant, say) gets flagged here instead of treated as a lead.

type PlacesResult = {
  places?: Array<{
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    nationalPhoneNumber?: string;
    primaryType?: string;
    rating?: number;
    userRatingCount?: number;
    websiteUri?: string;
  }>;
};

type Cell = { lat: number; lng: number; radius: number };

/** Every Places API call this process makes goes through here, so counting invocations of this
 * function is what "did this request actually cost money" means. See billed_places_calls. */
async function fetchNearbyBatch(types: string[], cell: Cell): Promise<{ places: NonNullable<PlacesResult["places"]>; failed: boolean }> {
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
      //
      // websiteUri is included here rather than fetched separately per-lead (the old /enrich
      // route) — confirmed against Google's own SKU tables that rating/userRatingCount/
      // nationalPhoneNumber/websiteUri are ALL billed under the same "Nearby Search Enterprise"
      // SKU ($35/1000 calls). Since this call already requests rating+userRatingCount+phone, it's
      // already paying Enterprise-tier price; websiteUri rides along in that same tier for free.
      // The old design paid an ADDITIONAL, separate Place Details Enterprise call ($20/1000) per
      // lead just to learn one boolean — confirmed live (Speedomania's real website came back
      // correctly in this same Nearby Search field mask) before removing the per-lead call.
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.primaryType,places.rating,places.userRatingCount,places.websiteUri",
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
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    await recordApiFailure("google_places", `HTTP ${res.status} from Nearby Search`, {
      status: res.status,
      body: bodyText.slice(0, 500),
      types,
      cell,
    });
    return { places: [], failed: true };
  }
  const data = (await res.json()) as PlacesResult;
  return { places: data.places ?? [], failed: false };
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

/**
 * A bulk sweep (scripts/places-scan.ts) already covered this point for this section.
 *
 * The grid cache below is keyed on an exact `lat_lng_section_batch` string that only this route's
 * own searchNearby grid ever writes, so an offline sweep is invisible to it — 125,000 stored leads
 * would sit in the table while every request re-bought them. This is the bridge: a region recorded
 * by the sweep, checked by geography instead of by cache key.
 *
 * Two things keep the claim honest. It is per (city, section), because the sweep asks 106 search
 * phrases rather than all 370 allowlisted types and some sections genuinely came back thin — those
 * are not recorded, so this returns false for them and the normal grid runs. And it expires: a
 * sweep is a snapshot, and businesses open and close.
 */
const PRESCAN_TTL_DAYS = 90;

async function prescannedCoverage(lat: number, lng: number, section: string) {
  const [row] = await sql`
    SELECT city_slug, lead_count FROM prescanned_regions
    WHERE section = ${section}
      AND ${lat} BETWEEN min_lat AND max_lat
      AND ${lng} BETWEEN min_lng AND max_lng
      AND scanned_at > now() - (${PRESCAN_TTL_DAYS} || ' days')::interval
    ORDER BY lead_count DESC
    LIMIT 1
  `;
  return (row as { city_slug: string; lead_count: number } | undefined) ?? null;
}

function cacheKeyFor(lat: number, lng: number, section: string, batchIndex: number) {
  return `${lat.toFixed(2)}_${lng.toFixed(2)}_${section}_${batchIndex}`;
}

// Past this age, an exhausted batch is no longer trusted blindly — the next visit spends exactly
// ONE cheap call (the staleness probe below) to check whether anything actually changed, instead
// of either staying silent forever or paying for a full re-scan on a timer regardless of need.
const STALENESS_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

/**
 * Grid-search discovery for one type-batch, resumable across requests via area_type_scans.
 * Skips a batch once exhausted for as long as it's still fresh (no freshness expiry within the
 * TTL). Otherwise picks up exactly where the last visit left off (pending_cells), so a repeat
 * visit fetches the NEXT slice of businesses instead of re-billing the API for ones already
 * stored — the actual cost waste the old design had.
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
    SELECT is_exhausted, pending_cells, top_level_count, last_verified_at
    FROM area_type_scans WHERE cache_key = ${cacheKey}
  `;

  if (existing?.is_exhausted) {
    const staleMs = Date.now() - new Date(existing.last_verified_at).getTime();
    if (staleMs < STALENESS_TTL_MS) {
      return { places: [] as NonNullable<PlacesResult["places"]>, hasMore: false, failed: false, apiCalls: 0 };
    }

    // Stale — spend exactly one call at the original top-level cell and compare its count
    // against the baseline from when this batch was last actually discovered. Same count is
    // treated as "nothing changed" (cheap: 1 call, not a full re-scan); a different count means
    // something real changed, so this batch is reset to non-exhausted and rediscovered from
    // scratch via the normal subdivision path on the next visit — no separate diffing logic
    // needed, it's the same mechanism a first-ever scan already uses.
    const { places: probe, failed: probeFailed } = await fetchNearbyBatch(types, { lat, lng, radius });
    const unchanged = probe.length === existing.top_level_count;

    await sql`
      UPDATE area_type_scans SET
        is_exhausted = ${unchanged},
        pending_cells = ${unchanged ? sql.json([]) : sql.json([{ lat, lng, radius }])},
        top_level_count = ${probe.length},
        last_verified_at = now(),
        result_count = result_count + ${unchanged ? 0 : probe.length},
        updated_at = now()
      WHERE cache_key = ${cacheKey}
    `;

    return { places: unchanged ? [] : probe, hasMore: !unchanged, failed: probeFailed, apiCalls: 1 };
  }

  const cellsToQuery: Cell[] =
    existing?.pending_cells?.length ? existing.pending_cells : [{ lat, lng, radius }];

  const thisRun = cellsToQuery.slice(0, CELLS_PER_REQUEST_BUDGET);
  const leftover = cellsToQuery.slice(CELLS_PER_REQUEST_BUDGET);
  const nextPending: Cell[] = [...leftover];
  const places: NonNullable<PlacesResult["places"]> = [];
  let topLevelCount: number | null = existing?.top_level_count ?? null;
  let anyFailed = false;
  let apiCalls = 0;

  for (const cell of thisRun) {
    const result = await fetchNearbyBatch(types, cell);
    apiCalls += 1;
    anyFailed = anyFailed || result.failed;
    places.push(...result.places);
    if (cell.lat === lat && cell.lng === lng && cell.radius === radius) {
      topLevelCount = result.places.length;
    }
    if (result.places.length >= 20 && cell.radius > MIN_CELL_RADIUS_METERS) {
      nextPending.push(...splitIntoQuadrants(cell));
    }
    // else: this cell is exhausted (returned under 20, or too small to subdivide further) — drop it
  }

  const isExhausted = nextPending.length === 0;
  await sql`
    INSERT INTO area_type_scans (cache_key, section, batch_index, center_lat, center_lng, is_exhausted, pending_cells, result_count, top_level_count, last_verified_at)
    VALUES (${cacheKey}, ${section}, ${batchIndex}, ${lat}, ${lng}, ${isExhausted}, ${sql.json(nextPending)}, ${places.length}, ${topLevelCount}, now())
    ON CONFLICT (cache_key) DO UPDATE SET
      is_exhausted = EXCLUDED.is_exhausted,
      pending_cells = EXCLUDED.pending_cells,
      result_count = area_type_scans.result_count + EXCLUDED.result_count,
      top_level_count = COALESCE(EXCLUDED.top_level_count, area_type_scans.top_level_count),
      last_verified_at = now(),
      updated_at = now()
  `;

  return { places, hasMore: !isExhausted, failed: anyFailed, apiCalls };
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
  const cooldownKey = `${lat.toFixed(2)}_${lng.toFixed(2)}_${section}`;

  // Both throttles below count only requests that actually called Places API
  // (billed_places_calls > 0). They exist to cap Google spend, and a request served entirely from
  // area_type_scans spends nothing -- counting those made a user panning around an area that is
  // already fully scanned (typically their own neighbourhood) hit the ceiling just as fast as one
  // exploring new ground, and then see nothing at all for the rest of the window.
  const [recentSameArea] = await sql`
    SELECT id FROM area_scans
    WHERE requested_by = ${userEmail} AND cache_key = ${cooldownKey}
      AND billed_places_calls > 0
      AND created_at > now() - (${PER_AREA_COOLDOWN_SECONDS} || ' seconds')::interval
    LIMIT 1
  `;
  if (recentSameArea) {
    return NextResponse.json({ found: 0, leads: [], hasMore: false, throttled: "area_cooldown" });
  }

  const [counts] = (await sql`
    SELECT COUNT(*) FILTER (WHERE billed_places_calls > 0)::int AS billed,
           COUNT(*)::int AS total
    FROM area_scans
    WHERE requested_by = ${userEmail}
      AND created_at > now() - (${SESSION_WINDOW_MINUTES} || ' minutes')::interval
  `) as [{ billed: number; total: number }];
  if (counts.billed >= SESSION_REQUEST_BUDGET) {
    return NextResponse.json({ found: 0, leads: [], hasMore: false, throttled: "session_budget" });
  }
  // Backstop so dropping cache hits from the budget above doesn't leave the request rate itself
  // uncapped. This one costs no Google money, only our own DB, so it sits far higher and should
  // only ever be reached by something automated rather than by a person using the map.
  if (counts.total >= SESSION_RAW_REQUEST_CEILING) {
    return NextResponse.json({ found: 0, leads: [], hasMore: false, throttled: "session_budget" });
  }

  const [scan] = await sql`
    INSERT INTO area_scans (requested_by, area_label, center_lat, center_lng, category, cache_key, status)
    VALUES (${userEmail}, ${`${lat.toFixed(4)},${lng.toFixed(4)}`}, ${lat}, ${lng}, ${section}, ${cooldownKey}, 'discovering')
    RETURNING id
  `;

  // Checked before any batch runs, because the answer applies to the whole section: if a sweep
  // already covered this ground there is nothing for the grid to find, and every call it would
  // make is one we have already paid for once.
  const prescan = await prescannedCoverage(lat, lng, section);
  if (prescan) {
    await sql`
      UPDATE area_scans
      SET status = 'done', completed_at = now(), billed_places_calls = 0,
          area_label = ${`${lat.toFixed(4)},${lng.toFixed(4)} (prescanned: ${prescan.city_slug})`}
      WHERE id = ${scan.id}
    `;
    // Same shape the fully-cached path already returns. The map draws its pins from the stored
    // leads inside the viewport (GET /api/leads), not from this response, so an empty `leads` here
    // means "nothing new to add", not "nothing here".
    return NextResponse.json({ found: 0, leads: [], hasMore: false, apiDown: false, cached: true });
  }

  const types = CATEGORY_SECTIONS[section] ?? [];
  const batches = chunkTypes(types, 50);
  const rows: Array<{ id: string; lat: number | null; lng: number | null; is_competitor: boolean }> = [];
  let hasMore = false;
  let apiDown = false;
  let placesCalls = 0;

  for (let i = 0; i < batches.length; i++) {
    const result = await discoverBatch(batches[i], section, i, lat, lng, radius);
    hasMore = hasMore || result.hasMore;
    apiDown = apiDown || result.failed;
    placesCalls += result.apiCalls;
    for (const place of result.places) {
      // Dropped entirely, not just hidden client-side — confirmed via a live audit that ~20% of
      // raw results are non-commercial (apartment/housing/association types Google occasionally
      // assigns regardless of what was searched for), and a lead with no phone number isn't
      // actually sellable to a customer of this product. Competitors are exempt from the phone
      // requirement — they're a flag, not something meant to be contacted.
      const name = place.displayName?.text ?? "Unknown";
      const isCompetitor = looksLikeCompetitor(name);
      // Allowlist, not denylist: Google attaches types we never requested (park, temples,
      // housing societies) to unrelated type queries — anything outside the curated list is
      // dropped before it costs an insert or a website check. Competitors are exempt (red-pin
      // flag, type deliberately not allowlisted).
      if (!isCompetitor && !isAllowedLeadType(place.primaryType)) continue;
      if (!isCompetitor && !place.nationalPhoneNumber) continue;

      const [row] = await sql`
        INSERT INTO leads (area_scan_id, place_id, business_name, category, address, lat, lng, phone, has_website, website_checked_at, is_competitor, rating, review_count)
        VALUES (
          ${scan.id}, ${place.id}, ${name}, ${place.primaryType ?? section},
          ${place.formattedAddress ?? null}, ${place.location?.latitude ?? null}, ${place.location?.longitude ?? null},
          ${place.nationalPhoneNumber ?? null}, ${Boolean(place.websiteUri)}, now(), ${isCompetitor}, ${place.rating ?? null}, ${place.userRatingCount ?? null}
        )
        ON CONFLICT (place_id) DO UPDATE SET place_id = EXCLUDED.place_id
        RETURNING id, lat, lng, is_competitor
      `;
      rows.push(row as { id: string; lat: number | null; lng: number | null; is_competitor: boolean });
    }
  }

  await sql`
    UPDATE area_scans
    SET status = 'done', completed_at = now(), billed_places_calls = ${placesCalls}
    WHERE id = ${scan.id}
  `;

  // cached: this request cost nothing at Google. The client uses it to tell "still discovering"
  // apart from "this area is already fully scanned", so it can stop draining and stop refetching.
  return NextResponse.json({ found: rows.length, leads: rows, hasMore, apiDown, cached: placesCalls === 0 });
}
