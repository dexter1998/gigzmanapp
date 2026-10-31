// VENDORED from webdev-leads/v2/scripts/enrich2.mjs by scripts/sync-enricher.sh — edit the source, not this copy.
// W3b -- second-pass site enrichment. Runs over domains the first pass (scripts/enrich.mjs)
// could NOT get a personal address for, and reads the surfaces that pass missed.
//
// HARD RULE, inherited from infer-emails.mjs: an address is only ever emitted if it was found
// WRITTEN somewhere. Nothing here synthesises an address from a name + a pattern. That path was
// removed 2026-09-21 after 79.2% of guesses bounced and got the SES account suspended.
//
// What this pass adds over the first one:
//   1. Cloudflare data-cfemail decoding      -- pass 1 claimed this in a comment but never
//                                               implemented it; only [at] munging was handled.
//   2. Inline <script> + JS bundle scanning  -- pass 1 STRIPS <script> before its text regex,
//                                               so every address hardcoded in a form handler,
//                                               __NEXT_DATA__ or __NUXT__ payload was discarded.
//   3. Policy pages (privacy/terms/refund/    -- Indian sites must carry a contact address here
//      disclaimer/shipping/cookie)              for payment-gateway onboarding; it is often a
//                                               different (and more real) address than /contact.
//   4. JSON-LD / microdata / og email fields
//   5. _dmarc TXT rua=mailto:                -- a written address, DNS-only, no fetch.
//   6. /.well-known/security.txt
//   7. Same-origin PDF (company profile / brochure)
//   8. Wayback /contact snapshot             -- last resort for sites that replaced a published
//                                               address with a form.
//
// Steps 5-8 are gated: they only run when the cheap steps produced no personal address, so the
// per-domain cost stays near pass-1 levels for the domains that resolve early.
//
// usage: node enrich2.mjs <targets.csv> <out.ndjson> [concurrency]
//
// 2026-10-19: also a module. Mantis V2's Qualifier imports processDomain() to read one business's
// site inside a chat run (fast mode), so the box and the app share one extractor. The record now
// also carries what the homepage says about the SITE -- signals (https, mobile viewport, copyright
// year, analytics, ad pixels, booking, whatsapp, parked), cms, phones, socials, title, final_url.
// Detection only reads what is on the page; like the emails, nothing is inferred.

import { readFileSync, appendFileSync, existsSync, createReadStream } from "node:fs";
import { pathToFileURL } from "node:url";
import { promises as dns } from "node:dns";
import { createInterface } from "node:readline";
import zlib from "node:zlib";

// Run as a CLI only when executed directly; importing the module must not start a crawl.
// ENRICH2_EMBEDDED: set by bundles that inline this file (the Mantis site reader) — inside a bundle
// import.meta.url IS the entry file, so the CLI check below would fire and exit with "usage".
const IS_CLI = !process.env.ENRICH2_EMBEDDED && !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
const [, , INPUT, OUTPUT, CONC_ARG] = IS_CLI ? process.argv : [];
if (IS_CLI && (!INPUT || !OUTPUT)) {
  console.error("usage: node enrich2.mjs <targets.csv> <out.ndjson> [concurrency]");
  process.exit(1);
}
const CONCURRENCY = Number(CONC_ARG || 8);
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const TIMEOUT = 12000;
const MAX_PAGES = 8;      // html pages per domain, on top of the homepage
const MAX_BUNDLES = 3;    // js bundles, only when no personal address yet

const ROLE_PREFIX = new Set([
  "info","support","contact","contactus","sales","admin","hello","hi","enquiry","enquiries",
  "inquiry","inquiries","office","care","customercare","help","service","services","mail",
  "team","business","marketing","hr","careers","career","jobs","noreply","no-reply","webmaster",
  "general","accounts","billing","finance","legal","privacy","press","media","partners",
  "connect","reach","query","queries","work","hire","project","projects","quote","booking",
  "app","apps","mobile","dev","developer","design","studio","agency","web","digital","seo",
  "events","event","booking","bookings","order","orders","shop","store","showroom","reception",
  "frontdesk","front-desk","buchhaltung","vertrieb","einkauf","personal","zentrale","anfrage",
  "social","ads","lead","leads","client","clients","postmaster","abuse","root","tech","technical",
  "feedback","newsletter","subscribe","unsubscribe","notification","notifications","alert","alerts",
  "helpdesk","desk","psirt","security-team","information-security","infosec","datenschutz","impressum",
  "dpo","grievance","grievances","compliance","nodal","dmarc","dmarc-info","dmarcreports","dmarcreport","rua","ruf","official","noc","security","reports",
]);
const PLACEHOLDER_RE = /^(you|your|name|name123|email|username|user|firstname|test|demo|sample|abc|xyz|someone|myname)@|@(example|company|business|domain|yourdomain|yoursite|email|mysite|site|test|demo|sentry|wixpress|godaddy|squarespace)\.(com|net|org|in|io)$/i;
// .pdf is deliberately absent: a privacy policy or terms page is often served as a PDF, and
// harvest() can already read Flate streams out of one. Skipping it lost real addresses.
const ASSET_RE = /\.(png|jpe?g|gif|svg|webp|ico|css|js|woff2?|ttf|mp4|mp3|zip|dmg|exe)$/i;
// Vendor addresses that appear on thousands of sites and are never the business's own contact.
const FREE_MAIL_RE = /@(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|rediffmail|aol|protonmail|proton|icloud|zoho|mail)\./i;
const VENDOR_RE = /@(wordpress|wpengine|elementor|wix|shopify|squarespace|godaddy|hostinger|bluehost|cloudflare|google|gmail\.example|sentry|jquery|bootstrap|fontawesome|adobe|w3\.org|schema\.org|dmarcian|postmarkapp|valimail|agari|easydmarc|ondmarc|mxtoolbox|fraudmarc)\./i;

function isRole(email) {
  const lp = email.split("@")[0];
  const base = lp.replace(/[._-]?\d+$/, "");
  return ROLE_PREFIX.has(lp) || ROLE_PREFIX.has(base);
}

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ");
}

/** Cloudflare Scrape Shield: single-byte XOR, key is the first hex byte of the payload itself.
 * Same scheme on every Cloudflare site, so one decoder reads them all. */
function cfDecode(hex) {
  try {
    const key = parseInt(hex.slice(0, 2), 16);
    let out = "";
    for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
    return out;
  } catch { return ""; }
}

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

