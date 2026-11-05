import { NextRequest, NextResponse } from "next/server";
import { parseMapToken, renderMap } from "@/lib/email/map-image";

/**
 * The map image in lead-alert emails (lib/email/map-image.ts). Public, because mail clients fetch
 * images without a session; signed, so only locations we put in an email can be rendered.
 *
 * Cached for a year: the image for a rounded location never changes, and Gmail's image proxy fetches
 * it once per message anyway.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const loc = parseMapToken((await params).token);
  if (!loc) return NextResponse.json({ error: "bad token" }, { status: 404 });
  try {
    const png = await renderMap(loc.lat, loc.lng);
    return new NextResponse(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch (err) {
    console.error("[email-map]", (err as Error).message);
    return NextResponse.json({ error: "map unavailable" }, { status: 502 });
  }
}
