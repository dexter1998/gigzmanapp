/**
 * One tick of the 7-day push. Safe to run every 30 minutes; the watchdog does exactly that.
 *
 *   npx tsx --env-file=.env.local scripts/send-7day-tick.ts            # dry run
 *   npx tsx --env-file=.env.local scripts/send-7day-tick.ts --send
 *
 * Needs the SSM tunnel open first: scripts/prod-tunnel.sh
 *
 * A tick, not a daily job, because quota is not a lump sum handed out at 09:00. The 24-hour window
 * is rolling, so yesterday's sends age out through the day, and the outreach cron may not spend
 * its share. Re-reading the real numbers every 30 minutes collects that; a single morning run
 * would leave it on the table. Bounces do NOT give quota back -- SES counts what was sent, not
 * what arrived -- so topping up is about the rolling window, never about bounces.
 *
 * Nothing is cached: quota, reputation, unsubscribes and bounce flags are read fresh every tick,
 * so an address that unsubscribed an hour ago is already gone from this tick's audience.
 */
import { useProdDb } from "../lib/db-prod";
import { PLAN, senderFor, stepKey, REPLY_TO } from "./setup-7day-campaign";

const CAMPAIGN_ID = "mantis_leads_7day_2026";
/** Day 1. Every day index derives from this, so a missed day is skipped rather than shifting
 *  the whole schedule forward. */
// Shifted from 2026-10-12 so that 17 Oct is day 4. Days 4 and 5 were never sent -- the account
// went under review on 15 Oct and everything was paused -- and with the original start date the
// sequence would have resumed at day 6, skipping those two steps permanently.
const START_IST = "2026-10-14";

const CONCURRENCY = 10;
const INTERVAL_MS = 250;
const CHECK_EVERY = 500;

/** Below AWS's own lines: it reviews at 0.1% complaints / 5% bounces, pauses at 0.5% / 10%. */
const STOP_COMPLAINT_RATE = 0.0009;
const STOP_BOUNCE_RATE = 0.04;

/** Held back for sign-in codes and other transactional mail on the same account. */
const OTP_RESERVE_FRAC = 0.05;
/** Smallest share of each day's budget reserved for never-mailed addresses. Without a floor the
 *  delivered pool -- which grows every day -- eats the whole budget, so nobody new is ever added
 *  and the pool stops growing: the opposite of the intent. */
const NEW_FLOOR_FRAC = 0.25;

const WINDOW_START = 9, WINDOW_END = 20;

function istParts() {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric",
    month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false });
  const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
}

async function quota() {
  const { SESClient, GetSendQuotaCommand, GetAccountSendingEnabledCommand } = await import("@aws-sdk/client-ses");
  const c = new SESClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
  const [q, e] = await Promise.all([c.send(new GetSendQuotaCommand({})), c.send(new GetAccountSendingEnabledCommand({}))]);
  return { max24: q.Max24HourSend ?? 0, sent24: q.SentLast24Hours ?? 0, enabled: e.Enabled ?? false };
}

async function reputation() {
  const { CloudWatchClient, GetMetricStatisticsCommand } = await import("@aws-sdk/client-cloudwatch");
  const cw = new CloudWatchClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
  const read = async (n: string) => {
    const r = await cw.send(new GetMetricStatisticsCommand({ Namespace: "AWS/SES", MetricName: n,
      StartTime: new Date(Date.now() - 2 * 3600_000), EndTime: new Date(), Period: 3600, Statistics: ["Maximum"] }));
    const p = (r.Datapoints ?? []).sort((a, b) => +(a.Timestamp ?? 0) - +(b.Timestamp ?? 0));
    return p.length ? (p[p.length - 1].Maximum ?? null) : null;
  };
  return { bounce: await read("Reputation.BounceRate"), complaint: await read("Reputation.ComplaintRate") };
}

