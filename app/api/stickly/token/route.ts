import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { mintWidgetToken, sticklyConfigured, sticklyIdFor } from "@/lib/stickly";

/**
 * What the browser needs to boot the Stickly widget: the public key and a short
 * JWT naming this user. The signing secret stays here.
 *
 * Deliberately returns 200 with `{ enabled: false }` rather than an error when
 * Stickly is not configured — this is called on every authenticated page load,
 * and a missing optional integration is not a failure worth logging or retrying.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!sticklyConfigured()) return NextResponse.json({ enabled: false });

  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const subject = await sticklyIdFor(session.user.email);

  return NextResponse.json(
    {
      enabled: true,
      key: process.env.STICKLY_PUBLIC_KEY,
      token: mintWidgetToken(subject),
    },
    // The token is per-user and short-lived; nothing between here and the browser
    // should keep a copy.
    { headers: { "cache-control": "private, no-store" } },
  );
}
