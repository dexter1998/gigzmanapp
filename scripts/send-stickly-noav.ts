/**
 * Re-sends to the addresses SES's Auto Validation refused, this time with AV off.
 *
 *   npx tsx scripts/send-stickly-noav.ts                   # dry run
 *   npx tsx scripts/send-stickly-noav.ts --send --limit 2000   # canary
 *   npx tsx scripts/send-stickly-noav.ts --send            # the rest
 *
 * AV is a prediction, not a check — it never contacts the recipient's mail server. On the Mantis
 * list the same move (AV-suppressed addresses resent without AV) delivered 9,985 of 10,059 with
 * 17 hard bounces, 0.17%. But those had a prior delivery proving the mailbox existed, and these
 * have nothing: AV blocked them on the first attempt, so there is no evidence either way.
 *
 * Hence the canary. A hard bounce here is a real one that counts against the account's
 * reputation, and the account is shared with the Mantis pipeline — 29,468 sends at a bad rate
 * would spend the whole daily bounce budget and stop both campaigns.
 */
import { sql } from "../lib/db";
import { sendBulkEmail } from "../lib/email/send-bulk";

const CAMPAIGN_ID = "stickly_saas_founders_2026";
const STEP_KEY = "s1_gap_noav";
/** No ValidationOptions on this one — confirmed against the live configuration set. */
const CONFIG_SET_NO_AV = "gigzman-cold-outreach-2026";
const CONCURRENCY = 10;
const INTERVAL_MS = 250;
const CHECK_EVERY = 500;
const STOP_COMPLAINT_RATE = 0.0009;
const STOP_BOUNCE_RATE = 0.04;

async function reputation(): Promise<{ bounce: number | null; complaint: number | null }> {
  const { CloudWatchClient, GetMetricStatisticsCommand } = await import("@aws-sdk/client-cloudwatch");
  const cw = new CloudWatchClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
  const read = async (name: string) => {
    const r = await cw.send(new GetMetricStatisticsCommand({
      Namespace: "AWS/SES", MetricName: name,
      StartTime: new Date(Date.now() - 2 * 3600_000), EndTime: new Date(),
      Period: 3600, Statistics: ["Maximum"],
    }));
    const pts = (r.Datapoints ?? []).sort((a, b) => +(a.Timestamp ?? 0) - +(b.Timestamp ?? 0));
    return pts.length ? (pts[pts.length - 1].Maximum ?? null) : null;
  };
  return { bounce: await read("Reputation.BounceRate"), complaint: await read("Reputation.ComplaintRate") };
}

