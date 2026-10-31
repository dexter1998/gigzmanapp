/**
 * Campaign Planner (docs/v2-campaigns.md). Reads the list (who they are, what we noticed, which
 * channels reach them) and the seller's profile, and writes the TOUCHES — channel, wait, copy.
 * Code compiles them into the canvas graph; the model never places nodes or sends anything.
 * Same agent for the first draft and for edits ("make touch 2 shorter"): it gets the current
 * sequence back and returns the whole new one.
 */

import { WHATSAPP_LIVE } from "./channels";
import { sql } from "@/lib/db";
import { callTool, MODELS, type Msg } from "../claude";
import { loadProfile } from "../scout";
import { proposedProfileFor } from "./sender-profile";
import { listLeads } from "../lms";
import { compile, touchesOf, VARIABLES, type Graph, type Touch, type Channel } from "./graph";
import { syncTemplatesFromGraph } from "./templates";
import { VOICE_SKILLS, isVoiceSkill } from "./voice";

const TOOL = {
  name: "design_sequence",
  description: "Write the outreach sequence for this list.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Short campaign name, e.g. 'Dentists Gurugram — website refresh'." },
      touches: {
        type: "array",
        description: "The sequence in order. 3-5 touches for a sequence; exactly 1 for a quick send.",
        items: {
          type: "object",
          properties: {
            channel: { type: "string", enum: ["email", "whatsapp", "call"] },
            skill: { type: ["string", "null"], enum: [...VOICE_SKILLS.map((s) => s.id), null], description: "Call touches only: what the AI voice agent is calling FOR — " + VOICE_SKILLS.map((s) => `${s.id} (${s.desc})`).join("; ") + ". Pick from what the user wants (selling → pitch/sales; resellers → partnership; co-marketing → collaboration; news/offer → announcement; buying from them → purchase)." },
            waitDays: { type: "number", description: "Days to wait after the previous touch. 0 for the first." },
            subject: { type: ["string", "null"], description: "Email only. Under 7 words, lowercase-ish, no clickbait." },
            body: { type: "string", description: "The message. Email: 50-110 words, plain, one ask. WhatsApp: under 60 words. Call: the AI voice agent's BRIEF for this lead (it speaks Hinglish and improvises around it): why we're calling (what we noticed, {{signal}}), the offer in one line, ONE question to ask, short answers to the two likeliest objections, and what to book. Under 120 words, plain sentences, no greetings." },
            goal: { type: "string", description: "What this touch is for, in a few words." },
          },
          required: ["channel", "waitDays", "body"],
        },
      },
      reply: { type: "string", description: "One or two sentences to the user: what you built and why (or what you changed)." },
    },
    required: ["name", "touches", "reply"],
  },
};

export type PlanResult = { graph: Graph; reply: string; name: string };

