import { sql } from "@/lib/db";
import { StatCard, Section, Table, Pill, fmtAgo, fmtDT, fmtN } from "../ui";

/** SES mailing — kya gaya, kis campaign se, aur (SNS wiring ke baad) opens/clicks/bounces.
 * "Next batch" lifecycle cron ke schedule se derive hota hai, guess nahi. */

// Scraper EC2 root crontab: lifecycle 04:30 UTC daily → 10:00 IST.
function nextLifecycleRun(): Date {
  const next = new Date();
  next.setUTCHours(4, 30, 0, 0);
  if (next.getTime() <= Date.now()) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export default async function MailingPage() {
  const [[kpi], events, campaigns, recent, [lastRun]] = await Promise.all([
    sql`SELECT count(*)::int AS total,
               count(*) FILTER (WHERE sent_at > now() - interval '30 days')::int AS m30,
               count(*) FILTER (WHERE sent_at > now() - interval '7 days')::int AS w7,
               count(*) FILTER (WHERE stream = 'transactional')::int AS transactional,
               count(*) FILTER (WHERE stream = 'lifecycle')::int AS lifecycle,
               (SELECT count(*)::int FROM email_unsubscribes) AS unsubs
        FROM email_sends`,
    sql`SELECT event_type, count(*)::int AS n FROM email_events GROUP BY 1 ORDER BY n DESC`,
    sql`SELECT campaign_id, step_key, stream, count(*)::int AS n, max(sent_at) AS last_sent
        FROM email_sends GROUP BY 1, 2, 3 ORDER BY max(sent_at) DESC LIMIT 25`,
    sql`SELECT recipient, campaign_id, step_key, stream, sent_at, ses_message_id FROM email_sends ORDER BY sent_at DESC LIMIT 30`,
    sql`SELECT started_at, ok, summary, error FROM cron_runs WHERE job = 'lifecycle_email' ORDER BY started_at DESC LIMIT 1`,
  ]);

  const ev = new Map(events.map((e) => [e.event_type, Number(e.n)]));
  const hasEvents = events.length > 0;
  const opens = ev.get("Open") ?? 0, clicks = ev.get("Click") ?? 0;
  const bounces = ev.get("Bounce") ?? 0, complaints = ev.get("Complaint") ?? 0;

  return (
    <>
      <div className="adm-head">
        <h1>SES Mailing</h1>
        <span className="adm-asof">as of {fmtDT(new Date())} IST</span>
      </div>

      <div className="adm-cards">
        <StatCard label="Total sends" value={fmtN(kpi.total)} detail={`${kpi.w7} in 7d · ${kpi.m30} in 30d`} />
        <StatCard label="Transactional" value={fmtN(kpi.transactional)} />
        <StatCard label="Lifecycle" value={fmtN(kpi.lifecycle)} />
        <StatCard label="Unsubscribes" value={fmtN(kpi.unsubs)} tone={kpi.unsubs > 0 ? "bad" : undefined} />
        <StatCard label="Opens / Clicks" value={hasEvents ? `${fmtN(opens)} / ${fmtN(clicks)}` : "—"}
          detail={hasEvents ? undefined : "SNS event wiring pending"} />
        <StatCard label="Bounce / Spam" value={hasEvents ? `${fmtN(bounces)} / ${fmtN(complaints)}` : "—"}
          detail={hasEvents ? undefined : "SNS event wiring pending"} tone={bounces + complaints > 0 ? "bad" : undefined} />
      </div>

      <div className="adm-health">
        <div className="adm-health-item">
          <span className={`dot ${lastRun ? (lastRun.ok ? "ok" : "bad") : "mut"}`} />
          <div>
            <div className="t">Last batch (lifecycle cron)</div>
            <div className="s">{lastRun
              ? `${fmtAgo(lastRun.started_at)} · ${lastRun.ok ? `sent ${(lastRun.summary as { sent?: number })?.sent ?? "?"} / evaluated ${(lastRun.summary as { evaluated?: number })?.evaluated ?? "?"}` : `FAIL — ${lastRun.error?.slice(0, 60)}`}`
              : "abhi koi recorded run nahi (collector naya hai)"}</div>
          </div>
        </div>
        <div className="adm-health-item">
          <span className="dot ok" />
          <div>
            <div className="t">Next batch</div>
            <div className="s">{fmtDT(nextLifecycleRun())} IST (daily 10:00 IST)</div>
          </div>
        </div>
      </div>

      {!hasEvents && (
        <Section title="Opens / clicks / spam kyu khali hai" note="">
          <div className="adm-tablewrap"><div className="adm-empty">
            <Pill tone="info">setup pending</Pill> Webhook <code>/api/webhooks/ses-events</code> ready hai — SES configuration set + SNS topic
            banakar events publish karne hain (IAM permission chahiye, statement main de raha hoon). Uske baad ye numbers apne aap bharenge.
          </div></div>
        </Section>
      )}

      <Section title="Campaigns" note="Har campaign/step ka volume aur last send.">
        <Table head={["Campaign", "Step", "Stream", { label: "Sends", num: true }, "Last sent"]}
          rows={campaigns.map((c) => [c.campaign_id, c.step_key,
            <Pill key="s" tone={c.stream === "transactional" ? "info" : "mut"}>{c.stream}</Pill>,
            fmtN(c.n), fmtDT(c.last_sent)])}
          empty="abhi koi send nahi" />
      </Section>

      <Section title="Recent sends">
        <Table head={["When", "Recipient", "Campaign", "Step", "SES id"]}
          rows={recent.map((r) => [fmtDT(r.sent_at), r.recipient, r.campaign_id, r.step_key,
            r.ses_message_id ? String(r.ses_message_id).slice(0, 16) + "…" : "—"])}
          empty="abhi koi send nahi" />
      </Section>
    </>
  );
}
