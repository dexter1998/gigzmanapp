import { isV2 } from "@/lib/v2-session";
import { LegacyLeads } from "./LegacyLeads";
import { V2Leads } from "@/components/leads/v2/V2Leads";

/** V2 (test account): every lead from chat lands here automatically, in lists named after chats. */
export default async function LeadsPage() {
  return (await isV2()) ? <V2Leads /> : <LegacyLeads />;
}
