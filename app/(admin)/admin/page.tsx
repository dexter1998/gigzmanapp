import Link from "next/link";
import { unstable_cache } from "next/cache";
import { sql } from "@/lib/db";
import { fmtAgo, fmtDT, toDayBuckets, dayLabels } from "./ui";
import { Panel, PanelHead, Stat, Funnel, StatusLine, MiniTable, fmtN, fmtINR } from "./kit";
import { Trend } from "./Trend";

/**
 * The page re-renders every request; only the queries are cached. The parent layout sets this too,
 * but that does not stop Next caching this segment's own render per URL — which it did, serving a
 * render from an unknown point in the past.
 */
export const dynamic = "force-dynamic";

/** Validated against this console's dark surface — see kit.tsx and Trend.tsx. */
const C = { signups: "#3987e5", unlocks: "#d95926", revenue: "#199e70" };

type CronRow = { job: string; started_at: string; ok: boolean | null; error: string | null };

function cronTone(row: CronRow | undefined, maxAgeH: number): { tone: "ok" | "warn" | "bad" | "mut"; sub: string } {
  if (!row) return { tone: "mut", sub: "never run" };
  const ageH = (Date.now() - new Date(row.started_at).getTime()) / 3600000;
  if (row.ok === false) return { tone: "bad", sub: `failed ${fmtAgo(row.started_at)} — ${row.error?.slice(0, 50) ?? "?"}` };
  if (ageH > maxAgeH) return { tone: "warn", sub: `last ok ${fmtAgo(row.started_at)} — overdue` };
  return { tone: "ok", sub: `last ok ${fmtAgo(row.started_at)}` };
}

/**
 * Every number on the page, in one cached set.
 *
 * Cached because this used to recompute thirteen queries — several of them whole-table counts —
 * on every refresh, which is what stopped it loading at all once the database ran out of CPU
 * credits. 60s is invisible on a console nobody reads to the second.
 *
 * Deltas are counted here rather than derived in the view: almost every tile now shows change
 * against the prior equal window, because a number with nothing beside it cannot be read.
 */
const getOverview = unstable_cache(
  async () => {
    const [
      [u], [rev], [act], [deltas], signupDays, unlockDays, countries,
      cronRows, [alerts24], [errors24], [lastChat], [lastEmail], recentPayments,
    ] = await Promise.all([
      sql`SELECT count(*)::int AS total,
                 count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS new7,
                 count(*) FILTER (WHERE last_seen_at > now() - interval '7 days')::int AS active7,
                 count(*) FILTER (WHERE onboarding_completed)::int AS onboarded
            FROM user_profiles`,
      sql`SELECT coalesce(sum(amount_paise) FILTER (WHERE status = 'paid'), 0)::bigint AS all_paise,
                 coalesce(sum(amount_paise) FILTER (WHERE status = 'paid' AND paid_at > now() - interval '30 days'), 0)::bigint AS m_paise,
                 coalesce(sum(amount_paise) FILTER (WHERE status = 'paid' AND paid_at > now() - interval '60 days' AND paid_at <= now() - interval '30 days'), 0)::bigint AS prev_m_paise,
                 count(*) FILTER (WHERE status = 'paid')::int AS paid_orders,
                 count(DISTINCT user_email) FILTER (WHERE status = 'paid')::int AS paid_users,
                 count(*) FILTER (WHERE status = 'created' AND created_at > now() - interval '7 days')::int AS abandoned7
            FROM payments`,
      // n_live_tup, not count(*): `leads` is ~300k rows / ~200MB and this is a headline tile, not
      // an invoice. Autovacuum keeps the estimate far closer than anyone reads off a card.
      sql`SELECT (SELECT coalesce(n_live_tup, 0)::int FROM pg_stat_user_tables WHERE relname = 'leads') AS leads,
                 (SELECT count(*)::int FROM unlocks) AS unlocks,
                 (SELECT count(DISTINCT unlocked_by)::int FROM unlocks) AS unlock_users,
                 (SELECT count(*)::int FROM unlocks WHERE unlocked_at > now() - interval '7 days') AS unlocks7,
                 (SELECT count(*)::int FROM chat_messages WHERE created_at > now() - interval '7 days' AND role = 'user') AS chat7,
                 (SELECT coalesce(sum(billed_places_calls), 0)::int FROM area_scans WHERE created_at > now() - interval '30 days') AS billed30`,
      sql`SELECT (SELECT count(*)::int FROM user_profiles
                   WHERE created_at > now() - interval '14 days' AND created_at <= now() - interval '7 days') AS prev_signups,
                 (SELECT count(*)::int FROM unlocks
                   WHERE unlocked_at > now() - interval '14 days' AND unlocked_at <= now() - interval '7 days') AS prev_unlocks,
                 (SELECT count(*)::int FROM chat_messages
                   WHERE role = 'user' AND created_at > now() - interval '14 days' AND created_at <= now() - interval '7 days') AS prev_chat,
                 (SELECT coalesce(sum(billed_places_calls), 0)::int FROM area_scans
                   WHERE created_at > now() - interval '60 days' AND created_at <= now() - interval '30 days') AS prev_billed`,
      sql`SELECT date_trunc('day', created_at) AS day, count(*)::int AS n FROM user_profiles WHERE created_at > now() - interval '30 days' GROUP BY 1`,
      sql`SELECT date_trunc('day', unlocked_at) AS day, count(*)::int AS n FROM unlocks WHERE unlocked_at > now() - interval '30 days' GROUP BY 1`,
      sql`SELECT coalesce(country, 'Unknown') AS country, count(*)::int AS n FROM user_profiles GROUP BY 1 ORDER BY n DESC LIMIT 8`,
      sql`SELECT DISTINCT ON (job) job, started_at, ok, error FROM cron_runs ORDER BY job, started_at DESC`,
      sql`SELECT count(*)::int AS n FROM api_alerts WHERE created_at > now() - interval '24 hours' AND resolved_at IS NULL`,
      sql`SELECT count(*)::int AS n FROM app_errors WHERE created_at > now() - interval '24 hours'`,
      sql`SELECT max(created_at) AS at FROM chat_messages WHERE role = 'assistant'`,
      sql`SELECT max(sent_at) AS at FROM email_sends`,
      sql`SELECT user_email, amount_paise, status, created_at FROM payments ORDER BY created_at DESC LIMIT 6`,
    ]);
    return { u, rev, act, deltas, signupDays, unlockDays, countries, cronRows, alerts24, errors24, lastChat, lastEmail, recentPayments };
  },
  ["admin:overview:v2"],
  { revalidate: 60 },
);

