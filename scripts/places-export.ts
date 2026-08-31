/**
 * Splits the scan archive into per-category CSVs, with and without a website.
 *
 * This reads `places.ndjson` — everything the scan paid for — not the `leads` table. The two are
 * deliberately different: `leads` keeps only rows that passed the category allowlist and resolved
 * to a registered city, and both of those filters exist to protect the public pages, not to decide
 * what the scan was worth. A category that is wrong for a lead page is still a category somebody
 * bought, and the export is where it stays reachable.
 *
 * Category here is Google's `primaryType`, so all 370 of them appear on their own without ever
 * having been queried for individually.
 *
 *   npx tsx scripts/places-export.ts
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { TYPE_TO_SECTION } from "@/lib/categories";
import { isAllowedLeadType } from "@/lib/lead-quality";
import type { ArchivedPlace } from "@/lib/pseo/archive";

const DATA_DIR = process.env.PLACES_DATA_DIR ?? path.join(os.homedir(), "Desktop", "mantis-places-data");
const OUT = path.join(DATA_DIR, "by-category");

const COLS = ["place_id", "business_name", "primary_type", "section", "address", "lat", "lng",
  "phone", "website", "rating", "review_count", "business_status", "scanned_city", "scanned_phrase"] as const;

/** RFC 4180: quote everything and double any embedded quote. Business names contain commas,
 *  quotes and newlines often enough that anything less corrupts the file silently. */
const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const row = (r: ArchivedPlace) => COLS.map((c) => cell(c === "section" ? (TYPE_TO_SECTION[r.primary_type ?? ""] ?? "Uncategorised") : r[c as keyof ArchivedPlace])).join(",");

function main() {
  const src = path.join(DATA_DIR, "places.ndjson");
  if (!fs.existsSync(src)) { console.error(`no archive at ${src} — run places-scan.ts first`); process.exit(1); }

  fs.rmSync(OUT, { recursive: true, force: true });
  const buckets = new Map<string, { with: string[]; without: string[]; unknown: string[] }>();
  let total = 0;

  for (const line of fs.readFileSync(src, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let r: ArchivedPlace; try { r = JSON.parse(line) as ArchivedPlace; } catch { continue; }
    total++;
    const country = r.scanned_country ?? "unknown";
    const type = r.primary_type ?? "unknown";
    const k = `${country}/${type}`;
    if (!buckets.has(k)) buckets.set(k, { with: [], without: [], unknown: [] });
    const b = buckets.get(k)!;
    // A missing websiteUri from Places is a real answer, not a gap: the field was requested in the
    // mask and the response is authoritative for it. That is the one thing this data has over the
    // scraper, where a blank could equally mean the page never loaded.
    (r.website ? b.with : b.without).push(row(r));
  }

  const header = COLS.join(",");
  const summary: string[] = ["country,primary_type,section,in_allowlist,total,with_website,without_website,gap_rate"];

  for (const [k, b] of [...buckets.entries()].sort()) {
    const [country, type] = k.split("/");
    const dir = path.join(OUT, country, type);
    fs.mkdirSync(dir, { recursive: true });
    if (b.with.length) fs.writeFileSync(path.join(dir, "with-website.csv"), [header, ...b.with].join("\n") + "\n");
    if (b.without.length) fs.writeFileSync(path.join(dir, "without-website.csv"), [header, ...b.without].join("\n") + "\n");
    const t = b.with.length + b.without.length;
    summary.push([country, type, TYPE_TO_SECTION[type] ?? "Uncategorised", String(isAllowedLeadType(type)),
      String(t), String(b.with.length), String(b.without.length), t ? (b.without.length / t).toFixed(3) : "0"].join(","));
  }

  fs.writeFileSync(path.join(DATA_DIR, "summary-by-category.csv"), summary.join("\n") + "\n");
  console.log(`${total} places -> ${buckets.size} country/category folders under ${OUT}`);
  console.log(`summary: ${path.join(DATA_DIR, "summary-by-category.csv")}`);
}
main();
