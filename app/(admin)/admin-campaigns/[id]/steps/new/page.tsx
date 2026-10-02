import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { StepForm } from "../../StepForm";

export default async function NewStepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaign] = await sql`SELECT id, name, variables FROM campaigns WHERE id = ${id}`;
  if (!campaign) notFound();

  return (
    <>
      <div className="page-header d-print-none"><div className="container-xl">
        <h1>New step: {campaign.name}</h1>
      </div></div>
      <StepForm campaignId={id} variables={(campaign.variables as string[]) ?? []} />
    </>
  );
}
