/**
 * The budgeted Places sweep behind the multi-country lead pages.
 *
 * Everything the API returns is written to disk verbatim before anything is judged, because the
 * archive and the database answer different questions. `leads` holds only rows that passed the
 * category allowlist and resolved to a registered city; the archive holds every place the scan
 * paid for, including the ones those two filters drop. Those rows cost the same money as the ones
 * that survived, and once the response is discarded the only way to get them back is to buy them
 * again.
 *
 * Three properties matter more than speed here, because each call is real money:
 *
 *   - **The cap is required.** No default, no fallback. A scanner with a default budget is one
 *     typo away from spending all of it.
 *   - **Nothing is billed without --confirm.** The default run plans and prices the work and stops.
 *   - **Resume never re-bills.** Every completed (city, phrase) pair is recorded in a ledger and
 *     skipped on the next run, so an interrupted scan costs its remainder, not its whole.
 *
 *   npx tsx scripts/places-scan.ts --country in --max-calls 400            # plan and price only
 *   npx tsx scripts/places-scan.ts --country in --max-calls 400 --confirm  # actually spend
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { CITIES } from "@/lib/pseo/locations";
import { COUNTRY_BY_CODE } from "@/lib/pseo/countries";
import { SWEEPS, INR_PER_CALL } from "@/lib/pseo/scan-plan";
import type { PlaceAddressComponent } from "@/lib/pseo/address";

/** Only the fields the field mask below actually asks for. */
type SearchPlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: PlaceAddressComponent[];
  location?: { latitude?: number; longitude?: number };
  primaryType?: string;
  types?: string[];
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
};
type SearchResponse = { places?: SearchPlace[]; nextPageToken?: string; error?: string; detail?: string };

const KEY = process.env.GOOGLE_PLACES_API_KEY;
/** Outside the repo on purpose: this grows to hundreds of megabytes and holds Places content, and
 *  neither belongs in git. Same separation as the gosom checkout. */
const DATA_DIR = process.env.PLACES_DATA_DIR ?? path.join(os.homedir(), "Desktop", "mantis-places-data");

const FIELD_MASK = [
  "nextPageToken",
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.primaryType",
  "places.types",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.businessStatus",
].join(",");

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};
const flag = (name: string) => process.argv.includes(`--${name}`);

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type LedgerEntry = { key: string; calls: number; places: number; at: string };

function loadLedger(file: string): Map<string, LedgerEntry> {
  if (!fs.existsSync(file)) return new Map();
  const m = new Map<string, LedgerEntry>();
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { const e = JSON.parse(line) as LedgerEntry; m.set(e.key, e); } catch { /* partial final line */ }
  }
  return m;
}

async function searchPage(textQuery: string, city: (typeof CITIES)[number], pageToken?: string, attempt = 1): Promise<SearchResponse> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY!, "X-Goog-FieldMask": FIELD_MASK },
    body: JSON.stringify({
      textQuery,
      // Restricting to the city's own bbox keeps results inside the place we are paying to cover.
      // Without it a phrase like "dentists in Cambridge" happily returns Massachusetts, and every
      // one of those rows is then thrown away by the bounding-box check after being billed for.
      locationRestriction: { rectangle: {
        low: { latitude: city.bbox[0], longitude: city.bbox[1] },
        high: { latitude: city.bbox[2], longitude: city.bbox[3] },
      } },
      languageCode: "en",
      ...(pageToken ? { pageToken } : {}),
    }),
  });

  if ((res.status === 429 || res.status >= 500) && attempt <= 3) {
    await sleep(1000 * attempt);
    return searchPage(textQuery, city, pageToken, attempt + 1);
  }
  if (!res.ok) return { error: `http_${res.status}`, detail: (await res.text()).slice(0, 300), places: [] };
  return res.json();
}

