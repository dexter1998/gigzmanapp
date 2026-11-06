/**
 * One V2 chat turn (docs/v2-agents.md §4). Mantis is the hub: Router types the message, code
 * merges slots and runs the search, the reply is written from the result — never before it.
 *
 * Every step is timed and returned, so the thread can show "action + timer ›" lines that describe
 * what actually ran, and the same list lands in v2_turn_log for the capability-gap read.
 */

import { sql } from "@/lib/db";
import { geocodeText } from "@/lib/geocode";
import { resolveCategoryPhrase, suggestCategories } from "@/lib/category-resolve";
import { formatCategory } from "@/lib/categories";
import { FOCUS_COMPOSER } from "@/lib/chat-clarifications";
import { inferIcp } from "./icp";
import type { ChatLead } from "@/components/chat/ChatLeadsTable";
import { AgentUnavailableError, type Msg } from "./claude";
import { routeMessage, FILLER, type RouterOutput, type TurnType } from "./router";
import { assistantTurn, type AssistantOutput } from "./assistant";
import { liveDiscover, readResults, coveredCities, lastMapCenter, localPlace, resolveArea, placeName } from "./search";
import { runScout, loadProfile, findUrl, type SellerProfile } from "./scout";
import { listProfiles, getProfile, matchProfile, touchProfile, hostOf, defaultProfile, toSeller, type BusinessProfile } from "./business-profiles";
import { makePlan, makeContactsPlan, makeMorePlan, COUNTRY_RE, NEAR_ME_RE, isCountryArea, type CompiledPlan, type PlanOutcome } from "./planner";
import { startRun, startRunChecked, STRATEGY_LABEL, segmentsOf, type Strategy } from "./runner";
import { playbookById, SIGNALS } from "./playbooks";
import { creditStatus } from "./credits";
import { scopeBlock, type Block } from "./blocks";
import { CREDIT_COST } from "@/lib/credits/pricing";
import {
  applyAction, readState, hasFilters, nextRadius, ALL_FILTERS, MAX_RADIUS_M, MAX_PAGE_SIZE, PAGE_SIZE, MAX_MORE,
  type ChatAction, type ChatState, type Chip, type Lang,
} from "./state";

export type TurnStep = { label: string; ms: number; status: "done" | "failed"; detail?: string };

export type PlanCard = {
  runId: string; title: string; steps: string[]; estCredits: number; target: number;
  /** Balance when the plan was made, so the card can say what it covers. */
  credits: number; liveCovered: boolean;
  assumptions: string | null; cannotDo: string | null; playbooks: string[]; needContacts: boolean;
  /** Labels of the signals every result must have. */
  mustHave?: string[];
  /** Ran straight away — the chat shows the progress card instead of the plan card. */
  started?: boolean;
  /** The quote shown before the run: the ask as understood, in one sentence. */
  understood?: string;
  /** The way Mantis will try first, then the fallbacks — "via the best pipeline". */
  pipeline?: string[];
  /** A "find more" continuation of an earlier run. */
  more?: boolean;
};

export type V2Payload = {
  v2: true;
  plan?: PlanCard;
  /** Set when this turn started a run: the client begins ticking it. */
  runId?: string;
  profile?: SellerProfile;
  action: "search_leads" | "answer_from_existing" | "needs_clarification";
  reply: string;
  leads?: ChatLead[];
  chips: Chip[];
  /** Heading for the chips when they are shown as the question above the composer. */
  question?: string;
  clarification?: { question: string; options: Array<{ label: string; description: string; action?: ChatAction; value?: string }> };
  steps: TurnStep[];
  turnType: TurnType | "action";
  tookMs: number;
  apiDown?: boolean;
  /** Structured response (lib/v2/blocks.ts); when present the thread renders these instead of `reply`. */
  blocks?: Block[];
};

/** Asks for leads in any wording (en + Hinglish): find/give/get … leads/clients/customers/buyers. */
const LEADS_ASK = /\b(find|give|get|show|bring|fetch|search|dhundo|dhoondo|nikalo|chahiye|do|de|lao)\b[^?]{0,80}\b(leads?|clients?|customers?|buyers?|prospects?)\b|\b(leads?|clients?|customers?|buyers?|prospects?)\b[^?]{0,80}\b(find|dhundo|dhoondo|nikalo|chahiye|do|de|lao|you find)\b/i;

const SEARCH_TYPES: TurnType[] = ["search", "refine", "explore_area"];
// A fresh "search" also goes through the Planner now: the default pipeline (businesses → website →
// emails → company LinkedIn) is what Mantis returns for any ICP, not only the no-website list.
// Refines and chip actions stay on the direct search over the chat's current state.
const PLAN_TYPES: TurnType[] = ["service_search", "brief", "vendor", "search"];
/** Requests whose full capability isn't built yet — logged as gaps even when answered well. */
const GAP_TYPES: TurnType[] = ["outreach"];

const t = (lang: Lang, en: string, hinglish: string) => (lang === "en" ? en : hinglish);
const km = (m: number) => `${Math.round(m / 100) / 10} km`;

