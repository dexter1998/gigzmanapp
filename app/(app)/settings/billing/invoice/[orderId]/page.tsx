import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { COMPANY, addressOneLine } from "@/lib/company";
import { formatINR } from "@/lib/credits/pricing";
import { PrintButton } from "@/components/billing/PrintButton";

export const metadata = { title: "Invoice — Mantis" };

/**
 * A printable invoice for one paid order.
 *
 * Rendered as a print-styled page rather than a generated PDF: the browser's own "Save as PDF"
 * produces a correct, selectable-text document with no PDF dependency to keep in step with the
 * layout. The `@media print` rules in globals.css drop the app chrome so what prints is the
 * document, not a screenshot of the page.
 *
 * Only paid orders resolve — an abandoned checkout has no invoice to issue.
 */
export default async function InvoicePage({ params }: { params: Promise<{ orderId: string }> }) {
  const session = await auth();
  const userEmail = session!.user!.email!;
  const { orderId } = await params;

  const [payment] = await sql`
    SELECT order_id, cf_payment_id, credits, amount_paise, status, paid_at, created_at
    FROM payments
    WHERE order_id = ${orderId} AND user_email = ${userEmail} AND status = 'paid'
  `;
  if (!payment) notFound();

  const [profile] = await sql`SELECT name FROM user_profiles WHERE email = ${userEmail}`;
  const issued = new Date(payment.paid_at ?? payment.created_at);

  return (
    <div style={{ padding: "28px 24px 80px", maxWidth: 780, margin: "0 auto" }}>
      <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <Link href="/settings/billing" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--g-ink-soft)", textDecoration: "none" }}>
          ← Back to billing
        </Link>
        <PrintButton />
      </div>

      <article
        className="invoice-sheet"
        style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 40 }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 36 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--g-ink)", letterSpacing: "-0.02em" }}>{COMPANY.brandLong}</div>
            <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", lineHeight: 1.6, marginTop: 8, maxWidth: 260 }}>
              {COMPANY.legalName}
              <br />
              {addressOneLine()}
              <br />
              {COMPANY.email}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--g-gray-500)" }}>Invoice</div>
            <div style={{ fontSize: 12.5, color: "var(--g-ink)", marginTop: 8, fontVariantNumeric: "tabular-nums" }}>
              {payment.order_id}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginTop: 4 }}>
              {issued.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </header>

        <section style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--g-gray-500)", marginBottom: 6 }}>
            Billed to
          </div>
          <div style={{ fontSize: 14, color: "var(--g-ink)" }}>{profile?.name ?? session!.user!.name ?? userEmail}</div>
          <div style={{ fontSize: 13, color: "var(--g-gray-500)" }}>{userEmail}</div>
        </section>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
          <thead>
            <tr>
              <th style={thStyle}>Description</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>
                <div style={{ fontSize: 14, color: "var(--g-ink)", fontWeight: 600 }}>
                  {payment.credits.toLocaleString("en-IN")} Mantis credits
                </div>
                <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginTop: 2 }}>
                  Prepaid credit top-up · credits do not expire
                </div>
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                {formatINR(payment.amount_paise)}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 14, borderTop: "2px solid var(--g-ink)" }}>
          <div style={{ display: "flex", gap: 40, alignItems: "baseline" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--g-ink)" }}>Total paid</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "var(--g-ink)", fontVariantNumeric: "tabular-nums" }}>
              {formatINR(payment.amount_paise)}
            </span>
          </div>
        </div>

        <footer style={{ marginTop: 36, paddingTop: 18, borderTop: "1px solid var(--g-border)", fontSize: 11.5, color: "var(--g-gray-500)", lineHeight: 1.7 }}>
          <p style={{ margin: 0 }}>
            Paid in full via Cashfree{payment.cf_payment_id ? ` · Payment reference ${payment.cf_payment_id}` : ""}.
          </p>
          {/* Amounts are stated as charged. A GSTIN and tax breakdown belong here once the entity
              is registered — printing a tax line before then would be wrong, not merely missing. */}
          <p style={{ margin: "6px 0 0" }}>
            This is a computer-generated invoice and does not require a signature. Amount shown is the total charged.
          </p>
        </footer>
      </article>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
  color: "var(--g-gray-500)",
  padding: "0 0 10px",
  borderBottom: "1px solid var(--g-border)",
};

const tdStyle: React.CSSProperties = {
  padding: "16px 0",
  borderBottom: "1px solid var(--g-border)",
  verticalAlign: "top",
};
