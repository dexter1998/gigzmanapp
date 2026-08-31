/**
 * Proposes `Area` registry entries from the scan archive's own addressComponents.
 *
 * Areas are the reason a city is worth more than one page: Gurgaon's 124 pages are mostly area
 * pages, and a city page cannot publish at all without at least three of them. Every city outside
 * Gurgaon currently has zero, because the area registry was hand-written for one city — so the
 * data is there and the pages are not.
 *
 * The archive already carries what is needed. `sublocality` and `neighborhood` come back labelled
 * in every Places response, which is exactly the token a hand-written alias would have had to
 * guess at.
 *
 * Like scripts/pseo-geocode-cities.ts this prints a draft for a human to paste rather than editing
 * the registry itself. The registry's own header explains why: slug choice is a search decision
 * ("Gurgaon" over "Gurugram"), and an algorithm reading address frequencies picks the wrong one.
 * What is automated here is the part that is mechanical — which localities exist and how big they
 * are — not the part that is judgement.
 *
 *   npx tsx scripts/pseo-area-candidates.ts [--min-qualifying 25] [--city <slug>]
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { AREAS, CITIES, CITY_BY_SLUG, normalizeToken, citiesContaining } from "@/lib/pseo/locations";
import type { ArchivedPlace } from "@/lib/pseo/archive";
import { isAllowedLeadType } from "@/lib/lead-quality";
import { areaStrategyFor, postalDistrict } from "@/lib/pseo/countries";
import { minPublishFor } from "@/lib/pseo/gate";

const DATA_DIR = process.env.PLACES_DATA_DIR ?? path.join(os.homedir(), "Desktop", "mantis-places-data");
const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? undefined : process.argv[i + 1]; };
const FIXED_MIN = arg("min-qualifying") ? Number(arg("min-qualifying")) : null;
const ONLY_CITY = arg("city");
const ONLY_COUNTRIES = arg("countries")?.split(",").map((c) => c.trim());
/** Without --min-qualifying, each country uses its own publish threshold — the same number the
 *  gate will apply — so an area is proposed exactly when it could carry a page. */
const minFor = (countryCode: string) => FIXED_MIN ?? minPublishFor(countryCode);

const slugify = (s: string) => normalizeToken(s).replace(/\s+/g, "-");

type Cand = { name: string; citySlug: string; total: number; qualifying: number; lat: number; lng: number };

function main() {
  const src = path.join(DATA_DIR, "places.ndjson");
  const cands = new Map<string, Cand>();

  for (const line of fs.readFileSync(src, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let r: ArchivedPlace; try { r = JSON.parse(line) as ArchivedPlace; } catch { continue; }
    // Both coordinates, not just the latitude: the centroid below averages them, and one null
    // longitude is enough to put an area on the prime meridian.
    if (!isAllowedLeadType(r.primary_type) || r.lat == null || r.lng == null) continue;

    // The area is attributed to whichever registered city actually contains the point, not to the
    // city the scan was aimed at — a sweep of "Mumbai" returns places in Navi Mumbai and Thane,
    // and filing their localities under Mumbai is how a registry starts describing the wrong place.
    const city = citiesContaining(r.lat, r.lng)[0];
    if (!city) continue;

    const comps = r.address_components ?? [];
    // Per-country, because the component that names a neighbourhood differs — see AREA_STRATEGY.
    const strategy = areaStrategyFor(city.countryCode);
    let token: string | undefined;
    for (const t of strategy.types) {
      token = comps.find((c) => c.types?.includes(t))?.longText ?? undefined;
      if (token) break;
    }
    if (!token && strategy.postalDistrict) {
      token = postalDistrict(comps.find((c) => c.types?.includes("postal_code"))?.longText ?? null) ?? undefined;
    }
    // Australia's locality IS the suburb, so the city name itself turns up in the area slot for
    // anything addressed to the CBD. That is the city, not an area of it.
    if (!token || normalizeToken(token) === normalizeToken(city.name)) continue;
    if (ONLY_CITY && city.slug !== ONLY_CITY) continue;
    if (ONLY_COUNTRIES && !ONLY_COUNTRIES.includes(city.countryCode)) continue;

    const key = `${city.slug}|${normalizeToken(token)}`;
    const c = cands.get(key) ?? { name: token, citySlug: city.slug, total: 0, qualifying: 0, lat: 0, lng: 0 };
    c.total++; c.lat += r.lat; c.lng += r.lng;
    if (!r.website) c.qualifying++;
    cands.set(key, c);
  }

  const strong = [...cands.values()]
    .filter((c) => c.qualifying >= minFor(CITY_BY_SLUG.get(c.citySlug)!.countryCode))
    .sort((a, b) => (a.citySlug === b.citySlug ? b.qualifying - a.qualifying : a.citySlug.localeCompare(b.citySlug)));

  const byCity = new Map<string, Cand[]>();
  for (const c of strong) { const l = byCity.get(c.citySlug) ?? []; l.push(c); byCity.set(c.citySlug, l); }

  // Seeded from what is already registered: area slugs share one namespace, so a proposal that
  // reuses one would silently take over an existing page rather than create a new one.
  const usedSlugs = new Set<string>(AREAS.map((a) => a.slug));
  for (const [citySlug, list] of byCity) {
    const city = CITY_BY_SLUG.get(citySlug)!;
    console.log(`\n  // ${city.name}, ${city.state} — ${list.length} areas with >= ${minFor(city.countryCode)} qualifying leads`);
    for (const c of list) {
      // Area slugs share one namespace with every other area, so a repeated locality name (Model
      // Town exists in several Indian cities) is qualified by its city rather than silently
      // overwriting the first one registered.
      let slug = slugify(c.name);
      if (usedSlugs.has(slug)) slug = `${slug}-${citySlug}`;
      usedSlugs.add(slug);
      console.log(`  { slug: ${JSON.stringify(slug)}, name: ${JSON.stringify(c.name)}, citySlug: ${JSON.stringify(citySlug)}, countryCode: ${JSON.stringify(city.countryCode)}, aliases: [${JSON.stringify(c.name.toLowerCase())}] },  // ${c.qualifying}/${c.total}`);
    }
  }

  const cityCount = new Map<string, number>();
  for (const c of strong) cityCount.set(c.citySlug, (cityCount.get(c.citySlug) ?? 0) + 1);
  console.error(`\n${strong.length} areas across ${byCity.size} cities clear their country threshold.`);
  console.error(`Cities reaching their area minimum: ` +
    [...cityCount.entries()].filter(([, n]) => n >= 3).map(([c, n]) => `${c}(${n})`).join(" ") || "(none)");
  console.error(`Cities short of it: ` +
    (CITIES.filter((c) => (cityCount.get(c.slug) ?? 0) < 3).map((c) => c.slug).join(" ") || "(none)"));
}
main();
