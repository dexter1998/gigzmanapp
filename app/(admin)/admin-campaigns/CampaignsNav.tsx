"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IconList, IconChartBar, IconPlus, IconArrowLeft, IconMenu2, IconX } from "@tabler/icons-react";

/**
 * The campaigns rail — the console's own system, same as /admin's.
 *
 * These are sibling route groups, so this inherits nothing from the read-only console's layout and
 * has to carry its own copy of the shell. Kept visually identical on purpose: a send trigger
 * living in a different-looking console is how someone clicks it thinking they are somewhere safe.
 * The amber "sends email" marker is the one thing that is deliberately not identical.
 */
const LINKS = [
  { href: "/admin-campaigns", label: "All campaigns", icon: <IconList size={16} />, exact: true },
  { href: "/admin-campaigns/analytics", label: "Analytics", icon: <IconChartBar size={16} /> },
  { href: "/admin-campaigns/new", label: "New campaign", icon: <IconPlus size={16} /> },
];

export function CampaignsNav({ email }: { email: string }) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const on = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  const body = (
    <>
      <div className="px-4 py-4">
        <Link href="/admin-campaigns" className="flex items-center gap-2 no-underline">
          <span className="text-[15px] font-semibold tracking-tight text-[var(--ink)]">Mantis</span>
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]"
            style={{ borderColor: "color-mix(in oklab, var(--warn) 45%, transparent)", color: "var(--warn)" }}
          >
            Campaigns
          </span>
        </Link>
        <p className="m-0 mt-1.5 text-[10.5px]" style={{ color: "var(--warn)" }}>
          This console sends email.
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 pb-4">
        <div>
          <p className="m-0 px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-faint)]">Outreach</p>
          <div className="flex flex-col gap-0.5">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="adm-nav-row flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-[13px] no-underline"
                data-on={on(l.href, l.exact) ? "true" : "false"}
              >
                <span className="shrink-0">{l.icon}</span>
                <span className="truncate">{l.label}</span>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="m-0 px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-faint)]">Back</p>
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="adm-nav-row flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-[13px] no-underline"
            data-on="false"
          >
            <span className="shrink-0"><IconArrowLeft size={16} /></span>
            <span className="truncate">Read-only console</span>
          </Link>
        </div>
      </nav>

      <div className="rule-t px-4 py-3">
        <p className="m-0 truncate text-[12px] text-[var(--ink-muted)]">{email}</p>
        <p className="m-0 text-[10.5px]" style={{ color: "var(--warn)" }}>can send email</p>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        className="rule-b fixed inset-x-0 top-0 z-50 flex h-12 items-center gap-2 border-0 bg-[var(--surface)] px-4 text-[13px] text-[var(--ink)] lg:hidden"
      >
        {open ? <IconX size={18} /> : <IconMenu2 size={18} />}
        <span className="font-semibold">Campaigns</span>
      </button>

      <aside className="rule-r sticky top-0 hidden h-screen w-56 shrink-0 flex-col bg-[var(--surface)] lg:flex">{body}</aside>
      {open && (
        <aside className="fixed inset-x-0 bottom-0 top-12 z-40 flex flex-col overflow-y-auto bg-[var(--surface)] lg:hidden">{body}</aside>
      )}
    </>
  );
}
