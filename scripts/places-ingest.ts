/**
 * Loads the scan archive into `leads`, and records the coverage it represents.
 *
 * The counterpart to scripts/gosom/ingest.ts, and it keeps that file's two hard-won rules:
 *
 * `has_website` is only ever written when it is currently unknown — every public gap rate on the
 * site is that column, so filling a gap is safe and overwriting a verified answer is not. Unlike
 * the scraper path there is no ambiguity about a blank: `websiteUri` was in the field mask, so its
 * absence is Google's answer, not a failed page load.
 *
 * Coverage rows are what let these leads count. The publish gate asks for an exhausted scan cell
 * near the area, and a completed sweep is the same claim the grid scanner makes.
 *
 *   npx tsx scripts/places-ingest.ts [--dry]
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pseoSql } from "@/lib/pseo/db";
import { resolveLocation, type ResolutionFailure } from "@/lib/pseo/address";
import { isAllowedLeadType } from "@/lib/lead-quality";
import { looksLikeCompetitor } from "@/lib/competitors";
import { CITY_BY_SLUG } from "@/lib/pseo/locations";
import { TYPE_TO_SECTION } from "@/lib/categories";
import { ALLOWED_LEAD_TYPES_SQL } from "@/lib/lead-quality";
import type { ArchivedPlace } from "@/lib/pseo/archive";

const DATA_DIR = process.env.PLACES_DATA_DIR ?? path.join(os.homedir(), "Desktop", "mantis-places-data");
const DRY = process.argv.includes("--dry");

async function main() {
  const src = path.join(DATA_DIR, "places.ndjson");
  if (!fs.existsSync(src)) { console.error(`no archive at ${src}`); process.exit(1); }

  let inserted = 0, updated = 0, skippedType = 0, competitors = 0, total = 0;
  const failures: Record<string, number> = {};
  const areaHits = new Map<string, { lat: number; lng: number; n: number; city: string; country: string }>();

  for (const line of fs.readFileSync(src, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let r: ArchivedPlace; try { r = JSON.parse(line) as ArchivedPlace; } catch { continue; }
    total++;

    if (!r.place_id || !r.business_name || r.lat == null || r.lng == null) { failures["malformed"] = (failures["malformed"] ?? 0) + 1; continue; }
    const isCompetitor = looksLikeCompetitor(r.business_name);
    // Competitors are exempt from the allowlist everywhere else, so they are here too: their types
    // (software_company and friends) are deliberately not in it, and dropping them would lose the
    // red-pin signal the map depends on.
    if (!isCompetitor && !isAllowedLeadType(r.primary_type)) { skippedType++; continue; }
    if (isCompetitor) competitors++;

    const loc = resolveLocation(r.address ?? null, r.lat, r.lng, r.address_components ?? null);
    if (!loc.ok) { failures[loc.reason as ResolutionFailure] = (failures[loc.reason] ?? 0) + 1; continue; }

    const hasSite = !!r.website;
    if (DRY) { inserted++; continue; }

    const [out] = (await pseoSql`
      INSERT INTO leads (
        place_id, business_name, category, address, lat, lng, phone, has_website, website_url,
        website_checked_at, is_competitor, rating, review_count,
        country_code, city_slug, area_slug, postal_code, location_via, location_resolved_at
      ) VALUES (
        ${r.place_id}, ${r.business_name}, ${r.primary_type}, ${r.address ?? null}, ${r.lat}, ${r.lng},
        ${r.phone ?? null}, ${hasSite}, ${r.website ?? null}, ${new Date()}, ${isCompetitor},
        ${r.rating ?? null}, ${r.review_count ?? null},
        ${loc.value.countryCode}, ${loc.value.citySlug}, ${loc.value.areaSlug}, ${loc.value.postalCode},
        ${loc.value.via}, now()
      )
      ON CONFLICT (place_id) DO UPDATE SET
        phone           = COALESCE(leads.phone, EXCLUDED.phone),
        rating          = COALESCE(leads.rating, EXCLUDED.rating),
        review_count    = COALESCE(leads.review_count, EXCLUDED.review_count),
        address         = COALESCE(leads.address, EXCLUDED.address),
        country_code    = COALESCE(leads.country_code, EXCLUDED.country_code),
        city_slug       = COALESCE(leads.city_slug, EXCLUDED.city_slug),
        area_slug       = COALESCE(leads.area_slug, EXCLUDED.area_slug),
        postal_code     = COALESCE(leads.postal_code, EXCLUDED.postal_code),
        location_via    = COALESCE(leads.location_via, EXCLUDED.location_via),
        location_resolved_at = COALESCE(leads.location_resolved_at, now()),
        has_website     = CASE WHEN leads.has_website IS NULL THEN EXCLUDED.has_website ELSE leads.has_website END,
        website_url     = CASE WHEN leads.website_url IS NULL THEN EXCLUDED.website_url ELSE leads.website_url END,
        website_checked_at = CASE WHEN leads.has_website IS NULL THEN now() ELSE leads.website_checked_at END
      RETURNING (xmax = 0) AS is_new
    `) as unknown as Array<{ is_new: boolean }>;
    if (out?.is_new) inserted++; else updated++;

    const a = loc.value.areaSlug;
    if (a) {
      const cur = areaHits.get(a) ?? { lat: 0, lng: 0, n: 0, city: loc.value.citySlug, country: loc.value.countryCode };
      areaHits.set(a, { ...cur, lat: cur.lat + r.lat, lng: cur.lng + r.lng, n: cur.n + 1 });
    }
  }

  let cells = 0;
  if (!DRY) {
    for (const [area, agg] of areaHits) {
      if (agg.n < 3) continue; // too few hits to claim we covered anything
      const lat = agg.lat / agg.n, lng = agg.lng / agg.n;
      await pseoSql`
        INSERT INTO area_type_scans (cache_key, section, batch_index, center_lat, center_lng,
          is_exhausted, result_count, top_level_count, last_verified_at)
        VALUES (${`${lat.toFixed(3)}_${lng.toFixed(3)}_places_${area}`}, ${"places"}, 0, ${lat}, ${lng},
          true, ${agg.n}, ${agg.n}, now())
        ON CONFLICT (cache_key) DO UPDATE SET
          result_count = GREATEST(area_type_scans.result_count, EXCLUDED.result_count),
          is_exhausted = true, last_verified_at = now()
      `;
      cells++;
    }
  }

  // Per (city, section) coverage, so /api/leads/find can skip ground this sweep already owns.
  //
  // Recomputed from `leads` rather than accumulated in the loop above, because the claim has to be
  // about what is actually stored and queryable — including rows from earlier runs — not about
  // what this particular file happened to contain.
  //
  // A section needs a real number of leads before it counts. The sweep asks 106 phrases, not 370
  // types, so some sections are genuinely thin here; marking those covered would make the route
  // stop looking for businesses nobody ever searched for.
  const MIN_LEADS_PER_SECTION = 30;
  let regions = 0;
  if (!DRY) {
    const rows = (await pseoSql`
      SELECT city_slug, country_code, category, count(*)::int AS n
      FROM leads
      WHERE city_slug IS NOT NULL AND is_competitor = false
        AND category = ANY(${ALLOWED_LEAD_TYPES_SQL})
      GROUP BY 1, 2, 3
    `) as unknown as Array<{ city_slug: string; country_code: string; category: string; n: number }>;

    const bySection = new Map<string, { city: string; country: string; section: string; n: number }>();
    for (const r of rows) {
      const section = TYPE_TO_SECTION[r.category];
      if (!section) continue;
      const k = `${r.city_slug}|${section}`;
      const cur = bySection.get(k) ?? { city: r.city_slug, country: r.country_code, section, n: 0 };
      cur.n += r.n;
      bySection.set(k, cur);
    }

    for (const v of bySection.values()) {
      if (v.n < MIN_LEADS_PER_SECTION) continue;
      const city = CITY_BY_SLUG.get(v.city);
      if (!city) continue;
      await pseoSql`
        INSERT INTO prescanned_regions (country_code, city_slug, section, min_lat, min_lng, max_lat, max_lng, lead_count)
        VALUES (${city.countryCode}, ${city.slug}, ${v.section},
                ${city.bbox[0]}, ${city.bbox[1]}, ${city.bbox[2]}, ${city.bbox[3]}, ${v.n})
        ON CONFLICT (city_slug, section) DO UPDATE SET
          lead_count = EXCLUDED.lead_count, scanned_at = now(), updated_at = now()
      `;
      regions++;
    }
  }

  console.log(`${total} archived places${DRY ? " (dry run, nothing written)" : ""}`);
  console.log(`  ${inserted} new, ${updated} updated, ${competitors} competitors, ${cells} coverage cells`);
  console.log(`  ${regions} (city, section) pre-scanned regions recorded`);
  console.log(`  ${skippedType} dropped: category not in allowlist`);
  for (const [k, v] of Object.entries(failures).sort((a, b) => b[1] - a[1])) console.log(`  ${v} dropped: ${k}`);
  await pseoSql.end();
}
main().catch(async (e) => { console.error(e); await pseoSql.end(); process.exit(1); });
