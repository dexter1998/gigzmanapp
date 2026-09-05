/**
 * Career-page discovery and job extraction for one company domain.
 *
 * Shape of the pipeline: robots.txt/sitemap -> careers URL -> job listings, with three extraction
 * tiers tried in descending order of trustworthiness (JobPosting JSON-LD, then a known ATS's
 * public JSON API, then a keyword heuristic over the page's own anchors). Every exception handled
 * below was found by running this against 10,000 real business domains (5k India, 5k US) rather
 * than guessed at; the comments name the specific failure each guard exists for, because they all
 * look like dead code until you meet the site that needs them.
 *
 * Measured yield on that corpus: ~28-30% of reachable domains expose a careers page at all, and
 * only ~1% of those carry structured JobPosting data. The heuristic tier covers the rest at
 * materially lower precision -- which is why `method` is stored per company and surfaced as a
 * confidence grade rather than being flattened away.
 */

const REQ_TIMEOUT_MS = 8000;

/**
 * A real browser UA plus the header set a browser actually sends. Sites behind naive bot filters
 * (and some Cloudflare/Akamai configs) answer a bare-UA request with 405 or an empty body; with
 * these three headers the same request succeeds. Found on ~1% of the US corpus.
 */
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

/**
 * Sitemap locations to try when robots.txt does not name one. WordPress core (5.5+) serves
 * /wp-sitemap.xml and never creates /sitemap.xml, and Yoast serves /sitemap_index.xml instead --
 * probing only /sitemap.xml missed every such site (a large share of small-business sites).
 */
const SITEMAP_GUESS_PATHS = ["sitemap.xml", "wp-sitemap.xml", "sitemap_index.xml", "sitemap-index.xml"];

const CAREER_URL_KEYWORDS = [
  "career", "careers", "jobs", "job", "join-us", "joinus", "we-are-hiring",
  "hiring", "work-with-us", "workwithus", "vacanc", "job-openings", "opportunities",
];

const CAREER_PATH_GUESSES = ["careers", "career", "jobs", "join-us"];

export type ExtractionMethod = "jsonld_schema" | "ats_api" | "heuristic_html";

export type ScrapedJob = {
  title: string;
  url: string | null;
  location: string | null;
  description: string | null;
  postedAt: string | null;
};

export type ScrapeResult = {
  domain: string;
  siteReachable: boolean;
  careersUrl: string | null;
  method: ExtractionMethod | null;
  atsPlatform: string | null;
  jobs: ScrapedJob[];
  error: string | null;
};

// ---------------------------------------------------------------------------------------------
// fetch helpers
// ---------------------------------------------------------------------------------------------

/**
 * Expired or flagged domains are frequently intercepted by DNS-security vendors (Whalebone,
 * OpenDNS and friends) which 302 to a sinkhole page on an unrelated host. That page returns 200
 * with real-looking HTML, so without a host check it reads as a legitimate careers page and the
 * scraper cheerfully extracts nonsense from it.
 */
function hostMatchesTarget(expectedHost: string, actualUrl: string): boolean {
  try {
    const actualHost = new URL(actualUrl).hostname.toLowerCase();
    const expected = expectedHost.toLowerCase().replace(/^www\./, "");
    if (actualHost === expected || actualHost.endsWith(`.${expected}`) || `www.${actualHost}` === expected) return true;
    // A careers page redirecting off-domain to a hosted job board is the normal, intended setup --
    // bootcivil.com/careers/ lands on boot-civil-llc.breezy.hr, and rejecting that as a sinkhole
    // threw away the one company in the sample whose ATS API actually answered.
    return ATS_HOST_RE.test(actualHost);
  } catch {
    return false;
  }
}

/** Hosts a legitimate careers page is allowed to redirect to (see hostMatchesTarget). */
const ATS_HOST_RE =
  /(^|\.)(greenhouse\.io|lever\.co|workable\.com|recruitee\.com|breezy\.hr|zohorecruit\.(com|in)|keka\.com|freshteam\.com|smartrecruiters\.com|bamboohr\.com|jobvite\.com|icims\.com|myworkdayjobs\.com|personio\.(com|de)|successfactors\.(com|eu)|ashbyhq\.com|teamtailor\.com|jazz\.co|applytojob\.com)$/i;

async function fetchText(url: string, expectedHost?: string): Promise<{ url: string; text: string } | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQ_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: BROWSER_HEADERS, redirect: "follow" });
    if (!res.ok) return null;
    if (expectedHost && !hostMatchesTarget(expectedHost, res.url)) return null;
    return { url: res.url, text: await res.text() };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------------------------