export async function runV2Turn(input: {
  chatId: string;
  userEmail: string;
  message: string;
  action: ChatAction | null;
  /** The device's location, when the user said "near me / my location" and the browser allowed it. */
  here?: { lat: number; lng: number } | null;
  /** Bulk test suite only: runs read saved data, no billed Google calls. */
  savedOnly?: boolean;
}): Promise<V2Payload> {
  const started = Date.now();
  const steps: TurnStep[] = [];
  async function step<T>(label: string, fn: () => Promise<T>, detail?: (r: T) => string): Promise<T> {
    const s = Date.now();
    try {
      const r = await fn();
      steps.push({ label, ms: Date.now() - s, status: "done", detail: detail?.(r) });
      return r;
    } catch (err) {
      steps.push({ label, ms: Date.now() - s, status: "failed" });
      throw err;
    }
  }

  const [row] = await sql`SELECT state FROM v2_chat_state WHERE chat_id = ${input.chatId}`;
  let state = readState(row?.state);
  /** The business this chat had at the start of the turn — "Leads for X" is said only when it changes. */
  const startProfileId = state.businessProfileId;
  const history = await loadHistory(input.chatId);

  let turnType: TurnType | "action" = "action";
  let route: RouterOutput | null = null;
  let gapNote: string | null = null;
  let payload: Omit<V2Payload, "steps" | "tookMs" | "turnType" | "v2">;
  let replanBrief: string | null = null;
  /** Set when this turn is fully answered by the Business-profile question/switch, before routing. */
  let preset: typeof payload | null = null;
  /** "Saved acme.in as a new business profile." — said above the plan that follows. */
  let profileNote: string | null = null;
  /** The lead ask that was waiting on the business question when this turn moved on from it. */
  let waitingBrief: string | null = null;
  /** A Client context card is waiting and this turn edits it: show the refreshed card afterwards. */
  let cardAfter: string | null = null;

  try {
    // "Which business are these leads for?" — a saved one tapped, or answered in words.
    if (input.action?.type === "confirm_context") {
      // Client context confirmed on the card: business + offering are settled for this chat; now plan.
      state = applyAction(state, input.action);
      void touchProfile(input.action.profileId);
      input = { ...input, action: { type: "plan", brief: input.action.brief } };
    } else if (input.action?.type === "use_profile") {
      // A saved business picked from "Which business?": show its context (offerings, buyers) to
      // confirm — the plan comes after, never straight from the pick (Tarun, 2026-10-26).
      const chosen = await getProfile(input.userEmail, input.action.profileId);
      if (chosen) {
        void touchProfile(chosen.id);
        state = { ...state, businessProfileId: chosen.id, offering: null, contextConfirmed: false, pendingProfileBrief: input.action.brief };
        const others = (await listProfiles(input.userEmail)).filter((b) => b.id !== chosen.id);
        const withIcp = await step("Working out who buys it", () => inferIcp(input.userEmail, chosen), (b) => `${b.targetTrades.length} buyer types`);
        preset = contextCardPayload(withIcp, input.action.brief, state.lang, false, others, null);
      } else {
        input = { ...input, action: { type: "plan", brief: input.action.brief } };
      }
    } else if (!input.action && state.pendingProfileBrief && !state.pendingProfileBrief.startsWith("new:") && state.businessProfileId
        && await cardAnswer(input.userEmail, state.businessProfileId, input.message)) {
      // The Client context card is waiting and they answered it in words: "yes" / "haan" / an offering's name.
      const cur = (await getProfile(input.userEmail, state.businessProfileId))!;
      const offering = matchOffering(cur.services, input.message) ?? state.offering ?? cur.primaryService ?? null;
      const brief = state.pendingProfileBrief;
      state = { ...state, offering, contextConfirmed: true, pendingProfileBrief: null };
      input = { ...input, action: { type: "plan", brief } };
    } else if (!input.action && state.pendingProfileBrief) {
      // "new:" = they already said "a different business"; a short description now IS that business.
      const askedNew = state.pendingProfileBrief.startsWith("new:");
      const brief = state.pendingProfileBrief.replace(/^new:/, "");
      waitingBrief = brief;
      // "coimbatore" / "PARIS FRANCE" / "UK" here is the AREA (prod: it was saved as a business profile).
      const placeReply = !findUrl(input.message) && input.message.trim().split(/\s+/).length <= 4 && await answersPendingBrief("area", input.message);
      // "dentists" typed back at "which business?" is the trade they want, not their own business:
      // plan it without a profile instead of asking again (prod 2026-11-03: asked twice, user left).
      // The same holds at the saved-businesses picker (no card open yet): "interior design" typed there
      // asked the picker again, three times in the stuck replay (2026-11-06).
      const tradeReply = !placeReply && (askedNew || !state.businessProfileId) && !findUrl(input.message) && input.message.trim().split(/\s+/).length <= 4
        && !!resolveCategoryPhrase(input.message.trim()) && !/\b(i|we|my|our|mera|hum|hamara)\b/i.test(input.message);
      if (tradeReply) {
        const words = brief.toLowerCase();
        state = { ...state, pendingProfileBrief: null, profileSkipped: true };
        input = { ...input, action: { type: "plan", brief: words.includes(input.message.trim().toLowerCase()) ? brief : `${input.message.trim()} ${brief}`.slice(0, 300), skipProfile: true } };
      }
      // "Change Gigzman's profile: offering: SEO services" (the card's Edit button) names the business,
      // so it read as picking it again: the edit was dropped and the same card re-shown after another
      // ICP pass (prod 2026-11-05, Yashraj, twice). An edit goes to the assistant instead.
      const profileEdit = !askedNew && !!state.businessProfileId && PROFILE_EDIT_RE.test(input.message);
      const ans = placeReply || tradeReply || profileEdit ? { kind: "moved_on" as const } : await answerWhichBusiness(input.userEmail, input.message, step, askedNew, state.failedSite);
      if (placeReply) {
        state = { ...state, areaText: input.message.trim(), pendingProfileBrief: null };
        input = { ...input, action: { type: "plan", brief: `${brief.replace(/\s+(in|near)\s+[^,.]*$/i, "")} in ${input.message.trim()}` } };
      }
      if (ans.kind === "picked") {
        // Picked or just described a business: confirm its context (offering, buyers) before planning.
        state = { ...state, businessProfileId: ans.profile.id, pendingProfileBrief: brief, failedSite: null, offering: null, contextConfirmed: false };
        const others = (await listProfiles(input.userEmail)).filter((b) => b.id !== ans.profile.id);
        const withIcp = await step("Working out who buys it", () => inferIcp(input.userEmail, ans.profile), (b) => `${b.targetTrades.length} buyer types`);
        preset = contextCardPayload(withIcp, brief, state.lang, ans.created, others, null);
      } else if (ans.kind === "ask_new") {
        state = { ...state, pendingProfileBrief: `new:${brief}` };
        preset = {
          action: "needs_clarification",
          reply: t(state.lang, "Paste the other business's website, or tell me in a line what it sells — I'll save it as a new business profile.",
            "Doosre business ki website paste karein, ya ek line mein bataiye wo kya bechta hai — main use nayi business profile mein save kar dunga."),
          chips: [],
          clarification: { question: t(state.lang, "Which business?", "Kaunsa business?"), options: [{ label: t(state.lang, "Paste website or describe it", "Website paste karein ya batayein"), description: "e.g. acme.in", value: FOCUS_COMPOSER }] },
        };
      } else if (!askedNew && state.businessProfileId && !state.contextConfirmed) {
        // A card is waiting and this is not a pick — most likely an edit ("add SEO as a service",
        // "my buyers are hospitals"). The assistant handles it; the refreshed card is shown after.
        cardAfter = brief;
      } else if (!placeReply) {
        state = { ...state, pendingProfileBrief: null };
      }
    }

    if (input.here) state = { ...state, here: { ...input.here, at: Date.now() } };
    const hereNow = input.here ?? (state.here && Date.now() - state.here.at < 2 * 3600_000 ? { lat: state.here.lat, lng: state.here.lng } : null);
    if (preset) {
      // answered above
    } else if (input.action) {
      state = applyAction(state, input.action);
      if (input.action.type === "use_last_area") {
        const last = await lastMapCenter(input.userEmail);
        if (last) state = { ...state, center: { lat: last.lat, lng: last.lng }, areaText: last.label };
      }
    } else if (state.pendingBrief && await answersPendingBrief(state.pendingBrief, input.message)) {
      // A short reply to the one question we asked answers it — an area for the waiting plan, or a
      // count for "find more" — instead of starting over through the router.
      const pb = state.pendingBrief;
      const more = /^more:([0-9a-f-]{36})$/i.exec(pb);
      const n = Number(input.message.replace(/[^\d]/g, ""));
      input = { ...input, action: more
        ? (n > 0 ? { type: "more_run", runId: more[1], count: Math.min(MAX_MORE, n) } : { type: "more_run", runId: more[1] })
        : { type: "plan", brief: `${pb} in ${input.message.trim()}` } };
      state = { ...state, pendingBrief: null };
    } else {
      state = { ...state, pendingBrief: null };
      route = await step("Understanding your request", () => routeMessage({ message: input.message, history, hints: { failedSite: state.failedSite } }), (r) => r.type);
      state.lang = route.lang;
      route = answerPending(route, state, input.message);
      // A place named in any message is the chat's area from now on — it used to be dropped whenever
      // the turn went through the business / context questions first, and then asked again.
      // A different place also drops the old centre: the map search compares against this areaText,
      // saw "the same place" and kept the previous centre — "Gurgaon" after "out of maharashtra"
      // searched 1.5 km around Maharashtra's centroid and said Gurgaon wasn't mapped (replay 2026-11-06).
      if (route.areaText && !route.nearMe && route.areaText.toLowerCase() !== (state.areaText ?? "").toLowerCase())
        state = { ...state, areaText: route.areaText, center: null, radiusM: 1500 };
      // The router decides what a message is (lib/v2/router.ts carries the rules). Code keeps two
      // guardrails that are not judgement calls: a bare URL is the user's business, and a saved
      // business named as "for X" with nothing to find switches the chat to it.
      const url = findUrl(input.message);
      if (url && input.message.trim().split(/\s+/).length <= 3) route = { ...route, type: "own_business" };
      // "Find leads for my business": a planned run for that business, never a one-category map search.
      if (route.genericOwn && !url && !state.failedSite) route = { ...route, type: "brief" };
      // Asking for leads/companies is never an essay (prod: "web development leads", "FIND THE companies
      // which is user of automation…" got advice). The cheap router ignores the prompt rule, so code holds it.
      if (["advice", "chat", "product"].includes(route.type) && !/^\s*(how|what|why|which|should|can you explain|kya|kaise|kyun)\b/i.test(input.message) && LEADISH.test(input.message) && (FINDISH.test(input.message) || route.genericOwn || input.message.trim().split(/\s+/).length <= 4))
        route = { ...route, type: "brief" };
      // Several kinds of business at once is a planned run, not a one-category map search.
      if (route.type === "search" && route.multiTrade) route = { ...route, type: "brief" };
      // "I want only jewellery businesses and their mail and number" as a chat's first ask is a lead
      // search that wants contacts, not a question about leads: with no earlier search the assistant
      // looked up this chat's (zero) leads and said none were found (replay 2026-11-06).
      if (route.type === "contacts" && !state.placeType && !state.lastBrief) route = { ...route, type: "brief" };
      if (route.forBusiness && !PLAN_TYPES.includes(route.type) && !SEARCH_TYPES.includes(route.type) && route.type !== "contacts") {
        const all = await listProfiles(input.userEmail);
        // The whole message is only scanned when it is short: a long brief about a new company
        // ("…for my company Aarshiv.ai … web development…") matched a saved profile named
        // "Development" and switched to it instead of reading the brief (replay 2026-11-06).
        const short = input.message.trim().split(/\s+/).length <= 12;
        const to = matchProfile(all, route.forBusiness) ?? (short ? matchProfile(all, input.message) : null);
        if (to) {
          state = { ...state, businessProfileId: to.id, pendingProfileBrief: null, offering: null, contextConfirmed: false };
          void touchProfile(to.id);
          const text = t(state.lang, `Switched — leads in this chat are now for **${to.name}**.`, `Theek hai — is chat ki leads ab **${to.name}** ke liye hain.`);
          preset = {
            action: "answer_from_existing", reply: text, blocks: [{ type: "markdown", text }],
            question: state.lastBrief ? t(state.lang, "Re-plan the last search?", "Pichhli search dobara plan karun?") : undefined,
            chips: state.lastBrief ? [{ label: t(state.lang, `Re-plan for ${to.name}`, `${to.name} ke liye dobara plan`), action: { type: "plan", brief: state.lastBrief } }] : [],
          };
        }
      }
      turnType = route.type;
      // "show me in Morena" after a planned run: the same ask, new place — not the old map search,
      // which lost "silver jewellery" and showed every manufacturer in Morena.
      if ((route.type === "refine" || route.type === "explore_area") && state.lastBrief && route.areaText) {
        replanBrief = `${state.lastBrief.replace(/[.!?\s]+$/, "").replace(/\s+(in|of|across|near)\s+[^,.]*$/i, "")} — in ${route.areaText}`;
        route = { ...route, type: "search" };
        turnType = "search";
      }
      // "all the leads you gave me already have a website" after a planned run: the same ask again with
      // the requirement — it used to become a map search of "businesses of all kinds near Jaipur".
      if (!replanBrief && route.noWebsiteOnly && state.lastBrief && !route.categoryText && !/without a website|no website/i.test(state.lastBrief)) {
        replanBrief = `${state.lastBrief.replace(/[.!?\s]+$/, "")} — only ones without a website`;
        route = { ...route, type: "search" };
        turnType = "search";
      }
      // "only ones who require SEO services" / "remove the ones scoring under 40" after a planned run:
      // the same ask with the condition added. It became the old map search ("Showing 20 real estate
      // agencies near Gurugram within 3 km") with masked names and no phones, so AI calls showed 0
      // (prod 2026-11-05, Yashraj).
      if (!replanBrief && route.type === "refine" && state.lastBrief && !route.areaText && !route.more && !route.widen) {
        replanBrief = `${state.lastBrief.replace(/[.!?\s]+$/, "")} — ${input.message.trim().slice(0, 200)}`;
        route = { ...route, type: "search" };
        turnType = "search";
      }
      if (SEARCH_TYPES.includes(route.type) && route.type !== "search") state = mergeSlots(state, route);
    }

    // Everything that is not a lead search goes to the assistant: it reads the user's own data
    // (account, credits, runs, leads, campaigns, profiles) through tools instead of answering from
    // static facts, and a search it decides on is handed to the Planner below — scope and quote
    // first, nothing runs until Run.
    // "find more" / "aur do" / "10 more" typed after a run: more of THAT run, by its best pipeline —
    // asking how many first unless a number was given — not a fresh plan (round 4 LS08).
    if (!preset && !input.action && route && route.more
        && (!route.areaText || route.areaText.toLowerCase().trim() === (state.areaText ?? "").toLowerCase().trim())) {
      const [lastRun] = await sql`SELECT id FROM v2_runs WHERE chat_id = ${input.chatId} AND user_email = ${input.userEmail} AND status IN ('done', 'stopped') ORDER BY created_at DESC LIMIT 1`;
      if (lastRun) input = { ...input, action: route.count && route.count > 0 ? { type: "more_run", runId: String(lastRun.id), count: Math.min(MAX_MORE, route.count) } : { type: "more_run", runId: String(lastRun.id) } };
    }
    let helper: AssistantOutput | null = null;
    // A question about the leads this chat already found ("which of these have a tier 1 email?",
    // "show only the ones with email", "enrich these") is answered from those leads — it used to
    // become a new paid "find 20 X" plan (production test I-05).
    const same = (x: string | null, y: string | null) => !x || (!!y && x.toLowerCase().trim() === y.toLowerCase().trim());
    // Only a NEW place makes it a new search; the router restating the trade ("dentists" vs the
    // chat's "Dentist") does not (round 3: EN01/EN03 still re-planned).
    const aboutResults = !preset && !input.action && !!route && route.aboutResults && !route.more && !route.widen && same(route.areaText, state.areaText)
      && (await sql`SELECT 1 FROM v2_runs WHERE chat_id = ${input.chatId} AND status IN ('done', 'stopped', 'running') LIMIT 1`).length > 0;
    if (aboutResults) {
      helper = await runAssistant(route);
      if (helper.handoffBrief) input = { ...input, action: { type: "plan", brief: helper.handoffBrief } };
    } else if (!preset && !input.action && route && !PLAN_TYPES.includes(route.type) && !SEARCH_TYPES.includes(route.type)
        && !(route.type === "own_business" && (findUrl(input.message) || state.failedSite)) && !(route.type === "contacts" && state.placeType)) {
      // A described business without a URL is the assistant's call too: it saves a profile only when
      // the user is actually introducing a business ("write a cold email for dentists" is a task).
      helper = await runAssistant(route);
      if (helper.profileId) state = { ...state, businessProfileId: helper.profileId, pendingProfileBrief: null };
      if (helper.handoffBrief) input = { ...input, action: { type: "plan", brief: helper.handoffBrief } };
    }
    async function runAssistant(r: RouterOutput | null): Promise<AssistantOutput> {
      return step("Thinking it through", () => assistantTurn({ route: r, state, history, message: input.message, userEmail: input.userEmail, chatId: input.chatId }),
        (o) => (o.used.length ? `looked up ${[...new Set(o.used)].join(", ").replace(/_/g, " ")}` : "answered"));
    }
    const act = input.action;
    if (preset) {
      payload = preset;
    } else if (helper && !helper.handoffBrief && cardAfter && state.businessProfileId) {
      // They edited the waiting Client context card in words: say what changed, then show it again.
      const b = await getProfile(input.userEmail, state.businessProfileId);
      const card = b ? contextCardPayload(b, cardAfter, state.lang, false, (await listProfiles(input.userEmail)).filter((x) => x.id !== b.id), state.offering) : null;
      payload = card ? { ...card, reply: `${helper.reply}\n\n${card.reply}`, blocks: [{ type: "markdown", text: helper.reply }, ...(card.blocks ?? [])] } : assistantPayload(helper, state.lang);
    } else if (helper && !helper.handoffBrief) {
      payload = assistantPayload(helper, state.lang);
      if (helper.unmet) gapNote = `${route?.type}: ${helper.unmetNote ?? input.message.slice(0, 120)}`;
    } else if (act?.type === "more_run" && !act.count) {
      // "Find more" asks how many first — the answer sets the run's size and its quote.
      const [prev] = await sql`SELECT plan, delivered FROM v2_runs WHERE id = ${act.runId} AND user_email = ${input.userEmail}`;
      const p = prev?.plan as CompiledPlan | undefined;
      const what = p ? (p.trades.map((x) => x.label.toLowerCase()).join(" / ") || p.tradeWords?.join(", ") || "leads") : "leads";
      state = { ...state, pendingBrief: `more:${act.runId}` };
      payload = {
        action: "needs_clarification",
        reply: t(state.lang, `How many more ${what}${p ? ` in ${p.areaText}` : ""} do you want? I'll use the pipeline whose leads scored best so far, and skip the ${prev?.delivered ?? ""} you already have.`,
          `${p ? `${p.areaText} mein ` : ""}aur kitne ${what} chahiye? Jis pipeline ki leads ka score sabse acha raha, usi se nikalunga aur pehle wali ${prev?.delivered ?? ""} skip karunga.`),
        chips: [],
        clarification: {
          question: t(state.lang, "How many more leads?", "Aur kitni leads?"),
          options: [
            ...[10, 20, 100, 500].map((n) => ({ label: t(state.lang, `${n} more`, `${n} aur`), description: "", action: { type: "more_run", runId: act.runId, count: n } as ChatAction })),
          ],
        },
      };
    } else if (act?.type === "more_run" && act.count) {
      const outcome = await step("Planning more of the same", () => makeMorePlan({ chatId: input.chatId, userEmail: input.userEmail, fromRunId: act.runId, count: act.count! }),
        (o) => (o.ok ? `${o.plan.target} via ${(STRATEGY_LABEL[(o.plan.strategies?.[0] ?? "primary") as Strategy] ?? "the same pipeline").toLowerCase()}` : o.reason));
      const credit = await creditStatus(input.userEmail);
      let started = false;
      // The quote is confirmed before anything runs (Tarun, 2026-10-22); only the saved-data test
      // harness auto-runs.
      if (outcome.ok && input.savedOnly && (credit.liveCovered || credit.credits >= outcome.plan.estCredits)) {
        started = await step("Starting the run", () => startRun(outcome.runId, input.userEmail));
      }
      payload = planPayload(outcome, state.lang, true, credit, started, true);
    } else if (act?.type === "run_plan") {
      // "Run with my credits": shrink the planned run to what the balance pays for before it starts.
      if (act.count) await sql`UPDATE v2_runs SET target = LEAST(target, ${act.count}), plan = jsonb_set(plan, '{target}', to_jsonb(LEAST(target, ${act.count})))
                               WHERE id = ${act.runId} AND user_email = ${input.userEmail} AND status = 'planned'`;
      const r = await step("Starting the run", () => startRunChecked(act.runId, input.userEmail), (x) => (x.ok ? `${x.target} leads` : x.reason));
      payload = r.ok
        ? { action: "search_leads", runId: act.runId, chips: [],
            reply: r.cutFrom
              ? t(state.lang, `Running it for **${r.target}** leads — what your credits cover (you asked for ${r.cutFrom}). Top up and tap Find more for the rest. Progress and results are on the right.`,
                  `**${r.target}** leads ke liye chala raha hoon — itne hi aapke credits mein aate hain (aapne ${r.cutFrom} maange the). Top up karke Find more dabaiye. Progress right side pe.`)
              : t(state.lang, "Running it — progress and results are on the right.", "Chala raha hoon — progress aur results right side pe.") }
        : r.reason === "no_credits"
          ? { action: "needs_clarification", chips: [{ label: t(state.lang, "Add credits", "Credits add karein"), action: { type: "open", href: "/settings/billing" } as ChatAction }],
              reply: t(state.lang, `You have ${r.credits} credits — a lead costs ${CREDIT_COST.lead_unlock}, so this can't run yet. Add credits and tap Run this again.`,
                `Aapke paas ${r.credits} credits hain — ek lead ${CREDIT_COST.lead_unlock} credits ka hai, isliye abhi run nahi ho sakta. Credits add karke dobara Run this dabaiye.`) }
          : { action: "answer_from_existing", reply: t(state.lang, "That plan has already run (or was replaced).", "Ye plan pehle hi chal chuka hai (ya badal gaya)."), chips: [] };
    } else if (act?.type === "plan" || (route && PLAN_TYPES.includes(route.type)) || route?.type === "contacts") {
      const brief = act?.type === "plan" ? act.brief : replanBrief ?? input.message;
      if (act?.type === "plan" && act.skipProfile) state = { ...state, profileSkipped: true, pendingProfileBrief: null };
      const fromRunId = /^emails:([0-9a-f-]{36})$/i.exec(brief)?.[1];
      // Which business these leads are for: named in the message, chosen earlier in this chat, or
      // asked once. A contacts follow-up of an earlier run never asks — it continues that run.
      // "Find leads for my business" names no trade: the business IS the brief. Confirm which one,
      // with what Mantis knows about it — reading the onboarding website now if nothing is saved.
      // Whether the ask names anything to find is the router's judgement; a chip's brief (no route) falls back to the word test.
      const genericAsk = route ? route.genericOwn : isGenericOwnAsk(brief);
      const generic = !fromRunId && route?.type !== "contacts" && act?.type !== "plan" && !input.savedOnly && genericAsk;
      const ownAsk = generic ? await ownBusinessAsk({ email: input.userEmail, state, brief, step }) : null;
      // "I sell CRM software, find me clients in Delhi": the seller is in the message — not a saved profile.
      // …unless a saved business already sells it: "web development leads" from a web agency's account
      // created a duplicate "Web Development Agency" profile on the live test (2026-10-31).
      const allProfiles = await listProfiles(input.userEmail);
      const sells = route?.serviceText ? serviceOwner(allProfiles, route.serviceText) : null;
      const sellerInMessage = route?.type === "service_search" && !!route.serviceText && !sells && !matchProfile(allProfiles, input.message);
      const pick = state.profileSkipped && !sells ? { chosen: null, ask: false, created: false }
        : sells && !ownAsk ? { chosen: sells, ask: false, created: false } : ownAsk || sellerInMessage ? { chosen: null, ask: false, created: false } : fromRunId || route?.type === "contacts"
        ? { chosen: await chatOrDefault(input.userEmail, state), ask: false, created: false }
        : await pickBusiness({ email: input.userEmail, state, brief, message: act?.type === "plan" ? null : input.message, savedOnly: !!input.savedOnly, step });
      // An ask that already names what to find ("gyms without a website"), from an account with no
      // business saved and no onboarding website: plan it straight away. "Which business are these
      // leads for?" was where these users left — 4 of the 7 stuck chats on 2026-11-05 ended on it.
      if (!genericAsk && !ownAsk && !pick.chosen && !pick.failedSite && !sellerInMessage && !fromRunId && route?.type !== "contacts"
        && !state.contextConfirmed && !state.profileSkipped && !input.savedOnly && !allProfiles.length && !(await onboardingWebsite(input.userEmail))) {
        state = { ...state, profileSkipped: true, pendingProfileBrief: null };
      }
      if (ownAsk) {
        state = ownAsk.state;
        payload = ownAsk.payload;
      } else if (pick.chosen?.sellsTo === "consumers" && genericAsk) {
        // Mantis finds businesses, not consumers: say so, and offer what it CAN do for this business.
        state = { ...state, businessProfileId: pick.chosen.id };
        payload = b2cAlert(pick.chosen, state.lang);
      } else if (pick.failedSite) {
        state = { ...state, failedSite: pick.failedSite, pendingProfileBrief: `new:${brief.slice(0, 290)}` };
        payload = whichBusinessAsk(state.lang, hostOf(pick.failedSite) ?? pick.failedSite, brief);
      } else if (pick.ask) {
        state = { ...state, pendingProfileBrief: brief.slice(0, 300) };
        payload = profileQuestion(await listProfiles(input.userEmail), brief.slice(0, 300), state.lang);
      } else if (!input.savedOnly && !fromRunId && route?.type !== "contacts" && !state.contextConfirmed && !state.profileSkipped) {
        // Client context first (the pitch-deck order): WHO these leads are for — business, offering,
        // buyers — is shown and confirmed before any scope, signal or pipeline is worked out.
        let target = pick.chosen;
        let fresh = pick.created || ("read" in pick && !!pick.read);
        if (!target && sellerInMessage) {
          const sc = await step("Reading what you sell", () => runScout({ email: input.userEmail, message: input.message, url: null }), () => "from chat");
          if (sc.saved) { target = sc.saved; fresh = true; }
        }
        const all = await listProfiles(input.userEmail);
        if (target && !(pick.via === "default" && all.length > 1)) {
          const t0 = target;
          const b = t0.targetTrades.length ? t0 : await step("Working out who buys it", () => inferIcp(input.userEmail, t0), (x) => `${x.targetTrades.length} buyer types`);
          state = { ...state, businessProfileId: b.id, pendingProfileBrief: brief.slice(0, 300), offering: null };
          payload = contextCardPayload(b, brief.slice(0, 300), state.lang, fresh, all.filter((x) => x.id !== b.id), null);
        } else {
          // Several saved businesses and none named: ask which (each pick then shows its card). None
          // saved: read the onboarding website, else ask for the business.
          const oa = await ownBusinessAsk({ email: input.userEmail, state: { ...state, businessProfileId: null }, brief, step });
          if (oa) { state = oa.state; payload = oa.payload; }
          else { state = { ...state, pendingProfileBrief: `new:${brief.slice(0, 290)}` }; payload = whichBusinessAsk(state.lang, null, brief); }
        }
      } else {
        if (pick.chosen) { state = { ...state, businessProfileId: pick.chosen.id }; void touchProfile(pick.chosen.id); }
        if (pick.created && pick.chosen) profileNote = t(state.lang, `Saved **${pick.chosen.name}** as a new business profile.`, `**${pick.chosen.name}** ko nayi business profile mein save kar diya.`);
        // The confirmed offering narrows the seller to that one service, so the planner picks buyers and
        // signals for it rather than for everything the business sells.
        const profile: SellerProfile | null = pick.chosen ? focusOffering(toSeller(pick.chosen), state.offering) : sellerInMessage || state.profileSkipped ? null : await loadProfile(input.userEmail);
        // "Dentist email list … Bangalore" with no earlier search is a NEW search that also reads
        // contacts — it used to answer "Run a search first" (prod 2026-11-03).
        const contactsOfEarlier = fromRunId || (route?.type === "contacts" && !!state.placeType && !!state.center);
        let outcome: PlanOutcome = contactsOfEarlier
          ? await step("Planning contact search", () => makeContactsPlan({ chatId: input.chatId, userEmail: input.userEmail, state, fromRunId }))
          : await step("Planning the run", () => makePlan({ chatId: input.chatId, userEmail: input.userEmail, message: brief, history, profile, state, savedOnly: input.savedOnly, here: hereNow, signals: act?.type === "plan" ? act.signals : undefined }),
              (o) => (o.ok ? `${o.plan.steps.length} steps` : o.reason));
        // The seller said what they sell and the planner still found no buyers: think again with
        // the job spelled out, rather than ask them for a business they already described (round 3 ED12).
        if (!outcome.ok && outcome.reason === "no_trade" && sellerInMessage && !input.savedOnly) {
          const again = `${brief} — work out which kinds of business BUY this and find them`;
          outcome = await step("Thinking about who buys it", () => makePlan({ chatId: input.chatId, userEmail: input.userEmail, message: again, history, profile: null, state, savedOnly: input.savedOnly, here: hereNow }),
            (o) => (o.ok ? `${o.plan.trades.length} buyer types` : o.reason));
        }
        const credit = await creditStatus(input.userEmail);
        // Nothing runs until the user confirms the scope and quote (Tarun, 2026-10-22: the run used to
        // start the moment the quote appeared). Only the saved-data test harness auto-runs.
        let started = false;
        if (outcome.ok && input.savedOnly && (credit.liveCovered || credit.credits >= outcome.plan.estCredits)) {
          started = await step("Starting the run", () => startRun(outcome.runId, input.userEmail));
        }
        payload = planPayload(outcome, state.lang, !!profile, credit, started);
        // Nothing to search and no business to plan from: ask for the business instead of "name a trade".
        // ...only for an ask that named no businesses: "5 cafes in Indiranagar" is never answered with
        // "which business?" because one planning attempt came back empty (round 4 EN08).
        if (!outcome.ok && outcome.reason === "no_trade" && !sellerInMessage && genericAsk && (!profile || (!profile.services.length && !profile.targetTrades.length)) && !input.savedOnly) {
          state = { ...state, pendingProfileBrief: `new:${brief.slice(0, 290)}` };
          payload = whichBusinessAsk(state.lang, null, brief);
        }
        if (!outcome.ok && outcome.reason === "no_area") state = { ...state, pendingBrief: brief.slice(0, 240) };
        if (outcome.ok && !fromRunId && route?.type !== "contacts") state = { ...state, lastBrief: brief.slice(0, 300) };
        // A website just read: what Mantis learned comes before "which city?", so the user can
        // correct it before anything is planned (re-test N-02: the profile was never shown).
        if (!outcome.ok && outcome.reason === "no_area" && (pick.created || ("read" in pick && pick.read)) && pick.chosen) {
          const lead = `${t(state.lang, `I read **${hostOf(pick.chosen.website) ?? pick.chosen.name}** and saved it as **${pick.chosen.name}**:`, `Maine **${hostOf(pick.chosen.website) ?? pick.chosen.name}** padhi aur **${pick.chosen.name}** ke naam se save kiya:`)}\n\n${profileFacts(pick.chosen, state.lang)}\n\n`;
          payload = { ...payload, reply: `${lead}${payload.reply}`, blocks: payload.blocks?.map((b, i) => (i === 0 && b.type === "markdown" ? { ...b, text: `${lead}${b.text}` } : b)) };
        }
        if (!outcome.ok && outcome.reason === "no_area" && payload.clarification) {
          // "Other" (always shown under the options) is where a different area is typed.
          payload.clarification.options = (outcome.areaOptions ?? []).map((o) => ({ label: o.label, description: o.why, action: { type: "plan", brief: `${brief} in ${o.label}` } as ChatAction }));
          if (!payload.clarification.options.length) payload.clarification.options = [{ label: t(state.lang, "Type a city or neighbourhood", "Shehar ya mohalla likhein"), description: "e.g. Sector 56, Gurugram", value: FOCUS_COMPOSER }];
        }
        // The plan's place and first trade become the chat's state, so "widen" / "more" act on it.
        if (outcome.ok) {
          // A run names its chat — and so its list in Leads — like ChatGPT titles a thread:
          // "Dentists in Delhi", not the first six words of the message.
          const tr = outcome.plan.trades.map((x) => x.label).join(", ");
          const name = `${tr.charAt(0).toUpperCase()}${tr.slice(1)} in ${outcome.plan.areaText}`.slice(0, 80);
          await sql`UPDATE chats SET title = ${name} WHERE id = ${input.chatId} AND NOT EXISTS (SELECT 1 FROM v2_runs WHERE chat_id = ${input.chatId} AND id <> ${outcome.runId})`;
          const p = outcome.plan;
          state = { ...state, areaText: p.areaText, center: p.center, radiusM: Math.min(p.radiusM, 3000),
            placeType: p.trades[0]?.placeType ?? null, categoryText: p.trades[0]?.label ?? null, page: 0, pending: null };
        }
        if (!outcome.ok && outcome.unresolved.length) gapNote = `planner unresolved trades: ${outcome.unresolved.join(", ")}`;
        // Served, but only by name-matching: still a capability we lack for this user — log it.
        if (outcome.ok && outcome.plan.keywords?.length) gapNote = `default mode (name match) for: ${outcome.plan.keywords.join(", ")} — ${brief.slice(0, 120)}`;
        // Said above the plan: which business it is for (and if that business was just saved).
        if (pick.chosen && outcome.ok && (pick.chosen.id !== startProfileId || profileNote)) {
          const lead = [profileNote, t(state.lang, `Leads for **${pick.chosen.name}**.`, `**${pick.chosen.name}** ke liye leads.`)].filter(Boolean).join(" ");
          payload = { ...payload, reply: `${lead} ${payload.reply}`, blocks: payload.blocks?.map((b, i) => (i === 0 && b.type === "markdown" ? { ...b, text: `${lead} ${b.text}` } : b)) };
        }
      }
    } else if (route?.type === "own_business" && !state.failedSite && !findUrl(input.message) && input.message.trim().split(/\s+/).length < 5) {
      // "for Datakatalyst" with no saved match is a name, not a description: a profile built from it
      // says nothing ("Not enough information…"). Ask for the website or a line about it instead.
      const text = t(state.lang, "Which business is that? Paste its website, or tell me in a line what it sells and to whom — I'll save it as a business profile.",
        "Ye kaunsa business hai? Iski website paste karein, ya ek line mein bataiye ye kya bechta hai aur kise — main ise business profile mein save kar dunga.");
      payload = { action: "needs_clarification", reply: text, chips: [], blocks: [{ type: "markdown", text }],
        clarification: { question: t(state.lang, "Which business?", "Kaunsa business?"), options: [{ label: t(state.lang, "Paste website or describe it", "Website paste karein ya batayein"), description: "e.g. acme.in", value: FOCUS_COMPOSER }] } };
    } else if (route?.type === "own_business") {
      const url = findUrl(input.message);
      const scout = await step(url ? `Reading ${url}` : "Reading what you told me", () => runScout({ email: input.userEmail, message: input.message, url, knownWebsite: url ? null : state.failedSite, saveEmpty: !!url || !!state.failedSite }),
        (o) => (url ? (o.siteFailed ? "site did not load" : `${o.pagesRead} pages read`) : "from chat"));
      if (!url && !scout.saved) {
        // Not a description of a business after all ("what do you know about my business?",
        // "write a cold email for dentists") — the assistant answers it.
        helper = await runAssistant(route);
        payload = assistantPayload(helper, state.lang);
      } else {
      // Site down and nothing else to go on: remember it, so the one-line description lands on it.
      state = { ...state, failedSite: url && scout.siteFailed && !scout.profile.services.length && !scout.profile.targetTrades.length ? url : null };
      if (scout.saved) state = { ...state, businessProfileId: scout.saved.id, pendingProfileBrief: null };
      const others = scout.saved ? (await listProfiles(input.userEmail)).filter((b) => b.id !== scout.saved!.id).length : 0;
      payload = scoutPayload(scout.profile, scout.siteFailed, url, scout.pagesRead, state.lang, scout.created && others > 0);
      // They described the business instead of picking one: the ask that was waiting comes first.
      if (waitingBrief) payload.chips = [{ label: t(state.lang, "Continue: plan the search for it", "Aage badhein: iske liye search plan karein"), action: { type: "plan", brief: waitingBrief } as ChatAction }, ...payload.chips].slice(0, 4);
      }
    } else if (act || (route && SEARCH_TYPES.includes(route.type))) {
      const { nextState, unresolved, ...searchPayload } = await searchTurn(state, input.userEmail, step, route?.nearMe ?? false, hereNow);
      state = nextState;
      payload = searchPayload;
      if (unresolved) {
        gapNote = `unresolved trade: ${unresolved}`;
        sql`INSERT INTO unresolved_phrases (phrase, user_email) VALUES (${unresolved}, ${input.userEmail})`.catch(() => {});
      }
    } else {
      const r = route!;
      const ans = helper ?? (await runAssistant(r));
      // Out of scope (jobs, consumers) is a deliberate no, not a missing capability.
      if (r.type !== "out_of_scope" && (GAP_TYPES.includes(r.type) || ans.unmet)) gapNote = `${r.type}: ${ans.unmetNote ?? r.serviceText ?? input.message.slice(0, 120)}`;
      payload = assistantPayload(ans, state.lang);
    }
  } catch (err) {
    if (!(err instanceof AgentUnavailableError)) throw err;
    payload = {
      action: "answer_from_existing",
      reply: t(state.lang, "I can't reach my language model right now — please try again in a minute.", "Abhi mera AI model connect nahi ho raha — ek minute mein dobara try karein."),
      chips: [],
      apiDown: true,
    };
  }

  const out: V2Payload = { v2: true, ...payload, steps, turnType, tookMs: Date.now() - started };

  await sql`
    INSERT INTO v2_chat_state (chat_id, state, updated_at)
    VALUES (${input.chatId}, ${sql.json(state)}, now())
    ON CONFLICT (chat_id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()
  `;
  sql`
    INSERT INTO v2_turn_log (chat_id, user_email, turn_type, audience, via_action, gap, gap_note, steps, took_ms)
    VALUES (${input.chatId}, ${input.userEmail}, ${turnType}, ${route?.audience ?? null}, ${!!input.action},
            ${gapNote !== null}, ${gapNote}, ${sql.json(steps)}, ${out.tookMs})
  `.catch(() => {});

  return out;
}

