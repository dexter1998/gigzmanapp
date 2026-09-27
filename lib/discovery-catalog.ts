/**
 * The map's discovery catalog: what the "Categories" picker offers, and what a search actually
 * asks Google for.
 *
 * Deliberately separate from lib/categories.ts. That file is the *classification* allowlist — it
 * decides what a stored lead is called, and every reader of it (pSEO, lead quality, lifecycle
 * email, the leads table) depends on its 369 types staying put. This file is the *sales* list:
 * only businesses a web-development agency could actually sell to.
 *
 * What was deliberately left out, and why:
 *   - government and public bodies (schools' public counterparts, universities, research
 *     institutes, municipal concert halls, convention centres) — no purchase decision to win
 *   - tourist places (zoo, aquarium, wildlife park, planetarium, tourist_attraction) — a place,
 *     not a business
 *   - facilities rather than businesses (food_court, swimming_pool, mobile_home_park)
 *   - public land (campground, rv_park, camping_cabin)
 *   - types that do not meaningfully exist in India (ski_resort, fishing_charter, japanese_inn)
 *   - businesses far too large to be a customer (television_studio, telecom providers)
 *
 * `school` / `university` DID stay: Google has no government-vs-private distinction in its type
 * system, and private schools and colleges are one of the largest website-development markets in
 * India. Dropping the type to avoid the government ones would have cost more than it saved.
 *
 * SIZE IS LOAD-BEARING. Google's Nearby Search takes at most 50 types per call, and one call is
 * one billed request (~Rs 3.08 / 8 credits). 147 types is 3 calls per tile; crossing 150 would
 * silently make it 4 — a 33% cost rise for three extra types. Check the count before adding.
 */

export type Subcategory = { id: string; label: string; types: string[] };
export type Category = { id: string; label: string; subcategories: Subcategory[] };

