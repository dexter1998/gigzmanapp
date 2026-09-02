import { sql } from "@/lib/db";
import type { Block, BlogCluster } from "@/lib/blog/blocks";

export type Author = {
  slug: string; name: string; role: string | null; bio: string | null;
  avatar_url: string | null; linkedin_url: string | null;
};

export type Post = {
  slug: string; title: string; excerpt: string; meta_description: string | null;
  category: string; cluster: BlogCluster; tags: string[]; hero_variant: string | null; hero_image: string | null; hero_alt: string | null;
  read_minutes: number; body: Block[]; faqs: { q: string; a: string }[];
  featured: boolean; published_at: Date; content_updated_at: Date | null;
  author: Author;
};

const SELECT = sql`
  SELECT p.slug, p.title, p.excerpt, p.meta_description, p.category, p.cluster, p.tags,
         p.hero_variant, p.hero_image, p.hero_alt, p.read_minutes, p.body, p.faqs, p.featured,
         p.published_at, p.content_updated_at,
         json_build_object('slug', a.slug, 'name', a.name, 'role', a.role, 'bio', a.bio,
                           'avatar_url', a.avatar_url, 'linkedin_url', a.linkedin_url) AS author
  FROM blog_posts p JOIN blog_authors a ON a.slug = p.author_slug
`;

/** Published posts, newest first. `category` filters the index's pills. */
export async function listPosts(opts: { category?: string; limit?: number; offset?: number } = {}) {
  const { category, limit = 9, offset = 0 } = opts;
  const rows = await sql`
    ${SELECT}
    WHERE p.status = 'published' AND p.published_at <= now()
      ${category ? sql`AND p.category = ${category}` : sql``}
    ORDER BY p.published_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return rows as unknown as Post[];
}

export async function countPosts(category?: string): Promise<number> {
  const [row] = await sql`
    SELECT count(*)::int AS n FROM blog_posts
    WHERE status = 'published' AND published_at <= now()
      ${category ? sql`AND category = ${category}` : sql``}
  `;
  return row?.n ?? 0;
}

export async function featuredPost(): Promise<Post | null> {
  const [row] = await sql`
    ${SELECT} WHERE p.status = 'published' AND p.featured AND p.published_at <= now()
    ORDER BY p.published_at DESC LIMIT 1
  `;
  return (row as unknown as Post) ?? null;
}

export async function getPost(slug: string): Promise<Post | null> {
  const [row] = await sql`
    ${SELECT} WHERE p.slug = ${slug} AND p.status = 'published' AND p.published_at <= now()
  `;
  return (row as unknown as Post) ?? null;
}

/** Every published slug — for generateStaticParams and the sitemap. */
export async function publishedSlugs(): Promise<{ slug: string; updated: Date }[]> {
  const rows = await sql`
    SELECT slug, coalesce(content_updated_at, published_at) AS updated
    FROM blog_posts WHERE status = 'published' AND published_at <= now()
    ORDER BY published_at DESC
  `;
  return rows as unknown as { slug: string; updated: Date }[];
}

/**
 * Editorial links out of a post, plus siblings from the same cluster as a fallback.
 *
 * Google states that the number of internal links to a page, and how few clicks reach it, are
 * what it reads as relative importance — so the cluster hub is always included, and a post is
 * never left without an onward link.
 */
export async function linksFor(slug: string, cluster: BlogCluster) {
  const explicit = await sql`
    SELECT to_href, anchor, kind FROM blog_links WHERE from_slug = ${slug} ORDER BY position
  `;
  const siblings = await sql`
    SELECT slug, title FROM blog_posts
    WHERE cluster = ${cluster} AND slug != ${slug} AND status = 'published' AND published_at <= now()
    ORDER BY published_at DESC LIMIT 3
  `;
  return {
    explicit: explicit as unknown as { to_href: string; anchor: string; kind: string }[],
    siblings: siblings as unknown as { slug: string; title: string }[],
  };
}

/**
 * Where a cluster's "start here" link should point.
 *
 * The designated hub post may not be written yet — three of the four were not — so a hardcoded
 * href 404s. This returns the hub if it exists, else the cluster's oldest published post, else
 * the category listing, which always resolves.
 */
export async function hubHrefFor(cluster: BlogCluster, hubSlug: string, category: string, currentSlug: string) {
  const wanted = hubSlug.replace("/resources/", "");
  if (wanted !== currentSlug) {
    const [hub] = await sql`
      SELECT slug FROM blog_posts
      WHERE slug = ${wanted} AND status = 'published' AND published_at <= now()
    `;
    if (hub) return `/resources/${hub.slug}`;
  }

  // The cluster's own hub post is itself, or isn't written yet — send the reader to the rest of
  // the cluster rather than to a link that goes nowhere or loops back to this page.
  const [oldest] = await sql`
    SELECT slug FROM blog_posts
    WHERE cluster = ${cluster} AND slug != ${currentSlug}
      AND status = 'published' AND published_at <= now()
    ORDER BY published_at ASC LIMIT 1
  `;
  if (oldest) return `/resources/${oldest.slug}`;

  return `/resources?category=${encodeURIComponent(category)}`;
}

/** Live lead rows for an in-article card. Read-time so the figures never go stale in prose. */
export async function leadsForCity(city: string, limit = 4) {
  const rows = await sql`
    SELECT business_name, address, rating, review_count, has_website, category
    FROM leads
    WHERE city_slug = ${city} AND is_competitor = false AND has_website = false
      AND business_name IS NOT NULL
    ORDER BY review_count DESC NULLS LAST
    LIMIT ${limit}
  `;
  return rows as unknown as {
    business_name: string; address: string | null; rating: number | null;
    review_count: number | null; has_website: boolean | null; category: string | null;
  }[];
}

export async function cityLeadCount(city: string): Promise<number> {
  const [row] = await sql`
    SELECT count(*)::int AS n FROM leads
    WHERE city_slug = ${city} AND is_competitor = false AND has_website = false
  `;
  return row?.n ?? 0;
}
