import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

type PartnerApplicationBody = {
  agencyType?: string;
  fullName: string;
  designation?: string;
  email: string;
  phone?: string;
  agencyName?: string;
  website?: string;
  city?: string;
  country?: string;
  yearEstablished?: string;
  teamSize?: string;
  services?: string[];
  otherService?: string;
  projectsClosedPerMonth?: string;
  avgTicketSize?: string;
  activeClients?: string;
  partnershipApproach?: string[];
  estimatedClientIntroductions?: string;
  partnershipReason?: string;
  source?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Anonymous submissions are allowed on purpose — this same endpoint backs the public /partner
// page, where the whole point is that an agency can apply before it has a Mantis account. A
// session, when there is one, is still recorded so a dashboard application stays attributable.
export async function POST(req: NextRequest) {
  const session = await auth();

  const b = (await req.json()) as PartnerApplicationBody;
  if (!b.fullName?.trim() || !b.email?.trim() || !EMAIL_RE.test(b.email)) {
    return NextResponse.json({ error: "A name and a valid email are required" }, { status: 400 });
  }

  // Deduped by email rather than by IP: an agency legitimately shares one office IP, while the
  // case actually worth stopping here — a double-submit or someone hammering the public form —
  // reuses the same address every time.
  const [recent] = await sql`
    SELECT id FROM partner_applications
    WHERE email = ${b.email} AND submitted_at > now() - interval '2 minutes'
    LIMIT 1
  `;
  if (recent) {
    return NextResponse.json({ ok: true, id: recent.id, duplicate: true });
  }

  const source = b.source === "partner_page" ? "partner_page" : "dashboard";

  const [row] = await sql`
    INSERT INTO partner_applications (
      user_email, agency_type, full_name, designation, email, phone, agency_name, website,
      country, city, services, other_service, year_established, team_size,
      projects_closed_per_month, avg_ticket_size, active_clients, partnership_reason,
      partnership_approach, estimated_client_introductions, source, status
    ) VALUES (
      ${session?.user?.email ?? null}, ${b.agencyType ?? null}, ${b.fullName}, ${b.designation ?? null},
      ${b.email}, ${b.phone ?? null}, ${b.agencyName ?? null}, ${b.website ?? null},
      ${b.country ?? null}, ${b.city ?? null}, ${JSON.stringify(b.services ?? [])},
      ${b.otherService ?? null}, ${b.yearEstablished ?? null}, ${b.teamSize ?? null},
      ${b.projectsClosedPerMonth ?? null}, ${b.avgTicketSize ?? null}, ${b.activeClients ?? null},
      ${b.partnershipReason ?? null}, ${JSON.stringify(b.partnershipApproach ?? [])},
      ${b.estimatedClientIntroductions ?? null}, ${source}, 'submitted'
    )
    RETURNING id, status
  `;

  return NextResponse.json({ ok: true, id: row.id, status: row.status });
}

// Still session-gated: reading a user's own applications back into the dashboard is a different
// job from accepting one, and only the read needs to know who is asking.
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await sql`
    SELECT id, status, agency_type, submitted_at FROM partner_applications
    WHERE user_email = ${session.user.email}
    ORDER BY submitted_at DESC
  `;
  return NextResponse.json({ applications: rows });
}
