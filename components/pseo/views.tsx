import type { Metadata } from "next";
import { COMPANY } from "@/lib/company";
import { loadPageData } from "@/lib/pseo/page-data";
import { ListingShell } from "@/components/pseo/ListingShell";
import type { Crumb } from "@/components/pseo/Breadcrumbs";

/**
 * One view per listing page type, shared by the page itself and its `/page/N` route.
 *
 * The pagination routes render exactly the same thing with a different offset, so they must not be
 * a second copy of the page — a copy is how the two would drift into saying different things about
 * the same data.
 */

const pct = (n: number) => `${Math.round(n * 100)}%`;

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

/** Page 2 and beyond say so in the title, and are never submitted for indexing. */
function paged(title: string, page: number) {
  return page > 1 ? `${title} — page ${page}` : title;
}
function robotsFor(indexable: boolean, page: number) {
  return indexable && page === 1 ? undefined : { index: false, follow: true };
}

/* ------------------------------------------------------------------ city */

export async function cityMetadata(serviceSlug: string, citySlug: string, page = 1): Promise<Metadata> {
  const d = await loadPageData(serviceSlug, citySlug, { kind: "city", citySlug }, page);
  const base = `${COMPANY.site}/leads/${serviceSlug}/${citySlug}`;
  return {
    title: paged(`${d.stats.qualifying} ${d.service.name} Leads in ${d.city.name} — businesses with no website`, d.page),
    description:
      `${d.stats.qualifying} businesses in ${d.city.name} have an active Google listing and no website — ` +
      `${pct(d.stats.gapRate)} of the ${d.stats.checked} we've checked. Ranked by opportunity, with category and area breakdowns.`,
    alternates: { canonical: d.page > 1 ? `${base}/page/${d.page}` : base },
    robots: robotsFor(d.indexable, d.page),
  };
}

export async function CityLeadsView({ serviceSlug, citySlug, page = 1 }: {
  serviceSlug: string; citySlug: string; page?: number;
}) {
  const d = await loadPageData(serviceSlug, citySlug, { kind: "city", citySlug }, page);
  const base = `/leads/${serviceSlug}/${citySlug}`;

  // A rate over a handful of businesses isn't a finding. At 40 the widest gap was a 40-lead village
  // at 85%, which is noise presented as insight; 150 is enough for the claim to hold up.
  const strongest = [...d.areas].filter((a) => a.checked >= 150).sort((a, b) => b.gapRate - a.gapRate)[0];
  // Only worth saying when the two medians actually differ — otherwise it reads as filler.
  const reviewComparison =
    d.stats.medianReviewsNoWebsite !== null &&
    d.stats.medianReviewsWithWebsite !== null &&
    d.stats.medianReviewsNoWebsite > 0 &&
    d.stats.medianReviewsNoWebsite !== d.stats.medianReviewsWithWebsite;

  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Lead Market", href: "/leads" },
    { label: d.service.name, href: `/leads/${serviceSlug}` },
    ...(d.page > 1 ? [{ label: d.city.name, href: base }, { label: `Page ${d.page}` }] : [{ label: d.city.name }]),
  ];

  return (
    <ListingShell
      data={d}
      serviceSlug={serviceSlug}
      citySlug={citySlug}
      crumbs={crumbs}
      basePath={base}
      canonical={`${COMPANY.site}${d.page > 1 ? `${base}/page/${d.page}` : base}`}
      h1={`${d.stats.qualifying} ${d.service.name} Leads in ${d.city.name}`}
      headlineStats={[
        { label: "no website", value: String(d.stats.qualifying) },
        { label: "checked here", value: String(d.stats.checked) },
        { label: "website gap", value: pct(d.stats.gapRate) },
        { label: "categories", value: String(d.stats.distinctCategories) },
        { label: "areas covered", value: String(d.areas.length) },
      ]}
      listingTitle="Highest-scoring opportunities"
      showAreaGrid
      intro={
        <>
          {d.stats.qualifying} businesses in {d.city.name}{" "}
          ({d.city.aliases.includes("gurugram") ? "Gurugram" : d.city.state}) have an active Google listing and no
          website of their own — {pct(d.stats.gapRate)} of the {d.stats.checked} we have checked here.{" "}
          {strongest && `The gap is widest in ${strongest.name}, where ${pct(strongest.gapRate)} of businesses have no site.`}{" "}
          {reviewComparison &&
            `They are not dormant listings: among those carrying reviews, the median business without a website has ${d.stats.medianReviewsNoWebsite}, against ${d.stats.medianReviewsWithWebsite} for those that have one.`}
        </>
      }
    />
  );
}

/* ------------------------------------------------------------------ area */

export async function areaMetadata(serviceSlug: string, citySlug: string, areaSlug: string, page = 1): Promise<Metadata> {
  const d = await loadPageData(serviceSlug, citySlug, { kind: "area", citySlug, areaSlug }, page);
  const base = `${COMPANY.site}/leads/${serviceSlug}/${citySlug}/areas/${areaSlug}`;
  return {
    title: paged(`${d.stats.qualifying} businesses with no website in ${d.areaName}, ${d.city.name}`, d.page),
    description:
      `${d.stats.qualifying} of ${d.stats.checked} businesses mapped in ${d.areaName} have no website — ` +
      `a ${pct(d.stats.gapRate)} gap. Ranked by opportunity score.`,
    alternates: { canonical: d.page > 1 ? `${base}/page/${d.page}` : base },
    robots: robotsFor(d.indexable, d.page),
  };
}

