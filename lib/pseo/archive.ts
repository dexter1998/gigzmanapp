import type { PlaceAddressComponent } from "@/lib/pseo/address";

/**
 * One row of `places.ndjson` — the scan archive that scripts/places-scan.ts writes.
 *
 * The archive is deliberately wider than `leads`: it keeps every place the scan paid for,
 * including the ones the category allowlist and the location resolver drop. This type is what the
 * three readers of that file agree on, so a field renamed in the scanner breaks them at compile
 * time rather than silently reading undefined.
 */
export type ArchivedPlace = {
  place_id: string;
  business_name: string | null;
  primary_type: string | null;
  types: string[];
  address: string | null;
  address_components: PlaceAddressComponent[] | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  review_count: number | null;
  business_status: string | null;
  scanned_country: string;
  scanned_city: string;
  scanned_phrase: string;
  scanned_at: string;
};
