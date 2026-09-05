import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { StepForm } from "../../../StepForm";

export default async function EditStepPage({ params }: { params: Promise<{ id: string; stepKey: string }> }) {
  const { id, stepKey } = await params;
  const [campaign] = await sql`SELECT id, name, variables FROM campaigns WHERE id = ${id}`;
  if (!campaign) notFound();
  const [step] = await sql`
    SELECT step_key, step_type, send_offset_minutes, subject, html, text
    FROM campaign_steps WHERE campaign_id = ${id} AND step_key = ${stepKey}
  `;
  if (!step) notFound();

  return (
    <>
      <div className="adm-head">
        <h1>Edit step: {step.step_key}</h1>
      </div>
      <StepForm
        campaignId={id}
        variables={(campaign.variables as string[]) ?? []}
        initial={{
          stepKey: step.step_key,
          stepType: step.step_type,
          sendOffsetMinutes: step.send_offset_minutes,
          subject: step.subject,
          html: step.html,
          text: step.text,
        }}
      />
    </>
  );
}
