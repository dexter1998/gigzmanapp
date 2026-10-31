/**
 * Every figure on a list page, queried live (pages cache for a day via the (pseo) layout).
 *
 * Two universes:
 *  - industry / nosite: the maps lead index (`leads`), joined to our website read where the business
 *    has a site. Names are shown (they are public on Google Maps, same rule as /leads); phone, email
 *    and address are only ever counted, never rendered.
 *  - service / tech: our own website reads (`scrape_domains.site_signals`, source 'app'), limited to
 *    businesses from the maps index plus the company list loaded for enrichment (campaign
 *    'mantis-enrich'). Agencies in the wider registry are excluded — they sell the same services.
 *    Names are shown only for maps businesses; the company-list rows are counted, not listed.
 */
import { listsSql as sql } from "./db";
import { CITY_BY_SLUG } from "@/lib/pseo/locations";
import type { ListDef, Signal } from "./defs";

export type SampleRow = {
  name: string; category: string | null; city: string | null; rating: number | null; reviews: number | null;
  hasWebsite: boolean; flags: Signal[]; cms: string | null;
};
export type ListData = {
  total: number;
  withPhone: number;
  withWebsite: number;
  read: number;
  withEmail: number;
  withPerson: number;
  noWebsite: number;
  signals: Partial<Record<Signal, number>>;
  cms: Array<{ cms: string; n: number }>;
  cities: Array<{ slug: string | null; name: string; country: string | null; n: number }>;
  countries: Array<{ code: string; n: number }>;
  categories: Array<{ category: string; n: number }>;
  sample: SampleRow[];
  checkedAt: Date | null;
};

const SIGS: Signal[] = ["no_analytics", "no_meta_pixel", "no_google_ads", "no_ad_pixel", "no_booking", "has_booking", "no_https", "no_mobile", "old_copyright", "has_whatsapp", "has_careers", "has_online_store"];

/** The registry domain for a lead's website — the same normalisation the enrichers write with. */
const DOMAIN = sql`lower(regexp_replace(regexp_replace(l.website_url, '^https?://(www\\.)?', ''), '[/?#:].*$', ''))`;

function rulePredicate(def: ListDef) {
  const parts = [] as ReturnType<typeof sql>[];
  for (const group of def.rule?.all ?? []) {
    const ors = group.map((s) => sql`sig->>${s} = 'true'`);
    parts.push(sql`(${ors.reduce((a, b) => sql`${a} OR ${b}`)})`);
  }
  if (def.cms) parts.push(sql`sig->>'cms' = ${def.cms}`);
  return parts.length ? parts.reduce((a, b) => sql`${a} AND ${b}`) : sql`true`;
}

const label = (c: string | null) => (c ? c.replace(/_/g, " ") : null);
const flagsOf = (sig: Record<string, unknown> | null): Signal[] => (sig ? SIGS.filter((s) => sig[s] === true) : []);

export async function loadList(def: ListDef, city?: string): Promise<ListData> {
  return def.kind === "service" || def.kind === "tech" ? loadSignalUniverse(def, city) : loadLeadUniverse(def, city);
}

/** Rows per city for one list — what decides which city pages exist (same 25-row gate). */
export async function listCityCounts(def: ListDef): Promise<Array<{ slug: string; n: number }>> {
  const rows = def.kind === "service" || def.kind === "tech"
    ? await sql`
        SELECT city_slug AS slug, count(*)::int AS n
        FROM list_site_rows
        WHERE from_leads AND city_slug IS NOT NULL
          ${def.categories ? sql`AND category = ANY(${def.categories})` : sql``}
          AND ${rulePredicate(def)}
        GROUP BY 1`
    : await sql`
        SELECT l.city_slug AS slug, count(*)::int AS n FROM leads l
        WHERE l.city_slug IS NOT NULL AND l.category = ANY(${def.categories ?? []}) AND NOT coalesce(l.is_competitor, false)
          ${def.country ? sql`AND l.country_code = ${def.country}` : sql``} ${def.kind === "nosite" ? sql`AND l.has_website = false` : sql``}
        GROUP BY 1`;
  return (rows as unknown as Array<{ slug: string; n: number }>).filter((r) => CITY_BY_SLUG.has(r.slug)).sort((a, b) => b.n - a.n);
}

