/**
 * Sends the Stickly cold email directly, without the outreach dispatcher.
 *
 *   npx tsx scripts/send-stickly-blast.ts            # dry run
 *   npx tsx scripts/send-stickly-blast.ts --send     # send
 *   npx tsx scripts/send-stickly-blast.ts --send --limit 500
 *
 * Not the cron pipeline, but not a bare loop either. It still goes through sendBulkEmail, so every
 * message is recorded in email_sends with its SES message id and carries the configuration set —
 * which is the only reason opens, clicks, bounces and complaints come back at all. A send that is
 * not recorded cannot be watched.
 *
 * Safe to stop and re-run: the unique index on (recipient, campaign_id, step_key) means an address
 * already sent is skipped rather than mailed twice, so a crash halfway resumes rather than restarts.
 */
import { sql } from "../lib/db";
import { sendBulkEmail } from "../lib/email/send-bulk";

const CAMPAIGN_ID = "stickly_saas_founders_2026";

/**
 * Concurrency, not a sleep, is what sets the pace here.
 *
 * Each send costs four database round-trips — the unsubscribe check, the claim, writing back the
 * SES message id, and marking the recipient — and they go over an SSM tunnel at roughly 400ms
 * each. Measured on the first run: 0.46 sends/sec against the 11.8/sec the 85ms sleep implied,
 * because the sleep was never the bottleneck, the latency was. At that rate 50,191 addresses
 * would take thirty hours.
 *
 * Ten in flight, matching the postgres.js pool in lib/db.ts — more would simply queue on a
 * connection and buy nothing.
 *
 * The pause is what keeps it off the account's 14/sec cap. Without it the first full run sat at
 * exactly 14.0/sec and SES threw "Maximum sending rate exceeded" 3,299 times: the cap is shared
 * with Mantis and with transactional mail, so riding it is not a win, it is a queue of other
 * people's failures.
 */
const CONCURRENCY = 10;
const INTERVAL_MS = 250;

/**
 * Checked every 500 sends against AWS's own numbers, because this bypasses the dispatcher's gates
 * and an unattended blast with no brakes is how an account gets reviewed. These are the lines AWS
 * acts on: review at 0.1% complaints and 5% bounces, pause at 0.5% and 10%.
 */
