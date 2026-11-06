import Link from "next/link";
import { sql } from "@/lib/db";
import { PageHeader, StatCard, CardRow, Table, Pill, fmtAgo, fmtN } from "../ui";
import { channelOf, landingOf, type SignupSource } from "@/lib/attribution";
import { SIGNALS, type SignalId } from "@/lib/v2/playbooks";

/**
 * Analysis — the decisions page (2026-10-26). Activity shows WHAT happened; this page turns it into
 * who to act on and how: upsell, give a free perk, rescue, or fix the chat that failed them.
 *
 * Every user is put in exactly one segment (rules below, first match wins) so the counts add up and
 * each list is an action, not a report:
 *   Paying      paid at least once
 *   Upsell      2+ of: ≥3 runs or ≥40 leads · ≥3 active days · credits under 100 · email connected / test call
 *   Free perk   ran at least once, credits under 60, never paid, active in the last 14 days → a bonus keeps them going
 *   Stuck       3+ chat turns and never ran a search → the chat failed them
 *   At risk     ran before, nothing in 14 days
 *   New         signed up in the last 7 days, not yet active
 *   Casual      everything else
 */
export const dynamic = "force-dynamic";

const NOT_STAFF = (col: string) => sql.unsafe(`${col} NOT ILIKE '%mantisai.in' AND ${col} NOT ILIKE '%maxxspace%' AND ${col} NOT ILIKE '%gigzman.com'`);
const n = (v: unknown) => Number(v ?? 0);
type Row = Record<string, unknown>;
const PAGE = 25;
// Request time, read outside render so the purity lint stays happy (the page is force-dynamic).
const nowMs = () => Date.now();

type Seg = "Paying" | "Upsell" | "Free perk" | "Stuck" | "At risk" | "New" | "Casual";
const SEG_ACTION: Record<Seg, string> = {
  Paying: "Keep them: check delivery quality on their runs", Upsell: "Offer a plan — show the evidence below",
  "Free perk": "Grant bonus credits (100) to keep momentum", Stuck: "Open their chat — fix what failed, then follow up",
  "At risk": "Win-back email with a fresh lead list for their niche", New: "Onboarding nudge: one example search",
  Casual: "No action yet",
};
const SEG_TONE: Record<Seg, "ok" | "info" | "warn" | "bad" | "mut"> = { Paying: "ok", Upsell: "info", "Free perk": "info", Stuck: "bad", "At risk": "warn", New: "mut", Casual: "mut" };

