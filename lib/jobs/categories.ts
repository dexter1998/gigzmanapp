/**
 * Which businesses are worth sweeping and crawling for jobs.
 *
 * This used to be a *subtraction*: take the six plausible sections of the leads allowlist
 * (lib/categories.ts) and remove an owner-operated tail. That shape kept producing a 70-type sweep
 * list, because any new type added to one of those sections joined the jobs sweep automatically
 * unless someone remembered to exclude it. 70 types is two Places `searchNearby` calls per tile
 * (see chunkTypes(.., 50) in app/api/jobs/discover/route.ts) and four tiles per auto-idle round,
 * i.e. eight billed sweeps every time the map settles — most of them over types that have never
 * produced a listing.
 *
 * It is now an explicit *allowlist*. A type earns its place by clearing two bars that the leads
 * allowlist does not test for: the business plausibly employs enough people to run an HR function,
 * AND it publishes openings somewhere a crawler can reach (a careers page or an ATS).
 *
 * ── Evidence (172,438 crawled companies, measured 2026-10-03) ─────────────────────────────────
 * Across the whole corpus only 26% ever yielded a careers_url and 57% came back
 * `no_careers_page`, so the cost of a wrong type here is a full crawl for nothing. Measured
 * jobs-yield per category (share of companies that ended up with at least one open listing):
 *
 *   KEPT, strong          Hotel 23.8% · Logistics 30.4% · Insurance broker 31.9% · Pharma 33.2%
 *                         Recruiter 10.9% · Employment agency 10.1% · BPO 11.9% · University 11.8%
 *                         College 11.4% · International school 18.6% · Law firm 13.3%
 *                         Coworking 11.0% · Telecom provider 10.6% · Hospital 11.6%
 *   DROPPED, measured     Tour agency 0.0% · Computer repair 0.8% · Driving school 1.2%
 *                         Elementary school 2.8% · Travel agency 2.9% · Medical clinic 4.8%
 *                         Day care 5.4% · Office space rental 3.2% · Primary school 7.3%
 *                         Preschool 8.5%
 *   DROPPED, no corpus    spa · salon · yoga · physiotherapist · dentist · dental_clinic ·
 *                         pharmacy · veterinary_care · massage · chiropractor · guest_house ·
 *                         hostel · motel · wellness_center — none of these reached even 40
 *                         crawled companies, because they so rarely have a site worth registering.
 *
 * Net effect: 70 types -> 24, which is one Places call per tile instead of two, and a crawl queue
 * weighted toward the types that actually return listings.
 *
 * Re-measure with scripts/jobs/yield.ts before adding anything back.
 */

import { TYPE_TO_SECTION } from "@/lib/categories";
import { EXCLUDED_PRIMARY_TYPES } from "@/lib/lead-quality";

/**
 * The sweep list. Every entry is a Google Places `primaryType`.
 *
 * Grouped by why it qualifies, not by the leads taxonomy's own sections — a hospital and a
 * university are here for the same reason (a large institution with a standing HR function), even
 * though they live in different sections over there.
 */
export const JOBS_ELIGIBLE_TYPES = [
  // Offices and employers-of-record. The core of the product: these are what "a company with a
  // careers page" looks like on a map.
  "business_center",
  "coworking_space",
  "consultant",
  "employment_agency",
  "insurance_agency",
  "lawyer",
  "accounting",
  "telecommunications_service_provider",
  "television_studio",

  // Industry and distribution. Lower density than offices, but they hire in volume when they hire.
  "manufacturer",
  "supplier",
  "courier_service",
  "shipping_service",

  // Education, secondary level and above only. Everything below it (preschool, primary_school,
  // elementary) measured between 2.8% and 8.5% and is usually a single premises with no HR page.
  "university",
  "educational_institution",
  "academic_department",
  "research_institute",
  "school",
  "secondary_school",

  // Healthcare, institutions only. A hospital runs recruitment; a clinic, dentist or
  // physiotherapist is one or two practitioners and never publishes openings.
  "hospital",
  "general_hospital",

  // Lodging, chain-scale only. `hotel` measured 90.9% careers / 23.8% jobs — the best single type
  // in the corpus. The B&B / guest_house / hostel / campground tail measured nothing at all.
  "hotel",
  "resort_hotel",
  "extended_stay_hotel",
] as const;

const ELIGIBLE_SET: ReadonlySet<string> = new Set(JOBS_ELIGIBLE_TYPES);

/**
 * Sections still exported for the industry dropdown on the jobs map — a distinct dimension from
 * JOB_FAMILY_LABEL (what sector the company is in vs. what role you do). Derived from the
 * allowlist above rather than hand-maintained, so narrowing the sweep can never leave the filter
 * offering an industry that is no longer crawled.
 */
export const JOBS_ELIGIBLE_SECTIONS: ReadonlySet<string> = new Set(
  JOBS_ELIGIBLE_TYPES.map((t) => TYPE_TO_SECTION[t]).filter(Boolean),
);

export function isJobsEligibleType(primaryType: string | null | undefined): boolean {
  if (!primaryType) return false;
  // The leads-side exclusions still apply on top: a type can be worth sweeping in principle and
  // still be something lead-quality has globally blacklisted (closed, permanently moved, etc).
  if (EXCLUDED_PRIMARY_TYPES.has(primaryType)) return false;
  return ELIGIBLE_SET.has(primaryType);
}

/** For read-time SQL, same pattern as ALLOWED_LEAD_TYPES_SQL. */
export const JOBS_ELIGIBLE_TYPES_SQL: string[] = JOBS_ELIGIBLE_TYPES.filter(
  (t) => !EXCLUDED_PRIMARY_TYPES.has(t),
);
