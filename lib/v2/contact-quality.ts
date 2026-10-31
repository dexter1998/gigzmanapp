/**
 * How good a contact is (docs/lead-contact-contract.md). Pure — no database, no network — so the
 * leads API, the runner and the tests all grade an address or a number the same way.
 *
 * Emails, three tiers:
 *   1 person   — a named human: rahul@, rahul.sharma@, dr.mehta@, the site's named founder's address
 *   2 role     — an inbox that reaches a business decision: sales@, business@, owner@, director@,
 *                a small business's own gmail, and info@ / contact@ / hello@ when nothing better exists
 *   3 generic  — support / care / help / noreply / careers / hr / accounts / billing / admin /
 *                webmaster / reservations…, and info@ on a large org or next to a better address
 *
 * Phones (India first): mobile = 10 digits starting 6-9; landline = STD code + number (anything
 * starting 1-5, plus the metro codes 80 / 79 when the subscriber part looks like a landline);
 * 1800 / 1860 = toll-free. Elsewhere only E.164 is normalised and the kind is "unknown" except
 * North-American toll-free prefixes.
 */

export type EmailTier = 1 | 2 | 3;
export type EmailKind = "person" | "role" | "generic";
export type LeadEmail = { email: string; tier: EmailTier; kind: EmailKind };
export type PhoneKind = "mobile" | "landline" | "tollfree" | "unknown";
export type LeadPhone = { number: string; e164: string | null; kind: PhoneKind };

export type EmailContext = {
  businessName?: string | null;
  domain?: string | null;
  /** The named person on the site (founder / director), when known. */
  personName?: string | null;
  /** A big org (thousands of reviews, a chain): info@ there is a shared queue, not the owner. */
  large?: boolean;
};

const FREEMAIL = /^(gmail|googlemail|yahoo|ymail|rediffmail|rediff|hotmail|outlook|live|msn|icloud|me|aol|protonmail|proton|zoho|zohomail|yandex|mail|gmx)\.[a-z.]+$/;

/** Never a buyer: system, support, back-office and recruiting inboxes. */
const GENERIC = new Set([
  "noreply", "no-reply", "no_reply", "donotreply", "do-not-reply", "dontreply", "mailer-daemon", "postmaster", "bounce", "bounces",
  "support", "supports", "care", "customercare", "customer-care", "customer.care", "customersupport", "customerservice", "customer",
  "customers", "help", "helpdesk", "helpline", "service", "services", "servicedesk", "cs", "cx",
  "careers", "career", "jobs", "job", "hr", "hrd", "humanresources", "recruit", "recruitment", "recruiting", "recruiter", "hiring",
  "talent", "resume", "resumes", "cv", "internship", "internships", "placement", "placements",
  "accounts", "account", "accounting", "billing", "finance", "invoice", "invoices", "payments", "payment", "payable", "receivable", "tax", "gst",
  "admin", "administrator", "webmaster", "web", "website", "it", "tech", "techsupport", "itsupport", "hostmaster", "root", "sysadmin",
  "privacy", "legal", "compliance", "abuse", "grievance", "grievances", "nodal", "dpo", "security", "complaint", "complaints", "feedback",
  "newsletter", "news", "notifications", "notification", "alerts", "alert", "updates", "unsubscribe",
  "orders", "order", "returns", "refunds", "shipping", "dispatch", "tracking", "delivery",
  "reservations", "reservation", "frontdesk", "front.desk", "reception", "guestrelations", "guest", "guests", "fo", "events",
  "press", "media", "pr", "investor", "investors", "ir", "share", "shareholders", "cs.investor",
  "test", "demo", "example", "user", "dmarc", "quarantine", "rua", "ruf", "reports", "report", "spam", "daemon", "system",
]);

/** Inboxes that reach someone who can say yes. */
const DECISION = new Set([
  "sales", "sale", "business", "bd", "bdm", "biz", "bizdev", "businessdevelopment", "partnerships", "partnership", "partner", "partners",
  "owner", "owners", "proprietor", "director", "directors", "ceo", "cfo", "coo", "cto", "cmo", "md", "founder", "founders", "cofounder",
  "co-founder", "principal", "management", "manager", "gm", "generalmanager", "marketing", "growth", "purchase", "purchases", "purchasing",
  "procurement", "sourcing", "buying", "vendor", "vendors", "corporate", "alliances", "deals", "trade", "export", "exports", "import",
  "wholesale", "franchise", "head", "president", "chairman", "operations", "ops", "admissions", "projects", "studio", "design",
  "banquet", "banquets", "catering", "investments", "investment", "invest", "communications", "corporatesales", "enterprise", "b2b",
]);

