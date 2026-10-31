import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

/**
 * Public on purpose: mail clients and Meta fetch these without a session. The id is a random UUID,
 * so a link is only known to whoever was sent it — the same model as any hosted email image.
 */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("not found", { status: 404 });
  const [m] = await sql`SELECT mime, bytes FROM v2_media WHERE id = ${id}`;
  if (!m) return new NextResponse("not found", { status: 404 });
  return new NextResponse(new Uint8Array(m.bytes as Buffer), {
    headers: { "content-type": m.mime as string, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" },
  });
}
