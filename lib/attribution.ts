/**
 * Where a user came from (first touch), and the channel it belongs to.
 * The cookie is written by components/AttributionCapture.tsx; `recordSignupSource` copies it onto
 * user_profiles.signup_source once (never overwrites). `channelOf` is the one classifier the admin
 * uses, so every page agrees on what "Email" or "Organic search" means.
 */
import { sql } from "@/lib/db";

export type SignupSource = { us?: string; um?: string; uc?: string; ref?: string; land?: string; click?: string; t?: number };

export function readSourceCookie(cookieHeader: string | null | undefined): SignupSource | null {
  const raw = (cookieHeader ?? "").split(/;\s*/).find((c) => c.startsWith("m_src="))?.slice(6);
  if (!raw) return null;
  try { const v = JSON.parse(decodeURIComponent(raw)); return v && typeof v === "object" ? (v as SignupSource) : null; } catch { return null; }
}

/** Fire-and-forget; only fills an empty column. */
export function recordSignupSource(email: string, cookieHeader: string | null | undefined): void {
  const src = readSourceCookie(cookieHeader);
  if (!email || !src) return;
  void sql`UPDATE user_profiles SET signup_source = ${sql.json(src as Parameters<typeof sql.json>[0])} WHERE email = ${email} AND signup_source IS NULL`.catch(() => {});
}

const SEARCH = /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|yandex\.[a-z]+|ecosia\.org)$/;
const AI = /(^|\.)(chatgpt\.com|chat\.openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com)$/;
const SOCIAL = /(^|\.)(linkedin\.com|lnkd\.in|facebook\.com|fb\.com|instagram\.com|t\.co|x\.com|twitter\.com|youtube\.com|reddit\.com|quora\.com|producthunt\.com|whatsapp\.com|wa\.me)$/;
const MAIL = /(^|\.)(mail\.google\.com|outlook\.(live|office)\.com|mail\.yahoo\.com)$/;

export function channelOf(s: SignupSource | null | undefined): string {
  if (!s) return "Unknown (before tracking)";
  const um = (s.um ?? "").toLowerCase(), us = (s.us ?? "").toLowerCase(), ref = (s.ref ?? "").toLowerCase();
  if (/^(email|e-mail|newsletter|mail)$/.test(um) || /^(ses|email|mailer|newsletter|outreach)$/.test(us) || MAIL.test(ref)) return "Email";
  if (/^(cpc|ppc|paid|ads|paidsocial|display)$/.test(um) || s.click === "gclid") return "Paid ads";
  if (AI.test(ref) || /chatgpt|perplexity|claude/.test(us)) return "AI assistants";
  if (SEARCH.test(ref)) return "Organic search";
  if (SOCIAL.test(ref) || /^(linkedin|facebook|instagram|twitter|x|youtube|reddit|whatsapp)$/.test(us) || s.click === "fbclid") return "Social";
  if (us) return `Campaign: ${us}`;
  if (ref) return "Referral";
  return "Direct";
}

/** The kind of page the visitor landed on first. */
export function landingOf(path: string | null | undefined): string {
  const p = path ?? "";
  if (!p || p === "/") return "Home";
  if (/^\/(leads|lists|leads-for|businesses-without-websites|funded-startups-india)(\/|$)/.test(p)) return "pSEO / lists";
  if (/^\/resources(\/|$)/.test(p)) return "Blog";
  if (/^\/(google-maps-scraper|lead-generation-tool|lead-finder|ai-cold-calling|[a-z]+-alternative)(\/|$)/.test(p)) return "Tool / compare pages";
  if (/^\/pricing/.test(p)) return "Pricing";
  if (/^\/partner/.test(p)) return "Partner";
  if (/^\/(login|signup)/.test(p)) return "Login / signup";
  if (/without-websites|web-design-leads|industries-without/.test(p)) return "No-website landing pages";
  return "Other";
}