function planPayload(o: PlanOutcome, L: Lang, hasProfile: boolean, credit: Awaited<ReturnType<typeof creditStatus>>, started = false, more = false): Omit<V2Payload, "steps" | "tookMs" | "turnType" | "v2"> {
  if (!o.ok) {
    return {
      action: "needs_clarification",
      reply: o.reason === "no_area" && o.tooBroad
        ? t(L, `${o.tooBroad} is too big to search as one place — pick a city in it (you can run more cities after).`, `${o.tooBroad} ek jagah ki tarah search karne ke liye bahut bada hai — usme se ek shehar chunein (baaki shehar baad mein chala sakte hain).`)
        : o.reason === "no_area" && o.notFound
        ? t(L, `I couldn't find "${o.notFound}" on the map. Check the spelling, or pick an area below.`, `"${o.notFound}" map par nahi mila. Spelling dekh lijiye, ya neeche se area chunein.`)
        : o.reason === "no_area"
        ? t(L, "Which city or area should I search? You didn't name one, and the area decides who gets found.", "Kis shehar ya area mein dhoondhun? Aapne area nahi bataya, aur area se hi tay hota hai kaun milega.")
        : t(L, `${o.message}${o.unresolved.length ? ` (${o.unresolved.join(", ")})` : ""} Name a trade like "dentists" or "gyms".`,
            `Isse main searchable business types nahi bana paya${o.unresolved.length ? ` (${o.unresolved.join(", ")})` : ""}. Koi trade batayein jaise "dentists" ya "gyms".`),
      chips: [],
      clarification: o.reason === "no_area"
        ? { question: t(L, "Pick an area or type one", "Area chunein ya likhein"), options: [{ label: t(L, "Type a city or neighbourhood", "Shehar ya mohalla likhein"), description: "e.g. Sector 56, Gurugram", value: FOCUS_COMPOSER }] }
        : undefined,
    };
  }
  const p: CompiledPlan = o.plan;
  const card: PlanCard = {
    runId: o.runId, title: p.title, steps: p.steps.map((st) => st.label), estCredits: p.estCredits, target: p.target,
    credits: credit.credits, liveCovered: credit.liveCovered,
    assumptions: p.assumptions, cannotDo: p.cannotDo, needContacts: p.needContacts,
    playbooks: p.playbookIds.map((id) => playbookById(id)?.label ?? id),
    mustHave: (p.mustHave ?? []).map((m) => SIGNALS[m].label),
    understood: understoodLine(p),
    pipeline: (p.strategies ?? ["primary"]).slice(0, 3).map((s) => (p.scope === "country" && s === "primary" ? "Saved businesses of that type across India" : STRATEGY_LABEL[s as Strategy] ?? s)),
    more,
  };
  const short = !credit.liveCovered && credit.credits < p.estCredits;
  const reply = [
    // Credits first: what this balance covers, before the user taps Run.
    short
      ? t(L, `Heads up: this run can use up to ${p.estCredits} credits (${CREDIT_COST.lead_unlock} per new lead, plus live search) and you have ${credit.credits} — enough for about ${credit.unlocksAffordable} new leads. Tap Run to go ahead, or top up first.`,
          `Dhyan dein: is run mein ${p.estCredits} credits tak lag sakte hain (har nayi lead ke ${CREDIT_COST.lead_unlock}, plus live search) aur aapke paas ${credit.credits} hain — lagbhag ${credit.unlocksAffordable} nayi leads ke liye kaafi. Run dabayein ya pehle top up karein.`)
      : null,
    t(L, `Plan ready: ${p.target} ${p.title}.`, `Plan taiyaar: ${p.target} ${p.title}.`),
    p.cannotDo ? t(L, `Not possible yet: ${p.cannotDo}`, `Abhi possible nahi: ${p.cannotDo}`) : null,
    started
      ? t(L, "Running it now — progress and results are on the right.", "Chala raha hoon — progress aur results right side pe.")
      : t(L, "Nothing has run yet — tap Run to start.", "Abhi kuch chala nahi hai — shuru karne ke liye Run dabayein."),
    // Onboarding stays optional: one line, never a blocking question.
    hasProfile ? null : t(L, "Tip: paste your website and I'll tailor plans to what you sell.", "Tip: apni website paste karein, plans aapki service ke hisaab se banaunga."),
  ].filter(Boolean).join(" ");
  if (started) {
    // Reference: one plain sentence of what Mantis will do — the steps are in the progress card.
    const trades = (p.trades.length && !p.strategies?.includes("funding_news") ? p.trades.map((t) => t.label.toLowerCase()) : (p.tradeWords?.length ? p.tradeWords : ["businesses"])).join(" and ");
    const checks = p.mustHave?.length ? `check their website signals, keep only those with ${p.mustHave.map((m) => SIGNALS[m].label.toLowerCase()).join(p.signalMode === "segments" ? " or " : " and ")}` : "read their websites for emails and company LinkedIn";
    const alert = reply.startsWith("Heads up") || reply.startsWith("Dhyan") ? reply.split(". ")[0] + ". " : "";
    const line = more
      ? t(L, `${alert}Finding ${p.target} more ${trades} in ${p.areaText} with the same pipeline, skipping the ones you already have.`,
          `${alert}${p.areaText} mein ${p.target} aur ${trades} usi pipeline se dhoondh raha hoon — jo pehle mil chuke, unhe skip karke.`)
      : t(L, `${alert}I'll search for ${trades} in ${p.areaText}, ${checks}, remove duplicates and rank the best matches.`,
        `${alert}${p.areaText} mein ${trades} dhoondh ke, ${p.mustHave?.length ? "website signals check karke" : "websites se email aur LinkedIn nikaal ke"}, duplicates hata ke best matches rank kar raha hoon.`);
    return { action: "search_leads", reply: line, plan: { ...card, started: true }, chips: [], runId: o.runId,
      blocks: [{ type: "markdown", text: line }, scopeBlock(o.runId, p)] };
  }
  // Not started: the scope card is the confirmation — what will be searched, how, and what it may
  // cost — with "Run this" and "Edit scope" on it.
  const trades = (p.trades.length && !p.strategies?.includes("funding_news") ? p.trades.map((x) => x.label.toLowerCase()) : (p.tradeWords?.length ? p.tradeWords : ["businesses"])).join(" and ");
  const ask = more
    ? t(L, `I'll find ${p.target} more ${trades} in ${p.areaText} with the same pipeline, skipping the ones you already have.`,
        `${p.areaText} mein ${p.target} aur ${trades} usi pipeline se dhoondhunga — jo pehle mil chuke, unhe skip karke.`)
    : t(L, `Here's what I'll do: find ${p.target} ${trades} in ${p.areaText}.`, `Main ye karunga: ${p.areaText} mein ${p.target} ${trades} dhoondhunga.`);
  const confirm = t(L, "Check the scope and the estimated usage below — nothing runs until you tap **Run this**.",
    "Neeche scope aur estimated usage dekh lein — **Run this** dabane tak kuch nahi chalega.");
  const text = [short ? reply.split(". ")[0] + "." : null, ask, p.cannotDo ? t(L, `Not possible yet: ${p.cannotDo}`, `Abhi possible nahi: ${p.cannotDo}`) : null, confirm].filter(Boolean).join(" ");
  return {
    action: "answer_from_existing", reply: text, plan: card,
    question: t(L, "Run this plan?", "Ye plan chalaun?"),
    chips: [
      // Short on credits: a run sized to the balance first (prod: ~10 plans were never run at 0–36 credits).
      ...(short && credit.unlocksAffordable >= 1 && credit.unlocksAffordable < p.target
        ? [{ label: t(L, `Run ${credit.unlocksAffordable} with my credits`, `Mere credits se ${credit.unlocksAffordable} chalao`), action: { type: "run_plan", runId: o.runId, count: credit.unlocksAffordable } as ChatAction }] : []),
      { label: t(L, "Run this", "Run karo"), action: { type: "run_plan", runId: o.runId } },
    ],
    blocks: [{ type: "markdown", text }, scopeBlock(o.runId, p)],
  };
}

