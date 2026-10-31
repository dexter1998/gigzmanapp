/**
 * Inbox sync (docs/v2-campaigns.md): reads replies to campaign mail from each connected mailbox —
 * Gmail through the Gmail API, anything else over IMAP — and records them.
 *
 * Privacy: only messages that answer one of OUR sends are stored (same thread, In-Reply-To /
 * References to our Message-ID, or from an address we mailed). The rest of the user's mailbox is
 * read for matching and never saved.
 *
 * A human reply stops that lead's sequence; "unsubscribe" also suppresses the address for this
 * user; a bounce marks the send and stops further mail to that address.
 */

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { sql } from "@/lib/db";
import { logOutcome } from "../learning";
import { recordOutcome } from "../signals/outcomes";
import { callTool, MODELS } from "../claude";
import { googleTokenFor, senderSecret, type SenderRow } from "./senders";

const LOOKBACK_DAYS = 14;

type Incoming = { loadBody?: () => Promise<string>; externalId: string; threadId: string | null; from: string; fromName: string | null; subject: string | null;
  body: string; inReplyTo: string[]; date: Date };

export type SyncResult = { senders: number; scanned: number; matched: number; replies: number; bounces: number; errors: string[] };

export async function syncInbox(user: string): Promise<SyncResult> {
  const out: SyncResult = { senders: 0, scanned: 0, matched: 0, replies: 0, bounces: 0, errors: [] };
  const senders = (await sql`SELECT * FROM v2_senders WHERE user_email = ${user} AND channel = 'email' AND status IN ('connected','paused')`) as unknown as SenderRow[];
  // What we sent, to match against: ids, threads and addresses.
  const sent = await sql`
    SELECT s.id, s.campaign_id, s.result_id, s.external_id, s.thread_id, lower(coalesce(s.redirected_to, s.to_address)) AS addr, s.sender_id, s.is_test
    FROM v2_sends s JOIN v2_campaigns c ON c.id = s.campaign_id
    WHERE c.user_email = ${user} AND s.channel = 'email' AND s.status = 'sent' AND s.sent_at > now() - (${LOOKBACK_DAYS + 30} || ' days')::interval`;
  if (!sent.length) return out;
  for (const s of senders) {
    out.senders++;
    try {
      const msgs = s.provider === "google" ? await fetchGmail(s, sent.filter((x) => x.sender_id === s.id || !x.sender_id).map((x) => x.addr as string).filter(Boolean)) : s.provider === "imap" ? await fetchImap(s) : [];
      out.scanned += msgs.length;
      for (const m of msgs) {
        const mine = sent.filter((x) => x.sender_id === s.id || !x.sender_id);
        const bounce = /mailer-daemon|postmaster|mail delivery (sub)?system/i.test(`${m.from} ${m.fromName ?? ""}`);
        let match = mine.find((x) => (m.threadId && x.thread_id === m.threadId) || (x.external_id && m.inReplyTo.includes(x.external_id)));
        // A bounce names the address in its body, which the header-only read doesn't have yet.
        if (!match && bounce && m.loadBody) { m.body = await m.loadBody().catch(() => m.body); m.loadBody = undefined; }
        if (!match && bounce) match = mine.find((x) => x.addr && m.body.toLowerCase().includes(x.addr));
        // By address only for real sends: a test goes to the user's own inbox, and every mail from
        // that address is not a reply to the test.
        if (!match && !bounce) match = mine.find((x) => !x.is_test && x.addr === m.from.toLowerCase());
        if (!match) continue;
        out.matched++;
        const [dupe] = await sql`SELECT 1 FROM v2_inbox WHERE user_email = ${user} AND external_id = ${m.externalId}`;
        if (dupe) continue;
        // The full body only for a matched, new message (the list read headers + snippet only).
        if (m.loadBody) m.body = await m.loadBody().catch(() => m.body);
        const cls = bounce ? { kind: "bounce", sentiment: null } : await classify(m);
        await sql`
          INSERT INTO v2_inbox (user_email, campaign_id, result_id, channel, from_address, from_name, subject, body, received_at, sentiment, external_id, sender_id, thread_id, kind, is_test)
          VALUES (${user}, ${match.campaign_id}, ${match.is_test ? null : match.result_id}, 'email', ${m.from}, ${m.fromName}, ${m.subject}, ${m.body.slice(0, 20_000)}, ${m.date},
                  ${cls.sentiment}, ${m.externalId}, ${s.id}, ${m.threadId}, ${cls.kind}, ${!!match.is_test})
          ON CONFLICT (user_email, external_id) DO NOTHING`;
        if (match.is_test) {
          // A reply to a test: show it, mark the test send replied — nothing else. The "lead" on a
          // test row is just the sample used to fill the template.
          if (cls.kind === "reply") await sql`UPDATE v2_sends SET replied_at = coalesce(replied_at, now()) WHERE id = ${match.id}`;
          if (cls.kind === "reply") out.replies++;
          continue;
        }
        await applyResponse(user, { campaign_id: match.campaign_id as string, result_id: match.result_id as number | null, addr: match.addr as string | null, id: Number(match.id) }, cls.kind, cls.sentiment);
        if (cls.kind === "bounce") out.bounces++; else if (cls.kind === "reply") out.replies++;
      }
      await sql`UPDATE v2_senders SET last_synced = now(), status_note = null WHERE id = ${s.id}`;
    } catch (err) {
      const msg = `${s.address}: ${(err as Error).message.slice(0, 200)}`;
      out.errors.push(msg);
      await sql`UPDATE v2_senders SET status_note = ${`Couldn't read replies: ${(err as Error).message.slice(0, 160)}`} WHERE id = ${s.id}`;
    }
  }
  return out;
}

