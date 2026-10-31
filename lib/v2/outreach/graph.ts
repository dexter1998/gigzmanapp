/**
 * A campaign is a small graph (docs/v2-campaigns.md): trigger → touch → wait → "replied?" → touch …
 * The Campaign Planner writes TOUCHES; code compiles them into nodes and edges and lays them out,
 * so the canvas always reads left to right like an n8n workflow and the model never places pixels.
 */

export type Channel = "email" | "whatsapp" | "call";
export type NodeKind = "trigger" | Channel | "wait" | "condition" | "end";

export type CNode = {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  data: {
    title: string;
    /** Touch number (1-based) for channel nodes. */
    touch?: number;
    subject?: string;
    body?: string;
    isHtml?: boolean;
    templateId?: string | null;
    templateName?: string | null;
    /** Image shown with the message (WhatsApp header / email hero), a hosted URL. */
    mediaUrl?: string | null;
    /** Call touches: the AI voice agent makes the call (with a skill), or it's a task for the user. */
    voice?: { mode: "ai" | "task"; skill: string };
    /** AI call touches: dial again when not answered / "call me later", up to maxAttempts dials in all. */
    retry?: { maxAttempts: number; gapHours: number; followCallback: boolean };
    /** wait: days to wait. */
    days?: number;
    /** condition: what is checked. */
    check?: "replied" | "opened";
    /** trigger: the list it starts from. */
    listName?: string;
    count?: number;
    reach?: { email: number; phone: number };
    /** end: why the lead leaves the sequence. */
    reason?: string;
  };
};
export type CEdge = { id: string; from: string; to: string; label?: "yes" | "no" };
export type Graph = { nodes: CNode[]; edges: CEdge[] };

export type Touch = { channel: Channel; waitDays: number; subject?: string; body: string; goal?: string; skill?: string };

const COL = 230;
const ROW = 150;

/** Touches → graph. Every touch after the first waits, then checks for a reply; a reply ends it. */
export function compile(touches: Touch[], trigger: CNode["data"]): Graph {
  const nodes: CNode[] = [];
  const edges: CEdge[] = [];
  let col = 0;
  const add = (kind: NodeKind, data: CNode["data"], row = 0) => {
    const n: CNode = { id: `${kind}-${nodes.length + 1}`, kind, x: col * COL, y: row * ROW, data };
    nodes.push(n);
    return n;
  };
  let prev = add("trigger", { ...trigger, title: trigger.title || "Leads list" });
  const link = (from: CNode, to: CNode, label?: CEdge["label"]) => edges.push({ id: `e-${from.id}-${to.id}`, from: from.id, to: to.id, label });

  touches.forEach((t, i) => {
    if (i > 0) {
      col++;
      const wait = add("wait", { title: `Wait ${t.waitDays} day${t.waitDays === 1 ? "" : "s"}`, days: t.waitDays });
      link(prev, wait);
      col++;
      const cond = add("condition", { title: "Replied?", check: "replied" });
      link(wait, cond);
      const stop = add("end", { title: "Stop — they replied", reason: "replied" }, -1);
      link(cond, stop, "yes");
      prev = cond;
      col++;
      const touch = add(t.channel, touchData(t, i + 1));
      link(cond, touch, "no");
      prev = touch;
      return;
    }
    col++;
    const touch = add(t.channel, touchData(t, i + 1));
    link(prev, touch);
    prev = touch;
  });
  col++;
  const done = add("end", { title: "Sequence complete", reason: "complete" });
  link(prev, done);
  return { nodes, edges };
}

function touchData(t: Touch, n: number): CNode["data"] {
  const label = t.channel === "email" ? "Email" : t.channel === "whatsapp" ? "WhatsApp" : "Call";
  return { title: `Touch ${n} · ${t.channel === "call" ? "AI call" : label}`, touch: n, subject: t.subject, body: t.body,
    ...(t.channel === "call" ? { voice: { mode: "ai" as const, skill: t.skill ?? "pitch" } } : {}) };
}

/** Graph → touches, for the planner's edit mode and for the queue. */
export function touchesOf(g: Graph): Array<Touch & { nodeId: string; offsetDays: number }> {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const next = (id: string) => g.edges.filter((e) => e.from === id);
  const out: Array<Touch & { nodeId: string; offsetDays: number }> = [];
  let cur = g.nodes.find((n) => n.kind === "trigger");
  let pendingWait = 0;
  let offset = 0;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    if (cur.kind === "wait") { pendingWait += cur.data.days ?? 0; offset += cur.data.days ?? 0; }
    if (cur.kind === "email" || cur.kind === "whatsapp" || cur.kind === "call") {
      out.push({ channel: cur.kind, waitDays: pendingWait, subject: cur.data.subject, body: cur.data.body ?? "", nodeId: cur.id, offsetDays: offset, skill: cur.data.voice?.skill });
      pendingWait = 0;
    }
    const outs = next(cur.id);
    const pick = outs.find((e) => e.label === "no") ?? outs.find((e) => !e.label) ?? outs[0];
    cur = pick ? byId.get(pick.to) : undefined;
  }
  return out;
}

/** Placeholders a message may use; filled per lead at send time. */
export const VARIABLES = [
  { key: "business_name", label: "Business name", sample: "Green Park Dental" },
  { key: "first_name", label: "First name", sample: "Priya" },
  { key: "area", label: "Area", sample: "Sector 29, Gurugram" },
  { key: "category", label: "Category", sample: "Dental clinic" },
  { key: "website", label: "Website", sample: "greenparkdental.in" },
  { key: "signal", label: "What we noticed", sample: "your website's copyright still says 2019" },
  { key: "sender_name", label: "Your name", sample: "Tarun" },
  { key: "sender_company", label: "Your company", sample: "Gigzman" },
] as const;

export function fill(text: string, values: Record<string, string | null | undefined>): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, k: string) => values[k] ?? VARIABLES.find((v) => v.key === k)?.sample ?? "");
}
/** Uploaded images are stored as /api/v2/media/<id>; mail clients and Meta need the full URL. */
export function absolutize(html: string, base: string): string {
  return html.replace(/(["'(])\/api\/v2\/media\//g, `$1${base.replace(/\/$/, "")}/api/v2/media/`);
}
export const publicBase = () => process.env.AUTH_URL || "https://mantisai.in";

/** The HTML that actually goes out: the message, with the touch's image above it if it has one. */
export function emailHtml(body: string, mediaUrl: string | null | undefined, footer: string): string | undefined {
  const isHtml = /<[a-z][\s\S]*>/i.test(body);
  if (!isHtml && !mediaUrl) return undefined;
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");
  const img = mediaUrl ? `<p><img src="${mediaUrl}" alt="" style="max-width:100%;height:auto;border-radius:6px"></p>` : "";
  return absolutize(`${img}${isHtml ? body : `<div>${esc(body)}</div>`}<p style="color:#888;font-size:12px">${footer}</p>`, publicBase());
}

export const SAMPLE_VALUES: Record<string, string> = Object.fromEntries(VARIABLES.map((v) => [v.key, v.sample]));

/** The retry rule of an AI call touch — on by default: 3 dials, 4 h apart, at the time the lead asked. */
export const DEFAULT_CALL_RETRY = { maxAttempts: 3, gapHours: 4, followCallback: true };
export function callRetryOf(g: Graph, nodeId: string) {
  const n = g.nodes.find((x) => x.id === nodeId);
  return { ...DEFAULT_CALL_RETRY, ...(n?.data.retry ?? {}) };
}
