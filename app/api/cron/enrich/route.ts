import { NextRequest, NextResponse } from "next/server";
import { advanceAllInFlight } from "@/lib/enrichment";

/**
 * Drives the enrichment queue forward.
 *
 * Each job advances one step per call, so something has to keep calling. Before this, the only
 * caller was the browser polling a lead the user happened to be looking at — close the tab and the
 * job stopped where it was. This is what makes "queue it and we'll have it ready" true: the tick
 * moves every in-flight job whether or not anyone is watching.
 *
 * Auth: Vercel signs its own cron requests, and CRON_SECRET (when set) gates anything else. The
 * endpoint only advances jobs that already exist — it can't be used to start work on a lead the
 * caller doesn't own — but it does spend AWS time, so it isn't left open.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const fromVercelCron = req.headers.get("x-vercel-cron") !== null;

  if (!fromVercelCron && secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results = await advanceAllInFlight();
  return NextResponse.json({ advanced: results.length, results });
}
