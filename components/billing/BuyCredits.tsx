"use client";

import { CreditPackCards, CreditPackFootnote } from "./CreditPackCards";
import { useCashfreeCheckout } from "./useCashfreeCheckout";

/** Credit purchase on the billing page. The cards and the checkout call are shared with the
 * in-app modal, so both surfaces charge the same prices through the same path. */
export function BuyCredits({ mode }: { mode: "production" | "sandbox" }) {
  const { buy, sdkReady, busyPackId, error } = useCashfreeCheckout(mode);

  return (
    <>
      {error && (
        <p style={{ fontSize: 13, color: "var(--g-red-text)", background: "var(--g-red-tint)", padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16 }}>
          {error}
        </p>
      )}

      <CreditPackCards onBuy={buy} busyPackId={busyPackId} disabled={!sdkReady || busyPackId !== null} showFree={false} />
      <CreditPackFootnote />
    </>
  );
}
