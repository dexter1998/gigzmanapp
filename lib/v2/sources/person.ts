/**
 * Capability: the person behind a business (founder / owner / director) and their LinkedIn.
 * Source: Exa search for "<company> <city> founder linkedin". A LinkedIn profile title reads
 * "Name - Role - Company | LinkedIn"; a hit is kept only when the company in that title (or the
 * snippet) matches the business. Recorded in v2_source_attempts and shared via v2_facts.
 */

import { sql } from "@/lib/db";
import { exaSearch } from "./exa";
import { nameTokens } from "./website";

export type PersonFound = { name: string; role: string | null; linkedin: string; confidence: number } | null;

const ROLE = /(founder|co-?founder|owner|proprietor|director|ceo|managing|partner|principal|head|chief|president|md\b|cto|coo|cmo)/i;

export function parseLinkedinTitle(title: string): { name: string; role: string | null; company: string | null } | null {
  const t = title.replace(/\s*\|\s*LinkedIn.*$/i, "").trim();
  const parts = t.split(/\s+[-–|]\s+/).map((x) => x.trim()).filter(Boolean);
  if (!parts.length || parts[0].split(/\s+/).length > 5) return null;
  return { name: parts[0], role: parts[1] ?? null, company: parts.slice(2).join(" - ") || null };
}

export async function personViaExa(input: { company: string; city: string | null; entityKey: string; placeType: string | null }): Promise<PersonFound> {
  const q = [input.company, input.city, "founder owner linkedin"].filter(Boolean).join(" ");
  const toks = nameTokens(input.company);
  const t0 = Date.now();
  let cost = 0;
  let found: PersonFound = null;
  try {
    const r = await exaSearch(q, { highlights: true });
    cost = r.costUsd;
    for (const x of r.results) {
      if (!/linkedin\.com\/in\//i.test(x.url) || !x.title) continue;
      const p = parseLinkedinTitle(x.title);
      if (!p) continue;
      const text = `${p.company ?? ""} ${p.role ?? ""} ${(x.highlights ?? []).join(" ")}`.toLowerCase();
      const hits = toks.filter((w) => text.includes(w)).length;
      // Company must appear in the profile's own title/snippet; a namesake elsewhere is not enough.
      if (toks.length && hits / toks.length >= 0.6) {
        found = { name: p.name, role: p.role && ROLE.test(p.role) ? p.role : p.role, linkedin: x.url.split("?")[0], confidence: ROLE.test(p.role ?? "") ? 0.85 : 0.6 };
        break;
      }
    }
  } finally {
    await sql`INSERT INTO v2_source_attempts (source, capability, place_type, entity_key, ok, value, cost_usd, ms)
              VALUES ('exa', 'person_linkedin', ${input.placeType}, ${input.entityKey}, ${!!found}, ${found?.linkedin ?? null}, ${cost}, ${Date.now() - t0})`;
  }
  if (found) {
    for (const [field, value] of [["person_name", found.name], ["person_role", found.role], ["person_linkedin", found.linkedin]] as const) {
      if (value) await sql`INSERT INTO v2_facts (entity_key, field, value, source, confidence) VALUES (${input.entityKey}, ${field}, ${value}, 'exa', ${found.confidence})
                           ON CONFLICT (entity_key, field, source) DO UPDATE SET value = EXCLUDED.value, checked_at = now()`;
    }
  }
  return found;
}
