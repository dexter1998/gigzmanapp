"use client";

import { JOB_FAMILY_LABEL, SENIORITY_LABEL, type Seniority } from "@/lib/jobs/normalize";
import { matchBand } from "@/lib/jobs/match";
import { GOLDEN_TIER_LABEL, type GoldenTier } from "@/lib/jobs/golden";
import { LockIcon } from "@/components/icons";

export type JobCardData = {
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
  company: {
    id: string;
    name: string;
    domain: string;
    faviconUrl: string | null;
    careersUrl: string | null;
    lat: number | null;
    lng: number | null;
    goldenTier: string | null;
  };
  confidence: "high" | "low";
  applicationStatus: string | null;
  matchScore: number | null;
  matchScorable: boolean | null;
  matchReasons: Array<{ label: string; positive: boolean }> | null;
};

/** ₹1,250,000 reads as "₹12.5L" to everyone this is shown to. */
export function formatCtc(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  const lakh = (n: number) => {
    const l = n / 100_000;
    return l >= 100 ? `${(l / 100).toFixed(l % 100 === 0 ? 0 : 1)}Cr` : `${l.toFixed(l % 1 === 0 ? 0 : 1)}L`;
  };
  if (min && max) return `₹${lakh(min)} – ₹${lakh(max)}`;
  return `₹${lakh((min ?? max) as number)}+`;
}

export function JobCard({
  job,
  onOpen,
  onSave,
}: {
  job: JobCardData;
  onOpen: (job: JobCardData) => void;
  onSave: (job: JobCardData) => void;
}) {
  const golden = job.company.goldenTier as GoldenTier | null;
  const ctc = formatCtc(job.ctcMinInr, job.ctcMaxInr);

  return (
    <div
      onClick={() => onOpen(job)}
      style={{
        // Golden companies get a warm border and tint; everything else is the plain white card.
        // Deliberately restrained — the badge does the signalling, the card stays readable.
        background: golden ? "linear-gradient(180deg, #fffdf6 0%, var(--g-white) 60%)" : "var(--g-white)",
        border: `1px solid ${golden ? "var(--g-amber-core, #d4a72c)" : "var(--g-border)"}`,
        borderRadius: "var(--radius-md)",
        padding: 16,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {job.company.faviconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote favicon, no loader needed
          <img
            src={job.company.faviconUrl}
            alt=""
            width={28}
            height={28}
            style={{ borderRadius: 6, flexShrink: 0, border: "1px solid var(--g-border)" }}
          />
        ) : (
          <div
            style={{
              width: 28, height: 28, borderRadius: 6, flexShrink: 0,
              background: "var(--g-cream)", border: "1px solid var(--g-border)",
              display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, color: "var(--g-gray-500)",
            }}
          >
            {job.company.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--g-ink)", lineHeight: 1.3 }}>{job.title}</div>
          <div style={{ fontSize: 12, color: "var(--g-gray-500)", marginTop: 2 }}>
            {job.company.name}
            {job.location ? ` · ${job.location}` : ""}
          </div>
        </div>

        {golden && (
          <span
            style={{
              fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase",
              padding: "3px 8px", borderRadius: "var(--radius-pill)", whiteSpace: "nowrap",
              background: "#f5e6bf", color: "#7a5c12", flexShrink: 0,
            }}
          >
            {GOLDEN_TIER_LABEL[golden] ?? "Golden"}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {job.jobFamily && <Chip>{JOB_FAMILY_LABEL[job.jobFamily] ?? job.jobFamily}</Chip>}
        {job.seniority && <Chip>{SENIORITY_LABEL[job.seniority as Seniority] ?? job.seniority}</Chip>}
        {job.workMode && <Chip>{job.workMode.charAt(0).toUpperCase() + job.workMode.slice(1)}</Chip>}
        {ctc && (
          <Chip>
            {ctc}
            {/* An estimate must never be mistaken for the employer's own number. */}
            {job.ctcSource !== "posting" ? " est." : ""}
          </Chip>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <MatchPill score={job.matchScore} scorable={job.matchScorable} />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSave(job);
          }}
          style={{
            padding: "6px 12px", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 700,
            border: "1px solid var(--g-border)", cursor: "pointer",
            background: job.applicationStatus ? "var(--g-green-mint)" : "var(--g-white)",
            color: job.applicationStatus ? "var(--g-green-text)" : "var(--g-ink)",
          }}
        >
          {job.applicationStatus === "applied" ? "Applied" : job.applicationStatus ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

/**
 * The opportunity score. Locked (not blurred-with-a-fake-number) until the applicant profile is
 * complete: there is genuinely nothing to show before then, and inventing a placeholder number
 * would teach people to distrust the real one.
 */
function MatchPill({ score, scorable }: { score: number | null; scorable: boolean | null }) {
  if (score === null) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: "var(--g-gray-500)" }}>
        <LockIcon />
        Add your resume to see match
      </span>
    );
  }
  // scorable === false is the only case a 0 means "nothing to compare", not "0% fit" -- a real
  // computed 0 (a genuine mismatch, e.g. wrong job family) must still show as a score below,
  // not read as if the profile just needs more filling in.
  if (scorable === false) {
    return <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--g-gray-500)" }}>Not enough detail to score</span>;
  }
  const band = matchBand(score);
  const tone =
    band.tone === "strong"
      ? { bg: "var(--g-green-mint)", fg: "var(--g-green-text)" }
      : band.tone === "good"
        ? { bg: "var(--g-amber-tint, #fdf6e3)", fg: "#8a6d1f" }
        : { bg: "var(--g-cream)", fg: "var(--g-gray-500)" };

  return (
    <span
      style={{
        fontSize: 11.5, fontWeight: 800, padding: "4px 10px", borderRadius: "var(--radius-pill)",
        background: tone.bg, color: tone.fg,
      }}
    >
      {score}% {band.label}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: "var(--radius-pill)",
        background: "var(--g-cream)", color: "var(--g-ink-soft, var(--g-gray-500))",
        border: "1px solid var(--g-border)",
      }}
    >
      {children}
    </span>
  );
}
