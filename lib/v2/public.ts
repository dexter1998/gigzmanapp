/**
 * What leaves the server. Nothing a browser receives may name a third-party provider, API or model
 * (founder rule, 2026-10-23: "reverse engineer kare to saari cheezein self-hosted lagni chahiye").
 *
 * Two layers:
 *   1. Codes — provenance / source enums stay as they are in the DB (the runner, the confidence
 *      module and the learning loop switch on them); they are translated to neutral codes here, at
 *      the API boundary, and nowhere else.
 *   2. Text — step labels, run details and chat replies are written neutrally at the source now, but
 *      rows saved before that still say "Google Maps", "Exa" or "GitHub". scrubText() rewrites those
 *      phrases on the way out, so old runs and chats read the same as new ones.
 *
 * Lead facts are not ours to hide: "No Google Ads tag", "Under 30 Google reviews", "Google listing
 * incomplete" describe the business, not our stack, and pass through untouched.
 */

/** Internal source / provenance code → the neutral code a client sees (rendered with `_` → space). */
const PUBLIC_SOURCE: Record<string, string> = {
  places_live: "maps_scan",
  places_saved: "mantis_index",
  places_listing: "business_listing",
  place_details: "listing_lookup",
  facts: "mantis_index",
  name_match: "name_match",
  primary: "maps_scan",
  exa: "web_search",
  exa_search: "web_search",
  exa_company: "web_search",
  web_search: "web_search",
  "site+exa": "website_and_web",
  github: "developer_profiles",
  github_blog: "developer_profile",
  apollo: "contact_finder",
  registry: "mantis_registry",
  site: "website",
  site_cached: "website",
  funding_news: "funding_news",
  news: "funding_news",
  careers_page: "careers_page",
};

/** Any vendor / provider / model / infra name that must not reach a browser. */
export const VENDOR_RE = /\b(exa|apollo|google ?places|places ?api|place ?details|nearby ?search|searchnearby|gemini|claude|anthropic|openai|chatgpt|gpt-?\d\w*|bedrock|amazon nova|nova[ -](lite|pro|micro)|haiku|sonnet|opus|telnyx|sarvam|samvaad|vobiz|bulbul|deepgram|polly|aws|amazon web services|ses|s3|athena|lambda|app ?runner|cashfree|razorpay|composio|crawl4ai|gosom|serper|fetchd|scrapling|neon|vercel|supabase|site-reader|github)\b/i;

export function publicSource(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  if (v in PUBLIC_SOURCE) return PUBLIC_SOURCE[v];
  return VENDOR_RE.test(v) ? "mantis" : v;
}

/** Provenance object → same keys, neutral values. `url_tried` and other flags pass as-is. */
export function publicProvenance(p: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!p || typeof p !== "object") return out;
  for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
    if (typeof v !== "string") continue;
    out[k] = k === "url_tried" ? v : (publicSource(v) ?? v);
  }
  return out;
}

/** Where an email came from, as the drawer shows it. */
export function publicEmailSource(s: unknown): string {
  if (s === "site") return "website";
  if (s === "registry") return "Mantis registry";
  return typeof s === "string" && s && !VENDOR_RE.test(s) ? s.replace(/_/g, " ") : "Mantis";
}

// Ordered: specific phrases first. Only phrases about OUR stack — never "Google reviews / listing /
// Ads / Analytics", which are facts about the lead. Bare names that are also common business names
// in India (Apollo Hospitals, Sarvam Traders, Exa Interiors) or tech a lead itself uses (a Razorpay
// checkout on its site) are deliberately NOT rewritten in free text: replies quote lead names, and
// the text we write ourselves no longer contains them.
const TEXT_RULES: Array<[RegExp, string]> = [
  [/\s*\((?:Exa|from GitHub|GitHub)\)/g, ""],
  [/GitHub developers & dev companies/gi, "Developer profiles (developers & dev companies)"],
  [/\bon GitHub\b/gi, "from developer profiles"],
  [/\b(from|through|via) GitHub\b/gi, "$1 developer profiles"],
  [/\bvia github\b/gi, "via developer profiles"],
  [/\bvia web_search\b/gi, "via web search"],
  [/\bGoogle refused the lookup\b/gi, "the listing lookup was refused"],
  [/\blive Google search\b/gi, "live search"],
  [/\bbilled Google calls?\b/gi, "live searches"],
  [/\bper Google call\b/gi, "per maps scan"],
  [/\bGoogle geocoding\b/gi, "Mantis geocoder"],
  [/\bSearch Google Maps\b/g, "Search maps"],
  [/\bChecking Google Maps\b/g, "Checking maps"],
  [/\bGoogle Places?( API)?\b/gi, "business listings"],
  [/\bPlaces API\b/gi, "business listings"],
  [/\bPlace Details\b/gi, "listing lookup"],
  [/\bNearby Search\b/gi, "maps scan"],
  [/\bExa (search|API)\b/gi, "web search"],
  [/\bApollo (API|enrichment|match)\b/gi, "contact finder"],
  [/\b(Claude|Anthropic|Bedrock|Amazon Nova)( API)?\b/g, "Mantis AI"],
  [/\b(fetchd|crawl4ai|Scrapling|site-reader)\b/gi, "site reader"],
  [/\b(Telnyx|Vobiz|Deepgram)\b/g, "voice agent"],
  [/\bAmazon SES\b/g, "mail service"],
];

