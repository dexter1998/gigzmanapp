import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { bedrock, CHAT_MODEL_ID } from "@/lib/bedrock";
import { SECTION_NAMES } from "@/lib/categories";
import { recordApiFailure } from "@/lib/api-alerts";

// Thrown instead of letting a Bedrock failure bubble up as a raw 500 — callers catch this
// specifically to show the maintenance banner instead of a broken/crashed reply.
export class BedrockUnavailableError extends Error {}

export type ChatIntent = {
  action: "search_leads" | "answer_from_existing" | "needs_clarification";
  category: string | null;
  /** Whatever the user actually called the business type, verbatim — "CA", "dentist", "parlour".
   *  Resolved to a real place type server-side; the section enum above can't express any of these. */
  categoryText: string | null;
  areaText: string | null;
  noWebsiteOnly: boolean;
  /** Thresholds the user asked for. Before these existed there was nowhere to put "100+ reviews",
   *  so the constraint was silently discarded and the same question got asked again. */
  minReviews: number | null;
  minRating: number | null;
  missingField: "category" | "location" | "count" | null;
  reply: string;
  nextActions: string[];
};

const TOOL_NAME = "emit_intent";

// A small, fixed schema — the model only ever selects a real section name (or admits it
// doesn't know one and asks), it never invents a Places category or a location it wasn't
// given. Geocoding of areaText happens separately, never inside the model itself.
const INTENT_TOOL = {
  toolSpec: {
    name: TOOL_NAME,
    description: "Classify what the user wants and extract search parameters if they're asking to find leads.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["search_leads", "answer_from_existing", "needs_clarification"],
            description:
              "search_leads: the user wants to find new businesses. answer_from_existing: the user is asking a question " +
              "you can answer from context already given (e.g. about leads already found, or how the product works) — no search needed. " +
              "needs_clarification: a search was requested but a required detail is missing or too ambiguous to guess.",
          },
          category: {
            type: ["string", "null"],
            enum: [...SECTION_NAMES, null],
            description:
              "The broad section, when the user asked for something broad. Null is fine and normal — " +
              "prefer categoryText whenever the user named a specific trade.",
          },
          categoryText: {
            type: ["string", "null"],
            description:
              "The business type exactly as the user described it, in their own words — 'CA', 'chartered accountant', " +
              "'dentist', 'beauty parlour', 'gym'. Do NOT force it into the section list and do NOT translate it. " +
              "This is resolved to a real place type outside the model, so a specific trade belongs here, not in category. " +
              "Null only if the user named no business type at all.",
          },
          minReviews: {
            type: ["number", "null"],
            description:
              "Minimum Google review COUNT the user asked for (e.g. '100+ reviews' -> 100). Review counts are unbounded " +
              "integers. If the user says 'rating 100+' they mean reviews, not rating — ratings only run 0-5.",
          },
          minRating: {
            type: ["number", "null"],
            description: "Minimum Google star rating, 0-5 only (e.g. '4 star se upar' -> 4). Null if not asked for.",
          },
          areaText: {
            type: ["string", "null"],
            description:
              "The location the user mentioned, normalized to a real, correctly-spelled place name a geocoder can resolve " +
              "(e.g. 'gurgrm'/'ggn'/'grgn' -> 'Gurugram', 'blr' -> 'Bangalore') — fix obvious typos/abbreviations/short forms " +
              "using your own knowledge of real places, don't pass them through as-is. Keep specific sub-areas when given " +
              "(e.g. 'Sector 56, Gurugram'). Null if no location was given at all.",
          },
          noWebsiteOnly: {
            type: "boolean",
            description: "True only if the user specifically asked for businesses without a website.",
          },
          missingField: {
            type: ["string", "null"],
            enum: ["category", "location", "count", null],
            description: "Set only when action is needs_clarification — which single thing is missing.",
          },
          reply: {
            type: "string",
            description:
              "Your own short, natural reply shown directly to the user — never a repetition or paraphrase of their message, and avoid " +
              "opening with 'I am'/'I'm' (a separate loading indicator already shows while a search runs, so don't narrate starting one). " +
              "Match the language/tone they wrote in (e.g. reply in Hindi/Hinglish if they wrote in Hindi/Hinglish).",
          },
          nextActions: {
            type: "array",
            items: { type: "string" },
            description:
              "0-3 short (under 8 words) suggested next steps the user could take from here, phrased as actions " +
              "(e.g. 'Search a nearby area too', 'Only show ones with no website'). Empty array if nothing useful to suggest.",
          },
        },
        required: [
          "action", "category", "categoryText", "areaText", "noWebsiteOnly",
          "minReviews", "minRating", "missingField", "reply", "nextActions",
        ],
      },
    },
  },
};

