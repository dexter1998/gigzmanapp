"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditsIndicator } from "@/components/CreditsIndicator";
import { DashboardModeBadge } from "@/components/DashboardModeBadge";
import { JobDetailPanel } from "@/components/jobs/JobDetailPanel";
import { formatCtc, type JobCardData } from "@/components/jobs/JobCard";
import { JOB_FAMILY_LABEL, SENIORITY_LABEL, type Seniority } from "@/lib/jobs/normalize";

/**
 * Applications — the jobs-mode counterpart of the leads table.
 *
 * The one-click apply button is the primary action on every row, deliberately: the whole point of
 * filling in a profile once is that applying afterwards is a single decision, not a form.
 */

type Application = {
  id: string;
  status: string;
  appliedAt: string | null;
  matchScore: number | null;
  job: {
    id: string;
    title: string;
    applyUrl: string | null;
    location: string | null;
    description: string | null;
    jobFamily: string | null;
    seniority: string | null;
    workMode: string | null;
    employmentType: string | null;
    minExperienceYears: number | null;
    maxExperienceYears: number | null;
    ctcMinInr: number | null;
    ctcMaxInr: number | null;
    ctcSource: string | null;
    isOpen: boolean;
  };
  company: {
    name: string;
    domain: string;
    faviconUrl: string | null;
    careersUrl: string | null;
    goldenTier: string | null;
  };
};

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "saved", label: "Saved" },
  { key: "applied", label: "Applied" },
  { key: "interviewing", label: "Interviewing" },
  { key: "offer", label: "Offer" },
];

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(true);
  const [selected, setSelected] = useState<JobCardData | null>(null);

  // Every setState here lands after an await, i.e. in a continuation rather than synchronously in
  // the effect body — which is both what the lint rule asks for and what actually avoids a
  // render-fetch-render cascade on mount.
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/applications${statusFilter ? `?status=${statusFilter}` : ""}`);
      const data = await res.json();
      setApplications(data.applications ?? []);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    fetch("/api/jobs/profile")
      .then((r) => r.json())
      .then((d) => setProfileComplete(!!d.complete))
      .catch(() => {
        /* the banner simply stays hidden if this fails */
      });
  }, []);

  async function setStatus(app: Application, status: string) {
    await fetch("/api/jobs/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: app.job.id, status, matchScore: app.matchScore }),
    });
    await load();
  }

  /**
   * One-click apply. With a complete profile it records the application and opens the employer's
   * form; without one it routes to the profile page first, because that is precisely the data the
   * employer's form is about to ask for.
   */
  async function oneClickApply(app: Application) {
    const target = app.job.applyUrl ?? app.company.careersUrl;
    if (!profileComplete) {
      router.push("/jobs/profile");
      return;
    }
    await setStatus(app, "applied");
    if (target) window.open(target, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ padding: "28px 24px 80px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, color: "var(--g-ink)", margin: 0 }}>
          Applications
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <DashboardModeBadge />
          <CreditsIndicator />
        </div>
      </div>
      <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 20px" }}>
        Roles you have saved or applied to. <Link href="/jobs/map" style={{ color: "var(--g-green-text)" }}>Find more on the map →</Link>
      </p>

      {!profileComplete && (
        <Link
          href="/jobs/profile"
          style={{
            display: "block", marginBottom: 18, padding: "12px 14px", borderRadius: "var(--radius-md)",
            background: "var(--g-green-mint)", color: "var(--g-green-text)", textDecoration: "none",
            fontSize: 13, fontWeight: 700,
          }}
        >
          Finish your application profile — it fills in every application you send from here →
        </Link>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setStatusFilter(t.key)}
            style={{
              padding: "6px 14px", borderRadius: "var(--radius-pill)", fontSize: 12.5, fontWeight: 700,
              cursor: "pointer", border: "1px solid var(--g-border)",
              background: statusFilter === t.key ? "var(--g-green-mint)" : "var(--g-white)",
              color: statusFilter === t.key ? "var(--g-green-text)" : "var(--g-ink)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <Muted>Loading…</Muted>}
      {!loading && !applications.length && (
        <Muted>Nothing here yet. Save a role from the jobs map and it will show up here.</Muted>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {applications.map((app) => {
          const ctc = formatCtc(app.job.ctcMinInr, app.job.ctcMaxInr);
          return (
            <div
              key={app.id}
              style={{
                background: "var(--g-white)", border: "1px solid var(--g-border)",
                borderRadius: "var(--radius-md)", padding: 16,
                display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
              }}
            >
              {app.company.faviconUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- remote favicon, no loader needed
                <img src={app.company.faviconUrl} alt="" width={32} height={32}
                  style={{ borderRadius: 6, border: "1px solid var(--g-border)", flexShrink: 0 }} />
              )}

              <button
                type="button"
                onClick={() =>
                  setSelected({
                    ...app.job,
                    company: { id: "", name: app.company.name, domain: app.company.domain, faviconUrl: app.company.faviconUrl, careersUrl: app.company.careersUrl, lat: null, lng: null, goldenTier: app.company.goldenTier },
                    confidence: "high",
                    applicationStatus: app.status,
                    matchScore: app.matchScore,
                    matchReasons: null,
                  })
                }
                style={{ flex: "1 1 220px", minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--g-ink)" }}>{app.job.title}</div>
                <div style={{ fontSize: 12, color: "var(--g-gray-500)", marginTop: 2 }}>
                  {app.company.name}
                  {app.job.location ? ` · ${app.job.location}` : ""}
                  {app.job.jobFamily ? ` · ${JOB_FAMILY_LABEL[app.job.jobFamily] ?? app.job.jobFamily}` : ""}
                  {app.job.seniority ? ` · ${SENIORITY_LABEL[app.job.seniority as Seniority] ?? app.job.seniority}` : ""}
                  {ctc ? ` · ${ctc}` : ""}
                </div>
                {!app.job.isOpen && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#a15c00", marginTop: 4 }}>
                    This role has since closed
                  </div>
                )}
              </button>

              <select
                value={app.status}
                onChange={(e) => void setStatus(app, e.target.value)}
                style={{
                  padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--g-border)",
                  background: "var(--g-white)", fontSize: 12, fontFamily: "inherit", color: "var(--g-ink)",
                }}
              >
                <option value="saved">Saved</option>
                <option value="applied">Applied</option>
                <option value="interviewing">Interviewing</option>
                <option value="offer">Offer</option>
                <option value="rejected">Rejected</option>
              </select>

              {/* The highlighted primary action, per row. */}
              <button
                type="button"
                onClick={() => void oneClickApply(app)}
                disabled={app.status === "applied"}
                style={{
                  padding: "9px 16px", borderRadius: "var(--radius-sm)", border: "none",
                  fontSize: 12.5, fontWeight: 800, whiteSpace: "nowrap",
                  cursor: app.status === "applied" ? "default" : "pointer",
                  background: app.status === "applied" ? "var(--g-green-mint)" : "var(--g-green-darker)",
                  color: app.status === "applied" ? "var(--g-green-text)" : "#fff",
                }}
              >
                {app.status === "applied" ? "Applied ✓" : "One-click apply"}
              </button>
            </div>
          );
        })}
      </div>

      {selected && <JobDetailPanel job={selected} onClose={() => setSelected(null)} onApplied={() => void load()} />}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 13, color: "var(--g-gray-500)", padding: "30px 0" }}>{children}</p>;
}
