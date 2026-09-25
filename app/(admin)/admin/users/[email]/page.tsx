import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { PageHeader, StatCard, CardRow, Table, Pill, fmtAgo, fmtDT, fmtINR, fmtN } from "../../ui";

/** Ek user ki poori story — profile, paisa, credits ka ledger, scans, chats, errors.
 * Support question ("mere credits kahan gaye?") ka jawab isi ek screen se milna chahiye. */

export default async function UserDetailPage({ params }: { params: Promise<{ email: string }> }) {
  const email = decodeURIComponent((await params).email);

  const [[u], ledger, payments, scans, [chat], errors, emails] = await Promise.all([
    sql`SELECT * FROM user_profiles WHERE email = ${email}`,
    sql`SELECT reason, amount, ref, lead_id, created_at FROM credit_ledger WHERE user_email = ${email} ORDER BY created_at DESC LIMIT 50`,
    sql`SELECT provider, order_id, pack_id, credits, amount_paise, status, created_at, paid_at FROM payments WHERE user_email = ${email} ORDER BY created_at DESC LIMIT 20`,
    sql`SELECT area_label, category, status, billed_places_calls, created_at FROM area_scans WHERE requested_by = ${email} ORDER BY created_at DESC LIMIT 20`,
    sql`SELECT count(DISTINCT c.id)::int AS chats, count(m.id)::int AS msgs,
               count(m.id) FILTER (WHERE m.feedback = 'down')::int AS downs
        FROM chats c LEFT JOIN chat_messages m ON m.chat_id = c.id WHERE c.user_email = ${email}`,
    sql`SELECT route, message, created_at FROM app_errors WHERE user_email = ${email} ORDER BY created_at DESC LIMIT 20`,
    sql`SELECT campaign_id, step_key, stream, sent_at FROM email_sends WHERE recipient = ${email} ORDER BY sent_at DESC LIMIT 20`,
  ]);

  if (!u) notFound();

  const spent = ledger.filter((l) => l.amount < 0).reduce((s, l) => s + Math.abs(l.amount), 0);
  const paidTotal = payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount_paise), 0);

  return (
    <div className="page-body">
      <div className="container-xl">
        <PageHeader pretitle="Users" title={email} sub={`joined ${fmtDT(u.created_at)} · last seen ${fmtAgo(u.last_seen_at)}`} />

        <CardRow>
          <StatCard label="Plan" value={u.plan} detail={paidTotal > 0 ? `paid ${fmtINR(paidTotal)}` : "kabhi pay nahi kiya"} tone={paidTotal > 0 ? "up" : undefined} />
          <StatCard label="Credits" value={fmtN(u.credits)} detail={`limit ${fmtN(u.credits_limit)}`} />
          <StatCard label="Spent (last 50 rows)" value={fmtN(spent)} />
          <StatCard label="Scans" value={fmtN(scans.length)} />
          <StatCard label="Chats" value={`${fmtN(chat.chats)} / ${fmtN(chat.msgs)} msgs`} detail={chat.downs > 0 ? `${chat.downs} dislikes` : undefined} tone={chat.downs > 0 ? "bad" : undefined} />
          <StatCard label="Profile" value={u.business_type ?? "—"} detail={`${u.role ?? "role?"} · ${u.country ?? "country?"}`} />
        </CardRow>

        <div className="row row-cards mb-3">
          <Table col="col-lg-6" title="Credit ledger" note="Negative = spend, positive = purchase grant. Idempotency ref ke saath."
            head={["When", "Reason", { label: "Δ", num: true }, "Ref"]}
            rows={ledger.map((l) => [
              fmtDT(l.created_at), l.reason,
              <span key="a" className={l.amount < 0 ? "text-danger" : "text-success"} style={{ fontWeight: 600 }}>{l.amount > 0 ? `+${l.amount}` : l.amount}</span>,
              l.ref ? String(l.ref).slice(0, 22) : "—",
            ])}
            empty="koi ledger entry nahi" />

          <div className="col-lg-6 d-flex flex-column gap-3">
            <Table title="Payments"
              head={["When", "Pack", { label: "Amount", num: true }, "Status", "Provider"]}
              rows={payments.map((p) => [
                fmtDT(p.created_at), `${p.pack_id} (${fmtN(p.credits)})`, fmtINR(Number(p.amount_paise)),
                <Pill key="s" tone={p.status === "paid" ? "ok" : p.status === "created" ? "warn" : "bad"}>{p.status}</Pill>,
                p.provider,
              ])}
              empty="koi order nahi" />
            <Table title="Emails sent to user"
              head={["When", "Campaign", "Step", "Stream"]}
              rows={emails.map((e) => [fmtDT(e.sent_at), e.campaign_id, e.step_key, e.stream])}
              empty="koi email nahi" />
          </div>
        </div>

        <div className="row row-cards mb-3">
          <Table col="col-12" title="Area scans"
            head={["When", "Area", "Category", "Status", { label: "Billed calls", num: true }]}
            rows={scans.map((s) => [fmtDT(s.created_at), s.area_label, s.category ?? "—",
              <Pill key="st" tone={s.status === "done" ? "ok" : s.status === "failed" ? "bad" : "warn"}>{s.status}</Pill>,
              fmtN(s.billed_places_calls)])}
            empty="koi scan nahi" />
        </div>

        <div className="row row-cards">
          <Table col="col-12" title="Errors hit by this user" note="app_errors collector se — naya hai, purani history nahi hogi."
            head={["When", "Route", "Message"]}
            rows={errors.map((e) => [fmtDT(e.created_at), e.route, <span key="m" className="wrap">{String(e.message).slice(0, 120)}</span>])}
            empty="koi recorded error nahi 🎉" />
        </div>
      </div>
    </div>
  );
}
