/**
 * Company-size fit (2026-10-23). A five-person web agency asking for "restaurants in Mumbai" was
 * shown Taj Hotels and McDonald's next to the corner cafe: real restaurants, but not buyers it can
 * win. The Planner now decides who can realistically buy from THIS seller (CompiledPlan.buyerSize),
 * and the rank step sizes the leads it is about to show and puts the ones that fit first.
 *
 * Sizing is a judgement on the evidence a salesperson would use — the name (a known national or
 * global brand?), the domain, branch count, review volume, the category — made by a small model in
 * one batch per run, not a hard-coded list of big brands.
 */

import { callTool, MODELS } from "./claude";

export const SIZE_TIERS = ["solo", "small", "mid", "large", "enterprise"] as const;
export type SizeTier = (typeof SIZE_TIERS)[number];
export type BuyerSize = { min: SizeTier; max: SizeTier; why: string | null };

export const SIZE_GUIDE =
  "solo = one person / freelancer / home business; small = a single local outlet or office, roughly 2-20 people; " +
  "mid = 20-200 people or a few branches in one region; large = 200-2,000 people, a multi-city chain or a well-known regional brand; " +
  "enterprise = 2,000+ people, a national or global household brand, a listed company or an MNC (and their franchise outlets).";

export const BUYER_SIZE_SCHEMA = {
  type: "object",
  description:
    "Which company sizes can realistically BUY from this seller, judged from the seller profile (its size, price level, what it sells) and anything the user said ('MNCs', 'big brands', 'small shops'). " +
    "A small agency or freelancer: solo-mid. A mid-size B2B vendor: small-large. Only an enterprise-grade seller, or a user who asks for big companies, includes enterprise. " + SIZE_GUIDE,
  properties: {
    min: { type: "string", enum: SIZE_TIERS },
    max: { type: "string", enum: SIZE_TIERS },
    why: { type: "string", description: "One short line." },
  },
  required: ["min", "max", "why"],
};

/** The band when the Planner gave none: everyone but household-name giants — most Mantis sellers
 *  are small and mid-sized, and a user who wants big brands says so (the Planner then widens it). */
export const DEFAULT_BUYER_SIZE: BuyerSize = { min: "solo", max: "large", why: null };

export function cleanBuyerSize(v: unknown): BuyerSize | null {
  if (typeof v === "string") { try { v = JSON.parse(v); } catch { return null; } }
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const tier = (x: unknown) => {
    const w = String(x ?? "").toLowerCase().replace(/[^a-z]/g, "");
    const alias: Record<string, SizeTier> = { micro: "solo", freelancer: "solo", individual: "solo", sme: "small", smb: "small", medium: "mid", midsize: "mid", midsized: "mid", mnc: "enterprise", corporate: "enterprise" };
    return SIZE_TIERS.indexOf((alias[w] ?? w) as SizeTier);
  };
  const min = tier(o.min);
  const max = tier(o.max);
  if (min < 0 || max < 0) return null;
  return { min: SIZE_TIERS[Math.min(min, max)], max: SIZE_TIERS[Math.max(min, max)], why: typeof o.why === "string" ? o.why.slice(0, 160) : null };
}

export const inBand = (t: SizeTier | null | undefined, b: BuyerSize) =>
  !t || (SIZE_TIERS.indexOf(t) >= SIZE_TIERS.indexOf(b.min) && SIZE_TIERS.indexOf(t) <= SIZE_TIERS.indexOf(b.max));

export type SizeCandidate = { id: number; name: string; domain: string | null; category: string | null; reviews: number | null; branches: number | null; area: string | null };

export type FitJudgement = { tier: SizeTier | null; inArea: boolean | null };

/**
 * One call judges up to 60 businesses: size tier, and — when an area was asked — whether each is in
 * it. Area: the pipeline's fallbacks (registry, web search, a wider radius) used to fill a Bahrain
 * ask with German hotels and a Connaught Place ask with Vasant Kunj (production test I-03); the
 * name, domain and listing area usually say where a business is. Unknown stays unknown and is
 * never filtered on.
 */
export async function judgeFit(rows: SizeCandidate[], areaText: string | null): Promise<Map<number, FitJudgement>> {
  const out = new Map<number, FitJudgement>();
  if (!rows.length) return out;
  const lines = rows.slice(0, 60).map((r) =>
    `${r.id} | ${r.name} | ${r.domain ?? "-"} | ${r.category ?? "-"} | reviews ${r.reviews ?? "?"} | listings ${r.branches ?? 1} | ${r.area ?? "-"}`);
  const raw = await callTool({
    agent: "size-fit",
    // Knowing that "Khar SOCIAL" is one outlet of a 40-city chain is brand knowledge the small model
    // lacked (it called it "small"); one call per run, so the better model is affordable here.
    model: MODELS.best,
    maxTokens: 2400,
    force: false,
    system:
      `For each business: (1) its size tier from name, website domain, category, review count and number of map listings. ${SIZE_GUIDE} ` +
      "A franchise outlet of a national or global brand counts as that brand. Use 'unknown' when nothing points either way — do not guess from the category alone. " +
      (areaText
        ? `(2) in_area: is it located in or immediately around "${areaText}"? Judge from the listing area column, the name (a locality in the name) and the domain (a foreign country TLD, a city in the domain). 'no' only on clear evidence it is elsewhere (another city or country, or a far-off part of a big city when a neighbourhood was asked); 'unknown' when nothing says.`
        : "(2) in_area: always 'unknown' (no area was asked)."),
    messages: [{ role: "user", content: `id | name | domain | category | reviews | listings | listing area\n${lines.join("\n")}` }],
    tool: {
      name: "judgements",
      description: "Size tier and area fit per business id.",
      input_schema: {
        type: "object",
        properties: { items: { type: "array", items: { type: "object", properties: {
          id: { type: "integer" }, tier: { type: "string", enum: [...SIZE_TIERS, "unknown"] }, in_area: { type: "string", enum: ["yes", "no", "unknown"] },
        }, required: ["id", "tier", "in_area"] } } },
        required: ["items"],
      },
    },
  });
  for (const it of Array.isArray(raw.items) ? raw.items : []) {
    const x = it as { id?: unknown; tier?: unknown; in_area?: unknown };
    const id = Number(x.id);
    if (!Number.isFinite(id)) continue;
    out.set(id, { tier: SIZE_TIERS.includes(x.tier as SizeTier) ? (x.tier as SizeTier) : null, inArea: x.in_area === "yes" ? true : x.in_area === "no" ? false : null });
  }
  return out;
}
