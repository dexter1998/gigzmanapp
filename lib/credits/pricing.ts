/**
 * One source of truth for what a credit costs us, what it costs the user, and how many credits
 * each operation deducts. Everything that charges, grants or prices credits reads from here.
 *
 * The model is metered rather than per-lead, because discovery cost depends on the *shape* of a
 * query, not on how many leads come back. "Restaurants in Tech Chand Nagar" is ~6 Places calls;
 * "restaurants in Gurugram rated 4+" is ~40 — both return about 20 usable leads. Flat per-lead
 * pricing would lose money on the second one every single time. Charging per API call makes the
 * expensive query cost more, automatically, with no special-casing.
 */

/** What one billed Google Places Nearby call costs us. Enterprise SKU ($35 / 1,000 calls) — the
 * field mask asks for rating/userRatingCount/phone/websiteUri, which is what puts it on that tier
 * rather than the cheaper Pro one. */
export const PLACES_CALL_COST_USD = 0.035;

/** Only used to express COGS in the currency we actually charge. Deliberately conservative: if the
 * rupee weakens, COGS in ₹ rises, so a number that is too *low* here would flatter the margin. */
export const USD_TO_INR = 88;

export const PLACES_CALL_COST_INR = PLACES_CALL_COST_USD * USD_TO_INR; // ≈ ₹3.08

/* ------------------------------------------------------------------ rate card */

export const CREDIT_COST = {
  /** Cache hit — the area was already scanned, so this is a DB read and costs us nothing. Charging
   * for it would tax the cheapest thing we do and push users away from the behaviour we want. */
  cached_search: 0,
  /** Break-even-ish. See CREDIT_FLOOR_INR below for why this number and the pack prices are
   * locked together. */
  billed_places_call: 8,
  chat_turn: 2,
  /** Contact reveal. Zero COGS — the phone number already arrived with discovery — so this is
   * where the margin actually lives. Keyed `lead_unlock` to match the ledger reason the map's
   * "Add to leads" flow has been writing since before this rate card existed. */
  lead_unlock: 5,
  website_check: 4,
  deep_enrich: 10,
  verified_email: 8,
  verified_phone: 30,
  find_founder: 20,
  pitch_script: 10,
} as const;

export type CreditOperation = keyof typeof CREDIT_COST;

/* ------------------------------------------------------------------ packs */

export type CreditPack = {
  id: string;
  credits: number;
  /** Paise, integer. ₹1,999 is 199900 — no currency value is ever a float in this codebase. */
  pricePaise: number;
  label: string;
  badge?: string;
};

/**
 * India-first. Country-aware pricing (showing USD outside India) is deliberately deferred — that
 * needs International Payments activated on the Cashfree account, which settles separately from
 * the domestic INR flow.
 *
 * At the entry pack one credit is exactly ₹1, which is the whole reason these numbers were picked:
 * a user can read the rate card as rupees without converting anything.
 */
export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack_2k", credits: 2_000, pricePaise: 199_900, label: "Starter" },
  { id: "pack_4k", credits: 4_000, pricePaise: 349_900, label: "Growth", badge: "Most popular" },
  { id: "pack_10k", credits: 10_000, pricePaise: 749_900, label: "Scale", badge: "Best value" },
];

export const FREE_MONTHLY_CREDITS = 100;

export function packById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

export const rupees = (paise: number) => paise / 100;
export const formatINR = (paise: number) => `₹${rupees(paise).toLocaleString("en-IN")}`;

/* ------------------------------------------------------------------ the floor */

/**
 * The cheapest a credit may ever be sold for.
 *
 * A billed Places call costs us ₹3.08 and we charge 8 credits for it, so those 8 credits have to
 * bring in at least ₹3.08 — meaning one credit can never be worth less than ₹3.08 / 8. Sell a pack
 * below this and every single discovery call loses money, quietly, while revenue keeps arriving
 * and hides it.
 *
 * The assertion below runs at import time rather than in a test, because the failure mode is a
 * pricing change that looks fine in a spreadsheet: nobody re-derives this ratio by eye when adding
 * a bigger, cheaper pack.
 */
export const CREDIT_FLOOR_INR = PLACES_CALL_COST_INR / CREDIT_COST.billed_places_call; // ≈ ₹0.385

for (const pack of CREDIT_PACKS) {
  const perCredit = rupees(pack.pricePaise) / pack.credits;
  if (perCredit < CREDIT_FLOOR_INR) {
    throw new Error(
      `Credit pack "${pack.id}" prices a credit at ₹${perCredit.toFixed(4)}, below the ₹${CREDIT_FLOOR_INR.toFixed(4)} floor. ` +
        `At that rate every billed Places call loses money. Either raise the pack price, or raise CREDIT_COST.billed_places_call.`
    );
  }
}

/* ------------------------------------------------------------------ free allowance */

/**
 * Free daily headroom, on every plan. Panning the map over ground we have already scanned is
 * unlimited and free (it costs us nothing), so this only ever counts calls that actually billed
 * Google. The monthly cap is the real guard: 5/day alone would be ₹460/month of exposure per user.
 */
export const ALLOWANCE = {
  billedCallsPerDay: 5,
  billedCallsPerMonthFree: 40,
  billedCallsPerMonthPaid: 60,
  chatTurnsPerDay: 5,
} as const;

/** Looks a cost up by ledger reason. Kept as a function (rather than callers reading CREDIT_COST
 * directly) because the ledger stores free-form reason strings, and an unknown one must not
 * silently resolve to zero and hand out free work. */
export function creditCost(reason: string): number {
  const cost = (CREDIT_COST as Record<string, number>)[reason];
  if (cost === undefined) {
    throw new Error(`No credit price defined for "${reason}" — add it to CREDIT_COST in lib/credits/pricing.ts`);
  }
  return cost;
}
