import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

type OnboardingBody = {
  workMode: "company" | "independent";
  companyName?: string;
  personName?: string;
  website?: string;
};

// Reuses agency_profiles/freelancer_profiles as-is (company -> agency_profiles.agency_name,
// independent -> freelancer_profiles.business_name) rather than migrating the schema — nothing
// else in the app reads business_type/role or the now-unused designation/team_size/primary_service
// columns, so there was nothing to keep compatible with by adding new tables/columns instead.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const email = session.user.email;

  const body = (await req.json()) as OnboardingBody;
  if (!body.workMode || (body.workMode === "company" ? !body.companyName : !body.personName)) {
    return NextResponse.json({ error: "workMode and a name are required" }, { status: 400 });
  }

  const businessType = body.workMode === "company" ? "agency" : "freelancer";

  await sql`
    INSERT INTO user_profiles (email, onboarding_completed, business_type, updated_at)
    VALUES (${email}, true, ${businessType}, now())
    ON CONFLICT (email) DO UPDATE SET
      onboarding_completed = true,
      business_type = ${businessType},
      updated_at = now()
  `;

  if (body.workMode === "company") {
    const companyName = body.companyName!;
    await sql`
      INSERT INTO agency_profiles (email, agency_name, website)
      VALUES (${email}, ${companyName}, ${body.website ?? null})
      ON CONFLICT (email) DO UPDATE SET agency_name = ${companyName}, website = ${body.website ?? null}
    `;
  } else {
    const personName = body.personName!;
    await sql`
      INSERT INTO freelancer_profiles (email, business_name, website)
      VALUES (${email}, ${personName}, ${body.website ?? null})
      ON CONFLICT (email) DO UPDATE SET business_name = ${personName}, website = ${body.website ?? null}
    `;
  }

  return NextResponse.json({ ok: true });
}
