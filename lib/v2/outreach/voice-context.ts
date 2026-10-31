/**
 * Everything the AI caller should know before it dials: who it calls for (the campaign's
 * "sending as"), why (the touch's skill and the strongest signal on this lead), who picks up
 * (person, business, area, trade) and how we got the number. Built as the hosted agents' input
 * variables — names fixed by docs/voice-agent-contract.md; every value short (under 300 chars).
 */

import { sql } from "@/lib/db";
import { formatCategory } from "@/lib/categories";
import { SIGNALS, consistentSignals, type SignalId } from "../playbooks";
import { cleanSenderProfile, proposedProfileFor } from "./sender-profile";
import { VOICE_SKILL_PLAYBOOK, isVoiceSkill } from "./voiceShared";
import { cleanVars } from "./hosted-voice";

export const AGENT_NAME = "Chinki";

/** Who the call is on behalf of: the confirmed "sending as" first, else what this campaign's chat sells. */
export async function senderFor(user: string, campaignId?: string | null) {
  if (campaignId) {
    const [c] = await sql`SELECT sender_profile FROM v2_campaigns WHERE id = ${campaignId} AND user_email = ${user}`;
    const sp = cleanSenderProfile(c?.sender_profile);
    if (sp) return { company: sp.company, offer: sp.offer, summary: sp.summary || sp.offer, callerName: sp.callerName || null };
  }
  const sp = await proposedProfileFor(user, campaignId ?? undefined);
  const first = sp.callerName || null;
  const offer = sp.offer || "our services";
  return { company: sp.company || (first ? `${first}'s team` : "our team"), offer, summary: sp.summary || `${offer} for businesses like yours`, callerName: first };
}

// Signals that say something is missing or changing are a reason to call; "established" or
// "has a contact form" only describe the business.
const REASON_FIRST = (k: string) => (/^(funded|raise_due|hiring|exposed_secret|ssl_|site_down|form_no_backend)/.test(k) ? 0 : /^no_|^few_|^low_|weak|old_|outdated|quiet|missing|gbp_|ota_|social_as/.test(k) ? 1 : 2);
const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

type LeadRow = {
  name: string; category: string | null; area: string | null; website: string | null; rating: number | null; review_count: number | null;
  signals: Record<string, unknown> | null; contact: { name?: string; role?: string | null } | null; provenance: Record<string, string> | null;
  socials: Record<string, string> | null; place_id: string | null;
};

/** One lead's facts for the call. Person name: the site's contact, else a matched public profile. */
export async function leadFacts(resultId: number) {
  const [r] = (await sql`
    SELECT r.name, r.category, r.area, r.website, r.rating, r.review_count, r.signals, r.contact, r.provenance, r.socials, l.place_id
    FROM v2_results r LEFT JOIN leads l ON l.id = r.lead_id WHERE r.id = ${resultId}`) as unknown as LeadRow[];
  if (!r) return null;
  let person = r.contact?.name ? { name: r.contact.name, role: r.contact.role ?? null } : null;
  if (!person && r.place_id) {
    const facts = await sql`SELECT field, value FROM v2_facts WHERE entity_key = ${`place:${r.place_id}`} AND field IN ('person_name','person_role') ORDER BY confidence DESC`;
    const name = facts.find((f) => f.field === "person_name")?.value as string | undefined;
    if (name) person = { name, role: (facts.find((f) => f.field === "person_role")?.value as string | undefined) ?? null };
  }
  const sig = (r.signals ?? {}) as Record<string, unknown>;
  const keys = consistentSignals(Object.keys(sig).filter((k) => sig[k] === true && k in SIGNALS)) as SignalId[];
  const notes = (sig.notes ?? {}) as Record<string, unknown>;
  const note = ["why", "offer_match", "funding", "hiring"].map((k) => notes[k]).find((x): x is string => typeof x === "string" && !!x.trim()) ?? null;
  const ranked = [...keys].sort((a, b) => REASON_FIRST(a) - REASON_FIRST(b));
  const prov = r.provenance ?? {};
  return {
    person, business: r.name,
    area: r.area ? r.area.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null,
    category: r.category ? (formatCategory(r.category) ?? r.category).toLowerCase() : null,
    website: r.website ? r.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : null,
    rating: r.rating, reviews: r.review_count,
    // The specific thing noticed: a written note wins, then the strongest signal.
    why: note ?? (ranked[0] ? lc(SIGNALS[ranked[0]].why) : null),
    // The rest, for the brief (the signal already used as the reason is not repeated).
    signals: ranked.slice(note ? 0 : 1).map((k) => SIGNALS[k].label),
    instagram: !!r.socials?.instagram,
    // Honest about where the number came from.
    numberSource: prov.phone_by === "places_listing" ? "their Google Business listing" : prov.site_phone ? "their website" : "their public business listing",
  };
}

/** The caller agent's variables for one campaign touch to one lead. */
export async function callerVariables(user: string, o: { campaignId: string; resultId: number; skill: string; brief: string }): Promise<Record<string, string>> {
  const s = await senderFor(user, o.campaignId);
  const lead = o.resultId ? await leadFacts(o.resultId) : null;
  const skill = VOICE_SKILL_PLAYBOOK[isVoiceSkill(o.skill) ? o.skill : "pitch"];
  const followup = s.callerName ? `${s.callerName} from ${s.company}` : s.company;
  // The playbook names other variables; spelled out so the agent never reads a variable name aloud.
  const playbook = skill.playbook.replace(/followup_with/g, followup).replace(/caller_company/g, s.company).replace(/\n/g, " / ");
  const brief = [
    lead?.rating ? `${lead.rating}★${lead.reviews ? `, ${lead.reviews} reviews` : ""}` : null,
    lead ? (lead.website ? `site ${lead.website}` : "no website listed") : null,
    lead && !lead.instagram && lead.website ? "no Instagram on site" : null,
    ...(lead?.signals.slice(0, 3) ?? []),
  ].filter(Boolean).join(", ");
  const touch = o.brief.replace(/\s+/g, " ").trim();
  return cleanVars({
    agent_name: AGENT_NAME, caller_company: s.company, followup_with: followup, offer_name: s.offer, offer_summary: s.summary,
    call_goal: skill.goal, call_playbook: playbook,
    lead_name: lead?.person?.name ?? lead?.business ?? "the owner", business_name: lead?.business ?? "your business",
    business_area: lead?.area ?? "", business_category: lead?.category ?? "",
    why_calling: lead?.why ?? `${s.offer} for ${lead?.category ?? "local"} businesses${lead?.area ? ` in ${lead.area}` : ""}`,
    number_source: lead?.numberSource ?? "their public business listing",
    // Facts first, then the touch's own message — cut to fit, facts are never the part cut.
    lead_brief: [brief, touch && `Message: ${touch}`].filter(Boolean).join(". "),
  });
}

/** The test agent's variables: the Mantis user hears a test call, with their own pitch in brief. */
export async function testVariables(user: string, o: { name?: string | null; campaignId?: string | null; brief?: string | null }): Promise<Record<string, string>> {
  const [p] = await sql`SELECT name, v2_profile FROM user_profiles WHERE email = ${user}`;
  const s = await senderFor(user, o.campaignId);
  const company = (p?.v2_profile as { company?: string } | null)?.company || s.company;
  const brief = o.brief?.replace(/\s+/g, " ").trim();
  return cleanVars({
    user_name: o.name?.trim() || (p?.name ? String(p.name).split(/\s+/)[0] : "") || "there",
    user_company: company,
    campaign_context: brief ? `Calling as ${s.company} about ${s.offer}. ${brief}` : "",
  });
}
