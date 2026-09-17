"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Table, Pill, StatCard, fmtAgo, fmtDT, fmtN } from "../ui";
import { Dialog, DialogHeader, FilterDropdown } from "../primitives";

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
  const [active, setActive] = useState<UserRow | null>(null);

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
      <div className="adm-filterbar">
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
          <span style={{ fontSize: 12, color: "var(--g-gray-500)", alignSelf: "center" }}>
            {filtered.length} / {users.length}
          </span>
        )}
      </div>

      <Table
        head={["Email", "Mode", "Plan", { label: "Credits", num: true }, { label: "Unlocks", num: true }, { label: "Scans", num: true }, { label: "Apps", num: true }, "Paid", "Country", "Joined", "Last seen"]}
        rows={filtered.map((u) => [
          <button key="e" type="button" className="adm-rowlink" onClick={() => setActive(u)}>
            {u.email}{u.pro && <Pill tone="info">pro @</Pill>}
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
            <div className="adm-cards" style={{ margin: "0 0 4px", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
              <StatCard label="Mode" value={<Pill tone={modeTone(active.dashboardMode)}>{active.dashboardMode}</Pill>} />
              <StatCard label="Plan" value={active.plan} detail={active.paidPaise > 0 ? `paid ₹${(active.paidPaise / 100).toLocaleString("en-IN")}` : "kabhi pay nahi kiya"} tone={active.paidPaise > 0 ? "up" : undefined} />
              <StatCard label="Credits" value={fmtN(active.credits)} />
              <StatCard label="Unlocks" value={fmtN(active.unlocks)} />
              <StatCard label="Scans" value={fmtN(active.scans)} />
              <StatCard label="Applications" value={fmtN(active.applications)} />
            </div>
            <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", margin: "10px 0 16px" }}>
              {active.businessType ?? "business type?"} · {active.country ?? "country?"}
            </div>
            <Link href={`/admin/users/${encodeURIComponent(active.email)}`} className="adm-modal-full-link">
              Full profile — ledger, payments, scans, chats, errors →
            </Link>
          </>
        )}
      </Dialog>
    </>
  );
}
