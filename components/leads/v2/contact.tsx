"use client";

/**
 * Lead contact UI (docs/lead-contact-contract.md): Mail / Call / WhatsApp row actions with a short
 * prefilled message, email tier badges, phone kind tags, and the run's extra columns.
 *
 * Every field from the contract is optional here: leads saved before it (or a backend that has not
 * shipped it yet) only have `emails: string[]` and `phone`, so tiers / kinds / WhatsApp are derived
 * from those with the same rules the contract states, and extras just render "—".
 */

import { Mail, Phone, MessageCircle } from "lucide-react";
import "./contact.css";

export type EmailTier = 1 | 2 | 3;
export type LeadEmail = { email: string; tier: EmailTier; kind: "person" | "role" | "generic" };
export type PhoneKind = "mobile" | "landline" | "tollfree" | "unknown";
export type LeadPhone = { number: string; e164: string | null; kind: PhoneKind };
export type Pitch = { senderName?: string | null; company?: string | null; offer?: string | null } | null;
export type ExtraColumn = { key: string; label: string };

/** What the contact UI needs from any lead shape (LMS lead, run result, drawer detail). */
export type ContactInput = {
  /** The v2_results row id, when known — contact clicks are logged against it (lib/v2/learning.ts). */
  id?: string | number | null;
  name: string;
  area?: string | null;
  person?: { name: string | null; role?: string | null } | null;
  emails?: Array<string | { email: string; tier?: number; kind?: string }> | null;
  emailList?: LeadEmail[] | null;
  phone?: string | null;
  phones?: LeadPhone[] | null;
  whatsapp?: string | null;
};

export type Contact = { emails: LeadEmail[]; phones: LeadPhone[]; whatsapp: string | null };

// --- fallbacks for old rows (same rules as the contract) ---------------------------------------

const GENERIC = /^(support|care|help|helpdesk|noreply|no-reply|donotreply|careers|career|hr|jobs|accounts|account|billing|admin|webmaster|privacy|legal|abuse|postmaster|feedback|complaints?|customercare|enquiries)$/;
const ROLE = /^(sales|business|owner|director|hello|hi|contact|contactus|info|enquiry|inquiry|office|team|marketing|partners?|bd|connect|mail|reception|booking|bookings|appointments?|ceo|founder|md|admin\.office)$/;

function guessEmail(email: string): LeadEmail {
  const local = email.split("@")[0]?.toLowerCase().replace(/[0-9]+$/, "") ?? "";
  if (GENERIC.test(local)) return { email, tier: 3, kind: "generic" };
  // Conservative for old rows: only "first.last" style addresses count as a named person.
  if (!ROLE.test(local) && /^[a-z]+[._-][a-z]+$/.test(local)) return { email, tier: 1, kind: "person" };
  return { email, tier: 2, kind: "role" };
}

const kindOfTier = (t: EmailTier): LeadEmail["kind"] => (t === 1 ? "person" : t === 2 ? "role" : "generic");

/** India rules: 10 digits starting 6-9 = mobile, 1800/1860 = toll-free, an STD-coded number = landline. */
function guessPhone(number: string): LeadPhone {
  const d = number.replace(/\D/g, "");
  if (/^(0|91)?1(800|860)/.test(d)) return { number, e164: null, kind: "tollfree" };
  if (number.trim().startsWith("+") && !d.startsWith("91")) return { number, e164: `+${d}`, kind: "unknown" };
  const ten = d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 11 && d.startsWith("0") ? d.slice(1) : d;
  if (ten.length !== 10) return { number, e164: null, kind: "unknown" };
  return { number, e164: `+91${ten}`, kind: /^[6-9]/.test(ten) ? "mobile" : "landline" };
}

const PHONE_ORDER: Record<PhoneKind, number> = { mobile: 0, landline: 1, unknown: 2, tollfree: 3 };

