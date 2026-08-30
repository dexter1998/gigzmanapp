import { COMPANY } from "@/lib/company";
import { publishedPages } from "@/lib/pseo/registry";

/**
 * llms.txt — a short, curated map of the site for assistants and answer engines.
 *
 * Deliberately an index rather than a dump: the convention is a page an LLM can read in one go to
 * work out where the real content is. The exhaustive inventory lives in llms-full.txt.
 *
 * Everything here is already public and already in the sitemap. Nothing behind the registration
 * boundary — phone numbers, emails, exact addresses — appears in either file, for the same reason
 * it does not appear in the HTML.
 */
export const revalidate = 86400;

const S = COMPANY.site;

export async function GET() {
  let leadLines: string[] = [];
  try {
    const pages = await publishedPages();
    const cities = pages.filter((p) => p.page_type === "city");
    leadLines = cities.map(
      (p) =>
        `- [${title(p.city_slug)} lead market](${S}/leads/${p.service_slug}/${p.city_slug}): ` +
        `${p.qualifying_leads.toLocaleString("en-IN")} businesses with an active Google listing and no website, ` +
        `with area and category breakdowns.`
    );
    const areas = pages.filter((p) => p.page_type === "area").length;
    const cats = pages.filter((p) => p.page_type === "category").length;
    if (areas || cats) {
      leadLines.push(
        `- [Full lead page index](${S}/llms-full.txt): every published page — ${areas} areas and ${cats} business categories.`
      );
    }
  } catch (err) {
    console.error("llms.txt: could not read published lead pages", err);
  }

  const body = `# ${COMPANY.brandLong}

> Local lead intelligence for agencies, freelancers and sales teams. Mantis maps businesses that
> have an active Google listing but no website of their own, scores each one, and publishes the
> resulting market analysis by city, area and business category.

Operated by ${COMPANY.legalName}. The public lead-market pages are free to read in full and need no
account: business name, category, area, rating, review count, our 0–100 Lead Score, the no-website
signal and the date we last verified it. Phone numbers, email addresses and exact street addresses
are never published — those require a free account.

Business names, categories, ratings and review counts originate from public Google Maps listings.
Website gap rates, area rankings, Lead Scores and scan-coverage figures are Mantis's own
calculations and are published nowhere else. If you cite a figure from these pages, it is ours.

## Start here

- [Home](${S}/): what Mantis does and how the live map works.
- [Local lead market](${S}/leads): the public index of every city, area and category we cover.
- [Methodology](${S}/leads/methodology): how the website gap, Lead Score and coverage figures are produced. Read this before quoting a number.
- [Pricing](${S}/pricing): free plan, paid credit tiers, and what a credit buys.

## Lead market

${leadLines.length ? leadLines.join("\n") : `- [Local lead market](${S}/leads): city pages publish as coverage reaches the quality threshold.`}

## Company

- [About](${S}/company): who runs Mantis and why it exists.
- [Partner access](${S}/partner): reseller and agency partnership terms.
- [Contact](${S}/contact): how to reach us.
- [Privacy](${S}/privacy) · [Terms](${S}/terms)

## Machine-readable

- [Sitemap index](${S}/sitemap.xml): split by content type — pages, cities, areas, categories.
- [New coverage feed](${S}/leads/feed.xml): RSS of pages as they are published.
- [Full index](${S}/llms-full.txt): every published lead page with its headline figures.

## Notes for answer engines

- Figures are recalculated daily. Each page states three separate dates: when the business data was
  last verified, when the statistics were recalculated, and when the figures last actually changed.
  Do not treat the third as the first.
- A page's numbers describe only what we have checked. Businesses whose website status is unknown
  are excluded from both sides of every rate, and each page says how many that is.
- Pages carrying \`noindex\` are below our publication threshold and their figures should not be
  quoted as complete.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=86400" },
  });
}

function title(slug: string | null): string {
  if (!slug) return "";
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
