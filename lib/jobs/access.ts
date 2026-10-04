/**
 * Who may still use the jobs dashboard.
 *
 * Jobs is closed to new signups (temporarily — the marketing page says "coming soon"), but the
 * accounts already on it keep working. Rather than delete the product, every entry point asks this
 * one question, so re-opening it later is a one-line change here rather than an archaeology
 * exercise across a dozen files.
 *
 * ── How the grandfathered set is defined ──────────────────────────────────────────────────────
 * It is simply `user_profiles.dashboard_mode = 'jobs'`. There is no separate flag column, because
 * there does not need to be one: `/api/user/profile` now refuses to SET that value for anyone who
 * does not already have it, and onboarding no longer offers it, so the set cannot grow. It froze
 * the moment this shipped.
 *
 * The one real consequence: a grandfathered account that switches itself to Leads in settings
 * cannot switch back, because the thing that proved its access was the mode it just gave up.
 * That is a deliberate, accepted trade (the alternative was a migration and a prod schema step for
 * a handful of accounts) — but it is also exactly why app/(app)/profile/page.tsx hides the switcher
 * from them entirely rather than offering a door that locks behind them.
 *
 * To re-open jobs to everyone: make hasJobsAccess return true. To close it completely: return
 * false. Nothing else needs touching.
 */

import { sql } from "@/lib/db";

export async function hasJobsAccess(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const [row] = await sql`SELECT dashboard_mode FROM user_profiles WHERE email = ${email}`;
  return row?.dashboard_mode === "jobs";
}

/** Copy for the places that explain the closure. Kept here so they cannot drift apart. */
export const JOBS_COMING_SOON = {
  title: "Jobs is coming soon",
  body: "We've paused new sign-ups for the jobs dashboard while we rebuild it. Leads is live and ready to use.",
} as const;
