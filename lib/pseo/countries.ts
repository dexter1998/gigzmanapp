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
  ca: { types: ["neighborhood", "sublocality_level_1", "sublocality"], postalDistrict: true },
  us: { types: ["neighborhood"], postalDistrict: true },
  // Australia's locality is the suburb, so the city can only come from coordinates — which is
  // exactly what resolveLocation's fallback already does.
  au: { types: ["locality"], postalDistrict: false },
  // Australia deliberately keeps no postal fallback: its `locality` IS the suburb and is present
  // on every address, so a postcode would only ever be a worse name for the same place.
  gb: { types: ["sublocality_level_1", "sublocality", "neighborhood"], postalDistrict: true },
};

export function areaStrategyFor(countryCode: string): AreaStrategy {
  return AREA_STRATEGY[countryCode] ?? { types: ["sublocality"], postalDistrict: false };
}

/**
 * The postal unit that names a neighbourhood, per country.
 *
 * Each country's postal code carries a different amount of place in it, so a single parser would be
 * wrong four ways:
 *   GB  "M15 4YB"  -> "M15"    the outward code, a real district people search
 *   CA  "M5B 1R8"  -> "M5B"    the forward sortation area, the same idea
 *   US  "78704"    -> "78704"  the ZIP is already the unit; there is nothing to trim
 *
 * Returns null for anything that does not match that country's shape, so a malformed value becomes
 * no area rather than a fake one.
 */
const WHOLE_CODE_COUNTRIES = new Set(["us", "de", "fr", "es", "it", "gr", "at", "be", "dk", "ch", "hu", "nl", "pl", "pt", "se", "cz"]);

export function postalDistrict(postalCode: string | null | undefined, countryCode = "gb"): string | null {
  if (!postalCode) return null;
  const v = postalCode.trim().toUpperCase();
  if (WHOLE_CODE_COUNTRIES.has(countryCode)) return v.replace(/\s+/g, countryCode === "nl" ? " " : "");
  if (countryCode === "ca") { const m = /^([A-Z]\d[A-Z])\s*\d[A-Z]\d$/.exec(v); return m ? m[1] : null; }
  const m = /^([A-Z]{1,2}\d[A-Z\d]?)\s+\d[A-Z]{2}$/.exec(v);
  return m ? m[1] : null;
}

/**
 * The full postal code inside a free-text address.
 *
 * The old parser looked only for a six-digit Indian PIN, so every scraped British, American,
 * Canadian and Australian lead stored a null postal code — which made them invisible to the
 * district analysis that decides which areas are worth registering, even while the same leads were
 * correctly landing in an already-registered area.
 */
export function postalCodeFromAddress(countryCode: string, address: string): string | null {
  const a = address.toUpperCase();
  const pat: Record<string, RegExp> = {
    gb: /\b[A-Z]{1,2}\d[A-Z\d]?\s+\d[A-Z]{2}\b/,
    ca: /\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b/,
    us: /\b[A-Z]{2}\s+(\d{5})(?:-\d{4})?\b/,
    au: /\b(\d{4})\b(?=\s*,?\s*AUSTRALIA)/,
    in: /\b(\d{6})\b/,
    // Continental Europe's actual shape, confirmed against real gosom output (measured, not
    // assumed): "Street Number, POSTAL City[-District], Country" -- e.g.
    // "Frauenstraße 17, 80469 München-Altstadt-Lehel, Germany". The postal code sits right after a
    // comma and is immediately followed by the city name, NOT the country -- anchoring on the
    // country name (an earlier version of this) matched nothing at all, because the city name sits
    // in between. The comma before it is what a bare street number never has, which is what keeps
    // "Frauenstraße 17" from being misread as a 2-digit code.
    de: /,\s*(\d{5})\s+\S/, fr: /,\s*(\d{5})\s+\S/,
    es: /,\s*(\d{5})\s+\S/, it: /,\s*(\d{5})\s+\S/, gr: /,\s*(\d{3}\s?\d{2})\s+\S/,
    at: /,\s*(\d{4})\s+\S/, be: /,\s*(\d{4})\s+\S/,
    dk: /,\s*(\d{4})\s+\S/, ch: /,\s*(\d{4})\s+\S/, hu: /,\s*(\d{4})\s+\S/,
    nl: /,\s*(\d{4}\s?[A-Z]{2})\s+\S/,
    pl: /,\s*(\d{2}-\d{3})\s+\S/,
    pt: /,\s*(\d{4}-\d{3})\s+\S/,
    se: /,\s*(\d{3}\s?\d{2})\s+\S/,
    cz: /,\s*(\d{3}\s?\d{2})\s+\S/,
    // Ireland (Eircode) and the UAE have no address-embedded postal signal reliable enough to
    // parse from free text -- confirmed for the UAE by inspecting real addresses, which carry no
    // postal code at all ("Rolex Tower ..., Dubai, United Arab Emirates"). A lead there gets no
    // area rather than a wrong one.
  };
  const m = pat[countryCode]?.exec(a);
  if (!m) return null;
  return (m[1] ?? m[0]).trim();
}

