/**
 * "Golden opportunity" tiering — which companies get the gold card treatment instead of the plain
 * white one.
 *
 * Matched on registrable domain, never on company name: names collide constantly (there are a
 * dozen unrelated "Apple"s in any Places dataset, and exactly one apple.com), and a name match
 * would hand the gold card to a phone-repair shop called "Apple Care Center".
 *
 * The big-tech and unicorn lists are hand-curated and deliberately short — they change on the
 * order of once a year, so a static list costs nothing to maintain and never makes a network call
 * at render time. The YC list is the one that genuinely churns (two batches a year, hundreds of
 * companies), so it is refreshed by scripts/yc-refresh.ts into the same shape rather than being
 * typed out here.
 */

export type GoldenTier = "big_tech" | "unicorn" | "yc";

export const GOLDEN_TIER_LABEL: Record<GoldenTier, string> = {
  big_tech: "Big Tech",
  unicorn: "Unicorn",
  yc: "Y Combinator",
};

/** Household-name global employers. */
const BIG_TECH = new Set([
  "apple.com", "microsoft.com", "google.com", "abc.xyz", "amazon.com", "meta.com", "netflix.com",
  "nvidia.com", "adobe.com", "salesforce.com", "oracle.com", "ibm.com", "intel.com", "cisco.com",
  "qualcomm.com", "vmware.com", "sap.com", "dell.com", "hp.com", "uber.com", "airbnb.com",
  "linkedin.com", "x.com", "spotify.com", "atlassian.com", "shopify.com", "stripe.com",
  "openai.com", "anthropic.com", "deepmind.google", "databricks.com", "snowflake.com",
  "figma.com", "notion.so", "canva.com", "datadoghq.com", "cloudflare.com", "twilio.com",
  "goldmansachs.com", "jpmorgan.com", "mckinsey.com", "bain.com", "bcg.com",
]);

/** India-market unicorns and large scale-ups — the names that read as a step up locally. */
const UNICORNS = new Set([
  "flipkart.com", "swiggy.com", "zomato.com", "paytm.com", "phonepe.com", "razorpay.com",
  "cred.club", "zerodha.com", "groww.in", "meesho.com", "nykaa.com", "lenskart.com",
  "urbancompany.com", "oyorooms.com", "dream11.com", "byjus.com", "unacademy.com", "upgrad.com",
  "policybazaar.com", "delhivery.com", "zepto.co.in", "blinkit.com", "freshworks.com",
  "zoho.com", "postman.com", "browserstack.com", "chargebee.com", "innovaccer.com",
  "sharechat.com", "ola.com", "olacabs.com", "bigbasket.com", "pharmeasy.in", "cars24.com",
  "spinny.com", "licious.in", "purplle.com", "mamaearth.in", "boat-lifestyle.com",
  "zetwerk.com", "moglix.com", "infra.market", "apnaclub.com", "khatabook.com", "zolve.com",
]);

/**
 * YC-backed companies, refreshed from the public YC company directory. Empty until
 * scripts/yc-refresh.ts has run at least once — an empty set simply means no listing gets the YC
 * badge, which is the correct failure mode (a missing badge, never a wrong one).
 */
let ycDomains: Set<string> = new Set();

/** Called by scripts/yc-refresh.ts and by the jobs cron after it reloads the directory. */
export function setYcDomains(domains: Iterable<string>) {
  ycDomains = new Set([...domains].map(normalizeDomain).filter(Boolean) as string[]);
}

export function normalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  let host = input.trim().toLowerCase();
  // Accept either a bare host or a full URL.
  if (host.includes("://")) {
    try {
      host = new URL(host).hostname;
    } catch {
      return null;
    }
  }
  host = host.replace(/^www\./, "").replace(/\/.*$/, "");
  return host || null;
}

/**
 * Tier for a company domain, or null for the ordinary white card. Subdomain-tolerant: a careers
 * page on `jobs.stripe.com` is still Stripe.
 */
export function goldenTierFor(domainOrUrl: string | null | undefined): GoldenTier | null {
  const host = normalizeDomain(domainOrUrl);
  if (!host) return null;

  const matches = (set: Set<string>) =>
    set.has(host) || [...set].some((d) => host.endsWith(`.${d}`));

  if (matches(BIG_TECH)) return "big_tech";
  if (matches(UNICORNS)) return "unicorn";
  if (ycDomains.size && matches(ycDomains)) return "yc";
  return null;
}

export function isGolden(domainOrUrl: string | null | undefined): boolean {
  return goldenTierFor(domainOrUrl) !== null;
}
