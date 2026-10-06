/**
 * Loads the SaaS-founders list into the Stickly cold campaign.
 *
 *   npx tsx scripts/load-stickly-recipients.ts <csv>            # dry run, prints what it would do
 *   npx tsx scripts/load-stickly-recipients.ts <csv> --write    # inserts
 *
 * Idempotent: ON CONFLICT on (campaign_id, email) does nothing, so a re-run after a partial load
 * finishes the job rather than duplicating it.
 */
import { readFileSync } from "fs";
import { sql } from "../lib/db";

const CAMPAIGN_ID = "stickly_saas_founders_2026";
const CTA_URL = "https://stickly.live/?utm_source=email&utm_medium=email&utm_campaign=stickly_saas_founders_2026&utm_content=s1_gap";

const SYNTAX = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

/**
 * Mailboxes that are machinery, not people. A DMARC report address has no reader, and mailing
 * abuse@ or postmaster@ is the fastest way to be reported by someone whose job is reporting.
 * Found in this list for real: dmarcreports@pushmyapp.ai.
 */
const NEVER_MAIL = /^(dmarc|dmarcreports?|dmarc-reports?|postmaster|abuse|noreply|no-reply|donotreply|do-not-reply|bounce|bounces|mailer-daemon|spam|security|privacy|legal|webmaster|hostmaster)([._-]|$)/i;

/** Words that are a department, not a first name — a greeting must never use one. */
const ROLE_WORD = new Set([
  "info", "hello", "hi", "hey", "contact", "sales", "support", "admin", "team", "office", "mail",
  "help", "service", "services", "enquiry", "enquiries", "inquiry", "inquiries", "business", "biz",
  "marketing", "press", "media", "partners", "partnerships", "partner", "careers", "jobs", "hr",
  "billing", "accounts", "accounting", "finance", "founders", "founder", "ceo", "me", "mail",
  "startup", "growth", "dev", "developers", "engineering", "product", "feedback", "community",
]);

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * A first name for the greeting, or "there".
 *
 * The named columns cover only 35% of this list, but the bucket that dominates it is
 * person_own_domain — where the local part IS the name (ryan@wisegrid.co). Deriving it is the
 * difference between "Hi Ryan," and "Hi there," on 20,000 sends, so it is worth the care; what is
 * not worth it is guessing wrong, which is why anything that looks like a department, a machine,
 * the company itself, or has digits in it falls back rather than being dressed up as a person.
 */
export function firstName(row: Record<string, string>): string {
  // The local part, not the scraped columns. Where both exist they disagree 84.9% of the time
  // (6,775 of 7,983), because the columns hold whichever name the crawler found on the site while
  // the local part is the person who actually owns the mailbox: muzahid vs maruf@trackrev.io,
  // michele vs teppo@skene.ai. The columns also carry things that are not names at all — "ui",
  // "i'm", "Thibault Besson-Magdelain Privacy". A wrong name on a cold email is worse than no
  // name: it announces a bad list in the first two words.
  const local = (row.email ?? "").split("@")[0];
  const domainWord = (row.domain ?? "").split(".")[0].toLowerCase();
  const tok = local.split(/[._-]/)[0].toLowerCase();
  if (
    tok.length >= 3 && tok.length <= 14 &&
    /^[a-z]+$/.test(tok) &&
    !ROLE_WORD.has(tok) &&
    tok !== domainWord &&
    !domainWord.startsWith(tok)
  ) {
    return titleCase(tok);
  }
  return "there";
}

type Row = Record<string, string>;

function parseCsv(text: string): Row[] {
  const out: Row[] = [];
  let i = 0, field = "", row: string[] = [], inQuotes = false;
  let header: string[] | null = null;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => {
    pushField();
    if (!header) header = row;
    else if (row.length === header.length) {
      const o: Row = {};
      header.forEach((h, n) => (o[h] = row[n]));
      out.push(o);
    }
    row = [];
  };
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { inQuotes = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ",") { pushField(); i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { pushRow(); i++; continue; }
    field += c; i++;
  }
  if (field || row.length) pushRow();
  return out;
}

async function main() {
  const csvPath = process.argv[2];
  const write = process.argv.includes("--write");
  if (!csvPath) { console.error("usage: load-stickly-recipients.ts <csv> [--write]"); process.exit(1); }

  const rows = parseCsv(readFileSync(csvPath, "utf8"));
  console.log(`csv rows: ${rows.length}`);

  // Anyone who has already told us to stop, bounced hard, or complained — on ANY campaign or
  // stream. They are different products but the same sending domain and the same human, and the
  // per-stream unsubscribe check in sendBulkEmail would not catch them.
  const blockedRows = await sql`
    SELECT lower(email) AS email FROM email_unsubscribes
    UNION
    SELECT lower(email) FROM campaign_recipients
     WHERE do_not_send_reason IN ('complaint','hard_mta','unsubscribed','on_suppression_list','send_rejected')
  `;
  const blocked = new Set((blockedRows as unknown as { email: string }[]).map((r) => r.email));
  console.log(`already suppressed elsewhere: ${blocked.size}`);

  const seen = new Set<string>();
  const keep: { email: string; values: Record<string, string>; source: string }[] = [];
  const drop = { syntax: 0, nomx: 0, machine: 0, dupe: 0, blocked: 0 };

  for (const r of rows) {
    const email = (r.email ?? "").trim().toLowerCase();
    if (!SYNTAX.test(email)) { drop.syntax++; continue; }
    if ((r.mx_ok ?? "").trim().toLowerCase() === "no") { drop.nomx++; continue; }
    if (NEVER_MAIL.test(email.split("@")[0])) { drop.machine++; continue; }
    if (seen.has(email)) { drop.dupe++; continue; }
    if (blocked.has(email)) { drop.blocked++; continue; }
    seen.add(email);
    keep.push({
      email,
      values: { domain: r.domain?.trim() || email.split("@")[1], first_name: firstName(r), cta_url: CTA_URL },
      source: (r.bucket ?? "unknown").trim(),
    });
  }

  console.log("dropped:", drop);
  console.log(`to load: ${keep.length}`);
  const named = keep.filter((k) => k.values.first_name !== "there").length;
  console.log(`with a real first name: ${named} (${((100 * named) / keep.length).toFixed(1)}%)`);
  console.log("\nsample:");
  for (const k of keep.slice(0, 6)) console.log(`  Hi ${k.values.first_name},`.padEnd(20), k.email.padEnd(34), k.values.domain);

  if (!write) { console.log("\nDRY RUN — pass --write to insert"); await sql.end(); return; }

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
        })),
        "campaign_id", "email", "values", "source"
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
