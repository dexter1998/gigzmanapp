/**
 * Adds everyone who has signalled "stop" to email_unsubscribes.
 *
 *   npx tsx --env-file=.env.local scripts/suppress-complainers.ts
 *   npx tsx --env-file=.env.local scripts/suppress-complainers.ts --apply
 *
 * Needs the SSM tunnel open first: scripts/prod-tunnel.sh
 *
 * Three sources, because only one of them was ever wired up:
 *   1. SES Complaint events - these already suppress at the SES layer, but our own
 *      email_unsubscribes table is what send-bulk checks, and they were never written there.
 *   2. contact_messages whose text asks us to stop. This is the gap that mattered: the contact
 *      form was never connected to suppression, so on 2026-10-15 we found rajivgupta@cain.in had
 *      received 8 more emails and scanmicomercial@gmail.com 5 more AFTER each asked us to stop.
 *   3. Recipients who clicked an unsubscribe link but never completed the opt-out. On day 1 of the
 *      7-day push the unsubscribe link was the only working link in the message, so a click there
 *      is the clearest "stop" signal we have from that send.
 *
 * Writes to email_unsubscribes with stream 'all', so the opt-out holds across every campaign.
 */
import { useProdDb } from "../lib/db-prod";

/** Text that means "stop", kept narrow so a genuine enquiry mentioning spam filters is not caught. */
const STOP = /stop spamming|spamming|unsubscribe|remove me|opt[- ]?out|delete my .*account|do not email|don'?t email|stop emailing|stop sending/i;

async function main() {
  const apply = process.argv.includes("--apply");
  // The 11,578 day-1 unsubscribe-link clickers are off by default. On day 1 that link was the only
  // working one in the message, so Tarun's read -- that a click there was a glitch rather than
  // intent -- is defensible, and including them is what gave the retry its 58% open rate. It is a
  // separate call from suppressing people who actually complained, so it needs saying out loud.
  const withClickers = process.argv.includes("--include-clickers");
  const target = await useProdDb();
  const { sql } = await import("../lib/db");
  const [w] = (await sql`SELECT current_database() db`) as unknown as { db: string }[];
  if (w.db !== target.database) { console.error(`REFUSING: pool is on '${w.db}'`); process.exit(1); }

  const complaints = (await sql`
    SELECT DISTINCT lower(recipient) AS email FROM email_events WHERE event_type='Complaint'`) as unknown as { email: string }[];
  const contacts = (await sql`
    SELECT DISTINCT lower(coalesce(email, user_email)) AS email, message
      FROM contact_messages WHERE coalesce(email, user_email) IS NOT NULL`) as unknown as { email: string; message: string }[];
  const clickers = (await sql`
    SELECT DISTINCT lower(e.recipient) AS email
      FROM email_events e JOIN email_sends s ON s.ses_message_id = e.ses_message_id
     WHERE e.event_type='Click' AND e.link LIKE '%/u/%'
       AND s.campaign_id='mantis_leads_7day_2026' AND s.step_key='day1_multi'`) as unknown as { email: string }[];

  const fromContact = contacts.filter((c) => STOP.test(c.message ?? "")).map((c) => c.email);
  const all = new Map<string, string>();
  for (const r of complaints) all.set(r.email, "ses_complaint");
  for (const e of fromContact) if (!all.has(e)) all.set(e, "contact_form_stop");
  if (withClickers) for (const r of clickers) if (!all.has(r.email)) all.set(r.email, "unsub_link_click");

  console.log(`SES complaints        ${complaints.length.toLocaleString()}`);
  console.log(`contact-form "stop"   ${fromContact.length.toLocaleString()}  ${fromContact.join(", ")}`);
  console.log(`unsub-link clickers   ${clickers.length.toLocaleString()}  ${withClickers ? "(SHAAMIL)" : "(bahar — --include-clickers se jodo)"}`);
  console.log(`total distinct        ${all.size.toLocaleString()}`);

  const already = (await sql`
    SELECT count(*)::int n FROM email_unsubscribes WHERE lower(email) = ANY(${[...all.keys()]})`) as unknown as { n: number }[];
  console.log(`already unsubscribed  ${already[0].n.toLocaleString()}`);
  console.log(`to add                ${(all.size - already[0].n).toLocaleString()}`);

  if (!apply) { console.log("\nDRY RUN — pass --apply"); await sql.end(); return; }

  const rows = [...all].map(([email, source]) => ({ email, stream: "all", source }));
  let added = 0;
  for (let i = 0; i < rows.length; i += 2000) {
    const res = await sql`
      INSERT INTO email_unsubscribes ${sql(rows.slice(i, i + 2000), "email", "stream", "source")}
      ON CONFLICT DO NOTHING`;
    added += res.count ?? 0;
  }
  console.log(`\nadded to email_unsubscribes: ${added.toLocaleString()}`);
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