export async function planCampaign(input: { email: string; campaignId: string; instruction: string | null }): Promise<PlanResult> {
  const [c] = await sql`SELECT * FROM v2_campaigns WHERE id = ${input.campaignId} AND user_email = ${input.email}`;
  if (!c) throw new Error("campaign not found");
  const { leads, lists } = c.list_chat_id ? await listLeads(input.email, c.list_chat_id) : { leads: [], lists: [] };
  const listName = lists.find((l) => l.chatId === c.list_chat_id)?.name ?? "No list yet";
  const withEmail = leads.filter((l) => l.emails.length).length;
  const withPhone = leads.filter((l) => l.phone).length;
  const sigCount = new Map<string, number>();
  for (const l of leads) for (const s of l.signals) sigCount.set(s, (sigCount.get(s) ?? 0) + 1);
  const topSignals = [...sigCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, n]) => `${s} (${n})`);
  const cats = [...new Set(leads.map((l) => l.category).filter(Boolean))].slice(0, 4);
  const profile = await loadProfile(input.email, c.list_chat_id as string | null);
  const proposed = await proposedProfileFor(input.email, c.id as string);
  const chosen = (c.sender_ids as string[] | null) ?? [];
  const senders = await sql`SELECT channel, provider, status FROM v2_senders WHERE user_email = ${input.email} AND status = 'connected'
                            ${chosen.length ? sql`AND id = ANY(${chosen})` : sql``}`;
  const quick = String(c.kind).startsWith("quick_");
  const quickChannel = quick ? (String(c.kind).replace("quick_", "") as Channel) : null;
  const current = (c.graph as Graph).nodes?.length ? touchesOf(c.graph as Graph) : [];
  const history = (await sql`SELECT role, content FROM v2_campaign_messages WHERE campaign_id = ${c.id} ORDER BY id DESC LIMIT 8`).reverse() as unknown as Msg[];

  const system = [
    "You are Mantis's Campaign Planner. You write cold outreach sequences for a small business owner selling to local businesses in India.",
    "Rules: every message is short, specific and honest — reference what we actually noticed about the business (the {{signal}} variable) instead of generic flattery; one clear ask; no fake claims, no fake urgency, no 'I hope this finds you well'. Use only these variables: " + VARIABLES.map((v) => `{{${v.key}}}`).join(", ") + ". {{first_name}} is often unknown — prefer {{business_name}}.",
    "Call touches are made by Mantis's AI voice agent (a natural Hinglish phone agent that books meetings), within 10:00–19:30 IST. It costs the user credits per minute, so use calls where a conversation beats a message — usually not as the very first touch to a cold list unless most leads have no email. Each call touch needs a skill.",
    "Channels: email only reaches leads with an email, call/WhatsApp only those with a phone; every lead gets every touch, and a touch whose channel a lead can't be reached on is skipped for that lead. So: touch 1 uses the channel MORE of the list can be reached on (if fewer than a third have an email, touch 1 is a call). When both are common, open with email and add a call touch so phone-only leads are still reached. WhatsApp is never the first touch to a stranger (Meta policy: no unsolicited first messages without an approved template) — use it as a later touch, after email or a call.",
    ...(WHATSAPP_LIVE ? [] : ["WhatsApp sending is COMING SOON and not available yet: never use the whatsapp channel. If the user asks for WhatsApp, use email or a call instead and say in one short line that WhatsApp is coming soon."]),
    "Never name the AI model, voice, mail or data provider behind Mantis in your reply — it is Mantis's own AI.",
    "Space touches 2-4 days apart. The sequence stops automatically when someone replies, so later touches can assume no reply.",
    quick ? `This is a QUICK SEND: exactly one ${quickChannel} touch, no follow-ups.` : "This is a sequence: 3-5 touches unless the user asks otherwise.",
    `LIST: "${listName}" — ${leads.length} leads; ${withEmail} with email, ${withPhone} with phone. Categories: ${cats.join(", ") || "unknown"}. What we noticed: ${topSignals.join(", ") || "nothing specific"}.`,
    // The campaign's confirmed "sending as" profile is the voice of every touch; the seller profile otherwise.
    c.sender_profile?.company
      ? `SELLER (confirmed for this campaign — write as them): ${c.sender_profile.company} — offer: ${c.sender_profile.offer}. ${c.sender_profile.summary ?? ""}${c.sender_profile.callerName ? ` Sign off as ${c.sender_profile.callerName}.` : ""}`
      // The chat says what is sold here; the saved profile only speaks when it sells that.
      : proposed.offer && !proposed.company ? `SELLER: sells ${proposed.offer} (what the user asked leads for in this chat). Their company name isn't confirmed yet — use {{sender_name}}, never invent a company, and don't pitch anything else.`
      : profile ? `SELLER: ${profile.company ?? ""} — ${profile.summary} Services: ${profile.services.join(", ")}.${proposed.offer ? ` This campaign's offer: ${proposed.offer}.` : ""}` : "SELLER: no profile yet — keep the offer generic (website, local marketing) and say so in the reply.",
    `CONNECTED SENDERS: ${senders.map((s) => `${s.channel}/${s.provider}`).join(", ") || "none yet (the user will connect one before sending)"}.`,
    current.length ? `CURRENT SEQUENCE (edit this, return the whole new one): ${JSON.stringify(current.map(({ channel, waitDays, subject, body }) => ({ channel, waitDays, subject, body })))}` : "",
  ].filter(Boolean).join("\n\n");

  const ask = input.instruction?.trim() || (current.length ? "Improve this sequence." : "Design the sequence for this list.");
  const messages = [...history, { role: "user", content: ask }].filter((m, i) => !(i === 0 && m.role === "assistant")) as Msg[];
  // Sonnet can't be forced to call the tool, and now and then answers in prose instead. One retry
  // with that prose handed back and a plain instruction fixes it; a second miss is a real error.
  let raw = await callTool({ agent: "campaign_planner", model: MODELS.best, system, messages, tool: TOOL, maxTokens: 2200, force: false });
  if (!Array.isArray(raw.touches) || !raw.touches.length) {
    raw = await callTool({
      agent: "campaign_planner", model: MODELS.best, system, tool: TOOL, maxTokens: 2200, force: false,
      messages: [...messages, { role: "assistant", content: typeof raw.text === "string" ? raw.text.slice(0, 2000) : "(no answer)" },
        { role: "user", content: "Now return it by calling design_sequence — every touch with channel, waitDays and body." }],
    });
  }

  const touches: Touch[] = (Array.isArray(raw.touches) ? raw.touches : []).slice(0, quick ? 1 : 6).map((t: Record<string, unknown>, i: number) => ({
    channel: (["email", "whatsapp", "call"].includes(String(t.channel)) ? t.channel : "email") as Channel,
    skill: isVoiceSkill(t.skill) ? t.skill : undefined,
    waitDays: i === 0 ? 0 : Math.max(1, Math.min(14, Math.round(Number(t.waitDays) || 3))),
    subject: typeof t.subject === "string" ? t.subject.slice(0, 120) : undefined,
    body: String(t.body ?? "").slice(0, 4000),
    goal: typeof t.goal === "string" ? t.goal : undefined,
  })).filter((t) => t.body.trim() && (WHATSAPP_LIVE || quickChannel === "whatsapp" || t.channel !== "whatsapp"));
  if (quickChannel && touches[0]) touches[0].channel = quickChannel;
  if (!touches.length) throw new Error(typeof raw.text === "string" ? raw.text.slice(0, 300) : "The planner returned no touches.");

  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 80) : String(c.name);
  // Every touch is saved as a template the node points at — reusable, and edited in one place.
  // An edit keeps the template links of the touches it rewrote (same touch number).
  const prevLinks = new Map(((c.graph as Graph).nodes ?? []).filter((n) => n.data.touch).map((n) => [n.data.touch!, n.data.templateId ?? null]));
  const compiled = compile(touches, { title: listName, listName, count: leads.length, reach: { email: withEmail, phone: withPhone } });
  compiled.nodes = compiled.nodes.map((n) => (n.data.touch && prevLinks.get(n.data.touch) ? { ...n, data: { ...n.data, templateId: prevLinks.get(n.data.touch) } } : n));
  const graph = await syncTemplatesFromGraph(input.email, c.id, current.length ? String(c.name) : name, compiled);
  const reply = typeof raw.reply === "string" ? raw.reply.slice(0, 600) : "Sequence ready.";
  await sql`UPDATE v2_campaigns SET graph = ${sql.json(graph as unknown as Parameters<typeof sql.json>[0])},
            name = CASE WHEN name LIKE 'Untitled%' OR ${!current.length} THEN ${name} ELSE name END, updated_at = now()
            WHERE id = ${c.id}`;
  await sql`INSERT INTO v2_campaign_messages (campaign_id, role, content) VALUES (${c.id}, 'user', ${ask}), (${c.id}, 'assistant', ${reply})`;
  return { graph, reply, name };
}
