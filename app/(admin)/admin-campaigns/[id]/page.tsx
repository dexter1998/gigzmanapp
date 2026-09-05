import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { Section, Table, Pill, fmtDT, fmtN } from "../../admin/ui";
import { StatusControl } from "./StatusControl";
import { ImportForm } from "./ImportForm";
import { StartBatchForm } from "./StartBatchForm";
import { VariablesEditor } from "./VariablesEditor";
import { FlowDiagram } from "./FlowDiagram";

const RECIPIENT_SAMPLE_LIMIT = 50;

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [[campaign], steps, batches, batchRuns, [suppressed], statusCounts, recipientSample] = await Promise.all([
    sql`SELECT id, name, sender, stream, status, created_by, created_at, variables FROM campaigns WHERE id = ${id}`,
    sql`
      SELECT cs.step_key, cs.step_order, cs.send_offset_minutes, cs.step_type, cs.subject,
             (SELECT count(*)::int FROM email_sends es WHERE es.campaign_id = cs.campaign_id AND es.step_key = cs.step_key) AS sent_count
      FROM campaign_steps cs WHERE cs.campaign_id = ${id} ORDER BY cs.step_order
    `,
    sql`SELECT batch, count(*)::int AS n FROM campaign_recipients WHERE campaign_id = ${id} GROUP BY batch ORDER BY batch`,
    sql`SELECT batch, started_at, started_by FROM campaign_batch_runs WHERE campaign_id = ${id}`,
    sql`
      SELECT count(*)::int AS n FROM campaign_recipients cr
      JOIN campaigns c ON c.id = cr.campaign_id
      WHERE cr.campaign_id = ${id}
        AND EXISTS (SELECT 1 FROM email_unsubscribes eu WHERE eu.email = cr.email AND eu.stream IN ('all', c.stream))
    `,
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
      LIMIT ${RECIPIENT_SAMPLE_LIMIT}
    `,
  ]);

  if (!campaign) notFound();

  const runsByBatch = new Map(batchRuns.map((r) => [r.batch, r]));
  const totalRecipients = batches.reduce((sum, b) => sum + Number(b.n), 0);
  const sc = statusCounts[0] ?? { registered: 0, opened: 0, sent: 0, not_seen: 0 };

  return (
    <>
      <div className="adm-head">
        <h1>{campaign.name}</h1>
        <span className="adm-asof">{campaign.id}</span>
      </div>

      <div className="adm-cards">
        <div className="adm-card"><div className="k">Status</div><div className="v"><Pill tone={campaign.status === "active" ? "ok" : campaign.status === "paused" ? "warn" : campaign.status === "done" ? "mut" : "info"}>{campaign.status}</Pill></div></div>
        <div className="adm-card"><div className="k">Sender</div><div className="v" style={{ fontSize: 14 }}>{campaign.sender}</div></div>
        <div className="adm-card"><div className="k">Stream</div><div className="v" style={{ fontSize: 14 }}>{campaign.stream}</div></div>
        <div className="adm-card"><div className="k">Recipients</div><div className="v">{fmtN(totalRecipients)}</div><div className="d">{fmtN(suppressed.n)} suppressed</div></div>
      </div>

      <Section title="Change status" note="'active' se pehle batch start nahi ho sakta. 'paused' agla cron tick se sends turant rok deta hai.">
        <StatusControl campaignId={campaign.id} current={campaign.status} />
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
        <div className="adm-cards">
          {batches.length === 0 && <div className="adm-empty">abhi koi recipient import nahi hua</div>}
          {batches.map((b) => {
            const run = runsByBatch.get(b.batch);
            const scheduled = run && new Date(run.started_at) > new Date();
            return (
              <div key={b.batch} className="adm-card" style={{ minWidth: 260 }}>
                <div className="k">Batch {b.batch}</div>
                <div className="v" style={{ fontSize: 15 }}>{fmtN(b.n)} recipients</div>
                {run ? (
                  <div className="d">{scheduled ? "scheduled for" : "started"} {fmtDT(run.started_at)} by {run.started_by}</div>
                ) : (
                  <div style={{ marginTop: 8 }}>
                    <StartBatchForm campaignId={campaign.id} batch={b.batch} recipientCount={Number(b.n)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Recipient status" note={`registered = Mantis par signup ho gaya · opened = SNS event pipeline pe depend karta hai · pehle ${RECIPIENT_SAMPLE_LIMIT} recipients (import order)`}>
        <div className="adm-cards">
          <div className="adm-card"><div className="k">Not seen</div><div className="v">{fmtN(sc.not_seen)}</div></div>
          <div className="adm-card"><div className="k">Sent</div><div className="v">{fmtN(sc.sent)}</div></div>
          <div className="adm-card"><div className="k">Opened</div><div className="v">{fmtN(sc.opened)}</div></div>
          <div className="adm-card"><div className="k">Registered</div><div className="v">{fmtN(sc.registered)}</div></div>
        </div>
        <Table
          head={["Email", "Batch", "Status"]}
          rows={recipientSample.map((r) => [r.email, r.batch, <span key="p" className={`status-pill ${r.status}`}>{r.status.replace("_", " ")}</span>])}
          empty="abhi koi recipient nahi"
        />
      </Section>
    </>
  );
}
