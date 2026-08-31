import Link from "next/link";
import { sql } from "@/lib/db";
import { StatCard, Section, Table, Pill, fmtAgo, fmtDT, fmtN } from "../ui";

/** Health & Logs — jo kuch toota, atka, ya disliked hua, ek jagah. Green/amber/red sirf real
 * evidence se; "no data" grey hai, kabhi fake green nahi. */

export default async function HealthPage() {
  const [[kpi], alerts, errRoutes, errors, cronRuns, dislikes, phrases] = await Promise.all([
    sql`SELECT (SELECT count(*)::int FROM api_alerts WHERE resolved_at IS NULL) AS open_alerts,
               (SELECT count(*)::int FROM app_errors WHERE created_at > now() - interval '24 hours') AS err24,
               (SELECT count(*)::int FROM app_errors WHERE created_at > now() - interval '7 days') AS err7,
               (SELECT count(*)::int FROM chat_messages WHERE feedback = 'down') AS downs,
               (SELECT count(*)::int FROM chat_messages WHERE feedback = 'up') AS ups,
               (SELECT count(*)::int FROM unresolved_phrases WHERE created_at > now() - interval '30 days') AS phrases30`,
    sql`SELECT provider, message, context, created_at FROM api_alerts WHERE resolved_at IS NULL ORDER BY created_at DESC LIMIT 20`,
    sql`SELECT route, count(*)::int AS n, max(created_at) AS last_at FROM app_errors
        WHERE created_at > now() - interval '7 days' GROUP BY route ORDER BY n DESC LIMIT 10`,
    sql`SELECT user_email, route, message, created_at FROM app_errors ORDER BY created_at DESC LIMIT 25`,
    sql`SELECT job, started_at, finished_at, ok, summary, error FROM cron_runs ORDER BY started_at DESC LIMIT 20`,
    sql`SELECT m.content, m.created_at, c.user_email FROM chat_messages m JOIN chats c ON c.id = m.chat_id
        WHERE m.feedback = 'down' ORDER BY m.created_at DESC LIMIT 15`,
    sql`SELECT phrase, count(*)::int AS n, max(created_at) AS last_at FROM unresolved_phrases
        GROUP BY phrase ORDER BY n DESC, max(created_at) DESC LIMIT 20`,
  ]);

  return (
    <>
      <div className="adm-head">
        <h1>Health &amp; Logs</h1>
        <span className="adm-asof">as of {fmtDT(new Date())} IST</span>
      </div>

      <div className="adm-cards">
        <StatCard label="Open API alerts" value={fmtN(kpi.open_alerts)} tone={kpi.open_alerts > 0 ? "bad" : "up"}
          detail={kpi.open_alerts === 0 ? "sab clear" : "neeche list"} />
        <StatCard label="App errors 24h" value={fmtN(kpi.err24)} detail={`${kpi.err7} in 7d`} tone={kpi.err24 > 0 ? "bad" : "up"} />
        <StatCard label="Chat 👍 / 👎" value={`${fmtN(kpi.ups)} / ${fmtN(kpi.downs)}`}
          detail={kpi.ups + kpi.downs > 0 ? `${Math.round((kpi.ups / Math.max(1, kpi.ups + kpi.downs)) * 100)}% positive` : "abhi koi rating nahi"} />
        <StatCard label="Unresolved phrases 30d" value={fmtN(kpi.phrases30)} detail="alias dictionary ka backlog" />
      </div>

      <Section title="Open external-API alerts" note="Google Places / Bedrock / SES / Message Central failures — lib/api-alerts.ts se.">
        <Table head={["When", "Provider", "Message"]}
          rows={alerts.map((a) => [fmtDT(a.created_at),
            <Pill key="p" tone="bad">{a.provider}</Pill>,
            <span key="m" className="wrap">{String(a.message).slice(0, 140)}</span>])}
          empty="koi open alert nahi 🎉" />
      </Section>

      <div className="adm-split">
        <Section title="Error hotspots (7d)" note="Kaunsa route sabse zyada toot raha hai.">
          <Table head={["Route", { label: "Count", num: true }, "Last"]}
            rows={errRoutes.map((e) => [e.route, fmtN(e.n), fmtAgo(e.last_at)])}
            empty="7d clean — koi recorded error nahi" />
        </Section>
        <Section title="Cron runs (last 20)">
          <Table head={["When", "Job", "Result", "Detail"]}
            rows={cronRuns.map((c) => [fmtDT(c.started_at), c.job,
              <Pill key="r" tone={c.ok ? "ok" : "bad"}>{c.ok ? "ok" : "fail"}</Pill>,
              <span key="d" className="wrap" style={{ fontSize: 11 }}>{c.ok ? JSON.stringify(c.summary ?? {}).slice(0, 60) : String(c.error ?? "").slice(0, 60)}</span>])}
            empty="abhi koi run record nahi (collector naya hai)" />
        </Section>
      </div>

      <Section title="Recent errors — user ke saath" note="Kis user ko kya error mila; email par click karke uski poori story dekho.">
        <Table head={["When", "User", "Route", "Message"]}
          rows={errors.map((e) => [fmtDT(e.created_at),
            e.user_email ? <Link key="u" href={`/admin/users/${encodeURIComponent(e.user_email)}`}>{e.user_email}</Link> : "anon",
            e.route, <span key="m" className="wrap">{String(e.message).slice(0, 120)}</span>])}
          empty="koi recorded error nahi 🎉" />
      </Section>

      <div className="adm-split">
        <Section title="Disliked chat replies" note="👎 wale assistant messages — prompt/alias tuning ka raw material.">
          <Table head={["When", "User", "Reply"]}
            rows={dislikes.map((d) => [fmtDT(d.created_at),
              <Link key="u" href={`/admin/users/${encodeURIComponent(d.user_email)}`}>{String(d.user_email).split("@")[0]}</Link>,
              <span key="c" className="wrap">{String(d.content).slice(0, 160)}</span>])}
            empty="koi dislike nahi 🎉" />
        </Section>
        <Section title="Unresolved category phrases" note="User ne jo type kiya aur hum map nahi kar paye — sabse frequent upar; inhe lib/category-resolve.ts ke ALIASES mein daalo.">
          <Table head={["Phrase", { label: "Times", num: true }, "Last"]}
            rows={phrases.map((p) => [<code key="p">{p.phrase}</code>, fmtN(p.n), fmtAgo(p.last_at)])}
            empty="sab phrases resolve ho rahe hain 🎉" />
        </Section>
      </div>
    </>
  );
}
