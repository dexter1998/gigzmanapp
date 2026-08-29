/**
 * The curated place registry behind the public lead pages.
 *
 * Curated, never auto-generated. `leads.address` is Google's free-text `formattedAddress`, and the
 * token sitting in its "city" position is frequently not a city: production contains "Region",
 * villages like Sarhol and Bandhwari that are really inside Gurgaon, a Devanagari spelling of
 * Gurugram, and 206 New York addresses. Registering whatever appears there is exactly how a
 * programmatic system starts publishing pages about nothing.
 *
 * So the rule is: an address token only resolves if it is listed here. **Unmatched means excluded,
 * never guessed.**
 *
 * Slug choice is also a judgement this file exists to hold. "Gurgaon" and "Gurugram" are both
 * correct; Google's address format says Gurugram, but Gurgaon is what people search. An algorithm
 * reading the data would have picked the wrong one.
 */

export type City = {
  slug: string;
  /** Display name, and the spelling used in page copy and titles. */
  name: string;
  /** Other spellings that appear in addresses. Never used in URLs. */
  aliases: string[];
  state: string;
  centroid: { lat: number; lng: number };
  /** [minLat, minLng, maxLat, maxLng] — the integrity check in address.ts rejects any lead whose
   *  coordinates fall outside the city it parsed to. Drawn generously around the real municipal
   *  area, but never far enough to touch a neighbouring city we also cover. */
  bbox: [number, number, number, number];
  /** draft = registered and resolvable, but never published. */
  status: "active" | "draft";
};

export type Area = {
  slug: string;
  name: string;
  citySlug: string;
  aliases: string[];
};

/**
 * Gurgaon's bbox is drawn from the real data — leads with "Gurugram" in the address occupy
 * lat 28.455–28.509, lng 28.976–77.105 between the 1st and 99th percentile — then widened to cover
 * the wider district. The northern edge deliberately stops short of Delhi (28.6+).
 */
export const CITIES: City[] = [
  {
    slug: "gurgaon",
    name: "Gurgaon",
    aliases: ["gurugram", "gurgaon", "गुरुग्राम", "gurgaon haryana", "gurugram haryana"],
    state: "Haryana",
    centroid: { lat: 28.4896, lng: 77.0534 },
    bbox: [28.36, 76.85, 28.56, 77.15],
    status: "active",
  },
  {
    // New Delhi is merged in rather than given its own slug: split, both pages are thin.
    slug: "delhi",
    name: "Delhi",
    aliases: ["delhi", "new delhi", "नई दिल्ली", "दिल्ली"],
    state: "Delhi",
    centroid: { lat: 28.6448, lng: 77.2167 },
    bbox: [28.4, 76.83, 28.89, 77.35],
    status: "draft",
  },
  {
    slug: "faridabad",
    name: "Faridabad",
    aliases: ["faridabad", "फरीदाबाद"],
    state: "Haryana",
    centroid: { lat: 28.4089, lng: 77.3178 },
    bbox: [28.28, 77.22, 28.53, 77.42],
    status: "draft",
  },
  {
    slug: "morena",
    name: "Morena",
    aliases: ["morena", "मुरैना"],
    state: "Madhya Pradesh",
    centroid: { lat: 26.4954, lng: 78.0009 },
    bbox: [26.38, 77.87, 26.62, 78.13],
    status: "draft",
  },
  {
    slug: "kota",
    name: "Kota",
    aliases: ["kota", "कोटा"],
    state: "Rajasthan",
    centroid: { lat: 25.2138, lng: 75.8648 },
    bbox: [25.09, 75.74, 25.34, 75.99],
    status: "draft",
  },
];

/** Named areas and localities. Villages that Google puts in the city slot (Sarhol, Bandhwari,
 *  Tikampur, Shahpur) are areas of Gurgaon, not cities — that is what stops them becoming pages. */
