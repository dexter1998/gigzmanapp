import { sql } from "@/lib/db";

/**
 * Live index figures for blog copy.
 *
 * The corpus quotes the size of the index constantly — "we checked N businesses, X% have no
 * website". Those numbers move every time a scan runs, and a post that hardcodes them is wrong
 * within days. So posts write `{{checked}}` and this resolves it at render time.
 *
 * Pages carry `revalidate = 3600`, which is what bounds how stale a rendered figure can be.
 */
export type IndexStats = Record<string, string>;

const COUNTRY_NAMES: Record<string, string> = {
  in: "India", gb: "United Kingdom", us: "United States", au: "Australia", ca: "Canada",
  de: "Germany", ae: "United Arab Emirates", it: "Italy", es: "Spain", fr: "France",
  nl: "Netherlands", at: "Austria", ie: "Ireland", nz: "New Zealand", sg: "Singapore",
  za: "South Africa", my: "Malaysia", ch: "Switzerland", be: "Belgium", pt: "Portugal",
  se: "Sweden", pl: "Poland", hu: "Hungary", dk: "Denmark", gr: "Greece", cz: "Czechia",
  no: "Norway", fi: "Finland", ro: "Romania", tr: "Turkiye", jp: "Japan", br: "Brazil",
};

const n = (v: unknown) => Number(v ?? 0).toLocaleString("en-US");
const pct = (v: unknown) => `${Number(v ?? 0).toFixed(1)}%`;

export type CountryRow = { code: string; name: string; checked: number; noSite: number; pct: number };

/** Headline tokens, plus one pair per country ({{inChecked}}, {{inPct}}, …). */
export async function indexStats(): Promise<IndexStats> {
  const [head] = (await sql`
    SELECT count(*) AS checked,
           count(*) FILTER (WHERE has_website IS FALSE) AS no_site,
           round(100.0 * count(*) FILTER (WHERE has_website IS FALSE) / nullif(count(*), 0), 1) AS pct,
           count(DISTINCT city_slug) AS cities,
           count(DISTINCT country_code) AS countries
    FROM leads WHERE has_website IS NOT NULL
  `) as unknown as { checked: string; no_site: string; pct: string; cities: string; countries: string }[];

  const rows = (await sql`
    SELECT country_code AS code, count(*) AS checked,
           count(*) FILTER (WHERE has_website IS FALSE) AS no_site,
           round(100.0 * count(*) FILTER (WHERE has_website IS FALSE) / nullif(count(*), 0), 1) AS pct
    FROM leads WHERE has_website IS NOT NULL AND country_code IS NOT NULL
    GROUP BY country_code ORDER BY count(*) DESC
  `) as unknown as { code: string; checked: string; no_site: string; pct: string }[];

  const out: IndexStats = {
    checked: n(head?.checked), noSite: n(head?.no_site), pct: pct(head?.pct),
    cities: n(head?.cities), countries: n(head?.countries),
  };
  for (const r of rows) {
    out[`${r.code}Checked`] = n(r.checked);
    out[`${r.code}NoSite`] = n(r.no_site);
    out[`${r.code}Pct`] = pct(r.pct);
  }
  return out;
}

/** The country breakdown table, live. Small countries are folded away rather than shown thin. */
export async function countryRows(min = 500): Promise<CountryRow[]> {
  const rows = (await sql`
    SELECT country_code AS code, count(*) AS checked,
           count(*) FILTER (WHERE has_website IS FALSE) AS no_site,
           round(100.0 * count(*) FILTER (WHERE has_website IS FALSE) / nullif(count(*), 0), 1) AS pct
    FROM leads WHERE has_website IS NOT NULL AND country_code IS NOT NULL
    GROUP BY country_code HAVING count(*) >= ${min} ORDER BY count(*) DESC
  `) as unknown as { code: string; checked: string; no_site: string; pct: string }[];
  return rows.map((r) => ({
    code: r.code, name: COUNTRY_NAMES[r.code] ?? r.code.toUpperCase(),
    checked: Number(r.checked), noSite: Number(r.no_site), pct: Number(r.pct),
  }));
}

export type CityRow = { slug: string; name: string; checked: number; noSite: number; pct: number };

/** City gap rows for one country, ordered by gap. Same reasoning as countryRows — these move
 *  faster than any other figure in the corpus, because scanning adds cities continuously. */
export async function cityRows(
  country = "in", min = 400, limit = 15, order: "gap" | "size" = "gap",
): Promise<CityRow[]> {
  const rows = (await sql`
    SELECT city_slug AS slug, count(*) AS checked,
           count(*) FILTER (WHERE has_website IS FALSE) AS no_site,
           round(100.0 * count(*) FILTER (WHERE has_website IS FALSE) / nullif(count(*), 0), 1) AS pct
    FROM leads
    WHERE has_website IS NOT NULL AND city_slug IS NOT NULL AND country_code = ${country}
    GROUP BY city_slug HAVING count(*) >= ${min}
    ORDER BY ${order === "gap"
      ? sql`round(100.0 * count(*) FILTER (WHERE has_website IS FALSE) / nullif(count(*), 0), 1) DESC`
      : sql`count(*) DESC`}
    LIMIT ${limit}
  `) as unknown as { slug: string; checked: string; no_site: string; pct: string }[];
  return rows.map((r) => ({
    slug: r.slug,
    name: r.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    checked: Number(r.checked), noSite: Number(r.no_site), pct: Number(r.pct),
  }));
}

/** Replaces {{token}} with the live figure. An unknown token is left alone rather than blanked —
 *  a visible {{typo}} in staging is better than a sentence that silently loses its number. */
export function fill(text: string, s: IndexStats): string {
  return text.replace(/\{\{(\w+)\}\}/g, (m, k: string) => s[k] ?? m);
}
