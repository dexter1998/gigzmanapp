"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isSettingsRoute, LAST_APP_PATH_KEY } from "@/components/settings/SettingsShell";
import { PartnerApplicationModal } from "./PartnerApplicationModal";
import { openStickly } from "./SticklyScript";
import { HomeIcon, TableIcon, PartnerIcon, SettingsIcon, UserIcon, GiftIcon } from "./icons";
import { Send, Inbox, BarChart3, LayoutTemplate, Plug } from "lucide-react";
import { SidebarChatRow, type SidebarChat } from "./SidebarChatRow";
import { useNavBadges, useTitleCount } from "./nav-badges/useNavBadges";
import { badgeText, type NavSection } from "@/lib/nav-sections";
import "./nav-badges/nav-badges.css";

/** Which nav item shows which count, and how a screen reader says it. */
const BADGE_FOR: Record<string, { section: NavSection; say: (n: string) => string }> = {
  "/inbox": { section: "inbox", say: (n) => `${n} new ${n === "1" ? "reply" : "replies"}` },
  "/my-leads": { section: "leads", say: (n) => `${n} new ${n === "1" ? "lead" : "leads"}` },
  "/campaigns": { section: "campaigns", say: (n) => `${n} campaign ${n === "1" ? "update" : "updates"}` },
};

type ChatSummary = SidebarChat;

const LEADS_NAV = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/my-leads", label: "Leads", icon: TableIcon },
] as const;

const lucideNav = (I: typeof Send) => function NavIcon({ color }: { color?: string }) { return <I size={20} strokeWidth={1.8} color={color} />; };
/** V2: after finding leads come the outreach surfaces (docs/v2-campaigns.md). */
const V2_NAV = [
  ...LEADS_NAV,
  { href: "/campaigns", label: "Campaigns", icon: lucideNav(Send) },
  { href: "/inbox", label: "Inbox", icon: lucideNav(Inbox) },
  { href: "/analytics", label: "Analytics", icon: lucideNav(BarChart3) },
  { href: "/templates", label: "Templates", icon: lucideNav(LayoutTemplate) },
  { href: "/integrations", label: "Integrations", icon: lucideNav(Plug) },
] as const;

/** Same three-slot shape as leads mode: a map, a working surface, and a saved list. */
const JOBS_NAV = [
  { href: "/jobs/map", label: "Jobs", icon: HomeIcon },
  { href: "/jobs/applications", label: "Applications", icon: TableIcon },
  { href: "/jobs/profile", label: "Job profile", icon: UserIcon },
] as const;

// Collapsed state lives in localStorage (a per-browser convenience). Read through
// useSyncExternalStore so the server render (expanded) and the client agree without a setState in
// an effect; the toggle notifies subscribers in this tab directly.
const COLLAPSE_KEY = "mantis.sidebar.collapsed";
const collapseListeners = new Set<() => void>();
function readCollapsed(): boolean {
  try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; }
}
function subscribeCollapsed(cb: () => void) {
  collapseListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => { collapseListeners.delete(cb); window.removeEventListener("storage", cb); };
}
const ico = (d: string) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const CREATE_OPTIONS: Array<{ title: string; desc: string; href: string | null; icon: React.ReactNode }> = [
  { title: "Find leads", desc: "Businesses in an area — with website, email and company LinkedIn.", href: "/chat?start=find",
    icon: ico("M3 5h18v14H3zM3 10h18M3 15h18M9 5v14M15 5v14") },
  { title: "Find and reach out", desc: "Find them, then draft the outreach.", href: null,
    icon: ico("M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z") },
  { title: "Enrich my list", desc: "Bring a CSV of businesses — we add emails and signals.", href: null,
    icon: ico("M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4") },
  { title: "Chat", desc: "Ask anything — plan a search your way.", href: "/chat",
    icon: ico("M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z") },
];

const RECENTS_KEY = "mantis.sidebar.recents";
const PINNED_KEY = "mantis.sidebar.pinned";
function readPinnedOpen(): boolean {
  try { return localStorage.getItem(PINNED_KEY) !== "0"; } catch { return true; }
}
function setPinnedOpen(v: boolean) {
  try { localStorage.setItem(PINNED_KEY, v ? "1" : "0"); } catch {}
  collapseListeners.forEach((cb) => cb());
}
const RECENT_LIMIT = 8;
function readRecentsOpen(): boolean {
  try { return localStorage.getItem(RECENTS_KEY) !== "0"; } catch { return true; }
}
function setRecentsOpen(v: boolean) {
  try { localStorage.setItem(RECENTS_KEY, v ? "1" : "0"); } catch {}
  collapseListeners.forEach((cb) => cb());
}
function setCollapsed(v: boolean) {
  try { localStorage.setItem(COLLAPSE_KEY, v ? "1" : "0"); } catch {}
  collapseListeners.forEach((cb) => cb());
}

