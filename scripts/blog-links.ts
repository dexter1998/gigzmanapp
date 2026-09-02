/**
 * The cross-post link graph, in one place.
 *
 * Each seed script rewrites its own post's outbound links, which means a forward link added by a
 * later script gets dropped the next time the earlier one runs. Keeping every cross-post edge
 * here — and running it after any seed — makes the graph independent of the order things ran in.
 *
 * Google states that the number of internal links to a page, and how few clicks reach it, are
 * what it reads as relative importance. This file is that signal, written down.
 */
import { sql } from "@/lib/db";

const EDGES: [from: string, to: string, anchor: string][] = [
  ["how-to-find-businesses-that-need-a-website", "/resources/apollo-alternative-local-business-leads", "why Apollo cannot see them"],
  ["how-many-local-businesses-have-no-website", "/resources/which-business-types-least-likely-to-have-a-website", "the same gap broken down by business type"],
  ["which-business-types-least-likely-to-have-a-website", "/resources/how-to-sell-websites-to-restaurants", "the restaurant playbook"],
  ["which-business-types-least-likely-to-have-a-website", "/resources/how-to-sell-websites-to-coaching-centres", "the coaching centre playbook"],
  ["cold-call-script-selling-websites-local-businesses", "/resources/how-to-sell-websites-to-restaurants", "what changes when the business is a restaurant"],
  ["whatsapp-outreach-local-business-india", "/resources/how-to-sell-websites-to-coaching-centres", "reaching coaching institutes"],
  ["apollo-alternative-local-business-leads", "/resources/which-business-types-least-likely-to-have-a-website", "which categories a crawler misses most"],
  ["how-to-sell-websites-to-restaurants", "/resources/whatsapp-outreach-local-business-india", "messaging owners on WhatsApp"],
  ["how-to-sell-websites-to-coaching-centres", "/resources/cold-call-script-selling-websites-local-businesses", "the call script"],
  ["we-already-have-a-facebook-page-objection", "/resources/how-to-sell-websites-to-restaurants", "the restaurant version of this objection"],
  ["how-to-sell-websites-to-restaurants", "/resources/how-much-to-charge-for-a-website-india", "what to charge for the build"],
  ["how-to-sell-websites-to-coaching-centres", "/resources/how-much-to-charge-for-a-website-india", "pricing the build"],
  ["which-business-types-least-likely-to-have-a-website", "/resources/how-to-sell-websites-to-hardware-stores", "the hardware store playbook"],
  ["how-much-to-charge-for-a-website-india", "/resources/website-maintenance-plans-what-to-charge", "what to charge for the care plan"],
  ["apollo-alternative-local-business-leads", "/resources/how-to-sell-websites-to-hardware-stores", "a vertical no database covers"],

  /* batch 5 — vertical playbooks */
  ["which-business-types-least-likely-to-have-a-website", "/resources/how-to-sell-websites-to-tailors", "the tailoring playbook"],
  ["which-business-types-least-likely-to-have-a-website", "/resources/how-to-sell-websites-to-bakeries-and-cafes", "bakeries and cafes"],
  ["which-business-types-least-likely-to-have-a-website", "/resources/how-to-sell-websites-to-sports-academies", "sports academies and clubs"],
  ["how-to-sell-websites-to-restaurants", "/resources/how-to-sell-websites-to-bakeries-and-cafes", "the bakery and cafe version"],
  ["how-to-sell-websites-to-coaching-centres", "/resources/how-to-sell-websites-to-sports-academies", "how sports academies differ"],
  ["how-to-sell-websites-to-hardware-stores", "/resources/how-to-sell-websites-to-tailors", "another vertical nobody pitches"],
  ["how-much-to-charge-for-a-website-india", "/resources/how-to-sell-websites-to-sports-academies", "pricing against annual fees"],
  ["website-maintenance-plans-what-to-charge", "/resources/how-to-sell-websites-to-tailors", "a vertical where the care plan sells itself"],
];

async function main() {
  let added = 0;
  for (const [from, to, anchor] of EDGES) {
    const [live] = await sql`SELECT 1 AS ok FROM blog_posts WHERE slug = ${from} AND status = 'published'`;
    if (!live) continue;
    const res = await sql`
      INSERT INTO blog_links (from_slug, to_href, anchor, kind, position)
      VALUES (${from}, ${to}, ${anchor}, ${"sibling"}, ${20})
      ON CONFLICT (from_slug, to_href) DO NOTHING
      RETURNING from_slug
    `;
    if (res.length) added++;
  }
  console.log(`  cross-links: ${added} added, ${EDGES.length} total edges`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
