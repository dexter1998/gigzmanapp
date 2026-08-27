import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

const TITLE_WORD_COUNT = 6;

function titleFromMessage(message: string): string {
  const words = message.trim().split(/\s+/).slice(0, TITLE_WORD_COUNT);
  return words.join(" ") || "New chat";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const chats = await sql`
    SELECT id, title, updated_at FROM chats
    WHERE user_email = ${session.user.email}
    ORDER BY updated_at DESC
    LIMIT 50
  `;
  return NextResponse.json({ chats });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { firstMessage?: string };
  const title = titleFromMessage(body.firstMessage ?? "");

  const [chat] = await sql`
    INSERT INTO chats (user_email, title)
    VALUES (${session.user.email}, ${title})
    RETURNING id, title, created_at, updated_at
  `;
  return NextResponse.json({ chat });
}
