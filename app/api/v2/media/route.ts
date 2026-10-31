import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { v2User, isResp } from "../outreach/_auth";

const MAX_BYTES = 2 * 1024 * 1024;
const OK_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

/** Upload an image for a template (email body image / WhatsApp header). */
export async function POST(req: NextRequest) {
  const u = await v2User(); if (isResp(u)) return u;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file." }, { status: 400 });
  if (!OK_TYPES.includes(file.type)) return NextResponse.json({ error: "PNG, JPG, GIF or WebP only." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Images up to 2 MB — larger ones land in spam and load slowly." }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const [r] = await sql`INSERT INTO v2_media (user_email, name, mime, bytes, size) VALUES (${u.email}, ${file.name.slice(0, 120)}, ${file.type}, ${bytes}, ${file.size}) RETURNING id`;
  return NextResponse.json({ id: r.id, url: `/api/v2/media/${r.id}`, name: file.name, size: file.size });
}
