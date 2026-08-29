import { pseoSql } from "@/lib/pseo/db";
import { AREA_BY_SLUG, CITY_BY_SLUG, distanceKm } from "@/lib/pseo/locations";
import { formatCategory } from "@/lib/categories";
import type { Scope } from "@/lib/pseo/stats";
import type { GateStatus } from "@/lib/pseo/gate";

/**
 * The page registry: which pages exist, what state each is in, and the aggregates the hubs render.
 *
 * A page is a database row, not a file. That is what lets the daily gate publish a sector page the
 * day its data crosses the threshold, and retire it if the data goes away, without a deploy.
 */

export type PseoPage = {
  page_key: string;
  page_type: string;
  service_slug: string;
  city_slug: string | null;
  area_slug: string | null;
  category_slug: string | null;
  status: GateStatus;
  qualifying_leads: number;
  gate_pass_streak: number;
  stats: Record<string, unknown>;
  last_material_change_at: Date | null;
  first_published_at: Date | null;
  stats_computed_at: Date | null;
};

export function pageKeyFor(serviceSlug: string, scope: Scope): string {
  if (scope.kind === "area") return `${serviceSlug}|${scope.citySlug}|area:${scope.areaSlug}`;
  if (scope.kind === "category") return `${serviceSlug}|${scope.citySlug}|cat:${scope.category}`;
  return `${serviceSlug}|${scope.citySlug}|city`;
}

export async function getPage(pageKey: string): Promise<PseoPage | null> {
  const [row] = (await pseoSql`
    SELECT page_key, page_type, service_slug, city_slug, area_slug, category_slug, status,
           qualifying_leads, gate_pass_streak, stats, last_material_change_at,
           first_published_at, stats_computed_at
    FROM pseo_pages WHERE page_key = ${pageKey}
  `) as unknown as PseoPage[];
  return row ?? null;
}

/** Pages eligible to be rendered at all. `withheld` is deliberately absent: those 404. */
export async function renderablePages(): Promise<PseoPage[]> {
  return (await pseoSql`
    SELECT page_key, page_type, service_slug, city_slug, area_slug, category_slug, status,
           qualifying_leads, gate_pass_streak, stats, last_material_change_at,
           first_published_at, stats_computed_at
    FROM pseo_pages
    WHERE status IN ('published', 'noindex')
    ORDER BY qualifying_leads DESC
  `) as unknown as PseoPage[];
}

export async function publishedPages(): Promise<PseoPage[]> {
  return (await renderablePages()).filter((p) => p.status === "published");
}

export type AreaRow = { area_slug: string; name: string; qualifying: number; checked: number; gapRate: number };

/** Areas of a city, ranked by opportunity. Feeds the "top opportunity areas" module and, on an area
 *  page, the rank-within-city figure — which is the statistic that proves the hierarchy is real
 *  rather than a list of unrelated pages. */
export async function cityAreaBreakdown(citySlug: string): Promise<AreaRow[]> {
  const rows = (await pseoSql`
    SELECT area_slug,
           count(*) FILTER (WHERE has_website = false)::int AS qualifying,
           count(*) FILTER (WHERE has_website IS NOT NULL)::int AS checked
    FROM leads
    WHERE city_slug = ${citySlug} AND area_slug IS NOT NULL AND is_competitor = false
    GROUP BY area_slug
  `) as unknown as Array<{ area_slug: string; qualifying: number; checked: number }>;

  return rows
    .map((r) => ({
      area_slug: r.area_slug,
      name: AREA_BY_SLUG.get(r.area_slug)?.name ?? formatCategory(r.area_slug) ?? r.area_slug,
      qualifying: r.qualifying,
      checked: r.checked,
      gapRate: r.checked ? r.qualifying / r.checked : 0,
    }))
    .filter((r) => r.qualifying > 0)
    .sort((a, b) => b.qualifying - a.qualifying);
}

/**
 * The closest cities we actually publish, by distance from this one.
 *
 * Computed rather than curated on purpose: a hand-written neighbour list is how a link block ends
 * up pointing at pages that were never built. If the nearest place we cover is far away, that is
 * what gets shown; if there is nothing, the module doesn't render.
 */
export async function nearbyPublishedCities(citySlug: string, limit = 4) {
  const here = CITY_BY_SLUG.get(citySlug);
  if (!here) return [];

  const rows = (await pseoSql`
    SELECT DISTINCT city_slug FROM pseo_pages
    WHERE status = 'published' AND page_type = 'city' AND city_slug <> ${citySlug}
  `) as unknown as Array<{ city_slug: string }>;

  return rows
    .map((r) => CITY_BY_SLUG.get(r.city_slug))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map((c) => ({ slug: c.slug, name: c.name, km: Math.round(distanceKm(here.centroid, c.centroid)) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

/** Published child pages of a city, for the sidebar links and the internal-link block. Only pages
 *  that exist are linked — the sidebar IS the hierarchy, so it must never point at a 404. */
export async function publishedChildren(serviceSlug: string, citySlug: string) {
  const rows = (await pseoSql`
    SELECT page_type, area_slug, category_slug, qualifying_leads, status
    FROM pseo_pages
    WHERE service_slug = ${serviceSlug} AND city_slug = ${citySlug}
      AND status IN ('published', 'noindex')
      AND page_type IN ('area', 'category')
    ORDER BY qualifying_leads DESC
  `) as unknown as Array<{
    page_type: string; area_slug: string | null; category_slug: string | null;
    qualifying_leads: number; status: GateStatus;
  }>;

  return {
    areas: rows
      .filter((r) => r.page_type === "area" && r.area_slug)
      .map((r) => ({
        slug: r.area_slug!,
        name: AREA_BY_SLUG.get(r.area_slug!)?.name ?? r.area_slug!,
        qualifying: r.qualifying_leads,
      })),
    categories: rows
      .filter((r) => r.page_type === "category" && r.category_slug)
      .map((r) => ({
        slug: r.category_slug!,
        name: formatCategory(r.category_slug!) ?? r.category_slug!,
        qualifying: r.qualifying_leads,
      })),
  };
}
