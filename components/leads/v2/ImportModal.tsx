"use client";

/**
 * Import a list from a CSV / XLSX (Tarun, 2026-11-03), so a campaign can run on the user's own
 * contacts: file → list name → column mapping with a live preview → import. The file is read in
 * the browser; only the mapped columns of each row are sent.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Upload, FileSpreadsheet, Loader2, Check, AlertTriangle, ArrowLeft } from "lucide-react";
import "./import.css";
import { toast } from "@/components/toast/toast";

type Field = "name" | "phone" | "email" | "website" | "category" | "area" | "person" | "role";
const FIELDS: Array<{ key: Field; label: string; required?: boolean; guess: RegExp }> = [
  { key: "name", label: "Business name", required: true, guess: /^(business|company|firm|shop|store|clinic|organi[sz]ation|account)?\s*(name|title)$|^(business|company|firm|organi[sz]ation)$/i },
  { key: "phone", label: "Phone", guess: /phone|mobile|contact\s*(no|number)|whatsapp|^tel|cell/i },
  { key: "email", label: "Email", guess: /e-?mail/i },
  { key: "website", label: "Website", guess: /web|site|url|domain/i },
  { key: "category", label: "Category", guess: /categor|industry|type|trade|sector/i },
  { key: "area", label: "City / area", guess: /city|area|location|address|locality|town|region/i },
  { key: "person", label: "Contact person", guess: /owner|person|contact\s*name|first\s*name|full\s*name|founder|director/i },
  { key: "role", label: "Their role", guess: /role|designation|title|position/i },
];
const MAX_ROWS = 5000;
const MAX_BYTES = 5 * 1024 * 1024;

/** RFC-4180-ish CSV: quoted fields, doubled quotes, commas / newlines inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  const delim = (text.split("\n")[0].match(/;/g)?.length ?? 0) > (text.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

async function readFile(f: File): Promise<string[][]> {
  if (/\.xlsx$/i.test(f.name)) {
    const { readSheet } = await import("read-excel-file/browser");
    const data = (await readSheet(f)) as unknown[][];
    return data.map((r) => r.map((c) => (c == null ? "" : c instanceof Date ? c.toISOString().slice(0, 10) : String(c)))).filter((r) => r.some((c) => c.trim()));
  }
  return parseCsv((await f.text()).replace(/^﻿/, ""));
}

export function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: (chatId: string, name: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [grid, setGrid] = useState<string[][] | null>(null);
  const [name, setName] = useState("");
  const [map, setMap] = useState<Record<Field, number>>({ name: -1, phone: -1, email: -1, website: -1, category: -1, area: -1, person: -1, role: -1 });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [onClose, busy]);

  async function pick(f: File | undefined) {
    setErr(null);
    if (!f) return;
    if (!/\.(csv|xlsx)$/i.test(f.name)) { setErr("Use a .csv or .xlsx file."); return; }
    if (f.size > MAX_BYTES) { setErr("That file is over 5 MB — split it into smaller files."); return; }
    try {
      const rows = await readFile(f);
      if (rows.length < 2) { setErr("The file needs a header row and at least one row of data."); return; }
      if (rows.length - 1 > MAX_ROWS) { setErr(`Up to ${MAX_ROWS.toLocaleString("en-IN")} rows per import — this file has ${(rows.length - 1).toLocaleString("en-IN")}.`); return; }
      const head = rows[0].map((h) => h.trim());
      const used = new Set<number>();
      const guess = Object.fromEntries(FIELDS.map((fl) => {
        const i = head.findIndex((h, j) => !used.has(j) && fl.guess.test(h));
        if (i >= 0) used.add(i);
        return [fl.key, i];
      })) as Record<Field, number>;
      // No obvious name column: the first one is the usual place for it.
      if (guess.name < 0 && !used.has(0)) guess.name = 0;
      setFile(f); setGrid(rows); setMap(guess); setName(f.name.replace(/\.(csv|xlsx)$/i, "").replace(/[_-]+/g, " ").trim().slice(0, 80));
    } catch {
      setErr("Couldn't read that file — save it again as .csv or .xlsx and retry.");
    }
  }

  const head = grid?.[0] ?? [];
  const body = useMemo(() => grid?.slice(1) ?? [], [grid]);
  const cell = (r: string[], f: Field) => (map[f] >= 0 ? (r[map[f]] ?? "").trim() : "");
  const stats = useMemo(() => {
    let ok = 0, phone = 0, email = 0;
    for (const r of body) {
      const p = !!cell(r, "phone"), e = /@/.test(cell(r, "email"));
      if (p) phone++; if (e) email++;
      if (cell(r, "name") && (p || e)) ok++;
    }
    return { ok, phone, email };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, map]);

  async function submit() {
    setBusy(true); setErr(null);
    const rows = body.map((r) => Object.fromEntries(FIELDS.map((f) => [f.key, cell(r, f.key)])));
    const d = await (await fetch("/api/v2/leads/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, rows }) })).json().catch(() => ({}));
    setBusy(false);
    if (d.chatId) { toast.success("Leads imported", `${rows.length.toLocaleString("en-IN")} leads saved to “${name}”.`); onDone(d.chatId, name); }
    else { setErr(d.error ?? "Import failed — try again."); toast.error("Import failed", d.error ?? "Please try again."); }
  }

  return (
    <div className="ox-modal-wrap" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="ox-modal wide im-modal" role="dialog" aria-modal="true" aria-label="Import leads">
        <div className="ox-modal-head">
          {grid && <button type="button" className="v2-iconbtn" onClick={() => { setGrid(null); setFile(null); }} aria-label="Choose another file"><ArrowLeft size={16} /></button>}
          <b>Import a list</b>
          <span className="im-steps" aria-hidden><i className="on" /><i className={grid ? "on" : ""} /></span>
          <button type="button" className="v2-iconbtn" onClick={onClose} aria-label="Close" disabled={busy}><X size={16} /></button>
        </div>

        {!grid ? (
          <>
            <button type="button" className={`im-drop${drag ? " drag" : ""}`} onClick={() => input.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); void pick(e.dataTransfer.files?.[0]); }}>
              <span className="im-drop-ic"><Upload size={20} /></span>
              <b>Drop a CSV or Excel file</b>
              <span>or click to choose · .csv / .xlsx · up to {MAX_ROWS.toLocaleString("en-IN")} rows</span>
            </button>
            <input ref={input} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
            <p className="im-fine">Needs a business name and a phone or email per row. Your own contacts — importing is free and nothing is looked up.</p>
          </>
        ) : (
          <>
            <div className="im-file"><FileSpreadsheet size={16} /> <b>{file?.name}</b><span>{body.length.toLocaleString("en-IN")} rows · {head.length} columns</span></div>
            <label className="im-name"><span>List name</span><input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Gurgaon dentists — my list" autoFocus /></label>

            <div className="im-map">
              {FIELDS.map((f) => (
                <label key={f.key} className={map[f.key] >= 0 ? "set" : ""}>
                  <span>{f.label}{f.required && <em> *</em>}</span>
                  <select value={map[f.key]} onChange={(e) => setMap({ ...map, [f.key]: Number(e.target.value) })}>
                    <option value={-1}>— not in file —</option>
                    {head.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                  </select>
                </label>
              ))}
            </div>

            <div className="im-preview">
              <table>
                <thead><tr>{FIELDS.filter((f) => map[f.key] >= 0).map((f) => <th key={f.key}>{f.label}</th>)}</tr></thead>
                <tbody>
                  {body.slice(0, 5).map((r, i) => (
                    <tr key={i}>{FIELDS.filter((f) => map[f.key] >= 0).map((f) => <td key={f.key}>{cell(r, f.key) || <span className="im-blank">—</span>}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="im-stats">
              <span className="ok"><Check size={13} /> <b>{stats.ok.toLocaleString("en-IN")}</b> will import</span>
              <span><b>{stats.phone.toLocaleString("en-IN")}</b> with phone</span>
              <span><b>{stats.email.toLocaleString("en-IN")}</b> with email</span>
              {body.length - stats.ok > 0 && <span className="warn" title="Rows without a business name, or without both a phone and an email, are skipped.">{(body.length - stats.ok).toLocaleString("en-IN")} skipped</span>}
            </p>
          </>
        )}

        {err && <div className="ox-form-err"><AlertTriangle size={14} /> {err}</div>}
        {grid && (
          <div className="ox-modal-foot">
            <button type="button" className="v2-btn" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="button" className="v2-btn primary" onClick={submit} disabled={busy || !name.trim() || map.name < 0 || !stats.ok}>
              {busy ? <Loader2 size={15} className="ox-spin" /> : <Upload size={14} />} Import {stats.ok.toLocaleString("en-IN")} leads</button>
          </div>
        )}
      </div>
    </div>
  );
}
