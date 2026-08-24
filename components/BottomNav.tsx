"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/home", label: "Home", icon: PinIcon },
  { href: "/lms", label: "LMS", icon: BriefcaseIcon },
  { href: "/profile", label: "Profile", icon: PersonIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 6,
        background: "var(--g-white)",
        borderRadius: "var(--radius-pill)",
        padding: "14px 22px",
        boxShadow: "var(--shadow-toolbar)",
        zIndex: 100,
      }}
    >
      {TABS.map((tab) => {
        const active = pathname?.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "2px 20px",
              textDecoration: "none",
              color: active ? "var(--g-green)" : "var(--g-gray-500)",
            }}
          >
            <Icon color={active ? "var(--g-green)" : "var(--g-gray-500)"} filled={!!active} />
            <span style={{ fontSize: 11, fontWeight: 700 }}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

type IconProps = { color: string; filled: boolean };

function PinIcon({ color, filled }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" fill={filled ? "var(--g-white)" : "none"} />
    </svg>
  );
}

function BriefcaseIcon({ color, filled }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function PersonIcon({ color, filled }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}
