"use client";

/**
 * Campaign builder (docs/v2-campaigns.md): the Campaign Planner chat on the left (Miro's "Create
 * with AI" panel), the sequence on a dotted canvas (n8n-style nodes, left to right), a node editor
 * with a live preview, then Test → Approve → Schedule. Nothing sends before Approve.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import "@xyflow/react/dist/style.css";
import "./sending-as.css";
import "../compact.css";
import "./plan-gate.css";
import {
  ReactFlow, Background, BackgroundVariant, Controls, Handle, Position, MarkerType,
  type Node, type Edge, type NodeProps, type ReactFlowInstance,
} from "@xyflow/react";
import {
  ArrowLeft, Mail, MessageCircle, Phone, Clock, GitBranch, Flag, Zap, Send, CheckCircle2, Sparkles, Loader2, X, Pause, Play,
  Square, Save, Users, AlertTriangle, ArrowUp, CalendarClock, Check, ListPlus, FileText, ImagePlus, ArrowUpRight, Send as SendIcon, Building2, Pencil, Info, ShieldCheck, Coins, UserRound, Lock,
  Plus, Trash2, Headset, RotateCcw,
} from "lucide-react";
import { PlansModal } from "../PlansModal";
import { WHATSAPP_LIVE } from "@/lib/v2/outreach/channels";
import { VARIABLES, touchesOf, DEFAULT_CALL_RETRY, MAX_CALL_DIALS, stepsOf, rebuild, blankStep, type Graph, type CNode, type Channel, type TouchStep } from "@/lib/v2/outreach/graph";
import type { CampaignView, TestCallView } from "@/lib/v2/outreach/campaigns";
import { EmailPreview, WhatsAppPreview, CallPreview } from "./Previews";
import { BrandLogo, type Brand } from "./BrandLogo";
import { uploadImage } from "./TemplatesPage";
import { VOICE_SKILLS, CALL_WINDOW, EST_MINUTES_PER_CALL, CALL_OUTCOME } from "@/lib/v2/outreach/voiceShared";
import { CREDIT_COST, CREDIT_PACKS, formatINR } from "@/lib/credits/pricing";
import { toast } from "@/components/toast/toast";

type ListInfo = { chatId: string; name: string; count: number; withEmail?: number; withPhone?: number };
type TestResult = { touch: number; channel: string; to: string | null; ok: boolean; note: string; detail?: string; from?: string | null };

const ICON = { trigger: Zap, email: Mail, whatsapp: MessageCircle, call: Phone, wait: Clock, condition: GitBranch, end: Flag } as const;

// ---------------------------------------------------------------- canvas nodes (n8n look)

type NodeData = { node: CNode; selected: boolean; appear: boolean };

function FlowNode({ data }: NodeProps<Node<NodeData>>) {
  const n = data.node;
  const Icon = ICON[n.kind];
  const isTouch = n.kind === "email" || n.kind === "whatsapp" || n.kind === "call";
  const sub = n.kind === "trigger" ? `${n.data.count ?? 0} leads · ${n.data.reach?.email ?? 0} email · ${n.data.reach?.phone ?? 0} phone`
    : n.kind === "call" ? (n.data.voice?.mode === "ai" ? `AI agent · ${VOICE_SKILLS.find((k) => k.id === n.data.voice?.skill)?.label ?? "Pitch"}` : "Call task for you")
    : isTouch ? (n.kind === "email" ? n.data.subject || "(no subject)" : (n.data.body ?? "").slice(0, 42))
    : n.kind === "wait" ? "then check" : n.kind === "condition" ? "yes → stop · no → continue" : n.data.reason === "replied" ? "they're in Inbox" : "no more touches";
  return (
    <div className={`ox-node k-${n.kind}${data.selected ? " sel" : ""}${data.appear ? " appear" : ""}${n.kind === "whatsapp" && !WHATSAPP_LIVE ? " soon" : ""}`}>
      {n.kind !== "trigger" && <Handle type="target" position={Position.Left} />}
      <div className="ox-node-box"><Icon size={n.kind === "wait" || n.kind === "condition" || n.kind === "end" ? 20 : 24} /></div>
      <div className="ox-node-label">{n.data.title}</div>
      <div className="ox-node-sub">{sub}</div>
      {isTouch && n.data.templateName && <div className="ox-node-tpl"><FileText size={10} /> {n.data.templateName}</div>}
      {n.kind === "whatsapp" && !WHATSAPP_LIVE && <span className="ox-soon ox-node-soon" title="WhatsApp sending is coming soon — this touch is skipped at launch.">Coming soon</span>}
      {n.kind === "condition" ? (
        <>
          <Handle type="source" id="yes" position={Position.Top} />
          <Handle type="source" id="no" position={Position.Right} />
        </>
      ) : n.kind !== "end" && <Handle type="source" position={Position.Right} />}
    </div>
  );
}
const nodeTypes = { ox: FlowNode };

const CONTROL_DONE = {
  pause: { title: "Campaign paused", message: "Nothing more goes out until you resume." },
  resume: { title: "Campaign resumed", message: "Sending picks up where it stopped." },
  stop: { title: "Campaign stopped", message: "Queued sends are cancelled." },
  restart: { title: "Campaign restarted", message: "Review it and approve to send again." },
};

// ---------------------------------------------------------------- builder

export function CampaignBuilder({ initial }: { initial: CampaignView }) {
  const [c, setC] = useState<CampaignView>(initial);
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [thinking, setThinking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [shown, setShown] = useState<number>(initial.graph.nodes.length);
  const [modal, setModal] = useState<null | "test" | "approve" | "list" | "senders">(initial.list ? (initial.senders.length || initial.graph.nodes.length ? null : "senders") : "list");
  const [name, setName] = useState(initial.name);
  const [plansOpen, setPlansOpen] = useState(false);
  const rf = useRef<ReactFlowInstance<Node<NodeData>, Edge> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const editable = c.status === "draft" || c.status === "testing";
  const hasAiCalls = c.graph.nodes.some((n) => n.kind === "call" && n.data.voice?.mode === "ai");
  const showLive = hasAiCalls && ["running", "scheduled", "paused", "done"].includes(c.status);
  const [pane, setPane] = useState<"live" | "planner">(showLive ? "live" : "planner");

  // A fresh draft from chat: the planner runs as soon as the page opens, so the user watches the
  // sequence being built instead of looking at an empty canvas.
  const autoPlanned = useRef(false);
  useEffect(() => {
    if (autoPlanned.current || c.graph.nodes.length || !c.list || modal === "senders" || initial.planning) return;
    // "Build it myself" from Create campaign: the canvas stays empty for + Add step.
    if (new URLSearchParams(window.location.search).get("manual") === "1") return;
    // The flag is set inside the timer: React's dev double-run (mount, cleanup, mount) cancels the
    // first timer, so setting it outside meant the planner never started.
    const t = setTimeout(() => { if (autoPlanned.current) return; autoPlanned.current = true; void ask(null); }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  useEffect(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" }); }, [c.messages.length, thinking]);

  // Reveal nodes one by one after the planner answers — the "built live" feel.
  function reveal(total: number) {
    setShown(0);
    for (let i = 1; i <= total; i++) setTimeout(() => { setShown(i); if (i === total) focusStart(); }, i * 170);
  }

  // A 5-touch sequence is ~17 nodes wide: fitting all of it made every label unreadable. The view
  // opens on the start of the sequence at a readable zoom; the rest is a pan away.
  function focusStart(duration = 500) {
    rf.current?.fitView({ nodes: rf.current.getNodes().slice(0, 7).map((n) => ({ id: n.id })), padding: 0.3, minZoom: 0.75, maxZoom: 1.05, duration });
  }

  async function ask(text: string | null) {
    setThinking(true); setErr(null);
    if (text) setC((x) => ({ ...x, messages: [...x.messages, { role: "user", content: text }] }));
    const r = await fetch(`/api/v2/outreach/campaigns/${c.id}/plan`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: text }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    // The planner keeps going on the server: still designing, or the answer was lost on the way
    // (a gateway cut it) — wait for it instead of calling it a failure.
    if (d.pending || !r || r.status >= 500 && !d.error) { await waitForPlan(); return; }
    setThinking(false);
    if (d.campaign) { setC(d.campaign); setName(d.campaign.name); reveal(d.campaign.graph.nodes.length); setSel(null); }
    else { setErr(d.error ?? "Planner didn't answer · retry"); toast.error("Planner didn't answer", d.error ?? "Send your message again to retry."); }
  }

  /** Poll the campaign until the background planner is done (up to ~5 min), then show its result. */
  async function waitForPlan() {
    setThinking(true);
    for (let i = 0; i < 75; i++) {
      await new Promise((ok) => setTimeout(ok, 4000));
      const d = await fetch(`/api/v2/outreach/campaigns/${c.id}`).then((x) => x.json()).catch(() => null);
      const cv = d?.campaign as CampaignView | undefined;
      if (!cv || cv.planning) continue;
      setThinking(false);
      if (cv.planError) { setErr(cv.planError); setC(cv); toast.error("Planner didn't answer", cv.planError); return; }
      setC(cv); setName(cv.name); reveal(cv.graph.nodes.length); setSel(null);
      return;
    }
    setThinking(false); setErr("Planner is taking too long · retry");
  }

  // Opened (or reloaded) while the planner is still designing: pick it up instead of starting again.
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || !initial.planning) return;
    resumed.current = true;
    const t = setTimeout(() => { void waitForPlan(); }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((g: Graph, nm?: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch(`/api/v2/outreach/campaigns/${c.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ graph: g, name: nm }) })
        .then((r) => { if (!r.ok) throw new Error(); })
        .catch(() => toast.error("Couldn't save your changes", "Check your connection — the last edit isn't saved yet."));
    }, 600);
  }, [c.id]);

  function updateNode(id: string, patch: Partial<CNode["data"]>) {
    setC((x) => {
      const g = { ...x.graph, nodes: x.graph.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)) };
      persist(g);
      return { ...x, graph: g };
    });
  }

  // Manual edits, n8n-style: add a step after the selected touch (or at the end), remove a step.
  // The graph is rebuilt from the steps so waits and "Replied?" checks stay between every touch.
  function editSteps(change: (steps: TouchStep[]) => { steps: TouchStep[]; select?: number }) {
    const l = c.list;
    const trigger = c.graph.nodes.length || !l ? undefined : { title: l.name, listName: l.name, count: l.count, reach: { email: l.withEmail, phone: l.withPhone } };
    const r = change(stepsOf(c.graph));
    const g = rebuild(c.graph, r.steps, trigger);
    setC((x) => ({ ...x, graph: g }));
    persist(g);
    setShown(g.nodes.length);
    setSel(r.select ? g.nodes.find((n) => n.data.touch === r.select)?.id ?? null : null);
  }
  function addStep(channel: Channel, mode: "ai" | "task" = "ai") {
    const at = touchesOf(c.graph).findIndex((t) => t.nodeId === sel);
    editSteps((steps) => {
      const i = at >= 0 ? at + 1 : steps.length;
      return { steps: [...steps.slice(0, i), blankStep(channel, mode), ...steps.slice(i)], select: i + 1 };
    });
  }
  function removeStep(nodeId: string) {
    const at = touchesOf(c.graph).findIndex((t) => t.nodeId === nodeId);
    if (at < 0) return;
    editSteps((steps) => ({ steps: steps.filter((_, i) => i !== at) }));
  }

  const nodes: Node<NodeData>[] = useMemo(() => c.graph.nodes.slice(0, shown).map((n, i) => ({
    id: n.id, type: "ox", position: { x: n.x, y: n.y }, draggable: editable,
    data: { node: n, selected: sel === n.id, appear: i >= initial.graph.nodes.length || shown < c.graph.nodes.length },
  })), [c.graph.nodes, shown, sel, editable, initial.graph.nodes.length]);
  const visible = new Set(nodes.map((n) => n.id));
  const edges: Edge[] = c.graph.edges.filter((e) => visible.has(e.from) && visible.has(e.to)).map((e) => ({
    id: e.id, source: e.from, target: e.to, sourceHandle: e.label ?? undefined, label: e.label, type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#9aa094" },
    className: e.label === "yes" ? "ox-edge-yes" : undefined, labelBgPadding: [6, 3], labelBgBorderRadius: 6,
  }));

  const selected = c.graph.nodes.find((n) => n.id === sel) ?? null;
  const touches = touchesOf(c.graph);
  const live = c.status === "running" || c.status === "scheduled" || c.status === "paused";

  async function control(action: keyof typeof CONTROL_DONE) {
    const d = await (await fetch(`/api/v2/outreach/campaigns/${c.id}/control`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) })).json().catch(() => ({}));
    if (d.campaign) { setC(d.campaign); toast.success(CONTROL_DONE[action].title, CONTROL_DONE[action].message); }
    else if (d.error === "plan_required") { setErr("Resuming needs an active plan."); setPlansOpen(true); toast.warning("Action needed to continue", "Resuming needs an active plan."); }
    else toast.error("Something went wrong", d.error ?? "Couldn't update the campaign. Please try again.");
  }
  async function saveAsTemplate() {
    const d = await (await fetch("/api/v2/outreach/templates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "campaign", name: name || c.name, graph: c.graph }) })).json();
    setErr(d.template ? null : d.error ?? "Couldn't save template");
    if (d.template) { setC((x) => ({ ...x, messages: [...x.messages, { role: "assistant", content: `Saved “${d.template.name}” to Templates → Campaigns.` }] })); toast.success("Template saved", `“${d.template.name}” is in Templates → Campaigns.`); }
    else toast.error("Couldn't save template", d.error);
  }

  return (
    <div className="ox-builder">
      <header className="ox-bar">
        <Link href={c.origin === "chat" && c.list ? `/chat/${c.list.chatId}` : "/campaigns"} className="v2-iconbtn" aria-label="Back"><ArrowLeft size={17} /></Link>
        <input className="ox-name" value={name} onChange={(e) => { setName(e.target.value); persist(c.graph, e.target.value); }} aria-label="Campaign name" disabled={!editable} />
        {c.list
          ? <button type="button" className="ox-listchip" onClick={() => editable && setModal("list")} disabled={!editable}><Users size={14} /> {c.list.name} · {c.list.count} leads</button>
          : <button type="button" className="ox-listchip warn" onClick={() => setModal("list")}><ListPlus size={14} /> Pick a list</button>}
        <span className={`ox-cstatus s-${c.status}`}>{statusLabel(c.status)}</span>
        <span className="ox-bar-right">
          {editable && touches.length > 0 && <button type="button" className="v2-btn" onClick={saveAsTemplate}><Save size={14} /> Save as template</button>}
          {editable && <button type="button" className={`v2-btn${c.testSentAt ? "" : " primary"}`} disabled={!touches.length} onClick={() => setModal("test")}><Send size={14} /> {c.testSentAt ? "Test again" : "Send test"}</button>}
          {editable && <button type="button" className={`v2-btn${c.testSentAt ? " primary" : ""}`} title={!c.testSentAt ? "Send a test first" : c.planActive ? undefined : "Launching needs a plan"}
            onClick={() => {
              // A disabled button swallowed clicks silently (prod: Approve pressed 3x, nothing) — say what's missing instead.
              if (!c.senderProfile) setErr("Confirm who this campaign is from first (the yellow line in the planner).");
              else if (!touches.length) setErr("Design the sequence first.");
              else if (!c.testSentAt) { setErr("Send yourself a test first — then Approve."); setModal("test"); }
              else { setErr(null); setModal("approve"); }
            }}>{c.testSentAt && !c.planActive ? <Lock size={14} /> : <CheckCircle2 size={15} />} Approve</button>}
          {c.status === "running" || c.status === "scheduled" ? <button type="button" className="v2-btn" onClick={() => control("pause")}><Pause size={14} /> Pause</button> : null}
          {c.status === "paused" && <button type="button" className="v2-btn primary" onClick={() => control("resume")}><Play size={14} /> Resume</button>}
          {live && <button type="button" className="v2-btn" onClick={() => confirm("Stop this campaign? Queued messages are cancelled.") && control("stop")}><Square size={13} /> Stop</button>}
          {c.status === "done" && <button type="button" className="v2-btn primary" title="Back to editing; approving again skips every lead already reached."
            onClick={() => confirm("Restart this campaign? It goes back to editing — change anything, then Approve. Leads already contacted or who answered are not contacted again.") && control("restart")}><RotateCcw size={14} /> Restart</button>}
        </span>
      </header>

      {live && (
        <div className="ox-livebar">
          {/* Leads, not sends: 120 leads × 3 touches used to read "345 queued". */}
          <span><b>{c.stats.leads?.total ?? c.stats.recipients}</b> leads</span>
          <span title="Leads still to be reached by a touch"><b>{c.stats.leads?.waiting ?? 0}</b> to reach</span>
          <span title="Leads a touch has reached (sent, or a call that ended)"><b>{c.stats.leads?.reached ?? 0}</b> reached</span>
          <span><b>{c.stats.replied}</b> replied</span>
          {(c.stats.leads?.unreachable ?? 0) > 0 && <span title="No email, and no mobile for AI calls"><b>{c.stats.leads?.unreachable}</b> no contact</span>}
          {c.stats.nextDue && <span><CalendarClock size={14} /> next {new Date(c.stats.nextDue).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>}
          {!c.sendingOn && <span className="ox-off" title="Live sending is switched off on this server — sends wait in the queue."><AlertTriangle size={14} /> Sending off · queued</span>}
        </div>
      )}

      <div className="ox-work">
        <aside className="ox-ai">
          {showLive ? (
            <div className="ox-ai-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={pane === "live"} className={pane === "live" ? "on" : ""} onClick={() => setPane("live")}><Phone size={14} /> Live calls</button>
              <button type="button" role="tab" aria-selected={pane === "planner"} className={pane === "planner" ? "on" : ""} onClick={() => setPane("planner")}><Sparkles size={14} /> Planner</button>
            </div>
          ) : <div className="ox-ai-head"><Sparkles size={16} /> Campaign Planner</div>}
          {showLive && pane === "live" ? <LiveCalls campaignId={c.id} running={c.status === "running"}
            touchName={(id) => { const n = c.graph.nodes.find((x) => x.id === id); return n?.data.touch ? `Touch ${n.data.touch}` : "Call"; }} /> : <>
          <div className="ox-ai-thread" ref={threadRef}>
            {!c.messages.length && !thinking && (
              <div className="ox-ai-empty">
                <p title="I write the sequence from your list — what we noticed about each business, and which channel reaches them.">Writes touches from your list&apos;s signals + reach</p>
                {c.list && <button type="button" className="v2-btn primary" onClick={() => ask(null)} disabled={thinking}><Sparkles size={15} /> Design the sequence</button>}
              </div>
            )}
            <SendingAs campaign={c} editable={editable} onDone={setC} />
            {c.testCall && <TestCallCard key={`${c.testCall.sendId}-${c.testCall.at}`} campaignId={c.id} initial={c.testCall} />}
            {c.messages.map((m, i) => <div key={i} className={`ox-ai-msg ${m.role}`}>{m.content}</div>)}
            {thinking && <div className="ox-ai-thinking"><span className="v2-shimmer-text">{c.graph.nodes.length ? "Rewriting…" : "Reading list · writing touch 1…"}</span></div>}
            {err && <div className="ox-form-err"><AlertTriangle size={14} /> {err}</div>}
          </div>
          {editable && (
            <div className="ox-ai-chips">
              {["Make it 3 touches", WHATSAPP_LIVE ? "Add a WhatsApp follow-up" : "Add an AI call follow-up", "Shorter, more casual", "Mention a free audit"].map((s) => (
                <button type="button" key={s} onClick={() => ask(s)} disabled={thinking || !c.list}>{s}</button>
              ))}
            </div>
          )}
          <form className="ox-ai-compose" onSubmit={(e) => { e.preventDefault(); if (msg.trim()) { void ask(msg.trim()); setMsg(""); } }}>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} disabled={!editable || !c.list}
              placeholder={editable ? "Ask for a change…" : "Approved · read-only"}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
            <button type="submit" className="ox-send" disabled={!msg.trim() || thinking} aria-label="Send"><ArrowUp size={16} /></button>
          </form>
          </>}
        </aside>

        <div className={`ox-canvas${thinking ? " building" : ""}`}>
          <ReactFlow
            nodes={nodes} edges={edges} nodeTypes={nodeTypes}
            onInit={(i) => { rf.current = i; setTimeout(() => focusStart(0), 50); }}
            onNodeClick={(_, n) => setSel(n.id)} onPaneClick={() => setSel(null)}
            onNodeDragStop={(_, n) => {
              setC((x) => { const g = { ...x.graph, nodes: x.graph.nodes.map((m) => (m.id === n.id ? { ...m, x: n.position.x, y: n.position.y } : m)) }; persist(g); return { ...x, graph: g }; });
            }}
            nodesConnectable={false} minZoom={0.3} maxZoom={1.6}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1.4} color="#c9ccc2" />
            <Controls showInteractive={false} position="bottom-left" />
          </ReactFlow>
          {!c.graph.nodes.length && !thinking && (
            <div className="ox-canvas-empty">{c.list ? "← Ask the planner to design it, or add steps yourself" : "Pick a list to start"}</div>
          )}
          {editable && c.list && !thinking && (
            <AddStepMenu after={touches.find((t) => t.nodeId === sel) ? `after touch ${touches.findIndex((t) => t.nodeId === sel) + 1}` : touches.length ? "at the end" : "as touch 1"} onAdd={addStep} />
          )}
          {thinking && (
            <div className="ox-orb-wrap" role="status" aria-live="polite">
              <div className="ox-orb" aria-hidden><i /><i /><i /></div>
              <div className="ox-orb-text">{c.graph.nodes.length ? "Rewriting the sequence…" : "Reading your list · writing the first touch…"}</div>
            </div>
          )}
        </div>

        {selected && (
          <NodeEditor key={selected.id} node={selected} editable={editable} senders={c.senders} values={c.previewValues ?? undefined} onChangeSenders={() => setModal("senders")}
            onChange={(p) => updateNode(selected.id, p)} onClose={() => setSel(null)}
            onRemove={selected.data.touch && touches.length > 1 ? () => removeStep(selected.id) : undefined} />
        )}
      </div>

      {modal === "list" && <ListPicker current={c.list?.chatId ?? null} onClose={() => setModal(null)} onPick={async (l) => {
        const r = await fetch(`/api/v2/outreach/campaigns/${c.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ listChatId: l.chatId }) }).catch(() => null);
        if (!r?.ok) { toast.error("Couldn't attach the list", "Please try again."); return; }
        const d = await (await fetch(`/api/v2/outreach/campaigns/${c.id}`)).json();
        setC(d.campaign); toast.success("List attached", `${l.name} is this campaign's audience.`);
        // Next question: which mailbox / number sends it (the planner then plans for those channels).
        setModal(d.campaign.senders.length ? null : "senders");
        if (d.campaign.senders.length && !d.campaign.graph.nodes.length) void ask(null);
      }} />}
      {modal === "senders" && <SenderPicker campaign={c} onClose={() => setModal(null)} onDone={(cv) => { setC(cv); setModal(null); }} />}
      {modal === "test" && <TestModal campaign={c} onClose={() => setModal(null)} onDone={(cv) => setC(cv)} />}
      {modal === "approve" && <ApproveModal campaign={c} onClose={() => setModal(null)} onDone={(cv) => { setC(cv); setModal(null); }} onPlans={() => { setModal(null); setPlansOpen(true); }} />}
      <PlansModal open={plansOpen} onClose={() => setPlansOpen(false)} />
    </div>
  );
}

