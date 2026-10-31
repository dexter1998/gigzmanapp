/**
 * Extra lead columns ("Origami-style" enrichment, docs/lead-contact-contract.md). The Planner picks
 * 4–8 attributes that matter for this user's ICP and offer; each delivered lead gets a short value
 * per column, from what the run already holds:
 *
 *   1. facts we measured (named person, hiring roles, funding, branches, socials, offerings, CMS) —
 *      folded in deterministically, no model call;
 *   2. the text of the pages the run already read, summarised into the remaining columns by ONE
 *      cheap-model call per lead. No extra fetches, no paid lookups; empty text → no call.
 *
 * Values are short (< 80 chars) and empty when unknown — never invented: a value with a number in it
 * must have that number in the page text, or it is dropped.
 */

import { sql } from "@/lib/db";
import { callTool, MODELS } from "./claude";
import { readFacts, writeFact } from "./signals/store";

export type ExtraColumn = { key: string; label: string; hint: string };

/** Columns the table already has — the Planner must not repeat them. */
const BUILT_IN = /^(name|business|company|phone|phones|mobile|email|emails|website|url|domain|rating|reviews?|review_count|category|area|city|location|address|linkedin|score|signals?|notes?|whatsapp)$/;

/** Used when a run's plan has no extraColumns (older runs, contacts runs): shown only where filled. */
export const DEFAULT_COLUMNS: ExtraColumn[] = [
  { key: "decision_maker", label: "Decision maker", hint: "Founder / owner / director named on the site, with role" },
  { key: "services", label: "Services", hint: "Main products or services, comma separated" },
  { key: "hiring_for", label: "Hiring for", hint: "Open roles" },
  { key: "funding", label: "Funding", hint: "Latest round, amount, date" },
  { key: "branches", label: "Branches", hint: "Number of branches / outlets / locations" },
  { key: "social_presence", label: "Social", hint: "Social profiles linked from the site" },
  { key: "tech_stack", label: "Website tech", hint: "CMS / platform the site runs on" },
];

/** The Planner's `extraColumns` field (make_plan tool), shared with proposeColumns below. */
export const EXTRA_COLUMNS_SCHEMA = {
  type: "array", minItems: 4, maxItems: 8,
  description: "4-8 extra lead-table columns that matter to THIS seller when judging and pitching these buyers — facts a business's own website states outright (never estimates or judgements like 'kitchen size: medium'). Pick for the offer: a fundraising advisor → Founder, Last round, Investors, Team size, Year founded; a refrigeration seller → Owner, Outlets / branches, Cuisine, Kitchen size, Year opened; a web agency → Owner, Services, Website tech, Instagram, Year founded; a recruiter → Founder, Hiring for, Team size, Offices. Never repeat the table's own columns (name, phone, email, website, rating, reviews, category, area, LinkedIn).",
  items: {
    type: "object",
    properties: {
      key: { type: "string", description: "snake_case id, e.g. founder, team_size, year_founded, branches, services, funding, tech_stack, instagram_followers, price_range, hiring_for." },
      label: { type: "string", description: "Column header, 1-3 words." },
      hint: { type: "string", description: "What to put in it, one short line ('founder or owner with role', 'number of outlets')." },
    },
    required: ["key", "label", "hint"],
  },
} as const;

/** Columns for a run planned before extraColumns existed (backfill only): one cheap call from its plan. */
export async function proposeColumns(plan: { title?: string; service?: string | null; buyerTrigger?: string | null; goal?: string; tradeWords?: string[] }): Promise<ExtraColumn[]> {
  const raw = await callTool({
    agent: "extras-columns", model: MODELS.cheap, maxTokens: 600,
    system: "You choose the extra columns of a B2B lead table for one seller's run. Return 4-8 columns specific to what they sell and who buys it.",
    messages: [{ role: "user", content: `Seller sells: ${plan.service ?? "unknown"}\nBuyers: ${plan.title ?? ""} ${(plan.tradeWords ?? []).join(", ")}\nBuying trigger: ${plan.buyerTrigger ?? "-"}\nGoal: ${plan.goal ?? "clients"}` }],
    tool: { name: "set_columns", description: "The extra columns.", input_schema: { type: "object", properties: { extraColumns: EXTRA_COLUMNS_SCHEMA }, required: ["extraColumns"] } },
  });
  return cleanColumns(raw.extraColumns);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32);

