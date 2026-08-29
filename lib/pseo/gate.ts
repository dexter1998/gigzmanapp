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
};

export const MIN_PUBLISH_LEADS = 25;
/** Demotion sits below promotion on purpose: a page that hovers at the line would otherwise enter
 *  and leave the sitemap on alternate days, which is a worse signal than never appearing. */
export const MIN_KEEP_LEADS = 15;
export const MIN_RENDER_LEADS = 8;
export const MIN_RATED_SHARE = 0.4;
export const MIN_CATEGORIES = 5;
export const MIN_AREAS = 3;
export const REQUIRED_PASS_STREAK = 2;

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

  if (stats.qualifying < MIN_PUBLISH_LEADS) {
    failures.push(`only ${stats.qualifying} qualifying leads (need ${MIN_PUBLISH_LEADS})`);
  }

  // A page of unrated listings has nothing to analyse: rating and review count carry 65 of the 100
  // points in the lead score, so without them every card scores the same and the page is a list,
  // not an assessment.
  if (stats.ratedShare < MIN_RATED_SHARE) {
    failures.push(`only ${(stats.ratedShare * 100).toFixed(0)}% of leads carry a rating (need ${MIN_RATED_SHARE * 100}%)`);
  }

  // Category pages are a single category by definition; the rule exists to stop a city or area page
  // being thirty of the same shop.
  if (pageType !== "category" && stats.distinctCategories < MIN_CATEGORIES) {
    failures.push(`only ${stats.distinctCategories} categories (need ${MIN_CATEGORIES})`);
  }

  if (pageType === "city" && (input.distinctAreas ?? 0) < MIN_AREAS) {
    failures.push(`only ${input.distinctAreas ?? 0} areas (need ${MIN_AREAS})`);
  }

  // Proves the count reflects the ground rather than how far a scan happened to get. Without it a
  // page could report "37 businesses" for an area we barely touched.
  const covered = stats.coverage.exhausted > 0 || (input.coverageResultCount ?? 0) >= 200;
  if (!covered) failures.push("no exhausted scan cell covering this area");

  const passesAllRules = failures.length === 0;

  if (passesAllRules && input.passStreak + 1 >= REQUIRED_PASS_STREAK) return { status: "published", failures, passesAllRules };
  if (stats.qualifying >= MIN_RENDER_LEADS) return { status: "noindex", failures, passesAllRules };
  return { status: "withheld", failures, passesAllRules };
}

/** Whether an already-published page should stay published. Uses the lower keep threshold so
 *  ordinary fluctuation doesn't pull a page out of the index. */
export function shouldStayPublished(stats: PageStats): boolean {
  return stats.qualifying >= MIN_KEEP_LEADS;
}
