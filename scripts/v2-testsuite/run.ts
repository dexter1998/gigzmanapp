/**
 * V2 capability test suite. Runs each case through the real chat API as the V2 test user would —
 * message → (plan → Run → ticks) — and records the three stages separately, so a discovery miss is
 * never mixed up with a website-fetch miss:
 *   A discovery   — Maps candidates, unique businesses, website URLs on file
 *   B fetch       — sites read, sites that did not load, what could be extracted
 *   C signal      — was the asked-for signal measurable at all, and how many rows had it
 *
 * usage: V2_TEST_COOKIE="next-auth...=..." npx tsx --env-file=.env.local scripts/v2-testsuite/run.ts [CASE_ID ...]
 * Writes scripts/v2-testsuite/results/<stamp>.json and .md. manual_accuracy_review is left for a human.
 */

import fs from "node:fs";
import path from "node:path";
import { sql } from "@/lib/db";
import { SIGNALS } from "@/lib/v2/playbooks";

type Case = { id: string; query: string; industry: string; offering: string; fit: "A" | "B" | "C"; validates: string; expectSignal?: string };

const BASE = process.env.V2_TEST_BASE ?? "http://localhost:3000";
const COOKIE = process.env.V2_TEST_COOKIE ?? "";
const EMAIL = process.env.V2_TEST_EMAIL ?? "test@mantisai.in";
const dir = path.dirname(new URL(import.meta.url).pathname);

