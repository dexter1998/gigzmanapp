/**
 * Who a campaign speaks for: company, offer and caller name, confirmed in the Campaign Planner
 * before Approve (v2_campaigns.sender_profile). The AI voice agent and the planner's copy use it.
 */
import { sql } from "@/lib/db";
import { chatProfile } from "../business-profiles";

export type SenderProfile = { company: string; offer: string; summary: string; callerName: string; companySpoken?: string } & Partial<CampaignPlaybook>;
/** The campaign's own playbook (Tarun, 2026-11-03): what is sold, the opening hook, how to pitch it,
 *  answers to objections, the language to start in. The planner writes every touch from it and the
 *  AI caller gets it on every call. All optional. */
export type CampaignPlaybook = { hook: string; pitch: string; objections: string; language: string };

type Prof = { company?: string; summary?: string; services?: string[]; primaryService?: string };

/** The business the list's chat chose ("Which business are these leads for?"), else the default's mirror. */
async function profileFor(email: string, mirror: unknown, chatId: string | null | undefined): Promise<{ prof: Prof; chosen: boolean }> {
  const b = chatId ? await chatProfile(email, chatId).catch(() => null) : null;
  return b
    ? { prof: { company: b.name, summary: b.summary, services: b.services, primaryService: b.primaryService ?? undefined }, chosen: true }
    : { prof: (mirror ?? {}) as Prof, chosen: false };
}

/** What the user said they sell in the campaign's own chat (the run plan's `service`). */
export async function chatServiceFor(campaignId: string): Promise<string | null> {
  const [r] = await sql`
    SELECT r.plan->>'service' AS service FROM v2_campaigns c JOIN v2_runs r ON r.chat_id = c.list_chat_id
    WHERE c.id = ${campaignId} AND coalesce(r.plan->>'service', '') <> '' ORDER BY r.created_at DESC LIMIT 1`;
  return r?.service ? String(r.service).trim().slice(0, 160) : null;
}

const STOP = new Set(["my", "our", "the", "and", "for", "business", "businesses", "services", "service", "agency", "company", "work", "solutions"]);
/** Does the saved seller profile sell this? "SEO" against an investment-banking profile is a no. */
function profileSells(service: string, prof: Prof) {
  const hay = [prof.company, prof.summary, prof.primaryService, ...(prof.services ?? [])].join(" ").toLowerCase();
  const words = service.toLowerCase().split(/[^a-z0-9&]+/).filter((w) => w.length >= 3 && !STOP.has(w));
  return words.length > 0 && words.some((w) => hay.includes(w));
}

/**
 * The "sending as" suggestion. The business the list's chat chose (Business profiles) is who the
 * campaign speaks for. Without one, the chat's own ask wins: a user with a fundraising profile who
 * asks "leads for my SEO business" sells SEO in that campaign — the default profile's company is
 * only proposed when it sells that; otherwise the company is left for the user to confirm.
 */
export async function proposedProfileFor(email: string, campaignId?: string): Promise<SenderProfile> {
  const [p] = await sql`SELECT name, v2_profile FROM user_profiles WHERE email = ${email}`;
  const [c] = campaignId ? await sql`SELECT list_chat_id FROM v2_campaigns WHERE id = ${campaignId} AND user_email = ${email}` : [];
  const { prof, chosen } = await profileFor(email, p?.v2_profile, c?.list_chat_id as string | null | undefined);
  const first = p?.name ? String(p.name).split(/\s+/)[0] : "";
  const service = campaignId ? await chatServiceFor(campaignId) : null;
  if (service && !chosen && !profileSells(service, prof)) return { company: "", offer: service, summary: "", callerName: first };
  return {
    company: prof.company || "", offer: service || prof.primaryService || prof.services?.[0] || "",
    summary: (prof.summary || "").slice(0, 400), callerName: first,
  };
}

export function cleanSenderProfile(v: unknown): SenderProfile | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const str = (x: unknown, n: number) => (typeof x === "string" ? x.trim().slice(0, n) : "");
  const p: SenderProfile = { company: str(o.company, 120), offer: str(o.offer, 160), summary: str(o.summary, 400), callerName: str(o.callerName, 60) };
  // How the AI caller says the company: voice read "Gigzman" in Latin letters as "Gegsman" mid-
  // sentence and no one caught the name (prod 2026-11-04); "गिग्ज़मैन" is read cleanly.
  const spoken = str(o.companySpoken, 80); if (spoken) p.companySpoken = spoken;
  // Room for a real script (a 3-part Gigzman playbook is ~9,000 characters); 400/800 cut the hook
  // mid-sentence and dropped every objection (prod 2026-11-04).
  for (const [k, n] of [["hook", 4000], ["pitch", 6000], ["objections", 6000], ["language", 40]] as const) { const v = str(o[k], n); if (v) p[k] = v; }
  return p.company && p.offer ? p : null;
}

/** What a prefilled mail / WhatsApp from the leads table says the user sells (contract: `pitch`). The
 *  list's own chat names the offer when it said one; null when there is neither company nor offer. */
export async function pitchFor(email: string, chatId?: string | null): Promise<{ senderName: string; company: string; offer: string } | null> {
  const [p] = await sql`SELECT name, v2_profile FROM user_profiles WHERE email = ${email}`;
  const { prof, chosen } = await profileFor(email, p?.v2_profile, chatId);
  const [r] = chatId
    ? await sql`SELECT plan->>'service' AS service FROM v2_runs WHERE chat_id = ${chatId} AND user_email = ${email} AND coalesce(plan->>'service', '') <> '' ORDER BY created_at DESC LIMIT 1`
    : [];
  const service = r?.service ? String(r.service).trim().slice(0, 160) : null;
  const sells = chosen || !service || profileSells(service, prof);
  const out = {
    senderName: p?.name ? String(p.name).split(/\s+/)[0] : "",
    company: sells ? (prof.company || "").trim() : "",
    offer: (service || prof.primaryService || prof.services?.[0] || "").trim(),
  };
  return out.company || out.offer ? out : null;
}

/** The playbook as one block of plain lines, for prompts and the caller's brief. Empty when none. */
export function playbookText(sp: SenderProfile | null | undefined): string {
  if (!sp) return "";
  return [sp.hook && `Opening hook: ${sp.hook}`, sp.pitch && `How to pitch: ${sp.pitch}`, sp.objections && `Objections: ${sp.objections}`, sp.language && `Start the call in: ${sp.language}`]
    .filter(Boolean).join(" / ");
}
