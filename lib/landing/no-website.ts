import { unstable_cache } from "next/cache";
import { pseoSql } from "@/lib/pseo/db";
import { ALLOWED_LEAD_TYPES_SQL } from "@/lib/lead-quality";
import { formatCategory } from "@/lib/categories";
import { COUNTRY_BY_CODE } from "@/lib/pseo/countries";
import { publishedCityPages, type CityCard } from "@/lib/pseo/registry";

/**
 * The figures the no-website landing pages are built on.
 *
 * Every one of these pages makes a numeric claim in its <title> or <meta description>, and a claim
 * that drifts from the database is worse than no claim — so nothing here is hardcoded and nothing
 * is estimated. Each function is a single aggregate query: unlike the city pages, which pull up to
 * 6,000 rows and reduce them in JavaScript, these count in Postgres and return tens of rows.
 *
 * All counts use the same denominator rule the lead pages use: `is_competitor = false`, an allowed
 * category, and `has_website IS NOT NULL` (a business we have actually checked either way). Rows we
 * have not verified are excluded from numerator and denominator alike rather than assumed.
 */

export type GapTotals = {
  /** Businesses verified to have no website. */
  qualifying: number;
  /** Businesses checked either way — the denominator. */
  checked: number;
  gapRate: number;
  cities: number;
  countries: number;
};

export async function gapTotals(): Promise<GapTotals> {
  const [row] = (await pseoSql`
    SELECT count(*) FILTER (WHERE has_website = false)::int AS qualifying,
           count(*) FILTER (WHERE has_website IS NOT NULL)::int AS checked,
           count(DISTINCT city_slug) FILTER (WHERE has_website = false)::int AS cities,
           count(DISTINCT country_code) FILTER (WHERE has_website = false)::int AS countries
    FROM leads
    WHERE is_competitor = false AND category = ANY(${ALLOWED_LEAD_TYPES_SQL})
  `) as unknown as Array<{ qualifying: number; checked: number; cities: number; countries: number }>;

  const qualifying = row?.qualifying ?? 0;
  const checked = row?.checked ?? 0;
  return {
    qualifying,
    checked,
    gapRate: checked ? qualifying / checked : 0,
    cities: row?.cities ?? 0,
    countries: row?.countries ?? 0,
  };
}

export type IndustryRow = {
  category: string;
  label: string;
  qualifying: number;
  checked: number;
  gapRate: number;
};

/**
 * Industries ranked by how many of their businesses have no website.
 *
 * This is the page competitors approximate and we can state exactly: the SERP currently rewards
 * pages quoting round numbers ("~310,000 restaurants") and banded guesses ("landscaping 45-55%").
 * Ours are counted.
 *
 * `minChecked` keeps a category with four verified businesses out of a ranked table where a single
 * row would otherwise read as a 100% gap rate.
 */
export async function industryBreakdown(minChecked = 25, limit = 40): Promise<IndustryRow[]> {
  const rows = (await pseoSql`
    SELECT category,
           count(*) FILTER (WHERE has_website = false)::int AS qualifying,
           count(*) FILTER (WHERE has_website IS NOT NULL)::int AS checked
    FROM leads
    WHERE is_competitor = false AND category IS NOT NULL
      AND category = ANY(${ALLOWED_LEAD_TYPES_SQL})
    GROUP BY category
    HAVING count(*) FILTER (WHERE has_website IS NOT NULL) >= ${minChecked}
    ORDER BY count(*) FILTER (WHERE has_website = false) DESC
    LIMIT ${limit}
  `) as unknown as Array<{ category: string; qualifying: number; checked: number }>;

  return rows.map((r) => ({
    category: r.category,
    label: formatCategory(r.category) ?? r.category,
    qualifying: r.qualifying,
    checked: r.checked,
    gapRate: r.checked ? r.qualifying / r.checked : 0,
  }));
}

export type CountryRow = {
  code: string;
  name: string;
  qualifying: number;
  checked: number;
  gapRate: number;
};

/**
 * The website gap by country — the one statistic here that nothing else on the SERP has.
 *
 * It is also the honest answer to a visitor arriving from a US query: coverage is not uniform, and
 * a page that shows which countries we actually cover beats one that implies we cover everywhere.
 */
export async function countryBreakdown(minChecked = 25): Promise<CountryRow[]> {
  const rows = (await pseoSql`
    SELECT country_code,
           count(*) FILTER (WHERE has_website = false)::int AS qualifying,
           count(*) FILTER (WHERE has_website IS NOT NULL)::int AS checked
    FROM leads
    WHERE is_competitor = false AND country_code IS NOT NULL
      AND category = ANY(${ALLOWED_LEAD_TYPES_SQL})
    GROUP BY country_code
    HAVING count(*) FILTER (WHERE has_website IS NOT NULL) >= ${minChecked}
    ORDER BY count(*) FILTER (WHERE has_website = false) DESC
  `) as unknown as Array<{ country_code: string; qualifying: number; checked: number }>;

  return rows.map((r) => ({
    code: r.country_code,
    name: COUNTRY_BY_CODE.get(r.country_code)?.name ?? r.country_code.toUpperCase(),
    qualifying: r.qualifying,
    checked: r.checked,
    gapRate: r.checked ? r.qualifying / r.checked : 0,
  }));
}

/**
 * Cached readers — what the pages and their generateMetadata actually call.
 *
 * The landing pages are static routes that read the database, which is the combination that would
 * make `next build` require a live Postgres again: Next prerenders a parameterless route at build
 * time by default. Each page therefore declares `dynamic = "force-dynamic"` to stay out of the
 * build, and the cost of that is paid back here — the aggregates are cached for a day, so a request
 * is a cache read rather than four GROUP BYs, and generateMetadata and the page body share one
 * result instead of querying twice for the same number.
 *
 * One shared tag, so the pSEO refresh job can invalidate all of them together when the figures
 * actually move: revalidateTag("no-website").
 */
const DAY = 86_400;

export const getGapTotals = unstable_cache(gapTotals, ["no-website:totals"], {
  revalidate: DAY,
  tags: ["no-website"],
});

export const getIndustryBreakdown = unstable_cache(
  () => industryBreakdown(),
  ["no-website:industries"],
  { revalidate: DAY, tags: ["no-website"] }
);

export const getCountryBreakdown = unstable_cache(
  () => countryBreakdown(),
  ["no-website:countries"],
  { revalidate: DAY, tags: ["no-website"] }
);

export const getCityCards = unstable_cache(
  (): Promise<CityCard[]> => publishedCityPages(),
  ["no-website:cities"],
  { revalidate: DAY, tags: ["no-website"] }
);

/** Formats a count for prose and metadata. Indian grouping, because the numbers are mostly Indian
 *  and the site already renders dates and counts that way. */
export function fmtCount(n: number): string {
  return n.toLocaleString("en-IN");
}

export function fmtPct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}
