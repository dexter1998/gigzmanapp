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
  /** A live map lookup. Deliberately BELOW cost since 2026-10-23 (Tarun: "places api 8 ki jgh 2
   * krdo — strategic hai, finding mein km credit kte, final lead jb list mein add ho tb dhng se"):
   * finding is cheap, adding a lead is where the user pays. The subsidy per call is
   * PLACES_CALL_COST_INR - 2 credits' worth; the pack floor below is pinned separately so it can't
   * silently drop with this number. */
  billed_places_call: 2,
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
  /** One CONNECTED minute of an AI voice call (Mantis voice agent on Telnyx), billed per started
   * minute after the call. Cost basis: assistant + STT/TTS + PSTN ≈ $0.10–0.15/min ≈ ₹8.5–13; at the
   * ₹0.385 credit floor that is 22–33 credits, so 30 keeps every pack above cost. Unanswered and
   * failed calls are free. */
  voice_minute: 30,

  /* -------------------------------------------------------------- jobs mode
   * Job discovery is materially cheaper for us than lead discovery: the careers-page scrape is
   * our own HTTP traffic, not a metered Google Places call, so the only real cost is bandwidth
   * and the refresh cadence. Priced to reflect that rather than mirrored off the leads rate card.
   *
   * Nothing on the seeker side of jobs is charged at all — saving a job, marking it applied, and
   * seeing the opportunity match are free, deliberately: a job seeker is not the person who
   * should be metered, and gating the match score behind credits (rather than behind filling in
   * a profile, which is what actually makes the score computable) would be user-hostile. */
  job_area_scan: 4,
  /** Salary band lookup — one scrape of a public aggregator, cached per company for 30 days. */
  salary_lookup: 3,
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
  /** The user_profiles.plan this pack switches on for PLAN_PERIOD_DAYS. Plan ids predate the pack
   * labels (admin grants and the schema use free | starter | pro | business), so the two names
   * differ on purpose — show planLabel(), never the raw id. */
  planId: "starter" | "pro" | "business";
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
  { id: "pack_2k", credits: 2_000, pricePaise: 199_900, label: "Starter", planId: "starter" },
  { id: "pack_4k", credits: 4_000, pricePaise: 349_900, label: "Growth", badge: "Most popular", planId: "pro" },
  { id: "pack_10k", credits: 10_000, pricePaise: 749_900, label: "Scale", badge: "Best value", planId: "business" },
];

/**
 * Buying a pack is buying a month of the plan. The credits it brings never expire; the plan does,
 * and the plan is what unlocks launching campaigns (see lib/credits/plan.ts). A second purchase
 * before the end extends from the current end date rather than from today, so nobody loses days
 * by renewing early.
 */
export const PLAN_PERIOD_DAYS = 30;

/** What every paid plan includes, beyond the credits themselves. One list for every surface. */
export const PLAN_FEATURES: Array<{ label: string; soon?: boolean }> = [
  { label: "Bulk email campaigns" },
  { label: "Bulk WhatsApp campaigns", soon: true },
  { label: "Bulk AI voice calls" },
  { label: "Auto campaign planner & executor" },
];

