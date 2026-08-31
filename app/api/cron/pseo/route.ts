import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { refreshAll } from "@/lib/pseo/refresh";
import { recordCronRun } from "@/lib/cron-runs";
import { submitToIndexNow } from "@/lib/pseo/indexnow";
import { PSEO_SEGMENTS } from "@/lib/pseo/sitemap";
import { COMPANY } from "@/lib/company";

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

  const startedAt = new Date();
  let results;
  try {
    results = await refreshAll();
  } catch (err) {
    await recordCronRun("pseo", startedAt, false, undefined, err instanceof Error ? err.message : String(err));
    throw err;
  }

  // Only pages whose figures actually moved are revalidated; blanket-revalidating everything daily
  // would throw away the cache for no benefit. The sitemap follows whenever the published set
  // changes, so a newly promoted page is submitted the same day.
  const changed = results.filter((r) => r.changed);
  for (const r of changed) revalidatePath(pathFor(r.pageKey));
  if (changed.length) {
    // The index and the segment the change lives in. Segments are cheap to rebuild and there are
    // three of them, so this is simpler than working out which one a given page belongs to.
    revalidatePath("/sitemap.xml");
    for (const seg of ["pages", ...PSEO_SEGMENTS]) revalidatePath(`/sitemaps/${seg}.xml`);
  }

  // Announce only genuine promotions. A page that already existed and simply had its figures
  // recomputed is not news, and pinging unchanged URLs daily is the same manufactured-activity
  // signal as restamping a sitemap.
  const promoted = results.filter((r) => r.newlyPublished).map((r) => `${COMPANY.site}${pathFor(r.pageKey)}`);
  const indexNow = promoted.length ? await submitToIndexNow(promoted) : { ok: true };
  if (promoted.length) revalidatePath("/leads/feed.xml");

  const counts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  await recordCronRun("pseo", startedAt, true, {
    evaluated: results.length,
    revalidated: changed.length,
    promoted: promoted.length,
    counts,
  });
  return NextResponse.json({
    evaluated: results.length,
    revalidated: changed.length,
    promoted: promoted.length,
    indexNow,
    counts,
  });
}

function pathFor(pageKey: string): string {
  const [service, city, rest] = pageKey.split("|");
  if (rest === "city") return `/leads/${service}/${city}`;
  if (rest.startsWith("area:")) return `/leads/${service}/${city}/areas/${rest.slice(5)}`;
  return `/leads/${service}/${city}/categories/${rest.slice(4)}`;
}
