"use client";

/**
 * /integrations/email — pick how to connect a mailbox, connect it (each connect is a live login
 * before it is saved), manage the connected ones, and the deliverability basics that decide
 * whether any of it lands in the inbox.
 *
 * Outlook has no Microsoft OAuth backend yet (needs an Entra app), so it is the IMAP/SMTP form
 * pre-filled with Microsoft's servers — same POST as custom SMTP.
 */

import { useState } from "react";
import { AlertTriangle, Loader2, ExternalLink, ShieldCheck, Flame, Gauge, Check, Info, Mail, Pause, Clock, Lock } from "lucide-react";
import { BrandLogo, type Brand } from "../BrandLogo";
import "../../compact.css";
import {
  SetupShell, SetupStep, ConnectedList, PoolTable, FlashBar, useOutreachData, useReturnFlash, SupportLink, type Flash,
} from "./shared";

export type EmailMethod = "gmail" | "outlook" | "smtp" | "mantis";

type Preset = { id: string; label: string; host: string; port: number; imapHost: string; imapPort: number; note?: string };
const PRESETS: Preset[] = [
  { id: "custom", label: "Other / custom", host: "", port: 587, imapHost: "", imapPort: 993 },
  { id: "zoho-in", label: "Zoho Mail (India, zoho.in)", host: "smtp.zoho.in", port: 465, imapHost: "imap.zoho.in", imapPort: 993, note: "2FA on? Use an app password (Zoho → Security → App passwords)" },
  { id: "zoho", label: "Zoho Mail (global, zoho.com)", host: "smtp.zoho.com", port: 465, imapHost: "imap.zoho.com", imapPort: 993, note: "Enable IMAP: Zoho Mail settings → Mail accounts" },
  { id: "hostinger", label: "Hostinger", host: "smtp.hostinger.com", port: 465, imapHost: "imap.hostinger.com", imapPort: 993 },
  { id: "godaddy", label: "GoDaddy Professional Email", host: "smtpout.secureserver.net", port: 465, imapHost: "imap.secureserver.net", imapPort: 993 },
  { id: "gmail-app", label: "Gmail with app password", host: "smtp.gmail.com", port: 587, imapHost: "imap.gmail.com", imapPort: 993, note: "Prefer “Connect Gmail” · app passwords need 2-Step and break on password change" },
];
const OUTLOOK: Preset = { id: "outlook", label: "Outlook / Microsoft 365", host: "smtp.office365.com", port: 587, imapHost: "outlook.office365.com", imapPort: 993 };

const METHODS: Array<{ id: EmailMethod; brand: Brand; title: string; desc: string; tag?: string }> = [
  { id: "gmail", brand: "google-color", title: "Gmail / Google Workspace", desc: "Google sign-in · no password stored · send + read replies" },
  { id: "outlook", brand: "microsoft", title: "Outlook / Microsoft 365", desc: "SMTP/IMAP · servers pre-filled" },
  { id: "smtp", brand: "imap", title: "Custom SMTP / IMAP", desc: "Zoho, Hostinger, GoDaddy, cPanel, any SMTP" },
  { id: "mantis", brand: "mantis", title: "Mantis pre-warmed inboxes", desc: "Aged, warmed domains · full volume day one", tag: "Recommended" },
];

