import { sql } from "@/lib/db";
import { grantCredits } from "@/lib/credits/server";

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

export async function grantPlan(opts: {
  userEmail: string;
  plan: GrantablePlan;
  credits: number;
  reason: GrantReason;
  note?: string | null;
  grantedBy: string;
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
  const [existing] = await sql`SELECT email FROM user_profiles WHERE email = ${email}`;
  if (!existing) return { ok: false, error: `No account found for ${email}.` };

  const [grant] = await sql`
    INSERT INTO plan_grants (user_email, plan, credits, reason, note, granted_by)
    VALUES (${email}, ${opts.plan}, ${opts.credits}, ${opts.reason}, ${opts.note?.trim() || null}, ${opts.grantedBy})
    RETURNING id
  `;
  const grantId = grant.id as string;

  await sql`
    UPDATE user_profiles
       SET plan = ${opts.plan},
           plan_source = 'granted',
           plan_granted_at = now(),
           updated_at = now()
     WHERE email = ${email}
  `;

  const creditsApplied =
    opts.credits > 0 ? await grantCredits(email, opts.credits, `grant:${grantId}`, "plan_grant") : false;

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
       SET plan = 'free', plan_source = 'purchase', plan_granted_at = NULL, updated_at = now()
     WHERE email = ${grant.user_email}
  `;
  void revokedBy;
  return { ok: true, grantId: grant.id as string, creditsApplied: false };
}
