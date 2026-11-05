"use client";

/** Inbox: every reply to every campaign — list, conversation, and the lead/campaign it belongs to. */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Inbox as InboxIcon, Mail, MessageCircle, Phone, RefreshCw, ExternalLink, Search, ChevronRight, ChevronDown, ChevronLeft,
  MoreHorizontal, Paperclip, Bold, Italic, List, Link2, MapPin, Building2, CalendarClock, PauseCircle, MessagesSquare,
  Megaphone, ArrowUpRight, Check, FlaskConical, Sparkles, ArrowRight,
} from "lucide-react";
import "./inbox.css";
import { CALL_OUTCOME } from "@/lib/v2/outreach/voiceShared";
import { toast } from "@/components/toast/toast";

type Touch = { n: number | null; channel: string; sentAt: string | null; subject: string | null; body: string | null };
type Lead = { id: string; person: string | null; role: string | null; company: string | null; email: string | null; phone: string | null; area: string | null; industry: string | null; website: string | null };
type M = {
  id: string; channel: string; from: string; fromName: string | null; subject: string | null; body: string; receivedAt: string; read: boolean;
  sentiment: string | null; kind: string; test?: boolean; recording?: boolean; callOutcome?: string | null; callMeeting?: string | null; gmailUrl: string | null; campaignId: string | null; campaign: string | null;
  touch: Touch | null; lead: Lead | null; lastTouchAt: string | null; pending: number;
};
type Campaign = { id: string; name: string; status: string; audience: string | null; launchedAt: string | null; createdAt: string | null; touches: number; chatId: string | null };
type Data = { messages: M[]; campaigns: Campaign[]; watching: Array<{ channel: string; provider: string; address: string }>; lastSynced: string | null; calling?: number };

const STATUS: Record<string, { label: string; tone: string }> = {
  interested: { label: "Interested", tone: "green" },
  not_now: { label: "Follow-up", tone: "amber" },
  not_interested: { label: "Not interested", tone: "grey" },
  unsubscribe: { label: "Unsubscribe", tone: "red" },
  other: { label: "Replied", tone: "blue" },
};
const STATUS_KEYS = ["interested", "not_now", "not_interested", "unsubscribe", "other"];
const TABS: Array<{ key: string; label: string }> = [
  { key: "all", label: "All replies" }, { key: "interested", label: "Interested" }, { key: "not_now", label: "Follow-up" },
  { key: "not_interested", label: "Not interested" }, { key: "unsubscribe", label: "Unsubscribe" },
];
const CH: Record<string, { icon: typeof Mail; label: string }> = {
  email: { icon: Mail, label: "Email" }, whatsapp: { icon: MessageCircle, label: "WhatsApp" }, call: { icon: Phone, label: "Call" },
};

const initials = (s: string) => s.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 6;
// A test reply comes from the user's own mailbox, so it is named after the sample lead, not the sender.
const nameOf = (m: M) => m.lead?.person ?? (m.test ? m.lead?.company : m.fromName) ?? m.fromName ?? m.from;
const companyOf = (m: M) => { const n = nameOf(m); const c = m.lead?.company ?? (m.fromName ? m.from : null); return c && c !== n ? c : null; };
const firstName = (m: M) => (m.lead?.person ?? m.fromName ?? "").split(/\s+/)[0] || "them";
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
function when(iso: string) {
  const d = new Date(iso), now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (sameDay(d, y)) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
const day = (iso: string) => { const d = new Date(iso); return sameDay(d, new Date()) ? "Today" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }); };
const dateTime = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, "")}…` : s);
/** A reply without the quoted thread under it. */
const own = (body: string) => body.split(/\n\s*On .{6,200}wrote:\s*\n/)[0].split("\n").filter((l) => !/^\s*>/.test(l)).join("\n").trim() || body.trim();
function ago(iso: string | null, now: number) {
  if (!iso) return null;
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return <span className={`ix-av ix-av-${hue(name)}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>{initials(name)}</span>;
}
function StatusChip({ m }: { m: M }) {
  if (m.kind === "bounce") return <i className="ix-chip red">Bounced</i>;
  if (m.kind === "auto_reply") return <i className="ix-chip grey">Auto-reply</i>;
  const s = m.sentiment ? STATUS[m.sentiment] : null;
  return s ? <i className={`ix-chip ${s.tone}`}>{s.label}</i> : null;
}
function ChannelChip({ channel, n }: { channel: string; n?: number | null }) {
  const c = CH[channel] ?? CH.email; const I = c.icon;
  return <i className={`ix-chip ch ch-${channel}`}><I size={12} />{c.label}{n ? ` · Touch ${n}` : ""}</i>;
}