export function EmailSetup({ initialMethod, initialFlash }: { initialMethod: EmailMethod | null; initialFlash: Flash | null }) {
  const { data, load, manage, of } = useOutreachData();
  const [flash, setFlash] = useReturnFlash(initialFlash);
  const [method, setMethod] = useState<EmailMethod | null>(initialMethod);
  const senders = of("email");

  function pick(m: EmailMethod) {
    setMethod(m);
    requestAnimationFrame(() => document.getElementById("email-connect")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  const onConnected = (f: Flash) => { setFlash(f); if (f.ok) { void load(); document.getElementById("email-mailboxes")?.scrollIntoView({ behavior: "smooth" }); } };

  return (
    <SetupShell brand="gmail" title="Email senders" help="Help setting up email senders in Mantis"
      intro={<span className="cp-sub" title="Connect the mailboxes your campaigns send from. Recipients see your address and replies come back into Mantis's Inbox.">Your sending mailboxes · replies land in Inbox</span>}>
      <FlashBar flash={flash} onClose={() => setFlash(null)} />

      <SetupStep n={1} title="Choose how to send" done={senders.length > 0}
        desc={<span className="cp-hint" title="You can connect several mailboxes — Mantis spreads a campaign across them and respects each one's daily limit."><Info size={13} /> Multiple mailboxes · load spread · per-box limits</span>}>
        <div className="ox-setup-methods" role="radiogroup" aria-label="Email connection method">
          {METHODS.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={method === m.id} className={`ox-setup-method${method === m.id ? " on" : ""}`} onClick={() => pick(m.id)}>
              <span className="ox-setup-method-logo"><BrandLogo brand={m.brand} size={22} /></span>
              <b>{m.title}{m.tag && <span className="ox-tag ox-setup-rec">{m.tag}</span>}</b>
              <span>{m.desc}</span>
            </button>
          ))}
        </div>
      </SetupStep>

      <SetupStep n={2} id="email-connect" title="Connect"
        desc={method ? undefined : "Pick a method above"}>
        {method === "gmail" && <GmailConnect configured={!!data?.google.configured} loading={!data} />}
        {method === "outlook" && <SmtpForm key="outlook" preset={OUTLOOK} outlook onDone={onConnected} />}
        {method === "smtp" && <SmtpForm key="smtp" onDone={onConnected} />}
        {method === "mantis" && (
          <div className="ox-setup-panel">
            <div className="ox-sub-title"><BrandLogo brand="mantis" /> Mantis pre-warmed inboxes <span className="ox-soon">Request access</span></div>
            <div className="cp-stats">
              <span className="cp-stat ok"><Flame size={12} /> Weeks of warm-up</span>
              <span className="cp-stat"><ShieldCheck size={12} /> SPF · DKIM · DMARC done</span>
              <span className="cp-stat warn" title="Ordering inside Mantis isn't open yet — request access and we'll set them up with you.">Access on request</span>
            </div>
            <PoolTable rows={data?.pool.filter((p) => p.channel === "email") ?? []} kind="email" />
            <div className="ox-form-foot">
              <span className="cp-hint" title="Done-for-you domains: you pick the names, we register and warm them."><Clock size={13} /> Custom domains: ~2–3 weeks</span>
              <SupportLink className="v2-btn primary" subject="Request access: Mantis pre-warmed inboxes"><Mail size={15} /> Request access</SupportLink>
            </div>
          </div>
        )}
      </SetupStep>

      <SetupStep n={3} id="email-mailboxes" title="Your mailboxes" done={senders.length > 0}
        desc={<span className="cp-hint"><span className="cp-hint" title="Pause stops campaigns using a mailbox without losing its setup."><Pause size={12} /> Pause keeps setup</span> · <span title="The daily limit is a hard cap per mailbox, per day.">Daily limit = hard cap</span></span>}>
        <ConnectedList senders={senders} onManage={manage} unit="emails" empty={data ? "No mailbox yet · connect in step 2" : "Loading…"} />
      </SetupStep>

      <SetupStep n={4} title="Deliverability checklist" desc="What inbox providers check">
        <DeliverabilityTips />
      </SetupStep>
    </SetupShell>
  );
}

function GmailConnect({ configured, loading }: { configured: boolean; loading: boolean }) {
  return (
    <div className="ox-setup-panel">
      <div className="ox-sub-title"><BrandLogo brand="google-color" size={18} /> Gmail / Google Workspace</div>
      <ol className="ox-setup-ol">
        <li><b>Continue with Google</b> · pick the sending mailbox</li>
        <li title="Without “send”, the connection is refused."><b>Tick both Gmail boxes</b> · send + read (required)</li>
        <li>Back here · listed under <b>Your mailboxes</b></li>
      </ol>
      <details className="cp-why"><summary>Details</summary><p>Workspace admins who restrict third-party apps must allow Mantis first (Admin console → Security → API controls). Mantis never sees your Google password, and you can revoke access any time from your Google account.</p></details>
      <div className="ox-form-foot">
        <span className="cp-hint" title="gmail.readonly is used to pick up replies."><ShieldCheck size={13} /> gmail.send · gmail.readonly</span>
        {loading ? <span className="v2-btn" aria-busy="true"><Loader2 size={15} className="ox-spin" /> Checking…</span>
          : configured ? <a className="v2-btn primary" href="/api/v2/outreach/senders/google/start"><BrandLogo brand="google-color" size={16} /> Continue with Google</a>
          : <span className="ox-status off">Google sign-in not configured</span>}
      </div>
    </div>
  );
}

