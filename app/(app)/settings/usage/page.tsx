import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { ALLOWANCE, CREDIT_COST, packById } from "@/lib/credits/pricing";
import { allowanceFor } from "@/lib/credits/server";

export const metadata = { title: "Usage" };

/**
 * Where every credit went. Reads credit_ledger directly rather than deriving totals from the
 * balance, so what's shown here is the same audit trail a billing dispute would be settled from.
 *
 * The ledger is one row per lead / message / Google call, which read as "Lead added −5" two hundred
 * times. Rows are grouped into the thing the person actually did — one search run, a day's paid
 * chat messages in one chat, one live area search, one purchase — and each says which chat it came
 * from, how many leads it added and what those leads came with. Grouping is derived from existing
 * refs (no extra columns), so it covers history too:
 *   lead_unlock   ref v2run:<run>:<result>, or v2:<email>:<domain> → matched to the run that found it;
 *                 lead_id only (the old map flow) → grouped per day
 *   chat_turn     ref chat_msg:<message> → its chat
 *   billed_places_call  ref = area_scans.id
 *   voice_minute  ref voicecall:<session> → v2_sends.external_id → campaign
 *   purchase      ref = payments.order_id
 */

const PER_PAGE = 20;

const REASON_LABEL: Record<string, string> = {
  purchase: "Credits purchased",
  lead_unlock: "Lead added",
  billed_places_call: "New-area search",
  chat_turn: "Chat message",
  website_check: "Website health check",
  deep_enrich: "Deep enrichment",
  verified_email: "Verified email",
  verified_phone: "Verified phone",
  find_founder: "Founder lookup",
  pitch_script: "Pitch script",
};

