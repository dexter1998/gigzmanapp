import { notFound } from "next/navigation";
import { isV2 } from "@/lib/v2-session";
import { CampaignsPage } from "@/components/outreach/CampaignsPage";

export const metadata = { title: "Campaigns" };
export default async function Page() {
  if (!(await isV2())) notFound();
  return <CampaignsPage />;
}
