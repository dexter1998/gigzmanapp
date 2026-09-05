import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import {
  ALL_APPLICATION_FIELDS,
  isProfileComplete,
  profileCompletion,
} from "@/lib/jobs/application-form";

/**
 * The applicant profile — the standardized application form, stored once and replayed into every
 * application. Its completeness is what unlocks the opportunity score on job cards.
 */

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [profile] = await sql`SELECT * FROM applicant_profiles WHERE user_email = ${session.user.email}`;
  return NextResponse.json({
    profile: profile ?? null,
    complete: isProfileComplete(profile ?? null),
    completion: profileCompletion(profile ?? null),
  });
}

/** Columns a client is allowed to write, derived from the form definition so the two cannot drift. */
const WRITABLE = new Set([
  ...ALL_APPLICATION_FIELDS.map((f) => f.key),
  "resume_filename",
  "resume_text",
  "country_code",
]);

const NUMERIC = new Set([
  "total_experience_years",
  "current_ctc_inr",
  "expected_ctc_inr",
  "notice_period_days",
]);

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userEmail = session.user.email;

  const body = await req.json().catch(() => ({}));
  if (!body || typeof body !== "object") return NextResponse.json({ error: "bad request" }, { status: 400 });

  const updates: Record<string, string | number | null> = {};
  for (const [key, raw] of Object.entries(body as Record<string, unknown>)) {
    if (!WRITABLE.has(key)) continue;
    if (raw === null || raw === "") {
      updates[key] = null;
      continue;
    }
    if (NUMERIC.has(key)) {
      const n = Number(raw);
      // A non-numeric value in a numeric field is dropped rather than coerced: NaN would be
      // written as null and silently erase whatever the user had there before.
      if (!Number.isFinite(n) || n < 0) continue;
      updates[key] = n;
      continue;
    }
    const field = ALL_APPLICATION_FIELDS.find((f) => f.key === key);
    updates[key] = String(raw).trim().slice(0, field?.maxLength ?? 500);
  }

  if (!Object.keys(updates).length) return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  // Row is created on first save rather than at signup — most accounts are leads-mode and will
  // never have one.
  await sql`
    INSERT INTO applicant_profiles ${sql({ user_email: userEmail, ...updates })}
    ON CONFLICT (user_email) DO UPDATE SET ${sql(updates)}, updated_at = now()
  `;

  const [profile] = await sql`SELECT * FROM applicant_profiles WHERE user_email = ${userEmail}`;
  const complete = isProfileComplete(profile ?? null);

  // is_complete is derived server-side and stored so other queries can filter on it without
  // re-running the rubric per row.
  await sql`UPDATE applicant_profiles SET is_complete = ${complete} WHERE user_email = ${userEmail}`;

  return NextResponse.json({
    profile: { ...profile, is_complete: complete },
    complete,
    completion: profileCompletion(profile ?? null),
  });
}
