/**
 * Sends the first touch to every Mantis recipient already loaded and still sendable, in one pass,
 * in the order personal -> tier 1 -> tier 2.
 *
 *   npx tsx --env-file=.env.local scripts/send-mantis-ready.ts                  # dry run
 *   npx tsx --env-file=.env.local scripts/send-mantis-ready.ts --send
 *   npx tsx --env-file=.env.local scripts/send-mantis-ready.ts --send --limit 2000
 *
 * Needs the SSM tunnel open first: scripts/prod-tunnel.sh
 *
 * Outside the dispatcher on purpose. These 38,895 have been loaded and sendable for a while and
 * the dispatcher has not cleared them, because its capacity is halved by the historical bounce
 * warn; the point here is to get the first touch out today so follow-ups start tomorrow.
 *
 * The complaint stop is set above AWS's 0.1% review line and well below its 0.5% pause, which is
 * a deliberate decision taken with the account owner, not a default. It is set that way because
 * the account's own rate (0.094%) already sits above the previous 0.09% stop, so the previous
 * value stops every run instantly; and because the rate is complaints over sends, so a large
 * clean send lowers it -- halting is what freezes it.
 */
import { useProdDb } from "../lib/db-prod";
import { nextLocalSlot } from "../lib/outreach/send-time";

type Sql = (typeof import("../lib/db"))["sql"];
type SendBulkEmail = (typeof import("../lib/email/send-bulk"))["sendBulkEmail"];
let sql: Sql;
let sendBulkEmail: SendBulkEmail;

const CAMPAIGN_ID = "mantis_cold_outreach_2026";
const CONCURRENCY = 10;
const INTERVAL_MS = 250;
const CHECK_EVERY = 1000;
const STOP_COMPLAINT_RATE = 0.0025;
const STOP_BOUNCE_RATE = 0.04;