/**
 * `v2` comes from the server layout: V2_EMAILS is a server env var, so calling isV2Email() in this
 * client component silently fell back to its default allowlist and showed every new account the
 * old menu after the general launch.
 */
export function AppSidebar({ name, email, v2 }: { name: string | null; email: string; v2: boolean }) {
  const pathname = usePathname();
  const storedCollapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  // The campaign builder needs the width (chat + canvas + editor), so the menu folds itself there
  // without touching the saved preference; the toggle can still open it for this visit.
  const inBuilder = /^\/campaigns\/[0-9a-f-]{36}/i.test(pathname ?? "");
  const [peek, setPeek] = useState<string | null>(null);
  const collapsed = storedCollapsed || (inBuilder && peek !== pathname);
  const recentsOpen = useSyncExternalStore(subscribeCollapsed, readRecentsOpen, () => true);
  const pinnedOpen = useSyncExternalStore(subscribeCollapsed, readPinnedOpen, () => true);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const createRef = useRef<HTMLDivElement | null>(null);

  // The New chat menu closes on an outside click or Escape, like any menu.
  useEffect(() => {
    if (!createOpen) return;
    const onDown = (e: MouseEvent) => { if (!createRef.current?.contains(e.target as Node)) setCreateOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCreateOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [createOpen]);

  // ⇧⌘S (⇧Ctrl+S elsewhere), the same shortcut ChatGPT uses for its sidebar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setCollapsed(!readCollapsed());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [mode, setMode] = useState<"leads" | "jobs">("leads");

  useEffect(() => {
    fetch("/api/chats")
      .then((r) => r.json())
      .then((data: { chats?: ChatSummary[] }) => setChats(data.chats ?? []))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d) => setMode(d?.profile?.dashboard_mode === "jobs" ? "jobs" : "leads"))
      .catch(() => {
        /* falls back to leads — the mode every existing account is already on */
      });
  }, [pathname]);

  // Rename and pin update the list optimistically, then PATCH; a failed save puts the row back.
  async function patchChat(id: string, patch: { title?: string; pinned?: boolean }) {
    const before = chats;
    setChats((cs) => cs.map((c) => c.id !== id ? c : {
      ...c,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.pinned !== undefined ? { pinned_at: patch.pinned ? new Date().toISOString() : null } : {}),
    }));
    try {
      const r = await fetch(`/api/chats/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      if (!r.ok) throw new Error(String(r.status));
      const { chat } = (await r.json()) as { chat: ChatSummary };
      setChats((cs) => cs.map((c) => (c.id === id ? { ...c, title: chat.title, pinned_at: chat.pinned_at } : c)));
    } catch {
      setChats(before);
    }
  }
  const pinnedChats = chats.filter((c) => c.pinned_at)
    .sort((a, b) => Date.parse(b.pinned_at as string) - Date.parse(a.pinned_at as string));
  const recentChats = chats.filter((c) => !c.pinned_at);
  const renderRow = (c: ChatSummary) => (
    <SidebarChatRow key={c.id} chat={c} active={pathname === `/chat/${c.id}`} unread={unreadChats.has(c.id)}
      onRename={(id, title) => patchChat(id, { title })}
      onTogglePin={(id, pinned) => patchChat(id, { pinned })} />
  );

  const isJobsMode = mode === "jobs";
  const NAV_ITEMS = isJobsMode ? JOBS_NAV : v2 ? V2_NAV : LEADS_NAV;

  // Notification counts: every counted surface is V2 and leads-mode (lib/nav-badges.ts).
  const badges = useNavBadges(pathname, !isJobsMode && v2);
  const unreadChats = new Set(badges?.chatIds ?? []);
  useTitleCount(badges ? badges.inbox + badges.leads + badges.campaigns + badges.chat : 0);
  // A section heading counts the unread chats you cannot see right now (folded, or past "All recent").
  const hiddenUnread = (list: ChatSummary[], open: boolean, limit = Infinity) =>
    list.filter((c, i) => unreadChats.has(c.id) && (!open || i >= limit)).length;
  const pinnedHidden = hiddenUnread(pinnedChats, pinnedOpen);
  const recentHidden = hiddenUnread(recentChats, recentsOpen, showAllRecent ? Infinity : RECENT_LIMIT);
  const headCount = (n: number) => n > 0 && (
    <span className="nb-pill" data-quiet="" aria-label={`${n} ${n === 1 ? "chat" : "chats"} with new results`}>{badgeText(n)}</span>
  );

  // Where settings' "Back" returns to: the last page outside settings.
  useEffect(() => {
    if (!pathname || isSettingsRoute(pathname)) return;
    try { sessionStorage.setItem(LAST_APP_PATH_KEY, pathname + window.location.search); } catch { /* storage blocked */ }
  }, [pathname]);

  // Settings brings its own rail (components/settings/SettingsShell.tsx) — two sidebars side by
  // side is what Origami avoids, so the app nav steps aside there.
  if (isSettingsRoute(pathname)) return null;

  return (
    <>
      <aside
        className="rule-r app-sidebar"
        data-collapsed={collapsed ? "" : undefined}
        style={{
          flexShrink: 0,
          height: "100vh",
          position: "sticky",
          top: 0,
          display: "flex",
          flexDirection: "column",
          background: "var(--surface)",
          padding: "12px 12px 16px",
        }}
      >
        {/* Header, ChatGPT-style: wordmark left, panel toggle right; collapsed, the toggle alone
            heads the icon rail. */}
        <div className="sb-head">
          <Link href="/home" className="sb-logo" aria-label="Mantis home">
            <Image src="/mantis-logo-wordmark.png" alt="mantis" width={130} height={31} style={{ objectFit: "contain", objectPosition: "left", height: "auto" }} priority />
          </Link>
          <button type="button" className="sb-toggle" onClick={() => (inBuilder && !storedCollapsed ? setPeek(peek === pathname ? null : pathname) : setCollapsed(!collapsed))} aria-label="Toggle sidebar">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="4" />
              <path d="M9 4v16" />
            </svg>
            <span className="sb-tip" role="tooltip">Toggle sidebar <kbd>⇧⌘S</kbd></span>
          </button>
        </div>

        {/* Origami-style primary action: "New chat" opens a menu of ways to start. Options that are
            not built yet are shown disabled as "Soon" rather than leading nowhere. */}
        {!isJobsMode && (
          <div className="sb-create-wrap" ref={createRef}>
            <button type="button" className="sb-create" onClick={() => setCreateOpen((o) => !o)} aria-expanded={createOpen} aria-haspopup="menu" title="New chat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
              <span className="sb-label">New chat</span>
            </button>
            {createOpen && (
              <div className="sb-create-menu" role="menu">
                {CREATE_OPTIONS.map((o) =>
                  o.href ? (
                    <Link key={o.title} href={o.href} role="menuitem" className="sb-create-item" onClick={() => setCreateOpen(false)}>
                      <span className="sb-create-icon" aria-hidden>{o.icon}</span>
                      <span><span className="sb-create-title">{o.title}</span><span className="sb-create-desc">{o.desc}</span></span>
                    </Link>
                  ) : (
                    <div key={o.title} role="menuitem" aria-disabled className="sb-create-item disabled">
                      <span className="sb-create-icon" aria-hidden>{o.icon}</span>
                      <span><span className="sb-create-title">{o.title} <span className="sb-soon">Soon</span></span><span className="sb-create-desc">{o.desc}</span></span>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        )}

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map((item) => {
            // Exact match for the mode's root ("/jobs/map"), prefix match for the rest. A plain
            // startsWith would light up "Jobs" while you are on /jobs/applications, marking two
            // items active at once.
            const active =
              item.href === "/jobs/map" || item.href === "/home"
                ? pathname === item.href
                : pathname?.startsWith(item.href);
            const Icon = item.icon;
            // Origami-style: the selected row's ICON takes the accent; its label keeps the ink colour.
            const color = active ? "var(--g-green-dark, #3f6f12)" : "var(--ink-muted)";
            const b = BADGE_FOR[item.href];
            const n = b && badges ? badges[b.section] : 0;
            const said = n > 0 ? b.say(badgeText(n)) : null;
            return (
              <Link key={item.href} href={item.href} className="nav-row sb-row" data-on={active ? "true" : "false"}
                title={said ? `${item.label} — ${said}` : item.label} aria-label={said ? `${item.label}, ${said}` : undefined}>
                <span className="nb-icon"><Icon color={color} />{n > 0 && <span className="nb-dot" aria-hidden />}</span>
                <span className="sb-label">{item.label}</span>
                {n > 0 && <span key={n} className="nb-pill" aria-hidden>{badgeText(n)}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Pinned chats (ChatGPT-style), newest pin first, above Recent. Hidden when nothing is pinned. */}
        {pinnedChats.length > 0 && (
          <div className="sb-chats-section" style={{ display: isJobsMode ? "none" : "flex", flex: "0 0 auto" }}>
            <button type="button" className="sb-section-head" onClick={() => setPinnedOpen(!pinnedOpen)} aria-expanded={pinnedOpen}>
              Pinned
              {headCount(pinnedHidden)}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                style={{ transform: pinnedOpen ? undefined : "rotate(-90deg)", transition: "transform 0.15s" }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {pinnedOpen && <div className="sidebar-chats">{pinnedChats.map(renderRow)}</div>}
          </div>
        )}

        {/* Recent chats, Origami-style: a collapsible RECENT header, the latest few, then "All
            recent". Chat threads are a leads-mode surface, so jobs mode has none. Each row has
            ChatGPT-style hover actions (pin, "…" menu with Rename) — components/SidebarChatRow.tsx. */}
        <div className="sb-chats-section" style={{ display: isJobsMode ? "none" : "flex" }}>
          <button type="button" className="sb-section-head" onClick={() => setRecentsOpen(!recentsOpen)} aria-expanded={recentsOpen}>
            Recent
            {headCount(recentHidden)}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden
              style={{ transform: recentsOpen ? undefined : "rotate(-90deg)", transition: "transform 0.15s" }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {recentsOpen && (recentChats.length === 0 ? (
            <div style={{ padding: "6px 10px", fontSize: 12, color: "var(--ink-faint)" }}>{chats.length === 0 ? "No chats yet" : "No other chats"}</div>
          ) : (
            <div className="sidebar-chats">
              {(showAllRecent ? recentChats : recentChats.slice(0, RECENT_LIMIT)).map(renderRow)}
              {recentChats.length > RECENT_LIMIT && (
                <button type="button" className="sb-all-recent" onClick={() => setShowAllRecent(!showAllRecent)}>
                  {showAllRecent ? "Show less" : "All recent"}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                    style={{ transform: showAllRecent ? "rotate(-90deg)" : undefined }}>
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <div className="rule-t" style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 8, flexShrink: 0 }}>
          {/* Above "Partner with us" on purpose: both are ways to get something from us, and this
              one costs the person nothing but a few minutes. */}
          <button
            type="button"
            onClick={openStickly}
            className="nav-row"
            style={{ ...sidebarUtilityLink, border: "none", background: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
          >
            <GiftIcon color="var(--ink-muted)" />
            <span className="sb-label" style={{ flex: 1, minWidth: 0 }}>Earn free credits</span>
            <span
              className="sb-label"
              style={{
                flexShrink: 0, fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "0.05em", padding: "2px 6px", borderRadius: "var(--radius-pill)",
                background: "var(--g-ink)", color: "#fff",
              }}
            >
              New
            </span>
          </button>
          <button type="button" onClick={() => setPartnerOpen(true)} className="nav-row" style={{ ...sidebarUtilityLink, border: "none", background: "none", cursor: "pointer", width: "100%", textAlign: "left" }}>
            <PartnerIcon color="var(--ink-muted)" /> <span className="sb-label">Partner with us</span>
          </button>
          <Link href="/profile" className="nav-row" style={sidebarUtilityLink}>
            <SettingsIcon color="var(--ink-muted)" /> <span className="sb-label">Settings</span>
          </Link>

          <Link
            href="/profile"
            className="nav-row"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              marginTop: 6,
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "var(--surface-sunk)",
                color: "var(--ink-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {(name || email).charAt(0).toUpperCase()}
            </div>
            <div className="sb-label" style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {name || email}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>
            </div>
          </Link>
        </div>
      </aside>

      <PartnerApplicationModal open={partnerOpen} onClose={() => setPartnerOpen(false)} />
    </>
  );
}

const sidebarUtilityLink: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  textDecoration: "none",
  fontSize: 13,
};