// sitemap -> careers URL
// ---------------------------------------------------------------------------------------------

function extractLocs(xml: string): string[] {
  // Several WordPress SEO plugins (All in One SEO especially) wrap the URL in CDATA:
  // <loc><![CDATA[https://...]]></loc>. A [^<\s]+ capture stops dead at the "<" opening the CDATA,
  // so every URL in such a sitemap extracted as zero results -- silently, since an empty sitemap
  // and an unparseable one look identical downstream.
  const cleaned = xml.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "");
  const locs: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned))) locs.push(m[1]);
  return locs;
}

function isCareerUrl(u: string): boolean {
  const low = u.toLowerCase();
  return CAREER_URL_KEYWORDS.some((k) => low.includes(k));
}

/**
 * Ranks career-ish sitemap URLs so the actual careers page wins over a blog post that merely
 * mentions hiring. Without this, `/blog/why-hiring-a-local-plumber-matters` sorts ahead of
 * `/careers/` purely by sitemap order, the scraper fetches the blog post, finds no roles on it,
 * and the company reads as having no jobs — which is how frontiergroup.co.in lost its three real
 * openings on the first pass.
 */
function careerUrlScore(u: string): number {
  let path: string;
  try {
    path = new URL(u).pathname.toLowerCase().replace(/\/$/, "");
  } catch {
    return 0;
  }
  const segments = path.split("/").filter(Boolean);
  if (!segments.length) return 0;

  // Editorial sections are where false matches live; never prefer one over a real careers path.
  if (/^(blog|news|insights|articles|resources|case-studies|press)$/.test(segments[0])) return -1;

  const CAREER_SEGMENT = /^(careers?|jobs?|vacancies|vacancy|join-?us|work-?with-?us|hiring|opportunities)$/;
  if (segments.length === 1 && CAREER_SEGMENT.test(segments[0])) return 100;          // /careers
  if (CAREER_SEGMENT.test(segments[0])) return 90 - Math.min(segments.length, 5);      // /careers/role-x
  if (segments.some((s) => CAREER_SEGMENT.test(s))) return 60 - Math.min(segments.length, 5);
  return 10; // keyword appears only inside a slug, e.g. /our-careers-story
}

async function findSitemaps(host: string): Promise<{ sitemaps: string[]; siteBase: string } | null> {
  for (const base of [`https://${host}`, `http://${host}`]) {
    const robots = await fetchText(`${base}/robots.txt`, host);
    if (robots) {
      const declared = robots.text
        .split("\n")
        .filter((l) => /^sitemap:/i.test(l.trim()))
        .map((l) => l.split(":").slice(1).join(":").trim())
        .filter(Boolean);
      if (declared.length) return { sitemaps: declared, siteBase: base };
      return { sitemaps: SITEMAP_GUESS_PATHS.map((p) => `${base}/${p}`), siteBase: base };
    }
  }
  // No robots.txt on either scheme -- the site may still be up (plenty of small sites 404 it).
  for (const base of [`https://${host}`, `http://${host}`]) {
    const home = await fetchText(base, host);
    if (home) return { sitemaps: SITEMAP_GUESS_PATHS.map((p) => `${base}/${p}`), siteBase: base };
  }
  return null;
}

async function collectSitemapLocs(sitemapUrls: string[], host: string, depth = 0): Promise<string[]> {
  let all: string[] = [];
  for (const su of sitemapUrls.slice(0, 5)) {
    const res = await fetchText(su, host);
    if (!res) continue;
    const locs = extractLocs(res.text);
    if (!locs.length) continue;
    if (/<sitemapindex/i.test(res.text) && depth < 1) {
      all = all.concat(await collectSitemapLocs(locs, host, depth + 1));
    } else {
      all = all.concat(locs);
    }
  }
  return all;
}

/**
 * Resolves the careers page. Prefers a URL the sitemap actually declares; falls back to guessing
 * the usual paths only when there is no sitemap to consult.
 */
