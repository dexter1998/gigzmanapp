import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

const SUGGESTION_COUNT = 3;

/** A handful of example prompts for the (currently placeholder) chat box, pulled from the DB
 * rather than hardcoded so they can later be ranked by ICP (icp_category) instead of picked at
 * random once real chat/ICP routing exists. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await sql`
    SELECT prompt_text FROM chat_suggestions
    ORDER BY random()
    LIMIT ${SUGGESTION_COUNT}
  `;

  return NextResponse.json({ suggestions: rows.map((r) => r.prompt_text as string) });
}
