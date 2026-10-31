/**
 * Site extras — the things a seller can see on a company's own website without logging in
 * (2026-10-22). Each extractor is a plain function over HTML the Qualifier already has; network
 * reads are few and small (the services page, the blog index, the home headers, one or two JS
 * bundles — capped by a per-site budget, 6s each) plus a TLS handshake and three DNS lookups.
 *
 *   forms        what their enquiry/booking forms post to (a mailto: or a dead form loses leads)
 *   booking      booking widgets OR the site's own booking form — a site with its own booking
 *                form is NEVER "no online booking" (product rule)
 *   secrets      keys the site itself serves publicly (see the ethical rule below)
 *   security     certificate expiry, missing security headers, old CMS version
 *   email DNS    who hosts their mail, SPF, DMARC
 *   content      blog freshness, SEO basics on the home page
 *   state        coming soon / press page / certifications / exporter
 *   ecommerce    Shopify app fingerprints (reviews, email, chat, checkout)
 *   offerings    what they sell, as named on their services/products page — the default fact
 *
 * Nothing is inferred beyond what the page shows: a signal that could not be read is ABSENT,
 * never false. A signal is only set false when the page was readable and the thing is not there.
 *
 * ETHICAL RULE for exposed secrets: detection runs only on what the site already serves to every
 * visitor (its HTML and same-origin JS). A found value is never stored, logged or used — only its
 * type, the URL it was served from and its first 4 characters are kept, so the business can be
 * told to rotate it.
 */

import { connect } from "node:tls";
import { lookup, Resolver } from "node:dns/promises";
import { isIP } from "node:net";
import { fetchPage, safeFetch, htmlToText } from "../net";

export type SiteExtra = { facts: Record<string, unknown>; signals: Record<string, boolean>; notes: Record<string, string> };
export type SitePage = { group: string; url: string; html: string };
export type ExposedSecret = { type: string; where: string; masked: string };

const TIMEOUT = 6000;
const DAY = 86_400_000;

const sameSite = (a: URL, b: URL) => a.hostname.replace(/^www\./, "") === b.hostname.replace(/^www\./, "");
const strip = (html: string) => html.replace(/<!--[\s\S]*?-->/g, " ");
/** The page had readable content — negative signals are only claimed on such a page. */
const readable = (html: string) => htmlToText(html, 2000).length > 300;

function links(html: string, base: string): Array<{ url: URL; text: string }> {
  const b = new URL(base);
  const out: Array<{ url: URL; text: string }> = [];
  for (const m of strip(html).matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const u = new URL(m[1].replace(/&amp;/g, "&"), b);
      if (/^https?:$/.test(u.protocol)) out.push({ url: u, text: htmlToText(m[2], 80) });
    } catch { /* bad href */ }
  }
  return out;
}

async function getText(url: string, maxBytes = 1_500_000): Promise<{ url: string; status: number; headers: Headers; body: string } | null> {
  try {
    const res = await safeFetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
    const reader = res.body?.getReader();
    let body = "";
    let bytes = 0;
    const dec = new TextDecoder();
    while (reader && maxBytes > 0) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      body += dec.decode(value, { stream: true });
      if (bytes > maxBytes) { await reader.cancel(); break; }
    }
    if (reader && maxBytes === 0) await reader.cancel().catch(() => undefined);
    return { url: res.url, status: res.status, headers: res.headers, body };
  } catch { return null; }
}

// ===================================================================================== forms

export type FormBackend = "service" | "mailto" | "none" | "own" | "unknown";
export type FormInfo = { page: string; kind: "enquiry" | "booking" | "newsletter" | "search" | "login" | "other"; backend: FormBackend; via: string | null };

