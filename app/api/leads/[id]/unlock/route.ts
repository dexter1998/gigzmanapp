import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

// Manual unlock: one lead id in the URL. Bulk unlock: POST { ids: string[] } to this same
// lead's route is awkward for bulk, so bulk uses /api/leads/unlock-bulk instead — kept this one
// simple for the single-lead case (matches the plan: same unlock action, different selection count).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  await sql`
    INSERT INTO unlocks (lead_id, unlocked_by)
    VALUES (${id}, ${session.user.email})
    ON CONFLICT (lead_id, unlocked_by) DO NOTHING
  `;

  // UI-only premium flag for now (plan-confirmed, no real payment gateway yet) — real enrichment
  // data source is still an open item, not wired here.
  return NextResponse.json({ unlocked: true });
}
