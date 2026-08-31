import Link from "next/link";
import { sql } from "@/lib/db";
import { StatCard, Section, Table, Pill, HealthItem, Bars, toDayBuckets, fmtDT, fmtAgo, fmtINR, fmtN } from "./ui";

/** Overview — pura business ek screen par: health strip upar (kya toota hai), phir growth/revenue
 * numbers, phir aaj ki activity. Har figure live query hai; koi cache nahi (analysis panel par
 * staleness cost hai, traffic nahi). */

type CronRow = { job: string; started_at: Date; ok: boolean | null; error: string | null };

function cronTone(row: CronRow | undefined, maxAgeH: number): { tone: "ok" | "warn" | "bad" | "mut"; sub: string } {
  if (!row) return { tone: "mut", sub: "abhi tak koi run record nahi (collector naya hai)" };
  const ageH = (Date.now() - new Date(row.started_at).getTime()) / 3600000;
  if (row.ok === false) return { tone: "bad", sub: `last run FAIL ${fmtAgo(row.started_at)} — ${row.error?.slice(0, 60) ?? "?"}` };
  if (ageH > maxAgeH) return { tone: "warn", sub: `last ok run ${fmtAgo(row.started_at)} — overdue` };
  return { tone: "ok", sub: `last ok run ${fmtAgo(row.started_at)}` };
}

