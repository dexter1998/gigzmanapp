/**
 * Funding — for anyone who sells to startups (fundraising/M&A advisors, VCs scouting deals, SaaS,
 * agencies, recruiters). Raised money = budget now; a raise 12-30 months ago = the next round is
 * near (Beauhurst/Crunchbase both treat time-since-last-round as the "about to fundraise" cue).
 *
 * Read from news (Exa, category "news"): the model only extracts what an article states, and an
 * extract counts only if its company name appears in that article's text. Exa is billed per
 * search, so this runs only on plans that ask for funding — never as a default.
 */

import { exaSearch, type ExaResult } from "../sources/exa";
import { callTool, MODELS } from "../claude";
import { NOT_OWN_SITE } from "../playbooks";

export type Funding = { round: string | null; amount: string | null; date: string | null; investors: string[]; source: string; monthsAgo: number | null };
export type FundedCompany = Funding & { company: string; website: string | null; about: string | null; city?: string | null };

const YEARS_BACK = 4;
const since = () => new Date(Date.now() - YEARS_BACK * 365 * 864e5).toISOString();

function monthsSince(date: string | null): number | null {
  if (!date) return null;
  const t = Date.parse(date.length === 7 ? `${date}-01` : date);
  return Number.isFinite(t) ? Math.max(0, Math.round((Date.now() - t) / (30.4 * 864e5))) : null;
}

const EXTRACT = {
  name: "funding_rounds",
  description: "List the funding rounds these news results report. Only rounds an article actually states.",
  input_schema: {
    type: "object",
    properties: {
      rounds: {
        type: "array",
        items: {
          type: "object",
          properties: {
            i: { type: "number", description: "Index of the result that states it." },
            company: { type: "string", description: "The company that RAISED the money, as named in the article." },
            website: { type: ["string", "null"], description: "Its website domain if the article gives it, else null." },
            about: { type: ["string", "null"], description: "What the company does, a few words, from the article." },
            city: { type: ["string", "null"], description: "City the company is based in, as the article states it ('Gurugram-based' → Gurugram), else null." },
            round: { type: ["string", "null"], description: "Pre-seed, Seed, Series A, Bridge, Debt…" },
            amount: { type: ["string", "null"], description: "As written: '$2M', '₹15 crore'." },
            date: { type: ["string", "null"], description: "YYYY-MM or YYYY-MM-DD of the announcement (use the article's date if the round has none)." },
            investors: { type: "array", items: { type: "string" } },
          },
          required: ["i", "company", "website", "about", "city", "round", "amount", "date", "investors"],
        },
      },
    },
    required: ["rounds"],
  },
};

async function extract(results: ExaResult[], focus: string): Promise<Array<FundedCompany & { i: number }>> {
  if (!results.length) return [];
  const list = results.map((r, i) => `${i}. [${r.publishedDate?.slice(0, 10) ?? "no date"}] ${r.title ?? ""} — ${r.url}\n${(r.highlights ?? []).join(" ").slice(0, 600)}`).join("\n\n");
  const out = await callTool({
    agent: "funding_extract", model: MODELS.cheap, maxTokens: 4000,
    system: "You read startup-funding news and list who raised what. Copy facts, never infer: a field the text doesn't state is null. Skip investors raising a fund, acquisitions, IPOs and listicles of many companies unless each round is stated.",
    messages: [{ role: "user", content: `${focus}\n\n${list}` }],
    tool: EXTRACT,
  }).catch((e) => { console.warn("[funding] extract failed", String(e).slice(0, 200)); return { rounds: [] }; });
  const rows = Array.isArray(out.rounds) ? (out.rounds as Array<Record<string, unknown>>) : [];
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 120) : null);
  return rows.flatMap((r) => {
    const i = Number(r.i);
    const src = results[i];
    const company = str(r.company);
    if (!src || !company) return [];
    // The name must really be in what we showed the model for that result.
    const hay = `${src.title ?? ""} ${(src.highlights ?? []).join(" ")}`.toLowerCase();
    if (!hay.includes(company.toLowerCase().split(/\s+/)[0])) return [];
    const date = str(r.date) ?? src.publishedDate?.slice(0, 10) ?? null;
    return [{ i, company, website: str(r.website), about: str(r.about), city: str(r.city), round: str(r.round), amount: str(r.amount), date,
      investors: Array.isArray(r.investors) ? r.investors.filter((x): x is string => typeof x === "string").slice(0, 5) : [],
      source: src.url, monthsAgo: monthsSince(date) }];
  });
}

/** The latest funding round news reports for one company, or null. One Exa search. */
export async function fundingOf(name: string, domain: string | null): Promise<Funding | null> {
  const brand = domain ? domain.split(".")[0] : null;
  const r = await exaSearch(`${name} startup raises funding round`, { highlights: true, numResults: 6, category: "news", startPublishedDate: since() }).catch(() => null);
  const rows = await extract(r?.results ?? [], `Company of interest: ${name}${domain ? ` (${domain})` : ""}. List only rounds raised by THIS company.`);
  const mine = rows.filter((x) => {
    const c = x.company.toLowerCase();
    return c.includes(name.toLowerCase().split(/\s+/)[0]) || (brand && c.replace(/[^a-z0-9]/g, "").includes(brand.replace(/[^a-z0-9]/g, "")));
  });
  mine.sort((a, b) => (a.monthsAgo ?? 999) - (b.monthsAgo ?? 999));
  const best = mine[0];
  return best ? { round: best.round, amount: best.amount, date: best.date, investors: best.investors, source: best.source, monthsAgo: best.monthsAgo } : null;
}