async function main() {
  const send = process.argv.includes("--send");
  const { date, hour } = istParts();
  const dayNo = Math.round((Date.parse(date) - Date.parse(START_IST)) / 86400000) + 1;
  const plan = PLAN.find((p) => p.day === dayNo);

  console.log(`[${new Date().toISOString()}] IST ${date} ${hour}:00  day ${dayNo}`);
  if (!plan) { console.log(`outside the 7-day window (day ${dayNo}) — nothing to do`); return; }
  if (hour < WINDOW_START || hour >= WINDOW_END) { console.log(`outside window ${WINDOW_START}-${WINDOW_END} — nothing to do`); return; }

  const q = await quota();
  if (!q.enabled) { console.error("REFUSING: SES sending is disabled"); process.exit(1); }
  const headroom = Math.max(0, Math.floor(q.max24 * (1 - OTP_RESERVE_FRAC) - q.sent24));
  const rep = await reputation();
  const bpct = rep.bounce === null ? "?" : (rep.bounce * 100).toFixed(2) + "%";
  const cpct = rep.complaint === null ? "?" : (rep.complaint * 100).toFixed(3) + "%";
  console.log(`quota ${q.sent24.toLocaleString()}/${q.max24.toLocaleString()}  headroom ${headroom.toLocaleString()}  bounce ${bpct}  complaint ${cpct}`);
  if (rep.complaint !== null && rep.complaint >= STOP_COMPLAINT_RATE) { console.error(`STOPPING: complaint ${cpct}`); process.exit(1); }
  if (rep.bounce !== null && rep.bounce >= STOP_BOUNCE_RATE) { console.error(`STOPPING: bounce ${bpct}`); process.exit(1); }
  if (headroom < 200) { console.log("headroom exhausted — nothing to do"); return; }

  const target = await useProdDb();
  const { sql } = await import("../lib/db");
  const { sendBulkEmail } = await import("../lib/email/send-bulk");
  const [w] = (await sql`SELECT current_database() db`) as unknown as { db: string }[];
  if (w.db !== target.database) { console.error(`REFUSING: pool is on '${w.db}'`); process.exit(1); }

  const key = stepKey(plan), sender = senderFor(plan.name);
  const [step] = (await sql`SELECT subject, html, text FROM campaign_steps
     WHERE campaign_id=${CAMPAIGN_ID} AND step_key=${key}`) as unknown as
     { subject: string; html: string; text: string }[];
  if (!step) { console.error(`REFUSING: step ${key} missing — run setup-7day-campaign.ts`); process.exit(1); }

  /**
   * Nothing goes out until this step's own links are proven good.
   *
   * On 2026-10-12 this check did not exist and 152,921 emails went out with href="{{leads_url}}":
   * the stored step still carried the placeholder, send-bulk only fills {{unsubscribe_url}}, and
   * the previews looked perfect because the preview script substituted it separately. The one
   * working link in those messages was the unsubscribe link, so every recorded click was somebody
   * leaving and not one person reached the signup page. A whole day's quota bought nothing.
   *
   * So: no unresolved tags, at least one real link, and every distinct URL actually answers.
   */
  const unresolved = [...new Set(`${step.html} ${step.subject}`.match(/\{\{[a-z_]+\}\}/g) ?? [])]
    .filter((t) => !["{{unsubscribe_url}}", "{{company}}"].includes(t));
  if (unresolved.length) {
    console.error(`REFUSING: ${key} carries unresolved ${unresolved.join(",")} — the CTA would be dead`);
    process.exit(1);
  }
  const links = [...new Set([...step.html.matchAll(/href="(https:\/\/[^"{]+)"/g)].map((m) => m[1]))];
  if (links.length === 0) { console.error(`REFUSING: ${key} has no real link`); process.exit(1); }
  for (const u of links) {
    const r = await fetch(u, { redirect: "follow" }).catch(() => null);
    const ok = !!r && r.status < 400;
    console.log(`  link ${ok ? "OK  " : "DEAD"} ${r?.status ?? "ERR"} ${u.slice(0, 80)}`);
    if (!ok) { console.error(`REFUSING: ${key} has a dead link`); process.exit(1); }
  }
  const imgs = [...new Set([...step.html.matchAll(/src="(https:\/\/[^"{]+)"/g)].map((m) => m[1]))];
  for (const u of imgs) {
    const r = await fetch(u).catch(() => null);
    const ok = !!r?.ok && (r.headers.get("content-type") ?? "").startsWith("image/");
    console.log(`  img  ${ok ? "OK  " : "DEAD"} ${r?.status ?? "ERR"} ${u.slice(0, 80)}`);
    if (!ok) { console.error(`REFUSING: ${key} has a broken image`); process.exit(1); }
  }

  const [c] = await sql`SELECT stream, config_set_unverified FROM campaigns WHERE id=${CAMPAIGN_ID}`;

  const newBudget = Math.max(0, Math.floor(headroom * NEW_FLOOR_FRAC));
  const deliveredBudget = headroom - newBudget;
  console.log(`step ${key}  from ${sender}  reply-to ${REPLY_TO}`);
  console.log(`budget: delivered ${deliveredBudget.toLocaleString()} + new ${newBudget.toLocaleString()}`);

  /**
   * Three bulk reads and then set arithmetic in memory, rather than a correlated EXISTS per
   * candidate.
   *
   * The obvious version -- EXISTS (SELECT 1 FROM email_events WHERE recipient = r.email) in the
   * WHERE clause -- measured 39 SECONDS per 1,000 rows on 2026-10-12, because email_events has no
   * index on `recipient` (only id, ses_message_id and (event_type, created_at)). A realistic
   * 50,000-row tick would have taken half an hour: longer than the SSM tunnel survives and longer
   * than the tick interval, so every tick would have died before sending anything and the whole
   * week would have produced nothing but "tick fail" lines. Adding the index is the proper fix and
   * needs a separate decision, so this works without it.
   *
   * Each query below is one pass that an existing index can serve, and the joining happens here.
   * Delivered is still recomputed every tick, so an address that took delivery yesterday counts as
   * delivered today -- that compounding is the whole design.
   */
  const [deliveredRows, sentRows, unsubRows, candidates] = await Promise.all([
    sql`SELECT DISTINCT recipient FROM email_events WHERE event_type='Delivery'`,
    sql`SELECT recipient FROM email_sends WHERE campaign_id=${CAMPAIGN_ID} AND step_key=${key}`,
    sql`SELECT lower(email) AS email FROM email_unsubscribes`,
    sql`SELECT r.id, r.email, r.values FROM campaign_recipients r
         WHERE r.campaign_id=${CAMPAIGN_ID} AND r.do_not_send=false AND r.bounce_kind IS NULL
           AND r.state NOT IN ('suppressed','converted')
         ORDER BY r.imported_at ASC`,
  ]);
  const delivered = new Set((deliveredRows as unknown as { recipient: string }[]).map((r) => r.recipient));
  const alreadySent = new Set((sentRows as unknown as { recipient: string }[]).map((r) => r.recipient));
  const unsubbed = new Set((unsubRows as unknown as { email: string }[]).map((r) => r.email));
  console.log(`pools: delivered-ever ${delivered.size.toLocaleString()}, already got ${key} ${alreadySent.size.toLocaleString()}, unsubscribed ${unsubbed.size.toLocaleString()}`);

  const eligible = (candidates as unknown as { id: string; email: string; values: Record<string, string> }[])
    .filter((r) => !alreadySent.has(r.email) && !unsubbed.has(r.email));
  const newOnes = eligible.filter((r) => !delivered.has(r.email)).slice(0, newBudget);
  // Whatever the new pool cannot absorb goes back to delivered. On day 1 the new pool holds 13,887
  // against a 25% floor worth far more, and leaving that quota unspent is the one thing this run
  // must not do. The floor is a guarantee for new addresses, not a cap on the day.
  const spill = newBudget - newOnes.length;
  const deliveredOnes = eligible.filter((r) => delivered.has(r.email)).slice(0, deliveredBudget + spill);
  if (spill > 0) console.log(`new pool short by ${spill.toLocaleString()} — spilled to delivered`);
  const rows = [...deliveredOnes, ...newOnes];
  console.log(`this tick: ${rows.length.toLocaleString()} recipients`);
  if (!send) { for (const r of rows.slice(0, 5)) console.log(`  ${r.email}`); console.log("DRY RUN — pass --send"); await sql.end(); return; }

  let sent = 0, skipped = 0, failed = 0, throttled = 0, done = 0, stop = false;
  const one = async (r: { id: string; email: string; values: Record<string, string> }) => {
    const fill = (s: string) => Object.entries(r.values ?? {}).reduce((o, [k, v]) => o.replaceAll(`{{${k}}}`, String(v)), s);
    try {
      const res = await sendBulkEmail({ to: r.email, subject: fill(step.subject), html: fill(step.html),
        text: fill(step.text), campaignId: CAMPAIGN_ID, stepKey: key, template: key,
        stream: c.stream as string, sender, replyTo: REPLY_TO,
        configSet: c.config_set_unverified as string, touchNo: plan.day });
      if (res.sent) { sent++; await sql`UPDATE campaign_recipients SET touch_count=touch_count+1,
          state='active', state_changed_at=now() WHERE id=${r.id}`; }
      else { skipped++; }
    } catch (err) {
      failed++;
      const m = err instanceof Error ? err.message : String(err);
      if (/Sending paused|AccountSuspended|Daily message quota exceeded/i.test(m)) { console.error(`STOPPING: ${m.slice(0,70)}`); stop = true; return; }
      if (/Maximum sending rate exceeded|Throttling|TooManyRequests|ServiceUnavailable|Timeout/i.test(m)) { throttled++; return; }
      // A dead tunnel is not a bad address: classify before any DB write, and end the tick so the
      // watchdog can reopen the tunnel. Charging this to the recipient would retire them forever.
      if (/CONNECTION_CLOSED|CONNECTION_ENDED|ECONNREFUSED|ECONNRESET|EPIPE|Connection terminated/i.test(m)) {
        console.error("STOPPING: database connection lost — watchdog will reopen the tunnel"); stop = true; return;
      }
      console.error(`  fail ${r.email}: ${m.slice(0, 90)}`);
      try {
        await sql`UPDATE campaign_recipients SET do_not_send=true,
          do_not_send_reason='send_rejected', state_changed_at=now() WHERE id=${r.id}`;
      } catch { stop = true; }
    }
  };

  const started = Date.now();
  for (let i = 0; i < rows.length && !stop; i += CONCURRENCY) {
    await Promise.all(rows.slice(i, i + CONCURRENCY).map(one));
    done += CONCURRENCY;
    if (done % CHECK_EVERY < CONCURRENCY) {
      const rp = await reputation();
      console.log(`  ${Math.min(done, rows.length)}/${rows.length} sent ${sent} skip ${skipped} fail ${failed} thr ${throttled}  ${(sent / ((Date.now() - started) / 1000)).toFixed(1)}/s`);
      if (rp.complaint !== null && rp.complaint >= STOP_COMPLAINT_RATE) { console.error("STOPPING: complaint rate"); break; }
      if (rp.bounce !== null && rp.bounce >= STOP_BOUNCE_RATE) { console.error("STOPPING: bounce rate"); break; }
      if (istParts().hour >= WINDOW_END) { console.error("STOPPING: past send window"); break; }
      // Re-read the real quota, because this tick is not the only sender. The list was sized
      // against the headroom at 09:26, but the outreach cron keeps spending from the same account
      // for the hours this tick runs, so the figure is stale the moment it is taken. On day 1 that
      // left a margin of only ~2,400 against the 5% reserve -- and sign-in codes come out of that
      // reserve, so overshooting locks users out of Mantis.
      const lq = await quota();
      if (lq.max24 * (1 - OTP_RESERVE_FRAC) - lq.sent24 <= 0) {
        console.error(`STOPPING: quota reserve reached (${lq.sent24.toLocaleString()}/${lq.max24.toLocaleString()})`);
        break;
      }
    }
    if (INTERVAL_MS) await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
  console.log(`tick done: sent ${sent}, skipped ${skipped}, throttled ${throttled}, failed ${failed}`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
