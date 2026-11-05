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

export type Touch = { channel: Channel; waitDays: number; subject?: string; body: string; goal?: string; skill?: string; retry?: CNode["data"]["retry"] };

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
    ...(t.channel === "call" ? { voice: { mode: "ai" as const, skill: t.skill ?? "pitch" }, retry: t.retry ?? DEFAULT_CALL_RETRY } : {}) };
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
      out.push({ channel: cur.kind, waitDays: pendingWait, subject: cur.data.subject, body: cur.data.body ?? "", nodeId: cur.id, offsetDays: offset, skill: cur.data.voice?.skill,
        ...(cur.kind === "call" ? { retry: cur.data.retry } : {}) });
      pendingWait = 0;
    }
    const outs = next(cur.id);
    const pick = outs.find((e) => e.label === "no") ?? outs.find((e) => !e.label) ?? outs[0];
    cur = pick ? byId.get(pick.to) : undefined;
  }
  return out;
}

/** One touch with everything its node carries (template link, image, voice mode…), for manual edits. */
export type TouchStep = { channel: Channel; waitDays: number; data: CNode["data"] };

/** The sequence as editable steps — the inverse of `rebuild`. */
export function stepsOf(g: Graph): TouchStep[] {
  return touchesOf(g).map((t) => ({ channel: t.channel, waitDays: t.waitDays, data: g.nodes.find((n) => n.id === t.nodeId)?.data ?? { title: "" } }));
}

/**
 * Steps → graph, keeping each touch's own data. Manual edits on the canvas (add / remove a step,
 * n8n-style) go through this, so the graph keeps the same shape the planner's graphs have.
 */
export function rebuild(g: Graph, steps: TouchStep[], trigger?: CNode["data"]): Graph {
  const trig = trigger ?? g.nodes.find((n) => n.kind === "trigger")?.data ?? { title: "Leads list" };
  const out = compile(steps.map((s, i) => ({ channel: s.channel, waitDays: i === 0 ? 0 : Math.max(1, s.waitDays || 3), body: s.data.body ?? "", subject: s.data.subject, skill: s.data.voice?.skill, retry: s.data.retry })), trig);
  out.nodes = out.nodes.map((n) => {
    if (!n.data.touch) return n;
    const src = steps[n.data.touch - 1].data;
    const task = n.kind === "call" && src.voice?.mode === "task";
    return { ...n, data: { ...src, touch: n.data.touch, title: task ? `Touch ${n.data.touch} · Call` : n.data.title, ...(n.kind === "call" ? { voice: src.voice ?? n.data.voice, retry: src.retry ?? n.data.retry } : {}) } };
  });
  return out;
}

/** A blank step the user adds by hand: a short starting text they then edit. */
export function blankStep(channel: Channel, mode: "ai" | "task" = "ai"): TouchStep {
  const body = channel === "email"
    ? "Hi {{first_name}},\n\nI noticed {{signal}} at {{business_name}}. We help businesses like yours fix exactly that.\n\nWorth a 10-minute call this week?\n\n{{sender_name}}, {{sender_company}}"
    : channel === "whatsapp" ? "Hi, this is {{sender_name}} from {{sender_company}}. Following up on my note about {{business_name}} — open to a quick chat?"
    : "Calling {{business_name}} in {{area}}. What we noticed: {{signal}}. Offer in one line, one question about how they get customers today, and book a 15-minute call with {{sender_name}}. If not interested, thank them and end politely.";
  return { channel, waitDays: 3, data: { title: "", subject: channel === "email" ? "quick question about {{business_name}}" : undefined, body, ...(channel === "call" ? { voice: { mode, skill: "pitch" }, retry: DEFAULT_CALL_RETRY } : {}) } };
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

/** The retry rule of an AI call touch — on by default: 3 dials, next day, or at the time the lead asked. */
export const DEFAULT_CALL_RETRY = { maxAttempts: 3, gapHours: 24, followCallback: true };
/** Most dials one lead gets on one call touch (Tarun, 2026-11-02: "max try ek call pr 7 baar"). */
export const MAX_CALL_DIALS = 7;
export function callRetryOf(g: Graph, nodeId: string) {
  const n = g.nodes.find((x) => x.id === nodeId);
  return { ...DEFAULT_CALL_RETRY, ...(n?.data.retry ?? {}) };
}
