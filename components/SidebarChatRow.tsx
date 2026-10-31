"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import "./sidebar-chats.css";

export type SidebarChat = { id: string; title: string; pinned_at?: string | null };

export const CHAT_TITLE_MAX = 80;

const PinIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 4h6l-1 6 3 3v2H7v-2l3-3-1-6z" />
    <path d="M12 15v5" fill="none" />
  </svg>
);
const DotsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" />
  </svg>
);
const PencilIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
  </svg>
);

/**
 * One chat in the sidebar's Pinned / Recent lists, ChatGPT-style: the row highlights on hover and
 * shows a pin toggle and a "…" menu (Rename, Pin/Unpin). Rename edits the title in place — Enter or
 * blur saves, Escape cancels. There is no Delete: a chat's v2 runs cascade with it, so deleting is
 * not a one-click sidebar action.
 */
export function SidebarChatRow({
  chat, active, unread = false, onRename, onTogglePin,
}: {
  chat: SidebarChat;
  active: boolean;
  /** A run finished in this chat since you last opened it (components/nav-badges). */
  unread?: boolean;
  onRename: (id: string, title: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
}) {
  const pinned = !!chat.pinned_at;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chat.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const moreRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Escape sets this so the blur that follows the input unmounting does not save the draft.
  const cancelled = useRef(false);

  // The list scrolls (overflow: auto), so the menu is fixed-positioned off the "…" button instead of
  // absolutely inside the row, where it would be clipped.
  useLayoutEffect(() => {
    if (!menuOpen || !moreRef.current) return;
    const r = moreRef.current.getBoundingClientRect();
    const width = 180;
    const left = Math.min(r.left, window.innerWidth - width - 8);
    const top = r.bottom + 4 + 96 > window.innerHeight ? r.top - 4 - 96 : r.bottom + 4;
    setMenuPos({ top, left: Math.max(8, left) });
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !moreRef.current?.contains(t)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMenuOpen(false); moreRef.current?.focus(); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
        const i = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length];
        next?.focus();
        e.preventDefault();
      }
    };
    const close = () => setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (editing) { inputRef.current?.focus(); inputRef.current?.select(); }
  }, [editing]);

  function startRename() {
    setMenuOpen(false);
    cancelled.current = false;
    setDraft(chat.title);
    setEditing(true);
  }
  function commit() {
    if (cancelled.current) { cancelled.current = false; return; }
    setEditing(false);
    const next = draft.replace(/\s+/g, " ").trim().slice(0, CHAT_TITLE_MAX);
    if (next && next !== chat.title.replace(/\s+/g, " ").trim()) onRename(chat.id, next);
  }

  if (editing) {
    return (
      <div className="nav-row sb-recent sbc-row" data-on={active ? "true" : "false"} data-editing="">
        <input
          ref={inputRef}
          className="sbc-input"
          value={draft}
          maxLength={CHAT_TITLE_MAX}
          aria-label="Chat name"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") { e.preventDefault(); cancelled.current = true; setEditing(false); }
          }}
        />
      </div>
    );
  }

  return (
    <div className="nav-row sb-recent sbc-row" data-on={active ? "true" : "false"} data-menu={menuOpen ? "" : undefined} data-unread={unread ? "" : undefined}>
      <Link href={`/chat/${chat.id}`} className="sbc-link" title={chat.title} aria-current={active ? "page" : undefined}
        aria-label={unread ? `${chat.title} — new results` : undefined}
        onDoubleClick={(e) => { e.preventDefault(); startRename(); }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden style={{ flex: "none", opacity: 0.7 }}>
          <path d="M4 5h16v11H9l-5 4V5z" />
        </svg>
        <span className="sb-recent-title">{chat.title}</span>
        {unread && <span className="sbc-unread" aria-hidden />}
      </Link>
      <div className="sbc-actions">
        <button type="button" className="sbc-btn" data-pinned={pinned ? "" : undefined}
          aria-label={pinned ? `Unpin ${chat.title}` : `Pin ${chat.title}`} title={pinned ? "Unpin" : "Pin"}
          aria-pressed={pinned}
          onClick={() => onTogglePin(chat.id, !pinned)}>
          <PinIcon filled={pinned} />
        </button>
        <button type="button" ref={moreRef} className="sbc-btn" aria-label={`More options for ${chat.title}`} title="More"
          aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
          <DotsIcon />
        </button>
      </div>
      {menuOpen && (
        <div ref={menuRef} className="sbc-menu" role="menu" aria-label={`Options for ${chat.title}`}
          style={{ top: menuPos?.top ?? -9999, left: menuPos?.left ?? -9999 }}>
          <button type="button" role="menuitem" className="sbc-menu-item" onClick={startRename}>
            <PencilIcon /> Rename
          </button>
          <button type="button" role="menuitem" className="sbc-menu-item"
            onClick={() => { setMenuOpen(false); onTogglePin(chat.id, !pinned); }}>
            <PinIcon /> {pinned ? "Unpin" : "Pin"}
          </button>
        </div>
      )}
    </div>
  );
}
