import { COMPANY } from "@/lib/company";

/**
 * Which background art a page's social card uses, and how every caller spells the parameters.
 *
 * Kept out of the route file because a Next route module may only export HTTP handlers and route
 * config — and because the map is the one thing both the renderer and every page needs to agree on.
 */
export const OG_BACKGROUNDS = {
  hero: "og-hero.jpg",
  leads: "og-leads.jpg",
  nearby: "og-nearby.jpg",
  methodology: "og-methodology.jpg",
  pricing: "og-pricing.jpg",
  partner: "og-partner.jpg",
  network: "og-network.jpg",
  company: "og-company.jpg",
  contact: "og-contact.jpg",
  privacy: "og-privacy.jpg",
  terms: "og-terms.jpg",
} as const;

export type OgVariant = keyof typeof OG_BACKGROUNDS;

export function ogImageUrl(opts: {
  v: OgVariant;
  eyebrow: string;
  t1: string;
  t2?: string;
  /** The action the card is asking for. Sits under the headline as a pill. */
  cta?: string;
  url?: string;
}): string {
  // Everything travels in ONE parameter, so the URL contains no "&" at all.
  //
  // In HTML an "&" inside an attribute is correctly written "&amp;", and a compliant parser
  // decodes it. Several real scrapers do not: they read the raw attribute and request the URL
  // with the entity intact, so every parameter after the first arrives named "amp;t1",
  // "amp;cta", ... and the renderer falls back to its defaults. That is exactly what a card
  // preview showed — the headline's second line and the CTA silently gone. With a single
  // parameter there is no separator left to mangle.
  const payload = { v: opts.v, eyebrow: opts.eyebrow, t1: opts.t1, t2: opts.t2, cta: opts.cta, url: opts.url };
  const d = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${COMPANY.site}/api/og?d=${d}`;
}

/** The `images` block a page's openGraph/twitter metadata needs, so no caller repeats the size. */
export function ogImageMeta(opts: Parameters<typeof ogImageUrl>[0]) {
  return [{ url: ogImageUrl(opts), width: 1200, height: 630, alt: `${opts.t1} ${opts.t2 ?? ""}`.trim() }];
}