const SYSTEM_PROMPT = `You are Mantis, a lead-finding assistant for a web development agency. You help the user find local businesses that have no website — that is the signal the product actually measures. Do not offer to find "weak", "outdated" or "slow" websites; that data does not exist.

You do not run searches yourself — you only classify the user's message and extract structured parameters via the ${TOOL_NAME} tool. Always call that tool, never reply in plain text.

Carry details forward. Anything the user has already told you in this conversation — the trade, the place, a review or rating threshold — stays true until they change it. Never ask again for something they have already said, in this message or an earlier one.

Put a specific trade in categoryText using the user's own words ("CA", "dentist", "parlour"); it is resolved to a real category outside the model. Use the category enum only for genuinely broad asks. Set missingField only when something is genuinely absent from the whole conversation.

If the user gives a threshold that cannot be a rating (ratings are 0-5), read it as a review count and put it in minReviews. Say so in your reply rather than asking them to repeat it.`;

export async function runChatIntent(input: {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<ChatIntent> {
  const messages = [
    ...input.history.map((h) => ({ role: h.role, content: [{ text: h.content }] })),
    { role: "user" as const, content: [{ text: input.message }] },
  ];

  let response;
  try {
    response = await bedrock.send(
      new ConverseCommand({
        modelId: CHAT_MODEL_ID,
        system: [{ text: SYSTEM_PROMPT }],
        messages,
        toolConfig: {
          tools: [INTENT_TOOL],
          toolChoice: { tool: { name: TOOL_NAME } },
        },
        inferenceConfig: { maxTokens: 500 },
      })
    );
  } catch (err) {
    await recordApiFailure("bedrock", (err as Error).message, { model: CHAT_MODEL_ID });
    throw new BedrockUnavailableError("Bedrock request failed");
  }

  const toolUse = response.output?.message?.content?.find((c) => "toolUse" in c)?.toolUse;
  const raw = (toolUse?.input ?? {}) as Partial<ChatIntent>;

  // The model's output is untrusted input — every field gets re-validated here, not just typed.
  const category = typeof raw.category === "string" && SECTION_NAMES.includes(raw.category) ? raw.category : null;
  const action: ChatIntent["action"] =
    raw.action === "search_leads" || raw.action === "answer_from_existing" || raw.action === "needs_clarification"
      ? raw.action
      : "needs_clarification";
  const missingField: ChatIntent["missingField"] =
    raw.missingField === "category" || raw.missingField === "location" || raw.missingField === "count" ? raw.missingField : null;

  // "rating 100+" is not a rating. Rather than bouncing it back as a clarification — which is what
  // the old schema did, forever — read an out-of-range rating as the review count it must have been.
  let minRating = typeof raw.minRating === "number" && Number.isFinite(raw.minRating) ? raw.minRating : null;
  let minReviews = typeof raw.minReviews === "number" && Number.isFinite(raw.minReviews) ? raw.minReviews : null;
  if (minRating !== null && minRating > 5) {
    if (minReviews === null) minReviews = Math.round(minRating);
    minRating = null;
  }
  if (minRating !== null) minRating = Math.max(0, Math.min(5, minRating));
  if (minReviews !== null) minReviews = Math.max(0, Math.round(minReviews));

  const nextActions = Array.isArray(raw.nextActions)
    ? raw.nextActions.filter((a): a is string => typeof a === "string" && a.trim().length > 0).slice(0, 3)
    : [];

  return {
    action,
    category,
    categoryText: typeof raw.categoryText === "string" && raw.categoryText.trim() ? raw.categoryText.trim() : null,
    areaText: typeof raw.areaText === "string" && raw.areaText.trim() ? raw.areaText.trim() : null,
    noWebsiteOnly: raw.noWebsiteOnly === true,
    minReviews,
    minRating,
    missingField,
    reply: typeof raw.reply === "string" && raw.reply.trim() ? raw.reply.trim() : "Let me look into that.",
    nextActions,
  };
}
