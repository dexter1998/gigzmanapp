import Link from "next/link";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { BuyCredits } from "@/components/billing/BuyCredits";
import { cashfreeIsLive } from "@/lib/cashfree";
import { CREDIT_COST, FREE_MONTHLY_CREDITS, ALLOWANCE, formatINR } from "@/lib/credits/pricing";
import { allowanceFor } from "@/lib/credits/server";

export const metadata = { title: "Billing" };

const RATE_CARD: Array<{ label: string; credits: number; note: string }> = [
  { label: "Search an area you've already scanned", credits: CREDIT_COST.cached_search, note: "Always free" },
  { label: "Search new ground (per live lookup)", credits: CREDIT_COST.billed_places_call, note: "After your daily free allowance" },
  { label: "Ask Mantis in chat (per message)", credits: CREDIT_COST.chat_turn, note: "After your daily free allowance" },
  { label: "Add a lead — name, address, phone", credits: CREDIT_COST.lead_unlock, note: "" },
  { label: "Website health check", credits: CREDIT_COST.website_check, note: "" },
  { label: "Deep enrichment — hours, busy times", credits: CREDIT_COST.deep_enrich, note: "" },
  { label: "Verified email", credits: CREDIT_COST.verified_email, note: "" },
  { label: "Verified phone", credits: CREDIT_COST.verified_phone, note: "" },
  { label: "Find the founder or decision-maker", credits: CREDIT_COST.find_founder, note: "" },
  { label: "Generate a pitch script", credits: CREDIT_COST.pitch_script, note: "" },
];

export default async function BillingPage() {
  const session = await auth();
  const userEmail = session!.user!.email!;

  const [profile] = await sql`SELECT plan, credits, credits_limit FROM user_profiles WHERE email = ${userEmail}`;
  const plan = profile?.plan ?? "free";
  const allowance = await allowanceFor(userEmail, plan);

  const payments = await sql`
    SELECT order_id, credits, amount_paise, status, created_at, paid_at
    FROM payments WHERE user_email = ${userEmail}
    ORDER BY created_at DESC LIMIT 20
  `;

  return (
    <div style={{ padding: "28px 20px 120px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, color: "var(--g-ink)", margin: "0 0 6px" }}>Billing</h1>
      <p style={{ fontSize: 14, color: "var(--g-gray-500)", margin: "0 0 28px" }}>
        Credits are spent only when Mantis does real work for you. Searching ground you&apos;ve already covered is always free.
      </p>

      {!cashfreeIsLive() && (
        <p style={{ fontSize: 12.5, fontWeight: 700, color: "#b45309", background: "var(--g-amber-tint)", padding: "9px 14px", borderRadius: "var(--radius-sm)", marginBottom: 20 }}>
          Test mode — payments here are sandbox transactions, no real money moves.
        </p>
      )}

      {/* Balance + today's free allowance */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 1, background: "var(--g-border)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 34 }}>
        <Stat value={(profile?.credits ?? 0).toLocaleString("en-IN")} label="Credits available" />
        <Stat value={`${allowance.dayRemaining} / ${ALLOWANCE.billedCallsPerDay}`} label="Free searches left today" />
        <Stat value={`${allowance.monthRemaining}`} label="Free searches left this month" />
        <Stat value={plan === "free" ? `${FREE_MONTHLY_CREDITS}/mo` : "Top-up"} label={plan === "free" ? "Free plan credits" : "Plan"} />
      </div>

      <h2 style={sectionTitle}>Buy credits</h2>
      <BuyCredits mode={cashfreeIsLive() ? "production" : "sandbox"} />

      <h2 style={{ ...sectionTitle, marginTop: 44 }}>What credits buy</h2>
      <div style={{ border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", background: "var(--g-white)", overflow: "hidden" }}>
        {RATE_CARD.map((row, i) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: "13px 18px",
              borderBottom: i === RATE_CARD.length - 1 ? "none" : "1px solid var(--g-border)",
            }}
          >
            <div>
              <div style={{ fontSize: 13.5, color: "var(--g-ink)" }}>{row.label}</div>
              {row.note && <div style={{ fontSize: 11.5, color: "var(--g-gray-500)", marginTop: 2 }}>{row.note}</div>}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                whiteSpace: "nowrap",
                color: row.credits === 0 ? "var(--g-green-text)" : "var(--g-ink)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {row.credits === 0 ? "Free" : `${row.credits} credits`}
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginTop: 12, lineHeight: 1.6 }}>
        A live lookup returns up to 20 businesses, so a typical neighbourhood search costs far less than
        the per-lookup price suggests. Every lookup you make also makes that area free for your next visit.
      </p>

      {payments.length > 0 && (
        <>
          <h2 style={{ ...sectionTitle, marginTop: 44 }}>Purchase history</h2>
          <div style={{ border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", background: "var(--g-white)", overflow: "hidden" }}>
            {payments.map((p, i) => (
              <div
                key={p.order_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "13px 18px",
                  borderBottom: i === payments.length - 1 ? "none" : "1px solid var(--g-border)",
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--g-ink)" }}>
                    {p.credits.toLocaleString("en-IN")} credits
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--g-gray-500)", marginTop: 2 }}>
                    {new Date(p.paid_at ?? p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--g-ink)", fontVariantNumeric: "tabular-nums" }}>
                    {formatINR(p.amount_paise)}
                  </span>
                  <StatusPill status={p.status} />
                  {/* Only paid orders get an invoice link — an abandoned checkout has nothing to
                      issue a document for. */}
                  {p.status === "paid" && (
                    <Link
                      href={`/settings/billing/invoice/${p.order_id}`}
                      style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-green-text)", textDecoration: "none", whiteSpace: "nowrap" }}
                    >
                      Invoice ↓
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ background: "var(--g-white)", padding: "20px 18px" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--g-ink)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginTop: 3 }}>{label}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    paid: { bg: "var(--g-green-mint)", color: "var(--g-green-text)", label: "Paid" },
    created: { bg: "var(--g-gray-100)", color: "var(--g-gray-500)", label: "Incomplete" },
    dropped: { bg: "var(--g-gray-100)", color: "var(--g-gray-500)", label: "Cancelled" },
    failed: { bg: "var(--g-red-tint)", color: "var(--g-red-text)", label: "Failed" },
    expired: { bg: "var(--g-gray-100)", color: "var(--g-gray-500)", label: "Expired" },
  };
  const s = map[status] ?? map.created;
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 800,
  color: "var(--g-ink)",
  margin: "0 0 16px",
};
