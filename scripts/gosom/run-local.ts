import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Runs gosom on this machine instead of the EC2 box, writing a results file that `ingest.ts`
 * consumes unchanged.
 *
 * Why local rather than the instance: the SSM path in run-on-instance.ts pulls results back by
 * gzipping, base64-ing and splitting into 18KB chunks, one SSM round trip per chunk. That is fine
 * for a single city and impossible for a sustained multi-country sweep -- a 500MB run is thousands
 * of round trips at 5s polling each, hours of pure transfer. Locally the file is just a file.
 * The laptop is also the bigger machine: the t3.micro is 2 vCPU / 911MB, this VM is 4 / 6GB, which
 * is what lets concurrency go above the 2 the instance could not exceed without thrashing.
 *
 * The image is amd64-only; on Apple Silicon it runs under Rosetta, which is why --platform is
 * pinned explicitly rather than left to Docker's default resolution.
 *
 *   npx tsx scripts/gosom/run-local.ts <queryFile> <outFile> [depth] [concurrency] \
 *     --fast --geo=<lat,lng> --zoom=<n>
 */

const IMAGE = "gosom/google-maps-scraper:latest";

function main() {
  const queryFile = process.argv[2] ?? "/tmp/gosom-queries.txt";
  const outFile = process.argv[3] ?? "/tmp/gosom-local-out.json";
  const depth = process.argv[4] ?? "2";
  const concurrency = process.argv[5] ?? "4";
  const fastMode = process.argv.includes("--fast");

  const geoArg = process.argv.find((a) => a.startsWith("--geo="));
  const geo = geoArg ? geoArg.slice("--geo=".length) : "28.4595,77.0266";
  const zoomArg = process.argv.find((a) => a.startsWith("--zoom="));
  const zoom = zoomArg ? zoomArg.slice("--zoom=".length) : "14";
  // gosom stops a query once nothing new has arrived for this long. Kept as a flag because a
  // sparse country needs longer patience than a dense city before "quiet" really means "done".
  const idleArg = process.argv.find((a) => a.startsWith("--idle="));
  const idle = idleArg ? idleArg.slice("--idle=".length) : "3m";

  if (!fs.existsSync(queryFile)) throw new Error(`query file not found: ${queryFile}`);
  const queryCount = fs.readFileSync(queryFile, "utf8").split("\n").filter((l) => l.trim()).length;
  if (queryCount === 0) throw new Error(`query file is empty: ${queryFile}`);

  // gosom only sees what is mounted, so the run gets its own directory holding both the input and
  // the output. Reusing the caller's directories would mount whatever else lives beside them.
  //
  // Under $HOME, not TMPDIR: on macOS the VM running Docker mounts the home directory but not
  // /var/folders, where TMPDIR points -- a run staged there starts and then fails inside the
  // container with "open /data/queries.txt: no such file or directory".
  const dataRoot = process.env.GOSOM_DATA_DIR ?? path.join(process.env.HOME ?? "", "Desktop", "mantis-gosom-data");
  fs.mkdirSync(path.join(dataRoot, "runs"), { recursive: true });
  const runDir = fs.mkdtempSync(path.join(dataRoot, "runs", "run-"));
  fs.copyFileSync(queryFile, path.join(runDir, "queries.txt"));

  const args = [
    "run", "--rm", "--platform", "linux/amd64", "--shm-size=1g",
    "-v", `${runDir}:/data`,
    IMAGE,
    "-input", "/data/queries.txt",
    "-results", "/data/results.json",
    "-json",
    "-depth", depth,
    "-c", concurrency,
    "-lang", "en",
    "-geo", geo,
    "-zoom", zoom,
    ...(fastMode ? ["-fast-mode"] : []),
    "-exit-on-inactivity", idle,
  ];

  process.stdout.write(`==> ${queryCount} queries, depth ${depth}, c ${concurrency}, geo ${geo}, zoom ${zoom}\n`);
  const started = Date.now();
  try {
    execFileSync("docker", args, { stdio: ["ignore", "inherit", "inherit"] });
  } catch (err) {
    // A non-zero exit still leaves whatever was scraped before the failure on disk, and a partial
    // run is worth ingesting -- so this reports and continues to the copy rather than rethrowing.
    process.stdout.write(`==> gosom exited non-zero: ${(err as Error).message}\n`);
  }

  const produced = path.join(runDir, "results.json");
  if (!fs.existsSync(produced)) {
    fs.rmSync(runDir, { recursive: true, force: true });
    throw new Error("gosom produced no results file");
  }
  fs.copyFileSync(produced, outFile);
  const bytes = fs.statSync(outFile).size;
  fs.rmSync(runDir, { recursive: true, force: true });

  const mins = ((Date.now() - started) / 60000).toFixed(1);
  process.stdout.write(`==> wrote ${outFile} (${(bytes / 1024 / 1024).toFixed(1)} MB) in ${mins}m\n`);
}

main();
