/**
 * Writes district-targeted gosom queries for one city.
 *
 * City-level phrases were the obvious thing to try and they do not work: measured on London, one
 * 106-query city sweep returned 1,851 records of which 1,377 (74%) were businesses already stored,
 * because both this scraper and Places ask Google the same question and get the same top results.
 * The same phrase list aimed at individual districts returned 1,433 new leads against 729
 * duplicates and took the target district from 27 qualifying to 60 — asking a narrower question is
 * what gets past Google's per-search ceiling.
 *
 * Districts come from the postal codes already stored for the city, so this only ever asks about
 * ground we know exists.
 *
 *   npx tsx scripts/gosom/plan-districts.ts london 12 > /tmp/q.txt
 */
import { pseoSql } from "@/lib/pseo/db";
import { CITY_BY_SLUG } from "@/lib/pseo/locations";

/** The low-website-penetration end of the sweep list. Professional services are ~0% gap outside
 *  India, so aiming a scrape at them spends the run finding businesses that already have sites. */
const PHRASES = [
  "barber shops", "takeaways", "hardware stores", "florists", "tailors", "dry cleaners",
  "nail salons", "cafes", "convenience stores", "beauty salons", "car repair garages",
  "bakeries", "pet shops", "gift shops", "shoe repair",
];

async function main() {
  const slug = process.argv[2];
  const limit = Number(process.argv[3] ?? 12);
  const city = CITY_BY_SLUG.get(slug);
  if (!city) { console.error(`unknown city: ${slug}`); process.exit(2); }
  // Australia's areas are suburb names rather than codes, so its targets come from the locality
  // stored on each lead rather than from a postal district.
  const col = city.countryCode === "au" ? "area_slug" : "split_part(postal_code, ' ', 1)";
  const rows = (await pseoSql.unsafe(`
    SELECT ${col} AS token,
           count(*) FILTER (WHERE has_website = false)::int AS qualifying,
           count(*)::int AS places
    FROM leads
    WHERE city_slug = $1 AND ${city.countryCode === "au" ? "area_slug" : "postal_code"} IS NOT NULL
    GROUP BY 1
    ORDER BY qualifying DESC, places DESC
    LIMIT $2
  `, [slug, String(limit)])) as unknown as Array<{ token: string; qualifying: number; places: number }>;

  if (!rows.length) { console.error(`no districts known for ${slug} yet — run a city sweep first`); process.exit(3); }

  for (const r of rows) for (const p of PHRASES) console.log(`${p} in ${r.token} ${city.name}`);

  console.error(`${rows.length} districts x ${PHRASES.length} phrases = ${rows.length * PHRASES.length} queries`);
  console.error(`targets: ${rows.map((r) => `${r.token}(${r.qualifying})`).join(" ")}`);
  console.error(`GEO=${city.centroid.lat},${city.centroid.lng}`);
  await pseoSql.end();
}
main().catch(async (e) => { console.error(e); await pseoSql.end(); process.exit(1); });
