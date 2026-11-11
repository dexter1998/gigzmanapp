"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import "./marketing-extras.css";

/**
 * The dark band above the marketing nav: one announcement at a time (now NVIDIA Inception).
 * Closing it is remembered per browser under the announcement's own key, so the next one shows
 * again without anyone clearing storage. Renders open on the server and hides after mount only if
 * it was closed before — the bar never flashes in for people who have not dismissed it.
 */
const KEY = "mantis:announce:nvidia-inception";

const subscribe = (cb: () => void) => { window.addEventListener("storage", cb); return () => window.removeEventListener("storage", cb); };
const closedBefore = () => { try { return localStorage.getItem(KEY) === "closed"; } catch { return false; } };

export function AnnouncementBar() {
  const stored = useSyncExternalStore(subscribe, closedBefore, () => false);
  const [closedNow, setClosedNow] = useState(false);
  if (stored || closedNow) return null;
  const close = () => {
    setClosedNow(true);
    try { localStorage.setItem(KEY, "closed"); } catch { /* nothing to remember it in */ }
  };

  return (
    <div className="mk-announce" role="region" aria-label="Announcement">
      <div className="mk-announce-in">
        <span className="mk-announce-new">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2l2.6 6.6L21 9.3l-5 4.4 1.5 6.8L12 17l-5.5 3.5L8 13.7 3 9.3l6.4-.7z" />
          </svg>
          New
        </span>
        <span className="mk-announce-badge">
          <Image src="/marketing/nvidia-inception-badge.svg" alt="NVIDIA Inception Program" width={88} height={38} />
        </span>
        <p className="mk-announce-text">
          <strong>Mantis Ai is now part of NVIDIA Inception</strong>
          <span className="mk-announce-sep" aria-hidden="true">—</span>
          <em>the program for startups building with AI</em>
        </p>
        <Link href="/resources/mantis-joins-nvidia-inception" className="mk-announce-cta">
          Read more
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </Link>
        <button type="button" className="mk-announce-close" onClick={close} aria-label="Close announcement">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
    </div>
  );
}
