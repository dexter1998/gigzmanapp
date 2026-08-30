import { COMPANY } from "@/lib/company";
import { pseoSitemapSegments } from "@/lib/pseo/sitemap";

/**
 * The sitemap index. robots.txt points here and this is the only file that needs submitting —
 * Search Console reads the children from it and reports coverage for each one separately.
 *
 * Splitting is not a crawling optimisation. Google's limit is 50,000 URLs or 50MB per file and this
 * site is at ~110 URLs; a crawler discovers exactly the same pages either way. The split exists so
 * that when indexing goes wrong we can see *which kind* of page it went wrong for.
 */
export const revalidate = 86400;

export async function GET() {
  const children: Array<{ id: string; lastModified?: Date }> = [{ id: "pages" }];

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
