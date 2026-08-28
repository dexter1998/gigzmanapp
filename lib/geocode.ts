import { recordApiFailure } from "@/lib/api-alerts";

export type GeocodeOutcome<T> = { value: T | null; apiDown: boolean };

/** Resolves free-text location to coordinates via the Google Geocoding API — never done by the
 * LLM itself, so a chat message can't smuggle arbitrary lat/lng through model output. Confirmed
 * live that the existing GOOGLE_PLACES_API_KEY has the Geocoding API enabled.
 *
 * Returns `apiDown: true` only for a real failure (network error, non-2xx, or a status other
 * than OK/ZERO_RESULTS) — a genuinely unresolvable/ambiguous place name (ZERO_RESULTS) is not
 * an outage and must not trigger the maintenance banner. */
export async function geocodeText(text: string): Promise<GeocodeOutcome<{ lat: number; lng: number }>> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !text.trim()) return { value: null, apiDown: false };

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(text)}&key=${key}`;
  let res: Response;
  try {
    res = await fetch(url);
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

/** Coordinates -> a human-readable place name, used only for the "reuse my last searched area"
 * clarification option — turns a stored lat/lng from a prior map search into text the normal
 * chat flow (and its history) can read naturally, rather than threading raw coordinates through
 * the planner. */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeOutcome<string>> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return { value: null, apiDown: false };

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`;
  let res: Response;
  try {
    res = await fetch(url);
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
