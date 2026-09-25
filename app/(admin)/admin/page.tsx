import Link from "next/link";
import { sql } from "@/lib/db";
import {
  PageHeader, StatCard, MiniStatCard, CardRow, Section, Table, Pill, HealthItem,
  ActivityRow, ProgressStat, fmtDT, fmtAgo, fmtINR, fmtN, toDayBuckets, dayLabels,
} from "./ui";
import { Sparkline, BarChart, WorldMap } from "./charts";
import {
  IconUsers, IconMessageCircle, IconPhoneCall, IconAlertTriangle,
  IconBulb, IconChecklist, IconTrendingUp,
} from "@tabler/icons-react";

/** Overview — the same Tabler dashboard composition as the reference screenshot (welcome/KPI row
 * → compact metric row → big chart + map → activity/progress → full-width table), populated with
 * real Mantis numbers end to end. Every section maps to genuine data; where the reference had a
 * component with no Mantis equivalent (Tabler Icons promo, a task-tracker), it's replaced with a
 * real read-only equivalent rather than left out or faked — see
 * docs/MANTIS_ADMIN_TABLER_SYSTEM.md's mapping table for the full list of substitutions and why. */

type CronRow = { job: string; started_at: Date; ok: boolean | null; error: string | null; summary?: unknown };

function cronTone(row: CronRow | undefined, maxAgeH: number): { tone: "ok" | "warn" | "bad" | "mut"; sub: string } {
  if (!row) return { tone: "mut", sub: "abhi tak koi run record nahi (collector naya hai)" };
  const ageH = (Date.now() - new Date(row.started_at).getTime()) / 3600000;
  if (row.ok === false) return { tone: "bad", sub: `last run FAIL ${fmtAgo(row.started_at)} — ${row.error?.slice(0, 60) ?? "?"}` };
  if (ageH > maxAgeH) return { tone: "warn", sub: `last ok run ${fmtAgo(row.started_at)} — overdue` };
  return { tone: "ok", sub: `last ok run ${fmtAgo(row.started_at)}` };
}

