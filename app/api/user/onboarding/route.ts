import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

type OnboardingBody = {
  role: string;
  customRole?: string;
  businessType: "agency" | "freelancer";
  agency?: {
    agencyName: string;
    workEmail: string;
    website?: string;
    designation: string;
    teamSize?: string;
  };
  freelancer?: {
    businessName: string;
    workEmail: string;
    website?: string;
    primaryService: string;
    customService?: string;
    activeClients?: string;
  };
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const email = session.user.email;

  const body = (await req.json()) as OnboardingBody;
  if (!body.role || !body.businessType) {
    return NextResponse.json({ error: "role and businessType are required" }, { status: 400 });
  }

  await sql`
    INSERT INTO user_profiles (email, onboarding_completed, role, custom_role, business_type, updated_at)
    VALUES (${email}, true, ${body.role}, ${body.customRole ?? null}, ${body.businessType}, now())
    ON CONFLICT (email) DO UPDATE SET
      onboarding_completed = true,
      role = ${body.role},
      custom_role = ${body.customRole ?? null},
      business_type = ${body.businessType},
      updated_at = now()
  `;

  if (body.businessType === "agency" && body.agency) {
    const a = body.agency;
    await sql`
      INSERT INTO agency_profiles (email, agency_name, work_email, website, designation, team_size)
      VALUES (${email}, ${a.agencyName}, ${a.workEmail}, ${a.website ?? null}, ${a.designation}, ${a.teamSize ?? null})
      ON CONFLICT (email) DO UPDATE SET
        agency_name = ${a.agencyName}, work_email = ${a.workEmail}, website = ${a.website ?? null},
        designation = ${a.designation}, team_size = ${a.teamSize ?? null}
    `;
  }

  if (body.businessType === "freelancer" && body.freelancer) {
    const f = body.freelancer;
    await sql`
      INSERT INTO freelancer_profiles (email, business_name, work_email, website, primary_service, custom_service, active_clients)
      VALUES (${email}, ${f.businessName}, ${f.workEmail}, ${f.website ?? null}, ${f.primaryService}, ${f.customService ?? null}, ${f.activeClients ?? null})
      ON CONFLICT (email) DO UPDATE SET
        business_name = ${f.businessName}, work_email = ${f.workEmail}, website = ${f.website ?? null},
        primary_service = ${f.primaryService}, custom_service = ${f.customService ?? null}, active_clients = ${f.activeClients ?? null}
    `;
  }

  return NextResponse.json({ ok: true });
}
