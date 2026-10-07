/**
 * Loads newly scraped person-type addresses from the registry into the Mantis campaign.
 *
 *   npx tsx --env-file=.env.local scripts/load-mantis-new-personal.ts          # dry run
 *   npx tsx --env-file=.env.local scripts/load-mantis-new-personal.ts --load
 *
 * Needs the SSM tunnel open first: scripts/prod-tunnel.sh
 *
 * Only the person-type buckets. Measured on 34,054 live sends on 2026-10-06: person buckets
 * delivered 74.9%, generic_t1 delivered 0.8% (98.6% suppressed by SES Auto Validation at send
 * time, on first contact, with no prior record anything local could have filtered on). The bucket
 * is the only predictor available before sending, so it is the filter.
 *
 * Everything else here is the cleaning that the same day's work showed is necessary: of 61,250
 * addresses that passed address-level checks, only 17,259 were worth sending to.
 */
import { useProdDb } from "../lib/db-prod";
import { resolveTz } from "../lib/outreach/send-time";

// Regex backslashes written inside a sql`` template literal must be doubled. JavaScript drops
// the backslash from an unrecognised escape, so '[^@\s]' reaches Postgres as '[^@s]' -- "not @
// and not the letter s". That silently rejected every address containing an s: 61,925 of 111,755
// valid candidates on 2026-10-07.

type Sql = (typeof import("../lib/db"))["sql"];
let sql: Sql;

const CAMPAIGN_ID = "mantis_cold_outreach_2026";
const SOURCE = "registry_person_v2";
const PERSONAL = ["personal_domain", "personal_freemail", "person_own_domain", "founder_named", "person_named_offdomain"];

const FREEMAIL = ["gmail.com","yahoo.com","hotmail.com","outlook.com","mail.com","aol.com","icloud.com","gmx.com","gmx.de","yandex.com","protonmail.com","proton.me","live.com","msn.com","rediffmail.com","zohomail.in","yahoo.co.in","yahoo.co.uk"];

/** Machinery, by local part. */
const MACHINE = "^(dmarc|postmaster|abuse|noreply|no-reply|donotreply|bounce|mailer-daemon|webmaster|hostmaster|security|privacy|legal)";
/** Compliance and legal desks: the most complaint-prone address at any business. */
const COMPLIANCE = "(^|[._+-])(dpo|iodo|iod|gdpr|dsb|dsgvo|privacy|datenschutz|abuse|legal|compliance|dmarc|postmaster|hostmaster|security|rgpd|protecciondedatos|juridic|juridico|juridique|giuridico|recht|avvocato|notaire)([._+-]|[0-9]|$)";
/** Role/shared inboxes, including non-English — an English-only list lets most of them through. */
const ROLE = "(^|[._+-])(info|hello|hi|hey|tech|it|contact|contato|contacto|kontakt|enquiry|enquiries|inquiry|inquiries|office|bureau|feedback|support|help|hjelp|pomoc|ayuda|aiuto|hilfe|admin|srvadmin|team|mail|email|service|services|kundservice|kundeservice|asiakaspalvelu|sales|vendas|ventas|verkauf|billing|accounts|hr|jobs|karriere|kariera|press|marketing|webmaster|noreply|no-reply|donotreply|bounce|mailer-daemon|error|reports?|soporte|suporte|assistenza|asistencia|hallo|bonjour|ciao|hola|acquisitions|procurement|inkoop|achat|achats|compras|acquisti|einkauf|leden|members|membership|abonnement|newsletter|reservations|reservas|booking|bookings|facturacion|fatturazione|faktura|rechnung|invoice|invoices|payments|recruitment|recrutement|stellen|vacatures|vagas|career|careers|rekrutacja|orders|questions|redaksi|redaktion|redazione|editor)([._+-]|[0-9]|$)";
/** rua/ruf/dmarc also appear mid-local-part: lacentrale.rua@... passes a '^' test. */
const REPORT_LOCAL = "(^|[._+-])(rua|ruf|dmarc|aggregate)([._+-]|[0-9]|$)";

export function cleanCompany(raw: string | null | undefined): string | null {
  let s = (raw ?? "").trim();
  if (!s) return null;
  s = s.split(/[|–—]/)[0].trim();
  if (/^https?:/i.test(s) || /\bwww\./i.test(s)) return null;
  if (s.length < 2 || s.length > 40 || !/[A-Za-z]/.test(s)) return null;
  return s;
}

