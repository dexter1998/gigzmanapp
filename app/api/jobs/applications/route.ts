import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

/**
 * Saved/applied tracking. Free by design — see the note in lib/credits/pricing.ts on why nothing
 * on the seeker side of jobs is metered.
 */

const VALID_STATUS = new Set(["saved", "applied", "interviewing", "rejected", "offer"]);

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status");

  const rows = await sql`
    SELECT a.id, a.status, a.applied_at, a.notes, a.match_score, a.created_at, a.updated_at,
           j.id AS job_id, j.title, j.apply_url, j.location, j.description,
           j.job_family, j.seniority, j.work_mode, j.employment_type,
           j.min_experience_years, j.max_experience_years,
           j.ctc_min_inr, j.ctc_max_inr, j.ctc_source, j.posted_at, j.is_open,
           c.company_name, c.domain, c.favicon_url, c.careers_url, c.golden_tier
      FROM job_applications a
      JOIN job_listings j ON j.id = a.job_id
      JOIN job_companies c ON c.id = j.company_id
     WHERE a.user_email = ${session.user.email}
       ${status && VALID_STATUS.has(status) ? sql`AND a.status = ${status}` : sql``}
     ORDER BY a.updated_at DESC
  `;

  const applications = rows.map((r) => ({
    id: r.id,
    status: r.status,
    appliedAt: r.applied_at,
    notes: r.notes,
    matchScore: r.match_score,
    updatedAt: r.updated_at,
    job: {
      id: r.job_id,
      title: r.title,
      applyUrl: r.apply_url,
      location: r.location,
      description: r.description,
      jobFamily: r.job_family,
      seniority: r.seniority,
      workMode: r.work_mode,
      employmentType: r.employment_type,
      minExperienceYears: r.min_experience_years === null ? null : Number(r.min_experience_years),
      maxExperienceYears: r.max_experience_years === null ? null : Number(r.max_experience_years),
      ctcMinInr: r.ctc_min_inr,
      ctcMaxInr: r.ctc_max_inr,
      ctcSource: r.ctc_source,
      postedAt: r.posted_at,
      // A role can close after you have applied to it. That is worth showing, not hiding.
      isOpen: r.is_open,
    },
    company: {
      name: r.company_name ?? r.domain,
      domain: r.domain,
      faviconUrl: r.favicon_url,
      careersUrl: r.careers_url,
      goldenTier: r.golden_tier,
    },
  }));

  return NextResponse.json({ applications });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const jobId = String(body?.jobId ?? "").trim();
  const status = String(body?.status ?? "saved").trim();
  const matchScore = Number.isFinite(Number(body?.matchScore)) ? Number(body.matchScore) : null;

  if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  if (!VALID_STATUS.has(status)) return NextResponse.json({ error: "invalid status" }, { status: 400 });

  const [job] = await sql`SELECT id FROM job_listings WHERE id = ${jobId}`;
  if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });

  const [row] = await sql`
    INSERT INTO job_applications (job_id, user_email, status, applied_at, match_score)
    VALUES (
      ${jobId}, ${session.user.email}, ${status},
      ${status === "applied" ? new Date() : null}, ${matchScore}
    )
    ON CONFLICT (job_id, user_email) DO UPDATE SET
      status = EXCLUDED.status,
      -- Preserved once set: the first time you applied is the fact worth keeping, and moving a
      -- row through interviewing/offer later must not rewrite that date.
      applied_at = COALESCE(job_applications.applied_at, EXCLUDED.applied_at),
      updated_at = now()
    RETURNING id, status, applied_at
  `;

  return NextResponse.json({ application: row });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });

  await sql`DELETE FROM job_applications WHERE job_id = ${jobId} AND user_email = ${session.user.email}`;
  return NextResponse.json({ ok: true });
}
