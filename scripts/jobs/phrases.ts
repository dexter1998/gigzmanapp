/**
 * Search phrases for the jobs sweep.
 *
 * Deliberately not the leads phrase list. That one is tuned for businesses that lack a website
 * (plan-districts.ts is retail/trade only, because professional services show ~0% website gap
 * outside India) -- the exact inverse of what hiring needs, which is companies that DO have a site
 * to crawl. A first local run bore that out: "software company in Koramangala" returned 20 places,
 * 18 with websites.
 *
 * Tiers exist so a sweep can start with what is most likely to employ and widen only if the yield
 * justifies it. Nothing here is final: the whole point of storing the raw scraped label in
 * job_companies.category is that `npx tsx scripts/jobs/yield.ts` can rank these by how many
 * companies actually produced an open role, and the list gets pruned from measurement rather than
 * from assumption. Tier C in particular is a guess and is expected to lose members.
 */

export type PhraseTier = "A" | "B" | "C";

/**
 * Round 1 measured 16,454 crawled companies. hit% = share that produced at least one open role:
 *
 *   HR consulting 44% · recruiter 43% · employment agency 40% · temp agency 37%
 *   engineering consultant 33% · software company 27% (4,851 jobs, the volume leader)
 *   business mgmt consultant 23% · corporate office 19% · computer support 18%
 *   law firm 17% · marketing agency 17% · website designer 14% · advertising agency 11%
 *   structural engineer 11% · lawyer 9% · criminal justice attorney 7%
 *
 * The staffing cluster came top and was not something round 1 asked for directly -- it surfaced
 * from the raw labels. One caveat before leaning on it: agencies post roles on behalf of other
 * employers, so those listings are real jobs but not necessarily the agency's own. Worth deciding
 * whether that is wanted before widening further.
 *
 * Legal is the clear loser (lawyer 9%, criminal attorney 7%) and drops to C.
 */
export const JOB_PHRASES: Array<{ phrase: string; tier: PhraseTier }> = [
  // Measured top of round 1 -- promoted on evidence, not expectation.
  { phrase: "employment agency", tier: "A" },
  { phrase: "recruiter", tier: "A" },
  { phrase: "human resource consulting", tier: "A" },
  { phrase: "temp agency", tier: "A" },

  // A -- software/IT and the professional firms around it. Highest expected density of both a
  // website and a real careers page.
  { phrase: "software company", tier: "A" },
  { phrase: "information technology company", tier: "A" },
  { phrase: "software development company", tier: "A" },
  { phrase: "it services", tier: "A" },
  { phrase: "web design company", tier: "A" },
  { phrase: "digital marketing agency", tier: "A" },
  { phrase: "advertising agency", tier: "C" }, // 11% in round 1
  { phrase: "management consultant", tier: "A" },
  { phrase: "engineering consultant", tier: "A" },
  { phrase: "accounting firm", tier: "A" },
  { phrase: "law firm", tier: "C" }, // 17% in round 1
  { phrase: "staffing agency", tier: "A" },
  { phrase: "business process outsourcing company", tier: "A" },
  { phrase: "corporate office", tier: "A" },

  // B -- larger employers that hire steadily but publish roles less consistently.
  { phrase: "hospital", tier: "B" },
  { phrase: "medical center", tier: "B" },
  { phrase: "university", tier: "B" },
  { phrase: "college", tier: "B" },
  { phrase: "school", tier: "B" },
  { phrase: "hotel", tier: "B" },
  { phrase: "bank", tier: "B" },
  { phrase: "insurance agency", tier: "B" },
  { phrase: "pharmaceutical company", tier: "B" },
  { phrase: "manufacturer", tier: "B" },
  { phrase: "logistics company", tier: "B" },
  { phrase: "architecture firm", tier: "B" },
  { phrase: "research institute", tier: "B" },
  { phrase: "coworking space", tier: "B" },

  // C -- unproven. Kept only until the yield report has enough volume to rule on them.
  { phrase: "real estate developer", tier: "C" },
  { phrase: "construction company", tier: "C" },
  { phrase: "electronics company", tier: "C" },
  { phrase: "automobile company", tier: "C" },
  { phrase: "telecommunications company", tier: "C" },
  { phrase: "travel agency", tier: "C" },
  { phrase: "event management company", tier: "C" },
  { phrase: "security services", tier: "C" },
];

export function phrasesForTiers(tiers: PhraseTier[]): string[] {
  return JOB_PHRASES.filter((p) => tiers.includes(p.tier)).map((p) => p.phrase);
}
