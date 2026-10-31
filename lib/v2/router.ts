/**
 * Router (docs/v2-agents.md §3): types the message, reads audience and language, extracts slots.
 *
 * It has no `reply` field on purpose. v1's planner wrote the reply in the same call that
 * classified the message — before any search ran — which is where "Searching… hold on" on a turn
 * that only asked a question, and "found 50 dentists" after a zero result, came from (§7.1).
 */

import { callTool, normalize, MODELS, type Msg } from "./claude";
import type { FilterKey, Lang } from "./state";
import { ALL_FILTERS } from "./state";

/** R1–R14 from the production read, grouped by the path each one takes. */
export const TURN_TYPES = [
  "search",          // R1, R2, R5: a trade and/or place to find businesses in
  "refine",          // R4: more / wider / nearby / drop filters, said in words
  "explore_area",    // R3: a place but any kind of business
  "service_search",  // R6: wants clients for a service other than websites (SEO, ads, ERP, HR…)
  "brief",           // R7: a long structured B2B brief (counts, roles, contacts)
  "contacts",        // R8: phone numbers / emails of results
  "outreach",        // R9: contact them, follow up, "now what"
  "own_business",    // R10: their own URL or a description of what they sell
  "advice",          // R11: which niche, which city, how to pitch
  "product",         // R12: pricing, credits, sources, trust, how it works
  "vendor",          // R13: the user is the buyer, looking for a supplier
  "out_of_scope",    // R14: consumers, job seekers, spam
  "chat",            // greetings, thanks, anything conversational
] as const;
export type TurnType = (typeof TURN_TYPES)[number];

export type Audience = "seller" | "buyer" | "consumer" | "job_seeker" | "unknown";

export type RouterOutput = {
  type: TurnType;
  audience: Audience;
  lang: Lang;
  categoryText: string | null;
  areaText: string | null;
  /** "near me" / "around here" with no named place. */
  nearMe: boolean;
  noWebsiteOnly: boolean | null;
  minReviews: number | null;
  maxReviews: number | null;
  minRating: number | null;
  maxRating: number | null;
  excludeText: string[];
  /** How many results they asked for ("100 do", "total 50"). */
  count: number | null;
  more: boolean;
  widen: boolean;
  clear: FilterKey[];
  /** Conditions beyond the simple filters ("with online booking", "multispecialty"). Any → Planner. */
  qualifiers: string[];
  /** For service_search / own_business: what the user sells, in their words. */
  serviceText: string | null;
  /** A lead ask that names no trade, product or audience ("find leads for my business"). */
  genericOwn: boolean;
  /** A question or instruction about the results already found in this chat ("which of these have an email?"). */
  aboutResults: boolean;
  /** Several different business types asked for at once ("CA, lawyers and exporters"). */
  multiTrade: boolean;
  /** A business the user says these leads are FOR, by name ("for Acme", "Acme ke liye"); null if none. */
  forBusiness: string | null;
};

const TOOL = "route_message";

