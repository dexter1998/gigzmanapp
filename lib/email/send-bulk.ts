import { SendRawEmailCommand } from "@aws-sdk/client-ses";
import { ses } from "@/lib/ses";
import { sql } from "@/lib/db";
import { signUnsubscribeToken } from "@/lib/unsubscribe-token";
import { isUnsubscribed } from "@/lib/email-suppression";
import { COMPANY } from "@/lib/company";

/**
 * Sends one non-transactional message.
 *
 * Raw MIME rather than SES's simple send because a bulk message needs List-Unsubscribe, and the
 * simple API has no way to set headers. Gmail and Yahoo's bulk-sender rules require a working
 * one-click unsubscribe, and it's also just the cheapest way to avoid a spam complaint: someone
 * who wants out and can't find the door reports the mail instead.
 *
 * Every send is recorded in email_sends before it goes out, and that write is what makes the
 * lifecycle rules idempotent — a unique index on (recipient, campaign, step) means a second
 * attempt at the same step loses the race and simply doesn't send.
 */

const SENDER = `Mantis Ai <no-reply@${new URL(COMPANY.site).hostname}>`;

/** Header value encoding for anything that might not be ASCII (a city name, a business name). */
function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
}

function base64Body(text: string): string {
  return (Buffer.from(text, "utf-8").toString("base64").match(/.{1,76}/g) ?? []).join("\r\n");
}

export type BulkSend = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Groups messages for reporting; travels in the headers and in SES's own event tags. */
  campaignId: string;
  /** Unique per recipient per campaign — this is what stops a repeat send. */
  stepKey: string;
  template: string;
  stream: string;
  leadId?: string | null;
};

export async function sendBulkEmail(msg: BulkSend): Promise<{ sent: boolean; reason?: string }> {
  if (await isUnsubscribed(msg.to, msg.stream)) {
    return { sent: false, reason: "unsubscribed" };
  }

  // Claim the send first. If another tick already claimed this exact step, the unique index
  // rejects this one and nothing goes out — the check and the send can't drift apart.
  const claimed = await sql`
    INSERT INTO email_sends (recipient, campaign_id, step_key, template, stream, lead_id)
    VALUES (${msg.to}, ${msg.campaignId}, ${msg.stepKey}, ${msg.template}, ${msg.stream}, ${msg.leadId ?? null})
    ON CONFLICT (recipient, campaign_id, step_key) DO NOTHING
    RETURNING id
  `;
  if (claimed.length === 0) return { sent: false, reason: "already sent" };
  const sendId = (claimed[0] as { id: string }).id;

  const unsubUrl = `${COMPANY.site}/u/${signUnsubscribeToken(msg.to, msg.stream)}`;
  const boundary = `--mantis-${sendId}`;
  const domain = new URL(COMPANY.site).hostname;

  const headers = [
    `From: ${SENDER}`,
    `To: ${msg.to}`,
    `Subject: ${encodeHeader(msg.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${sendId}@${domain}>`,
    `MIME-Version: 1.0`,
    `List-Unsubscribe: <${unsubUrl}>, <mailto:unsubscribe@${domain}?subject=unsubscribe>`,
    `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
    `X-Mantis-Campaign-Id: ${msg.campaignId}`,
    `X-Mantis-Step: ${msg.stepKey}`,
    // The dimensions SES splits its own open/click/bounce metrics on, so reporting lines up with
    // what's stored in email_sends rather than being a separate universe.
    `X-SES-MESSAGE-TAGS: campaign_id=${msg.campaignId}, stream=${msg.stream}, template=${msg.template.replace(/-/g, "_")}`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].join("\r\n");

  // Base64 rather than quoted-printable: the HTML has long lines and SMTP caps a line at 998
  // octets, and base64 wrapped at 76 can't trip that however the template changes.
  const body = [
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    base64Body(msg.text),
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    base64Body(msg.html),
    ``,
    `--${boundary}--`,
    ``,
  ].join("\r\n");

  try {
    const res = await ses.send(
      new SendRawEmailCommand({ RawMessage: { Data: Buffer.from(headers + "\r\n" + body, "utf-8") } })
    );
    await sql`UPDATE email_sends SET ses_message_id = ${res.MessageId ?? null} WHERE id = ${sendId}`;
    return { sent: true };
  } catch (err) {
    // Release the claim so a later tick can retry — a send that never left shouldn't permanently
    // consume its step.
    await sql`DELETE FROM email_sends WHERE id = ${sendId}`;
    throw err;
  }
}

/** Fills {{placeholders}}. Unknown tags are left alone rather than blanked, so a missing value is
 *  visible in a test send instead of silently producing an empty sentence. */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (out, [key, value]) => out.replaceAll(`{{${key}}}`, value),
    template
  );
}

export { SENDER as BULK_SENDER };
