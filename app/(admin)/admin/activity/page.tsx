import Link from "next/link";
import { sql } from "@/lib/db";
import { PageHeader, StatCard, CardRow, Section, Table, Pill, fmtAgo, fmtN } from "../ui";
import { Funnel, type FunnelStage } from "../kit";
import { SECTIONS } from "@/lib/events";

/**
 * Activity — what users actually do, section by section (docs/analytics-events.md).
 *
 * Two layers on one page. `product_events` (every click and every completed action, from
 * 2026-10-26) feeds the per-section tables, the funnels and the upsell list. The older tables
 * (runs, senders, voice tests, campaigns, outcomes) give the "since launch" totals so the page is
 * not empty on day one and so the two can be reconciled.
 */
export const dynamic = "force-dynamic";

const SECTION_LABEL: Record<string, string> = {
  chat: "Chat & planning", leads: "Leads", campaigns: "Outreach planner & campaigns", inbox: "Inbox", templates: "Templates",
  integrations: "Integrations (email, voice, WhatsApp)", billing: "Billing", settings: "Settings", account: "Account & profiles", nav: "Navigation", home: "Home", analytics: "Analytics", jobs: "Jobs", other: "Other",
};

type Row = Record<string, unknown>;
const n = (v: unknown) => Number(v ?? 0);

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const sp = await searchParams;
  const days = [7, 14, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 7;
  const since = sql`now() - (${days} || ' days')::interval`;
  const notStaff = sql`user_email NOT ILIKE '%mantisai.in' AND user_email NOT ILIKE '%maxxspace%'`;

  const [totals, perSection, perEvent, firstSeen, funnelRows, upsell, sinceLaunch, dailyActive] = await Promise.all([
    sql`SELECT count(DISTINCT user_email)::int AS users, count(*)::int AS events, count(DISTINCT session_id)::int AS sessions,
               count(*) FILTER (WHERE source = 'server')::int AS actions, count(*) FILTER (WHERE device = 'mobile')::int AS mobile
        FROM product_events WHERE created_at >= ${since} AND ${notStaff}`,
    sql`SELECT section, count(DISTINCT user_email)::int AS users, count(*)::int AS events, count(*) FILTER (WHERE source = 'server')::int AS actions
        FROM product_events WHERE created_at >= ${since} AND ${notStaff} GROUP BY 1`,
    sql`SELECT section, event, source, count(DISTINCT user_email)::int AS users, count(*)::int AS n, max(created_at) AS last_at
        FROM product_events WHERE created_at >= ${since} AND ${notStaff} GROUP BY 1, 2, 3 ORDER BY 1, 5 DESC`,
    sql`SELECT min(created_at) AS t FROM product_events`,
    // Funnel stages: distinct users who did each thing in the window (events) — onboarding and
    // signups from user_profiles so the top of the funnel is not limited to the beacon's start date.
    sql`SELECT
          (SELECT count(*)::int FROM user_profiles WHERE created_at >= ${since} AND email NOT ILIKE '%mantisai.in') AS signups,
          (SELECT count(*)::int FROM user_profiles WHERE created_at >= ${since} AND onboarding_completed AND email NOT ILIKE '%mantisai.in') AS onboarded,
          (SELECT count(DISTINCT user_email)::int FROM v2_turn_log WHERE created_at >= ${since} AND ${notStaff}) AS chatted,
          (SELECT count(DISTINCT user_email)::int FROM v2_runs WHERE created_at >= ${since} AND ${notStaff}) AS planned,
          (SELECT count(DISTINCT user_email)::int FROM v2_runs WHERE created_at >= ${since} AND status IN ('running','done','stopped','paused') AND ${notStaff}) AS ran,
          (SELECT count(DISTINCT user_email)::int FROM v2_outcomes WHERE created_at >= ${since} AND ${notStaff}) AS acted,
          (SELECT count(DISTINCT user_email)::int FROM v2_senders WHERE created_at >= ${since} AND status = 'connected' AND ${notStaff}) AS email_connected,
          (SELECT count(DISTINCT user_email)::int FROM v2_voice_tests WHERE created_at >= ${since} AND ${notStaff}) AS test_called,
          (SELECT count(DISTINCT user_email)::int FROM v2_campaigns WHERE created_at >= ${since} AND ${notStaff}) AS campaign_created,
          (SELECT count(DISTINCT user_email)::int FROM v2_campaigns WHERE created_at >= ${since} AND test_sent_at IS NOT NULL AND ${notStaff}) AS campaign_tested,
          (SELECT count(DISTINCT user_email)::int FROM v2_campaigns WHERE created_at >= ${since} AND approved_at IS NOT NULL AND ${notStaff}) AS campaign_approved,
          (SELECT count(DISTINCT user_email)::int FROM product_events WHERE created_at >= ${since} AND event = 'billing.pack.checkout_start' AND ${notStaff}) AS checkout,
          (SELECT count(DISTINCT user_email)::int FROM product_events WHERE created_at >= ${since} AND event = 'billing.pack.paid' AND ${notStaff}) AS paid`,
    // Upsell signals, last 14 days, from the tables that already hold the truth (events add detail).
    sql`WITH u AS (SELECT DISTINCT user_email FROM v2_runs WHERE created_at >= now() - interval '14 days' AND ${notStaff})
        SELECT u.user_email,
          (SELECT count(*)::int FROM v2_runs r WHERE r.user_email = u.user_email AND r.created_at >= now() - interval '14 days' AND r.status <> 'planned') AS runs,
          (SELECT coalesce(sum(delivered), 0)::int FROM v2_runs r WHERE r.user_email = u.user_email AND r.created_at >= now() - interval '14 days') AS delivered,
          (SELECT count(*)::int FROM v2_outcomes o WHERE o.user_email = u.user_email AND o.created_at >= now() - interval '14 days') AS lead_actions,
          (SELECT count(DISTINCT date(created_at))::int FROM v2_turn_log t WHERE t.user_email = u.user_email AND t.created_at >= now() - interval '14 days') AS active_days,
          EXISTS (SELECT 1 FROM v2_senders s WHERE s.user_email = u.user_email AND s.status = 'connected') AS email_connected,
          EXISTS (SELECT 1 FROM v2_voice_tests v WHERE v.user_email = u.user_email) AS test_called,
          EXISTS (SELECT 1 FROM v2_campaigns c WHERE c.user_email = u.user_email) AS has_campaign,
          EXISTS (SELECT 1 FROM product_events e WHERE e.user_email = u.user_email AND e.event = 'billing.pack.checkout_start' AND e.created_at >= now() - interval '14 days')
            AND NOT EXISTS (SELECT 1 FROM product_events e WHERE e.user_email = u.user_email AND e.event = 'billing.pack.paid' AND e.created_at >= now() - interval '14 days') AS checkout_unpaid,
          (SELECT max(created_at) FROM v2_turn_log t WHERE t.user_email = u.user_email) AS last_seen
        FROM u`,
    sql`SELECT
          (SELECT count(*)::int FROM v2_runs WHERE ${notStaff}) AS runs,
          (SELECT count(DISTINCT user_email)::int FROM v2_runs WHERE ${notStaff}) AS run_users,
          (SELECT count(DISTINCT user_email)::int FROM v2_senders WHERE status = 'connected' AND ${notStaff}) AS email_users,
          (SELECT count(*)::int FROM v2_voice_tests WHERE ${notStaff}) AS test_calls,
          (SELECT count(DISTINCT user_email)::int FROM v2_voice_tests WHERE ${notStaff}) AS test_call_users,
          (SELECT count(*)::int FROM v2_campaigns WHERE ${notStaff}) AS campaigns,
          (SELECT count(DISTINCT user_email)::int FROM v2_campaigns WHERE ${notStaff}) AS campaign_users,
          (SELECT count(*)::int FROM v2_campaigns WHERE approved_at IS NOT NULL AND ${notStaff}) AS campaigns_approved,
          (SELECT count(*)::int FROM v2_outcomes WHERE ${notStaff}) AS lead_actions`,
    sql`SELECT date(created_at) AS d, count(DISTINCT user_email)::int AS users, count(*)::int AS events
        FROM product_events WHERE created_at >= ${since} AND ${notStaff} GROUP BY 1 ORDER BY 1 DESC LIMIT 30`,
  ]);

  const t = totals[0] as Row; const f = funnelRows[0] as Row; const L = sinceLaunch[0] as Row;
  const secOf = new Map((perSection as Row[]).map((r) => [String(r.section), r]));
  const eventsBySection = new Map<string, Row[]>();
  for (const r of perEvent as Row[]) { const k = String(r.section); if (!eventsBySection.has(k)) eventsBySection.set(k, []); eventsBySection.get(k)!.push(r); }

  const activation: FunnelStage[] = [
    { label: "Signed up", value: n(f.signups) }, { label: "Finished onboarding", value: n(f.onboarded) }, { label: "Sent a chat message", value: n(f.chatted) },
    { label: "Got a plan", value: n(f.planned) }, { label: "Ran it", value: n(f.ran) }, { label: "Acted on a lead", value: n(f.acted) },
  ];
  const outreach: FunnelStage[] = [
    { label: "Ran a search", value: n(f.ran) }, { label: "Connected email", value: n(f.email_connected) }, { label: "Made a test call", value: n(f.test_called), note: "voice" },
    { label: "Created a campaign", value: n(f.campaign_created) }, { label: "Sent a test", value: n(f.campaign_tested) }, { label: "Approved a campaign", value: n(f.campaign_approved) },
  ];
  const money: FunnelStage[] = [
    { label: "Ran a search", value: n(f.ran) }, { label: "Started checkout", value: n(f.checkout), note: "from events" }, { label: "Paid", value: n(f.paid) },
  ];

  const scored = (upsell as Row[]).map((u) => {
    const reasons: string[] = [];
    if (n(u.runs) >= 3 || n(u.delivered) >= 40) reasons.push(`${n(u.runs)} runs / ${n(u.delivered)} leads`);
    if (n(u.lead_actions) >= 2) reasons.push(`${n(u.lead_actions)} lead actions`);
    if (u.email_connected || u.test_called) reasons.push(u.email_connected ? "email connected" : "test call made");
    if (u.checkout_unpaid) reasons.push("checkout started, not paid");
    if (n(u.active_days) >= 5) reasons.push(`${n(u.active_days)} active days`);
    return { u, reasons, score: reasons.length };
  }).filter((x) => x.score >= 2).sort((a, b) => b.score - a.score || n(b.u.delivered) - n(a.u.delivered)).slice(0, 40);

  const first = (firstSeen[0] as Row)?.t ? fmtAgo((firstSeen[0] as Row).t as Date) : "no events yet";
  const range = (d: number) => <Link key={d} href={`/admin/activity?days=${d}`} className={`rounded px-2 py-1 text-[12px] ${d === days ? "bg-[var(--ink)] text-[var(--surface)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}>{d}d</Link>;

  return (
    <>
      <PageHeader pretitle="Analysis" title="Activity" sub={`Every button and every completed action, by section. Event capture started ${first}.`}
        actions={<div className="flex gap-1">{[7, 14, 30, 90].map(range)}</div>} />

      <CardRow>
        <StatCard label={`Active users · ${days}d`} value={fmtN(n(t.users))} detail={`${fmtN(n(t.sessions))} sessions · ${n(t.events) ? Math.round((n(t.mobile) / n(t.events)) * 100) : 0}% mobile`} />
        <StatCard label={`Events · ${days}d`} value={fmtN(n(t.events))} detail={`${fmtN(n(t.actions))} completed actions (server)`} />
        <StatCard label="Email connected · all time" value={fmtN(n(L.email_users))} detail={`${fmtN(n(L.run_users))} users ran a search`} />
        <StatCard label="Test calls · all time" value={fmtN(n(L.test_calls))} detail={`${fmtN(n(L.test_call_users))} users · ${fmtN(n(L.campaigns))} campaigns by ${fmtN(n(L.campaign_users))} users (${fmtN(n(L.campaigns_approved))} approved)`} />
      </CardRow>

      <CardRow>
        <Section title={`Activation funnel · ${days}d`} note="Distinct users per stage, from the tables that hold the truth." col="col-lg-4"><Funnel stages={activation} /></Section>
        <Section title={`Outreach funnel · ${days}d`} note="Where the outreach side drops." col="col-lg-4"><Funnel stages={outreach} /></Section>
        <Section title={`Monetisation · ${days}d`} note="Checkout events come from the beacon; paid from the verify route." col="col-lg-4"><Funnel stages={money} /></Section>
      </CardRow>

      <Table title="Ready to upsell · last 14 days" note="Two or more signals (docs/analytics-events.md §4). Evidence shown, so sales can act."
        head={["User", "Signals", "Why", "Runs", "Leads", "Lead actions", "Active days", "Last seen"]} empty="No user has two signals yet."
        rows={scored.map(({ u, reasons, score }) => [
          <Link key="u" href={`/admin/users/${encodeURIComponent(String(u.user_email))}`} className="underline">{String(u.user_email)}</Link>,
          <Pill key="s" tone={score >= 4 ? "ok" : score === 3 ? "info" : "mut"}>{score}</Pill>,
          reasons.join(" · "), fmtN(n(u.runs)), fmtN(n(u.delivered)), fmtN(n(u.lead_actions)), fmtN(n(u.active_days)), u.last_seen ? fmtAgo(u.last_seen as Date) : "—",
        ])} />

      <CardRow>
        {SECTIONS.filter((s) => s !== "other" || eventsBySection.has("other")).map((s) => {
          const sec = secOf.get(s); const evs = eventsBySection.get(s) ?? [];
          return (
            <Table key={s} col="col-lg-6" title={SECTION_LABEL[s] ?? s}
              note={sec ? `${fmtN(n(sec.users))} users · ${fmtN(n(sec.events))} events · ${fmtN(n(sec.actions))} completed actions` : "No events in this window"}
              head={["Event", "Src", { label: "Users", num: true }, { label: "Count", num: true }, "Last"]} empty="Nothing yet."
              rows={evs.slice(0, 14).map((e) => [
                <code key="e" className="text-[11.5px]">{String(e.event)}</code>,
                <Pill key="p" tone={e.source === "server" ? "ok" : "mut"}>{e.source === "server" ? "action" : "click"}</Pill>,
                fmtN(n(e.users)), fmtN(n(e.n)), fmtAgo(e.last_at as Date),
              ])} />
          );
        })}
      </CardRow>

      <Table title="Daily" note="Distinct users and events per day from the beacon." head={["Day", { label: "Users", num: true }, { label: "Events", num: true }]} empty="No days yet."
        rows={(dailyActive as Row[]).map((d) => [String(d.d).slice(0, 10), fmtN(n(d.users)), fmtN(n(d.events))])} />
    </>
  );
}
