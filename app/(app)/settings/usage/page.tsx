import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { ALLOWANCE } from "@/lib/credits/pricing";
import { allowanceFor } from "@/lib/credits/server";

export const metadata = { title: "Usage — Mantis" };

/**
 * Where every credit went. Reads credit_ledger directly rather than deriving totals from the
 * balance, so what's shown here is the same audit trail a billing dispute would be settled from.
 */

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

export default async function UsagePage() {
  const session = await auth();
  const userEmail = session!.user!.email!;

  const [profile] = await sql`SELECT plan, credits FROM user_profiles WHERE email = ${userEmail}`;
  const allowance = await allowanceFor(userEmail, profile?.plan ?? "free");

  const entries = await sql`
    SELECT reason, amount, created_at
    FROM credit_ledger
    WHERE user_email = ${userEmail}
    ORDER BY created_at DESC
    LIMIT 100
  `;

  const spentThisMonth = await sql`
    SELECT COALESCE(SUM(-amount), 0)::int AS total
    FROM credit_ledger
    WHERE user_email = ${userEmail} AND amount < 0 AND created_at >= date_trunc('month', now())
  `;

  return (
    <div style={{ padding: "28px 24px 120px", maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, color: "var(--g-ink)", margin: "0 0 6px" }}>Usage</h1>
      <p style={{ fontSize: 14, color: "var(--g-gray-500)", margin: "0 0 28px" }}>
        Every credit spent and every credit added, newest first.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 1, background: "var(--g-border)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 30 }}>
        <Stat value={(profile?.credits ?? 0).toLocaleString("en-IN")} label="Credits available" />
        <Stat value={(spentThisMonth[0]?.total ?? 0).toLocaleString("en-IN")} label="Spent this month" />
        <Stat value={`${allowance.dayRemaining} / ${ALLOWANCE.billedCallsPerDay}`} label="Free searches left today" />
        <Stat value={String(allowance.monthRemaining)} label="Free searches left this month" />
      </div>

      {entries.length === 0 ? (
        <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 30, textAlign: "center" }}>
          <p style={{ fontSize: 13.5, color: "var(--g-gray-500)", margin: 0 }}>
            Nothing yet. Credits are spent when you add a lead or search new ground.
          </p>
        </div>
      ) : (
        <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
          {entries.map((e, i) => {
            const isCredit = e.amount > 0;
            return (
              <div
                key={`${e.created_at}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "12px 18px",
                  borderBottom: i === entries.length - 1 ? "none" : "1px solid var(--g-border)",
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, color: "var(--g-ink)", fontWeight: 600 }}>
                    {REASON_LABEL[e.reason] ?? e.reason}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--g-gray-500)", marginTop: 2 }}>
                    {new Date(e.created_at).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    color: isCredit ? "var(--g-green-text)" : "var(--g-ink)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isCredit ? "+" : ""}
                  {e.amount.toLocaleString("en-IN")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ background: "var(--g-white)", padding: "20px 18px" }}>
      <div style={{ fontSize: 21, fontWeight: 800, color: "var(--g-ink)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginTop: 3 }}>{label}</div>
    </div>
  );
}
