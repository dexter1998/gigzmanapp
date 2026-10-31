/**
 * Typed door onto the shared enricher (enrich2.mjs — the AWS box's crawler, vendored by
 * scripts/sync-enricher.sh). The app always runs it in fast mode and through the SSRF-safe fetch.
 */

import { processDomain as rawProcess, configure } from "./enrich2.mjs";
import { robustFetch } from "../net";

export type EnrichedEmail = { email: string; surface: string; page?: string | null; same_domain: boolean; role: boolean; freemail?: boolean; person?: string; person_role?: string };
export type SiteSignals = {
  site_down: boolean; no_https?: boolean; no_mobile?: boolean; copyright_year?: number | null; old_copyright?: boolean;
  no_analytics?: boolean; no_ad_pixel?: boolean; no_booking?: boolean; has_whatsapp?: boolean; parked?: boolean;
};
export type EnrichedDomain = {
  domain: string; website: string; error?: string; final_url: string | null; signals: SiteSignals; cms: string | null;
  title: string | null; phones: string[]; socials: Record<string, string>; emails: EnrichedEmail[];
  best_email: string | null; tier: string; founder_name: string | null; founder_role: string | null; pages_fetched: number;
  leaders?: Array<{ name: string; role?: string }>;
  people?: Array<{ name: string; role?: string; page?: string }>;
};

(configure as unknown as (o: { fetch: typeof fetch }) => void)({ fetch: robustFetch });

type OnPage = (group: string, url: string, html: string) => void;

export async function enrichFast(domain: string, website: string, onPage?: OnPage): Promise<EnrichedDomain> {
  return (rawProcess as unknown as (row: Record<string, string>, opts: { fast: boolean; onPage?: OnPage }) => Promise<EnrichedDomain>)(
    { domain, website }, { fast: true, onPage });
}
