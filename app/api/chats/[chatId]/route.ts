import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { publicMessage } from "@/lib/v2/public";

export async function GET(_req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { chatId } = await params;

  const [chat] = await sql`
    SELECT id, title, created_at, updated_at FROM chats
    WHERE id = ${chatId} AND user_email = ${session.user.email}
  `;
  if (!chat) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const messages = await sql`
    SELECT id, role, content, intent, created_at FROM chat_messages
    WHERE chat_id = ${chatId}
    ORDER BY created_at ASC
  `;

  return NextResponse.json({ chat, messages: messages.map(publicMessage) });
}

const TITLE_MAX = 80;

/**
 * Sidebar rename / pin. Body: {title?: string} (trimmed, 1-80 chars) and/or {pinned?: boolean}.
 * Owner-checked like GET. Neither change bumps updated_at, so renaming or pinning a chat does not
 * reorder Recent (ChatGPT behaves the same way).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { chatId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(chatId)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { title?: unknown; pinned?: unknown } | null;
  if (!body || (body.title === undefined && body.pinned === undefined)) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  let title: string | null = null;
  if (body.title !== undefined) {
    if (typeof body.title !== "string") return NextResponse.json({ error: "invalid_title" }, { status: 400 });
    title = body.title.replace(/\s+/g, " ").trim();
    if (title.length < 1 || title.length > TITLE_MAX) {
      return NextResponse.json({ error: "invalid_title", max: TITLE_MAX }, { status: 400 });
    }
  }
  let pinned: boolean | null = null;
  if (body.pinned !== undefined) {
    if (typeof body.pinned !== "boolean") return NextResponse.json({ error: "invalid_pinned" }, { status: 400 });
    pinned = body.pinned;
  }

  const [chat] = await sql`
    UPDATE chats SET
      title = COALESCE(${title}::text, title),
      pinned_at = CASE
        WHEN ${pinned}::boolean IS NULL THEN pinned_at
        WHEN ${pinned}::boolean THEN COALESCE(pinned_at, now())
        ELSE NULL
      END
    WHERE id = ${chatId} AND user_email = ${session.user.email}
    RETURNING id, title, updated_at, pinned_at
  `;
  if (!chat) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ chat });
}
