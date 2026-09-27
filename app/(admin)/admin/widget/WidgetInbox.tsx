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
      <div className="mb-3 d-flex flex-wrap gap-2">
        <Chip active={site === "all"} onClick={() => setSite("all")}>
          All <span className="text-secondary">{threads.length}</span>
        </Chip>
        {sites.map((s) => (
          <Chip key={s.slug} active={site === s.slug} onClick={() => setSite(s.slug)}>
            {s.name ?? s.slug} <span className="text-secondary">{s.threads}</span>
            {s.needs_reply > 0 && <span className="badge bg-red ms-2">{s.needs_reply}</span>}
            {s.is_blocked && <span className="badge bg-dark ms-2">blocked</span>}
          </Chip>
        ))}
      </div>

      <div className="row row-cards">
        <div className="col-lg-5">
          <div className="card">
            <div className="card-header"><h3 className="card-title">Conversations</h3></div>
            <div className="list-group list-group-flush" style={{ maxHeight: 620, overflowY: "auto" }}>
              {visible.length === 0 && <div className="p-4 text-secondary">Abhi koi message nahi.</div>}
              {visible.map((t) => {
                const waiting = t.last_sender === "visitor";
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => open(t)}
                    className={`list-group-item list-group-item-action text-start ${openId === t.id ? "active" : ""}`}
                  >
                    <div className="d-flex align-items-center gap-2">
                      {waiting && <span className="badge bg-red">new</span>}
                      <strong className="text-truncate">{t.visitor_name}</strong>
                      <span className="badge bg-blue-lt">{t.site_slug}</span>
                      {/* Audience vs customer, resolved live against user_profiles — the single
                          most useful thing to know before writing a reply. */}
                      {t.is_registered_user ? (
                        <span className="badge bg-green-lt">user</span>
                      ) : (
                        <span className="badge bg-secondary-lt">audience</span>
                      )}
                      <span className="ms-auto text-secondary" style={{ fontSize: 12 }}>{ago(t.last_message_at)}</span>
                    </div>
                    <div className="text-secondary text-truncate" style={{ fontSize: 12.5 }}>{t.subject}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card">
            <div className="card-header d-block">
              <h3 className="card-title mb-0">{active ? active.visitor_name : "Select a conversation"}</h3>
              {active && (
                <div className="text-secondary" style={{ fontSize: 12.5 }}>
                  {active.visitor_email} · {active.visitor_phone} · from <b>{active.site_slug}</b>
                  {active.user_email && <> · signed in as {active.user_email}</>}
                </div>
              )}
            </div>

            <div className="card-body" style={{ minHeight: 360, maxHeight: 480, overflowY: "auto" }}>
              {error && <div className="alert alert-danger">{error}</div>}
              {!active && <div className="text-secondary">Baayein se koi conversation kholo.</div>}
              {messages.map((m) => (
                <div key={m.id} className={`d-flex mb-2 ${m.sender === "admin" ? "justify-content-end" : ""}`}>
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
              <div className="card-footer d-flex gap-2">
                <textarea
                  className="form-control"
                  rows={2}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Reply as founder…"
                />
                <button type="button" className="btn btn-primary" disabled={sending || !reply.trim()} onClick={send}>
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
    <button type="button" onClick={onClick} className={`btn btn-sm ${active ? "btn-primary" : "btn-outline-secondary"}`}>
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