async function findCareersUrl(host: string): Promise<{ careersUrl: string | null; reachable: boolean }> {
  const sm = await findSitemaps(host);
  if (!sm) return { careersUrl: null, reachable: false };

  const locs = await collectSitemapLocs(sm.sitemaps, host);
  const fromSitemap = locs
    .filter(isCareerUrl)
    .map((u) => ({ u, score: careerUrlScore(u) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);
  if (fromSitemap.length) {
    for (const candidate of fromSitemap.slice(0, 3)) {
      const page = await fetchText(candidate.u, host);
      if (page) return { careersUrl: page.url, reachable: true };
    }
  }
  if (locs.length) return { careersUrl: null, reachable: true };

  // No sitemap at all -> guess. Many SPA-routed sites answer *every* unknown path with the same
  // generic landing route instead of a 404 (e.g. /careers, /jobs and /join-us all quietly resolve
  // to /home), so probing one deliberately-nonsense path first fingerprints that catch-all and
  // lets a guess that lands on the identical URL be recognised as a miss. Checking only for "did
  // it land on /" misses this whenever the fallback route is not literally the root.
  const canary = await fetchText(`${sm.siteBase}/__mantis-canary-${Math.random().toString(36).slice(2)}__`, host);
  const catchAllUrl = canary?.url ?? null;

  for (const path of CAREER_PATH_GUESSES) {
    const page = await fetchText(`${sm.siteBase}/${path}`, host);
    if (!page) continue;
    let finalPath = "/";
    try {
      finalPath = new URL(page.url).pathname;
    } catch {
      /* keep the "/" default, which is rejected below */
    }
    if (finalPath === "/" || finalPath === "") continue;
    if (catchAllUrl && page.url === catchAllUrl) continue;
    return { careersUrl: page.url, reachable: true };
  }
  return { careersUrl: null, reachable: true };
}

// ---------------------------------------------------------------------------------------------
// Tier 1 — JobPosting JSON-LD
// ---------------------------------------------------------------------------------------------

function firstString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function extractJsonLdJobs(html: string): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];
  const scriptRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(html))) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(m[1]);
    } catch {
      continue;
    }
    if (!parsed || typeof parsed !== "object") continue;
    const asRecord = parsed as Record<string, unknown>;
    const items = Array.isArray(parsed) ? parsed : (asRecord["@graph"] as unknown[]) || [parsed];
    for (const raw of items) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;
      const type = item["@type"];
      const isJob = type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"));
      if (!isJob) continue;
      const title = firstString(item.title, item.name);
      if (!title) continue;
      const rawLoc = item.jobLocation;
      const loc = Array.isArray(rawLoc) ? rawLoc[0] : rawLoc;
      const address = obj(obj(loc)?.address);
      jobs.push({
        title,
        url: firstString(item.url, item.sameAs),
        location: firstString(
          address?.addressLocality,
          address?.addressRegion,
          typeof loc === "string" ? loc : null,
          item.jobLocationType === "TELECOMMUTE" ? "Remote" : null,
        ),
        description: firstString(item.description),
        postedAt: firstString(item.datePosted),
      });
    }
  }
  return jobs;
}

// ---------------------------------------------------------------------------------------------
// Tier 2 — known ATS public JSON APIs
// ---------------------------------------------------------------------------------------------

/**
 * Each ATS returns its own JSON shape and we control none of them, so parse functions receive an
 * unknown-keyed record and reach into it defensively rather than pretending to a typed contract
 * that the vendor could change without telling us.
 */
type AtsPayload = Record<string, unknown>;
type AtsJobRecord = Record<string, unknown>;

type AtsSignature = {
  name: string;
  match: RegExp;
  token?: (html: string, pageUrl: string) => string | null;
  api?: (token: string) => string;
  parse?: (json: AtsPayload | AtsJobRecord[]) => ScrapedJob[];
};

/** Reads a possibly-missing nested string off an untyped payload. */
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function jobArray(json: AtsPayload | AtsJobRecord[], key?: string): AtsJobRecord[] {
  const raw = Array.isArray(json) ? json : key ? (json as AtsPayload)[key] : null;
  return Array.isArray(raw) ? (raw as AtsJobRecord[]) : [];
}

/**
 * The five platforms with a stable anonymous JSON endpoint get real structured extraction. The
 * rest are detected but not parsed: they serve listings from an authenticated widget or an iframe,
 * so the embedding page's own HTML is empty and there is nothing for the heuristic tier to read
 * either. Recording the platform anyway is what makes that a known, countable gap rather than an
 * unexplained zero.
 */
