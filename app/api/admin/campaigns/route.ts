import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";

/** Creates a campaign shell (name/sender/stream/variables) with no steps and no recipients yet —
 * those get added separately (steps via the template editor, recipients via CSV import). Starts
 * 'draft' always; flipping to 'active' is a separate, explicit action on the detail page. */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const { id, name, sender, stream, variables } = body as {
    id?: string; name?: string; sender?: string; stream?: string; variables?: string[];
  };

  if (!id || !/^[a-z0-9_]+$/.test(id)) {
    return NextResponse.json({ error: "id required, lowercase letters/digits/underscore only" }, { status: 400 });
  }
  if (!name || !sender || !stream) {
    return NextResponse.json({ error: "name, sender and stream are required" }, { status: 400 });
  }

  const [existing] = await sql`SELECT id FROM campaigns WHERE id = ${id}`;
  if (existing) return NextResponse.json({ error: "a campaign with this id already exists" }, { status: 400 });

  const cleanVars = Array.isArray(variables) ? variables.map((v) => v.trim()).filter(Boolean) : [];

  await sql`
    INSERT INTO campaigns (id, name, sender, stream, status, created_by, variables)
    VALUES (${id}, ${name}, ${sender}, ${stream}, 'draft', ${admin}, ${cleanVars})
  `;
  return NextResponse.json({ id });
}
