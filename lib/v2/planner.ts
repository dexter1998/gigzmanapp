/**
 * Planner (docs/v2-agents.md §2–3). The model decides WHAT (playbooks, trades, place, count,
 * contacts); code compiles that into a fixed list of typed steps from our own tool catalog and
 * prices it. Nothing runs here — a plan waits as `planned` until the user taps Run.
 */

import { sql } from "@/lib/db";
import { resolveCategoryPhrase } from "@/lib/category-resolve";
import { formatCategory, TYPE_TO_SECTION } from "@/lib/categories";
import { ALLOWED_LEAD_TYPES_SQL } from "@/lib/lead-quality";
import { geocodeText } from "@/lib/geocode";
import { CREDIT_COST } from "@/lib/credits/pricing";
import { callAgent, normalize, MODELS, type Msg } from "./claude";
import { businessTypeById } from "./business-types";
import { BUYER_SIZE_SCHEMA, DEFAULT_BUYER_SIZE, cleanBuyerSize, type BuyerSize } from "./size-fit";
import { PLAYBOOKS, SIGNALS, catalogForPrompt, playbookById, playbookForSignal, type SignalId } from "./playbooks";
import { resolveArea, localPlace, lastMapCenter, placeName } from "./search";
import type { SellerProfile } from "./scout";
import type { ChatState } from "./state";
import { pipelineId, NO_SITE_IMPLIES } from "./runner";
import { chooseApproach, recordApproach } from "./orchestrator";
import { cleanColumns, DEFAULT_COLUMNS, EXTRA_COLUMNS_SCHEMA, type ExtraColumn } from "./extras";

export type RunStepPlan = { op: "discover" | "collect" | "qualify" | "contacts" | "rank"; label: string; input: Record<string, unknown> };

export type CompiledPlan = {
  /** The orchestrator's plan-time decision (lib/v2/orchestrator.ts): shown on the scope card. */
  approach?: { reusePipelineId: string | null; reasoning: string; confidence: number };
  title: string;
  goal: "clients" | "vendors";
  service: string | null;
  playbookIds: string[];
  /** Related place types for the "adjacent" strategy. */
  adjacentTypes?: string[];
  /** Ways to find them, in order; the Runner walks down this list until the target is met. */
  strategies?: Array<"primary" | "wide" | "adjacent" | "names" | "registry" | "github" | "web_search" | "funding_news">;
  /** What makes a business buy this NOW, as the Planner reasoned it ("opening a new outlet"). */
  buyerTrigger?: string | null;
  /** Company sizes that can realistically buy from this seller (lib/v2/size-fit.ts); rank puts them first. */
  buyerSize?: BuyerSize | null;
  /** The Planner's short reasoning and the data it checked before choosing (shown, and logged). */
  reasoning?: string | null;
  checks?: Array<{ tool: string; input: Record<string, unknown>; output: string }>;
  /** Bulk test runs: no billed Google calls (set per request by the test suite, never in chat). */
  savedOnly?: boolean;
  /** The trades in the user's words — the web-search strategy queries with these. */
  tradeWords?: string[];
  /** Distinctive words of the asked-for trades, matched against business names in every collect. */
  nameHints?: string[];
  /** Words a Maps business NAME must contain to be what was asked ("silver" for silver-jewellery
   *  makers) — the place type alone ("jewelry_store") brought back gold showrooms. */
  nameMustContain?: string[];
  /** Default mode: no category fitted, so businesses are matched by words in their NAME. Logged as a gap. */
  keywords?: string[];
  /** "country" = pan-India: no map search, saved businesses and web search across the country. */
  scope?: "local" | "country";
  /** Earlier runs this one continues ("find more"): what they delivered is skipped. */
  excludeRunIds?: string[];
  /** Signals a result MUST have — what the user explicitly asked for ("no Google Analytics"). */
  mustHave: SignalId[];
  /** With 2+ mustHave: "segments" = each signal is its own reason to qualify, the target split into
   *  quotas (runner segmentsOf); "all" = every signal on the same business, only when the user says so. */
  signalMode?: "segments" | "all";
  trades: Array<{ placeType: string; label: string }>;
  areaText: string;
  center: { lat: number; lng: number };
  radiusM: number;
  target: number;
  needContacts: boolean;
  assumptions: string | null;
  cannotDo: string | null;
  steps: RunStepPlan[];
  estCredits: number;
  /** Extra lead-table columns for this ICP / offer (lib/v2/extras.ts), filled per delivered lead. */
  extraColumns?: ExtraColumn[];
};

export type PlanOutcome =
  | { ok: true; runId: string; plan: CompiledPlan }
  | { ok: false; reason: "no_trade" | "no_area"; message: string; unresolved: string[]; areaOptions?: Array<{ label: string; why: string }>; notFound?: string; tooBroad?: string };

