/**
 * The sweep phrases a city scan asks for.
 *
 * These are search phrases, not place types, and that is deliberate. The allowlist in
 * lib/categories.ts holds 370 types, but 166 of them are cuisine variants of "restaurant" —
 * querying each would spend 166 billed calls to learn what one "restaurants" query already
 * returns, because what lands in `leads.category` is the `primaryType` Google assigns to each
 * result, not the phrase that was asked for. So a broad phrase populates many narrow categories,
 * and the narrow ones fill in organically.
 *
 * The list is capped at what one city's budget can afford and ordered by value: the categories a
 * web-design agency can actually sell to come first, so a city that runs out of budget runs out
 * having covered the leads worth having. Ordering is the only budget control that degrades
 * gracefully — a truncated alphabetical list just loses the end of the alphabet.
 */

export type Sweep = { phrase: string; tier: "A" | "B" | "C" };

export const SWEEPS: Sweep[] = [
  // Tier A — professional services and trades. Highest ability to pay, and a website converts
  // directly into business for them, which is the whole pitch on the page.
  ...[
    "dentists", "dental clinics", "orthodontists", "chiropractors", "physiotherapists",
    "opticians", "veterinary clinics", "cosmetic clinics", "dermatologists",
    "lawyers", "law firms", "accountants", "tax consultants", "financial advisors",
    "insurance agents", "real estate agents", "property management", "mortgage brokers",
    "architects", "interior designers", "civil engineers", "surveyors",
    "plumbers", "electricians", "roofing contractors", "hvac contractors",
    "landscapers", "painters and decorators", "flooring contractors", "pest control",
    "locksmiths", "builders", "kitchen fitters", "removals and storage",
    "car repair garages", "car dealerships", "tyre shops", "car wash", "driving schools",
    "wedding photographers", "event planners", "catering services", "printing services",
    "marketing agencies", "recruitment agencies", "cleaning services", "security services",
  ].map((phrase) => ({ phrase, tier: "A" as const })),

  // Tier B — consumer businesses with real websites-worth-having and steady demand.
  ...[
    "hair salons", "barber shops", "beauty salons", "nail salons", "spas", "massage therapists",
    "tattoo studios", "gyms", "yoga studios", "personal trainers", "martial arts schools",
    "dance schools", "swimming pools",
    "hotels", "guest houses", "bed and breakfast", "serviced apartments",
    "restaurants", "cafes", "bakeries", "coffee shops", "bars", "pubs", "takeaways",
    "caterers", "food trucks",
    "tuition centres", "coaching classes", "music schools", "language schools",
    "preschools", "nurseries", "training institutes",
    "travel agents", "tour operators", "taxi services",
  ].map((phrase) => ({ phrase, tier: "B" as const })),

  // Tier C — retail and the long tail. Real leads, lower conversion; scanned last so a tight
  // budget drops these rather than the trades above.
  ...[
    "boutiques", "clothing stores", "jewellery stores", "furniture stores", "electronics stores",
    "mobile phone shops", "hardware stores", "pet shops", "florists", "book shops",
    "sports shops", "bicycle shops", "toy shops", "gift shops", "opticians shops",
    "garden centres", "art galleries", "photography studios", "car rental",
    "laundry and dry cleaning", "tailors", "shoe repair", "computer repair",
  ].map((phrase) => ({ phrase, tier: "C" as const })),
];

/** Cost model, for the budget guard and the run summary. Text Search Enterprise: the field mask
 *  asks for websiteUri, rating and userRatingCount, and any one of those puts the call on the
 *  Enterprise SKU. Free tier is 1,000 calls per month, which at this volume rounds to nothing. */
export const USD_PER_CALL = 0.035;
export const INR_PER_USD = 88;
export const INR_PER_CALL = USD_PER_CALL * INR_PER_USD;
