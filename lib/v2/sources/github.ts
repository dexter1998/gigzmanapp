/**
 * GitHub as a V2 discovery source: developers and dev shops by location / language / keyword.
 * Same rule as the original scraper (webdev-leads/v2/scripts/gh-freelancers.mjs): GitHub's
 * Acceptable Use Policy forbids bulk unsolicited email to addresses taken from its API, so the
 * profile email is kept as reference only (`profileEmailReference`), never as a sendable contact.
 * The usable path is the `blog` field — their own site — which the Website Enrich API then reads.
 */

import { sql } from "@/lib/db";

export type GithubProfile = {
  login: string; type: "User" | "Organization"; name: string | null; company: string | null; blog: string | null;
  location: string | null; bio: string | null; followers: number; publicRepos: number; profileUrl: string;
  /** Reference only — not for outreach (GitHub AUP). */
  profileEmailReference: string | null;
};

async function gh(path: string): Promise<Response> {
  const token = process.env.GITHUB_TOKEN;
  return fetch(`https://api.github.com${path}`, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    signal: AbortSignal.timeout(15_000),
  });
}

/** e.g. { location: "Gurgaon", language: "TypeScript", keywords: "agency", type: "user", minFollowers: 5 } */
/** A blog field that is someone else's platform is not their site. */
export const NOT_A_SITE = /github\.(com|io)\/?$|linkedin|twitter|x\.com|medium\.com|youtube|youtu\.be|instagram|facebook|dev\.to|hashnode\.dev\/?$|linktr\.ee|t\.me/i;

export async function searchGithub(q: { location?: string; language?: string; keywords?: string; type?: "user" | "org"; minFollowers?: number; limit?: number }): Promise<GithubProfile[]> {
  const parts = [
    q.keywords, q.location ? `location:"${q.location}"` : null, q.language ? `language:${q.language}` : null,
    q.type ? `type:${q.type}` : null, q.minFollowers ? `followers:>=${q.minFollowers}` : null,
  ].filter(Boolean).join(" ");
  const limit = Math.min(q.limit ?? 30, 100);
  const t0 = Date.now();
  const res = await gh(`/search/users?q=${encodeURIComponent(parts)}&per_page=${limit}&sort=followers`);
  if (!res.ok) throw new Error(`github search ${res.status}`);
  const items = ((await res.json()) as { items?: Array<{ login: string }> }).items ?? [];
  const out: GithubProfile[] = [];
  for (let i = 0; i < items.length; i += 8) {
    const batch = await Promise.all(items.slice(i, i + 8).map(async (it) => {
      const r = await gh(`/users/${it.login}`);
      if (!r.ok) return null;
      const u = (await r.json()) as Record<string, unknown>;
      const blog = typeof u.blog === "string" && u.blog.trim() ? (u.blog.startsWith("http") ? u.blog : `https://${u.blog}`) : null;
      return {
        login: String(u.login), type: u.type === "Organization" ? "Organization" : "User", name: (u.name as string) ?? null,
        company: (u.company as string) ?? null, blog, location: (u.location as string) ?? null, bio: (u.bio as string) ?? null,
        followers: Number(u.followers ?? 0), publicRepos: Number(u.public_repos ?? 0), profileUrl: String(u.html_url),
        profileEmailReference: (u.email as string) ?? null,
      } as GithubProfile;
    }));
    out.push(...batch.filter((x): x is GithubProfile => !!x));
  }
  await sql`INSERT INTO v2_source_attempts (source, capability, city, ok, value, cost_usd, ms)
            VALUES ('github', 'discover_dev', ${q.location ?? null}, ${out.length > 0}, ${parts}, 0, ${Date.now() - t0})`;
  return out;
}
