/**
 * Mantis site reader — runs on the AWS enrichment box (leadgen-scraper, private VPC address); the one
 * place Mantis's self-hosted scraping happens. No database, no paid APIs, no secrets beyond its key.
 *
 *   POST /read    the Qualifier's per-lead reads (lib/v2/reader/read.ts)
 *   POST /enrich  the Website Enrich API's crawl (lib/v2/enrich-crawl.ts) — {url, modules}
 *   POST /fetch   one page (lib/v2/net fetchPage) — {url, timeoutMs}
 *   GET  /health  counters
 *
 * Only reachable inside the VPC (security group allows the App Runner VPC connector), and every
 * request must carry x-reader-key. The fetchers refuse private addresses on every hop (lib/v2/net
 * safeFetch), so a URL in a request can't reach the instance metadata service or the VPC.
 *
 * Built into one file by services/site-reader/build.sh; deployed by services/site-reader/deploy.sh.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { readSite, type ReadRequest } from "../../lib/v2/reader/read";
import { crawlSite, MODULES, type Module } from "../../lib/v2/enrich-crawl";
import { normalizeUrl, fetchPage } from "../../lib/v2/net";

const PORT = Number(process.env.PORT ?? 8787);
const KEY = process.env.READER_KEY ?? "";
const MAX_ACTIVE = Number(process.env.READER_CONCURRENCY ?? 24);
const MAX_QUEUE = 200;
const REQUEST_TIMEOUT_MS = 55_000;
const MAX_BODY = 32 * 1024;

if (KEY.length < 24) { console.error("READER_KEY missing or too short"); process.exit(1); }

let active = 0;
const queue: Array<() => void> = [];
const stats = { started: new Date().toISOString(), served: 0, failed: 0, rejected: 0, totalMs: 0 };

async function slot(): Promise<() => void> {
  if (active < MAX_ACTIVE) { active++; return release; }
  if (queue.length >= MAX_QUEUE) throw Object.assign(new Error("busy"), { status: 503 });
  await new Promise<void>((res) => queue.push(res));
  active++;
  return release;
}
function release() { active--; queue.shift()?.(); }

function authed(req: IncomingMessage): boolean {
  const got = Buffer.from(String(req.headers["x-reader-key"] ?? ""));
  const want = Buffer.from(KEY);
  return got.length === want.length && timingSafeEqual(got, want);
}

function send(res: ServerResponse, status: number, body: unknown) {
  const s = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(s) });
  res.end(s);
}

async function body(req: IncomingMessage): Promise<string> {
  let size = 0; const chunks: Buffer[] = [];
  for await (const c of req) { size += (c as Buffer).length; if (size > MAX_BODY) throw Object.assign(new Error("too large"), { status: 413 }); chunks.push(c as Buffer); }
  return Buffer.concat(chunks).toString("utf8");
}

function parse(raw: string): ReadRequest {
  const j = JSON.parse(raw) as Partial<ReadRequest>;
  const u = typeof j.website === "string" ? normalizeUrl(j.website) : null;
  if (!u || typeof j.domain !== "string" || !/^[a-z0-9.-]{3,253}$/i.test(j.domain)) throw Object.assign(new Error("bad request"), { status: 400 });
  const w = (j.want ?? {}) as ReadRequest["want"];
  const socials = j.socials && typeof j.socials === "object"
    ? Object.fromEntries(Object.entries(j.socials).filter(([k, v]) => typeof v === "string" && /^[a-z]{2,12}$/.test(k)).slice(0, 8)) as Record<string, string>
    : undefined;
  return { domain: j.domain.toLowerCase(), website: u.toString(), socials,
    want: { enrich: !!w.enrich, hiring: !!w.hiring, extra: !!w.extra, social: !!w.social, engine: !!w.engine } };
}

createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true, active, queued: queue.length, ...stats });
    if (!authed(req)) { stats.rejected++; return send(res, 401, { error: "unauthorized" }); }
    const routes: Record<string, (raw: string) => () => Promise<unknown>> = {
      "/read": (raw) => { const input = parse(raw); return () => readSite(input); },
      "/enrich": (raw) => {
        const j = JSON.parse(raw) as { url?: string; modules?: string[] };
        const u = typeof j.url === "string" ? normalizeUrl(j.url) : null;
        if (!u) throw Object.assign(new Error("bad_url"), { status: 400 });
        const mods = (Array.isArray(j.modules) ? j.modules : [...MODULES]).filter((m): m is Module => (MODULES as readonly string[]).includes(m));
        return () => crawlSite(u.toString(), mods);
      },
      "/fetch": (raw) => {
        const j = JSON.parse(raw) as { url?: string; timeoutMs?: number };
        const u = typeof j.url === "string" ? normalizeUrl(j.url) : null;
        if (!u) throw Object.assign(new Error("bad_url"), { status: 400 });
        const t = Math.min(20_000, Math.max(1000, Number(j.timeoutMs) || 7000));
        return async () => ({ page: await fetchPage(u.toString(), t) });
      },
    };
    const route = req.method === "POST" ? routes[req.url ?? ""] : undefined;
    if (!route) return send(res, 404, { error: "not found" });
    const job = route(await body(req));
    const done = await slot();
    try {
      const t0 = Date.now();
      const out = await Promise.race([
        job(),
        new Promise<never>((_, rej) => setTimeout(() => rej(Object.assign(new Error("timeout"), { status: 504 })), REQUEST_TIMEOUT_MS)),
      ]);
      stats.served++; stats.totalMs += Date.now() - t0;
      return send(res, 200, out);
    } finally { done(); }
  } catch (err) {
    stats.failed++;
    const e = err as Error & { status?: number };
    return send(res, e.status ?? 500, { error: e.message.slice(0, 120) });
  }
}).listen(PORT, "0.0.0.0", () => console.log(`site-reader on :${PORT} (concurrency ${MAX_ACTIVE})`));
