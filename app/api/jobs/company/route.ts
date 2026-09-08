import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

/**
 * Every open role for one company, plus the company itself.
 *
 * The map's detail panel used to read from whatever the viewport query had already loaded, which
 * meant two things went wrong: a company with no rows in that array (most pins -- they are the
 * "found, not hiring right now" ones) could not open a panel at all, and a company that did have
 * rows showed only the ones surviving the active family/work-mode filters and the list's own LIMIT,
 * never the full set the panel claims to show.
 *
 * So the panel asks for the company directly. Deliberately unfiltered: the filters exist to narrow
 * what you look for on the map, not to hide roles once you have opened a specific company.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const companyId = req.nextUrl.searchParams.get("id");
  if (!companyId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [company] = await sql`
    SELECT id, domain, company_name, favicon_url, golden_tier, careers_url,
           category, city_slug, country_code, scrape_status, scrape_error
      FROM job_companies WHERE id = ${companyId}
  `;
  if (!company) return NextResponse.json({ error: "not found" }, { status: 404 });

  const jobs = await sql`
    SELECT id, title, apply_url, location, job_family, seniority, work_mode,
           employment_type, min_experience_years, max_experience_years,
           ctc_min_inr, ctc_max_inr, posted_at, first_seen_at
      FROM job_listings
     WHERE company_id = ${companyId} AND is_open = true
     ORDER BY COALESCE(posted_at, first_seen_at) DESC
  `;

  return NextResponse.json({
    company: {
      id: company.id,
      domain: company.domain,
      name: company.company_name ?? company.domain,
      faviconUrl: company.favicon_url,
      goldenTier: company.golden_tier,
      careersUrl: company.careers_url,
      category: company.category,
      citySlug: company.city_slug,
      countryCode: company.country_code,
      scrapeStatus: company.scrape_status,
      scrapeError: company.scrape_error,
    },
    jobs: jobs.map((j) => ({
      id: j.id,
      title: j.title,
      applyUrl: j.apply_url,
      location: j.location,
      jobFamily: j.job_family,
      seniority: j.seniority,
      workMode: j.work_mode,
      employmentType: j.employment_type,
      minExperienceYears: j.min_experience_years,
      maxExperienceYears: j.max_experience_years,
      ctcMinInr: j.ctc_min_inr,
      ctcMaxInr: j.ctc_max_inr,
      postedAt: j.posted_at,
      firstSeenAt: j.first_seen_at,
    })),
  });
}
