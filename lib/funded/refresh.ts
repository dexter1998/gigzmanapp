/**
 * Weekly refresh of the funded-startups pages (2026-10-24, Tarun: "page har hafte fresh rahega").
 *
 * A dozen funding-news searches (Exa, last 120 days) → the same extractor the chat's funding signal
 * uses → one row per company in funded_startups. Run from the daily pSEO cron, but only when the
 * last successful run is more than six days old, so the spend is ~a dozen searches a week.
 */
import { sql } from "@/lib/db";
import { fundingFromNews } from "@/lib/v2/signals/funding";
import { recordCronRun } from "@/lib/cron-runs";

export const FUNDED_CITIES: Array<{ slug: string; name: string; match: string[] }> = [
  { slug: "bangalore", name: "Bangalore", match: ["bengaluru", "bangalore"] },
  { slug: "mumbai", name: "Mumbai", match: ["mumbai", "navi mumbai", "bombay", "thane"] },
  { slug: "delhi-ncr", name: "Delhi NCR", match: ["delhi", "new delhi", "ncr", "gurugram", "gurgaon", "noida", "greater noida", "faridabad", "ghaziabad"] },
  { slug: "pune", name: "Pune", match: ["pune"] },
  { slug: "hyderabad", name: "Hyderabad", match: ["hyderabad", "secunderabad"] },
  { slug: "chennai", name: "Chennai", match: ["chennai"] },
  { slug: "ahmedabad", name: "Ahmedabad", match: ["ahmedabad", "gandhinagar"] },
  { slug: "kolkata", name: "Kolkata", match: ["kolkata"] },
  { slug: "jaipur", name: "Jaipur", match: ["jaipur"] },
  { slug: "kochi", name: "Kochi", match: ["kochi", "cochin"] },
  { slug: "chandigarh", name: "Chandigarh", match: ["chandigarh", "mohali", "panchkula"] },
  { slug: "indore", name: "Indore", match: ["indore"] },
];

export function citySlugOf(city: string | null): string | null {
  if (!city) return null;
  const c = city.toLowerCase();
  return FUNDED_CITIES.find((x) => x.match.some((m) => c.includes(m)))?.slug ?? null;
}

const QUERIES: Array<[string, string]> = [
  ["Indian startup raises seed funding round", "India"],
  ["Indian startup raises pre-Series A funding", "India"],
  ["Indian startup raises Series A funding", "India"],
  ["Indian startup raises Series B funding", "India"],
  ["Bengaluru-based startup raises funding", "Bengaluru"],
  ["Mumbai-based startup raises funding", "Mumbai"],
  ["Gurugram-based startup raises funding", "Gurugram"],
  ["Delhi-based startup raises funding", "Delhi"],
  ["Noida-based startup raises funding", "Noida"],
  ["Pune-based startup raises funding", "Pune"],
  ["Hyderabad-based startup raises funding", "Hyderabad"],
  ["Chennai-based startup raises funding", "Chennai"],
];

const keyOf = (s: string) => s.toLowerCase().replace(/\b(pvt|private|ltd|limited|technologies|technology|labs|inc)\b/g, "").replace(/[^a-z0-9]/g, "");

export async function refreshFundedIfDue(force = false): Promise<{ ran: boolean; found?: number; upserted?: number }> {
  if (!force) {
    const [last] = await sql`SELECT max(started_at) AS t FROM cron_runs WHERE job = 'funded' AND ok`;
    if (last?.t && Date.now() - new Date(last.t).getTime() < 6 * 864e5) return { ran: false };
  }
  const startedAt = new Date();
  try {
    const pages = await Promise.all(QUERIES.map(([q, where]) =>
      fundingFromNews(q, `Startups based in ${where}, India that raised a funding round. Skip companies based outside India.`, 120).catch(() => [])));
    let upserted = 0;
    const rows = pages.flat().filter((r) => r.company && r.source);
    for (const r of rows) {
      const k = keyOf(r.company);
      if (k.length < 2) continue;
      const announced = r.date && /^\d{4}-\d{2}(-\d{2})?$/.test(r.date) ? (r.date.length === 7 ? `${r.date}-01` : r.date) : null;
      await sql`
        INSERT INTO funded_startups (company_key, company, website, about, city, city_slug, round, amount, announced, investors, source_url)
        VALUES (${k}, ${r.company}, ${r.website}, ${r.about}, ${r.city ?? null}, ${citySlugOf(r.city ?? null)}, ${r.round}, ${r.amount}, ${announced}, ${sql.json(r.investors)}, ${r.source})
        ON CONFLICT (company_key) DO UPDATE SET
          company = EXCLUDED.company, website = coalesce(EXCLUDED.website, funded_startups.website), about = coalesce(EXCLUDED.about, funded_startups.about),
          city = coalesce(EXCLUDED.city, funded_startups.city), city_slug = coalesce(EXCLUDED.city_slug, funded_startups.city_slug),
          round = EXCLUDED.round, amount = EXCLUDED.amount, announced = EXCLUDED.announced, investors = EXCLUDED.investors,
          source_url = EXCLUDED.source_url, updated_at = now()
        WHERE EXCLUDED.announced IS NOT NULL AND (funded_startups.announced IS NULL OR EXCLUDED.announced >= funded_startups.announced)`;
      upserted++;
    }
    await recordCronRun("funded", startedAt, true, { queries: QUERIES.length, found: rows.length, upserted });
    return { ran: true, found: rows.length, upserted };
  } catch (err) {
    await recordCronRun("funded", startedAt, false, undefined, err instanceof Error ? err.message : String(err));
    return { ran: false };
  }
}