const ATS_SIGNATURES: AtsSignature[] = [
  {
    name: "greenhouse",
    match: /boards\.greenhouse\.io|js\.greenhouse\.io|greenhouse\.io\/embed/i,
    token: (html) => html.match(/greenhouse\.io\/(?:embed\/job_board\/js\?for=|boards\/)([a-z0-9_-]+)/i)?.[1] ?? null,
    api: (t) => `https://boards-api.greenhouse.io/v1/boards/${t}/jobs`,
    parse: (json) =>
      jobArray(json, "jobs").map((j) => ({
        title: str(j.title) ?? "",
        url: str(j.absolute_url),
        location: str(obj(j.location)?.name),
        description: null,
        postedAt: str(j.updated_at),
      })),
  },
  {
    name: "lever",
    match: /jobs\.lever\.co|api\.lever\.co/i,
    token: (html, pageUrl) =>
      (html.match(/jobs\.lever\.co\/([a-z0-9_-]+)/i) ?? pageUrl.match(/jobs\.lever\.co\/([a-z0-9_-]+)/i))?.[1] ?? null,
    api: (t) => `https://api.lever.co/v0/postings/${t}?mode=json`,
    parse: (json) =>
      jobArray(json).map((j) => ({
        title: str(j.text) ?? "",
        url: str(j.hostedUrl),
        location: str(obj(j.categories)?.location),
        description: str(j.descriptionPlain),
        postedAt: typeof j.createdAt === "number" ? new Date(j.createdAt).toISOString() : null,
      })),
  },
  {
    name: "workable",
    match: /apply\.workable\.com/i,
    token: (html, pageUrl) =>
      (html.match(/apply\.workable\.com\/([a-z0-9_-]+)/i) ?? pageUrl.match(/apply\.workable\.com\/([a-z0-9_-]+)/i))?.[1] ?? null,
    api: (t) => `https://apply.workable.com/api/v1/widget/accounts/${t}`,
    parse: (json) =>
      jobArray(json, "jobs").map((j) => ({
        title: str(j.title) ?? "",
        url: str(j.url),
        location: str(obj(j.location)?.location_str),
        description: null,
        postedAt: str(j.published_on),
      })),
  },
  {
    name: "recruitee",
    match: /\.recruitee\.com/i,
    token: (html, pageUrl) =>
      (pageUrl.match(/https?:\/\/([a-z0-9_-]+)\.recruitee\.com/i) ?? html.match(/([a-z0-9_-]+)\.recruitee\.com/i))?.[1] ?? null,
    api: (t) => `https://${t}.recruitee.com/api/offers/`,
    parse: (json) =>
      jobArray(json, "offers").map((j) => ({
        title: str(j.title) ?? "",
        url: str(j.careers_url),
        location: str(j.city),
        description: str(j.description),
        postedAt: str(j.published_at),
      })),
  },
  {
    name: "breezy",
    match: /\.breezy\.hr/i,
    token: (html, pageUrl) =>
      (pageUrl.match(/https?:\/\/([a-z0-9_-]+)\.breezy\.hr/i) ?? html.match(/([a-z0-9_-]+)\.breezy\.hr/i))?.[1] ?? null,
    api: (t) => `https://${t}.breezy.hr/json`,
    parse: (json) =>
      jobArray(json).map((j) => ({
        title: str(j.name) ?? "",
        url: str(j.url),
        location: str(obj(j.location)?.name),
        description: null,
        postedAt: str(j.published_date),
      })),
  },
  // Detected only — no anonymous JSON endpoint.
  { name: "zohorecruit", match: /zohorecruit\.(com|in)/i },
  { name: "keka", match: /keka\.com/i },
  { name: "freshteam", match: /freshteam\.com/i },
  { name: "smartrecruiters", match: /smartrecruiters\.com/i },
  { name: "bamboohr", match: /bamboohr\.com/i },
  { name: "jobvite", match: /jobvite\.com/i },
  { name: "icims", match: /icims\.com/i },
  { name: "workday", match: /myworkdayjobs\.com/i },
  { name: "personio", match: /personio\.(com|de)/i },
  { name: "successfactors", match: /successfactors\.(com|eu)/i },
];

function detectAts(html: string, pageUrl: string): AtsSignature | null {
  return ATS_SIGNATURES.find((s) => s.match.test(html) || s.match.test(pageUrl)) ?? null;
}

