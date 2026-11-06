import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { SIGNALS } from "@/lib/v2/playbooks";
import { PageHeader, StatCard, CardRow, Table, Pill, fmtAgo, fmtDT, fmtINR, fmtN } from "../../ui";

/** Ek user ki poori story — kaun hai (phone, onboarding, website, business profiles), kya dhoondh
 * raha hai (runs, signals, trades, areas), kitna use karta hai, paisa, credits ka ledger, errors.
 * Support question ("mere credits kahan gaye?") aur sales question ("ye kya bechta hai, kise?")
 * dono ka jawab isi ek screen se milna chahiye. */

export const dynamic = "force-dynamic";

const signalLabel = (id: string) => (SIGNALS as Record<string, { label: string }>)[id]?.label ?? id;

/** user_profiles.phone is E.164 without the plus ("919999999999"). */
function fmtPhone(p: string | null | undefined): string | null {
  if (!p) return null;
  const d = String(p).replace(/\D/g, "");
  return d.startsWith("91") && d.length === 12 ? `+91 ${d.slice(2, 7)} ${d.slice(7)}` : `+${d}`;
}

/** jsonb arrays here hold either strings or {label|name} objects. */
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : String((x as { label?: string; name?: string })?.label ?? (x as { name?: string })?.name ?? ""))).filter(Boolean) : [];

