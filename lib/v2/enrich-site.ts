/**
 * Mantis Website Enrich API — one URL in, the modules you pick out. Built on the shared enricher
 * (the AWS box's crawler) so every page is read once; Scrapling (fetchd) takes over only for bot
 * walls and empty JS shells.
 *
 *   contacts  emails, phones, socials (enricher)          meta     title, description, OG, schema, noindex
 *   tech      CMS, analytics, ad pixels, chat, booking,   pages    team / about / services / pricing /
 *             payments, email marketing                            partners / careers / cases / blog / contact
 *   people    names + roles written on the site            profile  what they sell, services, offer, ICP,
 *                                                                   industries, locations — every field with
 *                                                                   a quote that must exist on the page
 *
 * Nothing is inferred beyond what a page shows; `profile` evidence is checked against the page text.
 */

import { callTool, MODELS } from "./claude";
import { crawlVia } from "./reader/client";
import { BUSINESS_TYPE_IDS, businessTypesForPrompt } from "./business-types";
import { MODULES, type Module, type SiteEnrichment, type SiteProfile } from "./enrich-crawl";

export { MODULES, type Module, type SiteEnrichment, type SiteProfile };

// ---------------------------------------------------------------- profile (LLM, evidence-checked)
const PROFILE_TOOL = {
  name: "site_profile",
  description: "Record what this business's website says about itself. Only state what the text supports.",
  input_schema: {
    type: "object",
    properties: {
      company: { type: ["string", "null"] },
      whatTheySell: { type: ["string", "null"], description: "One sentence: what they sell and to whom." },
      services: { type: "array", items: { type: "string" }, description: "Up to 8 services/products, short names, as named on the site." },
      offer: { type: ["string", "null"], description: "Their headline offer / value proposition, if stated." },
      pricing: { type: ["string", "null"], description: "Pricing or plans if published (e.g. 'Starter ₹999/mo; Pro ₹2,999/mo'), else null." },
      icp: { type: ["string", "null"], description: "Who their customers are, as the site states it (e.g. 'small clinics and hospitals in India')." },
      industriesServed: { type: "array", items: { type: "string" } },
      locations: { type: "array", items: { type: "string" }, description: "Cities/countries they operate in or serve, if stated." },
      businessModel: { type: ["string", "null"], enum: [...BUSINESS_TYPE_IDS, null], description: "Which row of the BUSINESS TYPES table this business is." },
      sellsTo: { type: ["string", "null"], enum: ["businesses", "consumers", "both", null], description: "Who pays it, as the site shows: other businesses (B2B), individual consumers (B2C), or both." },
      evidence: { type: "object", additionalProperties: { type: "string" }, description: "For whatTheySell, offer, pricing, icp: a SHORT quote (5-15 words) copied character-for-character from the text — do not fix grammar, punctuation or casing." },
    },
    required: ["company", "whatTheySell", "services", "offer", "pricing", "icp", "industriesServed", "locations", "businessModel", "evidence"],
  },
};

/** The model's pick from the shared business-type table; anything off the table is "other" — no
 *  keyword guessing (the old regex fallback mapped "platform" to saas and "service" to local_service). */
function toModel(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const x = v.toLowerCase().trim();
  return BUSINESS_TYPE_IDS.includes(x) ? x : "other";
}

async function readProfile(text: string): Promise<SiteProfile | null> {
  if (text.length < 200) return null;
  const raw = await callTool({
    agent: "site-profile", model: MODELS.cheap, maxTokens: 900,
    system: "You extract a business profile from its own website text. Copy, don't infer: leave a field null or empty when the text doesn't say it. " + businessTypesForPrompt(),
    messages: [{ role: "user", content: text.slice(0, 14000) }],
    tool: PROFILE_TOOL,
  });
  const list = (v: unknown, n: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()).slice(0, n) : []);
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 400) : null);
  const evidence: Record<string, string> = {};
  if (raw.evidence && typeof raw.evidence === "object") for (const [k, v] of Object.entries(raw.evidence)) if (typeof v === "string") evidence[k] = v.slice(0, 200);
  // A quote counts only if it is really on the page (whitespace/case-insensitive).
  const norm = (x: string) => x.toLowerCase().replace(/\s+/g, " ").replace(/[“”"']/g, "").trim();
  const page = norm(text);
  const quotes = Object.values(evidence);
  return {
    company: str(raw.company), whatTheySell: str(raw.whatTheySell), services: list(raw.services, 8), offer: str(raw.offer),
    pricing: str(raw.pricing), icp: str(raw.icp), industriesServed: list(raw.industriesServed, 8), locations: list(raw.locations, 8),
    businessModel: toModel(raw.businessModel), sellsTo: raw.sellsTo === "businesses" || raw.sellsTo === "consumers" || raw.sellsTo === "both" ? raw.sellsTo : null, evidence,
    evidenceVerified: quotes.filter((q) => q.length > 8 && page.includes(norm(q))).length,
    // Supported: >=80% of the quote's words appear on the page — tolerates a fixed comma, not an invention.
    evidenceSupported: quotes.filter((q) => {
      const w = norm(q).split(/[^a-z0-9₹$%]+/).filter((x) => x.length > 2);
      return w.length >= 3 && w.filter((x) => page.includes(x)).length / w.length >= 0.8;
    }).length,
    evidenceTotal: quotes.length,
  };
}

export async function enrichSite(url: string, modules: Module[] = [...MODULES]): Promise<SiteEnrichment> {
  const t0 = Date.now();
  // The crawl runs on the AWS box when V2_READER_URL is set (one place for all self-hosted
  // scraping), in-process otherwise; the profile's LLM read stays here.
  const { profileText, ...out } = await crawlVia(url, modules);
  if (modules.includes("profile") && profileText) out.profile = await readProfile(profileText).catch(() => null);
  out.ms = Date.now() - t0;
  return out;
}
