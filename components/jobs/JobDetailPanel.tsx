"use client";

import Link from "next/link";
import { JOB_FAMILY_LABEL, SENIORITY_LABEL, type Seniority } from "@/lib/jobs/normalize";
import { GOLDEN_TIER_LABEL, type GoldenTier } from "@/lib/jobs/golden";
import { XIcon, CheckIcon, LockIcon } from "@/components/icons";
import { formatCtc, type JobCardData } from "./JobCard";

/**
 * Full detail for one role, opened from a card or a map pin.
 *
 * The apply button is a "one-click apply" only in the sense that it carries your saved profile
 * with you and marks the application as you go — it opens the employer's own form rather than
 * submitting on your behalf. Auto-submitting into third-party ATS forms would mean guessing at
 * required questions we have never seen, and mass-submitted applications are exactly what gets a
 * candidate's name filtered by employers. See the note in lib/jobs/application-form.ts.
 */
export function JobDetailPanel({
  job,
  onClose,
  onApplied,
}: {
  job: JobCardData;
  onClose: () => void;
  onApplied?: (jobId: string) => void;
}) {
  const golden = job.company.goldenTier as GoldenTier | null;
  const ctc = formatCtc(job.ctcMinInr, job.ctcMaxInr);
  const target = job.applyUrl ?? job.company.careersUrl ?? null;

  async function handleApply() {
    await fetch("/api/jobs/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.id, status: "applied", matchScore: job.matchScore }),
    }).catch(() => {
      /* the window still opens — tracking failing must not block the actual application */
    });
    onApplied?.(job.id);
    if (target) window.open(target, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      role="dialog"
      aria-label={job.title}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,22,20,0.35)",
        display: "grid", placeItems: "center", padding: 24, zIndex: 60,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(620px, 100%)", maxHeight: "86vh", overflowY: "auto",
          background: "var(--g-white)", borderRadius: "var(--radius-lg)",
          border: `1px solid ${golden ? "var(--g-amber-core, #d4a72c)" : "var(--g-border)"}`,
          padding: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          {job.company.faviconUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- remote favicon, no loader needed
            <img src={job.company.faviconUrl} alt="" width={40} height={40}
              style={{ borderRadius: 8, border: "1px solid var(--g-border)", flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, margin: 0, color: "var(--g-ink)" }}>
              {job.title}
            </h2>
            <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "4px 0 0" }}>
              {job.company.name}
              {job.location ? ` · ${job.location}` : ""}
            </p>
            {golden && (
              <span style={{
                display: "inline-block", marginTop: 8, fontSize: 10.5, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: "0.04em", padding: "3px 9px",
                borderRadius: "var(--radius-pill)", background: "#f5e6bf", color: "#7a5c12",
              }}>
                {GOLDEN_TIER_LABEL[golden]} · golden opportunity
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ border: "none", background: "none", cursor: "pointer", padding: 4 }}>
            <XIcon />
          </button>
        </div>

        <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, margin: "0 0 18px" }}>
          <Fact label="Profile" value={job.jobFamily ? (JOB_FAMILY_LABEL[job.jobFamily] ?? job.jobFamily) : "—"} />
          <Fact label="Level" value={job.seniority ? (SENIORITY_LABEL[job.seniority as Seniority] ?? job.seniority) : "—"} />
          <Fact label="Work mode" value={job.workMode ? cap(job.workMode) : "—"} />
          <Fact label="Type" value={job.employmentType ? job.employmentType.replace("_", " ") : "—"} />
          <Fact
            label="Experience"
            value={
              job.minExperienceYears === null && job.maxExperienceYears === null
                ? "—"
                : `${job.minExperienceYears ?? 0}${job.maxExperienceYears ? `–${job.maxExperienceYears}` : "+"} yrs`
            }
          />
          <Fact
            label="Compensation"
            value={ctc ?? "Not disclosed"}
            note={ctc && job.ctcSource !== "posting" ? "Market estimate, not from the employer" : undefined}
          />
        </dl>

        {/* Why this score — the rubric is shown, not just its output, so the number is actionable. */}
        <div style={{ background: "var(--g-cream)", borderRadius: "var(--radius-md)", padding: 14, marginBottom: 18 }}>
          {job.matchScore === null ? (
            <p style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, color: "var(--g-gray-500)", margin: 0 }}>
              <LockIcon />
              <span>
                Your opportunity match is locked.{" "}
                <Link href="/jobs/profile" style={{ color: "var(--g-green-text)" }}>Add your resume and details</Link>{" "}
                to unlock it.
              </span>
            </p>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--g-ink)", marginBottom: 8 }}>
                {job.matchScore}% opportunity match
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                {(job.matchReasons ?? []).map((r, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: r.positive ? "var(--g-ink)" : "var(--g-gray-500)" }}>
                    {r.positive ? <CheckIcon /> : <span style={{ width: 14, textAlign: "center" }}>·</span>}
                    {r.label}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {job.description && (
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 6px" }}>About the role</h3>
            <p style={{ fontSize: 12.5, lineHeight: 1.65, color: "var(--g-ink-soft, var(--g-gray-500))", margin: 0, whiteSpace: "pre-wrap" }}>
              {job.description.slice(0, 2000)}
            </p>
          </div>
        )}

        {job.confidence === "low" && (
          <p style={{ fontSize: 11.5, color: "var(--g-gray-500)", margin: "0 0 14px", lineHeight: 1.5 }}>
            This listing was read from the company&apos;s careers page rather than a structured job
            feed, so the details above may be incomplete. Check the original posting before applying.
          </p>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={handleApply}
            disabled={!target}
            style={{
              flex: 1, padding: "12px 0", borderRadius: "var(--radius-sm)", border: "none",
              background: target ? "var(--g-green-darker)" : "var(--g-border)",
              color: "#fff", fontSize: 13, fontWeight: 700, cursor: target ? "pointer" : "not-allowed",
            }}
          >
            {target ? "Apply with my profile" : "No application link found"}
          </button>
          {job.company.careersUrl && (
            <a
              href={job.company.careersUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "12px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--g-border)",
                background: "var(--g-white)", color: "var(--g-ink)", fontSize: 13, fontWeight: 700,
                textDecoration: "none", whiteSpace: "nowrap",
              }}
            >
              Careers page
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--g-gray-500)" }}>
        {label}
      </dt>
      <dd style={{ fontSize: 13, fontWeight: 700, color: "var(--g-ink)", margin: "3px 0 0", textTransform: "capitalize" }}>
        {value}
      </dd>
      {note && <div style={{ fontSize: 10.5, color: "var(--g-gray-500)", marginTop: 2 }}>{note}</div>}
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
