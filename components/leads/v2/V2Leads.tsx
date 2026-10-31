"use client";

/**
 * V2 Leads (LMS). Every lead a chat finds is added here automatically — no unlock. "All" is every
 * lead once; "Lists" are the chats they came from, named after the chat. A lead opens the drawer
 * with its details and what to sell / what to offer.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Star, Phone, Mail, Search, List, LayoutGrid, ChevronLeft, ChevronRight, ArrowUpRight, MessageSquare, Sparkles, Plus } from "lucide-react";
import "@/components/compact.css";
import { LeadDrawer } from "@/components/chat/v2/V2Panel";
import { ContactActions, EmailCell, PhoneCell, ExtraCells, normalizeContact, type LeadEmail, type LeadPhone, type Pitch, type ExtraColumn } from "./contact";

type Lead = {
  id: string; chatId: string; listName: string; name: string; category: string | null; area: string | null; rating: number | null; reviews: number | null;
  website: string | null; phone: string | null; emails: string[]; linkedin: string | null; person: { name: string; role: string | null } | null;
  signals: string[]; notes?: string[]; score: number; addedAt: string | null;
  // docs/lead-contact-contract.md — absent on older rows / before the backend ships them.
  emailList?: LeadEmail[]; phones?: LeadPhone[]; whatsapp?: string | null; extras?: Record<string, string>;
};
type ListInfo = { chatId: string; name: string; count: number; withEmail?: number; withPhone?: number; updatedAt: string | null };

const PER_PAGE = 25;
const fmtDay = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—");

/** Page numbers around the current one: 1 … 4 5 [6] 7 8 … 17. */
function pageWindow(cur: number, pages: number): Array<number | "gap"> {
  const keep = new Set([0, pages - 1, cur - 1, cur, cur + 1].filter((p) => p >= 0 && p < pages));
  const out: Array<number | "gap"> = [];
  [...keep].sort((a, b) => a - b).forEach((p, i, arr) => { if (i && p - arr[i - 1] > 1) out.push("gap"); out.push(p); });
  return out;
}

