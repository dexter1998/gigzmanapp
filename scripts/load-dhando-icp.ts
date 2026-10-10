/**
 * Loads the local-business directories into the Dhando campaign.
 *
 *   npx tsx --env-file=.env.local scripts/load-dhando-icp.ts <csv>          # dry run
 *   npx tsx --env-file=.env.local scripts/load-dhando-icp.ts <csv> --load
 *
 * Needs the SSM tunnel open first: scripts/prod-tunnel.sh
 *
 * These are chemists, jewellers, gyms, photographers, electricals stores, event organisers and
 * the Sulekha yellow-pages listings -- businesses with a Google Business Profile and a reason to
 * want reviews, which is what the Dhando mail is actually about. They are deliberately NOT the
 * Mantis pool, which is web agencies and IT firms, and deliberately not the consumer sets in the
 * same archives (students, car owners, PAN holders, community-segmented lists): those are private
 * individuals, not businesses, and none of them want this pitch.
 *
 * Nothing here is verified. The plan is that SES's own validation suppresses the dead addresses
 * on the first send, and those suppressions do not touch Reputation.BounceRate -- measured on
 * 2026-10-07, raw Bounce ran 22-43% of sends while the reputation metric read 4-5%, because it
 * counts Permanent/General only. So a first pass over a raw list is cheap in reputation terms and
 * leaves behind a pool of proven-deliverable addresses to sequence against.
 */
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { useProdDb } from "../lib/db-prod";

const CAMPAIGN_ID = "dhando_reviews_2026";
const SOURCE = "dhando_icp_2026";
const SEND_TZ = "Asia/Kolkata";

const MACHINE = /^(dmarc|postmaster|abuse|noreply|no-reply|donotreply|bounce|mailer-daemon|webmaster|hostmaster|security|privacy|legal)/i;
const COMPLIANCE = /(^|[._+-])(dpo|gdpr|privacy|abuse|legal|compliance|dmarc|postmaster|hostmaster)([._+-]|[0-9]|$)/i;
const SYNTAX = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

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

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) { console.error("usage: load-dhando-icp.ts <csv> [--load]"); process.exit(1); }
  const doLoad = process.argv.includes("--load");

  const target = await useProdDb();
  console.log(`db: ${target.user}@${target.host}/${target.database} (via tunnel)`);
  const { sql } = await import("../lib/db");

  const reasons: Record<string, number> = {};
  const bump = (k: string) => { reasons[k] = (reasons[k] ?? 0) + 1; };
  const byList: Record<string, number> = {};

  // Streamed: the file is 600k rows and there is no reason to hold it all in memory.
  const cands = new Map<string, { company: string; list: string }>();
  const rl = createInterface({ input: createReadStream(csvPath), crlfDelay: Infinity });
  let header = true;
  for await (const line of rl) {
    if (header) { header = false; continue; }
    if (!line) continue;
    const [email, , company, , , list] = splitCsv(line);
    const e = (email ?? "").trim().toLowerCase();
    const lp = e.split("@")[0] ?? "";
    if (!SYNTAX.test(e)) { bump("bad_syntax"); continue; }
    if (MACHINE.test(lp)) { bump("machine_mailbox"); continue; }
    if (COMPLIANCE.test(lp)) { bump("compliance_mailbox"); continue; }
    // Role inboxes are kept here, unlike the Mantis load: for a corner shop, info@ or the owner's
    // gmail IS the business, and dropping them would remove most of the list for no gain.
    if (cands.has(e)) { bump("duplicate_in_file"); continue; }
    cands.set(e, { company: (company ?? "").trim(), list: (list ?? "").trim() });
    byList[list ?? ""] = (byList[list ?? ""] ?? 0) + 1;
  }
  console.log("filtered out:", reasons);
  console.log(`candidates: ${cands.size}`);

  const emails = [...cands.keys()];
  await sql`CREATE TEMP TABLE _in (email text PRIMARY KEY)`;
  for (let i = 0; i < emails.length; i += 5000) {
    await sql`INSERT INTO _in ${sql(emails.slice(i, i + 5000).map((e) => ({ email: e })), "email")}
              ON CONFLICT DO NOTHING`;
  }
  await sql`ANALYZE _in`;

  const [clash] = await sql`
    SELECT
      (SELECT count(*)::int FROM _in i JOIN campaign_recipients r
         ON r.email = i.email AND r.campaign_id = ${CAMPAIGN_ID}) already_in_dhando,
      (SELECT count(*)::int FROM _in i JOIN email_unsubscribes u ON lower(u.email) = i.email) unsubscribed,
      (SELECT count(*)::int FROM _in i JOIN campaign_recipients r
         ON r.email = i.email AND r.bounce_kind IS NOT NULL) known_bad`;
  console.log("overlap with what we already have:", clash);

  // Excluded, in order of how much each matters: anyone already in this campaign (the unique index
  // would refuse the send anyway), anyone who unsubscribed, and any address that has already
  // bounced for us -- re-sending to an address on SES's suppression list produces a counted bounce,
  // which is the one outcome this whole approach is built to avoid.
  const blocked = new Set<string>(
    ((await sql`
      SELECT i.email FROM _in i JOIN campaign_recipients r
        ON r.email = i.email AND r.campaign_id = ${CAMPAIGN_ID}
      UNION
      SELECT i.email FROM _in i JOIN email_unsubscribes u ON lower(u.email) = i.email
      UNION
      SELECT i.email FROM _in i JOIN campaign_recipients r
        ON r.email = i.email AND r.bounce_kind IS NOT NULL`) as unknown as { email: string }[])
      .map((r) => r.email)
  );
  const keep = emails.filter((e) => !blocked.has(e));
  console.log(`loadable: ${keep.length}`);
  console.log("by list:", Object.fromEntries(Object.entries(byList).sort((a, b) => b[1] - a[1]).slice(0, 12)));

  if (!doLoad) { console.log("\nDRY RUN — pass --load"); await sql.end(); return; }

  let inserted = 0;
  for (let i = 0; i < keep.length; i += 1000) {
    const batch = keep.slice(i, i + 1000).map((e) => {
      const c = cands.get(e)!;
      return {
        campaign_id: CAMPAIGN_ID,
        email: e,
        values: sql.json({ company: c.company || "your business" }) as unknown as string,
        source: SOURCE,
        send_tz: SEND_TZ,
        send_tz_source: "country",
      };
    });
    const res = await sql`
      INSERT INTO campaign_recipients ${sql(batch, "campaign_id", "email", "values", "source", "send_tz", "send_tz_source")}
      ON CONFLICT (campaign_id, email) DO NOTHING`;
    inserted += res.count ?? 0;
    if (inserted % 50000 < 1000) console.log(`  ${inserted}/${keep.length}`);
  }
  console.log(`inserted ${inserted}`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
