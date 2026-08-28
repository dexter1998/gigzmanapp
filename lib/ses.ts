import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { recordApiFailure } from "@/lib/api-alerts";

declare global {
  var __gigzmanSes: SESClient | undefined;
}

// blogyapp.com's SES domain identity — confirmed live (SES console, ap-south-1) as an already-
// verified domain identity, used instead of blogyapp.in (which isn't verified in SES at all).
const REGION = process.env.SES_REGION || "ap-south-1";

export const ses = global.__gigzmanSes ?? new SESClient({ region: REGION });

if (process.env.NODE_ENV !== "production") {
  global.__gigzmanSes = ses;
}

const FROM_ADDRESS = process.env.SES_FROM_ADDRESS || "no-reply@blogyapp.com";

export async function sendVerificationEmail(to: string, code: string) {
  try {
    await ses.send(
      new SendEmailCommand({
        Source: FROM_ADDRESS,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: "Your verification code" },
          Body: { Text: { Data: `Your verification code is ${code}. It expires in 10 minutes.` } },
        },
      })
    );
  } catch (err) {
    await recordApiFailure("ses", (err as Error).message, { to });
    throw err;
  }
}
