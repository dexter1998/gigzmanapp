"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sectionForPath, type NavBadges } from "@/lib/nav-sections";

/** Anything that just made something new (a run finished, an inbox sync) can ask for a fresh count:
 *  `window.dispatchEvent(new Event(NAV_BADGES_REFRESH))`. */
export const NAV_BADGES_REFRESH = "mantis:nav-badges-refresh";
export const refreshNavBadges = () => { try { window.dispatchEvent(new Event(NAV_BADGES_REFRESH)); } catch { /* SSR */ } };

const POLL_MS = 60_000;
const MIN_GAP_MS = 3_000; // focus + visibilitychange fire together; one fetch is enough

const markSeen = (section: string) =>
  fetch("/api/nav/badges/seen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section }), keepalive: true });

/** Zero whatever the user is looking at right now: they are seeing it, so it is not news. */
function withoutCurrent(b: NavBadges, key: string | null): NavBadges {
  if (!key) return b;
  if (key.startsWith("chat:")) {
    const id = key.slice(5);
    if (!b.chatIds.includes(id)) return b;
    return { ...b, chat: Math.max(0, b.chat - 1), chatIds: b.chatIds.filter((c) => c !== id) };
  }
  return key in b ? { ...b, [key]: 0 } : b;
}

/**
 * Sidebar notification counts (server truth: GET /api/nav/badges, lib/nav-badges.ts).
 * Fetches on mount, every 60s while the tab is visible (no polling in a hidden tab), on window focus
 * and on NAV_BADGES_REFRESH. Landing on a section zeroes its badge at once and POSTs "seen"; a poll
 * that finds news for the section you are on marks it seen again, so items that arrive while you look
 * never badge.
 */
export function useNavBadges(pathname: string | null, enabled: boolean): NavBadges | null {
  const [raw, setRaw] = useState<NavBadges | null>(null);
  const keyRef = useRef<string | null>(null);
  const lastFetch = useRef(0);
  const key = sectionForPath(pathname);

  const load = useCallback(async (force = false) => {
    if (!force && Date.now() - lastFetch.current < MIN_GAP_MS) return;
    lastFetch.current = Date.now();
    try {
      const r = await fetch("/api/nav/badges", { cache: "no-store" });
      if (!r.ok) return;
      const b = (await r.json()) as NavBadges;
      const cur = keyRef.current;
      const shown = withoutCurrent(b, cur);
      if (cur && shown !== b) markSeen(cur).catch(() => {});
      setRaw(shown);
    } catch { /* offline — keep the last counts */ }
  }, []);

  // Landing on a section: mark it seen, then refetch so the stored counts agree with the server.
  useEffect(() => {
    keyRef.current = key;
    if (!enabled || !key) return;
    let live = true;
    markSeen(key).catch(() => {}).finally(() => { if (live) load(true); });
    return () => { live = false; };
  }, [key, enabled, load]);

  useEffect(() => {
    if (!enabled) return;
    load(true);
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (!timer) timer = setInterval(() => load(true), POLL_MS); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const onVisibility = () => { if (document.visibilityState === "visible") { load(); start(); } else stop(); };
    const onFocus = () => load();
    const onRefresh = () => load(true);
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener(NAV_BADGES_REFRESH, onRefresh);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(NAV_BADGES_REFRESH, onRefresh);
    };
  }, [enabled, load]);

  // Derived, not stored: the section on screen reads 0 the moment you land, before any request.
  return enabled && raw ? withoutCurrent(raw, key) : null;
}

/** "(3) Inbox | Mantis": the total in the tab title. Next rewrites <title> on navigation, so this
 *  re-applies the prefix whenever the title element changes. */
export function useTitleCount(total: number) {
  useEffect(() => {
    const strip = (t: string) => t.replace(/^\(\d+\+?\)\s/, "");
    const apply = () => {
      const want = total > 0 ? `(${total > 99 ? "99+" : total}) ${strip(document.title)}` : strip(document.title);
      if (document.title !== want) document.title = want;
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => { obs.disconnect(); const t = strip(document.title); if (document.title !== t) document.title = t; };
  }, [total]);
}
