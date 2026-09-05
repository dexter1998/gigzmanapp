import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { chargeCredits } from "@/lib/credits/server";
import { JOBS_ELIGIBLE_TYPES_SQL } from "@/lib/jobs/categories";
import { upsertJobCompany, refreshCompany } from "@/lib/jobs/store";
import { normalizeDomain } from "@/lib/jobs/golden";

export const maxDuration = 60;

/**
 * Job discovery for a map viewport.
 *
 * It runs off the leads table rather than making its own Places calls: every business in there was
 * already discovered and website-checked by the leads pipeline, so jobs mode gets its candidate
 * set for free and the only new cost is our own crawl. That is also why this charges a flat
 * `job_area_scan` rather than per-call — there are no metered upstream calls to pass through.
 *
 * Reads leads.website_url directly rather than joining lead_enrichment. Google Places returns the
 * actual URL in the same discovery call that sets has_website (see app/api/leads/find/route.ts,
 * scripts/places-ingest.ts) -- lead_enrichment.website_url only gets populated by the separate,
 * paid, opt-in per-lead enrichment flow, so joining it here meant job discovery only ever found
 * candidates among the small fraction of leads someone had already unlocked and enriched.
 *
 * Two filters are applied before anything is crawled, and both are deliberate:
 *   - website_url IS NOT NULL. No website means no careers page, by definition.
 *   - jobs-eligible category. See lib/jobs/categories.ts for why the leads allowlist is too broad.
 */

const MAX_COMPANIES_PER_SCAN = 25;

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

  // Candidates already known to the leads pipeline for this viewport.
  const candidates = await sql`
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
     ORDER BY ((l.lat - ${(swLat + neLat) / 2}) ^ 2 + (l.lng - ${(swLng + neLng) / 2}) ^ 2) ASC
     LIMIT ${MAX_COMPANIES_PER_SCAN}
  `;

  if (!candidates.length) {
    // Nothing new to crawl is not a failure, and must not be charged for.
    return NextResponse.json({ scanned: 0, companies: 0, jobs: 0, charged: false });
  }

  const charge = await chargeCredits(userEmail, "job_area_scan");
  if (!charge.ok) {
    return NextResponse.json({ error: "insufficient_credits", credits: charge.credits }, { status: 402 });
  }

  let companiesRegistered = 0;
  let jobsFound = 0;

  for (const c of candidates) {
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
    scanned: candidates.length,
    companies: companiesRegistered,
    jobs: jobsFound,
    charged: true,
  });
}
