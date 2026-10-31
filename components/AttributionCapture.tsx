"use client";

/**
 * First-touch attribution: on a visitor's first page view, remember where they came from — utm
 * tags, the referring host, a click id, and the page they landed on — in a first-party cookie for
 * 90 days. Signup / onboarding copies it onto the account (lib/attribution.ts). Never overwritten,
 * so a later direct visit doesn't erase the Google search or the email that brought them.
 */
import { useEffect } from "react";

const COOKIE = "m_src";

export function AttributionCapture() {
  useEffect(() => {
    try {
      if (document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE}=`))) return;
      const u = new URL(window.location.href);
      const ref = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : "";
      const own = /(^|\.)mantisai\.in$|^localhost$/.test(ref);
      const pick = (k: string) => (u.searchParams.get(k) ?? "").slice(0, 80);
      const src = {
        us: pick("utm_source"), um: pick("utm_medium"), uc: pick("utm_campaign"),
        ref: own ? "" : ref.slice(0, 80), land: u.pathname.slice(0, 120),
        click: u.searchParams.has("gclid") ? "gclid" : u.searchParams.has("fbclid") ? "fbclid" : "",
        t: Date.now(),
      };
      document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(src))}; path=/; max-age=${90 * 86400}; SameSite=Lax`;
    } catch { /* attribution must never break a page */ }
  }, []);
  return null;
}