/**
 * The same answer from a free-text address, for sources that give no addressComponents.
 *
 * gosom returns one address string and nothing else, so without this a scraped record resolves to
 * the right city and no area at all — which is exactly what it did: every non-Indian test address
 * came back `via=coordinates` with a null area, meaning a scrape would have added leads to city
 * totals and contributed nothing to the area pages it was run for.
 */
export function areaTokenFromAddress(countryCode: string, address: string): string | null {
  const a = address.toUpperCase();
  if (countryCode === "gb") {
    const m = /\b([A-Z]{1,2}\d[A-Z\d]?)\s+\d[A-Z]{2}\b/.exec(a);
    return m ? m[1] : null;
  }
  if (countryCode === "ca") {
    const m = /\b([A-Z]\d[A-Z])\s*\d[A-Z]\d\b/.exec(a);
    return m ? m[1] : null;
  }
  if (countryCode === "us") {
    // Anchored on the state abbreviation so a street number can never be read as a ZIP.
    const m = /\b[A-Z]{2}\s+(\d{5})(?:-\d{4})?\b/.exec(a);
    return m ? m[1] : null;
  }
  if (countryCode === "au") {
    // "…, Surry Hills NSW 2010, Australia" — the suburb sits immediately before the state code.
    const m = /,\s*([^,]+?)\s+(?:NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\s+\d{4}\b/.exec(a);
    return m ? m[1].trim() : null;
  }
  // Continental Europe: the area token IS the postal code (see postalCodeFromAddress) -- there is
  // no separate neighbourhood name to extract from gosom's free-text address for any of these, so
  // reusing that parser rather than duplicating its per-country regex is what keeps the two paths
  // from silently drifting apart the way this one already had (it never had these cases at all
  // until a real Munich scrape showed every German lead resolving to a city with no area).
  return postalCodeFromAddress(countryCode, address);
}

export const COUNTRIES: Country[] = [
  { code: "in", name: "India", googleCode: "IN", locale: "en-IN", demonym: "Indian", status: "active" },
  { code: "us", name: "United States", googleCode: "US", locale: "en-US", demonym: "American", status: "draft" },
  { code: "au", name: "Australia", googleCode: "AU", locale: "en-AU", demonym: "Australian", status: "draft" },
  { code: "gb", name: "United Kingdom", googleCode: "GB", locale: "en-GB", demonym: "British", status: "draft" },
  { code: "ca", name: "Canada", googleCode: "CA", locale: "en-CA", demonym: "Canadian", status: "draft" },
  { code: "ae", name: "United Arab Emirates", googleCode: "AE", locale: "en-AE", demonym: "Emirati", status: "draft" },
  { code: "fr", name: "France", googleCode: "FR", locale: "fr-FR", demonym: "French", status: "draft" },
  { code: "de", name: "Germany", googleCode: "DE", locale: "de-DE", demonym: "German", status: "draft" },
  { code: "nl", name: "Netherlands", googleCode: "NL", locale: "nl-NL", demonym: "Dutch", status: "draft" },
  { code: "es", name: "Spain", googleCode: "ES", locale: "es-ES", demonym: "Spanish", status: "draft" },
  { code: "it", name: "Italy", googleCode: "IT", locale: "it-IT", demonym: "Italian", status: "draft" },
  { code: "pl", name: "Poland", googleCode: "PL", locale: "pl-PL", demonym: "Polish", status: "draft" },
  { code: "at", name: "Austria", googleCode: "AT", locale: "de-AT", demonym: "Austrian", status: "draft" },
  { code: "be", name: "Belgium", googleCode: "BE", locale: "nl-BE", demonym: "Belgian", status: "draft" },
  { code: "ie", name: "Ireland", googleCode: "IE", locale: "en-IE", demonym: "Irish", status: "draft" },
  { code: "pt", name: "Portugal", googleCode: "PT", locale: "pt-PT", demonym: "Portuguese", status: "draft" },
  { code: "se", name: "Sweden", googleCode: "SE", locale: "sv-SE", demonym: "Swedish", status: "draft" },
  { code: "dk", name: "Denmark", googleCode: "DK", locale: "da-DK", demonym: "Danish", status: "draft" },
  { code: "ch", name: "Switzerland", googleCode: "CH", locale: "de-CH", demonym: "Swiss", status: "draft" },
  { code: "cz", name: "Czech Republic", googleCode: "CZ", locale: "cs-CZ", demonym: "Czech", status: "draft" },
  { code: "hu", name: "Hungary", googleCode: "HU", locale: "hu-HU", demonym: "Hungarian", status: "draft" },
  { code: "gr", name: "Greece", googleCode: "GR", locale: "el-GR", demonym: "Greek", status: "draft" },
];

export const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

/** "GB" -> the country row. Unregistered countries return undefined, which is what makes a lead
 *  from somewhere we do not cover fail closed instead of landing in a neighbouring registry. */
export const COUNTRY_BY_GOOGLE_CODE = new Map(COUNTRIES.map((c) => [c.googleCode.toUpperCase(), c]));

export function formatNumber(n: number, countryCode: string | null | undefined): string {
  return n.toLocaleString(COUNTRY_BY_CODE.get(countryCode ?? "in")?.locale ?? "en-IN");
}