const ROUTER_TOOL = {
    name: TOOL,
    description: "Classify the user's latest message and extract search slots. Never write a reply.",
    input_schema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [...TURN_TYPES],
            description:
              "search: names a business type and/or a place to find businesses in (also 'near me'). " +
              "refine: asks for more results, a wider/nearby area, or to drop/change filters of the CURRENT search. " +
              "explore_area: a place but any/all kinds of business. " +
              "service_search: wants clients for a service or product other than website building (SEO, ads, ERP, CRM, HR staffing, video, app dev, software…). 'X buyers' or 'clients for X' means they SELL X. " +
              "brief: a structured request needing a planned run — counts with contacts, several trades, or business qualities beyond simple filters (old/outdated website, no SSL, not mobile friendly, no ads/pixel, no online booking, weak reviews, emails). " +
              "contacts: asks for phone numbers, emails or contact details. " +
              "outreach: wants to contact/follow up/'now what'. " +
              "own_business: shares their OWN website URL or describes what their own company sells (introducing themselves), without asking for a specific search. " +
              "advice: strategy — which niche/city to target, how to pitch, pricing their service. " +
              "product: questions about this product — credits, pricing, data sources, accuracy, how it works. " +
              "vendor: the user wants to BUY something for their own business (a supplier, an agency to do work for them). " +
              "out_of_scope: a consumer wanting a service for themselves, a job seeker looking for a job for THEMSELVES, spam or promotion. NOT out of scope: businesses that ARE HIRING (hiring is a buying signal Mantis reads — 'interior designers who are hiring' is brief), developers or dev companies as leads (Mantis searches public developer profiles — 'developers on github in Pune' is brief), and questions about the user's own account, credits, plan, leads, campaigns or settings (product). " +
              "chat: greetings, thanks, small talk.",
          },
          audience: {
            type: "string",
            enum: ["seller", "buyer", "consumer", "job_seeker", "unknown"],
            description: "seller = looking for clients to sell to (the normal user). buyer = looking for a vendor. consumer = wants a service for personal use.",
          },
          lang: {
            type: "string",
            enum: ["en", "hinglish", "hi"],
            description: "Language of THIS message: en (English), hinglish (Hindi in Roman script), hi (Devanagari). Plain English like 'hello' is en.",
          },
          categoryText: { type: ["string", "null"], description: "Business type exactly as the user wrote it ('CA', 'dentists', 'real estate agents'). Do not translate or broaden. Null if none named in this message." },
          areaText: { type: ["string", "null"], description: "Place named in this message, spelling fixed ('ggn' -> 'Gurugram'). Keep sub-areas ('Sector 56, Gurugram'). Null if none." },
          nearMe: { type: "boolean", description: "True if they said near me / around here / my area without naming a place." },
          noWebsiteOnly: { type: ["boolean", "null"], description: "true if they want businesses without a website, false if they explicitly don't care, null if not mentioned." },
          minReviews: { type: ["number", "null"], description: "Minimum review COUNT ('100+ reviews'). 'rating 100+' means reviews (ratings are 0-5)." },
          maxReviews: { type: ["number", "null"], description: "Maximum review count ('less than 15 reviews')." },
          minRating: { type: ["number", "null"], description: "Minimum star rating 0-5." },
          maxRating: { type: ["number", "null"], description: "Maximum star rating 0-5 ('below 4 stars')." },
          excludeText: { type: "array", items: { type: "string" }, description: "Business types they said to exclude ('no car repair', 'not beauticians')." },
          count: { type: ["number", "null"], description: "How many results they want, if they said a number of results ('100 do', 'total 50', 'give me 30'). Not a review count. Null otherwise." },
          more: { type: "boolean", description: "Asked for more / next / different results of the current search." },
          widen: { type: "boolean", description: "Asked for a wider or nearby area." },
          clear: {
            type: "array",
            items: { type: "string", enum: [...ALL_FILTERS] },
            description: "Filters they asked to REMOVE ('drop the filters' = all of them). Empty if none.",
          },
          serviceText: { type: ["string", "null"], description: "What the user sells, in their words, if they said it. Null otherwise." },
          qualifiers: { type: "array", items: { type: "string" }, description: "Conditions on the businesses beyond no-website / review / rating filters, verbatim: 'with online booking', 'with admissions pages', 'multispecialty', 'with online menus'. Empty if none." },
          genericOwn: { type: "boolean", description: "True when the message asks for leads/clients/customers but names NO business type, product or audience to find — 'find leads for my business', 'mujhe leads chahiye', 'get me clients in Delhi' (a place inside such an ask is still generic). False when any trade or buyer is named, and False for a message that is ONLY a place name ('coimbatore', 'PARIS FRANCE', 'UK') — that is an area (fill areaText), not an ask." },
          aboutResults: { type: "boolean", description: "True when the message is about the leads/results ALREADY found in this chat — 'which of these have an email', 'show only the ones with a website', 'enrich these', 'inme se kitne', 'sort them by rating'. False for a new search." },
          multiTrade: { type: "boolean", description: "True when the message asks for two or more different kinds of business at once ('real estate, CA, lawyers and export companies'; 'dentists aur gyms'). False for one kind (variants of the same kind count as one)." },
          forBusiness: { type: ["string", "null"], description: "If the user says who the leads are FOR by a company name ('for Acme', 'switch to acme.in', 'Acme ke liye'), that name or domain exactly as written; else null. Not the business type being searched." },
        },
        required: [
          "type", "audience", "lang", "categoryText", "areaText", "nearMe", "noWebsiteOnly",
          "minReviews", "maxReviews", "minRating", "maxRating", "excludeText", "count", "more", "widen", "clear", "serviceText", "qualifiers",
          "genericOwn", "aboutResults", "multiTrade", "forBusiness",
        ],
    },
};

const SYSTEM = `You route messages for Mantis, a tool that finds local businesses (leads) for agencies and freelancers to sell to.
Only call ${TOOL}. Read the latest user message in the light of the conversation, but extract slots ONLY from the latest message — earlier slots are tracked separately.
If the previous assistant turn asked a question and the user's message answers it (e.g. just a place name), classify it as search and fill the slot.
Rules that matter:
- A message that asks to FIND leads, clients, customers, buyers or prospects is a lead ask — type search, brief or service_search — even when it also introduces the user's business, shares a website, or asks for advice in the same breath ("my site is acme.in, find me 5 clients" is brief, not own_business).
- Several different business types at once, counts with contacts, or any quality of the business beyond simple filters make it brief.
- "more", "aur do", "10 more" after results = more:true (with count when given); do not invent a new trade for it.
- A question about the results already shown is aboutResults:true, whatever else it is typed as.
- Hindi/Hinglish counts as much as English: "nikalo", "chahiye", "dhundo" are lead asks.`;