const TOOL = {
  name: "make_plan",
  description: "Decide what lead run to set up for the user.",
  input_schema: {
    type: "object",
    properties: {
      buyerTrigger: { type: "string", description: "FIRST decide this: the event that makes a business need what the user sells NOW, in a few words ('opening a new outlet or kitchen', 'preparing its next funding round', 'hiring fast', 'weak Instagram'). It drives the playbook and the source." },
      source: { type: "string", enum: ["maps", "web", "funding_news", "github"], description: "Where these buyers are actually listed. maps = local shops, clinics, restaurants, factories, offices on Google Maps. funding_news = startups that raised money (anyone selling to startups: fundraising/M&A advisors, VCs, startup SaaS, recruiters). web = companies and products that are not on Maps (SaaS, importers, B2B firms). github = developers." },
      goal: { type: "string", enum: ["clients", "vendors"], description: "clients = businesses to sell to; vendors = the user wants to buy from them." },
      service: { type: ["string", "null"], description: "What the user sells, plain words." },
      playbookIds: { type: "array", items: { type: "string", enum: PLAYBOOKS.map((p) => p.id) }, description: "1-2 playbooks whose signals fit the service. Empty for a plain vendor search." },
      mustHave: { type: "array", items: { type: "string", enum: Object.keys(SIGNALS) }, description: "Signals the user explicitly required (e.g. 'no Google Analytics' -> no_analytics; 'no Meta ads/pixel' -> no_meta_pixel; 'no website' -> no_website). Empty if they only described a service." },
      signalMode: { type: "string", enum: ["segments", "all"], description: "Only matters with 2+ mustHave. 'segments' (default): each signal is a separate reason a business qualifies, and results are split between them ('CAs with no website and no Meta ads' = some with no website, some whose site has no Meta pixel). 'all': only when the user clearly wants every signal on the same business ('both', 'all of these', 'and also')." },
      placeTypes: { type: "array", items: { type: "string", enum: ALLOWED_LEAD_TYPES_SQL }, description: "1-6 Google place types to search, chosen from this list only — the kinds of business that BUY what the user sells. Pick the closest ones (logistics -> courier_service, moving_company, shipping_service, transportation_service). When the user wants leads across different industries, pick 4-6 DISTINCT industries that each buy it. Empty when the buyers are not local businesses (startups, SaaS, importers) — never stand in coworking/consultant/business_center for startups." },
      adjacentPlaceTypes: { type: "array", items: { type: "string", enum: ALLOWED_LEAD_TYPES_SQL }, description: "0-3 closely related place types to try if the main ones run short (dentist -> dental_clinic, orthodontist). Empty if none fit." },
      tradeWords: { type: "array", items: { type: "string" }, description: "The trades in plain words as the user would say them ('logistics companies', 'freight forwarders', 'sterling silver jewellery importers'). Used for labels, web search and, if no place type fits, to match business names." },
      nameMustContain: { type: "array", items: { type: "string" }, description: "0-3 single words a business's NAME must contain to be what the user asked, when the place type is broader than the ask — ALWAYS set them when no place type means the trade exactly (coaching institutes → educational_institution holds driving schools and art galleries, so ['coaching','classes','academy']): 'silver jewellery makers' -> ['silver'] (jewelry_store also holds gold showrooms); 'sterling silver importers' -> ['silver','sterling']. EMPTY when the place type already means it (dentists, plumbers) or when names wouldn't show it (multispecialty hospitals, schools with admissions pages)." },
      areaText: { type: ["string", "null"], description: "City/area the USER named, in this message or earlier in this chat. Country-wide asks ('pan India', 'all over India', 'across India') → 'India'. Never take it from the seller profile — that is where the seller works, not where they want leads. Null if the user named none; the app will ask." },
      target: { type: "number", description: "Exactly how many results they asked for ('just 3' = 3, '5 leads' = 5). Default 20 only when they named no number; max 50." },
      needContacts: { type: "boolean", description: "Whether to find emails from each business's website. Default TRUE — reading emails costs nothing; false only if the user said they don't need contacts." },
      assumptions: { type: ["string", "null"], description: "One short line naming defaults you chose (e.g. '20 results; read \"old website\" as copyright older than 2 years')." },
      cannotDo: { type: ["string", "null"], description: "Anything in the request this catalog cannot do (e.g. named HR heads, company size), one line. Null if all doable." },
      extraColumns: EXTRA_COLUMNS_SCHEMA,
      buyerSize: BUYER_SIZE_SCHEMA,
    },
    required: ["buyerSize", "buyerTrigger", "source", "goal", "service", "playbookIds", "mustHave", "placeTypes", "tradeWords", "nameMustContain", "areaText", "target", "needContacts", "assumptions", "cannotDo", "extraColumns"],
  },
};

const DISCOVER_RADIUS_M = 3000;
/** Country-wide asks. "pan India" was asked back twice as "which city?" before this existed. */
export const COUNTRY_RE = /\b(pan[\s-]?india|all[\s-]?(over[\s-]?)?india|across[\s-]+india|(the\s+)?whole\s+(of\s+)?india|entire\s+india|india[\s-]?wide|nation[\s-]?wide|all\s+over\s+the\s+country|across\s+the\s+country|anywhere\s+in\s+india|poore\s+india|pure\s+india|sare\s+india)\b/i;
export const isCountryArea = (a: string | null | undefined) => !!a && (COUNTRY_RE.test(a) || /^\s*(pan[\s-]?)?india\s*$/i.test(a));
const INDIA_CENTER = { lat: 22.35, lng: 78.67 };

/** "near me / nearby / my area" — the user means where they are, not "no area" (prod: "Gyms near me"
 *  was asked "Which city?" every time). */
export const NEAR_ME_RE = /\b(last\s+(searched\s+)?(area|location|place)|near\s*(me|by)|nearby|around\s+me|my\s+(city|area|location|locality)|aas[\s-]?paas|mere\s+(paas|area|shehar))\b/i;

/** A country or state is not a point: geocoded to its centroid with a 3 km radius it finds nothing
 *  (prod: USA, UK, Dubai, Kerala, Gujarat, Tamil Nadu all ended 0–1 of 20). Ask for its cities instead.
 *  India itself is the one country with a real nationwide path (registry + saved pool). */
const BROAD_AREAS: Record<string, string[]> = {
  "usa": ["New York", "Los Angeles", "Chicago", "Houston", "Dallas"], "us": ["New York", "Los Angeles", "Chicago", "Houston", "Dallas"],
  "united states": ["New York", "Los Angeles", "Chicago", "Houston", "Dallas"], "america": ["New York", "Los Angeles", "Chicago", "Houston", "Dallas"],
  "uk": ["London", "Manchester", "Birmingham", "Leeds"], "united kingdom": ["London", "Manchester", "Birmingham", "Leeds"], "england": ["London", "Manchester", "Birmingham", "Leeds"],
  "uae": ["Dubai", "Abu Dhabi", "Sharjah"], "united arab emirates": ["Dubai", "Abu Dhabi", "Sharjah"],
  "australia": ["Sydney", "Melbourne", "Brisbane", "Perth"], "canada": ["Toronto", "Vancouver", "Montreal", "Calgary"],
  "germany": ["Berlin", "Munich", "Hamburg"], "france": ["Paris", "Lyon", "Marseille"], "singapore": ["Singapore"],
  "saudi arabia": ["Riyadh", "Jeddah", "Dammam"], "nigeria": ["Lagos", "Abuja"], "kenya": ["Nairobi", "Mombasa"],
  "kerala": ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur"], "gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  "tamil nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli"], "tamilnadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli"],
  "maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik"], "karnataka": ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi"],
  "rajasthan": ["Jaipur", "Udaipur", "Jodhpur", "Kota"], "uttar pradesh": ["Lucknow", "Noida", "Kanpur", "Varanasi"], "up": ["Lucknow", "Noida", "Kanpur", "Varanasi"],
  "punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Mohali"], "haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala"],
  "madhya pradesh": ["Indore", "Bhopal", "Gwalior", "Jabalpur"], "mp": ["Indore", "Bhopal", "Gwalior", "Jabalpur"],
  "west bengal": ["Kolkata", "Howrah", "Siliguri", "Durgapur"], "telangana": ["Hyderabad", "Warangal"], "andhra pradesh": ["Visakhapatnam", "Vijayawada", "Guntur"],
  "bihar": ["Patna", "Gaya", "Muzaffarpur"], "odisha": ["Bhubaneswar", "Cuttack"], "assam": ["Guwahati", "Dibrugarh"],
  "delhi ncr": ["South Delhi", "Gurugram", "Noida", "Dwarka"], "ncr": ["South Delhi", "Gurugram", "Noida", "Dwarka"],
};
export const broadAreaCities = (a: string | null | undefined) => (a ? BROAD_AREAS[a.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim()] ?? null : null);

