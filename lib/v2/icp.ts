/**
 * The ICP agent (pitch deck step 02): for a business and the offering its leads are for, the kinds of
 * business that buy it. Runs only when the saved profile has no buyers yet, so a Client context card
 * never shows an empty "Ideal customers" box; the answer is saved on the profile for next time.
 */
import { callTool, MODELS } from "./claude";
import { updateProfile, type BusinessProfile } from "./business-profiles";

const TOOL = {
  name: "ideal_customers",
  description: "The business types that buy this offering.",
  input_schema: {
    type: "object",
    properties: {
      buyers: { type: "array", items: { type: "string" }, description: "4-8 kinds of business that pay for this offering, as a search would name them ('restaurants', 'SaaS startups', 'hospitals'). Businesses only — never consumers." },
    },
    required: ["buyers"],
  },
};

export async function inferIcp(email: string, b: BusinessProfile): Promise<BusinessProfile> {
  if (b.targetTrades.length || (!b.services.length && !b.summary)) return b;
  const out = await callTool({
    agent: "icp", model: MODELS.cheap, maxTokens: 300,
    system: "You define the ideal customer profile of a B2B seller: which kinds of business buy what it sells. Be specific and realistic; prefer types a map or company search can find.",
    messages: [{ role: "user", content: `Business: ${b.name}\nWhat it does: ${b.summary}\nOfferings: ${b.services.join("; ")}` }],
    tool: TOOL,
  }).catch(() => null);
  const buyers = Array.isArray(out?.buyers) ? (out!.buyers as unknown[]).filter((x): x is string => typeof x === "string" && x.trim().length > 1).map((x) => x.trim().slice(0, 60)).slice(0, 8) : [];
  if (!buyers.length) return b;
  return (await updateProfile(email, b.id, { targetTrades: buyers }).catch(() => null)) ?? { ...b, targetTrades: buyers };
}
