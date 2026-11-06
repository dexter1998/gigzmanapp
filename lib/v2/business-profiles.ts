/**
 * Business profiles (2026-10-23): the businesses a user finds leads FOR — their own, a client's,
 * a side business. One row per business in v2_business_profiles; a chat picks one and keeps it in
 * v2_chat_state.state.businessProfileId, so a second business never overwrites the first (the
 * single user_profiles.v2_profile slot did: pasting a client's site replaced the user's own).
 *
 * user_profiles.v2_profile stays as a mirror of the DEFAULT profile — code that reads it without a
 * chat (inbox, worker, voice context) keeps working unchanged. Every write here re-syncs it.
 */

import { sql } from "@/lib/db";
import { normalizeUrl } from "./net";
import type { SellerProfile } from "./scout";

export type BusinessProfile = {
  id: string;
  name: string;
  website: string | null;
  summary: string;
  services: string[];
  primaryService: string | null;
  targetTrades: string[];
  sellsTo: "businesses" | "consumers" | "both" | null;
  partnerTrades: string[];
  businessModel: string | null;
  targetAreas: string[];
  playbookIds: string[];
  source: "website" | "chat" | "manual";
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
};

type Row = Record<string, unknown>;
const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);

function fromRow(r: Row): BusinessProfile {
  return {
    id: String(r.id), name: realName(r.name as string | null) ?? hostOf((r.website as string | null) ?? null) ?? "My business", website: (r.website as string | null) ?? null, summary: String(r.summary ?? ""),
    services: arr(r.services), primaryService: (r.primary_service as string | null) ?? null,
    targetTrades: arr(r.target_trades), targetAreas: arr(r.target_areas), playbookIds: arr(r.playbook_ids),
    sellsTo: r.sells_to === "businesses" || r.sells_to === "consumers" || r.sells_to === "both" ? r.sells_to : null, partnerTrades: arr(r.partner_trades), businessModel: (r.business_model as string | null) ?? null,
    source: r.source === "website" || r.source === "manual" ? r.source : "chat",
    isDefault: r.is_default === true, createdAt: iso(r.created_at)!, updatedAt: iso(r.updated_at)!, lastUsedAt: iso(r.last_used_at),
  };
}

/** What the Planner / Suggest / outreach read: the old SellerProfile shape, plus which row it is. */
/** The model sometimes returns the literal text "null"/"undefined" for an unknown name — prod chats showed
 *  "Are these leads for **null**?" and "Use null". Treat those as no name. */
function realName(n: string | null | undefined): string | null {
  const v = (n ?? "").trim();
  return v && !/^(null|undefined|none|n\/a|unknown)$/i.test(v) ? v : null;
}

export function toSeller(b: BusinessProfile): SellerProfile & { id: string; name: string } {
  return {
    id: b.id, name: b.name, website: b.website, company: b.name, summary: b.summary, services: b.services,
    primaryService: b.primaryService, targetTrades: b.targetTrades, targetAreas: b.targetAreas, playbookIds: b.playbookIds,
    sellsTo: b.sellsTo, partnerTrades: b.partnerTrades, businessModel: b.businessModel,
    source: b.source === "website" ? "website" : "chat", updatedAt: b.updatedAt,
  };
}

/** "https://www.Acme.co.in/about" → "acme.co.in". */
export function hostOf(url: string | null | undefined): string | null {
  const u = url ? normalizeUrl(url) : null;
  return u ? u.hostname.toLowerCase().replace(/^www\./, "") : null;
}

export async function listProfiles(email: string): Promise<BusinessProfile[]> {
  const rows = await sql`
    SELECT * FROM v2_business_profiles WHERE user_email = ${email}
    ORDER BY is_default DESC, last_used_at DESC NULLS LAST, created_at DESC`;
  return rows.map(fromRow);
}

export async function getProfile(email: string, id: string | null | undefined): Promise<BusinessProfile | null> {
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [r] = await sql`SELECT * FROM v2_business_profiles WHERE id = ${id} AND user_email = ${email}`;
  return r ? fromRow(r) : null;
}

export async function defaultProfile(email: string): Promise<BusinessProfile | null> {
  const [r] = await sql`SELECT * FROM v2_business_profiles WHERE user_email = ${email} ORDER BY is_default DESC, last_used_at DESC NULLS LAST, created_at DESC LIMIT 1`;
  return r ? fromRow(r) : null;
}

