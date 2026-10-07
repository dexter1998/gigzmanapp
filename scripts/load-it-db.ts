/**
 * Loads the purchased "All India Database" lists into the Mantis campaign.
 *
 *   npx tsx --env-file=.env.local scripts/load-it-db.ts <csv>                    # dry run
 *   npx tsx --env-file=.env.local scripts/load-it-db.ts <csv> --load
 *   npx tsx --env-file=.env.local scripts/load-it-db.ts <csv> --load --limit 2000
 *
 * Needs the SSM tunnel open first: scripts/prod-tunnel.sh
 *
 * This list is shaped unlike the scraped registry and needs different handling:
 *
 * - 87% of it is freemail (gmail 14,863, yahoo 7,049, yahoo.co.in 5,554, rediffmail 5,059 of
 *   39,184), so the email domain is not the business. Deduplication is by company name instead,
 *   and the registry's "has this domain been contacted" check is meaningless here.
 * - It carries a Designation, which the scraped data does not. That is the only real buyer signal
 *   available before sending, so it is the filter: proprietors, directors and founders, not the
 *   HR/finance/QA managers who make up a large slice of the file.
 * - rediffmail and yahoo.co.in at this share suggest the data is years older than the file date.
 *   Expect heavy validation suppression; send a canary before the rest.
 */
import { readFileSync } from "node:fs";
import { useProdDb } from "../lib/db-prod";

type Sql = (typeof import("../lib/db"))["sql"];
let sql: Sql;

const CAMPAIGN_ID = "mantis_cold_outreach_2026";
const SOURCE = "purchased_db_2026";

/**
 * Which list a contact came from, best fit first. The list IS the targeting on this data: only
 * the IT file carries a Designation, so for every other file the category is the sole signal
 * about whether the person buys lead generation for web work. A canary therefore has to be drawn
 * in this order rather than at random, or it measures the weakest segment and tells us nothing
 * about the strongest.
 *
 * Web Development Services is absent deliberately: all 10,482 of its rows are phone-only, with
 * no email column at all.
 */
const LIST_PRIORITY = [
  "Web Designing Companies 2249_Extra",
  "Web Hosting Companies 1736 Extra",
  "Graphic Designers 47856",
  "IT - Information Technology 39185",
  "Freelancers 40026",
  "Freelancers 36390",
];
const SEND_TZ = "Asia/Kolkata"; // the whole file is Indian

/** Titles that decide on, or own, spend. */
const DECISION_MAKER = /\b(proprietor|owner|founder|co-?founder|director|managing director|chairman|chief executive|ceo|cto|coo|cmo|managing partner|partner|principal|president|vice president|vp|head|general manager|country manager|business head|promoter)\b/i;
/** Titles that sit inside a function and do not buy lead generation. */
const NOT_BUYER = /\b(hr|human resources|finance|accounts|accounting|payroll|admin|administration|facilities|quality|qa|testing|legal|compliance|purchase|procurement|logistics|warehouse|security|support|helpdesk|training|recruit)\b/i;

const MACHINE = /^(dmarc|postmaster|abuse|noreply|no-reply|donotreply|bounce|mailer-daemon|webmaster|hostmaster|security|privacy|legal)/i;
const COMPLIANCE = /(^|[._+-])(dpo|gdpr|privacy|abuse|legal|compliance|dmarc|postmaster|hostmaster|security)([._+-]|[0-9]|$)/i;
const ROLE = /(^|[._+-])(info|hello|contact|enquiry|enquiries|inquiry|inquiries|office|support|help|admin|team|mail|service|sales|accounts|hr|jobs|careers?|billing|marketing|webmaster|noreply|no-reply)([._+-]|[0-9]|$)/i;
const SYNTAX = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;
/** Providers whose Indian consumer mailboxes are largely abandoned; kept, but worth counting. */
const DEAD_ISH = /^(rediffmail\.com|rediff\.com|yahoo\.co\.in|yahoo\.in|indiatimes\.com|sify\.com|vsnl\.net|vsnl\.com|dataone\.in)$/i;

