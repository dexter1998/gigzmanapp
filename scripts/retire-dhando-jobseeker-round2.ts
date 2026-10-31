/**
 * Second pass over the Dhando source lists for the job-seeker contamination.
 *
 *   npx tsx --env-file=.env.local scripts/retire-dhando-jobseeker-round2.ts <csv>
 *   npx tsx --env-file=.env.local scripts/retire-dhando-jobseeker-round2.ts <csv> --apply
 *
 * Needs the SSM tunnel open first: scripts/prod-tunnel.sh
 *
 * retire-dhando-jobseeker-lists.ts took out the four lists found by hand. Running that same
 * marker test across all 26 lists in the parsed CSV shows it stopped one list short. Markers as a
 * share of each list:
 *
 *   Electricals & Electronics 152083    23.4%   retired in round 1
 *   Chemist 22997                       17.0%   retired in round 1
 *   Event Management 87750               9.4%   retired in round 1
 *   Health Clubs & Fitness EXtra         8.5%   59 rows total, noise
 *   Event Planners & Organizers 15860    7.8%   NOT retired  <- this pass
 *   Gems & Jewellery 34267               6.1%   retired in round 1
 *   Institutes 11173                     5.8%   NOT retired  <- this pass, rows only
 *   everything else                      <2%
 *
 * The two gaps are not the same problem and do not get the same treatment.
 *
 * Event Planners & Organizers is the same data as the already-retired Event Management: the
 * company column holds employers, not clients -- Infosys Technologies, HPCL, IL&FS Investsmart,
 * Indian Army, DNA newspaper -- alongside 212 "fresher", 128 "currently unemployed" and 47 "nil".
 * 1,695 rows have no company at all. Whoever wrote "Infosys" there is an employee answering a job
 * form, and the 7.8% is a floor for the same reason it was in round 1: anyone who named a real
 * employer passes the test and should not. The whole list goes.
 *
 * Institutes is the opposite shape. Arena Animation, VETA, CADD Centre, IIHT, Institute of
 * Management Technology are real businesses with real Google Business Profiles, and the category
 * column is populated and specific throughout. It is a business list with 131 job-seeker rows
 * mixed in, so only the rows that carry a marker are retired, not the list.
 *
 * Sets do_not_send only. Nothing is deleted.
 */
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { useProdDb } from "../lib/db-prod";

/** Same splitter as load-dhando-icp.ts. Round 1 only needed the first and last column, which
 *  indexOf/lastIndexOf can find safely; this pass reads `company`, and a quoted comma inside a
 *  business name would shift every column after it. */
function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (const ch of line) {
    if (ch === '"') { q = !q; continue; }
    if (ch === "," && !q) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

const CAMPAIGN_ID = "dhando_reviews_2026";

/** Retired whole, like round 1's four. */
const CONTAMINATED_LISTS = new Set([
  "Event Planners & Organizers 15860",
]);

/** Business lists where only the marker rows go. */
const ROW_LEVEL_LISTS = new Set([
  "Institutes 11173",
  "Health Clubs & Fitness Centres  EXtra",
]);

/** Deliberately narrower than the survey regex: this one decides individual rows, so it matches
 *  only self-declarations of employment status, never a company name that merely looks personal. */
const MARKER = /^(fresher|freshers|currently unemployed|not employed currently|un ?employed|nil|none|n\/?a|no|student|house ?wife|retired|self|searching|looking for job)\b/i;

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) { console.error("usage: retire-dhando-jobseeker-round2.ts <csv> [--apply]"); process.exit(1); }
  const apply = process.argv.includes("--apply");

  const target = await useProdDb();
  console.log(`db: ${target.user}@${target.host}/${target.database} (via tunnel)`);
  const { sql } = await import("../lib/db");

  const drop = new Set<string>();
  const why: Record<string, number> = {};
  const rl = createInterface({ input: createReadStream(csvPath), crlfDelay: Infinity });
  let header = true;
  for await (const line of rl) {
    if (header) { header = false; continue; }
    if (!line) continue;
    // email,name,company,city,category,list
    const [rawEmail, , rawCompany, , , rawList] = splitCsv(line);
    const list = (rawList ?? "").trim();
    const whole = CONTAMINATED_LISTS.has(list);
    const rowLevel = ROW_LEVEL_LISTS.has(list);
    if (!whole && !rowLevel) continue;

    const email = (rawEmail ?? "").trim().toLowerCase();
    if (!email) continue;
    const company = (rawCompany ?? "").trim();
    if (rowLevel && !MARKER.test(company)) continue;

    drop.add(email);
    const key = whole ? `${list} (whole list)` : `${list} (marker rows)`;
    why[key] = (why[key] ?? 0) + 1;
  }
  console.log("to retire:", why);
  console.log(`distinct addresses: ${drop.size}`);

  const emails = [...drop];
  await sql`CREATE TEMP TABLE _drop2 (email text PRIMARY KEY)`;
  for (let i = 0; i < emails.length; i += 5000) {
    await sql`INSERT INTO _drop2 ${sql(emails.slice(i, i + 5000).map((e) => ({ email: e })), "email")}
              ON CONFLICT DO NOTHING`;
  }
  await sql`ANALYZE _drop2`;

  console.table(await sql`
    SELECT count(*)::int in_campaign,
           count(*) FILTER (WHERE r.touch_count = 0 AND r.do_not_send = false)::int still_unsent,
           count(*) FILTER (WHERE r.touch_count > 0)::int already_mailed,
           count(*) FILTER (WHERE r.do_not_send)::int already_retired
      FROM _drop2 d JOIN campaign_recipients r
        ON r.email = d.email AND r.campaign_id = ${CAMPAIGN_ID}`);

  if (!apply) { console.log("\nDRY RUN — pass --apply"); await sql.end(); return; }

  const res = await sql`
    UPDATE campaign_recipients r
       SET do_not_send = true, do_not_send_reason = 'jobseeker_list',
           state = 'suppressed', state_changed_at = now()
      FROM _drop2 d
     WHERE r.email = d.email AND r.campaign_id = ${CAMPAIGN_ID} AND r.do_not_send = false`;
  console.log(`retired: ${res.count}`);

  console.table(await sql`
    SELECT count(*)::int total,
           count(*) FILTER (WHERE do_not_send)::int retired,
           count(*) FILTER (WHERE touch_count = 0 AND do_not_send = false)::int sendable_left
      FROM campaign_recipients WHERE campaign_id = ${CAMPAIGN_ID} AND source = 'dhando_icp_2026'`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
