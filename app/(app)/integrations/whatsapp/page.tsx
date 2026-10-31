import { notFound } from "next/navigation";
import { isV2 } from "@/lib/v2-session";
import { WhatsAppSetup } from "@/components/outreach/integrations/WhatsAppSetup";
import { one, type SP } from "../flash";

export const metadata = { title: "WhatsApp setup" };
export default async function Page({ searchParams }: { searchParams: SP }) {
  if (!(await isV2())) notFound();
  return <WhatsAppSetup initialMethod={one((await searchParams).method) === "mantis" ? "mantis" : "meta"} />;
}
