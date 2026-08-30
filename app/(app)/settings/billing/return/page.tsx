"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckIcon, XIcon } from "@/components/icons";

type Status = "pending" | "paid" | "failed" | "error";

/**
 * Where Cashfree sends the buyer back. It confirms with our own server rather than trusting
 * anything in the redirect URL — the query string is attacker-controllable, and the webhook may
 * not have landed yet, so this polls until the payment resolves one way or the other.
 */
export default function PaymentReturnPage() {
  const params = useSearchParams();
  const orderId = params.get("order_id");

  const [status, setStatus] = useState<Status>("pending");
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!orderId) {
      setStatus("error");
      return;
    }

    let cancelled = false;
    let attempts = 0;

    async function check() {
      attempts++;
      try {
        const res = await fetch(`/api/payments/cashfree/status?order_id=${encodeURIComponent(orderId!)}`);
        const data = (await res.json()) as { status?: Status; credits?: number };
        if (cancelled) return;

        if (data.status === "paid") {
          setCredits(data.credits ?? null);
          setStatus("paid");
          // The credits pill in the app chrome listens for this, so the new balance shows without
          // a reload.
          window.dispatchEvent(new Event("gigzman:credits-changed"));
          return;
        }
        if (data.status === "failed") {
          setStatus("failed");
          return;
        }
      } catch {
        // Keep polling — a transient network blip shouldn't be reported as a failed payment.
      }

      // Roughly 30 seconds of polling. Past that the webhook will still reconcile in the
      // background, so the honest message is "we're confirming", not "it failed".
      if (!cancelled && attempts < 15) setTimeout(check, 2000);
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)", padding: "44px 36px", maxWidth: 420, width: "100%", textAlign: "center" }}>
        {status === "pending" && (
          <>
            <div style={{ ...ring, background: "var(--g-gray-100)" }}>
              <span className="chat-searching-dot" />
            </div>
            <h1 style={heading}>Confirming your payment…</h1>
            <p style={body}>This usually takes a few seconds. You can safely leave this page open.</p>
          </>
        )}

        {status === "paid" && (
          <>
            <div style={{ ...ring, background: "var(--g-green-mint)" }}>
              <CheckIcon size={26} color="var(--g-green-text)" />
            </div>
            <h1 style={heading}>Payment successful</h1>
            <p style={body}>
              {credits ? `${credits.toLocaleString("en-IN")} credits have been added to your account.` : "Your credits have been added."}
            </p>
            <Link href="/home" style={primaryBtn}>
              Start finding leads
            </Link>
          </>
        )}

        {status === "failed" && (
          <>
            <div style={{ ...ring, background: "var(--g-red-tint)" }}>
              <XIcon size={22} color="var(--g-red-text)" />
            </div>
            <h1 style={heading}>Payment didn&apos;t go through</h1>
            <p style={body}>Nothing was charged. You can try again, or use a different payment method.</p>
            <Link href="/settings/billing" style={primaryBtn}>
              Back to billing
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <h1 style={heading}>Order not found</h1>
            <p style={body}>We couldn&apos;t find this order. If money left your account, contact us and we&apos;ll sort it out.</p>
            <Link href="/settings/billing" style={primaryBtn}>
              Back to billing
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

const ring: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 18px",
};

const heading: React.CSSProperties = { fontSize: 20, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 8px" };
const body: React.CSSProperties = { fontSize: 14, color: "var(--g-gray-500)", lineHeight: 1.6, margin: "0 0 24px" };

const primaryBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 26px",
  borderRadius: "var(--radius-sm)",
  background: "var(--g-green-dark)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  textDecoration: "none",
};
