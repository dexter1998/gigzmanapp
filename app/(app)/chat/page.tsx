import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { ChatLanding } from "@/components/chat/ChatLanding";
import { isV2Email } from "@/lib/v2";
import { userCity, withCity } from "@/lib/v2/suggest-city";

export const metadata = { title: "Chat" };

const SUGGESTION_COUNT = 10;

// The New chat menu's starters arrive as ?start=<id>; only known ids map to text, so the query
// string can't inject arbitrary content into the composer.
const STARTERS: Record<string, string> = {
  find: "Find ",
};

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ start?: string }> }) {
  const { start } = await searchParams;
  const session = await auth();
  const name = session?.user?.name ?? null;

  const suggestions = await sql`
    SELECT prompt_text FROM chat_suggestions ORDER BY random() LIMIT ${SUGGESTION_COUNT}
  `;

  // Starters named no place, so every tap was answered "Which city?" (prod: the top no-plan cause).
  const city = session?.user?.email ? await userCity(session.user.email) : null;
  // Runs only advance while a tab has them open, so a closed tab leaves them "running" forever (prod:
  // 12 of 175). Opening the chat resumes them — offer that here instead of letting them rot.
  const unfinished = session?.user?.email ? await sql`
    SELECT chat_id, plan->>'title' AS title, delivered, target FROM v2_runs
    WHERE user_email = ${session.user.email} AND status IN ('running', 'paused') AND chat_id IS NOT NULL
      AND created_at > now() - interval '14 days'
    ORDER BY created_at DESC LIMIT 3` : [];
  return <ChatLanding name={name} suggestions={suggestions.map((r) => withCity(r.prompt_text as string, city))} v2={isV2Email(session?.user?.email)}
    unfinished={unfinished.map((r) => ({ chatId: String(r.chat_id), title: String(r.title ?? "Search"), delivered: Number(r.delivered ?? 0), target: Number(r.target ?? 0) }))} prefill={STARTERS[start ?? ""] ?? ""} />;
}
