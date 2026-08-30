import { run } from "./instance";
async function main() {
  const out = await run([
    "wc -l /opt/gosom-run/results.json 2>/dev/null | awk '{print \"partial records: \" $1}' || echo 'partial records: 0'",
    "docker ps -q | xargs -r docker stop >/dev/null 2>&1 || true",
    "echo 'containers stopped'",
  ], 600);
  console.log(out.ok ? out.stdout.trim() : `not ok: ${out.stderr.slice(0, 200)}`);
}
main().catch((e) => console.error("failed:", String(e).slice(0, 200)));
