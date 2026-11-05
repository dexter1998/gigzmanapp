import { callTool, MODELS } from "@/lib/v2/claude";

/**
 * What a lead alert says beyond the raw listing: how much this business might be worth to the
 * person receiving it, and a "Project details" block whose questions fit THEIR service — a web
 * agency sees "Do they have a website?", a CA sees "Do they look GST-registered?".
 *
 * The model writes the questions; the answers may only restate the facts handed to it, and say
 * "Not known yet" otherwise. The value is labelled an estimate wherever it is shown, because it is
 * one: nobody at the business said it.
 */

export type LeadFacts = {
  category: string; area: string; rating: number | null; reviewCount: number | null;
  hasWebsite: boolean | null; hasPhone: boolean; hasEmail: boolean; signals: string[];
};

export type LeadInsight = {
  service: string;
  minInr: number;
  maxInr: number;
  why: string;
  details: Array<[string, string]>;
};

const TOOL = {
  name: "lead_insight",
  description: "What this lead could be worth to the seller, and project-detail questions for the seller's service.",
  input_schema: {
    type: "object",
    properties: {
      min_inr: { type: "integer", description: "Low end of a realistic first-project fee in INR this business could pay the seller." },
      max_inr: { type: "integer", description: "High end of that fee in INR." },
      why: { type: "string", description: "One short sentence (max 22 words) on why this business might buy now, from the facts only." },
      ...Object.fromEntries([1, 2, 3, 4, 5, 6].flatMap((i) => [
        [`q${i}`, { type: "string", description: `Question ${i}, phrased for the seller's service.` }],
        [`a${i}`, { type: "string", description: `Answer ${i}, only from the facts, else "Not known yet, ask when you reach out".` }],
      ])),
    },
    required: ["min_inr", "max_inr", "why", "q1", "a1", "q2", "a2", "q3", "a3", "q4", "a4", "q5", "a5", "q6", "a6"],
  },
};

const SYSTEM = `You prepare a lead card for an Indian B2B seller. Given the seller's service and facts about a local business, return:
- min_inr/max_inr: a realistic fee range for a FIRST project or first 3 months of that service for a business of this size and category in India. Size comes from review count (under 50 small, 50-300 medium, 300+ established).
- why: one plain sentence, only from the facts.
- q1..q6 with a1..a6: six questions phrased for THIS seller's service, each with an answer that ONLY restates a given fact or a direct consequence of it. If the facts don't answer a question, the answer is exactly "Not known yet, ask when you reach out". Never invent budgets, owner names, timelines or intentions.
Plain English, no emoji, no marketing words. Never write internal field names like no_website or signals; say it in words.`;

/** Topics a fact row and a model question can share; one question per topic is enough. */
const TOPICS = [/website|site\b/, /phone|reach|contact/, /rated|rating|review|established/, /kind of business|what type|category/, /where|located|location/];

const round = (n: number) => (n >= 10_000 ? Math.round(n / 1000) * 1000 : Math.round(n / 500) * 500);
export const formatInr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function fallback(service: string, f: LeadFacts): LeadInsight {
  const size = (f.reviewCount ?? 0) >= 300 ? 3 : (f.reviewCount ?? 0) >= 50 ? 2 : 1;
  return {
    service,
    minInr: [8_000, 15_000, 30_000][size - 1],
    maxInr: [20_000, 40_000, 90_000][size - 1],
    why: f.hasWebsite === false
      ? `A ${f.category.toLowerCase()} with ${f.reviewCount ?? 0} Google reviews and no website listed.`
      : `A ${f.category.toLowerCase()} in ${f.area} with ${f.reviewCount ?? 0} Google reviews.`,
    details: [
      ["What kind of business is it?", f.category],
      ["Where is it?", f.area],
      ["How established are they?", f.reviewCount != null ? `${f.rating?.toFixed(1) ?? "?"}★ from ${f.reviewCount} Google reviews` : "No Google reviews yet"],
      ["Do they have a website?", f.hasWebsite === false ? "No website on their Google listing" : f.hasWebsite ? "Yes" : "Not known yet, ask when you reach out"],
      ["Can you reach them directly?", f.hasPhone ? "Yes, a phone number is listed" : "No phone listed"],
      [`What would they need for ${service}?`, "Not known yet, ask when you reach out"],
    ],
  };
}

export async function leadInsight(service: string, f: LeadFacts): Promise<LeadInsight> {
  try {
    const out = await callTool({
      agent: "lead_alert_insight",
      model: MODELS.cheap,
      system: SYSTEM,
      tool: TOOL,
      // Kimi K3 reasons before it answers and that counts against this; at 700 the q/a fields were cut off.
      maxTokens: 3000,
      messages: [{
        role: "user",
        content: `Seller's service: ${service}\nBusiness facts: ${JSON.stringify({
          category: f.category, area: f.area, google_rating: f.rating, google_reviews: f.reviewCount,
          website_on_google_listing: f.hasWebsite, phone_listed: f.hasPhone, email_found: f.hasEmail, signals: f.signals,
        })}`,
      }],
    });
    const min = Number(out.min_inr), max = Number(out.max_inr);
    const details = [1, 2, 3, 4, 5, 6]
      .map((i) => [String(out[`q${i}`] ?? "").trim(), String(out[`a${i}`] ?? "").trim()] as [string, string])
      .filter(([q, a]) => q && a);
    const base = fallback(service, f);
    // A range we wouldn't say out loud (inverted, absurd, or an 8x spread) falls back to the table.
    const priced = min >= 2_000 && max > min && max <= min * 8 && max <= 5_000_000;
    // The model sometimes stops after one or two questions; the fact rows fill the block up to six.
    const asked = details.map(([q]) => q.toLowerCase()).join(" ");
    const covered = (q: string) => TOPICS.some((t) => t.test(q) && t.test(asked));
    const filled = [...details, ...base.details.filter(([q]) => !covered(q.toLowerCase()))].slice(0, 6);
    return {
      service,
      minInr: priced ? round(min) : base.minInr,
      maxInr: priced ? round(max) : base.maxInr,
      why: typeof out.why === "string" && out.why.trim() ? out.why.trim() : base.why,
      details: filled,
    };
  } catch (err) {
    console.warn("[lead-insight] fell back:", (err as Error).message);
    return fallback(service, f);
  }
}
