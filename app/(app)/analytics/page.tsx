import { notFound } from "next/navigation";
import { isV2 } from "@/lib/v2-session";
import { AnalyticsPage } from "@/components/outreach/AnalyticsPage";

export const metadata = { title: "Analytics" };
export default async function Page() {
  if (!(await isV2())) notFound();
  return <AnalyticsPage />;
}
