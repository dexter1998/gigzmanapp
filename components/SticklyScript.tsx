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

type Config = { key: string; token: string; user: { email: string; name: string | null } };

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
      s.boot({ key: cfg.key, token: cfg.token, user: cfg.user }),
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
 * `open()` is marked optional on purpose: the integration guide documents only boot(), shutdown()
 * and updateToken(), so this call is the one part of the integration that has not been verified
 * against the real SDK. If the method does not exist the queue entry is a no-op and the widget's
 * own launcher still works — it fails quiet rather than throwing, but it does fail, so this is
 * worth checking the first time the sidebar link is clicked against the live widget.
 */
export function openStickly() {
  const w = window as unknown as { stk?: Stk };
  w.stk = w.stk ?? { cmd: [] };
  w.stk.cmd.push((s: Sdk) => s.open?.());
}
