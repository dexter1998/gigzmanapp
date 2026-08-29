import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { advanceInFlightForUser } from "@/lib/enrichment";

/**
 * Advances this user's queued enrichment jobs by one step.
 *
 * Each job needs something to keep calling it, and Vercel's Hobby plan only allows a DAILY cron,
 * which is no use to a queue. So the leads page calls this on its refresh interval and that is what
 * moves the work along — every job the user has queued, not just the row on screen.
 *
 * Kept off /api/leads on purpose: that endpoint runs on every map pan and must not wait on EC2/SSM.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const results = await advanceInFlightForUser(session.user.email);
  return NextResponse.json({ advanced: results.length, results });
}