function cleanSet(cands) {
  const out = new Set();
  for (let e of cands) {
    e = (e || "").trim().toLowerCase().replace(/^mailto:/, "").split("?")[0];
    // mailto hrefs arrive URL-encoded: "mailto:%20info@x.com" kept the "%20" as part of the address.
    try { e = decodeURIComponent(e); } catch { /* a stray "%" — leave as is, the shape test drops it */ }
    e = e.trim().replace(/[.,;:)\]"'<>]+$/, "");
    if (!e || e.length > 80 || e.includes("..")) continue;
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(e)) continue;
    if (PLACEHOLDER_RE.test(e) || ASSET_RE.test(e) || VENDOR_RE.test(e)) continue;
    if (/^[0-9]+@/.test(e)) continue;
    if (/\.(png|jpg|jpeg|gif|webp|js|css)$/i.test(e)) continue;
    out.add(e);
  }
  return out;
}

/** Every email-bearing surface in one HTML document, each tagged with where it came from so a
 * downstream confidence tier can prefer mailto/jsonld over stray body text. */
function harvest(html) {
  const found = new Map(); // email -> surface
  const people = [];       // names + roles written anywhere on the site
  const add = (e, surface) => { for (const x of cleanSet([e])) if (!found.has(x)) found.set(x, surface); };

  for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) add(decodeEntities(m[1]), "mailto");
  for (const m of html.matchAll(/data-cfemail=["']([0-9a-fA-F]+)["']/g)) add(cfDecode(m[1]), "cloudflare");
  for (const m of html.matchAll(/\/cdn-cgi\/l\/email-protection#([0-9a-fA-F]+)/g)) add(cfDecode(m[1]), "cloudflare");

  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    const walk = (v) => {
      if (!v) return;
      if (typeof v === "string") { if (v.includes("@") && EMAIL_RE.test(v)) { EMAIL_RE.lastIndex = 0; add(v, "jsonld"); } return; }
      if (Array.isArray(v)) return v.forEach(walk);
      if (typeof v === "object") for (const [k, x] of Object.entries(v)) {
        if (/^email$/i.test(k) && typeof x === "string") add(x, "jsonld"); else walk(x);
      }
    };
    try { walk(JSON.parse(m[1].trim())); } catch { /* malformed block */ }
  }

  for (const m of html.matchAll(/<[^>]+itemprop=["']email["'][^>]*content=["']([^"']+)["']/gi)) add(m[1], "microdata");
  for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:email|email|contact)["'][^>]*content=["']([^"']+)["']/gi)) add(m[1], "meta");

  // Inline <script> bodies -- pass 1 deleted these before looking. Form handlers, EmailJS
  // configs, __NEXT_DATA__ and __NUXT__ payloads all carry the real recipient address.
  for (const m of html.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi)) {
    for (const e of (m[1].match(EMAIL_RE) || [])) add(e, "inline_js");
  }

  const text = decodeEntities(
    html.replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ");
  for (const e of (text.match(EMAIL_RE) || [])) add(e, "text");
  // Bracketed munging only. A bare " at " was tried and matched ordinary prose -- "magecomp at
  // a glance" became magecomp@a.glance -- so that form is deliberately not supported.
  for (const m of text.matchAll(/\b([A-Za-z0-9._%+-]+)\s*(?:\[at\]|\(at\)|\{at\}|\s@\s)\s*([A-Za-z0-9.-]+)\s*(?:\[dot\]|\(dot\)|\{dot\})\s*([A-Za-z]{2,})\b/gi)) {
    add(`${m[1]}@${m[2]}.${m[3]}`, "munged");
  }
  for (const m of text.matchAll(/\b([A-Za-z0-9._%+-]+)\s*(?:\[at\]|\(at\)|\{at\})\s*([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/gi)) {
    add(`${m[1]}@${m[2]}`, "munged");
  }
  return found;
}


const ROLE_WORDS = "co-?founder|founder|ceo|cto|coo|cfo|managing director|director|owner|proprietor|principal|managing partner|president|geschäftsführer|geschaeftsfuehrer|geschäftsführerin|inhaber|inhaberin|gründer|gruender|vertreten durch|eigentümer|prokurist";

// Function words that cannot appear inside a person's name. Without this the German pages were
// the worst offenders -- every capitalised noun looked like a surname.
const NAME_STOPWORD = new Set(["der","die","das","den","dem","des","ein","eine","einen","einem","eines",
  "und","oder","aber","ihr","ihre","ihren","unser","unsere","sein","seine","mit","von","vom","zu","zur",
  "zum","für","fuer","auf","aus","bei","nach","über","unter","als","wie","welcher","welche","welches",
  "gute","guten","gut","mehr","alle","allen","hier","dass","sich","wir","uns","sie","ist","sind","the",
  "of","and","our","your","you","we","is","are","at","in","on","for","with","about","board","team",
  "more","all","here","this","that","new","best","top","contact","kontakt","info","home","impressum",
  "datenschutz","cookie","cookies","portal","service","produkte","produkten","informationen"]);

// Labels of the fields that sit next to the name in a German Impressum. The name capture runs
// into them because the page has no punctuation between fields.
const IMPRESSUM_LABEL = /^(umsatzsteuer|ust|steuernummer|steuer|registergericht|registernummer|registerangab\w*|handelsregister|hrb|hra|amtsgericht|telefon|telefax|fax|mail|e-?mail|adresse|anschrift|sitz|vertreten|verantwortlich|geschäftsführ\w*|inhaber\w*|kontakt|webseite|website|internet|tel)/i;

/** Trim a captured name at the first token that is actually the next Impressum field's label. */
function cleanPersonName(name) {
  const toks = name.trim().split(/\s+/);
  const keep = [];
  for (const t of toks) {
    if (IMPRESSUM_LABEL.test(t.replace(/[.,:]$/, ""))) break;
    keep.push(t);
  }
  return keep.join(" ").replace(/[,:;]$/, "").trim();
}

/** Does this look like a real person's name? Two to three capitalised, non-shouting, non-function
 * tokens. ALL-CAPS tokens are rejected because they are brand words (HAZET, PARTNER), not names. */
function looksLikePersonName(name) {
  const toks = name.trim().split(/\s+/);
  if (toks.length < 2 || toks.length > 3) return false;
  for (const t of toks) {
    const bare = t.replace(/[.,]$/, "");
    if (bare.length < 2) return false;
    if (NAME_STOPWORD.has(bare.toLowerCase())) return false;
    if (bare === bare.toUpperCase() && bare.length > 2) return false;   // HAZET, PARTNER, GmbH-ish
    if (!/^[A-ZÄÖÜ][\p{L}'’.-]*$/u.test(bare)) return false;
  }
  return true;
}

/** People (and their roles) written on the page. Used ONLY to label an address that was already
 * found -- never to build one. Generating an address from a name is the thing that got the SES
 * account suspended, and it stays gone. */
function extractPeople(html) {
  const people = [];
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    const walk = (v, hint) => {
      if (!v || typeof v !== "object") return;
      if (Array.isArray(v)) return v.forEach((x) => walk(x, hint));
      const t = v["@type"];
      const isPerson = t === "Person" || (Array.isArray(t) && t.includes("Person"));
      if (isPerson && v.name && looksLikePersonName(String(v.name))) people.push({ name: String(v.name).trim(), role: v.jobTitle ? String(v.jobTitle) : hint || null, via: "jsonld" });
      for (const k of ["founder", "employee", "member", "owner", "author"]) if (v[k]) walk(v[k], k);
      if (v["@graph"]) walk(v["@graph"], hint);
    };
    try { walk(JSON.parse(m[1].trim()), null); } catch { /* malformed block */ }
  }
  const text = decodeEntities(
    html.replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ");
  // Name-then-role ("Anita Sharma, Founder")
  for (const m of text.matchAll(new RegExp(`\\b([A-Z][\\p{L}'’-]{1,18}(?:\\s+[A-Z][\\p{L}.'’-]{1,18}){1,2})\\s*[,\\-–—|:]\\s*((?:is\\s+)?(?:the\\s+)?(?:our\\s+)?(?:${ROLE_WORDS}))\\b`, "giu"))) {
    const nm1 = cleanPersonName(m[1]);
    if (looksLikePersonName(nm1)) people.push({ name: nm1, role: m[2].trim(), via: "text" });
  }
  // Role-then-name -- the German Impressum form ("Geschäftsführer: Anita Sharma", "Vertreten
  // durch: ..."), which is where DACH founder names actually live.
  for (const m of text.matchAll(new RegExp(`\\b(${ROLE_WORDS})\\b\\s*[:\\-–—]\\s*((?:Herr|Frau|Dipl\\.?-?\\w*|Ing\\.?|Dr\\.?|Prof\\.?)?\\s*[A-ZÄÖÜ][\\p{L}'’-]{1,18}(?:\\s+[A-ZÄÖÜ][\\p{L}.'’-]{1,18}){1,2})`, "giu"))) {
    const nm = cleanPersonName(m[2].replace(/^(Herr|Frau|Dipl\.?-?\w*|Ing\.?|Dr\.?|Prof\.?)\s+/i, ""));
    if (looksLikePersonName(nm)) people.push({ name: nm, role: m[1].trim(), via: "role_first" });
  }
  const seen = new Set();
  return people.filter((x) => {
    const k = x.name.toLowerCase();
    if (seen.has(k) || x.name.split(/\s+/).length > 4 || x.name.length < 4) return false;
    if (NOT_A_PERSON.test(x.name)) return false;
    seen.add(k); return true;
  }).slice(0, 15);
}

const NOT_A_PERSON = /\b(pvt|private|ltd|limited|llp|inc|llc|gmbh|solutions?|services?|technolog\w*|systems?|software|digital|studios?|labs?|media|group|company|companies|business(es)?|enterprises?|industries|consult\w*|infotech|softech|web|design|marketing|agency|global|international|world|india|scale|team|works?|ventures?)\b/i;

const STOP_NAME = new Set(["mr","mrs","ms","dr","er","ca","adv","shri","smt","herr","frau","dipl","ing","prof","the","our","co","und","and","gmbh","ag","kg","ohg","mbh"]);
function nameTokens(name, style = "strip") {
  let s = (name || "").toLowerCase();
  if (style === "expand") s = s.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss");
  return s.replace(/[^a-z\s]/g, " ").split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_NAME.has(t));
}

/** Does an address that we ALREADY FOUND belong to one of the named people? Pure classification:
 * the local part is compared against the name, nothing is ever constructed from the name. */
function matchEmailToPerson(email, people) {
  const lp = email.split("@")[0].toLowerCase().replace(/\d+$/, "");
  const parts = lp.split(/[._-]+/).filter(Boolean);
  for (const p of people) {
    for (const style of ["strip", "expand"]) {
      const toks = nameTokens(p.name, style);
      if (toks.length < 2) continue;   // a mononym is not enough to attribute an address
      const first = toks[0], last = toks[toks.length - 1];
      const forms = new Set([first + last, last + first, first[0] + last, first + last[0],
        last + first[0], first[0] + "." + last].filter(Boolean));
      if (forms.has(lp) || forms.has(parts.join(""))) return p;
      // first & last both present as separate local-part segments, in either order
      if (parts.includes(first) && parts.includes(last)) return p;
      // initial + surname split across segments, e.g. m.steinkuehler
      if (parts.length === 2 && parts[0] === first[0] && parts[1] === last) return p;
    }
  }
  return null;
}

// The box crawls with plain fetch. A caller that reads URLs from untrusted input (the Mantis app,
// where a URL can come from a chat message) swaps in a fetch that refuses private addresses.
let FETCH = (...a) => fetch(...a);
export function configure({ fetch: f } = {}) { if (f) FETCH = f; }

async function get(url, { timeout = TIMEOUT, binary = false } = {}) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeout);
  try {
    const res = await FETCH(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: c.signal });
    if (!res.ok) return { ok: false, status: res.status, url: res.url, body: "", buf: null };
    if (binary) return { ok: true, status: res.status, url: res.url, body: "", buf: Buffer.from(await res.arrayBuffer()) };
    return { ok: true, status: res.status, url: res.url, body: await res.text(), buf: null };
  } catch (e) {
    return { ok: false, status: 0, url, body: "", buf: null, error: String(e.name || e) };
  } finally { clearTimeout(t); }
}

// Page classes worth fetching, in priority order. The policy group is the addition that matters
// most in India: a payment gateway will not onboard a site without a contact address on these
// pages, so they carry one even when /contact is a bare form.
const PATH_GROUPS = [
  // Impressum first, and by a wide margin. German §5 DDG makes a legal notice carrying a DIRECT
  // email address and the named Geschäftsführer mandatory on every commercial site, reachable
  // within one or two clicks -- a contact form explicitly does not satisfy it. For DACH this is
  // the single highest-yield page on the whole site; elsewhere it costs one miss.
  [/(^|\/)(impressum|imprint|impressum-datenschutz|rechtliches|legal-notice|legalnotice|kontakt|mentions-legales|colofon)(-[a-z0-9-]*)?(\.html?|\.php)?\/?$/i, "impressum"],
  [/(^|\/)(contact|contact-us|contactus|contact-us-page|connect|connect-with-us|reach-us|reach-out|get-in-touch|getintouch|enquiry|enquire|write-to-us|talk-to-us)(-[a-z0-9-]*)?(\.(html?|php|aspx?|jsp|cfm))?\/?$/i, "contact"],
  [/(^|\/)(about|about-us|aboutus|about-company|who-we-are|whoweare|our-story|ourstory|company|company-profile|overview)(-[a-z0-9-]*)?(\.(html?|php|aspx?|jsp|cfm))?\/?$/i, "about"],
  [/(^|\/)(team|our-team|ourteam|people|our-people|staff|leadership|leadership-team|management|management-team|directors|key-people)(-[a-z0-9-]*)?(\.(html?|php|aspx?|jsp|cfm))?\/?$/i, "team"],
  [/(^|\/)(privacy|privacy-policy|privacy-notice|datenschutz|terms|term|terms-of-service|terms-of-use|terms-conditions|terms-and-conditions|tos|t-and-c|t-c|tnc|legal-terms|eula|acceptable-use|privacypolicy|termsandconditions|termsconditions|terms-condition|termsofuse|refund|refund-policy|refundpolicy|cancellation|cancellation-policy|shipping|shipping-policy|disclaimer|cookie|cookie-policy|cookiepolicy|legal)(-[a-z0-9-]*)?(\.(html?|php|aspx?|jsp|cfm))?\/?$/i, "policy"],
  // Partner and investor pages name the person who owns business development, which is exactly the
  // contact a partnership pitch needs -- and they are usually a named address, not a shared inbox.
  [/(^|\/)(partner|partners|partnership|partnerships|become-a-partner|partner-with-us|reseller|resellers|affiliate|affiliates|channel-partners|alliances|integrations-partners)(-[a-z0-9-]*)?(\.(html?|php|aspx?|jsp|cfm))?\/?$/i, "partner"],
  // Founder and investor pages carry the names the email gate needs to label an address.
  [/(^|\/)(founder|founders|founding-team|our-founders|investors|investor-relations|board|advisors|advisory)(-[a-z0-9-]*)?(\.(html?|php|aspx?|jsp|cfm))?\/?$/i, "founders"],
  [/(^|\/)(careers|career|jobs|work-with-us|hiring)(-[a-z0-9-]*)?(\.(html?|php|aspx?|jsp|cfm))?\/?$/i, "careers"],
  [/(^|\/)(support|help|faq)(-[a-z0-9-]*)?\/?$/i, "support"],
];
const GUESSED_PATHS = ["/impressum", "/imprint", "/contact", "/contact-us", "/about", "/about-us", "/privacy-policy", "/terms", "/terms-of-service", "/refund-policy", "/team", "/partners", "/partner-with-us", "/founders", "/leadership"];

function classify(pathname) {
  for (const [re, name] of PATH_GROUPS) if (re.test(pathname)) return name;
  return null;
}

// What a human reads in the link, for the 30% of sites (measured over 110 no-email domains) whose
// page slug the patterns above cannot recognise: "Talk to us" -> /hello, "Contact us" -> /sales,
// "Terms Conditions" -> /supplier-terms. Multilingual because Indian and European vendors label
// in-language even when the slug is English.
const ANCHOR_TEXT = [
  ["contact", /^(contact|contact us|contactus|get in touch|getintouch|reach us|reach out|talk to us|write to us|say hello|drop us a line|book a call|enquire|enquiry|enquiries|contactez|nous contacter|kontakt|kontakta oss|contatti|contacto|contato|\u304a\u554f\u3044\u5408\u308f\u305b|\u8054\u7cfb\u6211\u4eec|\u0938\u0902\u092a\u0930\u094d\u0915|iletisim|ileti\u015fim)\b/i],
  ["about", /^(about|about us|aboutus|who we are|whoweare|our story|our journey|the company|company profile|\u00fcber uns|uber uns|a propos|\u00e0 propos|chi siamo|sobre nosotros|quem somos)\b/i],
  ["team", /^(team|our team|meet the team|the team|our people|people|leadership|management|directors|founders|meet us|das team|notre \u00e9quipe|nuestro equipo)\b/i],
  ["policy", /^(privacy|privacy policy|privacy notice|terms|terms of (use|service)|terms & conditions|terms and conditions|t&c|t & c|tos|legal|legal notice|imprint|impressum|datenschutz|refund|refund policy|cancellation|disclaimer|cookie|cookie policy|mentions l\u00e9gales)\b/i],
  ["partner", /^(partner|partners|partnership|partnerships|become a partner|partner with us|reseller|resellers|affiliate|affiliates|alliances|channel partners)\b/i],
  ["founders", /^(founder|founders|founding team|our founders|investors|investor relations|board|advisors)\b/i],
];
function classifyText(t) {
  const x = String(t || "").replace(/\s+/g, " ").trim();
  if (!x || x.length > 40) return null;              // a sentence is a CTA, not a nav label
  for (const [g, re] of ANCHOR_TEXT) if (re.test(x)) return g;
  return null;
}

// The footer is where contact and legal links live on most sites, so its links are worth ranking
// above the same group found elsewhere. Taken as an explicit <footer> when present, otherwise the
// last fifth of the document.
function footerRegion(html) {
  const m = /<footer[\s\S]*?<\/footer>/i.exec(html);
  if (m) return m[0];
  const tail = html.slice(Math.floor(html.length * 0.8));
  return tail;
}

const sameSite = (a, b) => {
  const strip = (h) => String(h || "").replace(/^www\./i, "").toLowerCase();
  try { return strip(new URL(a).hostname) === strip(new URL(b).hostname); } catch { return false; }
};

function sameOriginLinks(html, origin) {
  const out = new Map();
  const foot = footerRegion(html);
  const footHrefs = new Set();
  for (const m of foot.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) {
    try { footHrefs.add(new URL(decodeEntities(m[1]), origin).href); } catch {}
  }
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]{0,160}?)<\/a>/gi)) {
    let u;
    try { u = new URL(decodeEntities(m[1]), origin); } catch { continue; }
    if (!sameSite(u.href, origin) || ASSET_RE.test(u.pathname)) continue;
    const label = m[2].replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ");
    // Slug first -- it is the stronger signal. Fall back to what the link says.
    const g = classify(u.pathname) || classifyText(label);
    if (!g) continue;
    const inFooter = footHrefs.has(u.href);
    const prev = out.get(u.href);
    if (!prev || (inFooter && !prev.inFooter)) out.set(u.href, { group: g, inFooter, viaText: !classify(u.pathname) });
  }
  return out;
}

// "Developed by" / "Powered by" credits in the footer. Two uses: the credit link itself sometimes
// carries the builder's address, and for the agency campaigns that builder IS a lead.
const CREDIT_RE = /(developed|designed|powered|built|maintained|created)\s*(&|and)?\s*(by|:)\s*([\s\S]{0,220})/gi;
function footerCredits(html, origin) {
  const foot = footerRegion(html);
  const out = [];
  for (const m of foot.matchAll(CREDIT_RE)) {
    const frag = m[4];
    const a = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{0,80}?)<\/a>/i.exec(frag);
    const name = (a ? a[2] : frag).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
    let href = "";
    if (a) { try { href = new URL(decodeEntities(a[1]), origin).href; } catch {} }
    if (name || href) out.push({ credit: `${m[1]} by`.toLowerCase(), name, url: href });
  }
  return out.slice(0, 3);
}

async function sitemapPaths(origin) {
  const out = new Map();
  for (const p of ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml", "/wp-sitemap.xml"]) {
    const r = await get(origin + p, { timeout: 8000 });
    if (!r.ok || !/<(urlset|sitemapindex)/i.test(r.body)) continue;
    let bodies = [r.body];
    if (/<sitemapindex/i.test(r.body)) {
      const subs = [...r.body.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => m[1]).slice(0, 4);
      bodies = [];
      for (const s of subs) { const rr = await get(s, { timeout: 8000 }); if (rr.ok) bodies.push(rr.body); }
    }
    for (const b of bodies) {
      for (const m of b.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) {
        let u; try { u = new URL(m[1]); } catch { continue; }
        if (!sameSite(u.href, origin)) continue;   // www and apex are one site
        const g = classify(u.pathname);
        if (g && !out.has(u.href)) out.set(u.href, g);
      }
    }
    break;
  }
  return out;
}

/** PDFs are often the only place a small agency writes its address in full (company profile,
 * brochure). No pdftotext on this machine, so inflate the Flate streams and regex those --
 * covers ordinary text PDFs, silently misses scanned/image ones, which is an acceptable trade. */
function pdfEmails(buf) {
  const found = new Set();
  const s = buf.toString("latin1");
  for (const m of s.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    try {
      const txt = zlib.inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
      for (const e of (txt.match(EMAIL_RE) || [])) found.add(e);
    } catch { /* not a flate stream */ }
  }
  for (const e of (s.match(EMAIL_RE) || [])) found.add(e);
  return found;
}

const dmarcCache = new Map();
async function dmarcAddrs(domain) {
  if (dmarcCache.has(domain)) return dmarcCache.get(domain);
  const out = new Set();
  try {
    const recs = await dns.resolveTxt("_dmarc." + domain);
    for (const r of recs) {
      const line = r.join("");
      for (const m of line.matchAll(/(?:rua|ruf)=([^;]+)/gi)) {
        for (const part of m[1].split(",")) {
          const a = part.trim().replace(/^mailto:/i, "").split("!")[0];
          if (a.includes("@")) out.add(a.toLowerCase());
        }
      }
    }
  } catch { /* no _dmarc */ }
  dmarcCache.set(domain, out);
  return out;
}

const mxCache = new Map();
async function mxInfo(domain) {
  if (mxCache.has(domain)) return mxCache.get(domain);
  let v = { mx_ok: false, provider: null };
  try {
    const recs = await dns.resolveMx(domain);
    if (recs.length) {
      v.mx_ok = true;
      const h = recs.map((r) => r.exchange.toLowerCase()).join(" ");
      v.provider = /google|googlemail/.test(h) ? "google" : /outlook|microsoft/.test(h) ? "microsoft"
        : /zoho/.test(h) ? "zoho" : /secureserver|godaddy/.test(h) ? "godaddy"
        : /hostinger|titan/.test(h) ? "titan" : /rediff/.test(h) ? "rediff" : "other";
    }
  } catch { /* no MX */ }
  mxCache.set(domain, v);
  return v;
}

/** Sites that replaced a published address with a form often still have the old page archived.
 * cdx is free and rate-limited, so this only runs when every live surface came up empty. */
async function waybackEmails(domain) {
  const q = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}*&output=json&fl=timestamp,original&collapse=urlkey&filter=statuscode:200&limit=40`;
  const r = await get(q, { timeout: 15000 });
  if (!r.ok) return new Map();
  let rows;
  try { rows = JSON.parse(r.body); } catch { return new Map(); }
  const cands = rows.slice(1)
    .filter(([, orig]) => /contact|about|team|founders|partner/i.test(orig))
    .slice(0, 2);
  const found = new Map();
  for (const [ts, orig] of cands) {
    const snap = await get(`https://web.archive.org/web/${ts}id_/${orig}`, { timeout: 15000 });
    if (!snap.ok) continue;
    for (const [e, s] of harvest(snap.body)) if (!found.has(e)) found.set(e, "wayback:" + s);
  }
  return found;
}