function SmtpForm({ preset, outlook, onDone }: { preset?: Preset; outlook?: boolean; onDone: (r: Flash) => void }) {
  const [p, setP] = useState<Preset>(preset ?? PRESETS[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setBusy(true); setErr(null);
    const r = await fetch("/api/v2/outreach/senders", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "smtp", address: f.address, displayName: f.displayName, host: f.host, port: Number(f.port), user: f.user, pass: f.pass,
        imapHost: f.imapHost, imapPort: Number(f.imapPort), secure: Number(f.port) === 465 }) }).catch(() => null);
    const d = (await r?.json().catch(() => ({})) ?? {}) as { ok?: boolean; error?: string };
    setBusy(false);
    if (d.ok) { form.reset(); onDone({ ok: true, text: `Connected ${f.address} · login verified` }); }
    else setErr(d.error ?? "Couldn't connect.");
  }
  return (
    <form className="ox-form" onSubmit={submit}>
      <div className="ox-sub-title"><BrandLogo brand={outlook ? "microsoft" : "imap"} size={18} /> {outlook ? "Outlook / Microsoft 365" : "Custom SMTP / IMAP"}</div>
      {outlook ? (
        <><div className="ox-setup-note warn"><AlertTriangle size={14} /> <span><b>M365:</b> enable Authenticated SMTP · <b>Outlook.com:</b> 2-step + app password</span></div>
          <details className="cp-why"><summary>Details</summary><p>Microsoft 365: your admin must turn on <b>Authenticated SMTP</b> for this mailbox (Microsoft 365 admin center → Users → Mail → Manage email apps). Outlook.com: turn on two-step verification and use an <b>app password</b>. Microsoft is phasing out password logins for SMTP — if the login is refused, direct Microsoft sign-in is on the way.</p></details></>
      ) : (
        <label className="ox-setup-preset">Provider
          <select value={p.id} onChange={(e) => setP(PRESETS.find((x) => x.id === e.target.value) ?? PRESETS[0])}>
            {PRESETS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </label>
      )}
      {p.note && <div className="ox-setup-note"><Info size={14} /> {p.note}</div>}
      <div className="ox-grid2" key={p.id}>
        <label>Email address<input name="address" type="email" required placeholder="you@yourcompany.com" autoComplete="off" /></label>
        <label><span>Name recipients see <em>from name</em></span><input name="displayName" placeholder="Tarun from Gigzman" /></label>
        <label>SMTP host<input name="host" required defaultValue={p.host} placeholder="smtp.yourprovider.com" /></label>
        <label><span>SMTP port <em>465 = SSL, 587 = STARTTLS</em></span><input name="port" type="number" defaultValue={p.port} required /></label>
        <label><span>Username <em>usually the email address</em></span><input name="user" placeholder="Leave blank to use the email address" autoComplete="off" /></label>
        <label>Password / app password<input name="pass" type="password" required autoComplete="new-password" /></label>
        <label><span>IMAP host <em>for replies</em></span><input name="imapHost" defaultValue={p.imapHost} placeholder="imap.yourprovider.com" /></label>
        <label>IMAP port<input name="imapPort" type="number" defaultValue={p.imapPort} /></label>
      </div>
      {err && <div className="ox-form-err"><AlertTriangle size={14} /> <span className="ox-setup-flash-text">{err}</span></div>}
      <div className="ox-form-foot">
        <span className="cp-hint" title="We log in to the SMTP server once to verify it before saving. The password is stored encrypted and never shown again."><Lock size={13} /> Verified login · encrypted password</span>
        <button type="submit" className="v2-btn primary" disabled={busy}>{busy ? <><Loader2 size={15} className="ox-spin" /> Verifying…</> : "Verify & connect"}</button>
      </div>
    </form>
  );
}

function DeliverabilityTips() {
  const items: Array<{ icon: React.ReactNode; title: string; short: React.ReactNode; more: React.ReactNode }> = [
    { icon: <ShieldCheck size={16} />, title: "SPF", short: <>1 TXT record · list your senders</>, more: <>One TXT record on your domain listing who may send for it, e.g. <code>v=spf1 include:_spf.google.com ~all</code> for Google Workspace or <code>include:spf.protection.outlook.com</code> for Microsoft 365. Only one SPF record per domain — merge includes into it.</> },
    { icon: <ShieldCheck size={16} />, title: "DKIM", short: <>Enable signing · add provider record</>, more: <>Turn on DKIM signing in your mail provider (Google Admin → Gmail → Authenticate email; Microsoft Defender → DKIM; Zoho → Domains → DKIM) and add the record it gives you.</> },
    { icon: <ShieldCheck size={16} />, title: "DMARC", short: <>TXT at <code>_dmarc</code> · required by Gmail/Yahoo</>, more: <>Add a TXT record at <code>_dmarc.yourdomain.com</code>, starting with <code>v=DMARC1; p=none; rua=mailto:you@yourdomain.com</code>. Gmail and Yahoo require it for bulk senders.</> },
    { icon: <Flame size={16} />, title: "Warm up new mailboxes", short: <>Start 10–20/day · +10/day · 2–4 weeks</>, more: <>A new or quiet mailbox should start around 10–20 emails a day and grow by about 10 a day over 2–4 weeks. Sudden volume from a cold mailbox is the fastest way into spam.</> },
    { icon: <Gauge size={16} />, title: "Daily send caps", short: <>30–50 cold/day per box · default 40</>, more: <>Keep each mailbox at about 30–50 cold emails a day (Mantis defaults to 40). For more volume, add mailboxes — ideally on a separate domain from your main one — rather than raising one limit.</> },
    { icon: <Check size={16} />, title: "Content hygiene", short: <>Plain text · no shorteners · opt-out line</>, more: <>Plain text beats heavy HTML; avoid link shorteners and attachments on first touches; keep an opt-out line. Reply rates matter more to inbox providers than open rates.</> },
  ];
  return (
    <div className="ox-setup-tips">
      {items.map((t) => (
        <div key={t.title} className="ox-setup-tip">
          <span className="ox-setup-tip-icon">{t.icon}</span>
          <div><b>{t.title}</b><p>{t.short}</p><details className="cp-why"><summary>Details</summary><p>{t.more}</p></details></div>
        </div>
      ))}
      <a className="ox-help" href="https://support.google.com/a/answer/81126" target="_blank" rel="noopener noreferrer">Google&apos;s sender guidelines <ExternalLink size={12} /></a>
    </div>
  );
}
