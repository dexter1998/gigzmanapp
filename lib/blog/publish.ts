import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { sql } from "@/lib/db";
import { BLOG_CLUSTERS } from "@/lib/blog/blocks";
import type { PublishInput, ValidateContext } from "@/lib/blog/validate";

/**
 * Server side of /api/admin/blog/*: the bearer-token check, the context the validator needs, and
 * the one write. Kept out of the route files because a route module may only export handlers.
 */

/** `Authorization: Bearer <BLOG_PUBLISH_TOKEN>`. Unset token = the API is off, not open. */
export function blogTokenOk(req: Request): boolean {
  const want = process.env.BLOG_PUBLISH_TOKEN ?? "";
  if (want.length < 32) return false;
  const got = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "")?.[1]?.trim() ?? "";
  // Hashing both sides first gives equal-length buffers, so timingSafeEqual never throws and the
  // comparison time does not depend on the guessed token's length.
  const a = crypto.createHash("sha256").update(got).digest();
  const b = crypto.createHash("sha256").update(want).digest();
  return got.length > 0 && crypto.timingSafeEqual(a, b);
}

export async function validateContext(slug: unknown): Promise<ValidateContext> {
  const rows = await sql`SELECT slug FROM blog_posts WHERE status = 'published' AND published_at <= now()`;
  const published = new Set(rows.map((r) => r.slug as string));
  if (typeof slug === "string") published.add(slug);
  const root = path.join(process.cwd(), "public");
  return {
    published,
    fileExists: (p) => {
      const full = path.join(root, p);
      return full.startsWith(root + path.sep) && fs.existsSync(full);
    },
  };
}

/**
 * Upsert by slug and replace this post's own outbound links, in one transaction.
 *
 * published_at is set once, the first time the post goes out (two minutes back, as the seed
 * scripts do, so `published_at <= now()` holds on the very next request). content_updated_at only
 * moves when an already-published post's words actually change — the sitemap's lastmod is read
 * from it, and a lastmod that moves without an edit is one Google learns to ignore.
 */
export async function writePost(p: PublishInput): Promise<{ created: boolean; status: string }> {
  return sql.begin(async (tx) => {
    const json = (v: unknown) => tx.json(v as Parameters<typeof tx.json>[0]);
    const [row] = await tx`
      INSERT INTO blog_posts (slug, title, excerpt, meta_description, category, cluster, tags, author_slug,
        hero_variant, hero_image, hero_alt, read_minutes, body, faqs, status, featured, published_at)
      VALUES (${p.slug}, ${p.title}, ${p.excerpt}, ${p.meta_description}, ${p.category}, ${p.cluster}, ${p.tags}, ${"tarun"},
        ${p.hero_variant}, ${p.hero_image}, ${p.hero_alt}, ${p.read_minutes}, ${json(p.body)}, ${json(p.faqs)}, ${p.status}, false,
        ${p.status === "published" ? sql`now() - interval '2 minutes'` : null})
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, meta_description = EXCLUDED.meta_description,
        category = EXCLUDED.category, cluster = EXCLUDED.cluster, tags = EXCLUDED.tags,
        hero_variant = EXCLUDED.hero_variant, hero_image = EXCLUDED.hero_image, hero_alt = EXCLUDED.hero_alt,
        read_minutes = EXCLUDED.read_minutes, body = EXCLUDED.body, faqs = EXCLUDED.faqs, status = EXCLUDED.status,
        published_at = CASE WHEN EXCLUDED.status = 'published' AND blog_posts.published_at IS NULL
                            THEN now() - interval '2 minutes' ELSE blog_posts.published_at END,
        content_updated_at = CASE WHEN blog_posts.published_at IS NOT NULL AND blog_posts.status = 'published' AND (
                               blog_posts.body IS DISTINCT FROM EXCLUDED.body OR blog_posts.title IS DISTINCT FROM EXCLUDED.title
                               OR blog_posts.excerpt IS DISTINCT FROM EXCLUDED.excerpt OR blog_posts.faqs IS DISTINCT FROM EXCLUDED.faqs)
                             THEN now() ELSE blog_posts.content_updated_at END,
        updated_at = now()
      RETURNING (xmax = 0) AS created, status`;
    // Only this post's outbound rows — other posts' links into it are theirs to keep.
    await tx`DELETE FROM blog_links WHERE from_slug = ${p.slug}`;
    for (const [i, [href, anchor]] of p.links.entries()) {
      const kind = href === BLOG_CLUSTERS[p.cluster].hub ? "hub" : href.startsWith("/leads") ? "lead_page" : href.startsWith("/") ? "sibling" : "external";
      await tx`INSERT INTO blog_links (from_slug, to_href, anchor, kind, position)
               VALUES (${p.slug}, ${href}, ${anchor}, ${kind}, ${i}) ON CONFLICT (from_slug, to_href) DO NOTHING`;
    }
    return { created: !!row?.created, status: String(row?.status) };
  });
}

/** What GET returns: the stored post in the same shape the publish body takes. */
export async function readPost(slug: string) {
  const [p] = await sql`
    SELECT slug, title, excerpt, meta_description, category, cluster, tags, read_minutes, body, faqs,
           hero_image, hero_alt, hero_variant, status, published_at, content_updated_at, updated_at
    FROM blog_posts WHERE slug = ${slug}`;
  if (!p) return null;
  const links = await sql`SELECT to_href, anchor FROM blog_links WHERE from_slug = ${slug} ORDER BY position`;
  return { ...p, links: links.map((l) => [l.to_href, l.anchor]) };
}