/** Companies that raised money, found from funding news for the trades and place asked. */
export async function discoverFunded(words: string[], place: string, cap: number, prefer: "recent" | "due" = "recent", indian = true): Promise<FundedCompany[]> {
  // Outside India the place is searched as named (US startups were searched as "United States, India").
  const where = /india/i.test(place) ? "India" : indian ? `${place}, India` : place;
  const queries = [
    ...words.slice(0, 2).map((w) => `${w} startup based in ${where} raises funding`),
    `${where} startup raises seed funding`,
    `${where} startup raises Series A`,
    ...(prefer === "due" ? [`${where} startup raised funding 2024`] : []),
  ].slice(0, 5);
  const seen = new Map<string, FundedCompany>();
  // In parallel: four sequential searches + extracts took ~55 s, too long for one run tick.
  const pages = await Promise.all(queries.map(async (q) => {
    const r = await exaSearch(q, { highlights: true, numResults: 25, category: "news", startPublishedDate: since() }).catch(() => null);
    return extract(r?.results ?? [], `Looking for: ${words.join(", ") || "startups"} located in ${where}. List every company the results say raised a round (skip companies clearly based outside ${where}).`);
  }));
  // A company the article places in another city is not in this place (round-up articles list many).
  const ALIAS: Record<string, string[]> = { gurugram: ["gurgaon", "delhi ncr", "ncr"], gurgaon: ["gurugram", "delhi ncr", "ncr"], bengaluru: ["bangalore"], bangalore: ["bengaluru"],
    delhi: ["new delhi", "delhi ncr", "ncr"], mumbai: ["bombay", "navi mumbai"], noida: ["delhi ncr", "ncr", "greater noida"] };
  const p0 = place.toLowerCase().trim();
  const here = (c: string | null | undefined) => !c || p0 === "india" || [p0, ...(ALIAS[p0] ?? [])].some((a) => c.toLowerCase().includes(a));
  for (const x of pages.flat().filter((x) => here(x.city))) {
    const k = x.company.toLowerCase().replace(/[^a-z0-9]/g, "");
    const prev = seen.get(k);
    if (!prev || (x.monthsAgo ?? 999) < (prev.monthsAgo ?? 999)) seen.set(k, x);
  }
  // "recent": newest raises first — the 30-90 day window after an announcement is when they spend.
  // "due": closest to 18 months since the raise first — the ones preparing the next round.
  const key = (m: number | null) => (m === null ? 999 : prefer === "due" ? Math.abs(m - 18) : m);
  const list = [...seen.values()].sort((a, b) => key(a.monthsAgo) - key(b.monthsAgo)).slice(0, cap);
  for (let i = 0; i < list.length; i += 8) await Promise.all(list.slice(i, i + 8).map(async (c) => { if (!c.website) c.website = await websiteOf(c); }));
  return list;
}

const NOT_COMPANY_SITE = /(linkedin|crunchbase|tracxn|inc42|yourstory|entrackr|economictimes|livemint|moneycontrol|vccircle|thehindubusinessline|businessstandard|business-standard|techcrunch|facebook|instagram|twitter|x\.com|youtube|wikipedia|zaubacorp|tofler|glassdoor|ambitionbox|pitchbook|cbinsights|f6s|wellfound|angel\.co|startupindia|medium|google|apple\.com|play\.google)/i;

/** The company's own site: an Exa company search on its name + what it does; first own domain wins. */
export async function websiteOf(c: { company: string; about: string | null }, country = "India"): Promise<string | null> {
  const r = await exaSearch(`${c.company} ${c.about ?? "startup"} ${country}`, { numResults: 5, category: "company" }).catch(() => null);
  const brand = c.company.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6);
  const hits = (r?.results ?? []).filter((x) => !NOT_COMPANY_SITE.test(x.url) && !NOT_OWN_SITE.test(x.url));
  // Prefer a domain that carries the brand; else the top result only if its title names the company.
  const pick = hits.find((x) => new URL(x.url).hostname.replace(/[^a-z0-9]/g, "").includes(brand))
    ?? hits.find((x) => (x.title ?? "").toLowerCase().includes(c.company.toLowerCase().split(/\s+/)[0]));
  if (!pick) return null;
  const u = new URL(pick.url);
  return `${u.protocol}//${u.host}/`;
}

/** The months-since-raise read: recent money vs. a next round coming. */
export function fundingSignals(f: Funding | null) {
  if (!f) return { sig: { funded: false } as Record<string, boolean>, note: null as string | null };
  const m = f.monthsAgo;
  return {
    sig: { funded: true, funded_recent: m !== null && m <= 12, raise_due: m !== null && m > 12 && m <= 30 } as Record<string, boolean>,
    note: [f.round, f.amount, f.date ? `(${f.date.slice(0, 7)})` : null, f.investors.length ? `from ${f.investors.slice(0, 2).join(", ")}` : null].filter(Boolean).join(" ") || "Funding reported",
  };
}

/**
 * One funding-news search, extracted — for the public funded-startups pages (lib/funded/refresh.ts),
 * which run a handful of these once a week. Same extractor and name check as the chat path.
 */
export async function fundingFromNews(query: string, focus: string, daysBack: number): Promise<FundedCompany[]> {
  const start = new Date(Date.now() - daysBack * 864e5).toISOString();
  const r = await exaSearch(query, { highlights: true, numResults: 25, category: "news", startPublishedDate: start }).catch(() => null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (await extract(r?.results ?? [], focus)).map(({ i, ...rest }) => rest);
}
