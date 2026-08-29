import { COMPANY } from "@/lib/company";

/**
 * Search Console: what search actually does with these pages.
 *
 * The sibling-differentiation rule in the gate is a guess — it assumes adjacent sectors compete
 * because they look alike. Search Console can answer that directly: if two of our URLs return
 * impressions for the same query, that is cannibalisation observed rather than inferred.
 *
 * Reads only. Requires the property verified in Search Console and a refresh token minted with
 * `webmasters.readonly` (see scripts/gsc-authorize.ts). Absent either, every function here returns
 * empty rather than throwing — the daily job must not fail because an optional integration isn't
 * configured yet.
 *
 * Note it says nothing until pages have been indexed and accumulated impressions — realistically
 * weeks after launch. Worth connecting early anyway: the history only starts when the integration
 * does.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://searchconsole.googleapis.com/webmasters/v3";

export function gscConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GSC_REFRESH_TOKEN);
}

async function accessToken(): Promise<string | null> {
  if (!gscConfigured()) return null;
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: process.env.GSC_REFRESH_TOKEN!,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) {
      console.error("GSC token exchange failed", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    return ((await res.json()) as { access_token: string }).access_token;
  } catch (err) {
    console.error("GSC token exchange error", err);
    return null;
  }
}

export type QueryPageRow = { query: string; page: string; clicks: number; impressions: number; position: number };

/** Query × page performance over a window. The pairing is what makes cannibalisation visible. */
export async function queryPageRows(days = 28, rowLimit = 5000): Promise<QueryPageRow[]> {
  const token = await accessToken();
  if (!token) return [];

  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const site = encodeURIComponent(COMPANY.site);

  try {
    const res = await fetch(`${API}/sites/${site}/searchAnalytics/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        dimensions: ["query", "page"],
        rowLimit,
      }),
    });
    if (!res.ok) {
      console.error("GSC searchAnalytics failed", res.status, (await res.text()).slice(0, 200));
      return [];
    }
    const data = (await res.json()) as { rows?: Array<{ keys: string[]; clicks: number; impressions: number; position: number }> };
    return (data.rows ?? []).map((r) => ({
      query: r.keys[0],
      page: r.keys[1],
      clicks: r.clicks,
      impressions: r.impressions,
      position: r.position,
    }));
  } catch (err) {
    console.error("GSC searchAnalytics error", err);
    return [];
  }
}

export type Cannibalisation = {
  query: string;
  impressions: number;
  /** Competing URLs, strongest first. The leader is the one to keep. */
  pages: Array<{ page: string; clicks: number; impressions: number; position: number }>;
};

/**
 * Queries where more than one of our pages is being shown.
 *
 * Only counts a page as genuinely competing if it has real impressions of its own — a URL that
 * surfaced twice all month isn't cannibalising anything, and treating it as such would retire
 * pages for noise.
 */
export function findCannibalisation(rows: QueryPageRow[], minImpressions = 20): Cannibalisation[] {
  const byQuery = new Map<string, QueryPageRow[]>();
  for (const r of rows) {
    if (r.impressions < minImpressions) continue;
    byQuery.set(r.query, [...(byQuery.get(r.query) ?? []), r]);
  }

  return [...byQuery.entries()]
    .filter(([, rs]) => rs.length > 1)
    .map(([query, rs]) => ({
      query,
      impressions: rs.reduce((s, r) => s + r.impressions, 0),
      pages: rs
        .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
        .map(({ page, clicks, impressions, position }) => ({ page, clicks, impressions, position })),
    }))
    .sort((a, b) => b.impressions - a.impressions);
}

/** Published pages that search has never shown — the earliest signal that a page reads as thin. */
export function pagesWithNoImpressions(rows: QueryPageRow[], publishedUrls: string[]): string[] {
  const seen = new Set(rows.map((r) => r.page.replace(/\/$/, "")));
  return publishedUrls.filter((u) => !seen.has(u.replace(/\/$/, "")));
}
