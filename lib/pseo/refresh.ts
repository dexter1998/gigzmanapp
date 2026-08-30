import { pseoSql } from "@/lib/pseo/db";
import { CITIES } from "@/lib/pseo/locations";
import { SERVICES } from "@/lib/pseo/services";
import { loadScope, type Scope } from "@/lib/pseo/stats";
import { TYPE_TO_SECTION } from "@/lib/categories";
import { evaluateGate, shouldStayPublished, MIN_RENDER_LEADS } from "@/lib/pseo/gate";
import { pageKeyFor, cityAreaBreakdown } from "@/lib/pseo/registry";
import { hashString, epochFor, selectForEpoch } from "@/lib/pseo/rotation";

/**
 * Recomputes every page's statistics and re-runs the gate. This is what actually creates, promotes
 * and retires pages — the daily cron calls it, and so does the admin screen the moment a location is
 * approved, so a new city's pages reach the sitemap without waiting for tomorrow.
 *
 * Deliberately does no discovery: it only reads leads that are already stored. No Places call is
 * reachable from here.
 */

export type RefreshResult = {
  pageKey: string;
  status: string;
  qualifying: number;
  changed: boolean;
  /** Crossed into `published` on this run — the only moment worth announcing. */
  newlyPublished: boolean;
  failures: string[];
};

/** Which scopes are worth a row at all. A page is only created once there is something to say. */
async function scopesForCity(citySlug: string): Promise<Array<{ scope: Scope; type: "city" | "area" | "category" }>> {
  const out: Array<{ scope: Scope; type: "city" | "area" | "category" }> = [
    { scope: { kind: "city", citySlug }, type: "city" },
  ];

  for (const area of await cityAreaBreakdown(citySlug)) {
    if (area.qualifying >= MIN_RENDER_LEADS) {
      out.push({ scope: { kind: "area", citySlug, areaSlug: area.area_slug }, type: "area" });
    }
  }

  const cats = (await pseoSql`
    SELECT category, count(*) FILTER (WHERE has_website = false)::int AS qualifying
    FROM leads
    WHERE city_slug = ${citySlug} AND is_competitor = false AND category IS NOT NULL
    GROUP BY category
    HAVING count(*) FILTER (WHERE has_website = false) >= ${MIN_RENDER_LEADS}
  `) as unknown as Array<{ category: string; qualifying: number }>;

  for (const c of cats) {
    // The allowlist in lib/categories.ts deliberately excludes infrastructure, government, transit
    // and residential locations. Page creation was reading leads.category directly and skipping
    // that check, which published "28 bus stops with no website in Gurgaon" and pages for parking
    // lots, housing complexes and apartment buildings. None of those is a lead for a web agency,
    // and a section carrying them reads as generated rather than assembled.
    if (!TYPE_TO_SECTION[c.category]) continue;
    out.push({ scope: { kind: "category", citySlug, category: c.category }, type: "category" });
  }

  return out;
}