export function normalizeContact(l: ContactInput): Contact {
  const seen = new Set<string>();
  const raw: LeadEmail[] = l.emailList?.length
    ? l.emailList
    : (l.emails ?? []).map((e) => {
      if (typeof e === "string") return guessEmail(e);
      const t = e.tier === 1 || e.tier === 2 || e.tier === 3 ? (e.tier as EmailTier) : null;
      return t ? { email: e.email, tier: t, kind: (e.kind as LeadEmail["kind"]) ?? kindOfTier(t) } : guessEmail(e.email);
    });
  // Array#sort is stable: within a tier the backend's order is kept.
  const emails = raw.filter((e) => e.email && !seen.has(e.email.toLowerCase()) && seen.add(e.email.toLowerCase())).sort((a, b) => a.tier - b.tier);

  const phones = [...(l.phones?.length ? l.phones : l.phone ? [guessPhone(l.phone)] : [])].sort((a, b) => PHONE_ORDER[a.kind] - PHONE_ORDER[b.kind]);
  // `whatsapp` is authoritative when the field exists (null = no mobile); old rows fall back to the best mobile.
  const whatsapp = l.whatsapp !== undefined ? l.whatsapp : phones.find((p) => p.kind === "mobile")?.e164 ?? null;
  return { emails, phones, whatsapp };
}

// --- messages ---------------------------------------------------------------------------------

