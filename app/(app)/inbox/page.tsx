import { notFound } from "next/navigation";
import { isV2 } from "@/lib/v2-session";
import { InboxPage } from "@/components/outreach/InboxPage";

export const metadata = { title: "Inbox" };
export default async function Page() {
  if (!(await isV2())) notFound();
  return <InboxPage />;
}
