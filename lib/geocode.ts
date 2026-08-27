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
