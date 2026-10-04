"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Table, Pill, StatCard, CardRow, fmtAgo, fmtDT, fmtN } from "../ui";
import { Dialog, DialogHeader, DialogBody, FilterDropdown, SearchInput } from "../primitives";

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

/** Filters run client-side over the same 200 rows the page already fetched — no extra query, no
 * mutation, just narrowing what's on screen. The row modal is a quick-glance summary of data
 * already in hand; the full per-user history (ledger, payments, chats, errors) stays a real page,
 * per modal-vs-page convention: fine for "at a glance", wrong place for a multi-section drill-down. */
export function UsersTable({ users }: { users: UserRow[] }) {
  const [mode, setMode] = useState(ALL);
  const [plan, setPlan] = useState(ALL);
  const [country, setCountry] = useState(ALL);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<UserRow | null>(null);

  const plans = useMemo(() => Array.from(new Set(users.map((u) => u.plan))).sort(), [users]);
  const countries = useMemo(
    () => Array.from(new Set(users.map((u) => u.country ?? "Unknown"))).sort(),
    [users]
  );

  const q = query.trim().toLowerCase();
  const filtered = users.filter((u) => {
    if (mode !== ALL && u.dashboardMode !== mode) return false;
    if (plan !== ALL && u.plan !== plan) return false;
    if (country !== ALL && (u.country ?? "Unknown") !== country) return false;
    if (q && !u.email.toLowerCase().includes(q) && !(u.businessType ?? "").toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search email or business type…" />
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
        {(mode !== ALL || plan !== ALL || country !== ALL || q) && (
          <span className="text-[var(--ink-muted)]" style={{ fontSize: 12 }}>
            {filtered.length} / {users.length}
          </span>
        )}
      </div>

      <Table
        head={["Email", "Mode", "Plan", { label: "Credits", num: true }, { label: "Unlocks", num: true }, { label: "Scans", num: true }, { label: "Apps", num: true }, "Paid", "Country", "Joined", "Last seen"]}
        rows={filtered.map((u) => [
          <button key="e" type="button" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rule)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink)] no-underline truncate" style={{ maxWidth: 220, verticalAlign: "bottom" }} title={u.email} onClick={() => setActive(u)}>
            {u.email}{u.pro && <span className="ml-1"><Pill tone="info">pro @</Pill></span>}
          </button>,
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

      <Dialog open={active != null} onOpenChange={(v) => !v && setActive(null)}>
        {active && (
          <>
            <DialogHeader
              title={active.email}
              sub={`joined ${fmtDT(active.createdAt)} · last seen ${fmtAgo(active.lastSeenAt)}`}
              onClose={() => setActive(null)}
            />
            <DialogBody>
              <CardRow>
                <StatCard col="col-4" label="Mode" value={<Pill tone={modeTone(active.dashboardMode)}>{active.dashboardMode}</Pill>} />
                <StatCard col="col-4" label="Plan" value={active.plan} detail={active.paidPaise > 0 ? `paid ₹${(active.paidPaise / 100).toLocaleString("en-IN")}` : "kabhi pay nahi kiya"} tone={active.paidPaise > 0 ? "up" : undefined} />
                <StatCard col="col-4" label="Credits" value={fmtN(active.credits)} />
                <StatCard col="col-4" label="Unlocks" value={fmtN(active.unlocks)} />
                <StatCard col="col-4" label="Scans" value={fmtN(active.scans)} />
                <StatCard col="col-4" label="Applications" value={fmtN(active.applications)} />
              </CardRow>
              <div className="text-[var(--ink-muted)] mb-3" style={{ fontSize: 12.5 }}>
                {active.businessType ?? "business type?"} · {active.country ?? "country?"}
              </div>
              <Link href={`/admin/users/${encodeURIComponent(active.email)}`} className="no-underline">
                Full profile — ledger, payments, scans, chats, errors →
              </Link>
            </DialogBody>
          </>
        )}
      </Dialog>
    </>
  );
}
