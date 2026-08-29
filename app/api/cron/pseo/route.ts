import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { refreshAll } from "@/lib/pseo/refresh";

/**
 * Daily recompute of every lead page: statistics, the quality gate, and the 15-day rotation.
 *
 * This is what makes the section self-maintaining. A sector whose data crosses the threshold is
 * published without a deploy; one whose data falls away is pulled back to noindex the same way.
 *
 * Reads only stored leads — no discovery and no Places call is reachable from here.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const fromVercelCron = req.headers.get("x-vercel-cron") !== null;

  if (!fromVercelCron && (!secret || auth !== `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results = await refreshAll();

  // Only pages whose figures actually moved are revalidated; blanket-revalidating everything daily
  // would throw away the cache for no benefit. The sitemap follows whenever the published set
  // changes, so a newly promoted page is submitted the same day.
  const changed = results.filter((r) => r.changed);
  for (const r of changed) {
    const [service, city, rest] = r.pageKey.split("|");
    const path =
      rest === "city"
        ? `/leads/${service}/${city}`
        : rest.startsWith("area:")
          ? `/leads/${service}/${city}/areas/${rest.slice(5)}`
          : `/leads/${service}/${city}/categories/${rest.slice(4)}`;
    revalidatePath(path);
  }
  if (changed.length) revalidatePath("/sitemap.xml");

  const counts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({ evaluated: results.length, revalidated: changed.length, counts });
}