const SURFACE_RANK = { mailto: 6, cloudflare: 6, jsonld: 5, microdata: 5, meta: 5, inline_js: 4, munged: 3, text: 2 };

// --- what the homepage says about the site itself (2026-10-19) ---
// Each is a plain test against the HTML that was served; JS is never executed, so a tag injected
// at runtime by a tag manager is seen only as the manager. That is why "no_analytics" also checks
// for GTM: a site with GTM is treated as tracked.
const CMS_TESTS = [
  ["wordpress", /wp-content\/|wp-includes\/|<meta[^>]+generator[^>]+wordpress/i],
  ["shopify", /cdn\.shopify\.com|Shopify\.theme/i],
  ["wix", /static\.wixstatic\.com|wix\.com\/website|<meta[^>]+generator[^>]+wix/i],
  ["squarespace", /static1\.squarespace\.com|squarespace-cdn/i],
  ["webflow", /webflow\.(com|io)|data-wf-site/i],
  ["godaddy", /img1\.wsimg\.com|godaddy website builder/i],
  ["google_sites", /sites\.google\.com/i],
  ["joomla", /<meta[^>]+generator[^>]+joomla/i],
  ["drupal", /<meta[^>]+generator[^>]+drupal|\/sites\/default\/files\//i],
  ["nextjs", /__NEXT_DATA__|\/_next\/static\//i],
];
const GTM_RE = /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]{4,}/i;
const PARKED_RE = /(this domain (is|may be) for sale|buy this domain|domain is parked|parked free|sedoparking|hugedomains|dan\.com\/buy|afternic)/i;

export function siteSignals(html, finalUrl) {
  if (!html) return { site_down: true };
  const years = [...html.matchAll(/(?:©|&copy;|&#169;|copyright)\s*(?:\d{4}\s*[-–]\s*)?((?:19|20)\d\d)/gi)].map((m) => Number(m[1]));
  const newest = years.length ? Math.max(...years) : null;
  return {
    site_down: false,
    no_https: /^http:/i.test(finalUrl || ""),
    no_mobile: !/<meta[^>]+name=["']?viewport/i.test(html),
    copyright_year: newest,
    old_copyright: newest !== null && newest <= new Date().getFullYear() - 3,
    no_analytics: !/(googletagmanager\.com|google-analytics\.com|gtag\(|ga\(['"]create)/i.test(html),
    no_ad_pixel: !/(connect\.facebook\.net|fbq\(|googleadservices\.com|['"]AW-\d{6,})/i.test(html),
    // Split out because a seller asks about one network: a Meta-ads agency needs "no Meta pixel",
    // not "no pixel of any kind". With Tag Manager on the page either may be loaded at runtime,
    // which plain HTML cannot see -- so absent + GTM is null (unknown), never a false "no".
    no_meta_pixel: /(connect\.facebook\.net|fbq\()/i.test(html) ? false : GTM_RE.test(html) ? null : true,
    no_google_ads: /(googleadservices\.com|['"]AW-\d{6,})/i.test(html) ? false : GTM_RE.test(html) ? null : true,
    has_gtm: GTM_RE.test(html),
    no_booking: !/(book\s*(now|online|an?\s*appointment)|calendly\.com|practo\.com|setmore|fresha|zocdoc|simplybook|appointy|booksy|acuityscheduling)/i.test(html),
    has_whatsapp: /(wa\.me\/|api\.whatsapp\.com|whatsapp:\/\/)/i.test(html),
    // Positive evidence of what the site OFFERS, from its links and visible text. Absent means
    // "not visible on the homepage", never "the business doesn't have it".
    ...pagePresence(html),
    parked: PARKED_RE.test(html),
  };
}

const PRESENCE = {
  has_booking:      /(book\s*(now|online|an?\s*appointment|a\s*table|a\s*session)|schedule\s*(an?\s*)?(appointment|visit)|calendly\.com|practo\.com|setmore|fresha|zocdoc|simplybook|appointy|booksy|acuityscheduling)/i,
  has_menu:         /(href=["'][^"']*\bmenu\b[^"']*["']|>\s*(our\s*)?menu\s*<|zomato\.com|swiggy\.com|order\s*online)/i,
  has_admissions:   /(href=["'][^"']*admission[^"']*["']|>\s*admissions?\b|apply\s*now|enquire\s*for\s*admission)/i,
  has_careers:      /(href=["'][^"']*(career|jobs|join-us|vacanc|we-are-hiring)[^"']*["']|>\s*(careers?|jobs|join\s*us|we['’]re\s*hiring)\s*<)/i,
  has_portfolio:    /(href=["'][^"']*(portfolio|our-work|projects|case-stud|gallery)[^"']*["']|>\s*(portfolio|our\s*work|projects|case\s*studies|gallery)\s*<)/i,
  has_locations:    /(href=["'][^"']*(locations?|branches|centres|centers|clinics|outlets|stores)[^"']*["']|>\s*(our\s*)?(locations?|branches|centres|centers|outlets)\s*<)/i,
  has_online_store: /(add\s*to\s*cart|shopping\s*cart|cdn\.shopify\.com|woocommerce|\/cart["'\/])/i,
  has_login:        /(href=["'][^"']*(login|signin|sign-in|portal|my-account)[^"']*["']|>\s*(log\s*in|sign\s*in|patient\s*portal|member\s*login)\s*<)/i,
  has_contact_form: /(<form[\s\S]{0,2000}?(name=["']?(email|phone|message)))/i,
};
function pagePresence(html) {
  const out = {};
  for (const [k, re] of Object.entries(PRESENCE)) out[k] = re.test(html);
  return out;
}

export function siteCms(html) {
  for (const [name, re] of CMS_TESTS) if (re.test(html || "")) return name;
  return null;
}

function sitePhones(html) {
  const out = new Set();
  for (const m of (html || "").matchAll(/href\s*=\s*["']tel:([+\d\s().-]{7,22})["']/gi)) out.add(m[1].replace(/[\s().-]/g, ""));
  // Numbers written in the page text, Indian formats only (mobile 6-9xxxxxxxxx with optional +91/0,
  // landline 0xx-xxxxxxx[x]). Kept narrow on purpose: an order id or a pin code must not pass.
  const text = (html || "").replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ");
  for (const m of text.matchAll(/(?:\+91[\s-]?|\b0)?\b([6-9]\d{4}[\s-]?\d{5})\b/g)) out.add("+91" + m[1].replace(/\D/g, ""));
  for (const m of text.matchAll(/\b0(1[1-9]|[2-8]\d)[\s-]?(\d{3,4})[\s-]?(\d{4})\b/g)) out.add("+91" + m[1] + m[2] + m[3]);
  return [...out];
}

function siteSocials(html) {
  const out = {};
  const pats = { facebook: /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9_.\-\/]+/i, instagram: /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.\-]+/i,
                 linkedin: /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9_\-%]+/i, youtube: /https?:\/\/(?:www\.)?youtube\.com\/(?:@|c\/|channel\/)[A-Za-z0-9_\-]+/i,
                 x: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9_]+/i };
  for (const [k, re] of Object.entries(pats)) { const m = (html || "").match(re); if (m) out[k] = m[0]; }
  return out;
}

function siteTitle(html) {
  const m = (html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1]).replace(/\s+/g, " ").trim().slice(0, 160) || null : null;
}

// opts.fast: one interactive read for the Mantis app -- homepage plus the two best contact-ish
// pages, short timeouts, none of the escalation steps (sitemap, bundles, security.txt, PDF, DMARC,
// Wayback). The box never passes it, so its crawl is unchanged.
export async function processDomain(row, opts = {}) {
  const fast = opts.fast === true;
  const pageBudget = fast ? 2 : MAX_PAGES;
  const t = fast ? { timeout: 6000 } : {};
  const out = { domain: row.domain, company: row.company, website: row.website, category: row.category,
                prev_method: row.method, emails: [], surfaces: {}, pages_fetched: 0, steps: [] };
  // Carried through untouched so downstream per-country / per-keyword reporting works; the
  // gigzman campaign's calibration is entirely built on these two fields.
  if (row.country) out.country = row.country;
  if (row.keyword) out.keyword = row.keyword;
  let origin;
  try { origin = new URL(row.website).origin; } catch { out.error = "bad_url"; return out; }

  const found = new Map(); // email -> surface
  const people = [];       // names + roles written anywhere on the site
  const merge = (m) => { for (const [e, s] of m) if (!found.has(e) || (SURFACE_RANK[s] || 0) > (SURFACE_RANK[found.get(e)] || 0)) found.set(e, s); };
  // email -> set of page classes it was seen on ("home", "team", "founders", "policy", ...)
  const seenOn = new Map();
  // email -> the first page URL it was seen on, so a caller can show WHERE an address came from.
  const pageOf = new Map();
  const notePageUrl = (m, url) => { for (const e of m.keys()) if (!pageOf.has(e)) pageOf.set(e, url); };
  const notePages = (m, group) => { for (const e of m.keys()) { if (!seenOn.has(e)) seenOn.set(e, new Set()); seenOn.get(e).add(group); } };
  const personalOnDomain = () => [...found.keys()].some((e) => e.endsWith("@" + row.domain) && !isRole(e));

  const mx = await mxInfo(row.domain);
  out.mx_ok = mx.mx_ok; out.mail_provider = mx.provider;

  const home = await get(origin + "/", t);
  out.pages_fetched++; out.steps.push("home");
  // opts.onPage: callers that also want the pages' HTML (the Mantis site-enrich API) get every page
  // this crawl reads, so nothing is fetched twice. The box never passes it.
  if (home.ok) opts.onPage?.("home", home.url, home.body);
  out.final_url = home.ok ? home.url : null;
  out.signals = siteSignals(home.ok ? home.body : "", home.url);
  out.cms = home.ok ? siteCms(home.body) : null;
  out.title = home.ok ? siteTitle(home.body) : null;
  out.socials = home.ok ? siteSocials(home.body) : {};
  const phones = new Set(home.ok ? sitePhones(home.body) : []);
  if (!home.ok) { out.error = "home_unreachable"; }
  else { const hm = harvest(home.body); merge(hm); notePages(hm, "home"); notePageUrl(hm, home.url || origin + "/"); people.push(...extractPeople(home.body).map((p) => ({ ...p, page: "home" }))); }

  // Candidate pages: links on the homepage first, sitemap second, blind guesses last.
  const pages = new Map();
  const linkMeta = new Map();
  if (home.ok) for (const [u, meta] of sameOriginLinks(home.body, origin)) { pages.set(u, meta.group); linkMeta.set(u, meta); }
  if (home.ok) {
    out.footer_credits = footerCredits(home.body, origin);
    if (out.footer_credits.length) out.steps.push("credits");
  }
  if (pages.size < MAX_PAGES && !fast) {
    for (const [u, g] of await sitemapPaths(origin)) if (!pages.has(u)) pages.set(u, g);
    out.steps.push("sitemap");
  }
  if (pages.size === 0 && !fast) for (const p of GUESSED_PATHS) pages.set(origin + p, classify(p) || "contact");

  // Priority decides what survives the MAX_PAGES budget. founders/team/partner rank high because
  // this is what a decision-maker campaign needs: a named person and the business-development
  // owner. Without being listed here a new group falls to `?? 9` and is always cut.
  const order = { impressum: 0, contact: 1, founders: 2, team: 3, partner: 4, about: 5, policy: 6, careers: 7, support: 8 };
  // A footer link of the same class outranks one found mid-page: on most sites the real contact
  // and legal pages are linked from the footer, while mid-page hits are often CTAs to a form.
  const rank = (u, g) => (order[g] ?? 9) * 2 + (linkMeta.get(u)?.inFooter ? 0 : 1);
  const ranked = [...pages.entries()].sort((a, b) => rank(a[0], a[1]) - rank(b[0], b[1])).slice(0, pageBudget);
  for (const [u, g] of ranked) {
    const r = await get(u, t);
    out.pages_fetched++;
    if (!r.ok) continue;
    opts.onPage?.(g, r.url || u, r.body);
    for (const ph of sitePhones(r.body)) phones.add(ph);
    const h = harvest(r.body);
    notePages(h, g);
    notePageUrl(h, r.url || u);
    for (const [e, s] of h) if (!found.has(e)) found.set(e, `${g}:${s}`); else merge(new Map([[e, s]]));
    for (const pp of extractPeople(r.body)) people.push({ ...pp, page: g });
  }
  out.steps.push(`pages:${ranked.length}`);

  // --- escalation: only for domains still without a personal address on their own domain ---
  if (!personalOnDomain() && home.ok && !fast) {
    const srcs = [...home.body.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
      .map((m) => { try { return new URL(decodeEntities(m[1]), origin); } catch { return null; } })
      .filter((u) => u && u.origin === origin && /\.js(\?|$)/i.test(u.pathname))
      .slice(0, MAX_BUNDLES);
    for (const u of srcs) {
      const r = await get(u.href, { timeout: 10000 });
      out.pages_fetched++;
      if (!r.ok) continue;
      for (const e of cleanSet(r.body.match(EMAIL_RE) || [])) if (!found.has(e)) found.set(e, "bundle_js");
    }
    if (srcs.length) out.steps.push(`bundles:${srcs.length}`);
  }

  if (!personalOnDomain() && !fast) {
    const st = await get(origin + "/.well-known/security.txt", { timeout: 8000 });
    if (st.ok) for (const m of st.body.matchAll(/Contact:\s*mailto:([^\s]+)/gi)) {
      for (const e of cleanSet([m[1]])) if (!found.has(e)) found.set(e, "security_txt");
    }
    out.steps.push("security_txt");
  }

  if (!personalOnDomain() && home.ok && !fast) {
    const pdf = [...home.body.matchAll(/<a[^>]+href=["']([^"']+\.pdf)["']/gi)]
      .map((m) => { try { return new URL(decodeEntities(m[1]), origin); } catch { return null; } })
      .filter((u) => u && u.origin === origin)[0];
    if (pdf) {
      const r = await get(pdf.href, { timeout: 20000, binary: true });
      out.pages_fetched++;
      if (r.ok && r.buf) for (const e of cleanSet(pdfEmails(r.buf))) if (!found.has(e)) found.set(e, "pdf");
      out.steps.push("pdf");
    }
  }

  if (!fast) {
    for (const a of await dmarcAddrs(row.domain)) if (!found.has(a)) found.set(a, "dmarc_rua");
    out.steps.push("dmarc");
  }

  if (!personalOnDomain() && !fast) {
    merge(await waybackEmails(row.domain));
    out.steps.push("wayback");
  }
  out.phones = [...phones].slice(0, 5);

  const all = [...found.entries()].map(([email, surface]) => ({
    email, surface, page: pageOf.get(email) ?? null,
    same_domain: email.endsWith("@" + row.domain),
    role: isRole(email),
  }));
  const dedupPeople = [];
  { const seenP = new Set();
    for (const pp of people) { const k = pp.name.toLowerCase(); if (!seenP.has(k)) { seenP.add(k); dedupPeople.push(pp); } } }
  out.people = dedupPeople.slice(0, 15);

  for (const e of all) {
    e.freemail = FREE_MAIL_RE.test(e.email);
    // Label, do not construct: the address already exists, this only asks whose it is.
    const who = e.role ? null : matchEmailToPerson(e.email, dedupPeople);
    if (who) { e.person = who.name; e.person_role = who.role; }
  }
  // personal@own-domain > personal@freemail > role@own-domain > everything else. An off-domain
  // non-freemail address is someone ELSE's inbox until proven otherwise; it is kept in emails[]
  // for inspection but never promoted to best_email.
  // A named person on the company's own domain is the tier this campaign is actually buying, so
  // it outranks an unattributed personal address even on the same domain.
  const score = (x) => (x.person && x.same_domain ? 6 : x.same_domain && !x.role ? 5
    : x.person && x.freemail ? 5 : x.freemail && !x.role ? 4 : x.same_domain ? 3 : x.freemail ? 2 : 1);
  all.sort((a, b) => score(b) - score(a) ||
    (SURFACE_RANK[b.surface.split(":").pop()] || 0) - (SURFACE_RANK[a.surface.split(":").pop()] || 0));
  for (const a of all) a.pages = [...(seenOn.get(a.email) || [])];
  out.emails = all;
  // Named leaders found on a founders/team page, which is what licenses treating a shared inbox
  // published there as that person's contact.
  out.leaders = dedupPeople.filter((p) => /founder|ceo|cto|coo|cmo|director|owner|chair|president|managing|partner|head|proprietor/i.test(p.role || "")).slice(0, 6);
  const best = all.find((x) => score(x) >= 3) || null;
  out.best_email = best ? best.email : null;
  out.best_surface = best ? best.surface : null;
  const namedPerson = dedupPeople.find((x) => x.role) || dedupPeople[0] || null;
  out.tier = !best ? "none"
    : best.person ? "founder_named"
    : best.role ? (namedPerson && best.same_domain ? "role_named" : "role_domain")
    : best.same_domain ? "personal_domain" : "personal_freemail";
  out.founder_name = best?.person || (namedPerson?.name ?? null);
  out.founder_role = best?.person_role || (namedPerson?.role ?? null);
  out.new_vs_pass1 = (out.tier === "founder_named" || out.tier.startsWith("personal")) && row.method !== "scraped_direct";
  return out;
}

function parseCsv(path) {
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  const hdr = lines[0].split(",");
  return lines.slice(1).map((l) => {
    // Fields are written by our own exporter; quoted fields may contain commas.
    const vals = []; let cur = ""; let q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === "," && !q) { vals.push(cur); cur = ""; }
      else cur += ch;
    }
    vals.push(cur);
    return Object.fromEntries(hdr.map((h, i) => [h, vals[i] ?? ""]));
  });
}

async function doneSet(path) {
  const s = new Set();
  if (!existsSync(path)) return s;
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of rl) { if (!line.trim()) continue; try { s.add(JSON.parse(line).domain); } catch {} }
  return s;
}

async function main() {
  const rows = parseCsv(INPUT);
  const already = await doneSet(OUTPUT);
  const todo = rows.filter((r) => !already.has(r.domain));
  console.log(`targets=${rows.length} already_done=${already.size} todo=${todo.length} conc=${CONCURRENCY}`);

  let i = 0, done = 0;
  const tally = {};
  const t0 = Date.now();
  async function worker() {
    while (i < todo.length) {
      const row = todo[i++];
      let res;
      try { res = await processDomain(row); }
      catch (e) { res = { domain: row.domain, website: row.website, error: String(e.message || e) }; }
      appendFileSync(OUTPUT, JSON.stringify(res) + "\n");
      tally[res.tier || "error"] = (tally[res.tier || "error"] || 0) + 1;
      if (++done % 100 === 0) {
        const rate = done / ((Date.now() - t0) / 1000);
        console.log(`[${new Date().toISOString().slice(11, 19)}] ${done}/${todo.length} ${rate.toFixed(1)}/s ` +
          Object.entries(tally).map(([k, v]) => `${k}=${v}`).join(" "));
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log("\ndone:", JSON.stringify(tally));
}
if (IS_CLI) main().catch((e) => { console.error(e); process.exit(1); });
