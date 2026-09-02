import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { Section, Table, Pill, fmtDT, fmtN } from "../../admin/ui";
import { StatusControl } from "./StatusControl";
import { ImportForm } from "./ImportForm";
import { StartBatchForm } from "./StartBatchForm";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [[campaign], steps, batches, batchRuns, [suppressed]] = await Promise.all([
    sql`SELECT id, name, sender, stream, status, created_by, created_at FROM campaigns WHERE id = ${id}`,
    sql`
      SELECT cs.step_key, cs.step_order, cs.send_day_offset, cs.subject,
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
  ]);

  if (!campaign) notFound();

  const runsByBatch = new Map(batchRuns.map((r) => [r.batch, r]));
  const totalRecipients = batches.reduce((sum, b) => sum + Number(b.n), 0);

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

      <Section title="Steps" note="Send order aur day-offset batch start se count hote hain.">
        <Table
          head={[{ label: "#", num: true }, "Step key", "Subject", { label: "Day offset", num: true }, { label: "Sent", num: true }, "Preview"]}
          rows={steps.map((s) => [
            fmtN(s.step_order),
            s.step_key,
            s.subject,
            fmtN(s.send_day_offset),
            fmtN(s.sent_count),
            <Link key="p" href={`/admin-campaigns/${campaign.id}/preview/${s.step_key}`}>preview</Link>,
          ])}
          empty="abhi koi step nahi — migration/seed se add karein"
        />
      </Section>

      <Section title="Import recipients" note="CSV mein 'email' column zaroori hai; baaki columns {{placeholder}} values ban jaate hain.">
        <ImportForm campaignId={campaign.id} />
      </Section>

      <Section title="Batches" note="Har batch ek baar start hota hai (typed confirmation), uske baad cron khud steps chalata hai.">
        <div className="adm-cards">
          {batches.length === 0 && <div className="adm-empty">abhi koi recipient import nahi hua</div>}
          {batches.map((b) => {
            const run = runsByBatch.get(b.batch);
            return (
              <div key={b.batch} className="adm-card" style={{ minWidth: 260 }}>
                <div className="k">Batch {b.batch}</div>
                <div className="v" style={{ fontSize: 15 }}>{fmtN(b.n)} recipients</div>
                {run ? (
                  <div className="d">started {fmtDT(run.started_at)} by {run.started_by}</div>
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
    </>
  );
}
