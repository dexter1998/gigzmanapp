import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";

const VALID = ["draft", "active", "paused", "done"];

/**
 * Flips a campaign's status. Sends nothing by itself — 'active' only makes a campaign eligible
 * for a batch to be started (see [id]/start), and flipping a live campaign to 'paused' is what
 * stops the cron from picking up any more of its due sends on the very next tick.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = (body as { status?: string }).status;

  if (!status || !VALID.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${VALID.join(", ")}` }, { status: 400 });
  }

  const [campaign] = await sql`SELECT id FROM campaigns WHERE id = ${id}`;
  if (!campaign) return NextResponse.json({ error: "campaign not found" }, { status: 404 });

  await sql`UPDATE campaigns SET status = ${status} WHERE id = ${id}`;
  return NextResponse.json({ status });
}
