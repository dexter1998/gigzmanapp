/**
 * Web and software shops are not leads — they are who Mantis's users compete with. Extracted from
 * the discovery route so the gosom ingest applies exactly the same rule; two copies of this list
 * would drift, and a competitor that slips through lands on a public page as an opportunity.
 */
export const COMPETITOR_NAME_KEYWORDS = [
  "web design", "web development", "website design", "website development",
  "software development", "software company", "software solutions", "app development",
  "mobile app development", "digital agency", "it solutions", "it services", "web solutions",
  "software technologies", "web technologies",
];

export function looksLikeCompetitor(name: string): boolean {
  const text = name.toLowerCase();
  return COMPETITOR_NAME_KEYWORDS.some((k) => text.includes(k));
}
