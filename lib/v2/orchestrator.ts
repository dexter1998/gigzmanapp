import { segmentsOf } from "./runner";
/**
 * The orchestrator (pitch deck step 05; built 2026-10-26 — Tarun: "jaise tum decide karte ho").
 *
 * The same loop Claude Code runs: a model with a registry of tools (lib/v2/capabilities.ts), memory of
 * what worked before (lib/v2/memory.ts), and the freedom to look things up — counts, past pipelines,
 * this run's results — before it commits. Two gates:
 *
 *   chooseApproach  at plan time: which past pipeline to reuse (if any), which sources in what order,
 *                   and why. The reasoning is kept on the run and shown on the scope card.
 *   decideNext      inside a run, whenever a pass ends short of the target: continue with which
 *                   source, or stop — having seen what every source did so far in THIS run.
 *
 * Code keeps only guardrails: the set of sources a plan can physically use, a signal that only one
 * source can supply, and a deterministic fallback when the model is unreachable. Everything else is
 * the model's call, recorded in v2_decisions so the next decision can read it.
 */
import { sql } from "@/lib/db";
import { callAgent, MODELS, AgentUnavailableError } from "./claude";
import { capabilitiesForPrompt, ALL_STRATEGIES } from "./capabilities";
import { recallForPlan, recallForRun, type Memory } from "./memory";
import type { CompiledPlan } from "./planner";
import type { SellerProfile } from "./scout";

export type Strategy = NonNullable<CompiledPlan["strategies"]>[number];

export type Approach = {
  reusePipelineId: string | null;
  strategies: Strategy[];
  reasoning: string;
  confidence: number;
  /** What the model looked at before deciding (for the admin / debugging). */
  trace: Array<{ tool: string; input: Record<string, unknown>; output: string }>;
  ms: number;
};

export type NextDecision = { action: "continue" | "stop"; strategy: Strategy | null; reasoning: string };

const WIDE_RADIUS_M = 25000, POOL_RADIUS_M = 12000;

/** Sources this plan can physically use — the guardrail, not the choice. */
export function allowedStrategies(p: Pick<CompiledPlan, "trades" | "adjacentTypes" | "nameHints" | "tradeWords" | "scope" | "keywords">): Strategy[] {
  const hasTypes = p.trades.length > 0;
  const hasWords = (p.nameHints?.length ?? 0) > 0 || (p.tradeWords?.length ?? 0) > 0;
  const out: Strategy[] = [];
  if (hasTypes) out.push("primary");
  if (hasTypes && p.scope !== "country") out.push("wide");
  if (p.adjacentTypes?.length) out.push("adjacent");
  if (hasWords) out.push("names", "registry");
  out.push("web_search", "funding_news", "github");
  return out;
}

/** How many saved candidates a saved-data source would give this plan right now (free to ask). */
async function countFor(plan: CompiledPlan, strategy: Strategy): Promise<string> {
  const types = strategy === "adjacent" ? (plan.adjacentTypes ?? []) : plan.trades.map((t) => t.placeType);
  const kws = (plan.nameHints ?? []).filter((k) => /^[a-z]{3,20}$/.test(k));
  if (strategy === "registry") {
    if (!kws.length) return "registry: no trade words to match — 0";
    const re = `\\m(${kws.join("|")})`;
    const [r] = await sql`SELECT count(*)::int AS n FROM scrape_domains WHERE (company ~* ${re} OR category ~* ${re}) AND website IS NOT NULL AND NOT do_not_crawl`;
    // What those matches actually are: the registry is mostly agencies, so a name match on "hotel"
    // may be web agencies with "hotel" in the name. The categories say so before anyone trusts the count.
    const cats = await sql`SELECT coalesce(category, '?') c, count(*)::int n FROM scrape_domains WHERE (company ~* ${re} OR category ~* ${re}) AND website IS NOT NULL AND NOT do_not_crawl GROUP BY 1 ORDER BY 2 DESC LIMIT 4`;
    return `registry: ${r.n} crawled companies match "${kws.join("|")}" (emails usually on file); their categories: ${cats.map((c) => `${c.c} ${c.n}`).join(", ") || "—"}`;
  }
  if (strategy === "web_search") return "web_search: live source (not countable in advance); typically ~29 companies per search, each needs its website read";
  if (strategy === "funding_news") return "funding_news: live source; typically ~40 funded startups per run for an Indian city";
  if (strategy === "github") return "github: live source; ~50 developer profiles per city";
  if (strategy === "names" && !kws.length) return "names: no trade words — 0";
  if (strategy !== "names" && !types.length) return `${strategy}: no place types — 0`;
  const poolR = strategy === "wide" || strategy === "names" ? WIDE_RADIUS_M : Math.max(plan.radiusM, POOL_RADIUS_M);
  const latD = poolR / 111320, lngD = poolR / (111320 * Math.cos((plan.center.lat * Math.PI) / 180));
  const match = strategy === "names" ? sql`business_name ~* ${`\\m(${kws.join("|")})`}` : sql`category = ANY(${types})`;
  const [r] = await sql`
    SELECT count(*)::int AS n, count(*) FILTER (WHERE has_website)::int AS site, count(*) FILTER (WHERE website_url IS NOT NULL)::int AS url,
           count(*) FILTER (WHERE NOT has_website)::int AS nosite, count(*) FILTER (WHERE phone IS NOT NULL)::int AS phone
    FROM leads WHERE ${match} AND is_competitor = false
      ${plan.scope === "country" ? sql`` : sql`AND lat BETWEEN ${plan.center.lat - latD} AND ${plan.center.lat + latD} AND lng BETWEEN ${plan.center.lng - lngD} AND ${plan.center.lng + lngD}`}`;
  return `${strategy}: ${r.n} saved businesses (${r.site} have a website, ${r.url} with the URL stored, ${r.nosite} without a website, ${r.phone} with phone)${plan.scope === "country" ? " across the country" : ` within ${Math.round(poolR / 1000)} km`}`;
}

