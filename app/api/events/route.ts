import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { trackEvent } from "@/lib/events";

/**
 * The client beacon's drop box (components/ActivityBeacon.tsx): a small batch of click / view
 * events per request. Names are validated in trackEvent; anything odd is dropped silently —
 * analytics must never surface an error to the user.
 */
const MAX_BATCH = 50;

export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { sessionId?: string; device?: string; events?: Array<{ event: string; path?: string; props?: Record<string, unknown> }> } | null;
  const events = Array.isArray(body?.events) ? body!.events.slice(0, MAX_BATCH) : [];
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.slice(0, 40) : null;
  const device = body?.device === "mobile" || body?.device === "desktop" ? body.device : null;
  for (const e of events) {
    if (!e || typeof e.event !== "string") continue;
    trackEvent(email, e.event, e.props ?? {}, { source: "client", path: typeof e.path === "string" ? e.path.slice(0, 200) : null, sessionId, device });
  }
  return NextResponse.json({ ok: true, n: events.length });
}
