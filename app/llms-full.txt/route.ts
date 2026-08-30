import { COMPANY } from "@/lib/company";
import { publishedPages } from "@/lib/pseo/registry";
import { areaDisplayName } from "@/lib/pseo/locations";
import { formatCategory } from "@/lib/categories";

/**
 * llms-full.txt — the complete published inventory, with each page's headline figures inline.
 *
 * The point of the "full" variant is that an assistant can answer "how many salons in Gurgaon have
 * no website" without fetching a page. So each line carries the count and the gap rate rather than
 * just a URL, and the definitions an answer would need are stated once at the top.
 *
 * Only `published` pages appear. Pages held below the quality threshold are excluded for the same
 * reason they are absent from the sitemap: their figures are not complete enough to quote.
 */
export const revalidate = 86400;

const S = COMPANY.site;

export async function GET() {
  const cities: string[] = [];
  const areas: string[] = [];
  const categories: string[] = [];
  let counted = 0;

  try {
    const pages = await publishedPages();
    counted = pages.length;

    const line = (path: string, label: string, p: (typeof pages)[number]) => {
      const stats = p.stats as Record<string, unknown>;
      const gap = typeof stats.gapRate === "number" ? ` · ${Math.round(stats.gapRate * 100)}% of those checked` : "";
      const checked = typeof stats.checked === "number" ? ` of ${stats.checked.toLocaleString("en-IN")} checked` : "";
      return `- [${label}](${S}${path}): ${p.qualifying_leads.toLocaleString("en-IN")} with no website${checked}${gap}.`;
    };

    for (const p of pages) {
      const base = `/leads/${p.service_slug}/${p.city_slug}`;
      if (p.page_type === "city") {
        cities.push(line(base, `${titleCase(p.city_slug)} — all businesses with no website`, p));
      } else if (p.page_type === "area" && p.area_slug) {
        areas.push(line(`${base}/areas/${p.area_slug}`, `${areaDisplayName(p.area_slug)}, ${titleCase(p.city_slug)}`, p));
      } else if (p.page_type === "category" && p.category_slug) {
        const label = formatCategory(p.category_slug) ?? p.category_slug;
        categories.push(line(`${base}/categories/${p.category_slug}`, `${label} in ${titleCase(p.city_slug)}`, p));
      }
    }
    areas.sort();
    categories.sort();
  } catch (err) {
    console.error("llms-full.txt: could not read published lead pages", err);
  }

  const body = `# ${COMPANY.brandLong} — full published index

> Every public lead-market page, with its headline figures. ${counted} pages. Regenerated daily.
> The short version is at ${S}/llms.txt.

## Definitions

- **No website**: the business has an active Google Maps listing and we could not find a website of
  its own. We record when we checked. Businesses we have not checked either way are excluded from
  both the numerator and the denominator of every rate below, never counted as having no site.
- **Website gap rate**: businesses with no website divided by businesses we have checked in that
  slice. It is not a share of all businesses that exist there.
- **Lead Score**: a deterministic 0–100 score from rating, review volume, business category and
  listing completeness. The same function the Mantis product uses. Method: ${S}/leads/methodology
- **High intent**: 20 or more reviews at 4.0 stars or better, and still no website.
- **Coverage**: how many map cells covering the area have been searched to exhaustion. A count
  without coverage is a sample; each page states its own.

## What is not here

Phone numbers, email addresses, exact street addresses and Google place IDs are not published on any
of these pages and are not in this file. They are what a Mantis account provides.

## Cities

${cities.length ? cities.join("\n") : "- None published yet."}

## Areas

${areas.length ? areas.join("\n") : "- None published yet."}

## Business categories

${categories.length ? categories.join("\n") : "- None published yet."}

## Reference

- [Methodology](${S}/leads/methodology)
- [Sitemap index](${S}/sitemap.xml)
- [New coverage feed](${S}/leads/feed.xml)
- Operated by ${COMPANY.legalName}, ${COMPANY.address.city}, ${COMPANY.address.region}, India.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=86400" },
  });
}

function titleCase(slug: string | null): string {
  if (!slug) return "";
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
