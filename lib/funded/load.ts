import { pseoSql as sql } from "@/lib/pseo/db";

export type FundedRow = { company: string; website: string | null; about: string | null; city: string | null; city_slug: string | null; round: string | null; amount: string | null; announced: Date | null; investors: string[]; source_url: string };
export type FundedData = { rows: FundedRow[]; total: number; cities: Array<{ slug: string; n: number }>; rounds: Array<{ round: string; n: number }>; investors: Array<{ name: string; n: number }>; updated: Date | null };

/** Rounds announced in the last six months, newest first. `city` limits to one city slug. */
export async function loadFunded(city?: string): Promise<FundedData> {
  const rows = (await sql`
    SELECT company, website, about, city, city_slug, round, amount, announced, investors, source_url
    FROM funded_startups
    WHERE announced >= now() - interval '183 days' ${city ? sql`AND city_slug = ${city}` : sql``}
    ORDER BY announced DESC, company LIMIT 400`) as unknown as FundedRow[];
  const count = <T extends string>(xs: T[]) => [...xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<T, number>())].sort((a, b) => b[1] - a[1]);
  const roundOf = (r: string | null) => {
    const s = (r ?? "").toLowerCase();
    if (!s) return "Undisclosed";
    if (s.includes("pre-seed") || s.includes("pre seed")) return "Pre-seed";
    if (s.includes("pre-series a") || s.includes("pre series a")) return "Pre-Series A";
    if (s.includes("seed") || s.includes("angel")) return "Seed";
    const m = s.match(/series\s+([a-f])/);
    if (m) return `Series ${m[1].toUpperCase()}`;
    if (s.includes("debt")) return "Debt";
    if (s.includes("bridge")) return "Bridge";
    return "Other";
  };
  const [u] = await sql`SELECT max(updated_at) AS t FROM funded_startups`;
  return {
    rows, total: rows.length,
    cities: count(rows.map((r) => r.city_slug).filter((x): x is string => !!x)).map(([slug, n]) => ({ slug, n })),
    rounds: count(rows.map((r) => roundOf(r.round))).map(([round, n]) => ({ round, n })),
    investors: count(rows.flatMap((r) => (Array.isArray(r.investors) ? r.investors : []))).slice(0, 12).map(([name, n]) => ({ name, n })),
    updated: u?.t ? new Date(u.t) : null,
  };
}
