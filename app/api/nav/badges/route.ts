import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isV2Email } from "@/lib/v2";
import { getNavBadges, NAV_SECTIONS, type NavBadges } from "@/lib/nav-badges";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };
const ZERO = (): NavBadges => Object.assign({ chatIds: [] as string[] }, ...NAV_SECTIONS.map((s) => ({ [s]: 0 })));

/** Sidebar notification counts in one round trip (lib/nav-badges.ts). Polled by the sidebar. */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  // Every counted surface is V2; other accounts get zeros without touching the database.
  if (!isV2Email(email)) return NextResponse.json(ZERO(), { headers: NO_STORE });
  return NextResponse.json(await getNavBadges(email), { headers: NO_STORE });
}
