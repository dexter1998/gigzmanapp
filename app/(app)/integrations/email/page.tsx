import { notFound } from "next/navigation";
import { isV2 } from "@/lib/v2-session";
import { EmailSetup, type EmailMethod } from "@/components/outreach/integrations/EmailSetup";
import { flashFrom, one, type SP } from "../flash";

export const metadata = { title: "Email setup" };
const METHODS: EmailMethod[] = ["gmail", "outlook", "smtp", "mantis"];
export default async function Page({ searchParams }: { searchParams: SP }) {
  if (!(await isV2())) notFound();
  const sp = await searchParams;
  const m = one(sp.method) as EmailMethod | null;
  return <EmailSetup initialMethod={m && METHODS.includes(m) ? m : null} initialFlash={flashFrom(sp)} />;
}