export const CATALOG: Category[] = [
  {
    id: "food-drink",
    label: "Food & Drink",
    subcategories: [
      {
        id: "restaurants-general-family",
        label: "Restaurants — General & Family",
        types: [
        "restaurant", "family_restaurant", "diner", "bistro", "buffet_restaurant",
        "fine_dining_restaurant", "brunch_restaurant", "breakfast_restaurant", "cafeteria",
        "western_restaurant", "fusion_restaurant", "asian_fusion_restaurant", "dessert_restaurant",
        "soup_restaurant", "salad_shop", "snack_bar", "vegetarian_restaurant", "vegan_restaurant",
        "halal_restaurant"
        ],
      },
      {
        id: "bars-nightlife",
        label: "Bars & Nightlife",
        types: [
        "bar", "pub", "gastropub", "brewpub", "brewery", "beer_garden", "cocktail_bar", "wine_bar",
        "winery", "lounge_bar", "sports_bar"
        ],
      },
      {
        id: "cafe-bakery-desserts",
        label: "Cafe, Bakery & Desserts",
        types: [
        "cafe", "coffee_shop", "coffee_stand", "coffee_roastery", "cat_cafe", "dog_cafe",
        "tea_house", "bakery", "cake_shop", "pastry_shop", "confectionery", "chocolate_shop",
        "chocolate_factory", "candy_store", "donut_shop", "ice_cream_shop", "dessert_shop",
        "acai_shop", "juice_shop"
        ],
      },
    ],
  },
  {
    id: "personal-care-local-services",
    label: "Personal Care & Local Services",
    subcategories: [
      {
        id: "pet-services",
        label: "Pet Services",
        types: [
        "pet_boarding_service", "pet_care"
        ],
      },
      {
        id: "salon-beauty",
        label: "Salon & Beauty",
        types: [
        "barber_shop", "beautician", "beauty_salon", "hair_care", "hair_salon", "nail_salon",
        "makeup_artist", "body_art_service", "foot_care"
        ],
      },
    ],
  },
  {
    id: "professional-services",
    label: "Professional Services",
    subcategories: [
      {
        id: "legal-finance-consulting",
        label: "Legal, Finance & Consulting",
        types: [
        "lawyer", "consultant", "insurance_agency", "real_estate_agency", "accounting"
        ],
      },
      {
        id: "logistics-moving-storage",
        label: "Logistics, Moving & Storage",
        types: [
        "courier_service", "shipping_service", "moving_company", "storage"
        ],
      },
      {
        id: "travel-chauffeur",
        label: "Travel & Chauffeur",
        types: [
        "travel_agency", "tour_agency", "chauffeur_service", "aircraft_rental_service"
        ],
      },
      {
        id: "events-care-other-services",
        label: "Events, Care & Other Services",
        types: [
        "catering_service", "child_care_agency", "summer_camp_organizer", "veterinary_care",
        "employment_agency", "astrologer", "psychic"
        ],
      },
    ],
  },
  {
    id: "health-wellness",
    label: "Health & Wellness",
    subcategories: [
      {
        id: "doctors-clinics-hospitals",
        label: "Doctors, Clinics & Hospitals",
        types: [
        "doctor", "dental_clinic", "dentist", "medical_center", "medical_clinic", "medical_lab",
        "chiropractor", "physiotherapist", "hospital"
        ],
      },
    ],
  },
  {
    id: "shopping-retail",
    label: "Shopping & Retail",
    subcategories: [
      {
        id: "electronics-mobile",
        label: "Electronics & Mobile",
        types: [
        "cell_phone_store", "electronics_store"
        ],
      },
      {
        id: "fashion-beauty-jewellery",
        label: "Fashion, Beauty & Jewellery",
        types: [
        "clothing_store", "womens_clothing_store", "shoe_store", "jewelry_store", "cosmetics_store",
        "sportswear_store", "thrift_store"
        ],
      },
      {
        id: "home-hardware-garden",
        label: "Home, Hardware & Garden",
        types: [
        "building_materials_store", "furniture_store", "garden_center", "hardware_store",
        "home_goods_store", "home_improvement_store"
        ],
      },
    ],
  },
  {
    id: "hotels-accommodation",
    label: "Hotels & Accommodation",
    subcategories: [
      {
        id: "hotels-resorts",
        label: "Hotels & Resorts",
        types: [
        "hotel", "resort_hotel", "extended_stay_hotel", "motel", "inn", "lodging"
        ],
      },
      {
        id: "homestays-b-b",
        label: "Homestays & B&B",
        types: [
        "bed_and_breakfast", "guest_house", "private_guest_room", "cottage", "farmstay"
        ],
      },
      {
        id: "hostels-outdoor-stay",
        label: "Hostels & Outdoor Stay",
        types: [
        "hostel"
        ],
      },
    ],
  },
  {
    id: "entertainment-recreation",
    label: "Entertainment & Recreation",
    subcategories: [
      {
        id: "nightlife-live-entertainment",
        label: "Nightlife & Live Entertainment",
        types: [
        "night_club", "karaoke", "comedy_club", "live_music_venue", "dance_hall", "casino"
        ],
      },
      {
        id: "events-banquet-venues",
        label: "Events & Banquet Venues",
        types: [
        "banquet_hall", "wedding_venue", "event_venue"
        ],
      },
    ],
  },
  {
    id: "sports-fitness",
    label: "Sports & Fitness",
    subcategories: [
      {
        id: "gyms-coaching",
        label: "Gyms & Coaching",
        types: [
        "gym", "fitness_center", "sports_coaching", "sports_school"
        ],
      },
      {
        id: "golf-outdoor-sport",
        label: "Golf & Outdoor Sport",
        types: [
        "golf_course", "indoor_golf_course"
        ],
      },
    ],
  },
  {
    id: "education",
    label: "Education",
    subcategories: [
      {
        id: "schools-preschools",
        label: "Schools & Preschools",
        types: [
        "preschool", "school", "primary_school", "secondary_school"
        ],
      },
      {
        id: "colleges-research",
        label: "Colleges & Research",
        types: [
        "university", "educational_institution"
        ],
      },
    ],
  },
  {
    id: "automotive",
    label: "Automotive",
    subcategories: [
      {
        id: "dealers-rental",
        label: "Dealers & Rental",
        types: [
        "car_dealer", "truck_dealer", "car_rental"
        ],
      },
      {
        id: "repair-car-care",
        label: "Repair & Car Care",
        types: [
        "car_repair", "car_wash", "tire_shop"
        ],
      },
    ],
  },
  {
    id: "business-b2b",
    label: "Business & B2B",
    subcategories: [
      {
        id: "offices-coworking",
        label: "Offices & Coworking",
        types: [
        "business_center", "coworking_space"
        ],
      },
      {
        id: "industry-farm-supply",
        label: "Industry, Farm & Supply",
        types: [
        "manufacturer", "supplier"
        ],
      },
    ],
  },
];

/** Every type in the catalog, de-duplicated and sorted — the default selection, and the set a
 *  search uses when the user has not narrowed anything. Sorted so the batch key below is stable
 *  regardless of the order the picker happened to hand them over in. */
export const ALL_CATALOG_TYPES: string[] = [
  ...new Set(CATALOG.flatMap((c) => c.subcategories.flatMap((s) => s.types))),
].sort();

/** Google's per-call ceiling. Not ours to raise. */
export const TYPES_PER_CALL = 50;

/** Splits a selection into the batches a search will actually issue — one billed Google call each. */
export function typeBatches(types: string[]): string[][] {
  const sorted = [...new Set(types)].sort();
  const out: string[][] = [];
  for (let i = 0; i < sorted.length; i += TYPES_PER_CALL) out.push(sorted.slice(i, i + TYPES_PER_CALL));
  return out;
}

/** How many billed calls a selection costs per tile — what the picker shows the user. */
export function callsPerTile(types: string[]): number {
  return Math.max(1, Math.ceil(new Set(types).size / TYPES_PER_CALL));
}
