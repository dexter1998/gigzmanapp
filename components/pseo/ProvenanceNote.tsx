import Link from "next/link";

/**
 * States where the numbers come from, on every page.
 *
 * This is not a disclaimer, it is the argument. Business names, categories and ratings originate
 * from Google listings — republishing those alone would be "scraping feeds to generate many pages"
 * in Google's own words. What makes the page publishable is the layer on top: gap rates, rankings,
 * scores and coverage, all computed from a dataset we assembled. Saying so plainly is both honest
 * and the clearest signal that this is analysis rather than a reposted feed.
 */
export function ProvenanceNote({ observedOn }: { observedOn: Date | null }) {
  return (
    <p
      style={{
        fontSize: 12.5,
        lineHeight: 1.65,
        color: "var(--g-gray-500)",
        borderTop: "1px solid var(--g-border)",
        paddingTop: 16,
        margin: "32px 0 0",
      }}
    >
      Business names, categories, ratings and review counts originate from Google Maps listings
      {observedOn ? ` and were last observed by Mantis on ${observedOn.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : ""}.
      Website gap rates, area rankings, Lead Scores and coverage figures are Mantis&rsquo;s own
      calculations — <Link href="/leads/methodology" style={{ color: "var(--g-green-text)" }}>see how they&rsquo;re produced</Link>.
    </p>
  );
}
