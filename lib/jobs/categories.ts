/**
 * Which businesses are worth scraping for jobs.
 *
 * This is a *narrowing* of the leads allowlist (lib/categories.ts), not a separate taxonomy. A
 * business qualifies as a lead when it might buy a website; it qualifies as a jobs source when it
 * plausibly employs people *and* publishes openings somewhere a crawler can reach. Those are
 * different bars, and most of the leads allowlist fails the second one.
 *
 * The excluded set below is the owner-operated tail: a one-person real-estate agency or a corner
 * general store may well hire, but it does so by word of mouth and a sign in the window, never via
 * a careers page. Scraping them costs a full crawl each and returns nothing, every time.
 */

import { TYPE_TO_SECTION } from "@/lib/categories";
import { EXCLUDED_PRIMARY_TYPES } from "@/lib/lead-quality";

/**
 * Owner-operated / single-premises types that essentially never publish a careers page.
 * Confirmed against the 10k-domain crawl: none of these produced a single structured listing.
 */
export const JOBS_EXCLUDED_TYPES = new Set([
  "general_store", "convenience_store", "grocery_store", "corner_store",
  "real_estate_agency", "real_estate_agent",
  "atm", "bank",
  "storage", "self_storage", "moving_company",
  "cell_phone_store", "mobile_phone_store", "electronics_store",
  "gift_shop", "florist", "stationery_store", "book_store",
  "hardware_store", "paint_store", "plumbing_supply_store",
  "liquor_store", "tobacco_shop", "pawn_shop",
  "laundry", "dry_cleaner", "tailor", "shoe_repair",
  "locksmith", "key_duplication",
  "travel_agency", "visa_consultant",
  "photographer", "photo_studio",
  "internet_cafe", "cyber_cafe",
  "food_stall", "juice_shop", "tea_house", "coffee_stand", "hot_dog_stand",
]);

/**
 * Sections that are structurally worth crawling — organisations large enough to have an HR
 * function. A type must be in one of these AND survive the exclusions above.
 */
const JOBS_ELIGIBLE_SECTIONS = new Set([
  "Automotive",
  "Business & B2B",
  "Culture & Creative",
  "Education",
  "Entertainment & Recreation",
  "Finance",
  "Food & Drink",
  "Health & Wellness",
  "Hotels & Accommodation",
  "Professional Services",
  "Personal Care & Local Services",
  "Shopping & Retail",
  "Sports & Fitness",
  "Transportation Services",
]);

export function isJobsEligibleType(primaryType: string | null | undefined): boolean {
  if (!primaryType) return false;
  if (JOBS_EXCLUDED_TYPES.has(primaryType)) return false;
  if (EXCLUDED_PRIMARY_TYPES.has(primaryType)) return false;
  const section = TYPE_TO_SECTION[primaryType];
  return !!section && JOBS_ELIGIBLE_SECTIONS.has(section);
}

/** For read-time SQL, same pattern as ALLOWED_LEAD_TYPES_SQL. */
export const JOBS_ELIGIBLE_TYPES_SQL = Object.keys(TYPE_TO_SECTION).filter(isJobsEligibleType);
