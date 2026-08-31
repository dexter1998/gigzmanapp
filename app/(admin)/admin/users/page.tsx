import Link from "next/link";
import { sql } from "@/lib/db";
import { StatCard, Section, Table, Pill, fmtAgo, fmtDT, fmtN } from "../ui";

/** Users — registrations, activity, aur "kaun serious hai" signals. Professional accounts =
 * non-free-mail domains (apni company ke email se aane wale log buyers hote hain). */

const FREE_MAIL = ["gmail.com", "yahoo.com", "yahoo.in", "outlook.com", "hotmail.com", "icloud.com", "protonmail.com", "proton.me", "rediffmail.com", "live.com", "aol.com"];

export default async function UsersPage() {
  const [[kpi], countries, users] = await Promise.all([
    sql`SELECT count(*)::int AS total,
               count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS new7,
               count(*) FILTER (WHERE last_seen_at > now() - interval '7 days')::int AS active7,
               count(*) FILTER (WHERE last_seen_at > now() - interval '30 days')::int AS active30,
               count(*) FILTER (WHERE last_seen_at IS NULL OR last_seen_at < now() - interval '30 days')::int AS inactive30,
               count(*) FILTER (WHERE split_part(email, '@', 2) != ALL(${FREE_MAIL}))::int AS professional,
               count(*) FILTER (WHERE NOT onboarding_completed)::int AS unonboarded
        FROM user_profiles`,
    sql`SELECT coalesce(country, 'Unknown') AS country, count(*)::int AS n FROM user_profiles GROUP BY 1 ORDER BY n DESC LIMIT 10`,
    sql`SELECT up.email, up.plan, up.credits, up.country, up.business_type, up.created_at, up.last_seen_at,
               coalesce(un.n, 0)::int AS unlocks, coalesce(sc.n, 0)::int AS scans,
               coalesce(pay.paise, 0)::bigint AS paid_paise
        FROM user_profiles up
        LEFT JOIN (SELECT unlocked_by, count(*) AS n FROM unlocks GROUP BY 1) un ON un.unlocked_by = up.email
        LEFT JOIN (SELECT requested_by, count(*) AS n FROM area_scans GROUP BY 1) sc ON sc.requested_by = up.email
        LEFT JOIN (SELECT user_email, sum(amount_paise) AS paise FROM payments WHERE status = 'paid' GROUP BY 1) pay ON pay.user_email = up.email
        ORDER BY up.created_at DESC LIMIT 200`,
  ]);

  return (
    <>
      <div className="adm-head">
        <h1>Users</h1>
        <span className="adm-asof">latest 200 · as of {fmtDT(new Date())} IST</span>
      </div>

      <div className="adm-cards">
        <StatCard label="Registrations" value={fmtN(kpi.total)} detail={`+${kpi.new7} in 7d`} tone={kpi.new7 > 0 ? "up" : undefined} />
        <StatCard label="Active 7d" value={fmtN(kpi.active7)} />
        <StatCard label="Active 30d" value={fmtN(kpi.active30)} />
        <StatCard label="Inactive 30d+" value={fmtN(kpi.inactive30)} detail="re-activation email target" />
        <StatCard label="Professional @domain" value={fmtN(kpi.professional)} detail="non free-mail" />
        <StatCard label="Onboarding incomplete" value={fmtN(kpi.unonboarded)} tone={kpi.unonboarded > 0 ? "bad" : undefined} />
      </div>

      <div className="adm-split">
        <Section title="Country split" note="Client IP se one-time capture — purane users 'Unknown' rahenge jab tak wo dobara login nahi karte.">
          <Table head={["Country", { label: "Users", num: true }]}
            rows={countries.map((c) => [c.country, fmtN(c.n)])}
            empty="koi data nahi" />
        </Section>
        <Section title="Signal ⇒ kya dekhna" note="Analysis shortcuts">
          <Table head={["Signal", "Matlab"]}
            rows={[
              [<Pill key="1" tone="ok">PAID</Pill>, "payments.status='paid' wala user — inki activity sabse dhyan se"],
              [<Pill key="2" tone="info">PRO @</Pill>, "company domain — outreach/partnership candidate"],
              [<Pill key="3" tone="warn">IDLE 30d</Pill>, "lifecycle email in par chal rahi hai"],
            ]}
            empty="" />
        </Section>
      </div>

      <Section title="All users">
        <Table
          head={["Email", "Plan", { label: "Credits", num: true }, { label: "Unlocks", num: true }, { label: "Scans", num: true }, { label: "Paid", num: true }, "Country", "Joined", "Last seen"]}
          rows={users.map((r) => {
            const domain = String(r.email).split("@")[1] ?? "";
            const pro = !FREE_MAIL.includes(domain);
            return [
              <span key="e"><Link href={`/admin/users/${encodeURIComponent(r.email)}`}>{r.email}</Link>{pro && <> {" "}<Pill tone="info">pro @</Pill></>}</span>,
              Number(r.paid_paise) > 0 ? <Pill key="p" tone="ok">{r.plan} · paid</Pill> : r.plan,
              fmtN(r.credits),
              fmtN(r.unlocks),
              fmtN(r.scans),
              Number(r.paid_paise) > 0 ? `₹${(Number(r.paid_paise) / 100).toLocaleString("en-IN")}` : "—",
              r.country ?? "—",
              fmtDT(r.created_at),
              fmtAgo(r.last_seen_at),
            ];
          })}
          empty="koi user nahi" />
      </Section>
    </>
  );
}
