import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isV2Email } from "@/lib/v2";
import { isSeenKey, markNavSeen } from "@/lib/nav-badges";

const NO_STORE = { "Cache-Control": "no-store" };

/** POST {section} — the user is looking at it now. section: inbox | leads | campaigns | chat | chat:<id>. */
export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const body = (await req.json().catch(() => ({}))) as { section?: unknown };
  if (!isSeenKey(body.section)) return NextResponse.json({ error: "bad_section" }, { status: 400, headers: NO_STORE });
  if (isV2Email(email)) await markNavSeen(email, body.section);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
