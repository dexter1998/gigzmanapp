/**
 * Backend signal enrichment for the lead-market pages (2026-10-24, Tarun: "apne enricher se wo
 * data khud backend pr enrich krlein"). Signal pages ("SEO leads", "digital-marketing leads", …)
 * need each business's website read; chat runs already do that for the leads they touch and store
 * the result in scrape_domains.site_signals. This fills the rest of the pSEO pool in small,
 * time-boxed batches through the same self-hosted site reader — no paid API, no Places calls.
 *
 * Same stored shape as the runner's live read (lib/v2/runner.ts qualifyOne), so either writer's
 * rows serve both: signals + cms/phones/socials/title/final_url/person/emails, checked_at, source.
 */

import { sql } from "@/lib/db";
import { readSiteVia } from "@/lib/v2/reader/client";
import { domainOf } from "@/lib/v2/net";
import { NOT_OWN_SITE } from "@/lib/v2/playbooks";

/** A read older than this is redone; the same window the runner trusts. */
const FRESH_DAYS = 60;

export type EnrichBatch = { picked: number; read: number; down: number; failed: number; ms: number };

/**
 * Read up to `limit` not-yet-read business websites from the pSEO pool, `concurrency` at a time,
 * stopping when `budgetMs` is spent. Biggest cities first, so the pages closest to the gate fill
 * soonest.
 */
export async function enrichPoolSignals(opts: { limit?: number; concurrency?: number; budgetMs?: number } = {}): Promise<EnrichBatch> {
  const limit = opts.limit ?? 40, conc = opts.concurrency ?? 6, budget = opts.budgetMs ?? 25_000;
  const t0 = Date.now();
  const rows = await sql`
    WITH sizes AS (SELECT city_slug, count(*) AS n FROM leads WHERE city_slug IS NOT NULL GROUP BY 1),
    pool AS (
      SELECT DISTINCT ON (d) l.website_url, l.business_name, l.category, l.city_slug,
             lower(regexp_replace(regexp_replace(l.website_url, '^https?://(www\\.)?', ''), '[/?#].*$', '')) AS d
      FROM leads l
      WHERE l.has_website AND l.website_url IS NOT NULL AND l.city_slug IS NOT NULL AND NOT l.is_competitor
    )
    SELECT p.website_url, p.business_name, p.category, p.d
    FROM pool p JOIN sizes z ON z.city_slug = p.city_slug LEFT JOIN scrape_domains s ON s.domain = p.d
    WHERE s.site_signals IS NULL OR (s.site_signals->>'checked_at')::timestamptz < now() - (${FRESH_DAYS} || ' days')::interval
    ORDER BY z.n DESC
    LIMIT ${limit}`;
  const out: EnrichBatch = { picked: rows.length, read: 0, down: 0, failed: 0, ms: 0 };
  const queue = rows.filter((r) => !NOT_OWN_SITE.test(String(r.website_url)));
  const worker = async () => {
    while (queue.length && Date.now() - t0 < budget) {
      const r = queue.shift()!;
      const website = String(r.website_url);
      const domain = domainOf(website);
      if (!domain) continue;
      try {
        const res = await readSiteVia({ domain, website, want: { enrich: true, hiring: false, extra: false, social: false, engine: false } });
        const e = res?.enriched ?? null;
        const site: Record<string, unknown> = e
          ? { ...e.signals, cms: e.cms, phones: e.phones, socials: e.socials, title: e.title, final_url: e.final_url,
              person: e.founder_name ? { name: e.founder_name, role: e.founder_role, email: e.best_email, tier: e.tier } : null,
              emails: (e.emails ?? []).filter((x) => x.same_domain || x.freemail).slice(0, 4).map((x) => ({ email: x.email, ...(x.person ? { person: x.person } : {}) })) }
          : { site_down: true };
        if (!e) out.down++; else out.read++;
        const stamped = { ...site, checked_at: new Date().toISOString(), source: "app" };
        await sql`
          INSERT INTO scrape_domains (domain, website, company, category, first_source, campaigns, status, site_signals)
          VALUES (${domain}, ${website}, ${String(r.business_name ?? "")}, ${(r.category as string) ?? null}, 'mantis-pseo', 'mantis-pseo', 'unknown', ${sql.json(stamped as Parameters<typeof sql.json>[0])})
          ON CONFLICT (domain) DO UPDATE SET site_signals = EXCLUDED.site_signals
            WHERE scrape_domains.site_signals IS NULL OR scrape_domains.site_signals->>'source' = 'app'`;
      } catch {
        out.failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: conc }, worker));
  out.ms = Date.now() - t0;
  return out;
}
