/**
 * V2 chat slot state and the typed actions that change it (docs/v2-agents.md §7.2).
 *
 * Pure: no DB, no LLM. A chip is an action with a payload, applied here — it never goes back
 * through a model as text. In v1 "Drop the filters" and "Try a nearby area" were sent as plain
 * messages and re-interpreted, and production showed 60% / 62% of them changing nothing.
 */

export type Lang = "en" | "hinglish" | "hi";

export type ChatState = {
  /** The device's location from a "near me" message — kept so the plan made a couple of turns later
   *  (after "which business?") still uses it (live test 2026-10-31: it fell back to Gurugram). */
  here?: { lat: number; lng: number; at: number } | null;
  /** What the user called the trade, verbatim. */
  categoryText: string | null;
  /** The real place type it resolved to; null = not resolved (never guessed). */
  placeType: string | null;
  areaText: string | null;
  center: { lat: number; lng: number } | null;
  radiusM: number;
  noWebsiteOnly: boolean;
  minReviews: number | null;
  maxReviews: number | null;
  minRating: number | null;
  maxRating: number | null;
  excludeTypes: string[];
  /** 0-based page of the current result list; "more" moves it, any other change resets it. */
  page: number;
  /** Results per page — 20 unless the user asked for a number ("100 do"). */
  pageSize: number;
  /** The credit heads-up was given in this chat (re-armed when a new count is asked for). */
  creditAlerted: boolean;
  /** trade+place+radius of the last live discovery; filter-only changes don't search again. */
  lastLive: string | null;
  /** The one question we asked and are waiting on, if any. */
  pending: "category" | "location" | null;
  /** A planned ask waiting on its area ("find dentists whose site is old" — where?). */
  pendingBrief: string | null;
  /** The last ask the Planner ran, so "show me in Morena" re-runs THAT ask in Morena. */
  lastBrief: string | null;
  /** The Business profile this chat finds leads for (v2_business_profiles.id); null = not chosen yet. */
  businessProfileId: string | null;
  /** A lead ask waiting on "Which business are these leads for?". */
  pendingProfileBrief: string | null;
  /** A website the user gave that wouldn't load: their next one-line description belongs to it. */
  failedSite: string | null;
  /** The one offering (service/product) of the business these leads are for; null = all of them. */
  offering: string | null;
  /**
   * The user confirmed WHO these leads are for — business, offering, buyers — on the Client context
   * card (Tarun, 2026-10-26: ICP and service first, pipeline and signals after). Until then a lead
   * ask shows that card instead of a plan.
   */
  contextConfirmed: boolean;
  /** "Skip — just find the leads": plan without a business profile in this chat (no "which business?"). */
  profileSkipped?: boolean;
  lang: Lang;
};

export const PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_RADIUS_M = 1500;
export const MAX_RADIUS_M = 12000;
/** Largest "find more" a single run takes. */
export const MAX_MORE = 500;

export const EMPTY_STATE: ChatState = {
  categoryText: null,
  placeType: null,
  areaText: null,
  center: null,
  radiusM: DEFAULT_RADIUS_M,
  noWebsiteOnly: false,
  minReviews: null,
  maxReviews: null,
  minRating: null,
  maxRating: null,
  excludeTypes: [],
  page: 0,
  pageSize: 20,
  lastLive: null,
  creditAlerted: false,
  pending: null,
  pendingBrief: null,
  lastBrief: null,
  businessProfileId: null,
  pendingProfileBrief: null,
  failedSite: null,
  offering: null,
  contextConfirmed: false,
  lang: "en",
};

export type FilterKey = "noWebsiteOnly" | "minReviews" | "maxReviews" | "minRating" | "maxRating" | "excludeTypes";
export const ALL_FILTERS: FilterKey[] = ["noWebsiteOnly", "minReviews", "maxReviews", "minRating", "maxRating", "excludeTypes"];

