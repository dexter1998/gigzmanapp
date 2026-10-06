/**
 * Loads the registry's person-type addresses into Mantis and sends them in one pass.
 *
 *   npx tsx scripts/push-mantis-person-tier.ts                   # dry run
 *   npx tsx scripts/push-mantis-person-tier.ts --load            # insert only
 *   npx tsx scripts/push-mantis-person-tier.ts --load --send     # insert and send
 *   npx tsx scripts/push-mantis-person-tier.ts --send --limit 2000
 *
 * Deliberately outside the dispatcher's drip. The point is to get the first touch out today so
 * the follow-up schedule starts tomorrow; at the dispatcher's current halved capacity this cohort
 * would take days to clear.
 *
 * Eligibility is checked at the domain, not just the address. 44% of this pool (49,859 of
 * 113,996) sits on a domain we have already contacted through some other address — mailing them
 * is contacting the same business twice, which an address-level check does not see.
 */
import { useProdDb } from "../lib/db-prod";
import { resolveTz, nextLocalSlot } from "../lib/outreach/send-time";

// lib/db builds its pool at import time, and lib/email/send-bulk writes through it, so both are
// imported only after useProdDb() has set DATABASE_URL. See lib/db-prod.ts.
type Sql = (typeof import("../lib/db"))["sql"];
type SendBulkEmail = (typeof import("../lib/email/send-bulk"))["sendBulkEmail"];
let sql: Sql;
let sendBulkEmail: SendBulkEmail;

const CAMPAIGN_ID = "mantis_cold_outreach_2026";
const SOURCE = "registry_person";
const CONCURRENCY = 10;
const INTERVAL_MS = 250;
const CHECK_EVERY = 500;
const STOP_COMPLAINT_RATE = 0.0009;
const STOP_BOUNCE_RATE = 0.04;

/** Mailboxes that are machinery. Found in this pool for real: 22,476 of them. */
const MACHINE = "^(dmarc|postmaster|abuse|noreply|no-reply|donotreply|bounce|mailer-daemon|webmaster|hostmaster|security|privacy|legal)";
/** The shared-inbox tiers, handled as their own cohort — rule 3 of the registry handoff. */
const SHARED = "^(info|hello|hi|hey|tech|it|contact|contato|enquiry|enquiries|inquiry|office|feedback|support|help|admin|team|mail|service)([._-]|[0-9]|$)";

const DACH_TLD = /\.(de|at|ch)$/i;
const DACH_COUNTRY = new Set(["germany", "austria", "switzerland", "de", "at", "ch"]);

export function cleanCompany(raw: string | null | undefined): string | null {
  let s = (raw ?? "").trim();
  if (!s) return null;
  s = s.split(/[|–—]/)[0].trim();
  if (/^https?:/i.test(s) || /\bwww\./i.test(s)) return null;
  if (s.length < 2 || s.length > 40 || !/[A-Za-z]/.test(s)) return null;
  return s;
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
    const p = (r.Datapoints ?? []).sort((a, b) => +(a.Timestamp ?? 0) - +(b.Timestamp ?? 0));
    return p.length ? (p[p.length - 1].Maximum ?? null) : null;
  };
  return { bounce: await read("Reputation.BounceRate"), complaint: await read("Reputation.ComplaintRate") };
}

async function load(): Promise<number> {
  const [campaign] = await sql`SELECT default_tz FROM campaigns WHERE id = ${CAMPAIGN_ID}`;
  const defaultTz = (campaign?.default_tz as string) ?? "Asia/Kolkata";

  // Built with temp tables because the same checks as IN-subqueries time out at 170s on these
  // row counts.
  await sql`CREATE TEMP TABLE _sent AS
    SELECT DISTINCT lower(recipient) e, split_part(lower(recipient),'@',2) d
      FROM email_sends WHERE ses_message_id IS NOT NULL`;
  await sql`CREATE INDEX ON _sent(e)`;
  await sql`CREATE INDEX ON _sent(d)`;
  await sql`CREATE TEMP TABLE _inlist AS SELECT DISTINCT lower(email) e FROM campaign_recipients`;
  await sql`CREATE INDEX ON _inlist(e)`;
  await sql`CREATE TEMP TABLE _unsub AS SELECT DISTINCT lower(email) e FROM email_unsubscribes`;
  await sql`CREATE INDEX ON _unsub(e)`;
  await sql`ANALYZE _sent`; await sql`ANALYZE _inlist`; await sql`ANALYZE _unsub`;

  const rows = (await sql`
    WITH touched AS (SELECT DISTINCT d FROM _sent)
    SELECT lower(se.email) AS email, se.domain, sd.company, sd.country
      FROM scrape_emails se
      LEFT JOIN scrape_domains sd ON sd.domain = se.domain
      LEFT JOIN _sent s     ON s.e = lower(se.email)
      LEFT JOIN touched t   ON t.d = se.domain
      LEFT JOIN _inlist i   ON i.e = lower(se.email)
      LEFT JOIN _unsub u    ON u.e = lower(se.email)
     WHERE ',' || se.campaigns || ',' LIKE '%,mantis-agency,%'
       AND NOT se.suppressed AND NOT se.bounced AND se.mx_ok IS NOT FALSE AND se.sent_at IS NULL
       AND split_part(lower(se.email),'@',1) !~ ${MACHINE}
       AND split_part(lower(se.email),'@',1) !~ ${SHARED}
       AND s.e IS NULL AND t.d IS NULL AND i.e IS NULL AND u.e IS NULL
       AND lower(se.email) ~ '^[^@\\s]+@[^@\\s.]+\\.[^@\\s]+$'
  `) as unknown as { email: string; domain: string; company: string | null; country: string | null }[];

  const keep = rows
    .filter((r) => !DACH_TLD.test(r.domain) && !DACH_COUNTRY.has((r.country ?? "").trim().toLowerCase()))
    .map((r) => {
      const t = resolveTz({ country: r.country, domain: r.domain });
      return {
        campaign_id: CAMPAIGN_ID,
        email: r.email,
        values: sql.json({ company: cleanCompany(r.company) ?? "your agency", domain: r.domain }) as unknown as string,
        source: SOURCE,
        send_tz: t.source === "default" ? defaultTz : t.tz,
        send_tz_source: t.source,
      };
    });

  console.log(`eligible: ${rows.length}, after DACH: ${keep.length}`);
  let inserted = 0;
  for (let i = 0; i < keep.length; i += 1000) {
    const res = await sql`
      INSERT INTO campaign_recipients ${sql(keep.slice(i, i + 1000),
        "campaign_id", "email", "values", "source", "send_tz", "send_tz_source")}
      ON CONFLICT (campaign_id, email) DO NOTHING`;
    inserted += res.count ?? 0;
    if (i % 20000 === 0) console.log(`  ${i + Math.min(1000, keep.length - i)}/${keep.length}`);
  }
  console.log(`inserted ${inserted}`);
  return inserted;
}

