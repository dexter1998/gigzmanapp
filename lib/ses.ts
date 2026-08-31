import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { recordApiFailure } from "@/lib/api-alerts";
import { OTP_EMAIL_HTML } from "@/lib/email/otp-template";
import { COMPANY } from "@/lib/company";

declare global {
  var __gigzmanSes: SESClient | undefined;
}

// Not AWS_REGION: Vercel sets that itself to whatever region the function runs in, so a fallback
// written against it never applies. Every AWS client in this codebase takes its own region var.
const REGION = process.env.SES_REGION || "ap-south-1";

export const ses = global.__gigzmanSes ?? new SESClient({ region: REGION });

if (process.env.NODE_ENV !== "production") {
  global.__gigzmanSes = ses;
}

// Sign-in codes come from the brand domain, not blogyapp.com. Both are verified SES identities in
// ap-south-1, and they're split on purpose: mantisai.in carries transactional and lifecycle mail,
// blogyapp.com absorbs cold outreach, so prospecting reputation can never affect whether someone
// can receive the code they need to log in.
const FROM_ADDRESS = process.env.SES_FROM_ADDRESS || `Mantis Ai <no-reply@${new URL(COMPANY.site).hostname}>`;

function fill(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (out, [key, value]) => out.replaceAll(`{{${key}}}`, value),
    template
  );
}

export async function sendVerificationEmail(to: string, code: string) {
  // The code is passed through exactly as generated, never prettified into groups — a space in the
  // digits is something people copy along with them, and the verifier compares the string it
  // issued.
  const values = {
    otp_code: code,
    verification_url: `${COMPANY.site}/verify?email=${encodeURIComponent(to)}`,
    privacy_url: `${COMPANY.site}/privacy`,
  };

  const text =
    `Your Mantis verification code is ${code}.\n\n` +
    `It expires in 10 minutes.\n\n` +
    `Didn't request this? You can safely ignore this email.\n`;

  try {
    await ses.send(
      new SendEmailCommand({
        Source: FROM_ADDRESS,
        Destination: { ToAddresses: [to] },
        Message: {
          // The code in the subject line so it's readable from a notification without opening
          // anything, which is what people actually do with a sign-in code.
          Subject: { Data: `${code} is your Mantis verification code` },
          Body: {
            // Both parts, always. The HTML is the designed one; the text alternative is what a
            // plain-text client shows and what spam filters read a message's intent from.
            Html: { Data: fill(OTP_EMAIL_HTML, values), Charset: "UTF-8" },
            Text: { Data: text, Charset: "UTF-8" },
          },
        },
      })
    );
  } catch (err) {
    await recordApiFailure("ses", (err as Error).message, { to });
    throw err;
  }
}

export async function sendPasswordResetEmail(to: string, code: string) {
  const values = {
    otp_code: code,
    verification_url: `${COMPANY.site}/forgot-password?email=${encodeURIComponent(to)}`,
    privacy_url: `${COMPANY.site}/privacy`,
  };
  const text =
    `Your Mantis password reset code is ${code}.\n\n` +
    `It expires in 10 minutes. Enter it on the reset page along with your new password.\n\n` +
    `Didn't request this? You can safely ignore this email — your password stays unchanged.\n`;
  try {
    await ses.send(
      new SendEmailCommand({
        Source: FROM_ADDRESS,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: `${code} is your Mantis password reset code` },
          Body: {
            Html: { Data: fill(OTP_EMAIL_HTML, values), Charset: "UTF-8" },
            Text: { Data: text, Charset: "UTF-8" },
          },
        },
      })
    );
  } catch (err) {
    await recordApiFailure("ses", (err as Error).message, { to });
    throw err;
  }
}