/** "Sized for you: small to mid companies (a 5-person agency can't win national chains)." */
function sizeNote(b: BuyerSize | null): string | null {
  if (!b) return null;
  const word: Record<string, string> = { solo: "one-person", small: "small", mid: "mid-size", large: "large", enterprise: "enterprise" };
  const band = b.min === b.max ? word[b.min] : `${word[b.min]} to ${word[b.max]}`;
  return `Sized for you: ${band} companies first${b.why ? ` (${b.why.replace(/[.\s]+$/, "")})` : ""} — say "include big brands" to change it.`;
}

export async function makePlan(input: {
  chatId: string; userEmail: string; message: string; history: Msg[];
  profile: SellerProfile | null; state: ChatState; savedOnly?: boolean;
  /** The device's location for "near me" asks (browser permission), exact. */
  here?: { lat: number; lng: number } | null;
}): Promise<PlanOutcome> {
  const profileText = input.profile
    ? `SELLER PROFILE: ${input.profile.summary} Business type: ${businessTypeById(input.profile.businessModel)?.label ?? "unknown"}; sells to ${input.profile.sellsTo ?? "unknown"}. Services: ${input.profile.services.join(", ")}. Targets: ${input.profile.targetTrades.join(", ")}.${input.profile.partnerTrades?.length ? ` Partners: ${input.profile.partnerTrades.join(", ")}.` : ""} Areas: ${input.profile.targetAreas.join(", ")}.`
    : "No seller profile yet.";
  const current = input.state.areaText ? `Current chat area: ${input.state.areaText}.` : "";
  const system = [
    "You are the Planner for Mantis, a lead finder. Mantis finds businesses (Google Maps listings, web/news search, GitHub), reads their websites and public profiles for signals, and finds contacts. Choose a run from the catalog below; never invent signals or sources outside it.",
    "Think like a sales researcher before you choose — in 2-4 short lines of text, then the tool call:",
    "1. What does the user sell, who buys it, and what EVENT makes a business buy it now (buyerTrigger)? A refrigeration seller's buyers are restaurants, bakeries, supermarkets, pharmacies, hotels — opening or expanding. A fundraising advisor's buyers are startups preparing their next round. A social media agency's buyers are businesses with weak or no Instagram.",
    "2. Which catalog signals show that trigger? Business-state signals (hiring, funded/raise_due, several branches, weak social) usually matter more than website flaws; website flaws (no analytics, no pixel, old site) are for web/marketing sellers.",
    "3. Where are these buyers listed (source)? Local businesses → Google Maps place types. Startups/funded companies → funding_news. SaaS/products/importers/B2B firms, IT / software / tech companies → web (Maps types like consultant, service or business_center are NOT software companies — don't stand them in). Developers → github.",
    "4. Check before committing: call check_data for the place types and area to see how many saved businesses exist (a type with 0 there is a poor first pick), and peek_web once if you rely on web or news. At most 3 look-ups.",
    "5. buyerSize: which company sizes can realistically buy from THIS seller at its size and price — a 5-person agency cannot win Amazon, Taj Hotels or a national chain, so a small seller's band stops at mid unless the user asked for big companies.",
    "6. extraColumns: the 4-8 facts about each lead this seller would want to see in the table before pitching (founder, team size, branches, funding, services, tech stack, price range…) — specific to their offer, not a generic list.",
    "When the user names the businesses they want (\"cafes in Indiranagar\", \"real estate developers\"), find exactly those. The seller profile then only helps choose which signals to read and which columns to show — never add a condition the user did not ask for (no 'raised funding' on a developers ask because the seller is a fundraising advisor), never swap in other trades, and never list a seller-specific signal as 'not possible'. Derive buyers from the profile only when the user asked for leads without naming them.",
    "Prefer sensible defaults over questions for trades and count (20 results unless asked). The area is the exception: use only a place the user named in this chat; if none, leave areaText null and the app asks.",
    "goal: when the user SELLS to them (importers, distributors, wholesale buyers, retailers who would stock their product), it is 'clients', not 'vendors'.",
    "Default pipeline when the user just names businesses: find them, read each website for emails, hiring and the company LinkedIn (needContacts true). Any condition the user states about the business or its website goes in mustHave if a signal exists for it: 'with online booking' -> has_booking, 'online menus' -> has_menu, 'admissions pages' -> has_admissions, 'hiring' -> hiring, 'multiple branches' -> multi_location, 'no website listed' -> no_website, 'no Google Analytics' -> no_analytics, 'raised funding' -> funded, 'no Instagram' -> no_instagram. If no signal exists for a stated condition, say so in cannotDo.",
    profileText, current, catalogForPrompt(),
  ].join("\n\n");
  const agent = await callAgent({
    agent: "planner",
    model: MODELS.best,
    system,
    messages: normalize(input.history, input.message),
    final: TOOL,
    tools: LOOKUP_TOOLS,
    handlers: lookupHandlers(input.state),
    maxRounds: 4,
    maxTokens: 3500,
  });
  const raw = agent.input;

  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : []);
  // Stated conditions are also read deterministically: the batch test showed the model naming the
  // right playbook yet leaving mustHave empty, which ranked "salons with online booking" on nothing.
  // A required signal must be one the user actually asked for. The model kept promoting a playbook's
  // signals ("coming soon / just opened", "several branches") to mustHave on generic asks, and the
  // rank step then filtered everything out (replay 2026-10-26: 6 runs delivered 0/20). What the user
  // did not state stays a ranking preference through the playbook, not a filter.
  const stated = statedSignals(input.message);
  const msgWords = new Set(input.message.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4));
  const mentioned = (sig: string) => sig in SIGNALS && SIGNALS[sig as SignalId].label.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4).some((w) => msgWords.has(w));
  const mustHave = [...new Set([...stated, ...list(raw.mustHave).filter((x) => stated.includes(x as SignalId) || mentioned(x))])].filter((x): x is SignalId => x in SIGNALS).slice(0, 3);
  const playbookIds = list(raw.playbookIds).filter((id) => playbookById(id)).slice(0, 2);
  // "What the site offers" only earns its place when one of its signals was actually asked for.
  for (let k = playbookIds.length - 1; k >= 0; k--) {
    if (playbookIds[k] === "site-features" && !mustHave.some((m) => playbookById("site-features")!.signals.includes(m))) playbookIds.splice(k, 1);
  }
  // A required signal must be read by some chosen playbook, or nothing would ever measure it.
  for (const sig of mustHave) {
    const book = playbookForSignal(sig);
    if (book && !playbookIds.some((id) => playbookById(id)!.signals.includes(sig))) playbookIds.push(book.id);
  }
  const tradeTexts = list(raw.tradeWords).slice(0, 4);
  const trades: CompiledPlan["trades"] = [];
  const add = (type: string | null) => {
    if (type && TYPE_TO_SECTION[type] && !trades.some((x) => x.placeType === type)) trades.push({ placeType: type, label: formatCategory(type) ?? type });
  };
  for (const t of list(raw.placeTypes).slice(0, 6)) add(t);
  const unresolved: string[] = [];
  if (!trades.length) for (const t of tradeTexts) { const type = resolveCategoryPhrase(t); if (type) add(type); else unresolved.push(t); }
  // Default mode: nothing fitted a category, so match the words against business NAMES rather
  // than come back empty. The turn logs it as a gap — this is a trade the catalog should learn.
  const keywords = trades.length ? [] : nameKeywords(tradeTexts);
  if (!trades.length && !keywords.length) {
    return { ok: false, reason: "no_trade", message: "I couldn't turn that into business types I can search.", unresolved };
  }

  // Not on Maps at all (SaaS, developers): web search / GitHub go first and no area is needed.
  // "startups" / "early-stage" alone also means news: they ended up as a Maps NAME match ("Startup Cafe")
  // or ran news then lost every row to a no-website filter (prod 2026-10-24/25: 9 runs, 0 delivered).
  const fundingSource = raw.source === "funding_news" || playbookIds.includes("funded-startups") || /\b(funded|raised (funding|money|a round)|fundrais|start[\s-]?ups?|early[\s-]stage)\b/i.test(input.message);
  // "Startups with no website": startups come from funding news / web search, and those sources only
  // know a company BY its website — the requirement can never be met (production 2026-10-24: 7 runs,
  // 0 delivered, no explanation). Say so on the plan and search without the filter, rather than run
  // to zero.
  let conflictNote: string | null = null;
  if ((fundingSource || raw.source === "web" || raw.source === "github") && mustHave.some((m) => m === "no_website" || m === "social_as_website")) {
    for (const m of ["no_website", "social_as_website"] as SignalId[]) { const i = mustHave.indexOf(m); if (i >= 0) mustHave.splice(i, 1); }
    conflictNote = "Startups and online companies are found through funding news and web search, which only know a company by its website — so \"no website\" can't be applied to them. I'll find the startups and show each one's website state instead; for businesses with no website at all, ask for a local trade (shops, clinics, restaurants) in a city.";
  }
  // Several signals: separate reasons to qualify (segments, the default) unless the user asked for
  // all of them on one business. "No website" + something only a site can HAVE ("online booking")
  // can never be one business, so that is always segments.
  const listingAbsent = mustHave.some((m) => m === "no_website" || m === "social_as_website");
  const impossibleAll = listingAbsent && mustHave.some((m) => SIGNALS[m]?.source === "site" && !NO_SITE_IMPLIES.has(m) && m !== "site_down");
  const signalMode: "segments" | "all" | undefined = mustHave.length < 2 ? undefined : raw.signalMode === "all" && !impossibleAll ? "all" : "segments";
  if (fundingSource && !playbookIds.includes("funded-startups")) playbookIds.push("funded-startups");
  // Where the buyers are listed is the Planner's own decision (source), made with the seller in view —
  // "real estate developers" for a furniture seller are builders, not GitHub profiles. Matching the
  // words only stands in when the model gave no source (production test I-02: three runs of
  // software companies for builder / coworking asks).
  const sourceGiven = ["maps", "web", "funding_news", "github"].includes(String(raw.source));
  // No source from the model: Maps when it chose place types, else web — never a word match
  // (Tarun: identification is the agent's job, not a regex's).
  const products = raw.source === "web" || fundingSource || (!sourceGiven && !trades.length);
  const developers = raw.source === "github";

  // Area: only a place the user named — in this message, or earlier in the chat (its current area).
  // Production runs showed the old chain (… → profile → last map area) never asking: 18 of 22 runs
  // that named a place named one OTHER than the profile's, so the profile is a poor guess, and a
  // silent wrong city spends the whole run in the wrong place.
  const userText = [input.message, ...input.history.filter((m) => m.role === "user").map((m) => m.content)].join(" ").toLowerCase();
  const profileAreas = (input.profile?.targetAreas ?? []).map((a) => a.toLowerCase());
  const named = typeof raw.areaText === "string" && raw.areaText.trim() ? raw.areaText.trim() : null;
  // The model sometimes still copies the profile's city; that counts only if the user said it too.
  const saidArea = named && (!profileAreas.includes(named.toLowerCase()) || userText.includes(named.toLowerCase().split(",")[0])) ? named : null;
  // What the user named THIS time wins, alone: a failed geocode used to fall back silently to the chat's
  // old area (prod: a Vietnam map area answering "Dentists who need a website").
  const areaCandidates = (saidArea ? [saidArea] : [input.state.areaText]).filter((x): x is string => !!x);
  // Web / news / GitHub asks aren't bound to a map point, so a whole country is fine for them.
  const broad = products || developers ? null : broadAreaCities(saidArea ?? input.state.areaText);
  if (broad) {
    const region = (saidArea ?? input.state.areaText)!;
    return { ok: false, reason: "no_area", message: `${region} is too big to search as one place.`, unresolved: [], tooBroad: region,
      areaOptions: broad.map((c) => ({ label: c, why: `A city in ${region}` })) };
  }
  let center: { lat: number; lng: number } | null = null;
  let areaText = "";
  // Pan-India is a scope, not a point on the map: no geocode, and the run reads the whole country.
  const country = COUNTRY_RE.test(input.message) || isCountryArea(saidArea) || (!saidArea && isCountryArea(input.state.areaText));
  if (country) { center = INDIA_CENTER; areaText = "India"; }
  for (const a of country ? [] : areaCandidates) {
    const hit = await resolveArea(a);
    if (hit) { center = { lat: hit.lat, lng: hit.lng }; areaText = a; break; }
  }
  let assumedArea: string | null = null;
  const last = center ? null : await lastMapCenter(input.userEmail);
  // "near me": the user's own area — their business's city first, then where they last looked on the map.
  // "my last searched area" means the last area, not where the device is now.
  if (!center && !saidArea && NEAR_ME_RE.test(userText) && input.here && !/\blast\s+(searched\s+)?(area|location|place)\b/i.test(input.message)) {
    center = input.here; areaText = (await placeName(input.here)) ?? "your current location"; assumedArea = `${areaText} (your current location)`;
  }
  if (!center && !saidArea && NEAR_ME_RE.test(userText)) {
    for (const a of input.profile?.targetAreas ?? []) {
      center = (await localPlace(a)) ?? (await geocodeText(a)).value;
      if (center) { areaText = a; assumedArea = a; break; }
    }
    if (!center && last) { center = { lat: last.lat, lng: last.lng }; areaText = last.label; assumedArea = last.label; }
  }
  if (!center && !saidArea && (products || developers)) {
    // Web search isn't bound to a map area; the profile/last area only orders the results.
    for (const a of input.profile?.targetAreas ?? []) {
      center = (await localPlace(a)) ?? (await geocodeText(a)).value;
      if (center) { areaText = a; assumedArea = a; break; }
    }
    if (!center && last) { center = { lat: last.lat, lng: last.lng }; areaText = last.label; assumedArea = last.label; }
  }
  if (!center) {
    // Ask — with the likely answers one tap away.
    // The business's own cities first, then the area of the user's last chat run — not the map's
    // last scan, which for a new account is the dashboard's default centre ("Sector 31, Gurgaon"
    // offered to a Jaipur business, production re-test N-01).
    const own = (input.profile?.targetAreas ?? []).slice(0, 3);
    const [lastRun] = await sql`SELECT plan->>'areaText' AS a FROM v2_runs WHERE user_email = ${input.userEmail} AND plan->>'areaText' IS NOT NULL AND plan->>'areaText' <> 'India' ORDER BY created_at DESC LIMIT 1`;
    const lastArea = typeof lastRun?.a === "string" && lastRun.a.trim() ? lastRun.a.trim() : null;
    const areaOptions = [
      ...own.map((a) => ({ label: a, why: "Where your business works" })),
      ...(lastArea && !own.some((a) => a.toLowerCase() === lastArea.toLowerCase()) ? [{ label: lastArea, why: "Your last search" }] : []),
      { label: "All of India", why: "Pan-India — saved businesses and web search across the country" },
    ];
    // The user named a place we could not locate: say so, instead of asking as if they had not.
    return { ok: false, reason: "no_area", message: "Which city or area should this run cover?", unresolved, areaOptions, ...(saidArea ? { notFound: saidArea } : {}) };
  }

  // The count the user asked for, exactly — "just 3" is 3 (it used to be raised to 5).
  const target = Math.max(1, Math.min(50, Math.round(typeof raw.target === "number" ? raw.target : 20)));
  const needContacts = raw.needContacts !== false;
  const books = playbookIds.map((id) => playbookById(id)!);
  const needsSite = needContacts || books.some((b) => b.signals.some((s) => SIGNALS[s].source === "site"));

  const steps: RunStepPlan[] = [
    // A map search covers ~3 km; across India the saved businesses + web search do the finding.
    ...(country ? [] : trades).map((t) => ({ op: "discover" as const, label: `Search maps: ${t.label.toLowerCase()} in ${areaText}`, input: { placeType: t.placeType } })),
    keywords.length
      ? { op: "collect", label: `Find saved businesses named: ${keywords.join(", ")}`, input: { keywords, strategy: "names" } }
      : { op: "collect", label: books.length ? `Collect candidates & check ${books.map((b) => b.label.toLowerCase()).join(" / ")}` : "Collect candidates", input: { strategy: "primary" } },
    ...(needsSite ? [{ op: "qualify" as const, label: mustHave.length
      ? `Visit websites until ${target} have: ${mustHave.map((m) => SIGNALS[m].label.toLowerCase()).join(signalMode === "segments" ? " or " : ", ")}`
      : needContacts ? "Read websites: emails & company LinkedIn" : "Visit websites & read signals", input: {} }] : []),
    ...(needContacts ? [{ op: "contacts" as const, label: "Find emails (Mantis registry + websites)", input: {} }] : []),
    { op: "rank", label: `Rank & keep the best ${target}`, input: {} },
  ];

  const tradeWord = trades.length && !fundingSource ? trades.map((t) => t.label.toLowerCase()).join(", ") : tradeTexts.join(", ") || "funded startups";
  const plan: CompiledPlan = {
    title: `${tradeWord} · ${areaText}`,
    goal: raw.goal === "vendors" ? "vendors" : "clients",
    buyerTrigger: typeof raw.buyerTrigger === "string" ? raw.buyerTrigger.slice(0, 160) : null,
    buyerSize: cleanBuyerSize(raw.buyerSize) ?? DEFAULT_BUYER_SIZE,
    reasoning: agent.thought ? agent.thought.slice(0, 800) : null,
    checks: agent.trace.slice(0, 4),
    savedOnly: input.savedOnly === true ? true : undefined,
    service: typeof raw.service === "string" ? raw.service.slice(0, 80) : input.profile?.primaryService ?? null,
    playbookIds,
    mustHave,
    ...(signalMode ? { signalMode } : {}),
    keywords: keywords.length ? keywords : undefined,
    nameHints: nameKeywords(tradeTexts),
    nameMustContain: list(raw.nameMustContain).map((w) => w.toLowerCase().replace(/[^a-z]/g, "")).filter((w) => w.length >= 3).slice(0, 3),
    tradeWords: tradeTexts,
    adjacentTypes: list(raw.adjacentPlaceTypes).filter((t) => TYPE_TO_SECTION[t] && !trades.some((x) => x.placeType === t)).slice(0, 3),
    strategies: await strategyOrder({
      products,
      developers,
      hasTypes: trades.length > 0,
      manyTypes: trades.length >= 3,
      hasAdjacent: list(raw.adjacentPlaceTypes).some((t) => TYPE_TO_SECTION[t] && !trades.some((x) => x.placeType === t)),
      hasWords: nameKeywords(tradeTexts).length > 0,
    }),
    trades,
    areaText,
    center,
    radiusM: DISCOVER_RADIUS_M,
    scope: country ? "country" : "local",
    target,
    needContacts,
    assumptions: [
      typeof raw.assumptions === "string" ? raw.assumptions.slice(0, 200) : null,
      assumedArea ? (products || developers ? `No area named — web search isn't tied to one; ordered around ${assumedArea}.` : `Searching near you: ${assumedArea}. Name a place to change it.`) : null,
      keywords.length ? `No exact business category for "${tradeTexts.join(", ")}" — matching business names instead, so some results may be off.` : null,
      sizeNote(cleanBuyerSize(raw.buyerSize)),
    ].filter(Boolean).join(" ") || null,
    // "Has a website" is not a missing capability — website-signal plans only ever read sites that exist.
    cannotDo: [conflictNote, typeof raw.cannotDo === "string" && !/has a website|have a website|with a website/i.test(raw.cannotDo) ? raw.cannotDo.slice(0, 200) : null].filter(Boolean).join(" ") || null,
    steps,
    extraColumns: planColumns(raw.extraColumns),
    // Upper bound: ~2 billed Places calls per trade; a repeat of an already-searched area is free.
    // No live map search across India, so nothing billed there.
    // Upper bound: live map searches + every delivered lead (charged once per business, at delivery).
    // Upper bound: ~2 live lookups per trade (charged only past the free allowance) + new leads.
    estCredits: (country ? 0 : trades.length * 2 * CREDIT_COST.billed_places_call) + target * CREDIT_COST.lead_unlock,
  };
  // A name filter narrows Maps a lot; web search is then the next place to look, not the last.
  if (plan.nameMustContain?.length && plan.strategies?.includes("web_search")) {
    const st = plan.strategies.filter((x) => x !== "web_search");
    plan.strategies = [st[0], "web_search", ...st.slice(1)];
  }
  // Across India "same type, wider area" means nothing, and web search belongs early.
  if (country) {
    const st = (plan.strategies ?? []).filter((x) => x !== "wide");
    plan.strategies = [st[0] ?? "primary", ...(st.includes("web_search") ? ["web_search" as const] : []), ...st.slice(1).filter((x) => x !== "web_search")];
  }
  // Startups that raised money are found in funding news, not on Maps — that source goes first.
  if (fundingSource) plan.strategies = ["funding_news", ...(plan.strategies ?? []).filter((x) => x !== "funding_news")];
  // The orchestrator decides the source order (and whether to reuse a past pipeline) with the
  // registry and memory in front of it; the rule-based order above is only its fallback.
  const defaultOrder = await byUseCaseWins(pipelineId(plan), plan.strategies ?? []);
  const approach = input.savedOnly && process.env.V2_ORCHESTRATOR !== "1"
    ? null
    : await chooseApproach({ plan, defaultOrder, seller: input.profile, offering: input.profile?.primaryService ?? null, message: input.message });
  plan.strategies = approach?.strategies.length ? approach.strategies : defaultOrder;
  if (approach?.reasoning) plan.approach = { reusePipelineId: approach.reusePipelineId, reasoning: approach.reasoning, confidence: approach.confidence };
  // The first collect runs the ladder's first rung (GitHub for developer asks), not always "primary".
  const first = plan.strategies?.[0];
  // Name-match default mode keeps its own first step — unless the ask belongs to a source that isn't
  // Maps at all (web search / GitHub), which then goes first.
  if (first && (!keywords.length || first === "web_search" || first === "github" || first === "funding_news")) {
    plan.steps = plan.steps.map((st) => (st.op === "collect" ? { ...st, input: { ...st.input, strategy: first },
      label: first === "github" ? "Find developers & dev companies from developer profiles" : first === "web_search" ? "Find companies via web search" : st.label } : st));
  }
  if (first === "funding_news") {
    plan.steps = plan.steps.filter((st) => st.op !== "discover").map((st) => (st.op === "collect"
      ? { ...st, input: { ...st.input, strategy: "funding_news" }, label: `Find startups that raised funding in ${areaText} (funding news)` } : st));
  }
  const runId = await saveRun({ chatId: input.chatId, userEmail: input.userEmail, kind: "search", plan });
  if (approach) await recordApproach(runId, approach);
  return { ok: true, runId, plan };
}

