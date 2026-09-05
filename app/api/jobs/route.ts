import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { computeMatch } from "@/lib/jobs/match";
import { isProfileComplete } from "@/lib/jobs/application-form";
import type { Seniority, WorkMode } from "@/lib/jobs/normalize";

/** Same reasoning as the leads route: a viewport shows a few dozen pins, not five hundred. */
const DEFAULT_LIMIT = 120;
const MAX_LIMIT = 500;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userEmail = session.user.email;

  const params = req.nextUrl.searchParams;
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(params.get("limit")) || DEFAULT_LIMIT));
  const family = params.get("family");
  const workMode = params.get("work_mode");
  const goldenOnly = params.get("golden") === "true";
  const minRank = params.get("min_seniority_rank");

  const nums = ["sw_lat", "sw_lng", "ne_lat", "ne_lng"].map((k) => {
    const raw = params.get(k);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  });
  const bounded = nums.every((n) => n !== null);
  const [swLat, swLng, neLat, neLng] = nums as [number, number, number, number];
  const centerLat = bounded ? (swLat + neLat) / 2 : null;
  const centerLng = bounded ? (swLng + neLng) / 2 : null;

  const [profile] = await sql`SELECT * FROM applicant_profiles WHERE user_email = ${userEmail}`;
  const profileComplete = isProfileComplete(profile ?? null);

  const rows = await sql`
    SELECT j.id, j.title, j.apply_url, j.location, j.description,
           j.job_family, j.seniority, j.seniority_rank, j.work_mode, j.employment_type,
           j.min_experience_years, j.max_experience_years,
           j.ctc_min_inr, j.ctc_max_inr, j.ctc_source, j.ctc_confidence,
           j.posted_at, j.first_seen_at,
           c.id AS company_id, c.company_name, c.domain, c.favicon_url, c.careers_url,
           c.lat, c.lng, c.golden_tier, c.extraction_method,
           a.status AS application_status
      FROM job_listings j
      JOIN job_companies c ON c.id = j.company_id
      LEFT JOIN job_applications a ON a.job_id = j.id AND a.user_email = ${userEmail}
     WHERE j.is_open = true
       ${
         bounded
           ? sql`AND c.lat BETWEEN ${Math.min(swLat, neLat)} AND ${Math.max(swLat, neLat)}
                 AND c.lng BETWEEN ${Math.min(swLng, neLng)} AND ${Math.max(swLng, neLng)}`
           : sql``
       }
       ${family ? sql`AND j.job_family = ${family}` : sql``}
       ${workMode ? sql`AND j.work_mode = ${workMode}` : sql``}
       ${goldenOnly ? sql`AND c.golden_tier IS NOT NULL` : sql``}
       ${minRank ? sql`AND j.seniority_rank >= ${Number(minRank)}` : sql``}
     -- Distance-from-viewport-centre first, for the same reason the leads route orders this way:
     -- a recency sort lets a dense area's nearest roles fall off the end of the LIMIT and makes
     -- pins churn on every pan. Golden companies break ties so a marquee employer on screen is
     -- never the one cut.
     ORDER BY ${
       bounded
         ? sql`((c.lat - ${centerLat}) ^ 2 + (c.lng - ${centerLng}) ^ 2) ASC,
               (c.golden_tier IS NOT NULL) DESC`
         : sql`(c.golden_tier IS NOT NULL) DESC, j.first_seen_at DESC`
     }
     LIMIT ${limit}
  `;

  const jobs = rows.map((r) => {
    // The opportunity score is locked, not merely hidden: with no profile there is nothing to
    // score against, so the client is sent null rather than a number it is expected to blur.
    const match = profileComplete
      ? computeMatch({
          job: {
            jobFamily: r.job_family,
            seniority: r.seniority as Seniority | null,
            workMode: r.work_mode as WorkMode | null,
            minExperienceYears: r.min_experience_years === null ? null : Number(r.min_experience_years),
            maxExperienceYears: r.max_experience_years === null ? null : Number(r.max_experience_years),
            ctcMinInr: r.ctc_min_inr,
            ctcMaxInr: r.ctc_max_inr,
            location: r.location,
          },
          profile: {
            jobFamily: profile.job_family,
            seniority: profile.seniority as Seniority | null,
            preferredWorkMode: profile.preferred_work_mode,
            totalExperienceYears:
              profile.total_experience_years === null ? null : Number(profile.total_experience_years),
            expectedCtcInr: profile.expected_ctc_inr,
            city: profile.city,
          },
        })
      : null;

    return {
      id: r.id,
      title: r.title,
      applyUrl: r.apply_url,
      location: r.location,
      description: r.description,
      jobFamily: r.job_family,
      seniority: r.seniority,
      seniorityRank: r.seniority_rank,
      workMode: r.work_mode,
      employmentType: r.employment_type,
      minExperienceYears: r.min_experience_years === null ? null : Number(r.min_experience_years),
      maxExperienceYears: r.max_experience_years === null ? null : Number(r.max_experience_years),
      ctcMinInr: r.ctc_min_inr,
      ctcMaxInr: r.ctc_max_inr,
      ctcSource: r.ctc_source,
      postedAt: r.posted_at,
      company: {
        id: r.company_id,
        name: r.company_name ?? r.domain,
        domain: r.domain,
        faviconUrl: r.favicon_url,
        careersUrl: r.careers_url,
        lat: r.lat,
        lng: r.lng,
        goldenTier: r.golden_tier,
      },
      // Surfaced so the card can grade its own trustworthiness — a heuristic-scraped title is a
      // weaker claim than one that came from the employer's own structured data.
      confidence: r.extraction_method === "heuristic_html" ? "low" : "high",
      applicationStatus: r.application_status ?? null,
      matchScore: match?.score ?? null,
      matchReasons: match?.reasons ?? null,
    };
  });

  return NextResponse.json({ jobs, profileComplete });
}
