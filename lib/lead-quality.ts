/**
 * Non-commercial/noise Google primary_types, confirmed via a live 5km/14-category dry-run audit
 * (9,542 real businesses) — apartment_building and housing_complex alone accounted for ~30% of
 * one section's results despite neither ever being in an includedTypes request; Google sometimes
 * assigns a residential primaryType to a place regardless of what type was searched for. Dropped
 * entirely at discovery time — never inserted into `leads` — rather than filtered client-side, so
 * they never cost a website-check call either.
 */
import { TYPE_TO_SECTION } from "@/lib/categories";
export const EXCLUDED_PRIMARY_TYPES = new Set([
  "apartment_building",
  "apartment_complex",
  "condominium_complex",
  "housing_complex",
  "community_center",
  "association_or_organization",
  // Second audit wave (user report, 2026-08-31): these were reaching the map because the list
  // above only covered residential noise. A corporate office or a government counter is not a
  // web-design prospect any more than an apartment block is.
  "corporate_office",
  "government_office",
  "local_government_office",
  "city_hall",
  "courthouse",
  "embassy",
  "fire_station",
  "police",
  "post_office",
  "parking",
  "rest_stop",
  "transit_station",
  "bus_station",
  "train_station",
  "subway_station",
  "light_rail_station",
  "taxi_stand",
  "cemetery",
  "public_bathroom",
]);

/**
 * The real gate (2026-09-01): a lead's type must be IN the curated allowlist, not merely absent
 * from the denylist above. Google attaches primary types we never asked for (park, hindu_temple,
 * a housing society) to results of unrelated type queries — a denylist loses that race one type
 * at a time; "unmatched means excluded" doesn't. The denylist above remains as the record of
 * what was actually observed, and as the fast-path drop at discovery.
 *
 * Competitors are exempt everywhere: they're a name-detected flag (red pin), not a sellable
 * lead, and their types (software_company etc.) are deliberately not in the allowlist.
 */
export function isAllowedLeadType(primaryType: string | null | undefined): boolean {
  return !!primaryType && !!TYPE_TO_SECTION[primaryType] && !EXCLUDED_PRIMARY_TYPES.has(primaryType);
}

/** For read-time SQL: legacy junk rows (park, mandir, corporate_office, section-name fallbacks)
 * can't be deleted — unlocks/ledger FK-reference leads — so every surface filters through this. */
export const ALLOWED_LEAD_TYPES_SQL = Object.keys(TYPE_TO_SECTION).filter((t) => !EXCLUDED_PRIMARY_TYPES.has(t));

export function isExcludedType(primaryType: string | null | undefined): boolean {
  return !primaryType || EXCLUDED_PRIMARY_TYPES.has(primaryType);
}

/** Category tiers for heat scoring — ranked by typical ability-to-pay and how directly a website
 * translates into more business, not by how common the category is. Grounded in the same audit:
 * the "signal" examples that actually looked worth pursuing skewed toward these Tier A types. */
const TIER_A = new Set([
  "Hotels & Accommodation", "Professional Services", "Automotive", "Food & Drink",
]);
const TIER_B = new Set([
  "Shopping & Retail", "Health & Wellness", "Sports & Fitness", "Entertainment & Recreation", "Education",
]);
// Everything else (Finance, Business & B2B, Culture & Creative, Transportation Services,
// Personal Care & Local Services) is Tier C.

function categoryTierScore(section: string | null): number {
  if (section && TIER_A.has(section)) return 20;
  if (section && TIER_B.has(section)) return 12;
  return 6;
}

export type HeatScoreInput = {
  rating: number | null;
  review_count: number | null;
  has_website: boolean | null;
  primary_type: string | null;
  section: string | null; // TYPE_TO_SECTION[primary_type], resolved by the caller
  address: string | null;
};

/** 0-100. Review volume (log-scaled, rewards real/active businesses without letting mega-
 * businesses dominate infinitely) + rating + category tier + data completeness, then heavily
 * discounted (not zeroed) if the business already has a website — still visible, just not worth
 * leading with. Phone is deliberately NOT a completeness factor here: a lead with no phone is
 * excluded entirely before this ever runs (see route.ts), not merely scored down. */
export function heatScore(input: HeatScoreInput): number {
  const reviewCount = input.review_count ?? 0;
  const reviewConfidence = Math.min(40, Math.log10(reviewCount + 1) * 15);

  const ratingScore = input.rating ? (input.rating / 5) * 25 : 0;

  const tierScore = categoryTierScore(input.section);

  let completeness = 0;
  if (input.address) completeness += 7.5;
  if (input.primary_type && input.primary_type !== "service") completeness += 7.5;

  const raw = reviewConfidence + ratingScore + tierScore + completeness;
  const websiteMultiplier = input.has_website ? 0.1 : 1;

  return Math.round(raw * websiteMultiplier);
}
