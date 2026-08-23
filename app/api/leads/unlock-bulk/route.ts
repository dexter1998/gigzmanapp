import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { ids } = (await req.json()) as { ids?: string[] };
  if (!ids?.length) return NextResponse.json({ error: "ids required" }, { status: 400 });

  for (const id of ids) {
    await sql`
      INSERT INTO unlocks (lead_id, unlocked_by)
      VALUES (${id}, ${session.user.email})
      ON CONFLICT (lead_id, unlocked_by) DO NOTHING
    `;
  }

  return NextResponse.json({ unlocked: ids.length });
}
