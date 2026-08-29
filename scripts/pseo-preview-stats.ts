/** Prints what a page would actually say, so the numbers can be sanity-checked before any UI is
 *  built on them.  DATABASE_URL=... npx tsx scripts/pseo-preview-stats.ts */
import { loadScope, type Scope } from "../lib/pseo/stats";
import { pseoSql } from "../lib/pseo/db";

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

async function show(label: string, scope: Scope) {
  const t0 = Date.now();
  const { stats: s, leads } = await loadScope(scope);
  console.log(`\n=== ${label} === (${Date.now() - t0}ms)`);
  console.log(`  no website        ${s.qualifying} of ${s.checked} checked = ${pct(s.gapRate)} gap`);
  console.log(`  unchecked, excl.  ${s.unknown}`);
  console.log(`  categories        ${s.distinctCategories}   rated ${pct(s.ratedShare)}`);
  console.log(`  median reviews    no-website ${s.medianReviewsNoWebsite} vs with-website ${s.medianReviewsWithWebsite}`);
  console.log(`  score bands       ${s.scoreBands.map((b) => `${b.label}:${b.count}`).join("  ")}`);
  console.log(`  coverage          ${s.coverage.exhausted}/${s.coverage.cells} cells exhausted, last verified ${s.coverage.lastVerified?.toISOString().slice(0,10)}`);
  console.log(`  verified range    ${s.verifiedRange.oldest?.toISOString().slice(0,10)} .. ${s.verifiedRange.newest?.toISOString().slice(0,10)}`);
  console.log(`  top categories    ${s.categories.slice(0, 5).map((c) => `${c.label} ${c.qualifying} (${pct(c.gapRate)})`).join(" · ")}`);
  console.log(`  top leads:`);
  for (const l of leads.slice(0, 5)) {
    console.log(`    ${String(l.score).padStart(3)}  ${l.business_name.slice(0, 34).padEnd(36)} ${l.categoryLabel.slice(0, 22).padEnd(24)} ${l.rating ?? "-"} (${l.review_count ?? 0})`);
  }
}

async function main() {
  await show("Gurgaon — city", { kind: "city", citySlug: "gurgaon" });
  await show("DLF Phase 3 — area", { kind: "area", citySlug: "gurgaon", areaSlug: "dlf-phase-3" });
  await show("Sector 5 — area (newer scan, has ratings)", { kind: "area", citySlug: "gurgaon", areaSlug: "sector-5" });
  await show("Gurgaon — restaurants", { kind: "category", citySlug: "gurgaon", category: "restaurant" });
  await pseoSql.end();
}
main().catch(async (e) => { console.error(e); await pseoSql.end(); process.exit(1); });
