/**
 * Minimal Claude API client for the V2 agents. Plain fetch on purpose — one endpoint, two call
 * shapes, no SDK dependency to keep current.
 *
 * Models are per agent tier (docs/v2-agents.md §3): the router is a cheap classifier, the answer
 * path is where "handles things like Claude" actually lives. Both are env-overridable so the eval
 * set (§9) can pick them.
 */

import { BedrockRuntimeClient, ConverseCommand, type ContentBlock, type Message as BedrockMessage, type Tool } from "@aws-sdk/client-bedrock-runtime";
import { recordApiFailure } from "@/lib/api-alerts";

/**
 * Model ids: a `claude-…` id goes to the Anthropic API, anything else to AWS Bedrock (Converse).
 * Since 2026-10-26 both tiers run on Bedrock — the Anthropic account ran out of credit, and Claude on
 * Bedrock is blocked on this AWS account (Marketplace: no valid payment instrument / "not available").
 * Kimi K3 was the strongest model the account can call that returns correct forced tool calls
 * (probe 2026-10-26: GPT-5.5/6.x, Grok, GLM "not available"; DeepSeek V3.2 dropped a stated signal).
 * Switching back to Claude is an env change: V2_MODEL_BEST / V2_MODEL_CHEAP = a claude-… id.
 */
export const MODELS = {
  cheap: process.env.V2_MODEL_CHEAP || "global.moonshotai.kimi-k3",
  best: process.env.V2_MODEL_BEST || "global.moonshotai.kimi-k3",
} as const;

/** Tried in order when the chosen model is throttled or unavailable. */
const MODEL_FALLBACKS = (process.env.V2_MODEL_FALLBACKS || "in.moonshotai.kimi-k3,apac.amazon.nova-pro-v1:0").split(",").map((m) => m.trim()).filter(Boolean);

const bedrock = new BedrockRuntimeClient({ region: process.env.V2_BEDROCK_REGION || "ap-south-1" });

/** Callers catch this one specifically to show the maintenance banner instead of a 500. */
export class AgentUnavailableError extends Error {}

export type Msg = { role: "user" | "assistant"; content: string };

type ToolDef = { name: string; description: string; input_schema: Record<string, unknown> };

async function post(body: Record<string, unknown>, agent: string): Promise<{ content: Array<Record<string, unknown>> }> {
  return String(body.model).startsWith("claude-") ? postAnthropic(body, agent) : postBedrock(body, agent);
}

async function postAnthropic(body: Record<string, unknown>, agent: string): Promise<{ content: Array<Record<string, unknown>> }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AgentUnavailableError("AI service key is not set");
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });
  } catch (err) {
    await recordApiFailure("anthropic", (err as Error).message, { agent, model: body.model });
    throw new AgentUnavailableError("AI service unreachable");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    await recordApiFailure("anthropic", `${res.status} ${text.slice(0, 300)}`, { agent, model: body.model });
    throw new AgentUnavailableError(`AI service ${res.status}`);
  }
  return res.json();
}

/**
 * The same Messages-API body, sent through Bedrock Converse, and the answer mapped back to
 * Messages-API content blocks — so callTool / callAgent and every agent above them are unchanged.
 */
