/**
 * Channel accounts: the user's own mailbox (Google OAuth, Microsoft, IMAP/SMTP), Mantis's
 * pre-warmed inboxes, and WhatsApp (Mantis numbers or the user's own Meta Cloud API). Every connect
 * is VERIFIED before it is saved as "connected" — a saved-but-broken sender would only surface as
 * a campaign that silently sent nothing.
 */

import { createHmac, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { sql } from "@/lib/db";
import { seal, open } from "./secret";
import { googleOAuthClient, googleOAuthClients } from "@/lib/google-oauth";

export type SenderView = {
  id: string; channel: string; provider: string; address: string; displayName: string | null;
  status: string; statusNote: string | null; dailyLimit: number; lastChecked: string | null; createdAt: string;
  sentToday: number;
};

export async function listSenders(email: string): Promise<SenderView[]> {
  const rows = await sql`
    SELECT s.*, (SELECT count(*)::int FROM v2_sends x JOIN v2_campaigns c ON c.id = x.campaign_id
                 WHERE c.user_email = s.user_email AND x.status = 'sent' AND x.sent_at > date_trunc('day', now())
                   AND x.channel = s.channel) AS sent_today
    FROM v2_senders s WHERE s.user_email = ${email} ORDER BY s.channel, s.created_at`;
  return rows.map((r) => ({
    id: r.id, channel: r.channel, provider: r.provider, address: r.address, displayName: r.display_name,
    status: r.status, statusNote: r.status_note, dailyLimit: r.daily_limit, sentToday: r.sent_today,
    lastChecked: r.last_checked?.toISOString() ?? null, createdAt: r.created_at.toISOString(),
  }));
}

async function save(o: { email: string; channel: string; provider: string; address: string; displayName?: string | null;
  config: Record<string, unknown>; secret: string | null; dailyLimit?: number }) {
  const [row] = await sql`
    INSERT INTO v2_senders (user_email, channel, provider, address, display_name, status, status_note, daily_limit, config, secret, last_checked)
    VALUES (${o.email}, ${o.channel}, ${o.provider}, ${o.address.toLowerCase()}, ${o.displayName ?? null}, 'connected', null,
            ${o.dailyLimit ?? 40}, ${sql.json(o.config as Parameters<typeof sql.json>[0])}, ${o.secret ? seal(o.secret) : null}, now())
    ON CONFLICT (user_email, channel, address) DO UPDATE SET provider = EXCLUDED.provider, display_name = EXCLUDED.display_name,
      status = 'connected', status_note = null, config = EXCLUDED.config, secret = EXCLUDED.secret, last_checked = now()
    RETURNING id`;
  return row.id as string;
}

// ---------------------------------------------------------------- IMAP / SMTP

export type SmtpInput = { address: string; displayName?: string; host: string; port: number; secure: boolean; user: string; pass: string; imapHost?: string; imapPort?: number };

function smtpTransport(c: { host: string; port: number; secure: boolean; user: string; pass: string }) {
  return nodemailer.createTransport({ host: c.host, port: c.port, secure: c.secure, auth: { user: c.user, pass: c.pass },
    connectionTimeout: 12_000, greetingTimeout: 12_000, socketTimeout: 20_000 });
}

/** Logs in to the SMTP server for real; only a successful login is saved. */
export async function connectSmtp(email: string, i: SmtpInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(i.address)) return { ok: false, error: "That isn't a valid email address." };
  try {
    await smtpTransport(i).verify();
  } catch (err) {
    return { ok: false, error: `The mail server refused the login: ${(err as Error).message.slice(0, 160)}` };
  }
  const id = await save({ email, channel: "email", provider: "imap", address: i.address, displayName: i.displayName,
    config: { host: i.host, port: i.port, secure: i.secure, user: i.user, imapHost: i.imapHost ?? null, imapPort: i.imapPort ?? 993 }, secret: i.pass });
  return { ok: true, id };
}

// ---------------------------------------------------------------- Google (Gmail API)

const GOOGLE_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly"];

export function googleRedirectUri(origin: string) {
  return `${origin}/api/v2/outreach/senders/google/callback`;
}

