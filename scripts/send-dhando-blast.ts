/**
 * Sends the Dhando Hinglish cold email directly, without the outreach dispatcher.
 *
 *   npx tsx --env-file=.env.local scripts/send-dhando-blast.ts                  # dry run
 *   npx tsx --env-file=.env.local scripts/send-dhando-blast.ts --send
 *   npx tsx --env-file=.env.local scripts/send-dhando-blast.ts --send --limit 5000
 *
 * Needs the SSM tunnel open first: scripts/prod-tunnel.sh
 *
 * Built from send-stickly-blast.ts and keeps its two load-bearing properties: every message goes
 * through sendBulkEmail, so it is recorded in email_sends with its SES message id and carries the
 * configuration set -- the only reason opens, clicks, bounces and complaints come back at all --
 * and the unique index on (recipient, campaign_id, step_key) means stopping and re-running skips
 * what already went out rather than mailing it twice. Interrupting this is safe.
 *
 * What is new here is the quota ceiling, and it is not a nicety. The account's Max24HourSend is
 * 221,300 and it is SHARED with Mantis cold outreach, Mantis lifecycle mail and Stickly; the
 * sendable pool on this campaign is ~340,000. There is no day on which this list goes out in one
 * run. Past the ceiling SES does not queue, it rejects with Daily message quota exceeded, and
 * every rejected address is a row this script would otherwise have to reason about. So the run
 * sizes itself to the headroom AWS reports, re-reads it as it goes, and stops clean.
 */
import { useProdDb } from "../lib/db-prod";

// lib/db and lib/email/send-bulk are NOT imported here. Both reach the database, lib/db builds
// its pool at import time from DATABASE_URL, and useProdDb() only sets that variable when it
// runs -- so a top-level import of either binds the pool to whatever .env.local happens to say
// before the tunnel is ever consulted. .env.local is not production, so that silently sends the
// whole run at the local dev database. Hit for real on the first dry run of this script: it
// printed "db: gigzman-prod...", because useProdDb() returns the real host, and then reported
// "campaign not found", because the query went somewhere else entirely. Both imports are dynamic
// and live inside main(), after the await.

const CAMPAIGN_ID = "dhando_reviews_2026";
const STEP_KEY = "d2_hinglish";

/** Concurrency, not a sleep, sets the pace: each send costs four round-trips over the SSM tunnel
 *  at ~400ms each, so latency is the bottleneck, never a delay. Ten matches the postgres.js pool
 *  in lib/db.ts -- more would queue on a connection and buy nothing. The 250ms pause is what keeps
 *  it off the account's shared send-rate cap; riding that cap produced 3,299 throttles on the
 *  first Stickly run. */
const CONCURRENCY = 10;
const INTERVAL_MS = 250;

/** AWS reviews at 0.1% complaints and 5% bounces and pauses at 0.5% and 10%. These sit below the
 *  review line, because this bypasses the dispatcher's gates and an unattended blast with no
 *  brakes is how an account gets reviewed. */
const STOP_COMPLAINT_RATE = 0.0009;
const STOP_BOUNCE_RATE = 0.04;
const CHECK_EVERY = 500;

/** Leaves room for transactional mail -- sign-in codes live on the same account, and a blast that
 *  eats the last of the daily quota locks users out of Mantis. */
const QUOTA_RESERVE = 5000;

/** The campaign's own send window, in its own timezone. The dispatcher enforces this and a direct
 *  blast bypasses it; a Hinglish pitch landing in a shopkeeper's inbox at 4am is a complaint. */
const WINDOW_START_HOUR = 9;
const WINDOW_END_HOUR = 20;

/** v1 SES, not SESv2: @aws-sdk/client-ses is what this repo already ships (lib/ses.ts), and
 *  adding SESv2 as a dependency for one field is not worth a second SES client. The trade is that
 *  EnforcementStatus has no v1 equivalent, so the account-level check here is
 *  GetAccountSendingEnabled -- which is the flag that actually stops a send anyway. */
async function quota(): Promise<{ max24: number; sent24: number; rate: number; enabled: boolean }> {
  const { SESClient, GetSendQuotaCommand, GetAccountSendingEnabledCommand } = await import("@aws-sdk/client-ses");
  const c = new SESClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
  const [q, e] = await Promise.all([
    c.send(new GetSendQuotaCommand({})),
    c.send(new GetAccountSendingEnabledCommand({})),
  ]);
  return {
    max24: q.Max24HourSend ?? 0,
    sent24: q.SentLast24Hours ?? 0,
    rate: q.MaxSendRate ?? 0,
    enabled: e.Enabled ?? false,
  };
}

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

function istHour(): number {
  return Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false,
  }).format(new Date()));
}

