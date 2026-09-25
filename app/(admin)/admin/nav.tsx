"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconLayoutDashboard, IconUsers, IconChartBar, IconMailbox, IconBriefcase,
  IconMail, IconSearch, IconActivity, IconRocket,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { NAV, CAMPAIGNS_LINK } from "./nav-data";

/** Real @tabler/icons-react glyphs — replaces the hand-drawn inline SVGs the previous custom
 * design used, per the Tabler-library-first redesign (docs/MANTIS_ADMIN_TABLER_SYSTEM.md). */
const ICONS: Record<string, React.ReactNode> = {
  overview: <IconLayoutDashboard size={18} stroke={1.75} />,
  users: <IconUsers size={18} stroke={1.75} />,
  economics: <IconChartBar size={18} stroke={1.75} />,
  mailing: <IconMail size={18} stroke={1.75} />,
  pseo: <IconSearch size={18} stroke={1.75} />,
  health: <IconActivity size={18} stroke={1.75} />,
  inbound: <IconMailbox size={18} stroke={1.75} />,
  campaigns: <IconRocket size={18} stroke={1.75} />,
  jobs: <IconBriefcase size={18} stroke={1.75} />,
};

/**
 * Tabler's real `navbar navbar-vertical` structure (aside + navbar-nav + nav-item/nav-link),
 * `data-bs-theme="dark"` for the dark rail Tabler ships out of the box. Interactivity (mobile
 * collapse) is plain React state rather than Bootstrap's data-bs-toggle JS — see
 * docs/MANTIS_ADMIN_TABLER_SYSTEM.md for why: Radix/React state avoids the imperative-DOM vs
 * virtual-DOM conflicts Bootstrap's own JS can hit inside a React tree.
 */
export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => setMobileOpen(false), [pathname]);

  function isActive(href: string) {
    return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  }

  return (
    <aside className="navbar navbar-vertical navbar-expand-lg" data-bs-theme="dark">
      <div className="container-fluid">
        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <h1 className="navbar-brand navbar-brand-autodark">
          <Link href="/admin" className="d-flex align-items-center gap-2 text-white text-decoration-none">
            <span className="fw-bold">Mantis</span>
            <span className="badge bg-blue-lt">Admin</span>
          </Link>
        </h1>

        <button type="button" className="btn-close btn-close-white d-lg-none ms-auto" onClick={() => setMobileOpen(false)} aria-label="Close" style={mobileOpen ? undefined : { display: "none" }} />

        <div className={cn("navbar-collapse adm-navbar-collapse", mobileOpen && "is-open")}>
          <ul className="navbar-nav pt-lg-3">
            {NAV.map(({ group, items }) => (
              <li className="nav-item" key={group}>
                <div className="navbar-nav-label px-3 pt-3 pb-1 text-uppercase text-secondary" style={{ fontSize: 10.5, letterSpacing: "0.07em", fontWeight: 700 }}>
                  {group}
                </div>
                {items.map((it) => (
                  <Link key={it.href} href={it.href} className={cn("nav-link", isActive(it.href) && "active")}>
                    <span className="nav-link-icon d-md-none d-lg-inline-block">{ICONS[it.icon]}</span>
                    <span className="nav-link-title">{it.label}</span>
                  </Link>
                ))}
              </li>
            ))}

            <li className="nav-item mt-3">
              <div className="navbar-nav-label px-3 pt-3 pb-1 text-uppercase text-secondary" style={{ fontSize: 10.5, letterSpacing: "0.07em", fontWeight: 700 }}>
                Outreach
              </div>
              <a href={CAMPAIGNS_LINK.href} className="nav-link text-warning">
                <span className="nav-link-icon d-md-none d-lg-inline-block">{ICONS[CAMPAIGNS_LINK.icon]}</span>
                <span className="nav-link-title">{CAMPAIGNS_LINK.label}</span>
              </a>
            </li>
          </ul>

          <div className="mt-auto px-3 py-3 text-secondary" style={{ fontSize: 11.5 }}>
            {email}
            <br />read-only console
          </div>
        </div>
      </div>
    </aside>
  );
}