function sign(v: string) {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "").update(v).digest("base64url").slice(0, 32);
}
/** state = email.nonce.sig — the callback only accepts a state this server signed for this user. */
export function googleAuthUrl(email: string, origin: string): string {
  const nonce = randomBytes(9).toString("base64url");
  const state = `${Buffer.from(email).toString("base64url")}.${nonce}.${sign(`${email}.${nonce}`)}`;
  const p = new URLSearchParams({
    client_id: googleOAuthClient()?.id ?? "", redirect_uri: googleRedirectUri(origin), response_type: "code",
    scope: GOOGLE_SCOPES.join(" "), access_type: "offline", prompt: "consent", include_granted_scopes: "true", state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}
export function readGoogleState(state: string): string | null {
  const [e, nonce, sig] = state.split(".");
  if (!e || !nonce || !sig) return null;
  const email = Buffer.from(e, "base64url").toString("utf8");
  return sign(`${email}.${nonce}`) === sig ? email : null;
}

export async function finishGoogle(userEmail: string, code: string, origin: string): Promise<{ ok: true; address: string } | { ok: false; error: string }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: googleOAuthClient()?.id ?? "", client_secret: googleOAuthClient()?.secret ?? "",
      redirect_uri: googleRedirectUri(origin), grant_type: "authorization_code" }),
  });
  const tok = (await res.json()) as { access_token?: string; refresh_token?: string; id_token?: string; scope?: string; error_description?: string; error?: string };
  if (!res.ok || !tok.access_token) return { ok: false, error: tok.error_description ?? tok.error ?? `Google token exchange failed (${res.status})` };
  if (!tok.scope?.includes("gmail.send")) return { ok: false, error: "Google didn't grant permission to send mail — tick the Gmail box on the consent screen." };
  if (!tok.refresh_token) return { ok: false, error: "Google returned no refresh token — remove Mantis from your Google account's third-party access and connect again." };
  const prof = (await (await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", { headers: { authorization: `Bearer ${tok.access_token}` } })).json()) as { emailAddress?: string; error?: { message?: string } };
  if (!prof.emailAddress) return { ok: false, error: `Gmail API: ${prof.error?.message ?? "could not read the mailbox"}` };
  await save({ email: userEmail, channel: "email", provider: "google", address: prof.emailAddress, config: { scope: tok.scope }, secret: tok.refresh_token });
  return { ok: true, address: prof.emailAddress };
}

async function googleAccessToken(refresh: string): Promise<string> {
  // A refresh token works only with the client that issued it: senders connected before the move to
  // the Mantis client get "unauthorized_client" from it and refresh through the older one.
  let err = "Google refused the refresh token";
  for (const c of googleOAuthClients()) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ refresh_token: refresh, client_id: c.id, client_secret: c.secret, grant_type: "refresh_token" }),
    });
    const t = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
    if (t.access_token) return t.access_token;
    err = t.error_description ?? t.error ?? err;
    if (t.error !== "unauthorized_client" && t.error !== "invalid_client") break;
  }
  throw new Error(err);
}

// ---------------------------------------------------------------- WhatsApp (Meta Cloud API)

export type MetaInput = { phoneNumberId: string; wabaId?: string; token: string };
const GRAPH = "https://graph.facebook.com/v21.0";

/** Reads the number from Meta with the token — proves both the id and the token are right. */
export async function connectMeta(email: string, i: MetaInput): Promise<{ ok: true; id: string; number: string } | { ok: false; error: string }> {
  if (!/^\d{6,}$/.test(i.phoneNumberId)) return { ok: false, error: "Phone number ID is the long number from WhatsApp Manager → API setup, not the phone number itself." };
  const res = await fetch(`${GRAPH}/${i.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`, { headers: { authorization: `Bearer ${i.token}` } });
  const d = (await res.json()) as { display_phone_number?: string; verified_name?: string; quality_rating?: string; error?: { message?: string } };
  if (!res.ok || !d.display_phone_number) return { ok: false, error: `Meta refused it: ${d.error?.message ?? res.status}` };
  const id = await save({ email, channel: "whatsapp", provider: "meta", address: d.display_phone_number, displayName: d.verified_name ?? null,
    config: { phoneNumberId: i.phoneNumberId, wabaId: i.wabaId ?? null, quality: d.quality_rating ?? null }, secret: i.token, dailyLimit: 250 });
  return { ok: true, id, number: d.display_phone_number };
}

// ---------------------------------------------------------------- sending

