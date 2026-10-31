/**
 * V2 Leads (LMS): every ranked result of every run is a lead — added automatically, no unlock.
 * A list is the chat it came from (named after the chat), so "hospitals", "schools", "companies"
 * stay separate; "All" is every lead once (de-duplicated by business).
 */

import { sql } from "@/lib/db";
import { formatCategory } from "@/lib/categories";
import { SIGNALS, consistentSignals, type SignalId } from "./playbooks";
import { tierEmails, classifyPhones, whatsappOf, type LeadEmail, type LeadPhone } from "./contact-quality";
import { DEFAULT_COLUMNS, cleanColumns, foldFacts, knownFromRow, mergeExtras, unionColumns, type ExtraColumn } from "./extras";

export type { LeadEmail, LeadPhone, EmailTier, PhoneKind } from "./contact-quality";

export type LmsLead = {
  id: string; runId: string; chatId: string; listName: string; name: string; category: string | null; area: string | null;
  rating: number | null; reviews: number | null; website: string | null; phone: string | null; emails: string[]; linkedin: string | null;
  person: { name: string; role: string | null } | null; signals: string[]; signalKeys: string[]; notes: string[]; score: number; addedAt: string | null;
  /** docs/lead-contact-contract.md: graded addresses (tier 1 → 3; `emails` keeps the same order), every
   *  known number (mobile first), the WhatsApp-able mobile, and the extra columns' values by key. */
  emailList: LeadEmail[]; phones: LeadPhone[]; whatsapp: string | null; extras: Record<string, string>;
};

/** The run's extra columns (its plan's, or the defaults for runs planned before they existed). */
const runColumns = (raw: unknown): ExtraColumn[] => { const c = cleanColumns(raw); return c.length ? c : DEFAULT_COLUMNS; };

const prettyArea = (a: string | null) => (a ? a.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null);

