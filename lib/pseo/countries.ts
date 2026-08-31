/**
 * The countries the lead pages cover.
 *
 * This exists because every assumption the section started with was an Indian one: addresses were
 * parsed as `…, <Area>, <City>, <State> <6-digit PIN>, India`, numbers were grouped as lakhs, and
 * a city slug was assumed to be unique because there was only ever one country in the table. None
 * of those survive contact with a second country, and each one fails silently rather than loudly —
 * a Manchester lead did not error, it resolved to nothing and was dropped at ingest.
 *
 * Registered here, like everything else in this section: a country that is not listed does not
 * resolve, and its leads are excluded rather than guessed at.
 */

export type Country = {
  /** ISO 3166-1 alpha-2, lowercase. This is the URL segment and the value stored on `leads`. */
  code: string;
  name: string;
  /** What `addressComponents` returns as the country's `shortText` — the same letters, uppercase.
   *  Kept explicit rather than derived so the mapping is greppable when a country's code and its
   *  Google code ever disagree (the United Kingdom is "GB", not "UK", and that is exactly the kind
   *  of thing that would otherwise be discovered in production). */
  googleCode: string;
  /** Number grouping for page copy. `en-IN` groups as 1,00,000; everywhere else wants 100,000, and
   *  showing lakhs to a reader in Austin is a small but real credibility leak. */
  locale: string;
  /** Adjective used in copy: "businesses across the United Kingdom". */
  demonym: string;
  status: "active" | "draft";
};

/**
 * Which addressComponent actually names a neighbourhood, per country.
 *
 * There is no universal answer, and assuming India's was the reason four countries produced zero
 * area pages off 40,000 stored leads. Measured across the 141,863-place archive:
 *
 *   component            IN    GB    AU    US    CA
 *   locality            100%    9%  100%  100%  100%
 *   postal_town           0%  100%    0%    0%    0%
 *   neighborhood         26%    2%    0%   96%    4%
 *   sublocality          98%   26%    0%    0%   94%
 *   postal_code         100%  100%  100%  100%  100%
 *
 * So: the United States names neighbourhoods and almost nothing else; Australia has no sub-city
 * component at all because its `locality` *is* the suburb (Surry Hills, South Melbourne) with the
 * metropolitan name appearing nowhere; Britain puts the city in `postal_town` and fills
 * `sublocality` only a quarter of the time, which leaves the postcode district as the only unit
 * present on every address — and "M15" is a real thing British people search, not a workaround.
 */
export type AreaStrategy = {
  /** addressComponent types to try, most specific first. */
  types: string[];
  /** Fall back to the postcode district (the outward half of "M15 4YB") when none of the above
   *  is present. Only where that district is a real, searched place name. */
  postalDistrict: boolean;
};

export const AREA_STRATEGY: Record<string, AreaStrategy> = {
  in: { types: ["neighborhood", "sublocality_level_1", "sublocality", "route"], postalDistrict: false },
  ca: { types: ["neighborhood", "sublocality_level_1", "sublocality"], postalDistrict: false },
  us: { types: ["neighborhood"], postalDistrict: false },
  // Australia's locality is the suburb, so the city can only come from coordinates — which is
  // exactly what resolveLocation's fallback already does.
  au: { types: ["locality"], postalDistrict: false },
  gb: { types: ["sublocality_level_1", "sublocality", "neighborhood"], postalDistrict: true },
};

export function areaStrategyFor(countryCode: string): AreaStrategy {
  return AREA_STRATEGY[countryCode] ?? { types: ["sublocality"], postalDistrict: false };
}

/** "M15 4YB" -> "M15". British postcodes always split on the space, and the outward half is the
 *  district. Returns null for formats that are not a two-part postcode, so a US ZIP never becomes
 *  an "area" by accident. */
export function postalDistrict(postalCode: string | null | undefined): string | null {
  if (!postalCode) return null;
  const m = /^([A-Z]{1,2}\d[A-Z\d]?)\s+\d[A-Z]{2}$/i.exec(postalCode.trim());
  return m ? m[1].toUpperCase() : null;
}

export const COUNTRIES: Country[] = [
  { code: "in", name: "India", googleCode: "IN", locale: "en-IN", demonym: "Indian", status: "active" },
  { code: "us", name: "United States", googleCode: "US", locale: "en-US", demonym: "American", status: "draft" },
  { code: "au", name: "Australia", googleCode: "AU", locale: "en-AU", demonym: "Australian", status: "draft" },
  { code: "gb", name: "United Kingdom", googleCode: "GB", locale: "en-GB", demonym: "British", status: "draft" },
  { code: "ca", name: "Canada", googleCode: "CA", locale: "en-CA", demonym: "Canadian", status: "draft" },
];

export const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

/** "GB" -> the country row. Unregistered countries return undefined, which is what makes a lead
 *  from somewhere we do not cover fail closed instead of landing in a neighbouring registry. */
export const COUNTRY_BY_GOOGLE_CODE = new Map(COUNTRIES.map((c) => [c.googleCode.toUpperCase(), c]));

export function formatNumber(n: number, countryCode: string | null | undefined): string {
  return n.toLocaleString(COUNTRY_BY_CODE.get(countryCode ?? "in")?.locale ?? "en-IN");
}
