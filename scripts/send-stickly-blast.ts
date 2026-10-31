/**
 * Blasts the Stickly star-request to the GitHub developer cohort.
 *
 *   npx tsx --env-file=.env.local scripts/send-stickly-blast.ts <html> <devs.csv>          # dry run
 *   npx tsx --env-file=.env.local scripts/send-stickly-blast.ts <html> <devs.csv> --send
 *
 * Needs the SSM tunnel open first: scripts/prod-tunnel.sh
 *
 * Creates the campaign and step on first run, loads any new recipients, then sends. Safe to
 * re-run: the unique index on (recipient, campaign_id, step_key) means an address already mailed
 * is skipped rather than mailed twice, so a crash or a killed tunnel resumes rather than restarts.
 *
 * Sends through the stickly-outreach configuration set, whose event list deliberately omits CLICK.
 * With CLICK on, SES rewrites every href to awstrack.me -- a domain shared by every SES sender,
 * which Google Safe Browsing flags as "This link looks dangerous". That interstitial sits between
 * the click and GitHub, so the tracking costs more than it measures. Success here is read off the
 * repo's own star count, not off click events.
 *
 * Order matters and is not alphabetical:
 *   1. core tier first  - highest follower counts, so one star carries the most weight
 *   2. then active, present, rest
 *   3. qq/163/126/foxmail addresses LAST, in their own tail
 * Those Chinese providers block foreign senders aggressively. On 2026-10-07 this account touched
 * 5.39% bounce, just over the 5% line AWS reviews at; 25,569 of these addresses mixed into the
 * first batch could put it there again and stop the whole cohort. Kept at the end, a bounce spike
 * trips the brake after the good addresses are already out.
 */
import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { useProdDb } from "../lib/db-prod";

const CAMPAIGN_ID = "stickly_devs_2026";
const STEP_KEY = "s1_github_star";
const SENDER = "Tarun Mottlia <tarunmottlia@blogyapp.com>";
const REPLY_TO = "blogy.reverblunt@gmail.com";
const STREAM = "stickly_cold";
const CONFIG_SET = "stickly-outreach";
const SUBJECT = "Tarun Mottlia invited you to try Stickly on GitHub";
const REPO_URL = "https://github.com/tarunmottlia/stickly";

const CONCURRENCY = 10, INTERVAL_MS = 250, CHECK_EVERY = 500;
/** Loosened on Tarun's call. Bounce 7% sits inside AWS's review band (it reviews at 5%, pauses at
 *  10%) and cold lists genuinely run hot, so 4% was stopping on noise.
 *
 *  Complaint 0.2% sits above AWS's review line (0.1%) but below the 0.5% at which it suspends
 *  sending, so the brake still fires while there is an account left to protect -- which matters
 *  because Mantis sign-in codes go out on this same account. */
const STOP_COMPLAINT_RATE = 0.002, STOP_BOUNCE_RATE = 0.07;
/** Flat reserve, as asked: everything above this is spendable. */
const RESERVE = 5000;
/** core first, then down the tiers; China-provider addresses sort to the very end regardless. */
const TIER_ORDER: Record<string, number> = { core: 0, active: 1, present: 2, rest: 3 };

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
    .replace(/&times;/g, "x").replace(/&middot;/g, "-").replace(/&#9733;/g, "*")
    .replace(/&rsquo;/g, "'").replace(/&mdash;/g, "--").replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n").split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
}

