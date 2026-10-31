import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { v2User, isResp, isUuid } from "../../_auth";
import { getCampaign, saveGraph, deleteCampaign, setSenders, cleanSenderProfile } from "@/lib/v2/outreach/campaigns";
import type { Graph } from "@/lib/v2/outreach/graph";

type P = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: P) {
  const u = await v2User(); if (isResp(u)) return u;
  const c = await getCampaign(u.email, (await params).id);
  return c ? NextResponse.json({ campaign: c }) : NextResponse.json({ error: "not_found" }, { status: 404 });
}

/** Hand edits from the canvas: the graph and/or the name. Only drafts are editable. */
export async function PATCH(req: NextRequest, { params }: P) {
  const u = await v2User(); if (isResp(u)) return u;
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { graph?: Graph; name?: string; listChatId?: string; senderIds?: string[]; senderProfile?: unknown };
  if (b.graph && (!Array.isArray(b.graph.nodes) || !Array.isArray(b.graph.edges) || b.graph.nodes.length > 60)) return NextResponse.json({ error: "bad_graph" }, { status: 400 });
  const c = await getCampaign(u.email, id);
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (b.senderProfile !== undefined) {
    // "Sending as" — confirmed in the planner. Editable until the campaign is live.
    const sp = cleanSenderProfile(b.senderProfile);
    if (!sp) return NextResponse.json({ error: "Company and offer are needed." }, { status: 400 });
    await sql`UPDATE v2_campaigns SET sender_profile = ${sql.json(sp)}, updated_at = now() WHERE id = ${id} AND user_email = ${u.email}`;
    return NextResponse.json({ campaign: await getCampaign(u.email, id) });
  }
  if (Array.isArray(b.senderIds)) {
    await setSenders(u.email, id, b.senderIds.filter(isUuid).slice(0, 4));
    if (!b.graph && !b.name) return NextResponse.json({ campaign: await getCampaign(u.email, id) });
  }
  if (isUuid(b.listChatId) && ["draft", "testing"].includes(c.status)) {
    // A new list makes the old sequence's trigger wrong: clear it so the planner writes it for this list.
    await sql`UPDATE v2_campaigns SET list_chat_id = ${b.listChatId}, graph = '{"nodes":[],"edges":[]}', updated_at = now() WHERE id = ${id} AND user_email = ${u.email}`;
    return NextResponse.json({ campaign: await getCampaign(u.email, id) });
  }
  await saveGraph(u.email, id, b.graph ?? c.graph, typeof b.name === "string" && b.name.trim() ? b.name.trim().slice(0, 80) : undefined);
  return NextResponse.json({ campaign: await getCampaign(u.email, id) });
}

export async function DELETE(_: NextRequest, { params }: P) {
  const u = await v2User(); if (isResp(u)) return u;
  await deleteCampaign(u.email, (await params).id);
  return NextResponse.json({ ok: true });
}
