"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { UserIcon, BellIcon, PartnerIcon, TableIcon, ChevronRightIcon } from "@/components/icons";

/**
 * Settings shell — a left rail of grouped destinations beside the active panel.
 *
 * "Go Back" uses router.back() rather than a fixed href because settings is entered from several
 * places (the sidebar, the credits pill, an out-of-credits prompt mid-search), and sending
 * everyone to /home would strand the person who was halfway through something.
 */

const GROUPS: Array<{ title: string; items: Array<{ href: string; label: string; icon: typeof UserIcon }> }> = [
  {
    title: "Account",
    items: [
      { href: "/profile", label: "Profile", icon: UserIcon },
      { href: "/preferences", label: "Notifications", icon: BellIcon },
    ],
  },
  {
    title: "Billing",
    items: [
      { href: "/settings/billing", label: "Billing", icon: TableIcon },
      { href: "/settings/usage", label: "Usage", icon: PartnerIcon },
    ],
  },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--g-cream)" }} className="settings-shell">
      <aside
        style={{
          width: 232,
          flexShrink: 0,
          background: "var(--surface)",
          padding: "20px 12px",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
        }}
        className="settings-rail rule-r"
      >
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            padding: "6px 8px",
            cursor: "pointer",
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--g-ink-soft)",
            fontFamily: "inherit",
            marginBottom: 22,
          }}
        >
          <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
            <ChevronRightIcon size={13} color="var(--g-ink-soft)" />
          </span>
          Go Back
        </button>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--g-ink)", margin: "0 8px 20px" }}>
          Settings
        </h2>

        {GROUPS.map((group) => (
          <div key={group.title} style={{ marginBottom: 22 }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--ink-faint)",
                padding: "0 10px 6px",
              }}
            >
              {group.title}
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
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
          </div>
        ))}
      </aside>

      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  );
}
