/**
 * Mantis's answer path (docs/v2-agents.md §1 C3, C6): every turn that is not a search. Grounded in
 * product_facts and our own coverage numbers; free knowledge is allowed but marked as advice.
 */

import { sql } from "@/lib/db";
import { formatCategory } from "@/lib/categories";
import { callTool, normalize, MODELS, type Msg } from "./claude";
import { productFacts } from "./facts";
import type { ChatState } from "./state";
import type { RouterOutput } from "./router";

/** Types where a search chip is the natural next step. Elsewhere none is shown, so the model is
 *  told not to mention one — otherwise it points at a button that isn't there. */
export const SUGGEST_TYPES: RouterOutput["type"][] = ["advice", "service_search", "brief", "own_business", "vendor", "chat"];

export type AnswerOutput = {
  reply: string;
  /** One search the answer recommends, offered as a chip — resolved and validated by the caller. */
  suggestedSearch: { categoryText: string; areaText: string } | null;
  /** True when the user wanted something Mantis cannot do yet. */
  unmet: boolean;
  unmetNote: string | null;
};

/** No-website share by trade across what we hold — the numbers advice should stand on. */
// The KALT chat quoted "Mantis holds 4,883 convenience stores" for Mumbai: that number was every
// country together (Toronto, London…) and Mumbai held 0. Counts are India-only now, and the chat's
// own city gets its own line, so a city claim can only be made from a city number.
export async function gapStats(city: string | null): Promise<string> {
  const rows = await sql`
    SELECT category, count(*)::int AS n,
           round(100.0 * count(*) FILTER (WHERE has_website = false) / NULLIF(count(*) FILTER (WHERE has_website IS NOT NULL), 0))::int AS gap
    FROM leads WHERE is_competitor = false AND category IS NOT NULL AND lower(country_code) = 'in'
    GROUP BY 1 HAVING count(*) >= 200 ORDER BY count(*) FILTER (WHERE has_website = false) DESC LIMIT 12
  `;
  const cities = await sql`
    SELECT city_slug, count(*)::int AS n FROM leads WHERE city_slug IS NOT NULL AND lower(country_code) = 'in' GROUP BY 1 ORDER BY 2 DESC LIMIT 6
  `;
  const slug = city?.split(",")[0].trim().toLowerCase().replace(/\s+/g, "-").replace(/^gurugram$/, "gurgaon") ?? null;
  const local = slug ? await sql`
    SELECT category, count(*)::int AS n FROM leads WHERE city_slug = ${slug} AND category IS NOT NULL AND NOT is_competitor
    GROUP BY 1 ORDER BY 2 DESC LIMIT 15` : [];
  return [
    "All numbers below are INDIA-WIDE unless a line names a city. Never present an India-wide number as a city's number; for a city, use only its own line, and if a trade is missing from it, Mantis holds none saved there yet (a live search can still find them).",
    ...(slug ? [`${city}: ` + (local.length ? local.map((r) => `${formatCategory(r.category as string)} ${Number(r.n).toLocaleString("en-IN")}`).join(", ") : "nothing saved yet")] : []),
    "Trades with the most no-website businesses in Mantis's India data (trade: businesses held, % without a website):",
    ...rows.map((r) => `- ${formatCategory(r.category as string)}: ${Number(r.n).toLocaleString("en-IN")}, ${r.gap ?? "?"}%`),
    "Best-covered cities: " + cities.map((c) => `${c.city_slug} (${Number(c.n).toLocaleString("en-IN")})`).join(", "),
  ].join("\n");
}

const GUIDE: Partial<Record<RouterOutput["type"], string>> = {
  product: "Answer from the facts only. Exact numbers. If the facts don't cover it, say you don't know.",
  advice: "Give a direct, concrete recommendation (a trade and a city) with the reason, using the numbers above where they apply. Say it is a suggestion. Suggest one search.",
  service_search: "Name the buying trigger for their service and the Mantis signals that show it (see PRODUCT FACTS: hiring, funding, branches, weak social, website signals), then suggest one search. Don't invent signals Mantis doesn't measure.",
  brief: "Say which parts of the brief Mantis can do now (local businesses by trade/area, phones via unlock) and which it cannot yet (named decision-makers, multi-source company lists). Offer the closest search.",
  contacts: "Explain exactly how to get contacts now: select rows in the results table → Add to leads (unlock) reveals name, phone and address. Emails: only where a lead already has one.",
  outreach: "Point them to Campaigns: Quick Outreach on a lead list builds an email / WhatsApp / AI-call sequence they test and approve before anything is sent. Give a short practical next step.",
  own_business: "Reflect what they sell in one line, name the 3-5 kinds of business that buy it and the event that makes them buy now. Suggest one search.",
  vendor: "They are looking to BUY. Mantis finds businesses by trade and area, so it can still list suppliers/agencies near them — offer that search, but be clear Mantis is built for finding clients.",
  out_of_scope: "Be kind and brief: Mantis helps businesses and freelancers find clients. Job search is not supported. For a consumer, say this isn't a consumer directory.",
  chat: "Be brief and friendly. Offer one concrete example of what to ask.",
};

