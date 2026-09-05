"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * The pulsing mode badge that sits immediately left of the credits pill.
 *
 * It exists to solve a discovery problem, not a status one: a user who signed up through the jobs
 * landing page has no other cue that a second dashboard exists, and one who is *in* jobs mode has
 * no obvious way back. Clicking it goes to the settings card that owns the switch rather than
 * toggling in place — switching dashboards changes the whole shell, and doing that silently from a
 * toolbar click would be a jarring thing to trigger by accident.
 *
 * Fetches the mode itself rather than taking it as a prop because its three mount points are a
 * mix of server and client components, and threading the value through all of them (plus keeping
 * it fresh after a switch) is more moving parts than one cached GET.
 */

type Mode = "leads" | "jobs";

export function DashboardModeBadge() {
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setMode(d?.profile?.dashboard_mode === "jobs" ? "jobs" : "leads");
      })
      .catch(() => {
        /* a badge that fails to load is simply absent — never an error surface */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mode) return null;

  const isJobs = mode === "jobs";

  return (
    <Link
      href="/profile"
      title="Switch dashboard"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 12px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid var(--g-border)",
        background: "var(--g-white)",
        textDecoration: "none",
        fontSize: 12,
        fontWeight: 700,
        color: "var(--g-ink)",
        whiteSpace: "nowrap",
      }}
    >
      <span
        className="mode-badge-dot"
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: isJobs ? "var(--g-green)" : "var(--g-gray-500)",
          flexShrink: 0,
        }}
      />
      {isJobs ? "Jobs" : "Leads"}
    </Link>
  );
}
