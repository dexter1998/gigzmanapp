import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { fillTemplate } from "@/lib/email/send-bulk";
import { Section } from "../../../../admin/ui";

/** Real data, no send. Picks a handful of actual imported recipients and renders the step's
 * template filled with their values — what's shown here is exactly what the cron will send. */
export default async function StepPreviewPage({ params }: { params: Promise<{ id: string; stepKey: string }> }) {
  const { id, stepKey } = await params;

  const [[step], recipients] = await Promise.all([
    sql`SELECT subject, html, text FROM campaign_steps WHERE campaign_id = ${id} AND step_key = ${stepKey}`,
    sql`SELECT email, values FROM campaign_recipients WHERE campaign_id = ${id} ORDER BY imported_at LIMIT 3`,
  ]);

  if (!step) notFound();

  return (
    <>
      <div className="adm-head">
        <h1>Preview: {stepKey}</h1>
        <span className="adm-asof">{id}</span>
      </div>

      {recipients.length === 0 && <div className="camp-banner">Abhi koi recipient import nahi hua — placeholders unfilled dikhenge.</div>}

      {(recipients.length > 0 ? recipients : [{ email: "(no recipients yet)", values: {} }]).map((r, i) => {
        const values = r.values as Record<string, string>;
        const subject = fillTemplate(step.subject, values);
        const html = fillTemplate(step.html, values);
        return (
          <Section key={i} title={`Sample: ${r.email}`} note={subject}>
            <div style={{ background: "#fff", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", padding: 16 }}>
              <div dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          </Section>
        );
      })}
    </>
  );
}
