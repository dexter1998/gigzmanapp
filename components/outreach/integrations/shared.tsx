"use client";

/**
 * Pieces shared by the Integrations list (components/outreach/IntegrationsPage.tsx) and the three
 * per-channel setup screens (/integrations/email, /integrations/whatsapp, /integrations/voice).
 * One fetch of GET /api/v2/outreach/senders feeds all of them.
 */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Check, AlertTriangle, Copy, Pause, Play, Trash2, LifeBuoy } from "lucide-react";
import { BrandLogo, type Brand } from "../BrandLogo";

export type Sender = { id: string; channel: string; provider: string; address: string; displayName: string | null; status: string; statusNote: string | null; dailyLimit: number; sentToday: number; lastChecked: string | null };
export type PoolRow = { id: string; channel: string; domain: string | null; address: string; health: number | null; warming_days: number | null; domain_age_days: number | null; warmup_sent: number | null; warmup_replies: number | null; price_inr: number | null };
export type Voice = { configured: boolean; ok: boolean; note: string; creditsPerMinute: number; window: { from: string; to: string; days?: number[] } };
export type WhatsAppInfo = { webhookUrl: string; verifyToken: string | null; signatureConfigured: boolean };
export type OutreachData = {
  senders: Sender[]; pool: PoolRow[]; google: { configured: boolean; redirectUri: string }; microsoft: { configured: boolean };
  voice?: Voice; whatsapp?: WhatsAppInfo;
};
export type Flash = { ok: boolean; text: string };
export type ManageFn = (id: string, body: Record<string, unknown> | "delete") => Promise<void>;

