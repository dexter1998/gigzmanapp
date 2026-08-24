/**
 * Master allowlist of real Google Place Types (Table A) organized into sections for the UI.
 * User-provided and curated specifically to exclude infrastructure, government, religious,
 * transit, parks, and other non-business locations — those are deliberately never included here,
 * not filtered out after the fact.
 */
export const CATEGORY_SECTIONS: Record<string, string[]> = {
  Automotive: ["car_dealer", "car_rental", "car_repair", "car_wash", "tire_shop", "truck_dealer"],

  "Business & B2B": [
    "business_center", "corporate_office", "coworking_space", "farm", "manufacturer", "ranch",
    "supplier", "television_studio",
  ],

  "Culture & Creative": [
    "art_gallery", "art_museum", "art_studio", "auditorium", "museum", "performing_arts_theater",
  ],

  Education: [
    "academic_department", "educational_institution", "preschool", "primary_school",
    "research_institute", "school", "secondary_school", "university",
  ],

  "Entertainment & Recreation": [
    "adventure_sports_center", "amusement_center", "amusement_park", "aquarium", "banquet_hall",
    "bowling_alley", "casino", "childrens_camp", "comedy_club", "concert_hall",
    "convention_center", "cultural_center", "dance_hall", "event_venue", "go_karting_venue",
    "indoor_playground", "internet_cafe", "karaoke", "live_music_venue",
    "miniature_golf_course", "movie_rental", "movie_theater", "night_club", "opera_house",
    "paintball_center", "philharmonic_hall", "planetarium", "roller_coaster",
    "tourist_attraction", "video_arcade", "vineyard", "water_park", "wedding_venue",
    "wildlife_park", "zoo",
  ],

  Finance: ["accounting", "bank"],

  "Food & Drink": [
    "acai_shop", "afghani_restaurant", "african_restaurant", "american_restaurant",
    "argentinian_restaurant", "asian_fusion_restaurant", "asian_restaurant",
    "australian_restaurant", "austrian_restaurant", "bagel_shop", "bakery",
    "bangladeshi_restaurant", "bar", "bar_and_grill", "barbecue_restaurant", "basque_restaurant",
    "bavarian_restaurant", "beer_garden", "belgian_restaurant", "bistro", "brazilian_restaurant",
    "breakfast_restaurant", "brewery", "brewpub", "british_restaurant", "brunch_restaurant",
    "buffet_restaurant", "burmese_restaurant", "burrito_restaurant", "cafe", "cafeteria",
    "cajun_restaurant", "cake_shop", "californian_restaurant", "cambodian_restaurant",
    "candy_store", "cantonese_restaurant", "caribbean_restaurant", "cat_cafe",
    "chicken_restaurant", "chicken_wings_restaurant", "chilean_restaurant",
    "chinese_noodle_restaurant", "chinese_restaurant", "chocolate_factory", "chocolate_shop",
    "cocktail_bar", "coffee_roastery", "coffee_shop", "coffee_stand", "colombian_restaurant",
    "confectionery", "croatian_restaurant", "cuban_restaurant", "czech_restaurant",
    "danish_restaurant", "deli", "dessert_restaurant", "dessert_shop", "dim_sum_restaurant",
    "diner", "dog_cafe", "donut_shop", "dumpling_restaurant", "dutch_restaurant",
    "eastern_european_restaurant", "ethiopian_restaurant", "european_restaurant",
    "falafel_restaurant", "family_restaurant", "fast_food_restaurant", "filipino_restaurant",
    "fine_dining_restaurant", "fish_and_chips_restaurant", "fondue_restaurant", "food_court",
    "french_restaurant", "fusion_restaurant", "gastropub", "german_restaurant",
    "greek_restaurant", "gyro_restaurant", "halal_restaurant", "hamburger_restaurant",
    "hawaiian_restaurant", "hookah_bar", "hot_dog_restaurant", "hot_dog_stand",
    "hot_pot_restaurant", "hungarian_restaurant", "ice_cream_shop", "indian_restaurant",
    "indonesian_restaurant", "irish_pub", "irish_restaurant", "israeli_restaurant",
    "italian_restaurant", "japanese_curry_restaurant", "japanese_izakaya_restaurant",
    "japanese_restaurant", "juice_shop", "kebab_shop", "korean_barbecue_restaurant",
    "korean_restaurant", "latin_american_restaurant", "lebanese_restaurant", "lounge_bar",
    "malaysian_restaurant", "meal_delivery", "meal_takeaway", "mediterranean_restaurant",
    "mexican_restaurant", "middle_eastern_restaurant", "mongolian_barbecue_restaurant",
    "moroccan_restaurant", "noodle_shop", "north_indian_restaurant",
    "oyster_bar_restaurant", "pakistani_restaurant", "pastry_shop", "persian_restaurant",
    "peruvian_restaurant", "pizza_delivery", "pizza_restaurant", "polish_restaurant",
    "portuguese_restaurant", "pub", "ramen_restaurant", "restaurant", "romanian_restaurant",
    "russian_restaurant", "salad_shop", "sandwich_shop", "scandinavian_restaurant",
    "seafood_restaurant", "shawarma_restaurant", "snack_bar", "soul_food_restaurant",
    "soup_restaurant", "south_american_restaurant", "south_indian_restaurant",
    "southwestern_us_restaurant", "spanish_restaurant", "sports_bar", "sri_lankan_restaurant",
    "steak_house", "sushi_restaurant", "swiss_restaurant", "taco_restaurant",
    "taiwanese_restaurant", "tapas_restaurant", "tea_house", "tex_mex_restaurant",
    "thai_restaurant", "tibetan_restaurant", "tonkatsu_restaurant", "turkish_restaurant",
    "ukrainian_restaurant", "vegan_restaurant", "vegetarian_restaurant", "vietnamese_restaurant",
    "western_restaurant", "wine_bar", "winery", "yakiniku_restaurant", "yakitori_restaurant",
  ],

  "Health & Wellness": [
    "chiropractor", "dental_clinic", "dentist", "doctor", "drugstore", "general_hospital",
    "hospital", "massage", "massage_spa", "medical_center", "medical_clinic", "medical_lab",
    "pharmacy", "physiotherapist", "sauna", "skin_care_clinic", "spa", "tanning_studio",
    "wellness_center", "yoga_studio",
  ],

  "Hotels & Accommodation": [
    "bed_and_breakfast", "budget_japanese_inn", "campground", "camping_cabin", "cottage",
    "extended_stay_hotel", "farmstay", "guest_house", "hostel", "hotel", "inn", "japanese_inn",
    "lodging", "mobile_home_park", "motel", "private_guest_room", "resort_hotel", "rv_park",
  ],

  "Professional & Local Services": [
    "aircraft_rental_service", "astrologer", "barber_shop", "beautician", "beauty_salon",
    "body_art_service", "catering_service", "chauffeur_service", "child_care_agency",
    "consultant", "courier_service", "electrician", "employment_agency", "florist",
    "food_delivery", "foot_care", "hair_care", "hair_salon", "insurance_agency", "laundry",
    "lawyer", "locksmith", "makeup_artist", "moving_company", "nail_salon", "painter",
    "pet_boarding_service", "pet_care", "plumber", "psychic", "real_estate_agency",
    "roofing_contractor", "service", "shipping_service", "storage", "summer_camp_organizer",
    "tailor", "telecommunications_service_provider", "tour_agency", "travel_agency",
    "veterinary_care",
  ],

  "Shopping & Retail": [
    "asian_grocery_store", "auto_parts_store", "bicycle_store", "book_store",
    "building_materials_store", "butcher_shop", "cell_phone_store", "clothing_store",
    "convenience_store", "cosmetics_store", "department_store", "discount_store",
    "discount_supermarket", "electronics_store", "farmers_market", "flea_market", "food_store",
    "furniture_store", "garden_center", "general_store", "gift_shop", "grocery_store",
    "hardware_store", "health_food_store", "home_goods_store", "home_improvement_store",
    "hypermarket", "jewelry_store", "liquor_store", "market", "pet_store", "shoe_store",
    "shopping_mall", "sporting_goods_store", "sportswear_store", "store", "supermarket",
    "tea_store", "thrift_store", "toy_store", "warehouse_store", "wholesaler",
    "womens_clothing_store",
  ],

  "Sports & Fitness": [
    "arena", "fishing_charter", "fitness_center", "golf_course", "gym", "ice_skating_rink",
    "indoor_golf_course", "race_course", "ski_resort", "sports_activity_location",
    "sports_club", "sports_coaching", "sports_complex", "sports_school", "stadium",
    "swimming_pool", "tennis_court",
  ],

  "Transportation Services": ["taxi_service", "transportation_service"],
};

export const SECTION_NAMES = Object.keys(CATEGORY_SECTIONS);

/** Reverse lookup — given a real place type Google returned, which section is it in? Used to
 * filter already-fetched leads by section without needing to store the section on each lead. */
export const TYPE_TO_SECTION: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_SECTIONS).flatMap(([section, types]) => types.map((t) => [t, section]))
);

/** Chunks a section's types into batches of at most 50 — Nearby Search (New)'s real limit on
 * combined included/excluded types per request. */
export function chunkTypes(types: string[], size = 50): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < types.length; i += size) chunks.push(types.slice(i, i + size));
  return chunks;
}