/** The model's columns, topped up from the defaults to at least 4 (a failed or short answer still gets some). */
function planColumns(raw: unknown): ExtraColumn[] {
  const cols = cleanColumns(raw);
  for (const d of DEFAULT_COLUMNS) { if (cols.length >= 4) break; if (!cols.some((c) => c.key === d.key)) cols.push(d); }
  return cols;
}

/**
 * "Get emails for these" — a contacts run with no new discovery: over a finished run's ranked
 * results (fromRunId), or else over the chat's current search.
 */
export async function makeContactsPlan(input: { chatId: string; userEmail: string; state: ChatState; fromRunId?: string }): Promise<PlanOutcome> {
  let base: { trades: CompiledPlan["trades"]; center: { lat: number; lng: number }; radiusM: number; areaText: string; title: string } | null = null;
  let leadIds: string[] | null = null;
  if (input.fromRunId) {
    const [run] = await sql`SELECT plan FROM v2_runs WHERE id = ${input.fromRunId} AND user_email = ${input.userEmail}`;
    if (run) {
      const p = run.plan as CompiledPlan;
      base = { trades: p.trades, center: p.center, radiusM: p.radiusM, areaText: p.areaText, title: p.title };
      leadIds = (await sql`SELECT lead_id FROM v2_results WHERE run_id = ${input.fromRunId} AND rank IS NOT NULL AND lead_id IS NOT NULL`).map((r) => r.lead_id as string);
    }
  }
  const s = input.state;
  if (!base && s.center && s.placeType) {
    const label = formatCategory(s.placeType) ?? s.categoryText ?? "businesses";
    base = { trades: [{ placeType: s.placeType, label }], center: s.center, radiusM: s.radiusM, areaText: s.areaText ?? "this area", title: `${label.toLowerCase()} · ${s.areaText ?? "this area"}` };
  }
  if (!base) return { ok: false, reason: "no_trade", message: "Run a search first, then I can find contacts for those results.", unresolved: [] };
  const plan: CompiledPlan = {
    title: `contacts · ${base.title}`,
    goal: "clients", service: null, playbookIds: [], mustHave: [],
    trades: base.trades, areaText: base.areaText, center: base.center, radiusM: base.radiusM,
    target: leadIds ? Math.max(5, leadIds.length) : 20, needContacts: true,
    assumptions: leadIds ? "The businesses from that run that have a website." : "Businesses with a website from your current search.",
    // V2 has no unlock (the old wording confused users, prod "couldn't do" list): say where phones come from.
    cannotDo: "Businesses without a website have no site to read, so no email for them — their phone and address come from the map listing.",
    steps: [
      { op: "collect", label: "Collect businesses with a website", input: { websiteOnly: true, ...(leadIds ? { leadIds } : {}) } },
      { op: "qualify", label: "Visit websites & read contacts", input: {} },
      { op: "contacts", label: "Find emails (Mantis registry + websites)", input: {} },
      { op: "rank", label: "Rank by contacts found", input: {} },
    ],
    estCredits: 0,
  };
  const runId = await saveRun({ chatId: input.chatId, userEmail: input.userEmail, kind: "contacts", plan });
  return { ok: true, runId, plan };
}

