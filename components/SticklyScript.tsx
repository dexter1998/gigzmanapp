"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

/**
 * Boots the Stickly rewards widget for the signed-in user.
 *
 * The identity has to come from a token we sign on the server, so the script tag and the boot call
 * are ordered around a fetch. The widget's own command queue makes that race safe: `window.stk.cmd`
 * is a plain array until the script loads, and the SDK drains it on arrival — so pushing before the
 * CDN responds is fine, and so is pushing after.
 *
 * Mounted inside the signed-in shell rather than the root layout. The integration guide says "every
 * page is fine", but the widget has nothing to offer a logged-out visitor on a marketing page and
 * boots with no identity there anyway — all it would add is a CDN request to every public pageview.
 */

type Sdk = {
  boot: (o: Record<string, unknown>) => void;
  shutdown: () => void;
  open?: () => void;
  updateToken?: (t: string) => void;
};
type Stk = { cmd: ((s: Sdk) => void)[] | { push(f: (s: Sdk) => void): void } };

type Config = { key: string; token: string };

export function SticklyScript() {
  const [cfg, setCfg] = useState<Config | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stickly/token")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Config | null) => {
        // 401 (signed out) and 503 (not configured) both mean "no widget", not an error worth
        // surfacing — the person did not ask for it and cannot act on it.
        if (!cancelled && d?.token) setCfg(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cfg) return;
    const w = window as unknown as { stk?: Stk };
    w.stk = w.stk ?? { cmd: [] };
    w.stk.cmd.push((s: Sdk) =>
      // hideLauncher: the sidebar's "Earn free credits" already opens this via openStickly().
      // Our workspace is on Stickly's `floating` display mode, which draws its own corner button,
      // so without this there are two ways in and one of them is a button we never designed.
      s.boot({ key: cfg.key, token: cfg.token, hideLauncher: true }),
    );

    // Without this the next person on a shared machine inherits the previous user's widget — and
    // with it, their reward history.
    return () => {
      const q = (window as unknown as { stk?: Stk }).stk;
      q?.cmd.push((s: Sdk) => s.shutdown());
    };
  }, [cfg]);

  if (!cfg) return null;
  return <Script src="https://cdn.stickly.live/w.js" data-key={cfg.key} strategy="afterInteractive" />;
}

/**
 * Opens the widget from our own UI (the sidebar entry).
 *
 * `open()` stays optional-chained, but it is no longer unverified: Stickly documents it, and it
 * was seen working against the live widget on 2026-10-05. The chaining now only guards against a
 * future SDK that drops it — and since hideLauncher removes the widget's own button, a missing
 * open() would leave no way in at all, so a failure here is loud in practice even if quiet in code.
 */
export function openStickly() {
  const w = window as unknown as { stk?: Stk };
  w.stk = w.stk ?? { cmd: [] };
  w.stk.cmd.push((s: Sdk) => s.open?.());
}