/** A labelled fact list for the "who is this" cards. */
function Facts({ title, rows }: { title: string; rows: Array<[string, React.ReactNode]> }) {
  return (
    <div className="flex-1 min-w-[300px] rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)]">
      <div className="rule-b px-4 py-3"><h3 className="m-0 text-[13px] font-semibold text-[var(--ink)]">{title}</h3></div>
      <dl className="m-0 grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 px-4 py-3 text-[12.5px]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-[var(--ink-faint)]">{k}</dt>
            <dd className="m-0 min-w-0 break-words text-[var(--ink)]">{v ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default async function UserDetailPage({ params }: { params: Promise<{ email: string }> }) {
  const email = decodeURIComponent((await params).email);

  const [[u], [agency], [freelancer], profiles, ledger, [spend], spendBy, payments, scans, [chat], errors, emails] = await Promise.all([
    sql`SELECT * FROM user_profiles WHERE email = ${email}`,
    sql`SELECT * FROM agency_profiles WHERE email = ${email}`,
    sql`SELECT * FROM freelancer_profiles WHERE email = ${email}`,
    sql`SELECT * FROM v2_business_profiles WHERE user_email = ${email} ORDER BY is_default DESC, last_used_at DESC NULLS LAST, created_at DESC`,
    sql`SELECT reason, amount, ref, lead_id, created_at FROM credit_ledger WHERE user_email = ${email} ORDER BY created_at DESC LIMIT 50`,
    sql`SELECT coalesce(sum(-amount) FILTER (WHERE amount < 0), 0)::int AS spent, coalesce(sum(amount) FILTER (WHERE amount > 0), 0)::int AS added
          FROM credit_ledger WHERE user_email = ${email}`,
    sql`SELECT reason, sum(-amount)::int AS n, count(*)::int AS times FROM credit_ledger
         WHERE user_email = ${email} AND amount < 0 GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
    sql`SELECT provider, order_id, pack_id, credits, amount_paise, status, created_at, paid_at FROM payments WHERE user_email = ${email} ORDER BY created_at DESC LIMIT 20`,
    sql`SELECT area_label, category, status, billed_places_calls, created_at FROM area_scans WHERE requested_by = ${email} ORDER BY created_at DESC LIMIT 20`,
    sql`SELECT count(DISTINCT c.id)::int AS chats, count(m.id)::int AS msgs,
               count(m.id) FILTER (WHERE m.feedback = 'down')::int AS downs
        FROM chats c LEFT JOIN chat_messages m ON m.chat_id = c.id WHERE c.user_email = ${email}`,
    sql`SELECT route, message, created_at FROM app_errors WHERE user_email = ${email} ORDER BY created_at DESC LIMIT 20`,
    sql`SELECT campaign_id, step_key, stream, sent_at FROM email_sends WHERE recipient = ${email} ORDER BY sent_at DESC LIMIT 20`,
  ]);
  if (!u) notFound();

  // Usage + lead finding. Signals / trades / areas come from what the Planner compiled for each
  // run — what the user actually asked for, not what we guessed from their profile.
  const mustHave = sql`CASE WHEN jsonb_typeof(r.plan->'mustHave') = 'array' THEN r.plan->'mustHave' ELSE '[]'::jsonb END`;
  const [[use], [runs], finds, [camp], senders, [voice], signals, trades, areas, recentRuns] = await Promise.all([
    sql`SELECT count(DISTINCT (created_at AT TIME ZONE 'Asia/Kolkata')::date)::int AS days, count(DISTINCT session_id)::int AS sessions,
               count(*) FILTER (WHERE event = 'nav.page.view')::int AS views
          FROM product_events WHERE user_email = ${email}`,
    sql`SELECT count(*)::int AS planned, count(*) FILTER (WHERE status <> 'planned')::int AS ran,
               count(*) FILTER (WHERE status = 'done')::int AS done
          FROM v2_runs WHERE user_email = ${email}`,
    sql`SELECT via, count(*)::int AS n, max(found_at) AS last_at FROM lead_finds WHERE user_email = ${email} GROUP BY 1`,
    sql`SELECT count(*)::int AS made, count(*) FILTER (WHERE test_sent_at IS NOT NULL)::int AS tested,
               count(*) FILTER (WHERE approved_at IS NOT NULL)::int AS launched
          FROM v2_campaigns WHERE user_email = ${email}`,
    sql`SELECT channel, provider, address, status FROM v2_senders WHERE user_email = ${email} ORDER BY created_at`,
    sql`SELECT count(*)::int AS n FROM v2_voice_tests WHERE user_email = ${email}`,
    sql`SELECT s AS id, count(*)::int AS runs, coalesce(sum(r.delivered), 0)::int AS delivered, max(r.created_at) AS last_at
          FROM v2_runs r, jsonb_array_elements_text(${mustHave}) s
         WHERE r.user_email = ${email} GROUP BY 1 ORDER BY 2 DESC, 3 DESC`,
    sql`SELECT t->>'label' AS label, count(*)::int AS runs
          FROM v2_runs r, jsonb_array_elements(CASE WHEN jsonb_typeof(r.plan->'trades') = 'array' THEN r.plan->'trades' ELSE '[]'::jsonb END) t
         WHERE r.user_email = ${email} AND t->>'label' IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
    sql`SELECT coalesce(nullif(r.plan->>'areaText', ''), r.area_text) AS area, count(*)::int AS runs
          FROM v2_runs r WHERE r.user_email = ${email} AND coalesce(nullif(r.plan->>'areaText', ''), r.area_text) IS NOT NULL
         GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
    sql`SELECT r.chat_id, r.created_at, r.status, r.target, r.delivered, r.est_credits, r.plan->>'title' AS title,
               r.plan->>'service' AS service, ${mustHave} AS must
          FROM v2_runs r WHERE r.user_email = ${email} ORDER BY r.created_at DESC LIMIT 25`,
  ]);
  const activity = await sql`SELECT event, section, source, path, props, created_at FROM product_events WHERE user_email = ${email} ORDER BY created_at DESC LIMIT 80`;
  const activityTotals = await sql`SELECT section, count(*)::int AS n, count(*) FILTER (WHERE source = 'server')::int AS actions FROM product_events WHERE user_email = ${email} GROUP BY 1 ORDER BY 2 DESC`;

  const paidTotal = payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount_paise), 0);
  const leadsV2 = finds.find((f) => f.via === "v2")?.n ?? 0;
  const unlocksV1 = finds.find((f) => f.via === "v1")?.n ?? 0;
  const lastFind = finds.map((f) => new Date(f.last_at as Date)).sort((a, b) => +b - +a)[0] ?? null;
  const digits = u.phone ? String(u.phone).replace(/\D/g, "") : "";
  const phone = fmtPhone(u.phone);
  const onb = agency ?? freelancer ?? null;
  const website = (onb?.website as string | null) || (profiles.find((p) => p.website)?.website as string | null) || null;
  const src = (u.signup_source ?? null) as Record<string, unknown> | null;
  const href = (w: string) => (/^https?:\/\//.test(w) ? w : `https://${w}`);
  const facts = (pairs: Array<[string, unknown]>): Array<[string, React.ReactNode]> =>
    pairs.map(([k, v]) => [k, v == null || v === "" ? "—" : (v as React.ReactNode)]);

  return (
    <div className="">
      <div className="mx-auto w-full max-w-[1400px]">
        <PageHeader pretitle="Users" title={u.name ? String(u.name) : email}
          sub={`${u.name ? `${email} · ` : ""}${phone ?? "no phone"} · joined ${fmtDT(u.created_at)} · last seen ${fmtAgo(u.last_seen_at)}`}
          actions={<Link href="/admin/users" className="text-[12px] text-[var(--ink-faint)] no-underline">← All users</Link>} />

        <div className="flex flex-wrap gap-3 mb-3">
          <Facts title="Contact & account" rows={facts([
            ["Email", <span key="e">{email} {u.email_verified ? <Pill tone="ok">verified</Pill> : <Pill tone="mut">unverified</Pill>}</span>],
            ["Phone", phone && <span key="p">
              <a href={`tel:+${digits}`}>{phone}</a>{" "}
              {u.phone_verified ? <Pill tone="ok">verified</Pill> : <Pill tone="mut">unverified</Pill>}{" "}
              <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="text-[11.5px]">WhatsApp ↗</a>
            </span>],
            ["Sign-in", u.password_hash ? "email + password" : u.is_synthetic_email ? "phone only" : "Google"],
            ["Plan", <span key="pl">{u.plan} {u.plan_source === "granted" && <Pill tone="info">granted</Pill>} {u.plan_expires_at ? `· till ${fmtDT(u.plan_expires_at)}` : ""}</span>],
            ["Mode", u.dashboard_mode],
            ["Country", u.country],
            ["Signup source", src && <code key="s" className="text-[11px]">{Object.entries(src).filter(([, v]) => v != null && v !== "").map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(" · ").slice(0, 240)}</code>],
          ])} />
          <Facts title="Onboarding" rows={facts([
            ["Completed", u.onboarding_completed ? <Pill key="c" tone="ok">yes</Pill> : <Pill key="c" tone="bad">no</Pill>],
            ["Works as", u.business_type === "agency" ? "Company" : u.business_type === "freelancer" ? "Independent" : u.business_type],
            ["Name", u.name],
            [agency ? "Company" : "Business name", agency?.agency_name ?? freelancer?.business_name],
            ["Website", website && <a key="w" href={href(website)} target="_blank" rel="noreferrer">{website} ↗</a>],
            ["Role", u.role === "other" ? u.custom_role ?? "other" : u.role],
            ...(agency ? [["Designation", agency.designation], ["Team size", agency.team_size]] as Array<[string, unknown]> : []),
            ...(freelancer ? [["Primary service", freelancer.custom_service ?? freelancer.primary_service], ["Active clients", freelancer.active_clients]] as Array<[string, unknown]> : []),
            ["Work email", onb?.work_email],
          ])} />
        </div>

        <CardRow>
          <StatCard label="Active days" value={fmtN(use.days)} detail={`${fmtN(use.sessions)} sessions · ${fmtN(use.views)} page views`} />
          <StatCard label="Chats" value={`${fmtN(chat.chats)} / ${fmtN(chat.msgs)} msgs`} detail={chat.downs > 0 ? `${chat.downs} dislikes` : undefined} tone={chat.downs > 0 ? "bad" : undefined} />
          <StatCard label="Lead runs" value={`${fmtN(runs.ran)} ran`} detail={`${fmtN(runs.planned)} planned · ${fmtN(runs.done)} finished`} />
          <StatCard label="Leads found" value={fmtN(leadsV2 + unlocksV1)} detail={`${fmtN(leadsV2)} via runs · ${fmtN(unlocksV1)} map unlocks · last ${fmtAgo(lastFind)}`} tone={leadsV2 + unlocksV1 > 0 ? "up" : undefined} />
          <StatCard label="Top signal" value={signals[0] ? signalLabel(String(signals[0].id)) : "—"} detail={signals[0] ? `${signals[0].runs} of ${fmtN(runs.planned)} runs` : "never asked for a signal"} />
          <StatCard label="Outreach" value={`${fmtN(camp.made)} campaigns`} detail={`${camp.tested} tested · ${camp.launched} launched · ${voice.n} test calls · ${senders.filter((s) => s.status === "connected").length} senders`} tone={camp.launched > 0 ? "up" : undefined} />
          <StatCard label="Credits" value={fmtN(u.credits)} detail={`spent ${fmtN(spend.spent)} · added ${fmtN(spend.added)}`} />
          <StatCard label="Paid" value={paidTotal > 0 ? fmtINR(paidTotal) : "—"} detail={paidTotal > 0 ? undefined : "kabhi pay nahi kiya"} tone={paidTotal > 0 ? "up" : undefined} />
        </CardRow>

        <div className="flex flex-wrap gap-3 mb-3">
          <Table col="col-lg-4" title="Signals they use" note={`Har run ka mustHave — jo user ne khud maanga.${signals.length > 12 ? ` Top 12 of ${signals.length}.` : ""}`}
            head={["Signal", { label: "Runs", num: true }, { label: "Leads", num: true }, "Last"]}
            rows={signals.slice(0, 12).map((s) => [<span key="s">{signalLabel(String(s.id))} <code className="text-[10.5px] text-[var(--ink-faint)]">{String(s.id)}</code></span>, fmtN(s.runs), fmtN(s.delivered), fmtAgo(s.last_at)])}
            empty="koi signal nahi maanga — sirf trade/area searches" />
          <Table col="col-lg-4" title="Trades searched" head={["Trade", { label: "Runs", num: true }]}
            rows={trades.map((t) => [String(t.label), fmtN(t.runs)])} empty="koi run nahi" />
          <Table col="col-lg-4" title="Areas searched" head={["Area", { label: "Runs", num: true }]}
            rows={areas.map((a) => [String(a.area), fmtN(a.runs)])} empty="koi run nahi" />
        </div>

        <div className="flex flex-wrap gap-3 mb-3">
          <Table col="col-12" title={`Business profiles (${profiles.length})`} note={`What they sell, to whom, where — Mantis Scout writes these from their website or chat.${profiles.length > 8 ? ` Showing the 8 most recently used.` : ""}`}
            head={["Name", "Website", "Sells", "Targets", "Areas", "Sells to", "Source", "Last used"]}
            rows={profiles.slice(0, 8).map((p) => [
              <span key="n">{p.name} {p.is_default && <Pill tone="ok">default</Pill>}</span>,
              p.website ? <a key="w" href={href(String(p.website))} target="_blank" rel="noreferrer">{String(p.website).replace(/^https?:\/\/(www\.)?/, "")}</a> : "—",
              <span key="s" className="wrap">{[p.primary_service, ...list(p.services).filter((s) => s !== p.primary_service)].filter(Boolean).slice(0, 5).join(", ") || "—"}</span>,
              <span key="t" className="wrap">{list(p.target_trades).slice(0, 6).join(", ") || "—"}</span>,
              <span key="a" className="wrap">{list(p.target_areas).slice(0, 4).join(", ") || "—"}</span>,
              p.sells_to ?? "—", p.source, fmtAgo(p.last_used_at),
            ])}
            empty="koi business profile nahi bana" />
        </div>

        <div className="flex flex-wrap gap-3 mb-3">
          <Table col="col-12" title="Recent lead runs"
            head={["When", "Search", "Signals", "Service", "Status", { label: "Leads", num: true }, { label: "Est cr", num: true }, ""]}
            rows={recentRuns.map((r) => [
              fmtDT(r.created_at), <span key="t" className="wrap">{r.title ?? "—"}</span>,
              <span key="m" className="wrap">{list(r.must).map(signalLabel).join(", ") || "—"}</span>,
              r.service ?? "—",
              <Pill key="st" tone={r.status === "done" ? "ok" : r.status === "failed" ? "bad" : r.status === "planned" ? "mut" : "warn"}>{r.status}</Pill>,
              `${fmtN(r.delivered)}/${fmtN(r.target)}`, fmtN(r.est_credits),
              r.chat_id ? <Link key="c" href={`/admin/analysis/chats/${r.chat_id}`} className="text-[11.5px]">chat →</Link> : "",
            ])}
            empty="koi run nahi" />
        </div>

        <div className="flex flex-wrap gap-3 mb-3">
          <Table col="col-lg-6" title="Credit ledger" note="Negative = spend, positive = purchase grant. Idempotency ref ke saath."
            head={["When", "Reason", { label: "Δ", num: true }, "Ref"]}
            rows={ledger.map((l) => [
              fmtDT(l.created_at), l.reason,
              <span key="a" className={l.amount < 0 ? "text-danger" : "text-success"} style={{ fontWeight: 600 }}>{l.amount > 0 ? `+${l.amount}` : l.amount}</span>,
              l.ref ? String(l.ref).slice(0, 22) : "—",
            ])}
            empty="koi ledger entry nahi" />

          <div className="flex-1 min-w-[260px] flex flex-col gap-3">
            <Table title="Credits spent on" head={["Reason", { label: "Times", num: true }, { label: "Credits", num: true }]}
              rows={spendBy.map((s) => [s.reason, fmtN(s.times), fmtN(s.n)])} empty="kuch kharcha nahi" />
            <Table title="Payments"
              head={["When", "Pack", { label: "Amount", num: true }, "Status", "Provider"]}
              rows={payments.map((p) => [
                fmtDT(p.created_at), `${p.pack_id} (${fmtN(p.credits)})`, fmtINR(Number(p.amount_paise)),
                <Pill key="s" tone={p.status === "paid" ? "ok" : p.status === "created" ? "warn" : "bad"}>{p.status}</Pill>,
                p.provider,
              ])}
              empty="koi order nahi" />
            <Table title="Senders connected" head={["Channel", "Provider", "Address", "Status"]}
              rows={senders.map((s) => [s.channel, s.provider, s.address, <Pill key="s" tone={s.status === "connected" ? "ok" : "bad"}>{s.status}</Pill>])}
              empty="koi mailbox/number connect nahi" />
            <Table title="Emails sent to user"
              head={["When", "Campaign", "Step", "Stream"]}
              rows={emails.map((e) => [fmtDT(e.sent_at), e.campaign_id, e.step_key, e.stream])}
              empty="koi email nahi" />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-3">
          <Table col="col-12" title="Activity timeline" note={activityTotals.length ? `By section: ${activityTotals.map((t) => `${t.section} ${t.n} (${t.actions} actions)`).join(" · ")}` : "No events captured yet (capture started 2026-10-26)."}
            head={["When", "Section", "Event", "Src", "Path", "Props"]} empty="Nothing captured for this user yet."
            rows={activity.map((a) => [fmtAgo(a.created_at as Date), String(a.section), <code key="e" className="text-[11.5px]">{String(a.event)}</code>, a.source === "server" ? "action" : "click", String(a.path ?? ""), <code key="p" className="text-[11px]">{JSON.stringify(a.props).slice(0, 80)}</code>])} />
          <Table col="col-12" title="Area scans"
            head={["When", "Area", "Category", "Status", { label: "Billed calls", num: true }]}
            rows={scans.map((s) => [fmtDT(s.created_at), s.area_label, s.category ?? "—",
              <Pill key="st" tone={s.status === "done" ? "ok" : s.status === "failed" ? "bad" : "warn"}>{s.status}</Pill>,
              fmtN(s.billed_places_calls)])}
            empty="koi scan nahi" />
        </div>

        <div className="flex flex-wrap gap-3">
          <Table col="col-12" title="Errors hit by this user" note="app_errors collector se — naya hai, purani history nahi hogi."
            head={["When", "Route", "Message"]}
            rows={errors.map((e) => [fmtDT(e.created_at), e.route, <span key="m" className="wrap">{String(e.message).slice(0, 120)}</span>])}
            empty="koi recorded error nahi 🎉" />
        </div>
      </div>
    </div>
  );
}
