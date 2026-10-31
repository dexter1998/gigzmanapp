import { notFound } from "next/navigation";
import { isV2 } from "@/lib/v2-session";
import { IntegrationsPage } from "@/components/outreach/IntegrationsPage";
import { flashFrom, type SP } from "./flash";

export const metadata = { title: "Integrations" };
export default async function Page({ searchParams }: { searchParams: SP }) {
  if (!(await isV2())) notFound();
  return <IntegrationsPage initialFlash={flashFrom(await searchParams)} />;
}
