/**
 * The standalone test call (Integrations → AI voice calls → Test call): the test agent rings the
 * user's own phone, says it is a Mantis test call, chats and asks for feedback. No calling-hours
 * limit (the user is calling themself, now); one call at a time and billed like every other call.
 * Rows live in v2_voice_tests — a self-test has no campaign, so it has no v2_sends row.
 */

import { sql } from "@/lib/db";
import { CREDIT_COST } from "@/lib/credits/pricing";
import { MIN_MINUTES_BALANCE, toE164 } from "./voice";
import { findInteraction, interactionToResult, placeHostedCall, recordingRef, testAgentConfigured } from "./hosted-voice";
import { testVariables } from "./voice-context";
import { NO_RESULT_MIN, callBody, chargeCallOnce, hasCallBalance, hostedCallbackUrl, userInCall } from "./voiceCalls";

/** The longest a self-test call may run (and be billed). */
export const TEST_CALL_MAX_SECONDS = 180;

export type TestCallView = { id: number; phone: string; status: "calling" | "done" | "failed"; note: string | null; startedAt: string };

const view = (r: Record<string, unknown>): TestCallView => ({
  id: Number(r.id), phone: r.phone as string, status: r.status as TestCallView["status"], note: (r.status_note as string) ?? null,
  startedAt: (r.created_at as Date).toISOString(),
});

export const testCallReady = () => testAgentConfigured();

export async function latestTestCall(user: string): Promise<TestCallView | null> {
  const [r] = await sql`SELECT * FROM v2_voice_tests WHERE user_email = ${user} ORDER BY created_at DESC LIMIT 1`;
  return r ? view(r) : null;
}

/** Ring the user. Errors come back as `{ ok: false, error }` with copy safe for the browser. */
export async function placeTestCall(user: string, o: { phone: string; name?: string | null; campaignContext?: string | null }): Promise<{ ok: true; call: TestCallView } | { ok: false; error: string }> {
  if (!testCallReady()) return { ok: false, error: "Test calls aren't set up on this server yet." };
  const phone = toE164(o.phone);
  if (!phone) return { ok: false, error: "Enter a valid mobile number (+91…)." };
  if (await userInCall(user)) return { ok: false, error: "Another AI call is in progress — try again when it ends." };
  if (!(await hasCallBalance(user))) return { ok: false, error: `A call needs ${MIN_MINUTES_BALANCE * CREDIT_COST.voice_minute} credits — top up first.` };
  // Kept for next time, next to the campaign test contacts.
  await sql`UPDATE user_profiles SET v2_test_contacts = coalesce(v2_test_contacts, '{}'::jsonb) || ${sql.json({ mobile: o.phone.trim(), ...(o.name?.trim() ? { name: o.name.trim() } : {}) })}
            WHERE email = ${user}`;
  const [row] = await sql`INSERT INTO v2_voice_tests (user_email, phone, name) VALUES (${user}, ${phone}, ${o.name?.trim() || null}) RETURNING *`;
  const vars = await testVariables(user, { name: o.name, brief: o.campaignContext ?? null });
  const r = await placeHostedCall({ agent: "test", phone, vars, webhookUrl: hostedCallbackUrl(), sendRef: `test-${row.id}` });
  const [done] = r.ok
    ? await sql`UPDATE v2_voice_tests SET attempt_id = ${r.attemptId}, status_note = 'Calling now' WHERE id = ${row.id} RETURNING *`
    : await sql`UPDATE v2_voice_tests SET status = 'failed', status_note = ${r.message}, finished_at = now() WHERE id = ${row.id} RETURNING *`;
  return r.ok ? { ok: true, call: view(done) } : { ok: false, error: r.message };
}

/** Read one self-test's result from analytics and settle it: charge once, Inbox row, status. */
export async function settleTestCall(id: number): Promise<{ ok: boolean; note: string }> {
  const [t] = await sql`SELECT * FROM v2_voice_tests WHERE id = ${id}`;
  if (!t || t.status !== "calling" || !t.attempt_id) return { ok: true, note: "nothing to settle" };
  const it = await findInteraction("test", t.attempt_id as string, new Date((t.created_at as Date).getTime() - 5 * 60_000));
  if (!it) {
    if ((t.created_at as Date).getTime() > Date.now() - NO_RESULT_MIN * 60_000) return { ok: true, note: "still running" };
    await sql`UPDATE v2_voice_tests SET status = 'failed', status_note = 'Not answered', finished_at = now() WHERE id = ${id} AND status = 'calling'`;
    return { ok: true, note: "not answered" };
  }
  const res = interactionToResult(it, `test-${id}`, (t.name as string) ?? null);
  const secs = res.connectedSeconds;
  const [claimed] = await sql`UPDATE v2_voice_tests SET status = ${secs > 0 ? "done" : "failed"}, connected_seconds = ${secs}, finished_at = now()
                              WHERE id = ${id} AND status = 'calling' RETURNING id`;
  if (!claimed) return { ok: true, note: "already settled" };
  // A test call is a demo, capped at TEST_CALL_MAX_SECONDS (Tarun, 2026-10-23: "test call limit kro
  // 3 minute call max only test"). The agent itself hangs up at that length (Samvaad "Max call
  // length" on the test agent); billing never goes past it either way.
  const charged = await chargeCallOnce(t.user_email as string, res.sessionId, Math.min(secs, TEST_CALL_MAX_SECONDS));
  const note = secs > 0 ? `${Math.ceil(secs / 60)} min${charged ? ` · ${charged} credits` : ""}` : `Not answered${res.endReason ? ` (${res.endReason})` : ""}`;
  await sql`UPDATE v2_voice_tests SET status_note = ${note} WHERE id = ${id}`;
  if (secs > 0) {
    await sql`
      INSERT INTO v2_inbox (user_email, campaign_id, result_id, channel, from_address, from_name, subject, body, external_id, kind, sentiment, is_test, recording)
      VALUES (${t.user_email}, NULL, NULL, 'call', ${t.phone}, 'Test call', 'AI test call summary', ${callBody(res)}, ${`voice:${res.sessionId}`}, 'reply', NULL, true, ${recordingRef("test", it)})
      ON CONFLICT (user_email, external_id) DO NOTHING`;
  }
  return { ok: true, note };
}

/** Self-tests whose webhook never came: poll analytics once they are 3+ minutes old. */
export async function reconcileTestCalls(user?: string): Promise<number> {
  if (!testCallReady()) return 0;
  const rows = await sql`SELECT id FROM v2_voice_tests WHERE status = 'calling' AND created_at < now() - interval '3 minutes'
                         ${user ? sql`AND user_email = ${user}` : sql``} ORDER BY created_at LIMIT 10`;
  let n = 0;
  for (const r of rows) { const f = await settleTestCall(Number(r.id)); if (f.note !== "still running") n++; }
  return n;
}
