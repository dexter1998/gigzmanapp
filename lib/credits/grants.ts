import { sql } from "@/lib/db";
import { grantCredits } from "@/lib/credits/server";
import { sendPlanActivated } from "@/lib/email/plan-activated";

/**
 * Comping a plan.
 *
 * Two things happen together and neither is useful alone: the account's plan changes (which is
 * what `allowanceFor` reads for free daily headroom) and credits land (which is the actual
 * currency everything is spent in). Granting "Starter" without the credits would hand someone a
 * plan name and nothing to spend.
 *
 * Credits go through grantCredits() rather than a direct UPDATE so the ledger stays the single
 * source of truth for a balance, and so the grant is idempotent: the unique index on
 * (reason, ref) means re-running the same grant id cannot double-credit an account. The plan_grants
 * row is written first precisely so its id can be that ref.
 */

export const GRANT_REASONS = ["partnership", "support", "pilot", "other"] as const;
export type GrantReason = (typeof GRANT_REASONS)[number];

export const GRANTABLE_PLANS = ["free", "starter", "pro", "business"] as const;
export type GrantablePlan = (typeof GRANTABLE_PLANS)[number];

export type GrantResult =
  | { ok: true; grantId: string; creditsApplied: boolean }
  | { ok: false; error: string };

/** How long a comped plan runs for. 0 = no end date. */
export const GRANT_DURATIONS = [
  { days: 0, label: "No end date" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
] as const;

export async function grantPlan(opts: {
  userEmail: string;
  plan: GrantablePlan;
  credits: number;
  reason: GrantReason;
  note?: string | null;
  grantedBy: string;
  /** 0 or undefined = runs until revoked. */
  durationDays?: number;
}): Promise<GrantResult> {
  const email = opts.userEmail.trim().toLowerCase();
  if (!email) return { ok: false, error: "Email is required." };
  if (!GRANTABLE_PLANS.includes(opts.plan)) return { ok: false, error: "Unknown plan." };
  if (!GRANT_REASONS.includes(opts.reason)) return { ok: false, error: "Unknown reason." };
  if (!Number.isInteger(opts.credits) || opts.credits < 0 || opts.credits > 1_000_000) {
    return { ok: false, error: "Credits must be a whole number between 0 and 1,000,000." };
  }

  // Refuse unknown accounts rather than creating one. A typo in an admin form should fail loudly,
  // not quietly mint a profile that nobody can sign in to.
  const [existing] = await sql`SELECT email, name FROM user_profiles WHERE email = ${email}`;
  if (!existing) return { ok: false, error: `No account found for ${email}.` };

  const days = Number(opts.durationDays ?? 0);
  if (!Number.isInteger(days) || days < 0 || days > 3650) {
    return { ok: false, error: "Duration must be a whole number of days between 0 and 3650." };
  }

  const [grant] = await sql`
    INSERT INTO plan_grants (user_email, plan, credits, reason, note, granted_by, expires_at)
    VALUES (${email}, ${opts.plan}, ${opts.credits}, ${opts.reason}, ${opts.note?.trim() || null},
            ${opts.grantedBy}, ${days > 0 ? sql`now() + make_interval(days => ${days})` : null})
    RETURNING id, expires_at
  `;
  const grantId = grant.id as string;

  await sql`
    UPDATE user_profiles
       SET plan = ${opts.plan},
           plan_source = 'granted',
           plan_granted_at = now(),
           plan_expires_at = ${grant.expires_at ?? null},
           updated_at = now()
     WHERE email = ${email}
  `;

  const creditsApplied =
    opts.credits > 0 ? await grantCredits(email, opts.credits, `grant:${grantId}`, "plan_grant") : false;

  // Announced from here rather than from the admin page, so whatever calls grantPlan next — a
  // script, a webhook, a second screen — cannot forget it. The grant id is the step key, so a
  // retried request sends nothing a second time.
  //
  // A failure here must not fail the grant: the plan and the credits are already applied, and
  // throwing now would report "grant failed" for an account that has been upgraded. The email is
  // the one part of this that can be sent again by hand.
  if (creditsApplied) {
    try {
      await sendPlanActivated({
        email,
        name: (existing as { name?: string | null }).name ?? null,
        plan: opts.plan,
        credits: opts.credits,
        grantId,
        expiresAt: (grant.expires_at as Date | null) ?? null,
      });
    } catch (err) {
      console.error("plan activation email failed", email, grantId, err);
    }
  }

  return { ok: true, grantId, creditsApplied };
}

/**
 * Takes the plan back to free and marks the grant revoked.
 *
 * Credits already spent are not clawed back — the ledger is an append-only record of what
 * happened, and rewriting it to pretend a grant never existed would make every balance
 * unauditable. The plan stops; the history stands.
 */
export async function revokeGrant(grantId: string, revokedBy: string): Promise<GrantResult> {
  const [grant] = await sql`
    UPDATE plan_grants SET revoked_at = now()
     WHERE id = ${grantId} AND revoked_at IS NULL
     RETURNING id, user_email
  `;
  if (!grant) return { ok: false, error: "Grant not found, or already revoked." };

  await sql`
    UPDATE user_profiles
       SET plan = 'free', plan_source = 'purchase', plan_granted_at = NULL, plan_expires_at = NULL,
           updated_at = now()
     WHERE email = ${grant.user_email}
  `;
  void revokedBy;
  return { ok: true, grantId: grant.id as string, creditsApplied: false };
}

/**
 * The plan this account is actually entitled to right now.
 *
 * Expiry is applied here, at read time, rather than trusted to a sweep having run: a plan that was
 * supposed to end last night must be over this morning whether or not any cron fired. The sweep
 * below exists only to make the stored row agree with what this function already returns, so that
 * admin lists and exports do not show a plan the product is no longer honouring.
 */
export function effectivePlan(profile: { plan?: string | null; plan_expires_at?: Date | string | null }): string {
  const expires = profile.plan_expires_at ? new Date(profile.plan_expires_at) : null;
  if (expires && expires.getTime() <= Date.now()) return "free";
  return profile.plan ?? "free";
}

/** Brings expired comps back to free. Safe to run as often as you like. */
export async function sweepExpiredGrants(): Promise<number> {
  const rows = await sql`
    UPDATE user_profiles
       SET plan = 'free', plan_source = 'purchase', plan_granted_at = NULL, plan_expires_at = NULL,
           updated_at = now()
     WHERE plan_source = 'granted'
       AND plan_expires_at IS NOT NULL
       AND plan_expires_at <= now()
    RETURNING email
  `;
  return rows.length;
}