function Pager({ cur, total, noun, onPage }: { cur: number; total: number; noun: string; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  return (
    <div className="v2-tablefoot v2-lms-foot">
      <span className="v2-muted2">Showing {total ? cur * PER_PAGE + 1 : 0}–{Math.min(total, cur * PER_PAGE + PER_PAGE)} of {total} {noun}</span>
      {pages > 1 && (
        <span className="v2-pager">
          <button type="button" disabled={cur === 0} onClick={() => onPage(cur - 1)} aria-label="Previous page"><ChevronLeft size={15} /></button>
          {pageWindow(cur, pages).map((p, i) => p === "gap"
            ? <span key={`g${i}`} className="v2-pager-gap">…</span>
            : <button type="button" key={p} className={p === cur ? "on" : ""} aria-current={p === cur ? "page" : undefined} onClick={() => onPage(p)}>{p + 1}</button>)}
          <button type="button" disabled={cur >= pages - 1} onClick={() => onPage(cur + 1)} aria-label="Next page"><ChevronRight size={15} /></button>
        </span>
      )}
    </div>
  );
}

export function V2Leads() {
  const [tab, setTab] = useState<"all" | "lists">("all");
  const [list, setList] = useState<ListInfo | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [lists, setLists] = useState<ListInfo[]>([]);
  const [q, setQ] = useState("");
  const [drawer, setDrawer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [columns, setColumns] = useState<ExtraColumn[]>([]);
  const [pitch, setPitch] = useState<Pitch>(null);

  // ?list=<chatId> (from the chat's "added to Leads" link) opens that list directly.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("list");
    const t = setTimeout(() => { if (id) { setTab("lists"); setList({ chatId: id, name: "", count: 0, updatedAt: null }); } }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let off = false;
    fetch(`/api/v2/leads${list ? `?list=${list.chatId}` : ""}`).then((r) => r.json()).then((d: { leads?: Lead[]; lists?: ListInfo[]; columns?: ExtraColumn[]; pitch?: Pitch }) => {
      if (off) return;
      setLeads(d.leads ?? []); setLists(d.lists ?? []); setColumns(Array.isArray(d.columns) ? d.columns : []); setPitch(d.pitch ?? null); setLoading(false);
      if (list && !list.name) setList((d.lists ?? []).find((x) => x.chatId === list.chatId) ?? list);
    }).catch(() => setLoading(false));
    return () => { off = true; };
  }, [list]);

  const shown = useMemo(() => leads.filter((l) => !q || `${l.name} ${l.category} ${l.area} ${l.listName}`.toLowerCase().includes(q.toLowerCase())), [leads, q]);
  const shownLists = useMemo(() => lists.filter((l) => !q || l.name.toLowerCase().includes(q.toLowerCase())), [lists, q]);
  const showTable = tab === "all" || !!list;
  // Derived, not reset in an effect: a page past the end (search narrowed it) reads as the first.
  const total = showTable ? shown.length : shownLists.length;
  const cur = page < Math.ceil(total / PER_PAGE) ? page : 0;
  const pageLeads = shown.slice(cur * PER_PAGE, cur * PER_PAGE + PER_PAGE);
  const pageLists = shownLists.slice(cur * PER_PAGE, cur * PER_PAGE + PER_PAGE);
  const go = (p: number) => { setPage(p); document.querySelector(".v2-lms")?.scrollIntoView({ block: "start" }); };

  return (
    <div className="v2-lms">
      <header className="v2-lms-head">
        <div>
          <h1>Leads</h1>
          <div className="cp-stats">
            {!loading && <span className="cp-stat"><b>{lists.reduce((n, l) => n + l.count, 0).toLocaleString("en-IN")}</b> leads</span>}
            {!loading && <span className="cp-stat"><LayoutGrid size={12} /><b>{lists.length}</b> lists</span>}
            {!loading && <span className="cp-stat"><Mail size={12} /><b>{lists.reduce((n, l) => n + (l.withEmail ?? 0), 0).toLocaleString("en-IN")}</b></span>}
            {!loading && <span className="cp-stat"><Phone size={12} /><b>{lists.reduce((n, l) => n + (l.withPhone ?? 0), 0).toLocaleString("en-IN")}</b></span>}
            <span className="cp-stat" title="Every lead Mantis finds in chat is added here automatically, in a list named after that chat."><Sparkles size={12} /> Auto-saved from chat</span>
          </div>
        </div>
        <label className="v2-search"><Search size={15} aria-hidden /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder={tab === "lists" && !list ? "Search lists" : "Search leads"} /></label>
      </header>

      <div className="v2-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "all"} className={tab === "all" ? "on" : ""} onClick={() => { setTab("all"); setList(null); setPage(0); }}><List size={15} /> All <span>{tab === "all" && !list ? leads.length : ""}</span></button>
        <button type="button" role="tab" aria-selected={tab === "lists"} className={tab === "lists" ? "on" : ""} onClick={() => { setTab("lists"); setList(null); setPage(0); }}><LayoutGrid size={15} /> Lists <span>{lists.length || ""}</span></button>
      </div>

      {tab === "lists" && !list && (
        <>
          <div className="v2-tablebox v2-lms-table">
            <table className="v2-ltable v2-listtable">
              <thead><tr><th>List</th><th className="num">Leads</th><th className="num">With email</th><th className="num">With phone</th><th>Updated</th><th aria-label="Open" /></tr></thead>
              <tbody>
                {pageLists.map((l, i) => (
                  <tr key={l.chatId} className="v2-lrow" style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }} onClick={() => { setList(l); setPage(0); }}>
                    <td><span className="v2-listname"><span className="v2-listname-icon" aria-hidden><MessageSquare size={14} /></span>{l.name}</span></td>
                    <td className="num"><b>{l.count}</b></td>
                    <td className="num v2-muted2">{l.withEmail ?? "—"}</td>
                    <td className="num v2-muted2">{l.withPhone ?? "—"}</td>
                    <td className="v2-muted2">{fmtDay(l.updatedAt)}</td>
                    <td className="v2-listopen" onClick={(e) => e.stopPropagation()}>
                      <Link href={l.chatId === "map" ? "/home" : `/chat/${l.chatId}`} className="v2-iconbtn" title={l.chatId === "map" ? "Open map" : "Open chat"} aria-label={`Open the ${l.chatId === "map" ? "map" : "chat"} for ${l.name}`}><ArrowUpRight size={15} /></Link>
                    </td>
                  </tr>
                ))}
                {!pageLists.length && <tr><td colSpan={6} className="v2-empty">{loading ? "Loading…" : q ? "No matches" : <div className="cp-empty"><LayoutGrid size={22} /><b>No lists yet</b><span>Each chat&apos;s leads become a list</span><Link href="/chat" className="v2-btn primary"><Plus size={15} /> New chat</Link></div>}</td></tr>}
              </tbody>
            </table>
          </div>
          <Pager cur={cur} total={shownLists.length} noun="lists" onPage={go} />
        </>
      )}

      {showTable && (
        <>
          {list && (
            <div className="v2-listbar">
              <button type="button" className="v2-btn" onClick={() => { setList(null); setPage(0); }}><ChevronLeft size={15} /> Lists</button>
              <h2>{list.name || "List"}</h2>
              <Link className="v2-btn" href={list.chatId === "map" ? "/home" : `/chat/${list.chatId}`}>{list.chatId === "map" ? "Open map" : "Open chat"} <ArrowUpRight size={14} /></Link>
            </div>
          )}
          <div className="v2-tablebox v2-lms-table">
            <table className="v2-ltable lc-wide">
              <thead><tr><th className="lc-sticky">Business</th><th>Category</th><th>Rating</th><th>Signals</th><th>Score</th><th>Contact</th><th>Email</th><th>Phone</th>{!list && <th>List</th>}{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
              <tbody>
                {pageLeads.map((l, i) => { const contact = normalizeContact(l); return (
                  <tr key={l.id} className="v2-lrow" style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }} onClick={() => setDrawer(l.id)}>
                    <td className="lc-sticky"><div className="v2-bname">{l.name}</div>{l.area && <div className="v2-barea"><MapPin size={12} /> {l.area}</div>}{l.person && <div className="v2-bperson">{l.person.name}{l.person.role ? ` · ${l.person.role}` : ""}</div>}</td>
                    <td className="v2-muted2">{l.category ?? "—"}</td>
                    <td className="v2-rating">{l.rating ? <><Star size={13} fill="currentColor" /> {l.rating}<span> ({l.reviews ?? 0})</span></> : "—"}</td>
                    <td><span className="v2-sigs">{l.signals.slice(0, 3).map((s) => <span key={s} className="v2-sig ok">{s}</span>)}{!l.signals.length && <span className="v2-muted">—</span>}</span>{!!l.notes?.length && <span className="v2-sig-note" title={l.notes.join("\n")}>{l.notes[0]}</span>}</td>
                    <td><b className="v2-score-num">{l.score}</b></td>
                    <td className="v2-contact" onClick={(e) => e.stopPropagation()}><ContactActions lead={l} contact={contact} pitch={pitch} /></td>
                    <td><EmailCell contact={contact} /></td>
                    <td><PhoneCell contact={contact} /></td>
                    {!list && <td><button type="button" className="v2-listtag" onClick={(e) => { e.stopPropagation(); setTab("lists"); setPage(0); setList(lists.find((x) => x.chatId === l.chatId) ?? null); }}>{l.listName}</button></td>}
                    <ExtraCells columns={columns} extras={l.extras} />
                  </tr>
                ); })}
                {!shown.length && <tr><td colSpan={8 + (list ? 0 : 1) + columns.length} className="v2-empty">{loading ? "Loading…" : q ? "No matches" : <div className="cp-empty"><List size={22} /><b>No leads yet</b><span>Ask Mantis for leads in a chat</span><Link href="/chat" className="v2-btn primary"><Plus size={15} /> New chat</Link></div>}</td></tr>}
              </tbody>
            </table>
          </div>
          <Pager cur={cur} total={shown.length} noun="leads" onPage={go} />
        </>
      )}
      {drawer && <LeadDrawer resultId={drawer} pitch={pitch} onClose={() => setDrawer(null)} />}
    </div>
  );
}