export default async function OverviewPage() {
  const {
    u, rev, act, deltas, signupDays, unlockDays, countries, cronRows,
    alerts24, errors24, lastChat, lastEmail, recentPayments,
  } = await getOverview();

  const crons = new Map((cronRows as unknown as CronRow[]).map((r) => [r.job, r]));
  const signupBuckets = toDayBuckets(signupDays as unknown as { day: Date; n: number }[]);
  const unlockBuckets = toDayBuckets(unlockDays as unknown as { day: Date; n: number }[]);
  const labels = dayLabels();

  const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");

  return (
    <div className="mantis-admin min-h-screen">
      <div className="relative">
        <div className="ledger-ground pointer-events-none absolute inset-x-0 top-0 h-64" />

        <div className="relative mx-auto flex max-w-[1400px] flex-col gap-4 p-5">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="m-0 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-faint)]">Analysis</p>
              <h1 className="m-0 mt-1 text-[26px] font-semibold leading-none tracking-[-0.01em] text-[var(--ink)]">Overview</h1>
            </div>
            <p className="m-0 text-[11.5px] text-[var(--ink-faint)]">
              {fmtDT(new Date())} IST · numbers cached 60s · read-only
            </p>
          </header>

          {/* The strip. Six metrics with their change, where three bare numbers used to sit. */}
          <div className="adm-grid adm-grid-6">
            <Stat label="Users" value={fmtN(u.total)} delta={u.new7 - deltas.prev_signups} sub={`+${fmtN(u.new7)} this week`} accent={C.signups} />
            <Stat label="Active 7d" value={fmtN(u.active7)} sub={`${pct(u.active7, u.total)} of all users`} />
            <Stat label="Revenue 30d" value={fmtINR(Number(rev.m_paise))} delta={Math.round((Number(rev.m_paise) - Number(rev.prev_m_paise)) / 100)} deltaLabel="₹ vs prev 30d" accent={C.revenue} />
            <Stat label="Paid users" value={fmtN(rev.paid_users)} sub={`${fmtN(rev.paid_orders)} orders · ${fmtINR(Number(rev.all_paise))} all-time`} />
            <Stat label="Unlocks 7d" value={fmtN(act.unlocks7)} delta={act.unlocks7 - deltas.prev_unlocks} sub={`${fmtN(act.unlocks)} all-time`} accent={C.unlocks} />
            <Stat label="Billed calls 30d" value={fmtN(act.billed30)} delta={act.billed30 - deltas.prev_billed} goodDirection="down" deltaLabel="Places COGS" />
          </div>

          <div className="adm-grid adm-grid-3 adm-gap-4">
            {/* The funnel the old overview never had: it showed users, unlocks and payments as
                three unrelated tiles and never what fraction of one becomes the next. */}
            <Panel>
              <PanelHead title="Acquisition funnel" meta="All-time. Step-down is what to act on." />
              <Funnel
                stages={[
                  { label: "Registered", value: u.total },
                  { label: "Onboarding complete", value: u.onboarded, note: pct(u.onboarded, u.total) },
                  { label: "Active in last 7d", value: u.active7, note: pct(u.active7, u.total) },
                  // A real distinct count, not a guess. The first version estimated this as
                  // unlocks/3 and promptly rendered "150% carry through" — a funnel stage wider
                  // than the one above it, which is the clearest possible sign the number is made
                  // up. Counting the people is both cheaper to explain and actually right.
                  { label: "Unlocked a lead", value: act.unlock_users, note: `${fmtN(act.unlocks)} unlocks` },
                  { label: "Paid", value: rev.paid_users, note: pct(rev.paid_users, u.total) },
                ]}
              />
            </Panel>

            {/* Two charts, one measure each, same x-axis. Never two y-axes — where the lines
                cross would be an artefact of where the axes were pinned. */}
            <Panel className="adm-span-2">
              <PanelHead title="Last 30 days" meta="Signups and unlocks, same axis, separate scales." />
              <div className="adm-grid adm-grid-2" style={{ gap: 0 }}>
                <div className="md:rule-r px-1 pb-2 pt-3">
                  <p className="m-0 flex items-center gap-2 px-3 text-[11.5px] text-[var(--ink-muted)]">
                    <span className="h-2 w-2 rounded-full" style={{ background: C.signups }} aria-hidden="true" />
                    Signups · <span className="tnum text-[var(--ink)]">{fmtN(signupBuckets.reduce((a, b) => a + b, 0))}</span>
                  </p>
                  <Trend categories={labels} values={signupBuckets} color={C.signups} label="Signups" />
                </div>
                <div className="px-1 pb-2 pt-3">
                  <p className="m-0 flex items-center gap-2 px-3 text-[11.5px] text-[var(--ink-muted)]">
                    <span className="h-2 w-2 rounded-full" style={{ background: C.unlocks }} aria-hidden="true" />
                    Unlocks · <span className="tnum text-[var(--ink)]">{fmtN(unlockBuckets.reduce((a, b) => a + b, 0))}</span>
                  </p>
                  <Trend categories={labels} values={unlockBuckets} color={C.unlocks} label="Unlocks" />
                </div>
              </div>
            </Panel>
          </div>

          <div className="adm-grid adm-grid-3 adm-gap-4">
            <Panel>
              <PanelHead title="Systems" meta="Cron freshness and last 24h errors." />
              <div className="divide-y divide-[var(--rule)]">
                {([["enrich", 26], ["lifecycle_email", 26], ["pseo", 26]] as const).map(([job, maxAge]) => {
                  const t = cronTone(crons.get(job), maxAge);
                  return <StatusLine key={job} tone={t.tone} title={job} sub={t.sub} />;
                })}
                <StatusLine tone={errors24.n > 0 ? "warn" : "ok"} title={`${fmtN(errors24.n)} app errors`} sub="last 24 hours" />
                <StatusLine tone={alerts24.n > 0 ? "bad" : "ok"} title={`${fmtN(alerts24.n)} open API alerts`} sub="unresolved, last 24h" />
                <StatusLine tone="mut" title="Last outbound email" sub={lastEmail?.at ? fmtAgo(lastEmail.at) : "never"} />
                <StatusLine tone="mut" title="Last assistant reply" sub={lastChat?.at ? fmtAgo(lastChat.at) : "never"} />
              </div>
            </Panel>

            <Panel>
              <PanelHead title="Recent payments" meta={`${fmtN(rev.abandoned7)} abandoned checkouts in 7d`}
                action={<Link href="/admin/economics" className="text-[11.5px] text-[var(--accent-text)] no-underline">Economics →</Link>} />
              <MiniTable
                head={["User", "Amount", "Status"]}
                rows={(recentPayments as unknown as { user_email: string; amount_paise: number; status: string; created_at: string }[]).map((p) => [
                  <span key="e" title={p.user_email}>{p.user_email.length > 22 ? `${p.user_email.slice(0, 21)}…` : p.user_email}</span>,
                  fmtINR(Number(p.amount_paise)),
                  <span key="s" style={{ color: p.status === "paid" ? "var(--ok)" : "var(--ink-faint)" }}>{p.status}</span>,
                ])}
                empty="No payments yet"
              />
            </Panel>

            <Panel>
              <PanelHead title="Where users are" meta="One-time capture from client IP at signup."
                action={<Link href="/admin/users" className="text-[11.5px] text-[var(--accent-text)] no-underline">Users →</Link>} />
              <MiniTable
                head={["Country", "Users", "Share"]}
                rows={(countries as unknown as { country: string; n: number }[]).map((c) => [c.country, fmtN(c.n), pct(c.n, u.total)])}
                empty="No country data"
              />
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
