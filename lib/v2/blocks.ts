/**
 * Structured chat responses (Tarun, 2026-10-21 — "like ChatGPT decides when to organise").
 * A V2 reply may carry `blocks`: a typed list rendered by components/chat/v2/Blocks.tsx. Simple
 * answers stay one markdown block; a lead request adds a `scope` card. New block types are added
 * here and in the renderer's registry — nothing else changes.
 */
import { SIGNALS, playbookById, type SignalId } from "./playbooks";
import { STRATEGY_LABEL, segmentsOf, type Strategy } from "./runner";
import { CREDIT_COST } from "@/lib/credits/pricing";
import type { CompiledPlan } from "./planner";

export type ScopeBlock = {
  type: "scope";
  runId: string;
  industry: string;
  geography: string;
  signals: Array<{ id: string; label: string; detail: string }>;
  /** Signals the scope card can switch on or off when editing (the required ones first). */
  signalOptions?: Array<{ id: string; label: string; detail: string }>;
  contacts: string[];
  target: number;
  steps: Array<{ title: string; detail: string }>;
  usage: { credits: number; note: string };
  assumptions: string | null;
  cannotDo: string | null;
  /** The orchestrator's own words on why this approach (and what it reused). */
  reasoning: string | null;
  reusedPipeline: boolean;
};
export type MarkdownBlock = { type: "markdown"; text: string };
/**
 * "Client context": who these leads are for, shown and confirmed BEFORE any plan (Tarun, 2026-10-26 —
 * the pitch-deck order: client context → ICP → strategy → pipeline). One business, the offering the
 * leads are for, and the buyers (ICP) that offering sells to.
 */
export type ContextBlock = {
  type: "context";
  profileId: string;
  name: string;
  website: string | null;
  summary: string;
  offerings: string[];
  /** Pre-selected offering (the profile's primary one, or the one this chat already chose). */
  offering: string | null;
  buyers: string[];
  areas: string[];
  sellsTo: string | null;
  /** The lead ask waiting on this confirmation. */
  brief: string;
  /** Just read from a website / built from the chat (vs. a saved profile). */
  fresh: boolean;
  /** Other saved businesses the user could pick instead. */
  others: Array<{ profileId: string; name: string }>;
};
export type Block = MarkdownBlock | ScopeBlock | ContextBlock;

/** "No Google Ads tag" → detail line the card shows under the signal. */
const SIGNAL_DETAIL = (id: string) => (SIGNALS[id as SignalId]?.source !== "site" ? "From the business listing — no website read needed" : id.startsWith("no_") ? "Not detected on their website" : id.startsWith("has_") ? "Found on their website" : "Checked on their website");

export function scopeBlock(runId: string, p: CompiledPlan): ScopeBlock {
  const industry = p.trades.map((t) => t.label).join(", ") || p.tradeWords?.join(", ") || p.title;
  const sources = (p.strategies ?? ["primary"]).slice(0, 3).map((s) => (p.scope === "country" && s === "primary" ? "Saved businesses across India" : STRATEGY_LABEL[s as Strategy] ?? s));
  const checks = (p.mustHave ?? []).length || p.needContacts;
  return {
    type: "scope", runId, industry, geography: p.areaText,
    // Segments: each signal shows its share of the target ("No website listed · 10 of 20").
    signals: (p.mustHave ?? []).map((m) => {
      const q = segmentsOf(p)?.find((g) => g.signal === m)?.quota;
      return { id: m, label: `${SIGNALS[m as SignalId]?.label ?? m}${q ? ` · ${q} of ${p.target}` : ""}`, detail: SIGNAL_DETAIL(m) };
    }),
    signalOptions: signalOptions(p),
    contacts: p.needContacts ? ["Public business email", "Company LinkedIn URL"] : [],
    target: p.target,
    steps: [
      { title: "Discover", detail: sources.join(", then ") },
      ...(checks ? [{ title: "Fetch and verify", detail: (p.mustHave ?? []).length ? "Read each website and check the requested signals" : "Read each website for emails and the company LinkedIn" }] : []),
      { title: "Deduplicate and rank", detail: "Keep only real matches and say plainly what couldn't be found" },
    ],
    usage: { credits: p.estCredits, note: `Up to ${p.estCredits} credits — ${CREDIT_COST.lead_unlock} per new lead${p.scope === "country" ? "" : ", plus live map searches"}; leads you already have are free.` },
    assumptions: p.assumptions, cannotDo: p.cannotDo,
    reasoning: p.approach?.reasoning ?? null, reusedPipeline: !!p.approach?.reusePipelineId,
  };
}

// What a seller usually filters on; the plan's own playbook signals are offered first.
const COMMON_SIGNALS: SignalId[] = ["no_website", "social_as_website", "old_copyright", "no_mobile", "no_instagram", "few_reviews", "low_rating", "hiring", "funded_recent"];

/** The signals the scope card offers as toggles: the plan's required ones, its playbooks', then common ones. */
function signalOptions(p: CompiledPlan): NonNullable<ScopeBlock["signalOptions"]> {
  const ids = [...(p.mustHave ?? []), ...p.playbookIds.flatMap((id) => playbookById(id)?.signals ?? []), ...COMMON_SIGNALS];
  return [...new Set(ids)].filter((id): id is SignalId => id in SIGNALS).slice(0, 12)
    .map((id) => ({ id, label: SIGNALS[id].label, detail: SIGNAL_DETAIL(id) }));
}
