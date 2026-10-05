import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { STICKLY_PUBLIC_KEY, signSticklyToken, sticklyIdFor } from "@/lib/stickly";

/**
 * The signed identity the widget boots with.
 *
 * Only a signed-in request gets one, and the subject comes from the session — never from anything
 * the caller sent. Stickly does not verify that a task was actually done, so this token is the only
 * thing standing between a reward and someone minting credits from a console loop.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!STICKLY_PUBLIC_KEY || !process.env.STICKLY_SIGNING_SECRET) {
    // Not configured is not an error the browser should retry; the widget simply stays off.
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const subject = await sticklyIdFor(email);
  return NextResponse.json(
    {
      key: STICKLY_PUBLIC_KEY,
      token: signSticklyToken(subject),
      user: { email, name: session.user?.name ?? null },
    },
    // The token is per-user and short-lived; a shared cache must never hand one person's identity
    // to the next request.
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
