import { publishedSlugs } from "@/lib/blog/db";
import type { SitemapEntry } from "@/lib/pseo/sitemap";

/**
 * The resources section's contribution to the sitemap index.
 *
 * This did not exist. Every article was crawlable and none was discoverable: /resources appeared in
 * no sitemap segment, was absent from the marketing sitemap's static list, and was linked from
 * neither the nav nor the footer — so the only inbound links were the four cluster hubs pointing at
 * each other. A closed loop with no entrance is not a crawl path, which is the whole reason the
 * section returned nothing regardless of what the articles said.
 *
 * Kept separate from the lead segments for the same reason those are split from each other: Search
 * Console reports coverage per submitted sitemap, so "9 of 11 articles indexed" is a number we can
 * act on where the same URLs folded into `pages.xml` would be invisible.
 */

export const BLOG_SEGMENT = "resources" as const;

/** The hub plus every published article. The hub is here rather than in the marketing sitemap's
 *  STATIC_PAGES because its lastmod is real — it changes whenever a post is published — and a
 *  segment that owns its children should own their index too. */
export async function blogSitemapUrls(): Promise<SitemapEntry[]> {
  const posts = await publishedSlugs();

  const newest = posts
    .map((p) => p.updated)
    .filter((d): d is Date => d instanceof Date)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return [
    { path: "/resources", lastModified: newest, changeFrequency: "weekly", priority: 0.8 },
    ...posts.map((p) => ({
      path: `/resources/${p.slug}`,
      lastModified: p.updated instanceof Date ? p.updated : undefined,
      // Articles are revised rather than rewritten, and `updated` carries the real date, so a
      // monthly hint plus an honest lastmod says more than a daily hint that is never true.
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
