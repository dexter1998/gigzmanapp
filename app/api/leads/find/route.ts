import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

/**
 * Real Places API (New) Text Search discovery — runs synchronously in this route since it's a
 * quick external call. Leads are inserted with has_website = NULL ("checking") on purpose: the
 * website-check enrichment is gosom's job on the EC2 worker (per plan), not something a Vercel
 * serverless function can run (no persistent browser, execution time limits). Until that worker
 * exists, leads will sit in the "checking" state — that's expected, not a bug.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { area, category } = (await req.json()) as { area?: string; category?: string };
  if (!area || !category) {
    return NextResponse.json({ error: "area and category are required" }, { status: 400 });
  }

  const [scan] = await sql`
    INSERT INTO area_scans (requested_by, area_label, category, status)
    VALUES (${session.user.email}, ${area}, ${category}, 'discovering')
    RETURNING id
  `;

  const placesRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.primaryType",
    },
    body: JSON.stringify({ textQuery: `${category} in ${area}` }),
  });

  if (!placesRes.ok) {
    await sql`UPDATE area_scans SET status = 'failed' WHERE id = ${scan.id}`;
    const errText = await placesRes.text();
    return NextResponse.json({ error: "places_api_failed", detail: errText }, { status: 502 });
  }

  const data = (await placesRes.json()) as {
    places?: Array<{
      id: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
      nationalPhoneNumber?: string;
      primaryType?: string;
    }>;
  };

  const places = data.places ?? [];

  for (const place of places) {
    await sql`
      INSERT INTO leads (area_scan_id, place_id, business_name, category, address, lat, lng, phone, has_website)
      VALUES (
        ${scan.id}, ${place.id}, ${place.displayName?.text ?? "Unknown"}, ${place.primaryType ?? category},
        ${place.formattedAddress ?? null}, ${place.location?.latitude ?? null}, ${place.location?.longitude ?? null},
        ${place.nationalPhoneNumber ?? null}, NULL
      )
      ON CONFLICT (place_id) DO NOTHING
    `;
  }

  await sql`UPDATE area_scans SET status = 'done', completed_at = now() WHERE id = ${scan.id}`;

  return NextResponse.json({
    scanId: scan.id,
    found: places.length,
    leads: places.map((p) => ({ lat: p.location?.latitude ?? null, lng: p.location?.longitude ?? null })),
  });
}
