"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PartnerApplicationModal } from "./PartnerApplicationModal";
import { openStickly } from "./SticklyScript";
import { HomeIcon, ChatBubbleIcon, TableIcon, WhatsAppIcon, PartnerIcon, SettingsIcon, UserIcon, GiftIcon } from "./icons";

type ChatSummary = { id: string; title: string };

const LEADS_NAV = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/chat", label: "Chat", icon: ChatBubbleIcon },
  { href: "/my-leads", label: "Leads", icon: TableIcon },
] as const;

/** Same three-slot shape as leads mode: a map, a working surface, and a saved list. */
const JOBS_NAV = [
  { href: "/jobs/map", label: "Jobs", icon: HomeIcon },
  { href: "/jobs/applications", label: "Applications", icon: TableIcon },
  { href: "/jobs/profile", label: "Job profile", icon: UserIcon },
] as const;

export function AppSidebar({ name, email }: { name: string | null; email: string }) {
  const pathname = usePathname();
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

  const isJobsMode = mode === "jobs";
  const NAV_ITEMS = isJobsMode ? JOBS_NAV : LEADS_NAV;

  return (
    <>
      <aside
        className="rule-r"
        style={{
          width: 240,
          flexShrink: 0,
          height: "100vh",
          position: "sticky",
          top: 0,
          display: "flex",
          flexDirection: "column",
          background: "var(--surface)",
          padding: "16px 12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "4px 6px 18px" }}>
          <Image src="/mantis-logo-wordmark.png" alt="mantis" width={130} height={31} style={{ objectFit: "contain", height: "auto" }} priority />
        </div>

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
            // The row's colours and its active marker now come from `.nav-row` in globals.css, so
            // the icon just follows the text rather than carrying its own active palette.
            const color = active ? "var(--ink)" : "var(--ink-muted)";
            return (
              <Link
                key={item.href}
                href={item.href}
                className="nav-row"
                data-on={active ? "true" : "false"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  textDecoration: "none",
                  fontSize: 13.5,
                }}
              >
                <Icon color={color} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Chat threads are a leads-mode surface — the chat planner only knows lead intents, so
            listing threads in jobs mode would offer a tool that cannot answer a jobs question. */}
        <div style={{ marginTop: 20, display: isJobsMode ? "none" : undefined }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 10px 6px" }}>
            Your chats
          </div>
          {chats.length === 0 ? (
            <div style={{ padding: "8px 10px", fontSize: 12.5, color: "var(--ink-faint)" }}>No chats yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {chats.map((c) => {
                const active = pathname === `/chat/${c.id}`;
                return (
                  <Link
                    key={c.id}
                    href={`/chat/${c.id}`}
                    className="nav-row"
                    data-on={active ? "true" : "false"}
                    style={{
                      display: "block",
                      padding: "7px 10px",
                      textDecoration: "none",
                      fontSize: 12.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.title}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        <div className="rule-t" style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 8 }}>
          <a
            href="https://wa.me/"
            target="_blank"
            rel="noreferrer"
            className="nav-row"
            style={sidebarUtilityLink}
          >
            <WhatsAppIcon color="var(--ink-muted)" /> WhatsApp
          </a>
          {/* Above "Partner with us" on purpose: both are ways to get something from us, and this
              one costs the person nothing but a few minutes. */}
          <button
            type="button"
            onClick={openStickly}
            className="nav-row"
            style={{ ...sidebarUtilityLink, border: "none", background: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
          >
            <GiftIcon color="var(--ink-muted)" />
            <span style={{ flex: 1, minWidth: 0 }}>Earn free credits</span>
            <span
              style={{
                flexShrink: 0, fontSize: 9.5, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.05em", padding: "2px 6px", borderRadius: "var(--radius-pill)",
                background: "var(--g-green-mint)", color: "var(--g-green-text)",
              }}
            >
              New
            </span>
          </button>
          <button type="button" onClick={() => setPartnerOpen(true)} className="nav-row" style={{ ...sidebarUtilityLink, border: "none", background: "none", cursor: "pointer", width: "100%", textAlign: "left" }}>
            <PartnerIcon color="var(--ink-muted)" /> Partner with us
          </button>
          <Link href="/profile" className="nav-row" style={sidebarUtilityLink}>
            <SettingsIcon color="var(--ink-muted)" /> Settings
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
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {(name || email).charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
