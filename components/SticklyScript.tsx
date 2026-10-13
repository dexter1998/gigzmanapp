"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { STICKLY_CDN_URL } from "@/lib/stickly-public";

/**
 * Loads the Stickly rewards widget for a signed-in user.
 *
 * Mounted in the signed-in shell, not the root layout: live keys refuse every claim without a
 * signed identity token, so booting on logged-out marketing pages could never grant anything and
 * would only cost a CDN request per pageview.
 *
 * The workspace is on Stickly's `popup` display mode, which draws no button of its own — the
 * sidebar's "Earn free credits" is the only way in, via openStickly() below. Nothing here passes
 * hideLauncher: that decision lives in the dashboard, next to the rest of the widget's appearance,
 * and repeating it here would split one setting across two places.
 */

type Sdk = {
  boot: (o: Record<string, unknown>) => void;
  shutdown: () => void;
  open?: () => void;
  close?: () => void;
  updateToken?: (t: string) => void;
};
type Stk = { cmd: ((s: Sdk) => void)[] | { push(f: (s: Sdk) => void): void } };

/** Only the publishable key and the signed token ever reach the browser. */
type Config = { key: string; token: string };

export function SticklyScript() {
  const [cfg, setCfg] = useState<Config | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stickly/token")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Config | null) => {
        // 401 (signed out) and 503 (not configured) both mean "no widget", not an error worth
        // surfacing — the person did not ask for it and could not act on it.
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
    w.stk.cmd.push((s: Sdk) => s.boot({ key: cfg.key, token: cfg.token }));

    // Without this the next person on a shared machine inherits the previous user's widget — and
    // with it, their reward history.
    return () => {
      const q = (window as unknown as { stk?: Stk }).stk;
      q?.cmd.push((s: Sdk) => s.shutdown());
    };
  }, [cfg]);

  // The script carries no data-key: with one, the bundle's zero-config path would boot itself
  // without a token the moment it loads, before the queued boot above runs.
  if (!cfg) return null;
  return <Script src={STICKLY_CDN_URL} strategy="afterInteractive" />;
}

/**
 * Opens the widget from our own UI (the sidebar entry).
 *
 * Pushed through `cmd` rather than called directly so it works whether or not the bundle has
 * finished loading — before it loads `cmd` is a plain array the bundle drains, afterwards it is a
 * shim that runs the callback immediately. `open` is optional-chained only to guard against a
 * future SDK that drops it; because the workspace draws no launcher, losing it would leave no way
 * into the widget at all, so the failure would be loud in practice even though it is silent here.
 */
export function openStickly() {
  const w = window as unknown as { stk?: Stk };
  w.stk = w.stk ?? { cmd: [] };
  w.stk.cmd.push((s: Sdk) => s.open?.());
}
