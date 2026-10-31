/**
 * What the user can afford, read BEFORE spending so the reply can say it first. Production chats
 * showed the opposite order: a search ran, came back thin or empty, and only then (if ever) did
 * the user learn their credits were the reason.
 */

import { sql } from "@/lib/db";
import { effectivePlan } from "@/lib/credits/grants";
import { allowanceFor } from "@/lib/credits/server";
import { CREDIT_COST } from "@/lib/credits/pricing";

export type CreditStatus = {
  credits: number;
  /** A live search is free right now (daily/monthly allowance left). */
  liveCovered: boolean;
  /** A live search can run at all — free, or paid from credits. */
  canSearchLive: boolean;
  unlocksAffordable: number;
};

export async function creditStatus(email: string): Promise<CreditStatus> {
  const [p] = await sql`SELECT plan, plan_expires_at, credits FROM user_profiles WHERE email = ${email}`;
  const credits = Number(p?.credits ?? 0);
  const allowance = await allowanceFor(email, effectivePlan(p ?? {}));
  return {
    credits,
    liveCovered: allowance.covered,
    canSearchLive: allowance.covered || credits >= CREDIT_COST.billed_places_call,
    unlocksAffordable: Math.floor(credits / CREDIT_COST.lead_unlock),
  };
}
