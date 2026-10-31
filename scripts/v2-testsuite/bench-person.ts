/**
 * Source benchmark — capability "person_linkedin" (Exa). On businesses with a verified own website,
 * how often does Exa return a LinkedIn profile whose title names the business, and with a decision
 * role? Prints each hit so a human can spot-check it.
 * usage: npx tsx --env-file=.env.local scripts/v2-testsuite/bench-person.ts [n]
 */
import { sql } from "@/lib/db";
import { personViaExa } from "@/lib/v2/sources/person";

async function main() {
  const n = Number(process.argv[2] ?? 20);
  const rows = await sql`
    SELECT DISTINCT ON (l.id) l.id, l.place_id, l.business_name, l.category, l.city_slug
    FROM leads l WHERE l.website_url IS NOT NULL AND l.website_url !~* '(instagram|facebook|wa\\.me|linktr)' AND l.city_slug IS NOT NULL
    ORDER BY l.id LIMIT ${n}`;
  let found = 0, roleHits = 0;
  for (const r of rows) {
    const p = await personViaExa({ company: r.business_name, city: r.city_slug, entityKey: `place:${r.place_id}`, placeType: r.category });
    if (p) { found++; if (p.confidence >= 0.85) roleHits++; console.log(`  ✓ ${r.business_name.slice(0, 34).padEnd(35)} → ${p.name} · ${p.role ?? "?"} · ${p.linkedin}`); }
    else console.log(`  · ${r.business_name.slice(0, 34)}`);
  }
  const [c] = await sql`SELECT round(sum(cost_usd),3) AS c FROM v2_source_attempts WHERE capability = 'person_linkedin'`;
  console.log(`\nperson_linkedin: ${found}/${rows.length} found, ${roleHits} with a decision role · spent so far $${c.c}`);
  process.exit(0);
}
main();
