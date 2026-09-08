import { pseoSql } from "../../lib/pseo/db";
import { refreshCompany } from "../../lib/jobs/store";

/**
 * Runs the careers-page scraper over stored companies and reports where it fails.
 *
 * The point is as much the failure breakdown as the jobs: the scraper's own corpus notes say only
 * ~28-30% of reachable domains expose a careers page at all, so a low hit rate is expected and the
 * question is which part of the funnel is losing them. Grouping by scrape_status and scrape_error
 * is what turns "it didn't work" into something fixable -- a wave of site_unreachable is a fetch
 * problem, a wave of no_careers_page is a discovery problem, and they need opposite fixes.
 *
 * Concurrency is modest by default: each company can fire a dozen requests at an 8s timeout, and
 * the useful limit here is the remote sites' patience, not this machine's.
 *
 *   npx tsx scripts/jobs/crawl.ts [limit] [concurrency]
 */

async function main() {
  const limit = Number(process.argv[2] ?? 100);
  const concurrency = Number(process.argv[3] ?? 6);
  const sql = pseoSql;

  const pending = await sql<Array<{ id: string; domain: string }>>`
    SELECT id, domain FROM job_companies
     WHERE scrape_status = 'pending'
        OR next_refresh_at IS NULL
        OR next_refresh_at <= now()
     ORDER BY (scrape_status = 'pending') DESC, next_refresh_at NULLS FIRST
     LIMIT ${limit}
  `;
  if (pending.length === 0) {
    process.stdout.write("==> nothing due\n");
    return;
  }
  process.stdout.write(`==> crawling ${pending.length} companies, concurrency ${concurrency}\n`);

  const started = Date.now();
  let done = 0;
  const queue = [...pending];
  async function worker() {
    for (;;) {
      const next = queue.shift();
      if (!next) return;
      try {
        await refreshCompany(next.id, next.domain);
      } catch (err) {
        // refreshCompany already records per-company failure in scrape_status/scrape_error; this
        // only guards the worker so one thrown request cannot end the whole batch.
        process.stderr.write(`   ${next.domain}: ${(err as Error).message}\n`);
      }
      done++;
      if (done % 25 === 0) process.stdout.write(`   ${done}/${pending.length}\n`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, worker));

  const ids = pending.map((p) => p.id);
  const outcome = await sql<Array<{ scrape_status: string; scrape_error: string | null; n: string }>>`
    SELECT scrape_status, scrape_error, count(*)::text AS n
      FROM job_companies WHERE id = ANY(${ids})
     GROUP BY 1, 2 ORDER BY count(*) DESC
  `;
  const jobs = await sql<Array<{ n: string; companies: string }>>`
    SELECT count(*)::text AS n, count(DISTINCT company_id)::text AS companies
      FROM job_listings WHERE company_id = ANY(${ids}) AND is_open = true
  `;

  const mins = ((Date.now() - started) / 60000).toFixed(1);
  process.stdout.write(`\n==> done in ${mins}m\n`);
  process.stdout.write(`==> open jobs: ${jobs[0]?.n ?? 0} across ${jobs[0]?.companies ?? 0} companies\n`);
  process.stdout.write("==> outcomes:\n");
  for (const o of outcome) {
    process.stdout.write(`    ${String(o.n).padStart(5)}  ${o.scrape_status}${o.scrape_error ? ` / ${o.scrape_error}` : ""}\n`);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