const STOP_COMPLAINT_RATE = 0.0009;
const STOP_BOUNCE_RATE = 0.04;
const CHECK_EVERY = 500;

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
  const limArg = process.argv.indexOf("--limit");
  const limit = limArg > -1 ? Number(process.argv[limArg + 1]) : Number.MAX_SAFE_INTEGER;

  const [campaign] = await sql`
    SELECT sender, stream, config_set_unverified FROM campaigns WHERE id = ${CAMPAIGN_ID}`;
  const [step] = await sql`
    SELECT step_key, subject, html, text FROM campaign_steps
     WHERE campaign_id = ${CAMPAIGN_ID} ORDER BY step_order LIMIT 1`;
  if (!campaign || !step) { console.error("campaign or step missing"); process.exit(1); }

  const rows = (await sql`
    SELECT id, email, values FROM campaign_recipients
     WHERE campaign_id = ${CAMPAIGN_ID} AND do_not_send = false AND touch_count = 0
     ORDER BY imported_at ASC
     LIMIT ${Math.min(limit, 200000)}
  `) as unknown as { id: string; email: string; values: Record<string, string> }[];

  console.log(`sender:     ${campaign.sender}`);
  console.log(`subject:    ${step.subject}`);
  console.log(`recipients: ${rows.length}`);
  if (!send) {
    for (const r of rows.slice(0, 5)) console.log(`  ${r.email.padEnd(34)} Hi ${r.values.first_name}, ${r.values.domain}`);
    console.log("\nDRY RUN — pass --send");
    await sql.end();
    return;
  }

  let sent = 0, skipped = 0, failed = 0, throttled = 0, done = 0, stop = false;
  const started = Date.now();

  const sendOne = async (r: { id: string; email: string; values: Record<string, string> }) => {
    const fill = (s: string) =>
      Object.entries(r.values).reduce((o, [k, v]) => o.replaceAll(`{{${k}}}`, v), s);
    try {
      const res = await sendBulkEmail({
        to: r.email,
        subject: fill(step.subject as string),
        html: fill(step.html as string),
        text: fill(step.text as string),
        campaignId: CAMPAIGN_ID,
        stepKey: step.step_key as string,
        template: step.step_key as string,
        stream: campaign.stream as string,
        sender: campaign.sender as string,
        configSet: campaign.config_set_unverified as string,
        touchNo: 1,
      });
      if (res.sent) {
        sent++;
        await sql`UPDATE campaign_recipients
                     SET touch_count = 1, state = 'active', state_changed_at = now(), next_due_at = NULL
                   WHERE id = ${r.id}`;
      } else {
        skipped++;
        // A skip is permanent for this step. Marking it keeps the row out of the next run rather
        // than having every re-run walk the same dead addresses again.
        await sql`UPDATE campaign_recipients
                     SET do_not_send = true, do_not_send_reason = ${res.reason ?? "skipped"}, state_changed_at = now()
                   WHERE id = ${r.id}`;
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      if (/Sending paused|AccountSuspended/i.test(msg)) {
        console.error("STOPPING: SES sending is paused for the account");
        stop = true;
        return;
      }
      // A throttle says nothing about the address. Suppressing on it permanently excluded 3,299
      // good prospects on the first full run — every one of them "Maximum sending rate exceeded",
      // which is SES asking us to slow down, not refusing the recipient. Leave the row alone and
      // the next run picks it up.
      if (/Maximum sending rate exceeded|Throttling|TooManyRequests|ServiceUnavailable|Timeout/i.test(msg)) {
        throttled++;
        return;
      }
      console.error(`  fail ${r.email}: ${msg.slice(0, 120)}`);
      await sql`UPDATE campaign_recipients
                   SET do_not_send = true, do_not_send_reason = 'send_rejected', state_changed_at = now()
                 WHERE id = ${r.id}`;
    }
  };

  // A fixed pool rather than Promise.all over everything: 50,191 promises at once would open
  // 50,191 sends against a 14/sec account.
  for (let i = 0; i < rows.length && !stop; i += CONCURRENCY) {
    await Promise.all(rows.slice(i, i + CONCURRENCY).map(sendOne));
    done += CONCURRENCY;

    if (done % CHECK_EVERY < CONCURRENCY) {
      const rep = await reputation();
      const rate = (sent / ((Date.now() - started) / 1000)).toFixed(1);
      const pct = (rep.complaint === null ? "?" : (rep.complaint * 100).toFixed(3) + "%");
      const bpct = (rep.bounce === null ? "?" : (rep.bounce * 100).toFixed(2) + "%");
      console.log(`  ${Math.min(done, rows.length)}/${rows.length}  sent ${sent} skip ${skipped} throttle ${throttled} fail ${failed}  ${rate}/s  bounce ${bpct}  complaint ${pct}`);
      if (rep.complaint !== null && rep.complaint >= STOP_COMPLAINT_RATE) {
        console.error(`STOPPING: complaint rate ${pct} >= ${(STOP_COMPLAINT_RATE * 100).toFixed(2)}%`);
        break;
      }
      if (rep.bounce !== null && rep.bounce >= STOP_BOUNCE_RATE) {
        console.error(`STOPPING: bounce rate ${bpct} >= ${(STOP_BOUNCE_RATE * 100).toFixed(2)}%`);
        break;
      }
    }
    if (INTERVAL_MS) await new Promise((res) => setTimeout(res, INTERVAL_MS));
  }

  console.log(`\ndone: sent ${sent}, skipped ${skipped}, throttled ${throttled}, failed ${failed}`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