const PLAN_LABELS: Record<string, string> = { free: "Free", starter: "Starter", pro: "Growth", business: "Scale" };
/** Display name for a user_profiles.plan id ("pro" is sold as Growth). */
export const planLabel = (plan: string | null | undefined) => PLAN_LABELS[plan ?? "free"] ?? (plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Free");

/** Free credits a new account starts with — once, at signup (Tarun, 2026-10-23: "one time 500 credits").
 *  Nothing refills them monthly; the monthly free thing is the search allowance (ALLOWANCE). */
export const FREE_SIGNUP_CREDITS = 500;
/** @deprecated the name said "monthly"; it was always a one-time signup grant. Use FREE_SIGNUP_CREDITS. */
export const FREE_MONTHLY_CREDITS = FREE_SIGNUP_CREDITS;

export function packById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

export const rupees = (paise: number) => paise / 100;
export const formatINR = (paise: number) => `₹${rupees(paise).toLocaleString("en-IN")}`;

/* ------------------------------------------------------------------ the floor */

/**
 * The cheapest a credit may ever be sold for.
 *
 * A billed Places call costs us ₹3.08; at break-even it is worth 8 credits, so one credit can never
 * be sold for less than ₹3.08 / 8. (Live search is now charged 2 credits — a chosen subsidy, see
 * CREDIT_COST.billed_places_call — which this floor deliberately ignores.) Sell a pack
 * below this and every single discovery call loses money, quietly, while revenue keeps arriving
 * and hides it.
 *
 * The assertion below runs at import time rather than in a test, because the failure mode is a
 * pricing change that looks fine in a spreadsheet: nobody re-derives this ratio by eye when adding
 * a bigger, cheaper pack.
 */
/** Credits a live lookup would cost at break-even. The floor is derived from THIS, not from the
 *  (subsidised) live-search price — dropping that price to 2 must not drop the floor with it. */
export const BREAK_EVEN_LOOKUP_CREDITS = 8;
export const CREDIT_FLOOR_INR = PLACES_CALL_COST_INR / BREAK_EVEN_LOOKUP_CREDITS; // ≈ ₹0.385

for (const pack of CREDIT_PACKS) {
  const perCredit = rupees(pack.pricePaise) / pack.credits;
  if (perCredit < CREDIT_FLOOR_INR) {
    throw new Error(
      `Credit pack "${pack.id}" prices a credit at ₹${perCredit.toFixed(4)}, below the ₹${CREDIT_FLOOR_INR.toFixed(4)} floor. ` +
        `At that rate every live lookup loses money. Raise the price or the lookup's credit cost.`
    );
  }
}

/* ------------------------------------------------------------------ add funds (top-up) */

/**
 * "Add funds": any whole-rupee amount, credited at a flat rate that is deliberately worse than every
 * plan. Plans are the product; a top-up is for running a little short mid-month, and pricing it
 * at or below a plan would make "never buy a plan, just top up" the rational choice. A top-up adds
 * credits only — it never switches a plan on.
 *
 * Credits are always computed here, on the server, from the rupee amount. The client sends an
 * amount and nothing else.
 */
export const TOPUP_PACK_ID = "topup";
/** Paise per credit. ₹1.25 → ₹50 buys 40 credits. */
export const TOPUP_PAISE_PER_CREDIT = 125;
export const TOPUP_MIN_RUPEES = 50;
export const TOPUP_MAX_RUPEES = 100_000;
export const TOPUP_QUICK_RUPEES = [50, 200, 500, 1_000] as const;

/** Credits a top-up of `rupees` buys, or null when the amount is not a valid top-up. */
export function topupCredits(rupeesAmount: number): number | null {
  if (!Number.isInteger(rupeesAmount) || rupeesAmount < TOPUP_MIN_RUPEES || rupeesAmount > TOPUP_MAX_RUPEES) return null;
  return Math.floor((rupeesAmount * 100) / TOPUP_PAISE_PER_CREDIT);
}

{
  const perCredit = TOPUP_PAISE_PER_CREDIT / 100;
  if (perCredit < CREDIT_FLOOR_INR) {
    throw new Error(`Top-up rate ₹${perCredit} per credit is below the ₹${CREDIT_FLOOR_INR.toFixed(4)} floor.`);
  }
  // A top-up cheaper than a plan would undercut the plans themselves.
  for (const pack of CREDIT_PACKS) {
    if (perCredit <= rupees(pack.pricePaise) / pack.credits) {
      throw new Error(`Top-up rate ₹${perCredit} per credit is not above the "${pack.id}" plan rate — top-ups must cost more than plans.`);
    }
  }
}

/* ------------------------------------------------------------------ job-seeker discount */

/**
 * Job seekers pay less for the same credits — leads-side buyers (agencies, freelancers) are
 * spending to win client work; a job seeker is spending their own money to find work, and the
 * jobs side of the product also costs us materially less to run (see CREDIT_COST.job_area_scan's
 * comment: careers-page scraping is our own HTTP traffic, not a metered Google Places call).
 *
 * Capped per-pack rather than a flat 55%, because a flat 55% off the "Scale" 10k pack prices a
 * credit at ~₹0.34 — under CREDIT_FLOOR_INR (~₹0.385) — meaning every billed Places call that pack
 * funds (jobs mode still needs some, see the Places fallback in app/api/jobs/discover/route.ts)
 * would lose money. Every OTHER pack clears the floor fine at the full 55%.
 */
export const JOB_SEEKER_DISCOUNT_PCT = 55;

export function jobSeekerPricePaise(pack: CreditPack): number {
  const targetPaise = pack.pricePaise * (1 - JOB_SEEKER_DISCOUNT_PCT / 100);
  const floorPaise = CREDIT_FLOOR_INR * 100 * pack.credits;
  return Math.round(Math.max(targetPaise, floorPaise));
}

export function jobSeekerDiscountPctFor(pack: CreditPack): number {
  return Math.round((1 - jobSeekerPricePaise(pack) / pack.pricePaise) * 100);
}

/* ------------------------------------------------------------------ free allowance */

/**
 * Free daily headroom, on every plan. Panning the map over ground we have already scanned is
 * unlimited and free (it costs us nothing), so this only ever counts calls that actually billed
 * Google. The monthly cap is the real guard: 10/day alone would be ~₹924/month of exposure per
 * user, so billedCallsPerMonthFree (40 calls, ~₹123) is what actually bounds it in practice.
 */
export const ALLOWANCE = {
  billedCallsPerDay: 10,
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
