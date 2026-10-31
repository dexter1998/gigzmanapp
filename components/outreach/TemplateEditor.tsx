"use client";

/**
 * One template, full screen: the message on the left, the lead's device on the right
 * (Gmail on a laptop or phone, WhatsApp, or the call screen). New templates arrive here with
 * their type already chosen (/templates/new?kind=email).
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Check, Loader2, ImagePlus, FileCode2, Type, Code2, X, Trash2, Sparkles, ArrowRight, RefreshCw, Info } from "lucide-react";
import "../compact.css";
import { VARIABLES, touchesOf } from "@/lib/v2/outreach/graph";
import { EmailPreview, WhatsAppPreview, CallPreview, looksHtml } from "./Previews";
import { KINDS, uploadImage, type Kind, type Tpl } from "./TemplatesPage";

type Draft = { id?: string; kind: Kind; name: string; subject: string; body: string; isHtml: boolean; mediaUrl: string | null };

export function TemplateEditor({ id, kind: newKind }: { id: string | null; kind: Kind }) {
  const router = useRouter();
  const [d, setD] = useState<Draft>({ kind: newKind, name: "", subject: "", body: "", isHtml: false, mediaUrl: null });
  const [meta, setMeta] = useState<Pick<Tpl, "usedBy" | "campaignId" | "graph"> | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "loading">(id ? "loading" : "idle");
  const [note, setNote] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const imgRef = useRef<HTMLInputElement | null>(null);
  const htmlRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch("/api/v2/outreach/templates").then((r) => r.json()).then((x: { templates?: Tpl[] }) => {
      const t = x.templates?.find((y) => y.id === id);
      if (!t) { setNote("Template not found"); setState("idle"); return; }
      setD({ id: t.id, kind: t.kind, name: t.name, subject: t.subject ?? "", body: t.body, isHtml: t.isHtml, mediaUrl: t.mediaUrl });
      setMeta({ usedBy: t.usedBy, campaignId: t.campaignId, graph: t.graph });
      setState("idle");
    }).catch(() => setState("idle"));
  }, [id]);

  // Leaving with unsaved edits asks first.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const set = (p: Partial<Draft>) => { setD((x) => ({ ...x, ...p })); setDirty(true); setState((s) => (s === "saved" ? "idle" : s)); };
  const K = KINDS.find((k) => k.kind === d.kind)!;

  async function save() {
    if (!d.name.trim()) { setNote("Name required"); return; }
    setState("saving"); setNote(null);
    const r = await (await fetch("/api/v2/outreach/templates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(d) })).json().catch(() => ({}));
    if (!r.template) { setState("idle"); setNote(r.error ?? "Couldn't save."); return; }
    setDirty(false); setState("saved");
    if (!d.id) router.replace(`/templates/${r.template.id}`);
    setD((x) => ({ ...x, id: r.template.id }));
  }
  async function remove() {
    if (!d.id || !confirm("Delete this template? Campaigns keep their own copy.")) return;
    await fetch(`/api/v2/outreach/templates?id=${d.id}`, { method: "DELETE" });
    router.push("/templates");
  }
  function insertVar(key: string) {
    const el = bodyRef.current; const tok = `{{${key}}}`;
    const a = el?.selectionStart ?? d.body.length, b = el?.selectionEnd ?? d.body.length;
    set({ body: d.body.slice(0, a) + tok + d.body.slice(b) });
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(a + tok.length, a + tok.length); });
  }
  async function addImage(file: File) {
    setNote("Uploading image…");
    const r = await uploadImage(file);
    if (!r.url) { setNote(r.error ?? "Upload failed."); return; }
    if (d.kind === "email") {
      const tag = `<img src="${r.url}" alt="" style="max-width:100%;height:auto">`;
      const a = bodyRef.current?.selectionStart ?? d.body.length;
      set({ body: d.isHtml ? d.body.slice(0, a) + tag + d.body.slice(a) : `${d.body.split("\n").map((l) => (l ? `<p>${l}</p>` : "")).join("")}${tag}`, isHtml: true });
    } else set({ mediaUrl: r.url });
    setNote(null);
  }
  async function loadHtml(file: File) {
    if (file.size > 500_000) { setNote("HTML over 500 KB · too big"); return; }
    set({ body: await file.text(), isHtml: true, name: d.name || file.name.replace(/\.html?$/i, "") });
  }

  return (
    <div className="te">
      <header className="te-bar">
        <Link href="/templates" className="v2-iconbtn" aria-label="Back to templates"><ArrowLeft size={18} /></Link>
        <span className={`tl-type k-${d.kind}`}><K.icon size={12} /> {K.label}</span>
        <input className="te-name" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder={`Name this ${K.label.toLowerCase()}`} aria-label="Template name" />
        <span className="te-bar-r">
          {meta?.campaignId && <span className="tl-tag planner"><Sparkles size={11} /> Planner</span>}
          {note && <span className="te-note">{note}</span>}
          {d.id && d.kind !== "campaign" && <button type="button" className="v2-iconbtn" onClick={remove} aria-label="Delete template"><Trash2 size={16} /></button>}
          {d.kind !== "campaign" && (
            <button type="button" className="v2-btn primary" onClick={save} disabled={state === "saving" || state === "loading"}>
              {state === "saving" ? <Loader2 size={15} className="ox-spin" /> : state === "saved" && !dirty ? <Check size={15} /> : <Save size={15} />}
              {state === "saved" && !dirty ? "Saved" : "Save"}
            </button>
          )}
        </span>
      </header>

      {state === "loading" ? <div className="te-loading"><Loader2 size={20} className="ox-spin" /> Loading…</div> : (
        <div className="te-body">
          <section className="te-form">
            {meta && meta.usedBy > 0 && d.kind !== "campaign" && (
              <div className="ox-note sync" title="Saving updates draft campaigns. Approved campaigns keep the copy they were tested with."><RefreshCw size={13} /> In {meta.usedBy} campaign{meta.usedBy === 1 ? "" : "s"} · drafts sync on save</div>
            )}
            {d.kind === "campaign" ? (
              <>
                <h2 className="te-h">Sequence</h2>
                <ol className="tl-seq">
                  {(meta?.graph ? touchesOf(meta.graph) : []).map((x, i) => (
                    <li key={x.nodeId}><span className={`tl-seq-dot k-${x.channel}`}>{i + 1}</span>
                      <span><b>Day {x.offsetDays} · {x.channel === "email" ? "Email" : x.channel === "whatsapp" ? "WhatsApp" : "Call"}</b><em>{(x.subject ? `${x.subject} — ` : "") + x.body.replace(/<[^>]+>/g, " ").slice(0, 160)}</em></span></li>
                  ))}
                </ol>
                <p className="cp-hint" title="Sequences are edited inside a campaign. Start one from this sequence to change it."><Info size={13} /> Edit inside a campaign</p>
                <button type="button" className="v2-btn primary" onClick={async () => {
                  const r = await (await fetch("/api/v2/outreach/campaigns", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ templateId: d.id, name: d.name }) })).json();
                  if (r.id) router.push(`/campaigns/${r.id}`);
                }}>Use in campaign <ArrowRight size={15} /></button>
              </>
            ) : (
              <>
                {d.kind === "email" && (
                  <label className="te-field">Subject
                    <input value={d.subject} onChange={(e) => set({ subject: e.target.value })} placeholder="quick question about {{business_name}}" />
                  </label>
                )}
                <div className="te-tools">
                  <span className="te-label">{d.kind === "call" ? "Talk track" : "Message"}</span>
                  {d.kind !== "call" && <button type="button" className="v2-btn" onClick={() => imgRef.current?.click()}><ImagePlus size={14} /> {d.kind === "whatsapp" && d.mediaUrl ? "Change image" : "Add image"}</button>}
                  {d.kind === "email" && <button type="button" className="v2-btn" onClick={() => htmlRef.current?.click()}><FileCode2 size={14} /> Upload HTML</button>}
                  {d.kind === "email" && (
                    <span className="ox-seg" role="group" aria-label="Format">
                      <button type="button" className={!d.isHtml ? "on" : ""} onClick={() => set({ isHtml: false })}><Type size={13} /> Text</button>
                      <button type="button" className={d.isHtml ? "on" : ""} onClick={() => set({ isHtml: true })}><Code2 size={13} /> HTML</button>
                    </span>
                  )}
                  <input ref={imgRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void addImage(f); }} />
                  <input ref={htmlRef} type="file" accept=".html,.htm,text/html" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void loadHtml(f); }} />
                </div>
                {d.kind === "whatsapp" && d.mediaUrl && (
                  <div className="ox-media-chip">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.mediaUrl} alt="" /><span title="Sent as the message image, with your text as its caption">Image · text as caption</span>
                    <button type="button" className="v2-iconbtn" aria-label="Remove image" onClick={() => set({ mediaUrl: null })}><X size={14} /></button>
                  </div>
                )}
                <textarea ref={bodyRef} className={`te-textarea${d.isHtml ? " mono" : ""}`} value={d.body}
                  onChange={(e) => set({ body: e.target.value, isHtml: d.isHtml || (d.kind === "email" && looksHtml(e.target.value)) })}
                  placeholder={d.kind === "email" ? "Hi {{business_name}} team,\n\nI noticed {{signal}}…" : d.kind === "call" ? "Opener: Hi, is this {{business_name}}? I'm {{sender_name}} from {{sender_company}}…\n\nQuestion: …\n\nIf yes: …  If no: …" : "Hi! I noticed {{signal}} — *15 minutes* this week?"} />
                <div className="ox-vars"><span>Insert</span>{VARIABLES.map((v) => <button type="button" key={v.key} onClick={() => insertVar(v.key)} title={`e.g. ${v.sample}`}>{v.label}</button>)}</div>
                {d.kind === "whatsapp" && <p className="cp-hint"><span>*bold* _italic_ ~strike~</span><span className="cp-stat warn" title="The first message to a new contact must be a Meta-approved template."><Info size={12} /> 1st message: approved template</span></p>}
              </>
            )}
          </section>
          <section className="te-stage" aria-label="Preview">
            <div className="te-stage-label">Lead view <span>· sample values</span></div>
            {d.kind === "email" && <EmailPreview subject={d.subject} body={d.body} isHtml={d.isHtml} phoneWidth={320} />}
            {d.kind === "whatsapp" && <WhatsAppPreview body={d.body} mediaUrl={d.mediaUrl} width={320} />}
            {d.kind === "call" && <CallPreview body={d.body} width={320} />}
          </section>
        </div>
      )}
    </div>
  );
}
