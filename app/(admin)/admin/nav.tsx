"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollapsibleGroup } from "./primitives";

const ICONS: Record<string, React.ReactNode> = {
  overview: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.6c2.3.1 4.2 1.5 4.9 4"/></svg>,
  economics: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15l3.2-3.8 2.6 2 4.2-5.4"/></svg>,
  mailing: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/></svg>,
  pseo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-3.8-3.8"/></svg>,
  health: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h4l2.5-6 4 12 2.5-6h5"/></svg>,
  inbound: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 13l3-8h12l3 8"/><path d="M3 13v6h18v-6"/><path d="M3 13h5l2 3h4l2-3h5"/></svg>,
  campaigns: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11l18-7-7 18-3-8-8-3z"/></svg>,
  jobs: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7"/><path d="M3 12h18"/></svg>,
};

// Five to seven top-level destinations, grouped into subordinate, collapsible sections —
// each product surface gets its own group so a brand-new one (Jobs) reads as a peer of Analysis,
// not a buried sub-item.
const NAV: { group: string; storageKey: string; items: { href: string; label: string; icon: string }[] }[] = [
  { group: "Analysis", storageKey: "adm-nav-analysis", items: [
    { href: "/admin", label: "Overview", icon: "overview" },
    { href: "/admin/users", label: "Users", icon: "users" },
    { href: "/admin/economics", label: "Economics", icon: "economics" },
    { href: "/admin/inbound", label: "Inbound", icon: "inbound" },
  ]},
  { group: "Jobs mode", storageKey: "adm-nav-jobs", items: [
    { href: "/admin/jobs", label: "Jobs ops", icon: "jobs" },
  ]},
  { group: "Systems", storageKey: "adm-nav-systems", items: [
    { href: "/admin/mailing", label: "Mailing", icon: "mailing" },
    { href: "/admin/pseo", label: "pSEO", icon: "pseo" },
    { href: "/admin/health", label: "Health & Logs", icon: "health" },
  ]},
];

// Separate from NAV/active-highlighting on purpose: this leaves the read-only console into the
// mutating one (a different route group, its own gate), so it's never rendered as just another
// analysis tab — the distinct color is the same "this one sends real email" signal as its rail.
const CAMPAIGNS_LINK = { href: "/admin-campaigns", label: "Campaigns (sends email)", icon: "campaigns" };

const RAIL_COLLAPSE_KEY = "adm-rail-collapsed";

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(RAIL_COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(RAIL_COLLAPSE_KEY, next ? "1" : "0"); } catch { /* ignore */ }
  }

  return (
    <aside className={cn("adm-rail", collapsed && "is-collapsed")}>
      <div className="adm-rail-brand">
        <span className="name">Mantis</span>
        {!collapsed && <span className="tag">Admin</span>}
      </div>

      <nav className={cn("adm-nav", collapsed && "is-collapsed")}>
        {NAV.map(({ group, storageKey, items }) => {
          const link = (href: string, label: string, icon: string) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={active ? "active" : undefined} title={collapsed ? label : undefined}>
                {ICONS[icon]}<span className="adm-nav-text">{label}</span>
              </Link>
            );
          };

          if (collapsed) {
            // Icon rail: groups no longer mean anything visually, so skip the collapsible
            // machinery and just stack every item — a divider marks each former group.
            return (
              <div key={group} className="adm-nav-rail-group">
                {items.map((it) => link(it.href, it.label, it.icon))}
              </div>
            );
          }

          return (
            <CollapsibleGroup key={group} label={group} storageKey={storageKey}>
              {items.map((it) => link(it.href, it.label, it.icon))}
            </CollapsibleGroup>
          );
        })}
      </nav>

      <div className="adm-nav-foot">
        <div className={cn("adm-nav-outreach", collapsed && "is-collapsed")}>
          {!collapsed && <div className="adm-nav-label">Outreach</div>}
          <a href={CAMPAIGNS_LINK.href} className="mut-link" title={collapsed ? CAMPAIGNS_LINK.label : undefined}>
            {ICONS[CAMPAIGNS_LINK.icon]}<span className="adm-nav-text">{CAMPAIGNS_LINK.label}</span>
          </a>
        </div>
        <button type="button" className="adm-rail-toggle" onClick={toggleCollapsed} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {!collapsed && (
        <div className="adm-rail-foot">
          {email}
          <br />read-only console
        </div>
      )}
    </aside>
  );
}
