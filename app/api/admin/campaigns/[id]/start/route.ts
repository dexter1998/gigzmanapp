import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";

/**
 * The one mutation that starts a campaign batch. Every subsequent step for this batch fires
 * automatically off the cron in app/api/cron/campaign-email once its send_offset_minutes arrives
 * — this is deliberately the only manual click in the whole sequence, guarded by a typed
 * confirmation so a leaked/CSRF'd admin session can't trigger it with a bare request: a scripted
 * request still has to carry the campaign id as text, which a session cookie alone doesn't give
 * an attacker.
 *
 * Scheduling is `startAt` in the future rather than a separate concept: getDueCampaignSends()
 * only ever picks up a step once `started_at + offset <= now()`, so a future started_at just
 * means every step waits, for free — no separate "scheduled" status or extra cron logic needed.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { batch, confirmText, startAt } = body as { batch?: string; confirmText?: string; startAt?: string };

  if (confirmText !== id) {
    return NextResponse.json({ error: "confirmation text does not match the campaign id" }, { status: 400 });
  }
  if (!batch) return NextResponse.json({ error: "batch required" }, { status: 400 });

  let startedAt = new Date();
  if (startAt) {
    const parsed = new Date(startAt);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "startAt is not a valid date" }, { status: 400 });
    }
    startedAt = parsed;
  }

  const [campaign] = await sql`SELECT id, status FROM campaigns WHERE id = ${id}`;
  if (!campaign) return NextResponse.json({ error: "campaign not found" }, { status: 404 });
  if (campaign.status !== "active") {
    return NextResponse.json(
      { error: `campaign status is '${campaign.status}' — set it to 'active' before starting a batch` },
      { status: 400 }
    );
  }

  const [existing] = await sql`SELECT id FROM campaign_batch_runs WHERE campaign_id = ${id} AND batch = ${batch}`;
  if (existing) return NextResponse.json({ error: "this batch has already been started" }, { status: 400 });

  const [recipientCheck] = await sql`
    SELECT count(*)::int AS n FROM campaign_recipients WHERE campaign_id = ${id} AND batch = ${batch}
  `;
  if (recipientCheck.n === 0) {
    return NextResponse.json({ error: "no recipients imported for this batch" }, { status: 400 });
  }

  await sql`
    INSERT INTO campaign_batch_runs (campaign_id, batch, started_at, started_by)
    VALUES (${id}, ${batch}, ${startedAt}, ${admin})
  `;
  return NextResponse.json({ started: true, batch, startedAt: startedAt.toISOString() });
}
