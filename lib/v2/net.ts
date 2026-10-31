/**
 * Safe page fetch for Scout and Qualifier. The URL comes from a user message or a third-party
 * listing, so it is untrusted: only http(s) on default ports, every hop's host is resolved and
 * refused if it points inside a private network (SSRF), redirects are followed by hand so each
 * hop is re-checked, and bodies are capped.
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 4;
const HEADERS: Record<string, string> = {
  // Same header set the jobs scraper measured as getting past naive bot filters.
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

export type Page = { url: string; status: number; html: string };

function privateAddress(ip: string): boolean {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return privateAddress(v.slice(7));
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

async function assertPublic(u: URL): Promise<void> {
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad protocol");
  if (u.port && u.port !== "80" && u.port !== "443") throw new Error("bad port");
  if (u.username || u.password) throw new Error("credentials in url");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => privateAddress(a.address))) throw new Error("private address");
}

/** "example.com", "www.x.in/about" or a full URL → a URL, or null if it isn't one. */
export function normalizeUrl(raw: string): URL | null {
  const t = raw.trim().replace(/[),.;]+$/, "");
  if (!t || /\s/.test(t)) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    return u.hostname.includes(".") ? u : null;
  } catch {
    return null;
  }
}

export function domainOf(url: string): string | null {
  const u = normalizeUrl(url);
  return u ? u.hostname.toLowerCase().replace(/^www\./, "") : null;
}

/**
 * fetch() with the SSRF rules applied to every hop: redirects are followed by hand (max 4) and each
 * target is resolved and refused if private. Drop-in for the shared enricher, which calls it with
 * `redirect: "follow"`; the Response it returns carries the final URL like a followed fetch would.
 */
export async function safeFetch(input: string | URL | Request, init: RequestInit = {}): Promise<Response> {
  let u = new URL(typeof input === "string" || input instanceof URL ? input.toString() : input.url);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublic(u);
    const res = await fetch(u, { ...init, headers: { ...HEADERS, ...(init.headers as Record<string, string> | undefined) }, redirect: "manual" });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      u = new URL(loc, u);
      continue;
    }
    // A manual-redirect Response reports the URL it was asked for; that is the final hop here.
    Object.defineProperty(res, "url", { value: u.toString() });
    return res;
  }
  throw new Error("too many redirects");
}

// ------------------------------------------------------------------ hard pages (Scrapling fetchd)

// Bot walls seen in the wild: Cloudflare, Sucuri, LiteSpeed/QUIC.cloud, Imperva, DDoS-Guard, generic "verify human".
const CHALLENGE = /(Just a moment\.\.\.|One moment, please|cf-chl|challenge-platform|Attention Required!|cf-browser-verification|Enable JavaScript and cookies to continue|DDoS protection by|DDoS-Guard|Checking your browser|sucuri_cloudproxy|Sucuri WebSite Firewall|Verifying you are human|verify you are human|_Incapsula_Resource|Please wait while we|lsrecap|quic\.cloud)/i;

/** Blocked by a bot wall, or an empty JavaScript shell with nothing readable in it. */
export function looksBlocked(status: number, html: string): "challenge" | "js_shell" | null {
  if (CHALLENGE.test(html.slice(0, 20000)) || ((status === 403 || status === 503) && /cloudflare|cf-ray/i.test(html))) return "challenge";
  if (status >= 200 && status < 300) {
    const text = html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.length < 200 && /<script/i.test(html) && /id=["'](root|__next|app|__nuxt)["']/i.test(html)) return "js_shell";
  }
  return null;
}

async function viaFetchd(url: string, mode: "http" | "stealth"): Promise<{ status: number; url: string; html: string } | null> {
  const base = process.env.FETCHD_URL;
  if (!base) return null;
  const res = await fetch(`${base}/fetch`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-fetchd-token": process.env.FETCHD_TOKEN ?? "" },
    body: JSON.stringify({ url, mode }),
    signal: AbortSignal.timeout(mode === "stealth" ? 70_000 : 20_000),
  }).catch(() => null);
  if (!res?.ok) return null;
  const d = (await res.json().catch(() => null)) as { ok?: boolean; status?: number; url?: string; html?: string } | null;
  return d?.html ? { status: d.status ?? 0, url: d.url ?? url, html: d.html } : null;
}

