import { sql } from "@/lib/db";
import { runV2Turn } from "@/lib/v2/turn";
const email = "test@mantisai.in";
type Step = { say?: string; act?: unknown };
async function convo(name: string, steps: Step[]) {
  const [c] = await sql`INSERT INTO chats (user_email, title) VALUES (${email}, ${name}) RETURNING id`;
  console.log(`\n### ${name}`);
  let last: any = null;
  for (const st of steps) {
    let action: any = st.act ?? null;
    if (typeof action === "function") action = action(last);
    const msg = st.say ?? "(tap)";
    console.log(`USER: ${msg}${action ? ` [action ${action.type}]` : ""}`);
    last = await runV2Turn({ chatId: c.id, userEmail: email, message: msg, action });
    const ctx = last.blocks?.find((b: any) => b.type === "context");
    const scope = last.blocks?.find((b: any) => b.type === "scope");
    console.log(`  -> ${last.action} | ${String(last.reply).replace(/\s+/g, " ").slice(0, 200)}`);
    if (ctx) console.log(`  CARD: ${ctx.name} offerings=[${ctx.offerings.join(" / ")}] pre=${ctx.offering} buyers=[${ctx.buyers.slice(0, 4).join(", ")}] others=${ctx.others.length}`);
    if (last.clarification) console.log(`  Q: ${last.clarification.question} :: ${last.clarification.options.map((o: any) => o.label).join(" | ")}`);
    if (scope) {
      console.log(`  SCOPE: ${scope.industry} @ ${scope.geography} signals=[${scope.signals.map((s: any) => s.label).join(", ")}] reused=${scope.reusedPipeline}`);
      console.log(`  WHY: ${scope.reasoning}`);
      const [d] = await sql`SELECT decision->'strategies' AS st, decision->'trace' AS tr FROM v2_decisions WHERE run_id = ${scope.runId} AND at = 'plan' ORDER BY id DESC LIMIT 1`;
      if (d) console.log(`  ORDER: ${JSON.stringify(d.st)} | looked at: ${(d.tr as any[]).map((t) => `${t.tool}(${JSON.stringify(t.input)})`).join(", ")}`);
    }
    console.log(`  steps: ${last.steps.map((s: any) => s.label).join(" > ")}`);
  }
  return last;
}
(async () => {
  const profs = await sql`SELECT id, name, services FROM v2_business_profiles WHERE user_email = ${email} ORDER BY is_default DESC`;
  console.log(profs.map((p: any) => `${p.name} (${(p.services as string[]).length} services)`).join("; "));
  const ctxOf = (l: any) => l.blocks.find((b: any) => b.type === "context");
  const kalt = profs.find((p: any) => /KALT/.test(p.name));
  await convo("no-website reuse", [
    { say: "find restaurants in Jaipur with no website" },
    { act: (l: any) => l.clarification?.options?.find((o: any) => /KALT/.test(o.label))?.action },
    { act: (l: any) => { const c = ctxOf(l); return c ? { type: "confirm_context", profileId: c.profileId, offering: c.offerings[0], brief: c.brief } : null; } },
  ]);
  await convo("saas buyers", [
    { say: "find SaaS companies in Bangalore that are hiring" },
    { act: (l: any) => l.clarification?.options?.find((o: any) => /Zoho/.test(o.label))?.action },
    { act: (l: any) => { const c = ctxOf(l); return c ? { type: "confirm_context", profileId: c.profileId, offering: null, brief: c.brief } : null; } },
  ]);
  void kalt;
  process.exit(0);
})();
