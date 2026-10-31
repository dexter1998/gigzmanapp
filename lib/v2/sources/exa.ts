/**
 * Exa web search as a V2 source (build-with-exa skill: /search, type auto, highlights). Plain fetch
 * — one endpoint. Cost is read from the response (costDollars.total), never assumed.
 */

import { sql } from "@/lib/db";
import { keysFor, retireKey, looksExhausted } from "./key-chain";

const CACHE_DAYS = 30;

export type ExaResult = { url: string; title: string | null; highlights?: string[]; publishedDate?: string | null };
export type ExaSearch = { results: ExaResult[]; costUsd: number; ms: number };

export async function exaSearch(query: string, opts: { highlights?: boolean; numResults?: number; category?: "news" | "company"; startPublishedDate?: string } = {}): Promise<ExaSearch & { cached?: boolean }> {
  const cacheKey = `${opts.highlights ? "h:" : ""}${opts.numResults ? `n${opts.numResults}:` : ""}${opts.category ? `c${opts.category}:` : ""}${opts.startPublishedDate ? `d${opts.startPublishedDate.slice(0, 10)}:` : ""}${query.trim().toLowerCase()}`;
  const [hit] = await sql`
    SELECT results FROM v2_search_cache
    WHERE provider = 'exa' AND query = ${cacheKey} AND created_at > now() - (${CACHE_DAYS} || ' days')::interval`;
  if (hit) return { results: hit.results as ExaResult[], costUsd: 0, ms: 0, cached: true };
  const t0 = Date.now();
  const body = JSON.stringify({ query, type: "auto", ...(opts.numResults ? { numResults: opts.numResults } : {}), ...(opts.highlights ? { contents: { highlights: true } } : {}),
    ...(opts.category ? { category: opts.category } : {}), ...(opts.startPublishedDate ? { startPublishedDate: opts.startPublishedDate } : {}) });
  // numResults is set only for list-building (a product decision: one call, a page of companies).
  let res: Response | null = null;
  for (const key of keysFor("EXA_API_KEY")) {
    res = await fetch("https://api.exa.ai/search", {
      method: "POST", headers: { "content-type": "application/json", "x-api-key": key }, body, signal: AbortSignal.timeout(20_000),
    });
    if (res.ok) break;
    const text = await res.clone().text().catch(() => "");
    if (!looksExhausted(res.status, text)) break;
    retireKey(key);
  }
  if (!res) throw new Error("EXA_API_KEY is not set");
  if (!res.ok) throw new Error(`exa ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const d = (await res.json()) as { results?: ExaResult[]; costDollars?: { total?: number } };
  const out = { results: (d.results ?? []).map((r) => ({ url: r.url, title: r.title ?? null, ...(r.highlights ? { highlights: r.highlights } : {}), ...(r.publishedDate ? { publishedDate: r.publishedDate } : {}) })), costUsd: Number(d.costDollars?.total ?? 0), ms: Date.now() - t0 };
  await sql`
    INSERT INTO v2_search_cache (provider, query, results, cost_usd) VALUES ('exa', ${cacheKey}, ${sql.json(out.results)}, ${out.costUsd})
    ON CONFLICT (provider, query) DO UPDATE SET results = EXCLUDED.results, cost_usd = EXCLUDED.cost_usd, created_at = now()`;
  return out;
}
