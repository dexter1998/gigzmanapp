/**
 * Retires the four source lists that turned out to be job-seeker data, not businesses.
 *
 *   npx tsx --env-file=.env.local scripts/retire-dhando-jobseeker-lists.ts <csv>
 *   npx tsx --env-file=.env.local scripts/retire-dhando-jobseeker-lists.ts <csv> --apply
 *
 * Needs the SSM tunnel open first: scripts/prod-tunnel.sh
 *
 * The archives label these by profession, and the label misled me: "Chemists Database" is
 * chemistry professionals, not medical stores. The rows carry an employer in the company column
 * -- Cadila Pharmaceuticals, Gharda Chem, RUSAN Pharma -- and thousands say "fresher" or "not
 * employed currently" outright. They are individuals with jobs or looking for one, and a pitch
 * about getting more reviews on a Google Business Profile means nothing to them.
 *
 * The explicit markers run 18.3% on Electricals and 13.5% on Chemist 22997, and that is only the
 * floor: anyone who wrote a real employer name is counted as clean by that test and is not. The
 * whole of each affected list goes, rather than the rows that happen to admit it.
 *
 * This only sets do_not_send. Nothing is deleted, so if a list turns out to be salvageable the
 * rows are still there to re-enable.
 */
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { useProdDb } from "../lib/db-prod";

const CAMPAIGN_ID = "dhando_reviews_2026";

/** Matched against the CSV's trailing list column. */
const CONTAMINATED = new Set([
  "Electricals & Electronics 152083",
  "Chemist 22997",
  "Event Management 87750",
  "Gems & Jewellery 34267",
]);

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) { console.error("usage: retire-dhando-jobseeker-lists.ts <csv> [--apply]"); process.exit(1); }
  const apply = process.argv.includes("--apply");

  const target = await useProdDb();
  console.log(`db: ${target.user}@${target.host}/${target.database} (via tunnel)`);
  const { sql } = await import("../lib/db");

  const drop = new Set<string>();
  const perList: Record<string, number> = {};
  const rl = createInterface({ input: createReadStream(csvPath), crlfDelay: Infinity });
  let header = true;
  for await (const line of rl) {
    if (header) { header = false; continue; }
    if (!line) continue;
    const i = line.lastIndexOf(",");
    if (i < 0) continue;
    const list = line.slice(i + 1).trim();
    if (!CONTAMINATED.has(list)) continue;
    const email = line.slice(0, line.indexOf(",")).trim().toLowerCase();
    if (!email) continue;
    drop.add(email);
    perList[list] = (perList[list] ?? 0) + 1;
  }
  console.log("to retire, by list:", perList);
  console.log(`distinct addresses: ${drop.size}`);

  const emails = [...drop];
  await sql`CREATE TEMP TABLE _drop (email text PRIMARY KEY)`;
  for (let i = 0; i < emails.length; i += 5000) {
    await sql`INSERT INTO _drop ${sql(emails.slice(i, i + 5000).map((e) => ({ email: e })), "email")}
              ON CONFLICT DO NOTHING`;
  }
  await sql`ANALYZE _drop`;

  const [before] = await sql`
    SELECT count(*)::int in_campaign,
           count(*) FILTER (WHERE r.touch_count = 0 AND r.do_not_send = false)::int still_unsent,
           count(*) FILTER (WHERE r.touch_count > 0)::int already_mailed
      FROM _drop d JOIN campaign_recipients r
        ON r.email = d.email AND r.campaign_id = ${CAMPAIGN_ID}`;
  console.log("of those, in the Dhando campaign:", before);

  if (!apply) { console.log("\nDRY RUN — pass --apply"); await sql.end(); return; }

  const res = await sql`
    UPDATE campaign_recipients r
       SET do_not_send = true, state = 'suppressed', state_changed_at = now()
      FROM _drop d
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
