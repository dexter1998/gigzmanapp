import { sql } from "@/lib/db";

/**
 * Review-platform badges: the footer strip and the "Upvote us on" carousel both read from here.
 *
 * Backed by the `badges` table (db/schema.sql), not a build-time constant — adding a new live
 * badge is a DB insert, not a Docker rebuild + App Runner rollout. That cost was the wrong one to
 * keep paying: growth-os's directory priority queue has dozens more listings coming, each of which
 * would otherwise have meant a full deploy just to add one image.
 *
 * `href` is the rule to get right: it must point at OUR OWN listing page on that platform, never
 * the platform's generic homepage — a badge that opens the platform's front door instead of the
 * actual listing tells a visitor nothing and wastes the click. (Caught live, 2026-09-21: Startup
 * Fast's badge pointed at `startupfa.st` instead of the `/projects/mantis-ai` listing that existed
 * by the time the badge went up.)
 *
 * `show_in_footer` marks the smaller subset shown in the site footer (currently: Product Hunt) —
 * deliberately narrower than the full carousel, which shows every live badge.
 *
 * A badge is a claim that a platform has us on file; a row only belongs here once that's true —
 * putting one up before a listing exists would be inventing social proof.
 */
export type Badge =
  | { platform: string; kind: "image"; href: string; alt: string; showInFooter: boolean; img: string; width: number; height: number }
  | { platform: string; kind: "script"; href: string; alt: string; showInFooter: boolean; src: string; containerId: string };

// Server Components fetch fresh per request by default when the data source isn't cacheable
// (postgres.js queries aren't `fetch()`, so Next has no cache to key on) — no extra config needed
// for a new row to show up on the next request, no revalidation window to wait out.
//
// The footer that renders this is shared across (marketing)/(pseo)/(resources) layouts, and some
// of those pages are statically prerendered at BUILD time — when there is no live DB connection at
// all (confirmed live, 2026-09-21: `ECONNREFUSED 127.0.0.1:5432` broke the whole production build,
// not just this component). A missing/unreachable badges table must degrade to "show no badges"
// everywhere, the same honest fallback as a genuinely empty table — never take the build down.
export async function liveBadges(): Promise<Badge[]> {
  let rows: Array<{
    platform: string; kind: "image" | "script"; href: string; alt: string; show_in_footer: boolean;
    img: string | null; width: number | null; height: number | null;
    src: string | null; container_id: string | null;
  }>;
  try {
    rows = await sql`SELECT platform, kind, href, alt, show_in_footer, img, width, height, src, container_id
      FROM badges ORDER BY platform`;
  } catch {
    return [];
  }
  const badges: Badge[] = [];
  for (const r of rows) {
    const base = { platform: r.platform, href: r.href, alt: r.alt, showInFooter: r.show_in_footer };
    if (r.kind === "image" && r.img && r.width && r.height) {
      badges.push({ ...base, kind: "image", img: r.img, width: r.width, height: r.height });
    } else if (r.kind === "script" && r.src && r.container_id) {
      badges.push({ ...base, kind: "script", src: r.src, containerId: r.container_id });
    } // a row missing its kind's required fields is skipped rather than rendered half-broken
  }
  return badges;
}

export async function footerBadges(): Promise<Badge[]> {
  return (await liveBadges()).filter(b => b.showInFooter);
}
