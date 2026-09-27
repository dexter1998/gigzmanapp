import { SendEmailCommand } from "@aws-sdk/client-ses";
import { ses } from "@/lib/ses";
import { sql } from "@/lib/db";
import { recordApiFailure } from "@/lib/api-alerts";
import { COMPANY } from "@/lib/company";

/**
 * Email for the founder widget.
 *
 * Sent inline from the request that created the message, not from a scheduled job. The crons in
 * this repo are declared in vercel.json and the app runs on App Runner, so whether they fire at
 * all is an open question — and "you never heard about the partnership email" is not an acceptable
 * failure mode to inherit from a scheduler nobody is sure about. Both sides are a single SES call
 * on a path that already writes to the database.
 *
 * That costs one thing worth naming: Intercom sends a reply notification three minutes late and
 * cancels it if the person reads the message in the widget first. Without a timer that is not
 * possible, so `wasRecentlyReading` below approximates it — somebody whose last read was seconds
 * ago is still sitting in the panel and will see the reply by polling, so no email is sent. The
 * window is deliberately generous in the direction of NOT emailing: a redundant email to someone
 * who is already reading is more annoying than a slightly late one to someone who left.
 */

const FROM = process.env.SES_FROM_ADDRESS || `Mantis Ai <no-reply@${new URL(COMPANY.site).hostname}>`;
/**
 * Where "somebody wrote in" lands.
 *
 * Its own variable rather than reusing ADMIN_EMAILS: that list controls who can open the admin
 * console, and the address that should be watched on a phone at 11pm is a different question from
 * who is trusted with the console. Tying them together would mean adding an admin just to change
 * where a notification goes — or worse, mailing every admin every time.
 */
const FOUNDER_INBOX = (process.env.FOUNDER_NOTIFY_EMAIL || "kumartarun276@gmail.com").trim();

/** One email per conversation per this window, in each direction. A back-and-forth is worth one
 *  notification, not one per message. */
const THREAD_EMAIL_COOLDOWN_MINUTES = 12 * 60;

/** Still-in-the-widget window. Under this, the reply will arrive by polling before an email would
 *  even be opened. */
const STILL_READING_SECONDS = 120;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function send(to: string, subject: string, text: string, html: string, ctx: Record<string, unknown>) {
  try {
    await ses.send(
      new SendEmailCommand({
        Source: FROM,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: { Text: { Data: text, Charset: "UTF-8" }, Html: { Data: html, Charset: "UTF-8" } },
        },
      })
    );
    return true;
  } catch (err) {
    // Never throws back into the request. A message that was saved but whose notification failed
    // is recoverable — it is sitting in the inbox. A 500 on send, with the message already
    // written, would have the visitor send it again.
    await recordApiFailure("ses", (err as Error).message, ctx);
    return false;
  }
}

