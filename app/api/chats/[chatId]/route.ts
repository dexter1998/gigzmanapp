import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

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

  return NextResponse.json({ chat, messages });
}
