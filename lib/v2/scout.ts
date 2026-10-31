/**
 * Mantis Scout (docs/v2-agents.md §3): the user's own website or description → seller profile.
 * Reads: the site (homepage + up to 3 service/about/contact pages). Writes: a row in
 * v2_business_profiles (the same website updates its own row), mirrored to user_profiles.v2_profile
 * when it is the default (lib/v2/business-profiles.ts).
 * Billed calls: zero.
 */

import { sql } from "@/lib/db";
import { callTool, MODELS } from "./claude";
import { htmlToText, keyLinks, pageTitle, normalizeUrl } from "./net";
import { fetchPageVia } from "./reader/client";
import { PLAYBOOKS } from "./playbooks";
import { BUSINESS_TYPE_IDS, businessTypesForPrompt } from "./business-types";
import { chatProfile, saveScoutProfile, toSeller, type BusinessProfile } from "./business-profiles";

export type SellerProfile = {
  website: string | null;
  company: string | null;
  summary: string;
  services: string[];
  /** The service the profile is built around; the Planner matches playbooks against it. */
  primaryService: string | null;
  targetTrades: string[];
  /** "consumers" = sells to individuals (patients, students, households) — Mantis can't find those. */
  sellsTo?: "businesses" | "consumers" | "both" | null;
  /** Business type from the shared table (lib/v2/business-types.ts), judged by the model. */
  businessModel?: string | null;
  /** For a consumer-facing business: businesses it could partner or collaborate with. */
  partnerTrades?: string[];
  targetAreas: string[];
  playbookIds: string[];
  source: "website" | "chat";
  updatedAt: string;
};

/**
 * The seller profile to plan with. With a chat: the business that chat chose (Business profiles);
 * otherwise — or when the chat chose none — the default profile's mirror in user_profiles.v2_profile.
 */
export async function loadProfile(email: string, chatId?: string | null): Promise<SellerProfile | null> {
  const chosen = chatId ? await chatProfile(email, chatId).catch(() => null) : null;
  if (chosen) return toSeller(chosen);
  const [row] = await sql`SELECT v2_profile FROM user_profiles WHERE email = ${email}`;
  const p = row?.v2_profile as Partial<SellerProfile> | undefined;
  return p && typeof p.summary === "string" ? (p as SellerProfile) : null;
}

/** A URL or bare domain anywhere in the message. */
export function findUrl(message: string): string | null {
  const m = message.match(/(https?:\/\/[^\s]+|(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|in|co|io|net|org|ai|app|dev|biz|info|co\.in|org\.in|net\.in)(?:\/[^\s]*)?)/i);
  return m && normalizeUrl(m[0]) ? m[0] : null;
}

const TOOL = {
  name: "save_profile",
  description: "Save what this business sells and who it should sell to.",
  input_schema: {
    type: "object",
    properties: {
      company: { type: ["string", "null"] },
      summary: { type: "string", description: "One sentence: what they do and for whom." },
      services: { type: "array", items: { type: "string" }, description: "Services/products they sell, short names." },
      primaryService: { type: ["string", "null"], description: "The main one, in plain words (e.g. 'web development', 'local seo')." },
      businessModel: { type: "string", enum: BUSINESS_TYPE_IDS, description: "Which row of the BUSINESS TYPES table this business is." },
      sellsTo: { type: "string", enum: ["businesses", "consumers", "both"], description: "Who pays this business: other businesses, individual consumers (patients, students, diners, households), or both." },
      targetTrades: { type: "array", items: { type: "string" }, description: "2-5 kinds of BUSINESS that would buy it, as searchable trades ('dentists', 'gyms', 'real estate agents'). Prefer trades their site already mentions. EMPTY when it sells only to consumers." },
      partnerTrades: { type: "array", items: { type: "string" }, description: "Only when it sells to consumers: 2-4 kinds of business it could partner or collaborate with to reach those consumers (corporates for employee health camps, schools, housing societies, gyms, event planners). Never its competitors." },
      targetAreas: { type: "array", items: { type: "string" }, description: "Cities/areas they serve or are based in, if stated." },
      playbookIds: { type: "array", items: { type: "string", enum: PLAYBOOKS.map((p) => p.id) }, description: "Playbooks that fit what they sell." },
    },
    required: ["company", "summary", "services", "primaryService", "businessModel", "sellsTo", "targetTrades", "partnerTrades", "targetAreas", "playbookIds"],
  },
};

export type ScoutOutcome = {
  profile: SellerProfile; pagesRead: number; siteFailed: boolean;
  /** The saved Business profile row; `created` = a new business, not an update of one already saved. */
  saved: BusinessProfile | null; created: boolean;
};