/** What a response does to the sequence. */
export async function applyResponse(user: string, match: { campaign_id: string; result_id: number | null; addr?: string | null; id?: number },
  kind: string, sentiment: string | null) {
  // What happened is recorded against the lead's derived signals — the rules learn from it.
  const event = kind === "bounce" ? "bounced" : kind !== "reply" ? "auto_reply"
    : sentiment === "interested" ? "interested" : sentiment === "unsubscribe" ? "unsubscribed" : "replied";
  await recordOutcome(match.result_id, event, match.campaign_id).catch(() => {});
  await logOutcome({ userEmail: user, event, resultId: match.result_id, campaignId: match.campaign_id, channel: "email", detail: { sentiment } });
  if (kind === "bounce") {
    if (match.id) await sql`UPDATE v2_sends SET bounced_at = coalesce(bounced_at, now()) WHERE id = ${match.id}`;
    await sql`UPDATE v2_sends SET status = 'cancelled', status_note = 'an earlier message bounced'
              WHERE campaign_id = ${match.campaign_id} AND result_id = ${match.result_id} AND channel = 'email' AND status IN ('queued','scheduled')`;
    return;
  }
  if (kind !== "reply") return; // auto-replies (out of office) don't stop anything
  await sql`UPDATE v2_sends SET replied_at = coalesce(replied_at, now())
            WHERE campaign_id = ${match.campaign_id} AND result_id = ${match.result_id} AND status = 'sent'`;
  await sql`UPDATE v2_sends SET status = 'cancelled', status_note = 'they replied — sequence stopped'
            WHERE campaign_id = ${match.campaign_id} AND result_id = ${match.result_id} AND status IN ('queued','scheduled')`;
  if (sentiment === "unsubscribe" && match.addr) {
    await sql`INSERT INTO email_unsubscribes (email, stream, source) VALUES (${match.addr}, ${`v2:${user}`}, 'manual') ON CONFLICT DO NOTHING`;
  }
}

const CLASSIFY = {
  name: "classify_reply",
  description: "Classify a reply to a cold outreach message.",
  input_schema: {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["reply", "auto_reply"], description: "auto_reply = out-of-office, ticket receipts, 'we received your message' robots." },
      sentiment: { type: "string", enum: ["interested", "not_now", "not_interested", "unsubscribe", "other"] },
    },
    required: ["kind", "sentiment"],
  },
};
async function classify(m: Incoming): Promise<{ kind: string; sentiment: string | null }> {
  try {
    const r = await callTool({ agent: "reply_classifier", model: MODELS.cheap, maxTokens: 120,
      system: "You sort replies to a small business's cold outreach. 'unsubscribe' = they ask not to be contacted again (stop, remove me, not interested don't email).",
      messages: [{ role: "user", content: `Subject: ${m.subject ?? ""}\n\n${m.body.slice(0, 3000)}` }], tool: CLASSIFY });
    const kind = r.kind === "auto_reply" ? "auto_reply" : "reply";
    return { kind, sentiment: kind === "reply" && typeof r.sentiment === "string" ? r.sentiment : null };
  } catch {
    // Unclassified still counts as a human reply: stopping a sequence wrongly is the safe mistake.
    return { kind: /out of (the )?office|auto(matic)?[- ]?reply|on leave/i.test(`${m.subject} ${m.body}`) ? "auto_reply" : "reply", sentiment: null };
  }
}

/** Drop the quoted original so the inbox shows what they actually wrote. */
function stripQuoted(text: string): string {
  const lines = text.split(/\r?\n/);
  const cut = lines.findIndex((l) => /^On .+wrote:$/i.test(l.trim()) || /^-{2,}\s*Original Message/i.test(l.trim()) || /^From: /.test(l.trim()));
  return (cut > 0 ? lines.slice(0, cut) : lines).filter((l) => !l.startsWith(">")).join("\n").trim();
}

// ---------------------------------------------------------------- Gmail