/** Planner output → 4–8 clean, distinct columns (or none). */
export function cleanColumns(raw: unknown): ExtraColumn[] {
  if (!Array.isArray(raw)) return [];
  const out: ExtraColumn[] = [];
  for (const c of raw) {
    if (!c || typeof c !== "object") continue;
    const o = c as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim().slice(0, 28) : "";
    const key = slug(typeof o.key === "string" && o.key.trim() ? o.key : label);
    if (!key || !label || BUILT_IN.test(key) || out.some((x) => x.key === key)) continue;
    out.push({ key, label, hint: typeof o.hint === "string" ? o.hint.trim().slice(0, 140) : "" });
    if (out.length === 8) break;
  }
  return out;
}

/** Union of several runs' columns, first-seen order, de-duplicated by key. */
export function unionColumns(lists: ExtraColumn[][]): ExtraColumn[] {
  const out: ExtraColumn[] = [];
  for (const l of lists) for (const c of l) if (!out.some((x) => x.key === c.key)) out.push(c);
  return out;
}

/** What a result row already knows, in the shape fact-folding reads. */
export type KnownFacts = {
  person?: { name: string; role?: string | null } | null;
  notes?: Record<string, unknown>;
  signals?: Record<string, unknown>;
  socials?: Record<string, string>;
  business?: string;
};

const short = (s: unknown, n = 79) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, n).replace(/[,;·\s]+$/, "") : "");
const decode = (s: string) => s.replace(/&#0?38;|&amp;/g, "&").replace(/&#0?39;|&rsquo;/g, "'").replace(/&quot;/g, '"');

/** The site's "person" is sometimes the business itself or a scrap of copy ("The Studs Sports Bar"). */
function realPerson(p: KnownFacts["person"], business: string | undefined): string {
  if (!p?.name) return "";
  const name = p.name.replace(/\s+/g, " ").trim();
  const words = name.toLowerCase().split(/[^a-z.]+/).filter(Boolean);
  const biz = new Set((business ?? "").toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3));
  if (!/^[\p{L} .'-]{3,40}$/u.test(name) || words.length > 5 || words.some((w) => biz.has(w.replace(/\./g, "")))) return "";
  return short(`${name}${p.role && p.role.length <= 30 ? ` (${p.role})` : ""}`);
}

/**
 * Which known fact a column is asking for, by its key / label. Strong facts were measured and win
 * over the page read; weak ones (a "locations" page, the offerings scraped off the nav) only fill a
 * column the page read left empty.
 */
const FOLDS: Array<[RegExp, "strong" | "weak", (k: KnownFacts) => string]> = [
  [/founder|owner|decision|person|ceo|director|promoter|proprietor|leader|principal|contact_?name|key_?contact|doctor|(^|_|\s)head(_|\s|$)/i, "strong", (k) => realPerson(k.person, k.business)],
  [/hiring|open_?roles|jobs|vacanc/i, "strong", (k) => short(String(k.notes?.hiring ?? "").replace(/^\d+ open roles?:?\s*/i, "")) || (k.signals?.hiring === true ? "Hiring" : "")],
  [/fund|raised|investor|round/i, "strong", (k) => short(k.notes?.funding)],
  [/branch|outlet|locations?_?count|multi_?loc|centres|centers|stores/i, "weak", (k) => (k.signals?.multi_location === true || k.signals?.has_locations === true ? "2+ locations" : "")],
  [/instagram|followers/i, "strong", (k) => {
    const n = String(k.notes?.social ?? "");
    const m = n.match(/Instagram[^·]*/i);
    return short(m ? m[0] : k.socials?.instagram ? "Has Instagram" : "");
  }],
  [/social/i, "strong", (k) => {
    const names: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn", youtube: "YouTube", x: "X" };
    return short(Object.keys(k.socials ?? {}).map((s) => names[s] ?? s).join(", "));
  }],
  [/service|offering|product|specialt|treatment|practice_?area|menu|cuisine/i, "weak", (k) => short(decode(String(k.notes?.offerings ?? "").replace(/^Offers:\s*/i, "")))],
  [/tech|cms|platform|stack|website_?built/i, "strong", (k) => short(typeof k.signals?.cms === "string" ? k.signals.cms : "")],
];

export function foldFacts(columns: ExtraColumn[], k: KnownFacts, which: "strong" | "weak" | "all" = "all"): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of columns) {
    const hay = `${c.key} ${c.label}`;
    for (const [re, kind, fn] of FOLDS) {
      if (!re.test(hay)) continue;
      // The first fold a column matches owns it (a "Founder" column never falls through to services).
      if (which === "all" || which === kind) { const v = fn(k); if (v) out[c.key] = v; }
      break;
    }
  }
  return out;
}