async function send(limit: number) {
  const [campaign] = await sql`
    SELECT sender, stream, config_set_unverified FROM campaigns WHERE id = ${CAMPAIGN_ID}`;
  const [step] = await sql`
    SELECT step_key, subject, html, text FROM campaign_steps
     WHERE campaign_id = ${CAMPAIGN_ID} ORDER BY step_order LIMIT 1`;

  const rows = (await sql`
    SELECT id, email, values FROM campaign_recipients
     WHERE campaign_id = ${CAMPAIGN_ID} AND source = ${SOURCE}
       AND do_not_send = false AND touch_count = 0
     ORDER BY imported_at ASC LIMIT ${limit}`) as unknown as
    { id: string; email: string; values: Record<string, string> }[];

  console.log(`sender: ${campaign.sender}`);
  console.log(`step:   ${step.step_key} — ${step.subject}`);
  console.log(`to send: ${rows.length}`);

  let sent = 0, skipped = 0, throttled = 0, failed = 0, envFailures = 0, done = 0, stop = false;
  const started = Date.now();

  const one = async (r: { id: string; email: string; values: Record<string, string> }) => {
    const fill = (s: string) => Object.entries(r.values).reduce((o, [k, v]) => o.replaceAll(`{{${k}}}`, v), s);
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
        // recordTouch would be the pipeline's own path, but this runs outside it; the next
        // due time still has to land in the recipient's local band or tomorrow's follow-up
        // goes out in the middle of their night.
        const [row] = await sql`SELECT send_tz FROM campaign_recipients WHERE id = ${r.id}`;
        const due = nextLocalSlot({
          tz: (row?.send_tz as string) ?? "Asia/Kolkata", minGapMinutes: 1440, seed: r.email,
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
      // Only a rejection of *this address* retires the recipient. Anything else -- a missing
      // AUTH_SECRET, a dropped tunnel, an SDK fault -- is about this process, not about them, and
      // marking it on the row burns a good prospect permanently. A first run of this script
      // retired 300 recipients on a missing AUTH_SECRET before this check existed.
      if (/MessageRejected|InvalidParameterValue.*(address|destination)|Email address is not verified|Domain contains illegal character|local address contains control or whitespace/i.test(msg)) {
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
    // 17,000 of them to find that out. If nothing has sent in the first 40 attempts, the fault is
    // this process, not the list.
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
}

async function main() {
  const target = await useProdDb();
  console.log(`db: ${target.user}@${target.host}/${target.database} (via tunnel 127.0.0.1:5433)`);
  sql = (await import("../lib/db")).sql;
  sendBulkEmail = (await import("../lib/email/send-bulk")).sendBulkEmail;

  const doLoad = process.argv.includes("--load");
  const doSend = process.argv.includes("--send");
  const li = process.argv.indexOf("--limit");
  const limit = li > -1 ? Number(process.argv[li + 1]) : 200000;

  if (!doLoad && !doSend) {
    const [n] = await sql`
      SELECT count(*)::int AS n FROM campaign_recipients
       WHERE campaign_id = ${CAMPAIGN_ID} AND source = ${SOURCE} AND do_not_send = false AND touch_count = 0`;
    console.log(`already loaded and unsent: ${n.n}`);
    console.log("DRY RUN — pass --load and/or --send");
    await sql.end();
    return;
  }
  if (doLoad) await load();
  if (doSend) await send(limit);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