/**
 * Does a short message answer the waiting question — a count for "find more", a place for a plan
 * waiting on its area? Anything else ("gg", a new request) goes through the Router as usual.
 */
async function answersPendingBrief(pb: string, message: string): Promise<boolean> {
  const text = message.trim();
  if (text.split(/\s+/).length > 6 || FILLER.test(text)) return false;
  if (pb.startsWith("more:")) return /\d/.test(text);
  if (NEAR_ME_RE.test(text)) return true; // "my last searched area" was asked back 4 times in one chat
  // A trade or a description of the businesses to find is not a place ("Barber shops", "website development").
  if (TARGET_ASK.test(text) || LEADS_ASK.test(text) || resolveCategoryPhrase(text)) return false;
  if (isCountryArea(text) || COUNTRY_RE.test(text)) return true;
  if (!/[a-z]{3,}/i.test(text)) return false;
  return !!((await localPlace(text)) ?? (await geocodeText(text)).value);
}

/** The ask as Mantis understood it — the quote above the run. */
function understoodLine(p: CompiledPlan): string {
  const trades = p.trades.map((x) => x.label.toLowerCase()).join(" or ") || p.tradeWords?.join(", ") || p.title;
  const must = (p.mustHave ?? []).map((m) => SIGNALS[m].label.toLowerCase());
  const segs = segmentsOf(p);
  const signalPart = segs ? segs.map((g) => `${g.quota} with ${SIGNALS[g.signal as keyof typeof SIGNALS].label.toLowerCase()}`).join(" + ") : must.join(" and ");
  return `Find ${p.target} ${trades} in ${p.areaText}${must.length ? ` — ${signalPart}` : ""}${p.needContacts ? ", with emails and company LinkedIn from their websites" : ""}.`;
}

