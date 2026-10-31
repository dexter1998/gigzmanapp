/**
 * Templates: reusable mail / WhatsApp / call messages and saved campaign graphs.
 *
 * Synced with campaigns both ways (Tarun, 2026-10-21): every touch the Campaign Planner writes is
 * saved as a template and the node points at it (`templateId`); editing the node updates that
 * template, and editing the template updates every DRAFT campaign that uses it. Approved
 * campaigns keep the copy they were approved with — what was tested is what gets sent.
 */
import { sql } from "@/lib/db";
import type { Graph, CNode } from "./graph";

export type TemplateKind = "email" | "whatsapp" | "call" | "campaign";
export type TemplateView = {
  id: string; kind: TemplateKind; name: string; subject: string | null; body: string; isHtml: boolean; graph: Graph | null;
  mediaUrl: string | null; campaignId: string | null; usedBy: number; updatedAt: string;
};

const view = (r: Record<string, unknown>): TemplateView => ({
  id: r.id as string, kind: r.kind as TemplateKind, name: r.name as string, subject: (r.subject as string) ?? null, body: r.body as string,
  isHtml: r.is_html as boolean, graph: (r.graph as Graph) ?? null, mediaUrl: (r.media_url as string) ?? null,
  campaignId: (r.campaign_id as string) ?? null, usedBy: Number(r.used_by ?? 0), updatedAt: (r.updated_at as Date).toISOString(),
});

export async function listTemplates(email: string, kind?: TemplateKind) {
  const rows = await sql`
    SELECT t.*, (SELECT count(*) FROM v2_campaigns c WHERE c.user_email = t.user_email
                   AND c.graph::text LIKE '%' || t.id::text || '%')::int AS used_by
    FROM v2_templates t WHERE t.user_email = ${email} ${kind ? sql`AND t.kind = ${kind}` : sql``} ORDER BY t.updated_at DESC`;
  return rows.map(view);
}

export async function saveTemplate(email: string, t: { id?: string; kind: TemplateKind; name: string; subject?: string | null; body?: string; isHtml?: boolean; graph?: Graph | null; mediaUrl?: string | null }) {
  const g = t.graph ? sql.json(t.graph as unknown as Parameters<typeof sql.json>[0]) : null;
  if (t.id) {
    const [r] = await sql`UPDATE v2_templates SET name = ${t.name}, subject = ${t.subject ?? null}, body = ${t.body ?? ""}, is_html = ${!!t.isHtml},
      graph = coalesce(${g}, graph), media_url = ${t.mediaUrl ?? null}, updated_at = now() WHERE id = ${t.id} AND user_email = ${email} RETURNING *`;
    if (r && r.kind !== "campaign") await pushToCampaigns(email, r.id as string, { subject: r.subject as string | null, body: r.body as string, isHtml: r.is_html as boolean, mediaUrl: (r.media_url as string) ?? null, name: r.name as string });
    return r ? view(r) : null;
  }
  const [r] = await sql`INSERT INTO v2_templates (user_email, kind, name, subject, body, is_html, graph, media_url)
    VALUES (${email}, ${t.kind}, ${t.name}, ${t.subject ?? null}, ${t.body ?? ""}, ${!!t.isHtml}, ${g}, ${t.mediaUrl ?? null}) RETURNING *`;
  return view(r);
}

/** Template edited → every draft campaign node that uses it gets the new copy. */
async function pushToCampaigns(email: string, templateId: string, v: { subject: string | null; body: string; isHtml: boolean; mediaUrl: string | null; name: string }) {
  const cs = await sql`SELECT id, graph FROM v2_campaigns WHERE user_email = ${email} AND status IN ('draft','testing') AND graph::text LIKE ${"%" + templateId + "%"}`;
  for (const c of cs) {
    const g = c.graph as Graph;
    const nodes = g.nodes.map((n) => (n.data.templateId === templateId
      ? { ...n, data: { ...n.data, subject: v.subject ?? n.data.subject, body: v.body, isHtml: v.isHtml, mediaUrl: v.mediaUrl, templateName: v.name } } : n));
    await sql`UPDATE v2_campaigns SET graph = ${sql.json({ ...g, nodes } as unknown as Parameters<typeof sql.json>[0])}, updated_at = now() WHERE id = ${c.id}`;
  }
}

const KIND_OF: Record<string, TemplateKind> = { email: "email", whatsapp: "whatsapp", call: "call" };

/**
 * Graph → templates. Each touch node is linked to a template: the one it already points at
 * (updated to the node's copy), else this campaign's planner-written template for that touch
 * number, else a new one. Returns the graph with every touch's templateId / templateName set.
 */
export async function syncTemplatesFromGraph(email: string, campaignId: string, campaignName: string, graph: Graph): Promise<Graph> {
  const nodes: CNode[] = [];
  for (const n of graph.nodes) {
    const kind = KIND_OF[n.kind];
    if (!kind) { nodes.push(n); continue; }
    const touch = n.data.touch ?? 0;
    let id = n.data.templateId ?? null;
    if (!id) {
      const [own] = await sql`SELECT id FROM v2_templates WHERE user_email = ${email} AND campaign_id = ${campaignId} AND touch = ${touch}`;
      id = (own?.id as string) ?? null;
    }
    const name = n.data.templateName ?? `${campaignName} — touch ${touch}`;
    if (id) {
      const [r] = await sql`UPDATE v2_templates SET kind = ${kind}, subject = ${n.data.subject ?? null}, body = ${n.data.body ?? ""}, is_html = ${!!n.data.isHtml},
        media_url = ${n.data.mediaUrl ?? null}, updated_at = now() WHERE id = ${id} AND user_email = ${email} RETURNING id, name`;
      if (r) { nodes.push({ ...n, data: { ...n.data, templateId: r.id, templateName: r.name } }); continue; }
    }
    const [r] = await sql`INSERT INTO v2_templates (user_email, kind, name, subject, body, is_html, media_url, campaign_id, touch)
      VALUES (${email}, ${kind}, ${name}, ${n.data.subject ?? null}, ${n.data.body ?? ""}, ${!!n.data.isHtml}, ${n.data.mediaUrl ?? null}, ${campaignId}, ${touch})
      RETURNING id, name`;
    nodes.push({ ...n, data: { ...n.data, templateId: r.id, templateName: r.name } });
  }
  return { ...graph, nodes };
}

export async function deleteTemplate(email: string, id: string) {
  // Nodes keep their copy; they just stop pointing at a template that no longer exists.
  const cs = await sql`SELECT id, graph FROM v2_campaigns WHERE user_email = ${email} AND graph::text LIKE ${"%" + id + "%"}`;
  for (const c of cs) {
    const g = c.graph as Graph;
    const nodes = g.nodes.map((n) => (n.data.templateId === id ? { ...n, data: { ...n.data, templateId: null, templateName: null } } : n));
    await sql`UPDATE v2_campaigns SET graph = ${sql.json({ ...g, nodes } as unknown as Parameters<typeof sql.json>[0])} WHERE id = ${c.id}`;
  }
  await sql`DELETE FROM v2_templates WHERE id = ${id} AND user_email = ${email}`;
}
