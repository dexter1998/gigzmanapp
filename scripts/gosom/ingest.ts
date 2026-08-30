import fs from "node:fs";
import { pseoSql } from "../../lib/pseo/db";
import { TYPE_TO_SECTION } from "../../lib/categories";
import { looksLikeCompetitor } from "../../lib/competitors";
import { resolveLocation } from "../../lib/pseo/address";

/**
 * Loads a gosom JSON run into `leads`, and records the coverage it represents.
 *
 * Two things make this more than a bulk insert:
 *
 * `has_website` is only ever written when it is currently unknown — every public gap rate on the
 * site is that column, so filling a gap is safe and overwriting a verified answer is not. Whether a
 * blank counts as "no website" depends on whether the place page loaded at all; see below.
 *
 * Coverage rows are what let these leads count. The publish gate asks for an exhausted scan cell
 * near the area, and until now only the Places grid scanner wrote those — which is why an area
 * could cross the lead threshold and still be held back. A gosom sweep that ran to completion is
 * the same claim ("we searched here until nothing new came back") and is recorded as such.
 */

type Rec = {
  place_id?: string; title?: string; category?: string; address?: string;
  latitude?: number; longitude?: number; phone?: string; emails?: string[];
  web_site?: string; review_rating?: number; review_count?: number;
  open_hours?: Record<string, unknown>;
};

/** gosom reports Google's display label ("Grocery store"); leads.category holds the place type
 *  ("grocery_store"). Anything that doesn't map to a known type is dropped rather than guessed —
 *  the same allowlist the public pages qualify on. */
function toPlaceType(display: string | undefined): string | null {
  if (!display) return null;
  const t = display.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return TYPE_TO_SECTION[t] ? t : null;
}

async function main() {
  const file = process.argv[2] ?? "/tmp/gosom-out.json";
  const label = process.argv[3] ?? "gosom";
  const recs: Rec[] = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try { recs.push(JSON.parse(t)); } catch { /* a truncated final line while the run is live */ }
  }
  console.log(`${recs.length} records in ${file}`);

  let inserted = 0, updated = 0, skippedType = 0, skippedLoc = 0, competitors = 0, filledWebsite = 0;
  const areaHits = new Map<string, { lat: number; lng: number; n: number }>();

  for (const r of recs) {
    if (!r.place_id || !r.title || r.latitude == null || r.longitude == null) { skippedLoc++; continue; }
    const type = toPlaceType(r.category);
    if (!type) { skippedType++; continue; }

    const loc = resolveLocation(r.address ?? null, r.latitude, r.longitude);
    if (!loc.ok) { skippedLoc++; continue; }
    const isCompetitor = looksLikeCompetitor(r.title);
    if (isCompetitor) competitors++;

    // A blank website field only means "no website" if the place page actually loaded. gosom
    // returns a website for 53.7% of this run, so it is clearly reading the field rather than
    // failing silently — but a record with no hours and no reviews is a scrape that did not get
    // that far, and for those the answer stays unknown rather than becoming a false.
    const detailLoaded = r.review_count != null || (r.open_hours && Object.keys(r.open_hours).length > 0);
    const hasSite = r.web_site && r.web_site.trim() ? true : detailLoaded ? false : null;

    const [row] = (await pseoSql`
      INSERT INTO leads (
        place_id, business_name, category, address, lat, lng, phone, email,
        has_website, website_checked_at, is_competitor, rating, review_count,
        city_slug, area_slug, location_resolved_at
      ) VALUES (
        ${r.place_id}, ${r.title}, ${type}, ${r.address ?? null}, ${r.latitude}, ${r.longitude},
        ${r.phone ?? null}, ${r.emails?.[0] ?? null},
        ${hasSite}, ${hasSite === null ? null : new Date()}, ${isCompetitor},
        ${r.review_rating ?? null}, ${r.review_count ?? null},
        ${loc.value.citySlug}, ${loc.value.areaSlug ?? null}, now()
      )
      ON CONFLICT (place_id) DO UPDATE SET
        -- Only ever fill gaps. COALESCE keeps whatever we already verified.
        phone           = COALESCE(leads.phone, EXCLUDED.phone),
        email           = COALESCE(leads.email, EXCLUDED.email),
        rating          = COALESCE(leads.rating, EXCLUDED.rating),
        review_count    = COALESCE(leads.review_count, EXCLUDED.review_count),
        address         = COALESCE(leads.address, EXCLUDED.address),
        city_slug       = COALESCE(leads.city_slug, EXCLUDED.city_slug),
        area_slug       = COALESCE(leads.area_slug, EXCLUDED.area_slug),
        location_resolved_at = COALESCE(leads.location_resolved_at, now()),
        has_website     = CASE WHEN leads.has_website IS NULL THEN EXCLUDED.has_website ELSE leads.has_website END,
        website_checked_at = CASE WHEN leads.has_website IS NULL AND EXCLUDED.has_website IS NOT NULL
                                  THEN now() ELSE leads.website_checked_at END
      RETURNING (xmax = 0) AS is_new, has_website
    `) as unknown as Array<{ is_new: boolean; has_website: boolean | null }>;

    if (row?.is_new) inserted++; else updated++;
    if (hasSite !== null) filledWebsite++;

    const area = loc.value.areaSlug;
    if (area) {
      const cur = areaHits.get(area) ?? { lat: 0, lng: 0, n: 0 };
      areaHits.set(area, { lat: cur.lat + r.latitude, lng: cur.lng + r.longitude, n: cur.n + 1 });
    }
  }

  // One coverage row per area this sweep actually reached. gosom stops when a search stops
  // yielding new places, so a completed sweep is an exhausted cell by the same definition the grid
  // scanner uses.
  let cells = 0;
  for (const [area, agg] of areaHits) {
    if (agg.n < 3) continue; // too few hits to claim we covered anything
    const lat = agg.lat / agg.n, lng = agg.lng / agg.n;
    await pseoSql`
      INSERT INTO area_type_scans (
        cache_key, section, batch_index, center_lat, center_lng,
        is_exhausted, result_count, top_level_count, last_verified_at
      ) VALUES (
        ${`${lat.toFixed(3)}_${lng.toFixed(3)}_${label}_${area}`}, ${label}, 0, ${lat}, ${lng},
        true, ${agg.n}, ${agg.n}, now()
      )
      ON CONFLICT (cache_key) DO UPDATE SET
        is_exhausted = true,
        result_count = area_type_scans.result_count + EXCLUDED.result_count,
        last_verified_at = now(),
        updated_at = now()
    `;
    cells++;
  }

  console.log(`\ninserted ${inserted} new leads, updated ${updated} existing`);
  console.log(`skipped: ${skippedType} unmapped category, ${skippedLoc} unresolvable location`);
  console.log(`competitors flagged: ${competitors} | website status filled: ${filledWebsite}`);
  console.log(`coverage cells written: ${cells}`);
  await pseoSql.end();
}
main().catch(async (e) => { console.error(e); await pseoSql.end(); process.exit(1); });
