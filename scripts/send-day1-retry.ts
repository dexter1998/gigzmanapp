/**
 * Re-sends day 1 to the people who opened it, with a CTA that works.
 *
 *   npx tsx --env-file=.env.local scripts/send-day1-retry.ts <multi.html>          # dry run
 *   npx tsx --env-file=.env.local scripts/send-day1-retry.ts <multi.html> --send
 *
 * Needs the SSM tunnel open first: scripts/prod-tunnel.sh
 *
 * On 2026-10-12 day1_multi went to 154,981 addresses with href="{{leads_url}}" -- a dead button.
 * 27,173 of them opened it and had nothing to click. They are the one group where a second send is
 * clearly owed rather than merely tolerated.
 *
 * Openers and clickers both qualify. The clickers need a note: on day 1 the unsubscribe link was
 * the only working link in the message, so a "click" that day means somebody reached for the exit,
 * not somebody interested -- 9,673 of them opened it first. Including them anyway is a deliberate
 * call: with a real CTA present the second time, anyone who still wants out can take it, and the
 * opt-out is honoured when they do.
 *
 * What is never re-mailed, and is not a judgement call: addresses already in email_unsubscribes.
 * send-bulk enforces that on its own and the query below excludes them too. Bounced and retired
 * rows are out as well, because mailing a known-dead address only spends reputation.
 *
 * The cohort is recomputed on every run, so opens that land while the quota refills are picked up
 * by the next run without anyone editing anything.
 *
 * Its own step_key, so the unique index on (recipient, campaign_id, step_key) lets it through
 * while each run stays idempotent and safe to repeat.
 */
import { readFileSync } from "node:fs";
import { useProdDb } from "../lib/db-prod";
import { senderFor, REPLY_TO } from "./setup-7day-campaign";

const CAMPAIGN_ID = "mantis_leads_7day_2026";
const SOURCE_STEP = "day1_multi";
const STEP_KEY = "day1_retry_multi";
const SUBJECT = "A lead for {{company}}, need a website";
/** Emily sent day 1; the correction comes from the same name rather than a stranger. */
const SENDER_NAME = "Emily";

const CONCURRENCY = 10, INTERVAL_MS = 250, CHECK_EVERY = 500;
const STOP_COMPLAINT_RATE = 0.0009, STOP_BOUNCE_RATE = 0.04;
const OTP_RESERVE_FRAC = 0.05;
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

