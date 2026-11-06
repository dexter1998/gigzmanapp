import { recordApiFailure } from "@/lib/api-alerts";
import { googleFetch, hasGoogleKey } from "@/lib/google-key";

export type GeocodeOutcome<T> = { value: T | null; apiDown: boolean };

/** Resolves free-text location to coordinates via the Google Geocoding API — never done by the
 * LLM itself, so a chat message can't smuggle arbitrary lat/lng through model output. Confirmed
 * live that the existing GOOGLE_PLACES_API_KEY has the Geocoding API enabled. Keys: lib/google-key.ts.
 *
 * Returns `apiDown: true` only for a real failure (network error, non-2xx, or a status other
 * than OK/ZERO_RESULTS) — a genuinely unresolvable/ambiguous place name (ZERO_RESULTS) is not
 * an outage and must not trigger the maintenance banner. */
/** Names another country (or a famous foreign city): then the India bias is dropped. */
const FOREIGN = /\b(usa|u\.s\.a?|united states|america|uk|united kingdom|england|london|uae|dubai|abu dhabi|sharjah|australia|sydney|melbourne|canada|toronto|vancouver|germany|berlin|france|paris|singapore|saudi|riyadh|jeddah|nigeria|lagos|kenya|nairobi|nepal|kathmandu|bangladesh|dhaka|sri lanka|colombo|pakistan|vietnam|china|japan|tokyo|sweden|serbia|bosnia|italy|portugal|brazil|mexico|new york|los angeles|chicago|houston|dallas|texas|california|florida|washington|pierce county|batley|manchester|birmingham)\b/i;

export async function geocodeText(text: string): Promise<GeocodeOutcome<{ lat: number; lng: number }>> {
  // Mantis's users are mostly in India: an unqualified "Kota" is Rajasthan, not Kota, Japan, and
  // "North Chennai" is not a Bengaluru street (both seen on the fallback geocoder, 2026-10-31).
  const india = !FOREIGN.test(text);
  const g = await googleGeocode(text, india);
  if (!g.apiDown) return g;
  // Google down or refused (2026-10-22: the GCP project's billing lapsed and every geocode came back
  // REQUEST_DENIED, so "Gwalior" was asked back forever). OpenStreetMap keeps area lookups working.
  const osm = (india ? await osmGeocode(text, "in") : null) ?? await osmGeocode(text);
  return osm ? { value: osm, apiDown: false } : g;
}

/** OpenStreetMap Nominatim — fallback only (its usage policy allows ~1 request/second). */
async function osmGeocode(text: string, country?: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(text)}${country ? `&countrycodes=${country}` : ""}`, {
      headers: { "user-agent": "MantisAi/1.0 (https://mantisai.in)", "accept-language": "en" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const [hit] = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const lat = Number(hit?.lat), lng = Number(hit?.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) && hit ? { lat, lng } : null;
  } catch {
    return null;
  }
}

async function googleGeocode(text: string, india = true): Promise<GeocodeOutcome<{ lat: number; lng: number }>> {
  if (!hasGoogleKey() || !text.trim()) return { value: null, apiDown: false };

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(text)}${india ? "&region=in" : ""}`;
  let res: Response;
  try {
    res = await googleFetch(url, {}, "query");
  } catch (err) {
    await recordApiFailure("google_geocoding", `Network error: ${(err as Error).message}`, { text });
    return { value: null, apiDown: true };
  }
  if (!res.ok) {
    await recordApiFailure("google_geocoding", `HTTP ${res.status}`, { text });
    return { value: null, apiDown: true };
  }

  const data = (await res.json()) as { status?: string; error_message?: string; results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }> };
  if (data.status !== "OK") {
    if (data.status !== "ZERO_RESULTS") {
      await recordApiFailure("google_geocoding", `status=${data.status}: ${data.error_message ?? ""}`, { text });
      return { value: null, apiDown: true };
    }
    return { value: null, apiDown: false };
  }

  const location = data.results?.[0]?.geometry?.location;
  if (location?.lat == null || location?.lng == null) return { value: null, apiDown: false };
  return { value: { lat: location.lat, lng: location.lng }, apiDown: false };
}

/** How far a named area reaches from its centre, in metres: half the diagonal of Google's viewport
 * for it. "Delhi NCR", "Florida" or "United States" are not neighbourhoods — rank measured every
 * area Mantis holds no city row for as one (3.75 km), so 20 of 47 such runs on prod kept 0 leads
 * (2026-11-06). Cached per process; null when the place can't be resolved. */
const extentCache = new Map<string, number | null>();
export async function areaExtentM(text: string): Promise<number | null> {
  const key = text.trim().toLowerCase();
  if (!key) return null;
  if (extentCache.has(key)) return extentCache.get(key)!;
  let extent: number | null = null;
  if (hasGoogleKey()) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(text)}${FOREIGN.test(text) ? "" : "&region=in"}`;
      const res = await googleFetch(url, {}, "query");
      const d = (await res.json()) as { results?: Array<{ geometry?: { viewport?: { northeast: { lat: number; lng: number }; southwest: { lat: number; lng: number } } } }> };
      const v = d.results?.[0]?.geometry?.viewport;
      if (v) {
        const R = 6_371_000, rad = (x: number) => (x * Math.PI) / 180;
        const dLat = rad(v.northeast.lat - v.southwest.lat), dLng = rad(v.northeast.lng - v.southwest.lng);
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(v.southwest.lat)) * Math.cos(rad(v.northeast.lat)) * Math.sin(dLng / 2) ** 2;
        extent = R * 2 * Math.asin(Math.sqrt(h)) / 2;
      }
    } catch {
      extent = null;
    }
  }
  extentCache.set(key, extent);
  return extent;
}

/** Coordinates -> a human-readable place name, used only for the "reuse my last searched area"
 * clarification option — turns a stored lat/lng from a prior map search into text the normal
 * chat flow (and its history) can read naturally, rather than threading raw coordinates through
 * the planner. */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeOutcome<string>> {
  if (!hasGoogleKey()) return { value: null, apiDown: false };

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}`;
  let res: Response;
  try {
    res = await googleFetch(url, {}, "query");
  } catch (err) {
    await recordApiFailure("google_geocoding", `Network error: ${(err as Error).message}`, { lat, lng });
    return { value: null, apiDown: true };
  }
  if (!res.ok) {
    await recordApiFailure("google_geocoding", `HTTP ${res.status}`, { lat, lng });
    return { value: null, apiDown: true };
  }

  const data = (await res.json()) as { status?: string; error_message?: string; results?: Array<{ formatted_address?: string }> };
  if (data.status !== "OK") {
    if (data.status !== "ZERO_RESULTS") {
      await recordApiFailure("google_geocoding", `status=${data.status}: ${data.error_message ?? ""}`, { lat, lng });
      return { value: null, apiDown: true };
    }
    return { value: null, apiDown: false };
  }
  return { value: data.results?.[0]?.formatted_address ?? null, apiDown: false };
}
