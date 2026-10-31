/** Voice-channel constants safe for the browser too (no node imports). See voice.ts. */
import { CREDIT_COST } from "@/lib/credits/pricing";

/** What the call is FOR — the voice agent's skills. */
export const VOICE_SKILLS = [
  { id: "pitch", label: "Pitch", desc: "Pitch your offer in under a minute and book a short follow-up." },
  { id: "sales", label: "Sales", desc: "Qualify need, decision maker and timing; book a sales call if they fit." },
  { id: "partnership", label: "Partnership", desc: "Explore a reseller, distributor or referral deal." },
  { id: "collaboration", label: "Collaboration", desc: "Propose a co-promotion, joint offer, event or content together." },
  { id: "announcement", label: "Announcement", desc: "Share news or an offer in 30 seconds, no hard sell." },
  { id: "purchase", label: "Vendor finding", desc: "You are the buyer: learn how to order, prices and terms; book a meeting." },
  { id: "default", label: "Introduce", desc: "Say who you are, answer questions honestly, leave the door open." },
] as const;
export type VoiceSkill = (typeof VOICE_SKILLS)[number]["id"];
export const isVoiceSkill = (s: unknown): s is VoiceSkill => VOICE_SKILLS.some((k) => k.id === s);

/**
 * What each skill tells the hosted caller agent (its `call_goal` and `call_playbook` variables —
 * docs/voice-agent-contract.md). Short on purpose: the agent's own prompt carries the manners.
 */
export const VOICE_SKILL_PLAYBOOK: Record<VoiceSkill, { goal: string; playbook: string }> = {
  pitch: {
    goal: "Book a 15-minute follow-up call",
    playbook: "Say who you are and why you called this business in one breath.\nGive the offer in two lines, tied to why_calling.\nAsk one question about their current setup.\nIf curious, offer a 15-minute call with followup_with and fix a day and time.",
  },
  sales: {
    goal: "Qualify the lead and book a sales call if they fit",
    playbook: "Confirm you are speaking to the person who decides on this.\nAsk about the need, current solution and timing.\nIf there is a real need in the next 3 months, book a call with followup_with.\nIf not, ask when it is better to call back.",
  },
  partnership: {
    goal: "Open a reseller, distributor or referral partnership talk",
    playbook: "Explain the partnership in one line: what each side gets.\nAsk if they already work with similar partners.\nIf open, book a call with followup_with to discuss terms.",
  },
  collaboration: {
    goal: "Propose a joint promotion, event or content together",
    playbook: "Say what you noticed about them and the idea in one line.\nAsk if they do collaborations and who handles them.\nIf interested, book a short call with followup_with.",
  },
  announcement: {
    goal: "Share the news in 30 seconds, no hard sell",
    playbook: "Give the news or offer in two short lines.\nAsk if they want details on WhatsApp or a call from followup_with.\nEnd politely within a minute if they are busy.",
  },
  purchase: {
    goal: "As a buyer, learn how to order, prices and terms; book a meeting",
    playbook: "Say you are looking to buy what they sell, for caller_company.\nAsk minimum order, price range, delivery time and payment terms.\nNote the right contact person.\nIf it fits, book a meeting with followup_with.",
  },
  default: {
    goal: "Introduce caller_company and leave the door open",
    playbook: "Say who you are and why you called.\nAnswer questions honestly; never invent facts.\nOffer a follow-up from followup_with if they want one.",
  },
};

/** India calling window Mantis keeps (stricter than TRAI's 9–21): 10:00–19:30 IST, Mon–Sat. */
export const CALL_WINDOW = { from: "10:00", to: "19:30", days: [1, 2, 3, 4, 5, 6] };
/** Minutes assumed per connected call when estimating credits before a campaign runs. */
export const EST_MINUTES_PER_CALL = 3;
/** A call is not placed unless the balance covers this many minutes. */
export const MIN_MINUTES_BALANCE = 3;
export const creditsForSeconds = (secs: number) => (secs > 0 ? Math.ceil(secs / 60) * CREDIT_COST.voice_minute : 0);

