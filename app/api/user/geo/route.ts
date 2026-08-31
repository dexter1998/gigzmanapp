import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

/**
 * One-time country capture. The app layout beacons here when the signed-in profile has no
 * country; the request's forwarded IP goes through a free geo lookup and the result is stored
 * once. Deliberately not in the auth callbacks — they don't see the request, and this touches
 * each user exactly once instead of on every session.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: true });
  const email = session.user.email;

  const [row] = await sql`SELECT country FROM user_profiles WHERE email = ${email}`;
  if (row?.country) return NextResponse.json({ ok: true });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  if (!ip || ip.startsWith("10.") || ip.startsWith("172.31.") || ip === "127.0.0.1") {
    return NextResponse.json({ ok: true });
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country`, { signal: AbortSignal.timeout(3000) });
    const geo = (await res.json()) as { status?: string; country?: string };
    if (geo.status === "success" && geo.country) {
      await sql`UPDATE user_profiles SET country = ${geo.country} WHERE email = ${email} AND country IS NULL`;
    }
  } catch { /* best-effort — koi retry loop nahi */ }
  return NextResponse.json({ ok: true });
}