/** Everything a chip can do. Each one is applied deterministically and then re-runs the search. */
export type ChatAction =
  | { type: "more" }
  | { type: "widen"; radiusM: number }
  | { type: "clear"; filters: FilterKey[] }
  | { type: "set_category"; placeType: string; label: string }
  | { type: "set_area"; areaText: string }
  | { type: "use_last_area" }
  | { type: "only_no_website" }
  | { type: "search"; placeType: string; label: string; areaText: string }
  /** Ask the Planner for a run; `brief` is what it plans from. */
  | { type: "plan"; brief: string; signals?: string[]; skipProfile?: boolean }
  /** The user's approval of a planned run. */
  | { type: "run_plan"; runId: string; count?: number }
  /** More of what a run found, by the same pipeline. No count yet = ask how many. */
  | { type: "more_run"; runId: string; count?: number }
  /** "Which business are these leads for?" answered with a saved profile; `brief` is the waiting ask. */
  | { type: "use_profile"; profileId: string; brief: string }
  /** The Client context card confirmed: this business, this offering (null = all), then plan `brief`. */
  | { type: "confirm_context"; profileId: string; offering: string | null; brief: string }
  /** Opens a screen of the app (the client navigates; nothing is sent to the chat). */
  | { type: "open"; href: string };

/** A chip as the client renders it: the label is display text, the action is what runs. */
export type Chip = { label: string; action: ChatAction };

export function hasFilters(s: ChatState): boolean {
  return (
    s.noWebsiteOnly || s.minReviews !== null || s.maxReviews !== null ||
    s.minRating !== null || s.maxRating !== null || s.excludeTypes.length > 0
  );
}

export function nextRadius(current: number): number {
  return Math.min(MAX_RADIUS_M, Math.max(current * 2, 3000));
}

/** Old rows, partial rows, hand-edited rows: anything read from the DB is normalised here. */
export function readState(raw: unknown): ChatState {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<ChatState>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    ...EMPTY_STATE,
    categoryText: typeof r.categoryText === "string" ? r.categoryText : null,
    placeType: typeof r.placeType === "string" ? r.placeType : null,
    areaText: typeof r.areaText === "string" ? r.areaText : null,
    center: r.center && num(r.center.lat) !== null && num(r.center.lng) !== null ? r.center : null,
    radiusM: num(r.radiusM) ?? DEFAULT_RADIUS_M,
    noWebsiteOnly: r.noWebsiteOnly === true,
    minReviews: num(r.minReviews),
    maxReviews: num(r.maxReviews),
    minRating: num(r.minRating),
    maxRating: num(r.maxRating),
    excludeTypes: Array.isArray(r.excludeTypes) ? r.excludeTypes.filter((t): t is string => typeof t === "string") : [],
    page: num(r.page) ?? 0,
    pageSize: Math.max(5, Math.min(MAX_PAGE_SIZE, num(r.pageSize) ?? PAGE_SIZE)),
    lastLive: typeof r.lastLive === "string" ? r.lastLive : null,
    creditAlerted: r.creditAlerted === true,
    pending: r.pending === "category" || r.pending === "location" ? r.pending : null,
    pendingBrief: typeof r.pendingBrief === "string" ? r.pendingBrief : null,
    lastBrief: typeof r.lastBrief === "string" ? r.lastBrief : null,
    businessProfileId: typeof r.businessProfileId === "string" && /^[0-9a-f-]{36}$/i.test(r.businessProfileId) ? r.businessProfileId : null,
    pendingProfileBrief: typeof r.pendingProfileBrief === "string" ? r.pendingProfileBrief : null,
    failedSite: typeof r.failedSite === "string" ? r.failedSite.slice(0, 300) : null,
    offering: typeof r.offering === "string" && r.offering.trim() ? r.offering.slice(0, 160) : null,
    contextConfirmed: r.contextConfirmed === true,
    profileSkipped: r.profileSkipped === true,
    lang: r.lang === "hinglish" || r.lang === "hi" ? r.lang : "en",
    here: r.here && num(r.here.lat) !== null && num(r.here.lng) !== null && num(r.here.at) !== null ? { lat: r.here.lat, lng: r.here.lng, at: r.here.at } : null,
  };
}

