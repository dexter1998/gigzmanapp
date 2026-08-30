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
  const p = new URLSearchParams({ v: opts.v, eyebrow: opts.eyebrow, t1: opts.t1 });
  if (opts.t2) p.set("t2", opts.t2);
  if (opts.cta) p.set("cta", opts.cta);
  if (opts.url) p.set("url", opts.url);
  return `${COMPANY.site}/api/og?${p.toString()}`;
}

/** The `images` block a page's openGraph/twitter metadata needs, so no caller repeats the size. */
export function ogImageMeta(opts: Parameters<typeof ogImageUrl>[0]) {
  return [{ url: ogImageUrl(opts), width: 1200, height: 630, alt: `${opts.t1} ${opts.t2 ?? ""}`.trim() }];
}