const APPROACH_TOOL = {
  name: "approach",
  description: "Your decision: how to find these leads.",
  input_schema: {
    type: "object",
    properties: {
      reusePipelineId: { type: ["string", "null"], description: "The id of an earlier pipeline to reuse for this ask (same signals and the same kind of buyer), or null for a fresh approach. Only an id that recall listed." },
      strategies: { type: "array", items: { type: "string" }, description: "Sources in the order to try them, from the allowed list. The first one runs first; the next runs only if the result is short." },
      reasoning: { type: "string", description: "2-4 sentences, for the user: why this order, what you reused and why, what you expect each source to add. Plain words." },
      confidence: { type: "number", description: "0-1: how confident you are this approach will reach the target with good leads." },
    },
    required: ["reusePipelineId", "strategies", "reasoning", "confidence"],
  },
};

const NEXT_TOOL = {
  name: "next",
  description: "Your decision for this run now.",
  input_schema: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["continue", "stop"] },
      strategy: { type: ["string", "null"], description: "The source to run next when continuing; null when stopping." },
      reasoning: { type: "string", description: "1-3 sentences for the user: why this source next, or why stopping is the honest call." },
    },
    required: ["action", "strategy", "reasoning"],
  },
};

function planFacts(plan: CompiledPlan, allowed: Strategy[]): string {
  return [
    `ASK: ${plan.title}`,
    `Buyers (place types): ${plan.trades.map((t) => `${t.label} [${t.placeType}]`).join(", ") || "none on Maps"}; trade words: ${(plan.tradeWords ?? []).join(", ") || "—"}; related types: ${(plan.adjacentTypes ?? []).join(", ") || "—"}`,
    `Area: ${plan.areaText} (${plan.scope}); target: ${plan.target}; contacts wanted: ${plan.needContacts ? "yes" : "no"}`,
    `Signals the user requires: ${(plan.mustHave ?? []).join(", ") || "none"}${plan.signalMode === "segments" ? ` — as SEPARATE segments, each with its own quota (${(segmentsOf(plan) ?? []).map((g) => `${g.signal}: ${g.quota}${g.listing ? ", from the listing, no site read" : ", needs a site read"}`).join("; ")})` : plan.signalMode === "all" ? " — all on the same business" : ""}; playbooks: ${plan.playbookIds.join(", ") || "none"}`,
    `Allowed sources for this plan: ${allowed.join(", ")}`,
  ].join("\n");
}

const SYSTEM = `You are the orchestrator of Mantis, a B2B lead-finding agent. You decide HOW to find the leads an ask describes: which of your sources to use, in which order, and whether to reuse a pipeline that worked for this kind of ask before.

Think like an operator who knows the tools, their coverage and their cost:
- Local trades (clinics, shops, factories, offices) live on Google Maps: start from saved map businesses; widen or add related types only when short.
- Products, SaaS, importers, B2B firms are not on Maps: web search first, registry when the trade words match crawled companies.
- Anyone selling to funded startups: funding news first.
- Developers: GitHub first.
- A pipeline that delivered well for the same signals and buyers before is worth reusing — say so. Its per-source numbers are evidence, not an order to copy: a source that delivered many rows may only have run because the first choice fell short. Decide the first source from WHERE this kind of buyer is actually listed, then use memory to order the fallbacks.
- Free, instant sources before paid or slow ones when both can serve. Never add a source that cannot find this kind of buyer just to look thorough.
- Prefer sources whose candidates come with a website URL when the required signals need a website read.
Use the tools to check counts and memory before you decide; then call the final tool. Be concrete in the reasoning — numbers you saw, not generalities.`;

