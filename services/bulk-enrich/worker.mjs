/**
 * Bulk site-signal enrichment, run ON the site-reader box (2026-10-24, Tarun: "humare pass scraped
 * bhot data hai purana un sbko enrich kro"). The app's per-minute cron (lib/pseo/enrich-signals.ts)
 * reads 40 sites a tick, which would take weeks over the old scraped pool. This worker reads the same
 * pool straight through the local reader (localhost:8787/read) and writes scrape_domains.site_signals
 * in the exact shape the runner and enrich-signals.ts write, so every reader of that column works.
 *
 * Order: leads with a stored website (pSEO pages read them) → the scrape_domains registry.
 * Every attempted domain gets a stamped row (read, site_down or read_failed), so nothing is re-picked
 * inside FRESH_DAYS. Rows another writer owns (source ≠ 'app') are never overwritten.
 *
 * No dependencies: node fetch + psql. DB URL comes from Secrets Manager via the box role (env DBURL).
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";

const DB = process.env.DBURL;
const KEY = readFileSync("/opt/mantis-reader/env", "utf8").match(/^READER_KEY=(.*)$/m)[1].trim();
const CONC = Number(process.env.CONC ?? 16);
const BATCH = Number(process.env.BATCH ?? 400);
const FRESH_DAYS = 60;
const LOG = "/opt/mantis-bulk/progress.log";
const NOT_OWN_SITE = /(bit\.ly|tinyurl\.com|goo\.gl|maps\.app\.goo\.gl|g\.page|rebrand\.ly|cutt\.ly|shorturl\.at|buzzfeed\.com|wikipedia\.org|google\.com|sites\.google\.com|facebook\.com|fb\.com|instagram\.com|linktr\.ee|wa\.me|whatsapp\.com|business\.site|justdial\.com|indiamart\.com|practo\.com|zomato\.com|swiggy\.com|sulekha\.com|tripadvisor\.|booking\.com|makemytrip\.com|lybrate\.com|magicbricks\.com|99acres\.com|housing\.com|urbanclap|urbancompany\.com|youtube\.com|linkedin\.com|twitter\.com|x\.com\/)/i;

const psql = (sql) => execFileSync("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", sql], { encoding: "utf8", maxBuffer: 64 << 20 });
const DOM = (col) => `lower(regexp_replace(regexp_replace(${col}, '^https?://(www\\.)?', ''), '[/?#:].*$', ''))`;
const STALE = (alias) => `(${alias}.site_signals IS NULL OR (${alias}.site_signals->>'checked_at')::timestamptz < now() - interval '${FRESH_DAYS} days')`;

function pick(phase) {
  const q = phase === "leads"
    ? `WITH sizes AS (SELECT city_slug, count(*) n FROM leads GROUP BY 1),
       pool AS (SELECT DISTINCT ON (d) l.website_url w, l.business_name b, l.category c, l.city_slug cs, ${DOM("l.website_url")} d
                FROM leads l WHERE l.website_url IS NOT NULL AND NOT coalesce(l.is_competitor,false))
       SELECT json_build_object('w',p.w,'b',p.b,'c',p.c,'d',p.d) FROM pool p
       LEFT JOIN sizes z ON z.city_slug = p.cs LEFT JOIN scrape_domains s ON s.domain = p.d
       WHERE p.d <> '' AND ${STALE("s")} AND NOT coalesce(s.do_not_crawl,false)
       ORDER BY z.n DESC NULLS LAST LIMIT ${BATCH}`
    // Phase 2 is ONLY the Apollo companies loaded for this (campaigns='mantis-enrich') — the rest of
    // the registry is agencies, who sell the same service and are not anyone's leads here.
    : `SELECT json_build_object('w',s.website,'b',s.company,'c',s.category,'d',s.domain) FROM scrape_domains s
       WHERE s.campaigns = 'mantis-enrich' AND s.site_signals IS NULL AND NOT s.do_not_crawl
       ORDER BY CASE s.country WHEN 'India' THEN 0 WHEN 'United Arab Emirates' THEN 1 WHEN 'Singapore' THEN 2 ELSE 3 END, s.domain
       LIMIT ${BATCH}`;
  return psql(q).split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

async function read(r) {
  const website = /^https?:\/\//i.test(r.w) ? r.w : `https://${r.w}`;
  if (NOT_OWN_SITE.test(website)) return { not_own_site: true };
  try {
    const res = await fetch("http://127.0.0.1:8787/read", {
      method: "POST", headers: { "content-type": "application/json", "x-reader-key": KEY },
      body: JSON.stringify({ domain: r.d, website, want: { enrich: true, hiring: false, extra: false, social: false, engine: false } }),
      signal: AbortSignal.timeout(40_000),
    });
    if (res.status === 503) { await new Promise((ok) => setTimeout(ok, 3000)); return null; }
    if (!res.ok) return { read_failed: true };
    const e = (await res.json())?.enriched;
    if (!e) return { site_down: true };
    return { ...e.signals, cms: e.cms, phones: e.phones, socials: e.socials, title: e.title, final_url: e.final_url,
      person: e.founder_name ? { name: e.founder_name, role: e.founder_role, email: e.best_email, tier: e.tier } : null,
      emails: (e.emails ?? []).filter((x) => x.same_domain || x.freemail).slice(0, 4).map((x) => ({ email: x.email, ...(x.person ? { person: x.person } : {}) })) };
  } catch { return { read_failed: true }; }
}

const csv = (v) => v == null ? "" : `"${String(v).replace(/"/g, '""')}"`;

async function runBatch(rows) {
  const out = [];
  const q = rows.slice();
  const stats = { read: 0, down: 0, failed: 0, skipped: 0 };
  await Promise.all(Array.from({ length: CONC }, async () => {
    while (q.length) {
      const r = q.shift();
      const site = await read(r);
      if (!site) { q.push(r); continue; }
      if (site.site_down) stats.down++; else if (site.read_failed) stats.failed++; else if (site.not_own_site) stats.skipped++; else stats.read++;
      out.push([r.d, r.w, r.b ?? "", r.c, JSON.stringify({ ...site, checked_at: new Date().toISOString(), source: "app" })]);
    }
  }));
  writeFileSync("/opt/mantis-bulk/batch.csv", out.map((x) => x.map(csv).join(",")).join("\n") + "\n");
  writeFileSync("/opt/mantis-bulk/upsert.sql", `BEGIN;
CREATE TEMP TABLE st (domain text, website text, company text, category text, sig jsonb) ON COMMIT DROP;
\\copy st FROM '/opt/mantis-bulk/batch.csv' CSV
INSERT INTO scrape_domains (domain, website, company, category, first_source, campaigns, status, site_signals)
  SELECT DISTINCT ON (domain) domain, website, company, category, 'mantis-pseo', 'mantis-pseo', 'unknown', sig FROM st
ON CONFLICT (domain) DO UPDATE SET site_signals = EXCLUDED.site_signals
  WHERE scrape_domains.site_signals IS NULL OR scrape_domains.site_signals->>'source' = 'app';
COMMIT;
`);
  execFileSync("psql", [DB, "-q", "-v", "ON_ERROR_STOP=1", "-f", "/opt/mantis-bulk/upsert.sql"], { encoding: "utf8" });
  return stats;
}

async function main() {
  let batches = Number(process.env.MAXBATCHES ?? Infinity);
  for (const phase of ["leads", "apollo"]) {
    for (;;) {
      const t0 = Date.now();
      const rows = pick(phase);
      if (!rows.length || batches-- <= 0) break;
      const st = await runBatch(rows);
      appendFileSync(LOG, `${new Date().toISOString()} ${phase} n=${rows.length} read=${st.read} down=${st.down} failed=${st.failed} skipped=${st.skipped} ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
    }
    appendFileSync(LOG, `${new Date().toISOString()} phase ${phase} done\n`);
  }
}
main().catch((e) => { appendFileSync(LOG, `${new Date().toISOString()} FATAL ${e.message}\n`); process.exit(1); });
