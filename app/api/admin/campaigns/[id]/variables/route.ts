import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";

/** Replaces a campaign's variable registry wholesale — the template editor's insert-palette reads
 * this list. Independent of any CSV already imported; a variable with no matching CSV column just
 * leaves an unfilled {{tag}} visible in preview (fillTemplate never blanks unknown tags). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const variables = (body as { variables?: string[] }).variables;

  if (!Array.isArray(variables)) {
    return NextResponse.json({ error: "variables must be an array of strings" }, { status: 400 });
  }
  const clean = [...new Set(variables.map((v) => v.trim()).filter(Boolean))];

  const [campaign] = await sql`SELECT id FROM campaigns WHERE id = ${id}`;
  if (!campaign) return NextResponse.json({ error: "campaign not found" }, { status: 404 });

  await sql`UPDATE campaigns SET variables = ${clean} WHERE id = ${id}`;
  return NextResponse.json({ variables: clean });
}
