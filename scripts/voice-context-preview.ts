/**
 * Prints what the AI caller would be told for one real local campaign + lead, and checks the
 * hosted-call request building, retry rules and result mapping with a mocked fetch. Places no
 * call and makes no network request.
 *
 *   npx tsx --env-file=.env.local scripts/voice-context-preview.ts [campaignId] [resultId]
 */
import { sql } from "../lib/db";
import { touchesOf, fill, type Graph } from "../lib/v2/outreach/graph";
import { callerVariables, testVariables } from "../lib/v2/outreach/voice-context";
import { outboundBody, placeHostedCall, interactionToResult } from "../lib/v2/outreach/hosted-voice";

let pass = 0;
const fails: string[] = [];
const check = (name: string, cond: boolean) => (cond ? pass++ : fails.push(name));

async function main() {
  const [c] = process.argv[2]
    ? await sql`SELECT id, user_email, graph, list_chat_id FROM v2_campaigns WHERE id = ${process.argv[2]}`
    : await sql`SELECT id, user_email, graph, list_chat_id FROM v2_campaigns WHERE sender_profile IS NOT NULL AND list_chat_id IS NOT NULL ORDER BY updated_at DESC LIMIT 1`;
  if (!c) throw new Error("no campaign with a confirmed sender profile locally");
  const [lead] = process.argv[3]
    ? await sql`SELECT id FROM v2_results WHERE id = ${Number(process.argv[3])}`
    : await sql`SELECT r.id FROM v2_results r JOIN v2_runs u ON u.id = r.run_id WHERE u.chat_id = ${c.list_chat_id} AND r.phone IS NOT NULL AND r.rank IS NOT NULL ORDER BY r.rank LIMIT 1`;
  const graph = c.graph as Graph;
  const touch = touchesOf(graph).find((t) => t.channel === "call") ?? touchesOf(graph)[0];
  const skill = graph.nodes.find((n) => n.id === touch?.nodeId)?.data.voice?.skill ?? "pitch";
  const brief = fill(touch?.body ?? "", { business_name: "the business", first_name: "there" });

  const vars = await callerVariables(c.user_email, { campaignId: c.id, resultId: Number(lead?.id ?? 0), skill, brief });
  console.log(`campaign ${c.id} · lead ${lead?.id} · skill ${skill}\n`, vars);
  const test = await testVariables(c.user_email, { name: "Tarun", campaignId: c.id, brief });
  console.log("\ntest agent:", test);

  const names = ["agent_name", "caller_company", "followup_with", "offer_name", "offer_summary", "call_goal", "call_playbook", "lead_name", "business_name", "business_area", "business_category", "why_calling", "number_source", "lead_brief"];
  check("caller has every contract variable", names.every((k) => k in vars));
  check("every caller value under 300 chars", Object.values(vars).every((v) => typeof v === "string" && v.length <= 300));
  check("playbook names no variable", !/followup_with|caller_company/.test(vars.call_playbook));
  check("test agent variables", ["user_name", "user_company", "campaign_context"].every((k) => k in test));

  const body = outboundBody({ app: { id: "app", version: "1" }, from: "+911", connection: "conn", phone: "+919000000001", vars, webhookUrl: "https://x/cb", sendRef: "42" });
  check("body shape", body.app_config.app_type === "agent" && body.user_config.user_phone_number === "+919000000001" && body.webhook_config?.metadata.send_id === "42");

  // Mocked fetch: 503 twice then 200 → retried; 422 → never retried. Env stubs so it's "configured".
  Object.assign(process.env, { SARVAM_API_KEY: "k", SARVAM_ORG_ID: "o", SARVAM_WORKSPACE_ID: "w", SARVAM_CONNECTION_ID: "c", SARVAM_FROM_NUMBER: "+911", VOICE_CALLER_APP_ID: "a" });
  let n = 0;
  const seq = (codes: number[]) => { n = 0; globalThis.fetch = (async () => { const code = codes[Math.min(n++, codes.length - 1)]; return new Response(JSON.stringify(code === 200 ? { attempt_id: "att-1" } : { detail: "x" }), { status: code }); }) as typeof fetch; };
  const err = console.error; console.error = () => {};
  seq([503, 503, 200]);
  const a = await placeHostedCall({ agent: "caller", phone: "+919000000001", vars, webhookUrl: null, sendRef: "1" });
  check("5xx retried then ok", a.ok && a.attemptId === "att-1" && n === 3);
  seq([422]);
  const b = await placeHostedCall({ agent: "caller", phone: "+919000000001", vars, webhookUrl: null, sendRef: "1" });
  check("422 not retried", !b.ok && n === 1 && !/sarvam/i.test(b.ok ? "" : b.message));
  console.error = err;

  const booked = interactionToResult({ job_id: "att-1", duration_in_seconds: 95, num_messages: 14, agent_variables: { outcome: "booked", meeting_day: "Tuesday", meeting_time: "4 pm", meeting_person: "Dr. Mehta", call_summary: "Agreed to a call." } }, "1");
  check("booked call maps", booked.connectedSeconds === 95 && booked.booking?.day === "Tuesday" && booked.summary === "Agreed to a call.");
  const greet = interactionToResult({ job_id: "att-2", duration_in_seconds: 20, num_messages: 1, agent_variables: {} }, "2");
  check("greeting only is not connected", greet.connectedSeconds === 0 && !greet.booking);

  console.log(`\n${pass} passed${fails.length ? `, FAILED: ${fails.join("; ")}` : ""}`);
  await sql.end();
  process.exit(fails.length ? 1 : 0);
}
main().catch(async (e) => { console.error(e); await sql.end(); process.exit(1); });