/** First-contact inboxes: decent on a small business, a queue on a big one. */
const FRONT = new Set(["info", "infos", "information", "contact", "contacts", "contactus", "contact-us", "enquiry", "enquiries", "inquiry",
  "inquiries", "hello", "hi", "hey", "office", "mail", "email", "team", "desk", "query", "queries", "connect", "reach", "reachus", "ask", "talk", "write", "mailus", "general", "home", "main"]);

/** Words that look like a name to the shape test but are inbox words or business words. */
const NOT_A_NAME = new Set([...GENERIC, ...DECISION, ...FRONT, "clinic", "dental", "hospital", "hotel", "hotels", "group", "india", "global",
  "official", "store", "shop", "online", "studio", "agency", "realty", "realtors", "estate", "properties", "builders", "infra", "pvt", "ltd",
  "solutions", "services", "tours", "travels", "travel", "enterprises", "traders", "industries", "foods", "cafe", "restaurant", "bakery",
  "salon", "spa", "academy", "school", "institute", "college", "labs", "care", "health", "pharma", "medical", "consulting", "consultants",
  "digital", "media", "creative", "marketing", "tech", "technologies", "systems", "software", "infotech", "exports", "imports", "jewellers",
  "jewellery", "fashion", "boutique", "interiors", "designs", "events", "photography", "law", "legal", "associates", "partners", "chambers"]);

const words = (s: string | null | undefined) => (s ?? "").toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3);
const hasVowel = (w: string) => /[aeiouy]/.test(w);
const nameLike = (w: string) => /^[a-z]{3,14}$/.test(w) && hasVowel(w) && !NOT_A_NAME.has(w);

/** Generic TLDs a business address actually uses (every 2-letter country code is accepted as is). */
const GTLDS = new Set(("com net org edu gov mil int info biz name pro mobi asia tel travel jobs coop aero museum " +
  "app dev io ai tech online site store shop xyz club live life world today agency studio digital media solutions services group company " +
  "global email cloud space website web host network systems software consulting design marketing finance capital ventures partners law legal " +
  "health care clinic dental doctor hospital fitness yoga salon spa beauty fashion style clothing jewelry hotel restaurant cafe kitchen food " +
  "catering events wedding photography realty properties estate homes house construction builders immo education school academy institute " +
  "university college training coach auto cars car repair motors bike travel tours holiday vacations flights insurance bank money tax " +
  "accountant accountants financial fund investments energy solar green eco farm garden pet pets vet art gallery music film video tv news " +
  "blog press inc ltd llc gmbh co ngo ong foundation charity church community city london nyc berlin paris tokyo dubai bharat india").split(" "));

/** One edit apart ("contect" for "contact", "infoo" for "info"): a misspelt inbox word, not a name. */
function nearInboxWord(w: string): boolean {
  if (w.length < 4) return false;
  const close = (x: string) => {
    if (Math.abs(x.length - w.length) > 1 || x.length < 4) return false;
    let i = 0, j = 0, edits = 0;
    while (i < w.length && j < x.length) {
      if (w[i] === x[j]) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (w.length > x.length) i++; else if (x.length > w.length) j++; else { i++; j++; }
    }
    return edits + (w.length - i) + (x.length - j) <= 1;
  };
  for (const set of [FRONT, GENERIC, DECISION]) for (const x of set) if (close(x)) return true;
  return false;
}

/**
 * A scraped address cleaned or dropped (production test I-10: "u003einfo@…", DMARC report
 * mailboxes, "example@gmail.com" and image file names were shown as leads' emails, some as tier 1).
 */
export function cleanEmail(raw: string | null | undefined): string | null {
  let e = (raw ?? "").trim().toLowerCase();
  e = e.replace(/^(mailto:|u003e|u003c|%20|>|<)+/g, "").replace(/(u003c|u003e|%20)+$/g, "").replace(/^[^a-z0-9]+/, "");
  const m = /^([a-z0-9._%+-]+)@([a-z0-9-]+(?:\.[a-z0-9-]+)+)$/.exec(e);
  if (!m) return null;
  const [, local, host] = m;
  const tld = host.split(".").pop()!;
  if (!/^[a-z]{2,24}$/.test(tld) || /^(png|jpe?g|gif|webp|svg|ico|js|css|pdf|php|html?|mp4|woff2?)$/.test(tld)) return null;
  // Every 2-letter TLD is a country; longer ones must be real ("dfesyds@ysfbbufslb.dfo" was an
  // obfuscated address shown as a tier-1 email).
  if (tld.length > 2 && !GTLDS.has(tld)) return null;
  if (/(^|[._-])(dmarc|quarantine|rua|ruf|postmaster|mailer-daemon|bounce[s]?|abuse)([._-]|$)/.test(local) || /dmarc|sentry|wixpress|example\.(com|org|net)/.test(host)) return null;
  if (/^(example|test|yourname|your\.?email|name|email|user|username|someone|abc|xyz)$/.test(local)) return null;
  if (/^[0-9a-f]{12,}$/.test(local.replace(/[._-]/g, ""))) return null;
  return `${local}@${host}`;
}

