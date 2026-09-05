/**
 * Turns a raw scraped job title/location/description into the normalized fields the jobs UI
 * filters and sorts on.
 *
 * Why rules rather than a model: raw titles vary infinitely in wording but almost never in
 * vocabulary -- "SDE II", "Software Engineer 2", "Software Development Engineer II" and "SWE L4"
 * all carry the same handful of tokens. A regex pass resolves the overwhelming majority for free
 * and, unlike a model call, gives the same answer every time so a listing does not silently change
 * level between refreshes. `needsReview` marks the residue that a model pass could pick up later
 * (see classifyUnresolved below) instead of guessing and being confidently wrong.
 */

export type Seniority = "intern" | "entry" | "mid" | "senior" | "staff" | "lead" | "manager" | "director";
export type WorkMode = "remote" | "hybrid" | "onsite";
export type EmploymentType = "full_time" | "part_time" | "contract" | "internship";

/** Ordering for range filters ("senior and above") and for ORDER BY. */
export const SENIORITY_RANK: Record<Seniority, number> = {
  intern: 0,
  entry: 1,
  mid: 2,
  senior: 3,
  staff: 4,
  lead: 5,
  manager: 6,
  director: 7,
};

export const SENIORITY_LABEL: Record<Seniority, string> = {
  intern: "Intern",
  entry: "Entry level",
  mid: "Mid level",
  senior: "Senior",
  staff: "Staff / Principal",
  lead: "Lead",
  manager: "Manager",
  director: "Director+",
};

/**
 * Titles where "manager" is the name of an individual-contributor job, not a rung on the ladder.
 * Without this, every "Product Manager" outranks every "Senior Engineer" in the seniority sort,
 * which is wrong in every company that has both.
 */
const IC_MANAGER_TITLES = /\b(product|program|project|account|category|community|social media|brand|content|partnership|relationship|customer success)\s+manager\b/i;

/**
 * Ordered highest-rung-first: the first match wins. That ordering is the whole trick for
 * compound titles -- "Senior SDE II" is senior (not mid), "Lead Data Scientist I" is lead (not
 * entry), because the higher rung is tested before the numeric suffix ever is.
 */
const SENIORITY_PATTERNS: Array<[Seniority, RegExp]> = [
  ["director", /\b(director|vp|vice president|head of|chief|cto|ceo|coo|cfo|cmo|founding (engineer|member))\b/i],
  ["manager", /\b(manager|mgr|supervisor|superintendent)\b/i],
  ["lead", /\b(lead|leader|architect)\b/i],
  ["staff", /\b(staff|principal|distinguished|fellow)\b/i],
  ["senior", /\b(senior|sr\.?|snr\.?)\b|\b(iii|l[5-9]|e[5-9]|sde\s*-?\s*3|sde\s*-?\s*iii)\b/i],
  ["mid", /\b(ii|l4|e4|sde\s*-?\s*2|sde\s*-?\s*ii|mid[- ]?level|intermediate)\b|\b(engineer|developer|analyst|designer|executive)\s*-?\s*2\b/i],
  ["entry", /\b(junior|jr\.?|entry[- ]?level|fresher|graduate|associate|trainee|apprentice|i|l3|e3|sde\s*-?\s*1|sde\s*-?\s*i)\b|\b(engineer|developer|analyst|designer|executive)\s*-?\s*1\b/i],
  ["intern", /\b(intern|internship|summer analyst)\b/i],
];

/**
 * Checked before everything else: an internship is an internship regardless of what else the
 * title says, and "Senior Engineering Intern" is not a senior role.
 */
const INTERN_RE = /\b(intern|internship)\b/i;

export function normalizeSeniority(title: string): { seniority: Seniority | null; rank: number | null } {
  const t = title || "";
  if (INTERN_RE.test(t)) return { seniority: "intern", rank: SENIORITY_RANK.intern };

  for (const [level, re] of SENIORITY_PATTERNS) {
    if (level === "manager" && IC_MANAGER_TITLES.test(t)) continue;
    if (re.test(t)) return { seniority: level, rank: SENIORITY_RANK[level] };
  }
  return { seniority: null, rank: null };
}

/**
 * Job families. Deliberately spans white- and blue-collar: this product's businesses are dentists,
 * restaurants and salons as often as they are software companies, so a taxonomy that only knew
 * about engineering and sales would leave most of the real listings unclassified.
 *
 * Order matters -- the first family whose pattern matches wins, so the more specific families are
 * listed before the generic ones they would otherwise be swallowed by.
 */