export async function AreaLeadsView({ serviceSlug, citySlug, areaSlug, page = 1 }: {
  serviceSlug: string; citySlug: string; areaSlug: string; page?: number;
}) {
  const d = await loadPageData(serviceSlug, citySlug, { kind: "area", citySlug, areaSlug }, page);
  const base = `/leads/${serviceSlug}/${citySlug}/areas/${areaSlug}`;
  const cityBase = `/leads/${serviceSlug}/${citySlug}`;

  const cityGap =
    d.areas.reduce((acc, a) => acc + a.qualifying, 0) / Math.max(1, d.areas.reduce((acc, a) => acc + a.checked, 0));
  const delta = d.stats.gapRate - cityGap;

  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Lead Market", href: "/leads" },
    { label: d.service.name, href: `/leads/${serviceSlug}` },
    { label: d.city.name, href: cityBase },
    ...(d.page > 1
      ? [{ label: d.areaName ?? areaSlug, href: base }, { label: `Page ${d.page}` }]
      : [{ label: d.areaName ?? areaSlug }]),
  ];

  return (
    <ListingShell
      data={d}
      serviceSlug={serviceSlug}
      citySlug={citySlug}
      crumbs={crumbs}
      basePath={base}
      canonical={`${COMPANY.site}${d.page > 1 ? `${base}/page/${d.page}` : base}`}
      h1={`${d.stats.qualifying} businesses with no website in ${d.areaName}`}
      activeAreaSlug={areaSlug}
      headlineStats={[
        { label: "no website", value: String(d.stats.qualifying) },
        { label: "checked here", value: String(d.stats.checked) },
        { label: "website gap", value: pct(d.stats.gapRate) },
        ...(d.rank ? [{ label: `of ${d.rank.of} areas by volume`, value: `#${d.rank.byCount}` }] : []),
        { label: "categories", value: String(d.stats.distinctCategories) },
      ]}
      listingTitle="Highest-scoring opportunities"
      intro={
        <>
          {/* The comparison against the city is the reason this page exists separately from its
              parent: the same list without it would be a slice, not a finding. */}
          {d.stats.qualifying} of the {d.stats.checked} businesses we have mapped in {d.areaName} have no website — a{" "}
          {pct(d.stats.gapRate)} gap,{" "}
          {Math.abs(delta) < 0.02
            ? `close to the ${pct(cityGap)} average across ${d.city.name}`
            : `${Math.abs(Math.round(delta * 100))} points ${delta > 0 ? "above" : "below"} the ${pct(cityGap)} average across ${d.city.name}`}
          .{" "}
          {d.rank &&
            `That ranks ${d.areaName} ${ordinal(d.rank.byCount)} of ${d.rank.of} areas by volume, and ${ordinal(d.rank.byGapRate)} by gap rate.`}
        </>
      }
    />
  );
}

/* -------------------------------------------------------------- category */

export async function categoryMetadata(serviceSlug: string, citySlug: string, category: string, page = 1): Promise<Metadata> {
  const d = await loadPageData(serviceSlug, citySlug, { kind: "category", citySlug, category }, page);
  const base = `${COMPANY.site}/leads/${serviceSlug}/${citySlug}/categories/${category}`;
  return {
    title: paged(`${d.categoryLabel} businesses with no website in ${d.city.name} — ${d.stats.qualifying} leads`, d.page),
    description:
      `${d.stats.qualifying} of ${d.stats.checked} ${String(d.categoryLabel).toLowerCase()} businesses mapped in ` +
      `${d.city.name} have no website — a ${pct(d.stats.gapRate)} gap.`,
    alternates: { canonical: d.page > 1 ? `${base}/page/${d.page}` : base },
    robots: robotsFor(d.indexable, d.page),
  };
}

export async function CategoryLeadsView({ serviceSlug, citySlug, category, page = 1 }: {
  serviceSlug: string; citySlug: string; category: string; page?: number;
}) {
  const d = await loadPageData(serviceSlug, citySlug, { kind: "category", citySlug, category }, page);
  const base = `/leads/${serviceSlug}/${citySlug}/categories/${category}`;
  const cityBase = `/leads/${serviceSlug}/${citySlug}`;

  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Lead Market", href: "/leads" },
    { label: d.service.name, href: `/leads/${serviceSlug}` },
    { label: d.city.name, href: cityBase },
    ...(d.page > 1
      ? [{ label: d.categoryLabel ?? category, href: base }, { label: `Page ${d.page}` }]
      : [{ label: d.categoryLabel ?? category }]),
  ];

  return (
    <ListingShell
      data={d}
      serviceSlug={serviceSlug}
      citySlug={citySlug}
      crumbs={crumbs}
      basePath={base}
      canonical={`${COMPANY.site}${d.page > 1 ? `${base}/page/${d.page}` : base}`}
      h1={`${d.categoryLabel} businesses with no website in ${d.city.name}`}
      activeCategorySlug={category}
      showAreaGrid
      headlineStats={[
        { label: "no website", value: String(d.stats.qualifying) },
        { label: "checked here", value: String(d.stats.checked) },
        { label: "website gap", value: pct(d.stats.gapRate) },
        ...(d.stats.medianRatingNoWebsite !== null
          ? [{ label: "median rating", value: `${d.stats.medianRatingNoWebsite.toFixed(1)}★` }]
          : []),
      ]}
      listingTitle="Highest-scoring opportunities"
      intro={
        <>
          {d.stats.qualifying} of the {d.stats.checked} {String(d.categoryLabel).toLowerCase()} businesses we have
          mapped in {d.city.name} have no website — a {pct(d.stats.gapRate)} gap.
          {d.stats.medianReviewsNoWebsite !== null && d.stats.medianReviewsNoWebsite > 0 &&
            ` Among those carrying reviews, the median has ${d.stats.medianReviewsNoWebsite} — these are trading businesses, not stale listings.`}
        </>
      }
    />
  );
}