const firstName = (n?: string | null) => (n ? n.trim().split(/\s+/)[0] : "");
const clean = (s?: string | null) => (s ?? "").trim().replace(/[.\s]+$/, "");
/** "Urbanbriq Development Services Private Limited" → "Urbanbriq Development Services" for the message text. */
const shortName = (n: string) => n.replace(/[\s,]+(pvt\.?|private)?\s*(ltd\.?|limited|llp|inc\.?)\s*$/i, "").trim() || n;
/** "we help clinics get more bookings" → "We help clinics get more bookings". */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function mailtoHref(lead: ContactInput, to: string, pitch: Pitch): string {
  const biz = shortName(lead.name);
  const hi = firstName(lead.person?.name) || "there";
  const offer = clean(pitch?.offer);
  const sender = clean(pitch?.senderName);
  const company = clean(pitch?.company);
  const subject = `Quick idea for ${biz}`;
  const body = [
    `Hi ${hi},`,
    "",
    offer
      ? `I came across ${biz} and thought this could help: ${offer}. Open to a quick 10-minute call this week?`
      : `I came across ${biz} and had a quick idea that could bring you more customers. Open to a short call this week?`,
    "",
    "Thanks,",
    [sender, company].filter(Boolean).join(", ") || "",
  ].join("\n").trimEnd();
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function whatsappHref(lead: ContactInput, e164: string, pitch: Pitch): string {
  const biz = shortName(lead.name);
  const hi = firstName(lead.person?.name);
  const offer = clean(pitch?.offer);
  const sender = clean(pitch?.senderName);
  const company = clean(pitch?.company);
  const who = sender && company ? `this is ${sender} from ${company}` : sender ? `this is ${sender}` : company ? `this is ${company}` : "";
  const text = [
    `Hi${hi ? ` ${hi}` : ""}${who ? `, ${who}` : ""}.`,
    offer ? `I came across ${biz}. ${cap(offer)}.` : `I came across ${biz} and had a quick idea for you.`,
    "Is this a good time for a short chat?",
  ].join(" ");
  return `https://wa.me/${e164.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

const telHref = (p: LeadPhone) => `tel:${p.e164 ?? p.number.replace(/[^\d+]/g, "")}`;

// --- pieces ---------------------------------------------------------------------------------

const TIER: Record<EmailTier, { label: string; why: string }> = {
  1: { label: "Person", why: "A named person — most likely to reach a decision maker" },
  2: { label: "Role", why: "A role inbox (sales@, owner@, hello@) — usually read by the business" },
  3: { label: "Generic", why: "Generic or support inbox (info@, support@, careers@) — less likely to reach a buyer" },
};

export function TierBadge({ tier }: { tier: EmailTier }) {
  return <span className={`lc-tier t${tier}`} title={TIER[tier].why}>{TIER[tier].label}</span>;
}

const KIND: Record<PhoneKind, string | null> = { mobile: "Mobile", landline: "Landline", tollfree: "Toll-free", unknown: null };
export function PhoneKindTag({ kind }: { kind: PhoneKind }) {
  const label = KIND[kind];
  if (!label) return null;
  return <span className={`lc-kind ${kind}`} title={kind === "mobile" ? "Mobile — call or WhatsApp" : kind === "tollfree" ? "Toll-free line — usually a call centre" : "Landline — calls only, no WhatsApp"}>{label}</span>;
}

/** Mail / Call / WhatsApp. Never opens the row: clicks stop here. */
export function ContactActions({ lead, contact, pitch }: { lead: ContactInput; contact: Contact; pitch: Pitch }) {
  const email = contact.emails[0];
  const phone = contact.phones[0];
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  // Which leads users actually reach out to — the outcome the learning loop weighs pipelines by.
  const track = (event: "contact_email" | "contact_call" | "contact_whatsapp") => {
    if (lead.id == null) return;
    try { navigator.sendBeacon("/api/v2/outcomes", new Blob([JSON.stringify({ event, resultId: String(lead.id) })], { type: "application/json" })); } catch { /* best effort */ }
  };
  return (
    <span className="lc-actions" onClick={stop}>
      {email
        ? <a className="v2-cbtn lc-btn" onClick={() => track("contact_email")} href={mailtoHref(lead, email.email, pitch)} title={`Email ${email.email}`} aria-label={`Email ${lead.name}`}><Mail size={15} /></a>
        : <span className="v2-cbtn lc-btn off" title="No email found" aria-disabled="true" aria-label="No email found"><Mail size={15} /></span>}
      {phone
        ? <a className="v2-cbtn lc-btn" onClick={() => track("contact_call")} href={telHref(phone)} title={`Call ${phone.number}${KIND[phone.kind] ? ` (${KIND[phone.kind]})` : ""}`} aria-label={`Call ${lead.name}`}><Phone size={15} /></a>
        : <span className="v2-cbtn lc-btn off" title="No phone found" aria-disabled="true" aria-label="No phone found"><Phone size={15} /></span>}
      {contact.whatsapp
        ? <a className="v2-cbtn lc-btn wa" onClick={() => track("contact_whatsapp")} href={whatsappHref(lead, contact.whatsapp, pitch)} target="_blank" rel="noopener noreferrer" title={`WhatsApp ${contact.whatsapp}`} aria-label={`WhatsApp ${lead.name}`}><MessageCircle size={15} /></a>
        : <span className="v2-cbtn lc-btn off" title={contact.phones.length ? "No mobile number — WhatsApp needs a mobile" : "No mobile number found"} aria-disabled="true" aria-label="No WhatsApp"><MessageCircle size={15} /></span>}
    </span>
  );
}

/** Table cell: the best email with its badge, "+N" for the rest. */
export function EmailCell({ contact }: { contact: Contact }) {
  const [best, ...rest] = contact.emails;
  if (!best) return <span className="v2-muted">—</span>;
  return (
    <span className="lc-cell" title={contact.emails.map((e) => `${e.email} · ${TIER[e.tier].label}`).join("\n")}>
      <span className="lc-val">{best.email}</span><TierBadge tier={best.tier} />{rest.length > 0 && <span className="lc-more">+{rest.length}</span>}
    </span>
  );
}

export function PhoneCell({ contact }: { contact: Contact }) {
  const [best, ...rest] = contact.phones;
  if (!best) return <span className="v2-muted">—</span>;
  return (
    <span className="lc-cell" title={contact.phones.map((p) => `${p.number}${KIND[p.kind] ? ` · ${KIND[p.kind]}` : ""}`).join("\n")}>
      <span className="lc-val tnum">{best.number}</span><PhoneKindTag kind={best.kind} />{rest.length > 0 && <span className="lc-more">+{rest.length}</span>}
    </span>
  );
}

/** Extra-column cells, in the run's column order. Unknown values stay "—" (never invented). */
export function ExtraCells({ columns, extras }: { columns: ExtraColumn[]; extras?: Record<string, string> | null }) {
  return <>{columns.map((c) => { const v = extras?.[c.key]?.trim(); return <td key={c.key} className="lc-extra">{v ? <span title={v}>{v}</span> : <span className="v2-muted">—</span>}</td>; })}</>;
}
