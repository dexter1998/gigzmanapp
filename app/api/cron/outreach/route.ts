import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendBulkEmail, fillTemplate } from "@/lib/email/send-bulk";
import { recordCronRun } from "@/lib/cron-runs";
import { reduceOutreachEvents, syncConversions } from "@/lib/outreach/events";
import { checkGates } from "@/lib/outreach/gates";
import { planCampaign, recordTouch, stallRecipients } from "@/lib/outreach/planner";

/**
 * The engagement-driven outreach tick.
 *
 * Separate from /api/cron/campaign-email on purpose. That one advances campaigns purely on time
 * (batch start + a fixed offset) and a number of live campaigns depend on exactly that behaviour;
 * breaking it to add branching would put existing sequences at risk for no gain. This route is
 * the behaviour-driven path: what a recipient gets next depends on what they did, and nothing is
 * sent without the safety gates passing first.
 *
 * Order within a tick matters and is not arbitrary:
 *   1. Ingest events, so every decision below is made on the freshest state (a bounce that
 *      arrived overnight must suppress the address BEFORE this tick considers mailing it again).
 *   2. Sync conversions, so a signup that happened outside the mail stream removes that person
 *      from every sequence immediately.
 *   3. Gates, which can stop the tick entirely.
 *   4. Plan, then send.
 *
 * Idempotent throughout: sendBulkEmail claims (recipient, campaign, step) via a unique index
 * before sending, so a tick that dies partway is resumed by the next one rather than re-sending.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** ~104s of sending at the interval below, comfortably inside maxDuration. */
const CHUNK_LIMIT = 800;
/** ~7.7/sec, under the account's confirmed 14/sec cap. Pacing is not politeness: Microsoft's
 *  554 5.7.7 policy block triggers on burst PATTERN rather than daily volume. */
const SEND_INTERVAL_MS = 130;

/** First tranche of a tick, held back so a bad batch reveals itself on a small sample.
 *  The account-wide bounce rate is a trailing average — by the time it moves, a full batch has
 *  already gone. A canary is the only thing that catches a bad list inside a single tick. */
