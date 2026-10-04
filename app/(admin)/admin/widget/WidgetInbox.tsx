"use client";

import { useMemo, useState } from "react";

export type InboxSite = {
  slug: string; name: string | null; is_blocked: boolean; origins: string[];
  threads: number; needs_reply: number;
};
export type InboxThread = {
  id: string; site_slug: string; visitor_name: string; visitor_email: string; visitor_phone: string;
  subject: string | null; status: string; last_message_at: string; last_sender: string;
  admin_last_read_at: string | null; user_email: string | null; is_registered_user: boolean;
};
type Message = { id: string; sender: "visitor" | "admin"; body: string; created_at: string };

/**
 * Thread list on the left, conversation on the right — the shape every inbox has, because the
 * question being answered is always "what is waiting, and what do I say about it".
 *
 * The site filter is the reason this page exists separately from /admin/inbound: one widget on
 * several products means a reply's tone depends on where the message came from, so the source is
 * a filter and a badge rather than a field you have to open a thread to discover.
 */
export function WidgetInbox({ sites, threads }: { sites: InboxSite[]; threads: InboxThread[] }) {
  const [site, setSite] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [active, setActive] = useState<InboxThread | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(
    () => (site === "all" ? threads : threads.filter((t) => t.site_slug === site)),
    [threads, site]
  );

  async function open(t: InboxThread) {
    setOpenId(t.id);
    setActive(t);
    setMessages([]);
    setError(null);
    const res = await fetch(`/api/admin/widget/threads/${t.id}`);
    if (!res.ok) { setError("Couldn't load that conversation."); return; }
    const d = await res.json();
    setMessages(d.messages ?? []);
  }

  async function send() {
    if (!openId || !reply.trim()) return;
    setSending(true);
    const body = reply;
    setReply("");
    try {
      const res = await fetch(`/api/admin/widget/threads/${openId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: body }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Couldn't send."); setReply(body); return; }
      setMessages((m) => [...m, d.message]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <Chip active={site === "all"} onClick={() => setSite("all")}>
          All <span className="text-[var(--ink-muted)]">{threads.length}</span>
        </Chip>
        {sites.map((s) => (
          <Chip key={s.slug} active={site === s.slug} onClick={() => setSite(s.slug)}>
            {s.name ?? s.slug} <span className="text-[var(--ink-muted)]">{s.threads}</span>
            {s.needs_reply > 0 && <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ml-2" style={{ borderColor: "color-mix(in oklab, var(--critical) 45%, transparent)", color: "var(--critical)" }}>{s.needs_reply}</span>}
            {s.is_blocked && <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ml-2 border-[var(--rule)] text-[var(--ink-faint)]">blocked</span>}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[260px]">
          <div className="flex h-full min-w-0 flex-col rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)]">
            <div className="rule-b flex items-center gap-2 px-4 py-3"><h3 className="m-0 text-[13px] font-semibold text-[var(--ink)]">Conversations</h3></div>
            <div className="flex flex-col" style={{ maxHeight: 620, overflowY: "auto" }}>
              {visible.length === 0 && <div className="p-4 text-[var(--ink-muted)]">Abhi koi message nahi.</div>}
              {visible.map((t) => {
                const waiting = t.last_sender === "visitor";
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => open(t)}
                    className={`rule-b w-full border-x-0 border-t-0 px-4 py-2.5 text-left text-[12.5px]${openId === t.id ? "bg-[var(--surface-sunk)] text-[var(--ink)]" : "bg-transparent text-[var(--ink-muted)] hover:bg-[var(--surface-sunk)]"}`}
                  >
                    <div className="flex items-center gap-2">
                      {waiting && <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold" style={{ borderColor: "color-mix(in oklab, var(--critical) 45%, transparent)", color: "var(--critical)" }}>new</span>}
                      <strong className="truncate">{t.visitor_name}</strong>
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold border-[var(--rule)] text-[var(--ink-muted)]">{t.site_slug}</span>
                      {/* Audience vs customer, resolved live against user_profiles — the single
                          most useful thing to know before writing a reply. */}
                      {t.is_registered_user ? (
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold" style={{ borderColor: "color-mix(in oklab, var(--ok) 45%, transparent)", color: "var(--ok)" }}>user</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold border-[var(--rule)] text-[var(--ink-faint)]">audience</span>
                      )}
                      <span className="ml-auto text-[var(--ink-muted)]" style={{ fontSize: 12 }}>{ago(t.last_message_at)}</span>
                    </div>
                    <div className="text-[var(--ink-muted)] truncate" style={{ fontSize: 12.5 }}>{t.subject}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-[260px]">
          <div className="flex h-full min-w-0 flex-col rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)]">
            <div className="rule-b px-4 py-3">
              <h3 className="m-0 text-[13px] font-semibold text-[var(--ink)]">{active ? active.visitor_name : "Select a conversation"}</h3>
              {active && (
                <div className="text-[var(--ink-muted)]" style={{ fontSize: 12.5 }}>
                  {active.visitor_email} · {active.visitor_phone} · from <b>{active.site_slug}</b>
                  {active.user_email && <> · signed in as {active.user_email}</>}
                </div>
              )}
            </div>

            <div className="p-4" style={{ minHeight: 360, maxHeight: 480, overflowY: "auto" }}>
              {error && <div className="alert alert-danger">{error}</div>}
              {!active && <div className="text-[var(--ink-muted)]">Baayein se koi conversation kholo.</div>}
              {messages.map((m) => (
                <div key={m.id} className={`flex mb-2${m.sender === "admin" ? "justify-content-end" : ""}`}>
                  {/* Explicit colours rather than Tabler's bg-dark-lt: the admin console runs in
                      dark mode, where that token is within a shade of the card behind it — the
                      visitor's message rendered invisible in the first pass, which reads as "the
                      message didn't arrive" rather than "the message isn't legible". */}
                  <div
                    className="p-2 px-3 rounded"
                    style={{
                      maxWidth: "78%", whiteSpace: "pre-wrap", fontSize: 13.5,
                      background: m.sender === "admin" ? "#206bc4" : "rgba(255,255,255,0.10)",
                      color: m.sender === "admin" ? "#fff" : "#e6e9ee",
                    }}
                  >
                    {m.body}
                  </div>
                </div>
              ))}
            </div>

            {active && (
              <div className="rule-t px-4 py-3 flex gap-2">
                <textarea
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--rule)] bg-[var(--surface-sunk)] px-3 py-2 text-[12.5px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]"
                  rows={2}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Reply as founder…"
                />
                <button type="button" className="rounded-full border-0 bg-[var(--accent)] px-4 py-2 text-[12.5px] font-semibold text-[var(--accent-ink)] disabled:opacity-45" disabled={sending || !reply.trim()} onClick={send}>
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold${active ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]" : "border-[var(--rule)] bg-[var(--surface)] text-[var(--ink)]"}`}>
      {children}
    </button>
  );
}

function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs}h` : `${Math.round(hrs / 24)}d`;
}