/** 0-100 from the run's internal score (signals matched ×10 + contact bonus + log reviews). */
export function leadScore(raw: number | null, maxInRun: number): number {
  if (raw == null || maxInRun <= 0) return 0;
  return Math.max(5, Math.min(99, Math.round((raw / maxInRun) * 90 + 9)));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a postgres row; fields are read defensively below
export function toLead(r: Record<string, any>, maxScore: number): LmsLead {
  const sig = (r.signals ?? {}) as Record<string, unknown>;
  const keys = consistentSignals(Object.keys(sig).filter((k) => sig[k] === true && k in SIGNALS));
  const raw = (r.emails ?? []) as Array<{ email: string; person?: string }>;
  const emailList = tierEmails([...raw.map((e) => e.email), r.contact?.email ?? null], {
    businessName: r.name, domain: r.domain,
    personName: [r.contact?.name, ...raw.map((e) => e.person)].filter(Boolean).join(" "),
    large: Number(r.review_count ?? 0) >= 3000 || sig.multi_location === true,
  });
  const sitePhones = Array.isArray(r.site_phones) ? (r.site_phones as unknown[]).filter((x): x is string => typeof x === "string") : [];
  // The listing's wa.me link is the business's own WhatsApp — first, ahead of any guessed mobile.
  const waLink = typeof r.socials?.whatsapp === "string" ? `+${String(r.socials.whatsapp).replace(/\D/g, "")}` : null;
  const phones = classifyPhones([waLink, r.phone, ...sitePhones]);
  const columns = runColumns(r.extra_columns);
  return {
    id: String(r.id), runId: r.run_id, chatId: r.chat_id, listName: r.list_name ?? "Untitled", name: r.name,
    category: r.category ? (formatCategory(r.category) ?? r.category) : null, area: prettyArea(r.area),
    rating: r.rating, reviews: r.review_count, website: r.website, phone: r.phone,
    emails: emailList.map((e) => e.email), linkedin: (r.socials ?? {}).linkedin ?? null,
    person: r.contact?.name ? { name: r.contact.name, role: r.contact.role ?? null } : null,
    signals: keys.map((k) => SIGNALS[k as SignalId].label), signalKeys: keys, score: leadScore(r.score, maxScore),
    notes: ["why", "offer_match", "hiring", "funding", "security", "social", "profiles", "offerings"].map((k) => (sig.notes as Record<string, unknown> | undefined)?.[k]).filter((x): x is string => typeof x === "string" && !!x),
    addedAt: r.finished_at ? new Date(r.finished_at).toISOString() : null,
    emailList, phones, whatsapp: whatsappOf(phones),
    // Measured facts win (the contacts step may have named the person after extras were stored).
    extras: mergeExtras(columns, foldFacts(columns, knownFromRow(r), "strong"), r.extras, foldFacts(columns, knownFromRow(r), "weak")),
  };
}

/** The pseudo-list holding leads added with "Add to leads" on the Home map (the `unlocks` table).
 *  They have no run or chat, so they get their own list instead of vanishing from Leads. */
export const MAP_LIST = "map";
export const MAP_LIST_NAME = "Saved from map";
export const mapLeadId = (leadId: string) => `m-${leadId}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a postgres row
export function mapRowToLead(r: Record<string, any>): LmsLead {
  const noSite = r.has_website === false;
  const emailList = tierEmails([r.email ?? null], { businessName: r.business_name, domain: null });
  const phones = classifyPhones([r.phone]);
  return {
    id: mapLeadId(String(r.id)), runId: "", chatId: MAP_LIST, listName: MAP_LIST_NAME, name: r.business_name,
    category: r.category ? (formatCategory(r.category) ?? r.category) : null, area: r.address ?? null,
    rating: r.rating ?? null, reviews: r.review_count ?? null, website: null, phone: r.phone ?? null,
    emails: emailList.map((e) => e.email), linkedin: null, person: null,
    signals: noSite ? [SIGNALS.no_website.label] : [], signalKeys: noSite ? ["no_website"] : [], notes: [], score: 0,
    addedAt: r.unlocked_at ? new Date(r.unlocked_at).toISOString() : null,
    emailList, phones, whatsapp: whatsappOf(phones), extras: {},
  };
}

export async function mapLeads(email: string, leadId?: string): Promise<LmsLead[]> {
  const rows = await sql`
    SELECT l.id, l.business_name, l.category, l.address, l.phone, l.email, l.rating, l.review_count, l.has_website, u.unlocked_at
    FROM unlocks u JOIN leads l ON l.id = u.lead_id
    WHERE u.unlocked_by = ${email} AND l.is_competitor = false ${leadId ? sql`AND l.id = ${leadId}` : sql``}
    ORDER BY u.unlocked_at DESC`;
  return rows.map(mapRowToLead);
}

export async function listLeads(email: string, chatId?: string | null) {
  const fromMap = chatId && chatId !== MAP_LIST ? [] : await mapLeads(email);
  const rows = chatId === MAP_LIST ? [] : await sql`
    SELECT r.*, u.chat_id, u.finished_at, c.title AS list_name, u.plan->'extraColumns' AS extra_columns,
           d.site_signals->'phones' AS site_phones,
           max(r.score) OVER (PARTITION BY r.run_id) AS max_score
    FROM v2_results r
    JOIN v2_runs u ON u.id = r.run_id AND u.user_email = ${email} AND u.status IN ('done', 'stopped')
    LEFT JOIN chats c ON c.id = u.chat_id
    LEFT JOIN scrape_domains d ON d.domain = r.domain
    WHERE r.rank IS NOT NULL ${chatId ? sql`AND u.chat_id = ${chatId}` : sql``}
    ORDER BY u.finished_at DESC, r.rank`;
  const seen = new Set<string>();
  const leads: LmsLead[] = [];
  const runCols = new Map<string, ExtraColumn[]>();
  for (const r of rows) {
    // One business appears once in "All"; the newest run wins.
    const key = r.lead_id ?? r.domain ?? `${r.name}|${r.area}`;
    if (seen.has(key)) continue;
    seen.add(key);
    leads.push(toLead(r, Number(r.max_score ?? 0)));
    if (!runCols.has(r.run_id)) runCols.set(r.run_id, runColumns(r.extra_columns));
  }
  for (const m of fromMap) if (!seen.has(m.id.slice(2))) { seen.add(m.id.slice(2)); leads.push(m); }
  // The listed runs' columns, newest run first; a column nobody in the list has a value for is left out.
  const columns = unionColumns([...runCols.values()])
    .filter((c) => leads.some((l) => l.extras[c.key]))
    .map(({ key, label }) => ({ key, label }));
  const lists = await sql`
    SELECT u.chat_id, c.title, count(r.*)::int AS n, max(u.finished_at) AS updated,
           count(*) FILTER (WHERE jsonb_array_length(r.emails) > 0)::int AS with_email,
           count(*) FILTER (WHERE r.phone IS NOT NULL)::int AS with_phone
    FROM v2_runs u JOIN v2_results r ON r.run_id = u.id AND r.rank IS NOT NULL
    LEFT JOIN chats c ON c.id = u.chat_id
    WHERE u.user_email = ${email} AND u.status IN ('done', 'stopped')
    GROUP BY 1, 2 ORDER BY 4 DESC`;
  const allMap = chatId === MAP_LIST || !chatId ? fromMap : await mapLeads(email);
  const listInfo = lists.map((l) => ({
    chatId: l.chat_id as string, name: (l.title as string) ?? "Untitled", count: l.n as number,
    withEmail: l.with_email as number, withPhone: l.with_phone as number,
    updatedAt: l.updated ? new Date(l.updated).toISOString() : null,
  }));
  if (allMap.length) {
    listInfo.push({ chatId: MAP_LIST, name: MAP_LIST_NAME, count: allMap.length,
      withEmail: allMap.filter((l) => l.emails.length).length, withPhone: allMap.filter((l) => l.phone).length, updatedAt: allMap[0].addedAt });
    listInfo.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  }
  return { leads, columns, lists: listInfo };
}
