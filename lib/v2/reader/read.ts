/**
 * Everything the Qualifier reads off a company's own website, in one call and with no database:
 * the multi-page crawl (enricher), the careers page, the site extras (forms, secrets, SSL, email DNS,
 * offerings…), public social counts and hotel booking-engine fingerprints.
 *
 * Runs in two places: inside the app (local dev, or when the box is unreachable) and on the AWS
 * enrichment box behind services/site-reader (production — the box does the fetching, the app keeps
 * the facts store and every DB write). Paid lookups (Exa, Places) never come here.
 */
import { enrichFast, type EnrichedDomain } from "../enricher";
import { fetchPage, htmlToText } from "../net";
import { readHiring, type Hiring } from "../signals/hiring";
import { readSiteExtra, type SiteExtra, type SitePage } from "../signals/site-extra";
import { readSocialStats, cleanSocials, type SocialStats } from "../signals/social";
import { hasBookingEngine } from "../signals/booking-engine";

export type ReadRequest = {
  domain: string;
  website: string;
  /** What is still needed — facts the app already holds fresh are not read again. */
  want: { enrich?: boolean; hiring?: boolean; extra?: boolean; social?: boolean; engine?: boolean };
  /** Social profile URLs, when the site was not crawled this time (registry hit). */
  socials?: Record<string, string>;
};

export type ReadResult = {
  enriched?: EnrichedDomain | null;
  /** The home page was reachable (hiring / extras / engine need it). */
  homeOk: boolean;
  hiring?: Hiring | null;
  extra?: SiteExtra | null;
  socialStats?: SocialStats | null;
  engine?: { found: boolean; engines: string[] } | null;
  /** Visible text of the pages this read already fetched (home first), capped — the extra lead
   *  columns are summarised from it (lib/v2/extras.ts) without fetching anything again. */
  text?: string;
  ms: number;
};

/** Home + the crawl's other pages as plain text, ~7k chars, pages that say most about the business first. */
export function pagesText(home: { url: string; html: string } | null, pages: SitePage[], max = 7000): string {
  const rank = (g: string) => (/about|team|leader|company/i.test(g) ? 0 : /service|product|offer|menu|pricing/i.test(g) ? 1 : /contact/i.test(g) ? 3 : 2);
  const list = [...(home ? [{ group: "home", url: home.url, html: home.html }] : []), ...[...pages].sort((a, b) => rank(a.group) - rank(b.group))];
  const parts: string[] = [];
  let left = max;
  for (const p of list) {
    if (left < 200) break;
    const t = htmlToText(p.html, Math.min(p.group === "home" ? 3000 : 2000, left));
    if (t.length < 40) continue;
    parts.push(`### ${p.url}\n${t}`);
    left -= t.length;
  }
  return parts.join("\n\n");
}

export async function readSite(req: ReadRequest): Promise<ReadResult> {
  const t0 = Date.now();
  let home: { url: string; html: string } | null = null;
  const pages: SitePage[] = [];
  let enriched: EnrichedDomain | null | undefined;
  if (req.want.enrich) {
    enriched = await enrichFast(req.domain, req.website, (group, url, html) => {
      if (group === "home" && !home) home = { url, html }; else pages.push({ group, url, html });
    }).catch(() => null);
  }
  const needHome = req.want.hiring || req.want.extra || req.want.engine;
  if (needHome && !home) {
    const pg = await fetchPage(req.website, 7000).catch(() => null);
    if (pg?.html) home = { url: pg.url, html: pg.html };
  }
  const hp = home as { url: string; html: string } | null;
  const socials = cleanSocials(enriched?.socials ?? req.socials ?? {});
  const [hiring, extra, socialStats] = await Promise.all([
    req.want.hiring && hp ? readHiring(hp.html, hp.url).catch(() => null) : Promise.resolve(undefined),
    req.want.extra && hp ? readSiteExtra({ homeUrl: hp.url, homeHtml: hp.html, pages }).catch(() => null) : Promise.resolve(undefined),
    req.want.social ? readSocialStats(socials).catch(() => null) : Promise.resolve(undefined),
  ]);
  return {
    ...(req.want.enrich ? { enriched } : {}),
    homeOk: !!hp,
    ...(req.want.hiring ? { hiring: hiring ?? null } : {}),
    ...(req.want.extra ? { extra: extra ?? null } : {}),
    ...(req.want.social ? { socialStats: socialStats ?? null } : {}),
    ...(req.want.engine ? { engine: hp ? hasBookingEngine(hp.html) : null } : {}),
    ...(hp || pages.length ? { text: pagesText(hp, pages) } : {}),
    ms: Date.now() - t0,
  };
}