const UNKNOWN = /^(unknown|n\/?a|none|not (found|mentioned|available|stated|specified|listed)|no (data|information|info)|-+|null|undefined|\?|unclear|varies)$/i;

/** Drop any value the text does not support: unknown-ish words, and numbers that aren't in it. */
export function cleanValue(v: unknown, text: string): string {
  const s = short(v);
  if (!s || UNKNOWN.test(s.replace(/[<>[\]().]/g, "").trim()) || /unknown|not (stated|mentioned|specified)/i.test(s)) return "";
  // Every value must lean on the text: one of its words (4+ letters) has to appear there.
  const lower = text.toLowerCase();
  const ws = s.toLowerCase().match(/\p{L}{4,}/gu) ?? [];
  if (ws.length && !ws.some((w) => lower.includes(w))) return "";
  const nums = s.match(/\d[\d,.]*/g) ?? [];
  const flat = text.replace(/[,\s]/g, "");
  if (nums.some((n) => !flat.includes(n.replace(/[,]/g, "").replace(/\.$/, "")))) return "";
  return s;
}

/**
 * ONE cheap-model call: the page text → values for the columns not already filled by facts.
 * Returns only non-empty, text-supported values. Never throws (a failed call = no values).
 */
export async function extractExtras(opts: {
  columns: ExtraColumn[]; text: string; business: string; category?: string | null; known?: Record<string, string>;
}): Promise<Record<string, string>> {
  const text = opts.text.trim();
  const cols = opts.columns.filter((c) => !opts.known?.[c.key]);
  if (!text || text.length < 80 || !cols.length) return {};
  const props = Object.fromEntries(cols.map((c) => [c.key, { type: "string", description: `${c.label}${c.hint ? ` — ${c.hint}` : ""}. Empty string if the text doesn't say.` }]));
  try {
    const raw = await callTool({
      agent: "extras",
      model: MODELS.cheap,
      maxTokens: 500,
      system: [
        "You fill a lead table's columns from a business's own website text.",
        "Use ONLY what the text states. Never guess, estimate or infer from the business type: if the text does not say it, return an empty string.",
        "Values are short (under 80 characters): a name with role, a number, a year, or a few comma-separated items. No sentences, no marketing copy.",
        "Don't characterise (large / medium / small / popular) unless the text itself says so. Navigation labels, room names and slogans are not services.",
      ].join("\n"),
      messages: [{ role: "user", content: `BUSINESS: ${opts.business}${opts.category ? ` (${opts.category})` : ""}\n\nWEBSITE TEXT:\n${text.slice(0, 7000)}` }],
      tool: { name: "fill_columns", description: "The column values, empty when the text doesn't say.", input_schema: { type: "object", properties: props, required: cols.map((c) => c.key) } },
    });
    const out: Record<string, string> = {};
    const biz = opts.business.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    for (const c of cols) {
      const v = cleanValue(raw[c.key], text);
      // The business's own name is not a value ("Owner: The Studs Sports Bar").
      const n = v.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (v && !(n.length >= 4 && biz.replace(/ /g, "").includes(n.replace(/ /g, "")))) out[c.key] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/** Facts first (they were measured), then the model's values; only the given columns' keys. */
export function mergeExtras(columns: ExtraColumn[], ...layers: Array<Record<string, unknown> | null | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of columns) {
    for (const l of layers) {
      const v = l?.[c.key];
      if (typeof v === "string" && v.trim()) { out[c.key] = v.trim().slice(0, 80); break; }
    }
  }
  return out;
}

/** The page text a run already read for this company (cached by the Qualifier as the `site_text` fact). */
export async function cachedSiteText(domain: string | null | undefined): Promise<string> {
  if (!domain) return "";
  const f = await readFacts(domain);
  return typeof f.site_text?.value === "string" ? f.site_text.value : "";
}

export const cacheSiteText = (domain: string, text: string | undefined) =>
  text && text.length >= 80 ? writeFact(domain, "site_text", text.slice(0, 8000), "site") : Promise.resolve();

/** A v2_results row → the facts fold reads. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a postgres row
export function knownFromRow(r: Record<string, any>): KnownFacts {
  const sig = (r.signals ?? {}) as Record<string, unknown>;
  return {
    person: r.contact?.name ? { name: String(r.contact.name), role: r.contact.role ?? null } : null,
    notes: (sig.notes ?? {}) as Record<string, unknown>, signals: sig, socials: (r.socials ?? {}) as Record<string, string>,
    business: typeof r.name === "string" ? r.name : undefined,
  };
}

/**
 * Fills `v2_results.extras` for a run's delivered rows that don't have it yet: facts folded in, then
 * one cheap-model call per row over the page text the run already read. Called at the end of each
 * rank step (so only leads that made the list cost a call) and by scripts/v2-backfill-extras.ts.
 * `_at` marks a row as done so a later rank pass doesn't repeat the call.
 */
export async function fillRunExtras(runId: string, columns: ExtraColumn[], opts: { force?: boolean; text?: (row: Record<string, unknown>) => Promise<string> } = {}): Promise<{ rows: number; calls: number; filled: number }> {
  if (!columns.length) return { rows: 0, calls: 0, filled: 0 };
  const rows = await sql`
    SELECT id, name, category, domain, contact, socials, signals, extras FROM v2_results
    WHERE run_id = ${runId} AND rank IS NOT NULL ${opts.force ? sql`` : sql`AND (extras IS NULL OR NOT extras ? '_at')`}
    ORDER BY rank`;
  let calls = 0, filled = 0;
  for (let i = 0; i < rows.length; i += 5) {
    await Promise.all(rows.slice(i, i + 5).map(async (r) => {
      const known = knownFromRow(r);
      const strong = foldFacts(columns, known, "strong");
      const text = opts.text ? await opts.text(r) : await cachedSiteText(r.domain as string | null);
      const needLlm = text.length >= 80 && columns.some((c) => !strong[c.key]);
      if (needLlm) calls++;
      const read = needLlm ? await extractExtras({ columns, text, business: String(r.name), category: r.category as string | null, known: strong }) : {};
      const values = mergeExtras(columns, strong, read, foldFacts(columns, known, "weak"));
      filled += Object.keys(values).length;
      await sql`UPDATE v2_results SET extras = ${sql.json({ ...values, _at: new Date().toISOString() })} WHERE id = ${r.id as number}`;
    }));
  }
  return { rows: rows.length, calls, filled };
}
