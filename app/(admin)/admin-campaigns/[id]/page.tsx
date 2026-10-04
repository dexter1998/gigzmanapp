import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { PageHeader, CardRow, StatCard, Section, Table, Pill, fmtDT, fmtN } from "../../admin/ui";
import { IconUsers, IconMailOpened, IconClick, IconAlertTriangle } from "@tabler/icons-react";
import { StatusControl } from "./StatusControl";
import { ImportForm } from "./ImportForm";
import { StartBatchForm } from "./StartBatchForm";
import { VariablesEditor } from "./VariablesEditor";
import { FlowDiagram } from "./FlowDiagram";
import { JourneyFlow, type JourneyCounts } from "./JourneyFlow";
import { LiveRefresh } from "./LiveRefresh";

const RECIPIENT_PAGE_SIZE = 50;

export default async function CampaignDetailPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const offset = (page - 1) * RECIPIENT_PAGE_SIZE;

  // The journey funnel, straight off campaign_recipients.state — the same column the rule engine
  // reads — so what is on screen is what the next tick will act on, not a parallel calculation
  // that can quietly drift away from it.
  const journeyRows = await sql`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE verification_status = 'unverified')::int AS unverified,
      count(*) FILTER (WHERE verification_status = 'verified')::int AS verified,
      count(*) FILTER (WHERE verification_status = 'invalid')::int AS invalid,
      count(*) FILTER (WHERE state = 'new')::int AS new,
      count(*) FILTER (WHERE state = 'active')::int AS active,
      count(*) FILTER (WHERE state = 'warm')::int AS warm,
      count(*) FILTER (WHERE state = 'hot')::int AS hot,
      count(*) FILTER (WHERE state = 'converted')::int AS converted,
      count(*) FILTER (WHERE state = 'stalled')::int AS stalled,
      count(*) FILTER (WHERE state = 'suppressed')::int AS suppressed,
      count(*) FILTER (WHERE do_not_send = false AND state NOT IN ('suppressed','converted','stalled')
                         AND next_due_at IS NOT NULL AND next_due_at <= now())::int AS due_now,
      count(*) FILTER (WHERE bounce_kind = 'validation_suppressed')::int AS validation_suppressed,
      count(*) FILTER (WHERE bounce_kind = 'hard_mta')::int AS hard_bounce,
      count(*) FILTER (WHERE do_not_send_reason = 'complaint')::int AS complaint
    FROM campaign_recipients WHERE campaign_id = ${id}
  `;
  const lastRuns = await sql`
    SELECT started_at, finished_at, blocked_by, capacity, planned_new, planned_followup,
           sent, failed, bounce_rate, complaint_rate, quota_headroom
    FROM outreach_runs WHERE campaign_id = ${id} ORDER BY started_at DESC LIMIT 8
  `;

  const jr = journeyRows[0] as Record<string, number>;
  const unsubRows = await sql`
    SELECT count(*)::int AS n FROM campaign_recipients cr
    JOIN campaigns c ON c.id = cr.campaign_id
    WHERE cr.campaign_id = ${id}
      AND EXISTS (SELECT 1 FROM email_unsubscribes eu WHERE eu.email = cr.email AND eu.stream IN ('all', c.stream))
  `;
  const journey: JourneyCounts = {
    total: jr.total, unverified: jr.unverified, verified: jr.verified, invalid: jr.invalid,
    new: jr.new, active: jr.active, warm: jr.warm, hot: jr.hot, converted: jr.converted,
    stalled: jr.stalled, suppressed: jr.suppressed, dueNow: jr.due_now,
    validationSuppressed: jr.validation_suppressed, hardBounce: jr.hard_bounce,
    complaint: jr.complaint, unsubscribed: (unsubRows[0] as { n: number }).n,
  };

  const [[campaign], steps, batches, [recipientTotal], batchRuns, statusCounts, recipientSample] = await Promise.all([
    sql`SELECT id, name, sender, stream, status, created_by, created_at, variables FROM campaigns WHERE id = ${id}`,
    sql`
      SELECT cs.step_key, cs.step_order, cs.send_offset_minutes, cs.step_type, cs.subject,
             (SELECT count(*)::int FROM email_sends es WHERE es.campaign_id = cs.campaign_id AND es.step_key = cs.step_key) AS sent_count
      FROM campaign_steps cs WHERE cs.campaign_id = ${id} ORDER BY cs.step_order
    `,
    sql`SELECT batch, count(*)::int AS n FROM campaign_recipients WHERE campaign_id = ${id} GROUP BY batch ORDER BY batch`,
    sql`SELECT count(*)::int AS n FROM campaign_recipients WHERE campaign_id = ${id}`,
    sql`SELECT batch, started_at, started_by FROM campaign_batch_runs WHERE campaign_id = ${id}`,
    // Status priority: registered (signed up on Mantis since) > opened/clicked (needs the SNS
    // event pipeline actually wired — see app/api/webhooks/ses-events) > sent > not yet sent.
    sql`
      SELECT
        count(*) FILTER (WHERE up.email IS NOT NULL)::int AS registered,
        count(*) FILTER (WHERE up.email IS NULL AND ev.hit)::int AS opened,
        count(*) FILTER (WHERE up.email IS NULL AND NOT ev.hit AND es.hit)::int AS sent,
        count(*) FILTER (WHERE up.email IS NULL AND NOT ev.hit AND NOT es.hit)::int AS not_seen
      FROM campaign_recipients cr
      LEFT JOIN user_profiles up ON up.email = cr.email
      LEFT JOIN LATERAL (SELECT true AS hit FROM email_sends x WHERE x.recipient = cr.email AND x.campaign_id = cr.campaign_id LIMIT 1) es ON true
      LEFT JOIN LATERAL (
        SELECT true AS hit FROM email_events ev2 JOIN email_sends x2 ON x2.ses_message_id = ev2.ses_message_id
        WHERE x2.recipient = cr.email AND x2.campaign_id = cr.campaign_id AND ev2.event_type IN ('Open', 'Click') LIMIT 1
      ) ev ON true
      WHERE cr.campaign_id = ${id}
    `,
    sql`
      SELECT cr.email, cr.batch,
        CASE
          WHEN up.email IS NOT NULL THEN 'registered'
          WHEN ev.hit THEN 'opened'
          WHEN es.hit THEN 'sent'
          ELSE 'not_seen'
        END AS status
      FROM campaign_recipients cr
      LEFT JOIN user_profiles up ON up.email = cr.email
      LEFT JOIN LATERAL (SELECT true AS hit FROM email_sends x WHERE x.recipient = cr.email AND x.campaign_id = cr.campaign_id LIMIT 1) es ON true
      LEFT JOIN LATERAL (
        SELECT true AS hit FROM email_events ev2 JOIN email_sends x2 ON x2.ses_message_id = ev2.ses_message_id
        WHERE x2.recipient = cr.email AND x2.campaign_id = cr.campaign_id AND ev2.event_type IN ('Open', 'Click') LIMIT 1
      ) ev ON true
      WHERE cr.campaign_id = ${id}
      ORDER BY cr.imported_at
      LIMIT ${RECIPIENT_PAGE_SIZE} OFFSET ${offset}
    `,
  ]);

  if (!campaign) notFound();

  const runsByBatch = new Map(batchRuns.map((r) => [r.batch, r]));
  const sc = statusCounts[0] ?? { registered: 0, opened: 0, sent: 0, not_seen: 0 };
  const totalPages = Math.max(1, Math.ceil((recipientTotal?.n ?? 0) / RECIPIENT_PAGE_SIZE));

  const statusTone = campaign.status === "active" ? "ok" : campaign.status === "paused" ? "warn" : campaign.status === "done" ? "mut" : "info";

  return (
    <>
      <PageHeader
        pretitle="Campaign"
        title={campaign.name}
        sub={<><code>{campaign.id}</code> · {campaign.stream} · {campaign.sender}</>}
        actions={
          <>
            <Link href={`/admin-campaigns/${id}/lead`} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rule)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink)] no-underline">Lead journey</Link>
            <Pill tone={statusTone}>{campaign.status}</Pill>
          </>
        }
      />
      <div className="">
        <div className="mx-auto w-full max-w-[1400px]">
          {/* The four numbers that decide whether anything below needs attention: how big the
              pool is, how much of it is reachable, how much is engaged, and how much has been
              lost. Everything else is detail that only matters once one of these looks wrong. */}
          <CardRow>
            <StatCard label="Recipients" value={fmtN(journey.total)} detail={`${fmtN(journey.dueNow)} due now`} icon={<IconUsers size={20} />} />
            <StatCard label="Verified" value={fmtN(journey.verified)} detail="kam se kam ek baar deliver hua" tone="up" icon={<IconMailOpened size={20} />} />
            <StatCard label="Engaged" value={fmtN(journey.hot)} detail={`${fmtN(journey.warm)} khola, click nahi`} icon={<IconClick size={20} />} />
            <StatCard label="Suppressed" value={fmtN(journey.suppressed)} detail={`${fmtN(journey.hardBounce)} hard · ${fmtN(journey.validationSuppressed)} AV`} tone="bad" icon={<IconAlertTriangle size={20} />} />
          </CardRow>

      <div className="flex flex-wrap gap-3">
      <Section title="Change status" note="'active' se pehle batch start nahi ho sakta. 'paused' agla cron tick se sends turant rok deta hai.">
        <StatusControl campaignId={campaign.id} current={campaign.status} />
      </Section>

      <Section
        title="Journey — cold se registered tak"
        note="Har node par abhi kitne log khade hain. Yahi state rule engine agle tick par padhta hai."
        actions={<LiveRefresh seconds={15} />}
      >
        <JourneyFlow c={journey} />
      </Section>

      <Section
        title="Dispatcher runs"
        note="Har tick: kaunsa gate laga, kitni capacity mili, naya vs follow-up split, kitne gaye."
      >
        <Table
          head={["Started", "Gate", { label: "Capacity", num: true }, { label: "New", num: true }, { label: "Follow-up", num: true }, { label: "Sent", num: true }, { label: "Failed", num: true }, "Bounce", "Complaint"]}
          rows={lastRuns.map((r) => [
            fmtDT(r.started_at),
            r.blocked_by ? <Pill key="g" tone="bad">{r.blocked_by}</Pill> : <Pill key="g" tone="ok">ran</Pill>,
            r.capacity === null ? "—" : fmtN(r.capacity),
            r.planned_new === null ? "—" : fmtN(r.planned_new),
            r.planned_followup === null ? "—" : fmtN(r.planned_followup),
            fmtN(r.sent ?? 0),
            fmtN(r.failed ?? 0),
            r.bounce_rate === null ? "—" : `${(Number(r.bounce_rate) * 100).toFixed(2)}%`,
            r.complaint_rate === null ? "—" : `${(Number(r.complaint_rate) * 100).toFixed(3)}%`,
          ])}
          empty="abhi koi outreach tick nahi chala"
        />
      </Section>

      <Section title="Flow" note="Left-to-right send sequence, gap dikhaya gaya hai (send_offset_minutes ka diff).">
        <FlowDiagram steps={steps.map((s) => ({ stepKey: s.step_key, stepType: s.step_type, sendOffsetMinutes: s.send_offset_minutes, subject: s.subject }))} />
      </Section>

      <Section title="Steps" note="Send order aur offset batch start se minutes mein count hote hain.">
        <Table
          head={["#", "Step key", "Type", "Subject", { label: "Offset (min)", num: true }, { label: "Sent", num: true }, ""]}
          rows={steps.map((s) => [
            fmtN(s.step_order),
            s.step_key,
            s.step_type,
            s.subject,
            fmtN(s.send_offset_minutes),
            fmtN(s.sent_count),
            <span key="links" style={{ display: "flex", gap: 10 }}>
              <Link href={`/admin-campaigns/${campaign.id}/preview/${s.step_key}`}>preview</Link>
              <Link href={`/admin-campaigns/${campaign.id}/steps/${s.step_key}/edit`}>edit</Link>
            </span>,
          ])}
          empty="abhi koi step nahi"
        />
        <div style={{ marginTop: 10 }}>
          <Link href={`/admin-campaigns/${campaign.id}/steps/new`}>+ New step</Link>
        </div>
      </Section>

      <Section title="Variables" note="Step editor ka insert-palette yahi list se banta hai.">
        <VariablesEditor campaignId={campaign.id} initial={(campaign.variables as string[]) ?? []} />
      </Section>

      <Section title="Import recipients" note="CSV mein 'email' column zaroori hai; baaki columns {{placeholder}} values ban jaate hain.">
        <ImportForm campaignId={campaign.id} />
      </Section>

      <Section title="Batches" note="Har batch ek baar start/schedule hota hai (typed confirmation), uske baad cron khud steps chalata hai.">
        <div className="flex flex-wrap gap-3 g-3">
          {batches.length === 0 && <div className="w-full text-[var(--ink-muted)]">abhi koi recipient import nahi hua</div>}
          {batches.map((b) => {
            const run = runsByBatch.get(b.batch);
            const scheduled = run && new Date(run.started_at) > new Date();
            return (
              <div key={b.batch} className="w-full flex-1 min-w-[260px]">
                <div className="flex h-full min-w-0 flex-col rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)]"><div className="p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-faint)]">Batch {b.batch}</div>
                <div className="h3 m-0 mt-1 jf-num">{fmtN(b.n)} recipients</div>
                {run ? (
                  <div className="text-[var(--ink-muted)] mt-1" style={{ fontSize: 12 }}>{scheduled ? "scheduled for" : "started"} {fmtDT(run.started_at)} by {run.started_by}</div>
                ) : (
                  <div style={{ marginTop: 8 }}>
                    <StartBatchForm campaignId={campaign.id} batch={b.batch} recipientCount={Number(b.n)} />
                  </div>
                )}
                </div></div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title="Recipient status"
        note={`registered = Mantis par signup ho gaya · opened = SNS event pipeline pe depend karta hai · page ${page} of ${fmtN(totalPages)} (import order)`}
      >
        <div className="mb-3 flex flex-wrap gap-3">
          {([["Not seen", sc.not_seen], ["Sent", sc.sent], ["Opened", sc.opened], ["Registered", sc.registered]] as const).map(([label, n]) => (
            <div key={label} className="min-w-[110px] flex-1 rounded-[var(--radius-sm)] border border-[var(--rule)] px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-faint)]">{label}</div>
              <div className="tnum mt-0.5 text-[16px] font-semibold text-[var(--ink)]">{fmtN(n)}</div>
            </div>
          ))}
        </div>
        <Table
          head={["Email", "Batch", "Status"]}
          rows={recipientSample.map((r) => [r.email, r.batch, <Pill key="p" tone={r.status === "registered" ? "ok" : r.status === "opened" ? "warn" : r.status === "sent" ? "info" : "mut"}>{r.status.replace("_", " ")}</Pill>])}
          empty="abhi koi recipient nahi"
        />
        {/* The list used to stop dead at the first 50 with no way to reach the rest — on a campaign
            with tens of thousands of recipients that is a sample, not a list. */}
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between">
            <span className="tnum text-[11px] text-[var(--ink-faint)]">
              {fmtN(recipientTotal.n)} recipients · page {page} of {fmtN(totalPages)}
            </span>
            <span className="flex gap-2">
              {page > 1 ? (
                <Link href={`/admin-campaigns/${id}?page=${page - 1}`} className="rounded-full border border-[var(--rule)] px-3 py-1 text-[11.5px] text-[var(--ink)] no-underline">← Previous</Link>
              ) : <span className="rounded-full border border-[var(--rule)] px-3 py-1 text-[11.5px] text-[var(--ink-faint)]">← Previous</span>}
              {page < totalPages ? (
                <Link href={`/admin-campaigns/${id}?page=${page + 1}`} className="rounded-full border border-[var(--rule)] px-3 py-1 text-[11.5px] text-[var(--ink)] no-underline">Next →</Link>
              ) : <span className="rounded-full border border-[var(--rule)] px-3 py-1 text-[11.5px] text-[var(--ink-faint)]">Next →</span>}
            </span>
          </div>
        )}
      </Section>
          </div>
        </div>
      </div>
    </>
  );
}
