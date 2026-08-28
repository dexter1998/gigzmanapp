import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { bedrock, CHAT_MODEL_ID } from "@/lib/bedrock";
import { SECTION_NAMES } from "@/lib/categories";

export type ChatIntent = {
  action: "search_leads" | "answer_from_existing" | "needs_clarification";
  category: string | null;
  areaText: string | null;
  noWebsiteOnly: boolean;
  missingField: "category" | "location" | "count" | null;
  reply: string;
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
            description: "The business category section to search, or null if not applicable/unknown.",
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
              "Your own short, natural first-person reply shown directly to the user — never a repetition or paraphrase of their message. " +
              "Match the language/tone they wrote in (e.g. reply in Hindi/Hinglish if they wrote in Hindi/Hinglish).",
          },
        },
        required: ["action", "category", "areaText", "noWebsiteOnly", "missingField", "reply"],
      },
    },
  },
};

const SYSTEM_PROMPT = `You are Mantis, a lead-finding assistant for a web development agency. You help the user find local businesses that are good prospects for website/digital services — mainly businesses with no website or a weak one.

You do not run searches yourself — you only classify the user's message and extract structured parameters via the ${TOOL_NAME} tool. Always call that tool, never reply in plain text.

Only ever select a category from the fixed list you're given (via the tool's enum) — never invent one. If the user's message doesn't map cleanly to a real category or doesn't give you a location, set action to "needs_clarification" and missingField to what's missing rather than guessing.`;

export async function runChatIntent(input: {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<ChatIntent> {
  const messages = [
    ...input.history.map((h) => ({ role: h.role, content: [{ text: h.content }] })),
    { role: "user" as const, content: [{ text: input.message }] },
  ];

  const response = await bedrock.send(
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

  return {
    action,
    category,
    areaText: typeof raw.areaText === "string" && raw.areaText.trim() ? raw.areaText.trim() : null,
    noWebsiteOnly: raw.noWebsiteOnly === true,
    missingField,
    reply: typeof raw.reply === "string" && raw.reply.trim() ? raw.reply.trim() : "Let me look into that.",
  };
}
