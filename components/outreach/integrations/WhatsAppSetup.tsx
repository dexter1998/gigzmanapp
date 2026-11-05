"use client";

/**
 * /integrations/whatsapp — either a Mantis pre-warmed number (not orderable yet → request access)
 * or the user's own number through Meta's WhatsApp Cloud API: a step-by-step walk through Meta's
 * console, the webhook values to paste, and the connect form (POST type=meta, which reads the
 * number back from Meta with the token before saving).
 */

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, ExternalLink, Info, Mail, FileCheck2, Lock, ShieldCheck, Pause, Clock3, Check, Bell } from "lucide-react";
import { WHATSAPP_LIVE } from "@/lib/v2/outreach/channels";
import "../../compact.css";
import { BrandLogo } from "../BrandLogo";
import { SetupShell, SetupStep, ConnectedList, PoolTable, CopyField, useOutreachData, FlashBar, SupportLink, type Flash } from "./shared";
import { toast } from "@/components/toast/toast";

const META_DOCS = "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started";

/**
 * WhatsApp is "Coming soon" (lib/v2/outreach/channels.ts): the page explains what is on the way
 * and points at the channels that work today. The full setup flow below is kept intact for when
 * the channel is switched back on.
 */
export function WhatsAppSetup({ initialMethod }: { initialMethod: "meta" | "mantis" }) {
  return WHATSAPP_LIVE ? <WhatsAppSetupLive initialMethod={initialMethod} /> : <WhatsAppComingSoon />;
}

function WhatsAppComingSoon() {
  return (
    <SetupShell brand="whatsapp" title="WhatsApp" help="WhatsApp campaigns in Mantis"
      intro={<span className="cp-sub"><span className="ox-soon">Coming soon</span> Bulk WhatsApp campaigns</span>}>
      <section className="ox-setup-panel" aria-label="WhatsApp is coming soon" style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ width: 36, height: 36, flexShrink: 0, display: "grid", placeItems: "center", border: "1px solid var(--rule)", borderRadius: "var(--radius-sm)", background: "var(--surface)" }}>
            <Clock3 size={17} color="var(--ink-muted)" />
          </span>
          <div>
            <h2 style={{ fontSize: 17, lineHeight: "24px", fontWeight: 600, margin: 0, color: "var(--ink)" }}>WhatsApp sending is on the way</h2>
            <p style={{ fontSize: 13, lineHeight: "18px", color: "var(--ink-muted)", margin: "4px 0 0" }}>
              Nothing is sent on WhatsApp yet · WhatsApp touches in campaigns are skipped
            </p>
          </div>
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {["Send from your own Business number", "Replies land in Inbox · stop the sequence", "Approved templates for first messages"].map((t) => (
            <li key={t} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--ink)" }}>
              <Check size={15} color="var(--ink-muted)" /> {t}
            </li>
          ))}
        </ul>
        <div className="ox-form-foot" style={{ borderTop: "1px solid var(--rule)", paddingTop: 16, marginTop: 0 }}>
          <span className="cp-hint"><Info size={13} /> Email + AI calls work today</span>
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="v2-btn" href="/integrations/email"><Mail size={15} /> Connect email</Link>
            <SupportLink className="v2-btn" subject="Notify me: WhatsApp campaigns in Mantis"><Bell size={15} /> Get notified</SupportLink>
          </span>
        </div>
      </section>
    </SetupShell>
  );
}

