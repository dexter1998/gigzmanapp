import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { isV2Email } from "@/lib/v2";
import { getCampaign } from "@/lib/v2/outreach/campaigns";
import { CampaignBuilder } from "@/components/outreach/CampaignBuilder";

export const metadata = { title: "Campaign" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!isV2Email(email)) notFound();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await getCampaign(email!, id);
  if (!c) notFound();
  return <CampaignBuilder initial={c} />;
}
