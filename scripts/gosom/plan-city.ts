/**
 * Writes the gosom query list for one city, and prints the geo/zoom the run should use.
 *
 * gosom searches by phrase from a single anchor point, so covering a city means asking for many
 * kinds of business rather than walking a grid. The phrases are the same sweep list the Places scan
 * used (lib/pseo/scan-plan.ts), so the two sources fill the same categories and a page's category
 * mix does not change depending on which one happened to find a business.
 *
 *   npx tsx scripts/gosom/plan-city.ts london [tierA|all] > /tmp/q.txt
 */
import { CITY_BY_SLUG } from "@/lib/pseo/locations";
import { COUNTRY_BY_CODE } from "@/lib/pseo/countries";
import { SWEEPS } from "@/lib/pseo/scan-plan";

const slug = process.argv[2];
const scope = process.argv[3] ?? "all";
const city = CITY_BY_SLUG.get(slug);
if (!city) { console.error(`unknown city: ${slug}`); process.exit(2); }
const country = COUNTRY_BY_CODE.get(city.countryCode)!;

const sweeps = scope === "tierA" ? SWEEPS.filter((s) => s.tier === "A") : SWEEPS;
for (const s of sweeps) console.log(`${s.phrase} in ${city.name}, ${country.name}`);

// stderr so it does not land in the query file
console.error(`${sweeps.length} queries for ${city.name} (${country.name})`);
console.error(`GEO=${city.centroid.lat},${city.centroid.lng}`);
