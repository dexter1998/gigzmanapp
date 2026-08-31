"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, React.ReactNode> = {
  overview: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.6c2.3.1 4.2 1.5 4.9 4"/></svg>,
  economics: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15l3.2-3.8 2.6 2 4.2-5.4"/></svg>,
  mailing: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/></svg>,
  pseo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-3.8-3.8"/></svg>,
  health: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h4l2.5-6 4 12 2.5-6h5"/></svg>,
  inbound: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 13l3-8h12l3 8"/><path d="M3 13v6h18v-6"/><path d="M3 13h5l2 3h4l2-3h5"/></svg>,
};

const NAV: { group: string; items: { href: string; label: string; icon: string }[] }[] = [
  { group: "Analysis", items: [
    { href: "/admin", label: "Overview", icon: "overview" },
    { href: "/admin/users", label: "Users", icon: "users" },
    { href: "/admin/economics", label: "Economics", icon: "economics" },
    { href: "/admin/inbound", label: "Inbound", icon: "inbound" },
  ]},
  { group: "Systems", items: [
    { href: "/admin/mailing", label: "Mailing", icon: "mailing" },
    { href: "/admin/pseo", label: "pSEO", icon: "pseo" },
    { href: "/admin/health", label: "Health & Logs", icon: "health" },
  ]},
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="adm-nav">
      {NAV.map(({ group, items }) => (
        <div key={group} style={{ display: "contents" }}>
          <div className="adm-nav-label">{group}</div>
          {items.map(({ href, label, icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={active ? "active" : undefined}>
                {ICONS[icon]}{label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
