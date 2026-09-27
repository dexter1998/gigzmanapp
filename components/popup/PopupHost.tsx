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
  } catch {
    /* an unwritable store is not worth breaking the close button over */
  }
}

/** Has this person already had their fill of this popup? */
function isSatisfied(id: string, frequency: PopupFrequency): boolean {
  if (frequency === "always") return false;
  if (frequency === "session") return hasSeenThisSession(id);
  return hasSeen(id);
}

export function PopupHost({ audience }: { audience: AudienceTag[] }) {
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
  return <PopupModal popup={active} onClose={close} />;
}
