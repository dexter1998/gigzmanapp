import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { StepForm } from "../../StepForm";

export default async function NewStepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaign] = await sql`SELECT id, name, variables FROM campaigns WHERE id = ${id}`;
  if (!campaign) notFound();

  return (
    <>
      <div className="adm-head">
        <h1>New step: {campaign.name}</h1>
      </div>
      <StepForm campaignId={id} variables={(campaign.variables as string[]) ?? []} />
    </>
  );
}
