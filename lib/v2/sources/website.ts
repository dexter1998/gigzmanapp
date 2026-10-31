/**
 * Capability: a business's own website. Sources, cheapest first unless measured yield says
 * otherwise: the Places listing (free) → shared facts → Exa search → Place Details.
 * Every call is recorded in v2_source_attempts; ranking reads those rows.
 */

import { sql } from "@/lib/db";
import { domainOf } from "../net";
import { fetchPageVia } from "../reader/client";
import { NOT_OWN_SITE } from "../playbooks";
import { exaSearch } from "./exa";

const DIRECTORY = /(fitpass|magicpin|cult\.fit|curefit|urbanpro|weebly|wixsite|blogspot|wordpress\.com|sites\.google|business\.site|linktr\.ee|promallu|justdial|indiamart|practo|zomato|swiggy|sulekha|tripadvisor|booking\.com|makemytrip|lybrate|magicbricks|99acres|housing\.com|urbancompany|yellowpages|asklaila|quikr|olx|wikipedia|facebook|instagram|linkedin|youtube|twitter|x\.com|google\.|maps\.|yelp|glassdoor|naukri|crunchbase|zaubacorp|tofler|ambitionbox|grotal|mouthshut|nearbuy|dineout|eazydiner|clinicspots|credihealth|apollo247|1mg|healthgrades|wedmegood|weddingwire|shiksha|collegedunia|careers360)/i;

/** Distinctive words of a business name, for matching it against a domain or page title. */
export function nameTokens(name: string): string[] {
  const stop = new Set(["the", "and", "pvt", "ltd", "private", "limited", "llp", "india", "co", "company", "services", "service", "clinic", "centre", "center", "hospital", "school", "dr", "doctor", "gurgaon", "gurugram", "delhi", "noida", "sector", "best", "of", "in", "at", "by", "&"]);
  return [...new Set(name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/)
    .filter((w) => w.length >= 3 && !stop.has(w)))];
}

// Words that name the trade, not the business: matching on them is how "FITNESS STUDIO" became a UK site.
const GENERIC = new Set(["gym","gyms","fitness","fit","studio","studios","salon","salons","spa","spas","beauty","dental","dentist","dentists","care","health","healthcare","clinic","clinics","school","schools","academy","institute","restaurant","cafe","kitchen","foods","food","realty","real","estate","properties","property","builders","developers","travels","tours","logistics","transport","solutions","technologies","tech","media","films","productions","studio","digital","consultants","consultancy","associates","enterprises","traders","industries","group","global","international","world","hub","point","house","zone","plus","pro","new","city","royal","star","shree","sri","om"]);

/** The listing's phone (last 10 digits) printed on the page — the objective proof a site is theirs. */
export async function phoneOnPage(url: string, phone: string | null): Promise<boolean | null> {
  const p = (phone ?? "").replace(/\D/g, "").slice(-10);
  if (p.length < 8) return null;
  const { keyLinks } = await import("../net");
  const home = await fetchPageVia(url, 8000);
  if (!home?.html) return null;
  if (home.html.replace(/\D/g, "").includes(p)) return true;
  const contact = keyLinks(home.html, home.url, 3).find((l) => /contact/i.test(l));
  const cp = contact ? await fetchPageVia(contact, 6000) : null;
  return cp?.html ? cp.html.replace(/\D/g, "").includes(p) : false;
}

/** How well a candidate URL/title matches the business: share of name tokens in the domain or title. */
export function matchScore(name: string, url: string, title: string | null): number {
  const toks = nameTokens(name).filter((w) => !GENERIC.has(w));
  if (!toks.length) return 0;
  const dom = (domainOf(url) ?? "").replace(/\.[a-z.]+$/, "").replace(/[^a-z0-9]/g, "");
  const t = (title ?? "").toLowerCase();
  const inDomain = toks.filter((w) => dom.includes(w)).length;
  const inTitle = toks.filter((w) => t.includes(w)).length;
  return Math.max(inDomain / toks.length, 0.8 * (inTitle / toks.length));
}

export type WebsiteFound = { url: string; source: string; confidence: number; costUsd: number } | null;

/** Exa: "<name> <type> <city> official website" → the first own-site result that matches the name. */
export async function websiteViaExa(input: { name: string; category: string | null; city: string | null; entityKey: string; placeType: string | null; phone?: string | null }): Promise<WebsiteFound> {
  const q = [input.name, input.category?.replace(/_/g, " "), input.city, "official website"].filter(Boolean).join(" ");
  const t0 = Date.now();
  let found: WebsiteFound = null;
  let cost = 0;
  try {
    const r = await exaSearch(q);
    cost = r.costUsd;
    for (const x of r.results) {
      if (DIRECTORY.test(x.url) || NOT_OWN_SITE.test(x.url)) continue;
      const score = matchScore(input.name, x.url, x.title);
      if (score < 0.5) continue;
      const u = new URL(x.url);
      const root = `${u.protocol}//${u.host}/`;
      // Accept only with proof: the listing's phone on the site (0.95), or — when the phone can't be
      // checked — the business's own distinctive name in the domain (0.7). Exa always returns
      // something; the benchmark showed half of it is an aggregator or a namesake.
      const onSite = await phoneOnPage(root, input.phone ?? null);
      const domainHit = matchScore(input.name, root, null) >= 0.5;
      // Phone proof only: the benchmark found every "name in the domain" acceptance on a listing with
      // no website to be someone else's site (0 of 8 verified). Unverified candidates are not kept.
      if (onSite === true) { found = { url: root, source: "exa", confidence: 0.95, costUsd: cost }; break; }
      void domainHit;
    }
  } finally {
    await sql`
      INSERT INTO v2_source_attempts (source, capability, place_type, city, entity_key, ok, value, cost_usd, ms)
      VALUES ('exa', 'website', ${input.placeType}, ${input.city}, ${input.entityKey}, ${!!found}, ${found?.url ?? null}, ${cost}, ${Date.now() - t0})
    `;
  }
  if (found) {
    await sql`
      INSERT INTO v2_facts (entity_key, field, value, source, confidence) VALUES (${input.entityKey}, 'website', ${found.url}, 'exa', ${found.confidence})
      ON CONFLICT (entity_key, field, source) DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, checked_at = now()
    `;
  }
  return found;
}

/** Paid website sources, best choice first by the confidence module (confidence ÷ cost). */
export async function rankWebsiteSources(placeType: string | null): Promise<string[]> {
  const { rankComponents } = await import("../confidence");
  return rankComponents("website", ["exa", "place_details"], placeType);
}

/** Already known by any pipeline? (shared facts, freshest highest-confidence first) */
export async function knownWebsite(entityKey: string): Promise<string | null> {
  const [r] = await sql`SELECT value FROM v2_facts WHERE entity_key = ${entityKey} AND field = 'website' ORDER BY confidence DESC, checked_at DESC LIMIT 1`;
  return (r?.value as string) ?? null;
}
