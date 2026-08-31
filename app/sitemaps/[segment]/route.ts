import { notFound } from "next/navigation";
import { COMPANY } from "@/lib/company";
import { isPseoSegment, pseoSitemapUrls, PSEO_SEGMENTS, type SitemapEntry } from "@/lib/pseo/sitemap";

/**
 * One `<urlset>` per content type, listed by the index at /sitemap.xml.
 *
 * `lastmod` is only ever emitted where a real change date exists. The marketing pages don't track
 * one, so they carry none — stamping today's date on a page that hasn't changed is how a sitemap's
 * lastmod earns being ignored, and an absent lastmod is honest where a fabricated one is not.
 */
// Rendered per request, never at build: prerendering this handler made `next build`
// query the production database, which is the coupling that blocked deploys during the
// Neon outage and broke the container build entirely.
export const dynamic = "force-dynamic";
export const dynamicParams = false;

const STATIC_PAGES: SitemapEntry[] = [
  { path: "", changeFrequency: "weekly", priority: 1.0 },
  { path: "/leads", changeFrequency: "daily", priority: 0.9 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/partner", changeFrequency: "monthly", priority: 0.8 },
  { path: "/company", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/leads/methodology", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
];

export function generateStaticParams() {
  return [{ segment: "pages.xml" }, ...PSEO_SEGMENTS.map((id) => ({ segment: `${id}.xml` }))];
}

export async function GET(_req: Request, { params }: { params: Promise<{ segment: string }> }) {
  const { segment } = await params;
  const id = segment.replace(/\.xml$/, "");

  let entries: SitemapEntry[];
  if (id === "pages") entries = STATIC_PAGES;
  else if (isPseoSegment(id)) entries = await pseoSitemapUrls(id);
  else notFound();

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries
      .map(
        (e) =>
          `  <url>\n    <loc>${COMPANY.site}${e.path}</loc>\n` +
          (e.lastModified ? `    <lastmod>${e.lastModified.toISOString()}</lastmod>\n` : "") +
          `    <changefreq>${e.changeFrequency}</changefreq>\n` +
          `    <priority>${e.priority}</priority>\n  </url>`
      )
      .join("\n") +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=0, s-maxage=86400" },
  });
}
