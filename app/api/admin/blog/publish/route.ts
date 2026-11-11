import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { COMPANY } from "@/lib/company";
import { validatePost } from "@/lib/blog/validate";
import { blogTokenOk, validateContext, writePost } from "@/lib/blog/publish";

/**
 * Create or update one /resources article. Used by the content agent (~/Desktop/agent-team), which
 * has no DB access: Bearer BLOG_PUBLISH_TOKEN, a JSON post, upsert by slug. There is deliberately
 * no delete — unpublishing is status "draft". `dry_run` validates and writes nothing.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!blogTokenOk(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ ok: false, errors: ["body is not valid JSON"] }, { status: 400 }); }

  const slug = (raw as { slug?: unknown })?.slug;
  const v = validatePost(raw, await validateContext(slug));
  if (!v.ok) return NextResponse.json({ ok: false, errors: v.errors, dead_links: v.deadLinks, warnings: v.warnings }, { status: 422 });

  const url = `${COMPANY.site}/resources/${v.post.slug}`;
  if ((raw as { dry_run?: boolean }).dry_run) {
    return NextResponse.json({ ok: true, dry_run: true, slug: v.post.slug, url, status: v.post.status, warnings: v.warnings, post: v.post });
  }

  const out = await writePost(v.post);
  revalidatePath(`/resources/${v.post.slug}`);
  revalidatePath("/resources");
  revalidatePath("/sitemaps/[segment]", "page");
  return NextResponse.json({ ok: true, slug: v.post.slug, url, status: out.status, created: out.created, warnings: v.warnings });
}
