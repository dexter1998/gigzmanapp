import { NextRequest, NextResponse } from "next/server";
import { settleHostedSend } from "@/lib/v2/outreach/voiceCalls";
import { settleTestCall } from "@/lib/v2/outreach/voice-test-call";

/**
 * The hosted voice agent says a call ended. It signs nothing, so the body is only a nudge: the
 * send id from its metadata picks the row, and the result is read from the analytics API —
 * nothing here is taken from the body. A lost or forged nudge changes nothing; polling
 * (reconcileStuckCalls) settles the same calls anyway.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const meta = (body?.metadata ?? (body?.webhook_config as Record<string, unknown> | undefined)?.metadata ?? body?.webhook_metadata ?? {}) as Record<string, unknown>;
  const ref = String(meta.send_id ?? body?.send_id ?? "");
  const test = /^test-(\d+)$/.exec(ref);
  if (!test && !/^\d+$/.test(ref)) return NextResponse.json({ ok: true, note: "ignored" });
  const settle = () => (test ? settleTestCall(Number(test[1])) : settleHostedSend(Number(ref)));
  let r = await settle();
  // The nudge can beat the analytics write by a few seconds.
  if (r.note === "still running") { await new Promise((x) => setTimeout(x, 5000)); r = await settle(); }
  return NextResponse.json({ ok: true, note: r.note });
}
