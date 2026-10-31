import { NextRequest, NextResponse } from "next/server";
import { trackEvent, EV } from "@/lib/events";
import { auth } from "@/auth";
import { isV2Email } from "@/lib/v2";
import { controlRun } from "@/lib/v2/runner";
import { publicRun } from "@/lib/v2/public";

/** Pause, resume or stop a run. Stop keeps what was found and writes the summary. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isV2Email(email)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { id } = await params;
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  if (action !== "pause" && action !== "resume" && action !== "stop") return NextResponse.json({ error: "bad_action" }, { status: 400 });
  trackEvent(email, EV.chatRunControl, { action });
  return NextResponse.json({ run: publicRun(await controlRun(id, email, action)) });
}