function WhatsAppSetupLive({ initialMethod }: { initialMethod: "meta" | "mantis" }) {
  const { data, load, manage, of } = useOutreachData();
  const [method, setMethod] = useState<"meta" | "mantis">(initialMethod);
  const [flash, setFlash] = useState<Flash | null>(null);
  const senders = of("whatsapp");
  const wa = data?.whatsapp;

  return (
    <SetupShell brand="whatsapp" title="WhatsApp" help="Help setting up WhatsApp in Mantis"
      intro={<span className="cp-sub" title="Send campaign messages from a WhatsApp Business number. Replies land in Mantis's Inbox and stop that lead's sequence.">Business number · replies in Inbox · stop sequence</span>}>
      <FlashBar flash={flash} onClose={() => setFlash(null)} />

      <div className="ox-seg big ox-setup-seg" role="tablist" aria-label="WhatsApp number source">
        <button type="button" role="tab" aria-selected={method === "meta"} className={method === "meta" ? "on" : ""} onClick={() => setMethod("meta")}><BrandLogo brand="meta" size={16} /> Own number · Meta</button>
        <button type="button" role="tab" aria-selected={method === "mantis"} className={method === "mantis" ? "on" : ""} onClick={() => setMethod("mantis")}><BrandLogo brand="mantis" size={16} /> Mantis number</button>
      </div>

      {method === "mantis" && (
        <SetupStep n={1} title="Mantis pre-warmed numbers" desc={<span className="cp-stats"><span className="cp-stat ok"><ShieldCheck size={12} /> Meta-verified</span><span className="cp-stat">Warmed</span><span className="cp-stat">Approved templates</span><span className="cp-stat">Your business name</span></span>}>
          <div className="ox-setup-panel">
            <PoolTable rows={data?.pool.filter((p) => p.channel === "whatsapp") ?? []} kind="whatsapp" />
            <div className="ox-form-foot">
              <span className="cp-hint" title="Ordering inside Mantis isn't open yet. Request access and we'll set a number up with you."><Info size={13} /> Access on request</span>
              <SupportLink className="v2-btn primary" subject="Request access: Mantis WhatsApp numbers"><Mail size={15} /> Request access</SupportLink>
            </div>
          </div>
        </SetupStep>
      )}

      {method === "meta" && (
        <>
          <SetupStep n={1} title="Set up Meta Business + WABA"
            desc={<span className="cp-hint"><Info size={13} /> In Meta&apos;s consoles · skip what you have</span>}>
            <ol className="ox-setup-ol">
              <li><b>Verify business</b> at <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer">business.facebook.com</a></li>
              <li><b>Create a Business app</b> + add WhatsApp at <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer">developers.facebook.com/apps</a></li>
              <li><b>Add your number</b> in WhatsApp → API Setup · verify by SMS/call</li>
              <li><b>Copy both IDs</b> · Phone number ID + WABA ID</li>
            </ol>
            <details className="cp-why"><summary>Details</summary>
            <ol className="ox-setup-ol">
              <li>Create or open your <b>Meta Business portfolio</b> at <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer">business.facebook.com</a> and complete business verification (needed to message beyond the trial limits).</li>
              <li>At <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer">developers.facebook.com/apps</a>, create an app of type <b>Business</b> and add the <b>WhatsApp</b> product. This creates a <b>WhatsApp Business Account (WABA)</b>.</li>
              <li>In <b>WhatsApp → API Setup</b>, add your business phone number and verify it by SMS or call. The number can&apos;t be in use on the regular WhatsApp or WhatsApp Business app at the same time.</li>
              <li>Copy the <b>Phone number ID</b> and the <b>WhatsApp Business Account ID</b> shown under the number — both are long numeric IDs, not the phone number itself.</li>
            </ol>
            </details>
          </SetupStep>

          <SetupStep n={2} title="Create a permanent access token"
            desc={<span className="cp-stat warn" title="The temporary token on the API Setup page expires in 24 hours — campaigns would stop the next day."><AlertTriangle size={12} /> Temporary token expires in 24h</span>}>
            <ol className="ox-setup-ol">
              <li><b>Add a system user</b> · Admin role</li>
              <li><b>Assign assets</b> · app + WhatsApp account, full control</li>
              <li><b>Generate token</b> · expiry Never · both <code>whatsapp_business_*</code> scopes</li>
              <li><b>Copy it once</b> (<code>EAA…</code>) · paste in step 4</li>
            </ol>
            <details className="cp-why"><summary>Details</summary>
            <ol className="ox-setup-ol">
              <li>In Business settings → <b>Users → System users</b>, add a system user with the <b>Admin</b> role.</li>
              <li>Assign it your app and your WhatsApp account (<b>Assign assets</b>, full control).</li>
              <li>Click <b>Generate new token</b>, pick your app, set expiry to <b>Never</b>, and tick <code>whatsapp_business_messaging</code> and <code>whatsapp_business_management</code>.</li>
              <li>Copy the token (it starts with <code>EAA</code>). Meta shows it once — paste it straight into step 4.</li>
            </ol>
            </details>
          </SetupStep>

          <SetupStep n={3} title="Point Meta's webhook at Mantis"
            desc={<span className="cp-hint" title="This is how replies and read receipts reach Mantis."><Info size={13} /> WhatsApp → Configuration → Webhook → Edit</span>}>
            <div className="ox-setup-panel">
              {wa ? (
                <>
                  <CopyField label="Callback URL" value={wa.webhookUrl} />
                  {wa.verifyToken
                    ? <CopyField label="Verify token" value={wa.verifyToken} masked />
                    : <div className="ox-setup-note warn"><AlertTriangle size={14} /> <span title="The webhook verify token isn't configured on this server yet — Meta's Verify step will fail.">Verify token not configured · <SupportLink subject="WhatsApp webhook verify token missing">contact support</SupportLink></span></div>}
                  <ol className="ox-setup-ol">
                    <li>Paste both · <b>Verify and save</b></li>
                    <li><b>Webhook fields</b> → subscribe <code>messages</code></li>
                  </ol>
                  <div className="ox-setup-note"><Info size={14} /> <span title="Mantis checks the signature on every webhook event. Sending works as soon as step 4 is done; replies from your own Meta app need your app registered with Mantis.">Sending: ready after step 4 · Reply sync: <SupportLink subject="WhatsApp webhook: enable reply sync for my Meta app">ask support</SupportLink></span></div>
                </>
              ) : <div className="ox-setup-skel" aria-label="Loading" />}
            </div>
          </SetupStep>

          <SetupStep n={4} title="Connect your number" done={senders.some((s) => s.provider === "meta")}>
            <MetaForm onDone={(f) => { setFlash(f); if (f.ok) void load(); }} />
          </SetupStep>

          <SetupStep n={5} title="Message templates" desc="Business-started chats need approved templates">
            <div className="ox-setup-tips">
              <div className="ox-setup-tip"><span className="ox-setup-tip-icon"><FileCheck2 size={16} /></span><div><b>First touch = approved template</b><p>Marketing or Utility · approval mins–1 day · free text 24h after reply</p><details className="cp-why"><summary>Details</summary><p>Create templates in WhatsApp Manager → Message templates (category <b>Marketing</b> or <b>Utility</b>). Approval usually takes minutes to a day. Free text only works inside the 24 hours after a lead replies.</p></details></div></div>
              <div className="ox-setup-tip"><span className="ox-setup-tip-icon"><Info size={16} /></span><div><b>Quality and limits</b><p>250 chats/day to start · rises with quality · “stop” = unsubscribe</p><details className="cp-why"><summary>Details</summary><p>New numbers start at a limit of 250 business-initiated conversations a day, rising as your quality rating stays high. Blocks and reports lower it — keep messages relevant and honour “STOP”. Mantis treats a “stop” reply as an unsubscribe.</p></details></div></div>
              <div className="ox-setup-tip"><span className="ox-setup-tip-icon"><Info size={16} /></span><div><b>Never cold on WhatsApp</b><p title="Campaigns don't use WhatsApp as the first touch to a stranger — it follows an email or call, per Meta's policy.">Follows an email or call · Meta policy</p></div></div>
            </div>
          </SetupStep>
        </>
      )}

      <SetupStep n={method === "meta" ? 6 : 2} title="Connected numbers" done={senders.length > 0}
        desc={<span className="cp-hint"><span className="cp-hint" title="Pause a number to stop campaigns using it."><Pause size={12} /> Pause stops campaigns</span> · <span title="The daily limit caps messages per number per day.">Daily limit per number</span></span>}>
        <ConnectedList senders={senders} onManage={manage} unit="messages" empty={data ? "No number connected" : "Loading…"} />
      </SetupStep>
    </SetupShell>
  );
}

