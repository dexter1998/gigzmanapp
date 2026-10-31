import { NextRequest, NextResponse } from "next/server";
import { trackEvent, EV } from "@/lib/events";
import { auth } from "@/auth";
import { isV2Email } from "@/lib/v2";
import { runScout } from "@/lib/v2/scout";
import { normalizeUrl } from "@/lib/v2/net";
import { cleanFields, createManual, listProfiles } from "@/lib/v2/business-profiles";

/** Settings → Business profiles: the businesses a user finds leads for (lib/v2/business-profiles.ts). */
async function me() {
  const session = await auth();
  const email = session?.user?.email;
  return email && isV2Email(email) ? email : null;
}

export async function GET() {
  const email = await me();
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ profiles: await listProfiles(email) });
}

/**
 * Add a business. `{ website }` reads the site the same way the chat does (Mantis Scout) and saves
 * what it found — the same website updates its own profile; `{ name, … }` saves it as typed.
 */
export async function POST(req: NextRequest) {
  const email = await me();
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof body.website === "string" && body.website.trim() && !body.name) {
    const url = normalizeUrl(body.website);
    if (!url) return NextResponse.json({ error: "bad_website" }, { status: 400 });
    const business = typeof body.business === "string" ? body.business.trim().slice(0, 100) : "";
    const out = await runScout({ email, message: `My business${business ? ` is ${business}` : ""}, website: ${url.toString()}`, url: url.toString() });
    trackEvent(email, EV.profileSave, {});
    return NextResponse.json({ profile: out.saved, created: out.created, siteFailed: out.siteFailed, pagesRead: out.pagesRead });
  }
  const f = cleanFields(body);
  if (!f.name) return NextResponse.json({ error: "name_required" }, { status: 400 });
  trackEvent(email, EV.profileSave, {});
  return NextResponse.json({ profile: await createManual(email, f), created: true });
}
