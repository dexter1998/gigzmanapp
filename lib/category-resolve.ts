import { TYPE_TO_SECTION } from "@/lib/categories";

/**
 * Resolves the many ways a business type gets *named* onto the place type `leads.category` holds.
 *
 * Two callers, one problem. gosom reads the label Google Maps displays ("Beauty Parlour",
 * "Chicken & Mutton Shop"); a user types what they call it in chat ("CA", "dentist chahiye").
 * Neither is a Places `primaryType`, which is a closed list of a few hundred snake_case strings.
 * Snake-casing gosom's labels matched about half the time — 1,794 of 3,499 scraped businesses were
 * silently dropped — and chat had no path from a phrase to a type at all, so asking for "CA" could
 * only ever come back "category specify karni hogi".
 *
 * Anything not listed here and not already a valid place type stays unresolved, on purpose. That
 * includes post offices, government offices, parking lots and community centres: the allowlist in
 * lib/categories.ts deliberately excludes infrastructure, government, religious and transit
 * locations, and they are not leads for a web development agency either.
 */
const ALIASES: Record<string, string> = {
  // Personal care — the single biggest group Google labels its own way
  beauty_parlour: "beauty_salon",
  beauty_parlor: "beauty_salon",
  hairdresser: "hair_salon",
  unisex_salon: "beauty_salon",
  mens_salon: "barber_shop",

  // Education. A "coaching centre" is India's tutoring institute, not a school in the Places sense,
  // but educational_institution is the type that actually describes it.
  coaching_center: "educational_institution",
  coaching_centre: "educational_institution",
  education_center: "educational_institution",
  education_centre: "educational_institution",
  tutoring_service: "educational_institution",
  day_care_center: "child_care_agency",
  day_care_centre: "child_care_agency",

  // Professional services. The India-specific short forms matter most here: "CA" is how every
  // user refers to a chartered accountant, and it is the request that exposed this gap.
  ca: "accounting",
  chartered_accountant: "accounting",
  cas: "accounting",
  auditor: "accounting",
  company_secretary: "accounting",
  real_estate_consultant: "real_estate_agency",
  property_management_company: "real_estate_agency",
  business_management_consultant: "consultant",
  engineering_consultant: "consultant",
  human_resource_consulting: "consultant",
  educational_consultant: "consultant",
  immigration_consultant: "consultant",
  certified_public_accountant: "accounting",
  tax_consultant: "accounting",
  legal_services: "lawyer",
  law_firm: "lawyer",

  // Health
  veterinarian: "veterinary_care",
  physiotherapy_center: "physiotherapist",
  physiotherapy_centre: "physiotherapist",
  diagnostic_center: "medical_clinic",
  diagnostic_centre: "medical_clinic",
  pathology_lab: "medical_clinic",
  dermatologist: "skin_care_clinic",
  general_practitioner: "doctor",
  eye_care_center: "optician",
  // What a user types, rather than what Maps prints
  dentist: "dental_clinic",
  dental_clinic_hospital: "dental_clinic",
  clinic: "medical_clinic",
  hospital_clinic: "medical_clinic",
  gym_fitness: "fitness_center",
  gym: "fitness_center",
  salon: "beauty_salon",
  parlour: "beauty_salon",
  parlor: "beauty_salon",
  barber: "barber_shop",
  restaurant_cafe: "restaurant",
  cafe_coffee_shop: "coffee_shop",
  chemist: "pharmacy",
  medical_store: "pharmacy",
  advocate: "lawyer",
  advocates: "lawyer",
  architect: "consultant",
  interior_designer: "consultant",

  // Retail and food
  bakery_and_cake_shop: "bakery",
  cake_bakery: "cake_shop",
  chicken_mutton_shop: "butcher_shop",
  meat_shop: "butcher_shop",
  indian_grocery_store: "grocery_store",
  kirana_store: "grocery_store",
  mobile_phone_repair_shop: "cell_phone_store",
  mobile_phone_accessories_store: "cell_phone_store",

  // Vehicles and home services
  auto_repair_shop: "car_repair",
  car_repair_and_maintenance_service: "car_repair",
  car_rental_agency: "car_rental",
  dry_cleaner: "laundry",
  laundry_service: "laundry",

  // Deliberately absent: apartment complexes and housing societies. The obvious target,
  // apartment_building, is not in the allowlist — the validation below caught that on the first
  // run — and a residential block is not a lead for a web development agency anyway.
};

/** Normalises a label the way a place type is spelled. */
export function normalizeLabel(label: string | undefined | null): string {
  return (label ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/**
 * Resolves a gosom label to a place type, or null if we do not carry that kind of business.
 *
 * The alias table is validated against the allowlist at call time rather than trusted: a typo here
 * would otherwise write a category no page can ever group on, and the failure would be invisible.
 */
export function resolveCategoryPhrase(...labels: Array<string | undefined | null>): string | null {
  for (const label of labels) {
    const key = normalizeLabel(label);
    if (!key) continue;
    if (TYPE_TO_SECTION[key]) return key;
    const alias = ALIASES[key];
    if (alias && TYPE_TO_SECTION[alias]) return alias;
    if (alias && !TYPE_TO_SECTION[alias]) {
      console.warn(`category-resolve: alias "${key}" -> "${alias}" is not a known place type`);
    }
  }
  return null;
}