const FAMILY_PATTERNS: Array<[string, RegExp]> = [
  // Note the deliberate absence of a trailing \b on the stems: "engineer" has to match
  // "Engineering Manager" and "scien" has to match "Scientist". An earlier version anchored both
  // ends and silently classified every "...Engineering..." and "Data Scientist" title as unknown.
  ["data", /\b(data scien|data analyst|data engineer|machine learning|ml engineer|ai engineer|analytics|bi developer|statistician)/i],
  ["engineering", /\b(engineer|developer|programmer|sde\b|swe\b|devops|sre\b|qa\b|tester|full[- ]?stack|frontend|front[- ]?end|backend|back[- ]?end|android|ios\b|mobile dev)/i],
  ["design", /\b(designer|ux\b|ui\b|graphic|creative director|illustrator|animator|video editor)/i],
  ["product", /\b(product manager|product owner|product analyst|business analyst)/i],
  ["healthcare", /\b(nurse|doctor|physician|dentist|dental|physiotherapist|therapist|pharmacist|lab technician|radiolog|medical officer|paramedic|caregiver|optometrist)\b/i],
  ["hospitality", /\b(chef|cook|waiter|waitress|steward|barista|bartender|kitchen|housekeep|front office|concierge|hotel|restaurant manager|captain|banquet)\b/i],
  ["trades", /\b(electrician|plumber|carpenter|welder|fitter|mechanic|technician|machinist|mason|painter|fabricator|installer|hvac|maintenance)\b/i],
  ["logistics", /\b(driver|delivery|rider|warehouse|picker|packer|loader|dispatch|fleet|courier|supply chain|logistics)\b/i],
  // "account manager"/"account executive" belong here, not under finance -- they are sales roles,
  // and the finance pattern's "account" stem would otherwise claim them since it runs later.
  ["sales", /\b(sales|business development|bd executive|account (executive|manager)|telecaller|tele[- ]?sales|counsellor|counselor|relationship manager|field officer)/i],
  ["marketing", /\b(marketing|seo|sem|ppc|social media|content writer|copywriter|brand|growth|digital market|performance market)\b/i],
  ["finance", /\b(account(ant|s)?|finance|audit|tax|bookkeep|cashier|billing|payroll|ca\b|cfa\b)\b/i],
  ["hr", /\b(hr\b|human resource|recruit|talent acquisition|people ops|admin executive)\b/i],
  ["support", /\b(customer (support|service|care)|support (executive|engineer|associate)|help ?desk|call center|bpo|chat support)\b/i],
  ["education", /\b(teacher|tutor|faculty|professor|lecturer|instructor|trainer|coach|principal teacher|academic)\b/i],
  ["legal", /\b(lawyer|advocate|legal|paralegal|compliance officer)\b/i],
  ["security", /\b(security guard|bouncer|watchman|security officer)\b/i],
  ["beauty", /\b(beautician|stylist|hairdresser|barber|makeup|spa therapist|nail tech)\b/i],
  ["operations", /\b(operations|ops\b|store manager|branch manager|shift|floor manager|coordinator|executive assistant|receptionist|front desk|office assistant)\b/i],
];

export const JOB_FAMILY_LABEL: Record<string, string> = {
  engineering: "Engineering",
  data: "Data & AI",
  design: "Design",
  product: "Product",
  healthcare: "Healthcare",
  hospitality: "Hospitality & Food",
  trades: "Skilled Trades",
  logistics: "Logistics & Delivery",
  sales: "Sales",
  marketing: "Marketing",
  finance: "Finance & Accounts",
  hr: "HR & Admin",
  support: "Customer Support",
  education: "Education & Training",
  legal: "Legal",
  security: "Security",
  beauty: "Beauty & Wellness",
  operations: "Operations",
};

export function normalizeJobFamily(title: string, description?: string | null): string | null {
  const haystack = `${title || ""} ${description ? description.slice(0, 400) : ""}`;
  for (const [family, re] of FAMILY_PATTERNS) {
    if (re.test(haystack)) return family;
  }
  return null;
}

/**
 * Work mode. Checked against title + location + the head of the description, because which of the
 * three carries the signal varies by site: ATS-backed listings usually put it in the location
 * field ("Remote - India"), hand-written careers pages usually put it in the body text.
 *
 * Hybrid is tested first: "hybrid - 3 days in office" contains "office", and an onsite-first check
 * would misread every hybrid listing as onsite.
 */
export function normalizeWorkMode(title: string, location?: string | null, description?: string | null): WorkMode | null {
  const hay = `${title || ""} ${location || ""} ${description ? description.slice(0, 600) : ""}`;
  if (/\bhybrid\b/i.test(hay)) return "hybrid";
  if (/\b(remote|work from home|wfh|anywhere|distributed team)\b/i.test(hay)) return "remote";
  if (/\b(on[- ]?site|in[- ]?office|in person|work from office|wfo)\b/i.test(hay)) return "onsite";
  return null;
}

export function normalizeEmploymentType(title: string, description?: string | null): EmploymentType | null {
  const hay = `${title || ""} ${description ? description.slice(0, 600) : ""}`;
  if (INTERN_RE.test(hay)) return "internship";
  if (/\b(part[- ]?time)\b/i.test(hay)) return "part_time";
  if (/\b(contract|contractual|freelance|consultant|temporary|temp\b|c2h)\b/i.test(hay)) return "contract";
  if (/\b(full[- ]?time|permanent|fte)\b/i.test(hay)) return "full_time";
  return null;
}

