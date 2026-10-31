/**
 * A compact snapshot of every website we have read, for the list pages (2026-10-24).
 *
 * Reading scrape_domains.site_signals directly meant detoasting a multi-KB JSON blob per row across a
 * ~800k-row registry; in production that ran past every timeout. A one-shot rebuild of this table
 * failed the same way (280 s, retried every minute — a standing load on the database). So it is
 * built in slices instead: each v2-outreach tick (every minute) walks the next CHUNK registry domains
 * in primary-key order, upserts the ones that qualify and deletes the ones in that range that no
 * longer do. A full pass takes ~registry size / CHUNK minutes, then starts again.
 */
import { sql } from "@/lib/db";

const CHUNK = 20_000;
const LOCK_KEY = 74_210_024; // pg advisory lock: one slice at a time across instances

const SIG_KEYS = ["no_analytics", "no_meta_pixel", "no_google_ads", "no_ad_pixel", "no_booking", "has_booking", "no_https", "no_mobile", "old_copyright", "has_whatsapp", "has_careers", "has_online_store"];
const SIG_OBJ = `jsonb_build_object(${SIG_KEYS.map((k) => `'${k}', (s.site_signals->>'${k}') = 'true'`).join(", ")},
  'cms', s.site_signals->'cms',
  'checked_at', s.site_signals->'checked_at',
  'emails', CASE WHEN jsonb_array_length(coalesce(s.site_signals->'emails','[]'::jsonb)) > 0 THEN '[1]'::jsonb ELSE '[]'::jsonb END,
  'phones', CASE WHEN jsonb_array_length(coalesce(s.site_signals->'phones','[]'::jsonb)) > 0 THEN '[1]'::jsonb ELSE '[]'::jsonb END,
  'person', CASE WHEN jsonb_typeof(s.site_signals->'person') = 'object' THEN '{}'::jsonb ELSE 'null'::jsonb END)`;

export async function ensureSnapshotTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS list_site_rows (
      domain        text PRIMARY KEY,
      from_leads    boolean NOT NULL,
      business_name text, category text, city_slug text, country_code text,
      rating real, review_count int, ph boolean NOT NULL DEFAULT false,
      ap_country text, ap_city text, ap_cat text,
      sig jsonb NOT NULL,
      refreshed_at timestamptz NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_list_site_rows_city ON list_site_rows(city_slug)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_list_site_rows_cat ON list_site_rows(category)`;
  await sql`CREATE TABLE IF NOT EXISTS list_snapshot_cursor (id int PRIMARY KEY, last_domain text NOT NULL DEFAULT '', passes int NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now())`;
  await sql`INSERT INTO list_snapshot_cursor (id) VALUES (1) ON CONFLICT DO NOTHING`;
  // Left behind by the first (one-shot) version of this rebuild.
  await sql`DROP TABLE IF EXISTS list_site_rows_next`;
}

/** Process the next slice. Returns { upserted, end } or null when another instance holds the lock. */
export async function advanceListSnapshot(): Promise<{ upserted: number; end: string | null } | null> {
  await ensureSnapshotTable();
  const reserved = await sql.reserve();
  try {
    const [{ ok }] = await reserved`SELECT pg_try_advisory_lock(${LOCK_KEY}) AS ok`;
    if (!ok) return null;
    try {
      await reserved`SET statement_timeout = '60s'`;
      const [cur] = await reserved`SELECT last_domain FROM list_snapshot_cursor WHERE id = 1`;
      const from = String(cur?.last_domain ?? "");
      // The slice's upper bound, read from the primary-key index only (no row bodies).
      const [b] = await reserved`SELECT max(domain) AS hi FROM (SELECT domain FROM scrape_domains WHERE domain > ${from} ORDER BY domain LIMIT ${CHUNK}) x`;
      const hi: string | null = b?.hi ?? null;
      if (!hi) {
        await reserved`UPDATE list_snapshot_cursor SET last_domain = '', passes = passes + 1, updated_at = now() WHERE id = 1`;
        return { upserted: 0, end: null };
      }
      // Fixed SQL (no user input besides the two bound domain strings).
      const res = await reserved.unsafe(`
        WITH s AS (
          SELECT * FROM scrape_domains
          WHERE domain > $1 AND domain <= $2 AND site_signals IS NOT NULL
            AND site_signals->>'source' = 'app' AND coalesce(site_signals->>'site_down','false') = 'false' AND site_signals ? 'cms'
        ),
        ld AS (
          SELECT DISTINCT ON (d) d, business_name, category, city_slug, country_code, rating, review_count, ph FROM (
            SELECT lower(regexp_replace(regexp_replace(l.website_url, '^https?://(www\\.)?', ''), '[/?#:].*$', '')) AS d,
                   l.business_name, l.category, l.city_slug, l.country_code, l.rating, l.review_count, l.phone IS NOT NULL AS ph
            FROM leads l WHERE l.website_url IS NOT NULL AND NOT coalesce(l.is_competitor, false)) z
          WHERE d > $1 AND d <= $2
          ORDER BY d, review_count DESC NULLS LAST
        ),
        rows AS (
          SELECT s.domain, ld.d IS NOT NULL AS from_leads, ld.business_name, ld.category, ld.city_slug, ld.country_code, ld.rating, ld.review_count, coalesce(ld.ph, false) AS ph,
                 CASE WHEN ld.d IS NULL THEN s.country END AS ap_country, CASE WHEN ld.d IS NULL THEN s.city END AS ap_city, CASE WHEN ld.d IS NULL THEN s.category END AS ap_cat,
                 ${SIG_OBJ} AS sig
          FROM s LEFT JOIN ld ON ld.d = s.domain
          WHERE ld.d IS NOT NULL OR s.campaigns = 'mantis-enrich'
        ),
        del AS (
          DELETE FROM list_site_rows r WHERE r.domain > $1 AND r.domain <= $2 AND NOT EXISTS (SELECT 1 FROM rows WHERE rows.domain = r.domain)
        )
        INSERT INTO list_site_rows (domain, from_leads, business_name, category, city_slug, country_code, rating, review_count, ph, ap_country, ap_city, ap_cat, sig, refreshed_at)
        SELECT domain, from_leads, business_name, category, city_slug, country_code, rating, review_count, ph, ap_country, ap_city, ap_cat, sig, now() FROM rows
        ON CONFLICT (domain) DO UPDATE SET from_leads = EXCLUDED.from_leads, business_name = EXCLUDED.business_name, category = EXCLUDED.category,
          city_slug = EXCLUDED.city_slug, country_code = EXCLUDED.country_code, rating = EXCLUDED.rating, review_count = EXCLUDED.review_count, ph = EXCLUDED.ph,
          ap_country = EXCLUDED.ap_country, ap_city = EXCLUDED.ap_city, ap_cat = EXCLUDED.ap_cat, sig = EXCLUDED.sig, refreshed_at = now()`, [from, hi]);
      await reserved`UPDATE list_snapshot_cursor SET last_domain = ${hi}, updated_at = now() WHERE id = 1`;
      return { upserted: res.count, end: hi };
    } finally {
      await reserved`SET statement_timeout = 0`.catch(() => {});
      await reserved`SELECT pg_advisory_unlock(${LOCK_KEY})`.catch(() => {});
    }
  } finally {
    reserved.release();
  }
}
