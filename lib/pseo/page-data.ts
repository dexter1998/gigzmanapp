import { notFound } from "next/navigation";
import { CITY_BY_SLUG, areaDisplayName } from "@/lib/pseo/locations";
import { SERVICE_BY_SLUG } from "@/lib/pseo/services";
import { loadScope, type Scope, type PageStats, type ScoredLead } from "@/lib/pseo/stats";
import {
  getPage, pageKeyFor, cityAreaBreakdown, nearbyPublishedCities, publishedChildren,
  type AreaRow,
} from "@/lib/pseo/registry";
import { epochFor, selectForEpoch } from "@/lib/pseo/rotation";

/**
 * Everything one public lead page renders, assembled server-side.
 *
 * Nothing here is fetched by the browser: the cards, the statistics and every internal link are in
 * the initial HTML. Google renders JavaScript but queues it, and advises pre-rendering regardless —
 * these pages are static, so there is no queue to wait in.
 */

export type PseoPageData = {
  service: NonNullable<ReturnType<typeof SERVICE_BY_SLUG.get>>;
  city: NonNullable<ReturnType<typeof CITY_BY_SLUG.get>>;
  areaName: string | null;
  categoryLabel: string | null;
  indexable: boolean;
  stats: PageStats;
  leads: ScoredLead[];
  /** Total qualifying, so the page can disclose that it shows a subset. */
  totalQualifying: number;
  areas: AreaRow[];
  /** Where this area ranks among its siblings — the figure that shows the hierarchy is real. */
  rank: { byCount: number; byGapRate: number; of: number } | null;
  children: Awaited<ReturnType<typeof publishedChildren>>;
  nearby: Awaited<ReturnType<typeof nearbyPublishedCities>>;
  lastMaterialChangeAt: Date | null;
};

export async function loadPageData(
  serviceSlug: string,
  citySlug: string,
  scope: Scope
): Promise<PseoPageData> {
  const service = SERVICE_BY_SLUG.get(serviceSlug);
  const city = CITY_BY_SLUG.get(citySlug);
  if (!service || !city) notFound();

  const pageKey = pageKeyFor(serviceSlug, scope);
  const page = await getPage(pageKey);
  // withheld, or never evaluated, means the data doesn't support a page. A crawler probing the URL
  // space gets a real 404 rather than a thin page.
  if (!page || page.status === "withheld") notFound();

  const { stats, leads } = await loadScope(scope);
  const areas = await cityAreaBreakdown(citySlug);

  let rank: PseoPageData["rank"] = null;
  if (scope.kind === "area") {
    const byCount = [...areas].sort((a, b) => b.qualifying - a.qualifying);
    const byGap = [...areas].sort((a, b) => b.gapRate - a.gapRate);
    rank = {
      byCount: byCount.findIndex((a) => a.area_slug === scope.areaSlug) + 1,
      byGapRate: byGap.findIndex((a) => a.area_slug === scope.areaSlug) + 1,
      of: areas.length,
    };
  }

  return {
    service,
    city,
    areaName: scope.kind === "area" ? areaDisplayName(scope.areaSlug) : null,
    categoryLabel: scope.kind === "category" ? stats.categories[0]?.label ?? scope.category : null,
    indexable: page.status === "published",
    stats,
    leads: selectForEpoch(leads, pageKey, epochFor()),
    totalQualifying: stats.qualifying,
    areas,
    rank,
    children: await publishedChildren(serviceSlug, citySlug),
    nearby: await nearbyPublishedCities(citySlug),
    lastMaterialChangeAt: page.last_material_change_at,
  };
}
