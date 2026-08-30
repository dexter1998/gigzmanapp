import { sql } from "@/lib/db";
import type { JSONValue } from "postgres";

/**
 * Detail lookup for a single already-unlocked lead: description, opening hours, website, and the
 * service attributes a listing carries. Nearby Search returns none of that, and it is exactly what
 * a user wants when they click into a lead they just paid a credit for.
 *
 * This used to drive a self-hosted scraper on an EC2 box over SSM, as a multi-step state machine:
 * pending → starting_instance → scraping → done, one step per tick. Three problems killed it.
 * The instance id and AWS credentials were never set in the production environment, so it could
 * not run at all. Nothing timed out a job that died mid-flight, so the queue wedged behind the
 * first one that did. And with Vercel Hobby capping crons at once a day, an unwatched lead needed
 * three days end to end — for data the product is supposed to hand over immediately.
 *
 * Place Details returns the same information in one request, against an API we already hold a key
 * for and already call for discovery. So this is now a single synchronous call: no queue, no
 * instance, no state machine, and the answer is on screen before the user has finished reading the
 * address. The `lead_enrichment` row survives as a cache and an audit trail, not as a work queue.
 */

const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;

export type EnrichmentStatus =
  // starting_instance and scraping can no longer be reached; they remain so that rows written by
  // the old scraper still render rather than crashing on an unknown status.
  | "not_started" | "pending" | "starting_instance" | "scraping" | "done" | "failed";

export type LeadForEnrichment = {
  id: string;
  place_id: string;
  business_name: string;
  category: string | null;
  lat: number | null;
  lng: number | null;
};

/** The lead, only if this user has actually unlocked it — enrichment never runs on a lead someone
 *  hasn't paid to reveal. */
export async function assertUnlocked(leadId: string, userEmail: string) {
  const [row] = await sql`
    SELECT l.id, l.place_id, l.business_name, l.category, l.lat, l.lng
    FROM leads l
    JOIN unlocks u ON u.lead_id = l.id AND u.unlocked_by = ${userEmail}
    WHERE l.id = ${leadId}
  `;
  return row as LeadForEnrichment | undefined;
}

/**
 * Two field masks, tried in order.
 *
 * Places bills by the most expensive field requested and rejects the whole request if any field is
 * unavailable to the key. The first mask asks for everything worth having; the second drops the
 * Enterprise-tier fields so a key without them still returns hours and a website rather than
 * failing outright. Cheaper is the fallback, not the default — a lead with no description is worth
 * less than one credit.
 */
const FULL_MASK = [
  "id", "displayName", "businessStatus", "primaryTypeDisplayName", "types",
  // editorialSummary is Google's own blurb and is empty for most Indian listings; reviewSummary is
  // the one that actually comes back with something ("Diners like this restaurant's momos…"), and
  // it is the closest thing to the description a caller wants before dialling.
  "editorialSummary", "reviewSummary",
  "websiteUri", "nationalPhoneNumber", "internationalPhoneNumber",
  "regularOpeningHours", "priceLevel", "rating", "userRatingCount",
  "paymentOptions", "parkingOptions", "accessibilityOptions",
  "delivery", "dineIn", "takeout", "curbsidePickup", "reservable",
  "servesVegetarianFood", "outdoorSeating", "restroom", "goodForChildren", "goodForGroups",
].join(",");

const BASIC_MASK = [
  "id", "displayName", "businessStatus", "primaryTypeDisplayName", "types",
  "websiteUri", "nationalPhoneNumber", "internationalPhoneNumber",
  "regularOpeningHours", "priceLevel", "rating", "userRatingCount",
].join(",");

type PlaceDetails = Record<string, unknown>;