function scoutPayload(p: SellerProfile, siteFailed: boolean, url: string | null, pages: number, L: Lang, newBusiness = false): Omit<V2Payload, "steps" | "tookMs" | "turnType" | "v2"> {
  // Only a URL and the site wouldn't open: there is no profile yet to show — ask for one line.
  if (siteFailed && !p.services.length && !p.targetTrades.length) {
    const text = t(L, `I couldn't open ${url} — it may be down or blocking automated visits. Tell me in one line what you sell and who buys it (e.g. "Office interiors for IT companies in Gurgaon") and I'll set up your business profile.`,
      `${url} khul nahi paayi — shayad site down hai ya automated visits block karti hai. Ek line mein bataiye aap kya bechte hain aur kaun kharidta hai (jaise "Gurgaon ki IT companies ke liye office interiors"), main aapki business profile bana dunga.`);
    return { action: "needs_clarification", reply: text, chips: [], blocks: [{ type: "markdown", text }],
      clarification: { question: t(L, "What do you sell?", "Aap kya bechte hain?"), options: [{ label: t(L, "Describe your business in a line", "Ek line mein business batayein"), description: "e.g. Office interiors for IT companies", value: FOCUS_COMPOSER }] } };
  }
  const lead = siteFailed
    ? t(L, `I couldn't load ${url}, so this is from what you told me.`, `${url} load nahi hui, isliye ye aapki baat se banaya hai.`)
    : url ? t(L, `I read ${pages} page${pages === 1 ? "" : "s"} of your site.`, `Aapki site ke ${pages} page padhe.`) : "";
  const reply = [
    lead,
    `${p.company ? `${p.company}: ` : ""}${p.summary}`,
    p.targetTrades.length ? t(L, `Likely buyers: ${p.targetTrades.join(", ")}${p.targetAreas.length ? ` in ${p.targetAreas.join(", ")}` : ""}.`, `Sambhavit kharidaar: ${p.targetTrades.join(", ")}${p.targetAreas.length ? ` (${p.targetAreas.join(", ")})` : ""}.`) : null,
    newBusiness
      ? t(L, "Saved as a new business profile (Settings → Business profiles) — this chat's searches are for it.", "Nayi business profile ke roop mein save kiya (Settings → Business profiles) — is chat ki searches iske liye hongi.")
      : t(L, "Saved to your business profile — I'll use it to plan searches.", "Business profile mein save kar diya — searches plan karte waqt iska use karunga."),
  ].filter(Boolean).join(" ");
  const book = p.playbookIds[0] ? playbookById(p.playbookIds[0]) : null;
  const area = p.targetAreas[0] ? ` in ${p.targetAreas[0]}` : "";
  const chips: Chip[] = p.targetTrades.slice(0, 3).map((trade) => ({
    label: t(L, `Plan: ${trade}${area}${book ? ` — ${book.label.toLowerCase()}` : ""}`, `Plan: ${trade}${area}${book ? ` — ${book.label.toLowerCase()}` : ""}`),
    // The playbook's signal is NOT put in the brief: as a stated requirement it became a hard filter
    // and the run came back empty (replay 2026-10-26); the profile's playbook already ranks by it.
    action: { type: "plan", brief: `Find ${trade}${area} for my ${p.primaryService ?? "service"}` },
  }));
  return { action: "answer_from_existing", reply, chips, profile: p, question: t(L, "Plan a search from your profile?", "Profile se search plan karun?") };
}

/** "for Acme", "switch to acme.in", "use Datakatalyst", "Acme ke liye". */
const YES_RE = /^(yes|yep|yeah|y|haan|han|ha|ji|ok|okay|same|this one|wahi|sure)\b/i;
/** Describes the businesses to FIND ("Barber shops who don't have a website", "I need business without
 *  website") — prod chats saved these as the user's own business profile. */
const TARGET_ASK = /\b(without|no|don'?t\s+have|doesn'?t\s+have|do\s+not\s+have|need(s|ing)?|want(s|ing)?|looking\s+for)\b[^.?]{0,40}\b(website|web\s*site|site|online\s+presence|leads?)\b|\bwho\s+(need|want|don'?t)\b/i;
const LEADISH = /\b(leads?|clients?|customers?|prospects?|buyers?|compan(y|ies)|businesses|firms|startups?|users?\s+of)\b/i;
const FINDISH = /\b(find|get|give|looking\s+for|need|want|search|list|show|fetch|bring|chahiye|nikalo|dhundo|dhoondo|do)\b/i;
/** The saved business whose offerings cover this service ("web development" → Gigzman), if exactly one does. */
function serviceOwner(profiles: BusinessProfile[], service: string): BusinessProfile | null {
  const words = (x: string) => new Set(x.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !/^(services?|solutions?|leads?|clients?|agency|company)$/.test(w)));
  const want = words(service);
  if (!want.size) return null;
  const hits = profiles.filter((b) => [b.primaryService ?? "", ...b.services].some((o) => [...words(o)].some((w) => want.has(w))));
  return hits.length === 1 ? hits[0] : null;
}

const NEW_RE = /^(no|nope|nahi|nahin|different|other|another|someone else|new|naya|nayi|doosra|dusra)\b/i;

async function chatOrDefault(email: string, state: ChatState): Promise<BusinessProfile | null> {
  return (await getProfile(email, state.businessProfileId)) ?? (await defaultProfile(email));
}

/**
 * The business a lead ask is for. Order: a website in the message (a saved one, or read and saved as
 * a new profile); a saved business named in the message; the one this chat already chose; else —
 * when the user has any saved — ask once. With none saved there is nothing to ask.
 */
async function pickBusiness(input: { email: string; state: ChatState; brief: string; message: string | null; savedOnly: boolean; step: StepFn }): Promise<{ chosen: BusinessProfile | null; ask: boolean; created: boolean; failedSite?: string; read?: boolean; via?: "url" | "named" | "current" | "default" }> {
  const profiles = await listProfiles(input.email);
  const url = input.message ? findUrl(input.message) : null;
  if (url) {
    const host = hostOf(url);
    const same = profiles.find((b) => host && hostOf(b.website) === host);
    if (same) return { chosen: same, ask: false, created: false, via: "url" };
    if (!input.savedOnly) {
      const scout = await input.step(`Reading ${url}`, () => runScout({ email: input.email, message: input.message!, url }),
        (o) => (o.siteFailed ? "site did not load" : `${o.pagesRead} pages read`));
      // Nothing learned (site down, a maps link): ask what it sells rather than plan from nothing.
      if (scout.siteFailed && !scout.profile.services.length && !scout.profile.targetTrades.length) return { chosen: null, ask: false, created: false, failedSite: url };
      if (scout.saved) return { chosen: scout.saved, ask: false, created: scout.created, read: true, via: "url" };
    }
  }
  const named = matchProfile(profiles, input.message ?? input.brief);
  if (named) return { chosen: named, ask: false, created: false, via: "named" };
  const current = profiles.find((b) => b.id === input.state.businessProfileId);
  if (current) return { chosen: current, ask: false, created: false, via: "current" };
  if (!profiles.length) return { chosen: null, ask: false, created: false };
  // An explicit search ("dentists in Jaipur") is never held up by "which business?": it plans for the
  // default business and says so above the plan ("Leads for X"), where "for <other>" switches it.
  // Only a lead ask that names nothing ("find leads for my business") asks — see ownBusinessAsk.
  // (Production test I-04: the picker blocked 15 explicit searches before they could be tested.)
  return { chosen: profiles.find((b) => b.isDefault) ?? profiles[0], ask: false, created: false, via: "default" };
}

