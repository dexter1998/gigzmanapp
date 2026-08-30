import fs from "node:fs";
import zlib from "node:zlib";
import { ensureRunning, run } from "./instance";

/**
 * Runs a gosom sweep on the EC2 box and brings the results back.
 *
 * Everything goes over SSM, so there is no SSH key, no open port and no S3 bucket to provision.
 * The one awkward part is that SSM caps a command's captured output at 24,000 characters, which a
 * multi-megabyte result file blows through immediately — so the instance gzips the file, base64s
 * it, splits it into chunks on disk, and this reads the chunks back one call at a time. Compressed
 * first because it turns roughly twenty round trips into two or three.
 */

const CHUNK_BYTES = 18_000;
const IMAGE = "gosom/google-maps-scraper:latest";

async function main() {
  const queryFile = process.argv[2] ?? "/tmp/gosom-queries.txt";
  const outFile = process.argv[3] ?? "/tmp/gosom-instance-out.json";
  const depth = process.argv[4] ?? "2";
  const concurrency = process.argv[5] ?? "2"; // 2 vCPU on the box; more just thrashes it

  const queries = fs.readFileSync(queryFile, "utf8");
  const queriesB64 = Buffer.from(queries).toString("base64");
  console.log(`${queries.trim().split("\n").length} queries, depth ${depth}, concurrency ${concurrency}`);

  console.log("instance:", await ensureRunning());

  console.log("staging query file…");
  const stage = await run([
    "set -e",
    "mkdir -p /opt/gosom-run && cd /opt/gosom-run",
    "rm -f queries.txt results.json results.json.gz.b64 chunk_*",
    `echo '${queriesB64}' | base64 -d > queries.txt`,
    "wc -l queries.txt",
    `docker pull ${IMAGE} >/dev/null 2>&1 && echo pulled || echo 'pull skipped'`,
  ], 900);
  if (!stage.ok) throw new Error(`staging failed: ${stage.stderr.slice(0, 400)}`);
  console.log(" ", stage.stdout.trim().replace(/\n/g, " | "));

  console.log("scraping (this is the long part)…");
  const scrape = await run([
    "set -e",
    "cd /opt/gosom-run",
    `docker run --rm -v /opt/gosom-run:/data ${IMAGE} ` +
      `-input /data/queries.txt -results /data/results.json -json ` +
      `-depth ${depth} -c ${concurrency} -lang en -exit-on-inactivity 3m`,
    "wc -l results.json",
  ], 7200);
  console.log("  scrape ok:", scrape.ok);
  if (scrape.stderr.trim()) console.log("  stderr:", scrape.stderr.trim().slice(0, 400));
  if (!scrape.ok && !scrape.stdout.includes("results.json")) {
    throw new Error("scrape produced nothing");
  }

  console.log("packing results…");
  const pack = await run([
    "set -e",
    "cd /opt/gosom-run",
    "gzip -9 -c results.json | base64 -w0 > results.b64",
    `split -b ${CHUNK_BYTES} -d -a 4 results.b64 chunk_`,
    "ls chunk_* | wc -l",
    "wc -c results.b64",
  ], 900);
  if (!pack.ok) throw new Error(`packing failed: ${pack.stderr.slice(0, 400)}`);
  const [countLine, sizeLine] = pack.stdout.trim().split("\n");
  const chunks = parseInt(countLine.trim(), 10);
  console.log(`  ${chunks} chunks, ${sizeLine.trim()} base64 bytes`);

  let b64 = "";
  for (let i = 0; i < chunks; i++) {
    const name = `chunk_${String(i).padStart(4, "0")}`;
    const got = await run([`cat /opt/gosom-run/${name}`], 300);
    if (!got.ok) throw new Error(`failed reading ${name}`);
    b64 += got.stdout.trim();
    process.stdout.write(`\r  fetched ${i + 1}/${chunks}`);
  }
  process.stdout.write("\n");

  const json = zlib.gunzipSync(Buffer.from(b64, "base64")).toString("utf8");
  fs.writeFileSync(outFile, json);
  console.log(`wrote ${json.trim().split("\n").length} records to ${outFile}`);

  // The box stays up on purpose — a cold boot in front of every run is what made this feel broken
  // before. Only the working files go.
  await run(["rm -f /opt/gosom-run/chunk_* /opt/gosom-run/results.b64"], 300);
}
main().catch((e) => { console.error(String(e).slice(0, 600)); process.exit(1); });
