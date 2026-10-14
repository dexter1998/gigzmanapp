import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { POPUPS } from "@/lib/popups";

/**
 * Records that the signed-in account has seen a popup.
 *
 * The browser used to be the only place this was remembered, which meant "once" lasted exactly as
 * long as one localStorage: a new profile saw the 500-credit popup again, and a second person on a
 * shared browser never saw it at all. The account is the right owner of that fact.
 *
 * The id is checked against POPUPS rather than trusted: this route is reachable by any signed-in
 * user, and without it anyone could fill the table with ids of their own choosing.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let id: unknown;
  try {
    ({ id } = await req.json());
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (typeof id !== "string" || !POPUPS.some((p) => p.id === id)) {
    return NextResponse.json({ error: "unknown popup" }, { status: 400 });
  }

  // Re-seeing is not an error, and for a "daily" popup the newer timestamp is the point.
  await sql`
    INSERT INTO popup_seen (user_email, popup_id) VALUES (${email}, ${id})
    ON CONFLICT (user_email, popup_id) DO UPDATE SET seen_at = now()
  `;
  return NextResponse.json({ ok: true });
}
