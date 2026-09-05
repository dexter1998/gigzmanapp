import { NextRequest, NextResponse } from "next/server";
import { getDueCampaignSends } from "@/lib/campaigns";
import { sendBulkEmail, fillTemplate } from "@/lib/email/send-bulk";
import { recordCronRun } from "@/lib/cron-runs";

/**
 * Advances every active campaign batch by whatever's due.
 *
 * Was every 10 minutes -- at ~14,225 recipients/day/batch and SES's confirmed 14/sec account cap,
 * a single daily tick can't fit the whole day's volume inside a 300s function (300s at
 * SEND_INTERVAL_MS below is ~2,300 sends, an order of magnitude short). Forced down to once daily
 * (vercel.json) because Vercel's Hobby plan rejects any cron more frequent than daily outright --
 * this account is on Hobby, not Pro. Until either the plan changes or this moves off the Vercel
 * cron primitive (a queue + multiple invocations, or a longer-running worker), a large campaign
 * batch will send across multiple days rather than the one this comment used to promise.
 *
 * Idempotent like the lifecycle cron: a tick that dies partway just gets picked up by the next
 * one, since sendBulkEmail's claim-then-send means nothing here can double-send. Pausing a
 * campaign (status != 'active') stops it being picked up on the very next tick.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CHUNK_LIMIT = 800; // per tick — ~104s at SEND_INTERVAL_MS below, well under maxDuration
const SEND_INTERVAL_MS = 130; // ~7.7/sec, under SES's confirmed 14/sec account cap

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const fromVercelCron = req.headers.get("x-vercel-cron") !== null;

  if (!fromVercelCron && (!secret || auth !== `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ?dry=1 reports what this tick would send, without sending or recording anything.
  const dryRun = req.nextUrl.searchParams.get("dry") === "1";
  const startedAt = new Date();
  const due = await getDueCampaignSends(CHUNK_LIMIT);

  if (dryRun) {
    return NextResponse.json({
      dryRun,
      due: due.length,
      sample: due.slice(0, 5).map((d) => ({ campaignId: d.campaignId, stepKey: d.stepKey, to: d.recipientEmail })),
    });
  }

  let sent = 0, alreadySent = 0, unsubscribed = 0, failed = 0;
  try {
    for (const item of due) {
      try {
        const result = await sendBulkEmail({
          to: item.recipientEmail,
          subject: fillTemplate(item.subject, item.values),
          html: fillTemplate(item.html, item.values),
          text: fillTemplate(item.text, item.values),
          campaignId: item.campaignId,
          stepKey: item.stepKey,
          template: item.stepKey,
          stream: item.stream,
          sender: item.sender,
        });
        if (result.sent) sent++;
        else if (result.reason === "unsubscribed") unsubscribed++;
        else alreadySent++;
      } catch (err) {
        failed++;
        console.error("campaign send failed", item.campaignId, item.stepKey, item.recipientEmail, err);
      }
      await sleep(SEND_INTERVAL_MS);
    }
  } catch (err) {
    await recordCronRun("campaign_email", startedAt, false, { due: due.length, sent, failed },
      err instanceof Error ? err.message : String(err));
    throw err;
  }

  await recordCronRun("campaign_email", startedAt, true, { due: due.length, sent, alreadySent, unsubscribed, failed });
  return NextResponse.json({ dryRun, due: due.length, sent, alreadySent, unsubscribed, failed });
}
