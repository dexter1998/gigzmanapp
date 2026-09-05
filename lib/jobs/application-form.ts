/**
 * The standardized application profile — filled once, replayed into every application.
 *
 * Field set is the intersection of what the major ATS platforms actually ask for (Greenhouse and
 * Lever converge on name/email/phone/location/resume/LinkedIn/website; Workday adds employment
 * history and salary), plus the three fields every Indian employer asks for and no Western ATS has
 * a slot for: current CTC, expected CTC, and notice period. Anything a single employer asks that
 * is not here stays a per-application question — this is the reusable core, not an attempt to
 * model every custom form in existence.
 */

export type FieldType = "text" | "email" | "tel" | "url" | "number" | "textarea" | "select" | "file";

export type ApplicationField = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  /** Counts toward profile completeness — see isProfileComplete. */
  required?: boolean;
  help?: string;
  maxLength?: number;
};

export const WORK_MODE_OPTIONS = [
  { value: "any", label: "No preference" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

export const SENIORITY_OPTIONS = [
  { value: "intern", label: "Intern" },
  { value: "entry", label: "Entry level" },
  { value: "mid", label: "Mid level" },
  { value: "senior", label: "Senior" },
  { value: "staff", label: "Staff / Principal" },
  { value: "lead", label: "Lead" },
  { value: "manager", label: "Manager" },
  { value: "director", label: "Director+" },
];

export const APPLICATION_SECTIONS: Array<{ title: string; note?: string; fields: ApplicationField[] }> = [
  {
    title: "About you",
    fields: [
      { key: "first_name", label: "First name", type: "text", placeholder: "Tarun", required: true, maxLength: 60 },
      { key: "last_name", label: "Last name", type: "text", placeholder: "Kumar", required: true, maxLength: 60 },
      { key: "phone", label: "Phone", type: "tel", placeholder: "+91 90000 00000", required: true, maxLength: 20 },
      { key: "city", label: "City", type: "text", placeholder: "Gurgaon", required: true, maxLength: 80 },
    ],
  },
  {
    title: "Resume",
    note: "Attached to every application, and used to compute your opportunity match on each job.",
    fields: [
      { key: "resume_url", label: "Resume", type: "file", required: true, help: "PDF or DOCX, up to 5 MB" },
      { key: "linkedin_url", label: "LinkedIn", type: "url", placeholder: "https://linkedin.com/in/…", maxLength: 300 },
      { key: "portfolio_url", label: "Portfolio / website", type: "url", placeholder: "https://…", maxLength: 300 },
    ],
  },
  {
    title: "What you're looking for",
    fields: [
      {
        key: "job_family",
        label: "Job profile",
        type: "select",
        required: true,
        help: "The kind of role you want — this is what the jobs map filters on.",
      },
      { key: "seniority", label: "Level", type: "select", options: SENIORITY_OPTIONS, required: true },
      { key: "preferred_work_mode", label: "Work mode", type: "select", options: WORK_MODE_OPTIONS },
      {
        key: "total_experience_years",
        label: "Total experience (years)",
        type: "number",
        placeholder: "3",
        required: true,
      },
    ],
  },
  {
    title: "Compensation & availability",
    note: "Asked by nearly every Indian employer. Never shown to anyone until you actually apply.",
    fields: [
      { key: "current_ctc_inr", label: "Current CTC (₹ / year)", type: "number", placeholder: "800000" },
      { key: "expected_ctc_inr", label: "Expected CTC (₹ / year)", type: "number", placeholder: "1200000" },
      { key: "notice_period_days", label: "Notice period (days)", type: "number", placeholder: "30" },
    ],
  },
  {
    title: "Cover note",
    note: "Optional. Used as the default when an application asks for a cover letter.",
    fields: [
      {
        key: "cover_letter",
        label: "Cover note",
        type: "textarea",
        placeholder: "A few lines on what you're looking for…",
        maxLength: 2000,
      },
    ],
  },
];

export const ALL_APPLICATION_FIELDS: ApplicationField[] = APPLICATION_SECTIONS.flatMap((s) => s.fields);

export const REQUIRED_FIELD_KEYS = ALL_APPLICATION_FIELDS.filter((f) => f.required).map((f) => f.key);

/**
 * Completeness gate for the locked opportunity-% on job cards. Deliberately strict about the
 * resume: the match score is computed against resume text, so without one there is nothing to
 * score and a number shown anyway would be theatre.
 */
export function isProfileComplete(profile: Record<string, unknown> | null | undefined): boolean {
  if (!profile) return false;
  return REQUIRED_FIELD_KEYS.every((k) => {
    const v = profile[k];
    return v !== null && v !== undefined && String(v).trim() !== "";
  });
}

/** Fraction 0..1 of required fields filled — drives the "profile 60% complete" nudge. */
export function profileCompletion(profile: Record<string, unknown> | null | undefined): number {
  if (!profile) return 0;
  const filled = REQUIRED_FIELD_KEYS.filter((k) => {
    const v = profile[k];
    return v !== null && v !== undefined && String(v).trim() !== "";
  }).length;
  return filled / REQUIRED_FIELD_KEYS.length;
}
