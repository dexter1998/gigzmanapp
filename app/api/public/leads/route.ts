import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { maskName } from "@/lib/mask";
import { heatScore } from "@/lib/lead-quality";
import { TYPE_TO_SECTION } from "@/lib/categories";

// The landing page's hero map demo — unauthenticated, read-only, cache-only. No auth check
// because anonymous visitors need to see it before signing up, but for the exact same reason it
// must never be able to trigger a real Places API call: this only ever SELECTs from `leads`,
// there is no discovery/insert path reachable from this route. Every non-unlocked field is
// masked exactly like /api/leads does pre-unlock — a visitor here has no unlocks, ever.
const MAX_RADIUS_METERS = 3000;
const RESULT_LIMIT = 40;

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const radius = Math.min(Number(params.get("radius")) || 1200, MAX_RADIUS_METERS);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  // A simple degree-based bounding box, not a true great-circle radius — fine for a demo map at
  // this scale (a few km), and keeps this query index-friendly without needing PostGIS.
  const latDelta = radius / 111320;
  const lngDelta = radius / (111320 * Math.cos((lat * Math.PI) / 180));

  const rows = await sql`
    SELECT id, business_name, category, lat, lng, has_website, rating, review_count, is_competitor
    FROM leads
    WHERE lat BETWEEN ${lat - latDelta} AND ${lat + latDelta}
      AND lng BETWEEN ${lng - lngDelta} AND ${lng + lngDelta}
      AND is_competitor = false
    ORDER BY (CASE WHEN has_website = false THEN 0 ELSE 1 END), review_count DESC NULLS LAST
    LIMIT ${RESULT_LIMIT}
  `;

  const leads = rows.map((r) => ({
    id: r.id,
    business_name: maskName(r.business_name),
    category: r.category,
    section: r.category ? (TYPE_TO_SECTION[r.category] ?? null) : null,
    lat: r.lat,
    lng: r.lng,
    has_website: r.has_website,
    rating: r.rating,
    review_count: r.review_count,
    heat_score: heatScore({
      rating: r.rating,
      review_count: r.review_count,
      has_website: r.has_website,
      primary_type: r.category,
      section: r.category ? (TYPE_TO_SECTION[r.category] ?? null) : null,
      address: null,
    }),
  }));

  // Cached at the edge: this endpoint is unauthenticated, sits on the landing page, and reads
  // only already-scanned rows, so the same viewport asked for twice should not reach the
  // database twice. Crawlers hitting the landing page were doing exactly that.
  return NextResponse.json(
    { leads },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } }
  );
}
