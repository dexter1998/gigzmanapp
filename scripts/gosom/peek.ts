import { run } from "./instance";
async function main() {
  const out = await run([
    "wc -l /opt/gosom-run/results.json 2>/dev/null || echo '0 no-results'",
    "docker ps --format '{{.Image}} | {{.Status}}' | head -2 || true",
  ], 180);
  console.log(out.stdout.trim() || "(no output)");
  if (out.stderr.trim()) console.log("stderr:", out.stderr.slice(0, 300));
}
main().catch((e) => console.error("peek failed:", String(e).slice(0, 200)));
