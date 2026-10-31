/**
 * Public registers (RERA, FSSAI, MCA, GST, GeM …) are called at most ONCE A DAY per query and kept
 * in registry_cache: every later read that day — any user, any run — comes from the table. These
 * portals are slow, rate-limited and sometimes paid per call; re-scraping them per run is waste.
 *
 * MCA (new company registrations) is NOT wired yet. Where its data comes from, for when it is:
 *   - MCA21 V3 portal (mca.gov.in → "Master Data" / "Company/LLP search") — per company, captcha,
 *     no bulk API; scraping it is against its terms.
 *   - data.gov.in "Company Master Data" (state-wise CSVs of registered companies, refreshed ~monthly)
 *     — free, bulk, has incorporation date; the cheapest daily-diff source.
 *   - Licensed MCA data APIs (Probe42, Tofler, Zauba Corp API, Signzy / Surepass "MCA company
 *     details", Sandbox.co.in) — paid per call, have new-incorporations feeds.
 *   - "New companies today" vendors (Verizol and similar) — daily lists with director contacts.
 */

import { sql } from "@/lib/db";

export async function oncePerDay<T>(source: string, query: string, fetch: () => Promise<T[]>): Promise<{ rows: T[]; cached: boolean }> {
  const q = query.trim().toLowerCase();
  const [hit] = await sql`SELECT rows FROM registry_cache WHERE source = ${source} AND query = ${q} AND day = (now() AT TIME ZONE 'Asia/Kolkata')::date`;
  if (hit) return { rows: hit.rows as T[], cached: true };
  const rows = await fetch();
  await sql`INSERT INTO registry_cache (source, query, rows) VALUES (${source}, ${q}, ${sql.json(rows as Parameters<typeof sql.json>[0])})
            ON CONFLICT (source, query, day) DO UPDATE SET rows = EXCLUDED.rows, fetched_at = now()`;
  return { rows, cached: false };
}
