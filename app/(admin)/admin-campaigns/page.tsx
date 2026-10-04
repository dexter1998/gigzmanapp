import Link from "next/link";
import { sql } from "@/lib/db";
import { PageHeader, CardRow, StatCard, Table, Pill, fmtDT, fmtN } from "../admin/ui";
import { IconRocket, IconPlayerPlay, IconUsers, IconClockHour4, IconPlus } from "@tabler/icons-react";

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
           (SELECT count(*)::int FROM campaign_recipients r
             WHERE r.campaign_id = c.id AND r.do_not_send = false
               AND r.state NOT IN ('suppressed','converted','stalled')
               AND r.next_due_at IS NOT NULL AND r.next_due_at <= now()) AS due_now,
           (SELECT max(sent_at) FROM email_sends es WHERE es.campaign_id = c.id) AS last_sent
    FROM campaigns c
    ORDER BY c.created_at DESC
  `;

  // The four numbers worth knowing before opening anything: how much is configured, how much is
  // actually running, how many people that covers, and how much work the next tick has. Anything
  // beyond that belongs in the per-campaign view rather than competing for attention here.
  const totals = campaigns.reduce(
    (a, c) => ({
      campaigns: a.campaigns + 1,
      active: a.active + (c.status === "active" ? 1 : 0),
      recipients: a.recipients + (c.recipient_count as number),
      due: a.due + (c.due_now as number),
    }),
    { campaigns: 0, active: 0, recipients: 0, due: 0 }
  );

  return (
    <>
      <PageHeader
        pretitle="Outreach"
        title="Campaigns"
        sub="Har send yahan se asli email jaata hai."
        actions={
          <Link href="/admin-campaigns/new" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rule)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink)] no-underline border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]">
            <IconPlus size={16} className="mr-1" /> New campaign
          </Link>
        }
      />
      <div className="">
        <div className="mx-auto w-full max-w-[1400px]">
          <CardRow>
            <StatCard label="Campaigns" value={fmtN(totals.campaigns)} detail={`${fmtN(totals.active)} active`} icon={<IconRocket size={20} />} />
            <StatCard
              label="Active"
              value={fmtN(totals.active)}
              detail={totals.active === 0 ? "koi send nahi ho raha" : "cron inhe uthata hai"}
              tone={totals.active > 0 ? "up" : undefined}
              icon={<IconPlayerPlay size={20} />}
            />
            <StatCard label="Recipients" value={fmtN(totals.recipients)} detail="sab campaigns milakar" icon={<IconUsers size={20} />} />
            <StatCard label="Due now" value={fmtN(totals.due)} detail="agla tick inhe uthayega" icon={<IconClockHour4 size={20} />} />
          </CardRow>

          <div className="flex flex-wrap gap-3">
            <Table
              title="All campaigns"
              note="Har campaign ka status, step aur recipient count."
              head={[
                "Campaign", "Status", "Stream",
                { label: "Steps", num: true }, { label: "Recipients", num: true },
                { label: "Due now", num: true }, "Last sent",
              ]}
              rows={campaigns.map((c) => [
                <Link key="l" href={`/admin-campaigns/${c.id}`} className="font-semibold no-underline">{c.name}</Link>,
                <Pill key="s" tone={statusTone(c.status)}>{c.status}</Pill>,
                <span key="st" className="text-[var(--ink-muted)]">{c.stream}</span>,
                fmtN(c.step_count),
                fmtN(c.recipient_count),
                c.due_now > 0
                  ? <span key="d" className="text-primary font-semibold">{fmtN(c.due_now)}</span>
                  : <span key="d" className="text-[var(--ink-muted)]">0</span>,
                fmtDT(c.last_sent),
              ])}
              empty="abhi koi campaign nahi hai"
            />
          </div>
        </div>
      </div>
    </>
  );
}
