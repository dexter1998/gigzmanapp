import { pseoSql } from "../../lib/pseo/db";

/**
 * What each scraped category is actually worth, so the phrase list is pruned from measurement
 * rather than from taste.
 *
 * The first narrowing of JOBS_ELIGIBLE_SECTIONS (14 sections down to 6) was decided from a single
 * live run of six companies. That was the right call on the evidence available and is far too
 * small a sample to keep steering by. This report is the replacement: every company keeps the raw
 * label gosom gave it, so yield can be counted per category and per country.
 *
 * "Reached" is the honest denominator -- companies whose site we could actually load. A category
 * full of dead domains would otherwise look like a category full of non-hirers, and those need
 * opposite responses (drop the phrase vs fix the fetch).
 *
 *   npx tsx scripts/jobs/yield.ts [--country=in] [--min=5]
 */

function arg(name: string): string | null {
  const f = process.argv.find((a) => a.startsWith(`--${name}=`));
  return f ? f.slice(name.length + 3) : null;
}

async function main() {
  const country = arg("country");
  const min = Number(arg("min") ?? 5);
  const sql = pseoSql;

  const rows = await sql<Array<{
    category: string | null; total: string; reached: string; with_jobs: string; jobs: string;
    no_careers: string; unreachable: string; shell: string;
  }>>`
    SELECT c.category,
           count(*)::text                                                        AS total,
           count(*) FILTER (WHERE c.scrape_status <> 'failed'
                              AND c.scrape_status <> 'pending')::text            AS reached,
           count(*) FILTER (WHERE j.n > 0)::text                                 AS with_jobs,
           COALESCE(sum(j.n), 0)::text                                           AS jobs,
           count(*) FILTER (WHERE c.scrape_status = 'no_careers_page')::text     AS no_careers,
           count(*) FILTER (WHERE c.scrape_error = 'site_unreachable')::text     AS unreachable,
           count(*) FILTER (WHERE c.scrape_error = 'careers_page_empty_shell')::text AS shell
      FROM job_companies c
      LEFT JOIN LATERAL (
        SELECT count(*) AS n FROM job_listings l WHERE l.company_id = c.id AND l.is_open
      ) j ON true
     WHERE c.golden_tier IS NULL
       AND c.scrape_status <> 'pending'
       ${country ? sql`AND c.country_code = ${country}` : sql``}
     GROUP BY c.category
    HAVING count(*) >= ${min}
     ORDER BY count(*) FILTER (WHERE j.n > 0)::float / NULLIF(count(*), 0) DESC, count(*) DESC
  `;

  if (rows.length === 0) {
    process.stdout.write("==> no categories with enough crawled companies yet\n");
    return;
  }

  process.stdout.write(
    `\n${"category".padEnd(38)}${"n".padStart(6)}${"hit%".padStart(7)}${"jobs".padStart(7)}` +
      `${"noCar%".padStart(8)}${"dead%".padStart(7)}${"shell%".padStart(8)}\n`,
  );
  process.stdout.write("-".repeat(81) + "\n");
  const pct = (a: string, b: string) => (Number(b) === 0 ? "-" : `${((Number(a) / Number(b)) * 100).toFixed(0)}%`);
  for (const r of rows) {
    process.stdout.write(
      `${(r.category ?? "(none)").slice(0, 37).padEnd(38)}` +
        `${r.total.padStart(6)}${pct(r.with_jobs, r.total).padStart(7)}${r.jobs.padStart(7)}` +
        `${pct(r.no_careers, r.total).padStart(8)}${pct(r.unreachable, r.total).padStart(7)}` +
        `${pct(r.shell, r.total).padStart(8)}\n`,
    );
  }
  process.stdout.write(
    "\nhit% = companies that produced at least one open role. Categories sitting near 0% across a\n" +
      "few hundred companies are the ones to drop from scripts/jobs/phrases.ts. A high shell% means\n" +
      "the opposite -- those pages are JS-rendered and are lost to the fetcher, not to the category.\n",
  );
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
