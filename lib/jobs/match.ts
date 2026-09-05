/**
 * Opportunity match — the percentage on a job card, locked until the applicant profile is complete.
 *
 * It is a transparent weighted rubric, not a model score, for two reasons. First, it has to be
 * explainable: the card shows *why* a job scored what it did, and "the model said 62" is not a
 * reason anyone can act on. Second, it must not move on its own — a seeker who fixes nothing
 * should see the same number tomorrow.
 *
 * The score answers "how well does this role fit the profile", not "will they hire you". Nothing
 * here can know the latter, and presenting it as if it could would be a lie to someone making
 * decisions about their livelihood.
 */

import { SENIORITY_RANK, type Seniority, type WorkMode } from "./normalize";

export type MatchInput = {
  job: {
    jobFamily: string | null;
    seniority: Seniority | null;
    workMode: WorkMode | null;
    minExperienceYears: number | null;
    maxExperienceYears: number | null;
    ctcMinInr: number | null;
    ctcMaxInr: number | null;
    location: string | null;
  };
  profile: {
    jobFamily: string | null;
    seniority: Seniority | null;
    preferredWorkMode: string | null;
    totalExperienceYears: number | null;
    expectedCtcInr: number | null;
    city: string | null;
  };
};

export type MatchReason = { label: string; positive: boolean };
/**
 * `scorable: false` is the one case score=0 does NOT mean "0% fit" -- it means no dimension had
 * data on both sides to compare at all (a title-only heuristic-scraped listing, say). Every other
 * 0 is a real, computed, truthful "this does not fit" and must be shown as a score, not hidden
 * behind an "insufficient data" message -- conflating the two here previously made every genuine
 * mismatch display as if the profile just needed more filling in, which it didn't.
 */
export type MatchResult = { score: number; scorable: boolean; reasons: MatchReason[] };

/**
 * Weights sum to 100 only when every dimension is known. When the listing is missing a field
 * (very common on heuristic-scraped pages, which often have nothing but a title), that dimension
 * is dropped from both numerator and denominator rather than scored as zero — otherwise a
 * perfectly good role would be penalised for its employer's sparse careers page.
 */
const WEIGHTS = {
  family: 35,
  seniority: 25,
  experience: 20,
  workMode: 12,
  compensation: 8,
} as const;

export function computeMatch({ job, profile }: MatchInput): MatchResult {
  const reasons: MatchReason[] = [];
  let earned = 0;
  let possible = 0;

  // --- job family -----------------------------------------------------------------------------
  if (job.jobFamily && profile.jobFamily) {
    possible += WEIGHTS.family;
    if (job.jobFamily === profile.jobFamily) {
      earned += WEIGHTS.family;
      reasons.push({ label: "Matches your job profile", positive: true });
    } else {
      reasons.push({ label: "Different field from your profile", positive: false });
    }
  }

  // --- seniority ------------------------------------------------------------------------------
  if (job.seniority && profile.seniority) {
    possible += WEIGHTS.seniority;
    const gap = SENIORITY_RANK[job.seniority] - SENIORITY_RANK[profile.seniority];
    if (gap === 0) {
      earned += WEIGHTS.seniority;
      reasons.push({ label: "Right level for you", positive: true });
    } else if (gap === 1) {
      // A single rung up is the role worth stretching for, so it keeps most of the weight.
      earned += WEIGHTS.seniority * 0.7;
      reasons.push({ label: "One level up — a stretch role", positive: true });
    } else if (gap === -1) {
      earned += WEIGHTS.seniority * 0.5;
      reasons.push({ label: "One level below your experience", positive: false });
    } else {
      reasons.push({ label: gap > 0 ? "Well above your current level" : "Well below your current level", positive: false });
    }
  }

  // --- experience -----------------------------------------------------------------------------
  if (profile.totalExperienceYears !== null && (job.minExperienceYears !== null || job.maxExperienceYears !== null)) {
    possible += WEIGHTS.experience;
    const yrs = profile.totalExperienceYears;
    const min = job.minExperienceYears ?? 0;
    const max = job.maxExperienceYears ?? Infinity;
    if (yrs >= min && yrs <= max) {
      earned += WEIGHTS.experience;
      reasons.push({ label: "Experience is in range", positive: true });
    } else if (yrs < min && min - yrs <= 1) {
      // Within a year of the stated floor: in practice these applications are still read.
      earned += WEIGHTS.experience * 0.6;
      reasons.push({ label: "Just under the experience asked for", positive: false });
    } else if (yrs > max) {
      earned += WEIGHTS.experience * 0.5;
      reasons.push({ label: "More experience than they asked for", positive: false });
    } else {
      reasons.push({ label: `Asks for ${min}+ years`, positive: false });
    }
  }

  // --- work mode ------------------------------------------------------------------------------
  if (job.workMode && profile.preferredWorkMode && profile.preferredWorkMode !== "any") {
    possible += WEIGHTS.workMode;
    if (job.workMode === profile.preferredWorkMode) {
      earned += WEIGHTS.workMode;
      reasons.push({ label: `${cap(job.workMode)} — as you prefer`, positive: true });
    } else if (job.workMode === "hybrid" || profile.preferredWorkMode === "hybrid") {
      // Hybrid is a partial match against either pole rather than a clean miss.
      earned += WEIGHTS.workMode * 0.5;
      reasons.push({ label: `${cap(job.workMode)} role`, positive: false });
    } else {
      reasons.push({ label: `${cap(job.workMode)} — you prefer ${profile.preferredWorkMode}`, positive: false });
    }
  }

  // --- compensation ---------------------------------------------------------------------------
  if (profile.expectedCtcInr && (job.ctcMinInr || job.ctcMaxInr)) {
    possible += WEIGHTS.compensation;
    const top = job.ctcMaxInr ?? job.ctcMinInr!;
    if (top >= profile.expectedCtcInr) {
      earned += WEIGHTS.compensation;
      reasons.push({ label: "Pay meets your expectation", positive: true });
    } else if (top >= profile.expectedCtcInr * 0.85) {
      earned += WEIGHTS.compensation * 0.5;
      reasons.push({ label: "Slightly below your expected CTC", positive: false });
    } else {
      reasons.push({ label: "Below your expected CTC", positive: false });
    }
  }

  // Nothing comparable at all — a title-only listing against any profile. Returning 0 would read
  // as "bad fit" when the truth is "not enough information" — scorable: false is what lets the UI
  // tell this apart from a real, computed 0% match.
  if (possible === 0) {
    return {
      score: 0,
      scorable: false,
      reasons: [{ label: "Not enough detail in this listing to score it", positive: false }],
    };
  }

  return { score: Math.round((earned / possible) * 100), scorable: true, reasons };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Band label + colour token for the score chip. */
export function matchBand(score: number): { label: string; tone: "strong" | "good" | "weak" } {
  if (score >= 75) return { label: "Strong match", tone: "strong" };
  if (score >= 50) return { label: "Good match", tone: "good" };
  return { label: "Weak match", tone: "weak" };
}