type Strategy = NonNullable<CompiledPlan["strategies"]>[number];

/**
 * Per-use-case learning: which strategy produced the leads that were finally delivered for this
 * pipeline shape (from each result's provenance). Strategies with wins move up, most wins first;
 * the rest keep their order. Needs 5+ delivered leads before it overrides the global order.
 */
async function byUseCaseWins(shapeId: string, order: Strategy[], extraRunIds: string[] = []): Promise<Strategy[]> {
  // Confidence of a pipeline = the summed score of the leads it delivered (quality x quantity), so a
  // strategy that found a few strong leads can beat one that found many weak ones (Tarun, 2026-10-23:
  // "best pipeline jiska confidence score zyada aya usse aur leads nikalni").
  const rows = await sql`
    SELECT r.provenance->>'strategy' AS s, count(*)::int AS n, COALESCE(sum(r.score), 0)::float AS conf
    FROM v2_results r JOIN v2_runs ru ON ru.id = r.run_id
    WHERE r.rank IS NOT NULL AND ((ru.pipeline_id = ${shapeId} AND ru.status = 'done') OR ru.id = ANY(${extraRunIds}))
    GROUP BY 1`;
  const wins = new Map(rows.filter((r) => r.s).map((r) => [r.s as Strategy, Number(r.conf) || Number(r.n)]));
  if (rows.reduce((a, r) => a + Number(r.n), 0) < 5 && !extraRunIds.length) return order;
  const all = [...new Set([...order, ...wins.keys()])];
  return all.sort((a, b) => (wins.get(b) ?? 0) - (wins.get(a) ?? 0) || order.indexOf(a) - order.indexOf(b));
}

