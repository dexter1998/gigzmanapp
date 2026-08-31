import { pseoSql } from "@/lib/pseo/db";
import { ALLOWED_LEAD_TYPES_SQL } from "@/lib/lead-quality";
import { heatScore } from "@/lib/lead-quality";
import { TYPE_TO_SECTION, formatCategory } from "@/lib/categories";

/**
 * Everything a public lead page states about its slice of the market.
 *
 * This is the part that makes the pages worth publishing. Names, ratings and review counts come
 * from Google listings and are not ours; the gap rates, rankings, score distribution and coverage
 * figures below are computed from a dataset we assembled and exist nowhere else. A page carrying
 * only the former would be a restatement of a feed.
 */

export type Scope =
  | { kind: "city"; citySlug: string }
  | { kind: "area"; citySlug: string; areaSlug: string }
  | { kind: "category"; citySlug: string; category: string };

export type ScoredLead = {
  id: string;
  business_name: string;
  category: string | null;
  categoryLabel: string;
  area_slug: string | null;
  rating: number | null;
  review_count: number | null;
  website_checked_at: Date | null;
  score: number;
  /** Derived signals the filters work on. "Intent" is an established trading business without a
   *  website — reviews prove it is active, the rating proves customers like it. */
  intent: "high" | "medium" | "low";
  /** Days since we verified the no-website claim, for the freshness filter. */
  verifiedDaysAgo: number | null;
};

export type CategoryMix = {
  category: string;
  label: string;
  qualifying: number;
  checked: number;
  gapRate: number;
};

export type PageStats = {
  /** Businesses with no website — what the page is about. */
  qualifying: number;
  /** Businesses we have actually checked either way. The denominator for every rate below. */
  checked: number;
  /** has_website IS NULL — excluded from both numerator and denominator, and disclosed. */
  unknown: number;
  gapRate: number;
  distinctCategories: number;
  withRating: number;
  ratedShare: number;
  /** Qualifying businesses first stored in the last seven days — the "12 added this week" signal. */
  addedThisWeek: number;
  /** Median review count of the no-website businesses vs those that have one. The argument that
   *  these are live businesses rather than dead listings — a comparison Places never publishes. */
  medianReviewsNoWebsite: number | null;
  medianReviewsWithWebsite: number | null;
  medianRatingNoWebsite: number | null;
  categories: CategoryMix[];
  scoreBands: { label: string; count: number }[];
  coverage: { cells: number; exhausted: number; lastVerified: Date | null };
  /** Newest and oldest verification stamps actually shown on this page. */
  verifiedRange: { newest: Date | null; oldest: Date | null };
};

/** Rows are fetched to score them in TypeScript — heatScore lives in lib/lead-quality.ts and is the
 *  same function the product uses, so a page can never show a score the app disagrees with. The cap
 *  bounds the largest slice (Gurgaon citywide, ~8k) at build/revalidate time. */
const MAX_SCORED_ROWS = 6000;

function scopePredicate(scope: Scope) {
  if (scope.kind === "area") {
    return pseoSql`l.city_slug = ${scope.citySlug} AND l.area_slug = ${scope.areaSlug}`;
  }
  if (scope.kind === "category") {
    return pseoSql`l.city_slug = ${scope.citySlug} AND l.category = ${scope.category}`;
  }
  return pseoSql`l.city_slug = ${scope.citySlug}`;
}

/** A business with real reviews and a good rating, and still no website, is the strongest kind of
 *  opportunity on these pages — it is demonstrably trading and demonstrably underserved. */
