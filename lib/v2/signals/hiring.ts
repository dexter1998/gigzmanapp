/**
 * Hiring — a default signal on every lead (2026-10-22). A company that is hiring is growing and has
 * budget, and WHICH roles it hires says what it will buy (a sales hire → CRM, an accountant → CA
 * services, ten engineers → laptops, office space, HR software). Read from the company's own site:
 *
 *   1. a job board it embeds (Greenhouse / Lever have public JSON — an exact count),
 *   2. else its careers page, where role titles are picked out of headings and list items,
 *   3. "no current openings" on that page is a real "not hiring", not an unknown.
 *
 * Nothing is guessed: no careers page means `hiring` stays unknown (absent), never false.
 */

import { fetchPage, safeFetch, htmlToText } from "../net";

export type Hiring = {
  /** true = open roles seen; false = careers page says none; null = page found but no roles readable. */
  hiring: boolean | null;
  count: number;
  roles: string[];
  /** Where the roles were read: "greenhouse" | "lever" | "careers_page" | other ATS name. */
  via: string;
  url: string;
};

const ATS: Array<[string, RegExp]> = [
  ["greenhouse", /(?:boards|job-boards)\.greenhouse\.io\/(?:embed\/job_board\?for=)?([a-z0-9_-]+)/i],
  ["lever", /jobs\.lever\.co\/([a-z0-9_-]+)/i],
  ["workable", /apply\.workable\.com\/([a-z0-9_-]+)/i],
  ["zoho_recruit", /([a-z0-9-]+)\.zohorecruit\.(?:com|in)/i],
  ["keka", /([a-z0-9-]+)\.keka\.com\/careers/i],
  ["darwinbox", /([a-z0-9-]+)\.darwinbox\.in/i],
  ["freshteam", /([a-z0-9-]+)\.freshteam\.com/i],
  ["ashby", /jobs\.ashbyhq\.com\/([a-z0-9_.-]+)/i],
  ["smartrecruiters", /(?:careers|jobs)\.smartrecruiters\.com\/([a-z0-9_-]+)/i],
];

const CAREERS_LINK = /<a\b[^>]*href\s*=\s*["']([^"'#]*(?:career|jobs?\b|join-us|join-our-team|work-with-us|vacanc|openings|we-are-hiring)[^"'#]*)["'][^>]*>/gi;

// A job title: ends in (or contains) a role noun. Kept to role nouns so menu items, services and
// blog headings don't count as openings.
const ROLE = /\b(engineer|developer|programmer|architect|designer|manager|executive|associate|analyst|intern(ship)?|officer|specialist|consultant|coordinator|lead|head|director|accountant|technician|nurse|doctor|teacher|trainer|counsel(l)?or|sales(person)?|representative|agent|assistant|administrator|admin|writer|editor|marketer|recruiter|scientist|chef|cook|driver|operator|supervisor|advisor|strategist|planner|tester|qa|devops|sde|hr|receptionist|telecaller|business development|bde|bdm)\b/i;
const NOT_ROLE = /\b(apply|submit|upload|resume|cv|benefits|culture|why join|life at|our values|perks|login|sign in|contact|privacy|terms|cookie|©|copyright|read more|view all|learn more|blog|news)\b/i;
const NO_OPENINGS = /\b(no (current |open )?(openings|vacancies|positions|jobs)|not hiring|currently no (open|available)|there are no (open )?(positions|openings|vacancies))\b/i;

export function careersUrlFrom(html: string, base: string): string | null {
  for (const m of html.matchAll(CAREERS_LINK)) {
    try {
      const u = new URL(m[1], base);
      if (!/^https?:$/.test(u.protocol)) continue;
      // An ATS on another host is fine; any other off-site link (a LinkedIn jobs tab) is not their page.
      const own = u.hostname.replace(/^www\./, "") === new URL(base).hostname.replace(/^www\./, "");
      if (own || ATS.some(([, re]) => re.test(u.href))) return u.href.split("#")[0];
    } catch { /* bad href */ }
  }
  return null;
}

// Words that start real job titles. A title whose first two words are both capitalised and in
// neither this list nor ROLE is a person ("Harshit Mittal Project Manager" — a careers page
// introducing its team), not an opening.
const TITLE_WORDS = new Set("senior junior sr jr lead head chief principal staff associate assistant deputy general regional area zonal corporate government sales marketing product project brand visual data full stack frontend front backend back software process application customer business account key operations finance legal content digital social graphic ui ux quality field store branch human technical research supply procurement purchase design it cloud security network mobile android ios web ai ml machine growth performance category retail production plant service support office executive team medical clinical lab mechanical electrical civil embedded hardware amc python java golang react node devops qa test site inside outside international national".split(" "));
function looksLikePerson(t: string): boolean {
  const w = t.split(/\s+/);
  if (w.length < 3) return false;
  const cap = (x: string) => /^[A-Z][a-z]+$/.test(x);
  const known = (x: string) => TITLE_WORDS.has(x.toLowerCase()) || ROLE.test(x);
  return cap(w[0]) && cap(w[1]) && !known(w[0]) && !known(w[1]);
}

function rolesFromHtml(html: string): string[] {
  const out = new Map<string, string>();
  for (const m of html.matchAll(/<(h[1-6]|li|a|strong|b|td|dt|button|span)\b[^>]*>([\s\S]{0,300}?)<\/\1>/gi)) {
    const t = htmlToText(m[2], 120).replace(/\s+/g, " ").trim();
    if (t.length < 4 || t.length > 70 || !ROLE.test(t) || NOT_ROLE.test(t) || t.includes("@") || looksLikePerson(t)) continue;
    // Requirement bullets ("Ability to lead a team of engineers.") mention roles but are not openings.
    if (t.split(" ").length > 9 || /[.:;]$/.test(t) || /^(ability|experience|knowledge|strong|must|good|excellent|proven|we|you|our|work|working|responsible|minimum|at least)\b/i.test(t)) continue;
    const key = t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!out.has(key)) out.set(key, t);
  }
  return [...out.values()].slice(0, 40);
}

