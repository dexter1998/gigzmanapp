import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { v2User, isResp } from "../_auth";
import { listCampaigns } from "@/lib/v2/outreach/campaigns";
import { touchesOf, type Graph } from "@/lib/v2/outreach/graph";

/** Every campaign with its totals, and per-touch numbers for the detail view. */
export async function GET() {
  const u = await v2User(); if (isResp(u)) return u;
  const campaigns = await listCampaigns(u.email);
  const rows = await sql`
    SELECT s.campaign_id, s.node_id, s.channel,
      count(*) FILTER (WHERE s.status = 'sent')::int AS sent,
      count(*) FILTER (WHERE s.status IN ('queued','scheduled'))::int AS queued,
      count(s.opened_at)::int AS opened, count(s.replied_at)::int AS replied, count(s.bounced_at)::int AS bounced,
      count(*) FILTER (WHERE s.status = 'skipped')::int AS skipped,
      min(s.due_at) FILTER (WHERE s.status IN ('queued','scheduled')) AS next_due
    FROM v2_sends s JOIN v2_campaigns c ON c.id = s.campaign_id
    WHERE c.user_email = ${u.email} AND NOT s.is_test GROUP BY 1, 2, 3`;
  const graphs = await sql`SELECT id, graph FROM v2_campaigns WHERE user_email = ${u.email}`;
  const perTouch: Record<string, Array<Record<string, unknown>>> = {};
  for (const g of graphs) {
    perTouch[g.id] = touchesOf(g.graph as Graph).map((t, i) => {
      const r = rows.find((x) => x.campaign_id === g.id && x.node_id === t.nodeId);
      return { touch: i + 1, channel: t.channel, day: t.offsetDays, subject: t.subject ?? null, sent: r?.sent ?? 0, queued: r?.queued ?? 0,
        opened: r?.opened ?? 0, replied: r?.replied ?? 0, bounced: r?.bounced ?? 0, skipped: r?.skipped ?? 0, nextDue: r?.next_due?.toISOString() ?? null };
    });
  }
  return NextResponse.json({ campaigns, perTouch });
}