export const AREAS: Area[] = [
  { slug: "dlf-phase-1", name: "DLF Phase 1", citySlug: "gurgaon", aliases: ["dlf phase 1", "dlf qutab enclave phase 1"] },
  { slug: "dlf-phase-2", name: "DLF Phase 2", citySlug: "gurgaon", aliases: ["dlf phase 2"] },
  { slug: "dlf-phase-3", name: "DLF Phase 3", citySlug: "gurgaon", aliases: ["dlf phase 3"] },
  { slug: "dlf-phase-4", name: "DLF Phase 4", citySlug: "gurgaon", aliases: ["dlf phase 4"] },
  { slug: "dlf-phase-5", name: "DLF Phase 5", citySlug: "gurgaon", aliases: ["dlf phase 5"] },
  { slug: "udyog-vihar", name: "Udyog Vihar", citySlug: "gurgaon", aliases: ["udyog vihar"] },
  { slug: "cyber-city", name: "Cyber City", citySlug: "gurgaon", aliases: ["cyber city", "dlf cyber city", "cybercity"] },
  { slug: "palam-vihar", name: "Palam Vihar", citySlug: "gurgaon", aliases: ["palam vihar"] },
  { slug: "sushant-lok", name: "Sushant Lok", citySlug: "gurgaon", aliases: ["sushant lok", "sushant lok phase 1", "sushant lok 1"] },
  { slug: "golf-course-road", name: "Golf Course Road", citySlug: "gurgaon", aliases: ["golf course road", "golf course extn road", "golf course extension road"] },
  { slug: "mg-road", name: "MG Road", citySlug: "gurgaon", aliases: ["mg road", "m g road", "mehrauli gurgaon road"] },
  { slug: "sohna-road", name: "Sohna Road", citySlug: "gurgaon", aliases: ["sohna road"] },
  // Villages/localities Google reports in the city position — folded into Gurgaon.
  { slug: "sarhol", name: "Sarhol", citySlug: "gurgaon", aliases: ["sarhol", "sarhaul"] },
  { slug: "bandhwari", name: "Bandhwari", citySlug: "gurgaon", aliases: ["bandhwari"] },
  { slug: "tikampur", name: "Tikampur", citySlug: "gurgaon", aliases: ["tikampur"] },
  { slug: "shahpur", name: "Shahpur", citySlug: "gurgaon", aliases: ["shahpur"] },
  { slug: "badsa", name: "Badsa", citySlug: "gurgaon", aliases: ["badsa"] },
  { slug: "sikanderpur-ghosi", name: "Sikanderpur Ghosi", citySlug: "gurgaon", aliases: ["sikanderpur ghosi", "sikanderpur"] },
  { slug: "pawala-khasrupur", name: "Pawala Khasrupur", citySlug: "gurgaon", aliases: ["pawala khasrupur"] },
];

export const CITY_BY_SLUG = new Map(CITIES.map((c) => [c.slug, c]));
export const AREA_BY_SLUG = new Map(AREAS.map((a) => [a.slug, a]));

/** Address token -> what it resolves to. Built from the aliases above; an area alias also carries
 *  its city, so a lead whose city slot says "Sarhol" still lands in Gurgaon. */
export const ALIAS_MAP: Map<string, { citySlug: string; areaSlug?: string }> = (() => {
  const m = new Map<string, { citySlug: string; areaSlug?: string }>();
  for (const city of CITIES) {
    for (const alias of [city.name, ...city.aliases]) m.set(normalizeToken(alias), { citySlug: city.slug });
  }
  for (const area of AREAS) {
    for (const alias of [area.name, ...area.aliases]) {
      m.set(normalizeToken(alias), { citySlug: area.citySlug, areaSlug: area.slug });
    }
  }
  return m;
})();

/** Lowercase, strip diacritics and punctuation, collapse whitespace. Devanagari survives NFKD
 *  intact and is matched by the explicit aliases above rather than by transliteration. */
export function normalizeToken(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Sector 104", "sector-3a", "SECTOR 12 A" -> "sector-104" / "sector-3a" / "sector-12a".
 *  Sectors are generated rather than listed: Gurgaon has 115 of them and listing each by hand
 *  would be a maintenance trap for no benefit. */
export function resolveSectorAlias(token: string): string | null {
  const m = /^sector[\s-]*(\d{1,3})\s*([a-z])?$/.exec(normalizeToken(token));
  if (!m) return null;
  const num = Number(m[1]);
  if (num < 1 || num > 115) return null;
  return `sector-${num}${m[2] ?? ""}`;
}

/** Display name for an area slug. Named areas come from the registry; sector slugs are generated,
 *  so they have no entry to look up and would otherwise render as "sector-104". */
export function areaDisplayName(slug: string): string {
  const named = AREA_BY_SLUG.get(slug);
  if (named) return named.name;
  const m = /^sector-(\d{1,3})([a-z])?$/.exec(slug);
  if (m) return `Sector ${m[1]}${m[2] ? m[2].toUpperCase() : ""}`;
  return slug;
}

export function isInBbox(city: City, lat: number, lng: number): boolean {
  const [minLat, minLng, maxLat, maxLng] = city.bbox;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

/** Great-circle distance in km — used to rank "nearby" locations, which are computed from whatever
 *  we actually publish rather than from a hand-written neighbour list. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
