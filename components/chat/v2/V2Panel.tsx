"use client";

/**
 * V2 right panel (reference: Mantis mock). While a run works: a live bar with Stop, the title,
 * candidates and a "checked" ring, filters, and the leads table filling in row by row; a row opens
 * the lead drawer. Every result is already in Leads — there is no unlock step.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Star, Phone, Mail, MoreVertical, ChevronDown, Square, Search, Send, ChevronLeft, ChevronRight, X, Globe, Building2, ArrowUpRight, Sparkles, Check, Loader2, MessageCircle, Settings2, Play } from "lucide-react";
import { WHATSAPP_LIVE } from "@/lib/v2/outreach/channels";
import type { ChatLead } from "../ChatLeadsTable";
import type { RunSnapshot, RunResultView } from "@/lib/v2/runner";
import type { TurnStep, PlanCard as PlanCardData } from "@/lib/v2/turn";
import { useNow, fmtDur } from "./RunProgress";
import { ContactActions, EmailCell, PhoneCell, ExtraCells, TierBadge, PhoneKindTag, normalizeContact, type Contact, type ContactInput, type LeadEmail, type LeadPhone, type Pitch, type ExtraColumn } from "@/components/leads/v2/contact";

/** A Quick Outreach pick: one channel is a quick campaign of that kind, two or more a sequence. */
export type OutreachChannel = "email" | "whatsapp" | "call";
export type QuickOutreachPick = { kind: "sequence" | "quick_email" | "quick_whatsapp" | "quick_call"; channels: OutreachChannel[]; customize: boolean };

export type PanelContent =
  | { kind: "run"; run: RunSnapshot | null }
  | { kind: "leads"; title: string; leads: ChatLead[]; steps: TurnStep[] }
  | { kind: "idle" };

/** One shape for both a run's results and a plain search's leads. */
type Row = {
  id: string; resultId: string | null; name: string; category: string | null; area: string | null; rating: number | null; reviews: number | null;
  signals: string[]; siteState: RunResultView["siteState"]; score: number; linkedin: string | null;
  /** Set once the candidate is ranked, i.e. a delivered lead; null while it is still being checked. */
  rank: number | null;
  notes?: string[]; lead: ContactInput; contact: Contact; extras: Record<string, string> | null;
};

/** docs/lead-contact-contract.md fields, optional until the runner ships them (and on old runs). */
type ContactFields = { emailList?: LeadEmail[]; phones?: LeadPhone[]; whatsapp?: string | null; extras?: Record<string, string> };

function fromRun(r: RunResultView & ContactFields): Row {
  const lead: ContactInput = { name: r.name, area: r.area, person: r.person, emails: r.emails, emailList: r.emailList, phone: r.phone, phones: r.phones, whatsapp: r.whatsapp };
  return { id: r.id, resultId: r.id, name: r.name, category: r.category, area: r.area, rating: r.rating, reviews: r.reviewCount, signals: r.signals,
    siteState: r.siteState, score: r.scorePct, linkedin: r.linkedin, rank: r.rank, notes: r.notes ?? [], lead, contact: normalizeContact(lead), extras: r.extras ?? null };
}
function fromLead(l: ChatLead): Row {
  const lead: ContactInput = { name: l.business_name, area: l.area ?? null };
  return { id: l.id, resultId: null, name: l.business_name, category: l.category, area: l.area ?? null, rating: l.rating ?? null, reviews: l.review_count ?? null,
    signals: l.has_website === false ? ["No website listed"] : [], siteState: l.has_website === false ? "none" : "checked", score: Math.round(l.heat_score ?? 0),
    linkedin: null, rank: null, lead, contact: normalizeContact(lead), extras: null };
}

/**
 * Where the candidate stands, at the start of its row: a tick once it is ranked (a delivered lead),
 * an amber spinner while the run is still reading its site or looking for contacts. Nothing for a
 * row the run never ranked after it stopped — that row keeps its own badges.
 */
