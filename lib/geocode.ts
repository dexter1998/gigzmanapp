/** Resolves free-text location to coordinates via the Google Geocoding API — never done by the
 * LLM itself, so a chat message can't smuggle arbitrary lat/lng through model output. Confirmed
 * live that the existing GOOGLE_PLACES_API_KEY has the Geocoding API enabled. */
export async function geocodeText(text: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !text.trim()) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(text)}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as { status?: string; results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }> };
  if (data.status !== "OK") return null;

  const location = data.results?.[0]?.geometry?.location;
  if (location?.lat == null || location?.lng == null) return null;
  return { lat: location.lat, lng: location.lng };
}

/** Coordinates -> a human-readable place name, used only for the "reuse my last searched area"
 * clarification option — turns a stored lat/lng from a prior map search into text the normal
 * chat flow (and its history) can read naturally, rather than threading raw coordinates through
 * the planner. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as { status?: string; results?: Array<{ formatted_address?: string }> };
  if (data.status !== "OK") return null;
  return data.results?.[0]?.formatted_address ?? null;
}