async function main() {
  const send = process.argv.includes("--send");
  const li = process.argv.indexOf("--limit");
  const limit = li > -1 ? Number(process.argv[li + 1]) : 100000;

  const [campaign] = await sql`SELECT sender, stream FROM campaigns WHERE id = ${CAMPAIGN_ID}`;
  const [step] = await sql`
    SELECT subject, html, text FROM campaign_steps
     WHERE campaign_id = ${CAMPAIGN_ID} AND step_key = 's1_gap'`;
  if (!campaign || !step) { console.error("campaign or step missing"); process.exit(1); }

  // Selected from the events rather than from the recipient's state: the reducer sets
  // do_not_send for an AV suppression, and that flag is exactly what we are overriding here.
  // Anything that genuinely bounced or complained is excluded rather than retried.
  const rows = (await sql`
    WITH av AS (
      SELECT DISTINCT es.recipient FROM email_sends es
        JOIN email_events ev ON ev.ses_message_id = es.ses_message_id AND ev.event_type = 'Bounce'
       WHERE es.campaign_id = ${CAMPAIGN_ID}
         AND ev.raw->'bounce'->>'bounceSubType' = 'EmailValidationSuppressed'
    ), bad AS (
      SELECT DISTINCT es.recipient FROM email_sends es
        JOIN email_events ev ON ev.ses_message_id = es.ses_message_id
       WHERE es.campaign_id = ${CAMPAIGN_ID}
         AND (ev.event_type = 'Complaint'
           OR (ev.event_type = 'Bounce'
               AND ev.raw->'bounce'->>'bounceType' = 'Permanent'
               AND ev.raw->'bounce'->>'bounceSubType' <> 'EmailValidationSuppressed'))
    )
    SELECT cr.id, cr.email, cr.values
      FROM campaign_recipients cr
      JOIN av ON av.recipient = cr.email
     WHERE cr.campaign_id = ${CAMPAIGN_ID}
       AND cr.email NOT IN (SELECT recipient FROM bad)
       AND NOT EXISTS (SELECT 1 FROM email_sends s2
                        WHERE s2.recipient = cr.email AND s2.campaign_id = ${CAMPAIGN_ID}
                          AND s2.step_key = ${STEP_KEY})
     ORDER BY cr.imported_at ASC
     LIMIT ${limit}
  `) as unknown as { id: string; email: string; values: Record<string, string> }[];

  console.log(`sender:      ${campaign.sender}`);
  console.log(`config set:  ${CONFIG_SET_NO_AV} (no Auto Validation)`);
  console.log(`to re-send:  ${rows.length}`);
  if (!send) { console.log("\nDRY RUN — pass --send"); await sql.end(); return; }

  let sent = 0, skipped = 0, throttled = 0, failed = 0, done = 0, stop = false;
  const started = Date.now();

  const sendOne = async (r: { id: string; email: string; values: Record<string, string> }) => {
    const fill = (s: string) => Object.entries(r.values).reduce((o, [k, v]) => o.replaceAll(`{{${k}}}`, v), s);
    try {
      const res = await sendBulkEmail({
        to: r.email,
        subject: fill(step.subject as string),
        html: fill(step.html as string),
        text: fill(step.text as string),
        campaignId: CAMPAIGN_ID,
        stepKey: STEP_KEY,
        template: STEP_KEY,
        stream: campaign.stream as string,
        sender: campaign.sender as string,
        configSet: CONFIG_SET_NO_AV,
        touchNo: 1,
      });
      if (res.sent) {
        sent++;
        await sql`UPDATE campaign_recipients
                     SET do_not_send = false, do_not_send_reason = NULL, bounce_kind = NULL,
                         state = 'active', state_changed_at = now()
                   WHERE id = ${r.id}`;
      } else skipped++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/Sending paused|AccountSuspended/i.test(msg)) { console.error("STOPPING: SES sending is paused"); stop = true; return; }
      if (/Maximum sending rate exceeded|Throttling|TooManyRequests|ServiceUnavailable|Timeout/i.test(msg)) { throttled++; return; }
      failed++;
      console.error(`  fail ${r.email}: ${msg.slice(0, 110)}`);
    }
  };

  for (let i = 0; i < rows.length && !stop; i += CONCURRENCY) {
    await Promise.all(rows.slice(i, i + CONCURRENCY).map(sendOne));
    done += CONCURRENCY;
    if (done % CHECK_EVERY < CONCURRENCY) {
      const rep = await reputation();
      const rate = (sent / ((Date.now() - started) / 1000)).toFixed(1);
      const b = rep.bounce === null ? "?" : (rep.bounce * 100).toFixed(2) + "%";
      const c = rep.complaint === null ? "?" : (rep.complaint * 100).toFixed(3) + "%";
      console.log(`  ${Math.min(done, rows.length)}/${rows.length}  sent ${sent} skip ${skipped} throttle ${throttled} fail ${failed}  ${rate}/s  bounce ${b}  complaint ${c}`);
      if (rep.complaint !== null && rep.complaint >= STOP_COMPLAINT_RATE) { console.error(`STOPPING: complaint ${c}`); break; }
      if (rep.bounce !== null && rep.bounce >= STOP_BOUNCE_RATE) { console.error(`STOPPING: bounce ${b}`); break; }
    }
    if (INTERVAL_MS) await new Promise((res) => setTimeout(res, INTERVAL_MS));
  }

  console.log(`\ndone: sent ${sent}, skipped ${skipped}, throttled ${throttled}, failed ${failed}`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