async function json<T>(url: string): Promise<T | null> {
  try {
    const r = await safeFetch(url, { signal: AbortSignal.timeout(6000), headers: { accept: "application/json" } });
    return r.ok ? ((await r.json()) as T) : null;
  } catch { return null; }
}

async function fromAts(name: string, token: string, url: string): Promise<Hiring | null> {
  if (name === "greenhouse") {
    const d = await json<{ jobs?: Array<{ title: string }> }>(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs`);
    if (d?.jobs) return { hiring: d.jobs.length > 0, count: d.jobs.length, roles: d.jobs.slice(0, 40).map((j) => j.title), via: "greenhouse", url };
  }
  if (name === "lever") {
    const d = await json<Array<{ text: string }>>(`https://api.lever.co/v0/postings/${token}?mode=json`);
    if (Array.isArray(d)) return { hiring: d.length > 0, count: d.length, roles: d.slice(0, 40).map((j) => j.text), via: "lever", url };
  }
  return null;
}

/**
 * Hiring for one company, from its homepage HTML (already fetched by the Qualifier). At most two
 * more requests: the careers page, and an ATS API when the page embeds one.
 */
export async function readHiring(homeHtml: string, homeUrl: string): Promise<Hiring | null> {
  // An ATS linked straight from the homepage.
  for (const [name, re] of ATS) {
    const m = homeHtml.match(re);
    if (m) { const h = await fromAts(name, m[1], m[0]); if (h) return h; }
  }
  const url = careersUrlFrom(homeHtml, homeUrl);
  if (!url) return null;
  const page = await fetchPage(url, 7000);
  if (!page?.html) return { hiring: null, count: 0, roles: [], via: "careers_page", url };
  for (const [name, re] of ATS) {
    const m = page.html.match(re) ?? url.match(re);
    if (m) {
      const h = await fromAts(name, m[1], url);
      if (h) return h;
      // A known ATS we have no API for: the embed itself says they recruit through it.
      const roles = rolesFromHtml(page.html);
      return { hiring: roles.length ? true : null, count: roles.length, roles, via: name, url };
    }
  }
  const text = htmlToText(page.html, 20000);
  const roles = rolesFromHtml(page.html);
  if (!roles.length && NO_OPENINGS.test(text)) return { hiring: false, count: 0, roles: [], via: "careers_page", url };
  return { hiring: roles.length ? true : null, count: roles.length, roles, via: "careers_page", url };
}
