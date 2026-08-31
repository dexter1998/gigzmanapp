import Link from "next/link";
import { sql } from "@/lib/db";
import { StatCard, Section, Table, Pill, fmtDT, fmtN } from "../ui";

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
        FROM partner_applications ORDER BY submitted_at DESC LIMIT 50`,
    sql`SELECT first_name, last_name, email, company, topic, message, user_email, status, created_at
        FROM contact_messages ORDER BY created_at DESC LIMIT 50`,
  ]);

  return (
    <>
      <div className="adm-head">
        <h1>Inbound</h1>
        <span className="adm-asof">latest 50 each · as of {fmtDT(new Date())} IST</span>
      </div>

      <div className="adm-cards">
        <StatCard label="Partner applications" value={fmtN(kpi.p_total)} detail={`${kpi.p_new} awaiting review`} tone={kpi.p_new > 0 ? "up" : undefined} />
        <StatCard label="Contact messages" value={fmtN(kpi.c_total)} detail={`${kpi.c_new} unread`} tone={kpi.c_new > 0 ? "up" : undefined} />
      </div>

      <Section title="Partner with us" note="Ticket size × projects/month batata hai kiske saath partner karna chahiye — wahi yahan saamne hai.">
        <Table
          head={["When", "Who", "Agency", "Type", { label: "Projects/mo", num: true }, "Avg ticket", "Revenue range", "Team", "Where", "Source", "Status"]}
          rows={partners.map((p) => [
            fmtDT(p.submitted_at),
            <span key="w">{p.full_name}<br /><span style={{ color: "var(--g-gray-500)", fontSize: 11 }}>{p.email}{p.phone ? ` · ${p.phone}` : ""}</span></span>,
            p.agency_name ?? "—",
            p.agency_type ?? "—",
            p.projects_closed_per_month ?? "—",
            p.avg_ticket_size ?? "—",
            p.monthly_revenue_range ?? "—",
            p.team_size ?? "—",
            [p.city, p.country].filter(Boolean).join(", ") || "—",
            p.source,
            <Pill key="s" tone={statusTone(p.status)}>{p.status}</Pill>,
          ])}
          empty="abhi koi application nahi" />
      </Section>

      <Section title="Contact us" note="Public /contact form — user_email tabhi hota hai jab logged-in user ne bheja ho.">
        <Table
          head={["When", "Who", "Company", "Topic", "Message", "Status"]}
          rows={contacts.map((c) => [
            fmtDT(c.created_at),
            <span key="w">{[c.first_name, c.last_name].filter(Boolean).join(" ")}<br />
              <span style={{ color: "var(--g-gray-500)", fontSize: 11 }}>
                {c.user_email
                  ? <Link href={`/admin/users/${encodeURIComponent(c.user_email)}`}>{c.email}</Link>
                  : c.email}
              </span></span>,
            c.company ?? "—",
            c.topic ?? "—",
            <span key="m" className="wrap">{String(c.message).slice(0, 220)}</span>,
            <Pill key="s" tone={statusTone(c.status)}>{c.status}</Pill>,
          ])}
          empty="abhi koi message nahi" />
      </Section>
    </>
  );
}
