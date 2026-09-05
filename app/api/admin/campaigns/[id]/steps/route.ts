import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";

const STEP_TYPES = ["single_lead", "multi_lead"];

/** Creates one campaign step (a touch). step_order is assigned as "next after the highest
 * existing" rather than admin-supplied, so two authors can't collide on the same order and the
 * flow diagram / send sequence always matches creation order unless explicitly reordered later. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { stepKey, stepType, sendOffsetMinutes, subject, html, text } = body as {
    stepKey?: string; stepType?: string; sendOffsetMinutes?: number; subject?: string; html?: string; text?: string;
  };

  if (!stepKey || !/^[a-z0-9_]+$/.test(stepKey)) {
    return NextResponse.json({ error: "stepKey required, lowercase letters/digits/underscore only" }, { status: 400 });
  }
  if (!STEP_TYPES.includes(stepType ?? "")) {
    return NextResponse.json({ error: `stepType must be one of: ${STEP_TYPES.join(", ")}` }, { status: 400 });
  }
  if (!Number.isInteger(sendOffsetMinutes) || (sendOffsetMinutes as number) < 0) {
    return NextResponse.json({ error: "sendOffsetMinutes must be a non-negative integer" }, { status: 400 });
  }
  if (!subject || !html || !text) {
    return NextResponse.json({ error: "subject, html and text are required" }, { status: 400 });
  }

  const [campaign] = await sql`SELECT id FROM campaigns WHERE id = ${id}`;
  if (!campaign) return NextResponse.json({ error: "campaign not found" }, { status: 404 });

  const [existing] = await sql`SELECT id FROM campaign_steps WHERE campaign_id = ${id} AND step_key = ${stepKey}`;
  if (existing) return NextResponse.json({ error: "a step with this key already exists" }, { status: 400 });

  const [{ next_order }] = await sql`
    SELECT COALESCE(max(step_order), 0) + 1 AS next_order FROM campaign_steps WHERE campaign_id = ${id}
  `;

  await sql`
    INSERT INTO campaign_steps (campaign_id, step_key, step_order, send_offset_minutes, step_type, subject, html, text)
    VALUES (${id}, ${stepKey}, ${next_order}, ${sendOffsetMinutes as number}, ${stepType as string}, ${subject}, ${html}, ${text})
  `;
  return NextResponse.json({ stepKey, stepOrder: next_order });
}