/**
 * "Find more" for a run: the same ask, the same pipeline, a new count — with the strategy that
 * delivered the earlier leads first, and those leads skipped.
 */
const STRATEGY_NAME: Record<string, string> = {
  primary: "same business type nearby", wide: "same type, wider area", adjacent: "related business types", names: "business names",
  registry: "Mantis registry", github: "developer profiles", web_search: "web search", funding_news: "funding news",
};

export async function makeMorePlan(input: { chatId: string; userEmail: string; fromRunId: string; count: number }): Promise<PlanOutcome> {
  const [prev] = await sql`SELECT plan FROM v2_runs WHERE id = ${input.fromRunId} AND user_email = ${input.userEmail}`;
  if (!prev) return { ok: false, reason: "no_trade", message: "I couldn't find that run.", unresolved: [] };
  const p = prev.plan as CompiledPlan;
  const chain = [...new Set([...(p.excludeRunIds ?? []), input.fromRunId])];
  const strategies = await byUseCaseWins(pipelineId(p), p.strategies ?? ["primary"], chain);
  const first = strategies[0] ?? "primary";
  const target = Math.max(1, Math.min(500, Math.round(input.count)));
  const ops = new Set(p.steps.map((st) => st.op));
  const label = first === "github" ? "Find developers & dev companies from developer profiles" : first === "web_search" ? "Find companies via web search" : "Collect new candidates (same pipeline)";
  const plan: CompiledPlan = {
    ...p,
    target,
    strategies,
    excludeRunIds: chain,
    estCredits: (p.scope === "country" ? 0 : p.trades.length * 2 * CREDIT_COST.billed_places_call) + target * CREDIT_COST.lead_unlock,
    assumptions: `Using the pipeline whose leads scored best last time (${STRATEGY_NAME[first] ?? first}); the ${chain.length > 1 ? "earlier runs'" : "earlier"} leads are skipped.`,
    steps: [
      ...p.steps.filter((st) => st.op === "discover"),
      { op: "collect", label, input: { strategy: first, ...(p.keywords?.length && first === "names" ? { keywords: p.keywords } : {}) } },
      ...(ops.has("qualify") ? [{ op: "qualify" as const, label: p.mustHave?.length ? `Visit websites until ${target} have: ${p.mustHave.map((m) => SIGNALS[m].label.toLowerCase()).join(", ")}` : "Read websites: emails & company LinkedIn", input: {} }] : []),
      ...(ops.has("contacts") ? [{ op: "contacts" as const, label: "Find emails (Mantis registry + websites)", input: {} }] : []),
      { op: "rank", label: `Rank & keep the best ${target}`, input: {} },
    ],
  };
  const runId = await saveRun({ chatId: input.chatId, userEmail: input.userEmail, kind: "search", plan });
  return { ok: true, runId, plan };
}