async function main() {
  const target = await useProdDb();
  console.log(`db: ${target.user}@${target.host}/${target.database} (via tunnel 127.0.0.1:5433)`);
  sql = (await import("../lib/db")).sql;
  const doLoad = process.argv.includes("--load");

  const [campaign] = await sql`SELECT default_tz FROM campaigns WHERE id = ${CAMPAIGN_ID}`;
  const defaultTz = (campaign?.default_tz as string) ?? "Asia/Kolkata";

  // Temp tables, because the same checks written as IN-subqueries time out at these volumes.
  await sql`CREATE TEMP TABLE _sent AS SELECT DISTINCT lower(recipient) e,
    split_part(lower(recipient),'@',2) d FROM email_sends WHERE ses_message_id IS NOT NULL`;
  await sql`CREATE INDEX ON _sent(e)`; await sql`CREATE INDEX ON _sent(d)`;
  await sql`CREATE TEMP TABLE _touched AS SELECT DISTINCT d FROM _sent`;
  await sql`CREATE INDEX ON _touched(d)`;
  await sql`CREATE TEMP TABLE _inlist AS SELECT DISTINCT lower(email) e FROM campaign_recipients`;
  await sql`CREATE INDEX ON _inlist(e)`;
  await sql`CREATE TEMP TABLE _unsub AS SELECT DISTINCT lower(email) e FROM email_unsubscribes`;
  await sql`CREATE INDEX ON _unsub(e)`;
  await sql`ANALYZE _sent`; await sql`ANALYZE _touched`; await sql`ANALYZE _inlist`; await sql`ANALYZE _unsub`;

  await sql`
    CREATE TEMP TABLE _cand AS
    WITH e AS (
      SELECT se.email, se.domain, sd.company, sd.country,
             split_part(lower(se.email),'@',1) lp, split_part(lower(se.email),'@',2) rdom
        FROM scrape_emails se
        LEFT JOIN scrape_domains sd ON sd.domain = se.domain
        LEFT JOIN _sent s   ON s.e = lower(se.email)
        LEFT JOIN _touched t ON t.d = se.domain
        LEFT JOIN _inlist i ON i.e = lower(se.email)
        LEFT JOIN _unsub u  ON u.e = lower(se.email)
       WHERE ',' || se.campaigns || ',' LIKE '%,mantis-agency,%'
         AND se.bucket = ANY(${PERSONAL})
         AND NOT se.suppressed AND NOT se.bounced AND se.mx_ok IS NOT FALSE
         AND s.e IS NULL AND t.d IS NULL AND i.e IS NULL AND u.e IS NULL
         AND lower(se.email) ~ '^[^@\\s]+@[^@\\s.]+\\.[^@\\s]+$'),
    f AS (
      SELECT e.*, (rdom = ANY(${FREEMAIL})) is_freemail
        FROM e
       WHERE lp !~ ${MACHINE} AND lp !~ ${COMPLIANCE} AND lp !~ ${ROLE} AND lp !~ ${REPORT_LOCAL}
         -- DACH is excluded by default (UWG §7) on the RECIPIENT's domain, not just the
         -- registry domain: a .eu business with a .de mailbox is still a German send.
         -- pec/legalmail are Italian certified legal mail.
         AND rdom !~ '\\.(de|at|ch)$'
         AND rdom NOT IN ('pec.it','legalmail.it','postacert.it','pec.aruba.it','legalmail.eu')
         AND rdom !~ '\\.(pdf|png|jpg|jpeg|webp|doc|docx|zip|svg|gif)$'
         AND rdom !~ '(gmail\\.(con|co|coms|cm|om)|gamil\\.com|gmial\\.com|gmai\\.com)$'
         AND rdom !~ '^(dmarc|rua|ruf|reports?|inbox)[.-]' AND rdom !~ '(dmarc|report-uri)'
         AND rdom !~ '\\.(local|localhost|invalid|example|test)$'),
    -- One registry domain contributing many personal mailboxes is a scraped listing, not a
    -- contact list: opseazy.com alone yielded 13,277 jobseeker gmails from a resume dump.
    clusters AS (SELECT domain FROM f WHERE is_freemail GROUP BY domain HAVING count(*) >= 20)
    SELECT f.*, row_number() OVER (PARTITION BY f.domain ORDER BY
             f.is_freemail ASC, (f.lp ~ '[._+-]') DESC, length(f.email) ASC, f.email ASC) rn
      FROM f LEFT JOIN clusters c ON c.domain = f.domain
     WHERE c.domain IS NULL`;
  await sql`ANALYZE _cand`;

  const [stats] = await sql`SELECT count(*)::int candidates,
    count(*) FILTER (WHERE rn = 1)::int one_per_business FROM _cand`;
  console.log(`after cleaning: ${stats.candidates} addresses, ${stats.one_per_business} businesses`);

  const rows = (await sql`
    SELECT email, domain, company, country FROM _cand WHERE rn = 1`) as unknown as
    { email: string; domain: string; company: string | null; country: string | null }[];

  const keep = rows.map((r) => {
    const t = resolveTz({ country: r.country, domain: r.domain });
    return {
      campaign_id: CAMPAIGN_ID,
      email: r.email.toLowerCase(),
      values: sql.json({ company: cleanCompany(r.company) ?? "your agency", domain: r.domain }) as unknown as string,
      source: SOURCE,
      send_tz: t.source === "default" ? defaultTz : t.tz,
      send_tz_source: t.source,
    };
  });

  console.log(`to load: ${keep.length}`);
  if (!doLoad) { console.log("\nDRY RUN — pass --load"); await sql.end(); return; }

  let inserted = 0;
  for (let i = 0; i < keep.length; i += 1000) {
    const res = await sql`
      INSERT INTO campaign_recipients ${sql(keep.slice(i, i + 1000),
        "campaign_id", "email", "values", "source", "send_tz", "send_tz_source")}
      ON CONFLICT (campaign_id, email) DO NOTHING`;
    inserted += res.count ?? 0;
    if (i % 20000 === 0) console.log(`  ${Math.min(i + 1000, keep.length)}/${keep.length}`);
  }
  console.log(`inserted ${inserted}`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
