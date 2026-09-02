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

  /* batch 6 — the ranking hub and the operations posts */
  ["how-many-local-businesses-have-no-website", "/resources/which-local-verticals-actually-pay-for-a-website", "which of those verticals can actually pay"],
  ["which-business-types-least-likely-to-have-a-website", "/resources/which-local-verticals-actually-pay-for-a-website", "the same categories ranked by what they pay"],
  ["how-to-find-businesses-that-need-a-website", "/resources/qualifying-a-local-lead-before-you-call", "qualifying what you find"],
  ["cold-call-script-selling-websites-local-businesses", "/resources/handling-its-too-expensive-without-discounting", "when they say it is too expensive"],
  ["we-already-have-a-facebook-page-objection", "/resources/handling-its-too-expensive-without-discounting", "the price objection"],
  ["how-much-to-charge-for-a-website-india", "/resources/handling-its-too-expensive-without-discounting", "defending the number without discounting"],
  ["how-to-sell-websites-to-restaurants", "/resources/which-local-verticals-actually-pay-for-a-website", "how restaurants rank against other verticals"],
  ["whatsapp-outreach-local-business-india", "/resources/qualifying-a-local-lead-before-you-call", "checks to run before you message"],

  /* batch 7 — data engineering, free methods, territory */
  ["apollo-alternative-local-business-leads", "/resources/scraping-google-maps-for-leads-what-breaks", "what building this yourself involves"],
  ["how-to-find-businesses-that-need-a-website", "/resources/free-ways-to-find-businesses-without-websites", "the free methods, costed in hours"],
  ["how-many-local-businesses-have-no-website", "/resources/scraping-google-maps-for-leads-what-breaks", "how the index is collected"],
  ["qualifying-a-local-lead-before-you-call", "/resources/territory-planning-splitting-a-city-between-reps", "splitting the list between people"],
  ["which-local-verticals-actually-pay-for-a-website", "/resources/territory-planning-splitting-a-city-between-reps", "turning a vertical into a territory"],
  ["how-to-find-businesses-that-need-a-website", "/resources/scraping-google-maps-for-leads-what-breaks", "why the data is harder than the search"],

  /* batch 8 — the invisible prospect, channels, the hardest objection */
  ["we-already-have-a-facebook-page-objection", "/resources/why-facebook-only-businesses-are-your-best-prospects", "why these are your best prospects"],
  ["qualifying-a-local-lead-before-you-call", "/resources/why-facebook-only-businesses-are-your-best-prospects", "the prospects your filter hides"],
  ["whatsapp-outreach-local-business-india", "/resources/call-whatsapp-or-walk-in-indian-smbs", "choosing the channel first"],
  ["cold-call-script-selling-websites-local-businesses", "/resources/call-whatsapp-or-walk-in-indian-smbs", "whether to call at all"],
  ["cold-call-script-selling-websites-local-businesses", "/resources/handling-we-dont-need-a-website", "the hardest objection on the call"],
  ["handling-its-too-expensive-without-discounting", "/resources/handling-we-dont-need-a-website", "the other objection worth diagnosing"],
  ["territory-planning-splitting-a-city-between-reps", "/resources/call-whatsapp-or-walk-in-indian-smbs", "why clustering matters for walk-ins"],

  /* batch 9 — the tools and buying-decision cluster */
  ["apollo-alternative-local-business-leads", "/resources/do-you-need-an-email-finder-for-local-businesses", "why email finders return blanks here"],
  ["free-ways-to-find-businesses-without-websites", "/resources/should-you-buy-web-design-leads", "when paying for leads makes sense"],
  ["free-ways-to-find-businesses-without-websites", "/resources/justdial-indiamart-as-lead-sources", "using directories as a prospect list"],
  ["scraping-google-maps-for-leads-what-breaks", "/resources/should-you-buy-web-design-leads", "buying it instead of building it"],
  ["how-much-to-charge-for-a-website-india", "/resources/should-you-buy-web-design-leads", "the ticket a lead price has to fit"],
  ["call-whatsapp-or-walk-in-indian-smbs", "/resources/do-you-need-an-email-finder-for-local-businesses", "why email is not on this list"],
  ["why-facebook-only-businesses-are-your-best-prospects", "/resources/justdial-indiamart-as-lead-sources", "the paid version of the same objection"],

  /* batch 10 — pricing model, getting paid, closing */
  ["how-much-to-charge-for-a-website-india", "/resources/hourly-project-or-value-pricing-model", "choosing the model behind the number"],
  ["how-much-to-charge-for-a-website-india", "/resources/how-to-take-advance-payment-from-indian-clients", "collecting what you quoted"],
  ["website-maintenance-plans-what-to-charge", "/resources/hourly-project-or-value-pricing-model", "why the monthly matters more than the model"],
  ["handling-its-too-expensive-without-discounting", "/resources/the-free-mockup-play-does-it-still-close", "making it concrete instead of cheaper"],
  ["cold-call-script-selling-websites-local-businesses", "/resources/the-free-mockup-play-does-it-still-close", "the mockup close"],
  ["handling-we-dont-need-a-website", "/resources/the-free-mockup-play-does-it-still-close", "showing rather than arguing"],
  ["call-whatsapp-or-walk-in-indian-smbs", "/resources/how-to-take-advance-payment-from-indian-clients", "closing in the room"],

  /* batch 11 — the India data reports */
  ["how-many-local-businesses-have-no-website", "/resources/which-indian-cities-have-the-biggest-website-gap", "the same measurement by Indian city"],
  ["how-many-local-businesses-have-no-website", "/resources/do-businesses-without-websites-get-fewer-reviews", "what else the listings show"],
  ["which-business-types-least-likely-to-have-a-website", "/resources/do-businesses-without-websites-get-fewer-reviews", "the review finding"],
  ["qualifying-a-local-lead-before-you-call", "/resources/do-businesses-without-websites-get-fewer-reviews", "why the review filter works"],
  ["territory-planning-splitting-a-city-between-reps", "/resources/which-indian-cities-have-the-biggest-website-gap", "picking the city first"],
  ["which-local-verticals-actually-pay-for-a-website", "/resources/tier-1-vs-tier-2-india-website-gap", "how the verticals split by city tier"],

  /* batch 12 — the agency-building cluster */
  ["how-to-find-businesses-that-need-a-website", "/resources/your-first-10-web-design-clients", "the plan for the first ten"],
  ["free-ways-to-find-businesses-without-websites", "/resources/your-first-10-web-design-clients", "what to do with the first list"],
  ["how-much-to-charge-for-a-website-india", "/resources/how-to-start-a-web-design-agency-in-india", "starting from nothing"],
  ["which-local-verticals-actually-pay-for-a-website", "/resources/should-you-niche-down-what-the-data-says", "how big one vertical really is"],
  ["territory-planning-splitting-a-city-between-reps", "/resources/should-you-niche-down-what-the-data-says", "how large a category actually is"],
  ["hourly-project-or-value-pricing-model", "/resources/your-first-10-web-design-clients", "pricing the first ten"],
  ["qualifying-a-local-lead-before-you-call", "/resources/how-to-start-a-web-design-agency-in-india", "starting out"],

  /* batch 13 — the international cluster */
  ["how-many-local-businesses-have-no-website", "/resources/india-vs-uk-vs-australia-website-adoption", "the three markets compared"],
  ["which-business-types-least-likely-to-have-a-website", "/resources/india-vs-uk-vs-australia-website-adoption", "the same categories in developed markets"],
  ["how-many-local-businesses-have-no-website", "/resources/the-real-size-of-the-indian-web-design-market", "what the Indian pool is worth"],
  ["how-to-start-a-web-design-agency-in-india", "/resources/how-indian-agencies-win-uk-and-australian-clients", "selling overseas instead"],
  ["should-you-niche-down-what-the-data-says", "/resources/how-indian-agencies-win-uk-and-australian-clients", "why niching works overseas"],
  ["tier-1-vs-tier-2-india-website-gap", "/resources/the-real-size-of-the-indian-web-design-market", "sizing the pool"],
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
