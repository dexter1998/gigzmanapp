/**
 * Persistence for scraped jobs: takes a raw ScrapeResult, normalizes it, and reconciles it against
 * what is already stored for that company.
 *
 * Reconciliation rather than replace-all, because job_applications reference listings: a role the
 * user applied to must survive its disappearance from the source page. Roles that vanish are
 * closed (is_open = false), never deleted.
 */

import { createHash } from "node:crypto";
import { sql } from "@/lib/db";
import { scrapeCompanyJobs, type ScrapeResult } from "./scraper";
import { normalizeJob } from "./normalize";
import { goldenTierFor, normalizeDomain } from "./golden";

/** How long a company's listings are considered fresh. */
export const REFRESH_INTERVAL_DAYS = 10;

/**
 * Identity for a listing. Title + location rather than URL: heuristic-scraped sites routinely
 * change a posting's URL between refreshes (slug rewrites, pagination, cache-busting query
 * strings), and a URL-keyed identity resurrects the same role as "new" every single scrape,
 * which would spam anyone with an alert on that company.
 */
function sourceHash(companyId: string, title: string, location: string | null): string {
  const normalized = `${title.toLowerCase().replace(/\s+/g, " ").trim()}|${(location ?? "").toLowerCase().trim()}`;
  return createHash("sha256").update(`${companyId}|${normalized}`).digest("hex");
}

function nextRefreshFrom(now: Date): Date {
  return new Date(now.getTime() + REFRESH_INTERVAL_DAYS * 24 * 60 * 60 * 1000);
}

export type UpsertCompanyInput = {
  domain: string;
  companyName?: string | null;
  leadId?: string | null;
  category?: string | null;
  lat?: number | null;
  lng?: number | null;
  citySlug?: string | null;
  countryCode?: string | null;
};

/** Registers a company as a jobs-discovery target. Idempotent on domain. */
export async function upsertJobCompany(input: UpsertCompanyInput): Promise<string | null> {
  const domain = normalizeDomain(input.domain);
  if (!domain) return null;

  const [row] = await sql`
    INSERT INTO job_companies (
      domain, company_name, lead_id, category, lat, lng, city_slug, country_code,
      favicon_url, golden_tier, next_refresh_at
    ) VALUES (
      ${domain}, ${input.companyName ?? null}, ${input.leadId ?? null}, ${input.category ?? null},
      ${input.lat ?? null}, ${input.lng ?? null}, ${input.citySlug ?? null}, ${input.countryCode ?? null},
      ${faviconFor(domain)}, ${goldenTierFor(domain)}, now()
    )
    ON CONFLICT (domain) DO UPDATE SET
      -- Only fill gaps on conflict. A later, thinner discovery pass (say a bare domain from a
      -- directory sweep) must not blank out details an earlier Places-backed pass established.
      company_name = COALESCE(job_companies.company_name, EXCLUDED.company_name),
      lead_id      = COALESCE(job_companies.lead_id, EXCLUDED.lead_id),
      category     = COALESCE(job_companies.category, EXCLUDED.category),
      lat          = COALESCE(job_companies.lat, EXCLUDED.lat),
      lng          = COALESCE(job_companies.lng, EXCLUDED.lng),
      city_slug    = COALESCE(job_companies.city_slug, EXCLUDED.city_slug),
      country_code = COALESCE(job_companies.country_code, EXCLUDED.country_code)
    RETURNING id
  `;
  return row?.id ?? null;
}