/**
 * Experience range in years. Handles the three shapes Indian listings actually use:
 * "2-5 years", "minimum 3 years", "3+ years". Returns years, with max left null for the
 * open-ended forms rather than invented.
 */
export function normalizeExperience(text: string | null | undefined): { min: number | null; max: number | null } {
  if (!text) return { min: null, max: null };

  const range = text.match(/(\d{1,2})\s*(?:-|to|–)\s*(\d{1,2})\s*\+?\s*(?:years?|yrs?)/i);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };

  const plus = text.match(/(\d{1,2})\s*\+\s*(?:years?|yrs?)/i);
  if (plus) return { min: Number(plus[1]), max: null };

  const min = text.match(/(?:min(?:imum)?|at least|over)\s*(\d{1,2})\s*(?:years?|yrs?)/i);
  if (min) return { min: Number(min[1]), max: null };

  const single = text.match(/(\d{1,2})\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i);
  if (single) return { min: Number(single[1]), max: null };

  if (/\b(fresher|no experience|entry[- ]?level|0\s*(?:-|to)\s*1\s*years?)\b/i.test(text)) return { min: 0, max: 1 };

  return { min: null, max: null };
}

/**
 * Salary from the posting itself. Only INR is parsed -- this is the India-facing surface, and
 * mis-reading a "$120,000" as ₹120,000 would be far worse than returning nothing. Handles lakh/
 * crore shorthand ("8-12 LPA", "₹15L", "12 lakhs") since that is how Indian postings quote pay.
 */
export function parseCtcInr(text: string | null | undefined): { min: number | null; max: number | null } {
  if (!text) return { min: null, max: null };
  // A "$"/"€"/"£" anywhere in the compensation phrase means this is not an INR figure.
  if (/[$€£]|\busd\b|\beur\b|\bgbp\b/i.test(text)) return { min: null, max: null };

  const LAKH = 100_000;
  const CRORE = 10_000_000;

  const lakhRange = text.match(/(\d{1,3}(?:\.\d{1,2})?)\s*(?:-|to|–)\s*(\d{1,3}(?:\.\d{1,2})?)\s*(lpa|lakhs?|l\b|cr|crores?)/i);
  if (lakhRange) {
    const unit = /cr/i.test(lakhRange[3]) ? CRORE : LAKH;
    return { min: Math.round(Number(lakhRange[1]) * unit), max: Math.round(Number(lakhRange[2]) * unit) };
  }

  const lakhSingle = text.match(/(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:\.\d{1,2})?)\s*(lpa|lakhs?|l\b|cr|crores?)/i);
  if (lakhSingle) {
    const unit = /cr/i.test(lakhSingle[2]) ? CRORE : LAKH;
    return { min: Math.round(Number(lakhSingle[1]) * unit), max: null };
  }

  // Plain rupee amounts: "₹25,000 - ₹40,000 per month" (monthly is the norm for blue-collar
  // roles, so it is annualized here to keep one comparable unit across every listing).
  const plainRange = text.match(/(?:₹|rs\.?|inr)\s*([\d,]{4,9})\s*(?:-|to|–)\s*(?:₹|rs\.?|inr)?\s*([\d,]{4,9})/i);
  if (plainRange) {
    const monthly = /\b(per month|monthly|\/month|p\.m\.|pm\b)/i.test(text);
    const mul = monthly ? 12 : 1;
    return {
      min: Number(plainRange[1].replace(/,/g, "")) * mul,
      max: Number(plainRange[2].replace(/,/g, "")) * mul,
    };
  }

  return { min: null, max: null };
}

export type NormalizedJob = {
  jobFamily: string | null;
  seniority: Seniority | null;
  seniorityRank: number | null;
  workMode: WorkMode | null;
  employmentType: EmploymentType | null;
  minExperienceYears: number | null;
  maxExperienceYears: number | null;
  ctcMinInr: number | null;
  ctcMaxInr: number | null;
  /** True when neither family nor seniority resolved -- the residue worth a model pass. */
  needsReview: boolean;
};

export function normalizeJob(input: {
  title: string;
  location?: string | null;
  description?: string | null;
}): NormalizedJob {
  const { title, location, description } = input;
  const { seniority, rank } = normalizeSeniority(title);
  const jobFamily = normalizeJobFamily(title, description);
  const exp = normalizeExperience(description || title);
  const ctc = parseCtcInr(description || title);

  return {
    jobFamily,
    seniority,
    seniorityRank: rank,
    workMode: normalizeWorkMode(title, location, description),
    employmentType: normalizeEmploymentType(title, description),
    minExperienceYears: exp.min,
    maxExperienceYears: exp.max,
    ctcMinInr: ctc.min,
    ctcMaxInr: ctc.max,
    needsReview: !jobFamily && !seniority,
  };
}
