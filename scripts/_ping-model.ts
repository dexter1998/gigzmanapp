import { callAgent } from "@/lib/v2/claude";
(async () => {
  try { const r = await callAgent({ system: "Reply with OK.", messages: [{ role: "user", content: "ping" }], maxTokens: 10 } as never); console.log("ok", JSON.stringify(r).slice(0, 200)); }
  catch (e) { console.log("ERR", (e as Error).message.slice(0, 400)); }
  process.exit(0);
})();