/* industry / nosite: maps leads, optionally joined to a website read */
async function loadLeadUniverse(def: ListDef, city?: string): Promise<ListData> {
  const cats = def.categories ?? [];
  const nosite = def.kind === "nosite";
  const rows = await sql`
    WITH base AS MATERIALIZED (
      SELECT l.business_name, l.category, l.city_slug, l.country_code, l.rating, l.review_count, l.has_website,
             l.phone IS NOT NULL AS ph, s.site_signals AS sig
      FROM leads l
      LEFT JOIN scrape_domains s ON l.website_url IS NOT NULL AND s.domain = ${DOMAIN}
      WHERE NOT coalesce(l.is_competitor, false)
        AND l.category = ANY(${cats})
        ${def.country ? sql`AND l.country_code = ${def.country}` : sql``}
        ${nosite ? sql`AND l.has_website = false` : sql``}
        ${city ? sql`AND l.city_slug = ${city}` : sql``}
    ),
    rd AS (SELECT * FROM base WHERE sig IS NOT NULL AND sig->>'source' = 'app' AND coalesce(sig->>'site_down','false') = 'false' AND sig ? 'cms')
    SELECT
      (SELECT count(*) FROM base)::int AS total,
      (SELECT count(*) FROM base WHERE ph)::int AS with_phone,
      (SELECT count(*) FROM base WHERE has_website)::int AS with_website,
      (SELECT count(*) FROM base WHERE NOT has_website)::int AS no_website,
      (SELECT count(*) FROM rd)::int AS read,
      (SELECT count(*) FROM rd WHERE jsonb_array_length(coalesce(sig->'emails','[]'::jsonb)) > 0)::int AS with_email,
      (SELECT count(*) FROM rd WHERE jsonb_typeof(sig->'person') = 'object')::int AS with_person,
      (SELECT jsonb_object_agg(k, n) FROM (SELECT k, count(*) n FROM rd, unnest(${SIGS}::text[]) k WHERE sig->>k = 'true' GROUP BY k) x) AS signals,
      (SELECT coalesce(jsonb_agg(x ORDER BY x.n DESC), '[]') FROM (SELECT sig->>'cms' cms, count(*) n FROM rd WHERE sig->>'cms' IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 6) x) AS cms,
      (SELECT coalesce(jsonb_agg(x ORDER BY x.n DESC), '[]') FROM (SELECT city_slug slug, country_code country, count(*) n FROM base WHERE city_slug IS NOT NULL GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 14) x) AS cities,
      (SELECT coalesce(jsonb_agg(x ORDER BY x.n DESC), '[]') FROM (SELECT country_code code, count(*) n FROM base WHERE country_code IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 8) x) AS countries,
      (SELECT coalesce(jsonb_agg(x ORDER BY x.n DESC), '[]') FROM (SELECT category, count(*) n FROM base GROUP BY 1 ORDER BY 2 DESC LIMIT 8) x) AS categories,
      (SELECT max((sig->>'checked_at')::timestamptz) FROM rd) AS checked_at,
      (SELECT coalesce(jsonb_agg(x), '[]') FROM (
         SELECT business_name, category, city_slug, rating, review_count, has_website, sig FROM base
         WHERE business_name IS NOT NULL
         ORDER BY (sig ? 'cms') DESC NULLS LAST, review_count DESC NULLS LAST LIMIT 12) x) AS sample`;
  return shape(rows[0]);
}

