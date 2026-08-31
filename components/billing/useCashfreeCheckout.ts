"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    Cashfree?: (config: { mode: "production" | "sandbox" }) => {
      checkout: (opts: { paymentSessionId: string; redirectTarget?: "_self" | "_blank" | "_modal" }) => Promise<unknown>;
    };
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const CASHFREE_SDK = "https://sdk.cashfree.com/js/v3/cashfree.js";
const RAZORPAY_SDK = "https://checkout.razorpay.com/v1/checkout.js";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if ((existing as unknown as { loaded?: boolean }).loaded) return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("sdk load failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => { (s as unknown as { loaded?: boolean }).loaded = true; resolve(); };
    s.onerror = () => reject(new Error("sdk load failed"));
    document.head.appendChild(s);
  });
}

/**
 * Provider-agnostic checkout. One server call decides the gateway (Razorpay preferred, Cashfree
 * fallback — see /api/payments/order) and this opens whichever checkout came back. Card details
 * never touch this app either way.
 *
 * Kept under its old filename so both buy surfaces (billing page + in-app modal) pick the change
 * up without touching their imports.
 */
export function useCashfreeCheckout(mode: "production" | "sandbox") {
  const [sdkReady, setSdkReady] = useState(false);
  const [busyPackId, setBusyPackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Both SDKs are tiny loaders; fetching them up front keeps the click handler synchronous-feeling.
  useEffect(() => {
    Promise.allSettled([loadScript(CASHFREE_SDK), loadScript(RAZORPAY_SDK)]).then(() => setSdkReady(true));
  }, []);

  async function buy(packId: string) {
    setBusyPackId(packId);
    setError(null);
    try {
      const res = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      if (!res.ok) {
        setError("Couldn't start the payment. Please try again in a moment.");
        return;
      }
      const data = (await res.json()) as
        | { provider: "razorpay"; orderId: string; razorpayOrderId: string; keyId: string; amountPaise: number; name?: string; email: string }
        | { provider: "cashfree"; paymentSessionId: string };

      if (data.provider === "razorpay") {
        if (!window.Razorpay) { setError("Payment window couldn't load. Refresh and try again."); return; }
        const rzp = new window.Razorpay({
          key: data.keyId,
          order_id: data.razorpayOrderId,
          name: "Mantis Ai",
          description: "Lead credits",
          prefill: { name: data.name ?? "", email: data.email },
          theme: { color: "#5a8a2e" },
          handler: async (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
            const v = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: data.orderId,
                razorpayOrderId: resp.razorpay_order_id,
                paymentId: resp.razorpay_payment_id,
                signature: resp.razorpay_signature,
              }),
            });
            if (v.ok) {
              window.dispatchEvent(new Event("gigzman:credits-changed"));
              window.location.href = "/settings/billing";
            } else {
              setError("Payment received but confirmation failed — your credits will arrive via our backup check within a few minutes.");
            }
          },
        });
        rzp.open();
        return;
      }

      if (!window.Cashfree) { setError("Payment window couldn't load. Refresh and try again."); return; }
      await window.Cashfree({ mode }).checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: "_self" });
    } catch {
      setError("Couldn't reach the payment gateway. Please try again.");
    } finally {
      setBusyPackId(null);
    }
  }

  return { buy, sdkReady, busyPackId, error };
}