export function InboxPage() {
  const [data, setData] = useState<Data | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState("all");
  const [camp, setCamp] = useState("all");
  const [chan, setChan] = useState("all");
  const [q, setQ] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [mobileThread, setMobileThread] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = () => fetch("/api/v2/outreach/inbox").then((r) => r.json()).then((d: Data) => setData({ ...d, campaigns: d.campaigns ?? [], messages: d.messages ?? [] }))
    .catch(() => setData({ messages: [], campaigns: [], watching: [], lastSynced: null }));
  async function sync() {
    setSyncing(true);
    const d = await (await fetch("/api/v2/outreach/inbox", { method: "POST" })).json().catch(() => ({}));
    const r = d.result;
    setSyncNote(!r ? "Sync failed" : r.errors?.length ? r.errors[0] : r.replies || r.bounces ? `+${r.replies} repl${r.replies === 1 ? "y" : "ies"}${r.bounces ? ` · ${r.bounces} bounced` : ""}` : null);
    if (!r) toast.error("Sync failed", "Couldn't check your mailboxes. Please try again.");
    else if (r.errors?.length) toast.warning("Some mailboxes didn't sync", r.errors[0]);
    else toast.success("Inbox synced", r.replies || r.bounces ? `${r.replies} new repl${r.replies === 1 ? "y" : "ies"}${r.bounces ? `, ${r.bounces} bounced` : ""}.` : "No new replies.");
    setSyncing(false); setNow(Date.now()); load();
  }
  // Opening the Inbox checks the mailboxes once; after that it's the Sync button (and the cron).
  useEffect(() => { load(); const t = setTimeout(() => void sync(), 0); return () => clearTimeout(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  // An AI call still running lands here when it ends: check again every 15 s until it does.
  useEffect(() => {
    if (!data?.calling) return;
    const t = setInterval(() => load(), 15_000);
    return () => clearInterval(t);
  }, [data?.calling]);

  const patchMsg = (id: string, p: Partial<M>) => setData((d) => d && { ...d, messages: d.messages.map((m) => (m.id === id ? { ...m, ...p } : m)) });
  const open = (m: M) => {
    setSel(m.id); setMobileThread(true);
    if (!m.read) { patchMsg(m.id, { read: true }); fetch("/api/v2/outreach/inbox", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: m.id }) }).catch(() => {}); }
  };
  async function setStatus(m: M, sentiment: string) {
    const prev = m.sentiment; patchMsg(m.id, { sentiment });
    const r = await fetch(`/api/v2/outreach/inbox/${m.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ sentiment }) }).catch(() => null);
    if (!r?.ok) { patchMsg(m.id, { sentiment: prev }); toast.error("Couldn't update the status", "Please try again."); }
    else toast.success("Status updated");
  }

  const all = useMemo(() => data?.messages ?? [], [data]);
  const campaigns = useMemo(() => new Map((data?.campaigns ?? []).map((c) => [c.id, c])), [data]);
  const channels = useMemo(() => [...new Set(all.map((m) => m.channel))], [all]);
  const msgs = all.filter((m) => (tab === "all" || m.sentiment === tab) && (camp === "all" || m.campaignId === camp) && (chan === "all" || m.channel === chan)
    && (!q.trim() || `${nameOf(m)} ${companyOf(m) ?? ""} ${m.from} ${m.subject ?? ""} ${m.body}`.toLowerCase().includes(q.trim().toLowerCase())));
  const cur = msgs.find((m) => m.id === sel) ?? msgs[0] ?? null;
  const stats = {
    total: all.filter((m) => m.kind === "reply").length,
    interested: all.filter((m) => m.sentiment === "interested").length,
    follow: all.filter((m) => m.sentiment === "not_now").length,
    unread: all.filter((m) => !m.read).length,
  };
  const synced = ago(data?.lastSynced ?? null, now);
  const curCamp = cur?.campaignId ? campaigns.get(cur.campaignId) : undefined;

  return (
    <div className="ix-page">
      <header className="ox-head ix-head">
        <div><h1>Inbox</h1><p>All campaign replies, in one place.</p></div>
        <span className="ix-head-actions">
          {syncNote && <span className="ix-sync-note">{syncNote}</span>}
          {synced && <span className="ix-synced"><i className="ix-dot green" />Synced {synced}</span>}
          <button type="button" className="v2-btn" onClick={sync} disabled={syncing}><RefreshCw size={14} className={syncing ? "ox-spin" : ""} /> {syncing ? "Syncing…" : "Sync now"}</button>
        </span>
      </header>

      {!!data?.calling && (
        <div className="ix-calling" role="status"><span className="ix-calling-dot" aria-hidden /><Phone size={14} />
          {data.calling === 1 ? "An AI call is in progress" : `${data.calling} AI calls in progress`} — the summary and recording land here when it ends.</div>
      )}
      <div className={`ix-body${mobileThread ? " ix-threadmode" : ""}`}>
      {data && !all.length ? (
        <div className="ix-empty">
          <span className="ix-empty-ic"><InboxIcon size={22} /></span>
          <b>No replies yet</b>
          {data.watching.length ? (
            <div className="ix-empty-watch"><span className="ix-muted sm">Watching</span>{data.watching.map((w) => <i key={w.address} className="ix-chip grey"><Mail size={12} />{w.address}</i>)}</div>
          ) : (
            <><span className="ix-muted">No mailbox connected</span><Link href="/integrations" className="v2-btn primary">Connect mailbox</Link></>
          )}
        </div>
      ) : (
        <>
          <div className="ix-stats">
            <Stat icon={<MessagesSquare size={17} />} tone="ink" n={stats.total} label="Total replies" sub="All campaigns" />
            <Stat dot="green" n={stats.interested} label="Interested" sub="Potential leads" />
            <Stat dot="amber" n={stats.follow} label="Follow-ups due" sub="Need action" />
            <Stat dot="grey" n={stats.unread} label="Unreviewed" sub="Unread" />
          </div>

          <div className="ix-filters">
            <div className="ix-tabs" role="tablist">
              {TABS.map((t) => <button type="button" role="tab" aria-selected={tab === t.key} key={t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>{t.label}</button>)}
            </div>
            <div className="ix-filter-right">
              <label className="ix-select"><Megaphone size={14} />
                <select value={camp} onChange={(e) => setCamp(e.target.value)} aria-label="Campaign">
                  <option value="all">All campaigns</option>
                  {[...campaigns.values()].map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select><ChevronDown size={14} />
              </label>
              <label className="ix-select"><Mail size={14} />
                <select value={chan} onChange={(e) => setChan(e.target.value)} aria-label="Channel">
                  <option value="all">All channels</option>
                  {channels.map((c) => <option key={c} value={c}>{CH[c]?.label ?? c}</option>)}
                </select><ChevronDown size={14} />
              </label>
              <label className="ix-search"><Search size={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people or replies…" aria-label="Search" /></label>
            </div>
          </div>

          <div className={`ix-grid${mobileThread ? " show-thread" : ""}`}>
            <div className="ix-list">
              {!data && <div className="ix-list-empty">Loading…</div>}
              {data && !msgs.length && <div className="ix-list-empty"><Search size={16} />No matches</div>}
              {msgs.map((m) => (
                <button type="button" key={m.id} className={`ix-row${cur?.id === m.id ? " on" : ""}${m.read ? "" : " unread"}`} onClick={() => open(m)}>
                  <Avatar name={nameOf(m)} />
                  <span className="ix-row-main">
                    <span className="ix-row-top">
                      <span className="ix-row-who"><b>{nameOf(m)}</b>{companyOf(m) && <em>{companyOf(m)}</em>}</span>
                      <span className="ix-row-time"><time>{when(m.receivedAt)}</time>{!m.read && <i className="ix-dot green" aria-label="Unread" />}</span>
                    </span>
                    <span className="ix-row-subj">{m.subject ?? (m.channel === "whatsapp" ? "WhatsApp reply" : "Reply")}</span>
                    <span className="ix-row-prev">{clip(own(m.body).replace(/\s+/g, " "), 110)}</span>
                    <span className="ix-row-chips">
                      <ChannelChip channel={m.touch?.channel ?? m.channel} n={m.touch?.n} />
                      <StatusChip m={m} />
                      {m.test && <i className="ix-chip test"><FlaskConical size={11} />Test</i>}
                      {m.callOutcome && CALL_OUTCOME[m.callOutcome] && <i className={`ix-chip oc-${CALL_OUTCOME[m.callOutcome].tone}`}>{CALL_OUTCOME[m.callOutcome].label}</i>}
                    </span>
                    {m.campaign && <span className="ix-row-camp">Campaign: {m.campaign}</span>}
                  </span>
                  <ChevronRight size={16} className="ix-row-chev" />
                </button>
              ))}
            </div>

            {cur ? <Conversation key={cur.id} m={cur} c={curCamp} onStatus={(s) => setStatus(cur, s)} onBack={() => setMobileThread(false)} onReload={load} />
              : <div className="ix-conv ix-conv-empty">{data ? "Pick a reply" : ""}</div>}
            {cur ? <Side key={`s${cur.id}`} m={cur} onStatus={(s) => setStatus(cur, s)} /> : <aside className="ix-side" />}
          </div>
        </>
      )}
      </div>
    </div>
  );
}

function Stat({ icon, dot, tone, n, label, sub }: { icon?: React.ReactNode; dot?: string; tone?: string; n: number; label: string; sub: string }) {
  return (
    <div className="ix-stat">
      <span className={`ix-stat-ic ${tone ?? dot ?? ""}`}>{icon ?? <i className={`ix-dot lg ${dot}`} />}</span>
      <span className="ix-stat-txt"><b>{n.toLocaleString("en-IN")}</b><span>{label}</span><em>{sub}</em></span>
    </div>
  );
}

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [open, close]);
  return ref;
}

function StatusMenu({ m, onStatus }: { m: M; onStatus: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const s = m.sentiment ? STATUS[m.sentiment] : null;
  return (
    <div className="ix-pop-wrap" ref={ref}>
      <button type="button" className={`ix-chip btn ${s?.tone ?? "grey"}`} onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
        <i className={`ix-dot ${s?.tone ?? "grey"}`} />{s?.label ?? "Set status"}<ChevronDown size={13} />
      </button>
      {open && (
        <div className="ix-pop right" role="menu">
          {STATUS_KEYS.map((k) => (
            <button type="button" role="menuitem" key={k} onClick={() => { onStatus(k); setOpen(false); }}>
              <i className={`ix-dot ${STATUS[k].tone}`} />{STATUS[k].label}{m.sentiment === k && <Check size={13} className="ix-pop-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function usePause(m: M, onReload: () => void) {
  const [state, setState] = useState<string>("idle");
  const can = !m.test && !!m.lead && m.pending > 0;
  const why = m.test ? "Test reply — no lead to pause" : !m.lead ? "No lead linked" : m.pending === 0 ? "Nothing queued for this lead" : `Stops ${m.pending} queued touch${m.pending === 1 ? "" : "es"}`;
  async function pause() {
    setState("busy");
    const r = await fetch(`/api/v2/outreach/inbox/${m.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "pause" }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setState(r?.ok ? `Paused · ${d.paused ?? 0} touch${d.paused === 1 ? "" : "es"} stopped` : "Couldn't pause");
    if (r?.ok) { onReload(); toast.success("Lead paused", `${d.paused ?? 0} queued touch${d.paused === 1 ? "" : "es"} stopped.`); }
    else toast.error("Couldn't pause this lead", "Please try again.");
  }
  return { can, why, state, pause };
}

function Conversation({ m, c, onStatus, onBack, onReload }: { m: M; c?: Campaign; onStatus: (s: string) => void; onBack: () => void; onReload: () => void }) {
  const [menu, setMenu] = useState(false);
  const [full, setFull] = useState(false);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const ref = useOutside(menu, () => setMenu(false));
  const scroller = useRef<HTMLDivElement>(null);
  // Land on their reply, not on our own message above it.
  useEffect(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight; }, []);
  const p = usePause(m, onReload);
  const ch = CH[m.touch?.channel ?? m.channel] ?? CH.email;
  const reply = own(m.body);
  const email = m.lead?.email ?? (m.channel === "email" ? m.from : null);
  const phone = m.lead?.phone ?? (m.channel === "whatsapp" ? m.from : null);
  const replyHref = m.gmailUrl
    ?? (m.channel === "whatsapp" && phone ? `https://wa.me/${phone.replace(/\D/g, "")}${draft ? `?text=${encodeURIComponent(draft)}` : ""}`
      : `mailto:${m.from}?subject=${encodeURIComponent(m.subject?.startsWith("Re:") ? m.subject : `Re: ${m.subject ?? ""}`)}${draft ? `&body=${encodeURIComponent(draft)}` : ""}`);
  const replyLabel = m.gmailUrl ? "Reply in Gmail" : m.channel === "whatsapp" ? "Reply on WhatsApp" : "Reply by email";
  // Gmail's thread URL can't carry a draft, so the typed reply goes to the clipboard on the way out.
  const onReply = () => { if (m.gmailUrl && draft.trim()) { navigator.clipboard?.writeText(draft).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(() => {}); } };
  const touchBody = m.touch?.body ?? null;

  return (
    <div className="ix-conv">
      <div className="ix-conv-head">
        <button type="button" className="ix-back" onClick={onBack} aria-label="Back to list"><ChevronLeft size={18} /></button>
        <Avatar name={nameOf(m)} size={44} />
        <div className="ix-conv-who">
          <b><span className="ix-conv-name">{nameOf(m)}</span>{m.test && <i className="ix-chip test"><FlaskConical size={11} />Test</i>}</b>
          {companyOf(m) && <span className="ix-muted">{companyOf(m)}</span>}
          <span className="ix-conv-contact">
            {email && <a href={`mailto:${email}`}><Mail size={13} />{email}</a>}
            {phone && <a href={`tel:${phone.replace(/\s/g, "")}`}><Phone size={13} />{phone}</a>}
          </span>
        </div>
        <div className="ix-conv-tools">
          <StatusMenu m={m} onStatus={onStatus} />
          <div className="ix-pop-wrap" ref={ref}>
            <button type="button" className="ix-icon-btn" onClick={() => setMenu(!menu)} aria-label="More" aria-haspopup="menu" aria-expanded={menu}><MoreHorizontal size={17} /></button>
            {menu && (
              <div className="ix-pop right" role="menu">
                <a role="menuitem" href={replyHref} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />{replyLabel}</a>
                {c && <Link role="menuitem" href={`/campaigns/${c.id}`}><Megaphone size={14} />View campaign</Link>}
                <button type="button" role="menuitem" disabled={!p.can || p.state === "busy"} title={p.why} onClick={() => { void p.pause(); setMenu(false); }}><PauseCircle size={14} />Pause for this lead</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="ix-conv-scroll" ref={scroller}>
        {c && (
          <div className="ix-attr">
            <span className="ix-attr-ic"><Megaphone size={15} /></span>
            <div className="ix-attr-txt">
              <span className="ix-attr-label">Campaign attribution</span>
              <span className="ix-attr-name">{c.name}</span>
              <span className="ix-attr-path"><span className="ix-attr-ch"><ch.icon size={13} />{ch.label}</span>{m.touch?.n ? <><ChevronRight size={13} /><span>Touch {m.touch.n}</span></> : null}</span>
            </div>
            {m.touch?.sentAt && <span className="ix-attr-sent"><CalendarClock size={13} />Sent {dateTime(m.touch.sentAt)}</span>}
          </div>
        )}

        {m.touch?.sentAt && touchBody && (
          <>
            <div className="ix-divider"><span>{day(m.touch.sentAt)}</span></div>
            <div className="ix-msg mine">
              <div className="ix-msg-head"><span className="ix-logo">M</span><b>You</b><span className="ix-muted">via Mantis</span><time>{when(m.touch.sentAt)}</time></div>
              <div className="ix-bubble">
                {m.touch.subject && <div className="ix-bubble-subj">{m.touch.subject}</div>}
                <div className="ix-bubble-body">{full ? touchBody : clip(touchBody.replace(/\n{2,}/g, "\n"), 180)}</div>
                {touchBody.length > 180 && <button type="button" className="ix-more" onClick={() => setFull(!full)}>{full ? "Less" : "Full message"}</button>}
              </div>
            </div>
          </>
        )}

        {(!m.touch?.sentAt || !touchBody || !sameDay(new Date(m.touch.sentAt), new Date(m.receivedAt))) && <div className="ix-divider"><span>{day(m.receivedAt)}</span></div>}
        <div className="ix-msg theirs">
          <div className="ix-msg-head"><Avatar name={m.fromName ?? nameOf(m)} size={22} /><b>{m.fromName ?? nameOf(m)}</b><time>{when(m.receivedAt)}</time></div>
          <div className="ix-bubble">
            {m.callOutcome && CALL_OUTCOME[m.callOutcome] && (
              <div className={`ix-outcome oc-${CALL_OUTCOME[m.callOutcome].tone}`}>
                <b>{CALL_OUTCOME[m.callOutcome].label}</b>{m.callMeeting && <span>· {m.callMeeting}</span>}
              </div>
            )}
            {m.recording && (
              <audio className="ix-audio" controls preload="none" src={`/api/v2/outreach/voice/recording/${m.id}`}>
                <a href={`/api/v2/outreach/voice/recording/${m.id}`}>Download the recording</a>
              </audio>
            )}
            <div className="ix-bubble-body">{reply}</div>
          </div>
        </div>
        {p.state !== "idle" && p.state !== "busy" && <div className="ix-note"><PauseCircle size={14} />{p.state}</div>}
      </div>

      <div className="ix-compose">
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Reply to ${firstName(m)}…`} rows={2} aria-label="Reply" />
        <div className="ix-compose-bar">
          <span className="ix-compose-tools" aria-hidden="true"><Paperclip size={15} /><Bold size={15} /><Italic size={15} /><List size={15} /><Link2 size={15} /></span>
          <span className="ix-compose-right">
            {copied && <span className="ix-muted sm ix-copied"><Check size={12} />Draft copied</span>}
            <a className="v2-btn" href={replyHref} target="_blank" rel="noopener noreferrer" onClick={onReply}>{replyLabel}<ArrowUpRight size={14} /></a>
            <button type="button" className="v2-btn primary" disabled title="Coming soon"><CalendarClock size={14} />Schedule follow-up</button>
          </span>
        </div>
      </div>
    </div>
  );
}

type Summary = { summary: string; next: string | null; at: string; replyAt: string };

/** Latest AI summary of this reply: made on first open, cached server-side. */
function useSummary(id: string) {
  const [s, setS] = useState<Summary | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  // Side is keyed by reply id, so a new reply starts fresh in "loading"; setState only runs in callbacks.
  const fetchIt = (refresh: boolean) =>
    fetch(`/api/v2/outreach/inbox/${id}${refresh ? "?refresh=1" : ""}`).then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setS(d.summary); setState("ok"); }).catch(() => setState("error"));
  const load = (refresh = false) => { setState("loading"); void fetchIt(refresh); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void fetchIt(false); }, [id]);
  return { s, state, reload: () => load(true) };
}

function Side({ m, onStatus }: { m: M; onStatus: (s: string) => void }) {
  const l = m.lead;
  const email = l?.email ?? (m.channel === "email" ? m.from : null);
  const sum = useSummary(m.id);
  return (
    <aside className="ix-side">
      <section className="ix-card ix-sum">
        <div className="ix-sum-head">
          <h3><Sparkles size={14} /> AI summary</h3>
          <button type="button" className="ix-icon-btn" onClick={sum.reload} disabled={sum.state === "loading"} title="Summarise again" aria-label="Summarise again">
            <RefreshCw size={13} className={sum.state === "loading" ? "spin" : undefined} />
          </button>
        </div>
        <span className="ix-sum-when" title={sum.s ? `Summarised ${dateTime(sum.s.at)}` : undefined}>
          <CalendarClock size={12} /> {dateTime(sum.s?.replyAt ?? m.receivedAt)} · {CH[m.channel]?.label ?? m.channel}{m.test ? " · Test" : ""}
        </span>
        {sum.state === "loading" && !sum.s ? <div className="ix-sum-skel"><i /><i /></div>
          : sum.state === "error" && !sum.s ? <p className="ix-muted sm">Summary unavailable · <button type="button" className="ix-linkbtn" onClick={sum.reload}>retry</button></p>
          : sum.s && <>
            <p className="ix-sum-text">{sum.s.summary}</p>
            {sum.s.next && <span className="ix-sum-next"><ArrowRight size={13} /> {sum.s.next}</span>}
          </>}
      </section>

      <section className="ix-card">
        <h3>Lead details</h3>
        <div className="ix-lead-top"><Avatar name={nameOf(m)} size={40} /><div><b>{nameOf(m)}</b>{l?.role && <span className="ix-muted sm">{l.role}</span>}</div></div>
        <ul className="ix-facts">
          {l?.company && l.company !== nameOf(m) && <li><Building2 size={14} /><span>{l.company}</span></li>}
          {email && <li><Mail size={14} /><a href={`mailto:${email}`}>{email}</a></li>}
          {l?.phone && <li><Phone size={14} /><a href={`tel:${l.phone.replace(/\s/g, "")}`}>{l.phone}</a></li>}
          {l?.area && <li><MapPin size={14} /><span>{l.area}</span></li>}
        </ul>
        <dl className="ix-kv">
          <dt>Industry</dt><dd>{l?.industry ?? "—"}</dd>
          <dt>Location</dt><dd>{l?.area ?? "—"}</dd>
          <dt>Last touch</dt><dd>{m.lastTouchAt ? dateTime(m.lastTouchAt) : m.touch?.sentAt ? dateTime(m.touch.sentAt) : "—"}</dd>
          <dt>Replied</dt><dd>{dateTime(m.receivedAt)}</dd>
          <dt>Lead status</dt>
          <dd>
            <label className="ix-select sm">
              <i className={`ix-dot ${m.sentiment ? STATUS[m.sentiment]?.tone : "grey"}`} />
              <select value={m.sentiment ?? ""} onChange={(e) => onStatus(e.target.value)} aria-label="Lead status">
                {!m.sentiment && <option value="">Not set</option>}
                {STATUS_KEYS.map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}
              </select><ChevronDown size={13} />
            </label>
          </dd>
        </dl>
      </section>

    </aside>
  );
}
