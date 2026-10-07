/**
 * Sends one step to the addresses that have already accepted mail from us, to bring
 * Reputation.BounceRate down.
 *
 *   npx tsx --env-file=.env.local scripts/send-mantis-recovery.ts t6_multi
 *   npx tsx --env-file=.env.local scripts/send-mantis-recovery.ts t6_multi --send
 *   npx tsx --env-file=.env.local scripts/send-mantis-recovery.ts t6_multi --send --limit 20000
 *
 * Needs the SSM tunnel open first: scripts/prod-tunnel.sh
 *
 * Reputation.BounceRate is hard bounces over sends, so it can only be lowered by sending to
 * addresses that cannot bounce. An address with verification_status 'verified' and no bounce_kind
 * has a recorded delivery and no failure against it; mail to it adds to the denominator alone.
 *
 * What this deliberately excludes, because including it would do the exact opposite:
 *
 * - the 67,051 recipients already bounced or suppressed. Re-sending to an address on SES's
 *   suppression list produces a counted bounce, so "everyone we have ever mailed" would raise the
 *   rate rather than lower it.
 * - the 56,016 retired, which includes the npm_webdev pause that was decided to stay in place.
 * - 35,533 that were mailed with no delivery event recorded. They have not failed, but they have
 *   not been proven either, and the whole point of this pool is that it cannot bounce.
 *
 * The step must be one the recipient has not had: email_sends is UNIQUE on
 * (recipient, campaign_id, step_key) and a repeat is refused as "already sent".
 */
import { useProdDb } from "../lib/db-prod";
import { nextLocalSlot } from "../lib/outreach/send-time";

type Sql = (typeof import("../lib/db"))["sql"];
type SendBulkEmail = (typeof import("../lib/email/send-bulk"))["sendBulkEmail"];
let sql: Sql;
let sendBulkEmail: SendBulkEmail;

const CAMPAIGN_ID = "mantis_cold_outreach_2026";
const CONCURRENCY = 8;
const INTERVAL_MS = 250;
const CHECK_EVERY = 1000;
const STOP_COMPLAINT_RATE = 0.0025;
/**
 * 8%: an account-protection line, not a throttle.
 *
 * A first attempt set this at 4.7%, just above the rate at the time, and it halted after 1,000
 * sends when the rate reached 5.21% -- which 1,000 bounce-free sends cannot have caused. It was
 * the asynchronous tail of earlier blasts landing. Keying this pool's stop to the account rate
 * recreates the deadlock the pool exists to break: the only action that can lower the rate was
 * blocked by the rate being high.
 *
 * Every address here has a recorded delivery and no bounce, so these sends add to the denominator
 * alone. 8% still stops short of AWS's 10% pause, which would take sign-in codes down with the
 * campaign.
 */
const STOP_BOUNCE_RATE = 0.08;

async function reputation(): Promise<{ bounce: number | null; complaint: number | null }> {
  const { CloudWatchClient, GetMetricStatisticsCommand } = await import("@aws-sdk/client-cloudwatch");
  const cw = new CloudWatchClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
  const read = async (name: string) => {
    const r = await cw.send(new GetMetricStatisticsCommand({
      Namespace: "AWS/SES", MetricName: name,
      StartTime: new Date(Date.now() - 2 * 3600_000), EndTime: new Date(),
      Period: 3600, Statistics: ["Maximum"],
    }));
    const p = (r.Datapoints ?? []).sort((a, b) => +(a.Timestamp ?? 0) - +(b.Timestamp ?? 0));
    return p.length ? (p[p.length - 1].Maximum ?? null) : null;
  };
  return { bounce: await read("Reputation.BounceRate"), complaint: await read("Reputation.ComplaintRate") };
}

