import Link from "next/link";
import { sql } from "@/lib/db";
import { Section, Table, Pill, fmtDT, fmtN } from "../admin/ui";

function statusTone(status: string): "ok" | "warn" | "bad" | "mut" | "info" {
  if (status === "active") return "ok";
  if (status === "paused") return "warn";
  if (status === "done") return "mut";
  return "info"; // draft
}

export default async function CampaignsListPage() {
  const campaigns = await sql`
    SELECT c.id, c.name, c.status, c.stream,
           (SELECT count(*)::int FROM campaign_steps s WHERE s.campaign_id = c.id) AS step_count,
           (SELECT count(*)::int FROM campaign_recipients r WHERE r.campaign_id = c.id) AS recipient_count,
           (SELECT max(sent_at) FROM email_sends es WHERE es.campaign_id = c.id) AS last_sent
    FROM campaigns c
    ORDER BY c.created_at DESC
  `;

  return (
    <>
      <div className="adm-head">
        <h1>Campaigns</h1>
        <Link href="/admin-campaigns/new">+ New campaign</Link>
      </div>
      <div className="camp-banner">Har send yahan se real email bhejta hai. Naya campaign row seed karne ke liye db/migrations/2026-09-02-campaign-email.sql dekhein.</div>
      <Section title="All campaigns" note="Har campaign ka status, step aur recipient count.">
        <Table
          head={["Campaign", "Status", "Stream", { label: "Steps", num: true }, { label: "Recipients", num: true }, "Last sent"]}
          rows={campaigns.map((c) => [
            <Link key="l" href={`/admin-campaigns/${c.id}`}>{c.name}</Link>,
            <Pill key="s" tone={statusTone(c.status)}>{c.status}</Pill>,
            c.stream,
            fmtN(c.step_count),
            fmtN(c.recipient_count),
            fmtDT(c.last_sent),
          ])}
          empty="abhi koi campaign nahi hai"
        />
      </Section>
    </>
  );
}
