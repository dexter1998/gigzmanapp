import { sql } from "@/lib/db";

/** The city a user works in: their last run's area, else their main business profile's first area. */
export async function userCity(email: string): Promise<string | null> {
  const [run] = await sql`
    SELECT plan->>'areaText' AS a FROM v2_runs
    WHERE user_email = ${email} AND plan->>'areaText' IS NOT NULL AND plan->>'areaText' NOT IN ('', 'India')
    ORDER BY created_at DESC LIMIT 1`;
  if (typeof run?.a === "string" && run.a.trim()) return run.a.trim();
  const [bp] = await sql`
    SELECT target_areas FROM v2_business_profiles WHERE user_email = ${email}
    ORDER BY is_default DESC, last_used_at DESC NULLS LAST, created_at DESC LIMIT 1`;
  const areas = Array.isArray(bp?.target_areas) ? (bp.target_areas as unknown[]) : [];
  return typeof areas[0] === "string" && areas[0].trim() ? areas[0].trim() : null;
}

/** "Dentists who need a website" → "Dentists who need a website in Pune" — unless it already names a
 *  place or says near me. */
export function withCity(prompt: string, city: string | null): string {
  if (!city || /\b(in|near|around|across)\s+[A-Z]|\bnear\s*me\b|\bnearby\b/.test(prompt)) return prompt;
  return `${prompt.replace(/[.\s]+$/, "")} in ${city}`;
}
