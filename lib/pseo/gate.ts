import type { PageStats } from "@/lib/pseo/stats";

/**
 * Decides whether a page is published, kept but unindexed, or not built at all.
 *
 * This is the single mechanism keeping the section on the right side of Google's scaled-content
 * line, so the thresholds are deliberately conservative and deliberately hard to weaken: the way
 * programmatic SEO turns into a penalty is by loosening this gate when growth stalls.
 *
 * It also runs automatically every day, which means a page appears and disappears on its own as the
 * data behind it changes. Nobody deploys to publish a page.
 */

export type GateStatus = "published" | "noindex" | "withheld";

export type GateInput = {
  stats: PageStats;
  pageType: "city" | "area" | "category" | "hub";
  /** Consecutive prior evaluations that already passed every rule. */
  passStreak: number;
  /** Distinct areas represented, for city pages. */
  distinctAreas?: number;
  /** Aggregate result_count of the scan cells covering this scope. */
  coverageResultCount?: number;
  /** ISO 3166-1 alpha-2 of the city this page belongs to — selects the thresholds below. */
  countryCode?: string;
};

/**
 * Thresholds are per country, because the signal itself is not equally available everywhere.
 *
 * Measured across 141,863 places: the share of businesses with no website is 37.5% in India, 12.2%
 * in Britain and about 4% in Australia, the United States and Canada. One global threshold does not
 * hold two things constant — it holds the *count* constant while the underlying population varies
 * by nine times, which means an American page needs nine times the businesses behind it to say the
 * same sentence.
 *
 * This is a deliberate loosening, requested explicitly, and it is worth naming what it costs: the
 * comment above about the gate being hard to weaken exists because loosening it is how programmatic
 * SEO turns into a penalty. The protection that remains is that these are still real counts of real
 * verified businesses — nothing here lets a page exist without data behind it — but a 10-lead
 * American page is a thinner page than a 25-lead Indian one, and no threshold hides that.
 */
export const MIN_PUBLISH_LEADS_BY_COUNTRY: Record<string, number> = {
  in: 25, gb: 15, au: 10, us: 10, ca: 10,
  // Batch 2 (2026-09-01): registered ahead of any scan. Set to the same 10 as AU/US/CA rather than
  // India's 25 -- these are all higher-income economies where website penetration should sit closer
  // to the 4-14% measured for AU/US/GB than to India's 37.5%, so the lower bar is the reasonable
  // starting assumption. Adjust once a real scan measures each country's actual gap rate.
  de: 10, fr: 10, es: 10, it: 10, nl: 10, pl: 10, at: 10, be: 10, ie: 10,
  pt: 10, se: 10, dk: 10, ch: 10, cz: 10, hu: 10, gr: 10, ae: 10,
};
export const MIN_PUBLISH_LEADS = 25;

/** Demotion sits below promotion on purpose: a page that hovers at the line would otherwise enter
 *  and leave the sitemap on alternate days, which is a worse signal than never appearing. Held at
 *  60% of the publish threshold so the hysteresis scales with it. */
export const MIN_KEEP_LEADS = 15;
export const MIN_RENDER_LEADS = 8;
/** Not a publish rule. Rating coverage decides whether a page can make its rating-dependent
 *  claims — the score distribution in particular is one flat bar without it — but it does not
 *  decide whether the page exists. Those are different questions, and conflating them held back
 *  the largest pages in the section for a reason that had nothing to do with their content. */
export const MIN_RATED_SHARE = 0.4;
export const MIN_CATEGORIES = 5;
/**
 * How many areas a city page needs beneath it.
 *
 * Also per country, and for a reason that has nothing to do with quality: outside India and
 * Britain, Google's addressComponents frequently carry no neighbourhood at all. Australia's
 * `locality` is the suburb itself, and American addresses reliably carry `neighborhood` but the low
 * gap rate leaves too few qualifying leads in any one of them. Requiring three there does not
 * enforce a standard, it just withholds every page in the country — and because a withheld city
 * page 404s its whole subtree, it withholds the category pages too.
 */
