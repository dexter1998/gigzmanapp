import { pseoSql } from "../../lib/pseo/db";
import { areaDisplayName } from "../../lib/pseo/locations";
import { formatCategory } from "../../lib/categories";
import fs from "node:fs";

/**
 * Builds the query list for a gosom run, aimed only at what is actually short.
 *
 * gosom searches by phrase, not by grid, so the way to cover an area is to ask for the kinds of
 * business we know are under-counted there. Both halves of the shortfall get their own queries:
 * areas that are thin overall, and categories that are thin across the whole city.
 */
async function main() {
  const areas = (await pseoSql`
    SELECT p.area_slug, p.qualifying_leads,
           avg(l.lat)::float8 AS lat, avg(l.lng)::float8 AS lng, count(l.id)::int AS known
    FROM pseo_pages p
    JOIN leads l ON l.area_slug = p.area_slug AND l.city_slug = p.city_slug
    WHERE p.status <> 'published' AND p.page_type = 'area'
    GROUP BY p.area_slug, p.qualifying_leads
    ORDER BY p.qualifying_leads DESC
  `) as unknown as Array<{ area_slug: string; qualifying_leads: number; lat: number; lng: number; known: number }>;

  const cats = (await pseoSql`
    SELECT category_slug, qualifying_leads FROM pseo_pages
    WHERE status <> 'published' AND page_type = 'category'
    ORDER BY qualifying_leads DESC
  `) as unknown as Array<{ category_slug: string; qualifying_leads: number }>;

  // Broad sweeps for a thin area: the categories that dominate Indian high streets, so one pass
  // over an area picks up most of what is missing rather than one shop type at a time.
  const AREA_SWEEPS = [
    "shops", "restaurants", "clinics", "salons", "general stores",
    "consultants", "coaching classes", "repair services",
  ];

  const queries: string[] = [];
  for (const a of areas) {
    const name = areaDisplayName(a.area_slug);
    for (const s of AREA_SWEEPS) queries.push(`${s} in ${name} Gurgaon`);
  }
  for (const c of cats) {
    const label = formatCategory(c.category_slug) ?? c.category_slug.replace(/_/g, " ");
    queries.push(`${label} in Gurgaon`);
  }

  fs.writeFileSync("/tmp/gosom-queries.txt", queries.join("\n") + "\n");
  fs.writeFileSync(
    "/tmp/gosom-areas.json",
    JSON.stringify(areas.map((a) => ({ slug: a.area_slug, lat: a.lat, lng: a.lng })), null, 2)
  );
  console.log(`${areas.length} thin areas × ${AREA_SWEEPS.length} sweeps + ${cats.length} thin categories`);
  console.log(`${queries.length} queries -> /tmp/gosom-queries.txt`);
  await pseoSql.end();
}
main().catch(async (e) => { console.error(e); await pseoSql.end(); process.exit(1); });
