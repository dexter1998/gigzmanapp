import { SESClient } from "@aws-sdk/client-ses";
import { ses } from "@/lib/ses";
import { sql } from "@/lib/db";

/**
 * Which domain, configuration set and AWS account each kind of opt-in mail leaves from.
 *
 * mantisai.in's sending reputation was dragged down by October's cold sends, and SES judges the
 * whole account, so the opt-in mail is split by job onto its own .live domains:
 *
 *   otp   → mantisotp.live    sign-in codes, password resets, account notices
 *   user  → mantisuser.live   product updates, offers, partnership and community invites
 *   leads → mantisleads.live  Bark-style lead alerts
 *
 * Cold outreach (mantismail.live / mantismailer.live) is not here: it passes its own sender and
 * configuration set per message and always uses the default client.
 *
 * These three streams are moving to a second AWS account so a cold-outreach pause on this one can
 * never stop a sign-in code. That move is env-only: set SES_OPTIN_ACCESS_KEY_ID and
 * SES_OPTIN_SECRET_ACCESS_KEY (and SES_OPTIN_REGION if it differs) to the new account's sender
 * keys, with the same identities and configuration-set names created there. Unset, every stream
 * sends through the default client exactly as before.
 */

export type MailStream = "otp" | "user" | "leads";

type StreamConfig = { from: string; configSet: string; replyTo: string | null };

const STREAMS: Record<MailStream, StreamConfig> = {
  // Sign-in codes stay on mantisai.in until mantisotp.live has a few weeks of sending history: a code
  // that lands in spam locks someone out, which a late offer never does. Switch with
  // SES_OTP_FROM="Mantis Ai <verify@mantisotp.live>" and SES_OTP_CONFIG_SET=mantis-otp.
  otp: {
    from: process.env.SES_OTP_FROM || "Mantis Ai <no-reply@mantisai.in>",
    configSet: process.env.SES_OTP_CONFIG_SET || "mantis-transactional",
    replyTo: null,
  },
  user: {
    from: process.env.SES_USER_FROM || "Mantis Ai <hello@mantisuser.live>",
    configSet: process.env.SES_USER_CONFIG_SET || "mantis-user",
    // Offers and invites get answered; none of the .live domains has a mailbox behind it.
    replyTo: process.env.SES_USER_REPLY_TO || "tarun@gigzman.com",
  },
  leads: {
    from: process.env.SES_LEADS_FROM || "Mantis Leads <alerts@mantisleads.live>",
    configSet: process.env.SES_LEADS_CONFIG_SET || "mantis-leads",
    replyTo: process.env.SES_LEADS_REPLY_TO || "tarun@gigzman.com",
  },
};

declare global {
  var __mantisOptinSes: SESClient | undefined;
}

function optinClient(): SESClient {
  const accessKeyId = process.env.SES_OPTIN_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SES_OPTIN_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return ses;
  global.__mantisOptinSes ??= new SESClient({
    region: process.env.SES_OPTIN_REGION || process.env.SES_REGION || "ap-south-1",
    credentials: { accessKeyId, secretAccessKey },
  });
  return global.__mantisOptinSes;
}

export function streamConfig(stream: MailStream): StreamConfig & { client: SESClient; domain: string } {
  const cfg = STREAMS[stream];
  const domain = cfg.from.match(/@([^>\s]+)/)?.[1] ?? "mantisai.in";
  return { ...cfg, client: optinClient(), domain };
}

/** The day mantisuser.live and mantisleads.live first sent real mail; the warm-up counts from here. */
const WARMUP_START = Date.parse(process.env.MAIL_WARMUP_START || "2026-11-05T00:00:00+05:30");

/**
 * How many messages a new domain may send today. A brand-new domain that suddenly sends hundreds of
 * marketing mails reads to Gmail as a spammer warming up a throwaway; the same mail at a slowly
 * rising volume, to people who open it, is how a domain earns the inbox. Doubles weekly from 50,
 * capped at 1,000 a day. MAIL_DAILY_CAP_<STREAM> overrides.
 */
export function dailyCap(stream: MailStream, now = Date.now()): number {
  const override = Number(process.env[`MAIL_DAILY_CAP_${stream.toUpperCase()}`]);
  if (override > 0) return override;
  const week = Math.max(0, Math.floor((now - WARMUP_START) / (7 * 86_400_000)));
  return Math.min(1000, 50 * 2 ** week);
}

/** Messages this stream has sent since midnight IST (counted by its configuration set). */
export async function sentToday(stream: MailStream): Promise<number> {
  const [{ n }] = (await sql`
    SELECT count(*)::int AS n FROM email_sends
    WHERE config_set = ${streamConfig(stream).configSet}
      AND sent_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')
  `) as Array<{ n: number }>;
  return n;
}