/** Plan-time decision. Never throws: a model outage returns the deterministic order with a note. */
export async function chooseApproach(input: {
  plan: CompiledPlan; defaultOrder: Strategy[]; seller: SellerProfile | null; offering: string | null; message: string;
}): Promise<Approach> {
  const allowed = allowedStrategies(input.plan).filter((s) => ALL_STRATEGIES.includes(s));
  const t0 = Date.now();
  const fallback: Approach = { reusePipelineId: null, strategies: input.defaultOrder.filter((s) => allowed.includes(s)), reasoning: "", confidence: 0, trace: [], ms: 0 };
  let memory: Memory | null = null;
  try {
    // Memory and the counts of every saved source are fetched together up front, so the model has
    // the numbers in its first look and rarely needs a tool round (each round was ~4 s; a plan
    // decision took 14–22 s before this — Tarun: a repeat ask must be fast).
    const [mem, counts] = await Promise.all([
      recallForPlan(input.plan),
      Promise.all(allowed.map((st) => countFor(input.plan, st).catch((e) => `${st}: count failed (${(e as Error).message.slice(0, 60)})`))),
    ]);
    memory = mem;
    // A proven pipeline for exactly this ask (same signals, same buyers, delivered well, ran more than
    // once): the decision is mostly confirmation, so the cheap model in one round does it — still with
    // its reasoning, still free to deviate.
    const proven = memory.relevantPipelines.find((p) => p.match === "exact" && p.runs >= 2 && p.deliveredRate >= 0.8);
    const sellerLine = input.seller ? `SELLER: ${input.seller.company ?? ""} — ${input.seller.summary.slice(0, 200)}${input.offering ? ` Offering these leads are for: ${input.offering}.` : ""}` : "SELLER: not known.";
    const res = await callAgent({
      agent: "orchestrator", model: proven ? MODELS.cheap : MODELS.best, maxRounds: proven ? 1 : 2, maxTokens: 900,
      system: `${SYSTEM}\n\n${capabilitiesForPrompt(["source", "enricher"])}`,
      messages: [{ role: "user", content: `${sellerLine}\nUSER SAID: ${input.message.slice(0, 300)}\n\n${planFacts(input.plan, allowed)}\n\nCANDIDATE COUNTS NOW:\n${counts.map((c) => `- ${c}`).join("\n")}\n\nDefault order the old rules would use: ${fallback.strategies.join(" > ")}\n\n${memory.text}${proven ? `\n\nA proven pipeline matches this ask exactly: ${proven.id} (${proven.label}; ${proven.runs} runs, delivered ${Math.round(proven.deliveredRate * 100)}% of target, best sources ${proven.bestStrategies.join(" > ") || "—"}). Reuse it unless the counts above say otherwise, and say why in one or two sentences.` : ""}` }],
      final: APPROACH_TOOL,
      tools: [
        { name: "count_candidates", description: "How many saved candidates a source holds for this ask right now (free). Live sources report typical yield.", input_schema: { type: "object", properties: { strategy: { type: "string", enum: allowed } }, required: ["strategy"] } },
        { name: "inspect_pipeline", description: "Details of one earlier pipeline from memory: its shape, best sources and recent runs.", input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
      ],
      handlers: {
        count_candidates: async (i) => countFor(input.plan, String(i.strategy) as Strategy),
        inspect_pipeline: async (i) => {
          const p = memory!.relevantPipelines.find((x) => x.id === String(i.id));
          if (!p) return "no such pipeline in memory";
          const runs = await sql`SELECT target, delivered, confidence, area_text, finished_at FROM v2_runs WHERE pipeline_id = ${p.id} AND status = 'done' ORDER BY finished_at DESC LIMIT 5`;
          return `${p.label}\nshape: ${JSON.stringify(p.shape)}\nbest sources: ${p.bestStrategies.join(" > ") || "—"}\nrecent runs: ${runs.map((r) => `${r.delivered}/${r.target} in ${r.area_text ?? "?"} (conf ${r.confidence ? Number(r.confidence).toFixed(2) : "—"})`).join("; ") || "—"}`;
        },
      },
    });
    const out = res.input;
    const want = (Array.isArray(out.strategies) ? out.strategies : []).map(String).filter((s): s is Strategy => allowed.includes(s as Strategy));
    const strategies = [...new Set(want)];
    const reuse = typeof out.reusePipelineId === "string" && memory.relevantPipelines.some((p) => p.id === out.reusePipelineId) ? out.reusePipelineId : null;
    // Guardrail: a required funding signal can only come from funding news.
    if ((input.plan.mustHave ?? []).some((m) => m.startsWith("funded") || m === "raise_due") && !strategies.includes("funding_news")) strategies.unshift("funding_news");
    const approach: Approach = {
      reusePipelineId: reuse,
      strategies: strategies.length ? strategies : fallback.strategies,
      reasoning: typeof out.reasoning === "string" ? out.reasoning.slice(0, 600) : "",
      confidence: typeof out.confidence === "number" ? Math.max(0, Math.min(1, out.confidence)) : 0.5,
      trace: res.trace, ms: Date.now() - t0,
    };
    return approach;
  } catch (err) {
    if (!(err instanceof AgentUnavailableError)) console.warn("[orchestrator] approach failed", (err as Error).message);
    return { ...fallback, ms: Date.now() - t0 };
  }
}

/** Mid-run decision when a pass ends short. Never throws. */
export async function decideNext(input: { runId: string; plan: CompiledPlan; kept: number; total: number; reachable: number; used: Strategy[] }): Promise<NextDecision> {
  const allowed = allowedStrategies(input.plan).filter((s) => !input.used.includes(s));
  const planned = (input.plan.strategies ?? []).find((s) => allowed.includes(s)) ?? null;
  const fallback: NextDecision = { action: planned ? "continue" : "stop", strategy: planned, reasoning: "" };
  if (!allowed.length) return { action: "stop", strategy: null, reasoning: "Every source this ask can use has run." };
  try {
    const [status, counts] = await Promise.all([
      recallForRun(input.runId),
      Promise.all(allowed.map((st) => countFor(input.plan, st).catch(() => `${st}: count failed`))),
    ]);
    const res = await callAgent({
      agent: "orchestrator", model: MODELS.best, maxRounds: 2, maxTokens: 700,
      system: `${SYSTEM}\n\n${capabilitiesForPrompt(["source"])}\n\nYou are mid-run. The run is short of its target; decide whether another source is worth running or whether stopping with what there is would be more honest (e.g. the sources left cannot find this kind of buyer, or the ones that ran found almost nothing).`,
      messages: [{ role: "user", content: `${planFacts(input.plan, allowed)}\n\nKept ${input.kept} of ${input.total} candidates so far${input.plan.needContacts ? `, ${input.reachable} reachable` : ""}; target ${input.plan.target}. Sources already run: ${input.used.join(", ") || "none"}. Sources left: ${allowed.join(", ")}. Planned order was: ${(input.plan.strategies ?? []).join(" > ")}.\n\nCANDIDATE COUNTS for the sources left:\n${counts.map((c) => `- ${c}`).join("\n")}\n\n${status}` }],
      final: NEXT_TOOL,
      tools: [{ name: "count_candidates", description: "How many saved candidates a remaining source holds for this ask (free).", input_schema: { type: "object", properties: { strategy: { type: "string", enum: allowed } }, required: ["strategy"] } }],
      handlers: { count_candidates: async (i) => countFor(input.plan, String(i.strategy) as Strategy) },
    });
    const out = res.input;
    const strategy = typeof out.strategy === "string" && allowed.includes(out.strategy as Strategy) ? (out.strategy as Strategy) : null;
    const action: NextDecision["action"] = out.action === "stop" || !strategy ? "stop" : "continue";
    const d: NextDecision = { action, strategy: action === "continue" ? strategy : null, reasoning: typeof out.reasoning === "string" ? out.reasoning.slice(0, 400) : "" };
    await sql`INSERT INTO v2_decisions (run_id, at, decision, context_chars) VALUES (${input.runId}, 'rank', ${sql.json({ ...d, trace: res.trace } as unknown as Parameters<typeof sql.json>[0])}, ${status.length})`.catch(() => {});
    return d;
  } catch (err) {
    if (!(err instanceof AgentUnavailableError)) console.warn("[orchestrator] next failed", (err as Error).message);
    return fallback;
  }
}

/** Record the plan-time decision once the run row exists. */
export async function recordApproach(runId: string, a: Approach): Promise<void> {
  await sql`UPDATE v2_runs SET reasoning = ${sql.json({ reusePipelineId: a.reusePipelineId, strategies: a.strategies, reasoning: a.reasoning, confidence: a.confidence } as unknown as Parameters<typeof sql.json>[0])} WHERE id = ${runId}`.catch(() => {});
  await sql`INSERT INTO v2_decisions (run_id, at, decision) VALUES (${runId}, 'plan', ${sql.json(a as unknown as Parameters<typeof sql.json>[0])})`.catch(() => {});
}
