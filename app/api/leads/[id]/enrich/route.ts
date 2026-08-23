import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

/**
 * Resolves has_website for one lead via Google Place Details' `websiteUri` field — not gosom.
 * The original plan was a self-hosted scraper on an EC2 worker (still not deployed, AWS access
 * still blocked), which is why leads were stuck permanently grey. Place Details is a real,
 * serverless-compatible, no-infra-needed alternative: `websiteUri` sits in the Contact Data SKU
 * (~$32-35/1000 lookups, confirmed earlier this session), meaningfully pricier per-lookup than
 * gosom's ~$7/1000 at real volume — fine for now at testing volume, but worth revisiting gosom
 * on EC2 once AWS access exists and volume grows.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const [lead] = await sql`SELECT place_id FROM leads WHERE id = ${id}`;
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });

  const res = await fetch(`https://places.googleapis.com/v1/places/${lead.place_id}`, {
    headers: {
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
      "X-Goog-FieldMask": "websiteUri",
    },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "place_details_failed", detail: await res.text() }, { status: 502 });
  }

  const data = (await res.json()) as { websiteUri?: string };
  const hasWebsite = Boolean(data.websiteUri);

  await sql`UPDATE leads SET has_website = ${hasWebsite}, website_checked_at = now() WHERE id = ${id}`;

  return NextResponse.json({ id, hasWebsite });
}
