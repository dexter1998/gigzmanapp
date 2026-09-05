import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { maskName } from "@/lib/mask";
import { heatScore } from "@/lib/lead-quality";
import { TYPE_TO_SECTION } from "@/lib/categories";
import { ALLOWED_LEAD_TYPES_SQL } from "@/lib/lead-quality";

// A map viewport shows a few dozen pins, not five hundred, and every row here carries the full
// lead record. Returning 500 on every pan was the single largest source of database egress in
// the app — enough to exhaust a hosted Postgres transfer quota on a 40 MB database.
const DEFAULT_LIMIT = 120;
const MAX_LIMIT = 500;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const hasWebsite = params.get("has_website"); // "true" | "false" | null (= any)
  const category = params.get("category");
  const unlockedOnly = params.get("unlocked") === "true";
  // Clamped rather than trusted: an unbounded ?limit would hand any signed-in caller the whole
  // table in one request.
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(params.get("limit")) || DEFAULT_LIMIT));
  const userEmail = session.user.email;

  // Viewport bounds. Without them this returns the newest 500 leads in the entire table, which is
  // wrong for a map in two ways: an area scanned a while ago falls out of that window entirely, so
  // panning back to it shows nothing even though every lead is already stored; and the map has to
  // wait for discovery to run before it can draw anything at all. With bounds, the leads already
  // in the database for wherever the user is looking come back in one indexed query, so a grid
  // that has been scanned before renders immediately and discovery becomes a background top-up.
  const nums = ["sw_lat", "sw_lng", "ne_lat", "ne_lng"].map((k) => {
    const raw = params.get(k);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  });
  const bounded = nums.every((n) => n !== null);
  const [swLat, swLng, neLat, neLng] = nums as [number, number, number, number];
  // Midpoint of the viewport -- used to rank rows by proximity below. Squared Euclidean
  // distance on raw lat/lng (no haversine, no cos-latitude correction) is fine here: viewports
  // are city-block scale, not continent scale, so it orders the same as a true great-circle
  // distance would, at a fraction of the cost.
  const centerLat = bounded ? (swLat + neLat) / 2 : null;
  const centerLng = bounded ? (swLng + neLng) / 2 : null;

  const rows = await sql`
    SELECT l.id, l.business_name, l.category, l.address, l.lat, l.lng, l.phone, l.email,
           l.has_website, l.contacted, l.is_competitor, l.created_at, l.rating, l.review_count,
           (u.id IS NOT NULL) AS is_unlocked,
           -- Enrichment rides along rather than being fetched per row: the leads table shows a
           -- "More details" control for every saved lead, and one request per visible row just to
           -- learn which of them are queued would be a request storm for information already here.
           e.status AS enrichment_status,
           e.website_url AS enrichment_website_url,
           e.description AS enrichment_description,
           e.services AS enrichment_services,
           e.price_level AS enrichment_price_level,
           e.business_status AS enrichment_business_status,
           e.open_hours AS enrichment_open_hours
    FROM leads l
    LEFT JOIN unlocks u ON u.lead_id = l.id AND u.unlocked_by = ${userEmail}
    LEFT JOIN lead_enrichment e ON e.lead_id = l.id
    WHERE 1=1
      ${
        bounded
          ? sql`AND l.lat BETWEEN ${Math.min(swLat, neLat)} AND ${Math.max(swLat, neLat)}
                AND l.lng BETWEEN ${Math.min(swLng, neLng)} AND ${Math.max(swLng, neLng)}`
          : sql``
      }
      ${hasWebsite === "true" ? sql`AND l.has_website = true` : sql``}
      ${hasWebsite === "false" ? sql`AND l.has_website = false` : sql``}
      ${category ? sql`AND l.category = ${category}` : sql``}
      AND (l.is_competitor = true OR l.category = ANY(${ALLOWED_LEAD_TYPES_SQL}))
      ${unlockedOnly ? sql`AND u.id IS NOT NULL` : sql``}
    -- Ranking by recency here (as this used to) means a dense, well-scanned neighborhood loses
    -- its closest-to-center leads to whatever rows happen to be newest anywhere in the bounding
    -- box -- often from a different tile/session entirely -- once the box holds more rows than
    -- the limit. That's what made pins vanish/reshuffle on pan: every map idle event re-fires
    -- this query with new bounds, and each time a different recency-based subset survives the
    -- cut. Ordering by distance from the viewport's own center instead means the LIMIT always
    -- keeps the leads nearest to what's actually on screen.
    ORDER BY ${
      bounded
        ? sql`((l.lat - ${centerLat}) ^ 2 + (l.lng - ${centerLng}) ^ 2) ASC`
        : sql`l.created_at DESC`
    }
    LIMIT ${limit}
  `;

  // Real protection, not cosmetic — an unpurchased lead's identity/contact info must not be
  // recoverable from the raw response even if a client happened to skip the masked display value.
  // Competitors are exempt: there's nothing to sell on a competitor, showing who they are is the
  // whole point of flagging them. A business that already has a website is exempt for the same
  // reason — it was never actually sellable as a lead, so there's nothing being protected by
  // hiding its name either.
  const leads = rows.map((r) => {
    const reveal = r.is_unlocked || r.is_competitor || r.has_website === true;
    return {
      ...r,
      business_name: reveal ? r.business_name : maskName(r.business_name),
      // Category isn't identity — knowing "Coaching Center" doesn't let anyone recover which
      // specific business this is, so there's nothing to protect by masking it, and showing it
      // in full pre-unlock helps decide whether the lead is worth a credit at all.
      category: r.category,
      address: reveal ? r.address : null,
      phone: reveal ? r.phone : null,
      email: reveal ? r.email : null,
      // Enrichment only ever runs on an unlocked lead, so a row here already implies the unlock —
      // but the scraped website is contact-grade information, so it follows the same rule as the
      // rest rather than relying on that.
      enrichment_website_url: reveal ? r.enrichment_website_url : null,
      // Visible pre-unlock on purpose — it's meant to help decide whether a lead is worth the
      // credit BEFORE spending it, not a reward for spending it.
      heat_score: r.is_competitor
        ? null
        : heatScore({
            rating: r.rating,
            review_count: r.review_count,
            has_website: r.has_website,
            primary_type: r.category,
            section: r.category ? (TYPE_TO_SECTION[r.category] ?? null) : null,
            address: r.address,
          }),
    };
  });

  return NextResponse.json({ leads });
}