/**
 * The fallback ladder, ordered by what has worked: primary always first (or names, when no type
 * fitted); the rest by their measured average yield across past runs (3+ samples), else a default.
 * This is the learning loop — every collect step records its kept_count.
 */
async function strategyOrder(o: { hasTypes: boolean; hasAdjacent: boolean; hasWords: boolean; developers?: boolean; products?: boolean; manyTypes?: boolean }) {
  type S = "primary" | "wide" | "adjacent" | "names" | "registry" | "github" | "web_search";
  const candidates: S[] = [];
  if (o.hasTypes) candidates.push("wide");
  if (o.hasAdjacent) candidates.push("adjacent");
  // Name matching on generic trade words ("cafe", "hotel") pulls in salons and phone shops named
  // after them; with 3+ real place types it only adds noise (KALT replay, 2026-10-22).
  if (o.hasWords && o.hasTypes && !o.manyTypes) candidates.push("names");
  if (o.hasWords) candidates.push("registry");
  if (o.developers) candidates.push("github");
  // Web search is the last resort for local trades (it costs per call) and the first for products.
  if (o.hasWords) candidates.push("web_search");
  const stats = await sql`
    SELECT input->>'strategy' AS s, avg(kept_count)::float AS y, count(*)::int AS n
    FROM v2_run_steps WHERE op = 'collect' AND input ? 'strategy' AND status = 'done' GROUP BY 1
  `;
  const yieldOf = new Map(stats.filter((r) => r.n >= 3).map((r) => [r.s as S, Number(r.y)]));
  const fallback = candidates.sort((a, b) => (yieldOf.get(b) ?? -1) - (yieldOf.get(a) ?? -1));
  // Products/SaaS aren't on Maps at all: web search first.
  if (o.products) return ["web_search", ...(o.developers ? ["github"] : []), ...fallback.filter((s) => s !== "web_search" && s !== "github")] as S[];
  // Developers live on GitHub, not on Maps: that ask starts there.
  if (o.developers) return ["github", ...(o.hasTypes ? ["primary"] : []), ...fallback.filter((s) => s !== "github")] as S[];
  return [o.hasTypes ? "primary" : "names", ...fallback.filter((s) => s !== (o.hasTypes ? "primary" : "names"))] as S[];
}

