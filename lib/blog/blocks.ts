/**
 * The block vocabulary a post body is written in.
 *
 * A post is an ordered list of these rather than a blob of HTML or markdown, for three reasons:
 * the renderer stays a server component (no markdown parser in the client bundle), every block
 * renders to semantic HTML we control, and the data-driven blocks (`leads`, `leadCard`) can pull
 * live figures at request time instead of freezing a number into prose that goes stale.
 */

export type Block =
  /** Body copy. One paragraph per string — each should stand alone when quoted, because the
   *  grounding extractor pulls sentence-sized fragments, not whole sections. */
  | { type: "prose"; text: string[] }
  | { type: "h2"; text: string; id: string }
  | { type: "h3"; text: string }
  /** The green tick list from the design. Each item is a claim + its consequence. */
  | { type: "checklist"; items: { title: string; detail?: string }[] }
  /** Comparison table. Every figure here must also read as text in the surrounding prose —
   *  a number that exists only inside a table cell is harder to quote. */
  | { type: "table"; head: string[]; rows: string[][]; note?: string }
  /** Four-across icon row ("Live web discovery / Signal detection / ..."). */
  | { type: "features"; items: { icon: string; title: string; detail: string }[] }
  /** Numbered workflow with connector line. */
  | { type: "steps"; items: { title: string; detail: string; icon: string }[] }
  /** Inline product CTA — the map card and the leads-table card in the design. */
  | { type: "cta"; variant: "map" | "table" | "leadcard"; title: string; detail: string; action: string; href: string }
  /** Live lead cards for a city, pulled at render time. */
  | { type: "leads"; city: string; heading: string; limit?: number; country?: string }
  | { type: "tip"; title: string; text: string }
  | { type: "quote"; text: string; attribution: string; href?: string }

export const BLOG_CATEGORIES = [
  "Lead Generation",
  "Website Gaps",
  "Local SEO",
  "Outreach",
  "Enrichment",
  "Comparisons",
] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

/**
 * Topical clusters. Each post belongs to exactly one, and links up to its hub — this is the
 * whole of "topical authority" that is actually documented: internal link count and click depth
 * are what Google says it reads as relative importance. The name is not a signal; the graph is.
 */
export const BLOG_CLUSTERS = {
  tools: { label: "Lead tools & comparisons", hub: "/resources/best-lead-generation-tools-web-design-agencies" },
  data: { label: "The website gap, measured", hub: "/resources/india-website-gap-report-2026" },
  playbooks: { label: "Agency playbooks", hub: "/resources/how-to-start-a-web-design-agency-india" },
  operations: { label: "Prospecting & sales", hub: "/resources/how-to-find-businesses-that-need-a-website" },
} as const;
export type BlogCluster = keyof typeof BLOG_CLUSTERS;
