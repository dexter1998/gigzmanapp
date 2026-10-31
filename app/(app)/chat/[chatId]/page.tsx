import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { ChatThread, type AssistantIntent } from "@/components/chat/ChatThread";
import { isV2Email } from "@/lib/v2";
import { publicMessage } from "@/lib/v2/public";

export const metadata = { title: "Chat" };

export default async function ChatThreadPage({ params }: { params: Promise<{ chatId: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return notFound();
  const { chatId } = await params;

  const [chat] = await sql`SELECT id, title FROM chats WHERE id = ${chatId} AND user_email = ${session.user.email}`;
  if (!chat) return notFound();

  const messages = await sql`
    SELECT id, role, content, intent, feedback, created_at FROM chat_messages
    WHERE chat_id = ${chatId}
    ORDER BY created_at ASC
  `;

  const initialMessages = messages.map(publicMessage).map((m) => ({
    id: m.id as string,
    role: m.role as "user" | "assistant",
    content: m.content as string,
    intent: m.intent as AssistantIntent | null,
    feedback: m.feedback as "up" | "down" | null,
    created_at: (m.created_at as Date).toISOString(),
  }));

  return <ChatThread chatId={chat.id} title={chat.title as string} initialMessages={initialMessages} v2={isV2Email(session.user.email)} userInitial={(session.user.name || session.user.email || "").trim().charAt(0).toUpperCase()} />;
}
