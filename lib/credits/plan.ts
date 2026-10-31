import { sql } from "@/lib/db";
import { PLAN_PERIOD_DAYS, type CreditPack } from "@/lib/credits/pricing";

/**
 * Paid-plan entitlement, server side.
 *
 * A plan is "active" when user_profiles.plan is not free and its end date (if any) is still ahead.
 * Purchased plans always carry an end date (PLAN_PERIOD_DAYS from purchase); comped plans
 * (plan_source = 'granted') may run without one. Both count — a granted plan is a real plan.
 *
 * Expiry is read here at request time, same as effectivePlan(): nothing waits for a sweep.
 */

export type PlanStatus = {
  active: boolean;
  plan: string;
  source: "purchase" | "granted";
  expiresAt: string | null;
};

type ProfileRow = { plan?: string | null; plan_source?: string | null; plan_expires_at?: Date | string | null };

export function planStatusOf(p: ProfileRow | null | undefined): PlanStatus {
  const plan = p?.plan ?? "free";
  const expires = p?.plan_expires_at ? new Date(p.plan_expires_at) : null;
  const expired = !!expires && expires.getTime() <= Date.now();
  return {
    active: plan !== "free" && !expired,
    plan: expired ? "free" : plan,
    source: p?.plan_source === "granted" ? "granted" : "purchase",
    expiresAt: expires && !expired ? expires.toISOString() : null,
  };
}

export async function planStatus(email: string): Promise<PlanStatus> {
  const [p] = await sql`SELECT plan, plan_source, plan_expires_at FROM user_profiles WHERE email = ${email}`;
  return planStatusOf(p as ProfileRow | undefined);
}

export async function hasActivePlan(email: string): Promise<boolean> {
  return (await planStatus(email)).active;
}

/** The body every launch-gated route returns when there is no active plan. */
export const PLAN_REQUIRED = {
  error: "plan_required",
  message: "Launching a campaign needs an active plan. Testing stays free.",
} as const;

const TIER = ["free", "starter", "pro", "business"];

/**
 * Switches a purchased plan on (or extends it) for PLAN_PERIOD_DAYS. Called once per paid order,
 * from grantCredits after its idempotent ledger insert succeeded — so a replayed webhook never
 * extends a plan twice.
 *
 * - Renewing early extends from the current end date, not from today.
 * - Buying a smaller pack while a bigger plan is still running keeps the bigger tier.
 * - A comped plan with no end date is left alone: replacing "forever" with "30 days" would take
 *   something away from the person who just paid us.
 */
export async function activatePurchasedPlan(email: string, pack: CreditPack): Promise<Date | null> {
  const [row] = await sql`
    UPDATE user_profiles
       SET plan = CASE
             WHEN plan_expires_at > now()
              AND array_position(${TIER}::text[], plan) > array_position(${TIER}::text[], ${pack.planId}::text)
             THEN plan ELSE ${pack.planId} END,
           plan_source = 'purchase',
           plan_granted_at = now(),
           plan_expires_at = GREATEST(now(), COALESCE(plan_expires_at, now())) + make_interval(days => ${PLAN_PERIOD_DAYS}),
           updated_at = now()
     WHERE email = ${email}
       AND NOT (plan_source = 'granted' AND plan_expires_at IS NULL AND plan <> 'free')
     RETURNING plan_expires_at
  `;
  return (row?.plan_expires_at as Date | undefined) ?? null;
}
