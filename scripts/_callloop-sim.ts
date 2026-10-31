/** Local simulation of the call loop — no real call is placed; finalizeVoiceCall gets made-up results. */
import { sql } from "@/lib/db";
import { finalizeVoiceCall } from "@/lib/v2/outreach/voiceCalls";
(async () => {
  const [c] = await sql`SELECT id FROM v2_campaigns WHERE user_email = 'test@mantisai.in' ORDER BY created_at DESC LIMIT 1`;
  const leads = await sql`SELECT id FROM v2_results ORDER BY id DESC LIMIT 3`;
  const show = async (id: number, label: string) => {
    const [r] = await sql`SELECT status, call_attempt, outcome, to_char(due_at AT TIME ZONE 'Asia/Kolkata','Dy DD Mon HH24:MI') due, to_char(callback_at AT TIME ZONE 'Asia/Kolkata','Dy DD Mon HH24:MI') cb, replied_at IS NOT NULL replied, status_note FROM v2_sends WHERE id = ${id}`;
    console.log(label.padEnd(34), JSON.stringify(r));
  };
  const mk = async (lead: number, node: string) => {
    await sql`DELETE FROM v2_sends WHERE campaign_id = ${c.id} AND node_id = ${node}`;
    const [s] = await sql`INSERT INTO v2_sends (campaign_id, result_id, node_id, channel, to_address, due_at, status, external_id)
      VALUES (${c.id}, ${lead}, ${node}, 'call', '+919999999999', now(), 'calling', ${node + "-1"}) RETURNING id`;
    return Number(s.id);
  };
  const dial = async (id: number, node: string, n: number) => sql`UPDATE v2_sends SET status = 'calling', external_id = ${`${node}-${n}`} WHERE id = ${id}`;
  const base = { ref: null, skill: "pitch", booking: null } as const;

  // A: not answered three times → retry, retry, then stop at the cap (3 dials).
  const a = await mk(Number(leads[0].id), "sim-a");
  for (let i = 1; i <= 3; i++) {
    const r = await finalizeVoiceCall({ ...base, sessionId: `sim-a-${i}`, state: "ended", outcome: null, endReason: "no-answer", connectedSeconds: 0 });
    await show(a, `A dial ${i} not answered → ${r.note.slice(0, 40)}`);
    if (i < 3) await dial(a, "sim-a", i + 1);
  }
  // B: answered, "call me tomorrow at 5 pm" → retry at that time.
  const b = await mk(Number(leads[1].id), "sim-b");
  await finalizeVoiceCall({ ...base, sessionId: "sim-b-1", state: "ended", outcome: "callback", endReason: "completed", connectedSeconds: 40,
    summary: "Owner was busy with customers. Asked us to call him back tomorrow at 5 pm, he wants to hear about the website.", notes: null });
  await show(b, "B answered, callback tomorrow 5pm");
  // C: answered, interested → leaves the loop, sequence stops.
  const c2 = await mk(Number(leads[2].id), "sim-c");
  await finalizeVoiceCall({ ...base, sessionId: "sim-c-1", state: "ended", outcome: "interested", endReason: "completed", connectedSeconds: 70, summary: "Interested, send details on WhatsApp.", notes: null });
  await show(c2, "C answered, interested");
  // D: not interested → stops.
  await dial(b, "sim-b", 2);
  await finalizeVoiceCall({ ...base, sessionId: "sim-b-2", state: "ended", outcome: "not_interested", endReason: "completed", connectedSeconds: 30, summary: "Not interested, already has a developer.", notes: null });
  await show(b, "B dial 2, not interested");

  // clean up the simulation rows
  await sql`DELETE FROM v2_inbox WHERE external_id LIKE 'voice:sim-%'`;
  await sql`DELETE FROM v2_sends WHERE campaign_id = ${c.id} AND node_id LIKE 'sim-%'`;
  process.exit(0);
})();