/** The reply to "Which business are these leads for?" when it is typed, not tapped. */
async function answerWhichBusiness(email: string, message: string, step: StepFn, askedNew: boolean, knownWebsite: string | null = null): Promise<{ kind: "picked"; profile: BusinessProfile; created: boolean } | { kind: "ask_new" } | { kind: "moved_on" }> {
  const text = message.trim();
  const profiles = await listProfiles(email);
  const url = findUrl(text);
  if (url) {
    const host = hostOf(url);
    const same = profiles.find((b) => host && hostOf(b.website) === host);
    if (same) return { kind: "picked", profile: same, created: false };
    const scout = await step(`Reading ${url}`, () => runScout({ email, message: text, url }), (o) => (o.siteFailed ? "site did not load" : `${o.pagesRead} pages read`));
    return scout.saved ? { kind: "picked", profile: scout.saved, created: scout.created } : { kind: "moved_on" };
  }
  const named = matchProfile(profiles, text);
  if (named) return { kind: "picked", profile: named, created: false };
  const words = text.split(/\s+/).length;
  if (profiles.length === 1 && YES_RE.test(text) && words <= 4) return { kind: "picked", profile: profiles[0], created: false };
  if (NEW_RE.test(text) && words <= 4) return { kind: "ask_new" };
  // After "a different business": a short description ("Sharma Sweets, a bakery in Jaipur") is that
  // business. Otherwise — a new request, filler — it is not an answer: the question is dropped and
  // the turn routes as usual ("dentists in Jaipur" must never become a business profile).
  if (askedNew && words >= 2 && words <= 15 && !LEADS_ASK.test(text) && !TARGET_ASK.test(text) && !FILLER.test(text)) {
    const scout = await step("Reading what you told me", () => runScout({ email, message: text, url: null, knownWebsite }), () => "from chat");
    if (scout.saved) return { kind: "picked", profile: scout.saved, created: scout.created };
  }
  return { kind: "moved_on" };
}

function assistantPayload(a: AssistantOutput, L: Lang): Omit<V2Payload, "steps" | "tookMs" | "turnType" | "v2"> {
  return { action: "answer_from_existing", reply: a.reply, chips: a.chips, question: a.chips.length ? t(L, "Next step?", "Aage kya karein?") : undefined, blocks: [{ type: "markdown", text: a.reply }] };
}

/**
 * A consumer-facing business (clinic, school, salon) asked for "leads": its customers are people, and
 * Mantis finds businesses. Say that plainly, then offer the two things it can do (Tarun, 2026-10-23):
 * vendors / suppliers to buy from, and businesses to partner with.
 */
function b2cAlert(b: BusinessProfile, L: Lang): Omit<V2Payload, "steps" | "tookMs" | "turnType" | "v2"> {
  const area = b.targetAreas[0] ? ` in ${b.targetAreas[0]}` : "";
  const what = b.services.slice(0, 3).join(", ") || b.summary.slice(0, 60);
  const partners = b.partnerTrades.length ? b.partnerTrades.slice(0, 4) : [];
  const text = t(L,
    `**${b.name} sells to consumers, and Mantis doesn't find consumers (B2C leads aren't supported)** — it finds businesses. Here's what I can do for ${b.name} instead:\n\n` +
      `- **Partners**: businesses you could collaborate with to reach your customers${partners.length ? ` — ${partners.join(", ")}` : ""}.\n- **Vendors**: suppliers and service providers for what you run (${what}).`,
    `**${b.name} aam logon (consumers) ko bechta hai, aur Mantis consumers nahi dhoondhta (B2C leads support nahi hain)** — ye businesses dhoondhta hai. ${b.name} ke liye main ye kar sakta hoon:\n\n` +
      `- **Partners**: aise businesses jinke saath collaborate karke aapke customers tak pahunch sakein${partners.length ? ` — ${partners.join(", ")}` : ""}.\n- **Vendors**: aapke kaam (${what}) ke liye suppliers aur service providers.`);
  const chips: Chip[] = [
    ...(partners.length ? [{ label: t(L, "Find partner businesses", "Partner businesses dhoondho"), action: { type: "plan", brief: `Find ${partners.join(", ")}${area} that ${b.name} could partner with to reach its customers` } as ChatAction }] : []),
    { label: t(L, "Find vendors / suppliers", "Vendors / suppliers dhoondho"), action: { type: "plan", brief: `Find suppliers and vendors that ${b.name} (${what}) would buy from${area}` } as ChatAction },
    { label: t(L, "Edit business profile", "Business profile badlein"), action: { type: "open", href: "/settings/business-profiles" } as ChatAction },
  ];
  return { action: "answer_from_existing", reply: text, chips, question: t(L, "What should I find?", "Kya dhoondhun?"), blocks: [{ type: "markdown", text }] };
}

/** "Find leads for my business", "leads chahiye": a lead ask that names no trade, product or audience. */
const OWN_RE = /\b(my|our|mere|mera|meri|mujhe|hamare|humare|hamara|hamari|apne|apni|apna)\s+(own\s+)?(business|company|startup|agency|firm|services?|products?|brand|shop|store|dukaan|dukan|kaam|dhand[ae]|website|clinic|office)\b/gi;
const GENERIC_WORDS = new Set("find get give show bring fetch search need want looking look can you could would please pls me i us we some a an the more new good potential quality relevant real sales grow growth help to for of my our leads lead clients client customers customer buyers buyer prospects prospect business businesses company companies chahiye chaiye nikalo nikal nikaal do de dedo lao dhundo dhoondo dhundho ke ki ka liye mere mujhe hai hain kuch kr kar karo krdo kardo please".split(" "));
export function isGenericOwnAsk(message: string): boolean {
  // Words in any script count: "मुझे दिल्ली में रेस्टोरेंट चाहिए" names a trade and a city (re-test ED07).
  const rest = message.toLowerCase().replace(OWN_RE, " ").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w && !GENERIC_WORDS.has(w));
  if (rest.some((w) => /[^\x00-\x7f]/.test(w))) return false;
  // "for my business in Delhi" is still generic (a place, no trade); "dentists for my agency" is not.
  // "for my businss" (a typo of the phrase) leaves one non-trade word behind: still nothing to search for.
  return rest.length <= 4 && rest.every((w) => !resolveCategoryPhrase(w)) && !findUrl(message) && (new RegExp(OWN_RE.source, "i").test(message) || rest.length <= 1);
}

/** Bullet facts about a saved business, as the chat shows them before planning. */
function profileFacts(b: BusinessProfile, L: Lang): string {
  return [
    b.summary && `- ${b.summary}`,
    b.services.length && `- ${t(L, "Sells", "Bechta hai")}: ${b.services.slice(0, 5).join(", ")}`,
    b.targetTrades.length && `- ${t(L, "Likely buyers", "Sambhavit kharidaar")}: ${b.targetTrades.slice(0, 5).join(", ")}`,
    b.targetAreas.length && `- ${t(L, "Serves", "Area")}: ${b.targetAreas.slice(0, 4).join(", ")}`,
  ].filter(Boolean).join("\n");
}

/** "Which business is yours?" when nothing is saved — the description becomes its profile. */
function whichBusinessAsk(L: Lang, failedHost: string | null, brief?: string | null): Omit<V2Payload, "steps" | "tookMs" | "turnType" | "v2"> {
  const mapsLink = !!failedHost && /(^|\.)(goo\.gl|g\.page|google\.[a-z.]+)$/i.test(failedHost);
  const text = mapsLink
    ? t(L, "That's a Google Maps link, not a website, so there's nothing for me to read about what you sell. Paste your website, or tell me in one line what you sell and who buys it (e.g. \"Office interiors for IT companies in Gurgaon\").",
        "Ye Google Maps ka link hai, website nahi — isse pata nahi chalta aap kya bechte hain. Website paste karein, ya ek line mein bataiye aap kya bechte hain aur kaun kharidta hai.")
    : failedHost
    ? t(L, `I tried to read **${failedHost}** but it didn't load — it may be down or blocking automated visits. Tell me in one line what you sell and who buys it (e.g. "Office interiors for IT companies in Gurgaon"), and I'll plan the search around it.`,
        `Maine **${failedHost}** padhne ki koshish ki par wo load nahi hui. Ek line mein bataiye aap kya bechte hain aur kaun kharidta hai (jaise "Gurgaon mein IT companies ke liye office interiors"), main usi hisaab se search plan karunga.`)
    : t(L, "Which business are these leads for? Paste its website, or tell me in one line what it sells and who buys it — I'll save it as your business profile and plan the search around it.",
        "Ye leads kis business ke liye hain? Website paste karein, ya ek line mein bataiye ye kya bechta hai aur kaun kharidta hai — main ise business profile mein save karke search plan karunga.");
  return {
    action: "needs_clarification", reply: text, chips: [], blocks: [{ type: "markdown", text }],
    clarification: { question: t(L, "Which business?", "Kaunsa business?"), options: [
      { label: t(L, "Paste website or describe it", "Website paste karein ya batayein"), description: "e.g. acme.in", value: FOCUS_COMPOSER },
      // The question blocked new users who only wanted a list (prod 2026-11-03: "dentists" typed
      // twice, the same question twice, gone). Skipping plans without a profile.
      ...(brief?.trim() ? [{ label: t(L, "Skip — just find the leads", "Skip — bas leads dhoondo"), description: t(L, "Search without a business profile", "Business profile ke bina search"),
        action: { type: "plan", brief: brief.replace(/^new:/, "").trim(), skipProfile: true } as ChatAction }] : []),
    ] },
  };
}

/** The website given at onboarding (company or independent), if any. */
async function onboardingWebsite(email: string): Promise<string | null> {
  const [r] = await sql`
    SELECT COALESCE(NULLIF(a.website, ''), NULLIF(f.website, '')) AS website
    FROM user_profiles u LEFT JOIN agency_profiles a ON a.email = u.email LEFT JOIN freelancer_profiles f ON f.email = u.email
    WHERE u.email = ${email}`;
  const w = (r?.website as string | null) ?? null;
  return w && findUrl(w) ? w.trim() : null;
}

/**
 * A no-trade lead ask. The chat's business already chosen → null (plan as usual). Otherwise confirm
 * the saved business with its facts; with none saved, read the onboarding website now and confirm
 * that; with nothing at all, ask for the business (its one-line answer is saved and planned).
 */
async function ownBusinessAsk(input: { email: string; state: ChatState; brief: string; step: StepFn }): Promise<{ state: ChatState; payload: Omit<V2Payload, "steps" | "tookMs" | "turnType" | "v2"> } | null> {
  const L = input.state.lang;
  let profiles = await listProfiles(input.email);
  if (profiles.some((b) => b.id === input.state.businessProfileId)) return null;
  let justRead = false;
  let failedHost: string | null = null;
  if (!profiles.length) {
    const site = await onboardingWebsite(input.email);
    if (site) {
      const scout = await input.step(`Reading ${hostOf(site) ?? site}`, () => runScout({ email: input.email, message: `My business website: ${site}`, url: site }),
        (o) => (o.siteFailed ? "site did not load" : `${o.pagesRead} pages read`));
      const usable = scout.saved && (scout.profile.services.length > 0 || scout.profile.targetTrades.length > 0);
      if (usable) { profiles = [scout.saved!]; justRead = true; }
      else failedHost = hostOf(site) ?? site;
      if (!usable) {
        // The one-line answer lands on this website's (empty) profile instead of a second one.
        return { state: { ...input.state, failedSite: site, pendingProfileBrief: `new:${input.brief.slice(0, 290)}` }, payload: whichBusinessAsk(L, failedHost, input.brief) };
      }
    }
  }
  if (!profiles.length) return { state: { ...input.state, pendingProfileBrief: `new:${input.brief.slice(0, 290)}` }, payload: whichBusinessAsk(L, null, input.brief) };
  return { state: { ...input.state, pendingProfileBrief: input.brief.slice(0, 300) }, payload: profileQuestion(profiles, input.brief.slice(0, 300), L, justRead) };
}