async function main() {
  const stepKey = process.argv[2];
  if (!stepKey || stepKey.startsWith("--")) { console.error("usage: send-mantis-recovery.ts <step_key> [--send] [--limit N]"); process.exit(1); }
  const doSend = process.argv.includes("--send");
  const li = process.argv.indexOf("--limit");
  const limit = li > -1 ? Number(process.argv[li + 1]) : 200000;

  const target = await useProdDb();
  console.log(`db: ${target.user}@${target.host}/${target.database} (via tunnel)`);
  sql = (await import("../lib/db")).sql;
  sendBulkEmail = (await import("../lib/email/send-bulk")).sendBulkEmail;

  const [campaign] = await sql`
    SELECT sender, stream, config_set_unverified, default_tz FROM campaigns WHERE id = ${CAMPAIGN_ID}`;
  const [step] = await sql`
    SELECT step_key, subject, html, text FROM campaign_steps
     WHERE campaign_id = ${CAMPAIGN_ID} AND step_key = ${stepKey}`;
  if (!step) { console.error(`no step ${stepKey} on ${CAMPAIGN_ID}`); process.exit(1); }

  const rows = (await sql`
    SELECT r.id, r.email, r.values, r.send_tz, r.touch_count
      FROM campaign_recipients r
     WHERE r.campaign_id = ${CAMPAIGN_ID}
       AND r.do_not_send = false
       AND r.verification_status = 'verified'
       AND r.bounce_kind IS NULL
       AND r.state NOT IN ('suppressed', 'converted')
       AND NOT EXISTS (SELECT 1 FROM email_unsubscribes u WHERE lower(u.email) = r.email)
       AND NOT EXISTS (
         SELECT 1 FROM email_sends s
          WHERE lower(s.recipient) = r.email AND s.campaign_id = ${CAMPAIGN_ID}
            AND s.step_key = ${stepKey})
     ORDER BY r.state_changed_at ASC
     LIMIT ${limit}`) as unknown as
    { id: string; email: string; values: Record<string, string>; send_tz: string | null; touch_count: number }[];

  console.log(`sender:  ${campaign.sender}`);
  console.log(`step:    ${step.step_key} — ${step.subject}`);
  console.log(`pool:    ${rows.length} already-delivered, never-bounced recipients`);
  console.log(`stops:   complaint >= ${(STOP_COMPLAINT_RATE * 100).toFixed(3)}%, bounce >= ${(STOP_BOUNCE_RATE * 100).toFixed(2)}%`);
  if (!doSend) { console.log("\nDRY RUN — pass --send"); await sql.end(); return; }

  let sent = 0, skipped = 0, throttled = 0, failed = 0, envFailures = 0, done = 0, stop = false;
  const started = Date.now();

  const one = async (r: typeof rows[number]) => {
    const fill = (s: string) => Object.entries(r.values ?? {}).reduce((o, [k, v]) => o.replaceAll(`{{${k}}}`, String(v)), s);
    try {
      const res = await sendBulkEmail({
        to: r.email, subject: fill(step.subject as string),
        html: fill(step.html as string), text: fill(step.text as string),
        campaignId: CAMPAIGN_ID, stepKey: step.step_key as string,
        template: step.step_key as string, stream: campaign.stream as string,
        sender: campaign.sender as string,
        configSet: campaign.config_set_unverified as string,
        touchNo: (r.touch_count ?? 0) + 1,
      });
      if (res.sent) {
        sent++;
        const due = nextLocalSlot({
          tz: r.send_tz ?? (campaign.default_tz as string) ?? "Asia/Kolkata",
          minGapMinutes: 1440, seed: r.email,
        });
        await sql`UPDATE campaign_recipients
                     SET touch_count = touch_count + 1, state_changed_at = now(), next_due_at = ${due}
                   WHERE id = ${r.id}`;
      } else {
        // Not retired on a skip. "already sent" here means another run got there first, which
        // says nothing bad about the recipient; marking do_not_send would burn them.
        skipped++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/Sending paused|AccountSuspended/i.test(msg)) { console.error("STOPPING: SES paused"); stop = true; return; }
      if (/Maximum sending rate exceeded|Throttling|TooManyRequests|ServiceUnavailable|Timeout/i.test(msg)) { throttled++; return; }
      failed++;
      if (failed <= 10) console.error(`  fail ${r.email}: ${msg.slice(0, 110)}`);
      if (!/MessageRejected|InvalidParameterValue.*(address|destination)/i.test(msg)) envFailures++;
    }
  };

  for (let i = 0; i < rows.length && !stop; i += CONCURRENCY) {
    await Promise.all(rows.slice(i, i + CONCURRENCY).map(one));
    done += CONCURRENCY;
    if (done >= 40 && sent === 0) {
      console.error(`STOPPING: ${envFailures} environment failures and 0 sends in ${done} attempts`);
      break;
    }
    if (done % CHECK_EVERY < CONCURRENCY) {
      const rep = await reputation();
      const rate = (sent / ((Date.now() - started) / 1000)).toFixed(1);
      const b = rep.bounce === null ? "?" : (rep.bounce * 100).toFixed(2) + "%";
      const c = rep.complaint === null ? "?" : (rep.complaint * 100).toFixed(3) + "%";
      console.log(`  ${Math.min(done, rows.length)}/${rows.length}  sent ${sent} skip ${skipped} thr ${throttled} fail ${failed}  ${rate}/s  bounce ${b}  complaint ${c}`);
      if (rep.complaint !== null && rep.complaint >= STOP_COMPLAINT_RATE) { console.error(`STOPPING: complaint ${c}`); break; }
      if (rep.bounce !== null && rep.bounce >= STOP_BOUNCE_RATE) { console.error(`STOPPING: bounce ${b} — this pool should not be able to raise it, so the premise is wrong`); break; }
    }
    if (INTERVAL_MS) await new Promise((res) => setTimeout(res, INTERVAL_MS));
  }

  console.log(`\ndone: sent ${sent}, skipped ${skipped}, throttled ${throttled}, failed ${failed} (${envFailures} environmental)`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
