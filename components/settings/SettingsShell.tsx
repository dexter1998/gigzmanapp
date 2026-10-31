"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { User, Bell, Plug, CreditCard, BarChart3, ChevronLeft, Building2 } from "lucide-react";

/**
 * Settings shell — Origami's settings pattern: the app sidebar steps aside (AppSidebar returns
 * null on these routes) and a grey rail of grouped destinations takes its place, with Back on top.
 *
 * "Back" leaves settings for the page the person came from — not router.back(), which walked
 * through settings' own tabs (Usage → Billing → Profile) before ever getting out. AppSidebar
 * records the last non-settings path (it is mounted on every app page); /home if there is none.
 */

export const LAST_APP_PATH_KEY = "mantis.lastAppPath";

const GROUPS: Array<{ title: string; items: Array<{ href: string; label: string; icon: typeof User }> }> = [
  { title: "Personal", items: [
    { href: "/profile", label: "Profile", icon: User },
    { href: "/preferences", label: "Notifications", icon: Bell },
  ] },
  { title: "Workspace", items: [
    { href: "/settings/business-profiles", label: "Business profiles", icon: Building2 },
    { href: "/integrations", label: "Integrations", icon: Plug },
  ] },
  { title: "Billing", items: [
    { href: "/settings/billing", label: "Billing", icon: CreditCard },
    { href: "/settings/usage", label: "Usage", icon: BarChart3 },
  ] },
];

/** Routes that render inside this shell — AppSidebar hides itself on them. */
export function isSettingsRoute(pathname: string | null): boolean {
  return !!pathname && (pathname === "/profile" || pathname.startsWith("/settings"));
}

export function SettingsShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  return (
    <div className="set-shell">
      <aside className="set-rail">
        <button
          type="button"
          className="set-back"
          onClick={() => {
            let to = "/home";
            try { to = sessionStorage.getItem(LAST_APP_PATH_KEY) || to; } catch { /* storage blocked */ }
            router.push(to);
          }}
        >
          <ChevronLeft size={15} strokeWidth={1.75} /> Back
        </button>
        <h2 className="set-rail-title">Settings</h2>
        {GROUPS.map((g) => (
          <div key={g.title} className="set-group">
            <div className="set-group-label">{g.title}</div>
            <nav>
              {g.items.map((it) => {
                const on = pathname === it.href || pathname.startsWith(`${it.href}/`);
                const Icon = it.icon;
                return (
                  <Link key={it.href} href={it.href} className="set-item" data-on={on ? "true" : "false"}>
                    <Icon size={16} strokeWidth={1.75} /> {it.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </aside>
      <main className="set-main">{children}</main>
    </div>
  );
}

/* ---- page primitives: a serif page title, white cards, label/description left + control right ---- */

export function SettingsPage({ title, sub, children }: { title: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <div className="set-page">
      <h1 className="set-title">{title}</h1>
      {sub && <p className="set-sub">{sub}</p>}
      <div className="set-stack">{children}</div>
    </div>
  );
}

export function SettingsCard({ title, desc, action, children }: { title: string; desc?: ReactNode; action?: ReactNode; children?: ReactNode }) {
  return (
    <section className="set-card">
      <header className="set-card-head">
        <div>
          <h3>{title}</h3>
          {desc && <p>{desc}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function SettingsRow({ label, desc, children }: { label: string; desc?: ReactNode; children?: ReactNode }) {
  return (
    <div className="set-row">
      <div className="set-row-text">
        <div className="set-row-label">{label}</div>
        {desc && <div className="set-row-desc">{desc}</div>}
      </div>
      <div className="set-row-ctl">{children}</div>
    </div>
  );
}
