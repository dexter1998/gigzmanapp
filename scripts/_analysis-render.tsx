import { renderToStaticMarkup } from "react-dom/server";
import { sql } from "@/lib/db";
import Page from "@/app/(admin)/admin/analysis/page";
import ChatPage from "@/app/(admin)/admin/analysis/chats/[id]/page";
(async () => {
  for (const f of ["all", "failed", "noplan", "neg"]) {
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ days: "90", f, seg: "Stuck" }) }));
    console.log(`analysis f=${f}:`, html.length, "chars", ["Segment:", "Where signups came from", "Enquiries by industry", "Signals users ask for", "Chats ·"].map((s) => html.includes(s) ? "✓" : `✗${s}`).join(" "));
  }
  const [c] = await sql`SELECT c.id FROM chats c JOIN v2_runs r ON r.chat_id = c.id ORDER BY r.created_at DESC LIMIT 1`;
  if (c) {
    const h = renderToStaticMarkup(await ChatPage({ params: Promise.resolve({ id: String(c.id) }) }));
    console.log("chat page:", h.length, "chars", h.includes("Transcript") ? "✓transcript" : "✗", h.includes("Run ") ? "✓run" : "✗run");
  } else console.log("no chat with a run locally");
  process.exit(0);
})().catch((e) => { console.error("RENDER FAILED", e?.message?.slice(0, 500)); process.exit(1); });