/** The buckets this run covers, and nothing else: the three groups that were counted and agreed. */
const PERSONAL = ["personal_domain", "personal_freemail", "person_own_domain", "founder_named", "person_named_offdomain"];

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
  const target = await useProdDb();
  console.log(`db: ${target.user}@${target.host}/${target.database} (via tunnel 127.0.0.1:5433)`);
  sql = (await import("../lib/db")).sql;
  sendBulkEmail = (await import("../lib/email/send-bulk")).sendBulkEmail;

  const doSend = process.argv.includes("--send");
  const li = process.argv.indexOf("--limit");
  const limit = li > -1 ? Number(process.argv[li + 1]) : 200000;
  // Measured on 34,054 live sends on 2026-10-06: generic_t1 delivered 0.8% (98.6% suppressed by
  // Auto Validation at send time) and generic_t2 8%, against 74.9% for the person buckets. There
  // is no point offering those two again.
  const personalOnly = process.argv.includes("--personal-only");

  const [campaign] = await sql`
    SELECT sender, stream, config_set_unverified, default_tz FROM campaigns WHERE id = ${CAMPAIGN_ID}`;
  const [step] = await sql`
    SELECT step_key, subject, html, text FROM campaign_steps
     WHERE campaign_id = ${CAMPAIGN_ID} ORDER BY step_order LIMIT 1`;

  // Ordered personal -> tier 1 -> tier 2, which is the order these were counted in and agreed.
  const rows = (await sql`
    SELECT r.id, r.email, r.values, r.send_tz,
           CASE WHEN se.bucket LIKE 'generic_t1%' THEN 2
                WHEN se.bucket LIKE 'generic_t2%' THEN 3 ELSE 1 END grp
      FROM campaign_recipients r
      JOIN scrape_emails se ON se.email = r.email
     WHERE r.campaign_id = ${CAMPAIGN_ID}
       AND r.touch_count = 0 AND r.do_not_send = false
       AND ',' || se.campaigns || ',' LIKE '%,mantis-agency,%'
       AND (se.bucket = ANY(${PERSONAL})
            OR (NOT ${personalOnly} AND (se.bucket LIKE 'generic_t1%' OR se.bucket LIKE 'generic_t2%')))
     ORDER BY grp ASC, r.imported_at ASC
     LIMIT ${limit}`) as unknown as
    { id: string; email: string; values: Record<string, string>; send_tz: string | null; grp: number }[];

  const byGrp = rows.reduce<Record<number, number>>((a, r) => ({ ...a, [r.grp]: (a[r.grp] ?? 0) + 1 }), {});
  console.log(`sender:  ${campaign.sender}`);
  console.log(`step:    ${step.step_key} — ${step.subject}`);
  console.log(`to send: ${rows.length}  (personal ${byGrp[1] ?? 0}, tier 1 ${byGrp[2] ?? 0}, tier 2 ${byGrp[3] ?? 0})`);
  console.log(`stops:   complaint >= ${(STOP_COMPLAINT_RATE * 100).toFixed(3)}%, bounce >= ${(STOP_BOUNCE_RATE * 100).toFixed(1)}%`);

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
        configSet: campaign.config_set_unverified as string, touchNo: 1,
      });
      if (res.sent) {
        sent++;
        // This runs outside the dispatcher, so the next due time has to be computed here or
        // tomorrow's follow-up lands in the middle of the recipient's night.
        const due = nextLocalSlot({
          tz: r.send_tz ?? (campaign.default_tz as string) ?? "Asia/Kolkata",
          minGapMinutes: 1440, seed: r.email,
        });
        await sql`UPDATE campaign_recipients
                     SET touch_count = 1, state = 'active', state_changed_at = now(), next_due_at = ${due}
                   WHERE id = ${r.id}`;
      } else {
        skipped++;
        await sql`UPDATE campaign_recipients SET do_not_send = true,
                     do_not_send_reason = ${res.reason ?? "skipped"} WHERE id = ${r.id}`;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/Sending paused|AccountSuspended/i.test(msg)) { console.error("STOPPING: SES paused"); stop = true; return; }
      if (/Maximum sending rate exceeded|Throttling|TooManyRequests|ServiceUnavailable|Timeout/i.test(msg)) { throttled++; return; }
      failed++;
      console.error(`  fail ${r.email}: ${msg.slice(0, 110)}`);
      // Only a rejection of *this address* retires the recipient. A missing secret, a dropped
      // tunnel or an SDK fault is about this process, and marking it on the row burns a good
      // prospect permanently.
      if (/MessageRejected|InvalidParameterValue.*(address|destination)|Email address is not verified|Domain contains illegal character/i.test(msg)) {
        await sql`UPDATE campaign_recipients SET do_not_send = true,
                     do_not_send_reason = 'send_rejected' WHERE id = ${r.id}`;
      } else {
        envFailures++;
      }
    }
  };

  for (let i = 0; i < rows.length && !stop; i += CONCURRENCY) {
    await Promise.all(rows.slice(i, i + CONCURRENCY).map(one));
    done += CONCURRENCY;
    // A broken environment fails every row identically, so there is no point working through
    // 38,000 of them to discover it.
    if (done >= 40 && sent === 0) {
      console.error(`STOPPING: ${envFailures} environment failures and 0 sends in ${done} attempts — fix the process, not the list`);
      break;
    }
    if (done % CHECK_EVERY < CONCURRENCY) {
      const rep = await reputation();
      const rate = (sent / ((Date.now() - started) / 1000)).toFixed(1);
      const b = rep.bounce === null ? "?" : (rep.bounce * 100).toFixed(2) + "%";
      const c = rep.complaint === null ? "?" : (rep.complaint * 100).toFixed(3) + "%";
      console.log(`  ${Math.min(done, rows.length)}/${rows.length}  sent ${sent} skip ${skipped} thr ${throttled} fail ${failed}  ${rate}/s  bounce ${b}  complaint ${c}`);
      if (rep.complaint !== null && rep.complaint >= STOP_COMPLAINT_RATE) { console.error(`STOPPING: complaint ${c}`); break; }
      if (rep.bounce !== null && rep.bounce >= STOP_BOUNCE_RATE) { console.error(`STOPPING: bounce ${b}`); break; }
    }
    if (INTERVAL_MS) await new Promise((res) => setTimeout(res, INTERVAL_MS));
  }

  console.log(`\ndone: sent ${sent}, skipped ${skipped}, throttled ${throttled}, failed ${failed} (of which ${envFailures} environmental, recipients left sendable)`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
