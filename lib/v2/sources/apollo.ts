/**
 * Apollo as the LAST contact step: only for a person we already identified (name + company domain,
 * from their own site or Exa), so no credit is spent finding someone — only reaching them.
 * People Match costs credits; every call is recorded and the result is shared via v2_facts.
 */

import { sql } from "@/lib/db";
import { keysFor, retireKey, looksExhausted } from "./key-chain";

export type ApolloContact = { email: string | null; emailStatus: string | null; title: string | null; linkedin: string | null; phone: string | null } | null;

/** Set when Apollo answers "not in your plan": no further calls are made this process. */
let unavailable: string | null = null;
export class ApolloUnavailable extends Error {}

export async function apolloMatch(input: { name: string; domain: string; entityKey: string; placeType?: string | null }): Promise<ApolloContact> {
  if (!keysFor("APOLLO_API_KEY").length) {
    if (unavailable) throw new ApolloUnavailable(unavailable);
    return null;
  }
  const [first, ...rest] = input.name.trim().split(/\s+/);
  const t0 = Date.now();
  let out: ApolloContact = null;
  try {
    let res: Response | null = null;
    let d: { person?: Record<string, unknown>; error_code?: string; error?: string } = {};
    for (const key of keysFor("APOLLO_API_KEY")) {
      res = await fetch("https://api.apollo.io/api/v1/people/match", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "Cache-Control": "no-cache" },
        body: JSON.stringify({ first_name: first, last_name: rest.join(" ") || undefined, domain: input.domain, reveal_personal_emails: false }),
        signal: AbortSignal.timeout(20_000),
      });
      d = (await res.json().catch(() => ({}))) as typeof d;
      // Free plan ("not in plan") or out of credits: this key is done; the next key (if any) is tried.
      if (d.error_code === "API_INACCESSIBLE" || (!res.ok && looksExhausted(res.status, JSON.stringify(d)))) { retireKey(key); unavailable = d.error ?? "Apollo endpoint not in plan"; continue; }
      unavailable = null;
      break;
    }
    // Every key is out: say so instead of logging it as "no match".
    if (unavailable && !keysFor("APOLLO_API_KEY").length) throw new ApolloUnavailable(unavailable);
    const p = d.person;
    if (res?.ok && p) {
      const phones = Array.isArray(p.phone_numbers) ? (p.phone_numbers as Array<{ sanitized_number?: string }>) : [];
      out = { email: (p.email as string) ?? null, emailStatus: (p.email_status as string) ?? null, title: (p.title as string) ?? null,
              linkedin: (p.linkedin_url as string) ?? null, phone: phones[0]?.sanitized_number ?? null };
    }
  } finally {
    // An unavailable plan is not a failed lookup; recording it would teach the ranking a false 0%.
    if (!unavailable) {
      await sql`INSERT INTO v2_source_attempts (source, capability, place_type, entity_key, ok, value, cost_usd, ms)
                VALUES ('apollo', 'person_contact', ${input.placeType ?? null}, ${input.entityKey}, ${!!out?.email}, ${out?.email ?? null}, 0, ${Date.now() - t0})`;
    }
  }
  if (out?.email) {
    await sql`INSERT INTO v2_facts (entity_key, field, value, source, confidence) VALUES (${input.entityKey}, 'person_email', ${out.email}, 'apollo', ${out.emailStatus === "verified" ? 0.9 : 0.6})
              ON CONFLICT (entity_key, field, source) DO UPDATE SET value = EXCLUDED.value, checked_at = now()`;
  }
  return out;
}