/** Conditions the user wrote, mapped to signals by phrase — the floor under the model's mustHave. */
const STATED: Array<[RegExp, SignalId]> = [
  [/\b(no|without|don'?t have|do not have|missing)\b[^.]{0,20}\bwebsite/i, "no_website"],
  [/(online\s*)?(booking|appointments?)\b(?![^.]{0,12}\b(no|without)\b)/i, "has_booking"],
  [/\b(online\s*)?menus?\b|\bonline\s*order/i, "has_menu"],
  [/\badmissions?\b/i, "has_admissions"],
  [/\b(careers?\s*page)/i, "has_careers"],
  [/\b(hiring|vacanc|job\s*openings|open\s*roles)/i, "hiring"],
  [/\b(funded|raised\s*(funding|money|a\s*round|seed|series))/i, "funded"],
  [/\b(no|without|don'?t have)\b[^.]{0,20}\binstagram/i, "no_instagram"],
  [/\b(no|without|don'?t have)\b[^.]{0,20}\bsocial\s*media/i, "no_social"],
  [/\b(running|run|active)\s+(meta\s+|facebook\s+|google\s+)?ads\b/i, "runs_ads"],
  [/\b(coming\s+soon|newly\s+opened|new\s+openings?|just\s+opened)\b/i, "coming_soon"],
  [/\bexporters?\b/i, "exporter"],
  [/\b(multiple|several|many)\s*(branches|locations|centres|centers|outlets)|\bmulti-?location/i, "multi_location"],
  [/\bportfolio\b/i, "has_portfolio"],
  [/\b(online\s*store|e-?commerce|online\s*shop)\b/i, "has_online_store"],
  [/\b(no|without|don'?t have)\b[^.]{0,30}\b(google\s*)?analytics/i, "no_analytics"],
  [/\b(no|without|don'?t have)\b[^.]{0,30}\b(meta|facebook)\s*(ads?|pixel)/i, "no_meta_pixel"],
  [/\b(no|without|don'?t have)\b[^.]{0,30}\bgoogle\s*ads/i, "no_google_ads"],
];
export function statedSignals(text: string): SignalId[] {
  // "without booking" is a no_booking ask, not has_booking.
  const out: SignalId[] = [];
  for (const [re, sig] of STATED) if (re.test(text)) out.push(sig);
  if (/\b(no|without)\b[^.]{0,20}\b(online\s*)?booking/i.test(text)) return [...out.filter((x) => x !== "has_booking"), "no_booking"];
  return out;
}

/** "logistics companies", "freight forwarders" -> ["logistics", "freight"]: the distinctive word of
 *  each trade, without generic tails that would match half the city. */
function nameKeywords(texts: string[]): string[] {
  const generic = /^(companies|company|services?|firms?|businesses|business|agency|agencies|shops?|stores?|providers?|and|&|the|of|in|for)$/i;
  const out = new Set<string>();
  for (const t of texts) for (const w of t.toLowerCase().split(/[^a-z]+/)) {
    if (w.length >= 4 && !generic.test(w)) out.add(w.replace(/(ies)$/, "y").replace(/s$/, ""));
  }
  return [...out].slice(0, 6);
}

async function saveRun(input: { chatId: string; userEmail: string; kind: string; plan: CompiledPlan }): Promise<string> {
  const [run] = await sql`
    INSERT INTO v2_runs (chat_id, user_email, kind, plan, target, est_credits)
    VALUES (${input.chatId}, ${input.userEmail}, ${input.kind}, ${sql.json(input.plan as unknown as Parameters<typeof sql.json>[0])}, ${input.plan.target}, ${input.plan.estCredits})
    RETURNING id
  `;
  for (const [i, st] of input.plan.steps.entries()) {
    await sql`
      INSERT INTO v2_run_steps (run_id, seq, playbook_id, op, label, input)
      VALUES (${run.id}, ${i}, ${input.plan.playbookIds[0] ?? null}, ${st.op}, ${st.label}, ${sql.json(st.input as Parameters<typeof sql.json>[0])})
    `;
  }
  return run.id as string;
}

// ---------------------------------------------------------------- look-ups the Planner may call

const LOOKUP_TOOLS = [
  {
    name: "check_data",
    description: "How many businesses Mantis already holds for these place types — in the area (if given) and across India — and how many have a website. Free. Use it to pick place types that actually have businesses.",
    input_schema: {
      type: "object",
      properties: {
        placeTypes: { type: "array", items: { type: "string", enum: ALLOWED_LEAD_TYPES_SQL } },
        area: { type: ["string", "null"], description: "City/area to count in, or null for India-wide only." },
      },
      required: ["placeTypes", "area"],
    },
  },
  {
    name: "peek_web",
    description: "Top web results (titles + URLs) for one query — to confirm a web or news source returns real companies of the kind asked before relying on it. Use at most once.",
    input_schema: { type: "object", properties: { query: { type: "string" }, news: { type: "boolean", description: "Search news articles (funding rounds, openings)." } }, required: ["query", "news"] },
  },
];

function lookupHandlers(state: ChatState): Record<string, (input: Record<string, unknown>) => Promise<string>> {
  return {
    check_data: async (inp) => {
      const types = (Array.isArray(inp.placeTypes) ? inp.placeTypes : []).filter((t): t is string => typeof t === "string" && !!TYPE_TO_SECTION[t]).slice(0, 8);
      if (!types.length) return "no valid place types";
      const area = typeof inp.area === "string" && inp.area.trim() ? inp.area.trim() : null;
      const india = await sql`SELECT category, count(*)::int AS n, count(*) FILTER (WHERE has_website)::int AS w
                              FROM leads WHERE category = ANY(${types}) AND lower(country_code) = 'in' AND NOT is_competitor GROUP BY 1`;
      let local: Array<Record<string, unknown>> = [];
      let where = "";
      if (area && !isCountryArea(area)) {
        const c = (await localPlace(area)) ?? (await geocodeText(area)).value ?? (state.center && state.areaText === area ? state.center : null);
        if (c) {
          const d = 15000 / 111320, e = 15000 / (111320 * Math.cos((c.lat * Math.PI) / 180));
          local = await sql`SELECT category, count(*)::int AS n, count(*) FILTER (WHERE has_website)::int AS w FROM leads
                            WHERE category = ANY(${types}) AND NOT is_competitor AND lat BETWEEN ${c.lat - d} AND ${c.lat + d} AND lng BETWEEN ${c.lng - e} AND ${c.lng + e} GROUP BY 1`;
          where = ` within 15 km of ${area}`;
        } else where = ` (couldn't locate "${area}")`;
      }
      const get = (rows: Array<Record<string, unknown>>, t: string) => rows.find((r) => r.category === t);
      return types.map((t) => {
        const a = get(india, t), b = get(local, t);
        return `${t}: India ${a?.n ?? 0} saved (${a?.w ?? 0} with website)${area ? `; ${b?.n ?? 0} saved${where} (${b?.w ?? 0} with website)` : ""}`;
      }).join("\n") + "\nA live Google Maps search adds more in the area when the run starts; 0 saved does not mean none exist.";
    },
    peek_web: async (inp) => {
      const { exaSearch } = await import("./sources/exa");
      const q = String(inp.query ?? "").slice(0, 200);
      if (!q) return "empty query";
      const r = await exaSearch(q, { numResults: 8, ...(inp.news === true ? { category: "news" as const } : {}) });
      return r.results.map((x, i) => `${i + 1}. ${x.title ?? "(no title)"} — ${x.url}`).join("\n") || "no results";
    },
  };
}
