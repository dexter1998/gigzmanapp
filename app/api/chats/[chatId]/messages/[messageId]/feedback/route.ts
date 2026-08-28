import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

// Stores a thumbs up/down against a message, scoped to a chat the caller owns. Kept as a single
// nullable column on chat_messages (see db/schema.sql) rather than a separate ledger — captured
// for later model/prompt tuning, not acted on live.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ chatId: string; messageId: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { chatId, messageId } = await params;

  const body = (await req.json()) as { feedback?: "up" | "down" | null };
  const feedback = body.feedback === "up" || body.feedback === "down" ? body.feedback : null;

  const [chat] = await sql`SELECT id FROM chats WHERE id = ${chatId} AND user_email = ${session.user.email}`;
  if (!chat) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await sql`UPDATE chat_messages SET feedback = ${feedback} WHERE id = ${messageId} AND chat_id = ${chatId}`;
  return NextResponse.json({ ok: true });
}
