/**
 * product_facts (docs/v2-agents.md §7.5). The only source the answer model may use for what
 * Mantis is, costs and can do. Built from the pricing constants so it cannot drift from them —
 * production chats had the model inventing credit prices and refusing to share contacts while
 * the product sells contact unlock.
 *
 * When a capability ships, move it from NOT_YET to CAN. Saying "not yet" honestly beats a
 * confident wrong answer; the gap log records how often each one was asked for.
 */

import { CREDIT_COST, CREDIT_PACKS, FREE_SIGNUP_CREDITS, ALLOWANCE, PLAN_FEATURES, PLAN_PERIOD_DAYS, TOPUP_MIN_RUPEES, TOPUP_PAISE_PER_CREDIT, formatINR } from "@/lib/credits/pricing";
import { WHATSAPP_LIVE } from "./outreach/channels";

const CAN = [
  "Find businesses for ANY seller: local businesses by trade and area (maps listings), companies that aren't on maps (SaaS, B2B, importers, product companies) through web search, startups that raised funding (funding news), and developers / dev companies (public developer profiles). A city, a neighbourhood, a foreign city, or all of India (\"pan India\").",
  "Plan a multi-step run from a plain-language brief (the user taps Run after seeing scope and credit quote): several trades, a count (any number — 3, 5, 20, 100), filters (no website, review count range, rating range, excluded trades) and signals read from each business's own website — no HTTPS, not mobile-ready, old copyright year, no analytics, no ad pixel, online booking / menu / admissions page present or absent, site down, social page used as a website — plus hiring now (with role titles), several branches, funding (round, amount, date), weak or quiet social (Instagram followers/posts, YouTube last video), weak reviews / low rating.",
  "Contacts on every lead whose website it reads: emails graded Tier 1 (a named person, e.g. rahul@), Tier 2 (a role inbox that reaches a decision — sales@, hello@, contact@ on a small business) and Tier 3 (generic / support — info@ on a big org, support@, careers@); phones graded mobile / landline / toll-free, and a WhatsApp link only for mobiles; the company LinkedIn; the founder/owner name where the site states it; extra columns chosen for the user's offer (founder, team size, services, branches…).",
  "Look up ONE company by its website on request: emails with tiers and the page each was found on, people named on the site, what it sells.",
  `Every lead a run finds is added to Leads automatically, in a list named after the chat — ${CREDIT_COST.lead_unlock} credits per NEW business; ones the user already has are free.`,
  "Business profiles: the businesses the user finds leads FOR (their own, a client's). Read from a website or a one-line description, several can be saved (Settings → Business profiles), and the chat asks which one a search is for.",
  "Campaigns: the Campaign Planner builds a sequence for a lead list — email and AI voice calls (WhatsApp is shown as coming soon). The user edits it on a canvas, sends themselves a test, then approves and schedules it. Mail goes from the user's connected mailbox (Gmail or any IMAP/SMTP, Integrations → Email). A reply stops that lead's sequence; replies, call outcomes and booked meetings land in the Inbox with an AI summary.",
  `AI voice calls: Mantis's own voice agent calls leads in the campaign's language (English by default, switches to Hindi/Hinglish with the person), pitches the user's business and books meetings. ${CREDIT_COST.voice_minute} credits per connected minute; unanswered and failed calls are free. A test call to the user's own phone is in Integrations → Voice; it is charged like any AI call (${CREDIT_COST.voice_minute} credits per connected minute).`,
  "Templates (email with HTML and images, call scripts, saved sequences), Inbox of replies, Analytics per campaign.",
  "Answer strategy questions (which niche or city, how to pitch, writing a cold email or call opener) — as advice, using Mantis's own coverage numbers where available.",
];

const NOT_YET = [
  ...(WHATSAPP_LIVE ? [] : ["Sending WhatsApp messages (coming soon — campaigns show WhatsApp touches but skip them)."]),
  "Leads of individual consumers (B2C): Mantis finds businesses only. For a consumer-facing business (clinic, school, salon) it offers businesses to partner with and vendors to buy from instead.",
    "Emails for businesses without a website (their phone comes with the lead).",
  "New-project (RERA), new-registration (MCA/GST/FSSAI) or ad-library signals; Instagram last-post date; page-speed scores.",
  "Named decision-makers on every lead, or verified/bounce-checked emails.",
  "Exporting a lead list to CSV from the V2 Leads page; CRM connectors (HubSpot, Zoho, Pipedrive); Outlook one-click connect.",
  "Self-serve refunds (credits for a run that used them are not reversed automatically — the user can write to support).",
  "Following up later on its own or notifying the user outside the app.",
];

export function productFacts(): string {
  const packs = CREDIT_PACKS.map((p) => `${p.label}: ${formatINR(p.pricePaise)} for ${PLAN_PERIOD_DAYS} days with ${p.credits.toLocaleString("en-IN")} credits`).join("; ");
  const features = PLAN_FEATURES.map((f) => `${f.label}${f.soon ? " (coming soon)" : ""}`).join(", ");
  return [
    "Mantis Ai finds businesses for any seller to sell to, reads each one's website and public profiles for buying signals and contacts, and runs the outreach (email, AI voice calls).",
    `Credits: new accounts get ${FREE_SIGNUP_CREDITS} free credits once, at signup (they do not refill monthly). Credits never expire. A live map lookup costs ${CREDIT_COST.billed_places_call} credits past the free daily allowance (a repeat of an already-searched area is free); each new lead ${CREDIT_COST.lead_unlock} credits; an AI voice call ${CREDIT_COST.voice_minute} credits per connected minute; the first ${ALLOWANCE.chatTurnsPerDay} chat messages a day are free, then ${CREDIT_COST.chat_turn} credits each.`,
    `Plans (monthly, Settings → Billing): ${packs}. A plan is needed to LAUNCH campaigns — ${features}; finding leads and building or testing campaigns work on free credits. Renewing early extends from the current end date. Add funds any time from ₹${TOPUP_MIN_RUPEES} (₹${(TOPUP_PAISE_PER_CREDIT / 100).toFixed(2)} per credit, dearer than a plan's credits).`,
    "Account: Settings (sidebar) has the profile and, under Sign out, Delete account — a request an admin approves, not instant. Billing and invoices: Settings → Billing; usage: Settings → Usage.",
    "Mantis runs on its own AI, search and data pipeline. Never name any third-party provider, API, model or cloud behind it (no model, search, maps, data or infrastructure vendor names) — if asked what powers Mantis, say it is Mantis's own AI and data pipeline.",
    "Mantis CAN:\n- " + CAN.join("\n- "),
    "Mantis CANNOT YET (say so plainly, then offer the nearest thing it can do):\n- " + NOT_YET.join("\n- "),
  ].join("\n\n");
}