/** The profile a chat chose (v2_chat_state.state.businessProfileId), if it still exists. */
export async function chatProfile(email: string, chatId: string | null | undefined): Promise<BusinessProfile | null> {
  if (!chatId) return null;
  const [r] = await sql`
    SELECT b.* FROM v2_chat_state s JOIN v2_business_profiles b ON b.id::text = s.state->>'businessProfileId'
    WHERE s.chat_id = ${chatId} AND b.user_email = ${email}`;
  return r ? fromRow(r) : null;
}

/** user_profiles.v2_profile := the default profile (or empty when there is none). */
export async function syncMirror(email: string): Promise<void> {
  const d = await defaultProfile(email);
  const json = d ? toSeller(d) : {};
  await sql`
    INSERT INTO user_profiles (email, v2_profile) VALUES (${email}, ${sql.json(json)})
    ON CONFLICT (email) DO UPDATE SET v2_profile = EXCLUDED.v2_profile, updated_at = now()`;
}

/** At most one default per user; if the user has none, the most recently used becomes it. */
async function ensureDefault(email: string): Promise<void> {
  await sql`
    UPDATE v2_business_profiles SET is_default = true
    WHERE id = (SELECT id FROM v2_business_profiles WHERE user_email = ${email} ORDER BY last_used_at DESC NULLS LAST, updated_at DESC LIMIT 1)
      AND NOT EXISTS (SELECT 1 FROM v2_business_profiles WHERE user_email = ${email} AND is_default)`;
}

export type ProfileFields = {
  name?: string; website?: string | null; summary?: string; services?: string[]; primaryService?: string | null;
  targetTrades?: string[]; targetAreas?: string[]; playbookIds?: string[];
};

/** Untrusted input (Settings form) → clean fields; unknown keys dropped. */
export function cleanFields(v: unknown): ProfileFields {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const str = (x: unknown, n: number) => (typeof x === "string" ? x.trim().slice(0, n) : undefined);
  const list = (x: unknown, n: number) => (Array.isArray(x) ? [...new Set(x.filter((s): s is string => typeof s === "string").map((s) => s.trim().slice(0, 60)).filter(Boolean))].slice(0, n) : undefined);
  const out: ProfileFields = {};
  if (str(o.name, 100)) out.name = str(o.name, 100);
  if ("website" in o) out.website = o.website ? (normalizeUrl(String(o.website))?.toString() ?? null) : null;
  if (str(o.summary, 300) !== undefined) out.summary = str(o.summary, 300);
  if (list(o.services, 12)) out.services = list(o.services, 12);
  if ("primaryService" in o) out.primaryService = str(o.primaryService, 60) || null;
  if (list(o.targetTrades, 8)) out.targetTrades = list(o.targetTrades, 8);
  if (list(o.targetAreas, 8)) out.targetAreas = list(o.targetAreas, 8);
  return out;
}

/**
 * A website read (or a chat description) → a profile row. The same website updates its own row
 * instead of adding a duplicate; a new one is added, and is the default only if it is the first.
 */
export async function saveScoutProfile(email: string, p: SellerProfile): Promise<{ profile: BusinessProfile; created: boolean }> {
  const host = hostOf(p.website);
  const mine = await listProfiles(email);
  const same = host ? mine.find((b) => hostOf(b.website) === host) : null;
  // realName: the model sends company "null" as a string — 7 prod profiles were named null, and the
  // chat then asked "Are these leads for **null**?" in a loop (2026-11-06).
  const name = (realName(p.company) || host || "My business").slice(0, 100);
  let row: Row;
  if (same) {
    [row] = await sql`
      UPDATE v2_business_profiles SET name = ${name}, website = ${p.website}, summary = ${p.summary}, services = ${sql.json(p.services)},
        primary_service = ${p.primaryService}, target_trades = ${sql.json(p.targetTrades)}, target_areas = ${sql.json(p.targetAreas)},
        playbook_ids = ${sql.json(p.playbookIds)}, source = ${p.source}, sells_to = ${p.sellsTo ?? null}, partner_trades = ${sql.json(p.partnerTrades ?? [])}, business_model = ${p.businessModel ?? null},
        updated_at = now(), last_used_at = now()
      WHERE id = ${same.id} RETURNING *`;
  } else {
    [row] = await sql`
      INSERT INTO v2_business_profiles (user_email, name, website, summary, services, primary_service, target_trades, target_areas, playbook_ids, source, is_default, last_used_at, sells_to, partner_trades, business_model)
      VALUES (${email}, ${name}, ${p.website}, ${p.summary}, ${sql.json(p.services)}, ${p.primaryService}, ${sql.json(p.targetTrades)},
              ${sql.json(p.targetAreas)}, ${sql.json(p.playbookIds)}, ${p.source}, ${mine.length === 0}, now(), ${p.sellsTo ?? null}, ${sql.json(p.partnerTrades ?? [])}, ${p.businessModel ?? null})
      RETURNING *`;
  }
  await syncMirror(email);
  return { profile: fromRow(row), created: !same };
}

