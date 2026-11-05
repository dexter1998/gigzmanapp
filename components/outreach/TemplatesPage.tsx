"use client";

/**
 * Templates library (docs/v2-campaigns.md). Every reusable message — email, WhatsApp, call
 * script — and saved sequences. Quick preview opens a drawer with the message in a real device;
 * a template opens in its own editor screen; Create asks the type first.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Mail, MessageCircle, Phone, Workflow, Search, Eye, ArrowRight, Trash2, X, Sparkles, ImageIcon, Code2, FileText } from "lucide-react";
import { touchesOf, type Graph } from "@/lib/v2/outreach/graph";
import { EmailPreview, WhatsAppPreview, CallPreview } from "./Previews";
import { BrandLogo } from "./BrandLogo";
import "../compact.css";
import { toast } from "@/components/toast/toast";

export type Kind = "email" | "whatsapp" | "call" | "campaign";
export type Tpl = { id: string; kind: Kind; name: string; subject: string | null; body: string; isHtml: boolean; graph: Graph | null; mediaUrl: string | null; usedBy: number; campaignId: string | null; updatedAt: string };

/** Upload an image; returns its hosted URL. */
export async function uploadImage(file: File): Promise<{ url?: string; error?: string }> {
  const fd = new FormData(); fd.append("file", file);
  return (await fetch("/api/v2/media", { method: "POST", body: fd })).json().catch(() => ({ error: "Upload failed." }));
}

