import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { CITIES } from "../../lib/pseo/locations";
import { phrasesForTiers, type PhraseTier } from "./phrases";

/**
 * The long-running discovery loop: for every (city, phrase) pair not already done, run gosom
 * locally, load the results into job_companies, and record the pair as covered.
 *
 * The ledger is the reason this can run for days. gosom itself has no checkpointing -- a run is
 * atomic, and a crash three hours in loses everything scraped so far (scripts/places-scan.ts has a
 * ledger precisely because its calls cost money; the gosom path never grew one). Here each pair is
 * appended to ledger.ndjson the moment its results are ingested, so a restart resumes instead of
 * re-scraping ground already covered.
 *
 * Cities are walked breadth-first across countries rather than finishing one country at a time: a
 * sweep that dies early should leave every country with some coverage, not one country complete and
 * the rest empty.
 *
 *   npx tsx scripts/jobs/sweep.ts [--countries=in,us,gb] [--tiers=A,B] [--limit=N] [--depth=2]
 */

const DATA_ROOT = process.env.GOSOM_DATA_DIR ?? path.join(process.env.HOME ?? "", "Desktop", "mantis-gosom-data");
const LEDGER = path.join(DATA_ROOT, "jobs-ledger.ndjson");

type LedgerRow = { city: string; phrase: string; at: string; records: number };

function loadLedger(): Set<string> {
  if (!fs.existsSync(LEDGER)) return new Set();
  const done = new Set<string>();
  for (const line of fs.readFileSync(LEDGER, "utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const row = JSON.parse(t) as LedgerRow;
      done.add(`${row.city}|${row.phrase}`);
    } catch {
      continue;
    }
  }
  return done;
}

function recordDone(city: string, phrase: string, records: number) {
  const row: LedgerRow = { city, phrase, at: new Date().toISOString(), records };
  fs.appendFileSync(LEDGER, `${JSON.stringify(row)}\n`);
}

function arg(name: string): string | null {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : null;
}

function main() {
  const countries = (arg("countries") ?? "in,us,gb,au,ca,de,ae").split(",").map((c) => c.trim().toLowerCase());
  const tiers = (arg("tiers") ?? "A").split(",").map((t) => t.trim().toUpperCase()) as PhraseTier[];
  const limit = Number(arg("limit") ?? 0) || Infinity;
  const depth = arg("depth") ?? "2";
  const concurrency = arg("c") ?? "4";
  const zoom = arg("zoom") ?? "12";

  const phrases = phrasesForTiers(tiers);
  fs.mkdirSync(DATA_ROOT, { recursive: true });
  const done = loadLedger();

  // Breadth-first: all countries' first city, then all countries' second city, and so on.
  const byCountry = new Map<string, typeof CITIES>();
  for (const c of countries) byCountry.set(c, CITIES.filter((city) => city.countryCode === c));
  const maxCities = Math.max(...[...byCountry.values()].map((v) => v.length), 0);
  const cityOrder: typeof CITIES = [];
  for (let i = 0; i < maxCities; i++) {
    for (const c of countries) {
      const city = byCountry.get(c)?.[i];
      if (city) cityOrder.push(city);
    }
  }

  const pairs: Array<{ city: (typeof CITIES)[number]; phrase: string }> = [];
  for (const city of cityOrder) {
    for (const phrase of phrases) {
      if (done.has(`${city.slug}|${phrase}`)) continue;
      pairs.push({ city, phrase });
    }
  }
  process.stdout.write(
    `==> ${cityOrder.length} cities x ${phrases.length} phrases | ${done.size} already done | ${pairs.length} to run\n`,
  );

  let ran = 0;
  for (const { city, phrase } of pairs) {
    if (ran >= limit) break;
    const country = city.countryCode.toUpperCase();
    const queryFile = path.join(DATA_ROOT, "current-queries.txt");
    const outFile = path.join(DATA_ROOT, "current-results.json");
    fs.writeFileSync(queryFile, `${phrase} in ${city.name}, ${country}\n`);

    process.stdout.write(`\n[${ran + 1}/${Math.min(pairs.length, limit)}] ${city.slug} :: ${phrase}\n`);
    try {
      execFileSync(
        "npx",
        [
          "tsx", "scripts/gosom/run-local.ts", queryFile, outFile, depth, concurrency,
          "--fast", `--geo=${city.centroid.lat},${city.centroid.lng}`, `--zoom=${zoom}`, "--idle=90s",
        ],
        { stdio: ["ignore", "ignore", "inherit"], timeout: 20 * 60 * 1000 },
      );
      const out = execFileSync(
        "npx",
        ["tsx", "scripts/jobs/ingest-jobs.ts", outFile, city.slug, city.countryCode],
        { encoding: "utf8", timeout: 10 * 60 * 1000 },
      );
      process.stdout.write(out);
      const m = out.match(/==> (\d+) scraped/);
      recordDone(city.slug, phrase, m ? Number(m[1]) : 0);
    } catch (err) {
      // One bad pair must not end a multi-day sweep. It is left out of the ledger so a later pass
      // retries it, rather than being silently marked covered.
      process.stdout.write(`   FAILED: ${(err as Error).message.split("\n")[0]}\n`);
    }
    ran++;
  }
  process.stdout.write(`\n==> sweep finished ${ran} pairs\n`);
}

main();
