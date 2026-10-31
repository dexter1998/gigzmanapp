/**
 * "Compare it with yourself" (Tarun, 2026-10-26): for each ask, the first source Claude (this
 * session) would choose, written down BEFORE running the orchestrator, against what it chose.
 */
import { sql } from "@/lib/db";
import { makePlan } from "@/lib/v2/planner";
import { listProfiles, toSeller } from "@/lib/v2/business-profiles";
import { EMPTY_STATE } from "@/lib/v2/state";
process.env.V2_ORCHESTRATOR = "1";
const email = "test@mantisai.in";
type Case = { ask: string; profile: RegExp | null; expectFirst: string[]; why: string };
const CASES: Case[] = [
  { ask: "find restaurants in Jaipur with no website", profile: /KALT/, expectFirst: ["primary"], why: "local trade on Maps; no-website is a listing signal — saved map rows first" },
  { ask: "dentists in Gurugram whose website has no analytics", profile: /Bubbles/, expectFirst: ["primary"], why: "local trade; signal needs a site read, Maps rows with URLs first" },
  { ask: "SaaS companies in Bangalore that are hiring", profile: /Zoho/, expectFirst: ["web_search", "registry"], why: "SaaS is not on Maps" },
  { ask: "funded startups in Delhi NCR for fundraising advisory", profile: /Datakatalyst/, expectFirst: ["funding_news"], why: "funding is only in news" },
  { ask: "developers and dev agencies in Pune", profile: /Zoho/, expectFirst: ["github", "web_search"], why: "developers live on GitHub" },
  { ask: "silver jewellery manufacturers in Jaipur", profile: /KALT/, expectFirst: ["names", "primary"], why: "no exact Maps type; name match on 'jewellery'" },
  { ask: "importers of commercial refrigeration in Mumbai", profile: /KALT/, expectFirst: ["web_search", "registry", "names"], why: "importers are B2B firms, not Maps shops" },
  { ask: "gyms in Hyderabad without online booking", profile: /Bubbles/, expectFirst: ["primary"], why: "local trade; site signal" },
  { ask: "schools in Lucknow with an admissions page", profile: /Bubbles/, expectFirst: ["primary"], why: "local; site signal" },
  { ask: "interior designers in Noida", profile: /Sharma/, expectFirst: ["primary"], why: "Maps type exists" },
  { ask: "CA firms in Ahmedabad that are not running Google Ads", profile: /Zoho/, expectFirst: ["primary"], why: "accounting is a Maps type; signal from site read" },
  { ask: "D2C brands in India that sell online", profile: /Zoho/, expectFirst: ["web_search", "registry"], why: "brands are web entities" },
  { ask: "hotels in Goa with an old website", profile: /Bubbles/, expectFirst: ["primary"], why: "Maps; old_copyright from read" },
  { ask: "exporters of spices in Kerala", profile: /KALT/, expectFirst: ["names", "web_search", "registry"], why: "no Maps type for exporters" },
  { ask: "marketing agencies in Chandigarh", profile: /Zoho/, expectFirst: ["primary", "registry"], why: "agencies: Maps type exists; registry is full of agencies" },
  { ask: "startups that raised a seed round in Bengaluru", profile: /Datakatalyst/, expectFirst: ["funding_news"], why: "funding" },
  { ask: "real estate agents in Gurugram with no website", profile: /Bubbles/, expectFirst: ["primary"], why: "Maps + listing signal; a past pipeline exists for exactly this" },
  { ask: "car repair shops in Indore", profile: /Bubbles/, expectFirst: ["primary"], why: "Maps" },
  { ask: "logistics companies in Delhi that are hiring", profile: /Zoho/, expectFirst: ["primary", "web_search"], why: "courier/transport types on Maps; hiring from read" },
  { ask: "cafes in Pune with weak Instagram", profile: /Bubbles/, expectFirst: ["primary"], why: "Maps; social signal from read" },
];
(async () => {
  const profs = await listProfiles(email);
  const [c] = await sql`INSERT INTO chats (user_email, title) VALUES (${email}, 'orch-bench') RETURNING id`;
  let agree = 0, n = 0;
  const rows: string[] = [];
  for (const cs of CASES) {
    const prof = cs.profile ? profs.find((p) => cs.profile!.test(p.name)) ?? null : null;
    const t0 = Date.now();
    const o = await makePlan({ chatId: c.id, userEmail: email, message: cs.ask, history: [], profile: prof ? toSeller(prof) : null, state: { ...EMPTY_STATE }, savedOnly: true }).catch((e) => ({ ok: false as const, reason: "no_trade" as const, message: String(e).slice(0, 80), unresolved: [] }));
    const ms = Date.now() - t0;
    if (!o.ok) { rows.push(`✗ ${cs.ask} → plan failed: ${o.reason} ${o.message.slice(0, 60)}`); n++; continue; }
    const first = o.plan.strategies?.[0] ?? "?";
    const ok = cs.expectFirst.includes(first);
    if (ok) agree++; n++;
    const [dec] = await sql`SELECT (decision->>'ms')::int AS ms, jsonb_array_length(decision->'trace') AS rounds FROM v2_decisions WHERE run_id = ${o.runId} AND at = 'plan'`;
    rows.push(`${ok ? "✓" : "✗"} ${cs.ask}  [plan ${ms} ms · orchestrator ${dec?.ms ?? "?"} ms · ${dec?.rounds ?? "?"} tool calls]\n    claude: ${cs.expectFirst.join("|")} (${cs.why})\n    mantis: ${(o.plan.strategies ?? []).join(" > ")}${o.plan.approach?.reusePipelineId ? ` · reused ${o.plan.approach.reusePipelineId}` : ""} \n    why:    ${(o.plan.approach?.reasoning ?? "(no reasoning — fallback order)").replace(/\s+/g, " ").slice(0, 260)}`);
  }
  console.log(rows.join("\n"));
  console.log(`\nAGREEMENT on first source: ${agree}/${n}`);
  process.exit(0);
})();
