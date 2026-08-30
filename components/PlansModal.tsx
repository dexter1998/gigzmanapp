"use client";

import { useState } from "react";
import Link from "next/link";
import { PartnerApplicationModal } from "./PartnerApplicationModal";
import { XIcon, CheckIcon } from "./icons";
import { CreditPackCards, CreditPackFootnote } from "./billing/CreditPackCards";
import { useCashfreeCheckout } from "./billing/useCashfreeCheckout";

/**
 * Buy credits, from inside the app.
 *
 * This used to be a plan picker whose "Choose" button called /api/user/plan — a route that granted
 * up to 30,000 credits to anyone signed in, because no gateway existed when it was written. Now
 * that credits are money, that button goes to Cashfree instead, and it shows the same packs at the
 * same prices as the marketing page because both read CREDIT_PACKS.
 */
export function PlansModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
  /** Retained in callers' props but unused — the modal no longer switches plans. */
  currentPlan?: string;
  onPlanChange?: (plan: string) => void;
}) {
  const [partnerOpen, setPartnerOpen] = useState(false);
  const { buy, sdkReady, busyPackId, error } = useCashfreeCheckout(
    // The client can't read the server's secret, so the SDK mode keys off the host instead:
    // anything that isn't the live domain is treated as test.
    typeof window !== "undefined" && window.location.hostname === "mantisai.in" ? "production" : "sandbox"
  );

  if (!open) return null;

  return (
    <>
      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={onClose} style={closeBtnStyle} aria-label="Close">
            <XIcon />
          </button>

          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 4px" }}>Add credits</h2>
          <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", margin: "0 0 22px", maxWidth: 460 }}>
            Credits are spent only when Mantis does real work — adding a lead, or searching ground
            nobody has covered yet. Searching an area you&apos;ve already scanned is always free.
          </p>

          {error && (
            <p style={{ fontSize: 12.5, color: "var(--g-red-text)", background: "var(--g-red-tint)", padding: "9px 12px", borderRadius: "var(--radius-sm)", marginBottom: 14 }}>
              {error}
            </p>
          )}

          <CreditPackCards onBuy={buy} busyPackId={busyPackId} disabled={!sdkReady || busyPackId !== null} showFree={false} />
          <CreditPackFootnote />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--g-border)" }}>
            <Link href="/settings/billing" onClick={onClose} style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-green-text)", textDecoration: "none" }}>
              See what credits buy →
            </Link>
            <Link href="/settings/usage" onClick={onClose} style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-ink-soft)", textDecoration: "none" }}>
              Usage history
            </Link>
          </div>

          <div
            style={{
              border: "1px solid var(--g-green)",
              background: "var(--g-green-mint)",
              borderRadius: "var(--radius-sm)",
              padding: 14,
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 16,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--g-ink)" }}>Partner with us</div>
              <div style={{ fontSize: 11.5, color: "var(--g-ink-soft)", marginTop: 2 }}>
                Approved agency partners get higher limits, priority support and referral revenue.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPartnerOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: "var(--radius-pill)",
                border: "none",
                background: "var(--g-green-dark)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                flexShrink: 0,
                fontFamily: "inherit",
              }}
            >
              <CheckIcon size={13} color="#fff" /> Apply
            </button>
          </div>
        </div>
      </div>

      <PartnerApplicationModal open={partnerOpen} onClose={() => setPartnerOpen(false)} />
    </>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(20,32,51,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  padding: 20,
  overflowY: "auto",
};

const modalStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 720,
  background: "var(--g-white)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-card)",
  padding: 28,
  position: "relative",
  margin: "auto",
};

const closeBtnStyle: React.CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
  border: "none",
  background: "none",
  cursor: "pointer",
  display: "flex",
};
