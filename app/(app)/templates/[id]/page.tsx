import { notFound } from "next/navigation";
import { isV2 } from "@/lib/v2-session";
import { TemplateEditor } from "@/components/outreach/TemplateEditor";
import type { Kind } from "@/components/outreach/TemplatesPage";

export const metadata = { title: "Template" };
const KINDS = ["email", "whatsapp", "call", "campaign"];

/** /templates/new?kind=email creates; /templates/<uuid> edits. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ kind?: string }> }) {
  if (!(await isV2())) notFound();
  const { id } = await params;
  const { kind } = await searchParams;
  if (id === "new") return <TemplateEditor id={null} kind={(KINDS.includes(kind ?? "") && kind !== "campaign" ? kind : "email") as Kind} />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  return <TemplateEditor id={id} kind="email" />;
}
