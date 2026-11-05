/**
 * Everything the AI caller should know before it dials: who it calls for (the campaign's
 * "sending as"), why (the touch's skill and the strongest signal on this lead), who picks up
 * (person, business, area, trade) and how we got the number. Built as the hosted agents' input
 * variables — names fixed by docs/voice-agent-contract.md; every value short (under 300 chars).
 */

import { sql } from "@/lib/db";
import { formatCategory } from "@/lib/categories";
import { SIGNALS, consistentSignals, type SignalId } from "../playbooks";
import { cleanSenderProfile, playbookText, proposedProfileFor } from "./sender-profile";
import { VOICE_SKILL_PLAYBOOK, isVoiceSkill, istCalendar } from "./voiceShared";
import { cleanVars } from "./hosted-voice";

export const AGENT_NAME = "Neha";

/**
 * How every campaign call speaks, whatever the skill — sent at the head of `call_playbook`. The
 * campaign's playbook says WHAT to say; these say HOW. The opener, energy, objection and close
 * rules follow what books meetings on cold calls: say who and why in the first breath and ask
 * leave to explain, rather than "do you have two minutes?" (answered "नहीं" on prod 2026-11-04);
 * react like a person; offer two concrete times; recap and get a yes so the meeting is kept.
 */
export const CALL_STYLE = [
  "FIRST, ask for their business by name: 'Hello ji, kya meri baat business_name se ho rahi hai?' — say business_name in Devanagari, initials letter by letter (SSK → एस एस के). If business_name is empty, ask for the business_category owner instead.",
  "OPENER: once they confirm, in one turn say your name and caller_company as its own short phrase (main agent_name bol rahi hoon, caller_company se.), what caller_company does in a few words, and why you called this business; then ask leave: 'bas 30 second mein bata doon kyun call kiya, phir aap decide kijiye?' Never open with 'kya aapke paas do minute hain' or 'kya yeh sahi time hai' — it invites a no.",
  "Say caller_company slowly and clearly every time, and again when you name who will follow up, so they remember who called.",
  "Introduce yourself as agent_name from caller_company; never call yourself an AI assistant or a bot, but if asked directly whether this is an automated call, say yes honestly.",
  "ENERGY: sound warm, upbeat and genuinely interested in their business, never read-out. React to what they just said with a short real reaction (arre waah!, bahut badhiya!, achha ji, samajh gayi) before your next line, a different one each time; use '!' where you would smile. At most two short sentences per turn, then one question, then listen.",
  "Address the person only as 'aap' with respectful plural verbs (aap sun pa rahe hain, aap kar rahe hain, aapne bataya) — never 'tum', never feminine or masculine singular forms like 'kar rahi ho' / 'kar rahe ho'.",
  "OBJECTIONS: the first no — 'interested nahi hoon', 'zaroorat nahi', 'abhi nahi' — is never the end: agree with it in their own words first, answer in one line, then ask once for the small next step. Only after a second clear no, thank them warmly and end — never pitch a third time.",
  "SHORT LINES: every sentence under 15 words. If the playbook's hook is long, say it as two short turns and let them answer in between; never run two questions together.",
  "MACHINES: a recorded voice — 'the person you are trying to reach is not available', 'switched off', 'leave a message after the tone', a phone's call-screening assistant — is not a person: say nothing to it and end the call. Never change language because of it.",
  "NOT THE OWNER: if whoever answers is staff or family, not the owner, ask the owner's name and when they are free, thank them and end — that is a callback, never a wrong number.",
  "NAMES: say Indian names as they are said in Hindi (Tomar → तोमर, Verma → वर्मा, Chauhan → चौहान), and say only the business's short name, never an address or area tail.",
  "If they are busy: no pitch; get one exact callback day and time and end within 20 seconds.",
  "If they ask about anything else — another service, staff, a different product — never say no: say the team can cover it in detail on a one-to-one call, and offer that call.",
  "Never promise to send samples, invites, messages or quotes yourself and never say something was sent; say followup_with will show and share everything on the call. If they ask for WhatsApp, say followup_with will share it on WhatsApp on this number, and still ask for a short call time.",
  "CLOSE: offer two concrete options (kal subah 11 baje ya shaam 5 baje?), never an open 'kab free hain'. Once they pick, repeat the day and time with AM/PM, who will call (followup_with) and what they will see, ask whose name to ask for, then get a yes: 'toh pakka raha, aap available rahenge na?'",
  "A time like 'dhai baje' or '4 baje' means afternoon in business hours — confirm it back with AM/PM and the day.",
  "You are a woman: your own verbs are feminine (main bol rahi hoon, maine dekha, main samajh gayi) even where a script line says 'bol raha hoon'.",
  "Start in Hindi and keep Hindi in Devanagari, never Roman script; switch to English only when the person themselves speaks English.",
  "MEMORY: you have no memory of any earlier call with this person — never say you spoke before or that you remember something.",
].join(" ");

/** Without a "say it as", the caller writes the name in Devanagari itself, for the same reason. */
const SAY_IN_DEVANAGARI = "Whenever you say caller_company in Hindi, write it in Devanagari letters (Gigzman → गिग्ज़मैन) so it is pronounced clearly.";

