/** Recompute every pSEO page's stats and re-run the gate.
 *  DATABASE_URL=... npx tsx scripts/pseo-refresh.ts */
import { refreshAll } from "../lib/pseo/refresh";
import { pseoSql } from "../lib/pseo/db";

async function main() {
  const t0 = Date.now();
  const results = await refreshAll();
  const by = (s: string) => results.filter((r) => r.status === s);

  console.log(`\n${results.length} pages evaluated in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  published ${by("published").length}   noindex ${by("noindex").length}   withheld ${by("withheld").length}`);

  console.log(`\npublished:`);
  for (const r of by("published").sort((a, b) => b.qualifying - a.qualifying)) {
    console.log(`  ${String(r.qualifying).padStart(5)}  ${r.pageKey}`);
  }

  console.log(`\nheld back — top 12 by size, with the rule that stopped them:`);
  for (const r of [...by("noindex"), ...by("withheld")].sort((a, b) => b.qualifying - a.qualifying).slice(0, 12)) {
    console.log(`  ${String(r.qualifying).padStart(5)}  ${r.pageKey.padEnd(44)} ${r.failures[0] ?? ""}`);
  }
  await pseoSql.end();
}
main().catch(async (e) => { console.error(e); await pseoSql.end(); process.exit(1); });
