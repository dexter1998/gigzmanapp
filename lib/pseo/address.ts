import {
  ALIAS_MAP,
  CITY_BY_SLUG,
  isInBbox,
  normalizeToken,
  resolveSectorAlias,
} from "@/lib/pseo/locations";

/**
 * Turns Google's free-text `formattedAddress` into a canonical city/area, using no API calls.
 *
 * Indian addresses from Places end `…, <Area>, <City>, <State> <6-digit PIN>, India`, but only
 * loosely — the area can appear at almost any position, the state is sometimes missing entirely
 * (production has bare "110045"), and the city slot is often a village or a locality.
 *
 * Everything here is best-effort parsing followed by one hard check: the resolved city's bounding
 * box has to contain the lead's own coordinates. That check is what makes the result trustworthy
 * without a geocoding call — production contains 206 New York addresses, and it is the coordinate
 * test, not the text, that keeps them out.
 */

export type ParsedAddress = {
  cityToken: string | null;
  areaToken: string | null;
  state: string | null;
  postalCode: string | null;
};

export type ResolvedLocation = {
  citySlug: string;
  areaSlug: string | null;
  state: string | null;
  postalCode: string | null;
};

/** Reason a lead didn't resolve — recorded so the backfill can be audited rather than guessed at. */
export type ResolutionFailure =
  | "no-address"
  | "no-coordinates"
  | "unknown-city"
  | "outside-bbox";

export function parseIndianAddress(address: string): ParsedAddress {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

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
    if (ALIAS_MAP.get(normalizeToken(parts[i]))?.areaSlug) {
      out.areaToken = parts[i];
      break;
    }
  }
  if (!out.areaToken) {
    for (let i = end - 1; i >= 0; i--) {
      if (resolveSectorAlias(parts[i])) {
        out.areaToken = parts[i];
        break;
      }
    }
  }

  return out;
}

/**
 * The full resolution, including the coordinate integrity check.
 *
 * Returns the failure reason rather than just null so the backfill can report *why* a batch didn't
 * resolve — "unknown-city" means the registry needs an entry, "outside-bbox" means the text lied.
 */
export function resolveLocation(
  address: string | null,
  lat: number | null,
  lng: number | null
): { ok: true; value: ResolvedLocation } | { ok: false; reason: ResolutionFailure } {
  if (!address) return { ok: false, reason: "no-address" };
  // Without coordinates the integrity check can't run, and an unverified resolution is exactly what
  // this design refuses to publish. Such a lead can't appear on a map page anyway.
  if (lat == null || lng == null) return { ok: false, reason: "no-coordinates" };

  const parsed = parseIndianAddress(address);

  // The city slot may itself name an area (a village Google reports as the city), in which case it
  // carries its own city with it.
  const cityHit = parsed.cityToken ? ALIAS_MAP.get(normalizeToken(parsed.cityToken)) : undefined;
  if (!cityHit) return { ok: false, reason: "unknown-city" };

  const city = CITY_BY_SLUG.get(cityHit.citySlug);
  if (!city) return { ok: false, reason: "unknown-city" };
  if (!isInBbox(city, lat, lng)) return { ok: false, reason: "outside-bbox" };

  // Area precedence: an explicit area token beats a village-in-the-city-slot, which beats nothing.
  let areaSlug: string | null = cityHit.areaSlug ?? null;
  if (parsed.areaToken) {
    areaSlug =
      ALIAS_MAP.get(normalizeToken(parsed.areaToken))?.areaSlug ??
      resolveSectorAlias(parsed.areaToken) ??
      areaSlug;
  }

  return {
    ok: true,
    value: { citySlug: city.slug, areaSlug, state: parsed.state, postalCode: parsed.postalCode },
  };
}