export async function refreshCity(citySlug: string): Promise<RefreshResult[]> {
  const results: RefreshResult[] = [];
  const service = SERVICES[0];
  const epoch = epochFor();
  const areas = await cityAreaBreakdown(citySlug);
  const scopes = await scopesForCity(citySlug);

  // Anything this city still has a row for but no longer has a scope for is retired. Without this
  // a page that stops qualifying — because its category left the allowlist, or its leads dried up —
  // keeps its published status forever, since the loop below only ever visits current scopes.
  const liveKeys = scopes.map(({ scope }) => pageKeyFor(service.slug, scope));
  const retired = (await pseoSql`
    UPDATE pseo_pages
    SET status = 'withheld', gate_pass_streak = 0, updated_at = now()
    WHERE service_slug = ${service.slug} AND city_slug = ${citySlug}
      AND status <> 'withheld' AND page_key <> ALL(${liveKeys})
    RETURNING page_key
  `) as unknown as Array<{ page_key: string }>;
  for (const r of retired) {
    results.push({ pageKey: r.page_key, status: "withheld", qualifying: 0, changed: true, newlyPublished: false, failures: ["no longer in scope"] });
  }

  for (const { scope, type } of scopes) {
    const pageKey = pageKeyFor(service.slug, scope);
    const { stats, leads } = await loadScope(scope);

    const [existing] = (await pseoSql`
      SELECT status, gate_pass_streak, content_hash FROM pseo_pages WHERE page_key = ${pageKey}
    `) as unknown as Array<{ status: string; gate_pass_streak: number; content_hash: string | null }>;

    const gate = evaluateGate({
      stats,
      pageType: type,
      passStreak: existing?.gate_pass_streak ?? 0,
      distinctAreas: type === "city" ? areas.length : undefined,
    });

    // An already-published page uses the lower keep threshold, so ordinary movement in the data
    // doesn't pull it out of the index and put it back a day later.
    let status = gate.status;
    if (existing?.status === "published" && status !== "published" && shouldStayPublished(stats)) {
      status = "published";
    }

    const shown = selectForEpoch(leads, pageKey, epoch);
    // Rotation deliberately excluded: which leads are displayed is presentation. Only the figures
    // count as a material change, because that is what the "last changed" date claims.
    const contentHash = String(
      hashString(
        JSON.stringify([
          stats.qualifying, stats.checked, stats.unknown,
          stats.categories.slice(0, 8).map((c) => [c.category, c.qualifying]),
          stats.medianReviewsNoWebsite, stats.medianReviewsWithWebsite,
        ])
      )
    );
    const changed = existing?.content_hash !== contentHash;

    const passStreak = gate.passesAllRules ? (existing?.gate_pass_streak ?? 0) + 1 : 0;

    await pseoSql`
      INSERT INTO pseo_pages (
        page_key, page_type, service_slug, city_slug, area_slug, category_slug, status,
        qualifying_leads, total_leads, stats, content_hash, rotation_epoch, gate_pass_streak,
        stats_computed_at, last_material_change_at, first_published_at
      ) VALUES (
        ${pageKey}, ${type}, ${service.slug}, ${citySlug},
        ${scope.kind === "area" ? scope.areaSlug : null},
        ${scope.kind === "category" ? scope.category : null},
        ${status}, ${stats.qualifying}, ${stats.checked},
        ${pseoSql.json(JSON.parse(JSON.stringify(stats)))}, ${contentHash}, ${epoch}, ${passStreak},
        now(), now(), ${status === "published" ? pseoSql`now()` : null}
      )
      ON CONFLICT (page_key) DO UPDATE SET
        status = EXCLUDED.status,
        qualifying_leads = EXCLUDED.qualifying_leads,
        total_leads = EXCLUDED.total_leads,
        stats = EXCLUDED.stats,
        content_hash = EXCLUDED.content_hash,
        rotation_epoch = EXCLUDED.rotation_epoch,
        gate_pass_streak = EXCLUDED.gate_pass_streak,
        stats_computed_at = now(),
        -- Only a real change in the figures moves this. A rotation, or simply running the job
        -- again, must never make a page look freshly updated when nothing about it is.
        last_material_change_at = CASE WHEN pseo_pages.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                                       THEN now() ELSE pseo_pages.last_material_change_at END,
        first_published_at = COALESCE(pseo_pages.first_published_at, EXCLUDED.first_published_at),
        updated_at = now()
    `;

    // One snapshot per page per day — the raw material for "what changed since last time", which
    // is the only genuinely new information the refresh cycle can offer.
    await pseoSql`
      INSERT INTO pseo_stats_history (page_key, captured_on, qualifying_leads, total_leads, stats)
      VALUES (${pageKey}, current_date, ${stats.qualifying}, ${stats.checked},
              ${pseoSql.json(JSON.parse(JSON.stringify({ gapRate: stats.gapRate, categories: stats.categories.slice(0, 8) })))})
      ON CONFLICT (page_key, captured_on) DO NOTHING
    `;

    results.push({
      pageKey, status, qualifying: stats.qualifying, changed,
      newlyPublished: existing?.status !== "published" && status === "published",
      failures: gate.failures,
    });
    void shown;
  }

  return results;
}

export async function refreshAll(): Promise<RefreshResult[]> {
  const out: RefreshResult[] = [];
  for (const city of CITIES.filter((c) => c.status === "active")) {
    out.push(...(await refreshCity(city.slug)));
  }
  return out;
}
