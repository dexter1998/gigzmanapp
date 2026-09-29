import { COMPANY } from "@/lib/company";
import { pseoSitemapSegments } from "@/lib/pseo/sitemap";
import { BLOG_SEGMENT, blogSitemapUrls } from "@/lib/blog/sitemap";

/**
 * The sitemap index. robots.txt points here and this is the only file that needs submitting —
 * Search Console reads the children from it and reports coverage for each one separately.
 *
 * Splitting is not a crawling optimisation. Google's limit is 50,000 URLs or 50MB per file and this
 * site is at ~110 URLs; a crawler discovers exactly the same pages either way. The split exists so
 * that when indexing goes wrong we can see *which kind* of page it went wrong for.
 */
// Rendered per request, never at build: prerendering this handler made `next build`
// query the production database, which is the coupling that blocked deploys during the
// Neon outage and broke the container build entirely.
export const dynamic = "force-dynamic";

export async function GET() {
  const children: Array<{ id: string; lastModified?: Date }> = [{ id: "pages" }];

  // Listed before the lead segments because the articles are the section Google currently cannot
  // find at all. Same isolation as below: an empty or failing resources segment must not remove the
  // lead segments from the index, and a segment with no rows is omitted rather than advertised
  // empty — Search Console reads an empty urlset as an error, not as "nothing yet".
  try {
    const posts = await blogSitemapUrls();
    if (posts.length > 0) {
      const stamps = posts.map((p) => p.lastModified).filter((d): d is Date => d instanceof Date);
      children.push({
        id: BLOG_SEGMENT,
        lastModified: stamps.length ? new Date(Math.max(...stamps.map((d) => d.getTime()))) : undefined,
      });
    }
  } catch (err) {
    console.error("sitemap index: could not read published articles", err);
  }

  // A failure in the lead registry must not take the marketing sitemap down with it.
  try {
    children.push(...(await pseoSitemapSegments()));
  } catch (err) {
    console.error("sitemap index: could not read published lead pages", err);
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    children
      .map(
        (c) =>
          `  <sitemap>\n    <loc>${COMPANY.site}/sitemaps/${c.id}.xml</loc>\n` +
          (c.lastModified ? `    <lastmod>${c.lastModified.toISOString()}</lastmod>\n` : "") +
          `  </sitemap>`
      )
      .join("\n") +
    `\n</sitemapindex>\n`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=0, s-maxage=86400" },
  });
}