async function post(p: string, body: unknown) {
  const res = await fetch(BASE + p, { method: "POST", headers: { "content-type": "application/json", cookie: COOKIE, "x-v2-saved-only": process.env.V2_TEST_PAID === "1" ? "0" : "1" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${p} → ${res.status}`);
  return res.json();
}

async function credits(): Promise<number> {
  const [r] = await sql`SELECT credits FROM user_profiles WHERE email = ${EMAIL}`;
  return Number(r?.credits ?? 0);
}

async function runCase(c: Case) {
  const t0 = Date.now();
  const before = await credits();
  const { chat } = await post("/api/chats", { firstMessage: c.query });
  const { message } = await post(`/api/chats/${chat.id}/messages`, { message: c.query });
  const intent = message.intent ?? {};
  const out: Record<string, unknown> = {
    use_case_id: c.id, query: c.query, target_industry: c.industry, offering_type: c.offering, fit: c.fit, validates: c.validates,
    turn_type: intent.turnType, mantis_reply: message.content,
  };
  const reasons: string[] = [];

  if (intent.plan) {
    const plan = intent.plan;
    out.plan = { title: plan.title, playbooks: plan.playbooks, mustHaveLabels: plan.mustHave ?? [], steps: plan.steps, assumptions: plan.assumptions, cannotDo: plan.cannotDo };
    await post(`/api/chats/${chat.id}/messages`, { message: "Run", action: { type: "run_plan", runId: plan.runId } });
    let snap;
    for (let i = 0; i < 400; i++) {
      snap = (await post(`/api/v2/runs/${plan.runId}/tick`, {})).run;
      if (snap.status !== "running") break;
      await new Promise((r) => setTimeout(r, 400));
    }
    const steps = await sql`SELECT op, raw_count, kept_count, detail FROM v2_run_steps WHERE run_id = ${plan.runId} ORDER BY seq`;
    const collect = steps.find((s) => s.op === "collect");
    const [m] = await sql`
      SELECT count(*)::int AS all_rows, count(DISTINCT lead_id)::int AS uniq,
             count(*) FILTER (WHERE website IS NOT NULL)::int AS urls,
             count(*) FILTER (WHERE website IS NULL AND signals->>'no_website' = 'false')::int AS listed_no_url,
             count(*) FILTER (WHERE signals->>'no_website' = 'true')::int AS not_listed,
             count(*) FILTER (WHERE site_checked AND coalesce((signals->>'site_down')::boolean, false) = false)::int AS fetch_ok,
             count(*) FILTER (WHERE site_checked AND (signals->>'site_down')::boolean)::int AS fetch_failed,
             count(*) FILTER (WHERE jsonb_array_length(emails) > 0)::int AS with_email,
             count(*) FILTER (WHERE socials ? 'linkedin')::int AS with_linkedin,
             count(*) FILTER (WHERE phone IS NOT NULL)::int AS with_phone,
             count(*) FILTER (WHERE contact ? 'name')::int AS with_person,
             count(*) FILTER (WHERE signals ? 'cms')::int AS with_cms,
             count(*) FILTER (WHERE rank IS NOT NULL)::int AS delivered
      FROM v2_results WHERE run_id = ${plan.runId}`;
    // The card carries labels; the run row carries the signal ids the ranking actually used.
    const [stored] = await sql`SELECT plan->'mustHave' AS must FROM v2_runs WHERE id = ${plan.runId}`;
    const must: string[] = Array.isArray(stored?.must) ? stored.must : [];
    // Attribution: for the DELIVERED rows, which component found each part. This is the answer to
    // "which scraper / API / enricher do final leads depend on".
    const prov = await sql`
      SELECT key, value, count(*)::int AS n FROM v2_results, jsonb_each_text(provenance)
      WHERE run_id = ${plan.runId} AND rank IS NOT NULL GROUP BY 1, 2 ORDER BY 1, 3 DESC`;
    const attribution: Record<string, Record<string, number>> = {};
    for (const p of prov) (attribution[p.key as string] ??= {})[p.value as string] = p.n as number;
    out.attribution = attribution;
    out.strategies_used = steps.filter((s) => s.op === "collect").map((s) => s.detail?.split(":")[0]);
    const [sig] = must.length
      ? await sql`SELECT count(*)::int AS n FROM v2_results WHERE run_id = ${plan.runId} AND rank IS NOT NULL
                  AND ${sql.unsafe(must.map((k) => `(signals->>'${k.replace(/[^a-z_]/g, "")}')::boolean`).join(" AND "))}`
      : [{ n: null }];
    Object.assign(out, {
      stage_a: { maps_candidates: collect?.raw_count ?? 0, unique_businesses: m.uniq, website_urls_found: m.urls, website_listed_no_url: m.listed_no_url, website_not_listed: m.not_listed },
      stage_b: { fetch_success: m.fetch_ok, fetch_failed: m.fetch_failed, extractable_fields: { emails: m.with_email, company_linkedin: m.with_linkedin, phones: m.with_phone, named_person: m.with_person, cms: m.with_cms } },
      stage_c: { expected_signal: c.expectSignal ?? null, signal_supported: c.expectSignal ? c.expectSignal in SIGNALS : null, required_by_planner: must, rows_with_signal: sig.n },
      delivered: `${m.delivered}/${plan.target}`, run_status: snap?.status, steps: steps.map((s) => `${s.op}: ${s.detail ?? ""}`),
    });
    if (m.listed_no_url) reasons.push(`website listed but no URL on file: ${m.listed_no_url}`);
    if (m.fetch_failed) reasons.push(`site did not load: ${m.fetch_failed}`);
    if (steps.some((s) => /refused/i.test(s.detail ?? ""))) reasons.push("Google lookup refused (local IP)");
    if (c.expectSignal && !(c.expectSignal in SIGNALS)) reasons.push(`signal not supported yet: ${c.expectSignal}`);
    if (c.expectSignal && c.expectSignal in SIGNALS && !must.includes(c.expectSignal)) reasons.push(`planner did not require ${c.expectSignal}`);
    if (!m.all_rows) reasons.push("no candidates found");
  } else if (intent.leads) {
    const leads = intent.leads as Array<{ has_website: boolean | null }>;
    Object.assign(out, {
      stage_a: { maps_candidates: leads.length, unique_businesses: leads.length, website_urls_found: null, website_not_listed: leads.filter((l) => l.has_website === false).length },
      stage_b: { fetch_success: null, note: "direct search — no website fetch on this path" },
      stage_c: { expected_signal: c.expectSignal ?? null, signal_supported: c.expectSignal ? c.expectSignal in SIGNALS : null },
      delivered: `${leads.length}`,
    });
    reasons.push("routed to direct search (no website fetch)");
    if (!leads.length) reasons.push("no candidates found");
  } else {
    reasons.push(`no search: ${intent.turnType ?? intent.action}`);
  }
  Object.assign(out, {
    source_failure_reason: reasons,
    cost_and_latency: { ms: Date.now() - t0, credits_spent: before - (await credits()) },
    manual_accuracy_review: null,
  });
  return out;
}

async function main() {
  const all: Case[] = JSON.parse(fs.readFileSync(path.join(dir, "cases.json"), "utf8"));
  const pick = process.argv.slice(2);
  const cases = pick.length ? all.filter((c) => pick.includes(c.id)) : all;
  const results = [];
  for (const c of cases) {
    process.stdout.write(`${c.id} … `);
    try { const r = await runCase(c); results.push(r); console.log((r.delivered as string) ?? "-", (r.source_failure_reason as string[]).join("; ")); }
    catch (e) { results.push({ use_case_id: c.id, error: String(e) }); console.log("ERROR", e); }
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  fs.mkdirSync(path.join(dir, "results"), { recursive: true });
  fs.writeFileSync(path.join(dir, "results", `${stamp}.json`), JSON.stringify(results, null, 2));
  const md = [
    `# V2 test batch — ${stamp}`, "",
    "| ID | Fit | Path | Delivered | Strategies | A: candidates / URLs / not listed | B: read ok / failed | B: emails / LinkedIn / phones / person | C: signal (supported? required? rows) | ms | credits | Failure reasons |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...results.map((r: Record<string, any>) => r.error ? `| ${r.use_case_id} | | ERROR | | | | | | | | ${r.error} |` : [
      r.use_case_id, r.fit, r.turn_type ?? "", r.delivered ?? "", (r.strategies_used ?? []).length,
      r.stage_a ? `${r.stage_a.maps_candidates} / ${r.stage_a.website_urls_found ?? "–"} / ${r.stage_a.website_not_listed ?? "–"}` : "–",
      r.stage_b?.fetch_success != null ? `${r.stage_b.fetch_success} / ${r.stage_b.fetch_failed}` : "–",
      r.stage_b?.extractable_fields ? `${r.stage_b.extractable_fields.emails} / ${r.stage_b.extractable_fields.company_linkedin} / ${r.stage_b.extractable_fields.phones} / ${r.stage_b.extractable_fields.named_person}` : "–",
      r.stage_c?.expected_signal ? `${r.stage_c.expected_signal} (${r.stage_c.signal_supported ? "yes" : "no"}, ${(r.stage_c.required_by_planner ?? []).includes(r.stage_c.expected_signal) ? "req" : "not req"}, ${r.stage_c.rows_with_signal ?? "–"})` : "–",
      r.cost_and_latency.ms, r.cost_and_latency.credits_spent, (r.source_failure_reason ?? []).join("; "),
    ].join(" | ").replace(/^/, "| ").replace(/$/, " |")),
  ].join("\n");
  // Across all tests: which components the delivered leads depended on.
  const total: Record<string, Record<string, number>> = {};
  for (const r of results as Array<Record<string, any>>) for (const [k, vals] of Object.entries(r.attribution ?? {}))
    for (const [v, n] of Object.entries(vals as Record<string, number>)) (total[k] ??= {})[v] = ((total[k] ??= {})[v] ?? 0) + n;
  const attrMd = ["", "## What the delivered leads depended on", "", "| Part | Component → leads |", "|---|---|",
    ...Object.entries(total).map(([k, vals]) => `| ${k} | ${Object.entries(vals).sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v}: ${n}`).join(", ")} |`)].join("\n");
  fs.writeFileSync(path.join(dir, "results", `${stamp}.md`), md + "\n" + attrMd + "\n");
  console.log(`\nwrote results/${stamp}.{json,md}`);
  process.exit(0);
}
main();
