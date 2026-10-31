import { sql } from "@/lib/db";
import { listLeads, mapLeads, MAP_LIST } from "@/lib/v2/lms";
(async () => {
  const [u] = await sql`SELECT unlocked_by e, count(*)::int n FROM unlocks u JOIN leads l ON l.id = u.lead_id WHERE NOT l.is_competitor GROUP BY 1 ORDER BY 2 DESC LIMIT 1`;
  if (!u) { console.log("no unlocks locally"); process.exit(0); }
  const all = await listLeads(u.e);
  const only = await listLeads(u.e, MAP_LIST);
  const m = all.lists.find((l) => l.chatId === MAP_LIST);
  console.log("unlocks:", u.n, "| All leads:", all.leads.length, "map in All:", all.leads.filter((l) => l.chatId === MAP_LIST).length, "| map list entry:", m?.name, m?.count, "| ?list=map leads:", only.leads.length);
  const one = await mapLeads(u.e, only.leads[0].id.slice(2));
  console.log("detail:", one[0]?.name, one[0]?.phone, one[0]?.signals);
  process.exit(0);
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
