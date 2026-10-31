/**
 * Source benchmark — capability "website". Measures Exa against ground truth before it is trusted:
 *   A: businesses whose site Google Place Details already returned → does Exa find the same domain?
 *   B: has a website, no URL on file → does Exa find one, and does that site carry the listing's phone?
 *   C: listing shows NO website → does Exa find one anyway ("website_not_listed" ≠ "no_website")?
 * usage: npx tsx --env-file=.env.local scripts/v2-testsuite/bench-website.ts [A] [B] [C]
 */
import { sql } from "@/lib/db";
import { websiteViaExa } from "@/lib/v2/sources/website";
import { domainOf, fetchPage } from "@/lib/v2/net";

const N = { A: Number(process.env.NA ?? 30), B: Number(process.env.NB ?? 20), C: Number(process.env.NC ?? 15) };
const digits = (s: string | null) => (s ?? "").replace(/\D/g, "").slice(-10);
const bare = (u: string | null) => (u ? (domainOf(u) ?? "").replace(/^www\./, "") : "");

async function phoneOnSite(url: string, phone: string | null): Promise<boolean | null> {
  const p = digits(phone);
  if (p.length < 8) return null;
  const page = await fetchPage(url, 8000);
  if (!page?.html) return null;
  return page.html.replace(/\D/g, "").includes(p);
}

async function main() {
  const sets = process.argv.slice(2).length ? process.argv.slice(2) : ["A", "B", "C"];
  let spent = 0;
  const report: string[] = [];

  if (sets.includes("A")) {
    const rows = await sql`
      SELECT DISTINCT ON (l.id) l.id, l.place_id, l.business_name, l.category, l.city_slug, l.website_url, l.phone
      FROM v2_results r JOIN leads l ON l.id = r.lead_id
      WHERE r.provenance->>'url_by' = 'place_details' AND l.website_url IS NOT NULL
      ORDER BY l.id LIMIT ${N.A}`;
    let found = 0, same = 0;
    const misses: string[] = [];
    for (const r of rows) {
      const f = await websiteViaExa({ name: r.business_name, category: r.category, city: r.city_slug, entityKey: `place:${r.place_id}`, placeType: r.category, phone: r.phone });
      spent += f?.costUsd ?? 0;
      if (f) { found++; if (bare(f.url) === bare(r.website_url)) same++; else misses.push(`${r.business_name}: exa ${bare(f.url)} vs google ${bare(r.website_url)}`); }
    }
    report.push(`A (ground truth, n=${rows.length}): Exa returned a site for ${found}; same domain as Google for ${same} (${Math.round((100 * same) / Math.max(1, rows.length))}% recall, ${Math.round((100 * same) / Math.max(1, found))}% precision)`);
    report.push(...misses.slice(0, 8).map((m) => `   mismatch: ${m}`));
  }

  if (sets.includes("B")) {
    const rows = await sql`
      SELECT id, place_id, business_name, category, city_slug, phone FROM leads
      WHERE has_website AND website_url IS NULL AND city_slug = 'gurgaon' AND phone IS NOT NULL
      ORDER BY review_count DESC NULLS LAST LIMIT ${N.B}`;
    let found = 0, verified = 0, unverifiable = 0;
    for (const r of rows) {
      const f = await websiteViaExa({ name: r.business_name, category: r.category, city: r.city_slug, entityKey: `place:${r.place_id}`, placeType: r.category, phone: r.phone });
      spent += f?.costUsd ?? 0;
      if (!f) continue;
      found++;
      const v = await phoneOnSite(f.url, r.phone);
      if (v === true) verified++; else if (v === null) unverifiable++;
    }
    report.push(`B (website exists, no URL, n=${rows.length}): Exa found ${found}; listing phone present on that site for ${verified} (${unverifiable} pages unreadable)`);
  }

  if (sets.includes("C")) {
    const rows = await sql`
      SELECT id, place_id, business_name, category, city_slug, phone FROM leads
      WHERE has_website = false AND city_slug = 'gurgaon' AND phone IS NOT NULL AND review_count >= 20
      ORDER BY review_count DESC LIMIT ${N.C}`;
    let found = 0, verified = 0;
    const ex: string[] = [];
    for (const r of rows) {
      const f = await websiteViaExa({ name: r.business_name, category: r.category, city: r.city_slug, entityKey: `place:${r.place_id}`, placeType: r.category, phone: r.phone });
      spent += f?.costUsd ?? 0;
      if (!f) continue;
      found++;
      if (await phoneOnSite(f.url, r.phone)) { verified++; ex.push(`${r.business_name} → ${f.url}`); }
    }
    report.push(`C (listing has NO website, n=${rows.length}): Exa found a site for ${found}; phone-verified ${verified} — these are "website not listed", not "no website"`);
    report.push(...ex.slice(0, 5).map((e) => `   e.g. ${e}`));
  }

  report.push(`spent ≈ $${spent.toFixed(3)}`);
  console.log(report.join("\n"));
  process.exit(0);
}
main();
