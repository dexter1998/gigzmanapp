import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

/**
 * SNS delivery target for SES events (Send/Delivery/Bounce/Complaint/Open/Click).
 *
 * SNS's contract: first it POSTs a SubscriptionConfirmation with a SubscribeURL that must be
 * fetched once, then Notifications whose Message field is the SES event JSON as a string.
 * Authenticity: the subscription is confirmed by us fetching the URL (an attacker can't make SNS
 * hand them our topic), and rows are insert-only analytics — the worst a forged POST could do is
 * add noise, so full SigV1 signature verification is deliberately skipped for now.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: true });

  if (body.Type === "SubscriptionConfirmation" && typeof body.SubscribeURL === "string") {
    await fetch(body.SubscribeURL).catch(() => {});
    console.log("SES events: SNS subscription confirmed");
    return NextResponse.json({ ok: true });
  }

  if (body.Type === "Notification" && typeof body.Message === "string") {
    try {
      const msg = JSON.parse(body.Message) as {
        eventType?: string;
        mail?: { messageId?: string; destination?: string[] };
        click?: { link?: string; timestamp?: string };
        open?: { timestamp?: string };
        bounce?: { timestamp?: string };
        complaint?: { timestamp?: string };
        delivery?: { timestamp?: string };
      };
      const messageId = msg.mail?.messageId;
      const eventType = msg.eventType;
      if (messageId && eventType) {
        const occurred =
          msg.click?.timestamp ?? msg.open?.timestamp ?? msg.bounce?.timestamp ??
          msg.complaint?.timestamp ?? msg.delivery?.timestamp ?? null;
        await sql`
          INSERT INTO email_events (ses_message_id, event_type, recipient, link, raw, occurred_at)
          VALUES (
            ${messageId}, ${eventType}, ${msg.mail?.destination?.[0] ?? null},
            ${msg.click?.link ?? null}, ${sql.json(JSON.parse(body.Message))},
            ${occurred ? new Date(occurred) : null}
          )
        `;
      }
    } catch (err) {
      console.error("SES event parse failed", err);
    }
  }
  return NextResponse.json({ ok: true });
}
