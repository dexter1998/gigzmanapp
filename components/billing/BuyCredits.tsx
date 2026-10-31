"use client";

import { CreditPackCards, CreditPackFootnote } from "./CreditPackCards";
import { AddFunds } from "./AddFunds";
import { useCashfreeCheckout, TOPUP_BUSY_ID } from "./useCashfreeCheckout";

/** Plans + Add funds on the billing page. The cards, the top-up strip and the checkout call are
 * shared with the in-app modal, so both surfaces charge the same prices through the same path.
 * One checkout hook for both, so a plan and a top-up can never be opening at the same time. */
export function BuyCredits({ mode, sectionTitleStyle }: { mode: "production" | "sandbox"; sectionTitleStyle: React.CSSProperties }) {
  const { buy, topup, sdkReady, busyPackId, error } = useCashfreeCheckout(mode);

  return (
    <>
      {error && (
        <p style={{ fontSize: 13, color: "var(--g-red-text)", background: "var(--g-red-tint)", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16 }}>
          {error}
        </p>
      )}

      <CreditPackCards onBuy={buy} busyPackId={busyPackId} disabled={!sdkReady || busyPackId !== null} showFree={false} />
      <CreditPackFootnote />

      <h2 id="add-funds" style={{ ...sectionTitleStyle, marginTop: 44 }}>Add funds</h2>
      <AddFunds onTopup={topup} busy={busyPackId === TOPUP_BUSY_ID} disabled={!sdkReady || busyPackId !== null} />
    </>
  );
}
