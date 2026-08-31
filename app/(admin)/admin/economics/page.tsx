import { sql } from "@/lib/db";
import { CREDIT_COST, CREDIT_PACKS, PLACES_CALL_COST_INR, CREDIT_FLOOR_INR, FREE_MONTHLY_CREDITS } from "@/lib/credits/pricing";
import { StatCard, Section, Table, Pill, fmtDT, fmtINR, fmtN } from "../ui";

/** Unit economics — collected vs COGS, month-wise. COGS ka bada driver Places API hai (billed
 * calls exact count hote hain); SES/Bedrock chhote estimates hain aur waise hi labelled hain.
 * Rate card yahin dikhta hai taaki pricing decisions isi screen se ho sakein. */

const SES_COST_INR_PER_MAIL = 0.0088; // $0.10/1000 @ ₹88
const BEDROCK_COST_INR_PER_TURN = 0.35; // Nova Pro, ~2K in/0.4K out tokens per planner turn (est)

export default async function EconomicsPage() {
  const [months, [led], spendByReason, abandoned] = await Promise.all([
    sql`
      WITH m AS (SELECT generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') AS month)
      SELECT to_char(m.month, 'Mon YYYY') AS label,
             coalesce(p.collected, 0)::bigint AS collected_paise,
             coalesce(p.orders, 0)::int AS orders,
             coalesce(p.credits_sold, 0)::int AS credits_sold,
             coalesce(s.billed, 0)::int AS billed_calls,
             coalesce(c.turns, 0)::int AS chat_turns,
             coalesce(e.mails, 0)::int AS mails
      FROM m
      LEFT JOIN (SELECT date_trunc('month', paid_at) AS month, sum(amount_paise) AS collected, count(*) AS orders, sum(credits) AS credits_sold
                 FROM payments WHERE status = 'paid' GROUP BY 1) p ON p.month = m.month
      LEFT JOIN (SELECT date_trunc('month', created_at) AS month, sum(billed_places_calls) AS billed FROM area_scans GROUP BY 1) s ON s.month = m.month
      LEFT JOIN (SELECT date_trunc('month', created_at) AS month, count(*) AS turns FROM chat_messages WHERE role = 'assistant' GROUP BY 1) c ON c.month = m.month
      LEFT JOIN (SELECT date_trunc('month', sent_at) AS month, count(*) AS mails FROM email_sends GROUP BY 1) e ON e.month = m.month
      ORDER BY m.month`,
    sql`SELECT coalesce(abs(sum(amount) FILTER (WHERE amount < 0)), 0)::int AS spent,
               coalesce(sum(amount) FILTER (WHERE amount > 0), 0)::int AS granted
        FROM credit_ledger`,
    sql`SELECT reason, count(*)::int AS n, abs(sum(amount))::int AS credits
        FROM credit_ledger WHERE amount < 0 GROUP BY reason ORDER BY credits DESC`,
    sql`SELECT user_email, pack_id, amount_paise, created_at FROM payments
        WHERE status = 'created' AND created_at > now() - interval '30 days'
        ORDER BY created_at DESC LIMIT 20`,
  ]);

  const rows = months.map((m) => {
    const collected = Number(m.collected_paise) / 100;
    const cogs = m.billed_calls * PLACES_CALL_COST_INR + m.chat_turns * BEDROCK_COST_INR_PER_TURN + m.mails * SES_COST_INR_PER_MAIL;
    const margin = collected - cogs;
    return {
      label: String(m.label), orders: Number(m.orders), credits_sold: Number(m.credits_sold),
      billed_calls: Number(m.billed_calls), chat_turns: Number(m.chat_turns),
      collected, cogs, margin, pct: collected > 0 ? Math.round((margin / collected) * 100) : null,
    };
  });
  const totCollected = rows.reduce((s, r) => s + r.collected, 0);
  const totCogs = rows.reduce((s, r) => s + r.cogs, 0);

  return (
    <>
      <div className="adm-head">
        <h1>Unit economics &amp; Billing</h1>
        <span className="adm-asof">as of {fmtDT(new Date())} IST</span>
      </div>

      <div className="adm-cards">
        <StatCard label="Collected (6mo)" value={`₹${Math.round(totCollected).toLocaleString("en-IN")}`} />
        <StatCard label="COGS est (6mo)" value={`₹${Math.round(totCogs).toLocaleString("en-IN")}`} detail="Places + Bedrock + SES" />
        <StatCard label="Gross margin" value={totCollected > 0 ? `${Math.round(((totCollected - totCogs) / totCollected) * 100)}%` : "—"}
          detail={totCollected > 0 ? `₹${Math.round(totCollected - totCogs).toLocaleString("en-IN")}` : "abhi revenue nahi"} tone={totCollected - totCogs >= 0 ? "up" : "bad"} />
        <StatCard label="Credits sold" value={fmtN(led.granted)} detail={`spent ${fmtN(led.spent)}`} />
        <StatCard label="Credit floor" value={`₹${CREDIT_FLOOR_INR.toFixed(3)}`} detail="COGS per credit — kabhi isse neeche mat becho" />
      </div>

      <Section title="Month-wise P&L" note="COGS estimate: billed Places calls exact hain; Bedrock ₹0.35/turn aur SES ₹0.0088/mail approximations.">
        <Table head={["Month", { label: "Collected", num: true }, { label: "Orders", num: true }, { label: "Credits sold", num: true }, { label: "Places calls", num: true }, { label: "Chat turns", num: true }, { label: "COGS est", num: true }, { label: "Margin", num: true }, { label: "GM%", num: true }]}
          rows={rows.map((r) => [
            r.label,
            `₹${Math.round(r.collected).toLocaleString("en-IN")}`,
            fmtN(r.orders), fmtN(r.credits_sold), fmtN(r.billed_calls), fmtN(r.chat_turns),
            `₹${Math.round(r.cogs).toLocaleString("en-IN")}`,
            <span key="m" style={{ color: r.margin >= 0 ? "var(--g-green-text)" : "var(--g-red-text)", fontWeight: 600 }}>₹{Math.round(r.margin).toLocaleString("en-IN")}</span>,
            r.pct === null ? "—" : `${r.pct}%`,
          ])}
          empty="koi data nahi" />
      </Section>

      <div className="adm-split">
        <Section title="Credit spend by reason" note="Kis feature par credits jal rahe hain — pricing tune karne ka input.">
          <Table head={["Reason", { label: "Events", num: true }, { label: "Credits", num: true }, { label: "Price/event", num: true }]}
            rows={spendByReason.map((r) => [r.reason, fmtN(r.n), fmtN(r.credits),
              (CREDIT_COST as Record<string, number>)[r.reason] != null ? `${(CREDIT_COST as Record<string, number>)[r.reason]} cr` : "?"])}
            empty="abhi koi spend nahi" />
        </Section>
        <Section title="Rate card (live from code)" note={`Free allowance ${FREE_MONTHLY_CREDITS} credits/month. Source: lib/credits/pricing.ts`}>
          <Table head={["Item", { label: "Value", num: true }]}
            rows={[
              ...Object.entries(CREDIT_COST).map(([k, v]) => [k, `${v} credits`]),
              ...CREDIT_PACKS.map((p) => [`pack · ${p.id}`, `${fmtN(p.credits)} cr @ ${fmtINR(p.pricePaise)} (₹${(p.pricePaise / 100 / p.credits).toFixed(2)}/cr)`]),
              ["Places call COGS", `₹${PLACES_CALL_COST_INR.toFixed(2)}`],
            ]}
            empty="" />
        </Section>
      </div>

      <Section title="Abandoned checkouts (30d)" note="Order create hua par payment nahi — inhe email/call se follow-up karna sabse sasta revenue hai.">
        <Table head={["When", "User", "Pack", { label: "Amount", num: true }]}
          rows={abandoned.map((a) => [fmtDT(a.created_at), a.user_email, a.pack_id, fmtINR(Number(a.amount_paise))])}
          empty="koi abandoned order nahi" />
      </Section>
    </>
  );
}