export default async function UsagePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await auth();
  const userEmail = session!.user!.email!;
  const page = Math.max(0, (parseInt((await searchParams).page ?? "1", 10) || 1) - 1);

  const [profile] = await sql`SELECT plan, credits FROM user_profiles WHERE email = ${userEmail}`;
  const allowance = await allowanceFor(userEmail, profile?.plan ?? "free");

  const rows = await sql`
    WITH mine AS MATERIALIZED (
      -- This user's results, once: v2:<email>:<domain> refs are matched against this set by hash
      -- join (a per-row lookup into v2_results took ~30s).
      SELECT r.id AS result_id, r.run_id, r.domain, lower(r.name) AS lname, u.created_at
      FROM v2_runs u JOIN v2_results r ON r.run_id = u.id WHERE u.user_email = ${userEmail}
    ), v2refs AS (
      SELECT id, created_at, regexp_replace(ref, '^v2:[^:]*:', '') AS d
      FROM credit_ledger WHERE user_email = ${userEmail} AND reason = 'lead_unlock' AND ref LIKE 'v2:%'
    ), v2map AS (
      -- Two equality joins (domain, then name) hash-join; one OR-join or a per-row subquery did not.
      SELECT DISTINCT ON (id) id, run_id, result_id FROM (
        SELECT v.id, m.run_id, m.result_id, m.created_at FROM v2refs v JOIN mine m ON m.domain = v.d AND m.created_at <= v.created_at + interval '1 minute'
        UNION ALL
        SELECT v.id, m.run_id, m.result_id, m.created_at FROM v2refs v JOIN mine m ON m.lname = v.d AND m.created_at <= v.created_at + interval '1 minute'
      ) x ORDER BY id, created_at DESC
    ), l AS MATERIALIZED (
      SELECT l.*,
        CASE
          WHEN l.reason = 'lead_unlock' AND l.ref ~ '^v2run:[0-9a-f-]{36}:' THEN split_part(l.ref, ':', 2)::uuid
          ELSE vm.run_id
        END AS run_id,
        -- The exact result each charge paid for, so "enriched" counts only the leads in this row.
        CASE
          WHEN l.reason = 'lead_unlock' AND l.ref ~ '^v2run:[0-9a-f-]{36}:[0-9]+$' THEN split_part(l.ref, ':', 3)::bigint
          ELSE vm.result_id
        END AS result_id,
        CASE WHEN l.reason = 'chat_turn' AND l.ref ~ '^chat_msg:[0-9a-f-]{36}$'
          THEN (SELECT m.chat_id FROM chat_messages m WHERE m.id = split_part(l.ref, ':', 2)::uuid) END AS turn_chat_id,
        CASE WHEN l.reason = 'voice_minute' THEN (SELECT s.campaign_id FROM v2_sends s WHERE s.external_id = split_part(l.ref, ':', 2) LIMIT 1) END AS campaign_id
      FROM credit_ledger l LEFT JOIN v2map vm ON vm.id = l.id WHERE l.user_email = ${userEmail}
    ), g AS (
      SELECT
        CASE WHEN run_id IS NOT NULL THEN 'run' WHEN reason = 'lead_unlock' THEN 'map_leads'
             WHEN reason = 'chat_turn' THEN 'chat' WHEN reason = 'voice_minute' THEN 'call' ELSE reason END AS kind,
        CASE WHEN run_id IS NOT NULL THEN run_id::text
             WHEN reason = 'lead_unlock' THEN 'map:' || (created_at AT TIME ZONE 'Asia/Kolkata')::date
             WHEN reason = 'chat_turn' THEN coalesce(turn_chat_id::text, '?') || ':' || (created_at AT TIME ZONE 'Asia/Kolkata')::date
             WHEN reason = 'voice_minute' THEN coalesce(campaign_id::text, '?') || ':' || (created_at AT TIME ZONE 'Asia/Kolkata')::date
             ELSE id::text END AS gkey,
        min(reason) AS reason, max(created_at) AS at, sum(amount)::int AS credits, count(*)::int AS n,
        (array_agg(run_id))[1] AS run_id, (array_agg(turn_chat_id))[1] AS turn_chat_id, (array_agg(campaign_id))[1] AS campaign_id,
        (array_agg(ref))[1] AS ref, array_agg(lead_id) FILTER (WHERE lead_id IS NOT NULL) AS lead_ids,
        array_agg(result_id) FILTER (WHERE result_id IS NOT NULL) AS result_ids
      FROM l GROUP BY 1, 2
    )
    SELECT g.kind, g.reason, g.at, g.credits, g.n,
      coalesce(u.chat_id, g.turn_chat_id) AS chat_id,
      (SELECT left(m.content, 120) FROM chat_messages m WHERE m.chat_id = coalesce(u.chat_id, g.turn_chat_id) AND m.role = 'user' ORDER BY m.created_at LIMIT 1) AS chat_first,
      coalesce(c1.title, c2.title) AS chat_title,
      u.plan->>'title' AS run_title,
      cp.name AS campaign_name, g.campaign_id,
      a.area_label, a.category,
      p.pack_id, p.amount_paise, p.order_id, p.status AS pay_status,
      rs.emails, rs.phones, rs.people,
      ml.emails AS map_emails, ml.phones AS map_phones,
      count(*) OVER ()::int AS total
    FROM g
    LEFT JOIN v2_runs u ON u.id = g.run_id
    LEFT JOIN chats c1 ON c1.id = u.chat_id
    LEFT JOIN chats c2 ON c2.id = g.turn_chat_id
    LEFT JOIN v2_campaigns cp ON cp.id = g.campaign_id
    LEFT JOIN area_scans a ON g.reason = 'billed_places_call' AND a.id = CASE WHEN g.ref ~ '^[0-9a-f-]{36}$' THEN g.ref::uuid END
    LEFT JOIN payments p ON g.reason IN ('purchase', 'topup') AND p.order_id = g.ref
    LEFT JOIN LATERAL (
      SELECT count(*) FILTER (WHERE jsonb_array_length(r.emails) > 0)::int AS emails,
             count(*) FILTER (WHERE r.phone IS NOT NULL)::int AS phones,
             count(*) FILTER (WHERE r.contact IS NOT NULL AND r.contact ? 'name')::int AS people
      FROM v2_results r WHERE r.id = ANY(g.result_ids)) rs ON g.kind = 'run'
    LEFT JOIN LATERAL (
      SELECT count(*) FILTER (WHERE le.email IS NOT NULL)::int AS emails, count(*) FILTER (WHERE le.phone IS NOT NULL)::int AS phones
      FROM leads le WHERE le.id = ANY(g.lead_ids)) ml ON g.kind = 'map_leads'
    ORDER BY g.at DESC
    LIMIT ${PER_PAGE} OFFSET ${page * PER_PAGE}
  `;
  const total: number = rows[0]?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  const spentThisMonth = await sql`
    SELECT COALESCE(SUM(-amount), 0)::int AS total
    FROM credit_ledger
    WHERE user_email = ${userEmail} AND amount < 0 AND created_at >= date_trunc('month', now())
  `;

  return (
    <div style={{ padding: "64px 32px 120px", maxWidth: 1080, margin: "0 auto" }}>
      <h1 className="set-title" style={{ marginBottom: 6 }}>Usage</h1>
      <p style={{ fontSize: 14, color: "var(--g-gray-500)", margin: "0 0 28px" }}>
        Credit ledger · newest first · grouped by activity
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1, background: "var(--g-border)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 30 }}>
        <Stat value={(profile?.credits ?? 0).toLocaleString("en-IN")} label="Credits available" />
        <Stat value={(spentThisMonth[0]?.total ?? 0).toLocaleString("en-IN")} label="Spent this month" />
        <Stat value={`${allowance.dayRemaining} / ${ALLOWANCE.billedCallsPerDay}`} label="Free searches · today" />
        <Stat value={String(allowance.monthRemaining)} label="Free searches · month" />
      </div>

      {total === 0 ? (
        <div className="sunk" style={{ border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: 0 }}>
            No usage yet · charged on new leads and live searches
          </p>
        </div>
      ) : (
        <>
          <div className="use-wrap">
            <table className="use-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Chat / campaign</th>
                  <th className="num">Leads</th>
                  <th>Enriched data</th>
                  <th className="num">Credits</th>
                  <th className="num">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => <UsageRow key={i} r={r} />)}
              </tbody>
            </table>
          </div>
          <div className="use-foot">
            <span>Showing {page * PER_PAGE + 1}–{Math.min(total, page * PER_PAGE + PER_PAGE)} of {total} activities</span>
            {pages > 1 && (
              <span className="v2-pager">
                <PageLink to={page - 1} disabled={page === 0} label="Previous page"><ChevronLeft size={15} /></PageLink>
                {pageWindow(page, pages).map((p, i) => p === "gap"
                  ? <span key={`g${i}`} className="v2-pager-gap">…</span>
                  : <PageLink key={p} to={p} on={p === page} label={`Page ${p + 1}`}>{p + 1}</PageLink>)}
                <PageLink to={page + 1} disabled={page >= pages - 1} label="Next page"><ChevronRight size={15} /></PageLink>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;
const titleCase = (s: string) => s.replace(/^\w/, (c) => c.toUpperCase());

function UsageRow({ r }: { r: Row }) {
  const credit = r.credits > 0;
  let activity: string, sub: string | null = null, leads: number | null = null, enriched: string[] = [];
  let ctx: { label: string; href?: string } | null = null;
  const chatCtx = r.chat_id ? { label: (r.chat_first || r.chat_title || "Untitled chat").trim(), href: `/chat/${r.chat_id}` } : null;

  switch (r.kind) {
    case "run":
      activity = "Leads added";
      sub = r.run_title ?? r.chat_title ?? null;
      leads = r.n;
      ctx = chatCtx;
      enriched = [
        r.emails ? plural(r.emails, "email") : "",
        r.phones ? plural(r.phones, "phone") : "",
        r.people ? plural(r.people, "decision-maker") : "",
      ].filter(Boolean);
      break;
    case "map_leads":
      activity = "Leads added from the map";
      leads = r.n;
      enriched = [r.map_emails ? plural(r.map_emails, "email") : "", r.map_phones ? plural(r.map_phones, "phone") : ""].filter(Boolean);
      break;
    case "chat":
      activity = "Chat messages";
      sub = `${plural(r.n, "message")} · past free daily allowance`;
      ctx = chatCtx;
      break;
    case "billed_places_call":
      activity = "Live area search";
      sub = [r.category ? titleCase(r.category) : null, r.area_label].filter(Boolean).join(" · ") || null;
      enriched = [`${plural(Math.round(-r.credits / CREDIT_COST.billed_places_call) || r.n, "Google lookup")}`];
      break;
    case "call":
      activity = "AI voice call";
      sub = plural(r.n, "call");
      ctx = r.campaign_id ? { label: r.campaign_name ?? "Campaign", href: `/campaigns/${r.campaign_id}` } : null;
      break;
    case "topup":
      activity = "Funds added";
      sub = r.amount_paise ? `₹${(r.amount_paise / 100).toLocaleString("en-IN")}` : null;
      ctx = r.order_id && r.pay_status === "paid" ? { label: "Invoice", href: `/settings/billing/invoice/${r.order_id}` } : null;
      break;
    case "purchase":
      activity = "Plan purchased";
      sub = [r.pack_id ? `${packById(String(r.pack_id))?.label ?? titleCase(String(r.pack_id))} plan` : null, r.amount_paise ? `₹${(r.amount_paise / 100).toLocaleString("en-IN")}` : null].filter(Boolean).join(" · ") || null;
      ctx = r.order_id && r.pay_status === "paid" ? { label: "Invoice", href: `/settings/billing/invoice/${r.order_id}` } : null;
      break;
    case "admin_grant":
      activity = "Credits granted by Mantis";
      break;
    default:
      activity = REASON_LABEL[r.reason] ?? titleCase(String(r.reason).replace(/_/g, " "));
      if (r.n > 1) sub = plural(r.n, "charge");
  }

  return (
    <tr>
      <td>
        <div className="use-act">{activity}</div>
        {sub && <div className="use-sub">{sub}</div>}
      </td>
      <td className="use-ctx">
        {ctx ? (ctx.href ? <Link href={ctx.href} title={ctx.label}>{ctx.label}</Link> : <span title={ctx.label}>{ctx.label}</span>) : <span className="use-none">—</span>}
      </td>
      <td className="num">
        {leads != null
          ? (r.chat_id ? <Link href={`/my-leads?list=${r.chat_id}`} title="Open this list">{leads}</Link> : leads)
          : <span className="use-none">—</span>}
      </td>
      <td>{enriched.length ? <span className="use-enr">{enriched.join(" · ")}</span> : <span className="use-none">—</span>}</td>
      <td className={`num use-cr${credit ? " plus" : ""}`}>{credit ? "+" : "−"}{Math.abs(r.credits).toLocaleString("en-IN")}</td>
      <td className="num use-date">
        {new Date(r.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}
      </td>
    </tr>
  );
}

function PageLink({ to, on, disabled, label, children }: { to: number; on?: boolean; disabled?: boolean; label: string; children: React.ReactNode }) {
  if (disabled) return <button type="button" disabled aria-label={label}>{children}</button>;
  return <Link href={`/settings/usage?page=${to + 1}`} className={on ? "on" : ""} aria-label={label} aria-current={on ? "page" : undefined}>{children}</Link>;
}

/** 1 … 4 5 6 … 12 — same shape as the Leads pager. */
function pageWindow(cur: number, pages: number): Array<number | "gap"> {
  const keep = new Set([0, pages - 1, cur - 1, cur, cur + 1].filter((p) => p >= 0 && p < pages));
  const out: Array<number | "gap"> = [];
  [...keep].sort((a, b) => a - b).forEach((p, i, arr) => { if (i && p - arr[i - 1] > 1) out.push("gap"); out.push(p); });
  return out;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ background: "var(--g-white)", padding: "20px 18px" }}>
      <div style={{ fontSize: 21, fontWeight: 600, color: "var(--g-ink)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--g-gray-500)", marginTop: 3 }}>{label}</div>
    </div>
  );
}
