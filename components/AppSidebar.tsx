"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PartnerApplicationModal } from "./PartnerApplicationModal";
import { HomeIcon, ChatBubbleIcon, TableIcon, WhatsAppIcon, PartnerIcon, SettingsIcon } from "./icons";

type ChatSummary = { id: string; title: string };

const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/chat", label: "Chat", icon: ChatBubbleIcon },
  { href: "/lms", label: "LMS", icon: TableIcon },
] as const;

export function AppSidebar({ name, email }: { name: string | null; email: string }) {
  const pathname = usePathname();
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [chats, setChats] = useState<ChatSummary[]>([]);

  useEffect(() => {
    fetch("/api/chats")
      .then((r) => r.json())
      .then((data: { chats?: ChatSummary[] }) => setChats(data.chats ?? []))
      .catch(() => {});
  }, [pathname]);

  return (
    <>
      <aside
        style={{
          width: 240,
          flexShrink: 0,
          height: "100vh",
          position: "sticky",
          top: 0,
          display: "flex",
          flexDirection: "column",
          background: "var(--g-white)",
          borderRight: "1px solid var(--g-border)",
          padding: "20px 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "4px 8px 22px" }}>
          <Image src="/mantis-logo-wordmark.png" alt="mantis" width={130} height={31} style={{ objectFit: "contain", height: "auto" }} priority />
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            const Icon = item.icon;
            const color = active ? "var(--g-green-text)" : "var(--g-ink-soft)";
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 10px",
                  borderRadius: "var(--radius-sm)",
                  textDecoration: "none",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color,
                  background: active ? "var(--g-green-mint)" : "transparent",
                }}
              >
                <Icon color={color} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--g-gray-500)", textTransform: "uppercase", letterSpacing: "0.04em", padding: "0 10px 8px" }}>
            Your chats
          </div>
          {chats.length === 0 ? (
            <div style={{ padding: "10px", fontSize: 12.5, color: "var(--g-gray-500)" }}>No chats yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {chats.map((c) => {
                const active = pathname === `/chat/${c.id}`;
                return (
                  <Link
                    key={c.id}
                    href={`/chat/${c.id}`}
                    style={{
                      display: "block",
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      textDecoration: "none",
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: active ? "var(--g-green-text)" : "var(--g-ink-soft)",
                      background: active ? "var(--g-green-mint)" : "transparent",
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

        <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 10, borderTop: "1px solid var(--g-border)" }}>
          <a
            href="https://wa.me/"
            target="_blank"
            rel="noreferrer"
            style={sidebarUtilityLink}
          >
            <WhatsAppIcon color="var(--g-ink-soft)" /> WhatsApp
          </a>
          <button type="button" onClick={() => setPartnerOpen(true)} style={{ ...sidebarUtilityLink, border: "none", background: "none", cursor: "pointer", width: "100%", textAlign: "left" }}>
            <PartnerIcon color="var(--g-ink-soft)" /> Partner with us
          </button>
          <Link href="/profile" style={sidebarUtilityLink}>
            <SettingsIcon color="var(--g-ink-soft)" /> Settings
          </Link>

          <Link
            href="/profile"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px",
              marginTop: 8,
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "var(--g-green-mint)",
                color: "var(--g-green-text)",
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
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {name || email}
              </div>
              <div style={{ fontSize: 11, color: "var(--g-gray-500)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>
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
  padding: "9px 10px",
  borderRadius: "var(--radius-sm)",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--g-ink-soft)",
};
