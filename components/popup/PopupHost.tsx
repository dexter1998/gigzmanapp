"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { POPUPS, isEligible, type AudienceTag, type PopupFrequency } from "@/lib/popups";
import { PopupModal } from "./PopupModal";
import { useMounted } from "./useMounted";

/**
 * Mounted once in the app shell. Decides WHICH popup (if any) this person sees right now, and
 * remembers that they have seen it.
 *
 * Display rules live here rather than in the modal because they are about the person and the
 * moment, not about the popup's contents — the same content object shown to a new signup and to a
 * returning user differs only in whether this host lets it through.
 *
 * More than one popup can be waiting (a returning user who also received the credit grant). They
 * are shown one at a time in POPUPS order: closing one — by its CTA or the X — marks it seen,
 * which drops it out of the eligible set on the very next render and brings the next one up.
 * No queue state of its own; the eligibility filter already is the queue.
 */
const SEEN_PREFIX = "mantis.popup.seen.";
const DAY_PREFIX = "mantis.popup.day.";

/** Seen-ever, across sessions. Also what `rules.after` reads, which is why it is recorded for
 *  every frequency — a "session" popup still has to leave a permanent trace that it happened. */
function hasSeen(id: string): boolean {
  try {
    return window.localStorage.getItem(SEEN_PREFIX + id) === "1";
  } catch {
    // Safari in private mode throws on localStorage rather than returning null. A popup that can't
    // record itself should still show only once per session, which the sessionStorage check and
    // the in-memory state below both still handle.
    return false;
  }
}

function hasSeenThisSession(id: string): boolean {
  try {
    return window.sessionStorage.getItem(SEEN_PREFIX + id) === "1";
  } catch {
    return false;
  }
}

function markSeen(id: string) {
  try {
    window.localStorage.setItem(SEEN_PREFIX + id, "1");
    window.sessionStorage.setItem(SEEN_PREFIX + id, "1");
    window.localStorage.setItem(DAY_PREFIX + id, today());
  } catch {
    /* an unwritable store is not worth breaking the close button over */
  }
}

/** Local calendar day, not 24h since last seen — "once a day" should mean what a person means by
 *  it, so a greeting at 11pm does not block the next morning's. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function hasSeenToday(id: string): boolean {
  try {
    return window.localStorage.getItem(DAY_PREFIX + id) === today();
  } catch {
    return false;
  }
}

/** Has this person already had their fill of this popup? */
function isSatisfied(id: string, frequency: PopupFrequency): boolean {
  if (frequency === "always") return false;
  if (frequency === "session") return hasSeenThisSession(id);
  if (frequency === "daily") return hasSeenToday(id);
  return hasSeen(id);
}

/**
 * Server-computed values a popup's copy can refer to, as {name}.
 *
 * POPUPS stays the single place a campaign is defined — the alternative was one entry per plan
 * ("granted-starter", "granted-pro", ...), which is four copies of the same popup drifting apart
 * the first time someone edits one of them.
 */
function fill(text: string | undefined, vars: Record<string, string>): string | undefined {
  if (!text) return text;
  return text.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
}

export function PopupHost({ audience, vars = {} }: { audience: AudienceTag[]; vars?: Record<string, string> }) {
  const pathname = usePathname();
  const mounted = useMounted();
  // Closed this session: covers the private-mode case where nothing can be persisted, and stops a
  // popup reappearing when its CTA navigates to another route inside the same shell.
  const [closedThisSession, setClosedThisSession] = useState<string[]>([]);

  // First match only: two modals over a dashboard is never what was intended, so the array's order
  // is the priority order.
  const active = mounted
    ? POPUPS.find((p) => {
        const frequency = p.rules?.frequency ?? "once";
        if (closedThisSession.includes(p.id)) return false;
        if (isSatisfied(p.id, frequency)) return false;
        return isEligible(p, pathname, new Date(), audience);
      }) ?? null
    : null;

  const close = useCallback(() => {
    if (!active) return;
    markSeen(active.id);
    setClosedThisSession((ids) => [...ids, active.id]);
  }, [active]);

  if (!active) return null;
  // Interpolated at the last moment so POPUPS itself stays a plain, readable list of copy.
  const filled = {
    ...active,
    headerAccent: fill(active.headerAccent, vars),
    header: fill(active.header, vars) ?? active.header,
    subheader: fill(active.subheader, vars) ?? active.subheader,
    ps: fill(active.ps, vars),
    cta: { ...active.cta, label: fill(active.cta.label, vars) ?? active.cta.label },
  };
  return <PopupModal popup={filled} onClose={close} />;
}
