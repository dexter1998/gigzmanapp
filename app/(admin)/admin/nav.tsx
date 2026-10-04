"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  IconLayoutGrid, IconUsers, IconChartBar, IconMail, IconSearch, IconActivity,
  IconBriefcase, IconInbox, IconRocket, IconMenu2, IconX,
} from "@tabler/icons-react";
import { NAV, CAMPAIGNS_LINK } from "./nav-data";

/**
 * The console's own rail.
 *
 * Was Tabler's `navbar-vertical`, which meant the shell sat on Tabler's navy dark while the pages
 * being rebuilt sat on the product's warm dark — two different darks touching down the middle of
 * the screen. Nav structure still comes from nav-data.ts, so the sidebar and the breadcrumb cannot
 * drift apart; only the clothes changed.
 */
const ICONS: Record<string, React.ReactNode> = {
  overview: <IconLayoutGrid size={16} />,
  users: <IconUsers size={16} />,
  economics: <IconChartBar size={16} />,
  inbound: <IconInbox size={16} />,
  jobs: <IconBriefcase size={16} />,
  mailing: <IconMail size={16} />,
  pseo: <IconSearch size={16} />,
  health: <IconActivity size={16} />,
  campaigns: <IconRocket size={16} />,
};

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const body = (
    <>
      <div className="flex items-center gap-2 px-4 py-4">
        <Link href="/admin" className="flex items-center gap-2 no-underline">
          <span className="text-[15px] font-semibold tracking-tight text-[var(--ink)]">Mantis</span>
          <span className="rounded-full border border-[var(--rule)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-faint)]">
            Admin
          </span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 pb-4">
        {[...NAV, { group: CAMPAIGNS_LINK.group, items: [CAMPAIGNS_LINK] }].map(({ group, items }) => (
          <div key={group}>
            <p className="m-0 px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-faint)]">
              {group}
            </p>
            <div className="flex flex-col gap-0.5">
              {items.map((it) => {
                const on = isActive(it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className="adm-nav-row flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-[13px] no-underline"
                    data-on={on ? "true" : "false"}
                  >
                    <span className="shrink-0">{ICONS[it.icon]}</span>
                    <span className="truncate">{it.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="rule-t px-4 py-3">
        <p className="m-0 truncate text-[12px] text-[var(--ink-muted)]">{email}</p>
        <p className="m-0 text-[10.5px] text-[var(--ink-faint)]">read-only console</p>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile opener. The drawer is React state, not Bootstrap's data-bs-toggle — same reason
          the rest of this console uses Radix over Bootstrap JS. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        className="rule-b fixed inset-x-0 top-0 z-50 flex h-12 items-center gap-2 border-0 bg-[var(--surface)] px-4 text-[13px] text-[var(--ink)] lg:hidden"
      >
        {open ? <IconX size={18} /> : <IconMenu2 size={18} />}
        <span className="font-semibold">Mantis Admin</span>
      </button>

      <aside className="rule-r sticky top-0 hidden h-screen w-56 shrink-0 flex-col bg-[var(--surface)] lg:flex">
        {body}
      </aside>

      {open && (
        <aside className="fixed inset-x-0 bottom-0 top-12 z-40 flex flex-col overflow-y-auto bg-[var(--surface)] lg:hidden">
          {body}
        </aside>
      )}
    </>
  );
}
