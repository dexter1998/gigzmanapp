"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { themeVars, type WidgetTheme } from "@/lib/widget/theme";

/**
 * The founder widget's entire UI.
 *
 * One deliberate departure from the reference design it was drawn from: there is no phone or
 * WhatsApp shortcut anywhere. The visitor's number is collected because a founder conversation is
 * worth following up through whichever channel actually reaches someone — but that is the admin's
 * data, not a button on a public page, and a personal number published on every embedded site can
 * never be taken back.
 *
 * The "ask for details" step is conditional, not a stage everyone walks through. Somebody already
 * signed in to the dashboard has a name, an email and often a phone on their account; asking again
 * would be the product pretending not to know who it is talking to.
 */

type Thread = {
  id: string;
  subject: string | null;
  status: string;
  last_message_at: string;
  last_sender: string;
  visitor_last_read_at: string | null;
};
type Message = { id: string; sender: "visitor" | "admin"; body: string; created_at: string };
type Prefill = { name: string; email: string; countryCode: string; phone: string };

const COUNTRY_CODES = ["+91", "+1", "+44", "+971", "+65", "+61", "+49", "+33"];
const POLL_MS = 10_000;

/** Per site, so the same browser visiting two embedded sites keeps two identities. */
const tokenKey = (site: string) => `mantis.widget.token.${site}`;

function readToken(site: string): string | null {
  try {
    return window.localStorage.getItem(tokenKey(site));
  } catch {
    // Private-mode Safari throws rather than returning null. A visitor who cannot be remembered
    // still gets to send a message — they just start a fresh conversation next time.
    return null;
  }
}
function writeToken(site: string, token: string) {
  try {
    window.localStorage.setItem(tokenKey(site), token);
  } catch {
    /* see above */
  }
}

