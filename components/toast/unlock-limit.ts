import { toast } from "./toast";

/**
 * The unlock route answers 429 `daily_unlock_limit` once a free account has unlocked its leads for
 * the day (FREE_DAILY_UNLOCKS in app/api/leads/[id]/unlock). Every unlock button shows the same toast.
 */
export function isDailyUnlockLimit(res: Response | null | undefined) {
  return res?.status === 429;
}

export function showDailyUnlockLimit(limit = 5) {
  toast.warning(
    `You've used today's ${limit} free unlocks`,
    `Free accounts can unlock ${limit} leads a day from the map. Buy a credit pack to unlock more today.`,
    { actions: [{ label: "See packs", onClick: () => window.dispatchEvent(new Event("gigzman:open-plans")) }] },
  );
}
