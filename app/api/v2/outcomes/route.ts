import { NextRequest, NextResponse } from "next/server";
import { trackEvent } from "@/lib/events";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { isV2Email } from "@/lib/v2";
import { logOutcome, type OutcomeEvent } from "@/lib/v2/learning";

const EVENTS = new Set(["unlock", "add_to_leads", "open_site", "open_linkedin", "contact_email", "contact_call", "contact_whatsapp"]);
const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Outcome learning (docs/v2-agents.md): what the user did with a result. An unlock also counts
 * against the pipeline that produced the row, so pipelines are ranked by what people paid for,
 * not only by how many rows came back.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isV2Email(email)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { event?: string; runId?: string; resultId?: string; leadIds?: string[] };
  if (!b.event || !EVENTS.has(b.event)) return NextResponse.json({ error: "bad_event" }, { status: 400 });
  const runId = b.runId && UUID.test(b.runId) ? b.runId : null;
  const leadIds = (b.leadIds ?? []).filter((x) => UUID.test(x)).slice(0, 200);
  const resultId = b.resultId && /^\d+$/.test(b.resultId) ? b.resultId : null;
  if (runId) {
    const [own] = await sql`SELECT pipeline_id FROM v2_runs WHERE id = ${runId} AND user_email = ${email}`;
    if (!own) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if ((b.event === "unlock" || b.event === "add_to_leads") && own.pipeline_id) {
      await sql`UPDATE v2_pipelines SET unlock_sum = unlock_sum + ${Math.max(1, leadIds.length)} WHERE id = ${own.pipeline_id}`;
    }
  }
  if (resultId) {
    // A single lead: resolved to its run, pipeline and strategy (lib/v2/learning.ts) — after an
    // ownership check, since the id comes from the browser.
    const [own] = await sql`SELECT 1 FROM v2_results r JOIN v2_runs u ON u.id = r.run_id WHERE r.id = ${resultId} AND u.user_email = ${email}`;
    if (!own) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await logOutcome({ userEmail: email, event: b.event as OutcomeEvent, resultId });
    return NextResponse.json({ ok: true });
  }
  trackEvent(email, `leads.lead.${b.event}`, { run_id: runId, n: Math.max(1, leadIds.length) });
  const rows = leadIds.length ? leadIds : [null];
  for (const leadId of rows) {
    await sql`INSERT INTO v2_outcomes (user_email, run_id, result_id, lead_id, event) VALUES (${email}, ${runId}, ${resultId}, ${leadId}, ${b.event})`;
  }
  return NextResponse.json({ ok: true });
}
