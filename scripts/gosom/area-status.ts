/**
 * How close each city is to having area pages worth publishing.
 *
 * The target is qualifying leads per area, not leads per city: a city page can look healthy while
 * every area under it is too thin to carry a page, which is exactly the state London was in.
 *
 *   npx tsx scripts/gosom/area-status.ts [target] [country,...]
 */
import { pseoSql } from "@/lib/pseo/db";
import { ALLOWED_LEAD_TYPES_SQL } from "@/lib/lead-quality";

const TARGET = Number(process.argv[2] ?? 40);
const COUNTRIES = (process.argv[3] ?? "gb,us,au,ca").split(",");

async function main() {
  const rows = (await pseoSql`
    SELECT country_code, city_slug,
           count(*)::int AS places,
           count(*) FILTER (WHERE has_website = false)::int AS qualifying,
           count(DISTINCT area_slug)::int AS areas
    FROM leads
    WHERE country_code = ANY(${COUNTRIES}) AND is_competitor = false
      AND category = ANY(${ALLOWED_LEAD_TYPES_SQL})
    GROUP BY 1, 2
  `) as unknown as Array<{ country_code: string; city_slug: string; places: number; qualifying: number; areas: number }>;

  const hits = (await pseoSql`
    SELECT city_slug, count(*)::int AS n FROM (
      SELECT city_slug, area_slug, count(*) FILTER (WHERE has_website = false) AS q
      FROM leads
      WHERE country_code = ANY(${COUNTRIES}) AND area_slug IS NOT NULL AND is_competitor = false
        AND category = ANY(${ALLOWED_LEAD_TYPES_SQL})
      GROUP BY 1, 2
    ) t WHERE q >= ${TARGET} GROUP BY 1
  `) as unknown as Array<{ city_slug: string; n: number }>;
  const at = new Map(hits.map((h) => [h.city_slug, h.n]));

  console.log(`areas with >= ${TARGET} qualifying leads (the bar for two pages of twenty)\n`);
  console.log("cc  city            places  qualifying  areas  AT TARGET");
  for (const r of rows.sort((a, b) => (at.get(a.city_slug) ?? 0) - (at.get(b.city_slug) ?? 0))) {
    console.log(
      r.country_code.padEnd(3),
      r.city_slug.padEnd(15),
      String(r.places).padStart(6),
      String(r.qualifying).padStart(11),
      String(r.areas).padStart(6),
      String(at.get(r.city_slug) ?? 0).padStart(10)
    );
  }
  await pseoSql.end();
}
main().catch(async (e) => { console.error(e); await pseoSql.end(); process.exit(1); });