function htmlToText(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/(p|div|tr|h1|h2|h3|table)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, h, t) => {
      const l = String(t).replace(/<[^>]+>/g, "").trim(); return l ? `${l}: ${h}` : ""; })
    .replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&#8594;/g, "->")
    .replace(/&#8599;/g, "^").replace(/&middot;/g, "-").replace(/&#9679;/g, "*")
    .replace(/&#9733;/g, "*").replace(/&eacute;/g, "e").replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n").split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
}

async function main() {
  const htmlPath = process.argv[2];
  const send = process.argv.includes("--send");
  if (!htmlPath) { console.error("usage: send-day1-retry.ts <multi.html> [--send]"); process.exit(1); }

  const { hour } = istParts();
  if (hour < WINDOW_START || hour >= WINDOW_END) { console.log(`outside window ${WINDOW_START}-${WINDOW_END} — nothing to do`); return; }

  const q = await quota();
  if (!q.enabled) { console.error("REFUSING: SES sending disabled"); process.exit(1); }
  const headroom = Math.max(0, Math.floor(q.max24 * (1 - OTP_RESERVE_FRAC) - q.sent24));
  const rep = await reputation();
  const bpct = rep.bounce === null ? "?" : (rep.bounce * 100).toFixed(2) + "%";
  const cpct = rep.complaint === null ? "?" : (rep.complaint * 100).toFixed(3) + "%";
  console.log(`[retry] quota ${q.sent24.toLocaleString()}/${q.max24.toLocaleString()}  headroom ${headroom.toLocaleString()}  bounce ${bpct}  complaint ${cpct}`);
  if (rep.complaint !== null && rep.complaint >= STOP_COMPLAINT_RATE) { console.error("STOPPING: complaint rate"); process.exit(1); }
  if (rep.bounce !== null && rep.bounce >= STOP_BOUNCE_RATE) { console.error("STOPPING: bounce rate"); process.exit(1); }
  if (headroom < 200) { console.log("[retry] headroom exhausted — nothing to do"); return; }

  const url = `https://mantisai.in/login?tab=signup&utm_source=email&utm_medium=email`
            + `&utm_campaign=${CAMPAIGN_ID}&utm_content=${STEP_KEY}`;
  const html = readFileSync(htmlPath, "utf8").replaceAll("{{leads_url}}", url);
  const text = htmlToText(html);

  // The same check the tick now runs, for the same reason: this script exists because an unfilled
  // placeholder shipped once already.
  const unresolved = [...new Set(`${html} ${SUBJECT}`.match(/\{\{[a-z_]+\}\}/g) ?? [])]
    .filter((t) => !["{{unsubscribe_url}}", "{{company}}"].includes(t));
  if (unresolved.length) { console.error(`REFUSING: unresolved ${unresolved.join(",")}`); process.exit(1); }
  const links = [...new Set([...html.matchAll(/href="(https:\/\/[^"{]+)"/g)].map((m) => m[1]))];
  const imgs = [...new Set([...html.matchAll(/src="(https:\/\/[^"{]+)"/g)].map((m) => m[1]))];
  if (!links.length) { console.error("REFUSING: no real link"); process.exit(1); }
  for (const u of links) {
    const r = await fetch(u, { redirect: "follow" }).catch(() => null);
    const ok = !!r && r.status < 400;
    console.log(`  link ${ok ? "OK  " : "DEAD"} ${r?.status ?? "ERR"} ${u.slice(0, 78)}`);
    if (!ok) { console.error("REFUSING: dead link"); process.exit(1); }
  }
  for (const u of imgs) {
    const r = await fetch(u).catch(() => null);
    const ok = !!r?.ok && (r.headers.get("content-type") ?? "").startsWith("image/");
    console.log(`  img  ${ok ? "OK  " : "DEAD"} ${r?.status ?? "ERR"} ${u.slice(0, 78)}`);
    if (!ok) { console.error("REFUSING: broken image"); process.exit(1); }
  }

  const target = await useProdDb();
  const { sql } = await import("../lib/db");
  const { sendBulkEmail } = await import("../lib/email/send-bulk");
  const [w] = (await sql`SELECT current_database() db`) as unknown as { db: string }[];
  if (w.db !== target.database) { console.error(`REFUSING: pool is on '${w.db}'`); process.exit(1); }

  const [c] = await sql`SELECT stream, config_set_unverified FROM campaigns WHERE id=${CAMPAIGN_ID}`;
  await sql`
    INSERT INTO campaign_steps (campaign_id, step_key, step_order, send_offset_minutes, gap_minutes,
                                requires_state, is_last_chance, subject, html, text)
    VALUES (${CAMPAIGN_ID}, ${STEP_KEY}, 99, 0, 1440, 'any', false, ${SUBJECT}, ${html}, ${text})
    ON CONFLICT (campaign_id, step_key) DO UPDATE SET html=EXCLUDED.html, text=EXCLUDED.text,
      subject=EXCLUDED.subject`;

  const rows = (await sql`
    WITH s AS (SELECT recipient, ses_message_id FROM email_sends
                WHERE campaign_id=${CAMPAIGN_ID} AND step_key=${SOURCE_STEP}),
    ev AS (SELECT s.recipient,
             bool_or(e.event_type='Open')   AS opened,
             bool_or(e.event_type='Click')  AS clicked,
             bool_or(e.event_type='Bounce') AS bounced
           FROM s LEFT JOIN email_events e ON e.ses_message_id = s.ses_message_id
          GROUP BY s.recipient)
    SELECT r.id, r.email, r.values FROM ev
      JOIN campaign_recipients r ON r.email = ev.recipient AND r.campaign_id = ${CAMPAIGN_ID}
     WHERE (ev.opened OR ev.clicked) AND NOT ev.bounced
       AND r.do_not_send = false AND r.bounce_kind IS NULL
       AND r.state NOT IN ('suppressed','converted')
       AND NOT EXISTS (SELECT 1 FROM email_unsubscribes u WHERE lower(u.email) = ev.recipient)
       AND NOT EXISTS (SELECT 1 FROM email_sends x WHERE x.recipient = ev.recipient
                         AND x.campaign_id = ${CAMPAIGN_ID} AND x.step_key = ${STEP_KEY})
     ORDER BY r.imported_at ASC LIMIT ${headroom}`) as unknown as
     { id: string; email: string; values: Record<string, string> }[];

  console.log(`[retry] step ${STEP_KEY}  from ${senderFor(SENDER_NAME)}  reply-to ${REPLY_TO}`);
  console.log(`[retry] cohort this run: ${rows.length.toLocaleString()}`);
  if (!send) { for (const r of rows.slice(0, 5)) console.log(`  ${r.email}`); console.log("DRY RUN — pass --send"); await sql.end(); return; }

  let sent = 0, skipped = 0, failed = 0, throttled = 0, done = 0, stop = false;
  const started = Date.now();
  const one = async (r: { id: string; email: string; values: Record<string, string> }) => {
    const fill = (s: string) => Object.entries(r.values ?? {}).reduce((o, [k, v]) => o.replaceAll(`{{${k}}}`, String(v)), s);
    try {
      const res = await sendBulkEmail({ to: r.email, subject: fill(SUBJECT), html: fill(html), text: fill(text),
        campaignId: CAMPAIGN_ID, stepKey: STEP_KEY, template: STEP_KEY, stream: c.stream as string,
        sender: senderFor(SENDER_NAME), replyTo: REPLY_TO,
        configSet: c.config_set_unverified as string, touchNo: 1 });
      if (res.sent) { sent++; await sql`UPDATE campaign_recipients SET touch_count=touch_count+1,
          state='active', state_changed_at=now() WHERE id=${r.id}`; } else skipped++;
    } catch (err) {
      failed++;
      const m = err instanceof Error ? err.message : String(err);
      if (/Sending paused|AccountSuspended|Daily message quota exceeded/i.test(m)) { console.error(`STOPPING: ${m.slice(0,70)}`); stop = true; return; }
      if (/Maximum sending rate exceeded|Throttling|TooManyRequests|ServiceUnavailable|Timeout/i.test(m)) { throttled++; return; }
      if (/CONNECTION_CLOSED|CONNECTION_ENDED|ECONNREFUSED|ECONNRESET|EPIPE|Connection terminated/i.test(m)) {
        console.error("STOPPING: database connection lost"); stop = true; return; }
      console.error(`  fail ${r.email}: ${m.slice(0, 90)}`);
      try { await sql`UPDATE campaign_recipients SET do_not_send=true,
        do_not_send_reason='send_rejected', state_changed_at=now() WHERE id=${r.id}`; } catch { stop = true; }
    }
  };

  for (let i = 0; i < rows.length && !stop; i += CONCURRENCY) {
    await Promise.all(rows.slice(i, i + CONCURRENCY).map(one));
    done += CONCURRENCY;
    if (done % CHECK_EVERY < CONCURRENCY) {
      const rp = await reputation();
      console.log(`  [retry] ${Math.min(done, rows.length)}/${rows.length} sent ${sent} skip ${skipped} fail ${failed} thr ${throttled}  ${(sent/((Date.now()-started)/1000)).toFixed(1)}/s`);
      if (rp.complaint !== null && rp.complaint >= STOP_COMPLAINT_RATE) { console.error("STOPPING: complaint rate"); break; }
      if (rp.bounce !== null && rp.bounce >= STOP_BOUNCE_RATE) { console.error("STOPPING: bounce rate"); break; }
      if (istParts().hour >= WINDOW_END) { console.error("STOPPING: past window"); break; }
      const lq = await quota();
      if (lq.max24 * (1 - OTP_RESERVE_FRAC) - lq.sent24 <= 0) { console.error("STOPPING: quota reserve reached"); break; }
    }
    if (INTERVAL_MS) await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
  console.log(`[retry] done: sent ${sent}, skipped ${skipped}, throttled ${throttled}, failed ${failed}`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