async function fetchDetails(placeId: string): Promise<{ data: PlaceDetails } | { error: string }> {
  for (const mask of [FULL_MASK, BASIC_MASK]) {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`, {
      headers: { "X-Goog-Api-Key": PLACES_KEY!, "X-Goog-FieldMask": mask },
      cache: "no-store",
    });
    if (res.ok) return { data: (await res.json()) as PlaceDetails };
    const body = await res.text();
    // 400 on the full mask usually means the key lacks an Enterprise SKU — worth one retry with
    // the cheaper mask. Anything else (404, quota, key restriction) will fail the same way twice.
    if (res.status !== 400 || mask === BASIC_MASK) {
      return { error: `Places ${res.status}: ${body.slice(0, 240)}` };
    }
  }
  return { error: "Places lookup failed" };
}

/** Human labels for the attributes a listing advertises. These are what a caller actually opens
 *  with — "they do delivery and takeout, no card payments" — so they are stored as their own column
 *  rather than left buried in the raw payload for the CSV export to dig out. */
const FLAGS: Array<[string, string]> = [
  ["delivery", "Delivery"],
  ["takeout", "Takeaway"],
  ["dineIn", "Dine-in"],
  ["curbsidePickup", "Kerbside pickup"],
  ["reservable", "Takes reservations"],
  ["servesVegetarianFood", "Vegetarian options"],
  ["outdoorSeating", "Outdoor seating"],
  ["restroom", "Restroom"],
  ["goodForChildren", "Good for children"],
  ["goodForGroups", "Good for groups"],
];

function servicesFrom(d: PlaceDetails): string[] {
  const out: string[] = [];
  const primary = (d.primaryTypeDisplayName as { text?: string } | undefined)?.text;
  if (primary) out.push(primary);
  for (const [key, label] of FLAGS) if (d[key] === true) out.push(label);

  const pay = d.paymentOptions as Record<string, boolean> | undefined;
  if (pay?.acceptsCreditCards) out.push("Card payments");
  if (pay?.acceptsCashOnly) out.push("Cash only");
  if (pay?.acceptsNfc) out.push("Contactless");

  const park = d.parkingOptions as Record<string, boolean> | undefined;
  if (park && Object.values(park).some(Boolean)) out.push("Parking");

  const access = d.accessibilityOptions as Record<string, boolean> | undefined;
  if (access?.wheelchairAccessibleEntrance) out.push("Wheelchair accessible");

  return out;
}

function descriptionFrom(d: PlaceDetails): string | null {
  const ed = (d.editorialSummary as { text?: string } | undefined)?.text;
  if (ed?.trim()) return ed.trim();
  const rs = (d.reviewSummary as { text?: { text?: string } } | undefined)?.text?.text;
  return rs?.trim() || null;
}

/**
 * Fetches and stores the details for one lead. Idempotent: a job already done or failed is
 * returned as-is, so a retry has to clear the row first (which is what POST on the enrich route
 * does).
 */
export async function advance(leadId: string, lead: LeadForEnrichment) {
  if (!PLACES_KEY) {
    return { status: "failed" as const, error: "GOOGLE_PLACES_API_KEY is not configured" };
  }

  // Explicit columns, not SELECT *: adding a column to this table invalidates a cached
  // plan for a star select and every pooled connection then throws "cached plan must not
  // change result type" until it happens to reconnect.
  const [existing] = await sql`SELECT lead_id, status, website_url, open_hours, description, services, price_level, business_status, error, requested_at, enriched_at FROM lead_enrichment WHERE lead_id = ${leadId}`;
  if (existing && (existing.status === "done" || existing.status === "failed")) return existing;

  if (!existing) {
    await sql`INSERT INTO lead_enrichment (lead_id, status) VALUES (${leadId}, 'pending')`;
  }

  if (!lead.place_id) {
    const error = "lead has no place_id";
    await sql`UPDATE lead_enrichment SET status = 'failed', error = ${error} WHERE lead_id = ${leadId}`;
    return { status: "failed" as const, error };
  }

  const result = await fetchDetails(lead.place_id);
  if ("error" in result) {
    await sql`UPDATE lead_enrichment SET status = 'failed', error = ${result.error} WHERE lead_id = ${leadId}`;
    return { status: "failed" as const, error: result.error };
  }

  const d = result.data;
  const services = servicesFrom(d);

  await sql`
    UPDATE lead_enrichment SET
      status = 'done',
      website_url = ${(d.websiteUri as string) ?? null},
      open_hours = ${sql.json((d.regularOpeningHours as JSONValue) ?? null)},
      description = ${descriptionFrom(d)},
      services = ${services.length ? services : null},
      price_level = ${(d.priceLevel as string) ?? null},
      business_status = ${(d.businessStatus as string) ?? null},
      raw = ${sql.json(d as JSONValue)},
      error = NULL,
      enriched_at = now()
    WHERE lead_id = ${leadId}
  `;

  // Places may know a website we recorded as absent. Correcting the lead keeps the public gap
  // figures honest — a business we now know has a site must stop being counted as one that doesn't.
  if (d.websiteUri) {
    await sql`
      UPDATE leads SET has_website = true, website_checked_at = now()
      WHERE id = ${leadId} AND has_website IS DISTINCT FROM true
    `;
  }

  const [done] = await sql`SELECT lead_id, status, website_url, open_hours, description, services, price_level, business_status, error, requested_at, enriched_at FROM lead_enrichment WHERE lead_id = ${leadId}`;
  return done;
}

/** Anything still pending, including rows the old scraper abandoned mid-flight. */
export async function advanceAllInFlight(limit = 25) {
  const rows = (await sql`
    SELECT e.lead_id, l.id, l.place_id, l.business_name, l.category, l.lat, l.lng
    FROM lead_enrichment e
    JOIN leads l ON l.id = e.lead_id
    WHERE e.status IN ('pending', 'starting_instance', 'scraping')
    ORDER BY e.requested_at ASC
    LIMIT ${limit}
  `) as Array<LeadForEnrichment & { lead_id: string }>;
  return runTicks(rows);
}

/** The same sweep, restricted to leads this user has unlocked. Now that a job completes in one
 *  call this is a safety net for rows left behind by the old queue, not the main path. */
export async function advanceInFlightForUser(userEmail: string, limit = 5) {
  const rows = (await sql`
    SELECT e.lead_id, l.id, l.place_id, l.business_name, l.category, l.lat, l.lng
    FROM lead_enrichment e
    JOIN leads l ON l.id = e.lead_id
    JOIN unlocks u ON u.lead_id = l.id AND u.unlocked_by = ${userEmail}
    WHERE e.status IN ('pending', 'starting_instance', 'scraping')
    ORDER BY e.requested_at ASC
    LIMIT ${limit}
  `) as Array<LeadForEnrichment & { lead_id: string }>;
  return runTicks(rows);
}

async function runTicks(rows: Array<LeadForEnrichment & { lead_id: string }>) {
  const results: Array<{ leadId: string; status: string; error?: string }> = [];
  for (const row of rows) {
    try {
      const r = await advance(row.lead_id, row);
      results.push({ leadId: row.lead_id, status: (r as { status: string }).status });
    } catch (err) {
      console.error("enrichment tick failed", row.lead_id, err);
      results.push({ leadId: row.lead_id, status: "error", error: String(err) });
    }
  }
  return results;
}