const TOOL = {
  name: "answer",
  description: "Write Mantis's reply to the user.",
  input_schema: {
    type: "object",
    properties: {
      reply: { type: "string", description: "The reply in markdown. Pick the shape that fits: a simple question or small talk → 1-3 plain sentences, no headings. Comparing options, several facts, or steps → organise it: up to 3 short '## ' headings, '- ' bullets or '1.' steps, **bold** for the key term, and a markdown table (max 5 rows × 4 columns) when comparing things side by side. Under 180 words either way; never pad to look thorough." },
      suggestedSearch: {
        type: ["object", "null"],
        properties: { categoryText: { type: "string" }, areaText: { type: "string" } },
        required: ["categoryText", "areaText"],
        description: "One search worth running next (a trade and a place), or null.",
      },
      unmet: { type: "boolean", description: "True if the user asked for something Mantis cannot do yet." },
      unmetNote: { type: ["string", "null"], description: "If unmet: a few words naming the missing capability." },
    },
    required: ["reply", "suggestedSearch", "unmet", "unmetNote"],
  },
};

export async function answerTurn(input: {
  route: RouterOutput;
  state: ChatState;
  history: Msg[];
  message: string;
}): Promise<AnswerOutput> {
  const langRule =
    input.route.lang === "en" ? "Reply in English."
    : input.route.lang === "hi" ? "Reply in Hindi (Devanagari)."
    : "Reply in Hinglish (Hindi in Roman script), the way the user writes.";
  const current = input.state.categoryText || input.state.areaText
    ? `Current search: ${input.state.categoryText ?? "any business"} in ${input.state.areaText ?? "no area yet"}${input.state.noWebsiteOnly ? ", no website only" : ""}.`
    : "No search yet in this chat.";

  const system = [
    "You are Mantis, the assistant inside Mantis Ai. Users are agencies and freelancers looking for clients.",
    "Rules: never claim you did something you did not do in this turn — you have run no search and set nothing up; if you suggest a search, say the user can tap the button below to run it. Never say you are searching; never promise to follow up later or notify anyone; never invent numbers, prices, results or market facts — numbers come only from PRODUCT FACTS and MANTIS DATA, anything else is clearly your opinion. If something isn't possible yet, say so plainly and offer the nearest thing that is. Never name the AI model, search engine, maps/data provider, API or cloud Mantis uses — it is Mantis's own AI and data pipeline.",
    langRule,
    `How to handle this message (type: ${input.route.type}): ${GUIDE[input.route.type] ?? GUIDE.chat}`,
    SUGGEST_TYPES.includes(input.route.type)
      ? "You may suggest one search via suggestedSearch; a button to run it is shown under your reply."
      : "Do not suggest a search and do not mention any button: set suggestedSearch to null.",
    current,
    "PRODUCT FACTS:\n" + productFacts(),
    "MANTIS DATA:\n" + (await gapStats(input.state.areaText ?? null)),
  ].join("\n\n");

  const raw = await callTool({
    agent: "mantis-answer",
    model: MODELS.best,
    system,
    messages: normalize(input.history, input.message),
    tool: TOOL,
    maxTokens: 1500,
    force: false,
  });

  const rawReply =
    typeof raw.reply === "string" && raw.reply.trim() ? raw.reply.trim()
    : typeof raw.text === "string" && raw.text.trim() ? raw.text.trim()
    : null;
  // V2 renders markdown (components/chat/v2/Markdown.tsx), so structure is kept, not stripped.
  const reply = rawReply;
  const ss = raw.suggestedSearch as { categoryText?: unknown; areaText?: unknown } | null;
  return {
    reply: reply ?? "Sorry — I couldn't put an answer together. Could you say that another way?",
    suggestedSearch:
      ss && typeof ss.categoryText === "string" && typeof ss.areaText === "string" && ss.categoryText.trim() && ss.areaText.trim()
        ? { categoryText: ss.categoryText.trim().slice(0, 80), areaText: ss.areaText.trim().slice(0, 120) }
        : null,
    unmet: raw.unmet === true,
    unmetNote: typeof raw.unmetNote === "string" ? raw.unmetNote.slice(0, 200) : null,
  };
}