/**
 * The Client context card (lib/v2/blocks.ts ContextBlock): who these leads are for. Shown before any
 * plan; "Use this" confirms it (confirm_context), typing "yes" / an offering's name does too, and a
 * typed change ("add X as a service", "my buyers are hospitals") edits the profile and re-shows it.
 */
function contextCardPayload(b: BusinessProfile, brief: string, L: Lang, fresh: boolean, others: BusinessProfile[], offering: string | null): Omit<V2Payload, "steps" | "tookMs" | "turnType" | "v2"> {
  const site = hostOf(b.website);
  const many = b.services.length > 1;
  const text = fresh
    ? t(L, `I read ${site ? `**${site}**` : "what you told me"} and saved it as **${b.name}**. Before I plan anything, confirm who these leads are for${many ? " — and which of its offerings" : ""}:`,
        `Maine ${site ? `**${site}**` : "aapki baat"} padhi aur **${b.name}** ke naam se save kiya. Plan se pehle confirm karein ki leads kiske liye hain${many ? " — aur kaunsi offering ke liye" : ""}:`)
    : t(L, `Are these leads for **${b.name}**${site ? ` (${site})` : ""}? Confirm the business${many ? ", pick the offering" : ""} and the buyers — I'll choose the signals and the pipeline from that.`,
        `Kya ye leads **${b.name}**${site ? ` (${site})` : ""} ke liye hain? Business${many ? ", offering" : ""} aur buyers confirm karein — signals aur pipeline main usi se tay karunga.`);
  return {
    action: "needs_clarification", reply: text, chips: [],
    blocks: [
      { type: "markdown", text },
      { type: "context", profileId: b.id, name: b.name, website: b.website, summary: b.summary, offerings: b.services.slice(0, 8),
        offering: offering ?? (many ? null : b.services[0] ?? b.primaryService ?? null), buyers: b.targetTrades.slice(0, 8), areas: b.targetAreas.slice(0, 5),
        sellsTo: b.sellsTo ?? null, brief, fresh, others: others.slice(0, 5).map((o) => ({ profileId: o.id, name: o.name })) },
    ],
  };
}

/** A typed change to the business on the card, not a pick of it. */
const PROFILE_EDIT_RE = /^\s*(change|edit|update)\b.*\bprofile\b|\b(add|remove|replace|change)\b.*\b(offering|service|buyers?|icp|customers?|area)s?\b|\b(offering|buyers?|icp)\s*:/i;

/** A typed reply to a waiting Client context card that confirms it: yes, or one of its offerings. */
async function cardAnswer(email: string, profileId: string, message: string): Promise<boolean> {
  const b = await getProfile(email, profileId);
  if (!b) return false;
  const text = message.trim();
  if (YES_RE.test(text) && text.split(/\s+/).length <= 6) return true;
  return !!matchOffering(b.services, text) && text.split(/\s+/).length <= 10;
}

/** The offering a message names ("for the SEO one", "website development"), if any. */
function matchOffering(services: string[], message: string): string | null {
  const m = message.toLowerCase();
  const words = (x: string) => x.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  let best: { s: string; score: number } | null = null;
  for (const sv of services) {
    if (m.includes(sv.toLowerCase())) return sv;
    const w = words(sv);
    const hit = w.filter((x) => m.includes(x)).length;
    const score = w.length ? hit / w.length : 0;
    if (score >= 0.6 && (!best || score > best.score)) best = { s: sv, score };
  }
  return best?.s ?? null;
}

/** The seller narrowed to the confirmed offering (null = everything it sells). */
function focusOffering<T extends SellerProfile>(p: T, offering: string | null): T {
  return offering ? { ...p, services: [offering], primaryService: offering } : p;
}

/** "Which business are these leads for?" — each saved business, plus a new one. */
function profileQuestion(profiles: BusinessProfile[], brief: string, L: Lang, justRead = false): Omit<V2Payload, "steps" | "tookMs" | "turnType" | "v2"> {
  const newOpt = { label: t(L, "Someone else / new business", "Koi aur / naya business"), description: t(L, "Paste its website or describe it", "Website paste karein ya batayein"), value: FOCUS_COMPOSER };
  // One saved business: its Client context card (confirm, pick the offering, or switch).
  if (profiles.length === 1) return contextCardPayload(profiles[0], brief, L, justRead, [], null);
  const text = t(L, "Which business are these leads for? I'll tailor the search to what it sells.", "Ye leads kaunse business ke liye hain? Search usi ke hisaab se banaunga.");
  return {
    action: "needs_clarification", reply: text, chips: [], blocks: [{ type: "markdown", text }],
    clarification: { question: t(L, "Which business are these leads for?", "Ye leads kis business ke liye?"), options: [
      ...profiles.slice(0, 5).map((b) => ({ label: b.name, description: hostOf(b.website) ?? b.summary.slice(0, 80), action: { type: "use_profile", profileId: b.id, brief } as ChatAction })),
      newOpt,
      // Same way out as the no-profile question: a typed answer that names none of these ("interior
      // design") re-asked this question every turn (stuck replay 2026-11-06).
      ...(brief.trim() ? [{ label: t(L, "Skip — just find the leads", "Skip — bas leads dhoondo"), description: t(L, "Search without a business profile", "Business profile ke bina search"),
        action: { type: "plan", brief: brief.replace(/^new:/, "").trim(), skipProfile: true } as ChatAction }] : []),
    ] },
  };
}

/** History as the models see it: prior results are summarised, since only reply text is stored. */
async function loadHistory(chatId: string): Promise<Msg[]> {
  const rows = await sql`
    SELECT role, content, intent FROM chat_messages WHERE chat_id = ${chatId}
    ORDER BY created_at DESC LIMIT 11
  `;
  // The newest row is this turn's own user message, already inserted by the route.
  return rows.slice(1).reverse().map((r) => {
    const leads = (r.intent as { leads?: ChatLead[] } | null)?.leads;
    const summary = leads?.length ? ` [Showed ${leads.length} results: ${leads.slice(0, 5).map((l) => l.business_name).join(", ")}…]` : "";
    return { role: r.role as "user" | "assistant", content: `${r.content as string}${summary}` };
  });
}

/** A short reply to the one question we asked answers that question — v1 lost "25" this way. */
function answerPending(r: RouterOutput, s: ChatState, message: string): RouterOutput {
  const text = message.trim();
  const short = text.split(/\s+/).length <= 5 && !/^\d+$/.test(text);
  if (!s.pending || !short || !["chat", "search", "refine"].includes(r.type)) return r;
  // Only something that IS an answer answers the question: "gg" after "Did you mean…?" once became
  // a category, and the Planner re-ran the last search from history.
  if (FILLER.test(text)) return r;
  if (s.pending === "location" && !r.areaText && /[a-z]{3,}/i.test(text)) return { ...r, type: "search", areaText: text };
  if (s.pending === "category" && !r.categoryText && resolveCategoryPhrase(text)) return { ...r, type: "search", categoryText: text };
  return r;
}

function mergeSlots(prev: ChatState, r: RouterOutput): ChatState {
  const s: ChatState = { ...prev, excludeTypes: [...prev.excludeTypes], pending: null };
  let changed = false;
  if (r.type === "explore_area") {
    s.categoryText = null; s.placeType = null; changed = true;
  }
  if (r.categoryText) {
    s.categoryText = r.categoryText;
    s.placeType = resolveCategoryPhrase(r.categoryText);
    changed = true;
  }
  if (r.areaText && r.areaText.toLowerCase() !== (prev.areaText ?? "").toLowerCase()) {
    // A new place resets the radius; restating the same place keeps centre and radius.
    s.areaText = r.areaText; s.center = null; s.radiusM = 1500; changed = true;
  } else if (r.nearMe) {
    s.areaText = null; s.center = null; changed = true;
  }
  if (r.noWebsiteOnly !== null) { s.noWebsiteOnly = r.noWebsiteOnly; changed = true; }
  for (const k of ["minReviews", "maxReviews", "minRating", "maxRating"] as const) {
    if (r[k] !== null) { s[k] = r[k]; changed = true; }
  }
  for (const ex of r.excludeText) {
    const type = resolveCategoryPhrase(ex);
    if (type && !s.excludeTypes.includes(type)) { s.excludeTypes.push(type); changed = true; }
  }
  for (const f of r.clear) {
    if (f === "noWebsiteOnly") s.noWebsiteOnly = false;
    else if (f === "excludeTypes") s.excludeTypes = [];
    else s[f] = null;
    changed = true;
  }
  if (r.widen) { s.radiusM = nextRadius(s.radiusM); changed = true; }
  if (r.count) { s.pageSize = Math.max(5, Math.min(MAX_PAGE_SIZE, r.count)); s.creditAlerted = false; changed = true; }
  if (r.more && !changed) s.page = prev.page + 1;
  else s.page = 0;
  return s;
}

type StepFn = <T>(label: string, fn: () => Promise<T>, detail?: (r: T) => string) => Promise<T>;
type SearchPayload = Omit<V2Payload, "steps" | "tookMs" | "turnType" | "v2"> & { nextState: ChatState; unresolved: string | null };

