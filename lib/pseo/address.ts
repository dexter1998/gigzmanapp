import {
  CITY_BY_SLUG,
  GLOBAL_ALIAS_MAP,
  citiesContaining,
  isInBbox,
  lookupAlias,
  normalizeToken,
  resolveSectorAlias,
  type AliasHit,
} from "@/lib/pseo/locations";
import {
  COUNTRY_BY_CODE,
  COUNTRY_BY_GOOGLE_CODE,
  areaStrategyFor,
  areaTokenFromAddress,
  postalDistrict,
} from "@/lib/pseo/countries";

/**
 * Turns a place's address into a canonical country/city/area, using no API calls.
 *
 * There are two sources and they give very different material, so there are two paths:
 *
 * **Places** returns `addressComponents` — an explicit country, locality and sublocality, already
 * separated and labelled. That path is exact, and it is the one worth having: the free-text parser
 * below was written against Indian addresses and reads every other format badly, silently, and in
 * a way that looks like "no results" rather than like a bug.
 *
 * **gosom** returns only a free-text address, so that path keeps the original token parsing, now
 * with an ambiguity check instead of an assumed country.
 *
 * Both paths end at the same hard check: the resolved city's bounding box has to contain the
 * lead's own coordinates. That check is what makes the result trustworthy without a geocoding
 * call, and it is the reason 206 New York addresses never became a page when the registry only
 * knew about Gurgaon.
 */

export type PlaceAddressComponent = { longText?: string; shortText?: string; types?: string[] };

export type ParsedAddress = {
  cityToken: string | null;
  areaToken: string | null;
  state: string | null;
  postalCode: string | null;
};

export type ResolvedLocation = {
  countryCode: string;
  citySlug: string;
  areaSlug: string | null;
  state: string | null;
  postalCode: string | null;
  /** Which path produced this. Recorded so a coverage shortfall can be attributed to the parser
   *  rather than to the scan — the two need completely different fixes. */
  via: "components" | "text" | "coordinates";
};

/** Reason a lead didn't resolve — recorded so the backfill can be audited rather than guessed at. */
export type ResolutionFailure =
  | "no-address"
  | "no-coordinates"
  | "unknown-country"
  | "unknown-city"
  | "ambiguous-city"
  | "outside-bbox";

export type Resolution =
  | { ok: true; value: ResolvedLocation }
  | { ok: false; reason: ResolutionFailure };

const pick = (components: PlaceAddressComponent[], type: string, short = false): string | null => {
  const c = components.find((x) => x.types?.includes(type));
  return (short ? c?.shortText : c?.longText) ?? null;
};

/**
 * The Places path.
 *
 * `postal_town` is checked alongside `locality` because UK addresses frequently carry no locality
 * at all — Manchester arrives as a postal_town, and reading only `locality` loses most of Britain.
 */
