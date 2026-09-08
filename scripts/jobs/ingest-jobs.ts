import fs from "node:fs";
import { pseoSql } from "../../lib/pseo/db";
import { normalizeDomain } from "../../lib/jobs/golden";

/**
 * Loads a gosom run straight into `job_companies`, bypassing `leads` entirely.
 *
 * scripts/gosom/ingest.ts cannot be reused here. It resolves every scraped label through the leads
 * allowlist, and that allowlist is the wrong shape for hiring: it was built for local businesses
 * that need a website sold to them, so it has no software_company, no it_services, no
 * corporate_office. Measured against the real resolver, "Software company", "Marketing agency",
 * "Design agency", "IT company", "Corporate office" and "Recruiter" all come back UNRESOLVED and
 * are dropped -- i.e. precisely the companies that post jobs. Meanwhile what the jobs allowlist
 * does admit is massage, spa, tanning_studio, campground, astrologer and psychic.
 *
 * Widening the shared taxonomy instead would push software companies into `leads`, where they are
 * competitors rather than prospects. So jobs keeps its own path and its own raw category label.
 *
 * The label is stored verbatim (not mapped to a Places type) because the point of these sweeps is
 * to learn which categories are worth asking for. Mapping to a fixed allowlist first would throw
 * away the very signal the learning loop needs.
 *
 *   npx tsx scripts/jobs/ingest-jobs.ts <results.json> <city-slug> <country-code>
 */

type Rec = {
  title?: string;
  categories?: string[];
  category?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  web_site?: string;
  review_count?: number;
  open_hours?: Record<string, unknown>;
};

function parseRecords(file: string): Rec[] {
  const out: Rec[] = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(t);
    } catch {
      continue; // a run killed mid-write leaves one truncated trailing line
    }
    // Fast mode emits one JSON array per query; full mode one object per line.
    if (Array.isArray(parsed)) out.push(...(parsed.filter(Boolean) as Rec[]));
    else if (parsed) out.push(parsed as Rec);
  }
  return out;
}

async function main() {
  const file = process.argv[2];
  const citySlug = process.argv[3] ?? null;
  const countryCode = (process.argv[4] ?? "").toLowerCase() || null;
  if (!file || !fs.existsSync(file)) throw new Error(`results file not found: ${file}`);

  const records = parseRecords(file);
  const sql = pseoSql;

  let inserted = 0;
  let updated = 0;
  let noWebsite = 0;
  let badDomain = 0;
  const byCategory = new Map<string, number>();

  for (const r of records) {
    if (!r.title || r.latitude == null || r.longitude == null) continue;
    if (!r.web_site || !r.web_site.trim()) {
      noWebsite++;
      continue; // no site means nothing to crawl for jobs; not an error, just not a candidate
    }
    const domain = normalizeDomain(r.web_site);
    if (!domain || !domain.includes(".")) {
      badDomain++;
      continue;
    }

    // gosom fast mode leaves `category` blank and fills `categories`; keep the first label as the
    // primary and record it raw so category yield can be measured later.
    const label = (r.category?.trim() || r.categories?.[0]?.trim() || "").slice(0, 120) || null;
    if (label) byCategory.set(label, (byCategory.get(label) ?? 0) + 1);

    const rows = await sql`
      INSERT INTO job_companies (domain, company_name, category, lat, lng, city_slug, country_code, scrape_status)
      VALUES (${domain}, ${r.title}, ${label}, ${r.latitude}, ${r.longitude}, ${citySlug}, ${countryCode}, 'pending')
      ON CONFLICT (domain) DO UPDATE SET
        company_name = COALESCE(job_companies.company_name, EXCLUDED.company_name),
        category     = COALESCE(job_companies.category, EXCLUDED.category),
        lat          = COALESCE(job_companies.lat, EXCLUDED.lat),
        lng          = COALESCE(job_companies.lng, EXCLUDED.lng),
        city_slug    = COALESCE(job_companies.city_slug, EXCLUDED.city_slug),
        country_code = COALESCE(job_companies.country_code, EXCLUDED.country_code)
      RETURNING (xmax = 0) AS is_new
    `;
    if (rows[0]?.is_new) inserted++;
    else updated++;
  }

  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  process.stdout.write(
    `==> ${records.length} scraped | ${inserted} new, ${updated} existing | ` +
      `skipped: ${noWebsite} no-website, ${badDomain} bad-domain\n`,
  );
  process.stdout.write(`==> top categories: ${top.map(([c, n]) => `${c}(${n})`).join(", ")}\n`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
