/**
 * The business-type table (Tarun, 2026-10-23: "agent ko identify krna sikhana, regex se nhi — b2b,
 * b2c, saas vghera"). One table the models read to classify a business — the seller (Scout) and
 * every lead (site profile) — by what it is and who pays it, and where its buyers are found.
 * Classification is the model's judgement from the website text against these descriptions; nothing
 * here is matched with a regex.
 */

export type SellsTo = "businesses" | "consumers" | "both";

export type BusinessType = {
  id: string;
  label: string;
  /** What it looks like on a website, in words a model can judge against. */
  looksLike: string;
  examples: string;
  /** Who usually pays it (the model may override for a given business). */
  usuallySellsTo: SellsTo;
  /** Where ITS customers are found when it is the seller. */
  buyersFoundVia: "maps" | "web" | "funding_news" | "github" | "none";
};

export const BUSINESS_TYPES: BusinessType[] = [
  { id: "saas", label: "SaaS / software product", looksLike: "sells subscriptions to its own software; pricing plans, free trial, login, product screenshots, integrations, API docs", examples: "CRM, HR software, billing app, analytics tool", usuallySellsTo: "businesses", buyersFoundVia: "web" },
  { id: "agency_services", label: "Agency / IT services", looksLike: "does client work: web/app development, marketing, SEO, design, video, IT services; portfolio, case studies, clients' logos", examples: "digital marketing agency, software development company", usuallySellsTo: "businesses", buyersFoundVia: "maps" },
  { id: "professional_services", label: "Professional services", looksLike: "advice or certified work by professionals: CA, legal, consulting, architects, interior designers, recruiters, brokers", examples: "CA firm, law firm, interior designer, insurance broker", usuallySellsTo: "both", buyersFoundVia: "maps" },
  { id: "b2b_supplier", label: "B2B supplier / distributor", looksLike: "supplies products in bulk to other businesses: catalogue, MOQ, dealer/distributor enquiries, bulk pricing, industries served", examples: "commercial refrigeration supplier, LED lighting distributor, packaging supplier", usuallySellsTo: "businesses", buyersFoundVia: "maps" },
  { id: "manufacturer", label: "Manufacturer / exporter", looksLike: "makes products in its own factory; capacity, certifications, export markets, OEM", examples: "steel furniture maker, textile exporter", usuallySellsTo: "businesses", buyersFoundVia: "web" },
  { id: "local_service", label: "Local consumer service", looksLike: "serves people who walk in or book: appointments, treatments, classes, repairs at home, a menu", examples: "dental clinic, salon, gym, coaching institute, car workshop, restaurant", usuallySellsTo: "consumers", buyersFoundVia: "none" },
  { id: "retail_ecommerce", label: "Retail / D2C / e-commerce", looksLike: "sells products to shoppers: cart, product listings, offers, store locations", examples: "clothing brand, jewellery store, online store", usuallySellsTo: "consumers", buyersFoundVia: "none" },
  { id: "education", label: "School / education", looksLike: "admissions, courses, fees, faculty, batches", examples: "school, college, training institute", usuallySellsTo: "consumers", buyersFoundVia: "none" },
  { id: "healthcare_provider", label: "Healthcare provider", looksLike: "doctors, departments, appointments, treatments for patients", examples: "hospital, diagnostic lab, clinic", usuallySellsTo: "consumers", buyersFoundVia: "none" },
  { id: "hospitality", label: "Hospitality / events", looksLike: "rooms, banquets, catering, event packages", examples: "hotel, banquet hall, caterer, wedding planner", usuallySellsTo: "both", buyersFoundVia: "maps" },
  { id: "real_estate", label: "Real estate", looksLike: "projects, properties for sale/rent, RERA numbers, site visits", examples: "builder, developer, broker", usuallySellsTo: "both", buyersFoundVia: "maps" },
  { id: "marketplace", label: "Marketplace / platform", looksLike: "connects two sides (buyers and sellers, customers and providers) and takes a cut", examples: "car-service marketplace, booking platform", usuallySellsTo: "both", buyersFoundVia: "web" },
  { id: "startup_finance", label: "Startup / finance services", looksLike: "serves founders and companies raising or managing money: fundraising, M&A, VC, lending", examples: "fundraising advisor, VC fund", usuallySellsTo: "businesses", buyersFoundVia: "funding_news" },
  { id: "other", label: "Other", looksLike: "none of the above", examples: "", usuallySellsTo: "both", buyersFoundVia: "maps" },
];

export const BUSINESS_TYPE_IDS = BUSINESS_TYPES.map((t) => t.id);

/** The table as the models read it. */
export function businessTypesForPrompt(): string {
  return "BUSINESS TYPES (pick the one that fits what the website shows; who pays it decides sellsTo — the 'usually' is only a default):\n" +
    BUSINESS_TYPES.map((t) => `- ${t.id} (${t.label}): ${t.looksLike}. e.g. ${t.examples || "—"}. usually sells to ${t.usuallySellsTo}; its buyers are found via ${t.buyersFoundVia}.`).join("\n");
}

export const businessTypeById = (id: string | null | undefined) => BUSINESS_TYPES.find((t) => t.id === id) ?? null;