async function main() {
  const [htmlPath, csvPath] = process.argv.slice(2);
  const send = process.argv.includes("--send");
  if (!htmlPath || !csvPath) { console.error("usage: send-stickly-blast.ts <html> <devs.csv> [--send]"); process.exit(1); }

  const html = readFileSync(htmlPath, "utf8").replaceAll("{{repo_url}}", REPO_URL);
  const text = htmlToText(html);

  // Nothing ships until the links are proven: this is the check that was missing when 152,921
  // Mantis emails went out with href="{{leads_url}}".
  const unresolved = [...new Set(`${html} ${SUBJECT}`.match(/\{\{[a-z_]+\}\}/g) ?? [])]
    .filter((t) => !["{{unsubscribe_url}}"].includes(t));
  if (unresolved.length) { console.error(`REFUSING: unresolved ${unresolved.join(",")}`); process.exit(1); }
  if (!html.includes("{{unsubscribe_url}}")) { console.error("REFUSING: no unsubscribe placeholder"); process.exit(1); }
  for (const u of [...new Set([...html.matchAll(/href="(https:\/\/[^"{]+)"/g)].map((m) => m[1]))]) {
    const r = await fetch(u, { redirect: "follow" }).catch(() => null);
    const ok = !!r && r.status < 400;
    console.log(`  link ${ok ? "OK  " : "DEAD"} ${r?.status ?? "ERR"} ${u.slice(0, 76)}`);
    if (!ok) { console.error("REFUSING: dead link"); process.exit(1); }
  }
  for (const u of [...new Set([...html.matchAll(/src="(https:\/\/[^"{]+)"/g)].map((m) => m[1]))]) {
    const r = await fetch(u).catch(() => null);
    const ok = !!r?.ok && (r.headers.get("content-type") ?? "").startsWith("image/");
    console.log(`  img  ${ok ? "OK  " : "DEAD"} ${r?.status ?? "ERR"} ${u.slice(0, 76)}`);
    if (!ok) { console.error("REFUSING: broken image"); process.exit(1); }
  }

  const q = await quota();
  if (!q.enabled) { console.error("REFUSING: SES sending disabled"); process.exit(1); }
  const headroom = Math.max(0, Math.floor(q.max24 - q.sent24 - RESERVE));
  const rep = await reputation();
  const bpct = rep.bounce === null ? "?" : (rep.bounce * 100).toFixed(2) + "%";
  const cpct = rep.complaint === null ? "?" : (rep.complaint * 100).toFixed(3) + "%";
  console.log(`quota ${q.sent24.toLocaleString()}/${q.max24.toLocaleString()}  headroom ${headroom.toLocaleString()} (reserve ${RESERVE})  bounce ${bpct}  complaint ${cpct}`);
  if (rep.complaint !== null && rep.complaint >= STOP_COMPLAINT_RATE) { console.error("STOPPING: complaint rate"); process.exit(1); }
  if (rep.bounce !== null && rep.bounce >= STOP_BOUNCE_RATE) { console.error("STOPPING: bounce rate"); process.exit(1); }

  const target = await useProdDb();
  const { sql } = await import("../lib/db");
  const { sendBulkEmail } = await import("../lib/email/send-bulk");
  const [w] = (await sql`SELECT current_database() db`) as unknown as { db: string }[];
  if (w.db !== target.database) { console.error(`REFUSING: pool is on '${w.db}'`); process.exit(1); }

  await sql`
    INSERT INTO campaigns (id, name, sender, stream, status, created_by, variables, max_touches,
                           config_set_unverified, send_window_start_hour, send_window_end_hour, default_tz)
    VALUES (${CAMPAIGN_ID}, 'Stickly - GitHub devs star request', ${SENDER}, ${STREAM}, 'paused',
            'tarun', ARRAY[]::text[], 1, ${CONFIG_SET}, 0, 24, 'Asia/Kolkata')
    ON CONFLICT (id) DO UPDATE SET sender=EXCLUDED.sender, config_set_unverified=EXCLUDED.config_set_unverified`;
  await sql`
    INSERT INTO campaign_steps (campaign_id, step_key, step_order, send_offset_minutes, gap_minutes,
                                requires_state, is_last_chance, subject, html, text)
    VALUES (${CAMPAIGN_ID}, ${STEP_KEY}, 1, 0, 1440, 'any', false, ${SUBJECT}, ${html}, ${text})
    ON CONFLICT (campaign_id, step_key) DO UPDATE SET subject=EXCLUDED.subject, html=EXCLUDED.html, text=EXCLUDED.text`;

  // Load recipients from the deduped CSV (idempotent).
  const rl = createInterface({ input: createReadStream(csvPath), crlfDelay: Infinity });
  type Row = { campaign_id: string; email: string; values: string; source: string; send_tz: string; send_tz_source: string };
  const batch: Row[] = []; let head = true, loaded = 0;
  const flush = async () => {
    if (!batch.length) return;
    const res = await sql`
      INSERT INTO campaign_recipients ${sql(batch, "campaign_id","email","values","source","send_tz","send_tz_source")}
      ON CONFLICT (campaign_id, email) DO NOTHING`;
    loaded += res.count ?? 0; batch.length = 0;
  };
  for await (const line of rl) {
    if (head) { head = false; continue; }
    if (!line) continue;
    const p = line.split(",");
    if (p.length < 5) continue;
    const email = p[0].trim().toLowerCase(); if (!email) continue;
    batch.push({ campaign_id: CAMPAIGN_ID, email,
      values: sql.json({ tier: p[1], login: p[2], cn: p[p.length-1] }) as unknown as string,
      source: "github_devs", send_tz: "Asia/Kolkata", send_tz_source: "default" });
    if (batch.length >= 1000) await flush();
  }
  await flush();
  console.log(`recipients loaded (new): ${loaded.toLocaleString()}`);

  const rows = (await sql`
    SELECT r.id, r.email, r.values FROM campaign_recipients r
     WHERE r.campaign_id=${CAMPAIGN_ID} AND r.do_not_send=false AND r.bounce_kind IS NULL
       AND r.state NOT IN ('suppressed','converted')
       AND NOT EXISTS (SELECT 1 FROM email_unsubscribes u WHERE lower(u.email)=r.email)
       AND NOT EXISTS (SELECT 1 FROM email_sends s WHERE s.recipient=r.email
                         AND s.campaign_id=${CAMPAIGN_ID} AND s.step_key=${STEP_KEY})`) as unknown as
     { id: string; email: string; values: Record<string,string> }[];

  rows.sort((a, b) => {
    const ca = a.values?.cn === "1" ? 1 : 0, cb = b.values?.cn === "1" ? 1 : 0;
    if (ca !== cb) return ca - cb;                       // China providers to the tail
    const ta = TIER_ORDER[a.values?.tier] ?? 9, tb = TIER_ORDER[b.values?.tier] ?? 9;
    return ta - tb;                                      // then core -> active -> present -> rest
  });
  const slice = rows.slice(0, headroom);
  const cn = slice.filter((r) => r.values?.cn === "1").length;
  console.log(`eligible ${rows.length.toLocaleString()}, this run ${slice.length.toLocaleString()} (china-provider in slice: ${cn.toLocaleString()})`);
  if (!send) { for (const r of slice.slice(0,5)) console.log(`  ${r.values?.tier?.padEnd(8)} ${r.email}`); console.log("DRY RUN — pass --send"); await sql.end(); return; }

  let sent=0, skipped=0, failed=0, throttled=0, done=0, stop=false;
  const started = Date.now();
  const one = async (r: { id: string; email: string }) => {
    try {
      const res = await sendBulkEmail({ to: r.email, subject: SUBJECT, html, text,
        campaignId: CAMPAIGN_ID, stepKey: STEP_KEY, template: STEP_KEY, stream: STREAM,
        sender: SENDER, replyTo: REPLY_TO, configSet: CONFIG_SET, touchNo: 1 });
      if (res.sent) { sent++; await sql`UPDATE campaign_recipients SET touch_count=1, state='active',
          state_changed_at=now() WHERE id=${r.id}`; } else skipped++;
    } catch (err) {
      failed++;
      const m = err instanceof Error ? err.message : String(err);
      if (/Sending paused|AccountSuspended|Daily message quota exceeded|LimitExceeded/i.test(m)) { console.error(`STOPPING: ${m.slice(0,70)}`); stop=true; return; }
      if (/Maximum sending rate exceeded|Throttling|TooManyRequests|ServiceUnavailable|Timeout/i.test(m)) { throttled++; return; }
      if (/CONNECTION_CLOSED|CONNECTION_ENDED|ECONNREFUSED|ECONNRESET|EPIPE|Connection terminated/i.test(m)) {
        console.error("STOPPING: database connection lost"); stop=true; return; }
      console.error(`  fail ${r.email}: ${m.slice(0,90)}`);
      try { await sql`UPDATE campaign_recipients SET do_not_send=true,
        do_not_send_reason='send_rejected', state_changed_at=now() WHERE id=${r.id}`; } catch { stop=true; }
    }
  };
  for (let i=0; i<slice.length && !stop; i+=CONCURRENCY) {
    await Promise.all(slice.slice(i, i+CONCURRENCY).map(one));
    done += CONCURRENCY;
    if (done % CHECK_EVERY < CONCURRENCY) {
      const rp = await reputation();
      console.log(`  ${Math.min(done,slice.length)}/${slice.length} sent ${sent} skip ${skipped} fail ${failed} thr ${throttled}  ${(sent/((Date.now()-started)/1000)).toFixed(1)}/s  bounce ${rp.bounce===null?"?":(rp.bounce*100).toFixed(2)+"%"}`);
      if (rp.complaint !== null && rp.complaint >= STOP_COMPLAINT_RATE) { console.error("STOPPING: complaint rate"); break; }
      if (rp.bounce !== null && rp.bounce >= STOP_BOUNCE_RATE) { console.error("STOPPING: bounce rate"); break; }
      const lq = await quota();
      if (lq.max24 - lq.sent24 <= RESERVE) { console.error(`STOPPING: reserve reached (${lq.sent24.toLocaleString()}/${lq.max24.toLocaleString()})`); break; }
    }
    if (INTERVAL_MS) await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
  console.log(`\ndone: sent ${sent}, skipped ${skipped}, throttled ${throttled}, failed ${failed}`);
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
