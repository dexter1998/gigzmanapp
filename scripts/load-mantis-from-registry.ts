/**
 * Feeds the Mantis campaign from the scraping registry.
 *
 *   npx tsx scripts/load-mantis-from-registry.ts                  # dry run
 *   npx tsx scripts/load-mantis-from-registry.ts --write
 *   npx tsx scripts/load-mantis-from-registry.ts --write --limit 5000
 *
 * The registry's own flags are not enough on their own. Measured before writing this: it called
 * 51,377 of these addresses sendable, but 17,647 had already been mailed and 12,332 were known bad
 * on our side — hard bounces, complaints and unsubscribes that scrape_emails has never heard
 * about, because sent_at has never once been written back (0 of 238,443 rows). Trusting the
 * registry alone would have re-mailed people who asked to stop, which is what suspends an account.
 *
 * So eligibility is the intersection of both stores, and the write-back at the end is what stops
 * this divergence growing again.
 */
import { sql } from "../lib/db";
import { resolveTz } from "../lib/outreach/send-time";

const CAMPAIGN_ID = "mantis_cold_outreach_2026";
const REGISTRY_TAG = "mantis-agency";
const BUCKETS = ["generic_t1", "generic_t2", "generic_t3"];

/**
 * Germany and Austria require prior consent for B2B cold email under UWG §7, so they are excluded
 * rather than filtered in. The exposure here is 14 addresses out of 32,238 — the rule costs
 * nothing to honour and everything to discover the hard way.
 */
const DACH_TLD = /\.(de|at|ch)$/i;
const DACH_COUNTRY = new Set(["germany", "austria", "switzerland", "de", "at", "ch"]);

/**
 * A company name fit to put in a subject line.
 *
 * 15% of these are over 40 characters and 6% contain a pipe or a URL, because they were read off
 * the page title rather than the business name — "Adfluentics Digital | Marketing Agency Indore".
 * The same data shipped in a live subject line earlier today: "500 free credits to try Mantis,
 * https://www.digitalpatda.com". Everything past the first separator is SEO filler, and anything
 * still too long or still containing a URL is not a name at all.
 */
export function cleanCompany(raw: string | null | undefined): string | null {
  let s = (raw ?? "").trim();
  if (!s) return null;
  s = s.split(/[|–—]/)[0].trim();
  s = s.replace(/\s*[-–—:]\s*(best|top|leading|no\.?\s*1|#1)\b.*$/i, "").trim();
  if (/^https?:/i.test(s) || /\bwww\./i.test(s)) return null;
  if (s.length < 2 || s.length > 40) return null;
  if (!/[A-Za-z]/.test(s)) return null;
  return s;
}

type Row = {
  email: string; domain: string; bucket: string;
  company: string | null; country: string | null;
};

async function main() {
  const write = process.argv.includes("--write");
  const li = process.argv.indexOf("--limit");
  const limit = li > -1 ? Number(process.argv[li + 1]) : 200000;

  // One predicate, both stores. The comma test is exact: campaigns is a list, and
  // LIKE '%mantis-agency%' would also match 'mantis-agency-old'.
  // The campaign's own default, not the module's. resolveTz falls back to America/New_York, which
  // is right for Stickly and half a planet wrong for Mantis — the backfill dry run caught this
  // once already and the first run of this loader put every one of these on New York time.
  const [campaign] = await sql`SELECT default_tz FROM campaigns WHERE id = ${CAMPAIGN_ID}`;
  const campaignDefaultTz = (campaign?.default_tz as string) ?? "America/New_York";
  console.log(`campaign default tz: ${campaignDefaultTz}`);

  const rows = (await sql`
    WITH mailed AS (
      SELECT DISTINCT lower(recipient) AS e FROM email_sends WHERE ses_message_id IS NOT NULL
    ), bad AS (
      SELECT DISTINCT lower(email) AS e FROM campaign_recipients
       WHERE do_not_send_reason IN ('hard_mta','complaint','unsubscribed',
                                    'validation_suppressed','on_suppression_list','send_rejected')
      UNION
      SELECT lower(email) FROM email_unsubscribes
    )
    SELECT lower(se.email) AS email, se.domain, se.bucket, sd.company, sd.country
      FROM scrape_emails se
      LEFT JOIN scrape_domains sd ON sd.domain = se.domain
     WHERE ',' || se.campaigns || ',' LIKE ${'%,' + REGISTRY_TAG + ',%'}
       AND se.bucket = ANY(${BUCKETS})
       AND NOT se.suppressed AND NOT se.bounced
       AND se.mx_ok IS NOT FALSE
       AND se.sent_at IS NULL
       AND lower(se.email) NOT IN (SELECT e FROM mailed)
       AND lower(se.email) NOT IN (SELECT e FROM bad)
     ORDER BY se.bucket, se.domain
     LIMIT ${limit}
  `) as unknown as Row[];

  const keep: { email: string; values: Record<string, string>; source: string; tz: string; tzSource: string }[] = [];
  const drop = { dach: 0, dupe: 0 };
  const seen = new Set<string>();

  for (const r of rows) {
    if (seen.has(r.email)) { drop.dupe++; continue; }
    if (DACH_TLD.test(r.domain) || DACH_COUNTRY.has((r.country ?? "").trim().toLowerCase())) { drop.dach++; continue; }
    seen.add(r.email);
    const company = cleanCompany(r.company);
    const r2 = resolveTz({ country: r.country, domain: r.domain });
    const tz = r2.source === "default" ? campaignDefaultTz : r2.tz;
    const source = r2.source;
    keep.push({
      email: r.email,
      // A shared inbox has no person behind it, so the company is the only honest address form.
      values: { company: company ?? "your agency", domain: r.domain },
      source: `registry_${r.bucket}`,
      tz, tzSource: source,
    });
  }

  const byBucket: Record<string, number> = {};
  for (const k of keep) byBucket[k.source] = (byBucket[k.source] ?? 0) + 1;
  const named = keep.filter((k) => k.values.company !== "your agency").length;

  console.log(`eligible after both stores: ${rows.length}`);
  console.log(`dropped: ${JSON.stringify(drop)}`);
  console.log(`to load: ${keep.length}`);
  for (const [b, n] of Object.entries(byBucket).sort((a, b2) => b2[1] - a[1])) console.log(`  ${b.padEnd(20)} ${n}`);
  console.log(`with a usable company name: ${named} (${((100 * named) / keep.length).toFixed(1)}%)`);
  console.log("\nsample:");
  for (const k of keep.slice(0, 6)) console.log(`  ${k.email.padEnd(34)} ${k.values.company.padEnd(32)} ${k.tz}`);

  if (!write) { console.log("\nDRY RUN — pass --write"); await sql.end(); return; }

  let inserted = 0;
  for (let i = 0; i < keep.length; i += 1000) {
    const chunk = keep.slice(i, i + 1000);
    const res = await sql`
      INSERT INTO campaign_recipients ${sql(
        chunk.map((k) => ({
          campaign_id: CAMPAIGN_ID,
          email: k.email,
          values: sql.json(k.values) as unknown as string,
          source: k.source,
          send_tz: k.tz,
          send_tz_source: k.tzSource,
        })),
        "campaign_id", "email", "values", "source", "send_tz", "send_tz_source"
      )}
      ON CONFLICT (campaign_id, email) DO NOTHING
    `;
    inserted += res.count ?? 0;
    if (i % 10000 === 0) console.log(`  ${i + chunk.length}/${keep.length}`);
  }
  console.log(`inserted ${inserted}`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