export default async function AnalysisPage({ searchParams }: { searchParams: Promise<{ days?: string; page?: string; f?: string; seg?: string }> }) {
  const sp = await searchParams;
  const days = [7, 14, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const page = Math.max(1, Number(sp.page) || 1);
  const f = ["failed", "noplan", "neg", "all"].includes(sp.f ?? "") ? sp.f! : "all";
  const since = sql`now() - (${days} || ' days')::interval`;

  const [users, views, buttons, intents, industries, signals, cannot, chatsCount] = await Promise.all([
    sql`
      WITH t AS (SELECT user_email, count(*)::int turns, count(DISTINCT date(created_at))::int days, max(created_at) last FROM v2_turn_log GROUP BY 1),
      r AS (SELECT user_email, count(*) FILTER (WHERE status <> 'planned')::int ran, coalesce(sum(delivered), 0)::int del FROM v2_runs GROUP BY 1),
      p AS (SELECT user_email, coalesce(sum(amount_paise) FILTER (WHERE status = 'paid'), 0)::bigint paise FROM payments GROUP BY 1),
      e AS (SELECT user_email, count(*) FILTER (WHERE event = 'nav.page.view')::int views, count(DISTINCT session_id)::int sessions, max(created_at) last FROM product_events GROUP BY 1),
      o AS (SELECT DISTINCT user_email, true AS conn FROM v2_senders WHERE status = 'connected'
            UNION SELECT DISTINCT user_email, true FROM v2_voice_tests)
      SELECT u.email, u.created_at, u.credits, u.plan, to_jsonb(u)->'signup_source' AS signup_source, -- null until the column exists

             coalesce(t.turns, 0) turns, coalesce(t.days, 0) days, greatest(t.last, e.last) last,
             coalesce(r.ran, 0) ran, coalesce(r.del, 0) del, coalesce(p.paise, 0) paise,
             coalesce(e.views, 0) views, coalesce(e.sessions, 0) sessions, coalesce(o.conn, false) conn
      FROM user_profiles u LEFT JOIN t ON t.user_email = u.email LEFT JOIN r ON r.user_email = u.email
        LEFT JOIN p ON p.user_email = u.email LEFT JOIN e ON e.user_email = u.email LEFT JOIN (SELECT DISTINCT ON (user_email) * FROM o) o ON o.user_email = u.email
      WHERE ${NOT_STAFF("u.email")}`,
    sql`SELECT coalesce(props->>'section', 'other') section, count(*)::int views, count(DISTINCT user_email)::int users, count(DISTINCT session_id)::int sessions
        FROM product_events WHERE event = 'nav.page.view' AND created_at >= ${since} AND ${NOT_STAFF("user_email")} GROUP BY 1 ORDER BY 2 DESC`,
    sql`SELECT event, count(*)::int clicks, count(DISTINCT user_email)::int users, max(created_at) last
        FROM product_events WHERE source = 'client' AND event NOT LIKE 'nav.%' AND created_at >= ${since} AND ${NOT_STAFF("user_email")} GROUP BY 1 ORDER BY 3 DESC, 2 DESC LIMIT 30`,
    sql`SELECT turn_type, count(*)::int turns, count(DISTINCT user_email)::int users, count(*) FILTER (WHERE gap)::int gaps
        FROM v2_turn_log WHERE created_at >= ${since} AND ${NOT_STAFF("user_email")} GROUP BY 1 ORDER BY 2 DESC`,
    sql`SELECT lower(t->>'label') industry, count(*)::int asks, count(DISTINCT r.user_email)::int users,
               count(*) FILTER (WHERE r.status IN ('done', 'stopped'))::int ran,
               coalesce(sum(r.delivered) FILTER (WHERE r.status IN ('done', 'stopped')), 0)::int del,
               coalesce(sum(r.target) FILTER (WHERE r.status IN ('done', 'stopped')), 0)::int tgt
        FROM v2_runs r, jsonb_array_elements(coalesce(r.plan->'trades', '[]'::jsonb)) t
        WHERE r.created_at >= ${since} AND ${NOT_STAFF("r.user_email")} GROUP BY 1 ORDER BY 2 DESC LIMIT 40`,
    sql`SELECT m signal, count(*)::int asks, count(DISTINCT r.user_email)::int users,
               coalesce(sum(r.delivered) FILTER (WHERE r.status IN ('done', 'stopped')), 0)::int del,
               coalesce(sum(r.target) FILTER (WHERE r.status IN ('done', 'stopped')), 0)::int tgt
        FROM v2_runs r, jsonb_array_elements_text(coalesce(r.plan->'mustHave', '[]'::jsonb)) m
        WHERE r.created_at >= ${since} AND ${NOT_STAFF("r.user_email")} GROUP BY 1 ORDER BY 2 DESC`,
    sql`SELECT left(plan->>'cannotDo', 160) note, user_email, created_at FROM v2_runs
        WHERE created_at >= ${since} AND coalesce(plan->>'cannotDo', '') <> '' AND ${NOT_STAFF("user_email")} ORDER BY created_at DESC LIMIT 12`,
    sql`SELECT count(*)::int n FROM chats c WHERE c.updated_at >= ${since} AND ${NOT_STAFF("c.user_email")}`,
  ]);

  // Segment every user (first rule that matches wins).
  const now = nowMs();
  const segOf = (u: Row): { seg: Seg; why: string[] } => {
    const last = u.last ? new Date(u.last as Date).getTime() : 0;
    const created = new Date(u.created_at as Date).getTime();
    const why: string[] = [];
    if (n(u.paise) > 0) return { seg: "Paying", why: [`paid ₹${Math.round(n(u.paise) / 100)}`] };
    if (n(u.ran) >= 3 || n(u.del) >= 40) why.push(`${n(u.ran)} runs · ${n(u.del)} leads`);
    if (n(u.days) >= 3) why.push(`${n(u.days)} active days`);
    if (n(u.credits) < 100 && n(u.ran) > 0) why.push(`${n(u.credits)} credits left`);
    if (u.conn) why.push("email/voice connected");
    if (why.length >= 2) return { seg: "Upsell", why };
    if (n(u.ran) >= 1 && n(u.credits) < 60 && now - last < 14 * 864e5) return { seg: "Free perk", why: [`${n(u.credits)} credits, ran ${n(u.ran)}`] };
    if (n(u.turns) >= 3 && n(u.ran) === 0) return { seg: "Stuck", why: [`${n(u.turns)} chat turns, 0 runs`] };
    if (n(u.ran) >= 1 && last && now - last > 14 * 864e5) return { seg: "At risk", why: [`last seen ${fmtAgo(u.last as Date)}`] };
    if (now - created < 7 * 864e5) return { seg: "New", why: [] };
    return { seg: "Casual", why: [] };
  };
  const tagged = (users as Row[]).map((u) => ({ u, ...segOf(u) }));
  const segOfEmail = new Map(tagged.map((x) => [String(x.u.email), x.seg]));
  const segCounts = new Map<Seg, number>(); for (const x of tagged) segCounts.set(x.seg, (segCounts.get(x.seg) ?? 0) + 1);
  const segPick = (["Upsell", "Free perk", "Stuck", "At risk", "Paying", "New"] as Seg[]).includes(sp.seg as Seg) ? (sp.seg as Seg) : "Upsell";
  const segList = tagged.filter((x) => x.seg === segPick).sort((a, b) => n(b.u.del) - n(a.u.del) || n(b.u.turns) - n(a.u.turns)).slice(0, 30);

  // Acquisition: users who signed up in the window, by first-touch channel and landing page.
  const recent = tagged.filter((x) => now - new Date(x.u.created_at as Date).getTime() < days * 864e5);
  const acq = new Map<string, { signups: number; activated: number; paid: number; landings: Map<string, number> }>();
  for (const x of recent) {
    const src = x.u.signup_source as SignupSource | null;
    const ch = channelOf(src); const land = src ? landingOf(src.land) : "—";
    const a = acq.get(ch) ?? { signups: 0, activated: 0, paid: 0, landings: new Map() };
    a.signups++; if (n(x.u.ran) > 0) a.activated++; if (n(x.u.paise) > 0) a.paid++;
    a.landings.set(land, (a.landings.get(land) ?? 0) + 1); acq.set(ch, a);
  }
  const acqRows = [...acq.entries()].sort((a, b) => b[1].signups - a[1].signups);

  // Chats, paginated, with their latest run and feedback.
  const failedOnly = f === "failed" ? sql`AND lr.status IN ('done','stopped') AND lr.delivered < lr.target / 2` : f === "noplan" ? sql`AND lr.id IS NULL AND m.turns >= 2` : f === "neg" ? sql`AND m.neg > 0` : sql``;
  const chats = await sql`
    WITH m AS (SELECT chat_id, count(*) FILTER (WHERE role = 'user')::int turns, count(*) FILTER (WHERE feedback = 'down' OR feedback = '-1' OR feedback = 'negative')::int neg,
                      count(*) FILTER (WHERE feedback = 'up' OR feedback = '1' OR feedback = 'positive')::int pos, max(created_at) last,
                      (array_agg(left(content, 90) ORDER BY created_at) FILTER (WHERE role = 'user'))[1] first_msg
               FROM chat_messages GROUP BY 1),
    lr AS (SELECT DISTINCT ON (chat_id) chat_id, id, status, delivered, target FROM v2_runs ORDER BY chat_id, created_at DESC)
    SELECT c.id, c.title, c.user_email, m.turns, m.neg, m.pos, m.last, m.first_msg, lr.status, lr.delivered, lr.target
    FROM chats c JOIN m ON m.chat_id = c.id LEFT JOIN lr ON lr.chat_id = c.id
    WHERE m.last >= ${since} AND ${NOT_STAFF("c.user_email")} ${failedOnly}
    ORDER BY m.last DESC LIMIT ${PAGE} OFFSET ${(page - 1) * PAGE}`;

  const totalUsers = tagged.length;
  const qs = (o: Record<string, string | number>) => `/admin/analysis?${new URLSearchParams({ days: String(days), f, seg: segPick, page: String(page), ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) })}`;
  const tab = (label: string, href: string, on: boolean) => <Link key={label} href={href} className={`rounded px-2 py-1 text-[12px] ${on ? "bg-[var(--ink)] text-[var(--surface)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}>{label}</Link>;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

  return (
    <>
      <PageHeader pretitle="Analysis" title="Analysis" sub="Who to act on and how — segments, acquisition, what users ask for, and every chat."
        actions={<div className="flex gap-1">{[7, 14, 30, 90].map((d) => tab(`${d}d`, qs({ days: d, page: 1 }), d === days))}</div>} />

      <CardRow>
        {(["Upsell", "Free perk", "Stuck", "At risk"] as Seg[]).map((s) => (
          <StatCard key={s} label={s} value={<Link href={qs({ seg: s })} className="underline">{fmtN(segCounts.get(s) ?? 0)}</Link>} detail={SEG_ACTION[s]} />
        ))}
      </CardRow>

      <Table title={`Segment: ${segPick}`} note={`${SEG_ACTION[segPick]} · ${fmtN(segCounts.get(segPick) ?? 0)} of ${fmtN(totalUsers)} users. Paying ${fmtN(segCounts.get("Paying") ?? 0)} · New ${fmtN(segCounts.get("New") ?? 0)} · Casual ${fmtN(segCounts.get("Casual") ?? 0)}.`}
        actions={<div className="flex flex-wrap gap-1">{(["Upsell", "Free perk", "Stuck", "At risk", "Paying", "New"] as Seg[]).map((s) => tab(s, qs({ seg: s }), s === segPick))}</div>}
        head={["User", "Why", { label: "Runs", num: true }, { label: "Leads", num: true }, { label: "Turns", num: true }, { label: "Credits", num: true }, { label: "Sessions", num: true }, "Came from", "Last seen"]} empty="Nobody in this segment."
        rows={segList.map(({ u, why }) => [
          <Link key="u" href={`/admin/users/${encodeURIComponent(String(u.email))}`} className="underline">{String(u.email)}</Link>,
          why.join(" · ") || "—", fmtN(n(u.ran)), fmtN(n(u.del)), fmtN(n(u.turns)), fmtN(n(u.credits)), fmtN(n(u.sessions)),
          channelOf(u.signup_source as SignupSource | null), u.last ? fmtAgo(u.last as Date) : "—",
        ])} />

      <Table title={`Where signups came from · ${days}d`} note="First touch (utm / referrer / landing page). Accounts created before 2026-10-26 have no source recorded."
        head={["Channel", { label: "Signups", num: true }, { label: "Ran a search", num: true }, { label: "Paid", num: true }, "Landed on"]} empty="No signups in this window."
        rows={acqRows.map(([ch, a]) => [ch, fmtN(a.signups), `${fmtN(a.activated)} (${pct(a.activated, a.signups)})`, fmtN(a.paid),
          [...a.landings.entries()].sort((x, y) => y[1] - x[1]).map(([l, c]) => `${l} ${c}`).join(" · ")])} />

      <CardRow>
        <Table col="col-lg-6" title={`Dashboard opens by section · ${days}d`} note="Page views from the in-app beacon."
          head={["Section", { label: "Users", num: true }, { label: "Views", num: true }, { label: "Views / user", num: true }]} empty="No views yet."
          rows={(views as Row[]).map((v) => [String(v.section), fmtN(n(v.users)), fmtN(n(v.views)), (n(v.views) / Math.max(1, n(v.users))).toFixed(1)])} />
        <Table col="col-lg-6" title={`Buttons pressed · ${days}d`} note="Clicks, by how many users pressed each."
          head={["Button / link", { label: "Users", num: true }, { label: "Clicks", num: true }, "Last"]} empty="No clicks yet."
          rows={(buttons as Row[]).map((b) => [<code key="e" className="text-[11.5px]">{String(b.event)}</code>, fmtN(n(b.users)), fmtN(n(b.clicks)), fmtAgo(b.last as Date)])} />
      </CardRow>

      <CardRow>
        <Table col="col-lg-6" title={`What users ask (intent) · ${days}d`} note="Router type of every chat turn; gaps = asks we could not serve."
          head={["Intent", { label: "Turns", num: true }, { label: "Users", num: true }, { label: "Gaps", num: true }]} empty="No turns."
          rows={(intents as Row[]).map((i) => [String(i.turn_type), fmtN(n(i.turns)), fmtN(n(i.users)), fmtN(n(i.gaps))])} />
        <Table col="col-lg-6" title={`Signals users ask for · ${days}d`} note="Requirements stated in the ask (no website, no booking, hiring…), and how often we delivered."
          head={["Signal", { label: "Asks", num: true }, { label: "Users", num: true }, "Delivered"]} empty="No signal asks."
          rows={(signals as Row[]).map((s) => [SIGNALS[String(s.signal) as SignalId]?.label ?? String(s.signal), fmtN(n(s.asks)), fmtN(n(s.users)), `${fmtN(n(s.del))}/${fmtN(n(s.tgt))} (${pct(n(s.del), n(s.tgt))})`])} />
      </CardRow>

      <CardRow>
        <Table col="col-lg-7" title={`Enquiries by industry · ${days}d`} note="Business types users asked leads for (one run can name several)."
          head={["Industry", { label: "Asks", num: true }, { label: "Users", num: true }, { label: "Ran", num: true }, "Delivered"]} empty="No enquiries."
          rows={(industries as Row[]).map((i) => [String(i.industry), fmtN(n(i.asks)), fmtN(n(i.users)), fmtN(n(i.ran)), `${fmtN(n(i.del))}/${fmtN(n(i.tgt))} (${pct(n(i.del), n(i.tgt))})`])} />
        <Table col="col-lg-5" title="Asked for, couldn't do" note="The planner's 'not yet' notes — the product gaps users hit."
          head={["Note", "User", "When"]} empty="Nothing flagged."
          rows={(cannot as Row[]).map((c) => [String(c.note), String(c.user_email).replace(/@.*/, "@…"), fmtAgo(c.created_at as Date)])} />
      </CardRow>

      <Table title={`Chats · ${days}d`} note={`${fmtN(n((chatsCount as Row[])[0]?.n))} chats active in the window. Open one to read it with the agent's steps and the run.`}
        actions={<div className="flex flex-wrap gap-1">{[["all", "All"], ["failed", "Delivered < 50%"], ["noplan", "No plan"], ["neg", "Thumbs down"]].map(([k, l]) => tab(l, qs({ f: k, page: 1 }), f === k))}</div>}
        head={["Chat", "User", "Tag", { label: "Turns", num: true }, "Run", "Feedback", "Last"]} empty="No chats match."
        rows={(chats as Row[]).map((c) => {
          const seg = segOfEmail.get(String(c.user_email)) ?? "Casual";
          return [
            <Link key="c" href={`/admin/analysis/chats/${c.id}`} className="underline">{String(c.title ?? c.first_msg ?? "Untitled").slice(0, 70)}</Link>,
            <Link key="u" href={`/admin/users/${encodeURIComponent(String(c.user_email))}`} className="underline">{String(c.user_email)}</Link>, <Pill key="t" tone={SEG_TONE[seg]}>{seg}</Pill>, fmtN(n(c.turns)),
            c.status ? `${c.status} ${n(c.delivered)}/${n(c.target)}` : "no plan",
            `${n(c.pos) ? `👍${n(c.pos)} ` : ""}${n(c.neg) ? `👎${n(c.neg)}` : ""}` || "—", fmtAgo(c.last as Date),
          ];
        })} />
      <div className="mt-2 flex gap-2 text-[12px]">
        {page > 1 && <Link className="underline" href={qs({ page: page - 1 })}>← Newer</Link>}
        {(chats as Row[]).length === PAGE && <Link className="underline" href={qs({ page: page + 1 })}>Older →</Link>}
        <span className="text-[var(--ink-muted)]">Page {page}</span>
      </div>
    </>
  );
}