export function scrubText<T extends string | null | undefined>(s: T): T {
  if (typeof s !== "string" || !s) return s;
  let out: string = s;
  for (const [re, to] of TEXT_RULES) out = out.replace(re, to);
  return out as T;
}

/** An error message that may be bubbled to the UI: kept when it is ours, replaced when it names a vendor. */
export function publicError(msg: unknown, fallback = "Something went wrong on our side — try again in a minute."): string {
  const m = typeof msg === "string" ? msg : msg instanceof Error ? msg.message : "";
  if (!m) return fallback;
  return VENDOR_RE.test(m) || /\b\d{3}\b.*[{<]/.test(m) || /_API_KEY|https?:\/\//i.test(m) ? fallback : m;
}

type Step = { label?: unknown; detail?: unknown; [k: string]: unknown };
const scrubStep = <S extends Step>(s: S): S => ({ ...s, label: scrubText(s.label as string), detail: scrubText(s.detail as string) });

/**
 * A stored chat message's intent, cleaned for the client: reply, turn steps, plan card, scope block
 * and chips. Lead rows (business names, the lead's own facts) are left alone.
 */
export function publicIntent<T>(intent: T): T {
  if (!intent || typeof intent !== "object") return intent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- stored JSON of several historic shapes
  const i = { ...(intent as any) };
  if (typeof i.reply === "string") i.reply = scrubText(i.reply);
  if (typeof i.question === "string") i.question = scrubText(i.question);
  if (Array.isArray(i.steps)) i.steps = i.steps.map((s: Step) => (s && typeof s === "object" ? scrubStep(s) : s));
  if (i.plan && typeof i.plan === "object") {
    i.plan = { ...i.plan, title: scrubText(i.plan.title), assumptions: scrubText(i.plan.assumptions), cannotDo: scrubText(i.plan.cannotDo),
      steps: Array.isArray(i.plan.steps) ? i.plan.steps.map((s: unknown) => (typeof s === "string" ? scrubText(s) : s)) : i.plan.steps };
  }
  if (Array.isArray(i.blocks)) {
    i.blocks = i.blocks.map((b: Record<string, unknown>) => {
      if (!b || typeof b !== "object") return b;
      if (b.type === "markdown") return { ...b, text: scrubText(b.text as string) };
      if (b.type === "scope") return { ...b, assumptions: scrubText(b.assumptions as string), cannotDo: scrubText(b.cannotDo as string),
        steps: Array.isArray(b.steps) ? (b.steps as Array<{ title: string; detail: string }>).map((s) => ({ ...s, detail: scrubText(s.detail) })) : b.steps,
        usage: b.usage && typeof b.usage === "object" ? { ...(b.usage as object), note: scrubText((b.usage as { note?: string }).note) } : b.usage };
      return b;
    });
  }
  if (Array.isArray(i.chips)) i.chips = i.chips.map((c: { label?: string }) => (c && typeof c === "object" ? { ...c, label: scrubText(c.label) } : c));
  if (i.clarification && typeof i.clarification === "object" && Array.isArray(i.clarification.options)) {
    i.clarification = { ...i.clarification, options: i.clarification.options.map((o: { description?: string }) => ({ ...o, description: scrubText(o.description) })) };
  }
  return i as T;
}

/** A chat_messages row for the client. The user's own words are never rewritten. */
export function publicMessage<M extends { role?: unknown; content?: unknown; intent?: unknown }>(m: M): M {
  if (m.role === "user") return m;
  return { ...m, content: typeof m.content === "string" ? scrubText(m.content) : m.content, intent: publicIntent(m.intent) };
}

/** A run snapshot for the client: step labels/details and the sources line, plus its summary message. */
export function publicRun<R extends { title?: string; steps?: Step[]; phaseInfo?: { request?: string; sources?: string }; summaryMessage?: Record<string, unknown> | null }>(r: R | null): R | null {
  if (!r) return r;
  return {
    ...r,
    title: scrubText(r.title),
    steps: r.steps?.map(scrubStep),
    phaseInfo: r.phaseInfo ? { ...r.phaseInfo, request: scrubText(r.phaseInfo.request), sources: scrubText(r.phaseInfo.sources) } : r.phaseInfo,
    ...(r.summaryMessage ? { summaryMessage: publicMessage(r.summaryMessage) } : {}),
  };
}
