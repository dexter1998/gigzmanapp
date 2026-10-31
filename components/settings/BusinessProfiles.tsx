"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Globe, Plus, Pencil, Trash2, Star, X, Loader2, PenLine } from "lucide-react";
import type { BusinessProfile } from "@/lib/v2/business-profiles";
import s from "./BusinessProfiles.module.css";

/**
 * Settings → Business profiles. Cards in the Settings column: who the business is, what it sells
 * (badges), who it sells to, when a chat last used it. Edit is inline on the card; Add reads a
 * website the same way the chat does, or takes it typed.
 */

const host = (url: string | null) => {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
};

function ago(iso: string | null): string {
  if (!iso) return "Not used in a chat yet";
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 2) return "Used just now";
  if (d < 60) return `Used ${d} min ago`;
  if (d < 60 * 24) return `Used ${Math.round(d / 60)} h ago`;
  const days = Math.round(d / 1440);
  return days === 1 ? "Used yesterday" : days < 30 ? `Used ${days} days ago` : `Used ${new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

const SOURCE: Record<BusinessProfile["source"], string> = { website: "From website", chat: "From chat", manual: "Added by hand" };

export function BusinessProfiles({ initial }: { initial: BusinessProfile[] }) {
  const [profiles, setProfiles] = useState(initial);
  const [adding, setAdding] = useState(initial.length === 0);

  async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "failed");
    return res.json();
  }
  const reload = async () => setProfiles((await call("/api/v2/business-profiles", "GET")).profiles);

  return (
    <>
      <div className={s.bar}>
        <span className={s.count}>{profiles.length} {profiles.length === 1 ? "business" : "businesses"}</span>
        {!adding && (
          <button type="button" className={s.primary} onClick={() => setAdding(true)}>
            <Plus size={16} strokeWidth={1.75} /> Add business
          </button>
        )}
      </div>

      {adding && <AddBusiness first={profiles.length === 0} onCancel={profiles.length ? () => setAdding(false) : undefined} onAdded={async () => { await reload(); setAdding(false); }} call={call} />}

      {profiles.map((p) => (
        <ProfileCard key={p.id} p={p} call={call} onChange={reload} />
      ))}
    </>
  );
}

type Call = (url: string, method: string, body?: unknown) => Promise<{ profile?: BusinessProfile; siteFailed?: boolean } & Record<string, unknown>>;

function AddBusiness({ first, onCancel, onAdded, call }: { first: boolean; onCancel?: () => void; onAdded: () => void; call: Call }) {
  const [mode, setMode] = useState<"website" | "manual">("website");
  const [website, setWebsite] = useState("");
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      if (mode === "website") {
        const out = await call("/api/v2/business-profiles", "POST", { website });
        if (out.siteFailed) setErr("The site didn't load, so the profile has only the address — add what it sells below its card.");
      } else {
        await call("/api/v2/business-profiles", "POST", { name, summary, services, website: website || null });
      }
      onAdded();
    } catch (e) {
      setErr(String((e as Error).message) === "bad_website" ? "That doesn't look like a website address." : "Couldn't save that — try again.");
    } finally {
      setBusy(false);
    }
  }

  const ready = mode === "website" ? website.trim().length > 3 : name.trim().length > 0;
  return (
    <section className={`set-card ${s.add}`}>
      <header className="set-card-head">
        <div>
          <h3>{first ? "Add your first business" : "Add a business"}</h3>
          <p>Paste its website and Mantis reads it for what it sells and who buys it. Or type it in.</p>
        </div>
        {onCancel && <button type="button" className={s.ghostIcon} aria-label="Cancel" onClick={onCancel}><X size={16} strokeWidth={1.75} /></button>}
      </header>
      <div className={s.seg} role="tablist">
        <button type="button" role="tab" aria-selected={mode === "website"} data-on={mode === "website"} onClick={() => setMode("website")}><Globe size={14} strokeWidth={1.75} /> From website</button>
        <button type="button" role="tab" aria-selected={mode === "manual"} data-on={mode === "manual"} onClick={() => setMode("manual")}><PenLine size={14} strokeWidth={1.75} /> Type it in</button>
      </div>
      <div className={s.form}>
        {mode === "manual" && (
          <Field label="Business name"><input className={s.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Digital" maxLength={100} /></Field>
        )}
        <Field label={mode === "website" ? "Website" : "Website (optional)"}>
          <input className={s.input} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="acme.in" inputMode="url"
            onKeyDown={(e) => { if (e.key === "Enter" && ready && !busy) void submit(); }} />
        </Field>
        {mode === "manual" && (
          <>
            <Field label="What it does"><textarea className={s.textarea} value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} maxLength={300} placeholder="Websites and local SEO for clinics in Gurugram" /></Field>
            <Field label="Services"><Tags value={services} onChange={setServices} placeholder="Add a service, press Enter" /></Field>
          </>
        )}
      </div>
      {err && <p className={s.err}>{err}</p>}
      <div className={s.actions}>
        <button type="button" className={s.primary} disabled={!ready || busy} onClick={submit}>
          {busy ? <><Loader2 size={15} className={s.spin} /> {mode === "website" ? "Reading the site…" : "Saving…"}</> : mode === "website" ? "Read website" : "Save business"}
        </button>
      </div>
    </section>
  );
}

function ProfileCard({ p, call, onChange }: { p: BusinessProfile; call: Call; onChange: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [d, setD] = useState({ name: p.name, summary: p.summary, services: p.services, targetTrades: p.targetTrades, targetAreas: p.targetAreas });

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); await onChange(); } finally { setBusy(false); }
  }
  const h = host(p.website);

  return (
    <section className={`set-card ${s.card}`} data-default={p.isDefault}>
      <header className={s.head}>
        <div className={s.mono} aria-hidden>{(p.name.trim()[0] ?? "B").toUpperCase()}</div>
        <div className={s.title}>
          {editing
            ? <input className={`${s.input} ${s.nameInput}`} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} maxLength={100} aria-label="Business name" />
            : <h3>{p.name}</h3>}
          <div className={s.meta}>
            {h ? <a href={p.website!} target="_blank" rel="noreferrer" className={s.site}><Globe size={13} strokeWidth={1.75} /> {h}</a> : <span>No website</span>}
            <span className={s.dot} aria-hidden>·</span>
            <span>{ago(p.lastUsedAt)}</span>
          </div>
        </div>
        <div className={s.badges}>
          {p.isDefault && <span className={s.badge}><span className={s.live} /> Default</span>}
          <span className={`${s.badge} ${s.badgeMuted}`}>{SOURCE[p.source]}</span>
        </div>
      </header>

      {editing ? (
        <div className={s.form}>
          <Field label="What it does"><textarea className={s.textarea} rows={2} maxLength={300} value={d.summary} onChange={(e) => setD({ ...d, summary: e.target.value })} /></Field>
          <Field label="Services"><Tags value={d.services} onChange={(v) => setD({ ...d, services: v })} placeholder="Add a service" /></Field>
          <Field label="Sells to"><Tags value={d.targetTrades} onChange={(v) => setD({ ...d, targetTrades: v })} placeholder="e.g. dentists, gyms" /></Field>
          <Field label="Areas"><Tags value={d.targetAreas} onChange={(v) => setD({ ...d, targetAreas: v })} placeholder="e.g. Gurugram" /></Field>
        </div>
      ) : (
        <div className={s.body}>
          {p.summary && <p className={s.summary}>{p.summary}</p>}
          {p.services.length > 0 && <div className={s.chips}>{p.services.map((x) => <span key={x} className={s.chip}>{x}</span>)}</div>}
          {(p.targetTrades.length > 0 || p.targetAreas.length > 0) && (
            <dl className={s.facts}>
              {p.targetTrades.length > 0 && <><dt>Sells to</dt><dd>{p.targetTrades.join(", ")}</dd></>}
              {p.targetAreas.length > 0 && <><dt>Areas</dt><dd>{p.targetAreas.join(", ")}</dd></>}
            </dl>
          )}
        </div>
      )}

      <footer className={s.foot}>
        {editing ? (
          <>
            <button type="button" className="set-btn" disabled={busy} onClick={() => { setD({ name: p.name, summary: p.summary, services: p.services, targetTrades: p.targetTrades, targetAreas: p.targetAreas }); setEditing(false); }}>Cancel</button>
            <button type="button" className={s.strong} disabled={busy || !d.name.trim()} onClick={() => run(async () => { await call(`/api/v2/business-profiles/${p.id}`, "PATCH", d); setEditing(false); })}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </>
        ) : confirming ? (
          <div className={s.confirm} role="alertdialog" aria-label="Delete business">
            <span>Delete {p.name}? Chats that used it will ask again.</span>
            <button type="button" className="set-btn" onClick={() => setConfirming(false)}>Keep</button>
            <button type="button" className="set-btn danger" disabled={busy} onClick={() => run(() => call(`/api/v2/business-profiles/${p.id}`, "DELETE"))}>Delete</button>
          </div>
        ) : (
          <>
            {!p.isDefault && (
              <button type="button" className={s.ghost} disabled={busy} onClick={() => run(() => call(`/api/v2/business-profiles/${p.id}`, "PATCH", { isDefault: true }))}>
                <Star size={15} strokeWidth={1.75} /> Make default
              </button>
            )}
            <span className={s.grow} />
            <button type="button" className={s.ghost} onClick={() => setEditing(true)}><Pencil size={15} strokeWidth={1.75} /> Edit</button>
            <button type="button" className={`${s.ghost} ${s.ghostDanger}`} onClick={() => setConfirming(true)} aria-label={`Delete ${p.name}`}><Trash2 size={15} strokeWidth={1.75} /></button>
          </>
        )}
      </footer>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={s.field}>
      <span className={s.label}>{label}</span>
      {children}
    </label>
  );
}

/** Badges you can add to (Enter or comma) and remove (×, or Backspace on an empty input). */
function Tags({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft.split(",").map((x) => x.trim()).filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])].slice(0, 12));
    setDraft("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
    else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
  };
  return (
    <div className={s.tags}>
      {value.map((x) => (
        <span key={x} className={s.chip}>
          {x}
          <button type="button" aria-label={`Remove ${x}`} onClick={() => onChange(value.filter((y) => y !== x))}><X size={12} strokeWidth={2} /></button>
        </span>
      ))}
      <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onBlur={add} placeholder={value.length ? "" : placeholder} />
    </div>
  );
}
