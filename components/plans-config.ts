export type Plan = {
  id: "free" | "starter" | "pro" | "business";
  name: string;
  price: string;
  credits: string;
  desc: string;
  badge?: string;
};

export const PLANS: Plan[] = [
  { id: "free", name: "Free", price: "$0/mo", credits: "20 credits", desc: "Try gigzman with a small monthly allowance." },
  { id: "starter", name: "Starter", price: "$19.99/mo", credits: "2,000 credits", desc: "For closers getting their first clients." },
  { id: "pro", name: "Pro", price: "$99.99/mo", credits: "12,000 credits", badge: "Best value", desc: "For full-time sales pros." },
  { id: "business", name: "Business", price: "$299/mo", credits: "30,000 credits", desc: "For teams running gigzman at scale." },
];
