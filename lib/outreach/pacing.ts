/**
 * How many mails this tick may send.
 *
 * Extracted from the dispatcher because it carried two bugs in a single day (2026-10-02) and
 * neither was reachable by a test while it sat inline in the route:
 *
 *   1. `capacityFactor` was multiplied into the day's budget instead of the tick. Because
 *      quotaHeadroom itself shrinks with every send, a halved budget credited 0.5 per send while
 *      sentToday charged 1.0 — so the allowance fell 1.5 per send and converged on zero at
 *      headroom/3. A warn at 11:46 took capacity 2400 -> 823 -> 0 by 16:00 and cost ~23,000
 *      sends, with every gate green and the bounce budget only 36% used.
 *   2. The remaining budget was divided by hours left and then spent once per tick, at four
 *      ticks an hour — so the day ran at 8,023/hr against an intended 3,221/hr.
 *
 * Both are shape bugs, not threshold bugs: the totals looked defensible while the pacing the
 * whole mechanism exists for was wrong.
 */
export interface PacingInput {
  /** Campaign's configured ceiling for the day, or null for "only the account quota limits us". */
  dailyTarget: number | null;
  /** What SES says is left of today's quota, minus the transactional reserve. */
  quotaHeadroom: number;
  /** Already sent today by this campaign, summed from outreach_runs. */
  sentToday: number;
  /** Minutes remaining in the send window. Minutes rather than whole hours because hoursLeft is
   *  constant across the four ticks inside an hour, which leaves the last hour's budget
   *  permanently divided by 4 and underspends the day by ~1.8%. */
  minutesLeft: number;
  /** Minutes between ticks — must match the EventBridge schedule. */
  tickIntervalMinutes: number;
  /** 1 normally, 0.5 in a warn band, 0 when blocked. */
  capacityFactor: number;
  /** Most a single tick may send, bounded by the route's maxDuration. */
  chunkLimit: number;
}

export interface Pacing {
  dailyBudget: number;
  remainingToday: number;
  ticksLeft: number;
  perTick: number;
  capacity: number;
}

export function computeCapacity(i: PacingInput): Pacing {
  // quotaHeadroom is ALREADY net of what the account sent today — it is Max24HourSend minus
  // SentLast24Hours, minus the transactional reserve. Subtracting sentToday from it as well
  // charges every send twice, so the allowance decays instead of holding steady: simulated over
  // a full day that lands on 41,950 against a 77,310 target, with the hourly rate falling
  // 3,224 -> 54. Only the campaign's own target is a running total to subtract from; the quota
  // is a live ceiling to clamp against.
  const targetLeft = (i.dailyTarget ?? Number.MAX_SAFE_INTEGER) - i.sentToday;
  const remainingToday = Math.max(0, Math.min(targetLeft, i.quotaHeadroom));
  const dailyBudget = Math.min(i.dailyTarget ?? Number.MAX_SAFE_INTEGER, i.sentToday + i.quotaHeadroom);
  const ticksLeft = Math.max(1, Math.ceil(i.minutesLeft / i.tickIntervalMinutes));
  const perTick = Math.ceil(remainingToday / ticksLeft);
  const capacity = Math.floor(Math.min(i.chunkLimit, perTick) * i.capacityFactor);
  return { dailyBudget, remainingToday, ticksLeft, perTick, capacity };
}