/* service / tech: our website reads, maps businesses + enrichment company list */
async function loadSignalUniverse(def: ListDef, city?: string): Promise<ListData> {
  const cats = def.categories ?? null;
  const rows = await sql`
    -- Read from the daily snapshot (lib/lists/snapshot.ts), never from scrape_domains directly.
    WITH rd AS MATERIALIZED (
      SELECT domain, sig, ap_country, ap_city, ap_cat, business_name, category, city_slug, country_code, rating, review_count, ph
      FROM list_site_rows
      WHERE ${cats || city ? sql`from_leads` : sql`true`}
        ${cats ? sql`AND category = ANY(${cats})` : sql``}
        ${city ? sql`AND city_slug = ${city}` : sql``}
    ),
    base AS (SELECT * FROM rd WHERE ${rulePredicate(def)})
    SELECT
      (SELECT count(*) FROM base)::int AS total,
      (SELECT count(*) FROM base WHERE ph OR jsonb_array_length(coalesce(sig->'phones','[]'::jsonb)) > 0)::int AS with_phone,
      (SELECT count(*) FROM base)::int AS with_website,
      0 AS no_website,
      (SELECT count(*) FROM rd)::int AS read,
      (SELECT count(*) FROM base WHERE jsonb_array_length(coalesce(sig->'emails','[]'::jsonb)) > 0)::int AS with_email,
      (SELECT count(*) FROM base WHERE jsonb_typeof(sig->'person') = 'object')::int AS with_person,
      (SELECT jsonb_object_agg(k, n) FROM (SELECT k, count(*) n FROM base, unnest(${SIGS}::text[]) k WHERE sig->>k = 'true' GROUP BY k) x) AS signals,
      (SELECT coalesce(jsonb_agg(x ORDER BY x.n DESC), '[]') FROM (SELECT sig->>'cms' cms, count(*) n FROM base WHERE sig->>'cms' IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 6) x) AS cms,
      (SELECT coalesce(jsonb_agg(x ORDER BY x.n DESC), '[]') FROM (
         SELECT city_slug slug, coalesce(country_code, CASE ap_country WHEN 'India' THEN 'in' WHEN 'United Arab Emirates' THEN 'ae' WHEN 'Singapore' THEN 'sg' WHEN 'United Kingdom' THEN 'gb' END) country,
                coalesce(city_slug, ap_city) city, count(*) n
         FROM base WHERE coalesce(city_slug, ap_city) IS NOT NULL GROUP BY 1, 2, 3 ORDER BY 4 DESC LIMIT 14) x) AS cities,
      (SELECT coalesce(jsonb_agg(x ORDER BY x.n DESC), '[]') FROM (
         SELECT coalesce(country_code, CASE ap_country WHEN 'India' THEN 'in' WHEN 'United Arab Emirates' THEN 'ae' WHEN 'Singapore' THEN 'sg' WHEN 'United Kingdom' THEN 'gb' END) code, count(*) n
         FROM base GROUP BY 1 HAVING coalesce(country_code, CASE ap_country WHEN 'India' THEN 'in' WHEN 'United Arab Emirates' THEN 'ae' WHEN 'Singapore' THEN 'sg' WHEN 'United Kingdom' THEN 'gb' END) IS NOT NULL ORDER BY 2 DESC LIMIT 8) x) AS countries,
      (SELECT coalesce(jsonb_agg(x ORDER BY x.n DESC), '[]') FROM (SELECT coalesce(category, lower(ap_cat)) category, count(*) n FROM base WHERE coalesce(category, ap_cat) IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 8) x) AS categories,
      (SELECT max((sig->>'checked_at')::timestamptz) FROM base) AS checked_at,
      (SELECT coalesce(jsonb_agg(x), '[]') FROM (
         SELECT business_name, category, city_slug, rating, review_count, true AS has_website, sig FROM base
         WHERE business_name IS NOT NULL ORDER BY review_count DESC NULLS LAST LIMIT 12) x) AS sample`;
  return shape(rows[0]);
}

const COUNTRY_CITY_FALLBACK = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function shape(r: any): ListData {
  return {
    total: r.total, withPhone: r.with_phone, withWebsite: r.with_website, noWebsite: r.no_website,
    read: r.read, withEmail: r.with_email, withPerson: r.with_person,
    signals: r.signals ?? {},
    cms: r.cms ?? [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cities: (r.cities ?? []).map((c: any) => {
      const city = c.slug ? CITY_BY_SLUG.get(c.slug) : undefined;
      return { slug: city ? c.slug : null, name: city?.name ?? COUNTRY_CITY_FALLBACK(String(c.city ?? c.slug)), country: c.country ?? null, n: Number(c.n) };
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    countries: (r.countries ?? []).map((c: any) => ({ code: c.code, n: Number(c.n) })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categories: (r.categories ?? []).map((c: any) => ({ category: c.category, n: Number(c.n) })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sample: (r.sample ?? []).map((s: any): SampleRow => ({
      name: s.business_name, category: label(s.category), city: s.city_slug ? CITY_BY_SLUG.get(s.city_slug)?.name ?? null : null,
      rating: s.rating, reviews: s.review_count, hasWebsite: !!s.has_website, flags: flagsOf(s.sig), cms: s.sig?.cms ?? null,
    })),
    checkedAt: r.checked_at ? new Date(r.checked_at) : null,
  };
}