export function resolveFromComponents(
  components: PlaceAddressComponent[],
  lat: number,
  lng: number
): Resolution {
  const googleCountry = pick(components, "country", true);
  const country = googleCountry ? COUNTRY_BY_GOOGLE_CODE.get(googleCountry.toUpperCase()) : undefined;
  if (!country) return { ok: false, reason: "unknown-country" };

  const cityToken = pick(components, "locality") ?? pick(components, "postal_town");

  // Which component names a neighbourhood is a per-country question — see AREA_STRATEGY for the
  // measured fill rates. Reading India's answer everywhere is why four countries held 40,000
  // stored leads and produced no area pages at all.
  const strategy = areaStrategyFor(country.code);
  const areaTokens = strategy.types
    .map((t) => pick(components, t))
    .filter((t): t is string => !!t);
  if (strategy.postalDistrict) {
    // Britain fills `sublocality` about a quarter of the time and America fills `neighborhood` only
    // in its larger cities; the postal code is on every address in both. It is also the one unit a
    // free-text address can yield, which is what keeps the scraper and Places describing the same
    // places rather than two parallel sets.
    const d = postalDistrict(pick(components, "postal_code"), country.code);
    if (d) areaTokens.push(d);
  }

  let hit: AliasHit | undefined = cityToken ? lookupAlias(country.code, cityToken) : undefined;
  // The city slot may itself name an area — a village or suburb Google reports as the locality —
  // in which case it carries its own city with it.
  if (!hit) {
    for (const t of areaTokens) {
      const areaHit = lookupAlias(country.code, t);
      if (areaHit?.areaSlug) { hit = areaHit; break; }
    }
  }

  const state = pick(components, "administrative_area_level_1");
  const postalCode = pick(components, "postal_code");

  if (!hit) {
    // Nothing in the text matched, but the coordinates might still land squarely inside a city we
    // cover. Restricted to this country so a border town can never resolve across it.
    const near = citiesContaining(lat, lng).find((c) => c.countryCode === country.code);
    if (!near) return { ok: false, reason: "unknown-city" };
    return {
      ok: true,
      value: { countryCode: country.code, citySlug: near.slug, areaSlug: null, state, postalCode, via: "coordinates" },
    };
  }

  const city = CITY_BY_SLUG.get(hit.citySlug);
  if (!city) return { ok: false, reason: "unknown-city" };
  if (!isInBbox(city, lat, lng)) return { ok: false, reason: "outside-bbox" };

  let areaSlug: string | null = hit.areaSlug ?? null;
  for (const t of areaTokens) {
    const a = lookupAlias(country.code, t)?.areaSlug ?? (country.code === "in" ? resolveSectorAlias(t) : null);
    if (a) { areaSlug = a; break; }
  }

  return {
    ok: true,
    value: { countryCode: country.code, citySlug: city.slug, areaSlug, state, postalCode, via: "components" },
  };
}

/**
 * The free-text path, unchanged in substance from the version written for Indian addresses.
 *
 * Indian addresses from Places end `…, <Area>, <City>, <State> <6-digit PIN>, India`, but only
 * loosely — the area can appear at almost any position, the state is sometimes missing entirely
 * (production has bare "110045"), and the city slot is often a village or a locality.
 */
export function parseIndianAddress(address: string): ParsedAddress {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);

  const out: ParsedAddress = { cityToken: null, areaToken: null, state: null, postalCode: null };
  if (parts.length === 0) return out;

  // Drop the country if present.
  let end = parts.length - 1;
  if (normalizeToken(parts[end]) === "india") end -= 1;
  if (end < 0) return out;

  // "Haryana 122006" -> state + PIN; a bare "110045" gives a PIN with no state.
  const stateToken = parts[end];
  const withPin = /^(.*?)\s*(\d{6})$/.exec(stateToken);
  if (withPin) {
    out.state = withPin[1].trim() || null;
    out.postalCode = withPin[2];
    end -= 1;
  } else if (/^[A-Za-z\s]+$/.test(stateToken) && end > 0) {
    out.state = stateToken;
    end -= 1;
  }

  if (end >= 0) out.cityToken = parts[end];

  // The area can sit anywhere before the city, so scan every remaining token rather than assuming a
  // position.
  //
  // Named areas beat sector numbers, and that ordering matters. Addresses routinely carry both
  // ("…, DLF Phase 3, Sector 24, Gurugram, …") because the sector is the administrative container
  // for the named colony inside it. Taking whichever appeared nearest the city collapsed DLF
  // Phase 3, Udyog Vihar and Cyber City into "Sector 24" — 3,890 leads under one meaningless
  // heading, and the three names people actually search for gone entirely.
  // Scanned forwards, because Indian addresses run most-specific to least-specific: "DLF Cyber
  // City, DLF Phase 2, Gurugram" names the district first and its container second. Scanning
  // backwards picked the container, which folded Cyber City's 1,100 businesses into DLF Phase 2
  // and left the best-known commercial name in Gurgaon without a page.
  for (let i = 0; i < end; i++) {
    const g = GLOBAL_ALIAS_MAP.get(normalizeToken(parts[i]));
    if (g && g !== "ambiguous" && g.areaSlug) { out.areaToken = parts[i]; break; }
  }
  if (!out.areaToken) {
    for (let i = end - 1; i >= 0; i--) {
      if (resolveSectorAlias(parts[i])) { out.areaToken = parts[i]; break; }
    }
  }

  return out;
}

