import { NextRequest, NextResponse } from "next/server";
import { trackEvent, EV } from "@/lib/events";
import { v2User, isResp, isUuid } from "../_auth";
import { listTemplates, saveTemplate, deleteTemplate, type TemplateKind } from "@/lib/v2/outreach/templates";

const KINDS = ["email", "whatsapp", "call", "campaign"];

export async function GET(req: NextRequest) {
  const u = await v2User(); if (isResp(u)) return u;
  const k = req.nextUrl.searchParams.get("kind");
  return NextResponse.json({ templates: await listTemplates(u.email, KINDS.includes(k ?? "") ? (k as TemplateKind) : undefined) });
}

export async function POST(req: NextRequest) {
  const u = await v2User(); if (isResp(u)) return u;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!KINDS.includes(String(b.kind)) || typeof b.name !== "string" || !b.name.trim()) return NextResponse.json({ error: "Name the template." }, { status: 400 });
  const t = await saveTemplate(u.email, {
    id: isUuid(b.id) ? b.id : undefined, kind: b.kind as TemplateKind, name: b.name.trim().slice(0, 100),
    subject: typeof b.subject === "string" ? b.subject.slice(0, 200) : null, body: typeof b.body === "string" ? b.body.slice(0, 100_000) : "",
    isHtml: b.isHtml === true, graph: b.graph && typeof b.graph === "object" ? (b.graph as never) : null,
    mediaUrl: typeof b.mediaUrl === "string" && /^(https?:\/\/|\/api\/v2\/media\/)/.test(b.mediaUrl) ? b.mediaUrl.slice(0, 500) : null,
  });
  trackEvent(u.email, EV.templateSave, { kind: String(b.kind) });
  return t ? NextResponse.json({ template: t }) : NextResponse.json({ error: "not_found" }, { status: 404 });
}

export async function DELETE(req: NextRequest) {
  const u = await v2User(); if (isResp(u)) return u;
  const id = req.nextUrl.searchParams.get("id");
  if (!isUuid(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  await deleteTemplate(u.email, id);
  return NextResponse.json({ ok: true });
}