async function main() {
  const send = process.argv.includes("--send");
  const limArg = process.argv.indexOf("--limit");
  const limit = limArg > -1 ? Number(process.argv[limArg + 1]) : Number.MAX_SAFE_INTEGER;

  const q = await quota();
  const headroom = Math.max(0, Math.floor(q.max24 - q.sent24 - QUOTA_RESERVE));
  console.log(`ses:        sending ${q.enabled ? "enabled" : "DISABLED"}, ${q.rate}/sec`);
  console.log(`quota:      ${q.sent24.toLocaleString()} / ${q.max24.toLocaleString()} used in last 24h`);
  console.log(`headroom:   ${headroom.toLocaleString()} (after ${QUOTA_RESERVE.toLocaleString()} reserved for transactional)`);
  if (!q.enabled) { console.error("REFUSING: SES sending is disabled for this account"); process.exit(1); }

  const hour = istHour();
  console.log(`ist hour:   ${hour} (window ${WINDOW_START_HOUR}-${WINDOW_END_HOUR})`);
  if (send && (hour < WINDOW_START_HOUR || hour >= WINDOW_END_HOUR)) {
    console.error(`REFUSING: ${hour}:00 IST is outside the campaign's send window`); process.exit(1);
  }

  const target = await useProdDb();
  const { sql } = await import("../lib/db");
  const { sendBulkEmail } = await import("../lib/email/send-bulk");
  console.log(`db:         ${target.user}@${target.host}/${target.database} (via tunnel)`);

  // The host useProdDb() reports and the host the pool actually dialled are two different facts,
  // and the first dry run proved they can disagree. Ask the connection itself.
  const [where] = (await sql`
    SELECT current_database() db, inet_server_addr()::text addr, inet_server_port() port`
  ) as unknown as { db: string; addr: string | null; port: number }[];
  console.log(`connected:  ${where.db} at ${where.addr ?? "local"}:${where.port}`);
  if (where.db !== target.database) {
    console.error(`REFUSING: pool is on '${where.db}', expected '${target.database}' — lib/db was imported before useProdDb()`);
    process.exit(1);
  }

  const [campaign] = await sql`
    SELECT sender, stream, status, config_set_unverified, max_touches
      FROM campaigns WHERE id = ${CAMPAIGN_ID}`;
  const [step] = await sql`
    SELECT step_key, subject, html, text FROM campaign_steps
     WHERE campaign_id = ${CAMPAIGN_ID} AND step_key = ${STEP_KEY}`;
  if (!campaign) { console.error(`REFUSING: campaign ${CAMPAIGN_ID} not found`); process.exit(1); }
  if (!step) { console.error(`REFUSING: step ${STEP_KEY} not found — run add-dhando-hinglish-step.ts first`); process.exit(1); }

  // Paused is a deliberate state someone chose. Honouring it only in the dispatcher and ignoring
  // it here would make the pause meaningless exactly when it matters.
  if (campaign.status !== "active") {
    console.error(`REFUSING: campaign status is '${campaign.status}'. To send, set it active:`);
    console.error(`  UPDATE campaigns SET status='active' WHERE id='${CAMPAIGN_ID}';`);
    process.exit(1);
  }

  const rows = (await sql`
    SELECT r.id, r.email, r.values
      FROM campaign_recipients r
     WHERE r.campaign_id = ${CAMPAIGN_ID}
       AND r.do_not_send = false
       AND r.touch_count = 0
       AND r.state NOT IN ('suppressed','converted')
       AND NOT EXISTS (SELECT 1 FROM email_unsubscribes u WHERE lower(u.email) = r.email)
     ORDER BY r.imported_at ASC
     LIMIT ${Math.min(limit, headroom)}
  `) as unknown as { id: string; email: string; values: Record<string, string> }[];

  const [{ n: poolTotal }] = (await sql`
    SELECT count(*)::int n FROM campaign_recipients
     WHERE campaign_id = ${CAMPAIGN_ID} AND do_not_send = false AND touch_count = 0`) as unknown as { n: number }[];

  console.log(`\nsender:     ${campaign.sender}`);
  console.log(`stream:     ${campaign.stream}`);
  console.log(`config set: ${campaign.config_set_unverified}`);
  console.log(`step:       ${step.step_key}`);
  console.log(`subject:    ${step.subject}`);
  console.log(`pool:       ${poolTotal.toLocaleString()} unsent`);
  console.log(`this run:   ${rows.length.toLocaleString()}  (${Math.max(0, poolTotal - rows.length).toLocaleString()} left for later days)`);

  if (!send) {
    for (const r of rows.slice(0, 5)) console.log(`  ${r.email}`);
    console.log("\nDRY RUN — pass --send");
    await sql.end();
    return;
  }

  let sent = 0, skipped = 0, failed = 0, throttled = 0, done = 0, stop = false;
  const started = Date.now();

  const sendOne = async (r: { id: string; email: string; values: Record<string, string> }) => {
    const fill = (s: string) =>
      Object.entries(r.values ?? {}).reduce((o, [k, v]) => o.replaceAll(`{{${k}}}`, String(v)), s);
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
        // A skip is permanent for this step; marking it keeps the next run off the same dead rows.
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
      // Out of quota is not the address's fault either, and there is no point walking the rest.
      if (/Daily message quota exceeded|LimitExceeded/i.test(msg)) {
        console.error("STOPPING: daily SES quota exhausted — re-run tomorrow, the pool resumes where it stopped");
        stop = true;
        return;
      }
      // A throttle says nothing about the address. Suppressing on it permanently excluded 3,299
      // good prospects on the first Stickly run — all of them "Maximum sending rate exceeded",
      // which is SES asking us to slow down, not refusing the recipient.
      if (/Maximum sending rate exceeded|Throttling|TooManyRequests|ServiceUnavailable|Timeout/i.test(msg)) {
        throttled++;
        return;
      }
      // A dead tunnel is not a bad address either, and this is the same mistake one layer out.
      // The SSM port-forward dies on a long run -- it did on 2026-10-10 at 14:45, 34k sends in --
      // and every in-flight send then failed with CONNECTION_CLOSED. That matched none of the
      // patterns above, so it fell through to the branch below and permanently retired the
      // recipient with reason 'send_rejected', for a fault that was entirely ours. Nothing
      // actually persisted that day only because the UPDATE needed the same dead connection.
      // Classifying it here means no DB write is even attempted, and the run stops rather than
      // spraying the rest of the list at a closed socket.
      if (/CONNECTION_CLOSED|CONNECTION_ENDED|CONNECTION_DESTROYED|ECONNREFUSED|ECONNRESET|EPIPE|ETIMEDOUT|Connection terminated|write EPIPE/i.test(msg)) {
        console.error(`STOPPING: database connection lost (${msg.slice(0, 70)})`);
        console.error("  reopen the tunnel (scripts/prod-tunnel.sh) and re-run — the pool resumes where it stopped");
        stop = true;
        return;
      }
      console.error(`  fail ${r.email}: ${msg.slice(0, 120)}`);
      // This UPDATE is the last thing standing between an error and the top of the process, so it
      // gets its own guard: on 2026-10-10 it threw ECONNREFUSED from inside this very catch, and
      // because nothing caught *that*, it rejected the Promise.all and killed the run outright
      // instead of being one failed address. A bookkeeping write is never worth the whole run.
      try {
        await sql`UPDATE campaign_recipients
                     SET do_not_send = true, do_not_send_reason = 'send_rejected', state_changed_at = now()
                   WHERE id = ${r.id}`;
      } catch (markErr) {
        const m = markErr instanceof Error ? markErr.message : String(markErr);
        console.error(`  (could not mark ${r.email}: ${m.slice(0, 70)})`);
        if (/CONNECTION_CLOSED|CONNECTION_ENDED|ECONNREFUSED|ECONNRESET|EPIPE|Connection terminated/i.test(m)) {
          stop = true;
        }
      }
    }
  };

  for (let i = 0; i < rows.length && !stop; i += CONCURRENCY) {
    await Promise.all(rows.slice(i, i + CONCURRENCY).map(sendOne));
    done += CONCURRENCY;

    if (done % CHECK_EVERY < CONCURRENCY) {
      const rep = await reputation();
      const rate = (sent / ((Date.now() - started) / 1000)).toFixed(1);
      const bpct = rep.bounce === null ? "?" : (rep.bounce * 100).toFixed(2) + "%";
      const cpct = rep.complaint === null ? "?" : (rep.complaint * 100).toFixed(3) + "%";
      console.log(`  ${Math.min(done, rows.length)}/${rows.length}  sent ${sent} skip ${skipped} throttle ${throttled} fail ${failed}  ${rate}/s  bounce ${bpct}  complaint ${cpct}`);
      if (rep.complaint !== null && rep.complaint >= STOP_COMPLAINT_RATE) {
        console.error(`STOPPING: complaint rate ${cpct} >= ${(STOP_COMPLAINT_RATE * 100).toFixed(2)}%`);
        break;
      }
      if (rep.bounce !== null && rep.bounce >= STOP_BOUNCE_RATE) {
        console.error(`STOPPING: bounce rate ${bpct} >= ${(STOP_BOUNCE_RATE * 100).toFixed(2)}%`);
        break;
      }
      // Transactional mail and the other campaigns are spending the same quota while this runs,
      // so the headroom measured at startup is already stale.
      const live = await quota();
      if (live.max24 - live.sent24 <= QUOTA_RESERVE) {
        console.error(`STOPPING: quota headroom down to ${Math.max(0, live.max24 - live.sent24)} — reserve is ${QUOTA_RESERVE}`);
        break;
      }
      if (istHour() >= WINDOW_END_HOUR) {
        console.error(`STOPPING: ${istHour()}:00 IST — past the send window`);
        break;
      }
    }
    if (INTERVAL_MS) await new Promise((res) => setTimeout(res, INTERVAL_MS));
  }

  console.log(`\ndone: sent ${sent}, skipped ${skipped}, throttled ${throttled}, failed ${failed}`);
  console.log(`remaining unsent in pool: ${Math.max(0, poolTotal - sent).toLocaleString()}`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
