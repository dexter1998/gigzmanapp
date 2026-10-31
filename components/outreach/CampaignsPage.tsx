"use client";

/** Campaigns: every campaign with its status, and the ways to start one (sequence or quick send). */

import { WHATSAPP_LIVE } from "@/lib/v2/outreach/channels";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Workflow, Mail, MessageCircle, Phone, Loader2, X, CalendarClock, ShieldCheck, Send } from "lucide-react";
import "../compact.css";

type Row = { id: string; name: string; kind: string; status: string; listName: string | null; touches: number; channels: string[]; updatedAt: string;
  stats: { recipients: number; queued: number; sent: number; replied: number; nextDue: string | null } };
type ListInfo = { chatId: string; name: string; count: number; withEmail?: number; withPhone?: number };

const KINDS = [
  { kind: "sequence", title: "Sequence", desc: "3–5 touches · ~2 weeks · stops on reply", icon: Workflow },
  { kind: "quick_email", title: "Quick email", desc: "1 email · no follow-ups", icon: Mail },
  { kind: "quick_whatsapp", title: "Quick WhatsApp", desc: "1 message · approved template", icon: MessageCircle },
  { kind: "quick_call", title: "Quick call list", desc: "1 call task per lead · talk track", icon: Phone },
] as const;

export const STATUS_LABEL: Record<string, string> = { draft: "Draft", testing: "Tested", approved: "Approved", scheduled: "Scheduled", running: "Running", paused: "Paused", done: "Finished" };
export const CH_ICON: Record<string, typeof Mail> = { email: Mail, whatsapp: MessageCircle, call: Phone };

export function CampaignsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [kind, setKind] = useState<string>("sequence");
  const [lists, setLists] = useState<ListInfo[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { fetch("/api/v2/outreach/campaigns").then((r) => r.json()).then((d) => setRows(d.campaigns ?? [])).catch(() => setRows([])); }, []);
  useEffect(() => { if (creating && !lists) fetch("/api/v2/leads").then((r) => r.json()).then((d) => setLists(d.lists ?? [])).catch(() => setLists([])); }, [creating, lists]);

  async function create(listChatId: string) {
    setBusy(listChatId);
    const d = await (await fetch("/api/v2/outreach/campaigns", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ listChatId, kind }) })).json();
    if (d.id) router.push(`/campaigns/${d.id}`); else setBusy(null);
  }

  return (
    <div className="ox-page wide">
      <header className="ox-head">
        <div><h1>Campaigns</h1>
          <div className="cp-stats">
            {rows && <span className="cp-stat"><b>{rows.length}</b> total</span>}
            {rows && <span className="cp-stat ok"><Send size={12} /><b>{rows.filter((r) => r.status === "running").length}</b> running</span>}
            {rows && <span className="cp-stat"><b>{rows.reduce((n, r) => n + r.stats.replied, 0)}</b> replies</span>}
            <span className="cp-stat" title="Every campaign is tested and approved by you before anything goes out."><ShieldCheck size={12} /> Approve before send</span>
          </div>
        </div>
        <button type="button" className="v2-btn primary" onClick={() => setCreating(true)}><Plus size={16} /> Create campaign</button>
      </header>
      <div className="v2-tablebox v2-lms-table">
        <table className="v2-ltable">
          <thead><tr><th>Campaign</th><th>List</th><th>Touches</th><th>Status</th><th className="num">Leads</th><th className="num">Sent</th><th className="num">Replied</th><th>Next send</th></tr></thead>
          <tbody>
            {rows?.map((r) => (
              <tr key={r.id} className="v2-lrow" onClick={() => router.push(`/campaigns/${r.id}`)}>
                <td><b>{r.name}</b><div className="v2-muted2">{KINDS.find((k) => k.kind === r.kind)?.title}</div></td>
                <td className="v2-muted2">{r.listName ?? "—"}</td>
                <td><span className="ox-chs">{r.channels.map((c) => { const I = CH_ICON[c]; return <I key={c} size={14} />; })} {r.touches || "—"}</span></td>
                <td><span className={`ox-cstatus s-${r.status}`}>{STATUS_LABEL[r.status] ?? r.status}</span></td>
                <td className="num">{r.stats.recipients || "—"}</td><td className="num">{r.stats.sent}</td><td className="num">{r.stats.replied}</td>
                <td className="v2-muted2">{r.stats.nextDue ? <span className="ox-next"><CalendarClock size={13} /> {new Date(r.stats.nextDue).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span> : "—"}</td>
              </tr>
            ))}
            {rows === null && <tr><td colSpan={8} className="v2-empty">Loading…</td></tr>}
            {rows?.length === 0 && <tr><td colSpan={8} className="v2-empty"><div className="cp-empty"><Workflow size={22} /><b>No campaigns yet</b><span>Or use Quick Outreach on chat results</span><button type="button" className="v2-btn primary" onClick={() => setCreating(true)}><Plus size={15} /> Create campaign</button></div></td></tr>}
          </tbody>
        </table>
      </div>

      {creating && (
        <div className="ox-modal-wrap" onMouseDown={(e) => e.target === e.currentTarget && setCreating(false)}>
          <div className="ox-modal wide" role="dialog" aria-modal="true" aria-label="Create campaign">
            <div className="ox-modal-head"><b>Create campaign</b><button type="button" className="v2-iconbtn" onClick={() => setCreating(false)} aria-label="Close"><X size={16} /></button></div>
            <div className="ox-kinds">
              {KINDS.map((k) => {
                // WhatsApp is coming soon: the option stays visible but can't be picked.
                const soon = k.kind === "quick_whatsapp" && !WHATSAPP_LIVE;
                return (
                <button type="button" key={k.kind} className={`ox-kind${kind === k.kind ? " on" : ""}`} onClick={() => !soon && setKind(k.kind)}
                  disabled={soon} aria-disabled={soon} title={soon ? "WhatsApp sending is coming soon" : undefined} style={soon ? { opacity: 0.6, cursor: "not-allowed" } : undefined}>
                  <k.icon size={18} /><b>{k.title}{soon && <> <span className="ox-soon">Coming soon</span></>}</b><span>{k.desc}</span>
                </button>
                );
              })}
            </div>
            <div className="ox-sub-title">Pick a list</div>
            <div className="ox-picklist">
              {lists === null && <div className="v2-empty"><Loader2 size={16} className="ox-spin" /> Loading lists…</div>}
              {lists?.map((l) => (
                <button type="button" key={l.chatId} className="ox-pickrow" disabled={!!busy} onClick={() => create(l.chatId)}>
                  <b>{l.name}</b><span>{busy === l.chatId ? "Creating…" : `${l.count} leads · ${l.withEmail ?? 0} email · ${l.withPhone ?? 0} phone`}</span>
                </button>
              ))}
              {lists?.length === 0 && <div className="v2-empty">No lists yet · find leads in a chat</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