export async function createManual(email: string, f: ProfileFields): Promise<BusinessProfile> {
  const first = (await listProfiles(email)).length === 0;
  const [row] = await sql`
    INSERT INTO v2_business_profiles (user_email, name, website, summary, services, primary_service, target_trades, target_areas, source, is_default)
    VALUES (${email}, ${realName(f.name) ?? hostOf(f.website) ?? "My business"}, ${f.website ?? null}, ${f.summary ?? ""}, ${sql.json(f.services ?? [])},
            ${f.primaryService ?? f.services?.[0] ?? null}, ${sql.json(f.targetTrades ?? [])}, ${sql.json(f.targetAreas ?? [])}, 'manual', ${first})
    RETURNING *`;
  await syncMirror(email);
  return fromRow(row);
}

export async function updateProfile(email: string, id: string, f: ProfileFields): Promise<BusinessProfile | null> {
  const cur = await getProfile(email, id);
  if (!cur) return null;
  const n = { ...cur, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) } as BusinessProfile;
  const [row] = await sql`
    UPDATE v2_business_profiles SET name = ${n.name}, website = ${n.website}, summary = ${n.summary}, services = ${sql.json(n.services)},
      primary_service = ${n.primaryService}, target_trades = ${sql.json(n.targetTrades)}, target_areas = ${sql.json(n.targetAreas)}, updated_at = now()
    WHERE id = ${id} AND user_email = ${email} RETURNING *`;
  if (cur.isDefault) await syncMirror(email);
  return row ? fromRow(row) : null;
}

export async function setDefault(email: string, id: string): Promise<boolean> {
  if (!(await getProfile(email, id))) return false;
  await sql.begin(async (tx) => {
    await tx`UPDATE v2_business_profiles SET is_default = false WHERE user_email = ${email} AND is_default AND id <> ${id}`;
    await tx`UPDATE v2_business_profiles SET is_default = true WHERE id = ${id} AND user_email = ${email}`;
  });
  await syncMirror(email);
  return true;
}

export async function deleteProfile(email: string, id: string): Promise<boolean> {
  const cur = await getProfile(email, id);
  if (!cur) return false;
  await sql`DELETE FROM v2_business_profiles WHERE id = ${id} AND user_email = ${email}`;
  await ensureDefault(email);
  await syncMirror(email);
  return true;
}

export async function touchProfile(id: string): Promise<void> {
  await sql`UPDATE v2_business_profiles SET last_used_at = now() WHERE id = ${id}`.catch(() => {});
}

/**
 * Does the message name one of the saved businesses — by its website ("acme.in") or its name as a
 * whole phrase ("for Acme Digital")? Names under 3 letters never match: too easy to hit by chance.
 */
export function matchProfile(profiles: BusinessProfile[], message: string): BusinessProfile | null {
  const text = ` ${message.toLowerCase().replace(/[^a-z0-9.&\s-]+/g, " ").replace(/\s+/g, " ")} `;
  for (const b of profiles) {
    const host = hostOf(b.website);
    if (host && text.includes(host)) return b;
  }
  for (const b of profiles) {
    const name = b.name.toLowerCase().replace(/[^a-z0-9.&\s-]+/g, " ").replace(/\s+/g, " ").trim();
    if (name.length >= 3 && text.includes(` ${name} `)) return b;
  }
  // The domain's first label is a common way to say the company: "for datakatalyst".
  for (const b of profiles) {
    const label = hostOf(b.website)?.split(".")[0];
    if (label && label.length >= 5 && new RegExp(`\\b${label.replace(/[^a-z0-9-]/g, "")}\\b`).test(text)) return b;
  }
  return null;
}