export default async function OverviewPage() {
  const [
    [u], [rev], [act], signupDays, unlockDays, countries,
    cronRows, [alerts24], [errors24], [lastChat], [lastEmail], [down7], recentPayments,
  ] = await Promise.all([
    sql`SELECT count(DISTINCT up.email)::int AS total,
               count(DISTINCT up.email) FILTER (WHERE up.created_at > now() - interval '7 days')::int AS new7,
               count(DISTINCT up.email) FILTER (WHERE up.last_seen_at > now() - interval '7 days')::int AS active7,
               count(DISTINCT up.email) FILTER (WHERE up.onboarding_completed)::int AS onboarded,
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
    sql`SELECT coalesce(country, 'Unknown') AS country, count(*)::int AS n FROM user_profiles GROUP BY 1 ORDER BY n DESC LIMIT 12`,
    sql`SELECT DISTINCT ON (job) job, started_at, ok, error, summary FROM cron_runs ORDER BY job, started_at DESC`,
    sql`SELECT count(*)::int AS n FROM api_alerts WHERE created_at > now() - interval '24 hours' AND resolved_at IS NULL`,
    sql`SELECT count(*)::int AS n FROM app_errors WHERE created_at > now() - interval '24 hours'`,
    sql`SELECT max(created_at) AS at FROM chat_messages WHERE role = 'assistant'`,
    sql`SELECT max(sent_at) AS at FROM email_sends`,
    sql`SELECT count(*)::int AS n FROM chat_messages WHERE feedback = 'down' AND created_at > now() - interval '7 days'`,
    sql`SELECT user_email, amount_paise, status, created_at FROM payments ORDER BY created_at DESC LIMIT 8`,
  ]);

  const crons = new Map((cronRows as unknown as CronRow[]).map((r) => [r.job, r]));
  const enrich = cronTone(crons.get("enrich"), 26);
  const lifecycle = cronTone(crons.get("lifecycle_email"), 26);
  const pseo = cronTone(crons.get("pseo"), 26);
  const chatAgo = lastChat?.at ? (Date.now() - new Date(lastChat.at).getTime()) / 3600000 : Infinity;
  const activePct = u.total > 0 ? Math.round((u.active7 / u.total) * 100) : 0;
  const onboardedPct = u.total > 0 ? Math.round((u.onboarded / u.total) * 100) : 0;

  const signupBuckets = toDayBuckets(signupDays as unknown as { day: Date; n: number }[]);
  const unlockBuckets = toDayBuckets(unlockDays as unknown as { day: Date; n: number }[]);
  const labels = dayLabels();

  return (
    <div className="page-body">
      <div className="container-xl">
        <PageHeader pretitle="Analysis" title="Overview" sub={`as of ${fmtDT(new Date())} IST`} />

        {/* Row 1 — welcome + the two headline KPIs, Tabler's own opening composition */}
        <CardRow>
          <Section col="col-lg-4" title="Welcome back, Tarun">
            <p className="text-secondary mb-2" style={{ fontSize: 13 }}>
              {u.new7} naye users is week, {rev.paid_orders} paid orders all-time. Read-only console — koi action yahan se nahi hota.
            </p>
            <div className="d-flex gap-4 mt-3">
              <div>
                <div className="text-secondary" style={{ fontSize: 11 }}>REVENUE (MONTH)</div>
                <div className="h3 mb-0">{fmtINR(Number(rev.month_paise))}</div>
              </div>
              <div>
                <div className="text-secondary" style={{ fontSize: 11 }}>ALL-TIME</div>
                <div className="h3 mb-0">{fmtINR(Number(rev.all_paise))}</div>
              </div>
            </div>
          </Section>
          <StatCard col="col-lg-4" label="Total users" value={fmtN(u.total)}
            detail={<span className="d-inline-flex align-items-center gap-1"><IconTrendingUp size={14} />+{u.new7} in 7d</span>}
            tone={u.new7 > 0 ? "up" : undefined}
            spark={<Sparkline values={signupBuckets} />} />
          <Section col="col-lg-4" title="Active users">
            <div className="d-flex align-items-center gap-3">
              <div className="position-relative" style={{ width: 90 }}>
                <div className="h1 mb-0 text-center">{activePct}%</div>
              </div>
              <div>
                <div className="progress progress-sm mb-2" style={{ width: 140 }}>
                  <div className="progress-bar bg-primary" style={{ width: `${activePct}%` }} />
                </div>
                <div className="text-secondary" style={{ fontSize: 12 }}>{fmtN(u.active7)} of {fmtN(u.total)} — last_seen 7d based</div>
              </div>
            </div>
          </Section>
        </CardRow>

        {/* Row 2 — compact KPI cards, Tabler's Sales/Revenue/New clients/Subscriptions row */}
        <CardRow>
          <StatCard label="Paid users" value={fmtN(u.paid)} detail={`${rev.paid_orders} paid orders`} />
          <StatCard label="Leads in DB" value={fmtN(act.leads)} />
          <StatCard label="Unlocks" value={fmtN(act.unlocks)} spark={<Sparkline values={unlockBuckets} color="#2fb344" />} />
          <StatCard label="Billed calls (30d)" value={fmtN(act.billed30)} detail="Places API COGS driver" />
        </CardRow>

        {/* Row 3 — the small avatar+text cards (132 Sales / 78 Orders style in the reference) */}
        <CardRow>
          <MiniStatCard icon={<IconMessageCircle size={20} />} tone="azure" title={`${fmtN(act.chat7)} chat msgs`} sub="last 7 days" />
          <MiniStatCard icon={<IconPhoneCall size={20} />} tone="green" title={`${fmtN(act.billed30)} billed calls`} sub="last 30 days" />
          <MiniStatCard icon={<IconAlertTriangle size={20} />} tone={rev.abandoned7 > 0 ? "yellow" : "green"} title={`${fmtN(rev.abandoned7)} abandoned`} sub="checkouts, last 7d" />
          <MiniStatCard icon={<IconUsers size={20} />} tone="primary" title={`${fmtN(u.onboarded)} onboarded`} sub={`${onboardedPct}% of all users`} />
        </CardRow>

        {/* Row 4 — the big chart + map, Tabler's "Traffic summary" / "Locations" pair */}
        <CardRow>
          <Section col="col-lg-8" title="Signups — last 30 days" note="Har din ke naye registrations.">
            <BarChart categories={labels} values={signupBuckets} />
          </Section>
          <Section col="col-lg-4" title="Locations" note="Top user countries.">
            <WorldMap data={countries as unknown as { country: string; n: number }[]} />
          </Section>
        </CardRow>

        {/* Row 5 — progress + activity, Tabler's "Using Storage" / "Development activity" pair */}
        <CardRow>
          <Section col="col-lg-4" title="Account health">
            <ProgressStat label="Weekly active rate" pct={activePct} tone="primary" />
            <ProgressStat label="Onboarding completion" pct={onboardedPct} tone="green" />
            <ProgressStat label="Paid conversion" pct={u.total > 0 ? Math.round((u.paid / u.total) * 100) : 0} tone="yellow" />
          </Section>
          <Section col="col-lg-8" title="System activity" note="Cron jobs — jo bhi chal raha hai background mein.">
            <div className="list-group list-group-flush">
              <ActivityRow when={fmtAgo(crons.get("enrich")?.started_at)} label="Cron · enrich" tone={enrich.tone} badge={enrich.tone === "ok" ? "ok" : enrich.tone} />
              <ActivityRow when={fmtAgo(crons.get("lifecycle_email")?.started_at)} label="Cron · lifecycle email" tone={lifecycle.tone} badge={lifecycle.tone === "ok" ? "ok" : lifecycle.tone} />
              <ActivityRow when={fmtAgo(crons.get("pseo")?.started_at)} label="Cron · pSEO refresh" tone={pseo.tone} badge={pseo.tone === "ok" ? "ok" : pseo.tone} />
              <ActivityRow when={fmtAgo(lastChat?.at)} label="Chat / Bedrock — last assistant reply" tone={lastChat?.at ? (chatAgo < 72 ? "ok" : "warn") : "mut"} badge={lastChat?.at ? "ok" : "no data"} />
              <ActivityRow when={fmtAgo(lastEmail?.at)} label="SES — last send" tone={lastEmail?.at ? "ok" : "mut"} badge={lastEmail?.at ? "ok" : "no data"} />
            </div>
          </Section>
        </CardRow>

        {/* Row 6 — an info card + a "tasks" style checklist, Tabler's promo-card / task-list pair */}
        <CardRow>
          <Section col="col-lg-4" title="Quick links">
            <div className="d-flex align-items-start gap-2 mb-3">
              <IconBulb size={20} className="text-yellow flex-shrink-0" />
              <div className="text-secondary" style={{ fontSize: 12.5 }}>
                Ye console read-only hai — koi button yahan se production data nahi badalta.
              </div>
            </div>
            <div className="d-flex flex-column gap-1">
              <Link href="/admin/users" className="text-decoration-none">Users →</Link>
              <Link href="/admin/economics" className="text-decoration-none">Economics →</Link>
              <Link href="/admin/health" className="text-decoration-none">Health &amp; Logs →</Link>
            </div>
          </Section>
          <Section col="col-lg-8" title="Needs attention" note="Jo real signals abhi follow-up maangte hain.">
            <div className="list-group list-group-flush">
              <div className="list-group-item d-flex align-items-center gap-2">
                <IconChecklist size={16} className={alerts24.n > 0 ? "text-danger" : "text-green"} />
                <span className="flex-fill">{alerts24.n} open external-API alert(s) in 24h</span>
                {alerts24.n > 0 && <Link href="/admin/health" className="text-decoration-none" style={{ fontSize: 12 }}>view →</Link>}
              </div>
              <div className="list-group-item d-flex align-items-center gap-2">
                <IconChecklist size={16} className={errors24.n > 0 ? "text-danger" : "text-green"} />
                <span className="flex-fill">{errors24.n} app error(s) in 24h</span>
                {errors24.n > 0 && <Link href="/admin/health" className="text-decoration-none" style={{ fontSize: 12 }}>view →</Link>}
              </div>
              <div className="list-group-item d-flex align-items-center gap-2">
                <IconChecklist size={16} className={rev.abandoned7 > 0 ? "text-yellow" : "text-green"} />
                <span className="flex-fill">{rev.abandoned7} abandoned checkout(s) in 7d</span>
                {rev.abandoned7 > 0 && <Link href="/admin/economics" className="text-decoration-none" style={{ fontSize: 12 }}>view →</Link>}
              </div>
              <div className="list-group-item d-flex align-items-center gap-2">
                <IconChecklist size={16} className={down7.n > 3 ? "text-yellow" : "text-green"} />
                <span className="flex-fill">{down7.n} chat 👎 in 7d</span>
              </div>
            </div>
          </Section>
        </CardRow>

        {/* Row 7 — the full-width table, Tabler's "Invoices" slot mapped to real payments */}
        <div className="row row-cards">
          <Table title="Recent payments" col="col-12"
            head={["User", "Amount", "Status", "When"]}
            rows={recentPayments.map((p) => [
              <Link key="u" href={`/admin/users/${encodeURIComponent(p.user_email)}`} className="text-decoration-none">{p.user_email}</Link>,
              fmtINR(Number(p.amount_paise)),
              <Pill key="s" tone={p.status === "paid" ? "ok" : p.status === "created" ? "warn" : "mut"}>{p.status}</Pill>,
              fmtDT(p.created_at),
            ])}
            empty="abhi tak koi payment record nahi" />
        </div>
      </div>
    </div>
  );
}
