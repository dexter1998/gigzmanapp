/**
 * Writes outreach outcomes back into the scraping registry.
 *
 *   npx tsx scripts/sync-registry-outcomes.ts            # dry run
 *   npx tsx scripts/sync-registry-outcomes.ts --write
 *
 * Safe to run repeatedly, and meant to be: it only ever moves a row from "unknown" to "known", so
 * a second run over the same data changes nothing.
 *
 * Why this matters more than it looks. scrape_emails has 238,443 rows and sent_at has never been
 * written to a single one of them, so the registry believes nothing has ever been mailed. Measured
 * today on one filter: it called 51,377 addresses sendable, of which 17,647 had already been
 * mailed and 12,332 were hard bounces, complaints or unsubscribes on our side — 37% that would
 * have been mailed again, including people who had asked us to stop.
 *
 * The divergence is not static. Every send widens it, which is why the write-back belongs next to
 * the feed rather than on a list of things to do later.
 */
import { sql } from "../lib/db";

async function main() {
  const write = process.argv.includes("--write");

  const [before] = await sql`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE sent_at IS NOT NULL)::int AS with_sent,
           count(*) FILTER (WHERE bounced)::int AS bounced,
           count(*) FILTER (WHERE suppressed)::int AS suppressed
      FROM scrape_emails`;
  console.log("registry before:", before);

  // What we actually sent, earliest first — the registry wants first contact, not latest.
  const [sentCount] = await sql`
    SELECT count(*)::int AS n FROM scrape_emails se
     WHERE se.sent_at IS NULL
       AND EXISTS (SELECT 1 FROM email_sends es
                    WHERE lower(es.recipient) = lower(se.email) AND es.ses_message_id IS NOT NULL)`;

  // Bounced, complained or unsubscribed anywhere. A complaint and an unsubscribe are not bounces,
  // but for the registry's purpose — may we mail this address — they are the same answer, and the
  // one flag it has for that is suppressed.
  const [badCount] = await sql`
    SELECT count(*)::int AS n FROM scrape_emails se
     WHERE NOT se.suppressed
       AND (EXISTS (SELECT 1 FROM campaign_recipients cr
                     WHERE lower(cr.email) = lower(se.email)
                       AND cr.do_not_send_reason IN ('hard_mta','complaint','unsubscribed',
                                                     'validation_suppressed','on_suppression_list'))
         OR EXISTS (SELECT 1 FROM email_unsubscribes u WHERE lower(u.email) = lower(se.email)))`;

  // Only a real delivery failure sets bounced. An unsubscribe means do not mail, not undeliverable,
  // and conflating them would make the registry's bounce rate meaningless for list quality.
  const [hardCount] = await sql`
    SELECT count(*)::int AS n FROM scrape_emails se
     WHERE NOT se.bounced
       AND EXISTS (SELECT 1 FROM campaign_recipients cr
                    WHERE lower(cr.email) = lower(se.email)
                      AND cr.do_not_send_reason IN ('hard_mta','on_suppression_list'))`;

  console.log(`\nwould set sent_at on:    ${sentCount.n}`);
  console.log(`would set suppressed on: ${badCount.n}`);
  console.log(`would set bounced on:    ${hardCount.n}`);

  if (!write) { console.log("\nDRY RUN — pass --write"); await sql.end(); return; }

  const r1 = await sql`
    UPDATE scrape_emails se
       SET sent_at = s.first_sent
      FROM (SELECT lower(recipient) AS email, min(sent_at) AS first_sent
              FROM email_sends WHERE ses_message_id IS NOT NULL
             GROUP BY 1) s
     WHERE lower(se.email) = s.email AND se.sent_at IS NULL`;
  console.log(`sent_at set:    ${r1.count}`);

  const r2 = await sql`
    UPDATE scrape_emails se SET suppressed = true
     WHERE NOT se.suppressed
       AND (EXISTS (SELECT 1 FROM campaign_recipients cr
                     WHERE lower(cr.email) = lower(se.email)
                       AND cr.do_not_send_reason IN ('hard_mta','complaint','unsubscribed',
                                                     'validation_suppressed','on_suppression_list'))
         OR EXISTS (SELECT 1 FROM email_unsubscribes u WHERE lower(u.email) = lower(se.email)))`;
  console.log(`suppressed set: ${r2.count}`);

  const r3 = await sql`
    UPDATE scrape_emails se SET bounced = true
     WHERE NOT se.bounced
       AND EXISTS (SELECT 1 FROM campaign_recipients cr
                    WHERE lower(cr.email) = lower(se.email)
                      AND cr.do_not_send_reason IN ('hard_mta','on_suppression_list'))`;
  console.log(`bounced set:    ${r3.count}`);

  const [after] = await sql`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE sent_at IS NOT NULL)::int AS with_sent,
           count(*) FILTER (WHERE bounced)::int AS bounced,
           count(*) FILTER (WHERE suppressed)::int AS suppressed
      FROM scrape_emails`;
  console.log("\nregistry after:", after);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