/** The founder, told that somebody wrote in. */
export async function notifyFounder(threadId: string, isNewThread: boolean) {
  const [t] = await sql`
    SELECT t.id, t.site_slug, t.visitor_name, t.visitor_email, t.visitor_phone, t.subject,
           t.last_emailed_admin_at,
           coalesce(c.is_registered_user, false) AS is_registered_user
      FROM widget_threads t
      LEFT JOIN widget_contacts c ON c.id = t.contact_id
     WHERE t.id = ${threadId}
  `;
  if (!t) return;

  // A brand-new conversation always notifies. A follow-up in an open thread respects the cooldown,
  // because the founder is either already reading it or has been told once already.
  if (!isNewThread && t.last_emailed_admin_at) {
    const mins = (Date.now() - new Date(t.last_emailed_admin_at as string).getTime()) / 60000;
    if (mins < THREAD_EMAIL_COOLDOWN_MINUTES) return;
  }

  const [msg] = await sql`
    SELECT body FROM widget_messages WHERE thread_id = ${threadId} ORDER BY created_at DESC LIMIT 1
  `;
  const link = `${COMPANY.site}/admin/widget`;
  const who = `${t.visitor_name} (${t.visitor_email}, ${t.visitor_phone})`;
  const kind = t.is_registered_user ? "existing user" : "audience";

  const subject = `${isNewThread ? "New" : "Reply"} · ${t.visitor_name} via ${t.site_slug}`;
  const text =
    `${who}\n${kind} · from ${t.site_slug}\n\n"${msg?.body ?? ""}"\n\nReply: ${link}\n`;
  const html =
    `<p style="margin:0 0 10px"><b>${esc(String(t.visitor_name))}</b> · ${esc(kind)} · via <b>${esc(String(t.site_slug))}</b></p>` +
    `<p style="margin:0 0 14px;color:#667085">${esc(String(t.visitor_email))} · ${esc(String(t.visitor_phone))}</p>` +
    `<blockquote style="margin:0 0 16px;padding:10px 14px;background:#f6f7f4;border-left:3px solid #648b1c">${esc(String(msg?.body ?? ""))}</blockquote>` +
    `<p style="margin:0"><a href="${link}" style="color:#4c6b16"><b>Reply in the founder inbox →</b></a></p>`;

  if (await send(FOUNDER_INBOX, subject, text, html, { threadId, to: "founder" })) {
    await sql`UPDATE widget_threads SET last_emailed_admin_at = now() WHERE id = ${threadId}`;
  }
}

/** The visitor, told the founder answered — unless they are already looking at it. */
export async function notifyVisitor(threadId: string) {
  const [t] = await sql`
    SELECT id, site_slug, visitor_name, visitor_email, visitor_last_read_at, last_emailed_visitor_at
      FROM widget_threads WHERE id = ${threadId}
  `;
  if (!t) return;

  if (t.visitor_last_read_at) {
    const secs = (Date.now() - new Date(t.visitor_last_read_at as string).getTime()) / 1000;
    if (secs < STILL_READING_SECONDS) return;
  }
  if (t.last_emailed_visitor_at) {
    const mins = (Date.now() - new Date(t.last_emailed_visitor_at as string).getTime()) / 60000;
    if (mins < THREAD_EMAIL_COOLDOWN_MINUTES) return;
  }
  // No suppression check, deliberately. lib/email-suppression.ts states the rule this follows:
  // never gate transactional mail on an unsubscribe. This is an answer to a message the person
  // sent minutes ago — withholding it because they once opted out of a newsletter would leave
  // them waiting for a reply that was already written.

  const [msg] = await sql`
    SELECT body FROM widget_messages WHERE thread_id = ${threadId} AND sender = 'admin'
     ORDER BY created_at DESC LIMIT 1
  `;
  const subject = "Tarun replied to your message";
  const text =
    `Hi ${t.visitor_name},\n\n"${msg?.body ?? ""}"\n\n` +
    `Open the chat on ${COMPANY.site} to reply.\n`;
  const html =
    `<p style="margin:0 0 14px">Hi ${esc(String(t.visitor_name))},</p>` +
    `<blockquote style="margin:0 0 16px;padding:10px 14px;background:#f6f7f4;border-left:3px solid #648b1c">${esc(String(msg?.body ?? ""))}</blockquote>` +
    // No deep link with the visitor's token in it: that token is the only thing that makes the
    // conversation theirs, and an email is forwarded, quoted and logged in places we do not
    // control. Their browser already holds it — reopening the widget is enough.
    `<p style="margin:0;color:#667085">Open the chat on <a href="${COMPANY.site}" style="color:#4c6b16">${new URL(COMPANY.site).hostname}</a> to reply.</p>`;

  if (await send(String(t.visitor_email), subject, text, html, { threadId, to: "visitor" })) {
    await sql`UPDATE widget_threads SET last_emailed_visitor_at = now() WHERE id = ${threadId}`;
  }
}
