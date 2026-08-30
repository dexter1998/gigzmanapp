"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { CREDIT_PACKS, formatINR, rupees } from "@/lib/credits/pricing";
import { CheckIcon } from "@/components/icons";

declare global {
  interface Window {
    Cashfree?: (config: { mode: "production" | "sandbox" }) => {
      checkout: (opts: { paymentSessionId: string; redirectTarget?: "_self" | "_blank" | "_modal" }) => Promise<unknown>;
    };
  }
}

/**
 * Credit-pack purchase. The card details never touch this app — we exchange a pack id for a
 * Cashfree `payment_session_id` server-side and hand that to their hosted checkout.
 */
export function BuyCredits({ mode }: { mode: "production" | "sandbox" }) {
  const [sdkReady, setSdkReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.Cashfree) setSdkReady(true);
  }, []);

  async function buy(packId: string) {
    setBusy(packId);
    setError(null);
    try {
      const res = await fetch("/api/payments/cashfree/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });

      if (!res.ok) {
        setError("Couldn't start the payment. Please try again in a moment.");
        return;
      }

      const { paymentSessionId } = (await res.json()) as { paymentSessionId: string };

      if (!window.Cashfree) {
        setError("Payment window couldn't load. Check your connection and refresh.");
        return;
      }

      // _self, not _modal: an in-page modal loses UPI app hand-offs on mobile, which is how most
      // Indian payments actually complete.
      await window.Cashfree({ mode }).checkout({ paymentSessionId, redirectTarget: "_self" });
    } catch {
      setError("Couldn't reach the payment gateway. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Script src="https://sdk.cashfree.com/js/v3/cashfree.js" onLoad={() => setSdkReady(true)} strategy="afterInteractive" />

      {error && (
        <p style={{ fontSize: 13, color: "var(--g-red-text)", background: "var(--g-red-tint)", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16 }}>
          {error}
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16 }}>
        {CREDIT_PACKS.map((pack) => {
          const perCredit = rupees(pack.pricePaise) / pack.credits;
          const highlighted = pack.badge === "Most popular";
          return (
            <div
              key={pack.id}
              style={{
                position: "relative",
                background: highlighted ? "var(--g-green-mint)" : "var(--g-white)",
                border: highlighted ? "1.5px solid var(--g-green)" : "1px solid var(--g-border)",
                borderRadius: "var(--radius-md)",
                padding: 24,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {pack.badge && (
                <span
                  style={{
                    position: "absolute",
                    top: -11,
                    left: 20,
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "4px 11px",
                    borderRadius: "var(--radius-pill)",
                    background: highlighted ? "var(--g-green-dark)" : "var(--g-ink)",
                    color: "#fff",
                    whiteSpace: "nowrap",
                  }}
                >
                  {pack.badge}
                </span>
              )}

              <div style={{ fontSize: 13, fontWeight: 700, color: highlighted ? "var(--g-green-text)" : "var(--g-gray-500)", marginBottom: 10 }}>
                {pack.label}
              </div>

              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--g-ink)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                {pack.credits.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginBottom: 16 }}>credits</div>

              <div style={{ fontSize: 21, fontWeight: 800, color: "var(--g-ink)", fontVariantNumeric: "tabular-nums" }}>
                {formatINR(pack.pricePaise)}
              </div>
              <div style={{ fontSize: 12, color: "var(--g-gray-500)", marginBottom: 20, fontVariantNumeric: "tabular-nums" }}>
                ₹{perCredit.toFixed(2)} per credit
              </div>

              <div style={{ flex: 1 }} />

              <button
                type="button"
                disabled={!sdkReady || busy !== null}
                onClick={() => buy(pack.id)}
                style={{
                  padding: "12px 0",
                  borderRadius: "var(--radius-sm)",
                  border: highlighted ? "none" : "1px solid var(--g-border)",
                  background: highlighted ? "var(--g-green-dark)" : "var(--g-white)",
                  color: highlighted ? "#fff" : "var(--g-ink)",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  cursor: sdkReady && !busy ? "pointer" : "not-allowed",
                  opacity: sdkReady && !busy ? 1 : 0.55,
                }}
              >
                {busy === pack.id ? "Opening…" : sdkReady ? "Buy credits" : "Loading…"}
              </button>
            </div>
          );
        })}
      </div>

      <p style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--g-gray-500)", marginTop: 18 }}>
        <CheckIcon size={14} color="var(--g-green)" />
        Credits never expire · UPI, cards, net banking · Payments handled by Cashfree
      </p>
    </>
  );
}