export async function runScout(input: {
  email: string; message: string; url: string | null; save?: boolean; knownWebsite?: string | null;
  /** false: a chat line that says nothing about what the business sells is not saved as a profile. */
  saveEmpty?: boolean;
}): Promise<ScoutOutcome> {
  let text = "";
  let pagesRead = 0;
  let siteFailed = false;
  let website: string | null = null;

  // A Google Maps link is a place listing, not a website (production test I-07): say so honestly
  // instead of "Not enough information" saved as a profile.
  if (input.url && /(maps\.app\.goo\.gl|goo\.gl\/maps|google\.[a-z.]+\/maps|g\.page)/i.test(input.url)) {
    const profile: SellerProfile = { website: null, company: null, summary: input.message.slice(0, 300), services: [], primaryService: null, targetTrades: [], targetAreas: [], playbookIds: [], source: "chat", updatedAt: new Date().toISOString() };
    return { profile, pagesRead: 0, siteFailed: true, saved: null, created: false };
  }
  if (input.url) {
    const home = await fetchPageVia(input.url, 8000);
    if (home?.html) {
      website = home.url;
      pagesRead = 1;
      const extra = await Promise.all(keyLinks(home.html, home.url).map((l) => fetchPageVia(l, 6000)));
      const pages = [home, ...extra.filter((p): p is NonNullable<typeof p> => !!p?.html)];
      pagesRead = pages.length;
      text = pages.map((p) => `PAGE ${p.url}\nTITLE ${pageTitle(p.html) ?? ""}\n${htmlToText(p.html, 4000)}`).join("\n\n");
    } else {
      siteFailed = true;
    }
  }

  const raw = await callTool({
    agent: "scout",
    model: MODELS.best,
    system:
      "You are Mantis Scout. Build a seller profile for the user from their website text and/or their own description. " +
      "Only state what the text supports about the business itself; leave services/areas empty rather than guess. " +
      "targetTrades are the BUSINESSES Mantis can find for them — Mantis finds businesses, never individual consumers. " +
      "A business that sells only to consumers (a clinic, school, salon, gym, restaurant, retail shop) gets sellsTo 'consumers', EMPTY targetTrades, and partnerTrades instead. " +      businessTypesForPrompt() + " " +
      "Playbooks available: " +
      PLAYBOOKS.map((p) => `${p.id} (for ${p.sells.join("/")})`).join("; "),
    messages: [{ role: "user", content: `USER SAID: ${input.message}\n\n${text ? `WEBSITE TEXT:\n${text}` : "(no website text available)"}` }],
    tool: TOOL,
    maxTokens: 1200,
    force: false,
  });

  const list = (v: unknown, n: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, 60)).slice(0, n) : []);
  const profile: SellerProfile = {
    website,
    company: typeof raw.company === "string" ? raw.company.slice(0, 100) : null,
    summary: typeof raw.summary === "string" && raw.summary.trim() ? raw.summary.trim().slice(0, 300) : input.message.slice(0, 300),
    services: list(raw.services, 8),
    primaryService: typeof raw.primaryService === "string" ? raw.primaryService.slice(0, 60) : null,
    businessModel: BUSINESS_TYPE_IDS.includes(String(raw.businessModel)) ? String(raw.businessModel) : null,
    sellsTo: raw.sellsTo === "businesses" || raw.sellsTo === "consumers" || raw.sellsTo === "both" ? raw.sellsTo : null,
    targetTrades: raw.sellsTo === "consumers" ? [] : list(raw.targetTrades, 5),
    partnerTrades: list(raw.partnerTrades, 4),
    targetAreas: list(raw.targetAreas, 4),
    playbookIds: list(raw.playbookIds, 3).filter((id) => PLAYBOOKS.some((p) => p.id === id)),
    source: website ? "website" : "chat",
    updatedAt: new Date().toISOString(),
  };

  if (input.save === false) return { profile, pagesRead, siteFailed, saved: null, created: false };
  // "what do you know about my business?" / "write a cold email for dentists" were saved as a
  // profile named "My business" with nothing in it (production test, 2026-10-23).
  if (input.saveEmpty === false && !input.url && !profile.services.length && !profile.targetTrades.length && !profile.partnerTrades?.length) {
    return { profile, pagesRead, siteFailed, saved: null, created: false };
  }
  // A failed read of a NEW website still records the website the user named, so the next mention
  // of it matches this business instead of creating another.
  // A description written after a site that wouldn't load is about THAT site: same profile, not a new one.
  const toSave = siteFailed && input.url ? { ...profile, website: profile.website ?? input.url }
    : !input.url && input.knownWebsite ? { ...profile, website: input.knownWebsite } : profile;
  const { profile: saved, created } = await saveScoutProfile(input.email, toSave);
  return { profile: { ...profile, company: saved.name }, pagesRead, siteFailed, saved, created };
}