/** Known form handlers: in a form's action, its markup, or (for script embeds) anywhere on the page. */
const HANDLERS: Array<[string, RegExp]> = [
  ["contact_form_7", /wpcf7|contact-form-7/i],
  ["wp_ajax", /admin-ajax\.php|admin-post\.php|wp-json\//i],
  ["wpforms", /wpforms/i],
  ["gravity_forms", /gform_|gravityforms/i],
  ["elementor", /elementor-form/i],
  ["ninja_forms", /ninja-forms|nf-form/i],
  ["formidable", /frm_form|formidable/i],
  ["fluent_forms", /fluentform|fluent_form/i],
  ["hubspot", /hsforms|hs-form|hbspt\.forms|forms\.hubspot\.com|js\.hsforms\.net/i],
  ["formspree", /formspree\.io/i],
  ["netlify", /data-netlify|netlify-honeypot|\bnetlify\b(?=[\s>])/i],
  ["getform", /getform\.io/i],
  ["basin", /usebasin\.com/i],
  ["formsubmit", /formsubmit\.co/i],
  ["web3forms", /web3forms\.com/i],
  ["zoho_forms", /forms\.zohopublic\.|zfrmz\.|crm\.zoho\.(?:com|in)\/crm\/WebToLead|webtolead/i],
  ["salesforce", /webto\.salesforce\.com|servlet\.WebToLead/i],
  ["google_forms", /docs\.google\.com\/forms|forms\.gle\//i],
  ["typeform", /typeform\.com|data-tf-widget|data-tf-live/i],
  ["jotform", /jotform\.(?:com|me)|jotfor\.ms/i],
  ["tally", /tally\.so\/(?:r|embed)/i],
  ["wix", /wixui-form|wix-forms|static\.parastorage\.com[^"']*form/i],
  ["squarespace", /sqs-block-form|squarespace-form|form-wrapper[^"']*sqs/i],
  ["shopify_contact", /form_type["']?\s*(?:value=)?["']?contact|\/contact#contact_form/i],
  ["mailchimp", /list-manage\.com\/subscribe|mc-embedded-subscribe/i],
  ["pipedrive", /webforms\.pipedrive\.com/i],
  ["freshworks", /freshsales|myfreshworks\.com\/crm|fw-form/i],
];
/** A form whose submit is wired by a framework handler that static HTML can't show. */
const JS_FRAMEWORK = /id=["']__next["']|__NEXT_DATA__|\/_next\/static|data-reactroot|id=["']root["']|__nuxt|data-v-[0-9a-f]{6,}|ng-version=|data-svelte|astro-island|wire:submit|x-on:submit|@submit|v-on:submit|onsubmit=/i;

const SUBMIT_JS = /\$\.(?:ajax|post)|\bfetch\(|XMLHttpRequest|axios|jquery|\.submit\(|addEventListener\(\s*["']submit|data:text\/javascript;base64|\.validate\(/i;
const BOOKING_FIELD = /\b(appointment|booking|book[\s_-]?(?:a|an|now|your)|reservation|reserve|preferred[\s_-]?(?:date|time|slot)|time[\s_-]?slot|check[\s_-]?in|visit[\s_-]?date|pick[\s_-]?up[\s_-]?date|schedule[\s_-]?(?:a|your)?[\s_-]?(?:call|visit|demo|consult))/i;
const DATE_INPUT = /<input\b[^>]*type\s*=\s*["']?(date|time|datetime-local)\b/i;
const DATE_NAME = /<(?:input|select)\b[^>]*(?:name|id|placeholder)\s*=\s*["'][^"']*\b(date|time|slot)\b[^"']*["']/i;

function formKind(form: string): FormInfo["kind"] {
  const f = form.toLowerCase();
  if (/type\s*=\s*["']?password/.test(f)) return "login";
  if (/role\s*=\s*["']search|name\s*=\s*["'](?:s|q|search|query|keyword)["']|type\s*=\s*["']?search|action\s*=\s*["'][^"']*\/search/.test(f)) return "search";
  const dated = (DATE_INPUT.test(form) || DATE_NAME.test(form)) && !/birth|dob\b/i.test(form);
  if (dated || BOOKING_FIELD.test(htmlToText(form, 3000)) || BOOKING_FIELD.test(f.match(/(?:name|id|class)\s*=\s*["'][^"']*["']/g)?.join(" ") ?? "")) {
    if (dated || /<(input|select|textarea)\b/i.test(form)) return "booking";
  }
  const fields = (f.match(/<(input|textarea|select)\b[^>]*>/g) ?? []).filter((x) => !/type\s*=\s*["']?(hidden|submit|button|checkbox|radio)/.test(x));
  if (/<textarea\b/.test(f) || fields.length >= 3 || /name\s*=\s*["'][^"']*(phone|mobile|tel|message|enquiry|inquiry|subject|company)/.test(f)) return "enquiry";
  if (fields.length <= 2 && /type\s*=\s*["']?email|name\s*=\s*["'][^"']*email|newsletter|subscribe/.test(f)) return "newsletter";
  return "other";
}

/** Every <form> on one page, classified by what it is and where it sends. */
export function readForms(html: string, pageUrl: string): FormInfo[] {
  const clean = strip(html);
  const page = new URL(pageUrl);
  const framework = JS_FRAMEWORK.test(clean);
  const out: FormInfo[] = [];
  for (const m of clean.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
    const attrs = m[1];
    const form = m[0];
    const kind = formKind(form);
    const action = (attrs.match(/\baction\s*=\s*["']([^"']*)["']/i)?.[1] ?? attrs.match(/\baction\s*=\s*([^\s>]+)/i)?.[1] ?? "").trim();
    const handler = HANDLERS.find(([, re]) => re.test(form))?.[0] ?? null;
    let backend: FormBackend;
    if (/^mailto:/i.test(action)) backend = "mailto";
    else if (handler) backend = "service";
    else if (!action || action === "#" || /^javascript:/i.test(action) || action === "?") {
      // "none" needs proof that nothing on the page can submit it: any script that could post the
      // form (jQuery, fetch, XHR, a script naming the form's id) makes it unknown, not dead.
      const id = attrs.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1];
      const js = framework || /\b(onsubmit|data-action|data-ajax|ajax)\b/i.test(attrs) || SUBMIT_JS.test(clean) || (!!id && clean.includes(`#${id}`)) || (!!id && clean.includes(`getElementById("${id}")`));
      backend = js ? "unknown" : "none";
    }
    else {
      try {
        const a = new URL(action, page);
        // Posting to the very page it sits on with no handler visible: their own server may read it.
        backend = sameSite(a, page) ? "own" : "service";
      } catch { backend = "unknown"; }
    }
    out.push({ page: pageUrl, kind, backend, via: handler ?? (backend === "service" ? safeHost(action, page) : null) });
  }
  // Script/iframe embeds with no <form> in the static HTML (HubSpot, Typeform, Google Forms...).
  if (!out.some((f) => f.kind === "enquiry" || f.kind === "booking")) {
    for (const [name, re] of HANDLERS) {
      if (!["hubspot", "typeform", "jotform", "google_forms", "zoho_forms", "tally", "wix", "squarespace"].includes(name)) continue;
      const embedded = new RegExp(`<(?:iframe|script|div)\\b[^>]*(?:${re.source})`, "i").test(clean);
      if (embedded) { out.push({ page: pageUrl, kind: "enquiry", backend: "service", via: name }); break; }
    }
  }
  return out;
}

function safeHost(action: string, page: URL): string | null {
  try { return new URL(action, page).hostname; } catch { return null; }
}

const BOOKING_WIDGETS: Array<[string, RegExp]> = [
  ["calendly", /calendly\.com\//i], ["practo", /practo\.com\/[^"'\s]*(?:book|doctor|clinic|dentist)|widget\.practo/i],
  ["setmore", /setmore\.com|setmore\.me/i], ["fresha", /fresha\.com\//i], ["zocdoc", /zocdoc\.com\//i],
  ["simplybook", /simplybook\.(?:me|it|asia)/i], ["appointy", /appointy\.com/i], ["booksy", /booksy\.com\//i],
  ["acuity", /acuityscheduling\.com|as\.me\//i], ["cal_com", /\bcal\.com\/[a-z0-9]|app\.cal\.com/i],
  ["hubspot_meetings", /meetings\.hubspot\.com|meetings-[a-z0-9]+\.hubspot\.com/i],
  ["square_appointments", /squareup\.com\/appointments|square\.site\/book/i], ["vagaro", /vagaro\.com\//i],
  ["opentable", /opentable\.(?:com|co\.in)\/(?:r|restref|widget)/i], ["dineout", /dineout\.co\.in/i],
  ["bookingcom_engine", /hotelbooking|bookingengine|booking-engine|ezee(?:absolute|centrix)|staah\.net|simplotel/i],
  ["zoho_bookings", /zohobookings\.(?:com|in)|bookings\.zoho/i], ["mindbody", /mindbodyonline\.com/i],
  ["amelia", /amelia-booking|ameliabooking/i], ["bookly", /bookly-form|bookly-js/i],
];

export function bookingWidgets(html: string): string[] {
  return BOOKING_WIDGETS.filter(([, re]) => re.test(html)).map(([n]) => n);
}

/** Can a visitor book online here? A widget, or the site's own booking form — both count. */
export function bookingCapable(html: string, pageUrl = "https://example.invalid/"): boolean {
  return bookingWidgets(html).length > 0 || readForms(html, pageUrl).some((f) => f.kind === "booking");
}

function formsResult(pages: SitePage[], out: SiteExtra): void {
  const forms = pages.flatMap((p) => readForms(p.html, p.url));
  const widgets = [...new Set(pages.flatMap((p) => bookingWidgets(p.html)))];
  const leads = forms.filter((f) => f.kind === "enquiry" || f.kind === "booking");
  out.facts.forms = forms.filter((f) => f.kind !== "search" && f.kind !== "login").map((f) => ({ kind: f.kind, backend: f.backend, via: f.via, page: f.page }));
  if (widgets.length) out.facts.booking_widgets = widgets;
  const rank: FormBackend[] = ["service", "own", "unknown", "mailto", "none"];
  if (leads.length) out.facts.form_backend = rank.find((r) => leads.some((f) => f.backend === r));
  // "No form" is only claimed when a contact page was read too: home pages often open the form in a
  // JS popup or keep it on /contact.
  const anyReadable = pages.some((p) => p.group !== "home" && readable(p.html));
  if (leads.length || anyReadable) out.signals.has_enquiry_form = leads.length > 0;
  if (leads.length) {
    const lost = leads.every((f) => f.backend === "mailto" || f.backend === "none");
    out.signals.form_no_backend = lost;
    if (lost) out.notes.form_no_backend = `${leads[0].backend === "mailto" ? "form opens the visitor's mail app (mailto:)" : "form has no action and no form handler"} on ${leads[0].page}`;
  }
  const bookingForm = leads.some((f) => f.kind === "booking");
  if (bookingForm || widgets.length || anyReadable) out.signals.has_booking_form = bookingForm;
  if (bookingForm || widgets.length || anyReadable) out.signals.booking_capable = bookingForm || widgets.length > 0;
}

// ===================================================================================== secrets

const SECRET_PATTERNS: Array<{ type: string; re: RegExp; group?: number; ok?: (v: string, ctx: string) => boolean }> = [
  { type: "aws_access_key_id", re: /\b(AKIA[0-9A-Z]{16})\b/g, ok: (v) => !/EXAMPLE|XXXX|0000000/.test(v) },
  { type: "stripe_secret_key", re: /\b((?:sk|rk)_live_[0-9a-zA-Z]{20,})\b/g },
  { type: "razorpay_key_secret", re: /(?:key_?secret|razorpay_?secret|rzp_?secret|keySecret)\\?["']?\s*[:=]\s*\\?["']([A-Za-z0-9]{20,32})\\?["']/gi, ok: (_v, ctx) => /rzp_(?:live|test)_[A-Za-z0-9]{10,}/.test(ctx) },
  { type: "private_key", re: /(-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----(?:\\n|\s)+[A-Za-z0-9+/=\\\s]{200,})/g },
  { type: "google_service_account", re: /\\?["']type\\?["']\s*:\s*\\?["']service_account\\?["'][\s\S]{0,600}?\\?["']private_key(?:_id)?\\?["']\s*:\s*\\?["']([^"'\\]{8,})/g },
  { type: "google_oauth_client_secret", re: /\b(GOCSPX-[A-Za-z0-9_-]{24,})/g },
  { type: "sendgrid_api_key", re: /\b(SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43})\b/g },
  { type: "smtp_password", re: /(?:smtp_?pass(?:word)?|mail_?pass(?:word)?|email_?password|smtpPassword|SMTP_PASSWORD)\\?["']?\s*[:=]\s*\\?["']([^"'\\\s]{4,64})\\?["']/gi, ok: (v) => credValue(v) },
  { type: "hardcoded_password", re: /\b(?:password|passwd|pwd|admin_?password|db_?password|adminPass|user_?password|api_?secret|secret_?key|client_?secret)\\?["']?\s*[:=]\s*\\?["']([^"'\\\s]{4,64})\\?["']/gi, ok: (v) => credValue(v) },
  { type: "credentials_in_url", re: /\b(?:https?|ftp|mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|amqps?|smtps?):\/\/([A-Za-z0-9._%-]{2,40}:[^\s@/"'`<>{}$]{3,64})@[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi,
    ok: (v) => { const i = v.indexOf(":"); const u = v.slice(0, i), p = v.slice(i + 1); return credValue(p) && !/^(pass(word)?|pwd|secret)$/i.test(p) && !/^(user(name)?|your[_-]?user|example|foo)$/i.test(u); } },
];

/** A literal that is an actual credential, not a UI label, a placeholder or a field name. */
function credValue(v: string): boolean {
  if (/^(\*+|x+|\.+|-+|null|undefined|true|false|none|required|string|text|password\d?|current-password|new-password|one-time-code|changeme|your[_-]?password|placeholder)$/i.test(v)) return false;
  if (/\$\{|\{\{|%s|<|^\$|^process\.env|^env\(|^import\.meta/i.test(v)) return false;
  // UI labels and i18n strings are letters only ("Password", "Passwort"); a real secret has a digit or symbol.
  if (/^[A-Za-z]+$/.test(v)) return false;
  if (/^[a-z]+(?:[-_.][a-z]+)+$/i.test(v)) return false; // field names: "user-password", "form.password"
  return !/^(.)\1+$/.test(v);
}

function mask(v: string): string { return `${v.slice(0, 4)}…`; }

/** Secrets in one served body. Returns only type + where + first 4 chars — never the value. */
export function findSecrets(body: string, where: string): ExposedSecret[] {
  const out: ExposedSecret[] = [];
  const seen = new Set<string>();
  for (const p of SECRET_PATTERNS) {
    for (const m of body.matchAll(p.re)) {
      const v = m[p.group ?? 1];
      if (!v) continue;
      const ctx = body.slice(Math.max(0, (m.index ?? 0) - 400), (m.index ?? 0) + 400);
      if (p.ok && !p.ok(v, ctx)) continue;
      const key = `${p.type}:${mask(v)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ type: p.type, where, masked: mask(v) });
      if (out.length >= 10) return out;
    }
  }
  return out;
}

/** Same-origin script bundles, app code first (WordPress core/plugins and jQuery are vendor code). */
export function bundleUrls(html: string, base: string, max = 2): string[] {
  const b = new URL(base);
  const seen = new Set<string>();
  const scored: Array<[string, number]> = [];
  for (const m of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+\.m?js(?:\?[^"']*)?)["']/gi)) {
    let u: URL;
    try { u = new URL(m[1].replace(/&amp;/g, "&"), b); } catch { continue; }
    if (!sameSite(u, b) || seen.has(u.pathname)) continue;
    seen.add(u.pathname);
    const p = u.pathname.toLowerCase();
    if (/wp-includes|jquery|bootstrap|polyfill|webpack-runtime|framework-|\/runtime[.-]|gtag|analytics|recaptcha|lazysizes|swiper|slick|owl\.carousel|fontawesome|modernizr/.test(p)) continue;
    const score = /_app|layout|\/app[.-]|main[.-]|index[.-]|bundle|\/pages\/|config|env|wp-content\/themes/.test(p) ? 2 : /wp-content\/plugins/.test(p) ? 0 : 1;
    scored.push([u.href, score]);
  }
  return scored.sort((a, c) => c[1] - a[1]).slice(0, max).map(([u]) => u);
}

// ===================================================================================== security

function privateIp(ip: string): boolean {
  if (ip.includes(":")) { const v = ip.toLowerCase(); return v === "::1" || v === "::" || /^(fc|fd|fe80)/.test(v) || (v.startsWith("::ffff:") && privateIp(v.slice(7))); }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

/** Days until the served certificate expires (negative = expired), and whether it validates for the host. */
export async function certInfo(host: string): Promise<{ daysLeft: number; validTo: string; authorized: boolean; error: string | null } | null> {
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length || addrs.some((a) => privateIp(a.address))) return null;
  return new Promise((resolve) => {
    const s = connect({ host: addrs[0].address, port: 443, servername: host, rejectUnauthorized: false, timeout: TIMEOUT }, () => {
      const c = s.getPeerCertificate();
      const to = c?.valid_to ? Date.parse(c.valid_to) : NaN;
      const err = s.authorizationError ? String(s.authorizationError) : null;
      s.end();
      resolve(Number.isFinite(to) ? { daysLeft: Math.floor((to - Date.now()) / DAY), validTo: new Date(to).toISOString().slice(0, 10), authorized: s.authorized, error: err } : null);
    });
    s.on("error", () => resolve(null));
    s.on("timeout", () => { s.destroy(); resolve(null); });
  });
}

const SEC_HEADERS: Array<[string, string]> = [["strict-transport-security", "HSTS"], ["content-security-policy", "CSP"], ["x-frame-options", "X-Frame-Options"], ["x-content-type-options", "X-Content-Type-Options"]];

export function missingSecurityHeaders(headers: Record<string, string>): string[] {
  const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return SEC_HEADERS.filter(([k]) => {
    if (h[k]) return false;
    // frame-ancestors in a CSP does the job of X-Frame-Options.
    return !(k === "x-frame-options" && /frame-ancestors/i.test(h["content-security-policy"] ?? ""));
  }).map(([, n]) => n);
}

/** CMS + version from <meta name="generator">; outdated = WordPress < 6, Joomla < 4, Drupal < 9. */
export function cmsVersion(html: string): { cms: string; version: string; outdated: boolean } | null {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (!/name\s*=\s*["']generator["']/i.test(m[0])) continue;
    const c = m[0].match(/content\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
    const v = c.match(/\b(WordPress|Joomla!?|Drupal)\s*(?:-\s*)?v?(\d+(?:\.\d+)*)/i);
    if (!v) continue;
    const cms = v[1].replace("!", "").toLowerCase();
    const major = Number(v[2].split(".")[0]);
    const floor = cms === "wordpress" ? 6 : cms === "joomla" ? 4 : 9;
    return { cms, version: v[2], outdated: major < floor };
  }
  return null;
}

// ===================================================================================== email DNS

const TWO_PART_TLD = /\.(co|com|net|org|ac|gov|edu|gen|firm|ind)\.(in|uk|au|nz|za|sg|my|jp|br|id|th|ae|pk|bd)$/i;
export function registrableDomain(host: string): string {
  const h = host.toLowerCase().replace(/^www\./, "");
  const parts = h.split(".");
  return parts.slice(TWO_PART_TLD.test(h) ? -3 : -2).join(".");
}

export async function emailDns(domain: string): Promise<{ mx: string; mxHosts: string[]; spf: boolean | null; dmarc: boolean | null; dmarcPolicy: string | null } | null> {
  const r = new Resolver({ timeout: 4000, tries: 2 });
  const absent = (e: unknown) => ["ENODATA", "ENOTFOUND", "NXDOMAIN"].includes((e as { code?: string })?.code ?? "");
  const txt = async (name: string): Promise<string[] | null> => {
    try { return (await r.resolveTxt(name)).map((x) => x.join("")); } catch (e) { return absent(e) ? [] : null; }
  };
  const [mxRes, root, dmarc] = await Promise.all([
    r.resolveMx(domain).then((x) => x.sort((a, b) => a.priority - b.priority).map((x2) => x2.exchange.toLowerCase())).catch((e) => (absent(e) ? [] : null)),
    txt(domain),
    txt(`_dmarc.${domain}`),
  ]);
  if (mxRes === null && root === null && dmarc === null) return null;
  const hosts = mxRes ?? [];
  const all = hosts.join(" ");
  const mx = mxRes === null ? "unknown" : !hosts.length || hosts.every((h) => h === "" || h === ".") ? "none"
    : /google\.com|googlemail\.com/.test(all) ? "google" : /outlook\.com|microsoft/.test(all) ? "microsoft" : /zoho\./.test(all) ? "zoho" : "other";
  const d = dmarc?.find((t) => /^v=DMARC1/i.test(t)) ?? null;
  return {
    mx, mxHosts: hosts.filter((h) => h && h !== ".").slice(0, 3),
    spf: root === null ? null : root.some((t) => /^v=spf1/i.test(t)),
    dmarc: dmarc === null ? null : !!d,
    dmarcPolicy: d?.match(/\bp=(\w+)/i)?.[1]?.toLowerCase() ?? null,
  };
}

// ===================================================================================== content

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const MON = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

/** Every publish date a blog index shows: <time datetime>, article:published_time, JSON-LD, visible dates. */
export function pageDates(html: string): Date[] {
  const out: number[] = [];
  const push = (t: number) => { if (Number.isFinite(t) && t > Date.UTC(2000, 0, 1) && t < Date.now() + 2 * DAY) out.push(t); };
  for (const m of html.matchAll(/<time\b[^>]*datetime\s*=\s*["'](\d{4}-\d{2}-\d{2}[^"']*)["']/gi)) push(Date.parse(m[1]));
  // A blog index's own article:published_time / WebPage datePublished dates the index, not a post —
  // only JSON-LD objects that ARE posts count.
  for (const m of html.matchAll(/"@type"\s*:\s*"(?:BlogPosting|NewsArticle|Article|Posting)"[^{}]{0,800}?"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2}[^"]*)"/g)) push(Date.parse(m[1]));
  const text = htmlToText(html, 60000);
  for (const m of text.matchAll(new RegExp(`\\b${MON}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d{2})\\b`, "gi"))) push(Date.UTC(+m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], +m[2]));
  for (const m of text.matchAll(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MON}\\.?,?\\s+(20\\d{2})\\b`, "gi"))) push(Date.UTC(+m[3], MONTHS[m[2].slice(0, 3).toLowerCase()], +m[1]));
  for (const m of text.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)) push(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  // WordPress-style post permalinks /2024/03/slug.
  for (const m of html.matchAll(/href\s*=\s*["'][^"']*\/(20\d{2})\/(0[1-9]|1[0-2])\/(?:(\d{2})\/)?[a-z0-9-]{4,}/gi)) push(Date.UTC(+m[1], +m[2] - 1, m[3] ? +m[3] : 1));
  return out.map((t) => new Date(t));
}

export function blogUrlFrom(html: string, base: string): string | null {
  const b = new URL(base);
  for (const { url, text } of links(html, base)) {
    if (!sameSite(url, b) && !/^blog\./.test(url.hostname)) continue;
    const p = url.pathname.toLowerCase();
    if (/\.(pdf|jpe?g|png|zip)$/.test(p)) continue;
    if (/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(blogs?|news|insights|articles|journal|updates|stories)\/?$/.test(p) || /^blog\./.test(url.hostname) || /^(blogs?|our blog|news|insights|articles|journal)$/i.test(text.trim())) {
      return url.origin + url.pathname;
    }
  }
  return null;
}

export function seoBasics(html: string): { missing: string[] } {
  const missing: string[] = [];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (!title || !htmlToText(title).trim()) missing.push("title");
  const desc = [...html.matchAll(/<meta\b[^>]*>/gi)].find((m) => /name\s*=\s*["']description["']/i.test(m[0]));
  if (!desc || !/content\s*=\s*["'][^"']{10,}/i.test(desc[0])) missing.push("meta_description");
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!h1 || (!htmlToText(h1[1]).trim() && !/<img\b[^>]*alt\s*=\s*["'][^"']+/i.test(h1[1]))) missing.push("h1");
  if (!/<script\b[^>]*type\s*=\s*["']application\/ld\+json["']/i.test(html)) missing.push("schema_jsonld");
  return { missing };
}

// ===================================================================================== business state

const COMING = /\b(coming soon|opening soon|launching soon|launching shortly|under construction|site under maintenance|now open|grand opening|we are launching|stay tuned for our launch)\b/i;

export function comingSoon(html: string): { phrase: string; where: string } | null {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const tm = htmlToText(title).match(COMING);
  if (tm) return { phrase: tm[1], where: "title" };
  for (const m of html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)) { const hm = htmlToText(m[1]).match(COMING); if (hm) return { phrase: hm[1], where: "h1" }; }
  // Anywhere else only counts on a near-empty page — a SaaS site's "feature X coming soon" does not.
  const text = htmlToText(html, 20000);
  const am = text.length < 1500 ? text.match(COMING) : null;
  if (am) return { phrase: am[1], where: "page" };
  // "Now open" / "grand opening" in any heading is a new location, not a feature teaser.
  for (const m of html.matchAll(/<h[2-3]\b[^>]*>([\s\S]*?)<\/h[2-3]>/gi)) { const hm = htmlToText(m[1]).match(/\b(now open|grand opening|opening soon)\b/i); if (hm) return { phrase: hm[1], where: "heading" }; }
  return null;
}

export function pressUrlFrom(html: string, base: string): string | null {
  const b = new URL(base);
  for (const { url, text } of links(html, base)) {
    if (!sameSite(url, b)) continue;
    const p = url.pathname.toLowerCase();
    if (/\.(pdf|jpe?g|png|webp|mp4|zip)$/.test(p)) continue;
    if (/\/(press|newsroom|press-releases?|press-media|media-coverage|in-the-news|media|news-and-media|media-centre|media-center|news-room)(\/|$)/.test(p) || /^(press|newsroom|in the news|media|media coverage|press releases?|news & media)$/i.test(text.trim())) return url.origin + url.pathname;
  }
  return null;
}

const CERTS: Array<[string, RegExp]> = [
  ["ISO 9001", /\bISO[\s:-]*9001\b/i], ["ISO 14001", /\bISO[\s:-]*14001\b/i], ["ISO 27001", /\bISO(?:\/IEC)?[\s:-]*27001\b/i],
  ["ISO 45001", /\bISO[\s:-]*45001\b/i], ["ISO 22000", /\bISO[\s:-]*22000\b/i], ["ISO 13485", /\bISO[\s:-]*13485\b/i],
  ["FSSAI", /\bFSSAI\b/i], ["GMP", /\b(?:WHO[\s-]*)?c?GMP\b(?![\s-]*(?:platform|suite))/], ["NABH", /\bNABH\b/], ["NABL", /\bNABL\b/],
  ["CE", /\bCE[\s-]*(?:certified|certification|marked|marking|mark|approved|compliant)\b/i], ["BIS", /\b(?:BIS[\s-]*(?:certified|certification|licen[cs]e|registration|registered|approved)|ISI[\s-]*mark(?:ed)?)\b/i],
  ["HACCP", /\bHACCP\b/], ["SOC 2", /\bSOC[\s-]*2\b/], ["HIPAA", /\bHIPAA(?:[\s-]*compliant)?\b/],
];

export function certifications(text: string): { names: string[]; fssaiLicense: string | null } {
  const names = CERTS.filter(([, re]) => re.test(text)).map(([n]) => n);
  const fssai = text.match(/FSSAI[^0-9]{0,40}(\d{14})\b/i)?.[1] ?? null;
  return { names, fssaiLicense: fssai };
}

const SOFTWARE_TARGET = /^(csv|pdf|excel|xlsx?|json|xml|png|jpe?g|svg|word|docx?|google|sheets|tally|quickbooks|zoho|sap|your|the|a|any|other|multiple|various)\b/i;

export function exporterEvidence(html: string): string | null {
  const text = htmlToText(html, 40000);
  const iec = text.match(/\bIEC\s*(?:code|no\.?|number|#)?\s*[:-]?\s*([A-Z0-9]{10})\b/i);
  if (iec && /\d/.test(iec[1]) && /iec\s*(code|no|number|#|:)/i.test(iec[0])) return `IEC ${mask(iec[1])}`;
  const m = text.match(/\b(manufacturers?,?\s*(?:&|and)\s*exporters?|exporters?\s*(?:&|and)\s*(?:manufacturers?|importers?|suppliers?)|exporters? of\b|export house|we export|ships? worldwide|shipping worldwide|worldwide shipping|worldwide delivery|international shipping|global shipping|ship(?:ping)? internationally|export(?:s|ing|ed)? (?:to|in) (?:over |more than )?\d+\+? countries|export(?:s|ing|ed)? (?:to|across) [A-Z][a-z]+)/);
  if (m) {
    const target = m[1].match(/export(?:s|ing|ed)? (?:to|across) ([A-Za-z]+)/)?.[1];
    if (!target || !SOFTWARE_TARGET.test(target)) return m[1];
  }
  // Currency switcher with foreign currencies.
  const sel = html.match(/<select\b[^>]*(?:currency|localization)[^>]*>[\s\S]{0,4000}?<\/select>/i)?.[0];
  if (sel && (sel.match(/\b(USD|EUR|GBP|AUD|CAD|AED|SGD)\b/g) ?? []).length >= 2) return "currency switcher";
  return null;
}

// ===================================================================================== ecommerce

const SHOP_APPS: Array<[string, RegExp, "reviews" | "email" | "other"]> = [
  ["klaviyo", /klaviyo/i, "email"], ["omnisend", /omnisend|omnisrc/i, "email"], ["privy", /privy\.com|widget\.privy/i, "email"],
  ["mailchimp", /chimpstatic|list-manage\.com/i, "email"], ["brevo", /sendinblue|brevo\.com|sibforms/i, "email"], ["shopify_forms", /forms\.shopifyapps\.com|shopify-forms/i, "email"],
  ["seguno", /seguno/i, "email"], ["moengage", /moengage/i, "email"], ["webengage", /webengage/i, "email"], ["clevertap", /clevertap/i, "email"], ["netcore", /netcoresmartech|smartech/i, "email"],
  ["judge_me", /judge\.me|judgeme/i, "reviews"], ["yotpo", /yotpo/i, "reviews"], ["loox", /loox\.io|loox-/i, "reviews"], ["okendo", /okendo/i, "reviews"],
  ["stamped", /stamped\.io/i, "reviews"], ["reviews_io", /reviews\.io|reviewsio/i, "reviews"], ["shopify_product_reviews", /spr-badge|productreviews\.shopifycdn/i, "reviews"],
  ["fera", /fera\.ai/i, "reviews"], ["air_reviews", /air-reviews|airreviews/i, "reviews"], ["ali_reviews", /alireviews|ali-reviews/i, "reviews"],
  ["ryviu", /ryviu/i, "reviews"], ["growave", /growave|ssw-/i, "reviews"], ["kudosi_rivyo", /kudosi|rivyo/i, "reviews"], ["trustpilot", /trustpilot/i, "reviews"],
  ["smile_io", /smile\.io|sweettooth/i, "other"], ["gorgias", /gorgias/i, "other"], ["recharge", /rechargeapps|rechargecdn|recharge-/i, "other"],
  ["rebuy", /rebuyengine/i, "other"], ["whatsapp", /wati\.io|interakt|gallabox|aisensy|zoko\.io|wa\.me\/|api\.whatsapp\.com/i, "other"],
  ["shiprocket", /shiprocket/i, "other"], ["gokwik", /gokwik/i, "other"], ["razorpay_magic", /magic-checkout|razorpay.*magic/i, "other"], ["snapmint", /snapmint/i, "other"],
];

export function isShopify(html: string): boolean {
  return /cdn\.shopify\.com|Shopify\.theme|myshopify\.com|shopify-section/i.test(html);
}

export function shopApps(html: string): { apps: string[]; reviews: boolean; email: boolean; nativeNewsletter: boolean } {
  const found = SHOP_APPS.filter(([, re]) => re.test(html));
  return {
    apps: found.map(([n]) => n),
    reviews: found.some(([, , k]) => k === "reviews"),
    email: found.some(([, , k]) => k === "email"),
    // Shopify's own newsletter form feeds Shopify Email: a list exists even without an app.
    nativeNewsletter: /form_type["']?\s*(?:value=)?["']?customer|contact\[tags\][^>]*newsletter/i.test(html),
  };
}

// ===================================================================================== offerings

// A path segment that names an offerings index: "/services", "/our-products", "/dental-treatments".
const OFFER_SEG = /^(?:our-)?(?:services?|solutions?|what-we-do|offerings?|products?|treatments?|courses?|programs?|programmes?|menu|collections?|shop|catalog(?:ue)?|range|practice-areas|specialit(?:y|ies)|specialt(?:y|ies)|[a-z]+-(?:services|treatments|solutions|products|courses))$/;
const OFFER_TEXT = /^(?:our )?(services|solutions|products|treatments|courses|programs|menu|what we do|shop|collections|specialities|practice areas)$/;

export function offeringsUrlFrom(html: string, base: string): string | null {
  const b = new URL(base);
  let best: [string, number] | null = null;
  for (const { url, text } of links(html, base)) {
    if (!sameSite(url, b) || url.pathname.length <= 1 || /\.(pdf|jpe?g|png)$/i.test(url.pathname)) continue;
    const seg = url.pathname.toLowerCase().split("/").filter(Boolean);
    // "/services" (an index) beats a link whose text says "Services"; one item ("/services/seo") is neither.
    const score = seg.length === 1 && OFFER_SEG.test(seg[0]) ? 3 : seg.length <= 2 && OFFER_TEXT.test(text.toLowerCase().trim()) ? 2 : 0;
    if (score && (!best || score > best[1])) best = [url.origin + url.pathname, score];
  }
  return best?.[0] ?? null;
}

/** Offerings named by the menu: links under one offerings segment ("/solutions/crm", "/solutions/payroll"...). */
export function offeringsFromNav(html: string, base: string, max = 12): { url: string; names: string[] } | null {
  const b = new URL(base);
  const groups = new Map<string, Map<string, string>>();
  for (const { url, text } of links(html, base)) {
    if (!sameSite(url, b)) continue;
    const seg = url.pathname.toLowerCase().split("/").filter(Boolean);
    if (seg.length !== 2 || !OFFER_SEG.test(seg[0]) || seg[1] === "all") continue;
    const t = text.replace(/\s+/g, " ").trim();
    if (!offeringName(t)) continue;
    const g = groups.get(seg[0]) ?? new Map<string, string>();
    if (!g.has(t.toLowerCase())) g.set(t.toLowerCase(), t);
    groups.set(seg[0], g);
  }
  const top = [...groups.entries()].sort((x, y) => y[1].size - x[1].size)[0];
  return top && top[1].size >= 3 ? { url: `${b.origin}/${top[0]}/`, names: [...top[1].values()].slice(0, max) } : null;
}

const GENERIC = /^(why (choose|us)|our (services|products|solutions|clients|team|story|mission|vision|values|process|work|portfolio|partners|blog|courses|treatments|menu)|services|products|solutions|what we do|who we are|about( us)?|contact( us)?|get in touch|testimonials?|faqs?|frequently asked|read more|learn more|view (all|more)|follow us|newsletter|subscribe|quick links|useful links|categories|recent posts|our location|address|call us|email us|working hours|opening hours|home|menu|search|cart|my account|sign (in|up)|log ?in|connect with us|let'?s talk|get started|request a (quote|demo|call)|book (now|an appointment)|how it works|happy clients|our happy clients|what (our )?(clients|customers) say|reviews?|gallery|latest news|resources|explore|featured|shop (now|by)|new arrivals|best ?sellers?|trending|sale|collections?|thank you|welcome|hello|overview|introduction|industries( we serve)?|our expertise|expertise|features|benefits|pricing|plans)\b/i;

// One-word section names and marketing headlines ("Prevent DG Set Shutdowns", "35% OFF SOLD OUT") are not offerings.
const SECTION_WORD = /^(free|pro|enterprise|starter|premium|treatments?|clinics?|doctors?|locations?|branches|specialit(?:y|ies)|specialt(?:y|ies)|courses?|programs?|team|blog|news|clients?|past clients|our clients|partners?|careers?|projects?|portfolio|events?|media|press|awards?|certifications?|downloads?|brochures?|videos?|photos?)$/i;
const PITCH = /^(prevent|avoid|ensure|maximi[sz]e|minimi[sz]e|get|save|reduce|boost|grow|increase|improve|transform|unlock|discover|experience|join|start|stop|make|let|meet|see|why|how|what|when|where|who|trusted|join|take|ready|works?|from the)\b|\b(we|you|your|our|us|benefits|features|reviews)\b|%|\bsold out\b|\b(off|sale)\b|₹|\$\s?\d|\brs\.?\s*\d/i;
export function offeringName(t: string): boolean {
  return t.length >= 3 && t.length <= 60 && t.split(/\s+/).length <= 7 && !GENERIC.test(t) && !SECTION_WORD.test(t) && !PITCH.test(t) && /[a-z]/i.test(t) && !/[?!]$|©|@|https?:|\d{4,}|[.;]$/.test(t);
}

/** Up to 12 offering names from a services/products page: card titles first, then h2–h4. Deterministic. */
export function extractOfferings(html: string, max = 12): string[] {
  const body = strip(html).replace(/<(header|footer|nav)\b[\s\S]*?<\/\1>/gi, " ");
  const candidates: Array<[string, number, number]> = [];
  const take = (raw: string, weight: number, at: number) => {
    const t = htmlToText(raw, 120).replace(/^[^A-Za-z0-9]+/, "").replace(/^[\d.)\-–•\s]+/, "").replace(/\s*[-–|:]\s*$/, "").trim();
    if (!offeringName(t)) return;
    candidates.push([t, weight, at]);
  };
  for (const m of body.matchAll(/<(h[2-4]|a|div|span|p|strong)\b[^>]*class\s*=\s*["'][^"']*(?:card[_-]?title|service[_-]?(?:title|name|item-title|box-title)|product[_-]?(?:title|name|item-name|card__title)|grid-product__title|card__heading|product-item__title|product-block__title|woocommerce-loop-product__title|elementor-(?:heading|image-box|icon-box)-title|box-title|item-title|feature-title|course-title|treatment-title|menu-item-title)[^"']*["'][^>]*>([\s\S]{0,400}?)<\/\1>/gi)) take(m[2], 3, m.index ?? 0);
  for (const m of body.matchAll(/<(h[2-4])\b[^>]*>([\s\S]{0,400}?)<\/\1>/gi)) take(m[2], m[1].toLowerCase() === "h2" ? 1 : 2, m.index ?? 0);
  const best = new Map<string, [string, number, number]>();
  for (const c of candidates) {
    const k = c[0].toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const prev = best.get(k);
    if (!prev || c[1] > prev[1]) best.set(k, prev ? [c[0], c[1], Math.min(prev[2], c[2])] : c);
  }
  const all = [...best.values()];
  const top = Math.max(0, ...all.map((c) => c[1]));
  // Use the strongest tier present (cards beat headings) unless it is too thin to be the list.
  const tier = all.filter((c) => c[1] === top).length >= 3 ? all.filter((c) => c[1] === top) : all;
  return tier.sort((a, b) => a[2] - b[2]).slice(0, max).map((c) => c[0]);
}

const STOP = new Set("a an and the of for to in on with by at or our your we you is are be from as it its this that best top services service solutions solution company".split(" "));
const stem = (w: string) => w.replace(/ies$/, "y").replace(/(ss|sh|ch|x|z)es$/, "$1").replace(/([^s])s$/, "$1");
const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w)).map(stem);

/** How well a lead's offerings match a seller's words: share of the words found, and which offerings hit. */
export function offerMatch(offerings: string[], words: string[]): { score: number; matched: string[] } {
  const want = [...new Set(words.flatMap(tokens))];
  if (!want.length || !offerings.length) return { score: 0, matched: [] };
  const hit = new Set<string>();
  const matched: string[] = [];
  for (const o of offerings) {
    const t = new Set(tokens(o));
    const h = want.filter((w) => t.has(w));
    if (h.length) { matched.push(o); h.forEach((w) => hit.add(w)); }
  }
  return { score: Math.round((hit.size / want.length) * 100) / 100, matched };
}

// ===================================================================================== entry point

export async function readSiteExtra(input: { homeUrl: string; homeHtml: string; pages?: SitePage[]; headers?: Record<string, string>; maxRequests?: number }): Promise<SiteExtra> {
  const out: SiteExtra = { facts: {}, signals: {}, notes: {} };
  const home = input.homeUrl;
  const html = input.homeHtml ?? "";
  const pages = input.pages ?? [];
  const group = (re: RegExp) => pages.find((p) => re.test(p.group) && p.html);
  let budget = input.maxRequests ?? 4;
  const spend = () => (budget-- > 0);
  let host: string;
  try { host = new URL(home).hostname; } catch { return out; }
  const homeOk = readable(html);

  // 1. forms + booking (home + contact pages already fetched)
  formsResult([{ group: "home", url: home, html }, ...pages.filter((p) => /contact|book|appoint|enquir/i.test(p.group))], out);

  // 5. SEO basics, 6. business state, 7. ecommerce — static, home only (plus about page text)
  if (homeOk) {
    const seo = seoBasics(html);
    out.facts.seo_missing = seo.missing;
    out.signals.seo_basics_missing = seo.missing.length >= 2;
  }
  const cs = comingSoon(html);
  if (cs) { out.signals.coming_soon = true; out.notes.coming_soon = `"${cs.phrase}" (${cs.where})`; } else if (homeOk) out.signals.coming_soon = false;
  const press = pressUrlFrom(html, home);
  if (press) out.facts.press_url = press;
  if (press || homeOk) out.signals.has_press = !!press;
  const textPages = [html, ...pages.filter((p) => /about|home|quality|certif|infra/i.test(p.group)).map((p) => p.html)];
  const certs = certifications(textPages.map((h) => htmlToText(h, 40000)).join(" \n "));
  if (certs.names.length) { out.facts.certifications = certs.names; out.signals.has_certifications = true; }
  if (certs.fssaiLicense) out.notes.fssai_license = mask(certs.fssaiLicense);
  const exp = textPages.map(exporterEvidence).find(Boolean);
  if (exp) { out.signals.exporter = true; out.notes.exporter = exp; }
  const cms = cmsVersion(html);
  if (cms) { out.facts.cms = `${cms.cms} ${cms.version}`; out.signals.outdated_cms = cms.outdated; }
  const shopify = isShopify(html);
  const shopRead = (htmls: string[]) => {
    const s = shopApps(htmls.join("\n"));
    out.facts.platform = "shopify";
    out.facts.shop_apps = s.apps;
    out.signals.shop_no_reviews_app = !s.reviews;
    out.signals.shop_no_email_app = !s.email && !s.nativeNewsletter;
  };
  if (shopify) shopRead([html]);

  // Network reads, in priority order: offerings (default fact), headers, blog, JS bundles.
  const offeringsTask = (async () => {
    const given = group(/service|product|solution|offer|menu|treatment|course/i);
    let url = given?.url ?? offeringsUrlFrom(html, home);
    let page = given?.html ?? null;
    if (!page && url && spend()) page = (await fetchPage(url, TIMEOUT))?.html ?? null;
    let list = page ? extractOfferings(page) : [];
    if (list.length < 3) {
      const nav = offeringsFromNav(html, home) ?? (page && url ? offeringsFromNav(page, url) : null);
      if (nav && nav.names.length > list.length) { list = nav.names; url = url ?? nav.url; out.notes.offerings_from = "menu links"; }
    }
    if (list.length < 2 && homeOk) { list = extractOfferings(html); url = home; out.notes.offerings_from = "home page headings"; }
    if (list.length) { out.facts.offerings = list; out.facts.offerings_url = url; }
  })();

  const headersTask = (async () => {
    let headers = input.headers;
    let finalUrl = home;
    if (!headers && spend()) {
      const r = await getText(home, 0);
      if (r) { headers = Object.fromEntries(r.headers.entries()); finalUrl = r.url; }
    }
    if (headers) {
      const missing = missingSecurityHeaders(headers);
      out.facts.missing_security_headers = missing;
      out.signals.weak_security_headers = missing.length >= 3;
      if (new URL(finalUrl).protocol === "http:") { out.signals.no_https = true; out.notes.no_https = `home served over http (${finalUrl})`; }
    }
  })();

  const certTask = certInfo(host).then((c) => {
    if (!c) return;
    out.facts.ssl_days_left = c.daysLeft;
    out.facts.ssl_valid_to = c.validTo;
    out.signals.ssl_expired = c.daysLeft < 0;
    out.signals.ssl_expiring = c.daysLeft >= 0 && c.daysLeft < 21;
    out.signals.ssl_invalid = !c.authorized && c.daysLeft >= 0;
    if (!c.authorized && c.error) out.notes.ssl_invalid = c.error;
  });

  const dnsTask = emailDns(registrableDomain(host)).then((d) => {
    if (!d) return;
    out.facts.mx_provider = d.mx;
    if (d.mxHosts.length) out.facts.mx_hosts = d.mxHosts;
    if (d.spf !== null) out.signals.no_spf = !d.spf;
    if (d.dmarc !== null) out.signals.no_dmarc = !d.dmarc;
    if (d.dmarcPolicy) out.facts.dmarc_policy = d.dmarcPolicy;
    if (d.mx === "none") out.signals.no_mx = true; else if (d.mx !== "unknown") out.signals.no_mx = false;
  });

  const blogTask = (async () => {
    const given = group(/blog|news|insight|article/i);
    const url = given?.url ?? blogUrlFrom(html, home);
    if (!url) { if (homeOk) out.signals.no_blog = true; return; }
    out.signals.no_blog = false;
    out.facts.blog_url = url;
    let page = given?.html ?? null;
    if (!page && spend()) page = (await fetchPage(url, TIMEOUT))?.html ?? null;
    if (!page) return;
    const dates = pageDates(page);
    if (!dates.length) return;
    const newest = new Date(Math.max(...dates.map((d) => d.getTime())));
    const days = Math.floor((Date.now() - newest.getTime()) / DAY);
    out.facts.blog_last_post = newest.toISOString().slice(0, 10);
    out.facts.blog_days_since_post = days;
    out.signals.blog_stale = days > 180;
  })();

  // Secrets: the served HTML always; bundles with whatever budget the reads above left.
  await Promise.all([offeringsTask, headersTask, blogTask]);
  // Review apps usually load on product pages only: before saying "no reviews app", look at one.
  if (shopify && out.signals.shop_no_reviews_app) {
    const product = links(html, home).find((l) => sameSite(l.url, new URL(home)) && /^\/(?:collections\/[^/]+\/)?products\/[^/]+\/?$/.test(l.url.pathname));
    const page = product && spend() ? await fetchPage(product.url.href, TIMEOUT) : null;
    if (page?.html) shopRead([html, page.html]);
    else if (product) delete out.signals.shop_no_reviews_app; // could not check where reviews live
  }
  const secrets = [...findSecrets(html, home), ...pages.flatMap((p) => findSecrets(p.html, p.url))];
  const bundles = bundleUrls(html, home, Math.min(2, Math.max(0, budget)));
  const bodies = await Promise.all(bundles.map((u) => (spend() ? getText(u, 3_000_000) : Promise.resolve(null))));
  bodies.forEach((b, i) => { if (b && b.status < 400) secrets.push(...findSecrets(b.body, bundles[i])); });
  out.signals.exposed_secret = secrets.length > 0;
  if (secrets.length) {
    out.facts.exposed_secrets = secrets;
    out.notes.exposed_secret = `${secrets.map((s) => s.type).filter((t, i, a) => a.indexOf(t) === i).join(", ")} served publicly — rotate it`;
  }
  out.facts.scanned_bundles = bundles.length;

  await Promise.all([certTask, dnsTask]);
  return out;
}