/** One address, graded on its own (the list grader below adjusts front-desk inboxes). */
export function tierEmail(email: string, ctx: EmailContext = {}): LeadEmail {
  const addr = email.trim().toLowerCase();
  const [rawLocal = "", host = ""] = addr.split("@");
  const local = rawLocal.replace(/\+.*$/, "");
  const bare = local.replace(/[0-9]+$/, "").replace(/^[0-9]+/, "");
  const segs = bare.split(/[._-]+/).filter(Boolean);
  const free = FREEMAIL.test(host);
  const label = (ctx.domain ?? (free ? "" : host)).toLowerCase().replace(/^www\./, "").split(".")[0] ?? "";
  const bizWords = new Set([...words(ctx.businessName), ...(label.length >= 3 ? [label] : [])]);
  // The site's "person" is sometimes the business itself ("Unitown Realty"): only real name words count.
  const personWords = words(ctx.personName).filter((w) => !bizWords.has(w) && !NOT_A_NAME.has(w));
  const out = (tier: EmailTier, kind: EmailKind): LeadEmail => ({ email: addr, tier, kind });

  if (!local || !host) return out(3, "generic");
  if (GENERIC.has(local) || GENERIC.has(bare) || segs.some((s) => GENERIC.has(s) && !nameLike(segs.find((x) => x !== s) ?? ""))) {
    // "support.team@", "hr-india@", "accounts2@" — but "rahul.hr@" keeps the person.
    if (!(segs.length >= 2 && segs.some((s) => personWords.includes(s)))) return out(3, "generic");
  }
  if (personWords.length && (personWords.some((w) => bare.includes(w)))) return out(1, "person");
  if (segs[0] === "dr" && segs.length >= 2 && segs.slice(1).some(nameLike)) return out(1, "person");
  if (DECISION.has(bare) || segs.some((s) => DECISION.has(s))) return out(2, "role");
  if (FRONT.has(bare) || segs.every((s) => FRONT.has(s))) return ctx.large ? out(3, "generic") : out(2, "role");
  // The business's own name as the inbox ("unitownrealty@gmail.com", "mistrydental@") — whoever
  // reads that is usually the owner of a small business.
  const glued = bare.replace(/[._-]/g, "");
  if ([...bizWords].some((w) => w.length >= 4 && glued.includes(w))) return out(2, "role");
  // firstname.lastname / first_last: two name-shaped parts.
  if (segs.length >= 2 && segs.length <= 3 && segs.every((s) => /^[a-z]+$/.test(s)) && segs.filter(nameLike).length >= 2 && segs.some((s) => s.length >= 4)) return out(1, "person");
  // A misspelt inbox word ("contect@") is that inbox, not a person.
  if (segs.length === 1 && nearInboxWord(bare)) return out(2, "role");
  // A single word ("rahul@", "trademark@", "bangalore@", "friends@") is a person only when the site
  // names that person — the shape alone made cities and departments tier 1 (re-test). Without a
  // name on the site it is some inbox at the business: a role.
  if (segs.length === 1 && nameLike(bare) && bare.length <= 12) return personWords.some((w) => w === bare || bare.startsWith(w)) ? out(1, "person") : out(2, "role");
  if (segs.length === 2 && segs[0].length === 1 && nameLike(segs[1])) return personWords.includes(segs[1]) ? out(1, "person") : out(2, "role");
  // Anything else (initials, codes like "ban.tch@") is some inbox at the business: a role.
  return out(2, "role");
}

/**
 * A lead's addresses graded together: de-duplicated, front-desk inboxes demoted to tier 3 when the
 * list also holds a person or decision inbox, sorted tier 1 → 3 (stable within a tier).
 */
export function tierEmails(emails: Array<string | null | undefined>, ctx: EmailContext = {}): LeadEmail[] {
  const seen = new Set<string>();
  const graded: LeadEmail[] = [];
  for (const e of emails) {
    const addr = cleanEmail(e);
    if (!addr || seen.has(addr)) continue;
    seen.add(addr);
    graded.push(tierEmail(addr, ctx));
  }
  const better = graded.some((g) => g.kind === "person" || (g.tier === 2 && !FRONT.has(g.email.split("@")[0].replace(/[0-9]+$/, ""))));
  const adjusted = graded.map((g) => (better && g.tier === 2 && FRONT.has(g.email.split("@")[0].replace(/[0-9]+$/, "")) ? { ...g, tier: 3 as EmailTier, kind: "generic" as EmailKind } : g));
  return adjusted.map((g, i) => ({ g, i })).sort((a, b) => a.g.tier - b.g.tier || a.i - b.i).map((x) => x.g);
}

// ---------------------------------------------------------------- phones

