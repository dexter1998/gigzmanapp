"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { POPUPS, isEligible, isGreeting, type AudienceTag, type PopupFrequency } from "@/lib/popups";
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

/**
 * Has this person already had their fill of this popup?
 *
 * `server` is the account's own record, and it is the authority for the two frequencies that are
 * about a PERSON: "once" and "daily". localStorage stays in the check as well, but only as a
 * same-device shortcut — on its own it made "once" mean "once per browser profile", which is how
 * the 500-credit popup came back on a new profile and how a second user on a shared browser was
 * blocked from one they had never seen.
 *
 * "session" and "always" stay purely local: a tab is not an account, and the server has no opinion
 * about it.
 */
function isSatisfied(
  id: string,
  frequency: PopupFrequency,
  server: { seenIds: string[]; seenTodayIds: string[] },
): boolean {
  if (frequency === "always") return false;
  if (frequency === "session") return hasSeenThisSession(id);
  if (frequency === "daily") return server.seenTodayIds.includes(id) || hasSeenToday(id);
  return server.seenIds.includes(id) || hasSeen(id);
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

export function PopupHost({
  audience,
  vars = {},
  seenIds = [],
  seenTodayIds = [],
  otherSeenToday = false,
}: {
  audience: AudienceTag[];
  vars?: Record<string, string>;
  /** Popup ids this ACCOUNT has ever seen, and the subset seen today. Both come from the server. */
  seenIds?: string[];
  seenTodayIds?: string[];
  /** True when a non-greeting popup has already been shown to this account today. */
  otherSeenToday?: boolean;
}) {
  const pathname = usePathname();
  const mounted = useMounted();
  // Closing a non-greeting popup has to suppress the greeting straight away. The server flag was
  // computed before that close happened, so the decision is held here for the rest of the session
  // too -- otherwise dismissing the credit popup would reveal "Welcome back!" on the next render,
  // which is the exact pair this is meant to prevent.
  const [otherClosedNow, setOtherClosedNow] = useState(false);
  // Closed this session: covers the private-mode case where nothing can be persisted, and stops a
  // popup reappearing when its CTA navigates to another route inside the same shell.
  const [closedThisSession, setClosedThisSession] = useState<string[]>([]);

  // First match only: two modals over a dashboard is never what was intended, so the array's order
  // is the priority order.
  const suppressGreetings = otherSeenToday || otherClosedNow;

  const active = mounted
    ? POPUPS.find((p) => {
        const frequency = p.rules?.frequency ?? "once";
        if (closedThisSession.includes(p.id)) return false;
        if (suppressGreetings && isGreeting(p.id)) return false;
        if (isSatisfied(p.id, frequency, { seenIds, seenTodayIds })) return false;
        return isEligible(p, pathname, new Date(), audience);
      }) ?? null
    : null;

  const close = useCallback(() => {
    if (!active) return;
    markSeen(active.id);
    setClosedThisSession((ids) => [...ids, active.id]);
    if (!isGreeting(active.id)) setOtherClosedNow(true);
    // Fire and forget: the local mark above has already hidden it, and a failed write means the
    // popup reappears on another device later -- annoying, never wrong.
    void fetch("/api/popups/seen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: active.id }),
      keepalive: true,
    }).catch(() => {});
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
