/**
 * Resolves leads.address -> city_slug / area_slug for rows that haven't been resolved yet.
 *
 * Dry run by default; pass --apply to write. Uses no API calls — see lib/pseo/address.ts.
 *
 *   DATABASE_URL=... npx tsx scripts/pseo-backfill-locations.ts
 *   DATABASE_URL=... npx tsx scripts/pseo-backfill-locations.ts --apply
 */
import postgres from "postgres";
import { resolveLocation } from "../lib/pseo/address";

const APPLY = process.argv.includes("--apply");
const BATCH = 2000;

const sql = postgres(process.env.DATABASE_URL!, { max: 2 });

type Row = { id: string; address: string | null; lat: number | null; lng: number | null };

async function main() {
  const totals = { seen: 0, resolved: 0 };
  const reasons = new Map<string, number>();

  for (;;) {
    const rows = (await sql`
      SELECT id, address, lat, lng FROM leads
      WHERE location_resolved_at IS NULL
      ORDER BY created_at
      LIMIT ${BATCH}
    `) as unknown as Row[];
    if (rows.length === 0) break;

    const ids: string[] = [];
    const cities: (string | null)[] = [];
    const areas: (string | null)[] = [];

    for (const r of rows) {
      totals.seen++;
      const res = resolveLocation(r.address, r.lat, r.lng);
      ids.push(r.id);
      if (res.ok) {
        totals.resolved++;
        cities.push(res.value.citySlug);
        areas.push(res.value.areaSlug);
      } else {
        reasons.set(res.reason, (reasons.get(res.reason) ?? 0) + 1);
        cities.push(null);
        areas.push(null);
      }
    }

    if (!APPLY) {
      console.log(`dry run — would resolve ${totals.resolved}/${totals.seen} so far`);
      break; // one batch is enough to see the shape without writing
    }

    // location_resolved_at is stamped for failures too, so unmatched rows are attempted once and
    // then left alone rather than re-processed on every future run.
    await sql`
      UPDATE leads l
      SET city_slug = d.city_slug, area_slug = d.area_slug, location_resolved_at = now()
      FROM (
        SELECT unnest(${ids}::uuid[]) AS id,
               unnest(${cities}::text[]) AS city_slug,
               unnest(${areas}::text[]) AS area_slug
      ) d
      WHERE l.id = d.id
    `;
    console.log(`resolved ${totals.resolved}/${totals.seen}`);
  }

  console.log(`\n${APPLY ? "written" : "dry run"}: ${totals.resolved} of ${totals.seen} resolved`);
  for (const [k, v] of [...reasons].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(18)} ${v}`);
  }
  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
