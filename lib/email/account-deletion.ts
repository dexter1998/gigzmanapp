import { SendEmailCommand } from "@aws-sdk/client-ses";
import { COMPANY } from "@/lib/company";
import { streamConfig } from "@/lib/email/streams";

/**
 * The two account-deletion emails: "we got your request" and "your account is deleted".
 *
 * Transactional, not lifecycle: they go through SES's simple send on the otp stream (same path as
 * sign-in codes), with no unsubscribe check — someone who unsubscribed from product
 * mail still needs to know their account was deleted. No email_sends row either, so the deletion
 * mail doesn't recreate a log row carrying the address we just removed.
 *
 * Best-effort: a failed send never blocks the request or the deletion. Off outside production
 * unless ACCOUNT_EMAILS_IN_DEV=1, so local test accounts (fake addresses) can't produce bounces
 * against the sending domain.
 */
function enabled(): boolean {
  return process.env.NODE_ENV === "production" || process.env.ACCOUNT_EMAILS_IN_DEV === "1";
}

async function send(to: string, subject: string, text: string): Promise<boolean> {
  if (!enabled()) return false;
  const html = text
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 14px;font:14px/1.55 -apple-system,Segoe UI,sans-serif;color:#1f1f1f">${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`)
    .join("");
  try {
    const otp = streamConfig("otp");
    await otp.client.send(new SendEmailCommand({
      ConfigurationSetName: otp.configSet,
      Source: otp.from,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject },
        Body: { Html: { Data: html, Charset: "UTF-8" }, Text: { Data: text, Charset: "UTF-8" } },
      },
    }));
    return true;
  } catch (err) {
    console.error("[account-deletion] email failed", (err as Error).message);
    return false;
  }
}

export function sendDeletionRequested(to: string) {
  return send(
    to,
    "We received your account deletion request",
    `Hi,\n\nWe received a request to delete your Mantis account (${to}). Our team reviews every request, usually within 2 working days.\n\n` +
      `Until then your account works as normal. Changed your mind? Cancel the request from Settings → Profile: ${COMPANY.site}/profile\n\n` +
      `Once deleted, your leads, chats, campaigns and remaining credits are gone for good.\n\nMantis Ai`,
  );
}

export function sendAccountDeleted(to: string) {
  return send(
    to,
    "Your Mantis account has been deleted",
    `Hi,\n\nYour Mantis account (${to}) has been deleted, along with its leads, chats and campaigns. Any remaining credits were forfeited.\n\n` +
      `Payment records are kept in anonymised form, as required for tax and accounting.\n\n` +
      `You're always welcome back — signing up again starts a fresh account.\n\nMantis Ai`,
  );
}