async function main() {
  const countryCode = arg("country");
  const onlyCities = (arg("cities") ?? arg("city"))?.split(",").map((c) => c.trim());
  const maxCalls = Number(arg("max-calls"));
  const confirm = flag("confirm");

  if (!KEY) { console.error("GOOGLE_PLACES_API_KEY not set"); process.exit(1); }
  if (!Number.isFinite(maxCalls) || maxCalls <= 0) {
    console.error("--max-calls <n> is required. There is deliberately no default: every call is billed.");
    process.exit(2);
  }

  // Restricting a run to named phrases is how the gap rate gets measured honestly. The sweep list
  // is ordered by value, so a small --max-calls run only ever sees its first few entries — which
  // are all medical, the categories with the highest website penetration there are. Reading a
  // country's gap rate off that slice would understate it by an order of magnitude.
  const onlyPhrases = arg("phrases")?.split(",").map((p) => p.trim().toLowerCase());

  const cities = CITIES.filter(
    (c) => (!countryCode || c.countryCode === countryCode) && (!onlyCities || onlyCities.includes(c.slug))
  );
  if (!cities.length) { console.error("no cities matched"); process.exit(2); }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const ledgerFile = path.join(DATA_DIR, "ledger.ndjson");
  const placesFile = path.join(DATA_DIR, "places.ndjson");
  const ledger = loadLedger(ledgerFile);

  const sweeps = onlyPhrases ? SWEEPS.filter((s) => onlyPhrases.includes(s.phrase.toLowerCase())) : SWEEPS;
  if (!sweeps.length) { console.error("no sweeps matched --phrases"); process.exit(2); }

  // Sweep-major, not city-major. City-major means a budget that runs short covers the first cities
  // completely and the last ones not at all; sweep-major means every city gets the highest-value
  // categories first and the shortfall lands on the tail of the list in all of them equally. The
  // sweep list is ordered by value precisely so that this degrades in the right direction.
  const planned = sweeps.flatMap((s) => cities.map((c) => ({ city: c, sweep: s })))
    .filter((t) => !ledger.has(`${t.city.slug}|${slugify(t.sweep.phrase)}`));
  const alreadySpent = [...ledger.values()].reduce((n, e) => n + e.calls, 0);

  console.log(`data dir       ${DATA_DIR}`);
  console.log(`cities         ${cities.length} (${cities.map((c) => c.slug).slice(0, 8).join(", ")}${cities.length > 8 ? ", …" : ""})`);
  console.log(`sweeps/city    ${sweeps.length}${onlyPhrases ? ` (filtered from ${SWEEPS.length})` : ""}`);
  console.log(`already done   ${ledger.size} pairs, ${alreadySpent} calls (Rs ${Math.round(alreadySpent * INR_PER_CALL)}) — will be skipped`);
  console.log(`remaining      ${planned.length} pairs`);
  console.log(`budget         ${maxCalls} calls max = Rs ${Math.round(maxCalls * INR_PER_CALL)} worst case`);
  if (!confirm) { console.log(`\nPlan only. Re-run with --confirm to spend.`); return; }

  let calls = 0, kept = 0, seenNew = 0;
  const seen = new Set<string>();
  if (fs.existsSync(placesFile)) {
    for (const line of fs.readFileSync(placesFile, "utf8").split("\n")) {
      if (line.trim()) { try { seen.add(JSON.parse(line).place_id); } catch { /* partial */ } }
    }
  }
  console.log(`known places   ${seen.size} already in places.ndjson\n`);

  for (const { city, sweep } of planned) {
    if (calls >= maxCalls) break;
    const country = COUNTRY_BY_CODE.get(city.countryCode)!;
    const textQuery = `${sweep.phrase} in ${city.name}, ${country.name}`;
    const key = `${city.slug}|${slugify(sweep.phrase)}`;

    const rawDir = path.join(DATA_DIR, "raw", city.countryCode, city.slug);
    fs.mkdirSync(rawDir, { recursive: true });

    let pageToken: string | undefined;
    let pairCalls = 0, pairPlaces = 0;
    // Up to three pages, and only while the previous one came back full. A short page means the
    // result set is exhausted, and paging past it buys an empty response at full price.
    for (let page = 0; page < 3 && calls < maxCalls; page++) {
      const data = await searchPage(textQuery, city, pageToken);
      calls++; pairCalls++;

      fs.writeFileSync(path.join(rawDir, `${slugify(sweep.phrase)}__p${page}.json`),
        JSON.stringify({ textQuery, city: city.slug, page, data }, null, 2));

      if (data.error) { console.log(`  ! ${textQuery} -> ${data.error} ${data.detail ?? ""}`); break; }
      const places = data.places ?? [];
      pairPlaces += places.length;

      for (const p of places) {
        kept++;
        if (seen.has(p.id)) continue;
        seen.add(p.id); seenNew++;
        // Archived exactly as returned, before the allowlist or the resolver has an opinion.
        fs.appendFileSync(placesFile, JSON.stringify({
          place_id: p.id,
          business_name: p.displayName?.text ?? null,
          primary_type: p.primaryType ?? null,
          types: p.types ?? [],
          address: p.formattedAddress ?? null,
          address_components: p.addressComponents ?? null,
          lat: p.location?.latitude ?? null,
          lng: p.location?.longitude ?? null,
          phone: p.nationalPhoneNumber ?? null,
          website: p.websiteUri ?? null,
          rating: p.rating ?? null,
          review_count: p.userRatingCount ?? null,
          business_status: p.businessStatus ?? null,
          scanned_country: city.countryCode,
          scanned_city: city.slug,
          scanned_phrase: sweep.phrase,
          scanned_at: new Date().toISOString(),
        }) + "\n");
      }

      pageToken = places.length === 20 ? data.nextPageToken : undefined;
      if (!pageToken) break;
      await sleep(150);
    }

    fs.appendFileSync(ledgerFile, JSON.stringify({ key, calls: pairCalls, places: pairPlaces, at: new Date().toISOString() } satisfies LedgerEntry) + "\n");
    console.log(`[${String(calls).padStart(4)}/${maxCalls}] ${city.slug.padEnd(14)} ${sweep.phrase.padEnd(26)} ${String(pairPlaces).padStart(3)} results, ${seenNew} new unique`);
    await sleep(120);
  }

  console.log(`\n${calls} calls billed this run = Rs ${Math.round(calls * INR_PER_CALL)}`);
  console.log(`${kept} results seen, ${seenNew} new unique places, ${seen.size} total in archive`);
}

main().catch((e) => { console.error(e); process.exit(1); });
