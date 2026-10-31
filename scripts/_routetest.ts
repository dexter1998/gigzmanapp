import { sql } from "@/lib/db";
import { runV2Turn } from "@/lib/v2/turn";
const email = "test@mantisai.in";
async function convo(name: string, steps: Array<{ say?: string; act?: any }>) {
  const [c] = await sql`INSERT INTO chats (user_email, title) VALUES (${email}, ${name}) RETURNING id`;
  console.log(`\n### ${name}`); let last: any = null;
  for (const st of steps) {
    let action = st.act ?? null; if (typeof action === "function") action = action(last);
    console.log(`USER: ${st.say ?? "(tap)"}${action ? ` [${action.type}]` : ""}`);
    last = await runV2Turn({ chatId: c.id, userEmail: email, message: st.say ?? "(tap)", action });
    const ctx = last.blocks?.find((b: any) => b.type === "context"); const scope = last.blocks?.find((b: any) => b.type === "scope");
    console.log(`  -> ${last.turnType}/${last.action} | ${String(last.reply).replace(/\s+/g, " ").slice(0, 150)}`);
    if (ctx) console.log(`  CARD: ${ctx.name}`); if (scope) console.log(`  SCOPE: ${scope.industry} @ ${scope.geography}`);
    if (last.clarification) console.log(`  Q: ${last.clarification.options.map((o: any) => o.label).join(" | ")}`);
  }
  return last;
}
(async () => {
  const ctxOf = (l: any) => l.blocks.find((b: any) => b.type === "context");
  await convo("rt generic own", [{ say: "mujhe apne business ke liye leads chahiye" }]);
  await convo("rt switch bare", [{ say: "find dentists in Jaipur" }, { say: "for Bubbles" }]);
  await convo("rt advice+ask", [{ say: "i run a small seo agency in indore, which niche should i target and find me 10 such businesses here" }]);
  const done = await convo("rt about results", [
    { say: "cafes in Pune" },
    { act: (l: any) => l.clarification?.options?.find((o: any) => /Bubbles/.test(o.label))?.action },
    { act: (l: any) => { const c = ctxOf(l); return c ? { type: "confirm_context", profileId: c.profileId, offering: null, brief: c.brief } : null; } },
    { say: "which of these have an email?" },
    { say: "aur 10 do" },
  ]);
  void done;
  process.exit(0);
})();