function RowStatus({ row, running }: { row: Row; running: boolean }) {
  if (row.rank != null) return <span className="v2-rstat done" title="Delivered lead" role="img" aria-label="Delivered lead"><Check size={11} strokeWidth={3.5} /></span>;
  if (running) {
    const label = row.siteState === "pending" ? "Reading website…" : "Finding contacts…";
    return <span className="v2-rstat busy" title={label} role="img" aria-label={label}><span className="v2-rstat-spin" /></span>;
  }
  return <span className="v2-rstat" aria-hidden />;
}

function ScoreRing({ value, size = 38 }: { value: number; size?: number }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r;
  const hue = value >= 80 ? "var(--v2-good)" : value >= 65 ? "var(--v2-mid)" : "var(--v2-low)";
  return (
    <span className="v2-ring" style={{ width: size, height: size }} title={`Lead score ${value}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} className="v2-ring-track" />
        <circle cx={size / 2} cy={size / 2} r={r} className="v2-ring-val" style={{ stroke: hue, strokeDasharray: c, strokeDashoffset: c * (1 - value / 100) }} />
      </svg>
      <b>{value}</b>
    </span>
  );
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.min(1, done / total) : 0;
  const size = 40, r = 16, c = 2 * Math.PI * r;
  return (
    <span className="v2-progress">
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
        <circle cx="20" cy="20" r={r} className="v2-ring-track" />
        <circle cx="20" cy="20" r={r} className="v2-ring-val" style={{ stroke: "var(--v2-good)", strokeDasharray: c, strokeDashoffset: c * (1 - pct) }} />
      </svg>
      <span>{done} of {total} checked</span>
    </span>
  );
}

function SignalBadge({ row }: { row: Row }) {
  if (row.siteState === "pending") return <span className="v2-sig pending"><Loader2 size={12} className="v2-spin-ic" /> Checking website…</span>;
  if (row.siteState === "unread" && !row.signals.length) return <span className="v2-muted">Site not read</span>;
  if (!row.signals.length) return row.siteState === "down" ? <span className="v2-sig warn">Site didn&apos;t load</span> : <span className="v2-muted">—</span>;
  return (
    <>
      <span className="v2-sigs">{row.signals.slice(0, 3).map((s) => <span key={s} className="v2-sig ok">{s}</span>)}</span>
      {!!row.notes?.length && <span className="v2-sig-note" title={row.notes.join("\n")}>{row.notes[0]}</span>}
    </>
  );
}

function Select({ label, value, options, onChange, icon }: { label: string; value: string; options: string[]; onChange: (v: string) => void; icon?: React.ReactNode }) {
  return (
    <label className="v2-select">
      {label && <span className="v2-select-label">{label}</span>}
      <span className="v2-select-box">
        {icon}
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={15} aria-hidden />
      </span>
    </label>
  );
}

export function V2Panel({ content, working, workingSec, onControl, onQuickOutreach }: {
  content: PanelContent; working: boolean; workingSec: number;
  onRefresh?: () => void; onControl?: (action: "pause" | "resume" | "stop") => void;
  /** Opens the campaign builder for this chat's list, with the channels picked in the card. */
  onQuickOutreach?: (pick: QuickOutreachPick) => Promise<void> | void;
}) {
  const run = content.kind === "run" ? content.run : null;
  const running = run?.status === "running";
  const now = useNow(!!running);
  const busy = working || running;
  const [drawer, setDrawer] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [fArea, setFArea] = useState("All areas");
  const [fCat, setFCat] = useState("All categories");
  const [fSig, setFSig] = useState("Any signal");
  const [q, setQ] = useState("");

  // The run's extra columns and the seller's pitch, when the runner sends them.
  const runX = run as (RunSnapshot & { columns?: ExtraColumn[]; extraColumns?: ExtraColumn[]; pitch?: Pitch }) | null;
  const columns: ExtraColumn[] = runX?.columns ?? runX?.extraColumns ?? [];
  const pitch: Pitch = runX?.pitch ?? null;
  const rows: Row[] = useMemo(() => run ? run.results.map(fromRun) : content.kind === "leads" ? content.leads.map(fromLead) : [], [run, content]);
  const areas = ["All areas", ...new Set(rows.map((r) => r.area).filter((x): x is string => !!x))];
  const cats = ["All categories", ...new Set(rows.map((r) => r.category).filter((x): x is string => !!x))];
  const sigs = ["Any signal", ...new Set(rows.flatMap((r) => r.signals))];
  const filtered = rows.filter((r) => (fArea === "All areas" || r.area === fArea) && (fCat === "All categories" || r.category === fCat)
    && (fSig === "Any signal" || r.signals.includes(fSig)) && (!q || r.name.toLowerCase().includes(q.toLowerCase())));
  const PER = 10;
  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  // Derived, not an effect: a page past the end (filters shrank the list) just reads as the first.
  const cur = page < pages ? page : 0;
  const pageRows = filtered.slice(cur * PER, cur * PER + PER);

  const elapsed = run?.startedAt ? (run.finishedAt ? Date.parse(run.finishedAt) : now) - Date.parse(run.startedAt) : workingSec * 1000;
  // "dentist, dental clinic · Delhi" → "Dentist, dental clinic in Delhi · No Google Ads tag"
  const [tradesPart, areaPart] = (run?.title ?? "").split("·").map((x) => x.trim());
  const title = run ? `${tradesPart.charAt(0).toUpperCase()}${tradesPart.slice(1)}${areaPart ? ` in ${areaPart}` : ""}${run.headline.length ? ` · ${run.headline.join(", ")}` : ""}` : content.kind === "leads" ? content.title : "Results";

  return (
    <aside className={`v2-panel${busy ? " working" : ""}`} aria-busy={busy}>
      <div className="v2-panel-inner">
        <div className="v2-topbar">
          {busy ? <span className="v2-live" aria-live="polite"><i aria-hidden /> <span className="v2-live-text">{livePhrase(run)}</span></span>
            : run?.status === "done" ? <span className="v2-live done"><Check size={14} /> {run.delivered} {run.delivered === 1 ? "lead" : "leads"} added to <Link href={`/my-leads?list=${run.chatId ?? ""}`}>Leads</Link></span>
            : run?.status === "stopped" ? <span className="v2-live stopped">Interrupted · {run.delivered} {run.delivered === 1 ? "lead" : "leads"} added to <Link href={`/my-leads?list=${run.chatId ?? ""}`}>Leads</Link></span>
            : run?.status === "paused" ? <span className="v2-live paused">Paused</span> : <span className="v2-live idle">Results</span>}
          <span className="v2-topbar-sub">
            {(run || working) && <span className="v2-elapsed">{fmtDur(elapsed)} {busy ? "elapsed" : ""}</span>}
            {running && onControl && <button type="button" className="v2-btn" onClick={() => onControl("stop")}><Square size={13} /> Stop</button>}
          </span>
        </div>

        <div className="v2-head">
          <div className="v2-head-text">
            <h2 className="v2-title">{title}</h2>
            <p className="v2-subtitle">Ranked by relevance and potential</p>
          </div>
          {run && <span className="v2-chip">{run.candidates} candidates</span>}
          {run && run.toCheck > 0 && <ProgressRing done={run.checked} total={run.toCheck} />}
        </div>

        <div className="v2-filters">
          <Select label="" value={run?.area ?? "Location"} options={[run?.area ?? "Location"]} onChange={() => {}} icon={<MapPin size={15} />} />
          <Select label="Category" value={fCat} options={cats} onChange={(v) => { setFCat(v); setPage(0); }} />
          <Select label="Area" value={fArea} options={areas} onChange={(v) => { setFArea(v); setPage(0); }} />
          <Select label="Signal" value={fSig} options={sigs} onChange={(v) => { setFSig(v); setPage(0); }} />
          <label className="v2-search"><Search size={15} aria-hidden /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search" /></label>
        </div>

        <div className="v2-tablebox">
          <table className="v2-ltable lc-wide has-stat">
            <thead>
              <tr><th className="cb lc-sticky-cb"><span className="v2-rstat" aria-hidden /><input type="checkbox" aria-label="Select all" /></th><th className="lc-sticky after-cb">Business</th><th>Category</th><th>Area</th><th>Rating</th><th>Website signals</th><th>Lead score</th><th>Contact</th><th /><th>Email</th><th>Phone</th>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {pageRows.map((r, i) => (
                <tr key={r.id} className="v2-lrow" style={{ animationDelay: `${i * 35}ms` }} onClick={() => r.resultId && setDrawer(r.resultId)}>
                  <td className="cb lc-sticky-cb" onClick={(e) => e.stopPropagation()}><RowStatus row={r} running={!!running} /><input type="checkbox" aria-label={`Select ${r.name}`} /></td>
                  <td className="lc-sticky after-cb"><div className="v2-bname">{r.name}</div>{r.area && <div className="v2-barea"><MapPin size={12} /> {r.area}</div>}</td>
                  <td className="v2-muted2">{r.category ?? "—"}</td>
                  <td className="v2-muted2">{r.area ?? "—"}</td>
                  <td className="v2-rating">{r.rating ? <><Star size={13} fill="currentColor" /> {r.rating}{r.reviews != null && <span> ({r.reviews})</span>}</> : "—"}</td>
                  <td><SignalBadge row={r} /></td>
                  <td>{r.siteState === "pending" ? <span className="v2-muted">—</span> : <ScoreRing value={r.score} />}</td>
                  <td className="v2-contact" onClick={(e) => e.stopPropagation()}><ContactActions lead={r.lead} contact={r.contact} pitch={pitch} /></td>
                  <td><button type="button" className="v2-iconbtn" aria-label="Details" onClick={(e) => { e.stopPropagation(); if (r.resultId) setDrawer(r.resultId); }}><MoreVertical size={16} /></button></td>
                  <td><EmailCell contact={r.contact} /></td>
                  <td><PhoneCell contact={r.contact} /></td>
                  <ExtraCells columns={columns} extras={r.extras} />
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={11 + columns.length} className="v2-empty">{busy ? "Finding businesses…" : "No matches"}</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="v2-tablefoot">
          <span className="v2-muted2">Showing {filtered.length ? cur * PER + 1 : 0}–{Math.min(filtered.length, cur * PER + PER)} of {filtered.length} {run ? "candidates" : "leads"}</span>
          <span className="v2-pager">
            <button type="button" disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label="Previous"><ChevronLeft size={15} /></button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => (
              <button type="button" key={i} className={i === cur ? "on" : ""} onClick={() => setPage(i)}>{i + 1}</button>
            ))}
            <button type="button" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label="Next"><ChevronRight size={15} /></button>
          </span>
        </div>

        <QuickOutreach rows={run ? rows.filter((r) => r.rank != null) : rows} disabled={working} onStart={onQuickOutreach} />
      </div>
      {drawer && <LeadDrawer resultId={drawer} pitch={pitch} columns={columns} onClose={() => setDrawer(null)} />}
    </aside>
  );
}

const CHANNELS: Array<{ key: OutreachChannel; label: string; icon: React.ReactNode }> = [
  { key: "email", label: "Email", icon: <Mail size={18} /> },
  { key: "whatsapp", label: "WhatsApp", icon: <MessageCircle size={18} /> },
  { key: "call", label: "AI Voice Call", icon: <Phone size={18} /> },
];

/**
 * Under the table: the delivered leads, and per channel how many of them that channel can reach
 * (the sends a campaign would make). One channel ticked creates a quick campaign of that kind;
 * two or more a sequence; Customize opens the builder on a sequence either way.
 */
function QuickOutreach({ rows, disabled, onStart }: { rows: Row[]; disabled: boolean; onStart?: (pick: QuickOutreachPick) => Promise<void> | void }) {
  const avail: Record<OutreachChannel, number> = {
    email: rows.filter((r) => r.contact.emails.length > 0).length,
    whatsapp: rows.filter((r) => !!r.contact.whatsapp).length,
    call: rows.filter((r) => r.contact.phones.some((p) => p.kind !== "tollfree")).length,
  };
  const live = (c: OutreachChannel) => c !== "whatsapp" || WHATSAPP_LIVE;
  // Untouched (null): every live channel that can reach someone is ticked.
  const [touched, setPicked] = useState<Set<OutreachChannel> | null>(null);
  const picked = touched ?? new Set(CHANNELS.map((c) => c.key).filter((k) => live(k) && avail[k] > 0));
  const [busy, setBusy] = useState<"create" | "customize" | null>(null);
  const chosen = CHANNELS.map((c) => c.key).filter((k) => picked.has(k) && live(k) && avail[k] > 0);
  const can = !!onStart && !disabled && !busy && rows.length > 0;
  const go = async (customize: boolean) => {
    if (!onStart) return;
    const kind: QuickOutreachPick["kind"] = !customize && chosen.length === 1 ? (`quick_${chosen[0]}` as QuickOutreachPick["kind"]) : "sequence";
    setBusy(customize ? "customize" : "create");
    try { await onStart({ kind, channels: chosen, customize }); } finally { setBusy(null); }
  };
  return (
    <section className="v2-qo" aria-label="Quick Outreach">
      <div className="v2-qo-head">
        <span className="v2-qo-ic" aria-hidden><Send size={20} /></span>
        <div className="v2-qo-text"><b>Quick Outreach</b><span>Run a multi-channel campaign to reach selected leads.</span></div>
        <span className="v2-qo-count">{rows.length} {rows.length === 1 ? "lead" : "leads"} selected</span>
        <button type="button" className="v2-qo-custom" disabled={!can} onClick={() => go(true)}>
          <Settings2 size={15} /> {busy === "customize" ? "Opening…" : "Customize"}
        </button>
      </div>
      <div className="v2-qo-row">
        {CHANNELS.map((c) => {
          const soon = !live(c.key);
          const on = picked.has(c.key) && !soon && avail[c.key] > 0;
          return (
            <label key={c.key} className={`v2-qo-ch${on ? " on" : ""}${soon || !avail[c.key] ? " off" : ""}`} title={soon ? "WhatsApp sending is coming soon" : `Bulk ${c.label.toLowerCase()} to ${avail[c.key]} leads`}>
              <input type="checkbox" checked={on} disabled={soon || !avail[c.key]}
                onChange={() => { const n = new Set(picked); if (n.has(c.key)) n.delete(c.key); else n.add(c.key); setPicked(n); }} />
              <span className="v2-qo-ch-ic" aria-hidden>{c.icon}</span>
              <span className="v2-qo-ch-text"><b>{c.label}</b><span>{soon ? "Coming soon" : `${avail[c.key]} available`}</span></span>
            </label>
          );
        })}
        <button type="button" className="v2-btn primary v2-qo-go" disabled={!can || !chosen.length} onClick={() => go(false)}>
          {busy === "create" ? "Creating…" : <>Create Campaign <Play size={13} fill="currentColor" /></>}
        </button>
      </div>
    </section>
  );
}

type LeadDetail = {
  lead: { name: string; category: string | null; area: string | null; rating: number | null; reviews: number | null; website: string | null; phone: string | null; linkedin: string | null; listName: string; score: number }
    & ContactFields;
  signalsExplained: Array<{ key: string; label: string; why: string }>;
  allEmails: Array<{ email: string; source: string }>;
  contact: { name: string; role: string | null } | null;
  tech: { cms?: string };
  provenance: Record<string, string>;
  suggestions: Array<{ service: string; offer: string; because: string; matchesYou: boolean }>;
  /** Optional (contract): labels for `lead.extras`, and the seller's pitch for the prefilled messages. */
  columns?: ExtraColumn[]; pitch?: Pitch;
};

const humanKey = (k: string) => k.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** The lead, opened from the right: everything known, and what to sell / what to offer. */
/** What the run is doing right now, in words — the panel's status line instead of a bare "Working…". */
const STEP_PHRASE: Record<string, string> = {
  discover: "Mantis is finding businesses", collect: "Mantis is collecting candidates", qualify: "Mantis is checking every website",
  contacts: "Mantis is finding emails and decision-makers", rank: "Mantis is removing duplicates and weak matches",
  finish: "Mantis is preparing your lead table",
};
function livePhrase(run: RunSnapshot | null | undefined): string {
  const step = run?.steps.find((x) => x.status === "running") ?? run?.steps.find((x) => x.status === "planned");
  if (!run || !step) return "Mantis is planning the search…";
  const base = STEP_PHRASE[step.op] ?? `Mantis is working: ${step.label.toLowerCase()}`;
  const count = step.op === "qualify" && run.toCheck > 0 ? ` (${run.checked}/${run.toCheck})` : "";
  return `${base}${count}…`;
}

export function LeadDrawer({ resultId, onClose, pitch: pitchProp = null, columns: columnsProp = [] }: { resultId: string; onClose: () => void; pitch?: Pitch; columns?: ExtraColumn[] }) {
  const [d, setD] = useState<LeadDetail | null>(null);
  useEffect(() => {
    let off = false;
    fetch(`/api/v2/leads/${resultId}`).then((r) => r.json()).then((x) => { if (!off) setD(x); }).catch(() => {});
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => { off = true; window.removeEventListener("keydown", k); };
  }, [resultId, onClose]);
  const l = d?.lead;
  const src = (v?: string) => (v ? v.replace(/_/g, " ") : null);
  const pitch = d?.pitch ?? pitchProp;
  const cInput: ContactInput | null = l && d ? { name: l.name, area: l.area, person: d.contact, emailList: l.emailList, emails: d.allEmails, phone: l.phone, phones: l.phones, whatsapp: l.whatsapp } : null;
  const contact = cInput ? normalizeContact(cInput) : null;
  const sourceOf = new Map((d?.allEmails ?? []).map((e) => [e.email.toLowerCase(), e.source]));
  // Extras in the run's column order first, then anything else the lead has.
  const extraCols = l?.extras ? [...(d?.columns?.length ? d.columns : columnsProp), ...Object.keys(l.extras).map((key) => ({ key, label: humanKey(key) }))]
    .filter((c, i, a) => a.findIndex((x) => x.key === c.key) === i && !!l.extras?.[c.key]?.trim()) : [];
  return (
    <div className="v2-drawer-wrap" onClick={onClose}>
      <aside className="v2-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Lead details">
        <button type="button" className="v2-iconbtn v2-drawer-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        {!l ? <div className="v2-empty">Loading…</div> : (<>
          <div className="v2-drawer-head">
            <h3>{l.name}</h3>
            <div className="v2-muted2">{[l.category, l.area].filter(Boolean).join(" · ")}{l.rating ? <> · <span className="v2-drawer-rating"><Star size={12} fill="currentColor" className="v2-star" /> {l.rating} ({l.reviews ?? 0})</span></> : null}</div>
            <div className="v2-drawer-tags"><ScoreRing value={l.score} size={44} /><span className="v2-chip" title={`In list: ${l.listName}`}>In list: {l.listName}</span></div>
          </div>

          <section className="v2-dsec">
            <h4>Contact</h4>
            {cInput && contact && (contact.emails.length > 0 || contact.phones.length > 0) && <div className="lc-drawer-actions"><ContactActions lead={cInput} contact={contact} pitch={pitch} /></div>}
            {d.contact && <div className="v2-drow"><b>{d.contact.name}</b>{d.contact.role && <span className="v2-muted2"> · {d.contact.role}</span>}</div>}
            {contact?.phones.map((p) => <div key={p.number} className="lc-drow"><a href={`tel:${p.e164 ?? p.number.replace(/[^\d+]/g, "")}`}><Phone size={15} /> <span className="tnum">{p.number}</span></a><PhoneKindTag kind={p.kind} /></div>)}
            {contact?.emails.map((e) => <div key={e.email} className="lc-drow"><a href={`mailto:${e.email}`}><Mail size={15} /> {e.email}</a><TierBadge tier={e.tier} />{sourceOf.get(e.email.toLowerCase()) && <span className="v2-muted2">· {sourceOf.get(e.email.toLowerCase())}</span>}</div>)}
            {l.website && <a className="v2-drow" href={l.website} target="_blank" rel="noopener noreferrer nofollow"><Globe size={15} /> {l.website.replace(/^https?:\/\//, "")} <ArrowUpRight size={12} /></a>}
            {l.linkedin && <a className="v2-drow" href={l.linkedin} target="_blank" rel="noopener noreferrer nofollow"><Building2 size={15} /> Company LinkedIn <ArrowUpRight size={12} /></a>}
            {!contact?.phones.length && !contact?.emails.length && !l.website && <div className="v2-muted2">No contacts found</div>}
          </section>

          {extraCols.length > 0 && <section className="v2-dsec">
            <h4>Details</h4>
            <dl className="lc-extras">{extraCols.map((c) => <div key={c.key} style={{ display: "contents" }}><dt>{c.label}</dt><dd>{l.extras?.[c.key]}</dd></div>)}</dl>
          </section>}

          {d.signalsExplained.length > 0 && <section className="v2-dsec">
            <h4>What we saw</h4>
            {d.signalsExplained.map((s) => <div key={s.key} className="v2-dsig"><span className="v2-sig ok">{s.label}</span><span className="v2-muted2">{s.why}</span></div>)}
            {d.tech.cms && <div className="v2-dsig"><span className="v2-sig">{d.tech.cms}</span><span className="v2-muted2">CMS</span></div>}
          </section>}

          <section className="v2-dsec v2-sell">
            <h4><Sparkles size={15} /> What to sell · what to offer</h4>
            {d.suggestions.length ? d.suggestions.map((s) => (
              <div key={s.service} className="v2-sellcard">
                <div className="v2-sellcard-top"><b>{s.service}</b>{s.matchesYou && <span className="v2-pill-working">You sell this</span>}</div>
                <div>{s.offer}</div>
                <div className="v2-muted2">Because: {s.because}</div>
              </div>
            )) : <div className="v2-muted2">No service match yet</div>}
          </section>

          <div className="v2-prov v2-muted2">
            Found via {src(d.provenance.discovered_by) ?? "Mantis"}{d.provenance.url_by ? ` · website via ${src(d.provenance.url_by)}` : ""}{d.provenance.email_by ? ` · email via ${src(d.provenance.email_by)}` : ""}
          </div>
        </>)}
      </aside>
    </div>
  );
}

/** The plan as it appears in the chat: what will run, what it may cost, what was assumed. */
export function PlanCard({ plan, started }: { plan: PlanCardData; started: boolean }) {
  return (
    <div className="v2-plan">
      <div className="v2-plan-head">
        <span className="v2-plan-kicker">Plan</span>
        <span className="v2-plan-title">{plan.target} · {plan.title}</span>
      </div>
      {plan.playbooks.length > 0 && <div className="v2-plan-books">{plan.playbooks.map((b) => <span key={b} className="v2-pill">{b}</span>)}</div>}
      {plan.mustHave && plan.mustHave.length > 0 && (
        <div className="v2-plan-note" title={`Every result will have ${plan.mustHave.length > 1 ? "all of these" : "this"}.`}><strong>Must have:</strong> {plan.mustHave.join(", ")}</div>
      )}
      {!started && <ol className="v2-plan-steps">{plan.steps.map((s) => <li key={s}>{s}</li>)}</ol>}
      <div className="v2-plan-foot">
        <span title={plan.liveCovered ? "Live search is covered by today's free allowance." : undefined}>Balance {plan.credits}{plan.liveCovered ? " · live search free today" : ""}</span>{" · "}
        <span title={plan.estCredits > 0 ? "Free where the area was searched before. Website checks are free." : undefined}>{plan.estCredits > 0 ? `Live search ≤ ${plan.estCredits} credits · site checks free` : "No live search · 0 credits"}</span>
      </div>
      {plan.assumptions && <div className="v2-plan-note">Assumed: {plan.assumptions}</div>}
      {plan.cannotDo && <div className="v2-plan-note warn">Not yet: {plan.cannotDo}</div>}
    </div>
  );
}
