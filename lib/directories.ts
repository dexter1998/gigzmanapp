/**
 * Where Mantis Ai is listed, and where it has been submitted.
 *
 * GENERATED — do not edit by hand. growth-os writes this from verified placements:
 * `node src/lanes/export-directories.ts`. A listing is only `live` once its page has been
 * fetched and found to actually contain Mantis Ai, because the strip that renders this is a claim
 * about us, and a claim nobody checked is worse than an empty section.
 *
 * `linked` entries are deliberate and separate: some directories list for free on the condition
 * that the site links back to them in a crawlable way. We link, from a row that says only that.
 *
 * Last generated: 2026-09-15 17:14
 */
export type DirectoryStatus = "live" | "submitted" | "linked";

export interface DirectoryEntry {
  /** Wordmark shown in the strip. Their own logo replaces this once they send one. */
  name: string;
  /** Our listing page when live, their site otherwise. */
  href: string;
  status: DirectoryStatus;
  /** Only for `live`: when the listing was last seen carrying Mantis Ai. */
  verifiedAt?: string;
}

export const DIRECTORIES: DirectoryEntry[] = [
  { name: "Aitop10", href: "https://aitop10.tools/", status: "linked" },
  { name: "Dang", href: "https://dang.ai/", status: "linked" },
  { name: "Insidr", href: "https://insidr.ai/", status: "submitted" },
];

export const liveListings = () => DIRECTORIES.filter((d) => d.status === "live");
export const linkedDirectories = () => DIRECTORIES.filter((d) => d.status === "linked");
export const submittedTo = () => DIRECTORIES.filter((d) => d.status === "submitted");
