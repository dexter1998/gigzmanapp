import { NextResponse } from "next/server";
import { SLUG_RE } from "@/lib/blog/validate";
import { blogTokenOk, readPost } from "@/lib/blog/publish";

/** Read one article back, draft or published, in the shape POST /api/admin/blog/publish takes. */
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!blogTokenOk(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) return NextResponse.json({ ok: false, error: "bad slug" }, { status: 400 });
  const post = await readPost(slug);
  if (!post) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, post });
}
