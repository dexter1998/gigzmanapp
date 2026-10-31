/**
 * Social presence — for anyone selling social media, content or ads (2026-10-22). Read from the
 * public profile pages the company's own site links to; nothing needs a login:
 *
 *   Instagram  followers + post count   (the page's og:description, served to link-preview bots)
 *   YouTube    subscribers + how long ago the newest video went up   (/videos)
 *   LinkedIn   company followers        (public company page; often an auth wall from servers)
 *
 * Facebook shows nothing without a login, and Instagram's last-post DATE is not public — so
 * "inactive" is only claimed where a date is actually readable (YouTube). Unknown stays unknown.
 */

import { safeFetch } from "../net";

export type SocialStats = {
  instagram?: { followers: number | null; posts: number | null };
  youtube?: { subscribers: number | null; lastVideoDaysAgo: number | null };
  linkedin?: { followers: number | null };
};

/** "2M" → 2000000, "12.5K" → 12500, "3,005" → 3005. */
export function parseCount(s: string | undefined | null): number | null {
  if (!s) return null;
  const m = s.trim().replace(/,/g, "").match(/^([\d.]+)\s*([kKmMbB])?/);
  if (!m) return null;
  const n = Number(m[1]) * (m[2] ? { k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase() as "k" | "m" | "b"] : 1);
  return Number.isFinite(n) ? Math.round(n) : null;
}

async function get(url: string, ua?: string): Promise<string | null> {
  try {
    const r = await safeFetch(url, { signal: AbortSignal.timeout(7000), headers: ua ? { "User-Agent": ua } : {} });
    return r.ok ? await r.text() : null;
  } catch { return null; }
}

const AGO: Record<string, number> = { hour: 1 / 24, day: 1, week: 7, month: 30, year: 365 };

export async function instagramStats(url: string) {
  const html = await get(url.split("?")[0], "facebookexternalhit/1.1");
  const m = html?.match(/content="([\d.,]+[KkMm]?) Followers, [\d.,]+[KkMm]? Following, ([\d.,]+[KkMm]?) Posts/);
  return m ? { followers: parseCount(m[1]), posts: parseCount(m[2]) } : null;
}

export async function youtubeStats(url: string) {
  const base = url.split("?")[0].replace(/\/(videos|about|featured|shorts)\/?$/, "").replace(/\/$/, "");
  const html = await get(`${base}/videos`);
  if (!html) return null;
  const subs = html.match(/([\d.,]+[KMB]?) subscribers/);
  const ago = html.match(/(\d+) (hour|day|week|month|year)s? ago/);
  return { subscribers: parseCount(subs?.[1]), lastVideoDaysAgo: ago ? Math.round(Number(ago[1]) * AGO[ago[2]]) : null };
}

export async function linkedinStats(url: string) {
  const html = await get(url.split("?")[0]);
  const m = html?.match(/([\d,]+) followers/);
  return m ? { followers: parseCount(m[1]) } : null;
}

/** Links that look social but are tracking or share endpoints (facebook.com/tr is the Meta pixel). */
const NOT_PROFILE = /facebook\.com\/(tr|sharer|share|plugins|dialog|login)\b|instagram\.com\/(p|reel|explore|accounts)\/|youtube\.com\/(watch|embed)|linkedin\.com\/(shareArticle|sharing)|twitter\.com\/(intent|share)|x\.com\/(intent|share)/i;
export function cleanSocials(socials: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(socials ?? {}).filter(([, u]) => typeof u === "string" && !NOT_PROFILE.test(u)));
}

/** Stats for whichever profiles the site links; each read is independent and may come back empty. */
export async function readSocialStats(raw: Record<string, string>): Promise<SocialStats> {
  const socials = cleanSocials(raw);
  const [ig, yt, li] = await Promise.all([
    socials.instagram ? instagramStats(socials.instagram) : null,
    socials.youtube ? youtubeStats(socials.youtube) : null,
    socials.linkedin && /\/company\//.test(socials.linkedin) ? linkedinStats(socials.linkedin) : null,
  ]);
  return { ...(ig ? { instagram: ig } : {}), ...(yt ? { youtube: yt } : {}), ...(li ? { linkedin: li } : {}) };
}

/** Thresholds a social agency would call "needs help": small audience or a channel gone quiet. */
export const WEAK = { igFollowers: 1000, igPosts: 30, ytQuietDays: 90 };

export function socialSignals(raw: Record<string, string>, stats: SocialStats | null) {
  const socials = cleanSocials(raw);
  const any = ["instagram", "facebook", "linkedin", "youtube", "x"].some((k) => socials[k]);
  const sig: Record<string, boolean> = { no_social: !any, no_instagram: !socials.instagram };
  const notes: string[] = [];
  const ig = stats?.instagram;
  if (ig && (ig.followers !== null || ig.posts !== null)) {
    const weak = (ig.followers !== null && ig.followers < WEAK.igFollowers) || (ig.posts !== null && ig.posts < WEAK.igPosts);
    sig.weak_instagram = weak;
    notes.push(`Instagram ${ig.followers?.toLocaleString("en-IN") ?? "?"} followers, ${ig.posts ?? "?"} posts`);
  }
  const yt = stats?.youtube;
  if (yt && yt.lastVideoDaysAgo !== null) {
    sig.quiet_youtube = yt.lastVideoDaysAgo > WEAK.ytQuietDays;
    notes.push(`YouTube last video ~${yt.lastVideoDaysAgo} days ago${yt.subscribers !== null ? `, ${yt.subscribers.toLocaleString("en-IN")} subscribers` : ""}`);
  }
  if (stats?.linkedin?.followers != null) notes.push(`LinkedIn ${stats.linkedin.followers.toLocaleString("en-IN")} followers`);
  if (!any) notes.push("No social profiles linked from the website");
  return { sig, note: notes.join(" · ") || null };
}