async function tryAtsApi(sig: AtsSignature, html: string, pageUrl: string): Promise<ScrapedJob[]> {
  if (!sig.token || !sig.api || !sig.parse) return [];
  const token = sig.token(html, pageUrl);
  if (!token) return [];
  // No host check here on purpose: the ATS API is *expected* to live on a different host than the
  // company's own domain -- that indirection is the entire point of a hosted job board.
  const res = await fetchText(sig.api(token));
  if (!res) return [];
  try {
    return sig.parse(JSON.parse(res.text)).filter((j) => j.title);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------------------------
// Tier 3 — heuristic HTML
// ---------------------------------------------------------------------------------------------

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Nav, legal and UI chrome that repeatedly matched the role vocabulary below and produced junk
 * "jobs" like "Cookie Policy" and "Skip to content" on the first pass over the corpus.
 */
const TITLE_DENYLIST =
  /^(home|about( us)?|contact( us)?|blog|privacy|terms|login|sign ?in|menu|close menu|careers?|jobs?|apply ?now|view all|see all|learn more|read more|cookie policy|cookie settings|current openings|no current openings|open positions?|skip to (main )?content|services|our services|locations?|scroll to top|why (work|choose) (with )?us|join our team|get (a |free )?(quote|consultancy|consultation))$/i;

/**
 * A real job-role noun is *required* for a heuristic hit. An earlier version also accepted "the
 * href looks career-ish", which dragged in every nav link on the page; requiring the role word and
 * treating the URL shape as a confidence boost instead roughly halved the false-positive rate.
 */
const TITLE_ROLE_RE =
  /(manager|engineer|developer|executive|associate|specialist|officer|lead|intern(ship)?|analyst|assistant|representative|consultant|coordinator|technician|salesperson|sales (rep|executive|associate)|marketing (executive|manager)|accountant|receptionist|nurse|therapist|driver|chef|cook\b|teacher|tutor|hr\b|administrator|supervisor|clerk|cashier|electrician|plumber|mechanic|welder|fitter)/i;

function heuristicExtract(html: string, pageUrl: string): ScrapedJob[] {
  let careerPath = "/";
  try {
    careerPath = new URL(pageUrl).pathname.replace(/\/$/, "");
  } catch {
    /* leave default */
  }

  const candidates: Array<ScrapedJob & { score: number }> = [];
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html))) {
    const href = m[1];
    const text = stripTags(m[2]);
    if (!text || text.length < 4 || text.length > 90) continue;
    if (TITLE_DENYLIST.test(text)) continue;
    if (!TITLE_ROLE_RE.test(text)) continue;

    let absUrl = href;
    let hrefPath: string | null = null;
    try {
      const u = new URL(href, pageUrl);
      absUrl = u.toString();
      hrefPath = u.pathname;
    } catch {
      /* keep raw href */
    }
    // A link that descends *into* the careers section is far more likely a real posting than one
    // that merely happens to contain a role word elsewhere on the site.
    const isChild = !!hrefPath && careerPath !== "/" && hrefPath.startsWith(`${careerPath}/`) && hrefPath !== careerPath;
    candidates.push({ title: text, url: absUrl, location: null, description: null, postedAt: null, score: isChild ? 2 : 1 });
  }

  const seen = new Set<string>();
  const jobs: ScrapedJob[] = [];
  for (const c of candidates.sort((a, b) => b.score - a.score)) {
    const key = `${c.title}|${c.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    jobs.push({ title: c.title, url: c.url, location: c.location, description: c.description, postedAt: c.postedAt });
  }
  return jobs;
}

// ---------------------------------------------------------------------------------------------
// entry point
// ---------------------------------------------------------------------------------------------

export async function scrapeCompanyJobs(domain: string): Promise<ScrapeResult> {
  const result: ScrapeResult = {
    domain,
    siteReachable: false,
    careersUrl: null,
    method: null,
    atsPlatform: null,
    jobs: [],
    error: null,
  };

  try {
    const { careersUrl, reachable } = await findCareersUrl(domain);
    result.siteReachable = reachable;
    if (!reachable) {
      result.error = "site_unreachable";
      return result;
    }
    if (!careersUrl) {
      result.error = "no_careers_page";
      return result;
    }
    result.careersUrl = careersUrl;

    const page = await fetchText(careersUrl, domain);
    if (!page) {
      result.error = "careers_page_fetch_failed";
      return result;
    }

    const schemaJobs = extractJsonLdJobs(page.text);
    if (schemaJobs.length) {
      result.method = "jsonld_schema";
      result.jobs = schemaJobs;
      return result;
    }

    const sig = detectAts(page.text, page.url);
    if (sig) {
      result.atsPlatform = sig.name;
      const atsJobs = await tryAtsApi(sig, page.text, page.url);
      if (atsJobs.length) {
        result.method = "ats_api";
        result.jobs = atsJobs;
        return result;
      }
    }

    const heuristicJobs = heuristicExtract(page.text, page.url);
    if (heuristicJobs.length) {
      result.method = "heuristic_html";
      result.jobs = heuristicJobs;
    }
    return result;
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
    return result;
  }
}