export default async function OverviewPage() {
  const [
    [u], [rev], [act], signupDays, unlockDays,
    cronRows, [alerts24], [errors24], [lastChat], [lastEmail], [down7]
  ] = await Promise.all([
    sql`SELECT count(DISTINCT up.email)::int AS total,
               count(DISTINCT up.email) FILTER (WHERE up.created_at > now() - interval '7 days')::int AS new7,
               count(DISTINCT up.email) FILTER (WHERE up.last_seen_at > now() - interval '7 days')::int AS active7,
               count(DISTINCT p.user_email) FILTER (WHERE p.status = 'paid')::int AS paid
        FROM user_profiles up LEFT JOIN payments p ON p.user_email = up.email`,
    sql`SELECT coalesce(sum(amount_paise) FILTER (WHERE status = 'paid'), 0)::bigint AS all_paise,
               coalesce(sum(amount_paise) FILTER (WHERE status = 'paid' AND date_trunc('month', paid_at) = date_trunc('month', now())), 0)::bigint AS month_paise,
               count(*) FILTER (WHERE status = 'paid')::int AS paid_orders,
               count(*) FILTER (WHERE status = 'created' AND created_at > now() - interval '7 days')::int AS abandoned7
        FROM payments`,
    sql`SELECT (SELECT count(*)::int FROM leads) AS leads,
               (SELECT count(*)::int FROM unlocks) AS unlocks,
               (SELECT count(*)::int FROM chat_messages WHERE created_at > now() - interval '7 days' AND role = 'user') AS chat7,
               (SELECT coalesce(sum(billed_places_calls), 0)::int FROM area_scans WHERE created_at > now() - interval '30 days') AS billed30`,
    sql`SELECT date_trunc('day', created_at) AS day, count(*)::int AS n FROM user_profiles WHERE created_at > now() - interval '30 days' GROUP BY 1`,
    sql`SELECT date_trunc('day', unlocked_at) AS day, count(*)::int AS n FROM unlocks WHERE unlocked_at > now() - interval '30 days' GROUP BY 1`,
    sql`SELECT DISTINCT ON (job) job, started_at, ok, error FROM cron_runs ORDER BY job, started_at DESC`,
    sql`SELECT count(*)::int AS n FROM api_alerts WHERE created_at > now() - interval '24 hours' AND resolved_at IS NULL`,
    sql`SELECT count(*)::int AS n FROM app_errors WHERE created_at > now() - interval '24 hours'`,
    sql`SELECT max(created_at) AS at FROM chat_messages WHERE role = 'assistant'`,
    sql`SELECT max(sent_at) AS at FROM email_sends`,
    sql`SELECT count(*)::int AS n FROM chat_messages WHERE feedback = 'down' AND created_at > now() - interval '7 days'`,
  ]);

  const crons = new Map((cronRows as unknown as CronRow[]).map((r) => [r.job, r]));
  const enrich = cronTone(crons.get("enrich"), 26);
  const lifecycle = cronTone(crons.get("lifecycle_email"), 26);
  const pseo = cronTone(crons.get("pseo"), 26);
  const chatAgo = lastChat?.at ? (Date.now() - new Date(lastChat.at).getTime()) / 3600000 : Infinity;

  return (
    <>
      <div className="adm-head">
        <h1>Overview</h1>
        <span className="adm-asof">as of {fmtDT(new Date())} IST</span>
      </div>

      <div className="adm-health">
        <HealthItem tone={alerts24.n > 0 ? "bad" : "ok"} title="External APIs"
          sub={alerts24.n > 0 ? `${alerts24.n} open alert(s) in 24h` : "24h mein koi open alert nahi"} />
        <HealthItem tone={errors24.n > 0 ? (errors24.n > 5 ? "bad" : "warn") : "ok"} title="App errors"
          sub={errors24.n > 0 ? `${errors24.n} error(s) in 24h` : "24h clean"} />
        <HealthItem tone={enrich.tone} title="Cron · enrich" sub={enrich.sub} />
        <HealthItem tone={lifecycle.tone} title="Cron · lifecycle email" sub={lifecycle.sub} />
        <HealthItem tone={pseo.tone} title="Cron · pSEO" sub={pseo.sub} />
        <HealthItem tone={lastChat?.at ? (chatAgo < 72 ? "ok" : "warn") : "mut"} title="Chat / Bedrock"
          sub={lastChat?.at ? `last reply ${fmtAgo(lastChat.at)}` : "koi traffic nahi"} />
        <HealthItem tone={lastEmail?.at ? "ok" : "mut"} title="SES sends"
          sub={lastEmail?.at ? `last send ${fmtAgo(lastEmail.at)}` : "koi send record nahi"} />
        <HealthItem tone={down7.n > 3 ? "warn" : down7.n > 0 ? "mut" : "ok"} title="Chat feedback"
          sub={down7.n > 0 ? `${down7.n} dislike(s) in 7d` : "7d mein koi dislike nahi"} />
      </div>

      <div className="adm-cards">
        <StatCard label="Users" value={fmtN(u.total)} detail={`+${u.new7} in 7d`} tone={u.new7 > 0 ? "up" : undefined} />
        <StatCard label="Active (7d)" value={fmtN(u.active7)} detail="last_seen based" />
        <StatCard label="Paid users" value={fmtN(u.paid)} detail={`${rev.paid_orders} paid orders`} />
        <StatCard label="Revenue (month)" value={fmtINR(Number(rev.month_paise))} detail={`all-time ${fmtINR(Number(rev.all_paise))}`} />
        <StatCard label="Leads in DB" value={fmtN(act.leads)} />
        <StatCard label="Unlocks" value={fmtN(act.unlocks)} />
        <StatCard label="Chat msgs (7d)" value={fmtN(act.chat7)} />
        <StatCard label="Billed calls (30d)" value={fmtN(act.billed30)} detail="Places API COGS driver" />
      </div>

      <div className="adm-split">
        <Section title="Signups — last 30 days">
          <div className="adm-tablewrap" style={{ padding: "14px 16px" }}>
            <Bars values={toDayBuckets(signupDays as unknown as { day: Date; n: number }[])} title="signups/day" />
          </div>
        </Section>
        <Section title="Lead unlocks — last 30 days">
          <div className="adm-tablewrap" style={{ padding: "14px 16px" }}>
            <Bars values={toDayBuckets(unlockDays as unknown as { day: Date; n: number }[])} title="unlocks/day" />
          </div>
        </Section>
      </div>

      {rev.abandoned7 > 0 && (
        <Section title="Abandoned checkouts (7d)" note="Order bana par payment nahi aayi — follow-up material.">
          <div className="adm-tablewrap"><div className="adm-empty">
            <Pill tone="warn">{rev.abandoned7} abandoned</Pill>{" "}
            — detail <Link href="/admin/economics" style={{ color: "var(--g-green-darker)", fontWeight: 600 }}>Economics</Link> tab mein.
          </div></div>
        </Section>
      )}
    </>
  );
}
