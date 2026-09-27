import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { appendMessage, messagesFor, MAX_MESSAGE_CHARS } from "@/lib/widget/store";
import { notifyVisitor } from "@/lib/widget/notify";

/**
 * The founder's side of a widget conversation.
 *
 * This is the one admin-authenticated route in the codebase that writes. /admin is read-only by
 * design — "a leaked admin session can look but not touch" — and that rule is worth keeping, so
 * the exception is deliberately the narrowest possible one: it appends a message to a thread that
 * already exists. It cannot delete, cannot edit history, cannot reach user_profiles, credits or
 * any other table. The worst a stolen session does here is send a rude reply to a stranger.
 *
 * It also lives outside the /admin route group rather than inside it, so the group itself stays
 * mutation-free and nobody reading that layout's comment is misled.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  await requireAdmin();
  const { threadId } = await params;

  const [thread] = await sql`
    SELECT t.*, c.is_registered_user, c.thread_count AS contact_thread_count
      FROM widget_threads t
      LEFT JOIN widget_contacts c ON c.id = t.contact_id
     WHERE t.id = ${threadId}
  `;
  if (!thread) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const messages = await messagesFor(threadId);
  // Opening a thread in the inbox is reading it — this is what stops the "needs a reply" count
  // from including conversations already dealt with.
  await sql`UPDATE widget_threads SET admin_last_read_at = now() WHERE id = ${threadId}`;

  return NextResponse.json({ thread, messages });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  await requireAdmin();
  const { threadId } = await params;

  const { message } = (await req.json()) as { message?: string };
  const body = (message ?? "").trim();
  if (!body) return NextResponse.json({ error: "Write a reply first." }, { status: 400 });

  const [thread] = await sql`SELECT id FROM widget_threads WHERE id = ${threadId}`;
  if (!thread) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const saved = await appendMessage(threadId, "admin", body.slice(0, MAX_MESSAGE_CHARS));
  await notifyVisitor(threadId);
  return NextResponse.json({ message: saved });
}