type SenderRow = {
  status?: string; daily_limit?: number; user_email?: string; id: string; channel: string; provider: string; address: string; display_name: string | null; config: Record<string, unknown>; secret: string | null };

export async function senderFor(email: string, channel: string): Promise<SenderRow | null> {
  const [s] = await sql`SELECT * FROM v2_senders WHERE user_email = ${email} AND channel = ${channel} AND status = 'connected' ORDER BY created_at LIMIT 1`;
  return (s as unknown as SenderRow) ?? null;
}

export type MailOut = {
  to: string; subject: string; html?: string; text: string;
  /** Follow-ups: the first touch's Message-ID / Gmail thread, so they land as a reply in one thread. */
  inReplyTo?: string | null; threadId?: string | null;
  /** mailto: for the List-Unsubscribe header (one-click "unsubscribe" in Gmail/Outlook). */
  unsubscribeMailto?: string | null;
};
export type MailSent = { id: string; messageId: string; threadId: string | null };

export async function sendEmail(s: SenderRow, m: MailOut): Promise<MailSent> {
  const from = s.display_name ? `"${s.display_name.replace(/"/g, "")}" <${s.address}>` : s.address;
  // Our own Message-ID, so replies can be matched to the send whichever provider carried it.
  const messageId = `<${randomBytes(12).toString("hex")}@${s.address.split("@")[1]}>`;
  const mail = {
    from, to: m.to, subject: m.subject, text: m.text, html: m.html, messageId,
    ...(m.inReplyTo ? { inReplyTo: m.inReplyTo, references: m.inReplyTo } : {}),
    ...(m.unsubscribeMailto ? { list: { unsubscribe: { url: m.unsubscribeMailto, comment: "Unsubscribe" } } } : {}),
  };
  if (s.provider === "imap") {
    const c = s.config as { host: string; port: number; secure: boolean; user: string };
    const info = await smtpTransport({ ...c, pass: open(s.secret!) }).sendMail(mail);
    return { id: info.messageId, messageId: info.messageId ?? messageId, threadId: null };
  }
  if (s.provider === "google") {
    const token = await googleAccessToken(open(s.secret!));
    const mime = await new Promise<Buffer>((resolve, reject) => {
      nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" })
        .sendMail(mail, (err, info) => (err ? reject(err) : resolve(info.message as Buffer)));
    });
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ raw: mime.toString("base64url"), ...(m.threadId ? { threadId: m.threadId } : {}) }),
    });
    const d = (await res.json()) as { id?: string; threadId?: string; error?: { message?: string } };
    if (!d.id) throw new Error(`Gmail: ${d.error?.message ?? res.status}`);
    return { id: d.id, messageId, threadId: d.threadId ?? null };
  }
  throw new Error(`Sending from a ${s.provider} sender isn't wired yet.`);
}

/** For the inbox sync: a fresh Google access token for this sender. */
export async function googleTokenFor(s: SenderRow): Promise<string> {
  return googleAccessToken(open(s.secret!));
}
export function senderSecret(s: SenderRow): string | null {
  return s.secret ? open(s.secret) : null;
}
export type { SenderRow };

export async function sendWhatsApp(s: SenderRow, m: { to: string; text: string; imageUrl?: string | null }): Promise<string> {
  if (s.provider !== "meta") throw new Error("Mantis WhatsApp numbers aren't live yet.");
  const to = m.to.replace(/[^\d]/g, "").replace(/^0+/, "").replace(/^(?=\d{10}$)/, "91");
  const res = await fetch(`${GRAPH}/${(s.config as { phoneNumberId: string }).phoneNumberId}/messages`, {
    method: "POST", headers: { authorization: `Bearer ${open(s.secret!)}`, "content-type": "application/json" },
    // With an image the text rides as its caption (WhatsApp caps captions at 1024 characters).
    body: JSON.stringify(m.imageUrl
      ? { messaging_product: "whatsapp", to, type: "image", image: { link: m.imageUrl, caption: m.text.slice(0, 1024) } }
      : { messaging_product: "whatsapp", to, type: "text", text: { body: m.text.slice(0, 4096) } }),
  });
  const d = (await res.json()) as { messages?: Array<{ id: string }>; error?: { message?: string } };
  if (!d.messages?.[0]) throw new Error(`WhatsApp: ${d.error?.message ?? res.status}`);
  return d.messages[0].id;
}
