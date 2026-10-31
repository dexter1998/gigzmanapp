/**
 * The facts store (company_facts / company_signals). Every reader in lib/v2/signals writes what it
 * observed here, with its own shelf life; every run reads here first and fetches only what is
 * missing or expired. A company read for one user is free for the next — and a fact found by one
 * signal (a careers page) feeds rules that derive others (needs_crm) without another fetch.
 */

import { sql } from "@/lib/db";

/** How long an observation is trusted. Hiring moves weekly; a registration never changes. */
export const TTL_DAYS: Record<string, number> = {
  hiring: 14, social_stats: 30, funding: 90, offerings: 60, site_extra: 30, profiles: 14, gbp: 30, person: 120, registration: 3650,
};
const ttl = (key: string) => TTL_DAYS[key] ?? 30;

export type Fact<T = unknown> = { value: T; source: string; evidenceUrl: string | null; observedAt: string };
export type Facts = Record<string, Fact>;

export async function readFacts(entity: string): Promise<Facts> {
  const rows = await sql`SELECT key, value, source, evidence_url, observed_at FROM company_facts WHERE entity = ${entity} AND expires_at > now()`;
  return Object.fromEntries(rows.map((r) => [r.key as string, { value: r.value, source: r.source as string, evidenceUrl: r.evidence_url as string | null, observedAt: new Date(r.observed_at as string).toISOString() }]));
}

/** A miss ("no founder found") is retried sooner than a hit is refreshed: people pages and search
 *  indexes change, and 120 days of cached nulls hid 56% of companies (audit 2026-10-23). */
const MISS_TTL_DAYS = 14;

export async function writeFact(entity: string, key: string, value: unknown, source: string, evidenceUrl: string | null = null): Promise<void> {
  if (value === undefined) return;
  const days = value === null ? Math.min(MISS_TTL_DAYS, ttl(key)) : ttl(key);
  await sql`
    INSERT INTO company_facts (entity, key, value, source, evidence_url, observed_at, expires_at)
    VALUES (${entity}, ${key}, ${value === null ? sql`'null'::jsonb` : sql.json(value as Parameters<typeof sql.json>[0])}, ${source}, ${evidenceUrl}, now(), now() + (${days} || ' days')::interval)
    ON CONFLICT (entity, key) DO UPDATE SET value = EXCLUDED.value, source = EXCLUDED.source, evidence_url = EXCLUDED.evidence_url,
      observed_at = EXCLUDED.observed_at, expires_at = EXCLUDED.expires_at`;
}

export type Derived = { signal: string; confidence: number; ruleId: string; derivedFrom: string[]; reason: string };

/** Replaces the entity's derived signals with this read's (a need that no longer holds goes). */
export async function writeSignals(entity: string, derived: Derived[]): Promise<void> {
  // One transaction, serialised per company: two reads of the same domain in one batch (a chain's
  // branches share a site) did DELETE + INSERTs on the same rows at once and Postgres aborted one
  // with "deadlock detected" — which failed the whole run.
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${`signals:${entity}`}))`;
    await tx`DELETE FROM company_signals WHERE entity = ${entity}`;
    for (const d of derived) {
      await tx`
        INSERT INTO company_signals (entity, signal, confidence, rule_id, derived_from, reason)
        VALUES (${entity}, ${d.signal}, ${d.confidence}, ${d.ruleId}, ${d.derivedFrom}, ${d.reason})
        ON CONFLICT (entity, signal) DO UPDATE SET confidence = GREATEST(company_signals.confidence, EXCLUDED.confidence),
          rule_id = EXCLUDED.rule_id, derived_from = EXCLUDED.derived_from, reason = EXCLUDED.reason, created_at = now()`;
    }
  });
}

/** Fetch-or-reuse: the value from the store when fresh, else `read()` once and keep it. */
export async function factOr<T>(facts: Facts, entity: string, key: string, source: string, read: () => Promise<T | null>, evidence?: (v: T) => string | null): Promise<T | null> {
  const hit = facts[key];
  if (hit) return hit.value as T;
  const v = await read().catch(() => null);
  // A failed read is remembered too (as null) so the next run doesn't retry it for the shelf life.
  await writeFact(entity, key, v, source, v && evidence ? evidence(v) : null);
  facts[key] = { value: v, source, evidenceUrl: null, observedAt: new Date().toISOString() };
  return v;
}
