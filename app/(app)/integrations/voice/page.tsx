import { notFound } from "next/navigation";
import { isV2 } from "@/lib/v2-session";
import { VoiceSetup } from "@/components/outreach/integrations/VoiceSetup";

export const metadata = { title: "AI voice setup" };
export default async function Page() {
  if (!(await isV2())) notFound();
  return <VoiceSetup />;
}
