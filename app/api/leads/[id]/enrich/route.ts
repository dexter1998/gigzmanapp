import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { advance, assertUnlocked } from "@/lib/enrichment";

// The per-lead view of the enrichment queue. The engine itself lives in lib/enrichment.ts because
// the cron tick drives the same jobs when nobody has a page open — this route is just the
// authenticated, single-lead entry point into it.
//
// POST queues the lead (and advances it a step). GET reports where the job is, advancing it too,
// so a client polling for status doubles as a driver while it happens to be watching.

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const lead = await assertUnlocked(id, session.user.email);
  if (!lead) return NextResponse.json({ error: "lead not unlocked" }, { status: 403 });

  // POST is also "try this again". advance() treats a failed job as final, so a retry has to clear
  // the failure first, otherwise the button in the table would look like it did nothing.
  await sql`
    UPDATE lead_enrichment
    SET status = 'pending', error = NULL, ssm_command_id = NULL, requested_at = now()
    WHERE lead_id = ${id} AND status = 'failed'
  `;

  return NextResponse.json(await advance(id, lead));
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const lead = await assertUnlocked(id, session.user.email);
  if (!lead) return NextResponse.json({ error: "lead not unlocked" }, { status: 403 });

  const [existing] = await sql`SELECT * FROM lead_enrichment WHERE lead_id = ${id}`;
  if (!existing) return NextResponse.json({ status: "not_started" });

  return NextResponse.json(await advance(id, lead));
}
