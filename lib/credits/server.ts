import { sql } from "@/lib/db";
import { ALLOWANCE, CREDIT_COST, type CreditOperation } from "@/lib/credits/pricing";

/**
 * The half of the credit system that touches the database.
 *
 * Split out from lib/credits.ts because that module is imported by client components (the
 * buy-credits UI needs the pack list and the rate card), and a client bundle cannot pull in the
 * postgres driver — it resolves `fs`/`net` and the build fails. Prices and rules live there;
 * anything that reads or writes a balance lives here.
 */

export type AllowanceState = {
  callsToday: number;
  callsThisMonth: number;
  dayRemaining: number;
  monthRemaining: number;
  /** True when the next billed call is still covered by the free allowance. */
  covered: boolean;
};

/**
 * Derived from area_scans rather than a counter table — `billed_places_calls` already records
 * exactly how many real Google calls each request made, so a separate ledger would be a second
 * source of truth that can drift from the first.
 */
export async function allowanceFor(userEmail: string, plan: string): Promise<AllowanceState> {
  const [row] = (await sql`
    SELECT
      COALESCE(SUM(billed_places_calls) FILTER (WHERE created_at >= date_trunc('day', now())), 0)::int   AS today,
      COALESCE(SUM(billed_places_calls) FILTER (WHERE created_at >= date_trunc('month', now())), 0)::int AS month
    FROM area_scans
    WHERE requested_by = ${userEmail}
  `) as [{ today: number; month: number }];

  const monthCap = plan === "free" ? ALLOWANCE.billedCallsPerMonthFree : ALLOWANCE.billedCallsPerMonthPaid;
  const dayRemaining = Math.max(0, ALLOWANCE.billedCallsPerDay - row.today);
  const monthRemaining = Math.max(0, monthCap - row.month);

  return {
    callsToday: row.today,
    callsThisMonth: row.month,
    dayRemaining,
    monthRemaining,
    covered: dayRemaining > 0 && monthRemaining > 0,
  };
}

/* ------------------------------------------------------------------ spending */

export type ChargeResult = { ok: true; credits: number } | { ok: false; reason: "insufficient_credits"; credits: number };

/**
 * Spends credits and records why, in one statement each. `ref` makes a charge idempotent for
 * operations that can legitimately be retried (a webhook replay, a resumed run) — the partial
 * unique index on (reason, ref) turns the second attempt into a no-op instead of a double charge.
 *
 * Not wrapped in a transaction with the caller's own work on purpose: a charge that succeeded
 * while the work failed is recoverable from the ledger, but work delivered without a charge is
 * silently free forever.
 */
export async function chargeCredits(
  userEmail: string,
  operation: CreditOperation,
  opts: { units?: number; leadId?: string | null; ref?: string | null } = {}
): Promise<ChargeResult> {
  const units = opts.units ?? 1;
  const cost = CREDIT_COST[operation] * units;

  if (cost === 0) {
    const [p] = await sql`SELECT credits FROM user_profiles WHERE email = ${userEmail}`;
    return { ok: true, credits: p?.credits ?? 0 };
  }

  // Conditional UPDATE rather than read-then-write: two concurrent charges can't both see the
  // same balance and both succeed, because the balance check is inside the statement.
  const [updated] = await sql`
    UPDATE user_profiles SET credits = credits - ${cost}, updated_at = now()
    WHERE email = ${userEmail} AND credits >= ${cost}
    RETURNING credits
  `;

  if (!updated) {
    const [p] = await sql`SELECT credits FROM user_profiles WHERE email = ${userEmail}`;
    return { ok: false, reason: "insufficient_credits", credits: p?.credits ?? 0 };
  }

  await sql`
    INSERT INTO credit_ledger (user_email, lead_id, reason, amount, ref)
    VALUES (${userEmail}, ${opts.leadId ?? null}, ${operation}, ${-cost}, ${opts.ref ?? null})
    ON CONFLICT DO NOTHING
  `;

  return { ok: true, credits: updated.credits };
}

/**
 * Grants purchased credits. `ref` is the Cashfree order id, and the ledger's unique index on
 * (reason, ref) is what makes a webhook that fires twice grant credits once — the INSERT is
 * attempted first precisely so its conflict can stop the balance update.
 */
export async function grantCredits(userEmail: string, credits: number, ref: string, reason = "purchase"): Promise<boolean> {
  const [inserted] = await sql`
    INSERT INTO credit_ledger (user_email, reason, amount, ref)
    VALUES (${userEmail}, ${reason}, ${credits}, ${ref})
    ON CONFLICT DO NOTHING
    RETURNING id
  `;

  // Already granted for this order — a replayed webhook, not an error.
  if (!inserted) return false;

  await sql`
    UPDATE user_profiles
    SET credits = credits + ${credits}, credits_limit = GREATEST(credits_limit, credits + ${credits}), updated_at = now()
    WHERE email = ${userEmail}
  `;

  return true;
}