function statusLabel(s: string) {
  return ({ draft: "Draft", testing: "Tested", approved: "Approved", scheduled: "Scheduled", running: "Running", paused: "Paused", done: "Finished" } as Record<string, string>)[s] ?? s;
}

// ---------------------------------------------------------------- node editor

function NodeEditor({ node, editable, senders, values, onChangeSenders, onChange, onClose, onRemove }: {
  node: CNode; editable: boolean; senders: CampaignView["senders"]; values?: Record<string, string>; onChangeSenders: () => void;
  onChange: (p: Partial<CNode["data"]>) => void; onClose: () => void; onRemove?: () => void;
}) {
  const [tpls, setTpls] = useState<Array<{ id: string; name: string; subject: string | null; body: string; isHtml: boolean; mediaUrl: string | null }>>([]);
  const imgRef = useRef<HTMLInputElement | null>(null);
  const [imgNote, setImgNote] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const kind = node.kind;
  useEffect(() => {
    if (kind !== "email" && kind !== "whatsapp" && kind !== "call") return;
    fetch(`/api/v2/outreach/templates?kind=${kind}`).then((r) => r.json()).then((d) => setTpls(d.templates ?? [])).catch(() => {});
  }, [kind]);
  const Icon = ICON[kind];
  const insert = (key: string) => {
    const el = bodyRef.current; const tok = `{{${key}}}`; const body = node.data.body ?? "";
    const a = el?.selectionStart ?? body.length, b = el?.selectionEnd ?? body.length;
    onChange({ body: body.slice(0, a) + tok + body.slice(b) });
  };
  return (
    <aside className="ox-editor">
      <div className="ox-editor-head"><span className={`ox-editor-icon k-${kind}`}><Icon size={16} /></span><b>{node.data.title}</b><button type="button" className="v2-iconbtn" onClick={onClose} aria-label="Close"><X size={16} /></button></div>
      {(kind === "email" || kind === "whatsapp" || kind === "call") && (
        <div className="ox-tplpick">
          <label>Template
            <select value={node.data.templateId ?? ""} disabled={!editable} onChange={(e) => {
              const t = tpls.find((x) => x.id === e.target.value);
              if (t) onChange({ subject: t.subject ?? node.data.subject, body: t.body, isHtml: t.isHtml, mediaUrl: t.mediaUrl, templateId: t.id, templateName: t.name });
            }}>
              {!node.data.templateId && <option value="">Not a template yet</option>}
              {node.data.templateId && !tpls.some((t) => t.id === node.data.templateId) && <option value={node.data.templateId}>{node.data.templateName ?? "This touch"}</option>}
              {tpls.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <span className="cp-hint" title="Edits here update this template."><Info size={12} /> Synced{node.data.templateId ? <> · <Link href="/templates" className="ox-help">Templates <ArrowUpRight size={11} /></Link></> : ""}</span>
        </div>
      )}
      {kind === "whatsapp" && !WHATSAPP_LIVE && (
        <p className="cp-hint" title="WhatsApp sending is coming soon. This touch stays in the campaign but is skipped at launch."><span className="ox-soon">Coming soon</span> Skipped at launch</p>
      )}
      {(kind === "email" || kind === "whatsapp") && (
        <>
          {kind === "email" && <label>Subject<input value={node.data.subject ?? ""} disabled={!editable} onChange={(e) => onChange({ subject: e.target.value })} /></label>}
          <label>Message<textarea ref={bodyRef} rows={9} value={node.data.body ?? ""} disabled={!editable} onChange={(e) => onChange({ body: e.target.value })} className={node.data.isHtml ? "mono" : ""} /></label>
          {editable && <div className="ox-vars">{VARIABLES.map((v) => <button type="button" key={v.key} onClick={() => insert(v.key)}>{v.label}</button>)}</div>}
          {editable && (
            <div className="ox-media-row">
              <button type="button" className="v2-btn" onClick={() => imgRef.current?.click()}><ImagePlus size={14} /> {node.data.mediaUrl ? "Change image" : "Add image"}</button>
              {node.data.mediaUrl && <button type="button" className="v2-btn" onClick={() => onChange({ mediaUrl: null })}><X size={13} /> Remove image</button>}
              <span className="v2-muted2">{imgNote}</span>
              <input ref={imgRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={async (e) => {
                const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
                setImgNote("Uploading…"); const r = await uploadImage(f); setImgNote(r.url ? null : r.error ?? "Upload failed.");
                if (r.url) onChange({ mediaUrl: r.url });
              }} />
            </div>
          )}
          <div className="ox-preview-label">Preview <span>· {values?.business_name || "lead"}</span></div>
          {kind === "email"
            ? <EmailPreview subject={node.data.subject ?? ""} body={node.data.body ?? ""} isHtml={node.data.isHtml} mediaUrl={node.data.mediaUrl} values={values}
                from={senders.find((x) => x.channel === "email")?.address ?? `${values?.sender_name || "You"} <you@yourcompany.com>`} />
            : <WhatsAppPreview body={node.data.body ?? ""} business={values?.sender_company || "Your business"} mediaUrl={node.data.mediaUrl} values={values} width={280} />}
        </>
      )}
      {kind === "call" && (() => {
        const v = node.data.voice ?? { mode: "ai" as const, skill: "pitch" };
        return (
          <>
            <div className="ox-seg big" role="group" aria-label="Who calls">
              <button type="button" className={v.mode === "ai" ? "on" : ""} disabled={!editable} onClick={() => onChange({ voice: { ...v, mode: "ai" }, title: `Touch ${node.data.touch} · AI call` })}>AI voice agent</button>
              <button type="button" className={v.mode === "task" ? "on" : ""} disabled={!editable} onClick={() => onChange({ voice: { ...v, mode: "task" }, title: `Touch ${node.data.touch} · Call` })}>Call task for me</button>
            </div>
            {v.mode === "ai" && (
              <>
                <div className="ox-skills" role="radiogroup" aria-label="Skill">
                  {VOICE_SKILLS.map((k) => (
                    <button type="button" role="radio" aria-checked={v.skill === k.id} key={k.id} className={v.skill === k.id ? "on" : ""} disabled={!editable}
                      onClick={() => onChange({ voice: { ...v, skill: k.id } })}><b>{k.label}</b><span>{k.desc}</span></button>
                  ))}
                </div>
                <p className="cp-hint"><CalendarClock size={12} /> {CALL_WINDOW.from}–{CALL_WINDOW.to} IST · 1 at a time · <Coins size={12} /> {CREDIT_COST.voice_minute} credits/min · ≈{EST_MINUTES_PER_CALL} min/call</p>
                {(() => {
                  const r = { ...DEFAULT_CALL_RETRY, ...(node.data.retry ?? {}) };
                  const set = (x: Partial<typeof r>) => onChange({ retry: { ...r, ...x } });
                  return (
                    <div className="cp-retry" title="Interested → Inbox, stops. Not interested → stops. No answer / busy / call me later → dialled again.">
                      <b>After the call</b>
                      <span>Interested → Inbox · Not interested → stop</span>
                      <label>No answer / call later: dial up to
                        <select value={r.maxAttempts} disabled={!editable} onChange={(e) => set({ maxAttempts: Number(e.target.value) })}>
                          {Array.from({ length: MAX_CALL_DIALS }, (_, k) => k + 1).map((n) => <option key={n} value={n}>{n === 1 ? "1 time (no retry)" : `${n} times`}</option>)}
                        </select></label>
                      {r.maxAttempts > 1 && (
                        <>
                          <label>every
                            <select value={r.gapHours} disabled={!editable} onChange={(e) => set({ gapHours: Number(e.target.value) })}>
                              {[2, 4, 24, 48].map((h) => <option key={h} value={h}>{h < 24 ? `${h} hours` : h === 24 ? "next day" : `${h / 24} days`}</option>)}
                            </select></label>
                          <label className="cp-check"><input type="checkbox" checked={r.followCallback} disabled={!editable} onChange={(e) => set({ followCallback: e.target.checked })} /> Call back at the time they ask for</label>
                          <span className="cp-loop" title="Calls go one at a time inside calling hours; each lead keeps coming back until it answers yes / no or uses up its dials.">
                            Loops daily through the list until every lead answers or has had {r.maxAttempts} dials</span>
                        </>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
            <label>{v.mode === "ai" ? <span title="The agent improvises around this brief.">Agent brief</span> : "Talk track"}
              <textarea rows={9} value={node.data.body ?? ""} disabled={!editable} onChange={(e) => onChange({ body: e.target.value })} /></label>
            <CallPreview body={node.data.body ?? ""} values={values} />
          </>
        );
      })()}
      {kind === "wait" && (
        <label>Wait (days)<input type="number" min={1} max={14} value={node.data.days ?? 3} disabled={!editable}
          onChange={(e) => { const d = Math.max(1, Math.min(14, Number(e.target.value) || 1)); onChange({ days: d, title: `Wait ${d} day${d === 1 ? "" : "s"}` }); }} /></label>
      )}
      {kind === "condition" && <p className="cp-hint" title="If the lead has replied on any channel, they leave the sequence and the reply shows in Inbox. Otherwise the next touch goes out."><GitBranch size={12} /> Replied, or said yes / no on a call → exit + Inbox · else → next touch</p>}
      {kind === "trigger" && (
        <>
          <p className="cp-stats" title="A touch skips leads it can't reach."><span className="cp-stat"><Users size={12} /> {node.data.listName}</span><span className="cp-stat"><Mail size={12} /><b>{node.data.reach?.email ?? 0}</b> email</span><span className="cp-stat"><Phone size={12} /><b>{node.data.reach?.phone ?? 0}</b> call/WhatsApp</span></p>
          <div className="ox-sendfrom">
            <div className="ox-sendfrom-head"><SendIcon size={14} /> Sending from {editable && <button type="button" className="ox-help" onClick={onChangeSenders}>Change</button>}</div>
            {senders.length ? senders.map((s) => (
              <div key={s.id} className="ox-sendfrom-row"><BrandLogo brand={(s.provider === "google" ? "google-color" : s.provider === "meta" ? "whatsapp" : "imap") as Brand} size={18} />
                <b>{s.address}</b><span>{s.channel === "email" ? "Email" : "WhatsApp"}</span>{s.status !== "connected" && <em>{s.status}</em>}</div>
            )) : <div className="v2-muted2" title="Tests and sends use any connected account.">Any connected account</div>}
          </div>
        </>
      )}
      {kind === "end" && <p className="v2-muted2">{node.data.reason === "replied" ? "Replied · no more touches" : "Last touch sent"}</p>}
      {editable && onRemove && (
        <button type="button" className="ox-remove" onClick={() => confirm(`Remove ${node.data.title}? The steps after it move up.`) && onRemove()}><Trash2 size={14} /> Remove this step</button>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------- sending as

/** Who the campaign speaks for. Approve fails without it, so when it is not confirmed yet it opens
 *  as a popup the moment the builder loads (Tarun, 2026-10-31) instead of an easy-to-miss card in
 *  the thread; the thread keeps a one-line chip once it is saved. */
function SendingAs({ campaign, editable, onDone }: { campaign: CampaignView; editable: boolean; onDone: (c: CampaignView) => void }) {
  const confirmed = campaign.senderProfile;
  const [open, setOpen] = useState(!confirmed && editable);
  const [f, setF] = useState(() => confirmed ?? campaign.proposedProfile);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    setBusy(true); setErr(null);
    const d = await (await fetch(`/api/v2/outreach/campaigns/${campaign.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ senderProfile: f }) })).json().catch(() => ({}));
    setBusy(false);
    if (d.campaign) { onDone(d.campaign); setOpen(false); toast.success("Saved", "Every email and AI call now introduces itself this way."); }
    else { setErr(d.error ?? "Couldn't save"); toast.error("Couldn't save", d.error ?? "Please try again."); }
  }
  return (
    <>
      {confirmed ? (
        <div className="sa-chip" title="Who this campaign speaks for">
          <Building2 size={14} /> <b>{confirmed.company}</b>
          <span className="sa-sep">·</span><span className="sa-offer">{confirmed.offer}</span>
          {confirmed.callerName && <><span className="sa-sep">·</span><Phone size={13} /> {confirmed.callerName}</>}
          {(confirmed.hook || confirmed.pitch) && <><span className="sa-sep">·</span><span className="sa-pb-on" title={[confirmed.hook, confirmed.pitch].filter(Boolean).join(" — ")}>Playbook</span></>}
          {editable && <button type="button" className="sa-edit" onClick={() => { setF(confirmed); setOpen(true); }} aria-label="Edit sending as"><Pencil size={13} /></button>}
        </div>
      ) : editable && (
        <button type="button" className="sa-chip warn" onClick={() => setOpen(true)}>
          <AlertTriangle size={14} /> Confirm who this campaign is from — needed to launch
        </button>
      )}
      {open && (
        <Modal title="Who is this campaign from?" onClose={() => setOpen(false)} wide>
          <p className="sa-why">Every email and AI call introduces itself with this. Launching needs it.</p>
          <div className="sa-card">
            <label><span>Company</span><input autoFocus value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} placeholder="Gigzman" /></label>
            <label title="How the AI caller says the name. Hindi letters are pronounced clearly; English letters can come out garbled."><span>Say it as</span><input value={f.companySpoken ?? ""} onChange={(e) => setF({ ...f, companySpoken: e.target.value })} placeholder="गिग्ज़मैन (optional, for calls)" /></label>
            <label><span>Offer</span><input value={f.offer} onChange={(e) => setF({ ...f, offer: e.target.value })} placeholder="Website development" /></label>
            <label><span>Caller</span><input value={f.callerName} onChange={(e) => setF({ ...f, callerName: e.target.value })} placeholder="Tarun" /></label>
          </div>
          {/* The campaign's own playbook: every touch and every AI call is built on it. */}
          <div className="sa-pb">
            <div className="sa-pb-head"><b>Playbook</b><span>Optional · the planner and the AI caller follow it</span></div>
            <label><span>Hook</span>
              <textarea rows={2} value={f.hook ?? ""} onChange={(e) => setF({ ...f, hook: e.target.value })}
                placeholder="Do you know why your competitors get more leads on Google than you?" /></label>
            <label><span>How to pitch</span>
              <textarea rows={3} value={f.pitch ?? ""} onChange={(e) => setF({ ...f, pitch: e.target.value })}
                placeholder="When they ask why: they have a website. We already made one for you — want to see it on a 10-minute call? Keep it a conversation, not a sales call." /></label>
            <label><span>Objections</span>
              <textarea rows={2} value={f.objections ?? ""} onChange={(e) => setF({ ...f, objections: e.target.value })}
                placeholder="“Already have a website” → we only fix what isn't bringing enquiries. “Too costly” → price shared on the call, nothing to decide now." /></label>
            <label><span>Language</span>
              <select value={f.language ?? ""} onChange={(e) => setF({ ...f, language: e.target.value })}>
                <option value="">Hindi, then theirs (default)</option>
                <option value="Hindi, switch to the person's language">Hindi first</option>
                <option value="English, switch to the person's language">English first</option>
                <option value="Hinglish">Hinglish</option>
              </select></label>
          </div>
          {err && <div className="ox-form-err"><AlertTriangle size={14} /> {err}</div>}
          <div className="ox-modal-foot">
            <button type="button" className="v2-btn" onClick={() => setOpen(false)}>Later</button>
            <button type="button" className="v2-btn primary" onClick={save} disabled={busy || !f.company.trim() || !f.offer.trim()}>
              {busy ? <Loader2 size={14} className="ox-spin" /> : <Check size={14} />} Confirm</button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ---------------------------------------------------------------- live calls

type CallRow = { sendId: number; lead: string; phone: string | null; area: string | null; attempt: number; at: string | null; outcome: string | null; note: string | null; recording: boolean; callbackAt: string | null };
type LogLine = { id: number; sendId: number | null; at: string; kind: string; text: string };
type CallsData = { fetchedAt?: number; now: CallRow[]; next: CallRow[]; done: CallRow[]; log: LogLine[]; touches?: Array<{ nodeId: string; waiting: number; done: number; next: string | null }>;
  counts: { waiting: number; calling: number; finished: number; total: number; outcomes: Record<string, number> } };

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" });
const mins = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)) : 0);

/** One send's own log lines, oldest first. */
function SendLog({ lines }: { lines: LogLine[] }) {
  if (!lines.length) return null;
  return <ol className="lc-log mini">{[...lines].reverse().map((l) => <li key={l.id} className={`k-${l.kind}`}><time>{clock(l.at)}</time><span>{l.text}</span></li>)}</ol>;
}

const shortTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" }) : "—");

/** Who the AI agent is calling right now, who is next, and how the finished calls went. Polls. */
function LiveCalls({ campaignId, running, touchName }: { campaignId: string; running: boolean; touchName: (nodeId: string) => string }) {
  const [d, setD] = useState<CallsData | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    let stop = false;
    const load = () => fetch(`/api/v2/outreach/campaigns/${campaignId}/calls`).then((r) => r.json()).then((x) => !stop && x.counts && setD({ ...x, fetchedAt: Date.now() })).catch(() => {});
    void load();
    const iv = setInterval(load, running ? 10_000 : 60_000);
    return () => { stop = true; clearInterval(iv); };
  }, [campaignId, running]);
  if (!d) return <div className="lc-wrap"><div className="v2-empty"><Loader2 size={16} className="ox-spin" /> Loading calls…</div></div>;
  const o = d.counts.outcomes;
  const good = (o.booked ?? 0) + (o.interested ?? 0);
  return (
    <div className="lc-wrap">
      {/* Every number here counts LEADS (each once), not calls. */}
      <div className="lc-tally">
        <span title="Leads called at least once, of the leads with a mobile"><b>{d.counts.finished}</b>/{d.counts.total} leads called</span>
        <span className="g"><b>{good}</b> yes</span>
        <span className="r"><b>{o.not_interested ?? 0}</b> no</span>
        <span><b>{(o.no_answer ?? 0) + (o.busy ?? 0)}</b> no pick-up</span>
        <span><b>{d.counts.waiting}</b> leads waiting</span>
      </div>
      {(d.touches?.length ?? 0) > 1 && (
        <div className="lc-touches">
          {d.touches!.map((t) => (
            <span key={t.nodeId}><b>{touchName(t.nodeId)}</b> {t.done} called · {t.waiting} to go{t.next ? ` · next ${shortTime(t.next)}` : ""}</span>
          ))}
        </div>
      )}

      <section className="lc-sec">
        <h4>On the line</h4>
        {d.now.length ? d.now.map((r) => (
          <div key={r.sendId} className="lc-nowbox">
            <div className="lc-now">
              <span className="lc-ring" aria-hidden><Phone size={14} /></span>
              <span className="lc-who"><b>{r.lead}</b><em>{[r.phone, r.attempt > 1 ? `dial ${r.attempt}` : null, r.at ? `dialled ${mins(r.at)} min ago` : null].filter(Boolean).join(" · ")}</em></span>
            </div>
            {/* Past a few minutes the line is usually not ringing any more: say what we are waiting for. */}
            {mins(r.at) >= 4 && <p className="lc-wait">Waiting for the call&apos;s result from the voice platform — if none comes it counts as not answered at 12 min and the next lead is dialled.</p>}
            <SendLog lines={d.log.filter((l) => l.sendId === r.sendId)} />
          </div>
        )) : <p className="lc-empty">{running ? `No call right now — next one ${d.next[0] ? shortTime(d.next[0].at) : "when the queue fills"}` : "Calls are paused"}</p>}
      </section>

      <section className="lc-sec">
        <h4>Up next <span>{d.counts.waiting} leads</span></h4>
        {d.next.length ? (
          <ol className="lc-list">
            {d.next.map((r, i) => (
              <li key={r.sendId}><span className="lc-pos">{i + 1}</span><span className="lc-who"><b>{r.lead}</b><em>{[r.area, r.attempt > 1 ? `retry ${r.attempt}${r.callbackAt ? " · they asked" : ""}` : null].filter(Boolean).join(" · ")}</em></span>
                {/* Calls go one after another (gap after each ends): a lead already due is simply in
                    line. Only a later day (or a callback time) is a real clock time. */}
                <time>{r.at && new Date(r.at).getTime() <= (d.fetchedAt ?? 0) + 60_000 ? (i === 0 ? "next" : "in queue") : shortTime(r.at)}</time></li>
            ))}
          </ol>
        ) : <p className="lc-empty">Queue is empty</p>}
        {d.counts.waiting > d.next.length && <p className="lc-empty">+ {d.counts.waiting - d.next.length} more leads</p>}
      </section>

      <section className="lc-sec">
        <h4>Finished</h4>
        {d.done.length ? (
          <ul className="lc-list">
            {d.done.map((r) => {
              const oc = r.outcome ? CALL_OUTCOME[r.outcome] : null;
              return (
                <li key={r.sendId} className="lc-done">
                  <button type="button" className="lc-row" onClick={() => setOpen(open === r.sendId ? null : r.sendId)} aria-expanded={open === r.sendId}>
                    <span className="lc-who"><b>{r.lead}</b><em>{[shortTime(r.at), r.attempt > 1 ? `${r.attempt} dials` : null].filter(Boolean).join(" · ")}</em></span>
                    {oc && <i className={`lc-oc ${oc.tone}`}>{oc.label}</i>}
                  </button>
                  {open === r.sendId && (
                    <div className="lc-more">
                      {r.recording && <audio controls preload="none" src={`/api/v2/outreach/voice/recording/send-${r.sendId}`} />}
                      {d.log.some((l) => l.sendId === r.sendId) ? <SendLog lines={d.log.filter((l) => l.sendId === r.sendId)} /> : r.note && <p>{r.note}</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : <p className="lc-empty">No finished calls yet</p>}
      </section>
      <section className="lc-sec">
        <h4>Activity <span>live</span></h4>
        {d.log.length ? (
          <ol className="lc-log">
            {d.log.slice(0, 80).map((l) => <li key={l.id} className={`k-${l.kind}`}><time>{clock(l.at)}</time><span>{l.text}</span></li>)}
          </ol>
        ) : <p className="lc-empty">Nothing has run yet</p>}
      </section>
      <Link href="/inbox" className="ox-help lc-inbox">Summaries in Inbox <ArrowUpRight size={11} /></Link>
    </div>
  );
}

// ---------------------------------------------------------------- add a step by hand

/** The canvas's "+ Add step" (n8n's node picker): a touch inserted after the selected one. */
function AddStepMenu({ after, onAdd }: { after: string; onAdd: (ch: Channel, mode?: "ai" | "task") => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as HTMLElement)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  const items: Array<{ ch: Channel; mode?: "ai" | "task"; icon: typeof Mail; label: string; desc: string; soon?: boolean }> = [
    { ch: "email", icon: Mail, label: "Email", desc: "From your connected mailbox" },
    { ch: "call", mode: "ai", icon: Phone, label: "AI call", desc: "Voice agent calls, loops until yes / no" },
    { ch: "call", mode: "task", icon: Headset, label: "Call task", desc: "A reminder for you to call" },
    { ch: "whatsapp", icon: MessageCircle, label: "WhatsApp", desc: WHATSAPP_LIVE ? "From your number" : "Coming soon — skipped at launch", soon: !WHATSAPP_LIVE },
  ];
  const pick = (i: (typeof items)[number]) => { onAdd(i.ch, i.mode); setOpen(false); };
  return (
    <div className="ox-addstep" ref={ref}>
      <button type="button" className="ox-addstep-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><Plus size={15} /> Add step</button>
      {open && (
        <div className="ox-addstep-menu" role="menu">
          <div className="ox-addstep-where">Adds {after}</div>
          {items.map((i) => (
            <button type="button" role="menuitem" key={i.label} className={`ox-addstep-item k-${i.ch}`} onClick={() => pick(i)}>
              <span className="ox-addstep-ic"><i.icon size={15} /></span>
              <span><b>{i.label}{i.soon && <span className="ox-soon">Soon</span>}</b><em>{i.desc}</em></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- test call result

/** The latest "Send test" call, live: ringing → summary + recording, without leaving the builder
 *  (Tarun, 2026-11-02: the recording never showed after a test call). Polls while the phone rings. */
function TestCallCard({ campaignId, initial }: { campaignId: string; initial: TestCallView }) {
  const [t, setT] = useState(initial);
  useEffect(() => {
    if (t.status !== "calling") return;
    const iv = setInterval(() => {
      fetch(`/api/v2/outreach/campaigns/${campaignId}/test`).then((r) => r.json()).then((d) => d.testCall && setT(d.testCall)).catch(() => {});
    }, 12_000);
    return () => clearInterval(iv);
  }, [campaignId, t.status]);
  const when = new Date(t.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return (
    <div className={`tc-card s-${t.status}`} role="status" aria-live="polite">
      <div className="tc-head">
        <span className="tc-ic">{t.status === "calling" ? <span className="tc-ring" aria-hidden /> : null}<Phone size={14} /></span>
        <b>{t.status === "calling" ? "Test call in progress" : t.status === "done" ? "Test call" : "Test call didn't connect"}</b>
        <span className="tc-meta">{t.status === "calling" ? "result in ~1 min after you hang up" : [t.note, when].filter(Boolean).join(" · ")}</span>
      </div>
      {t.status === "done" && t.recording && (
        <audio className="tc-audio" controls preload="none" src={`/api/v2/outreach/voice/recording/${t.inboxId ?? `send-${t.sendId}`}`}>
          <a href={`/api/v2/outreach/voice/recording/${t.inboxId ?? `send-${t.sendId}`}`}>Download the recording</a>
        </audio>
      )}
      {t.status === "done" && !t.recording && <p className="tc-sum v2-muted2">No recording for this call.</p>}
      {t.summary && <p className="tc-sum">{t.summary.split("\n\n").slice(0, 2).join(" · ")}</p>}
      {t.inboxId && <Link href="/inbox" className="ox-help">Open in Inbox <ArrowUpRight size={11} /></Link>}
    </div>
  );
}

// ---------------------------------------------------------------- modals

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="ox-modal-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`ox-modal${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="ox-modal-head"><b>{title}</b><button type="button" className="v2-iconbtn" onClick={onClose} aria-label="Close"><X size={16} /></button></div>
        {children}
      </div>
    </div>
  );
}

function ListPicker({ current, onPick, onClose }: { current: string | null; onPick: (l: ListInfo) => void; onClose: () => void }) {
  const [lists, setLists] = useState<ListInfo[] | null>(null);
  useEffect(() => { fetch("/api/v2/leads").then((r) => r.json()).then((d) => setLists(d.lists ?? [])).catch(() => setLists([])); }, []);
  return (
    <Modal title="Pick a list" onClose={onClose} wide>
      <div className="ox-picklist">
        {lists === null && <div className="v2-empty"><Loader2 size={16} className="ox-spin" /> Loading lists…</div>}
        {lists?.map((l) => (
          <button type="button" key={l.chatId} className={`ox-pickrow${l.chatId === current ? " on" : ""}`} onClick={() => onPick(l)}>
            <b>{l.name}</b><span>{l.count} leads · {l.withEmail ?? 0} email · {l.withPhone ?? 0} phone</span>
          </button>
        ))}
        {lists?.length === 0 && <div className="v2-empty">No lists yet · find leads in a chat</div>}
      </div>
    </Modal>
  );
}

function SenderPicker({ campaign, onClose, onDone }: { campaign: CampaignView; onClose: () => void; onDone: (c: CampaignView) => void }) {
  const [senders, setSenders] = useState<Array<{ id: string; channel: string; provider: string; address: string; status: string; dailyLimit: number; sentToday: number }> | null>(null);
  const [pick, setPick] = useState<Record<string, string>>(() => Object.fromEntries(campaign.senders.map((s) => [s.channel, s.id])));
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState<{ configured: boolean; ok: boolean; note: string; creditsPerMinute: number; window: { from: string; to: string } } | null>(null);
  useEffect(() => {
    fetch("/api/v2/outreach/senders").then((r) => r.json()).then((d) => {
      const list = (d.senders ?? []).filter((s: { status: string }) => s.status === "connected");
      setSenders(list);
      setVoice(d.voice ?? null);
      // One connected account per channel is the obvious answer — pre-select it.
      setPick((p) => { const n = { ...p }; for (const ch of WHATSAPP_LIVE ? ["email", "whatsapp"] : ["email"]) { const of = list.filter((s: { channel: string }) => s.channel === ch); if (!n[ch] && of.length === 1) n[ch] = of[0].id; } return n; });
    }).catch(() => setSenders([]));
  }, []);
  async function save(ids: string[]) {
    setBusy(true);
    const d = await (await fetch(`/api/v2/outreach/campaigns/${campaign.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ senderIds: ids }) })).json().catch(() => ({}));
    setBusy(false);
    if (d.campaign) { onDone(d.campaign); toast.success("Senders saved"); } else toast.error("Couldn't save senders", d.error ?? "Please try again.");
  }
  const groups = [{ ch: "email", label: "Email from" }, { ch: "whatsapp", label: "WhatsApp from" }];
  return (
    <Modal title="Send from" onClose={onClose}>
      {senders === null ? <div className="v2-empty"><Loader2 size={16} className="ox-spin" /> Loading…</div> : (
        <>
          {groups.map((g) => {
            const of = senders.filter((s) => s.channel === g.ch);
            if (g.ch === "whatsapp" && !WHATSAPP_LIVE) {
              return (
                <div key={g.ch} className="ox-pickgroup">
                  <div className="ox-sub-title">{g.label} <span className="ox-soon">Coming soon</span></div>
                  <div className="v2-muted2">WhatsApp sending isn&apos;t live yet</div>
                </div>
              );
            }
            return (
              <div key={g.ch} className="ox-pickgroup">
                <div className="ox-sub-title">{g.label}</div>
                {of.map((s) => (
                  <label key={s.id} className={`ox-pickrow radio${pick[g.ch] === s.id ? " on" : ""}`}>
                    <input type="radio" name={g.ch} checked={pick[g.ch] === s.id} onChange={() => setPick({ ...pick, [g.ch]: s.id })} />
                    <BrandLogo brand={(s.provider === "google" ? "google-color" : s.provider === "meta" ? "whatsapp" : "imap") as Brand} size={18} />
                    <span><b>{s.address}</b><span>{s.sentToday}/{s.dailyLimit} sent today</span></span>
                  </label>
                ))}
                {!of.length && <div className="ox-note">No {g.ch === "email" ? "mailbox" : "WhatsApp number"} · <Link href="/integrations">Connect →</Link></div>}
              </div>
            );
          })}
          {/* Calls come from the built-in Mantis voice agent — nothing to pick, but the picker has to
              say so, or a campaign with a Call touch looks like it has no caller. */}
          <div className="ox-pickgroup">
            <div className="ox-sub-title">Calls from</div>
            {voice ? (
              <Link href="/integrations/voice" className={`ox-pickrow radio${voice.configured && voice.ok ? " on" : ""}`}>
                <BrandLogo brand="voice" size={18} />
                <span><b>Mantis AI voice agent</b>
                  <span>{voice.configured && voice.ok
                    ? `Ready · ${voice.creditsPerMinute} credits/min · calls ${voice.window.from}–${voice.window.to} IST`
                    : `Unavailable — ${voice.note || "not set up"}`}</span></span>
              </Link>
            ) : <div className="ox-note">Voice status unknown · <Link href="/integrations/voice">Check setup →</Link></div>}
          </div>
          <div className="ox-modal-foot">
            <button type="button" className="v2-btn" onClick={() => save([])} disabled={busy}>Decide later</button>
            <button type="button" className="v2-btn primary" onClick={() => save(Object.values(pick))} disabled={busy || !Object.keys(pick).length}>{busy ? <Loader2 size={15} className="ox-spin" /> : <Check size={15} />} Use {Object.keys(pick).length > 1 ? "these" : "this"}</button>
          </div>
        </>
      )}
    </Modal>
  );
}

function TestModal({ campaign, onClose, onDone }: { campaign: CampaignView; onClose: () => void; onDone: (c: CampaignView) => void }) {
  const [to, setTo] = useState({ name: "", email: "", whatsapp: "", mobile: "" });
  const [channels, setChannels] = useState<{ email: boolean; whatsapp: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v2/outreach/senders").then((r) => r.json()).then((d) => {
      const tc = d.testContacts ?? {};
      setTo({ name: tc.name ?? "", email: tc.email ?? "", whatsapp: tc.whatsapp ?? "", mobile: tc.mobile ?? "" });
      const on = (ch: string) => (d.senders ?? []).some((s: { channel: string; status: string }) => s.channel === ch && s.status === "connected");
      setChannels({ email: on("email"), whatsapp: on("whatsapp") });
    }).catch(() => {});
  }, []);
  const used = new Set(touchesOf(campaign.graph).map((t) => t.channel));
  const callTouches = touchesOf(campaign.graph).map((t, i) => ({ ...t, n: i + 1 })).filter((t) => t.channel === "call");
  const isAi = (t: { nodeId: string }) => campaign.graph.nodes.find((x) => x.id === t.nodeId)?.data.voice?.mode === "ai";
  const aiCall = callTouches.find(isAi) ?? null;
  const manualCall = callTouches.find((t) => !isAi(t)) ?? null;
  const callCredits = CREDIT_COST.voice_minute;
  async function send() {
    setBusy(true); setErr(null);
    const d = await (await fetch(`/api/v2/outreach/campaigns/${campaign.id}/test`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(to) })).json().catch(() => ({}));
    setBusy(false);
    if (d.results) {
      setResults(d.results); onDone(d.campaign);
      const ok = (d.results as { ok: boolean }[]).filter((x) => x.ok).length;
      if (ok) toast.success("Test sent", `${ok} of ${d.results.length} touches went to you.`);
      else toast.error("Test didn't go out", "None of the touches could be sent — see the details.");
    } else { setErr(d.error ?? "Test failed · retry"); toast.error("Test failed", d.error ?? "Please try again."); }
  }
  return (
    <Modal title="Send yourself a test" onClose={onClose}>
      {!results ? (
        <>
          <p className="cp-stats" title="Every touch goes to you exactly as a lead would get it, filled with the first lead's real details. Nothing goes to your leads."><span className="cp-stat">Every touch → you</span><span className="cp-stat">1st lead&apos;s data</span><span className="cp-stat ok"><ShieldCheck size={12} /> Leads get nothing</span></p>
          {campaign.senders.length > 0 && <div className="ox-fromline">From: {campaign.senders.map((s) => <span key={s.id}><BrandLogo brand={(s.provider === "google" ? "google-color" : s.provider === "meta" ? "whatsapp" : "imap") as Brand} size={14} /> {s.address}</span>)}</div>}
          <div className="ox-grid1">
            <label title="The test uses this as the lead's name — the AI caller greets you by it."><span><UserRound size={14} /> Your name</span>
              <input value={to.name} onChange={(e) => setTo({ ...to, name: e.target.value })} placeholder="Tarun" autoComplete="given-name" /></label>
            <label><span><Mail size={14} /> Email {used.has("email") && channels && !channels.email && <em className="warn">not connected</em>}</span>
              <input type="email" value={to.email} onChange={(e) => setTo({ ...to, email: e.target.value })} placeholder="you@company.com" /></label>
            {WHATSAPP_LIVE ? (
              <label><span><MessageCircle size={14} /> WhatsApp {used.has("whatsapp") && channels && !channels.whatsapp && <em className="warn">WhatsApp not connected</em>}</span>
                <input value={to.whatsapp} onChange={(e) => setTo({ ...to, whatsapp: e.target.value })} placeholder="+91 98xxxxxxxx" inputMode="tel" /></label>
            ) : (
              <label className="ox-soon-field" title="WhatsApp sending is coming soon — WhatsApp touches are skipped in tests and at launch."><span><MessageCircle size={14} /> WhatsApp <span className="ox-soon">Coming soon</span></span>
                <input value="" disabled placeholder="Not available yet" /></label>
            )}
            <label><span><Phone size={14} /> AI call test {aiCall ? <em>touch {aiCall.n}</em> : null}</span>
              <input value={to.mobile} onChange={(e) => setTo({ ...to, mobile: e.target.value })} placeholder="+91 98xxxxxxxx" inputMode="tel" /></label>
          </div>
          {/* What the number above actually does — it was a bare "Mobile" field, and nothing happened
              when the sequence had no AI call touch. */}
          <div className="ox-note" style={{ flexWrap: "nowrap", gap: 8, alignItems: "flex-start" }}><Phone size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            {aiCall
              ? <span title={`The Mantis voice agent calls this number right away — any time of day, tests skip calling hours — once, with touch ${aiCall.n}'s brief, exactly as a lead would hear it.`}>Calls now · once · touch {aiCall.n} brief · {callCredits} credits/min</span>
              : manualCall
                ? <span title={`Touch ${manualCall.n} is a call task for you, not an AI call. Switch it to “AI voice agent” to test a real call.`}>Touch {manualCall.n} is a manual task · switch to AI to test</span>
                : <span title="This sequence has no call touch yet, so there is nothing to call with. Add a Call touch (AI voice agent) to test it.">No call touch · nothing to call</span>}
          </div>
          {channels && ((used.has("email") && !channels.email) || (WHATSAPP_LIVE && used.has("whatsapp") && !channels.whatsapp)) && (
            <div className="ox-note" title="Some channels aren't connected, so their tests can't go out."><AlertTriangle size={14} /> Channels missing · tests skipped · <Link href="/integrations">Connect →</Link></div>
          )}
          {err && <div className="ox-form-err"><AlertTriangle size={14} /> {err}</div>}
          <div className="ox-modal-foot"><button type="button" className="v2-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="v2-btn primary" onClick={send} disabled={busy}>{busy ? <Loader2 size={15} className="ox-spin" /> : <Send size={14} />} Send test</button></div>
        </>
      ) : (
        <>
          {/* One compact row per touch: channel, touch, where it went, a status badge — the reason
              is in the tooltip, not a sentence on the screen. */}
          {/* The sending account once, not on every row (the address it went to needs the room). */}
          {(() => { const f = [...new Set(results.map((r) => r.from).filter((x): x is string => !!x && x.includes("@")))]; return f.length ? <div className="tr-hint" style={{ marginTop: 0, marginBottom: 8 }}><SendIcon size={13} /> {f.join(", ")}</div> : null; })()}
          <ul className="tr-list">
            {results.map((r, i) => {
              const Icon = r.channel === "email" ? Mail : r.channel === "whatsapp" ? MessageCircle : Phone;
              return (
                <li key={i} className="tr-row" title={r.detail ?? r.note}>
                  <span className={`tr-ic ch-${r.channel}`}><Icon size={14} /></span>
                  <span className="tr-touch">Touch {r.touch}</span>
                  <span className="tr-to">{r.to ?? "—"}</span>
                  {r.from && !r.from.includes("@") ? <span className="tr-from">{r.from}</span> : <span />}
                  <span className={`tr-badge ${r.ok ? "ok" : "warn"}`}>{r.ok ? <Check size={12} /> : <AlertTriangle size={12} />} {r.note}</span>
                </li>
              );
            })}
          </ul>
          {results.some((r) => r.ok && r.channel === "email") && <div className="tr-hint"><Mail size={13} /> Replies → Inbox</div>}
          <div className="ox-modal-foot"><span /><button type="button" className="v2-btn primary" onClick={onClose}>Done</button></div>
        </>
      )}
    </Modal>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** 30 → "30 sec", 90 → "1 min 30 sec", 300 → "5 min". */
const gapLabel = (sec: number) => (sec < 60 ? `${sec} sec` : `${Math.floor(sec / 60)} min${sec % 60 ? ` ${sec % 60} sec` : ""}`);

function ApproveModal({ campaign, onClose, onDone, onPlans }: { campaign: CampaignView; onClose: () => void; onDone: (c: CampaignView) => void; onPlans: () => void }) {
  const [when, setWhen] = useState<"now" | "later">("now");
  const [startAt, setStartAt] = useState("");
  const [from, setFrom] = useState("09:30");
  const [to, setTo] = useState("18:30");
  const [days, setDays] = useState([1, 2, 3, 4, 5, 6]);
  const [cap, setCap] = useState(40);
  const [gap, setGap] = useState(300); // seconds between AI calls
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // The server is the authority (402 plan_required); the view's flag just lets the modal say so
  // before anyone clicks.
  const [planBlocked, setPlanBlocked] = useState(!campaign.planActive);
  const touches = touchesOf(campaign.graph);
  const l = campaign.list;
  const waSkipped = !WHATSAPP_LIVE && touches.some((t) => t.channel === "whatsapp");
  const reach = touches.reduce((n, t) => n + (t.channel === "whatsapp" && !WHATSAPP_LIVE ? 0 : t.channel === "email" ? l?.withEmail ?? 0 : l?.withPhone ?? 0), 0);
  const aiCalls = touches.filter((t) => t.channel === "call" && campaign.graph.nodes.find((n) => n.id === t.nodeId)?.data.voice?.mode === "ai").length * (l?.withPhone ?? 0);
  const voiceCredits = aiCalls * EST_MINUTES_PER_CALL * CREDIT_COST.voice_minute;
  async function approve() {
    setBusy(true); setErr(null);
    const d = await (await fetch(`/api/v2/outreach/campaigns/${campaign.id}/approve`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ startAt: when === "later" && startAt ? new Date(startAt).toISOString() : null, from, to, days, dailyCap: cap, callGapSec: gap }) })).json().catch(() => ({}));
    setBusy(false);
    if (d.campaign) { onDone(d.campaign); toast.success("Campaign approved", d.campaign.status === "scheduled" ? "It starts at the time you set." : "Sending has started."); }
    else if (d.error === "plan_required") { setPlanBlocked(true); toast.warning("Action needed to continue", "Launching needs a plan."); }
    else { setErr(d.error ?? "Couldn't approve."); toast.error("Couldn't approve", d.error ?? "Please try again."); }
  }
  return (
    <Modal title="Approve & schedule" onClose={onClose}>
      {planBlocked && (
        <div className="ox-plan-gate" role="status">
          <span className="ox-plan-gate-ic"><Lock size={15} /></span>
          <span><b>Launch needs a plan</b><span>Testing stays free · plans from {formatINR(Math.min(...CREDIT_PACKS.map((p) => p.pricePaise)))}/mo</span></span>
          <button type="button" className="v2-btn strong" onClick={onPlans}>View plans</button>
        </div>
      )}
      <div className="ox-approve-sum"><span title="Leads a touch can't reach are skipped. A reply stops that lead's sequence."><b>{l?.count ?? 0}</b> leads × <b>{touches.length}</b> touches → ~<b>{reach}</b> messages · reply stops sequence</span>
        {aiCalls > 0 && <><br /><span title="Charged per connected minute after each call. Calls run one at a time."><b>{aiCalls}</b> AI calls (≈{EST_MINUTES_PER_CALL} min) → ≤ ~<b>{voiceCredits.toLocaleString("en-IN")}</b> credits · {CALL_WINDOW.from}–{CALL_WINDOW.to} IST</span></>}</div>
      <div className="ox-seg big" role="group" aria-label="Start">
        <button type="button" className={when === "now" ? "on" : ""} onClick={() => setWhen("now")}>Start now</button>
        <button type="button" className={when === "later" ? "on" : ""} onClick={() => setWhen("later")}>Schedule</button>
      </div>
      {when === "later" && <label className="ox-field">Start at<input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></label>}
      <div className="ox-grid2">
        <label className="ox-field">Send between<input type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="ox-field">and<input type="time" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <div className="ox-days" role="group" aria-label="Days">{DAYS.map((d, i) => (
        <button type="button" key={d} className={days.includes(i + 1) ? "on" : ""} onClick={() => setDays(days.includes(i + 1) ? days.filter((x) => x !== i + 1) : [...days, i + 1].sort())}>{d}</button>
      ))}</div>
      {aiCalls > 0 && (
        <div className="ox-field ox-gap">Gap between AI calls
          <span className="ox-stepper" role="group" aria-label="Gap between AI calls">
            <button type="button" onClick={() => setGap((g) => Math.max(30, g - (g > 300 ? 60 : 30)))} disabled={gap <= 30} aria-label="Shorter gap">−</button>
            <output aria-live="polite">{gapLabel(gap)}</output>
            <button type="button" onClick={() => setGap((g) => Math.min(3600, g + (g >= 300 ? 60 : 30)))} disabled={gap >= 3600} aria-label="Longer gap">+</button>
          </span>
          <span className="v2-muted2" title={`Counted from when the previous call ends. Calls run ${CALL_WINDOW.from}–${CALL_WINDOW.to} IST, one at a time.`}>after each call ends · one at a time · {CALL_WINDOW.from}–{CALL_WINDOW.to} IST</span>
        </div>
      )}
      <label className="ox-field">New leads per day<input type="number" min={5} max={500} value={cap} onChange={(e) => setCap(Number(e.target.value))} /><span className="v2-muted2" title="Keep it near 30–50 per mailbox to stay out of spam.">IST · 30–50 per mailbox</span></label>
      {waSkipped && <div className="ox-note" title="WhatsApp sending is coming soon. WhatsApp touches are skipped; the rest of the sequence goes out."><span className="ox-soon">Coming soon</span> WhatsApp touches skipped</div>}
      {!campaign.sendingOn && <div className="ox-note" title="Live sending is switched off on this server — approving queues everything, and nothing goes to your leads until it is switched on."><AlertTriangle size={14} /> Sending off · approval only queues</div>}
      {err && <div className="ox-form-err"><AlertTriangle size={14} /> {err}</div>}
      <div className="ox-modal-foot"><button type="button" className="v2-btn" onClick={onClose}>Cancel</button>
        <button type="button" className="v2-btn primary" onClick={approve} disabled={busy || planBlocked || !days.length || (when === "later" && !startAt)}>{busy ? <Loader2 size={15} className="ox-spin" /> : <CheckCircle2 size={15} />} Approve</button></div>
    </Modal>
  );
}