export function WidgetApp({
  site,
  hostOrigin,
  theme,
}: {
  site: string;
  hostOrigin: string | null;
  theme: WidgetTheme;
}) {
  const [view, setView] = useState<"home" | "messages" | "compose" | "thread">("home");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  const [details, setDetails] = useState<Prefill>({ name: "", email: "", countryCode: "+91", phone: "" });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const tokenRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const authedFetch = useCallback(
    (url: string, init?: RequestInit) =>
      fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json", ...(tokenRef.current ? { "x-widget-token": tokenRef.current } : {}), ...(init?.headers ?? {}) },
      }),
    []
  );

  useEffect(() => {
    tokenRef.current = readToken(site);
    const url = `/api/widget/session?site=${encodeURIComponent(site)}${hostOrigin ? `&origin=${encodeURIComponent(hostOrigin)}` : ""}`;
    authedFetch(url)
      .then((r) => r.json())
      .then((d) => {
        setBlocked(Boolean(d.blocked));
        setThreads(d.threads ?? []);
        if (d.prefill) {
          setPrefill(d.prefill);
          setDetails(d.prefill);
        }
      })
      .catch(() => setError("Couldn't connect. Please try again."))
      .finally(() => setLoading(false));
  }, [site, hostOrigin, authedFetch]);

  const openThread = useCallback(
    async (id: string) => {
      setActiveId(id);
      setView("thread");
      setMessages([]);
      const res = await authedFetch(`/api/widget/threads/${id}`);
      if (!res.ok) return;
      const d = await res.json();
      setMessages(d.messages ?? []);
    },
    [authedFetch]
  );

  // Polling, not sockets. A founder inbox sees a handful of messages a week; a websocket would be
  // a connection held open on every page of every embedded site for an event that almost never
  // comes. Only while a thread is actually on screen.
  useEffect(() => {
    if (view !== "thread" || !activeId) return;
    const t = setInterval(async () => {
      const res = await authedFetch(`/api/widget/threads/${activeId}`);
      if (!res.ok) return;
      const d = await res.json();
      setMessages(d.messages ?? []);
    }, POLL_MS);
    return () => clearInterval(t);
  }, [view, activeId, authedFetch]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const needsDetails = !prefill || !prefill.email || !prefill.phone || !prefill.name;

  async function startThread() {
    setError(null);
    setSending(true);
    try {
      const res = await authedFetch("/api/widget/threads", {
        method: "POST",
        body: JSON.stringify({ site, origin: hostOrigin, ...details, message: draft }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Couldn't send that. Please try again.");
        return;
      }
      tokenRef.current = d.token;
      writeToken(site, d.token);
      setDraft("");
      await openThread(d.threadId);
    } finally {
      setSending(false);
    }
  }

  async function sendReply() {
    if (!activeId || !draft.trim()) return;
    setSending(true);
    const body = draft;
    setDraft("");
    try {
      const res = await authedFetch(`/api/widget/threads/${activeId}`, {
        method: "POST",
        body: JSON.stringify({ message: body }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Couldn't send that.");
        setDraft(body);
        return;
      }
      setMessages((m) => [...m, d.message]);
    } finally {
      setSending(false);
    }
  }

  const unread = threads.filter((t) => t.last_sender === "admin" && (!t.visitor_last_read_at || t.visitor_last_read_at < t.last_message_at)).length;

  return (
    <div style={{ ...themeVars(theme), ...shell }}>
      <Header theme={theme} />

      <div ref={scrollRef} style={body}>
        {blocked ? (
          <Empty text="This conversation channel is unavailable." />
        ) : loading ? (
          <Empty text="Loading…" />
        ) : view === "home" ? (
          <Home threads={threads} onStart={() => setView("compose")} onOpen={openThread} />
        ) : view === "messages" ? (
          <MessageList threads={threads} onOpen={openThread} onStart={() => setView("compose")} />
        ) : view === "compose" ? (
          <Compose
            needsDetails={needsDetails}
            details={details}
            setDetails={setDetails}
            draft={draft}
            setDraft={setDraft}
            error={error}
            sending={sending}
            onSend={startThread}
          />
        ) : (
          <Thread messages={messages} error={error} />
        )}
      </div>

      {view === "thread" && (
        <Composer value={draft} onChange={setDraft} onSend={sendReply} disabled={sending} />
      )}

      {view !== "compose" && view !== "thread" && (
        <Tabs current={view} unread={unread} onChange={(v) => setView(v)} />
      )}
      {(view === "compose" || view === "thread") && (
        <button type="button" style={backBtn} onClick={() => setView(threads.length ? "messages" : "home")}>
          ← Back
        </button>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------- pieces */

function Header({ theme }: { theme: WidgetTheme }) {
  return (
    <div style={header}>
      {/* Brand row. Only a logo goes here — repeating the title above the heading that already says
          it just reads as a rendering bug, which is exactly how it looked in the first pass. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 30 }}>
        {theme.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={theme.logo} alt="" style={{ height: 22, width: "auto" }} />
        ) : (
          <span />
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex" }}>
            {theme.avatars.map((a, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={a} src={a} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", border: "2px solid #fff", marginLeft: i ? -8 : 0 }} />
            ))}
          </div>
          {/* The widget cannot reach the host page's DOM, so closing is a message the loader
              listens for. Without this the only way out is the launcher button, which the panel
              is sitting on top of. */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => window.parent?.postMessage({ source: "founder-widget", type: "close" }, "*")}
            style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, lineHeight: 1, color: "#667085", padding: 0 }}
          >
            ×
          </button>
        </div>
      </div>
      <h1 style={{ margin: "18px 0 6px", fontSize: 24, lineHeight: 1.2, fontWeight: 800, color: "#101214" }}>
        {theme.title}
      </h1>
      <p style={{ margin: 0, fontSize: 13, lineHeight: "18px", color: "#667085" }}>{theme.greeting}</p>
    </div>
  );
}

function Home({
  threads, onStart, onOpen,
}: {
  threads: Thread[];
  onStart: () => void;
  onOpen: (id: string) => void;
}) {
  const recent = threads[0];
  return (
    <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      {recent && (
        <Card onClick={() => onOpen(recent.id)}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#667085", letterSpacing: "0.04em", marginBottom: 6 }}>RECENT MESSAGE</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#101214" }}>{recent.subject ?? "Conversation"}</div>
          <div style={{ fontSize: 12, color: "#667085", marginTop: 2 }}>
            {recent.last_sender === "admin" ? "Replied" : "Sent"} · {ago(recent.last_message_at)}
          </div>
        </Card>
      )}

      <Card onClick={onStart} accent>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#101214" }}>Start a conversation</div>
            {/* Not the greeting again — that is already two lines above this card. */}
            <div style={{ fontSize: 12, color: "#667085", marginTop: 2 }}>Usually replies within 24-48 hours</div>
          </div>
          <span style={{ fontSize: 18, color: "var(--w-accent)" }}>→</span>
        </div>
      </Card>
    </div>
  );
}

function MessageList({ threads, onOpen, onStart }: { threads: Thread[]; onOpen: (id: string) => void; onStart: () => void }) {
  if (!threads.length) return <Empty text="No conversations yet." action={{ label: "Start one", onClick: onStart }} />;
  return (
    <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
      {threads.map((t) => {
        const unread = t.last_sender === "admin" && (!t.visitor_last_read_at || t.visitor_last_read_at < t.last_message_at);
        return (
          <Card key={t.id} onClick={() => onOpen(t.id)}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {unread && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--w-accent)", flexShrink: 0 }} />}
              <span style={{ fontSize: 13.5, fontWeight: unread ? 800 : 600, color: "#101214", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.subject ?? "Conversation"}
              </span>
              <span style={{ fontSize: 11.5, color: "#667085", flexShrink: 0 }}>{ago(t.last_message_at)}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Compose({
  needsDetails, details, setDetails, draft, setDraft, error, sending, onSend,
}: {
  needsDetails: boolean;
  details: Prefill;
  setDetails: (d: Prefill) => void;
  draft: string;
  setDraft: (s: string) => void;
  error: string | null;
  sending: boolean;
  onSend: () => void;
}) {
  return (
    <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
      {needsDetails && (
        <>
          <Field label="Your name" value={details.name} onChange={(v) => setDetails({ ...details, name: v })} placeholder="Rahul Sharma" />
          <Field label="Email" type="email" value={details.email} onChange={(v) => setDetails({ ...details, email: v })} placeholder="you@company.com" />
          <div>
            <label style={labelStyle}>Mobile number</label>
            <div style={{ display: "flex", gap: 8 }}>
              <select value={details.countryCode} onChange={(e) => setDetails({ ...details, countryCode: e.target.value })} style={{ ...inputStyle, width: 92, cursor: "pointer" }}>
                {COUNTRY_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} placeholder="9876543210" inputMode="tel" style={{ ...inputStyle, flex: 1 }} />
            </div>
          </div>
        </>
      )}

      <div>
        <label style={labelStyle}>Message</label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          placeholder="What would you like to talk about?"
          style={{ ...inputStyle, height: "auto", padding: 10, resize: "vertical", fontFamily: "inherit" }}
        />
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      <button type="button" onClick={onSend} disabled={sending || !draft.trim()} style={{ ...primaryBtn, opacity: sending || !draft.trim() ? 0.6 : 1 }}>
        {sending ? "Sending…" : "Send message"}
      </button>
      <p style={{ margin: 0, fontSize: 11.5, color: "#667085", textAlign: "center" }}>
        This goes straight to the founder. I read every message myself.
      </p>
    </div>
  );
}

function Thread({ messages, error }: { messages: Message[]; error: string | null }) {
  return (
    <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
      {messages.map((m) => (
        <div key={m.id} style={{ display: "flex", justifyContent: m.sender === "visitor" ? "flex-end" : "flex-start" }}>
          <div
            style={{
              maxWidth: "80%", padding: "9px 12px", fontSize: 13.5, lineHeight: "19px", whiteSpace: "pre-wrap",
              borderRadius: "var(--w-radius-sm)",
              background: m.sender === "visitor" ? "var(--w-accent)" : "#f0f1f3",
              color: m.sender === "visitor" ? "var(--w-accent-text)" : "#101214",
            }}
          >
            {m.body}
          </div>
        </div>
      ))}
      {error && <div style={errorStyle}>{error}</div>}
    </div>
  );
}

function Composer({ value, onChange, onSend, disabled }: { value: string; onChange: (s: string) => void; onSend: () => void; disabled: boolean }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: 10, borderTop: "1px solid #e5e8e2", background: "#fff" }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        placeholder="Write a reply…"
        style={{ ...inputStyle, flex: 1 }}
      />
      <button type="button" onClick={onSend} disabled={disabled || !value.trim()} style={{ ...primaryBtn, width: "auto", padding: "0 16px", opacity: disabled || !value.trim() ? 0.6 : 1 }}>
        Send
      </button>
    </div>
  );
}

function Tabs({ current, unread, onChange }: { current: string; unread: number; onChange: (v: "home" | "messages") => void }) {
  return (
    <div style={{ display: "flex", borderTop: "1px solid #e5e8e2", background: "#fff" }}>
      {(["home", "messages"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          style={{
            flex: 1, padding: "11px 0", border: "none", background: "none", cursor: "pointer", fontFamily: "inherit",
            fontSize: 12.5, fontWeight: current === v ? 800 : 600,
            color: current === v ? "#101214" : "#667085",
          }}
        >
          {v === "home" ? "Home" : "Messages"}
          {v === "messages" && unread > 0 && (
            <span style={{ marginLeft: 6, background: "var(--w-accent)", color: "var(--w-accent-text)", borderRadius: 999, padding: "1px 6px", fontSize: 11 }}>{unread}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function Card({ children, onClick, accent }: { children: React.ReactNode; onClick?: () => void; accent?: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 13, cursor: onClick ? "pointer" : "default",
        borderRadius: "var(--w-radius-sm)", background: "#fff",
        border: accent ? "1px solid var(--w-accent)" : "1px solid #e5e8e2",
        boxShadow: "0 1px 3px rgba(20,32,51,0.06)",
      }}
    >
      {children}
    </div>
  );
}

function Empty({ text, action }: { text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div style={{ padding: 30, textAlign: "center", color: "#667085", fontSize: 13 }}>
      {text}
      {action && (
        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={action.onClick} style={{ ...primaryBtn, width: "auto", padding: "0 18px" }}>{action.label}</button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}

/** Short relative time — a widget has no room for a date, and "2d" is what the reference shows. */
function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

/* ----------------------------------------------------------------------- styles */

const shell: React.CSSProperties = {
  display: "flex", flexDirection: "column", height: "100vh", background: "#fbfbf9",
  fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif", color: "#101214",
};
const header: React.CSSProperties = {
  padding: "18px 16px 20px",
  background: "linear-gradient(180deg, #ffffff 0%, #f6f7f4 100%)",
  borderBottom: "1px solid #e5e8e2",
};
const body: React.CSSProperties = { flex: 1, overflowY: "auto", minHeight: 0 };
const labelStyle: React.CSSProperties = { display: "block", fontSize: 11.5, fontWeight: 700, color: "#667085", marginBottom: 5 };
const inputStyle: React.CSSProperties = {
  width: "100%", height: 38, padding: "0 10px", fontSize: 13, color: "#101214",
  border: "1px solid #e5e8e2", borderRadius: "var(--w-radius-sm)", outline: "none", background: "#fff",
};
const primaryBtn: React.CSSProperties = {
  width: "100%", height: 42, border: "none", borderRadius: "var(--w-radius-sm)", cursor: "pointer",
  background: "var(--w-accent)", color: "var(--w-accent-text)", fontFamily: "inherit", fontSize: 14, fontWeight: 700,
};
const errorStyle: React.CSSProperties = {
  fontSize: 12.5, color: "#b42318", background: "#fde2e2", padding: "8px 10px", borderRadius: "var(--w-radius-sm)",
};
const backBtn: React.CSSProperties = {
  border: "none", borderTop: "1px solid #e5e8e2", background: "#fff", cursor: "pointer",
  fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#667085", padding: "10px 0",
};
