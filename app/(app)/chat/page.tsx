import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { ChatLanding } from "@/components/chat/ChatLanding";

export const metadata = { title: "Chat" };

const SUGGESTION_COUNT = 10;

export default async function ChatPage() {
  const session = await auth();
  const name = session?.user?.name ?? null;

  const suggestions = await sql`
    SELECT prompt_text FROM chat_suggestions ORDER BY random() LIMIT ${SUGGESTION_COUNT}
  `;

  return <ChatLanding name={name} suggestions={suggestions.map((r) => r.prompt_text as string)} />;
}