async function searchTurn(s0: ChatState, userEmail: string, step: StepFn, nearMe: boolean, here: { lat: number; lng: number } | null = null): Promise<SearchPayload> {
  let s = { ...s0 };
  const L = s.lang;
  let note = "";
  let apiDown = false;

  // A trade we can't map is asked about once, with the nearest real trades as typed options.
  if (s.categoryText && !s.placeType) {
    const near = suggestCategories(s.categoryText);
    s.pending = "category";
    return {
      action: "needs_clarification",
      reply: t(L, `I couldn't match "${s.categoryText}" to a business type I can search.`, `"${s.categoryText}" ko main kisi searchable business type se match nahi kar paya.`),
      chips: [],
      clarification: {
        question: t(L, "Did you mean one of these?", "Inme se koi?"),
        options: [
          ...near.map((n) => ({ label: n.label, description: "", action: { type: "set_category", placeType: n.type, label: n.label } as ChatAction })),
          { label: t(L, "Something else", "Kuch aur"), description: t(L, "Type it in other words", "Doosre shabdon mein likhein"), value: FOCUS_COMPOSER },
        ],
      },
      nextState: s,
      unresolved: s.categoryText,
    };
  }

  // Location: a named place is geocoded; otherwise the last map area is the default (said so in
  // the reply) rather than a question. Only with neither do we ask — once.
  let geocodeDown = false;
  if (!s.center && s.areaText) {
    const area = s.areaText;
    const found = await step(`Locating ${area}`, async () => {
      const local = await localPlace(area);
      if (local) return { value: local, apiDown: false, via: "Mantis map data" };
      const g = await geocodeText(area);
      if (g.value || g.apiDown) return { ...g, via: "Mantis geocoder" };
      // "Perambur and North Chennai": a list of places — the first one that resolves.
      const part = await resolveArea(area);
      return { value: part ? { lat: part.lat, lng: part.lng } : null, apiDown: false, via: part ? `Mantis geocoder (${part.used})` : "Mantis geocoder" };
    }, (r) => (r.value ? `via ${r.via}` : r.apiDown ? "map service unavailable" : "not found"));
    geocodeDown = found.apiDown;
    apiDown = found.apiDown;
    if (found.value) s.center = found.value;
  }
  if (!s.center) {
    // Only "near me" means the last map area. With no place named it used to be used silently too — for
    // a new account that is the dashboard's default centre, so results came from a city nobody asked for.
    // "Near me": where the device is first (exact), then the last map area.
    const last = nearMe ? (here ? { ...here, label: (await placeName(here)) ?? "your location" } : await lastMapCenter(userEmail)) : null;
    if (last) {
      s = { ...s, center: { lat: last.lat, lng: last.lng }, areaText: last.label };
      note = here
        ? t(L, ` (around your current location)`, ` (aapki abhi ki location ke aas-paas)`)
        : t(L, ` (around your last map area — name a place to change it)`, ` (aapke last map area ke aas-paas — jagah badalni ho to naam likhein)`);
    } else {
      const cities = await coveredCities();
      s.pending = "location";
      const failed = s.areaText;
      s.areaText = null;
      return {
        action: "needs_clarification",
        reply: failed && geocodeDown
          ? t(L, `The map lookup service isn't responding right now, and "${failed}" isn't an area I already hold. Pick one of these, or try again in a bit.`, `Map lookup service abhi jawab nahi de rahi, aur "${failed}" mere paas pehle se mapped nahi hai. Inme se chunein ya thodi der baad try karein.`)
          : failed
          ? t(L, `I couldn't find "${failed}" on the map.`, `"${failed}" map pe nahi mila.`)
          : t(L, "Which area should I search?", "Kis area mein dhoondhun?"),
        chips: [],
        clarification: {
          question: t(L, "Pick an area or type one", "Area chunein ya likhein"),
          options: [
            ...cities.map((c) => ({ label: c.city, description: `${c.n.toLocaleString("en-IN")} businesses mapped`, action: { type: "set_area", areaText: c.city } as ChatAction })),
            { label: t(L, "Type a city or neighbourhood", "Shehar ya mohalla likhein"), description: "e.g. Sector 56, Gurugram", value: FOCUS_COMPOSER },
          ],
        },
        nextState: s,
        unresolved: null,
        apiDown,
      };
    }
  }

  const tradeLabel = s.placeType ? plural(s.categoryText ?? formatCategory(s.placeType) ?? "businesses") : "businesses";
  let creditsShort = false;
  // Credits are read BEFORE anything is spent, so the reply can lead with what they allow.
  const credit = await step("Checking your credits", () => creditStatus(userEmail), (c) =>
    `${c.credits} credits${c.liveCovered ? "; live search covered by today's free allowance" : ""}`);
  if (s.placeType && s.page === 0 && !credit.canSearchLive) {
    creditsShort = true;
  } else if (s.placeType && s.page === 0 && s.center && liveKey(s) !== s.lastLive) {
    s.lastLive = liveKey(s);
    const live = await step(`Checking maps for new ${tradeLabel.toLowerCase()}`, () => liveDiscover(s), (r) =>
      r.status === "searched" ? `searched live, ${r.found} found`
      : r.status === "cached" ? "area already searched — using saved results (free)"
      : r.status === "throttled" ? "searched moments ago — using saved results"
      : r.status === "credits_required" ? "not enough credits for a live search"
      : "skipped");
    apiDown = apiDown || live.apiDown;
    creditsShort = live.status === "credits_required" || live.status === "limit";
  }
  const alerts: string[] = [];
  if (creditsShort) {
    alerts.push(t(L,
      `A live search costs ${CREDIT_COST.billed_places_call} credits and you have ${credit.credits}, so this shows only businesses already on file.`,
      `Live search ${CREDIT_COST.billed_places_call} credits ka hai aur aapke paas ${credit.credits} hain, isliye sirf pehle se saved businesses dikha raha hoon.`));
  }
  const res = await step(
    s.page > 0 ? `Loading page ${s.page + 1}` : "Ranking results",
    () => readResults(s, userEmail),
    (r) => `${r.leads.length} shown`
  );

  const place = s.areaText ?? t(L, "this area", "is area");
  const within = s.radiusM > 1500 ? ` ${t(L, "within", "")}${t(L, ` ${km(s.radiusM)}`, `(${km(s.radiusM)} ke andar)`)}` : "";
  const filters = describeFilters(s);
  const chips: Chip[] = [];
  const canWiden = s.radiusM < MAX_RADIUS_M;
  const widenChip: Chip = { label: t(L, `Widen to ${km(nextRadius(s.radiusM))}`, `${km(nextRadius(s.radiusM))} tak badhao`), action: { type: "widen", radiusM: nextRadius(s.radiusM) } };
  let reply: string;
  let exhausted = false;

  if (res.leads.length > 0) {
    const added = s.page > 0 ? res.leads.length - s.page * s.pageSize : 0;
    const extra = s.page > 0 ? t(L, ` (${added} new)`, ` (${added} naye)`) : "";
    let what = s.placeType ? tradeLabel.toLowerCase() : t(L, "businesses of all kinds", "har tarah ke businesses");
    if (res.leads.length === 1) what = what.replace(/(ies|es|s)$/, (m) => (m === "ies" ? "y" : ""));
    if (s.page > 0 && added <= 0) {
      exhausted = true;
      // Asked for more than exists: keep the list, say it plainly, point at the wider area.
      s.page -= 1;
      reply = t(L, `That's all ${res.leads.length} ${what} near ${place}${within}${filters ? `, ${filters}` : ""} — widen the area for more.`,
        `${place}${within} mein itne hi ${res.leads.length} ${what} hain${filters ? ` (${filters})` : ""} — zyada ke liye area badhayein.`);
    } else reply = t(L,
      `Showing ${res.leads.length} ${what}${extra} near ${place}${within}${filters ? `, ${filters}` : ""}${note}.`,
      `${place}${within} mein ${res.leads.length} ${what} mile${extra}${filters ? `, ${filters}` : ""}${note}.`);
    if (res.hasMore) chips.push({ label: t(L, `Show ${s.pageSize} more`, `${s.pageSize} aur dikhao`), action: { type: "more" } });
    if (!s.noWebsiteOnly) chips.push({ label: t(L, "Only ones without a website", "Sirf bina website wale"), action: { type: "only_no_website" } });
    if (!res.hasMore && canWiden) chips.push(widenChip);
    for (const tt of res.topTypes.slice(0, 3)) {
      const label = formatCategory(tt.type) ?? tt.type;
      chips.push({ label: t(L, `Just ${plural(label).toLowerCase()} (${tt.n})`, `Sirf ${plural(label).toLowerCase()} (${tt.n})`), action: { type: "set_category", placeType: tt.type, label } });
    }
  } else if (s.page > 0) {
    reply = t(L, `That's all the ${tradeLabel.toLowerCase()} near ${place}${within}${filters ? ` ${filters}` : ""}.`, `${place}${within} mein itne hi ${tradeLabel.toLowerCase()} the${filters ? ` (${filters})` : ""}.`);
    // Cumulative pages: an empty extra page means nothing new; keep showing what they had.
    if (canWiden) chips.push(widenChip);
  } else if (res.mappedHere === 0) {
    const cities = await coveredCities();
    reply = t(L,
      `We haven't mapped ${place} yet, so nothing is on file there — that's not the same as none existing. Best-covered right now: ${cities.map((c) => c.city).join(", ")}.`,
      `${place} abhi map nahi hua hai, isliye yahan kuch on-file nahi hai — iska matlab ye nahi ki wahan businesses nahi hain. Abhi sabse achhi coverage: ${cities.map((c) => c.city).join(", ")}.`);
    if (canWiden) chips.push(widenChip);
    for (const c of cities.slice(0, 2)) chips.push({ label: t(L, `Search ${c.city} instead`, `${c.city} mein dhoondho`), action: { type: "set_area", areaText: c.city } });
  } else {
    reply = t(L,
      `No ${tradeLabel.toLowerCase()}${filters ? ` ${filters}` : ""} near ${place}${within}, though ${res.mappedHere?.toLocaleString("en-IN")} other businesses are mapped there.`,
      `${place}${within} mein ${tradeLabel.toLowerCase()}${filters ? ` (${filters})` : ""} nahi mile, jabki wahan ${res.mappedHere?.toLocaleString("en-IN")} doosre businesses mapped hain.`);
    if (hasFilters(s)) chips.push({ label: t(L, "Drop the filters", "Filters hatao"), action: { type: "clear", filters: [...ALL_FILTERS] } });
    if (canWiden) chips.push(widenChip);
  }

  // Saved data ran thin ("Found 1 dentist near Bengaluru", "none near Mumbai though 411 are mapped" —
  // ~45 prod chats ended here): a planned run searches live and reads sites, so offer it first.
  if (s.page === 0 && !res.hasMore && res.leads.length < 10 && !/last map area|^\d/.test(place)) {
    const who = s.placeType ? plural(tradeLabel).toLowerCase() : "businesses";
    chips.unshift({ label: t(L, `Search live for 20 ${who}`, `20 ${who} live dhoondho`),
      action: { type: "plan", brief: `Find 20 ${who}${s.noWebsiteOnly ? " without a website" : ""} in ${place}` } });
  }

  // Unlock affordability, said up front when it limits what they asked for.
  const wanted = Math.max(res.leads.length, s.pageSize);
  // Said once per chat (and again when a new count is asked) — repeating it every turn is noise.
  if (res.leads.length && credit.unlocksAffordable < wanted && !s.creditAlerted) {
    s.creditAlerted = true;
    alerts.push(s.pageSize > PAGE_SIZE
      ? t(L,
        `Heads up: you asked for ${s.pageSize}; with ${credit.credits} credits you can unlock ${credit.unlocksAffordable} (${CREDIT_COST.lead_unlock} credits each). Top up in Settings → Billing for more.`,
        `Dhyan dein: aapne ${s.pageSize} maange; ${credit.credits} credits mein ${credit.unlocksAffordable} hi unlock ho payenge (${CREDIT_COST.lead_unlock} credits each). Zyada ke liye Settings → Billing se top up karein.`)
      : t(L,
        `Heads up: you have ${credit.credits} credits — enough to unlock ${credit.unlocksAffordable} of these (${CREDIT_COST.lead_unlock} credits each).`,
        `Dhyan dein: aapke paas ${credit.credits} credits hain — inme se ${credit.unlocksAffordable} hi unlock ho payenge (${CREDIT_COST.lead_unlock} credits each).`));
  }
  // Asked for more than this radius holds: say so, the widen option is right below.
  if (res.leads.length && !res.hasMore && s.pageSize > res.leads.length && canWiden && !exhausted) {
    reply += t(L, ` That's all within ${km(s.radiusM)} — widen the area for more.`, ` ${km(s.radiusM)} mein itne hi hain — zyada ke liye area badhayein.`);
  }
  if (alerts.length) reply = `${alerts.join(" ")}\n\n${reply}`;
  const question = res.leads.length ? t(L, "What next?", "Aage kya karein?") : t(L, "Try one of these?", "Inme se try karein?");
  return { action: "search_leads", reply, leads: res.leads, chips: chips.slice(0, 4), question, nextState: s, unresolved: null, apiDown };
}

/** "dentist" -> "dentists"; leaves words the user already pluralised alone. */
function plural(x: string): string {
  const w = x.trim();
  if (/s$/i.test(w)) return w;
  if (/[^aeiou]y$/i.test(w)) return w.slice(0, -1) + "ies";
  if (/(ch|sh|x)$/i.test(w)) return w + "es";
  return w + "s";
}

/** What a live discovery covered; a turn that only changes filters reuses it. */
function liveKey(s: ChatState): string {
  return `${s.placeType}:${s.center!.lat.toFixed(4)},${s.center!.lng.toFixed(4)}:${Math.min(s.radiusM, 3000)}`;
}

function describeFilters(s: ChatState): string {
  const f: string[] = [];
  if (s.noWebsiteOnly) f.push(t(s.lang, "without a website", "bina website ke"));
  if (s.minReviews !== null && s.maxReviews !== null) f.push(`${s.minReviews}–${s.maxReviews} reviews`);
  else if (s.minReviews !== null) f.push(`${s.minReviews}+ reviews`);
  else if (s.maxReviews !== null) f.push(t(s.lang, `at most ${s.maxReviews} reviews`, `${s.maxReviews} se kam reviews`));
  if (s.minRating !== null) f.push(t(s.lang, `rated ${s.minRating}+`, `${s.minRating}+ rating`));
  if (s.maxRating !== null) f.push(t(s.lang, `rated ${s.maxRating} or below`, `${s.maxRating} ya kam rating`));
  if (s.excludeTypes.length) f.push(t(s.lang, `excluding ${s.excludeTypes.map((x) => formatCategory(x)).join(", ")}`, `${s.excludeTypes.map((x) => formatCategory(x)).join(", ")} chhod ke`));
  return f.join(", ");
}