/** Google's favicon service — avoids a per-company fetch just to draw a 16px icon. */
function faviconFor(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

export type ReconcileStats = { inserted: number; updated: number; closed: number };

/**
 * Writes one scrape's worth of listings for a company and closes anything that has gone.
 * Returns counts so the cron can report what a run actually changed.
 */
export async function reconcileListings(companyId: string, result: ScrapeResult): Promise<ReconcileStats> {
  const now = new Date();
  const stats: ReconcileStats = { inserted: 0, updated: 0, closed: 0 };
  const seenHashes: string[] = [];

  for (const job of result.jobs) {
    if (!job.title?.trim()) continue;
    const hash = sourceHash(companyId, job.title, job.location);
    seenHashes.push(hash);

    const n = normalizeJob({ title: job.title, location: job.location, description: job.description });

    const [row] = await sql`
      INSERT INTO job_listings (
        company_id, source_hash, title, apply_url, location, description,
        job_family, seniority, seniority_rank, work_mode, employment_type,
        min_experience_years, max_experience_years,
        ctc_min_inr, ctc_max_inr, ctc_source, ctc_confidence,
        posted_at, is_open, first_seen_at, last_seen_at
      ) VALUES (
        ${companyId}, ${hash}, ${job.title.trim()}, ${job.url}, ${job.location}, ${job.description},
        ${n.jobFamily}, ${n.seniority}, ${n.seniorityRank}, ${n.workMode}, ${n.employmentType},
        ${n.minExperienceYears}, ${n.maxExperienceYears},
        ${n.ctcMinInr}, ${n.ctcMaxInr}, ${n.ctcMinInr ? "posting" : null}, ${n.ctcMinInr ? "high" : null},
        ${job.postedAt ? new Date(job.postedAt) : null}, true, ${now}, ${now}
      )
      ON CONFLICT (source_hash) DO UPDATE SET
        apply_url   = COALESCE(EXCLUDED.apply_url, job_listings.apply_url),
        description = COALESCE(EXCLUDED.description, job_listings.description),
        -- A listing seen again is open again: roles do get reposted, and leaving a reopened role
        -- closed would hide it forever.
        is_open     = true,
        closed_at   = NULL,
        last_seen_at = EXCLUDED.last_seen_at
      RETURNING (xmax = 0) AS inserted
    `;
    if (row?.inserted) stats.inserted++;
    else stats.updated++;
  }

  // Close whatever this company had that this scrape did not see. Guarded on the scrape having
  // actually succeeded: a failed fetch returns zero jobs, and treating that as "every role closed"
  // would wipe a company's listings on one bad network day.
  if (result.method) {
    const closed = await sql`
      UPDATE job_listings
         SET is_open = false, closed_at = ${now}
       WHERE company_id = ${companyId}
         AND is_open = true
         ${seenHashes.length ? sql`AND source_hash <> ALL(${seenHashes})` : sql``}
      RETURNING id
    `;
    stats.closed = closed.length;
  }

  return stats;
}

/** Scrapes one company and records the outcome, including failures. */
export async function refreshCompany(companyId: string, domain: string): Promise<ReconcileStats & { status: string }> {
  const result = await scrapeCompanyJobs(domain);
  const now = new Date();

  const status = result.method
    ? "ok"
    : result.error === "no_careers_page"
      ? "no_careers_page"
      : result.siteReachable
        ? "ok" // reachable careers page that simply lists nothing right now — not a failure
        : "failed";

  const stats = await reconcileListings(companyId, result);

  await sql`
    UPDATE job_companies SET
      careers_url       = COALESCE(${result.careersUrl}, careers_url),
      extraction_method = COALESCE(${result.method}, extraction_method),
      ats_platform      = COALESCE(${result.atsPlatform}, ats_platform),
      scraped_at        = ${now},
      -- A company with no careers page is re-checked far less often: it is the single largest
      -- bucket (~70% of domains) and re-scraping it every 10 days would spend most of the crawl
      -- budget confirming a negative. It still gets re-checked, just quarterly.
      next_refresh_at   = ${status === "no_careers_page"
        ? new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
        : nextRefreshFrom(now)},
      scrape_status     = ${status},
      scrape_error      = ${result.error}
    WHERE id = ${companyId}
  `;

  return { ...stats, status };
}

/**
 * Companies whose listings are stale, oldest first. Used by the jobs cron.
 *
 * Deliberately does NOT exclude scrape_status = 'failed'. A failure here is far more often a
 * transient network blip (timeout, DNS hiccup, momentary rate limit) than a permanently dead
 * domain -- excluding it forever meant one bad request on the very first crawl silently and
 * permanently dropped a real company out of the pipeline. next_refresh_at already paces retries
 * (10 days, same as a normal refresh -- see refreshCompany), so a domain that keeps genuinely
 * failing just keeps costing one cheap retry per cycle rather than being blacklisted on attempt one.
 */
export async function dueForRefresh(limit: number): Promise<Array<{ id: string; domain: string }>> {
  const rows = await sql`
    SELECT id, domain FROM job_companies
     WHERE next_refresh_at IS NULL OR next_refresh_at <= now()
     ORDER BY next_refresh_at NULLS FIRST
     LIMIT ${limit}
  `;
  return rows.map((r) => ({ id: r.id as string, domain: r.domain as string }));
}