/** Two-digit STD codes (metros); everything else is shown with a 3-digit code. */
const METRO_STD = new Set(["11", "20", "22", "33", "40", "44", "79", "80"]);

function formatIndian(national: string, kind: PhoneKind): string {
  if (kind === "mobile") return `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
  if (kind === "tollfree") return national.length === 11 ? `${national.slice(0, 4)} ${national.slice(4, 7)} ${national.slice(7)}` : national;
  const std = METRO_STD.has(national.slice(0, 2)) ? 2 : 3;
  const rest = national.slice(std);
  return `0${national.slice(0, std)} ${rest.length === 8 ? `${rest.slice(0, 4)} ${rest.slice(4)}` : rest}`;
}

/** One raw number as written anywhere (listing, site, footer). `country` is the lead's (default IN). */
export function classifyPhone(raw: string | null | undefined, country = "IN"): LeadPhone | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  const plus = text.startsWith("+") || text.startsWith("00");
  let d = text.replace(/\D/g, "");
  if (text.startsWith("00")) d = d.replace(/^00/, "");
  if (d.length < 6 || d.length > 15) return { number: text, e164: null, kind: "unknown" };

  const india = country.toUpperCase() === "IN" && (!plus || d.startsWith("91"));
  if (!india) {
    const e164 = plus && d.length >= 8 ? `+${d}` : null;
    const tollfree = e164 ? /^1(800|888|877|866|855|844|833)\d{7}$/.test(d) : /^(1)?(800|888|877|866|855|844|833)\d{7}$/.test(d);
    return { number: text, e164, kind: tollfree ? "tollfree" : "unknown" };
  }

  // Toll-free first: 1800 / 1860 numbers, with or without a leading 0 / +91.
  const tf = d.replace(/^(91|0)(?=18[06]0)/, "");
  if (/^18[06]0\d{6,7}$/.test(tf)) return { number: formatIndian(tf, "tollfree"), e164: null, kind: "tollfree" };

  let national: string | null = null;
  let trunk = false;
  if (d.length === 12 && d.startsWith("91")) national = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) { national = d.slice(1); trunk = true; }
  else if (d.length === 10) national = d;
  else if (d.length === 13 && d.startsWith("910")) national = d.slice(3);
  if (!national || !/^[1-9]\d{9}$/.test(national)) return { number: text, e164: null, kind: "unknown" };

  // "080 4141 4141" / "(079) 2656 1234": a short first group after a trunk 0 is an STD code.
  const grouped = /^\(?0?(\d{2,4})\)?[\s-]/.exec(text.replace(/^\+91[\s-]*/, ""));
  const stdGroup = trunk && grouped && grouped[1].length <= 4 && national.startsWith(grouped[1].replace(/^0/, ""));
  let kind: PhoneKind;
  if (/^[1-5]/.test(national)) kind = "landline";
  else if (stdGroup) kind = "landline";
  // Bangalore 080 and Ahmedabad 079 numbers begin with 8 / 7 like mobiles; their subscriber part
  // starts 2-4 (or 6x for the private operators in Bangalore). Best-effort: unknown would lose the
  // call button, so these are tagged landline — never offered for WhatsApp.
  else if (/^80[2346]/.test(national) || /^79[234]/.test(national)) kind = "landline";
  else kind = "mobile";
  return { number: formatIndian(national, kind), e164: `+91${national}`, kind };
}

/** Every number a lead has, de-duplicated by e164 (or digits), mobiles first. */
export function classifyPhones(raws: Array<string | null | undefined>, country = "IN"): LeadPhone[] {
  const seen = new Set<string>();
  const out: LeadPhone[] = [];
  for (const r of raws) {
    const p = classifyPhone(r, country);
    if (!p) continue;
    const key = p.e164 ?? p.number.replace(/\D/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  const order: Record<PhoneKind, number> = { mobile: 0, landline: 1, tollfree: 2, unknown: 3 };
  return out.map((p, i) => ({ p, i })).sort((a, b) => order[a.p.kind] - order[b.p.kind] || a.i - b.i).map((x) => x.p);
}

/** The number to WhatsApp: the best mobile's e164, never a landline. */
export const whatsappOf = (phones: LeadPhone[]): string | null => phones.find((p) => p.kind === "mobile" && p.e164)?.e164 ?? null;

/** The raw number to dial when one is picked automatically: best mobile, else the first known. */
export function bestPhone(raws: Array<string | null | undefined>, country = "IN"): string | null {
  const list = raws.filter((r): r is string => !!r && !!r.trim());
  const ranked = classifyPhones(list, country);
  const top = ranked[0];
  if (!top) return list[0] ?? null;
  return list.find((r) => { const p = classifyPhone(r, country); return p && (p.e164 ?? p.number) === (top.e164 ?? top.number); }) ?? list[0];
}
