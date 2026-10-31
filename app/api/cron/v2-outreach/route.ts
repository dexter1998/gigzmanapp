import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { enrichPoolSignals } from "@/lib/pseo/enrich-signals";
import { recordCronRun } from "@/lib/cron-runs";
import { revalidatePath, revalidateTag } from "next/cache";
import { advanceListSnapshot } from "@/lib/lists/snapshot";
import { drainQueue } from "@/lib/v2/outreach/worker";
import { syncInbox } from "@/lib/v2/outreach/inbox";

/**
 * V2 outreach tick (docs/v2-campaigns.md): read replies FIRST, so a lead who answered overnight is
 * never sent the next touch, then send what is due. Same auth as the other crons.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const started = new Date();
  try {
    const users = await sql`SELECT DISTINCT user_email FROM v2_campaigns WHERE status IN ('running','scheduled','paused')`;
    const synced: Record<string, unknown> = {};
    for (const u of users) synced[u.user_email as string] = await syncInbox(u.user_email as string).catch((e) => ({ error: (e as Error).message }));
    const sent = await drainQueue({ limit: 80 });
    // Lead-market pages: a small, time-boxed slice of the pool's websites read for signals each tick
    // (lib/pseo/enrich-signals.ts) — a few thousand sites a day without loading the reader box.
    const signals = await enrichPoolSignals({ limit: 40, concurrency: 6, budgetMs: 20_000 }).catch((e) => ({ error: (e as Error).message }));
    await recordCronRun("v2_outreach", started, true, { synced, sent, signals });
    // List-page snapshot (lib/lists/snapshot.ts): one slice per tick. A slice that finishes a full
    // pass revalidates the list pages and their sitemap; a failure never fails outreach.
    const snapshot = await advanceListSnapshot().catch((e) => ({ error: (e as Error).message }));
    if (snapshot && "end" in snapshot && snapshot.end === null) {
      revalidateTag("lists", "max");
      for (const r of ["/leads-for/[slug]", "/leads-for/[slug]/[city]", "/lists/[slug]", "/lists/[slug]/[city]"]) revalidatePath(r, "page");
    }
    return NextResponse.json({ synced, sent, signals });
  } catch (err) {
    await recordCronRun("v2_outreach", started, false, undefined, (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
