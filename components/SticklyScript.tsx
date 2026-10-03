"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Loads the Stickly rewards widget for signed-in users.
 *
 * Not next/script: the widget needs a per-user token that only our server can
 * mint, so the script and the boot call have to be ordered around a fetch. The
 * widget's own command queue makes that race safe — `window.stk.cmd` is a plain
 * array until the bundle lands and a shim that runs callbacks immediately after,
 * so pushing before or after the script loads behaves the same.
 */
const SRC = process.env.NEXT_PUBLIC_STICKLY_CDN
  ? `${process.env.NEXT_PUBLIC_STICKLY_CDN}/w.js`
  : "https://cdn.stickly.live/w.js";

type Sdk = { boot: (o: Record<string, unknown>) => void; shutdown: () => void };
type Stk = { cmd: ((s: Sdk) => void)[] | { push(f: (s: Sdk) => void): void } };

export function SticklyScript() {
  const pathname = usePathname();
  // Same exclusions as FounderWidgetScript: the embeddable widget page must not
  // carry another widget, and admin screens get recorded.
  const skip = pathname?.startsWith("/widget") || pathname?.startsWith("/admin");

  useEffect(() => {
    if (skip) return;
    let cancelled = false;

    (async () => {
      const res = await fetch("/api/stickly/token", { cache: "no-store" }).catch(() => null);
      if (!res?.ok || cancelled) return;
      const cfg = await res.json().catch(() => null);
      if (!cfg?.enabled || cancelled) return;

      const w = window as unknown as { stk?: Stk };
      w.stk = w.stk ?? { cmd: [] };
      w.stk.cmd.push((s: Sdk) =>
        s.boot({
          key: cfg.key,
          token: cfg.token,
          api: process.env.NEXT_PUBLIC_STICKLY_CDN || undefined,
          // Re-mint rather than leaving the user with a dead widget: the token is
          // twelve hours and a dashboard tab routinely outlives that.
          onTokenExpired: () => { void refresh(); },
        }),
      );

      if (!document.querySelector('script[data-stickly-loader]')) {
        const tag = document.createElement("script");
        tag.src = SRC;
        tag.async = true;
        tag.dataset.sticklyLoader = "1";
        document.head.appendChild(tag);
      }
    })();

    async function refresh() {
      const res = await fetch("/api/stickly/token", { cache: "no-store" }).catch(() => null);
      const cfg = res?.ok ? await res.json().catch(() => null) : null;
      const w = window as unknown as { stk?: { updateToken?: (t: string) => void } };
      if (cfg?.token) w.stk?.updateToken?.(cfg.token);
    }

    return () => { cancelled = true; };
  }, [skip]);

  return null;
}