/** Who the call is on behalf of: the confirmed "sending as" first, else what this campaign's chat sells. */
export async function senderFor(user: string, campaignId?: string | null) {
  if (campaignId) {
    const [c] = await sql`SELECT sender_profile FROM v2_campaigns WHERE id = ${campaignId} AND user_email = ${user}`;
    const sp = cleanSenderProfile(c?.sender_profile);
    if (sp) return { company: sp.company, spoken: sp.companySpoken || null, offer: sp.offer, summary: sp.summary || sp.offer, callerName: sp.callerName || null, playbook: playbookText(sp) };
  }
  const sp = await proposedProfileFor(user, campaignId ?? undefined);
  const first = sp.callerName || null;
  const offer = sp.offer || "our services";
  return { company: sp.company || (first ? `${first}'s team` : "our team"), spoken: sp.companySpoken || null, offer, summary: sp.summary || `${offer} for businesses like yours`, callerName: first, playbook: "" };
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
    person, business: spokenBusiness(r.name, r.area),
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

// Words that name a trade, not a business: a listing called just "Real Estate" is asked for by trade.
const GENERIC = /^(real|estate|property|properties|realty|realtors?|gst|registration|income|tax|ca|firm|chartered|accountants?|consultants?|consultancy|services?|agency|builders?|and|&|co\.?)$/i;

/**
 * A listing name as said on the phone. Google names carry SEO tails and tags — "Kalsi Associates :
 * Property Dealer in Dwarka mor", "R.K. Gill & Co. (Chartered Accountants) - CA Firm", "H.K.
 * Properties (Regd.)" — and the caller read them out whole. Keeps the name before the tail, drops
 * brackets and legal suffixes, and un-shouts ALL-CAPS words (short ones stay: they are initials).
 * Empty when nothing but trade words is left.
 */
export function spokenBusiness(raw: string | null | undefined, area?: string | null): string {
  let n = (raw ?? "").replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  // "…CONSULTANCY SERVICES PVT.LTD.-Best Realtors/…": a legal suffix ends the name, whatever follows.
  n = n.replace(/(\b(?:pvt\.?\s*ltd|ltd|limited|llp)\.?)\s*[-/–—].*$/i, "$1");
  // "Realtors-South Delhi Real Estate Agent": a joined hyphen also starts a tail when 3+ words follow.
  const cut = n.split(/\s+[|:\-–—]\s*|\s*[|:–—]\s+|-\s+|-(?=[A-Z]\w*(?:\s+\S+){2,})/)[0].trim();
  if (cut.length >= 3) n = cut;
  const [lead, ...rest] = n.split(/\s*,\s*/);
  if (rest.length && lead.split(" ").length >= 2) n = lead;
  n = n.replace(/\b(pvt\.?|private|ltd\.?|limited|llp|regd\.?|inc\.?)(?=\s|$|\.)/gi, " ").replace(/[.\s]+$/, "").replace(/\s+/g, " ").trim();
  // "…Bird Netting Rajouri Delhi", "…Iffco Chowk": an area or city tail is not part of the name.
  n = dropPlaceTail(n, area);
  n = n.replace(/\b[A-Z]{5,}\b/g, (w) => w[0] + w.slice(1).toLowerCase()).replace(/\bAND\b/g, "and").replace(/^[a-z]/, (c) => c.toUpperCase());
  return n.split(" ").every((w) => GENERIC.test(w)) ? "" : n;
}

const CITY_TAIL = /\s+(delhi|new delhi|gurgaon|gurugram|noida|greater noida|faridabad|ghaziabad|mumbai|pune|bangalore|bengaluru|hyderabad|chennai|kolkata|jaipur|ahmedabad|ncr|india)$/i;
const PLACE_WORD = /\s+(chowk|sector\s*\d+[a-z]?|road|marg|nagar|vihar|enclave|phase\s*\d+|extension|market|mor)$/i;

function dropPlaceTail(n: string, area?: string | null): string {
  const words = () => n.split(" ").length;
  for (let i = 0; i < 3 && words() > 2; i++) {
    const before = n;
    n = n.replace(CITY_TAIL, "");
    const a = (area ?? "").replace(/-/g, " ").trim();
    if (a && words() > 2 && n.toLowerCase().endsWith(` ${a.toLowerCase()}`)) n = n.slice(0, -a.length - 1);
    // "…Rajouri" for area "Rajouri Garden": the area's first word alone is a tail too.
    const a1 = a.split(" ")[0];
    if (a1.length > 3 && words() > 3 && n.toLowerCase().endsWith(` ${a1.toLowerCase()}`)) n = n.slice(0, -a1.length - 1);
    // "Iffco Chowk", "Sector 45": the place word and the name before it.
    if (words() > 3 && PLACE_WORD.test(n)) n = n.replace(/\s+\S+\s+(chowk|road|marg|nagar|vihar|enclave|market|mor)$/i, "").replace(/\s+sector\s*\d+[a-z]?$/i, "");
    if (n === before) break;
  }
  return n.trim();
}

/** The caller agent's variables for one campaign touch to one lead. */
export async function callerVariables(user: string, o: { campaignId: string; resultId: number; skill: string; brief: string }): Promise<Record<string, string>> {
  const s = await senderFor(user, o.campaignId);
  const lead = o.resultId ? await leadFacts(o.resultId) : null;
  const skill = VOICE_SKILL_PLAYBOOK[isVoiceSkill(o.skill) ? o.skill : "pitch"];
  // The voice reads Latin letters inside Hindi badly ("Gigzman" came out "Gegsman"): the spoken
  // form goes wherever the name is said.
  const company = s.spoken || s.company;
  const followup = s.callerName ? `${s.callerName} from ${company}` : company;
  // The playbook names other variables; spelled out so the agent never reads a variable name aloud.
  // House rules first, so a cut never drops them (Tarun, 2026-11-03): introduce by name and company,
  // never as an "AI assistant"; "aap" with respectful plural verbs, so no man is addressed as a woman
  // ("kar rahi ho") or the other way round. Asked straight out whether it's a bot, it says yes.
  // Today's date and the coming weekdays: the caller had none, said "Diwali nikal gayi" two days
  // before Dhanteras and put Friday 13 Nov on a Wednesday (prod 2026-11-04).
  const cal = istCalendar();
  const dates = `DATES: today is ${cal.today} (India). Coming days: ${cal.next.join(", ")}.${cal.festivals.length ? ` Upcoming festivals: ${cal.festivals.join(", ")}.` : ""} Take every date and weekday you say from this list, never from memory.`;
  const houseRules = `${dates} ${CALL_STYLE}${s.spoken ? "" : ` ${SAY_IN_DEVANAGARI}`}`.replace(/agent_name/g, AGENT_NAME).replace(/caller_company/g, company).replace(/followup_with/g, followup);
  const playbook = `${houseRules} / ${skill.playbook.replace(/followup_with/g, followup).replace(/caller_company/g, company).replace(/\n/g, " / ")}`;
  const brief = [
    lead?.rating ? `${lead.rating}★${lead.reviews ? `, ${lead.reviews} reviews` : ""}` : null,
    lead ? (lead.website ? `site ${lead.website}` : "no website listed") : null,
    lead && !lead.instagram && lead.website ? "no Instagram on site" : null,
    ...(lead?.signals.slice(0, 3) ?? []),
  ].filter(Boolean).join(", ");
  const touch = o.brief.replace(/\s+/g, " ").trim();
  return {
    ...cleanVars({
    agent_name: AGENT_NAME, caller_company: company, followup_with: followup, offer_name: s.offer, offer_summary: s.summary,
    call_goal: skill.goal,
    lead_name: lead?.person?.name ?? lead?.business ?? "the owner", business_name: lead?.business ?? "your business",
    business_area: lead?.area ?? "", business_category: lead?.category ?? "",
    why_calling: lead?.why ?? `${s.offer} for ${lead?.category ?? "local"} businesses${lead?.area ? ` in ${lead.area}` : ""}`,
    number_source: lead?.numberSource ?? "their public business listing",
    }),
    // Longer than the other variables: the house rules plus the skill, and the touch's own script —
    // a 700-character hook was cut to its first 200 at 300 (prod 2026-11-03). A refusal of the long
    // version is retried shorter (voiceCalls.dispatchVoiceCall).
    ...(s.playbook
      // The campaign has its own playbook: it IS the script. The generic skill steps and the
      // planner's touch message went before it and the agent mixed three scripts, never reaching
      // the hook (prod 2026-11-04). House rules, then the playbook with this lead filled in.
      ? {
          ...cleanVars({ call_goal: "Follow the campaign playbook below and book the call it describes" }),
          ...cleanVars({ call_playbook: `${houseRules} / CAMPAIGN PLAYBOOK — follow it step by step; it replaces any generic call steps: ${fillLead(s.playbook, lead)}` }, 16_000),
          ...cleanVars({ lead_brief: brief }, 1200),
        }
      : {
          // The house rules and dates alone are ~4,200 characters now; less would cut the skill off.
          ...cleanVars({ call_playbook: playbook }, 6000),
          // Facts first, then the touch's own message — cut to fit, facts are never the part cut.
          ...cleanVars({ lead_brief: [brief, touch && `Message: ${touch}`].filter(Boolean).join(". ") }, 1200),
        }),
  };
}

/** A playbook's {name} / {business} / {category} / {area} (single or double braces), for this lead. */
function fillLead(text: string, lead: Awaited<ReturnType<typeof leadFacts>>): string {
  const v: Record<string, string> = {
    name: lead?.person?.name?.split(/\s+/)[0] ?? "sir", business: lead?.business ?? "aapka business",
    category: lead?.category ?? "business", area: lead?.area ?? "aapke area",
  };
  return text.replace(/\{\{?\s*(name|business|category|area)\s*\}?\}/gi, (_, k: string) => v[k.toLowerCase()]);
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
