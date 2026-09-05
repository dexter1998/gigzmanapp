import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";

const STEP_TYPES = ["single_lead", "multi_lead"];

/** Edits an existing step's content/offset/type. step_key and step_order are immutable here —
 * step_key is the identity email_sends idempotency keys off, and reordering is a separate concern
 * this route doesn't touch. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; stepKey: string }> }) {
  await requireAdmin();
  const { id, stepKey } = await params;
  const body = await req.json().catch(() => ({}));
  const { stepType, sendOffsetMinutes, subject, html, text } = body as {
    stepType?: string; sendOffsetMinutes?: number; subject?: string; html?: string; text?: string;
  };

  if (!STEP_TYPES.includes(stepType ?? "")) {
    return NextResponse.json({ error: `stepType must be one of: ${STEP_TYPES.join(", ")}` }, { status: 400 });
  }
  if (!Number.isInteger(sendOffsetMinutes) || (sendOffsetMinutes as number) < 0) {
    return NextResponse.json({ error: "sendOffsetMinutes must be a non-negative integer" }, { status: 400 });
  }
  if (!subject || !html || !text) {
    return NextResponse.json({ error: "subject, html and text are required" }, { status: 400 });
  }

  const [step] = await sql`SELECT id FROM campaign_steps WHERE campaign_id = ${id} AND step_key = ${stepKey}`;
  if (!step) return NextResponse.json({ error: "step not found" }, { status: 404 });

  await sql`
    UPDATE campaign_steps
    SET step_type = ${stepType as string}, send_offset_minutes = ${sendOffsetMinutes as number},
        subject = ${subject}, html = ${html}, text = ${text}
    WHERE campaign_id = ${id} AND step_key = ${stepKey}
  `;
  return NextResponse.json({ stepKey });
}
