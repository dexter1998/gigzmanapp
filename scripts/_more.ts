import { sql } from "@/lib/db";
import { runV2Turn } from "@/lib/v2/turn";
(async () => {
  const [c] = await sql`SELECT id FROM chats WHERE user_email = 'test@mantisai.in' AND title ILIKE '%Pune%' ORDER BY created_at DESC LIMIT 1`;
  try {
    const r = await runV2Turn({ chatId: c.id, userEmail: "test@mantisai.in", message: "aur 10 do", action: null });
    console.log("OK", r.turnType, r.action, String(r.reply).slice(0, 200));
  } catch (e) { console.log("THREW", (e as Error).stack?.split("\n").slice(0, 6).join("\n")); }
  process.exit(0);
})();
