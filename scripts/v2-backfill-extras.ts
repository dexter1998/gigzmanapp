/**
 * Extra lead columns for an existing run (lib/v2/extras.ts): facts folded in + one cheap-model call
 * per delivered lead over the page text the run read (the `site_text` fact).
 *
 *   npx tsx --env-file=.env.local scripts/v2-backfill-extras.ts <runId> [--fetch] [--force]
 *
 * A run planned before extraColumns existed gets columns proposed from its plan (one cheap call) and
 * saved on the plan. --fetch: rows with no cached text get their site read once more by the
 * self-hosted reader (free: no paid lookups) and the text is cached. No paid APIs either way.
 */
import { sql } from "../lib/db";
import { readSite } from "../lib/v2/reader/read";
import { cacheSiteText, cachedSiteText, cleanColumns, fillRunExtras, proposeColumns } from "../lib/v2/extras";
import { toLead } from "../lib/v2/lms";

async function main() {
  const runId = process.argv[2];
  const fetchMissing = process.argv.includes("--fetch");
  if (!runId || !/^[0-9a-f-]{36}$/i.test(runId)) throw new Error("usage: v2-backfill-extras.ts <runId> [--fetch] [--force]");
  const [run] = await sql`SELECT id, plan FROM v2_runs WHERE id = ${runId}`;
  if (!run) throw new Error("run not found");
  let columns = cleanColumns(run.plan.extraColumns);
  if (!columns.length) {
    columns = await proposeColumns(run.plan);
    if (!columns.length) throw new Error("no columns proposed");
    await sql`UPDATE v2_runs SET plan = plan || ${sql.json({ extraColumns: columns })} WHERE id = ${runId}`;
    console.log("proposed + saved columns");
  }
  console.log("extraColumns:", JSON.stringify(columns, null, 1));

  let fetched = 0;
  const res = await fillRunExtras(runId, columns, {
    force: process.argv.includes("--force"),
    text: async (r) => {
      const domain = r.domain as string | null;
      let text = await cachedSiteText(domain);
      if (!text && fetchMissing && domain) {
        const [row] = await sql`SELECT website FROM v2_results WHERE id = ${r.id as number}`;
        const read = row?.website ? await readSite({ domain, website: String(row.website), want: { enrich: true } }).catch(() => null) : null;
        text = read?.text ?? "";
        if (text) { fetched++; await cacheSiteText(domain, text); }
      }
      return text;
    },
  });
  console.log(`rows ${res.rows}, model calls ${res.calls}, values filled ${res.filled}, sites re-read ${fetched}`);

  const rows = await sql`
    SELECT r.*, u.chat_id, u.finished_at, u.plan->'extraColumns' AS extra_columns, d.site_signals->'phones' AS site_phones,
           max(r.score) OVER () AS max_score
    FROM v2_results r JOIN v2_runs u ON u.id = r.run_id LEFT JOIN scrape_domains d ON d.domain = r.domain
    WHERE r.run_id = ${runId} AND r.rank IS NOT NULL ORDER BY r.rank`;
  for (const r of rows) {
    const l = toLead(r, Number(r.max_score ?? 0));
    console.log(`\n${l.name} (${l.website ?? "-"})`);
    console.log("  extras  ", JSON.stringify(l.extras));
    console.log("  emails  ", l.emailList.map((e) => `${e.email}[t${e.tier}]`).join(", ") || "-");
    console.log("  phones  ", l.phones.map((p) => `${p.number}[${p.kind}]`).join(", ") || "-", "| whatsapp", l.whatsapp ?? "-");
  }
  await sql.end();
}
main().catch(async (e) => { console.error(e); await sql.end().catch(() => undefined); process.exit(1); });
