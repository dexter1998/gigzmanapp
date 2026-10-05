import Link from "next/link";
import { sql } from "@/lib/db";
import { PageHeader, StatCard, CardRow, Pill, fmtDT, fmtN } from "../ui";
import { DataTable } from "../DataTable";
import { Clamp } from "../Clamp";

/** Inbound — partner applications and contact-form messages, newest first. This is triage
 * reading, not workflow: status changes still happen in the database, panel sirf dikhata hai. */

function statusTone(s: string): "ok" | "warn" | "bad" | "mut" | "info" {
  if (s === "approved" || s === "replied") return "ok";
  if (s === "submitted" || s === "new") return "warn";
  if (s === "rejected" || s === "closed") return "mut";
  return "info";
}

export default async function InboundPage() {
  const [[kpi], partners, contacts] = await Promise.all([
    sql`SELECT (SELECT count(*)::int FROM partner_applications WHERE status = 'submitted') AS p_new,
               (SELECT count(*)::int FROM partner_applications) AS p_total,
               (SELECT count(*)::int FROM contact_messages WHERE status = 'new') AS c_new,
               (SELECT count(*)::int FROM contact_messages) AS c_total`,
    sql`SELECT id, full_name, email, phone, agency_name, agency_type, city, country, team_size,
               projects_closed_per_month, avg_ticket_size, monthly_revenue_range, partnership_reason,
               status, source, submitted_at
        FROM partner_applications ORDER BY submitted_at DESC LIMIT 500`,
    sql`SELECT first_name, last_name, email, company, topic, message, user_email, status, created_at
        FROM contact_messages ORDER BY created_at DESC LIMIT 500`,
  ]);

  return (
    <div className="">
      <div className="mx-auto w-full max-w-[1400px]">
        <PageHeader pretitle="Analysis" title="Inbound" sub={`latest 500 each · search covers everything loaded · as of ${fmtDT(new Date())} IST`} />

        <CardRow>
          <StatCard label="Partner applications" value={fmtN(kpi.p_total)} detail={`${kpi.p_new} awaiting review`} tone={kpi.p_new > 0 ? "up" : undefined} />
          <StatCard label="Contact messages" value={fmtN(kpi.c_total)} detail={`${kpi.c_new} unread`} tone={kpi.c_new > 0 ? "up" : undefined} />
        </CardRow>

        <div className="flex flex-wrap gap-3 mb-3">
          <div className="w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)]">
            <div className="rule-b px-4 py-3">
              <p className="m-0 text-[13px] font-semibold text-[var(--ink)]">Partner with us</p>
              <p className="m-0 mt-0.5 text-[11.5px] text-[var(--ink-muted)]">Ticket size × projects/month batata hai kiske saath partner karna chahiye — wahi yahan saamne hai.</p>
            </div>
            <DataTable
              searchPlaceholder="Search name, agency, city, email…"
              head={["When", "Who", "Agency", "Type", { label: "Projects/mo", num: true }, "Avg ticket", "Revenue range", "Team", "Where", "In their words", "Source", "Status"]}
              rows={partners.map((p) => ({
                // The filter cannot read rendered cells, so the row carries its own plain text —
                // built from the same values the cells are.
                search: [p.full_name, p.email, p.phone, p.agency_name, p.agency_type, p.city, p.country,
                         p.partnership_reason, p.source, p.status].filter(Boolean).join(" "),
                cells: [
                  fmtDT(p.submitted_at),
                  <span key="w">{p.full_name}<br /><span className="text-[var(--ink-muted)]" style={{ fontSize: 11 }}>{p.email}{p.phone ? ` · ${p.phone}` : ""}</span></span>,
                  p.agency_name ?? "—",
                  p.agency_type ?? "—",
                  p.projects_closed_per_month ?? "—",
                  p.avg_ticket_size ?? "—",
                  p.monthly_revenue_range ?? "—",
                  p.team_size ?? "—",
                  [p.city, p.country].filter(Boolean).join(", ") || "—",
                  // The only free text on the form, and the only part that says what they actually
                  // want. Clamped to one line so a long answer cannot set the row's height.
                  <Clamp key="r" text={p.partnership_reason} width={220} />,
                  p.source,
                  <Pill key="s" tone={statusTone(p.status)}>{p.status}</Pill>,
                ],
              }))}
              empty="abhi koi application nahi"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)]">
            <div className="rule-b px-4 py-3">
              <p className="m-0 text-[13px] font-semibold text-[var(--ink)]">Contact us</p>
              <p className="m-0 mt-0.5 text-[11.5px] text-[var(--ink-muted)]">Public /contact form — user_email tabhi hota hai jab logged-in user ne bheja ho.</p>
            </div>
            <DataTable
              searchPlaceholder="Search name, email, company, message…"
              head={["When", "Who", "Company", "Topic", "Message", "Status"]}
              rows={contacts.map((c) => ({
                search: [c.first_name, c.last_name, c.email, c.user_email, c.company, c.topic, c.message, c.status].filter(Boolean).join(" "),
                cells: [
                  fmtDT(c.created_at),
                  <span key="w">{[c.first_name, c.last_name].filter(Boolean).join(" ")}<br />
                    <span className="text-[var(--ink-muted)]" style={{ fontSize: 11 }}>
                      {c.user_email
                        ? <Link href={`/admin/users/${encodeURIComponent(c.user_email)}`}>{c.email}</Link>
                        : c.email}
                    </span></span>,
                  c.company ?? "—",
                  c.topic ?? "—",
                  // Was .slice(0, 220) inside a wrapping cell — which still produced four-line rows.
                  <Clamp key="m" text={String(c.message)} width={260} />,
                  <Pill key="s" tone={statusTone(c.status)}>{c.status}</Pill>,
                ],
              }))}
              empty="abhi koi message nahi"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