export const KINDS: Array<{ kind: Kind; label: string; plural: string; icon: typeof Mail; desc: string }> = [
  { kind: "email", label: "Email", plural: "Email", icon: Mail, desc: "Text or HTML · images · Gmail preview" },
  { kind: "whatsapp", label: "WhatsApp message", plural: "WhatsApp", icon: MessageCircle, desc: "Short message · optional image" },
  { kind: "call", label: "Call script", plural: "Call scripts", icon: Phone, desc: "Opener · question · next lines" },
  { kind: "campaign", label: "Sequence", plural: "Sequences", icon: Workflow, desc: "Multi-touch · saved from a campaign" },
];
const kindOf = (k: Kind) => KINDS.find((x) => x.kind === k)!;
const plain = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\{\{\s*([a-z_]+)\s*\}\}/g, "[$1]").replace(/\s+/g, " ").trim();
const ago = (iso: string) => {
  const d = (Date.now() - Date.parse(iso)) / 86_400_000;
  return d < 1 ? "Today" : d < 2 ? "Yesterday" : d < 7 ? `${Math.floor(d)} days ago` : new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

/** The channel's own logo: Gmail for email, WhatsApp, a phone for calls, a flow for sequences. */
function Glyph({ t }: { t: Tpl }) {
  return (
    <span className={`tl-logo k-${t.kind}`} aria-hidden>
      {t.kind === "email" ? <BrandLogo brand="gmail" size={26} /> : t.kind === "whatsapp" ? <BrandLogo brand="whatsapp" size={26} />
        : t.kind === "call" ? <Phone size={22} /> : <Workflow size={22} />}
    </span>
  );
}

export function TemplatesPage() {
  const router = useRouter();
  const [all, setAll] = useState<Tpl[] | null>(null);
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"recent" | "name" | "used">("recent");
  const [peek, setPeek] = useState<Tpl | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => fetch("/api/v2/outreach/templates").then((r) => r.json()).then((d) => setAll(d.templates ?? [])).catch(() => setAll([]));
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => {
    const l = (all ?? []).filter((t) => (filter === "all" || t.kind === filter) && (!q || `${t.name} ${t.subject ?? ""} ${t.body}`.toLowerCase().includes(q.toLowerCase())));
    return l.sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : sort === "used" ? b.usedBy - a.usedBy : Date.parse(b.updatedAt) - Date.parse(a.updatedAt)));
  }, [all, filter, q, sort]);

  async function remove(t: Tpl) {
    if (!confirm(`Delete “${t.name}”?${t.usedBy ? ` ${t.usedBy} campaign${t.usedBy === 1 ? " keeps" : "s keep"} its own copy.` : ""}`)) return;
    const r = await fetch(`/api/v2/outreach/templates?id=${t.id}`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) toast.success("Template deleted", `“${t.name}” is gone.`); else toast.error("Couldn't delete the template", "Please try again.");
    if (peek?.id === t.id) setPeek(null);
    load();
  }
  async function startFromSequence(t: Tpl) {
    const d = await (await fetch("/api/v2/outreach/campaigns", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ templateId: t.id, name: t.name }) })).json().catch(() => ({}));
    if (d.id) { toast.success("Campaign created", `Started from “${t.name}”.`); router.push(`/campaigns/${d.id}`); }
    else toast.error("Couldn't create the campaign", d.error ?? "Please try again.");
  }

  return (
    <div className="ox-page wide tl">
      <header className="tl-head">
        <div>
          <span className="tl-kicker">Library</span>
          <h1>Templates</h1>
          <div className="cp-stats">
            {all && <span className="cp-stat"><b>{all.length}</b> templates</span>}
            {all && <span className="cp-stat"><Sparkles size={12} /><b>{all.filter((t) => t.campaignId).length}</b> by planner</span>}
            <span className="cp-stat" title="Edit a template and its draft campaigns update too.">Syncs to drafts</span>
          </div>
        </div>
        <button type="button" className="v2-btn primary tl-create" onClick={() => setCreating(true)}><Plus size={17} /> Create template</button>
      </header>

      <div className="tl-bar">
        <div className="tl-tabs" role="tablist">
          {(["all", ...KINDS.map((k) => k.kind)] as Array<Kind | "all">).map((k) => {
            const n = (all ?? []).filter((t) => k === "all" || t.kind === k).length;
            const K = k === "all" ? null : kindOf(k);
            return (
              <button key={k} type="button" role="tab" aria-selected={filter === k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
                {K && <K.icon size={15} />}{k === "all" ? "All" : K!.plural}<span>{n}</span>
              </button>
            );
          })}
        </div>
        <label className="tl-search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates" /></label>
        <select className="tl-sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort">
          <option value="recent">Recently edited</option><option value="used">Most used</option><option value="name">Name</option>
        </select>
      </div>

      <ul className="tl-list">
        {shown.map((t, i) => {
          const K = kindOf(t.kind);
          return (
            <li key={t.id} className="tl-row" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
              <Link href={`/templates/${t.id}`} className="tl-row-main">
                <Glyph t={t} />
                <span className="tl-text">
                  <span className="tl-name">{t.name}</span>
                  <span className="tl-line">{t.kind === "email" ? <><b>{plain(t.subject ?? "") || "(no subject)"}</b> — {plain(t.body).slice(0, 90)}</> : t.kind === "campaign" ? `${t.graph ? touchesOf(t.graph).length : 0} touches · ${[...new Set((t.graph ? touchesOf(t.graph) : []).map((x) => x.channel))].join(", ")}` : plain(t.body).slice(0, 120)}</span>
                  <span className="tl-tags">
                    <span className={`tl-type k-${t.kind}`}><K.icon size={12} /> {K.label}</span>
                    {t.campaignId && <span className="tl-tag planner"><Sparkles size={11} /> Planner</span>}
                    {t.usedBy > 0 && <span className="tl-tag" title={`Used in ${t.usedBy} campaign${t.usedBy === 1 ? "" : "s"}`}><Workflow size={11} /> {t.usedBy}</span>}
                    {t.isHtml && <span className="tl-tag"><Code2 size={11} /> HTML</span>}
                    {(t.mediaUrl || /<img/i.test(t.body)) && <span className="tl-tag"><ImageIcon size={11} /> Image</span>}
                  </span>
                </span>
                <span className="tl-when">{ago(t.updatedAt)}</span>
              </Link>
              <span className="tl-actions">
                <button type="button" className="v2-btn" onClick={() => setPeek(t)}><Eye size={14} /> Quick preview</button>
                <Link href={`/templates/${t.id}`} className="v2-iconbtn" aria-label={`Open ${t.name}`}><ArrowRight size={16} /></Link>
                <button type="button" className="v2-iconbtn" aria-label={`Delete ${t.name}`} onClick={() => remove(t)}><Trash2 size={15} /></button>
              </span>
            </li>
          );
        })}
        {all === null && <li className="tl-empty">Loading…</li>}
        {all && !shown.length && (
          <li className="tl-empty">
            <FileText size={26} />
            <b>{q ? "No matches" : filter === "all" ? "No templates yet" : `No ${kindOf(filter as Kind).plural.toLowerCase()} yet`}</b>
            <span>{filter === "campaign" ? "Campaign → Save as template" : "Create one, or let the planner write it"}</span>
            {filter !== "campaign" && <button type="button" className="v2-btn primary" onClick={() => setCreating(true)}><Plus size={15} /> Create template</button>}
          </li>
        )}
      </ul>

      {peek && <QuickPreview t={peek} onClose={() => setPeek(null)} onUse={() => startFromSequence(peek)} />}

      {creating && (
        <div className="ox-modal-wrap" onMouseDown={(e) => e.target === e.currentTarget && setCreating(false)}>
          <div className="ox-modal wide" role="dialog" aria-modal="true" aria-label="Create template">
            <div className="ox-modal-head"><b>New template</b><button type="button" className="v2-iconbtn" onClick={() => setCreating(false)} aria-label="Close"><X size={16} /></button></div>
            <div className="tl-kinds">
              {KINDS.filter((k) => k.kind !== "campaign").map((k) => (
                <button key={k.kind} type="button" className={`tl-kind k-${k.kind}`} onClick={() => router.push(`/templates/new?kind=${k.kind}`)}>
                  <span className="tl-kind-icon"><k.icon size={22} /></span><b>{k.label}</b><span>{k.desc}</span><ArrowRight size={16} className="tl-kind-go" />
                </button>
              ))}
            </div>
            <p className="tl-kinds-note"><Workflow size={14} /> Sequences: Campaign → Save as template</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Right-side drawer: the template in its real device, without leaving the list. */
function QuickPreview({ t, onClose, onUse }: { t: Tpl; onClose: () => void; onUse: () => void }) {
  const K = kindOf(t.kind);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="tl-drawer-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="tl-drawer" role="dialog" aria-modal="true" aria-label={`Preview ${t.name}`}>
        <header><span className={`tl-type k-${t.kind}`}><K.icon size={12} /> {K.label}</span><b>{t.name}</b>
          <button type="button" className="v2-iconbtn" onClick={onClose} aria-label="Close preview"><X size={17} /></button></header>
        <div className="tl-drawer-stage">
          {t.kind === "email" && <EmailPreview subject={t.subject ?? ""} body={t.body} isHtml={t.isHtml} mediaUrl={t.mediaUrl} defaultDevice="phone" phoneWidth={290} />}
          {t.kind === "whatsapp" && <WhatsAppPreview body={t.body} mediaUrl={t.mediaUrl} width={290} />}
          {t.kind === "call" && <CallPreview body={t.body} width={290} />}
          {t.kind === "campaign" && (
            <ol className="tl-seq">
              {(t.graph ? touchesOf(t.graph) : []).map((x, i) => (
                <li key={x.nodeId}><span className={`tl-seq-dot k-${x.channel}`}>{i + 1}</span>
                  <span><b>Day {x.offsetDays} · {x.channel === "email" ? "Email" : x.channel === "whatsapp" ? "WhatsApp" : "Call"}</b><em>{plain(x.subject ?? x.body).slice(0, 110)}</em></span></li>
              ))}
            </ol>
          )}
        </div>
        <footer>
          <span className="v2-muted2">Sample: {t.kind === "campaign" ? "per lead" : "Green Park Dental, Gurugram"}</span>
          {t.kind === "campaign"
            ? <button type="button" className="v2-btn primary" onClick={onUse}>Use in campaign <ArrowRight size={15} /></button>
            : <Link href={`/templates/${t.id}`} className="v2-btn primary">Edit template <ArrowRight size={15} /></Link>}
        </footer>
      </aside>
    </div>
  );
}
