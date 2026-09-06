import { recordApiFailure } from "@/lib/api-alerts";

/**
 * The one place that calls Google's Nearby Search (New). Originally lived only in
 * app/api/leads/find/route.ts; pulled out so app/api/jobs/discover/route.ts can independently
 * discover businesses in a viewport too, instead of only ever reading whatever the leads pipeline
 * happened to have already found there. Every Places API call this process makes goes through
 * `fetchNearbyBatch` — counting invocations of it is what "did this cost money" means.
 */

export type PlacesResult = {
  places?: Array<{
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    nationalPhoneNumber?: string;
    primaryType?: string;
    rating?: number;
    userRatingCount?: number;
    websiteUri?: string;
  }>;
};

export type Cell = { lat: number; lng: number; radius: number };

export async function fetchNearbyBatch(types: string[], cell: Cell): Promise<{ places: NonNullable<PlacesResult["places"]>; failed: boolean }> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
      // See app/api/leads/find/route.ts's original comment: Nearby Search (New) has no pagination,
      // and websiteUri rides free in the same Enterprise-tier field mask as rating/userRatingCount/
      // nationalPhoneNumber (all billed under one $35/1000 SKU), so there is no separate per-lead
      // Place Details call needed just to learn whether a business has a website.
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.primaryType,places.rating,places.userRatingCount,places.websiteUri",
    },
    body: JSON.stringify({
      includedTypes: types,
      maxResultCount: 20,
      rankPreference: "DISTANCE",
      locationRestriction: { circle: { center: { latitude: cell.lat, longitude: cell.lng }, radius: cell.radius } },
    }),
  });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    await recordApiFailure("google_places", `HTTP ${res.status} from Nearby Search`, {
      status: res.status,
      body: bodyText.slice(0, 500),
      types,
      cell,
    });
    return { places: [], failed: true };
  }
  const data = (await res.json()) as PlacesResult;
  return { places: data.places ?? [], failed: false };
}

/** Recursion floor for quadrant subdivision — below this, a capped cell is treated as exhausted
 * anyway rather than subdividing into circles too small to mean anything. */
export const MIN_CELL_RADIUS_METERS = 150;

/** Splits a capped circle into 4 overlapping quadrant sub-circles at half the radius — the
 * standard way to get past Nearby Search's flat 20-result cap without real pagination. Offsets
 * are converted from meters to degrees (111,320 m/deg latitude; longitude scaled by cos(lat)). */
export function splitIntoQuadrants(cell: Cell): Cell[] {
  const subRadius = cell.radius / 2;
  const offsetMeters = cell.radius / 2;
  const dLat = offsetMeters / 111320;
  const dLng = offsetMeters / (111320 * Math.cos((cell.lat * Math.PI) / 180));
  return [
    { lat: cell.lat + dLat, lng: cell.lng + dLng, radius: subRadius },
    { lat: cell.lat + dLat, lng: cell.lng - dLng, radius: subRadius },
    { lat: cell.lat - dLat, lng: cell.lng + dLng, radius: subRadius },
    { lat: cell.lat - dLat, lng: cell.lng - dLng, radius: subRadius },
  ];
}