/** Client-supplied, so untrusted: unknown shapes return null and the turn falls back to text. */
export function parseAction(raw: unknown): ChatAction | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  switch (a.type) {
    case "more":
    case "use_last_area":
    case "only_no_website":
      return { type: a.type };
    case "widen":
      return typeof a.radiusM === "number" && a.radiusM > 0
        ? { type: "widen", radiusM: Math.min(MAX_RADIUS_M, Math.round(a.radiusM)) }
        : null;
    case "clear": {
      const filters = Array.isArray(a.filters) ? a.filters.filter((f): f is FilterKey => ALL_FILTERS.includes(f as FilterKey)) : [];
      return filters.length ? { type: "clear", filters } : null;
    }
    case "set_category":
      return typeof a.placeType === "string" && typeof a.label === "string"
        ? { type: "set_category", placeType: a.placeType, label: a.label.slice(0, 80) }
        : null;
    case "search":
      return typeof a.placeType === "string" && typeof a.label === "string" && typeof a.areaText === "string" && a.areaText.trim()
        ? { type: "search", placeType: a.placeType, label: a.label.slice(0, 80), areaText: a.areaText.trim().slice(0, 120) }
        : null;
    case "plan":
      return typeof a.brief === "string" && a.brief.trim()
        ? { type: "plan", brief: a.brief.trim().slice(0, 300),
            // Edit scope's signal toggles: exactly these, never re-guessed from the words (Tarun, 2026-11-02).
            ...(Array.isArray(a.signals) ? { signals: a.signals.filter((x): x is string => typeof x === "string").slice(0, 3) } : {}),
            ...(a.skipProfile === true ? { skipProfile: true } : {}) } : null;
    case "run_plan":
      return typeof a.runId === "string" && /^[0-9a-f-]{36}$/i.test(a.runId)
        ? { type: "run_plan", runId: a.runId, ...(Number.isInteger(a.count) && (a.count as number) > 0 && (a.count as number) <= 500 ? { count: a.count as number } : {}) } : null;
    case "more_run":
      if (typeof a.runId !== "string" || !/^[0-9a-f-]{36}$/i.test(a.runId)) return null;
      return typeof a.count === "number" && a.count > 0
        ? { type: "more_run", runId: a.runId, count: Math.min(MAX_MORE, Math.round(a.count)) }
        : { type: "more_run", runId: a.runId };
    case "set_area":
      return typeof a.areaText === "string" && a.areaText.trim()
        ? { type: "set_area", areaText: a.areaText.trim().slice(0, 120) }
        : null;
    case "use_profile":
      return typeof a.profileId === "string" && /^[0-9a-f-]{36}$/i.test(a.profileId) && typeof a.brief === "string" && a.brief.trim()
        ? { type: "use_profile", profileId: a.profileId, brief: a.brief.trim().slice(0, 300) }
        : null;
    case "confirm_context":
      return typeof a.profileId === "string" && /^[0-9a-f-]{36}$/i.test(a.profileId) && typeof a.brief === "string" && a.brief.trim()
        ? { type: "confirm_context", profileId: a.profileId, offering: typeof a.offering === "string" && a.offering.trim() ? a.offering.trim().slice(0, 160) : null, brief: a.brief.trim().slice(0, 300) }
        : null;
    default:
      return null;
  }
}

/**
 * `use_last_area` and `set_area` need I/O (a DB read, a geocode) and are finished by the caller;
 * here they only clear what the new area makes stale.
 */
export function applyAction(s: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "more":
      return { ...s, page: s.page + 1, pending: null };
    case "widen":
      return { ...s, radiusM: Math.max(s.radiusM, action.radiusM), page: 0, pending: null };
    case "clear": {
      const next = { ...s, page: 0, pending: null };
      for (const f of action.filters) {
        if (f === "noWebsiteOnly") next.noWebsiteOnly = false;
        else if (f === "excludeTypes") next.excludeTypes = [];
        else next[f] = null;
      }
      return next;
    }
    case "set_category":
      return { ...s, placeType: action.placeType, categoryText: action.label, page: 0, pending: null };
    case "set_area":
      return { ...s, areaText: action.areaText, center: null, radiusM: DEFAULT_RADIUS_M, page: 0, pending: null };
    case "use_last_area":
      return { ...s, center: null, page: 0, pending: null };
    case "only_no_website":
      return { ...s, noWebsiteOnly: true, page: 0, pending: null };
    case "plan":
    case "run_plan":
    case "more_run":
    case "open":
      return s;
    case "use_profile":
      return { ...s, businessProfileId: action.profileId, pendingProfileBrief: null };
    case "confirm_context":
      return { ...s, businessProfileId: action.profileId, offering: action.offering, contextConfirmed: true, pendingProfileBrief: null };
    case "search":
      return {
        ...s, placeType: action.placeType, categoryText: action.label, areaText: action.areaText,
        center: null, radiusM: DEFAULT_RADIUS_M, page: 0, pending: null,
      };
  }
}
