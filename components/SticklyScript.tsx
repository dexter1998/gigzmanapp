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
    // No hideLauncher: the workspace is on Stickly's `popup` display mode, which already draws no
    // button of its own. Passing it here too would split one decision across two places -- the
    // dashboard and this file -- and the dashboard is where it belongs.
    w.stk.cmd.push((s: Sdk) => s.boot({ key: cfg.key, token: cfg.token }));

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
 * was seen working against the live widget on 2026-10-14. The chaining only guards against a
 * future SDK that drops it — and because the workspace is on `popup` mode and so draws no launcher
 * of its own, a missing open() would leave no way into the widget at all. A failure here is loud
 * in practice even though it is silent in code.
 */
export function openStickly() {
  const w = window as unknown as { stk?: Stk };
  w.stk = w.stk ?? { cmd: [] };
  w.stk.cmd.push((s: Sdk) => s.open?.());
}
