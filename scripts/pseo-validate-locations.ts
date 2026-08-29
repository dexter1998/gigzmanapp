/**
 * Read-only audit of the address resolver against real leads.
 *
 * The whole pSEO system keys off `resolveLocation`, so this exists to prove it works before any page
 * is built on it, and to re-prove it whenever the registry changes. It writes nothing.
 *
 *   DATABASE_URL=... npx tsx scripts/pseo-validate-locations.ts
 */
import postgres from "postgres";
import { parseIndianAddress, resolveLocation } from "../lib/pseo/address";
import { CITY_BY_SLUG, normalizeToken } from "../lib/pseo/locations";

const sql = postgres(process.env.DATABASE_URL!, { max: 2 });

type Row = { id: string; address: string | null; lat: number | null; lng: number | null };

async function main() {
  const rows = (await sql`
    SELECT id, address, lat, lng FROM leads WHERE is_competitor = false
  `) as unknown as Row[];

  const byReason = new Map<string, number>();
  const byCity = new Map<string, number>();
  const byArea = new Map<string, number>();
  let resolved = 0;

  // The claim under test: addresses that literally say Gurugram/Gurgaon must land in `gurgaon`.
  let gurgaonText = 0;
  let gurgaonResolved = 0;
  // And nothing may resolve to a city that doesn't contain it.
  const outsideExamples: string[] = [];
  const unknownTokens = new Map<string, number>();

  for (const r of rows) {
    const saysGurgaon = !!r.address && /gurugram|gurgaon/i.test(r.address);
    if (saysGurgaon) gurgaonText++;

    const res = resolveLocation(r.address, r.lat, r.lng);
    if (!res.ok) {
      byReason.set(res.reason, (byReason.get(res.reason) ?? 0) + 1);
      if (res.reason === "outside-bbox" && outsideExamples.length < 5 && r.address) {
        outsideExamples.push(r.address.slice(0, 90));
      }
      if (res.reason === "unknown-city" && r.address) {
        const t = normalizeToken(parseIndianAddress(r.address).cityToken ?? "");
        unknownTokens.set(t, (unknownTokens.get(t) ?? 0) + 1);
      }
      continue;
    }
    resolved++;
    byCity.set(res.value.citySlug, (byCity.get(res.value.citySlug) ?? 0) + 1);
    if (res.value.areaSlug) byArea.set(res.value.areaSlug, (byArea.get(res.value.areaSlug) ?? 0) + 1);
    if (saysGurgaon && res.value.citySlug === "gurgaon") gurgaonResolved++;

    // Hard invariant, not a statistic: a resolution outside its own city's box is a bug.
    const city = CITY_BY_SLUG.get(res.value.citySlug)!;
    const [minLat, minLng, maxLat, maxLng] = city.bbox;
    if (r.lat! < minLat || r.lat! > maxLat || r.lng! < minLng || r.lng! > maxLng) {
      throw new Error(`INVARIANT VIOLATED: lead ${r.id} resolved to ${city.slug} but is outside its bbox`);
    }
  }

  const pct = (n: number, d: number) => (d === 0 ? "0.0" : ((n / d) * 100).toFixed(1));

  console.log(`\nleads examined            ${rows.length}`);
  console.log(`resolved                  ${resolved} (${pct(resolved, rows.length)}%)`);
  console.log(`\nunresolved by reason`);
  for (const [k, v] of [...byReason].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(18)} ${String(v).padStart(6)}  ${pct(v, rows.length)}%`);
  }

  console.log(`\nACCEPTANCE — addresses naming Gurugram/Gurgaon resolve to 'gurgaon'`);
  console.log(`  ${gurgaonResolved} of ${gurgaonText} = ${pct(gurgaonResolved, gurgaonText)}%  (target >= 95%)`);

  console.log(`\nresolved cities`);
  for (const [k, v] of [...byCity].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(18)} ${String(v).padStart(6)}`);
  }

  console.log(`\ntop areas`);
  for (const [k, v] of [...byArea].sort((a, b) => b[1] - a[1]).slice(0, 14)) {
    console.log(`  ${k.padEnd(22)} ${String(v).padStart(6)}`);
  }

  // The unresolved tail, which is also the raw material for candidate detection: a token appearing
  // here in volume is either a place worth registering or junk worth ignoring, and this is how that
  // gets decided rather than guessed.
  console.log(`\nunregistered city tokens by volume (candidates / junk)`);
  for (const [k, v] of [...unknownTokens].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`  ${(k || "(empty)").slice(0, 28).padEnd(30)} ${String(v).padStart(5)}`);
  }

  if (outsideExamples.length) {
    console.log(`\nrejected by the coordinate check (text said one place, the map said another)`);
    for (const e of outsideExamples) console.log(`  ${e}`);
  }

  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
