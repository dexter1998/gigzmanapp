/**
 * The partner application's question set, kept apart from the form component because the same
 * options drive three things: the public /partner stepper, the in-dashboard modal, and (later)
 * whatever triage view reads these rows back.
 *
 * The point of this form is not to collect an application — it's to answer "who should we
 * actually partner with?". Every question below is here because its answer changes that call:
 * agency type routes the lead, projects/month and ticket size size the opportunity, and the
 * partnership approach says what kind of relationship they're even asking for.
 */

export type AgencyType = "tech" | "marketing" | "full_service" | "freelancer";

export const AGENCY_TYPES: Array<{
  value: AgencyType;
  label: string;
  desc: string;
}> = [
  {
    value: "tech",
    label: "Web / Tech development agency",
    desc: "You build websites, apps and e-commerce stores for clients.",
  },
  {
    value: "marketing",
    label: "Marketing / Performance agency",
    desc: "You run SEO, ads, social and demand generation for clients.",
  },
  {
    value: "full_service",
    label: "Full-service agency",
    desc: "You do both — build and market.",
  },
  {
    value: "freelancer",
    label: "Freelancer / Independent consultant",
    desc: "You deliver client work solo or with a small crew.",
  },
];

const TECH_SERVICES = [
  "Website Development",
  "Web Design",
  "E-commerce / Shopify",
  "Web Applications",
  "Mobile Apps",
  "UI/UX Design",
  "Maintenance & Support",
  "Hosting / Infrastructure",
];

const MARKETING_SERVICES = [
  "SEO",
  "Performance Marketing",
  "Social Media Marketing",
  "Content Marketing",
  "Branding",
  "Email Marketing",
  "Lead Generation",
  "Marketing Automation",
];

/** Which service chips to show. A tech agency being asked about ad spend (or a marketing agency
 * about hosting) reads as a generic form and costs completion rate — so each type only ever sees
 * the services it could plausibly tick. */
export function servicesFor(type: AgencyType | null): string[] {
  if (type === "tech") return [...TECH_SERVICES, "Other"];
  if (type === "marketing") return [...MARKETING_SERVICES, "Other"];
  return [...TECH_SERVICES, ...MARKETING_SERVICES, "Other"];
}

export const TEAM_SIZES = ["Solo", "2–5", "6–10", "11–25", "26–50", "51–100", "100+"];

export const PROJECTS_PER_MONTH = ["1–5", "6–10", "11–25", "26–50", "50+"];

/** Rupee bands, not dollars — the partner network being recruited here is India-first, and a
 * ₹-denominated ladder is the one an Indian agency owner can answer without converting. */
export const TICKET_SIZES = [
  "Under ₹25,000",
  "₹25,000 – ₹50,000",
  "₹50,000 – ₹1 lakh",
  "₹1 – 3 lakh",
  "₹3 – 5 lakh",
  "₹5 lakh+",
];

export const ACTIVE_CLIENT_RANGES = ["1–5", "6–15", "16–30", "31–50", "50+"];

export const PARTNERSHIP_APPROACHES = [
  "Resell Mantis to our clients",
  "Use it in-house for client delivery",
  "Refer clients for commission",
  "Co-marketing / joint campaigns",
  "White-label under our brand",
  "Not sure yet",
];

export const CLIENT_INTROS = ["1–5", "6–10", "11–25", "26–50", "50+"];

export type PartnerFormState = {
  agencyType: AgencyType | null;
  fullName: string;
  designation: string;
  email: string;
  phone: string;
  agencyName: string;
  website: string;
  city: string;
  country: string;
  yearEstablished: string;
  teamSize: string;
  services: string[];
  otherService: string;
  projectsClosedPerMonth: string;
  avgTicketSize: string;
  activeClients: string;
  partnershipApproach: string[];
  estimatedClientIntroductions: string;
  partnershipReason: string;
};

export const EMPTY_PARTNER_FORM: PartnerFormState = {
  agencyType: null,
  fullName: "",
  designation: "",
  email: "",
  phone: "",
  agencyName: "",
  website: "",
  city: "",
  country: "India",
  yearEstablished: "",
  teamSize: "",
  services: [],
  otherService: "",
  projectsClosedPerMonth: "",
  avgTicketSize: "",
  activeClients: "",
  partnershipApproach: [],
  estimatedClientIntroductions: "",
  partnershipReason: "",
};

export const STEPS = [
  { key: "type", label: "Agency type" },
  { key: "you", label: "About you" },
  { key: "agency", label: "Your agency" },
  { key: "delivery", label: "What you deliver" },
  { key: "fit", label: "Partnership fit" },
] as const;

/** Per-step gate. Only the fields that actually make a row triageable are required — asking for
 * everything blocks people who'd otherwise be good partners on a field we can fill in on a call. */
export function canAdvance(step: number, f: PartnerFormState): boolean {
  if (step === 0) return f.agencyType !== null;
  if (step === 1) return f.fullName.trim().length > 0 && /\S+@\S+\.\S+/.test(f.email);
  if (step === 2) return f.agencyName.trim().length > 0;
  if (step === 3) return f.services.length > 0 && f.projectsClosedPerMonth !== "" && f.avgTicketSize !== "";
  return true;
}
