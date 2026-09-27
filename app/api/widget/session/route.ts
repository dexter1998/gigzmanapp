import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { normaliseSlug, touchSite, threadsFor } from "@/lib/widget/store";

/**
 * Everything the widget needs to draw its first frame: who this person is, what we already know
 * about them, and which conversations they can open.
 *
 * One call rather than three because the widget is an iframe that boots on every page load of
 * every site it is embedded on — three round trips before anything renders would be visible.
 *
 * Identity comes from two places and neither is asked for twice:
 *   - a dashboard visitor is signed in, so the session gives us the email and user_profiles gives
 *     the name and phone; the widget skips straight to the conversation
 *   - a public-page visitor has only the token their browser is holding from a previous visit
 *
 * The prefill is deliberately generous: "mandatory email and phone" should never mean asking a
 * signed-in customer for details the account already has.
 */
export async function GET(req: NextRequest) {
  const slug = normaliseSlug(req.nextUrl.searchParams.get("site"));
  const hostOrigin = req.nextUrl.searchParams.get("origin");
  const token = req.headers.get("x-widget-token");

  const { blocked } = await touchSite(slug, hostOrigin);
  if (blocked) return NextResponse.json({ blocked: true, threads: [], prefill: null });

  const session = await auth();
  const userEmail = session?.user?.email ?? null;

  let prefill: { name: string; email: string; countryCode: string; phone: string } | null = null;
  if (userEmail) {
    const [p] = await sql`SELECT name, phone, is_synthetic_email FROM user_profiles WHERE email = ${userEmail}`;
    // A phone-only signup's "email" is the @phone.gigzmanapp.internal placeholder — never show it
    // to the person as if it were their address, or they will "correct" it to something real and
    // we will have silently changed which account the thread belongs to.
    const realEmail = p?.is_synthetic_email ? "" : userEmail;
    const storedPhone = (p?.phone as string | null) ?? "";
    // user_profiles stores E.164 without the plus ("919999999999"). Split it back so the country
    // picker and the number field can be prefilled separately.
    const cc = storedPhone.startsWith("91") && storedPhone.length > 10 ? "+91" : "";
    const local = cc ? storedPhone.slice(2) : storedPhone;
    prefill = {
      name: (p?.name as string | null) ?? session?.user?.name ?? "",
      email: realEmail,
      countryCode: cc || "+91",
      phone: local,
    };
  }

  const threads = await threadsFor(slug, { userEmail, token });

  return NextResponse.json({
    blocked: false,
    signedIn: Boolean(userEmail),
    prefill,
    threads,
  });
}
