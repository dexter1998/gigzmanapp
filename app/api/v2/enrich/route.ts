import { NextRequest, NextResponse } from "next/server";
import { trackEvent, EV } from "@/lib/events";
import { auth } from "@/auth";
import { isV2Email } from "@/lib/v2";
import { enrichSite, MODULES, type Module } from "@/lib/v2/enrich-site";
import { normalizeUrl } from "@/lib/v2/net";

export const maxDuration = 60;

/** Mantis Website Enrich API. POST {url, modules?: ["contacts","meta","tech","pages","people","profile"]}. V2 only. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isV2Email(session?.user?.email)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { url?: string; modules?: string[] };
  const u = b.url ? normalizeUrl(b.url) : null;
  if (!u) return NextResponse.json({ error: "bad_url" }, { status: 400 });
  const modules = (b.modules ?? [...MODULES]).filter((m): m is Module => (MODULES as readonly string[]).includes(m));
  const out = await enrichSite(u.toString(), modules);
  // How each page was fetched is an internal detail (which reader opened it); the client gets
  // only whether a full browser render was needed.
  trackEvent(session?.user?.email, EV.leadEnrich, {});
  return NextResponse.json({ ...out, fetchedVia: [...new Set(out.fetchedVia.map((m) => (m === "plain" ? "direct" : "rendered")))] });
}
