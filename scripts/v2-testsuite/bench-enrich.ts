/**
 * Website Enrich API benchmark over the corpus (corpus/sites.jsonl). Every site gets the free
 * modules; a sample also gets `profile` (LLM). Results append to results/enrich-<tag>.jsonl so a
 * stopped run resumes; `--report` writes the per-group / per-CMS / per-module markdown.
 *   npx tsx --env-file=.env.local scripts/v2-testsuite/bench-enrich.ts <tag> [--report]
 */
import fs from "node:fs";
import path from "node:path";
import { enrichSite } from "@/lib/v2/enrich-site";

const dir = path.dirname(new URL(import.meta.url).pathname);
const tag = process.argv[2] ?? "run";
const outFile = path.join(dir, "results", `enrich-${tag}.jsonl`);
const CONC = Number(process.env.CONC ?? 16);
const PROFILE_SAMPLE: Record<string, number> = process.env.ONLY_FROM ? {} : { saas: 150 };
const PROFILE_DEFAULT = process.env.ONLY_FROM ? 10_000 : 25;

type Site = { group: string; url: string; domain: string; expect: string; name: string };

async function run() {
  let sites: Site[] = fs.readFileSync(path.join(dir, "corpus", "sites.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  // ONLY_FROM=<tag>: re-run just the sites that got a profile in that run (profile fixes, cheap).
  if (process.env.ONLY_FROM) {
    const prev = fs.readFileSync(path.join(dir, "results", `enrich-${process.env.ONLY_FROM}.jsonl`), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    const keep = new Set(prev.filter((x) => x.r?.profile).map((x) => x.domain));
    sites = sites.filter((s) => keep.has(s.domain));
  }
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const done = new Set(fs.existsSync(outFile) ? fs.readFileSync(outFile, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l).domain) : []);
  const profiled: Record<string, number> = {};
  const todo = sites.filter((s) => !done.has(s.domain));
  console.log(`sites ${sites.length}, done ${done.size}, todo ${todo.length}, conc ${CONC}`);
  let i = 0, n = 0;
  const t0 = Date.now();
  async function worker() {
    while (i < todo.length) {
      const s = todo[i++];
      const quota = PROFILE_SAMPLE[s.group] ?? PROFILE_DEFAULT;
      const withProfile = (profiled[s.group] = (profiled[s.group] ?? 0)) < quota;
      if (withProfile) profiled[s.group]++;
      const modules = ["contacts", "meta", "tech", "pages", "people", ...(withProfile ? ["profile"] : [])] as never[];
      let r;
      try { r = await Promise.race([enrichSite(s.url, modules), new Promise<null>((res) => setTimeout(() => res(null), 150_000))]); }
      catch (e) { r = { ok: false, error: String(e).slice(0, 200) }; }
      fs.appendFileSync(outFile, JSON.stringify({ ...s, r: r ?? { ok: false, error: "timeout_150s" } }) + "\n");
      if (++n % 50 === 0) console.log(`${n}/${todo.length} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  console.log("done");
}

function pct(a: number, b: number) { return b ? `${Math.round((100 * a) / b)}%` : "–"; }

function report() {
  const rows = fs.readFileSync(outFile, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const by = (key: (x: any) => string) => {
    const m = new Map<string, any[]>();
    for (const x of rows) { const k = key(x); m.set(k, [...(m.get(k) ?? []), x]); }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  };
  const line = (name: string, xs: any[]) => {
    const ok = xs.filter((x) => x.r?.ok);
    const prof = ok.filter((x) => x.r.profile);
    const modelHit = prof.filter((x) => {
      const m = x.r.profile.businessModel;
      return x.expect === "saas" ? m === "saas" : x.expect === "agency" ? ["agency_services", "professional_services"].includes(m) : x.expect === "agency_or_saas" ? (m === "saas" || m === "agency_services")
        : x.expect === "education" ? m === "education" : x.expect === "local_service" ? ["local_service", "professional_services", "healthcare_provider", "ecommerce", "hospitality"].includes(m) : x.expect === "real_estate" ? m === "real_estate" : false;
    }).length;
    const ev = prof.reduce((a, x) => [a[0] + (x.r.profile.evidenceVerified ?? 0), a[1] + (x.r.profile.evidenceTotal ?? 0), a[2] + (x.r.profile.evidenceSupported ?? 0)], [0, 0, 0]);
    const via = (m: string) => ok.filter((x) => (x.r.fetchedVia ?? []).includes(m)).length;
    return `| ${name} | ${xs.length} | ${pct(ok.length, xs.length)} | ${via("fetchd_http")}/${via("fetchd_stealth")} | ${pct(ok.filter((x) => x.r.meta?.title).length, ok.length)} / ${pct(ok.filter((x) => x.r.meta?.description).length, ok.length)} | `
      + `${pct(ok.filter((x) => Object.keys(x.r.tech ?? {}).length).length, ok.length)} | ${(ok.reduce((a, x) => a + Object.keys(x.r.pages ?? {}).length, 0) / Math.max(1, ok.length)).toFixed(1)} | `
      + `${pct(ok.filter((x) => x.r.contacts?.emails?.length).length, ok.length)} | ${pct(ok.filter((x) => x.r.contacts?.phones?.length).length, ok.length)} | ${pct(ok.filter((x) => x.r.contacts?.socials?.linkedin).length, ok.length)} | `
      + `${pct(ok.filter((x) => x.r.people?.length).length, ok.length)} | ${prof.length ? `${pct(modelHit, prof.length)} (${prof.length})` : "–"} | ${pct(ev[0], ev[1])} exact / ${pct(ev[2], ev[1])} supported |`;
  };
  const head = "| Group | Sites | Fetched | via Scrapling http/stealth | Meta title / desc | Tech found | Page types | Email | Phone | Co. LinkedIn | People | Business model right (n) | Evidence quotes on page |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|";
  const fails = by((x) => (x.r?.ok ? "ok" : (x.r?.error ?? "unknown").slice(0, 40))).filter(([k]) => k !== "ok");
  const pagesKinds = ["services", "pricing", "about", "team", "partners", "careers", "case_studies", "contact", "blog"];
  const ok = rows.filter((x) => x.r?.ok);
  const md = [
    `# Website Enrich API — benchmark ${tag}`, "", `${rows.length} sites, ${ok.length} fetched (${pct(ok.length, rows.length)}).`, "",
    "## By group", "", head, ...by((x) => x.group).map(([g, xs]) => line(g, xs)), line("**all**", rows), "",
    "## By CMS (fetched sites)", "", head, ...by((x) => (x.r?.tech?.cms?.[0] ?? (x.r?.ok ? "unknown/custom" : "not fetched"))).filter(([k]) => k !== "not fetched").slice(0, 12).map(([g, xs]) => line(g, xs)), "",
    "## Page types found (share of fetched sites)", "", "| " + pagesKinds.join(" | ") + " |", "|" + pagesKinds.map(() => "---").join("|") + "|",
    "| " + pagesKinds.map((k) => pct(ok.filter((x) => x.r.pages?.[k]).length, ok.length)).join(" | ") + " |", "",
    "## Why sites failed", "", "| Reason | Sites |", "|---|---|", ...fails.slice(0, 12).map(([k, xs]) => `| ${k} | ${xs.length} |`), "",
  ].join("\n");
  const mdFile = outFile.replace(/\.jsonl$/, ".md");
  fs.writeFileSync(mdFile, md);
  // Manual review sheet: profiled sites, one row each.
  const csvRows = rows.filter((x) => x.r?.profile).map((x) => [x.group, x.url, x.expect, x.r.profile.businessModel, x.r.profile.whatTheySell, x.r.profile.icp, (x.r.profile.services ?? []).join("; "), x.r.profile.pricing, `${x.r.profile.evidenceVerified}/${x.r.profile.evidenceTotal}`, "", ""]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  fs.writeFileSync(outFile.replace(/\.jsonl$/, "-review.csv"), [["group", "url", "expected", "business_model", "what_they_sell", "icp", "services", "pricing", "evidence", "reviewer_correct(y/n)", "notes"], ...csvRows].map((r) => r.map(esc).join(",")).join("\n"));
  console.log(md);
}

if (process.argv.includes("--report")) { report(); process.exit(0); } else run().then(() => { report(); process.exit(0); });