const STEALTH_PER_HOST = 1;
const stealthHosts = new Map<string, number>();

/** Which fetch method opened which page — the confidence module ranks fetch methods from these. */
export const fetchLog: Array<{ host: string; method: string; ok: boolean; reason: string | null }> = [];

/**
 * safeFetch, then — only when the page is a bot wall or a JS shell — Scrapling: plain browser-like
 * HTTP first (cheap), a real stealth browser last (slow). Returns a Response so the shared
 * enricher reads it like any other page.
 */
export async function robustFetch(input: string | URL | Request, init: RequestInit = {}): Promise<Response> {
  const res = await safeFetch(input, init);
  const type = res.headers.get("content-type") ?? "";
  if (!process.env.FETCHD_URL || (!type.includes("html") && res.status < 400)) return res;
  const html = await res.text();
  const blocked = looksBlocked(res.status, html);
  const host = new URL(res.url).hostname;
  const rebuild = (body: string, status: number, url: string) => {
    const r = new Response(body, { status: status || 200, headers: { "content-type": "text/html; charset=utf-8" } });
    Object.defineProperty(r, "url", { value: url });
    return r;
  };
  if (!blocked) return rebuild(html, res.status, res.url);
  // A real browser costs ~45-70s; a site gets one (its first blocked page). Later pages on the
  // same host try the cheap mode only, so one hard site can't take minutes.
  const stealthUsed = stealthHosts.get(host) ?? 0;
  const modes = stealthUsed >= STEALTH_PER_HOST ? (["http"] as const) : (["http", "stealth"] as const);
  for (const mode of modes) {
    if (mode === "stealth") stealthHosts.set(host, stealthUsed + 1);
    const got = await viaFetchd(res.url, mode);
    const ok = !!got && got.status < 400 && !looksBlocked(got.status, got.html);
    fetchLog.push({ host, method: `fetchd_${mode}`, ok, reason: blocked });
    if (ok && got) return rebuild(got.html, got.status, got.url);
  }
  fetchLog.push({ host, method: "plain", ok: false, reason: blocked });
  return rebuild(html, res.status, res.url);
}

/** One page for Scout: html capped at MAX_BYTES, null when it did not load as a page. */
export async function fetchPage(rawUrl: string, timeoutMs = 7000): Promise<Page | null> {
  const u = normalizeUrl(rawUrl);
  if (!u) return null;
  try {
    const res = await safeFetch(u, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html")) return { url: res.url, status: res.status, html: "" };
    const reader = res.body?.getReader();
    let html = "";
    let bytes = 0;
    const dec = new TextDecoder();
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      html += dec.decode(value, { stream: true });
      if (bytes > MAX_BYTES) { await reader.cancel(); break; }
    }
    return { url: res.url, status: res.status, html };
  } catch {
    return null;
  }
}

/** Visible text, roughly: scripts/styles/tags removed, whitespace collapsed. */
export function htmlToText(html: string, max = 8000): string {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function pageTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? htmlToText(m[1], 160) || null : null;
}

/** Same-site links whose path looks like about/services/contact — the pages that describe a business. */
export function keyLinks(html: string, base: string, limit = 3): string[] {
  const b = new URL(base);
  const out = new Map<string, number>();
  for (const m of html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)) {
    let u: URL;
    try { u = new URL(m[1], b); } catch { continue; }
    if (u.hostname.replace(/^www\./, "") !== b.hostname.replace(/^www\./, "")) continue;
    const p = u.pathname.toLowerCase();
    const score = /service|solution|what-we-do|offer/.test(p) ? 3 : /about|company|who-we/.test(p) ? 2 : /contact/.test(p) ? 1 : 0;
    if (score && !out.has(u.origin + u.pathname)) out.set(u.origin + u.pathname, score);
  }
  return [...out.entries()].sort((a, c) => c[1] - a[1]).slice(0, limit).map(([k]) => k);
}
