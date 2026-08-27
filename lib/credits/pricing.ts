/** Single-currency execution pricing — every credit-spending action, map or chat, looks up its
 * cost here and writes one credit_ledger row. Kept to real numbers only where they're actually
 * known; the map's existing unlock flow charges a flat 1 today, so that's what's recorded here
 * too — this isn't yet priced against real Bedrock/Places unit costs (that needs real Cost
 * Explorer numbers, not a guess), so treat this file as the single place those numbers will land
 * once confirmed, not as pricing already reflecting them. */
export const CREDIT_COSTS: Record<string, number> = {
  lead_unlock: 1,
};

export function creditCost(reason: string): number {
  return CREDIT_COSTS[reason] ?? 1;
}