export const MIN_AREAS_BY_COUNTRY: Record<string, number> = {
  in: 3, gb: 3, au: 1, us: 1, ca: 1,
  de: 1, fr: 1, es: 1, it: 1, nl: 1, pl: 1, at: 1, be: 1,
  pt: 1, se: 1, dk: 1, ch: 1, cz: 1, hu: 1, gr: 1,
  // Ireland's Eircode and the UAE have no area-extraction strategy at all (see AREA_STRATEGY in
  // countries.ts) -- area_slug will be null on every lead from either, forever. Requiring even 1
  // here would make their city pages fail the gate permanently regardless of how much data ever
  // arrives, which is a bug wearing a threshold's clothes, not a quality bar.
  ie: 0, ae: 0,
};
export const MIN_AREAS = 3;
export const REQUIRED_PASS_STREAK = 2;

export function minPublishFor(countryCode: string | null | undefined): number {
  return MIN_PUBLISH_LEADS_BY_COUNTRY[countryCode ?? "in"] ?? MIN_PUBLISH_LEADS;
}
export function minKeepFor(countryCode: string | null | undefined): number {
  return Math.ceil(minPublishFor(countryCode) * 0.6);
}
/** Floored at 5: below that a "page" is a heading and a handful of rows. */
export function minRenderFor(countryCode: string | null | undefined): number {
  return Math.max(5, Math.round(minPublishFor(countryCode) * 0.32));
}
export function minAreasFor(countryCode: string | null | undefined): number {
  return MIN_AREAS_BY_COUNTRY[countryCode ?? "in"] ?? MIN_AREAS;
}

export type GateResult = {
  status: GateStatus;
  /** Every rule that failed, so the admin screen and the cron log can say why rather than just
   *  reporting a verdict. */
  failures: string[];
  passesAllRules: boolean;
};

export function evaluateGate(input: GateInput): GateResult {
  const { stats, pageType } = input;
  const failures: string[] = [];

  const minPublish = minPublishFor(input.countryCode);
  if (stats.qualifying < minPublish) {
    failures.push(`only ${stats.qualifying} qualifying leads (need ${minPublish})`);
  }

  // Rating coverage is deliberately NOT a rule here. It was, and it turned out to gate on when we
  // happened to scan rather than on what the page can say: ratings only entered the Places field
  // mask on 25 Aug, so a 1,505-lead area with 165 categories, a real gap rate and a real rank sat
  // unindexed at 0% rated. Review counts are present regardless, so the demand-evidence comparison
  // still holds; only the score distribution genuinely needs ratings, and that panel now suppresses
  // itself. What a page may claim and whether a page may exist are separate questions.

  // Category pages are a single category by definition; the rule exists to stop a city or area page
  // being thirty of the same shop.
  if (pageType !== "category" && stats.distinctCategories < MIN_CATEGORIES) {
    failures.push(`only ${stats.distinctCategories} categories (need ${MIN_CATEGORIES})`);
  }

  const minAreas = minAreasFor(input.countryCode);
  if (pageType === "city" && (input.distinctAreas ?? 0) < minAreas) {
    failures.push(`only ${input.distinctAreas ?? 0} areas (need ${minAreas})`);
  }

  // Proves the count reflects the ground rather than how far a scan happened to get. Without it a
  // page could report "37 businesses" for an area we barely touched.
  const covered = stats.coverage.exhausted > 0 || (input.coverageResultCount ?? 0) >= 200;
  if (!covered) failures.push("no exhausted scan cell covering this area");

  const passesAllRules = failures.length === 0;

  if (passesAllRules && input.passStreak + 1 >= REQUIRED_PASS_STREAK) return { status: "published", failures, passesAllRules };
  if (stats.qualifying >= minRenderFor(input.countryCode)) return { status: "noindex", failures, passesAllRules };
  return { status: "withheld", failures, passesAllRules };
}

/** Whether an already-published page should stay published. Uses the lower keep threshold so
 *  ordinary fluctuation doesn't pull a page out of the index. */
export function shouldStayPublished(stats: PageStats, countryCode?: string): boolean {
  return stats.qualifying >= minKeepFor(countryCode);
}