function MetaForm({ onDone }: { onDone: (f: Flash) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setBusy(true); setErr(null);
    const r = await fetch("/api/v2/outreach/senders", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "meta", phoneNumberId: f.phoneNumberId, wabaId: f.wabaId, token: f.token }) }).catch(() => null);
    const d = (await r?.json().catch(() => ({})) ?? {}) as { ok?: boolean; error?: string; number?: string };
    setBusy(false);
    if (d.ok) { form.reset(); onDone({ ok: true, text: `Connected WhatsApp ${d.number ?? ""} · verified by Meta` }); toast.success("WhatsApp connected", `${d.number ?? "Your number"} · verified by Meta.`); }
    else { setErr(d.error ?? "Couldn't connect."); toast.error("Couldn't connect WhatsApp", d.error ?? "Check the details and try again."); }
  }
  return (
    <form className="ox-form" onSubmit={submit}>
      <div className="ox-sub-title"><BrandLogo brand="meta" size={18} /> Meta Cloud API</div>
      <div className="ox-grid2">
        <label>Phone number ID<input name="phoneNumberId" required inputMode="numeric" pattern="\d{6,}" placeholder="1234567890123456" autoComplete="off" /></label>
        <label><span>WhatsApp Business Account ID <em>optional</em></span><input name="wabaId" inputMode="numeric" placeholder="1029384756" autoComplete="off" /></label>
        <label className="wide">Permanent access token<input name="token" type="password" required autoComplete="off" placeholder="EAAG…" /></label>
      </div>
      <a className="ox-help" href={META_DOCS} target="_blank" rel="noopener noreferrer">Meta&apos;s Cloud API guide <ExternalLink size={12} /></a>
      {err && <div className="ox-form-err"><AlertTriangle size={14} /> <span className="ox-setup-flash-text">{err}</span></div>}
      <div className="ox-form-foot">
        <span className="cp-hint" title="We read your number from Meta with this token to verify it. The token is stored encrypted and never shown again."><Lock size={13} /> Verified with Meta · encrypted token</span>
        <button type="submit" className="v2-btn primary" disabled={busy}>{busy ? <><Loader2 size={15} className="ox-spin" /> Verifying…</> : "Verify & connect"}</button>
      </div>
    </form>
  );
}
