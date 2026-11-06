"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Table, Pill, fmtAgo, fmtDT, fmtN } from "../ui";
import { FilterDropdown } from "../primitives";

export type UserRow = {
  email: string;
  plan: string;
  dashboardMode: string;
  credits: number;
  unlocks: number;
  scans: number;
  applications: number;
  paidPaise: number;
  country: string | null;
  businessType: string | null;
  createdAt: string | Date;
  lastSeenAt: string | Date | null;
  pro: boolean;
};

const ALL = "__all__";

function modeTone(mode: string): "info" | "mut" {
  return mode === "jobs" ? "info" : "mut";
}

/** Dropdown filters run client-side over the rows this page already fetched — no extra query, no
 * mutation, just narrowing what's on screen. Clicking an email opens the full profile page
 * (/admin/users/[email]) — phone, onboarding, business profiles, usage, signals, ledger. */
export function UsersTable({ users }: { users: UserRow[] }) {
  const [mode, setMode] = useState(ALL);
  const [plan, setPlan] = useState(ALL);
  const [country, setCountry] = useState(ALL);

  const plans = useMemo(() => Array.from(new Set(users.map((u) => u.plan))).sort(), [users]);
  const countries = useMemo(
    () => Array.from(new Set(users.map((u) => u.country ?? "Unknown"))).sort(),
    [users]
  );

  const filtered = users.filter((u) => {
    if (mode !== ALL && u.dashboardMode !== mode) return false;
    if (plan !== ALL && u.plan !== plan) return false;
    if (country !== ALL && (u.country ?? "Unknown") !== country) return false;
    return true;
  });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Search moved to the server (see page.tsx): it has to reach every account, not just the
            twenty on this page. The dropdowns stay client-side — they narrow what is in front of
            you, which is a different job. */}
        <FilterDropdown
          label="Mode"
          active={mode}
          onSelect={setMode}
          options={[{ value: ALL, label: "All" }, { value: "leads", label: "Leads" }, { value: "jobs", label: "Jobs" }]}
        />
        <FilterDropdown
          label="Plan"
          active={plan}
          onSelect={setPlan}
          options={[{ value: ALL, label: "All" }, ...plans.map((p) => ({ value: p, label: p }))]}
        />
        <FilterDropdown
          label="Country"
          active={country}
          onSelect={setCountry}
          options={[{ value: ALL, label: "All" }, ...countries.map((c) => ({ value: c, label: c }))]}
        />
        {(mode !== ALL || plan !== ALL || country !== ALL) && (
          <span className="text-[var(--ink-muted)]" style={{ fontSize: 12 }}>
            {filtered.length} / {users.length}
          </span>
        )}
      </div>

      <Table
        head={["Email", "Mode", "Plan", { label: "Credits", num: true }, { label: "Leads", num: true }, { label: "Scans", num: true }, { label: "Apps", num: true }, "Paid", "Country", "Joined", "Last seen"]}
        rows={filtered.map((u) => [
          <Link key="e" href={`/admin/users/${encodeURIComponent(u.email)}`} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rule)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink)] no-underline truncate" style={{ maxWidth: 220, verticalAlign: "bottom" }} title={u.email}>
            {u.email}{u.pro && <span className="ml-1"><Pill tone="info">pro @</Pill></span>}
          </Link>,
          <Pill key="m" tone={modeTone(u.dashboardMode)}>{u.dashboardMode}</Pill>,
          u.paidPaise > 0 ? <Pill key="p" tone="ok">{u.plan} · paid</Pill> : u.plan,
          fmtN(u.credits),
          fmtN(u.unlocks),
          fmtN(u.scans),
          fmtN(u.applications),
          u.paidPaise > 0 ? `₹${(u.paidPaise / 100).toLocaleString("en-IN")}` : "—",
          u.country ?? "—",
          fmtDT(u.createdAt),
          fmtAgo(u.lastSeenAt),
        ])}
        empty="filter se koi user nahi mila" />

    </>
  );
}
