import { notFound } from "next/navigation";
import { isV2 } from "@/lib/v2-session";
import { TemplatesPage } from "@/components/outreach/TemplatesPage";

export const metadata = { title: "Templates" };
export default async function Page() {
  if (!(await isV2())) notFound();
  return <TemplatesPage />;
}