export const SUPPORT_EMAIL = "support@mantisai.in";
export const supportHref = (subject: string) => `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;

/**
 * A help link that opens the Talk to Founder panel in-page. A bare mailto looked dead on any
 * machine without a mail client set up; the mailto stays as the href so it still works when the
 * widget is not on the page (blocked script, /chat where the launcher is hidden).
 */
export function SupportLink({ subject, className, children }: { subject: string; className?: string; children: ReactNode }) {
  return (
    <a
      className={className}
      href={supportHref(subject)}
      onClick={(e) => {
        if (!document.querySelector("[data-founder-widget]") || document.documentElement.hasAttribute("data-no-founder-widget")) return;
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("founder-widget:open", { detail: { subject } }));
      }}
    >
      {children}
    </a>
  );
}

export const PROVIDER: Record<string, { label: string; brand: Brand }> = {
  google: { label: "Gmail", brand: "google-color" }, microsoft: { label: "Outlook", brand: "microsoft" }, imap: { label: "IMAP / SMTP", brand: "imap" },
  mantis_pool: { label: "Mantis inbox", brand: "mantis" }, meta: { label: "Meta Cloud API", brand: "meta" },
};
const providerOf = (p: string) => PROVIDER[p] ?? { label: p, brand: "imap" as Brand };

/** The senders payload plus the manage actions every screen uses. */
export function useOutreachData() {
  const [data, setData] = useState<OutreachData | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => fetch("/api/v2/outreach/senders")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: OutreachData) => { setData(d); setFailed(false); })
    .catch(() => setFailed(true)), []);
  useEffect(() => { void load(); }, [load]);

  const manage: ManageFn = useCallback(async (id, body) => {
    const r = body === "delete"
      ? await fetch(`/api/v2/outreach/senders?id=${id}`, { method: "DELETE" })
      : await fetch("/api/v2/outreach/senders", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    const d = (await r.json().catch(() => ({}))) as { senders?: Sender[] };
    if (d.senders) setData((x) => (x ? { ...x, senders: d.senders! } : x));
  }, []);

  return { data, failed, load, manage, of: (ch: string) => data?.senders.filter((s) => s.channel === ch) ?? [] };
}

/** ?connected= / ?error= coming back from an OAuth round trip, read once and cleared from the URL. */
export function useReturnFlash(initial: Flash | null) {
  const [flash, setFlash] = useState<Flash | null>(initial);
  useEffect(() => {
    if (initial && window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, [initial]);
  return [flash, setFlash] as const;
}

export function FlashBar({ flash, onClose }: { flash: Flash | null; onClose: () => void }) {
  if (!flash) return null;
  return (
    <div className={`ox-flash ${flash.ok ? "ok" : "bad"}`} role="status">
      {flash.ok ? <Check size={16} /> : <AlertTriangle size={16} />} <span className="ox-setup-flash-text">{flash.text}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss">×</button>
    </div>
  );
}

/** Page frame for a setup screen: back link, channel logo, title, one-line promise. */
export function SetupShell({ brand, title, intro, children, help }: { brand: Brand; title: string; intro: React.ReactNode; children: React.ReactNode; help: string }) {
  return (
    <div className="ox-page ox-setup">
      <Link href="/integrations" className="ox-setup-back"><ArrowLeft size={15} /> Integrations</Link>
      <header className="ox-setup-head">
        <span className="ox-setup-logo"><BrandLogo brand={brand} size={26} /></span>
        <div className="ox-setup-headtext">
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
        <SupportLink className="v2-btn ox-setup-help" subject={help}><LifeBuoy size={15} /> Setup help</SupportLink>
      </header>
      {children}
    </div>
  );
}

/** A numbered step in a setup screen. */
export function SetupStep({ n, title, desc, done, children, id }: { n: number; title: string; desc?: React.ReactNode; done?: boolean; children: React.ReactNode; id?: string }) {
  return (
    <section className={`ox-setup-step${done ? " done" : ""}`} id={id}>
      <div className="ox-setup-step-rail" aria-hidden="true"><span className="ox-setup-step-n">{done ? <Check size={14} /> : n}</span></div>
      <div className="ox-setup-step-body">
        <h2>{title}</h2>
        {desc && <p className="ox-setup-step-desc">{desc}</p>}
        {children}
      </div>
    </section>
  );
}

/** A read-only value with a copy button (webhook URL, verify token, DNS records). */
export function CopyField({ label, value, mono = true, masked = false }: { label: string; value: string; mono?: boolean; masked?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(!masked);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ }
  }
  return (
    <div className="ox-setup-copy">
      <span className="ox-setup-copy-label">{label}</span>
      <span className="ox-setup-copy-row">
        <code className={mono ? "" : "plain"}>{shown ? value : "•".repeat(Math.min(24, value.length))}</code>
        {masked && <button type="button" className="v2-btn ox-setup-copy-btn" onClick={() => setShown((s) => !s)}>{shown ? "Hide" : "Show"}</button>}
        <button type="button" className="v2-btn ox-setup-copy-btn" onClick={copy} aria-label={`Copy ${label}`}>{copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}</button>
      </span>
    </div>
  );
}

/**
 * A connected channel collapsed to one line: the account, its logo, "+N" for the rest, and the
 * button that opens that channel's setup screen.
 */
export function ConnectedSummary({ senders, href }: { senders: Sender[]; href: string }) {
  const first = senders[0];
  const p = providerOf(first.provider);
  const brands = [...new Set(senders.map((s) => providerOf(s.provider).brand))];
  const paused = senders.filter((s) => s.status !== "connected").length;
  return (
    <div className="ox-summary">
      <span className="ox-summary-logos">{brands.slice(0, 3).map((b) => <span key={b}><BrandLogo brand={b} size={20} /></span>)}</span>
      <span className="ox-summary-main">
        <b>{first.displayName || first.address}{senders.length > 1 && <em className="ox-more">+{senders.length - 1}</em>}</b>
        <span>{first.displayName ? `${first.address} · ` : ""}{p.label}{paused ? ` · ${paused} paused` : ""}</span>
      </span>
      <span className={`ox-status ${paused === senders.length ? "paused" : "on"}`}>{paused === senders.length ? "Paused" : "Connected"}</span>
      <Link className="v2-btn" href={href}>Manage setup</Link>
    </div>
  );
}

/** Every connected account of a channel, with daily limit, pause/resume and remove. */
export function ConnectedList({ senders, onManage, unit, empty }: { senders: Sender[]; onManage: ManageFn; unit: string; empty: React.ReactNode }) {
  if (!senders.length) return <div className="ox-setup-empty">{empty}</div>;
  return (
    <div className="ox-connected ox-setup-connected">
      {senders.map((s) => {
        const p = providerOf(s.provider);
        return (
          <div key={s.id} className="ox-sender">
            <span className="ox-sender-logo"><BrandLogo brand={p.brand} size={20} /></span>
            <span className="ox-sender-main"><b>{s.address}</b><span>{p.label}{s.displayName ? ` · ${s.displayName}` : ""}</span></span>
            <span className={`ox-status ${s.status === "connected" ? "on" : s.status === "paused" ? "paused" : "bad"}`}>
              {s.status === "connected" ? "Connected" : s.status === "paused" ? "Paused" : "Needs attention"}
            </span>
            <span className="ox-sender-usage" title={`${unit} sent today / daily limit`}>{s.sentToday}/{s.dailyLimit} today</span>
            <label className="ox-limit">Daily limit
              <input type="number" min={1} max={500} defaultValue={s.dailyLimit} onBlur={(e) => Number(e.target.value) !== s.dailyLimit && onManage(s.id, { dailyLimit: Number(e.target.value) })} />
            </label>
            {s.status === "paused"
              ? <button type="button" className="v2-btn" onClick={() => onManage(s.id, { status: "connected" })}><Play size={13} /> Resume</button>
              : <button type="button" className="v2-btn" onClick={() => onManage(s.id, { status: "paused" })}><Pause size={13} /> Pause</button>}
            <button type="button" className="v2-iconbtn" title="Remove" aria-label={`Remove ${s.address}`} onClick={() => { if (confirm(`Remove ${s.address}? Campaigns stop sending from it.`)) void onManage(s.id, "delete"); }}><Trash2 size={15} /></button>
            {s.statusNote && <div className="ox-sender-note">{s.statusNote}</div>}
          </div>
        );
      })}
    </div>
  );
}

/** Mantis's pre-warmed stock (email domains or WhatsApp numbers). Ordering isn't built yet. */
export function PoolTable({ rows, kind }: { rows: PoolRow[]; kind: "email" | "whatsapp" }) {
  return (
    <div className="ox-pool">
      <div className="v2-tablebox ox-pool-table ox-setup-scroll">
        <table className="v2-ltable">
          <thead><tr>{kind === "email" ? <><th>Domain</th><th>Health</th><th>Warming</th><th>Domain age</th><th>Warmup sent</th></> : <><th>Number</th><th>Quality</th><th>Warming</th></>}<th>Price</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td><b>{p.domain ?? p.address}</b></td>
                <td><span className={`ox-health ${Number(p.health) >= 80 ? "hi" : "mid"}`}>{p.health ?? "—"}</span></td>
                <td>{p.warming_days != null ? `${p.warming_days} days` : "—"}</td>
                {kind === "email" && <><td>{p.domain_age_days != null ? `${p.domain_age_days} days` : "—"}</td><td>{p.warmup_sent ?? "—"}{p.warmup_replies != null ? ` · ${p.warmup_replies} replies` : ""}</td></>}
                <td>{p.price_inr ? `₹${p.price_inr}/mo` : "—"}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={6} className="v2-empty">None in stock · new {kind === "email" ? "domains" : "numbers"} warming</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