const CANARY_SIZE = 50;
const CANARY_BOUNCE_LIMIT = 0.02;

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

  const dryRun = req.nextUrl.searchParams.get("dry") === "1";
  const onlyCampaign = req.nextUrl.searchParams.get("campaign");
  const startedAt = new Date();

  // 1 + 2 — bring state up to date before anything is decided on it.
  const events = await reduceOutreachEvents();
  const converted = await syncConversions();

  const campaignRows = await sql`
    SELECT id, cooldown_days FROM campaigns
    WHERE status = 'active' AND config_set_unverified IS NOT NULL
      ${onlyCampaign ? sql`AND id = ${onlyCampaign}` : sql``}
    ORDER BY created_at ASC
  `;

  const perCampaign: Record<string, unknown>[] = [];
  let totalSent = 0, totalFailed = 0;

  for (const row of campaignRows as unknown as { id: string; cooldown_days: number }[]) {
    const campaignId = row.id;

    // 3 — gates. Checked per campaign, because a campaign's own list quality can be bad while the
    // account is still healthy, and that is precisely the case worth catching early.
    const gate = await checkGates(campaignId);
    const runRows = await sql`
      INSERT INTO outreach_runs (campaign_id, blocked_by, bounce_rate, complaint_rate, quota_headroom, notes)
      VALUES (${campaignId}, ${gate.blockedBy}, ${gate.metrics.bounceRate}, ${gate.metrics.complaintRate},
              ${gate.metrics.quotaHeadroom}, ${JSON.stringify({ reason: gate.reason, events, converted, dryRun })}::jsonb)
      RETURNING id
    `;
    const runId = (runRows[0] as { id: string }).id;

    if (!gate.ok) {
      await sql`UPDATE outreach_runs SET finished_at = now() WHERE id = ${runId}`;
      perCampaign.push({ campaignId, blocked: gate.blockedBy, reason: gate.reason });
      continue;
    }

    const capacity = Math.min(CHUNK_LIMIT, Math.floor(gate.metrics.quotaHeadroom * gate.capacityFactor));
    const plan = await planCampaign(campaignId, capacity);

    await sql`
      UPDATE outreach_runs
      SET capacity = ${capacity}, planned_new = ${plan.counts.plannedNew}, planned_followup = ${plan.counts.plannedFollowups}
      WHERE id = ${runId}
    `;

    if (dryRun) {
      await sql`UPDATE outreach_runs SET finished_at = now() WHERE id = ${runId}`;
      perCampaign.push({
        campaignId, capacity, ...plan.counts,
        stalls: plan.stalls.length,
        sample: plan.sends.slice(0, 5).map((s) => ({ to: s.email, step: s.stepKey, track: s.track, touch: s.touchNo, configSet: s.configSet })),
      });
      continue;
    }

    // Stalls are applied even when nothing sends — a finished journey should leave the active
    // pool immediately, not linger until the next tick happens to have capacity.
    for (const reason of new Set(plan.stalls.map((s) => s.reason))) {
      await stallRecipients(plan.stalls.filter((s) => s.reason === reason).map((s) => s.id), reason, row.cooldown_days);
    }

    let sent = 0, failed = 0, skipped = 0, aborted: string | null = null;

    for (let i = 0; i < plan.sends.length; i++) {
      const item = plan.sends[i];

      // 4b — canary checkpoint. Before releasing the rest of the tick, confirm the first tranche
      // did not immediately bounce.
      if (i === CANARY_SIZE) {
        const check = await sql`
          SELECT count(*) FILTER (WHERE cr.bounce_kind IN ('hard_mta', 'mailbox_full', 'transient'))::int AS bad,
                 count(*)::int AS total
          FROM email_sends es
          JOIN campaign_recipients cr ON cr.email = es.recipient AND cr.campaign_id = es.campaign_id
          WHERE es.campaign_id = ${campaignId} AND es.sent_at >= ${startedAt.toISOString()}
        `;
        const c = check[0] as { bad: number; total: number };
        if (c.total > 0 && c.bad / c.total > CANARY_BOUNCE_LIMIT) {
          aborted = `canary_bounce_${((c.bad / c.total) * 100).toFixed(1)}pct`;
          break;
        }
      }

      try {
        const result = await sendBulkEmail({
          to: item.email,
          subject: fillTemplate(item.subject, item.values),
          html: fillTemplate(item.html, item.values),
          text: fillTemplate(item.text, item.values),
          campaignId: item.campaignId,
          stepKey: item.stepKey,
          template: item.stepKey,
          stream: item.stream,
          sender: item.sender,
          configSet: item.configSet,
          touchNo: item.touchNo,
        });
        if (result.sent) {
          await recordTouch(item.recipientId, item.gapMinutes);
          sent++;
        } else {
          skipped++;
        }
      } catch (err) {
        failed++;
        const text = err instanceof Error ? err.message : String(err);
        // An account-level pause is not a per-recipient problem: every remaining send in this
        // tick will fail the same way. Stopping immediately is the difference between losing a
        // tick and burning a whole queue against a wall.
        if (text.includes("Sending paused") || text.includes("AccountSuspended")) {
          aborted = "account_paused_mid_tick";
          break;
        }
        console.error("outreach send failed", campaignId, item.stepKey, item.email, err);
      }
      await sleep(SEND_INTERVAL_MS);
    }

    await sql`
      UPDATE outreach_runs
      SET sent = ${sent}, failed = ${failed}, finished_at = now(),
          blocked_by = ${aborted}, notes = notes || ${JSON.stringify({ skipped, aborted })}::jsonb
      WHERE id = ${runId}
    `;
    totalSent += sent;
    totalFailed += failed;
    perCampaign.push({ campaignId, capacity, ...plan.counts, sent, failed, skipped, aborted, stalls: plan.stalls.length });
  }

  await recordCronRun("outreach", startedAt, true, { events, converted, sent: totalSent, failed: totalFailed });
  return NextResponse.json({ dryRun, events, converted, campaigns: perCampaign, sent: totalSent, failed: totalFailed });
}
