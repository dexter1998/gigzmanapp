import { notFound } from "next/navigation";
import { CITY_BY_SLUG, areaDisplayName } from "@/lib/pseo/locations";
import { SERVICE_BY_SLUG } from "@/lib/pseo/services";
import { loadScope, type Scope, type PageStats, type ScoredLead } from "@/lib/pseo/stats";
import {
  getPage, pageKeyFor, cityAreaBreakdown, nearbyPublishedCities, publishedChildren,
  type AreaRow,
} from "@/lib/pseo/registry";
import { epochFor, selectForEpoch, CARDS_PER_PAGE, NAMED_LEADS, totalPages } from "@/lib/pseo/rotation";
import { maskName } from "@/lib/mask";

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
  /** The 20 leads on the requested page, already masked where they should be. */
  leads: Array<ScoredLead & { masked: boolean }>;
  page: number;
  pageCount: number;
  /** Total listed across all pages — less than `totalQualifying` once the cap bites. */
  listed: number;
  /** Total qualifying, so the page can disclose that it shows a subset. */
  totalQualifying: number;
  /** Intent split across the whole slice, not just the current page — so the figure means something. */
  intentCounts: { high: number; medium: number; low: number };
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
  scope: Scope,
  page = 1
): Promise<PseoPageData> {
  const service = SERVICE_BY_SLUG.get(serviceSlug);
  const city = CITY_BY_SLUG.get(citySlug);
  if (!service || !city) notFound();

  const pageKey = pageKeyFor(serviceSlug, scope);
  const registryRow = await getPage(pageKey);
  // withheld, or never evaluated, means the data doesn't support a page. A crawler probing the URL
  // space gets a real 404 rather than a thin page.
  if (!registryRow || registryRow.status === "withheld") notFound();

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

  // Names are shown for the first two pages and masked after that. The identity of a business is
  // already public on Google Maps, so revealing the strongest leads costs nothing we actually sell
  // — but publishing the entire inventory in a crawlable list would. Forty is the line.
  const listedLeads = selectForEpoch(leads, pageKey, epochFor());
  const pageCount = totalPages(listedLeads.length);
  // Out of range is a 404, not a clamp. Clamping would serve page 1's content at /page/9 and at
  // /page/40 — an unbounded set of URLs all duplicating the same page, which is precisely what we
  // are being careful not to create.
  if (!Number.isInteger(page) || page < 1 || page > pageCount) notFound();
  const current = page;
  const slice = listedLeads
    .slice((current - 1) * CARDS_PER_PAGE, current * CARDS_PER_PAGE)
    .map((lead, i) => {
      const absoluteIndex = (current - 1) * CARDS_PER_PAGE + i;
      const masked = absoluteIndex >= NAMED_LEADS;
      return { ...lead, masked, business_name: masked ? maskName(lead.business_name) : lead.business_name };
    });

  return {
    service,
    city,
    areaName: scope.kind === "area" ? areaDisplayName(scope.areaSlug) : null,
    categoryLabel: scope.kind === "category" ? stats.categories[0]?.label ?? scope.category : null,
    // Only the first page is indexable. Beyond it the names are masked, so there is little for a
    // searcher there — and a deep run of near-identical paginated URLs is exactly the "closer to
    // search results than a browseable hierarchy" pattern Google calls doorway abuse. Pages 2+ stay
    // crawlable and linked so the hierarchy is intact; they just aren't submitted or indexed.
    indexable: registryRow.status === "published" && current === 1,
    stats,
    leads: slice,
    page: current,
    pageCount,
    listed: listedLeads.length,
    totalQualifying: stats.qualifying,
    intentCounts: {
      high: leads.filter((l) => l.intent === "high").length,
      medium: leads.filter((l) => l.intent === "medium").length,
      low: leads.filter((l) => l.intent === "low").length,
    },
    areas,
    rank,
    children: await publishedChildren(serviceSlug, citySlug),
    nearby: await nearbyPublishedCities(citySlug),
    lastMaterialChangeAt: registryRow.last_material_change_at,
  };
}