async function postBedrock(body: Record<string, unknown>, agent: string): Promise<{ content: Array<Record<string, unknown>> }> {
  type In = { role: "user" | "assistant"; content: string | Array<Record<string, unknown>> };
  const toBlocks = (c: In["content"]): ContentBlock[] => typeof c === "string"
    ? [{ text: c || " " }]
    : c.map((b): ContentBlock | null => {
        if (b.type === "text") return b.text ? { text: String(b.text) } : null;
        if (b.type === "tool_use") return { toolUse: { toolUseId: String(b.id), name: String(b.name), input: (b.input ?? {}) as never } };
        if (b.type === "tool_result") return { toolResult: { toolUseId: String(b.tool_use_id), content: [{ text: typeof b.content === "string" ? b.content || " " : JSON.stringify(b.content) }] } };
        return null;
      }).filter((x): x is ContentBlock => x !== null);
  const messages: BedrockMessage[] = (body.messages as In[]).map((m) => ({ role: m.role, content: toBlocks(m.content) }));
  const tools = (body.tools as Array<{ name: string; description: string; input_schema: Record<string, unknown> }> | undefined) ?? [];
  const choice = body.tool_choice as { type: string; name?: string } | undefined;
  const input = {
    system: body.system ? [{ text: String(body.system) }] : undefined,
    messages,
    inferenceConfig: { maxTokens: Number(body.max_tokens ?? 1000) },
    toolConfig: tools.length ? {
      tools: tools.map((t): Tool => ({ toolSpec: { name: t.name, description: t.description, inputSchema: { json: t.input_schema as never } } })),
      toolChoice: choice?.type === "tool" && choice.name ? { tool: { name: choice.name } } : { auto: {} },
    } : undefined,
  };
  // Throttling is the common failure on this account (prod alerts 29 Oct; a local replay hit it 3× in a
  // row and every turn became "I can't reach my language model"). Back off and retry, then move to the
  // regional Kimi profile (its own quota) and Nova Pro before giving up.
  const chain = [String(body.model), ...MODEL_FALLBACKS.filter((m) => m !== String(body.model))];
  let out;
  let lastErr: Error | null = null;
  const failures: string[] = [];
  outer: for (const modelId of chain) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        out = await bedrock.send(new ConverseCommand({ ...input, modelId }), { abortSignal: AbortSignal.timeout(60_000) });
        break outer;
      } catch (err) {
        lastErr = err as Error;
        const name = lastErr.name ?? "";
        failures.push(`${modelId}: ${name}`);
        // ModelErrorException ("invalid sequence as part of ToolUse") is Kimi garbling one sample, not a
        // bad request: the same call succeeds on a re-roll (prod 6 Nov: ~20 of these became "I couldn't
        // put an answer together"). Throttling-style errors are retried the same way.
        const transient = /Throttling|TooManyRequests|ServiceUnavailable|ModelNotReady|InternalServer|ModelTimeout|ModelError/i.test(name);
        if (!transient) break; // a bad request won't get better on a retry; try the next model
        if (attempt < 2) await new Promise((r) => setTimeout(r, 800 * 2 ** attempt + Math.random() * 400));
      }
    }
  }
  if (!out) {
    await recordApiFailure("anthropic", `bedrock ${lastErr?.name}: ${(lastErr?.message ?? "").slice(0, 260)}`, { agent, model: body.model, tried: chain, failures });
    throw new AgentUnavailableError("AI service unreachable");
  }
  const content = (out.output?.message?.content ?? []).map((b): Record<string, unknown> | null => {
    if (b.text) return { type: "text", text: b.text };
    if (b.toolUse) return { type: "tool_use", id: b.toolUse.toolUseId, name: b.toolUse.name, input: b.toolUse.input ?? {} };
    return null; // reasoning blocks are the model's scratchpad, not part of the answer
  }).filter((x): x is Record<string, unknown> => x !== null);
  return { content };
}

/** The API needs a user turn first; consecutive same-role turns are merged. */
export function normalize(history: Msg[], latest: string): Msg[] {
  const out: Msg[] = [];
  for (const h of history) {
    if (!out.length && h.role === "assistant") continue;
    const last = out[out.length - 1];
    if (last && last.role === h.role) last.content = `${last.content}\n${h.content}`;
    else out.push({ ...h });
  }
  if (out.length && out[out.length - 1].role === "user") out[out.length - 1].content += `\n${latest}`;
  else out.push({ role: "user", content: latest });
  return out;
}

/**
 * One tool call; returns the tool input (untrusted — the caller validates it).
 *
 * `force: false` is for models that reject a forced tool_choice (Sonnet 5.5 does): the tool is
 * offered with "auto", and a plain-text answer comes back as `{ text }` instead.
 */
export async function callTool(opts: {
  agent: string; model: string; system: string; messages: Msg[]; tool: ToolDef; maxTokens?: number; force?: boolean;
}): Promise<Record<string, unknown>> {
  const force = opts.force ?? true;
  const data = await post(
    {
      model: opts.model,
      max_tokens: opts.maxTokens ?? 600,
      system: force ? opts.system : `${opts.system}\n\nAlways respond by calling the ${opts.tool.name} tool.`,
      messages: opts.messages,
      tools: [opts.tool],
      tool_choice: force ? { type: "tool", name: opts.tool.name } : { type: "auto" },
    },
    opts.agent
  );
  const block = data.content.find((c) => c.type === "tool_use");
  if (block) return unstringify((block.input ?? {}) as Record<string, unknown>, opts.tool);
  const text = data.content.filter((c) => c.type === "text").map((c) => c.text as string).join("\n").trim();
  return text ? { text } : {};
}

