export type Plan = {
  id: "free" | "starter" | "pro" | "business";
  name: string;
  price: string;
  credits: string;
  desc: string;
  badge?: string;
  /** Machine-readable twins of `price`/`credits`, so the pricing page can compute a per-lead rate
   * and drive its credit selector without re-parsing the display strings — and, more importantly,
   * so the marketing page and the in-app upgrade modal can never quote different numbers. These
   * must stay in step with PLAN_CREDITS in app/api/user/plan/route.ts, which is what actually
   * grants the credits. */
  creditsPerMonth: number;
  monthlyUsd: number;
};

export const PLANS: Plan[] = [
  { id: "free", name: "Free", price: "$0/mo", credits: "20 credits", desc: "Try Mantis with a small monthly allowance.", creditsPerMonth: 20, monthlyUsd: 0 },
  { id: "starter", name: "Starter", price: "$19.99/mo", credits: "2,000 credits", desc: "For closers getting their first clients.", creditsPerMonth: 2000, monthlyUsd: 19.99 },
  { id: "pro", name: "Pro", price: "$99.99/mo", credits: "12,000 credits", badge: "Best value", desc: "For full-time sales pros.", creditsPerMonth: 12000, monthlyUsd: 99.99 },
  { id: "business", name: "Business", price: "$299/mo", credits: "30,000 credits", desc: "For teams running Mantis at scale.", creditsPerMonth: 30000, monthlyUsd: 299 },
];

/** The tiers the pricing page's credit selector steps through — Free is fixed and Agency is
 * quoted, so the paid ladder is the only part a buyer actually sizes. */
export const PAID_PLANS = PLANS.filter((p) => p.id !== "free");

export const FREE_PLAN = PLANS[0];