type GPart = { mimeType?: string; body?: { data?: string }; parts?: GPart[]; headers?: Array<{ name: string; value: string }> };
function gmailText(p: GPart): string {
  if (p.mimeType === "text/plain" && p.body?.data) return Buffer.from(p.body.data, "base64url").toString("utf8");
  for (const c of p.parts ?? []) { const t = gmailText(c); if (t) return t; }
  if (p.mimeType === "text/html" && p.body?.data) return Buffer.from(p.body.data, "base64url").toString("utf8").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return "";
}
async function fetchGmail(s: SenderRow, sentTo: string[] = []): Promise<Incoming[]> {
  const token = await googleTokenFor(s);
  const H = { authorization: `Bearer ${token}` };
  // Incremental: only mail since the last sync (an hour's overlap for late-indexed mail), never more
  // than the lookback. A full 14-day read of 100 messages, one by one, took ~30s every sync.
  const lastSynced = (s as SenderRow & { last_synced?: string | Date | null }).last_synced;
  const since = Math.max(Date.now() - LOOKBACK_DAYS * 864e5, lastSynced ? new Date(lastSynced).getTime() - 3600e3 : 0);
  const base = `in:inbox -from:me after:${Math.floor(since / 1000)}`;
  // A first (full-lookback) sync asks only for mail from the people we wrote to, plus bounces; an
  // incremental one reads everything new (a reply can come from a colleague of the recipient).
  const full = !lastSynced;
  const addrs = [...new Set(sentTo.filter((a) => /^[^\s@{}()"]+@[^\s@{}()"]+$/.test(a)))];
  const queries = full && addrs.length
    ? [...Array.from({ length: Math.ceil(addrs.length / 25) }, (_, i) => `${base} {${addrs.slice(i * 25, i * 25 + 25).map((a) => `from:${a}`).join(" ")}}`),
       `${base} {from:mailer-daemon from:postmaster}`]
    : [base];
  const ids: string[] = [];
  for (const q of queries) {
    let page: string | undefined;
    do {
      const list = (await (await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q=${encodeURIComponent(q)}${page ? `&pageToken=${page}` : ""}`, { headers: H })).json()) as { messages?: Array<{ id: string }>; nextPageToken?: string; error?: { message: string } };
      if (list.error) throw new Error(`Gmail: ${list.error.message}`);
      for (const m of list.messages ?? []) if (!ids.includes(m.id)) ids.push(m.id);
      page = list.nextPageToken;
    } while (page && ids.length < 300);
  }
  // Headers only, 25 at a time (well inside Gmail's per-user quota) — matching needs From / In-Reply-To / References / thread; the body
  // is fetched later, and only for the messages that answer one of our sends.
  const metaQs = ["From", "Subject", "In-Reply-To", "References"].map((h) => `metadataHeaders=${h}`).join("&");
  const out: Incoming[] = [];
  for (let i = 0; i < ids.length; i += 25) {
    const batch = await Promise.all(ids.slice(i, i + 25).map(async (id) =>
      (await (await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&${metaQs}`, { headers: H })).json()) as { id: string; threadId: string; internalDate: string; snippet?: string; payload: GPart }));
    for (const m of batch) {
      if (!m?.id) continue;
      const h = (n: string) => m.payload?.headers?.find((x) => x.name.toLowerCase() === n)?.value ?? "";
      const from = h("from");
      out.push({
        externalId: `gmail:${m.id}`, threadId: m.threadId, from: (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase(),
        fromName: from.replace(/<.*>/, "").replace(/"/g, "").trim() || null, subject: h("subject") || null,
        body: m.snippet ?? "", inReplyTo: `${h("in-reply-to")} ${h("references")}`.split(/\s+/).filter(Boolean),
        date: new Date(Number(m.internalDate)),
        loadBody: async () => {
          const full = (await (await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`, { headers: H })).json()) as { payload: GPart };
          return stripQuoted(gmailText(full.payload));
        },
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------- IMAP

async function fetchImap(s: SenderRow): Promise<Incoming[]> {
  const cfg = s.config as { imapHost?: string; imapPort?: number; user: string };
  if (!cfg.imapHost) throw new Error("no IMAP host saved for this mailbox — add one to read replies");
  const client = new ImapFlow({ host: cfg.imapHost, port: cfg.imapPort ?? 993, secure: (cfg.imapPort ?? 993) === 993,
    auth: { user: cfg.user, pass: senderSecret(s) ?? "" }, logger: false });
  await client.connect();
  const out: Incoming[] = [];
  const lock = await client.getMailboxLock("INBOX");
  try {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);
    const uids = await client.search({ since }, { uid: true });
    for (const uid of (uids || []).slice(-200)) {
      const msg = await client.fetchOne(String(uid), { source: true, envelope: true }, { uid: true });
      if (!msg || !msg.source) continue;
      const p = await simpleParser(msg.source);
      const fromAddr = p.from?.value?.[0];
      out.push({
        externalId: `imap:${s.id}:${p.messageId ?? uid}`, threadId: null, from: (fromAddr?.address ?? "").toLowerCase(), fromName: fromAddr?.name || null,
        subject: p.subject ?? null, body: stripQuoted(p.text ?? ""), date: p.date ?? new Date(),
        inReplyTo: [p.inReplyTo, ...(Array.isArray(p.references) ? p.references : p.references ? [p.references] : [])].filter((x): x is string => !!x),
      });
    }
  } finally {
    lock.release();
    await client.logout().catch(() => {});
  }
  return out;
}