function normaliseCompany(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b(private|pvt|limited|ltd|llp|inc|incorporated|corp|corporation|co|company|and|&|technologies|technology|solutions|services|systems)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const head = lines[0].split(",");
  const out: Record<string, string>[] = [];
  for (const line of lines.slice(1)) {
    // The writer quoted any field containing a comma; nothing here contains a quoted quote.
    const cells: string[] = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { cells.push(cur); cur = ""; continue; }
      cur += ch;
    }
    cells.push(cur);
    const row: Record<string, string> = {};
    head.forEach((h, i) => { row[h] = (cells[i] ?? "").trim(); });
    out.push(row);
  }
  return out;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) { console.error("usage: load-it-db.ts <csv> [--load]"); process.exit(1); }
  const doLoad = process.argv.includes("--load");

  const target = await useProdDb();
  console.log(`db: ${target.user}@${target.host}/${target.database} (via tunnel)`);
  sql = (await import("../lib/db")).sql;

  const rows = parseCsv(readFileSync(csvPath, "utf8"));
  console.log(`csv rows: ${rows.length}`);

  const reasons: Record<string, number> = {};
  const bump = (k: string) => { reasons[k] = (reasons[k] ?? 0) + 1; };

  type Cand = { email: string; name: string; company: string; designation: string; key: string; list: string; rank: number };
  const cands: Cand[] = [];
  for (const r of rows) {
    const email = (r.email ?? "").toLowerCase();
    const lp = email.split("@")[0] ?? "";
    const dom = email.split("@")[1] ?? "";
    const dsg = r.designation ?? "";
    if (!SYNTAX.test(email)) { bump("bad_syntax"); continue; }
    if (MACHINE.test(lp)) { bump("machine_mailbox"); continue; }
    if (COMPLIANCE.test(lp)) { bump("compliance_mailbox"); continue; }
    if (ROLE.test(lp)) { bump("role_inbox"); continue; }
    // Designation is the only buyer signal this file carries, so it is used strictly: a title has
    // to look like an owner or a chief, and must not sit inside a non-buying function. A blank
    // designation is not a decision-maker claim and is dropped.
    // Only the IT file has designations. Where one exists it is used strictly; where the column
    // is simply absent, requiring it would silently discard every other list.
    if (dsg) {
      if (NOT_BUYER.test(dsg)) { bump("designation_not_buyer"); continue; }
      if (!DECISION_MAKER.test(dsg)) { bump("designation_not_decision_maker"); continue; }
    }
    if (DEAD_ISH.test(dom)) bump("note_legacy_provider_kept");
    const list = r.list ?? "";
    const rank = LIST_PRIORITY.indexOf(list);
    if (rank === -1) { bump(`unknown_list:${list || "(blank)"}`); continue; }
    const key = normaliseCompany(r.company ?? "") || `email:${email}`;
    cands.push({ email, name: r.name ?? "", company: r.company ?? "", designation: dsg, key, list, rank });
  }
  console.log("filtered out:", reasons);
  console.log(`candidates: ${cands.length}`);

  // One contact per company. The email domain cannot do this job on a 87%-freemail file: two
  // gmail addresses at the same firm look like two unrelated businesses.
  const byCompany = new Map<string, Cand>();
  for (const c of cands) {
    const prev = byCompany.get(c.key);
    if (!prev) { byCompany.set(c.key, c); continue; }
    // Prefer a corporate mailbox, then the more senior-sounding title.
    const score = (x: Cand) =>
      (/(gmail|yahoo|hotmail|rediff|outlook|icloud)\./i.test(x.email) ? 0 : 2) +
      (/\b(proprietor|owner|founder|chairman|chief executive|ceo|managing director)\b/i.test(x.designation) ? 1 : 0);
    if (score(c) > score(prev)) byCompany.set(c.key, c);
  }
  // Best-fit list first, so a --limit canary samples the strongest segment.
  const unique = [...byCompany.values()].sort((a, b) => a.rank - b.rank || a.email.localeCompare(b.email));
  console.log(`one per company: ${unique.length} (dropped ${cands.length - unique.length} extra contacts at the same firm)`);

  // Suppression is checked against all three stores, as always: our own sends, anything already in
  // a campaign, and unsubscribes.
  const emails = unique.map((u) => u.email);
  await sql`CREATE TEMP TABLE _in (email text PRIMARY KEY)`;
  for (let i = 0; i < emails.length; i += 5000) {
    await sql`INSERT INTO _in ${sql(emails.slice(i, i + 5000).map((e) => ({ email: e })), "email")}
              ON CONFLICT DO NOTHING`;
  }
  await sql`ANALYZE _in`;
  const [clash] = await sql`
    SELECT
      (SELECT count(*)::int FROM _in i JOIN email_sends s ON lower(s.recipient) = i.email
        WHERE s.ses_message_id IS NOT NULL) already_mailed,
      (SELECT count(*)::int FROM _in i JOIN campaign_recipients r ON r.email = i.email) in_campaign,
      (SELECT count(*)::int FROM _in i JOIN email_unsubscribes u ON lower(u.email) = i.email) unsubscribed`;
  console.log("overlap with what we already have:", clash);

  // Joins and a UNION, not three correlated EXISTS over 86,000 rows. email_sends has no index on
  // lower(recipient), so the EXISTS form planned a scan per row and ran for minutes; the
  // equivalent counting query directly above, written with plain joins, returns in seconds.
  const blocked = new Set<string>(
    ((await sql`
      SELECT i.email FROM _in i
        JOIN email_sends s ON lower(s.recipient) = i.email AND s.ses_message_id IS NOT NULL
      UNION
      SELECT i.email FROM _in i JOIN campaign_recipients r ON r.email = i.email
      UNION
      SELECT i.email FROM _in i JOIN email_unsubscribes u ON lower(u.email) = i.email`) as unknown as { email: string }[])
      .map((r) => r.email)
  );
  const all = unique.filter((u) => !blocked.has(u.email));
  const li = process.argv.indexOf("--limit");
  const limit = li > -1 ? Number(process.argv[li + 1]) : all.length;
  const keep = all.slice(0, limit);
  const byList: Record<string, number> = {};
  for (const k of keep) byList[k.list] = (byList[k.list] ?? 0) + 1;
  console.log(`loadable: ${all.length}${limit < all.length ? `, taking first ${keep.length} by list priority` : ""}`);
  console.log("by list:", byList);

  if (!doLoad) { console.log("\nDRY RUN — pass --load"); await sql.end(); return; }

  let inserted = 0;
  for (let i = 0; i < keep.length; i += 1000) {
    const batch = keep.slice(i, i + 1000).map((u) => ({
      campaign_id: CAMPAIGN_ID,
      email: u.email,
      values: sql.json({ company: u.company || "your company", domain: u.email.split("@")[1] }) as unknown as string,
      // The list name is kept so each segment's delivery can be measured separately afterwards.
      source: SOURCE + ":" + u.list.split(" ")[0].toLowerCase(),
      send_tz: SEND_TZ,
      send_tz_source: "country",
    }));
    const res = await sql`
      INSERT INTO campaign_recipients ${sql(batch, "campaign_id", "email", "values", "source", "send_tz", "send_tz_source")}
      ON CONFLICT (campaign_id, email) DO NOTHING`;
    inserted += res.count ?? 0;
  }
  console.log(`inserted ${inserted}`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
