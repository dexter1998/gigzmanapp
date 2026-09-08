import fs from "node:fs";
import path from "node:path";
import { pseoSql } from "../../lib/pseo/db";
import { normalizeDomain, type GoldenTier } from "../../lib/jobs/golden";
import { CITIES } from "../../lib/pseo/locations";

/**
 * Loads the curated golden-tier research set into job_companies.
 *
 * These companies do not come from map sweeps and cannot: a GMaps category search for "software
 * company in Bengaluru" returns local IT shops, never Stripe or Anthropic. So the list is compiled
 * separately (scripts/golden/data/raw-*.ndjson) and joined in here.
 *
 * Unlike upsertJobCompany, this writes golden_tier on conflict as well as on insert. That upsert
 * deliberately freezes tier at first insert, which is wrong for this path: a company the sweep
 * already stored as an ordinary row must be upgraded when the curated set says it is a unicorn.
 *
 * Coordinates are city-level, resolved once per city and cached. A company's real office is not
 * knowable from this data, and a city centroid is the honest version of "HQ in Bengaluru" -- so
 * `location_via` is not claimed to be anything finer. Geocoding uses OSM Nominatim rather than the
 * Places key, which is IP-restricted and unusable from here anyway.
 *
 *   npx tsx scripts/golden/ingest-golden.ts [--dry]
 */

type Row = {
  name: string; domain: string; country_code: string;
  hq_city: string; tier: string; investors?: string; source?: string;
};

const DATA_DIR = path.join(__dirname, "data");
const CACHE = path.join(DATA_DIR, "city-centroids.json");
// Higher wins when the same domain appears in more than one research file.
const TIER_RANK: Record<string, number> = { big_tech: 5, unicorn: 4, soonicorn: 3, yc: 2, vc_backed: 1 };
const VALID_TIERS = new Set<string>(Object.keys(TIER_RANK));

function loadRows(): Row[] {
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.startsWith("raw-") && f.endsWith(".ndjson"));
  const byDomain = new Map<string, Row>();
  for (const f of files) {
    for (const line of fs.readFileSync(path.join(DATA_DIR, f), "utf8").split("\n")) {
      const t = line.trim();
      if (!t) continue;
      let row: Row;
      try {
        row = JSON.parse(t) as Row;
      } catch {
        continue;
      }
      const domain = normalizeDomain(row.domain ?? "");
      if (!domain || !domain.includes(".") || !row.name) continue;
      if (!VALID_TIERS.has(row.tier)) continue;
      row.domain = domain;
      const existing = byDomain.get(domain);
      if (!existing || (TIER_RANK[row.tier] ?? 0) > (TIER_RANK[existing.tier] ?? 0)) byDomain.set(domain, row);
    }
  }
  return [...byDomain.values()];
}

type Centroid = { lat: number; lng: number };

function seedCentroids(): Record<string, Centroid> {
  const out: Record<string, Centroid> = {};
  for (const c of CITIES) out[`${c.name.toLowerCase()}|${c.countryCode}`] = c.centroid;
  return out;
}

async function nominatim(city: string, cc: string): Promise<Centroid | null> {
  const url = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&countrycodes=${cc}&format=json&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "mantis-jobs-golden-ingest/1.0 (contact: hello@mantisai.in)" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const hit = data[0];
    if (!hit?.lat || !hit?.lon) return null;
    return { lat: Number(hit.lat), lng: Number(hit.lon) };
  } catch {
    return null;
  }
}

async function main() {
  const dry = process.argv.includes("--dry");
  const rows = loadRows();

  const cache: Record<string, Centroid | null> = fs.existsSync(CACHE)
    ? JSON.parse(fs.readFileSync(CACHE, "utf8"))
    : {};
  const seeded = seedCentroids();

  const needed = [...new Set(rows.map((r) => `${r.hq_city.toLowerCase()}|${r.country_code}`))]
    .filter((k) => !(k in cache) && !(k in seeded));
  if (needed.length) {
    process.stdout.write(`==> geocoding ${needed.length} new cities via Nominatim (1/s)\n`);
    for (const [i, key] of needed.entries()) {
      const [city, cc] = key.split("|");
      cache[key] = await nominatim(city, cc);
      // Nominatim's usage policy is one request per second; going faster gets the IP blocked.
      await new Promise((r) => setTimeout(r, 1100));
      if ((i + 1) % 25 === 0) {
        fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2));
        process.stdout.write(`    ${i + 1}/${needed.length}\n`);
      }
    }
    fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2));
  }

  const centroidFor = (r: Row): Centroid | null => {
    const key = `${r.hq_city.toLowerCase()}|${r.country_code}`;
    return seeded[key] ?? cache[key] ?? null;
  };

  const located = rows.filter((r) => centroidFor(r)).length;
  process.stdout.write(`==> ${rows.length} unique domains, ${located} with coordinates\n`);
  if (dry) return;

  const sql = pseoSql;
  let inserted = 0;
  let updated = 0;
  for (const r of rows) {
    const c = centroidFor(r);
    const result = await sql`
      INSERT INTO job_companies (domain, company_name, lat, lng, country_code, golden_tier, scrape_status)
      VALUES (${r.domain}, ${r.name}, ${c?.lat ?? null}, ${c?.lng ?? null}, ${r.country_code}, ${r.tier as GoldenTier}, 'pending')
      ON CONFLICT (domain) DO UPDATE SET
        company_name = COALESCE(job_companies.company_name, EXCLUDED.company_name),
        lat          = COALESCE(job_companies.lat, EXCLUDED.lat),
        lng          = COALESCE(job_companies.lng, EXCLUDED.lng),
        country_code = COALESCE(job_companies.country_code, EXCLUDED.country_code),
        -- The one field this path exists to correct, so it overwrites rather than gap-fills.
        golden_tier  = EXCLUDED.golden_tier
      RETURNING (xmax = 0) AS is_new
    `;
    if (result[0]?.is_new) inserted++;
    else updated++;
  }
  process.stdout.write(`==> ${inserted} new, ${updated} existing upgraded\n`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
