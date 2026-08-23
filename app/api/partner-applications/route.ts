import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

type PartnerApplicationBody = {
  fullName: string;
  email: string;
  phone?: string;
  agencyName?: string;
  website?: string;
  linkedin?: string;
  country?: string;
  city?: string;
  services: string[];
  otherService?: string;
  yearEstablished?: string;
  teamSize?: string;
  projectsClosedPerMonth?: string;
  monthlyRevenueRange?: string;
  activeClients?: string;
  partnershipReason?: string;
  partnershipApproach: string[];
  estimatedClientIntroductions?: string;
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const b = (await req.json()) as PartnerApplicationBody;
  if (!b.fullName || !b.email) {
    return NextResponse.json({ error: "fullName and email are required" }, { status: 400 });
  }

  const [row] = await sql`
    INSERT INTO partner_applications (
      user_email, full_name, email, phone, agency_name, website, linkedin, country, city,
      services, other_service, year_established, team_size, projects_closed_per_month,
      monthly_revenue_range, active_clients, partnership_reason, partnership_approach,
      estimated_client_introductions, status
    ) VALUES (
      ${session.user.email}, ${b.fullName}, ${b.email}, ${b.phone ?? null}, ${b.agencyName ?? null},
      ${b.website ?? null}, ${b.linkedin ?? null}, ${b.country ?? null}, ${b.city ?? null},
      ${JSON.stringify(b.services ?? [])}, ${b.otherService ?? null}, ${b.yearEstablished ?? null},
      ${b.teamSize ?? null}, ${b.projectsClosedPerMonth ?? null}, ${b.monthlyRevenueRange ?? null},
      ${b.activeClients ?? null}, ${b.partnershipReason ?? null}, ${JSON.stringify(b.partnershipApproach ?? [])},
      ${b.estimatedClientIntroductions ?? null}, 'submitted'
    )
    RETURNING id, status
  `;

  return NextResponse.json({ ok: true, id: row.id, status: row.status });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await sql`
    SELECT id, status, submitted_at FROM partner_applications
    WHERE user_email = ${session.user.email}
    ORDER BY submitted_at DESC
  `;
  return NextResponse.json({ applications: rows });
}
