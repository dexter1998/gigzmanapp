import { COMPANY } from "@/lib/company";
import { publishedPages } from "@/lib/pseo/registry";
import { CITY_BY_SLUG, areaDisplayName } from "@/lib/pseo/locations";
import { formatCategory } from "@/lib/categories";

/**
 * A feed of pages as they become published.
 *
 * Carries no ranking weight — its value is that a sitemap is a complete inventory while a feed is a
 * rolling record of what just changed, and crawlers re-read a small feed far more readily than they
 * re-crawl a large sitemap. Pages here are promoted automatically as their data crosses the
 * threshold, so that stream of promotions is exactly what a feed is for. It also gives a person a
 * way to follow new coverage.
 *
 * pubDate is when a page was genuinely first published, never when this was generated.
 */
export const revalidate = 3600;

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

export async function GET() {
  const pages = (await publishedPages())
    .filter((p) => p.first_published_at)
    .sort((a, b) => b.first_published_at!.getTime() - a.first_published_at!.getTime())
    .slice(0, 50);

  const items = pages
    .map((p) => {
      const city = p.city_slug ? CITY_BY_SLUG.get(p.city_slug)?.name ?? p.city_slug : "";
      const where =
        p.page_type === "area"
          ? `${areaDisplayName(p.area_slug!)}, ${city}`
          : p.page_type === "category"
            ? `${formatCategory(p.category_slug!) ?? p.category_slug} in ${city}`
            : city;
      const path =
        p.page_type === "city"
          ? `/leads/${p.service_slug}/${p.city_slug}`
          : p.page_type === "area"
            ? `/leads/${p.service_slug}/${p.city_slug}/areas/${p.area_slug}`
            : `/leads/${p.service_slug}/${p.city_slug}/categories/${p.category_slug}`;
      const url = `${COMPANY.site}${path}`;
      return `    <item>
      <title>${escapeXml(`${p.qualifying_leads} businesses with no website — ${where}`)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${p.first_published_at!.toUTCString()}</pubDate>
      <description>${escapeXml(`${p.qualifying_leads} businesses mapped in ${where} have an active Google listing and no website.`)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Mantis — local lead market</title>
    <link>${COMPANY.site}/leads</link>
    <atom:link href="${COMPANY.site}/leads/feed.xml" rel="self" type="application/rss+xml"/>
    <description>New areas and categories as Mantis publishes coverage for them.</description>
    <language>en</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
