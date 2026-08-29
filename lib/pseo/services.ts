/**
 * The "service" axis of the URL space: what an agency would sell to the businesses on a page.
 *
 * Exactly one service ships, because exactly one signal is real. `leads.has_website` is a verified
 * boolean; "outdated", "broken" and "slow" would each need us to actually fetch and measure the
 * site, and `lead_enrichment` has four rows. Publishing /leads/slow-website/gurgaon today would be
 * a page generated to rank with nothing behind it — the textbook case of what this whole design
 * exists to avoid.
 *
 * The shape is a list so adding one later needs no URL change: measure the sites first, then add
 * the entry.
 */
export type Service = {
  slug: string;
  /** Used in titles and headings: "37 Website Development Leads in Gurgaon". */
  name: string;
  /** One line under the H1, stating what the page actually contains. */
  intro: string;
  /** The lead signal this service is derived from. */
  signal: "no-website";
};

export const SERVICES: Service[] = [
  {
    slug: "website-development",
    name: "Website Development",
    intro:
      "Businesses with an active Google listing and no website of their own — verified by Mantis, not self-reported.",
    signal: "no-website",
  },
];

export const SERVICE_BY_SLUG = new Map(SERVICES.map((s) => [s.slug, s]));
export const DEFAULT_SERVICE = SERVICES[0];
