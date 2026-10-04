import { sql } from "@/lib/db";
import { PageHeader, StatCard, CardRow } from "../ui";
import { WidgetInbox, type InboxThread, type InboxSite } from "./WidgetInbox";

/**
 * The founder inbox: every conversation the widget has started, across every site it is embedded
 * on, in one place.
 *
 * Site is a first-class column rather than a detail buried in the thread, because the whole point
 * of one embeddable widget is that the same inbox serves several products — and a message that
 * came from a client's landing page needs a different answer than the same words from inside the
 * dashboard.
 */
export const dynamic = "force-dynamic";

export default async function WidgetInboxPage() {
  const [[kpi], sites, threads] = await Promise.all([
    sql`SELECT count(*)::int AS total,
               count(*) FILTER (WHERE last_sender = 'visitor')::int AS needs_reply,
               count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS new7
          FROM widget_threads`,
    sql`SELECT s.slug, s.name, s.is_blocked, s.origins,
               count(t.id)::int AS threads,
               count(t.id) FILTER (WHERE t.last_sender = 'visitor')::int AS needs_reply
          FROM widget_sites s
          LEFT JOIN widget_threads t ON t.site_slug = s.slug
         GROUP BY s.slug, s.name, s.is_blocked, s.origins
         ORDER BY count(t.id) DESC`,
    sql`SELECT t.id, t.site_slug, t.visitor_name, t.visitor_email, t.visitor_phone, t.subject,
               t.status, t.last_message_at, t.last_sender, t.admin_last_read_at, t.user_email,
               coalesce(c.is_registered_user, false) AS is_registered_user
          FROM widget_threads t
          LEFT JOIN widget_contacts c ON c.id = t.contact_id
         ORDER BY t.last_message_at DESC
         LIMIT 200`,
  ]);

  return (
    <div className="">
      <div className="mx-auto w-full max-w-[1400px]">
        <PageHeader pretitle="Outreach" title="Founder inbox" sub="Har site ka widget, ek jagah" />

        <CardRow>
          <StatCard label="Conversations" value={String(kpi.total)} detail={`+${kpi.new7} in 7d`} />
          <StatCard
            label="Needs a reply"
            value={String(kpi.needs_reply)}
            tone={kpi.needs_reply > 0 ? "bad" : undefined}
            detail="visitor spoke last"
          />
          <StatCard label="Sites" value={String(sites.length)} detail="widget embedded on" />
        </CardRow>

        <WidgetInbox
          sites={sites as unknown as InboxSite[]}
          threads={threads as unknown as InboxThread[]}
        />
      </div>
    </div>
  );
}