function intentOf(rating: number | null, reviews: number | null): "high" | "medium" | "low" {
  if (reviews == null || reviews === 0) return "low";
  if (reviews >= 20 && (rating ?? 0) >= 4) return "high";
  if (reviews >= 5) return "medium";
  return "low";
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

type RawLead = {
  id: string;
  business_name: string;
  category: string | null;
  address: string | null;
  area_slug: string | null;
  rating: number | null;
  review_count: number | null;
  has_website: boolean | null;
  website_checked_at: Date | null;
  created_at: Date | null;
};

export async function loadScope(scope: Scope): Promise<{ stats: PageStats; leads: ScoredLead[] }> {
  const where = scopePredicate(scope);

  const rows = (await pseoSql`
    SELECT l.id, l.business_name, l.category, l.address, l.area_slug,
           l.rating, l.review_count, l.has_website, l.website_checked_at, l.created_at
    FROM leads l
    WHERE ${where}
      AND l.is_competitor = false
      AND l.category IS NOT NULL
      AND l.category = ANY(${ALLOWED_LEAD_TYPES_SQL})
    LIMIT ${MAX_SCORED_ROWS}
  `) as unknown as RawLead[];

  const checkedRows = rows.filter((r) => r.has_website !== null);
  const noSite = checkedRows.filter((r) => r.has_website === false);
  const hasSite = checkedRows.filter((r) => r.has_website === true);

  // Only leads we can honestly date are eligible to appear — the page states "last verified" per
  // card, and a card with no timestamp can't support that claim.
  const eligible = noSite.filter((r) => r.website_checked_at !== null);

  const weekAgo = Date.now() - 7 * 86_400_000;
  const addedThisWeek = eligible.filter((r) => r.created_at !== null && r.created_at.getTime() >= weekAgo).length;

  const scored: ScoredLead[] = eligible
    .map((r) => ({
      id: r.id,
      business_name: r.business_name,
      category: r.category,
      categoryLabel: formatCategory(r.category) ?? "Local business",
      area_slug: r.area_slug,
      rating: r.rating,
      review_count: r.review_count,
      website_checked_at: r.website_checked_at,
      score: heatScore({
        rating: r.rating,
        review_count: r.review_count,
        has_website: false,
        primary_type: r.category,
        section: r.category ? (TYPE_TO_SECTION[r.category] ?? null) : null,
        address: r.address,
      }),
      intent: intentOf(r.rating, r.review_count),
      verifiedDaysAgo: r.website_checked_at
        ? Math.floor((Date.now() - r.website_checked_at.getTime()) / 86_400_000)
        : null,
    }))
    .sort((a, b) => b.score - a.score);

  const byCategory = new Map<string, { q: number; c: number }>();
  for (const r of checkedRows) {
    const key = r.category!;
    const e = byCategory.get(key) ?? { q: 0, c: 0 };
    e.c += 1;
    if (r.has_website === false) e.q += 1;
    byCategory.set(key, e);
  }

  const categories: CategoryMix[] = [...byCategory.entries()]
    .map(([category, v]) => ({
      category,
      label: formatCategory(category) ?? category,
      qualifying: v.q,
      checked: v.c,
      gapRate: v.c ? v.q / v.c : 0,
    }))
    .filter((c) => c.qualifying > 0)
    .sort((a, b) => b.qualifying - a.qualifying);

  const bands = [
    { label: "80+", min: 80 },
    { label: "60–79", min: 60 },
    { label: "40–59", min: 40 },
    { label: "under 40", min: 0 },
  ];
  const scoreBands = bands.map((b, i) => {
    const max = i === 0 ? Infinity : bands[i - 1].min;
    return { label: b.label, count: scored.filter((s) => s.score >= b.min && s.score < max).length };
  });

  // Sorted numerically: these arrive as Date objects, and Array.sort's default comparator would
  // order them by their string form ("Fri Aug 28" before "Wed Aug 26").
  const stamps = eligible
    .map((r) => r.website_checked_at)
    .filter((d): d is Date => !!d)
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    stats: {
      qualifying: noSite.length,
      checked: checkedRows.length,
      unknown: rows.length - checkedRows.length,
      gapRate: checkedRows.length ? noSite.length / checkedRows.length : 0,
      distinctCategories: categories.length,
      withRating: noSite.filter((r) => r.rating !== null).length,
      addedThisWeek,
      ratedShare: noSite.length ? noSite.filter((r) => r.rating !== null).length / noSite.length : 0,
      // Computed only over businesses that actually carry a review count. Treating a missing
      // count as zero dragged both medians to 0 and produced "carries 0 reviews, against 0 for
      // those that have one" — a sentence that says nothing and invites doubt about the rest.
      medianReviewsNoWebsite: median(
        noSite.filter((r) => r.review_count != null).map((r) => r.review_count!)
      ),
      medianReviewsWithWebsite: median(
        hasSite.filter((r) => r.review_count != null).map((r) => r.review_count!)
      ),
      // Ratings go through the integer median in tenths and come back out — median() rounds, and
      // rounding 4.45 to 4 would misstate the figure by nearly half a star.
      medianRatingNoWebsite: (() => {
        const tenths = median(noSite.filter((r) => r.rating !== null).map((r) => Math.round(r.rating! * 10)));
        return tenths === null ? null : tenths / 10;
      })(),
      categories,
      scoreBands,
      coverage: await coverageFor(scope),
      verifiedRange: { newest: stamps.at(-1) ?? null, oldest: stamps[0] ?? null },
    },
    leads: scored,
  };
}

/**
 * How thoroughly this ground has actually been scanned, from area_type_scans.
 *
 * Published so the reader can see where the numbers came from and what is missing. It is also the
 * honest answer to "is 37 the real number or just how far we got" — a page whose coverage is
 * unproven has no business claiming a market-wide rate, which is why the gate requires it.
 */
async function coverageFor(scope: Scope): Promise<PageStats["coverage"]> {
  const [row] = (await pseoSql`
    SELECT count(*)::int AS cells,
           count(*) FILTER (WHERE s.is_exhausted)::int AS exhausted,
           max(s.last_verified_at) AS last_verified
    FROM area_type_scans s
    WHERE EXISTS (
      SELECT 1 FROM leads l
      WHERE ${scopePredicate(scope)}
        AND l.lat BETWEEN s.center_lat - 0.02 AND s.center_lat + 0.02
        AND l.lng BETWEEN s.center_lng - 0.02 AND s.center_lng + 0.02
      LIMIT 1
    )
  `) as unknown as [{ cells: number; exhausted: number; last_verified: Date | null }];

  return { cells: row?.cells ?? 0, exhausted: row?.exhausted ?? 0, lastVerified: row?.last_verified ?? null };
}
