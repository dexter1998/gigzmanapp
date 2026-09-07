import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { chargeCredits, allowanceFor } from "@/lib/credits/server";
import { CREDIT_COST } from "@/lib/credits/pricing";
import { chunkTypes } from "@/lib/categories";
import { JOBS_ELIGIBLE_TYPES_SQL, isJobsEligibleType } from "@/lib/jobs/categories";
import { upsertJobCompany, refreshCompany } from "@/lib/jobs/store";
import { normalizeDomain } from "@/lib/jobs/golden";
import { looksLikeCompetitor } from "@/lib/competitors";
import { fetchNearbyBatch } from "@/lib/places/nearby-search";

export const maxDuration = 60;

/**
 * Job discovery for a map viewport.
 *
 * Candidates come from the leads table first — every business there was already discovered and
 * website-checked by the leads pipeline, so an area the Leads product has already scanned gets its
 * jobs candidate set for free. That used to be the ONLY source, which meant an area nobody had
 * panned over on the Leads map produced zero candidates by construction, no matter how many times
 * "Find jobs here" was clicked — confirmed live in Gurugram's outer sectors. The block below is the
 * fix: when the leads table is empty here, this now runs its own Nearby Search sweep (the same
 * Places API leads/find uses, extracted to lib/places/nearby-search.ts) restricted to
 * JOBS_ELIGIBLE_TYPES_SQL, seeds `leads` with whatever it finds, and re-reads candidates from there
 * — so Jobs works standalone in any area instead of depending on Leads having gone first.
 *
 * That fallback bills real Google money, so it is charged and rate-limited the same way
 * leads/find charges billed Places calls: area-cooldown + session-budget throttles sharing the
 * same `area_scans` table (one spend ledger across both products, not two separate allowances a
 * user could double), and `billed_places_call` credits past the free daily/monthly allowance.
 *
 * Reads leads.website_url directly rather than joining lead_enrichment. Google Places returns the
 * actual URL in the same discovery call that sets has_website (see app/api/leads/find/route.ts,
 * scripts/places-ingest.ts) -- lead_enrichment.website_url only gets populated by the separate,
 * paid, opt-in per-lead enrichment flow, so joining it here meant job discovery only ever found
 * candidates among the small fraction of leads someone had already unlocked and enriched.
 */

const MAX_COMPANIES_PER_SCAN = 25;
// A single company's crawl (findCareersUrl + the careers page fetch itself) can chain 10+
// sequential 8s-timeout fetches (robots.txt, up to 5 sitemap files, up to 3 candidate career URLs,
// a canary probe, guess-path fallbacks) -- worst case, tens of seconds for ONE company. Crawling
// the full MAX_COMPANIES_PER_SCAN in one request routinely blew past maxDuration and the whole
// scan came back as nothing, with no partial progress saved. Two per request keeps a single POST
// comfortably under the 60s ceiling even in a bad case, and the frontend loops (see
// app/(app)/jobs/map/page.tsx's discoverHere) so pins still appear progressively, same shape as
// the leads map's per-tile requests -- not one long silent wait.
const CRAWL_BATCH_SIZE = 2;

// Same anti-abuse shape as app/api/leads/find/route.ts, applied only to the new Places-fallback
// path below — the free "read what leads already has" path stays completely unthrottled, since it
// costs nothing and was never a problem.
const PER_AREA_COOLDOWN_SECONDS = 45;
const SESSION_REQUEST_BUDGET = 120;
const SESSION_WINDOW_MINUTES = 5;

// Caps the fallback sweep to a "default zoom" neighborhood regardless of how wide the viewport is
// — a user zoomed out to city scale must not trigger a search radius that bills the full grid
// subdivision leads/find would need; this is a single-shot bootstrap, not exhaustive coverage.
const MAX_FALLBACK_RADIUS_METERS = 3000;

function metersBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userEmail = session.user.email;

  const body = await req.json().catch(() => ({}));
  const nums = ["swLat", "swLng", "neLat", "neLng"].map((k) => {
    const n = Number(body?.[k]);
    return Number.isFinite(n) ? n : null;
  });
  if (nums.some((n) => n === null)) {
    return NextResponse.json({ error: "bounds are required" }, { status: 400 });
  }
  const [swLat, swLng, neLat, neLng] = nums as [number, number, number, number];
  const centerLat = (swLat + neLat) / 2;
  const centerLng = (swLng + neLng) / 2;

  async function readCandidates() {
    return sql`
      SELECT l.id, l.business_name, l.category, l.lat, l.lng, l.city_slug, l.country_code,
             l.website_url
        FROM leads l
       WHERE l.website_url IS NOT NULL
         AND l.lat BETWEEN ${Math.min(swLat, neLat)} AND ${Math.max(swLat, neLat)}
         AND l.lng BETWEEN ${Math.min(swLng, neLng)} AND ${Math.max(swLng, neLng)}
         AND l.category = ANY(${JOBS_ELIGIBLE_TYPES_SQL})
         -- Skip anything already registered: re-crawling on every pan would burn the crawl budget
         -- re-confirming what the 10-day refresh already keeps current.
         AND NOT EXISTS (
           SELECT 1 FROM job_companies jc
            WHERE jc.domain = regexp_replace(
              regexp_replace(lower(l.website_url), '^https?://', ''), '^www\\.|/.*$', '', 'g')
         )
       ORDER BY ((l.lat - ${centerLat}) ^ 2 + (l.lng - ${centerLng}) ^ 2) ASC
       LIMIT ${MAX_COMPANIES_PER_SCAN}
    `;
  }

  let candidates = await readCandidates();
  let placesCallsMade = 0;
  let fallbackThrottled: string | null = null;

  if (!candidates.length) {
    const cooldownKey = `${centerLat.toFixed(2)}_${centerLng.toFixed(2)}_jobs_discover`;

    const [recentSameArea] = await sql`
      SELECT id FROM area_scans
       WHERE requested_by = ${userEmail} AND cache_key = ${cooldownKey}
         AND billed_places_calls > 0
         AND created_at > now() - (${PER_AREA_COOLDOWN_SECONDS} || ' seconds')::interval
       LIMIT 1
    `;

    const [counts] = (await sql`
      SELECT COUNT(*) FILTER (WHERE billed_places_calls > 0)::int AS billed
      FROM area_scans
      WHERE requested_by = ${userEmail}
        AND created_at > now() - (${SESSION_WINDOW_MINUTES} || ' minutes')::interval
    `) as [{ billed: number }];

    const batches = chunkTypes(JOBS_ELIGIBLE_TYPES_SQL, 50);

    if (recentSameArea) {
      fallbackThrottled = "area_cooldown";
    } else if (counts.billed >= SESSION_REQUEST_BUDGET) {
      fallbackThrottled = "session_budget";
    } else {
      const [profile] = await sql`SELECT plan, credits FROM user_profiles WHERE email = ${userEmail}`;
      const plan = profile?.plan ?? "free";
      const creditsBefore = profile?.credits ?? 0;
      const allowance = await allowanceFor(userEmail, plan);
      const coveredForAll = allowance.covered && allowance.dayRemaining >= batches.length && allowance.monthRemaining >= batches.length;
      const requiredCredits = CREDIT_COST.billed_places_call * batches.length;

      if (!coveredForAll && creditsBefore < requiredCredits) {
        fallbackThrottled = "credits_required";
      } else {
        const radius = Math.min(metersBetween(swLat, swLng, neLat, neLng) / 2, MAX_FALLBACK_RADIUS_METERS);
        const discovered: Array<{
          id: string; name: string; category: string | null; lat: number | null; lng: number | null;
          phone: string | null; website: string; rating: number | null; reviews: number | null; isCompetitor: boolean;
        }> = [];

        for (const batch of batches) {
          const { places, failed } = await fetchNearbyBatch(batch, { lat: centerLat, lng: centerLng, radius });
          placesCallsMade++;
          if (failed) continue;
          for (const place of places) {
            if (!place.websiteUri) continue; // no website, no careers page — not a jobs candidate
            if (!isJobsEligibleType(place.primaryType)) continue;
            discovered.push({
              id: place.id,
              name: place.displayName?.text ?? "Unknown",
              category: place.primaryType ?? null,
              lat: place.location?.latitude ?? null,
              lng: place.location?.longitude ?? null,
              phone: place.nationalPhoneNumber ?? null,
              website: place.websiteUri,
              rating: place.rating ?? null,
              reviews: place.userRatingCount ?? null,
              isCompetitor: looksLikeCompetitor(place.displayName?.text ?? ""),
            });
          }
        }

        const [scan] = await sql`
          INSERT INTO area_scans (requested_by, area_label, center_lat, center_lng, category, cache_key, status, billed_places_calls, completed_at)
          VALUES (${userEmail}, ${`${centerLat.toFixed(4)},${centerLng.toFixed(4)} (jobs)`}, ${centerLat}, ${centerLng}, 'jobs_discover', ${cooldownKey}, 'done', ${placesCallsMade}, now())
          RETURNING id
        `;

        if (placesCallsMade > 0) {
          await chargeCredits(userEmail, "billed_places_call", { units: placesCallsMade });
        }

        for (const d of discovered) {
          await sql`
            INSERT INTO leads (area_scan_id, place_id, business_name, category, lat, lng, phone, has_website, website_url, website_checked_at, is_competitor, rating, review_count)
            VALUES (${scan.id}, ${d.id}, ${d.name}, ${d.category}, ${d.lat}, ${d.lng}, ${d.phone}, true, ${d.website}, now(), ${d.isCompetitor}, ${d.rating}, ${d.reviews})
            ON CONFLICT (place_id) DO UPDATE SET
              website_url = CASE WHEN leads.website_url IS NULL THEN EXCLUDED.website_url ELSE leads.website_url END
          `;
        }

        candidates = await readCandidates();
      }
    }
  }

  if (!candidates.length) {
    // Nothing new to crawl is not a failure, and must not be charged for beyond whatever Places
    // calls the fallback above already made (and already charged, if any).
    return NextResponse.json({
      scanned: 0, companies: 0, jobs: 0, charged: placesCallsMade > 0,
      placesCalls: placesCallsMade, throttled: fallbackThrottled,
    });
  }

  const charge = await chargeCredits(userEmail, "job_area_scan");
  if (!charge.ok) {
    return NextResponse.json({ error: "insufficient_credits", credits: charge.credits }, { status: 402 });
  }

  // Only this request's slice actually gets registered+crawled -- the rest stay uncrawled leads-
  // table rows (no job_companies row yet), so the NEXT call's readCandidates() picks them up fresh
  // instead of anything being skipped or double-counted.
  const batch = candidates.slice(0, CRAWL_BATCH_SIZE);
  const hasMore = candidates.length > CRAWL_BATCH_SIZE;

  let companiesRegistered = 0;
  let jobsFound = 0;

  for (const c of batch) {
    const domain = normalizeDomain(c.website_url as string);
    if (!domain) continue;

    const companyId = await upsertJobCompany({
      domain,
      companyName: c.business_name as string | null,
      leadId: c.id as string,
      category: c.category as string | null,
      lat: c.lat as number | null,
      lng: c.lng as number | null,
      citySlug: c.city_slug as string | null,
      countryCode: c.country_code as string | null,
    });
    if (!companyId) continue;
    companiesRegistered++;

    // One bad domain must not abort the whole scan — the user has already been charged for it.
    try {
      const stats = await refreshCompany(companyId, domain);
      jobsFound += stats.inserted;
    } catch {
      /* refreshCompany records its own failure status on the row */
    }
  }

  return NextResponse.json({
    scanned: batch.length,
    companies: companiesRegistered,
    jobs: jobsFound,
    placesCalls: placesCallsMade,
    charged: true,
    hasMore,
  });
}