/**
 * The area a free-text address names, for the countries whose addresses actually carry one.
 *
 * gosom gives one address string and no components, so without this every non-Indian scraped record
 * resolved to the right city and no area — measured, not assumed: London, Manchester, Austin,
 * Sydney and Toronto all came back `via=coordinates` with a null area. A scrape run to fill area
 * pages would have added leads to city totals and left the area pages exactly as they were.
 *
 * Deliberately returns the same unit the components path would, so the two sources describe one set
 * of places rather than two overlapping ones.
 */
function areaFromText(countryCode: string, address: string): string | null {
  if (!COUNTRY_BY_CODE.has(countryCode)) return null;
  const token = areaTokenFromAddress(countryCode, address);
  if (!token) return null;
  const hit = lookupAlias(countryCode, token);
  return hit?.areaSlug ?? null;
}

/**
 * The full resolution.
 *
 * Pass `components` whenever they exist — every Places response carries them, and that path is
 * exact where the text path is inference. Returns the failure reason rather than just null so a
 * backfill can report *why* a batch didn't resolve: "unknown-country" means the registry needs a
 * country, "unknown-city" means it needs a city, "outside-bbox" means the text lied.
 */
export function resolveLocation(
  address: string | null,
  lat: number | null,
  lng: number | null,
  components?: PlaceAddressComponent[] | null
): Resolution {
  // Without coordinates the integrity check can't run, and an unverified resolution is exactly what
  // this design refuses to publish. Such a lead can't appear on a map page anyway.
  if (lat == null || lng == null) return { ok: false, reason: "no-coordinates" };
  if (components?.length) return resolveFromComponents(components, lat, lng);
  if (!address) return { ok: false, reason: "no-address" };

  const parsed = parseIndianAddress(address);

  const raw = parsed.cityToken ? GLOBAL_ALIAS_MAP.get(normalizeToken(parsed.cityToken)) : undefined;
  if (raw === "ambiguous") return { ok: false, reason: "ambiguous-city" };

  if (!raw) {
    // Same coordinate fallback as the components path, but with no country to restrict it, so the
    // bounding box is doing all the work. It is enough: boxes are drawn per city, and a point
    // inside one is inside that city whatever its address said.
    const near = citiesContaining(lat, lng)[0];
    if (!near) return { ok: false, reason: "unknown-city" };
    return {
      ok: true,
      value: {
        countryCode: near.countryCode, citySlug: near.slug,
        areaSlug: areaFromText(near.countryCode, address),
        state: parsed.state, postalCode: parsed.postalCode, via: "coordinates",
      },
    };
  }

  const city = CITY_BY_SLUG.get(raw.citySlug);
  if (!city) return { ok: false, reason: "unknown-city" };
  if (!isInBbox(city, lat, lng)) return { ok: false, reason: "outside-bbox" };

  // Area precedence: an explicit area token beats a village-in-the-city-slot, which beats nothing.
  let areaSlug: string | null = raw.areaSlug ?? null;
  if (parsed.areaToken) {
    const g = GLOBAL_ALIAS_MAP.get(normalizeToken(parsed.areaToken));
    areaSlug =
      (g && g !== "ambiguous" ? g.areaSlug : undefined) ??
      (city.countryCode === "in" ? resolveSectorAlias(parsed.areaToken) : null) ??
      areaSlug;
  }
  areaSlug = areaSlug ?? areaFromText(city.countryCode, address);

  return {
    ok: true,
    value: {
      countryCode: city.countryCode, citySlug: city.slug, areaSlug,
      state: parsed.state, postalCode: parsed.postalCode, via: "text",
    },
  };
}
