import { TYPE_TO_SECTION } from "@/lib/categories";

/**
 * A glyph per business category, for the card rows and the category strip.
 *
 * Mapped at the section level rather than per place type: there are ~500 Google place types and
 * hand-picking an emoji for each would rot the moment Google adds one. A handful of the highest
 * volume types get a more specific glyph on top, because "Food & Drink" covering both a salon-sized
 * bakery and a bar reads as generic on a page whose whole point is specificity.
 */
const SECTION_ICON: Record<string, string> = {
  Automotive: "🚗",
  "Business & B2B": "🏢",
  "Culture & Creative": "🎨",
  Education: "🎓",
  "Entertainment & Recreation": "🎬",
  Finance: "🏦",
  "Food & Drink": "🍽️",
  "Health & Wellness": "🩺",
  "Hotels & Accommodation": "🏨",
  "Professional Services": "💼",
  "Personal Care & Local Services": "✂️",
  "Shopping & Retail": "🛍️",
  "Sports & Fitness": "🏋️",
  "Transportation Services": "🚚",
};

const TYPE_ICON: Record<string, string> = {
  restaurant: "🍽️",
  cafe: "☕",
  coffee_shop: "☕",
  bakery: "🧁",
  bar: "🍸",
  beauty_salon: "💇",
  hair_salon: "💇",
  spa: "💆",
  nail_salon: "💅",
  barber_shop: "💈",
  gym: "🏋️",
  fitness_center: "🏋️",
  yoga_studio: "🧘",
  doctor: "🩺",
  dentist: "🦷",
  pharmacy: "💊",
  hospital: "🏥",
  veterinary_care: "🐾",
  clothing_store: "👗",
  jewelry_store: "💍",
  shoe_store: "👟",
  furniture_store: "🛋️",
  electronics_store: "🔌",
  hardware_store: "🔧",
  grocery_store: "🛒",
  supermarket: "🛒",
  book_store: "📚",
  florist: "💐",
  pet_store: "🐕",
  car_repair: "🔧",
  car_wash: "🧼",
  car_dealer: "🚘",
  real_estate_agency: "🏘️",
  lawyer: "⚖️",
  accounting: "📊",
  insurance_agency: "🛡️",
  travel_agency: "✈️",
  hotel: "🏨",
  school: "🎓",
  preschool: "🧸",
  photographer: "📷",
  laundry: "🧺",
  tailor: "🧵",
  optician: "👓",
  bank: "🏦",
};

export function categoryIcon(category: string | null): string {
  if (!category) return "🏢";
  const specific = TYPE_ICON[category];
  if (specific) return specific;
  const section = TYPE_TO_SECTION[category];
  return (section && SECTION_ICON[section]) || "🏢";
}
