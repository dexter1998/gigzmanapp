import { unstable_cache } from "next/cache";
import { listsSql as sql } from "./db";
import type { SitemapEntry } from "@/lib/pseo/sitemap";
import { LISTS, SERVICE_LISTS, NOSITE_LISTS, LIST_MIN_ROWS, type ListDef } from "./defs";
import { listPath } from "@/components/lists/ListView";
import { loadList, listCityCounts } from "./load";
import { loadFunded } from "@/lib/funded/load";
import { FUNDED_CITIES } from "@/lib/funded/refresh";

export const LISTS_SEGMENT = "lists";

/** Only pages that pass the gate are advertised — a noindexed URL in a sitemap is a GSC error. */
async function urls(): Promise<SitemapEntry[]> {
  const out: SitemapEntry[] = [
    { path: "/businesses-without-websites", changeFrequency: "daily", priority: 0.9 },
    { path: "/lists", changeFrequency: "weekly", priority: 0.8 },
    { path: "/leads-for", changeFrequency: "weekly", priority: 0.8 },
  ];
  const counts = async (d: ListDef): Promise<number> => {
    if (d.kind === "service" || d.kind === "tech") return (await loadList(d)).total;
    const [r] = await sql`SELECT count(*)::int n FROM leads WHERE category = ANY(${d.categories ?? []})
      ${d.country ? sql`AND country_code = ${d.country}` : sql``} ${d.kind === "nosite" ? sql`AND has_website = false` : sql``}
      AND NOT coalesce(is_competitor, false)`;
    return r.n;
  };
  for (const d of [...NOSITE_LISTS, ...SERVICE_LISTS, ...LISTS]) {
    const n = await counts(d).catch(() => 0);
    if (n < LIST_MIN_ROWS) continue;
    out.push({ path: listPath(d), changeFrequency: "weekly", priority: d.kind === "service" || d.kind === "nosite" ? 0.8 : 0.7 });
    // City versions past the same gate (none for nosite — /leads/... already covers those).
    if (d.kind !== "nosite") {
      for (const c of await listCityCounts(d).catch(() => [])) {
        if (c.n >= LIST_MIN_ROWS) out.push({ path: `${listPath(d)}/${c.slug}`, changeFrequency: "weekly", priority: 0.6 });
      }
    }
  }
  // Funded startups: India page plus any city past the same 25-row gate.
  const fundedAll = await loadFunded().catch(() => null);
  if (fundedAll && fundedAll.total >= LIST_MIN_ROWS) {
    out.push({ path: "/funded-startups-india", changeFrequency: "weekly", priority: 0.8, lastModified: fundedAll.updated ?? undefined });
    for (const c of FUNDED_CITIES) {
      const n = fundedAll.cities.find((x) => x.slug === c.slug)?.n ?? 0;
      if (n >= LIST_MIN_ROWS) out.push({ path: `/funded-startups-india/${c.slug}`, changeFrequency: "weekly", priority: 0.7, lastModified: fundedAll.updated ?? undefined });
    }
  }
  return out;
}

const cached = unstable_cache(urls, ["lists:sitemap"], { revalidate: 21600, tags: ["lists"] });

/** unstable_cache round-trips through JSON, so a Date comes back as a string — rehydrate it. */
export async function listSitemapUrls(): Promise<SitemapEntry[]> {
  return (await cached()).map((e) => ({ ...e, lastModified: e.lastModified ? new Date(e.lastModified) : undefined }));
}