/**
 * Kimi now and then sends an array or object argument as a JSON STRING ("touches": "[{…}]") —
 * the campaign planner then saw no touches and showed its reply as an error (1 run in 4 locally,
 * 2026-11-02). Where the schema says array/object and a string came, parse it.
 */
function unstringify(input: Record<string, unknown>, tool: ToolDef): Record<string, unknown> {
  const props = ((tool.input_schema as { properties?: Record<string, { type?: string | string[] }> }).properties) ?? {};
  const out = { ...input };
  for (const [k, v] of Object.entries(out)) {
    const t = props[k]?.type; const types = Array.isArray(t) ? t : t ? [t] : [];
    if (typeof v !== "string" || !types.some((x) => x === "array" || x === "object") || !/^\s*[[{]/.test(v)) continue;
    try { out[k] = JSON.parse(v); } catch {
      // A raw newline inside a string value is the usual breakage; as a space it parses.
      const flat = v.replace(/[\u0000-\u001f]+/g, " ");
      try { out[k] = JSON.parse(flat); } catch {
        // A run of whitespace until max_tokens cut the array short (seen 2026-11-02): keep every
        // item that was finished.
        // The salvaged list is marked: the cut usually lands after touch 1 or 2 of 4, and a caller
        // that took it as the whole answer saved a short sequence (6 of 13 prod campaigns, 2026-11-06).
        const end = flat.lastIndexOf("}");
        try { if (flat.trimStart().startsWith("[") && end > 0) { out[k] = JSON.parse(`${flat.slice(0, end + 1)}]`); out.__salvaged = true; } } catch { /* the caller's own checks reject it */ }
      }
    }
  }
  return out;
}

type Block = Record<string, unknown>;
type AgentMsg = { role: "user" | "assistant"; content: string | Block[] };

/**
 * A small agent loop: the model may call look-up tools (each answered by a handler) before it
 * calls the `final` tool, whose input is returned. This is what lets the Planner check the data
 * before committing to a plan, instead of choosing blind in one shot. Bounded by `maxRounds`; on
 * the last round only the final tool is offered.
 */
export async function callAgent(opts: {
  agent: string; model: string; system: string; messages: Msg[]; final: ToolDef; tools: ToolDef[];
  handlers: Record<string, (input: Record<string, unknown>) => Promise<string>>; maxRounds?: number; maxTokens?: number;
}): Promise<{ input: Record<string, unknown>; trace: Array<{ tool: string; input: Record<string, unknown>; output: string }>; thought: string }> {
  const msgs: AgentMsg[] = opts.messages.map((m) => ({ ...m }));
  const trace: Array<{ tool: string; input: Record<string, unknown>; output: string }> = [];
  const thoughts: string[] = [];
  const rounds = opts.maxRounds ?? 4;
  for (let round = 0; round < rounds; round++) {
    const last = round === rounds - 1;
    const data = await post({
      model: opts.model, max_tokens: opts.maxTokens ?? 1500,
      system: `${opts.system}\n\nFinish by calling the ${opts.final.name} tool.`,
      messages: msgs, tools: last ? [opts.final] : [...opts.tools, opts.final], tool_choice: { type: "auto" },
    }, opts.agent);
    const text = data.content.filter((c) => c.type === "text").map((c) => c.text as string).join("\n").trim();
    if (text) thoughts.push(text);
    const uses = data.content.filter((c) => c.type === "tool_use");
    const fin = uses.find((u) => u.name === opts.final.name);
    if (fin) return { input: unstringify((fin.input ?? {}) as Record<string, unknown>, opts.final), trace, thought: thoughts.join("\n") };
    msgs.push({ role: "assistant", content: data.content });
    if (!uses.length) { msgs.push({ role: "user", content: `Now call ${opts.final.name}.` }); continue; }
    const results: Block[] = [];
    for (const u of uses) {
      const h = opts.handlers[u.name as string];
      const input = (u.input ?? {}) as Record<string, unknown>;
      const output = h ? await h(input).catch((e) => `error: ${String(e).slice(0, 200)}`) : "unknown tool";
      trace.push({ tool: u.name as string, input, output: output.slice(0, 600) });
      results.push({ type: "tool_result", tool_use_id: u.id, content: output.slice(0, 12000) });
    }
    msgs.push({ role: "user", content: results });
  }
  return { input: {}, trace, thought: thoughts.join("\n") };
}
