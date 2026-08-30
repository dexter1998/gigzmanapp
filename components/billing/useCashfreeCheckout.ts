"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    Cashfree?: (config: { mode: "production" | "sandbox" }) => {
      checkout: (opts: { paymentSessionId: string; redirectTarget?: "_self" | "_blank" | "_modal" }) => Promise<unknown>;
    };
  }
}

const SDK_SRC = "https://sdk.cashfree.com/js/v3/cashfree.js";

/**
 * Opens Cashfree checkout for a credit pack. Card details never touch this app — a pack id is
 * exchanged server-side for a payment session, and their hosted checkout takes it from there.
 *
 * The SDK is injected here rather than via next/script so the buy button works identically inside
 * a modal and on a full page; a <Script> mounted inside a conditionally-rendered modal doesn't
 * reliably load before the first click.
 */
export function useCashfreeCheckout(mode: "production" | "sandbox") {
  const [sdkReady, setSdkReady] = useState(false);
  const [busyPackId, setBusyPackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.Cashfree) {
      setSdkReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => setSdkReady(true));
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_SRC;
    script.async = true;
    script.onload = () => setSdkReady(true);
    script.onerror = () => setError("Payment window couldn't load. Check your connection and refresh.");
    document.head.appendChild(script);
  }, []);

  async function buy(packId: string) {
    setBusyPackId(packId);
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

      // _self, not _modal: an in-page modal loses the hand-off to UPI apps on mobile, which is how
      // most Indian payments actually complete.
      await window.Cashfree({ mode }).checkout({ paymentSessionId, redirectTarget: "_self" });
    } catch {
      setError("Couldn't reach the payment gateway. Please try again.");
    } finally {
      setBusyPackId(null);
    }
  }

  return { buy, sdkReady, busyPackId, error };
}