/**
 * Chat filler that is never a request or an answer, however short. Decided in code, not by the
 * model: with a Gurugram search in history the model read "gg" as "ggn" (Gurugram) and typed it a
 * search, and the Planner re-ran the last run.
 */
export const FILLER = /^(gg|ok+|okay|k|kk|hi+|hey|hello|hmm+|thanks?|thank you|thx|ty|lol|haha|yes|yeah|yep|no|nope|nah|cool|nice|great|sure|done|wait|acha|accha|theek|thik|haan|ha|nahi|na|\?+|\.+)[!.?\s]*$/i;

export async function routeMessage(input: { message: string; history: Msg[]; hints?: { failedSite?: string | null } }): Promise<RouterOutput> {
  if (FILLER.test(input.message.trim())) return chatOnly(input.message);
  // Situation the model cannot see in the transcript: the user's site wouldn't load last turn, so a
  // one-line "we sell X to Y" now is them introducing the business, not a search.
  const situation = input.hints?.failedSite ? `
SITUATION: the user's website (${input.hints.failedSite}) failed to load on the previous turn and they were asked to describe what they sell in a line. A short description of a business now is own_business (with serviceText), unless it clearly asks to find something.` : "";
  const raw = await callTool({
    agent: "router",
    model: MODELS.cheap,
    system: SYSTEM + situation,
    messages: normalize(input.history, input.message),
    tool: ROUTER_TOOL,
    maxTokens: 400,
  });
  return sanitize(raw);
}

/** Model output is untrusted input: every field is re-validated, not just typed. */
function sanitize(raw: Record<string, unknown>): RouterOutput {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 160) : null);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
  let minRating = num(raw.minRating);
  let minReviews = num(raw.minReviews);
  // "rating 100+" is a review count, not a rating.
  if (minRating !== null && minRating > 5) {
    minReviews = minReviews ?? Math.round(minRating);
    minRating = null;
  }
  let maxRating = num(raw.maxRating);
  if (maxRating !== null && maxRating > 5) maxRating = null;
  return {
    type: TURN_TYPES.includes(raw.type as TurnType) ? (raw.type as TurnType) : "chat",
    audience: ["seller", "buyer", "consumer", "job_seeker"].includes(raw.audience as string) ? (raw.audience as Audience) : "unknown",
    lang: raw.lang === "hinglish" || raw.lang === "hi" ? raw.lang : "en",
    categoryText: str(raw.categoryText),
    areaText: str(raw.areaText),
    nearMe: raw.nearMe === true,
    noWebsiteOnly: typeof raw.noWebsiteOnly === "boolean" ? raw.noWebsiteOnly : null,
    minReviews: minReviews !== null ? Math.round(minReviews) : null,
    maxReviews: num(raw.maxReviews) !== null ? Math.round(num(raw.maxReviews)!) : null,
    minRating,
    maxRating,
    excludeText: Array.isArray(raw.excludeText) ? raw.excludeText.map(str).filter((s): s is string => !!s).slice(0, 5) : [],
    count: num(raw.count) !== null && num(raw.count)! >= 1 ? Math.round(num(raw.count)!) : null,
    more: raw.more === true,
    widen: raw.widen === true,
    clear: Array.isArray(raw.clear) ? raw.clear.filter((f): f is FilterKey => ALL_FILTERS.includes(f as FilterKey)) : [],
    serviceText: str(raw.serviceText),
    qualifiers: Array.isArray(raw.qualifiers) ? raw.qualifiers.map(str).filter((x): x is string => !!x).slice(0, 5) : [],
    genericOwn: raw.genericOwn === true,
    aboutResults: raw.aboutResults === true,
    multiTrade: raw.multiTrade === true,
    forBusiness: str(raw.forBusiness),
  };
}

function chatOnly(message: string): RouterOutput {
  return {
    type: "chat", audience: "unknown", lang: /\b(acha|accha|theek|thik|haan|nahi)\b/i.test(message) ? "hinglish" : "en",
    categoryText: null, areaText: null, nearMe: false, noWebsiteOnly: null,
    minReviews: null, maxReviews: null, minRating: null, maxRating: null, excludeText: [],
    count: null, more: false, widen: false, clear: [], serviceText: null, qualifiers: [],
    genericOwn: false, aboutResults: false, multiTrade: false, forBusiness: null,
  };
}
